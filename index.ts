import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cc, ptr } from "bun:ffi";
import { readdir } from "node:fs/promises";
import { join } from "path";

const app = new Hono();

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "HDF5 Bun API",
    version: "1.0.0",
    description: "API for HDF5 inspection, version checks, file listing, and deep structure traversal."
  },
  servers: [{ url: "http://localhost:3000" }],
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
    }
  }
};

console.log("[Bun] Reading raw C source file dynamically...");

const cSourcePath = join(import.meta.dir, "test_h5.c");
const HDF5_DATA_DIR = "/home/roger/BunProjects/examples"; 

// 2. Compile and link in-memory using Bun's native 'cc' helper
const { symbols: h5Lib } = cc({
  source: cSourcePath,
  // 🏎️ CRITICAL LINKER STEP: Tell Bun's internal compiler to link your system's HDF5 library.
  // This matches the '-lhdf5' flag you passed to gcc previously.
  flags: ["-I/home/roger/Software/hdf5-1_10_5/dist/include",
          "-L/home/roger/Software/hdf5-1_10_5/dist/lib",
          "-lhdf5"],
library: ["hdf5"],
  symbols: {
    check_hdf5_version: {
      returns: "int",
      args: ["ptr", "ptr", "ptr"],
    },
    inspect_and_open_file: {
      returns: "int",
      args: ["cstring"], // Maps JavaScript string directly to (const char*)
    },
    get_deep_structure: { returns: "int", args: ["cstring", "ptr", "int"] }

  },
});

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

  // Allocate 64KB for large structural datasets trees
  const bufferSize = 65536; 
  const outputBuffer = new Uint8Array(bufferSize);

  const itemCount = h5Lib.get_deep_structure(
    Buffer.from(filepath + "\0"), 
    ptr(outputBuffer), 
    bufferSize
  );

  if (itemCount < 0) {
    return c.json({ success: false, message: "C layer failed to parse deep traversal structures." });
  }

  const rawString = new TextDecoder().decode(outputBuffer).replace(/\0/g, "");
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

  const parserWarnings: string[] = [];

  const parseFlatNode = (line: string): FlatNode | null => {
    try {
      const parsed = JSON.parse(line) as Partial<FlatNode>;
      if (typeof parsed.fullPath !== "string" || typeof parsed.type !== "string") {
        parserWarnings.push("Skipped a node record missing fullPath/type.");
        return null;
      }

      const attributes = Array.isArray(parsed.attributes) ? parsed.attributes : [];
      return {
        fullPath: parsed.fullPath,
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

  const flatNodes: FlatNode[] = nonEmptyLines
    .map(parseFlatNode)
    .filter((node): node is FlatNode => node !== null);

  if (flatNodes.length !== itemCount) {
    parserWarnings.push(`Node count mismatch: C reported ${itemCount}, parsed ${flatNodes.length}.`);
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
      const normalizedPath = fullPath === "" ? "/" : fullPath;
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
      const parentPath = segments.length <= 1 ? "/" : segments.slice(0, -1).join("/");
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
        const ancestorPath = segments.slice(0, i).join("/");
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

app.get("/openapi.json", (c) => {
  return c.json(openApiSpec);
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

// 3. Serve Vue frontend production build assets
app.use("/*", serveStatic({ root: "./dist-frontend" }));

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log("🚀 Hono Server running at http://localhost:3000");