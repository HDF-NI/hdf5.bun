import { hdf5 } from "./hdf5.js";
import { Methods } from "./Methods.js";
import { Group } from "./Group.js";

import globs from '../lib/globals.js';


class File extends Methods {
  constructor(filePath, accessMode) {
    const fileExists = Bun.file(filePath).size > 0;

    var fileId=0;
    if (!fileExists && accessMode !== globs.Access.ACC_RDONLY) {
      const plist_id = hdf5.H5Pcreate(hdf5.H5P_FILE_ACCESS);
      fileId = hdf5.H5Fcreate(filePath, accessMode, globs.H5P_DEFAULT, plist_id);
    }
    else {
      // 1. Call the FFI open function to get the native hid_t handle
      fileId = hdf5.H5Fopen(filePath, accessMode, globs.H5P_DEFAULT);
    }
    
    // 2. Pass the native handle up to the Methods & Attributes parent layers
    super(fileId); 
  }

  createGroup(xPath) {
    const trail = xPath.split('/');
    const previous_id=this.id;
    for (let i = 0; i < trail.length; i++) {
      if (hdf5.H5Lexists(previous_id, trail[i], 0)) {
        const hid = hdf5.H5Gopen2(previous_id, trail[i], 0);
        if (hid >= 0) {
          if (index < trail.size() - 1)
            hidPath.push_back(hid);
          previous_hid = hid;
          continue;
        }
        else {
          const groupId = hdf5.H5Gcreate2(previous_id, trail[i], 0, 0, 0);
          if (groupId >= 0) {
            const group = new Group(groupId, trail[i]);
            group.close();
            return group;
          }
          else {
            throw new Error(`Failed to create group ${trail[i]}`);
          }
        }
      }
    }
    // return new Group(this.id, groupName);
  }

  openGroup(xPath, separate_attributes=true) {
    const trail = xPath.split('/');
    previous_id=this.id;
    return new Group(this.id, trail[0]);
  }

  // File-specific method that Groups do NOT have
  close() {
    return hdf5.H5Fclose(this.id);
  }
}

export { File };