import { hdf5, H5P_FILE_ACCESS, H5P_DEFAULT } from "./hdf5.js";
import { Methods } from "./Methods.js";
import { Group } from "./Group.js";

import globs from '../lib/globals.js';


class File extends Methods {
  constructor(filePath, accessMode) {
    const fileExists = Bun.file(filePath).size > 0;

    let fileId=0n;
    if (!fileExists && accessMode !== globs.Access.ACC_RDONLY) {
      // const plist_id = hdf5.H5Pcreate(H5P_FILE_ACCESS);
      fileId = hdf5.H5Fcreate(filePath, accessMode, H5P_DEFAULT, H5P_DEFAULT);
    }
    else {
      // 1. Call the FFI open function to get the native hid_t handle
      fileId = hdf5.H5Fopen(filePath, accessMode, H5P_DEFAULT);
    }
    
    if (fileId < 0n) {
      throw new Error(`HDF5 FFI Error: Failed to open or create file at ${filePath}`);
    }

    // 2. Pass the native handle up to the Methods & Attributes parent layers
    super(fileId); 
  }

  createGroup(xPath) {
    const trail = xPath.split('/').filter(segment => segment.length > 0);
    let current_id=this.getNativeId();
    for (let i = 0; i < trail.length; i++) {
      let next_id;
      // console.log(i+" start this.id: "+this.id+" current_id: "+current_id+" "+trail[i]);
      if (hdf5.H5Lexists(current_id, trail[i], H5P_DEFAULT)>0) {
        next_id = hdf5.H5Gopen2(current_id, trail[i], H5P_DEFAULT);
      }
      else {
        next_id = hdf5.H5Gcreate2(current_id, trail[i], H5P_DEFAULT, H5P_DEFAULT, H5P_DEFAULT);
      }
      if(next_id < 0n) {
        throw new Error(`Failed to create group ${trail[i]}`);
      }
      if (current_id !== this.getNativeId()) {
      // console.log("closing "+current_id+" "+trail[i]+" "+next_id+" "+i+" this.id: "+this.id);
        hdf5.H5Gclose(current_id);
      }
      current_id = next_id;
    }
    return new Group(current_id, trail[trail.length - 1], true);
  }

  openGroup(xPath, separate_attributes=true) {
    const trail = xPath.split('/');
    previous_id=this.id;
    return new Group(this.id, trail[0]);
  }

  // File-specific method that Groups do NOT have
  close() {
    return hdf5.H5Fclose(this.getNativeId());
  }
}

export { File };