import { Hono } from "hono";
import { cors } from "hono/cors";
import { createBunWebSocket, serveStatic } from "hono/bun";
import { cc, ptr } from "bun:ffi";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "path";

const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://localhost:5173",
  "https://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://localhost:3000",
  "https://127.0.0.1:3000"
]);

app.use("/*", cors({
  origin: (origin) => {
    if (!origin) {
      return "*";
    }
    return allowedOrigins.has(origin) ? origin : "*";
  },
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false
}));

const buildOpenApiSpec = () => ({
  openapi: "3.0.3",
  info: {
    title: "HDF5 Bun API",
    version: "1.0.0",
    description: "API for HDF5 inspection, version checks, file listing, and deep structure traversal."
  },
  servers: [{ url: `${hasTlsFiles ? "https" : "http"}://localhost:3000` }],
  paths: {
    "/api/inspect": {
      post: {
        summary: "Validate and open an HDF5 file",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["path"],
                properties: {
                  path: { type: "string", description: "Absolute file path to the HDF5 file." }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Inspection result" },
          "400": { description: "Missing file path parameter" },
          "500": { description: "Internal server error" }
        }
      }
    },
    "/api/version": {
      get: {
        summary: "Get linked HDF5 library version",
        responses: {
          "200": { description: "Version payload" }
        }
      }
    },
    "/api/files": {
      get: {
        summary: "List HDF5 files from configured directory",
        responses: {
          "200": { description: "List of files" },
          "500": { description: "Directory read error" }
        }
      }
    },
    "/api/structure-deep": {
      get: {
        summary: "Get deep recursive structure with attributes",
        parameters: [
          {
            name: "path",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Absolute file path to the HDF5 file."
          }
        ],
        responses: {
          "200": { description: "Deep structure payload" },
          "400": { description: "Missing path query" }
        }
      }
    },
    "/api/select": {
      post: {
        summary: "Validate selected leaf path and class chain against HDF5 file",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["filePath", "path", "classChain"],
                properties: {
                  filePath: { type: "string", description: "Absolute path to HDF5 file." },
                  path: { type: "string", description: "Selected leaf path in the HDF5 hierarchy." },
                  classChain: {
                    type: "array",
                    items: { type: "string" },
                    description: "Class names from root through selected leaf (for example Group -> Group -> Dataset)."
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Selection validated" },
          "400": { description: "Invalid request payload" },
          "404": { description: "Path not found in HDF5" },
          "409": { description: "Class mismatch for selected path" },
          "500": { description: "Internal server error" }
        }
      }
    },
    "/api/select-buffer/{id}": {
      get: {
        summary: "Debug-read staged payload metadata by token (websocket flow should carry binary data)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Staged payload token returned by /api/select"
          }
        ],
        responses: {
          "200": { description: "Staged payload metadata and JSON preview" },
          "404": { description: "Token not found or expired" }
        }
      }
    },
    "/ws/select/{id}": {
      get: {
        summary: "WebSocket binary stream for staged leaf payload by token",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Staged payload token returned by /api/select"
          }
        ],
        responses: {
          "101": { description: "Switching protocols to websocket" },
          "404": { description: "Token not found or expired" }
        }
      }
    }
  }
});

