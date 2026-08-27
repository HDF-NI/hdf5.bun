import { File } from "./lib/File.js";
import { Group } from "./lib/Group.js";
import { getLibVersion, isHDF5 } from "./lib/hdf5.js";

File.GroupClassRef = Group;
Group.GroupClassRef = Group;

export { 
    File,
     Group
 };

export const hdf5 = {
  File: File,
  Group: Group,
  getLibVersion: getLibVersion,
  isHDF5: isHDF5
};

export const hdf5Lib = {
    hdf5
}
