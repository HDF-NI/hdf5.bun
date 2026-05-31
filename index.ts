import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cc, ptr } from "bun:ffi";
import { readdir } from "node:fs/promises";
import { join } from "path";

const app = new Hono();

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
  const flatNodes = rawString.split(";")
    .filter(row => row.includes("|"))
    .map(row => {
      const [fullPath, type] = row.split("|");
      return { fullPath, type };
    });

  // 🛠️ Helper to convert flat paths ("group/subgroup/dataset") into a real nested JSON object tree
  const buildNestedTree = (nodes: Array<{ fullPath: string; type: string }>) => {
    const root: any = { name: "/", type: "Group", children: [] };

    nodes.forEach(node => {
      const parts = node.fullPath.split("/");
      let currentLevel = root.children;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        let existingPath = currentLevel.find((p: any) => p.name === part);

        if (!existingPath) {
          existingPath = {
            name: part,
            type: isLast ? node.type : "Group",
            fullPath: parts.slice(0, index + 1).join("/"),
            children: isLast && node.type === "Dataset" ? undefined : []
          };
          currentLevel.push(existingPath);
        }
        if (existingPath.children) {
          currentLevel = existingPath.children;
        }
      });
    });
    return root;
  };

  return c.json({
    success: true,
    fileName: filepath.split("/").pop(),
    itemCount: itemCount,
    rootNode: buildNestedTree(flatNodes)
  });
});

// 3. Serve Vue frontend production build assets
app.use("/*", serveStatic({ root: "./dist-frontend" }));

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log("🚀 Hono Server running at http://localhost:3000");