const buildAsyncApiSpec = () => ({
  asyncapi: "2.6.0",
  info: {
    title: "HDF5 Bun WebSocket API",
    version: "1.0.0",
    description: "Async contract for class-aware staged leaf streaming over WebSocket."
  },
  defaultContentType: "application/json",
  servers: {
    production: {
      url: "localhost:3000",
      protocol: hasTlsFiles ? "wss" : "ws",
      description: "Bun/Hono websocket server"
    }
  },
  channels: {
    "/ws/select/{id}": {
      description: "Stream staged HDF5 leaf payload for a token generated by /api/select.",
      parameters: {
        id: {
          description: "Staged payload token",
          schema: {
            type: "string"
          }
        }
      },
      subscribe: {
        operationId: "streamSelectedLeaf",
        summary: "Server pushes stream metadata, binary chunks, then completion frame",
        message: {
          oneOf: [
            { $ref: "#/components/messages/StreamMeta" },
            { $ref: "#/components/messages/StreamComplete" },
            { $ref: "#/components/messages/StreamError" },
            { $ref: "#/components/messages/BinaryChunk" }
          ]
        }
      }
    }
  },
  components: {
    messages: {
      StreamMeta: {
        name: "StreamMeta",
        title: "Stream metadata frame",
        payload: {
          type: "object",
          required: ["type", "protocol", "id", "className", "bytes", "chunkSize", "chunkCount"],
          properties: {
            type: { type: "string", enum: ["STREAM_META"] },
            protocol: { type: "string", enum: ["hdf5-select-v1"] },
            id: { type: "string" },
            className: { type: "string", enum: ["Image", "Table", "Dataset", "Group"] },
            classChannel: { type: "string", enum: ["image", "table", "dataset"] },
            filePath: { type: "string" },
            path: { type: "string" },
            mimeType: { type: "string" },
            payloadEncoding: { type: "string" },
            reconstructor: { type: "string" },
            bytes: { type: "integer" },
            chunkSize: { type: "integer" },
            chunkCount: { type: "integer" },
            createdAt: { type: "integer" },
            expiresAt: { type: "integer" }
          }
        }
      },
      BinaryChunk: {
        name: "BinaryChunk",
        title: "Binary payload chunk",
        payload: {
          type: "string",
          format: "binary"
        }
      },
      StreamComplete: {
        name: "StreamComplete",
        title: "Stream completion frame",
        payload: {
          type: "object",
          required: ["type", "id", "className", "bytes", "chunkCount"],
          properties: {
            type: { type: "string", enum: ["STREAM_COMPLETE"] },
            id: { type: "string" },
            className: { type: "string" },
            bytes: { type: "integer" },
            chunkCount: { type: "integer" }
          }
        }
      },
      StreamError: {
        name: "StreamError",
        title: "Error frame",
        payload: {
          type: "object",
          required: ["type", "code", "message"],
          properties: {
            type: { type: "string", enum: ["ERROR"] },
            code: { type: "string" },
            message: { type: "string" }
          }
        }
      }
    }
  }
});

console.log("[Bun] Reading raw C source file dynamically...");

const cSourcePath = join(import.meta.dir, "test_h5.c");
const defaultHdf5Root = "/home/roger/Software/hdf5-1_10_5/dist";
const hdf5Root = Bun.env.HDF5_ROOT ?? defaultHdf5Root;
const hdf5IncludeDir = Bun.env.HDF5_INCLUDE_DIR ?? join(hdf5Root, "include");
const hdf5LibDir = Bun.env.HDF5_LIB_DIR ?? join(hdf5Root, "lib");
const hdf5Library = Bun.env.HDF5_LIBRARY ?? "hdf5";
const HDF5_DATA_DIR = Bun.env.HDF5_DATA_DIR ?? "/home/roger/BunProjects/examples";

console.log(`[Bun] HDF5 include dir: ${hdf5IncludeDir}`);
console.log(`[Bun] HDF5 lib dir: ${hdf5LibDir}`);
console.log(`[Bun] HDF5 library: ${hdf5Library}`);

const assertPathExists = (label: string, targetPath: string) => {
  if (!existsSync(targetPath)) {
    throw new Error(
      `[Config] ${label} does not exist: ${targetPath}. ` +
      `Set HDF5_ROOT or ${label === "HDF5 include directory" ? "HDF5_INCLUDE_DIR" : label === "HDF5 library directory" ? "HDF5_LIB_DIR" : "HDF5_DATA_DIR"} correctly.`
    );
  }
};

assertPathExists("HDF5 include directory", hdf5IncludeDir);
assertPathExists("HDF5 library directory", hdf5LibDir);

if (!existsSync(HDF5_DATA_DIR)) {
  console.warn(`[Config] HDF5_DATA_DIR does not exist yet: ${HDF5_DATA_DIR}`);
}

