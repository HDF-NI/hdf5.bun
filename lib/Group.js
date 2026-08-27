import { H5P_DEFAULT, hdf5 } from "./hdf5.js";
import { Methods } from "./Methods.js";

class Group extends Methods {
  constructor(idOrParentId, groupName, isAlreadyOpen = false) {
    let groupId;
    if (isAlreadyOpen) {
      // ✅ Mode A: The handle is already open/created from our File loop!
      groupId = idOrParentId; 
    } else {
      // Mode B: Traditional manual open (e.g., file.openGroup('name'))
      groupId = hdf5.H5Gopen2(parentId, groupName, H5P_DEFAULT);
    }
    if (groupId < 0n) {
      throw new Error(`HDF5 FFI Error: Failed to open group "${groupName}"`);
    }
    super(groupId);
    this.name = groupName;
  }

  // Group-specific method that Files do NOT have
  close() {
    return hdf5.H5Gclose(this.getNativeId());
  }
}

export { Group };