import { hdf5 } from "./hdf5.js";
import { Methods } from "./Methods.js";

class Group extends Methods {
  constructor(parentId, groupName) {
    const groupId = hdf5.H5Gopen2(parentId, groupName, 0);
    super(groupId);
  }

  // Group-specific method that Files do NOT have
  close() {
    return hdf5.H5Gclose(this.id);
  }
}

export { Group };