// 2. Compile and link in-memory using Bun's native 'cc' helper
const { symbols: h5Lib } = cc({
  source: cSourcePath,
  // 🏎️ CRITICAL LINKER STEP: Tell Bun's internal compiler to link your system's HDF5 library.
  // This matches the '-lhdf5' flag you passed to gcc previously.
  flags: [
    `-I${hdf5IncludeDir}`,
    `-L${hdf5LibDir}`,
    `-l${hdf5Library}`
  ],
library: [hdf5Library],
  symbols: {
    check_hdf5_version: {
      returns: "int",
      args: ["ptr", "ptr", "ptr"],
    },
    inspect_and_open_file: {
      returns: "int",
      args: ["cstring"], // Maps JavaScript string directly to (const char*)
    },
    get_deep_structure: { returns: "int", args: ["cstring", "ptr", "int"] },
    read_leaf_payload_json: { returns: "int", args: ["cstring", "cstring", "ptr", "int"] }

  },
});

type StagedLeafPayload = {
  id: string;
  filePath: string;
  path: string;
  className: string;
  bytes: Uint8Array;
  createdAt: number;
  expiresAt: number;
  mimeType: "application/json";
};

const STAGED_PAYLOAD_TTL_MS = 5 * 60 * 1000;
const stagedLeafPayloads = new Map<string, StagedLeafPayload>();

const cleanupExpiredStagedPayloads = () => {
  const now = Date.now();
  for (const [id, payload] of stagedLeafPayloads.entries()) {
    if (payload.expiresAt <= now) {
      stagedLeafPayloads.delete(id);
    }
  }
};

type Hdf5Attribute = {
  name: string;
  valueType: "Integer" | "Float" | "String" | "Unsupported";
  value: string | number | Array<string | number> | null;
};

type FlatNode = {
  fullPath: string;
  type: string;
  attributes?: Hdf5Attribute[];
};

type TreeNode = {
  name: string;
  type: string;
  fullPath: string;
  attributes: Hdf5Attribute[];
  children?: TreeNode[];
};

const normalizeNodePath = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const noTrailingSlash = trimmed.replace(/\/+$/, "");
  return noTrailingSlash.startsWith("/") ? noTrailingSlash : `/${noTrailingSlash}`;
};

const extractFlatNodesFromFile = (filepath: string) => {
  const bufferSize = 65536;
  const outputBuffer = new Uint8Array(bufferSize);

  const itemCount = h5Lib.get_deep_structure(
    Buffer.from(filepath + "\0"),
    ptr(outputBuffer),
    bufferSize
  );

  if (itemCount < 0) {
    throw new Error("C layer failed to parse deep traversal structures.");
  }

  const parserWarnings: string[] = [];
  const rawString = new TextDecoder().decode(outputBuffer).replace(/\0/g, "");

  const parseFlatNode = (line: string): FlatNode | null => {
    try {
      const parsed = JSON.parse(line) as Partial<FlatNode>;
      if (typeof parsed.fullPath !== "string" || typeof parsed.type !== "string") {
        parserWarnings.push("Skipped a node record missing fullPath/type.");
        return null;
      }

      const attributes = Array.isArray(parsed.attributes) ? parsed.attributes : [];
      return {
        fullPath: normalizeNodePath(parsed.fullPath),
        type: parsed.type,
        attributes
      };
    } catch {
      parserWarnings.push("Skipped a malformed JSON node record.");
      return null;
    }
  };

  const nonEmptyLines = rawString
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const parsedFlatNodes: FlatNode[] = nonEmptyLines
    .map(parseFlatNode)
    .filter((node): node is FlatNode => node !== null);

  // Collapse duplicate records from the C layer so each path appears exactly once in the tree.
  const dedupedByPath = new Map<string, FlatNode>();
  const duplicatePaths = new Set<string>();
  for (const node of parsedFlatNodes) {
    const normalizedPath = normalizeNodePath(node.fullPath);
    if (dedupedByPath.has(normalizedPath)) {
      duplicatePaths.add(normalizedPath);
    }
    dedupedByPath.set(normalizedPath, {
      ...node,
      fullPath: normalizedPath
    });
  }
  const flatNodes = Array.from(dedupedByPath.values());

  if (duplicatePaths.size > 0) {
    parserWarnings.push(`Collapsed duplicate node paths: ${Array.from(duplicatePaths).join(", ")}`);
  }

  if (parsedFlatNodes.length !== itemCount) {
    parserWarnings.push(`Node count mismatch: C reported ${itemCount}, parsed ${parsedFlatNodes.length}.`);
  }

  return {
    itemCount,
    flatNodes,
    parserWarnings
  };
};

