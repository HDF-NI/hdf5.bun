import { File } from "./lib/File.js";
import { Group } from "./lib/Group.js";
import { getLibVersion, isHDF5 } from "./lib/hdf5.js";
import { makeDataset, readDataset, readDatasetAsBuffer } from "./lib/hl/DS.js";
import { isImage, makeImage, readImage } from "./lib/hl/Image.js";

// Keep your C++ style circular reference hooks exactly as they are
File.GroupClassRef = Group;
Group.GroupClassRef = Group;

// 1. Flat, named core exports
export { File, Group, getLibVersion, isHDF5, readImage };

// 2. 🌟 THE EXPLICIT NAMED PACKAGE EXPORTS:
// This builds the exact structural objects your test files look for
export const hdf5 = {
  File: File,
  Group: Group,
  getLibVersion: getLibVersion,
  isHDF5: isHDF5
};

export const h5lt = {
    makeDataset,
    readDataset,
    readDatasetAsBuffer
};

export const h5im = {
    isImage,
    makeImage,
    readImage
};

// This matches exactly what `import { hdf5Lib }` expects to find!
export const hdf5Lib = {
    hdf5,
    h5im
};
