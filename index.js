import { File } from "./lib/File.js";
import { Group } from "./lib/Group.js";

File.GroupClassRef = Group;
Group.GroupClassRef = Group;

export { 
    File,
     Group
 };

export const hdf5 = {
  File: File,
  Group: Group
};

export const hdf5Lib = {
    hdf5
}
