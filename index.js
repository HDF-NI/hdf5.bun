import { File } from "./lib/File.js";
import { Group } from "./lib/Group.js";
import { PacketTable } from "./lib/hl/PacketTable.js";
import { isScale, getScaleName, getLabel, setScale, setLabel, attachScale, detachScale, iterateScales, getNumScales, setExtent, getExtent, getName } from "./lib/hl/DimensionScale.js";
import { getLibVersion, isHDF5 } from "./lib/hdf5.js";
import { makeDataset, readDataset, readDatasetAsBuffer } from "./lib/hl/DS.js";
import { isImage, makeImage, readImage } from "./lib/hl/Image.js";
import { readTable, makeTable } from "./lib/hl/Table.js";
import { readPacketTable, makePacketTable } from "./lib/hl/PacketTable.js";

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

export const h5tb = {
  readTable,
  makeTable
};

export const h5pt = {
  readPacketTable,
  makePacketTable
};

export const h5ds = {
  isScale,
  getScaleName,
  getLabel,
  setScale,
  setLabel,
  attachScale,
  detachScale,
  iterateScales,
  getNumScales,
  setExtent,
  getExtent,
  getName
};
// export const h5dt = {
//   readTable,
//   makeTable
// };

// This matches exactly what `import { hdf5Lib }` expects to find!
export const hdf5Lib = {
    hdf5,
    h5im,
    h5lt,
    h5tb,
    h5pt,
    h5ds
};
