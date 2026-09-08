import { ptr } from "bun:ffi";
import * as hdf5 from "./hdf5.js";
import { H5P_DEFAULT } from "./hdf5.js";
import { Methods } from "./Methods.js";

import globs from '../lib/globals.js';

export class Group extends Methods {
  
  constructor(idOrParentId, groupName = null) {
    let groupId;
    if (typeof idOrParentId === "bigint" && groupName === null) {
      // ✅ Mode A: The handle is already open/created from our File loop!
      groupId = idOrParentId; 
    } else {
      // Mode B: Traditional manual open (e.g., file.openGroup('name'))
      groupId = hdf5.H5Gopen2(idOrParentId, groupName, H5P_DEFAULT);
    }
    if (groupId < 0n) {
      throw new Error(`HDF5 FFI Error: Failed to open group "${groupName}"`);
    }
    super(groupId);
    this.name = groupName;
  }

  openGroup(xPath, options) {
    const separate_attributes=options!=null && options!="undefined";
    const trail = xPath.split('/').filter(segment => segment.length > 0);
    let current_id=this.id;
    for (let i = 0; i < trail.length; i++) {
      let next_id=-1n;
      // console.log(i+" group start this.id: "+this.id+" current_id: "+current_id+" "+trail[i]);
      if (hdf5.H5Lexists(current_id, trail[i], H5P_DEFAULT)>0) {
        next_id = hdf5.H5Gopen2(current_id, trail[i], H5P_DEFAULT);
      }
      if(next_id < 0n) {
        next_id = hdf5.H5Gcreate2(current_id, trail[i], H5P_DEFAULT, H5P_DEFAULT, H5P_DEFAULT);
        if (next_id < 0n) {
        throw new Error(`Failed to read group. Group ${trail[i]} doesn\'t exist.`);
        }
      }
      if (current_id !== this.id) {
      // console.log("closing "+current_id+" "+trail[i]+" "+next_id+" "+i+" this.id: "+this.id);
        hdf5.H5Gclose(current_id);
      }
      current_id = next_id;
    }
     if(separate_attributes){
      const attrs = {};
      this.refreshAttributes(attrs, current_id);
      return [new Group(current_id), attrs];
    }
  return new Group(current_id);
  }

  getChildType(objname) {
    const structBuffer = new Uint8Array(72);
    if(hdf5.H5Oget_info_by_name3(this.id, objname, ptr(structBuffer), globs.ObjectInfoFlags.ALL, H5P_DEFAULT)<0){
      throw new Error("Failed to get info");
    }
    const view = new DataView(structBuffer.buffer);
    return view.getUint32(24, true);
  }

  // Group-specific method that Files do NOT have
  close() {
    return hdf5.H5Gclose(this.id);
  }
}
