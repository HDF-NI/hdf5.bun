import { ptr } from "bun:ffi";
import * as hdf5 from "./hdf5.js";
import {  H5P_FILE_ACCESS, H5P_DEFAULT } from "./hdf5.js";
import { Methods } from "./Methods.js";

import globs from '../lib/globals.js';
import { Group } from "./Group.js";
import { tr } from "@nuxt/ui/runtime/locale/index.js";


export class File extends Methods {

  constructor(filePath, accessMode) {
    const fileExists = Bun.file(filePath).size > 0;

    let fileId=0n;
    if (!fileExists && accessMode !== globs.Access.ACC_RDONLY) {
      // const plist_id = hdf5.H5Pcreate(H5P_FILE_ACCESS);
      console.log("filePath: "+filePath+" "+accessMode);
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
    let current_id=this.id;
    for (let i = 0; i < trail.length; i++) {
      let next_id=-1n;
      //  console.log(i+" start this.id: "+this.id+" current_id: "+current_id+" "+trail[i]+" "+H5P_DEFAULT);
      if (hdf5.H5Lexists(current_id, trail[i], H5P_DEFAULT)>0) {
        next_id = hdf5.H5Gopen2(current_id, trail[i], H5P_DEFAULT);
      }
      else {
        next_id = hdf5.H5Gcreate2(current_id, trail[i], H5P_DEFAULT, H5P_DEFAULT, H5P_DEFAULT);
      }
      if(next_id < 0n) {
        throw new Error(`Failed to create group ${trail[i]}`);
      }
      if (current_id !== this.id) {
      // console.log("closing "+current_id+" "+trail[i]+" "+next_id+" "+i+" this.id: "+this.id);
        hdf5.H5Gclose(current_id);
      }

      current_id = next_id;
    }
    return new Group(current_id);
  }

  openGroup(xPath, options) {
    const separate_attributes=options!=null && options!="undefined";
    const trail = xPath.split('/').filter(segment => segment.length > 0);
    let current_id=this.id;
    for (let i = 0; i < trail.length; i++) {
      let next_id=-1n;
      // console.log(i+" start this.id: "+this.id+" current_id: "+current_id+" "+trail[i]);
      if (hdf5.H5Lexists(current_id, trail[i], H5P_DEFAULT)>0) {
        next_id = hdf5.H5Gopen2(current_id, trail[i], H5P_DEFAULT);
      }
      if(next_id < 0n) {
        // next_id = hdf5.H5Gcreate2(current_id, trail[i], H5P_DEFAULT, H5P_DEFAULT, H5P_DEFAULT);
        // if (next_id < 0n) {
        console.log(" failing next_id: "+next_id+" "+trail[i]);
        throw new Error(`Failed to read group. Group ${trail[i]} doesn't exist.`);
        // }
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

  getMemberNames() {
    const structBuffer = new Uint8Array(32);
    if(hdf5.H5Gget_info(this.id, ptr(structBuffer))<0){
      throw new Error("Failed to get info");
    }

    const view = new DataView(structBuffer.buffer);
    let nlinks = view.getBigUint64(8, true);
      const members = new Array(Number(nlinks));
    for (let index = 0; index < nlinks; index++) {
      let name_C = this.getObjnameByIdx(index);
      members[index] = name_C;
    }
    return members;
  }

  getDatasetDimensions(datasetName) {
    const dataset=H5Dopen2(this.id, datasetName, H5P_DEFAULT);
    if(dataset<0){
      throw new Error("Failed to open dataset");
    }
    const dataspace=H5Dget_space(dataset);
    if(dataspace<0){
      H5Dclose(dataset);
      throw new Error("Failed to get dataset space");
    }
    const rank = H5Sget_simple_extent_ndims(dataspace);
    let dims=new Array(rank);
    let maxdims=new Array(rank);
    H5Sget_simple_extent_dims(dataspace, dims, maxdims);
    array = new Array(rank);
    for (elementIndex = 0; elementIndex < rank; elementIndex++) {
      array[elementIndex] = dims[elementIndex];
    }
    H5Sclose(dataspace);
    H5Dclose(dataset);
    return array;
  }

  // File-specific method that Groups do NOT have
  close() {
    return hdf5.H5Fclose(this.id);
  }
}
