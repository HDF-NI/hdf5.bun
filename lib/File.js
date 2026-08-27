import { ptr } from "bun:ffi";
import { hdf5, H5P_FILE_ACCESS, H5P_DEFAULT } from "./hdf5.js";
import { Methods } from "./Methods.js";

import globs from '../lib/globals.js';


class File extends Methods {
  static GroupClassRef = null;

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
    if (!File.GroupClassRef) {
      throw new Error("Ecosystem Initialization Error: Group class proxy not bound.");
    }
    return new File.GroupClassRef(current_id);
  }

  openGroup(xPath, separate_attributes=true) {
    const trail = xPath.split('/').filter(segment => segment.length > 0);
    let current_id=this.getNativeId();
    for (let i = 0; i < trail.length; i++) {
      let next_id;
      // console.log(i+" start this.id: "+this.id+" current_id: "+current_id+" "+trail[i]);
      if (hdf5.H5Lexists(current_id, trail[i], H5P_DEFAULT)>0) {
        next_id = hdf5.H5Gopen2(current_id, trail[i], H5P_DEFAULT);
      }
      if(next_id < 0n) {
        throw new Error(`Failed to open group ${trail[i]}`);
      }
      if (current_id !== this.getNativeId()) {
      // console.log("closing "+current_id+" "+trail[i]+" "+next_id+" "+i+" this.id: "+this.id);
        hdf5.H5Gclose(current_id);
      }
      current_id = next_id;
    }
    if (!File.GroupClassRef) {
      throw new Error("Ecosystem Initialization Error: Group class proxy not bound.");
    }
    return new File.GroupClassRef(current_id);
  }

  move(src, dst_id, dst) {
    if (hdf5.H5Lmove(this.getNativeId(), src, dst_id, dst, H5P_DEFAULT, H5P_DEFAULT)){
      throw new Error(`Failed move link to , ${dst} with return: ${src}`);
    };
  }

  getMemberNames() {
    const structBuffer = new Uint8Array(32);
    if(hdf5.H5Gget_info(this.getNativeId(), ptr(structBuffer))<0){
      throw new Error("Failed to get info");
    }

    const view = new DataView(structBuffer);
    let nlinks = view.getBigUint64(8, true);
      const members = new Array(Number(nlinks));
    for (let index = 0; index < nlinks; index++) {
      let name_C = this.getObjnameByIdx(index);
      members[index] = name_C;
    }
    return members;
  }

  getObjnameByIdx(idx) {
    // call H5Lget_name_by_idx with name as NULL to get its length
    let name_len = hdf5.H5Lget_name_by_idx(this.getNativeId(), "", globs.H5Index.H5_INDEX_NAME, globs.H5IterOrder.H5_ITER_INC, idx, null, 0, H5P_DEFAULT);

    // now, allocate C buffer to get the name
    const name_C = new Uint8Array(Number(name_len) + 1);
    name_len = hdf5.H5Lget_name_by_idx(this.getNativeId(), "", globs.H5Index.H5_INDEX_NAME, globs.H5IterOrder.H5_ITER_INC, idx, name_C, Number(name_len)+1, H5P_DEFAULT);
    return name_C;
  }

  // File-specific method that Groups do NOT have
  close() {
    return hdf5.H5Fclose(this.getNativeId());
  }
}

export { File };