app.post("/api/inspect", async (c) => {
  try {
    const body = await c.req.json();
    const filepath = body.path;

    if (!filepath) {
      return c.json({ success: false, message: "Missing file path parameter." }, 400);
    }

    // Call your JIT compiled native C code directly!
    // Bun's cstring FFI handles converting the JS string to null-terminated char*
    const cResult = h5Lib.inspect_and_open_file(Buffer.from(filepath + "\0"));

    if (cResult === 0) {
      return c.json({ success: true, status: "VALID_HDF5", message: "Successfully verified and opened file structure." });
    } else if (cResult === -1) {
      return c.json({ success: false, status: "INVALID_FORMAT", message: "File is not recognized as a valid HDF5 container format." });
    } else {
      return c.json({ success: false, status: "OPEN_ERROR", message: "Failed to allocate file descriptor handle in C layer." });
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/api/version", (c) => {
const majorVersion = new Uint32Array(1);
const minorVersion = new Uint32Array(1);
const releaseVersion = new Uint32Array(1);

console.log("[Bun] Invoking JIT-compiled C boundary switch...");

// 4. Fire the function out of the dynamically compiled memory space
const status = h5Lib.check_hdf5_version(
  ptr(majorVersion),
  ptr(minorVersion),
  ptr(releaseVersion)
);
  return c.json({
    major: majorVersion[0],
    minor: minorVersion[0],
    release: releaseVersion[0],
    fullVersion: `${majorVersion[0]}.${minorVersion[0]}.${releaseVersion[0]}`
  });
});

app.get("/api/files", async (c) => {
  try {
    // Read all contents of the target directory
    const files = await readdir(HDF5_DATA_DIR, { withFileTypes: true });
    
    // Filter out directories and keep only HDF5 file extensions
    const hdf5Files = files
      .filter(file => file.isFile() && /\.(h5|hdf5|he5)$/i.test(file.name))
      .map(file => ({
        name: file.name,
        absolutePath: join(HDF5_DATA_DIR, file.name)
      }));

    return c.json({
      success: true,
      directory: HDF5_DATA_DIR,
      files: hdf5Files
    });
  } catch (error: any) {
    return c.json({
      success: false,
      directory: HDF5_DATA_DIR,
      error: error.message
    }, 500);
  }
});

app.get("/api/structure-deep", (c) => {
  const filepath = c.req.query("path");
  if (!filepath) return c.json({ success: false, message: "Missing path query" }, 400);

  let itemCount = 0;
  let flatNodes: FlatNode[] = [];
  let parserWarnings: string[] = [];

  try {
    const parsed = extractFlatNodesFromFile(filepath);
    itemCount = parsed.itemCount;
    flatNodes = parsed.flatNodes;
    parserWarnings = parsed.parserWarnings;
  } catch (error: any) {
    return c.json({ success: false, message: error.message ?? "Failed to parse HDF5 structure." }, 500);
  }

  const ensureChildren = (node: TreeNode) => {
    if (!node.children) {
      node.children = [];
    }
    return node.children;
  };

  // Build parent-child links from fullPath while preserving attributes for every group/dataset node.
  const buildNestedTree = (nodes: FlatNode[]): TreeNode => {
    const root: TreeNode = { name: "/", type: "Group", fullPath: "/", attributes: [], children: [] };
    const nodeMap = new Map<string, TreeNode>([["/", root]]);

    const getOrCreateNode = (fullPath: string, fallbackType: string): TreeNode => {
      const normalizedPath = normalizeNodePath(fullPath);
      const existing = nodeMap.get(normalizedPath);
      if (existing) {
        if (!existing.type || existing.type === "Unknown") {
          existing.type = fallbackType;
        }
        return existing;
      }

      const parts = normalizedPath.split("/").filter(Boolean);
      let name: string = "/";
      if (normalizedPath !== "/") {
        name = parts.length > 0 ? parts[parts.length - 1]! : normalizedPath;
      }
      const newNode: TreeNode = {
        name,
        type: fallbackType,
        fullPath: normalizedPath,
        attributes: [],
        children: fallbackType === "Dataset" ? undefined : []
      };

      nodeMap.set(normalizedPath, newNode);
      return newNode;
    };

    const linkChildToParent = (node: TreeNode) => {
      if (node.fullPath === "/") return;
      const segments = node.fullPath.split("/").filter(Boolean);
      const parentPath = segments.length <= 1 ? "/" : normalizeNodePath(segments.slice(0, -1).join("/"));
      const parent = getOrCreateNode(parentPath, "Group");
      const children = ensureChildren(parent);
      if (!children.some(child => child.fullPath === node.fullPath)) {
        children.push(node);
      }
    };

    nodes.forEach((flatNode) => {
      const node = getOrCreateNode(flatNode.fullPath, flatNode.type || "Unknown");
      node.type = flatNode.type || node.type;
      node.attributes = flatNode.attributes ?? [];

      if (node.type !== "Dataset") {
        ensureChildren(node);
      } else {
        node.children = undefined;
      }

      // Ensure each ancestor path exists as a group.
      const segments = flatNode.fullPath.split("/").filter(Boolean);
      for (let i = 1; i <= segments.length; i++) {
        const ancestorPath = normalizeNodePath(segments.slice(0, i).join("/"));
        const ancestorNode = getOrCreateNode(ancestorPath, i === segments.length ? node.type : "Group");
        if (i < segments.length) {
          ancestorNode.type = "Group";
          ensureChildren(ancestorNode);
        }
        linkChildToParent(ancestorNode);
      }

      linkChildToParent(node);
    });

    return root;
  };

  return c.json({
    success: true,
    schemaVersion: "2",
    fileName: filepath.split("/").pop(),
    itemCount: itemCount,
    parsedNodeCount: flatNodes.length,
    warnings: Array.from(new Set(parserWarnings)),
    rootNode: buildNestedTree(flatNodes)
  });
});

app.post("/api/select", async (c) => {
  try {
    cleanupExpiredStagedPayloads();

    const body = await c.req.json();
    const filePath = typeof body.filePath === "string" ? body.filePath : "";
    const requestedPath = typeof body.path === "string" ? body.path : "";
    const classChain = Array.isArray(body.classChain) ? (body.classChain as unknown[]) : null;

    if (!filePath || !requestedPath || !classChain || classChain.length === 0) {
      return c.json({ success: false, status: "INVALID_REQUEST", message: "filePath, path, and classChain are required." }, 400);
    }

    const normalizedRequestedPath = normalizeNodePath(requestedPath);
    const cleanedClassChain = classChain
      .filter((item: unknown): item is string => typeof item === "string")
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);

    if (cleanedClassChain.length === 0) {
      return c.json({ success: false, status: "INVALID_REQUEST", message: "classChain must contain class names." }, 400);
    }

    const { flatNodes } = extractFlatNodesFromFile(filePath);
    const nodeByPath = new Map(flatNodes.map(node => [normalizeNodePath(node.fullPath), node]));
    const selectedNode = nodeByPath.get(normalizedRequestedPath);

    if (!selectedNode) {
      return c.json({ success: false, status: "PATH_NOT_FOUND", message: "Path not found in the HDF5 file." }, 404);
    }

    const requestedLeafClass = cleanedClassChain[cleanedClassChain.length - 1];
    if (selectedNode.type !== requestedLeafClass) {
      return c.json({
        success: false,
        status: "LEAF_CLASS_MISMATCH",
        message: `Path exists but leaf class mismatch: expected '${requestedLeafClass}', found '${selectedNode.type}'.`
      }, 409);
    }

    const pathSegments = normalizedRequestedPath.split("/").filter(Boolean);
    const actualClassChain: string[] = ["Group"];
    for (let i = 1; i <= pathSegments.length; i++) {
      const partialPath = `/${pathSegments.slice(0, i).join("/")}`;
      const partialNode = nodeByPath.get(partialPath);
      if (!partialNode) {
        return c.json({
          success: false,
          status: "PATH_NOT_FOUND",
          message: `Path segment not found in HDF5 hierarchy: ${partialPath}`
        }, 404);
      }
      actualClassChain.push(partialNode.type);
    }

    const sameLength = actualClassChain.length === cleanedClassChain.length;
    const sameClasses = sameLength && actualClassChain.every((value, idx) => value === cleanedClassChain[idx]);

    if (!sameClasses) {
      return c.json({
        success: false,
        status: "CLASS_CHAIN_MISMATCH",
        message: "Path exists but class chain from root does not match the HDF5 hierarchy.",
        expectedClassChain: actualClassChain
      }, 409);
    }

    return c.json({
      success: true,
      status: "OK",
      message: "Selection validated for path and class chain.",
      path: normalizedRequestedPath,
      classChain: actualClassChain,
      payload: (() => {
        const leafBufferSize = 1024 * 1024;
        const leafPayloadBuffer = new Uint8Array(leafBufferSize);
        const payloadBytesWritten = h5Lib.read_leaf_payload_json(
          Buffer.from(filePath + "\0"),
          Buffer.from(normalizedRequestedPath + "\0"),
          ptr(leafPayloadBuffer),
          leafBufferSize
        );

        if (payloadBytesWritten < 0) {
          throw new Error(`Failed to read leaf payload from native layer (code ${payloadBytesWritten}).`);
        }

        const now = Date.now();
        const payloadId = randomUUID();
        const stagedBytes = leafPayloadBuffer.slice(0, payloadBytesWritten);
        const parsedLeafPayload = JSON.parse(new TextDecoder().decode(stagedBytes));
        const className = typeof parsedLeafPayload.class === "string" ? parsedLeafPayload.class : selectedNode.type;

        stagedLeafPayloads.set(payloadId, {
          id: payloadId,
          filePath,
          path: normalizedRequestedPath,
          className,
          bytes: stagedBytes,
          createdAt: now,
          expiresAt: now + STAGED_PAYLOAD_TTL_MS,
          mimeType: "application/json"
        });

        return {
          id: payloadId,
          className,
          mimeType: "application/json",
          bytes: stagedBytes.byteLength,
          createdAt: now,
          expiresAt: now + STAGED_PAYLOAD_TTL_MS,
          websocketReady: true,
          websocket: {
            path: `/ws/select/${payloadId}`,
            protocol: "hdf5-select-v1",
            url: `${hasTlsFiles ? "wss" : "ws"}://localhost:3000/ws/select/${payloadId}`
          }
        };
      })()
    });
  } catch (error: any) {
    return c.json({ success: false, status: "ERROR", message: error.message ?? "Internal server error." }, 500);
  }
});

app.get("/api/select-buffer/:id", (c) => {
  cleanupExpiredStagedPayloads();

  const id = c.req.param("id");
  const staged = stagedLeafPayloads.get(id);
  if (!staged) {
    return c.json({ success: false, status: "NOT_FOUND", message: "Staged payload token not found or expired." }, 404);
  }

  const preview = JSON.parse(new TextDecoder().decode(staged.bytes));
  return c.json({
    success: true,
    status: "OK",
    id: staged.id,
    filePath: staged.filePath,
    path: staged.path,
    className: staged.className,
    mimeType: staged.mimeType,
    bytes: staged.bytes.byteLength,
    createdAt: staged.createdAt,
    expiresAt: staged.expiresAt,
    payload: preview
  });
});

app.get("/ws/select/:id", upgradeWebSocket((c) => {
  const id = c.req.param("id");
  const origin = c.req.header("origin");

  return {
    onOpen(_event, ws) {
      cleanupExpiredStagedPayloads();

      if (origin && !allowedOrigins.has(origin)) {
        ws.send(JSON.stringify({
          type: "ERROR",
          code: "ORIGIN_NOT_ALLOWED",
          message: `Origin is not allowed: ${origin}`
        }));
        ws.close(1008, "Origin not allowed");
        return;
      }

      if (!id) {
        ws.send(JSON.stringify({
          type: "ERROR",
          code: "TOKEN_REQUIRED",
          message: "Missing staged payload token."
        }));
        ws.close(1008, "Token required");
        return;
      }

      const staged = stagedLeafPayloads.get(id);
      if (!staged) {
        ws.send(JSON.stringify({
          type: "ERROR",
          code: "TOKEN_NOT_FOUND",
          message: "Staged payload token not found or expired."
        }));
        ws.close(1008, "Token not found");
        return;
      }

      const classChannel =
        staged.className === "Image" ? "image" :
        staged.className === "Table" ? "table" :
        "dataset";

      const chunkSize = 64 * 1024;
      const chunkCount = Math.ceil(staged.bytes.byteLength / chunkSize);

      ws.send(JSON.stringify({
        type: "STREAM_META",
        protocol: "hdf5-select-v1",
        id: staged.id,
        className: staged.className,
        classChannel,
        filePath: staged.filePath,
        path: staged.path,
        mimeType: staged.mimeType,
        payloadEncoding: "utf8-json-binary",
        reconstructor: "Uint8Array",
        bytes: staged.bytes.byteLength,
        chunkSize,
        chunkCount,
        createdAt: staged.createdAt,
        expiresAt: staged.expiresAt
      }));

      for (let offset = 0; offset < staged.bytes.byteLength; offset += chunkSize) {
        const chunk = staged.bytes.slice(offset, Math.min(offset + chunkSize, staged.bytes.byteLength));
        ws.send(chunk);
      }

      ws.send(JSON.stringify({
        type: "STREAM_COMPLETE",
        id: staged.id,
        className: staged.className,
        bytes: staged.bytes.byteLength,
        chunkCount
      }));

      // One-time token consumption after successful stream dispatch.
      stagedLeafPayloads.delete(staged.id);
      ws.close(1000, "Stream complete");
    },
    onError(_event, ws) {
      ws.send(JSON.stringify({
        type: "ERROR",
        code: "WS_ERROR",
        message: "WebSocket stream error"
      }));
    }
  };
}));

app.get("/openapi.json", (c) => {
  return c.json(buildOpenApiSpec());
});

app.get("/asyncapi.json", (c) => {
  c.header("Content-Type", "application/json; charset=utf-8");
  c.header("Cross-Origin-Resource-Policy", "cross-origin");
  c.header("Access-Control-Allow-Origin", "*");
  return c.json(buildAsyncApiSpec());
});

app.get("/docs", (c) => {
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HDF5 Bun API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        window.SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [window.SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`);
});

const asyncApiAssetRoot = join(import.meta.dir, "node_modules", "@asyncapi", "web-component", "lib");
const asyncApiStyleRoot = join(import.meta.dir, "node_modules", "@asyncapi", "react-component", "styles");

const sendAsyncApiAsset = (c: any, requestedPath: string) => {
  const normalized = requestedPath.replace(/^\/+/, "");
  const candidatePaths = normalized
    ? [normalized, normalized.startsWith("styles/") ? normalized : `styles/${normalized}`]
    : ["styles/default.min.css"];

  let resolvedPath: string | null = null;
  for (const candidate of candidatePaths) {
    const webComponentPath = join(asyncApiAssetRoot, candidate);
    const reactStylePath = candidate.startsWith("styles/")
      ? join(asyncApiStyleRoot, candidate.replace(/^styles\//, ""))
      : join(asyncApiStyleRoot, candidate);

    if (existsSync(webComponentPath)) {
      resolvedPath = webComponentPath;
      break;
    }
    if (existsSync(reactStylePath)) {
      resolvedPath = reactStylePath;
      break;
    }
  }

  if (!resolvedPath) {
    return c.text(`AsyncAPI asset not found: ${normalized || "styles/default.min.css"}`, 404);
  }

  const bytes = readFileSync(resolvedPath);
  if (resolvedPath.endsWith(".css")) {
    c.header("Content-Type", "text/css; charset=utf-8");
  } else if (resolvedPath.endsWith(".js")) {
    c.header("Content-Type", "application/javascript; charset=utf-8");
  }
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(bytes);
};

app.get("/asyncapi-assets", (c) => {
  return sendAsyncApiAsset(c, "styles/default.min.css");
});

app.get("/asyncapi-assets/", (c) => {
  return sendAsyncApiAsset(c, "styles/default.min.css");
});

app.get("/asyncapi-assets/default.min.css", (c) => {
  return sendAsyncApiAsset(c, "styles/default.min.css");
});

app.get("/asyncapi-assets/default.css", (c) => {
  return sendAsyncApiAsset(c, "styles/default.min.css");
});

app.get("/asyncapi-assets/asyncapi-web-component.js", (c) => {
  return sendAsyncApiAsset(c, "asyncapi-web-component.js");
});

app.get("/asyncapi-assets/*", (c) => {
  const suffix = c.req.path.replace("/asyncapi-assets/", "");
  return sendAsyncApiAsset(c, suffix);
});

app.get("/asyncapi", (c) => {
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HDF5 Bun WebSocket AsyncAPI Docs</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="/asyncapi-assets/default.min.css" />
    <script src="/asyncapi-assets/asyncapi-web-component.js"></script>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; }
      asyncapi-component { height: 100vh; }
      .fallback {
        display: none;
        max-width: 1000px;
        margin: 1rem auto;
        padding: 0.9rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
      }
    </style>
  </head>
  <body>
    <div id="asyncapi-mount"></div>

    <section class="fallback" id="asyncapi-fallback">
      Interactive viewer failed to initialize. Raw specification is available at <a href="/asyncapi.json">/asyncapi.json</a>.
    </section>

    <script>
      (async () => {
        const fallback = document.getElementById('asyncapi-fallback');
        const mount = document.getElementById('asyncapi-mount');
        const hasComponent = !!window.customElements?.get('asyncapi-component');

        if (!hasComponent || !mount) {
          if (fallback) fallback.style.display = 'block';
          return;
        }

        const comp = document.createElement('asyncapi-component');
        comp.style.height = '100vh';
        comp.setAttribute('cssImportPath', '/asyncapi-assets/default.min.css');
        comp.schemaUrl = '/asyncapi.json';
        mount.appendChild(comp);

        // Show fallback if component stays empty.
        setTimeout(() => {
          const hasRenderedContent = (comp.shadowRoot && comp.shadowRoot.childElementCount > 0) || comp.childElementCount > 0;
          if (!hasRenderedContent && fallback) {
            fallback.style.display = 'block';
          }
        }, 2000);
      })();
    </script>
  </body>
</html>`);
});

app.get("/favicon.ico", (c) => {
  return c.body(null, 204);
});

// 3. Serve Vue frontend production build assets
app.use("/*", serveStatic({ root: "./dist-frontend" }));

const tlsKeyFile = Bun.env.TLS_KEY_FILE;
const tlsCertFile = Bun.env.TLS_CERT_FILE;
const hasTlsFiles =
  typeof tlsKeyFile === "string" &&
  typeof tlsCertFile === "string" &&
  existsSync(tlsKeyFile) &&
  existsSync(tlsCertFile);

if (hasTlsFiles) {
  console.log(`[Bun] HTTPS enabled with TLS key: ${tlsKeyFile}`);
  console.log(`[Bun] HTTPS enabled with TLS cert: ${tlsCertFile}`);
}

const serverConfig = {
  port: 3000,
  fetch: app.fetch,
  websocket,
  ...(hasTlsFiles
    ? {
        tls: {
          key: readFileSync(tlsKeyFile),
          cert: readFileSync(tlsCertFile)
        }
      }
    : {})
};

export default serverConfig;

console.log(`🚀 Hono Server running at ${hasTlsFiles ? "https" : "http"}://localhost:3000`);