import { ptr } from "bun:ffi";
import * as hdf5 from "./hdf5.js";
import { H5P_DEFAULT } from "./hdf5.js";
import { h5lt, h5im } from "./hdf5_hl.js";
import { Attributes } from "./Attributes.js";
import { Filters } from "./Filters.js";
import globs from './globals.js';
import { HLType } from './globals.js';


export class Methods extends Attributes {
  constructor(id) {
    super(id); // Initializes the parent Attributes constructor
  }

  createGroup(groupName) {
    const { Group } = require("./Group.js");
    return new Group(this.id, groupName);
  }

  move(src, dst_id, dst) {
    if (hdf5.H5Lmove(this.id, src, dst_id, dst, H5P_DEFAULT, H5P_DEFAULT)){
      throw new Error(`Failed move link to , ${dst} with return: ${src}`);
    };
  }

  // Example of a shared structural method for both Files and Groups
  getNumAttrs() {
    const H5O_INFO_ALL = 0x00FF;
    const H5O_INFO_NUM_ATTRS = 8;


// Allocate memory buffer for H5O_info2_t struct (~96 bytes)
    const oinfoBuffer = new Uint8Array(128);

    const status = hdf5.H5Oget_info3(this.id, oinfoBuffer, H5O_INFO_NUM_ATTRS);

    if (status < 0) {
      if (typeof hdf5.H5Eprint2 === "function") hdf5.H5Eprint2(0n, null); 
        throw new Error(`getNumAttrs failed with status code: ${status}`);
    }
    const dataView = new DataView(oinfoBuffer.buffer);
    return Number(dataView.getBigUint64(64, true));
  }

  getNumObjs() {
    const structBuffer = new Uint8Array(32);
    if(hdf5.H5Gget_info(this.id, ptr(structBuffer))<0){
      throw new Error("Failed to get info");
    }
    const view = new DataView(structBuffer.buffer);
    return view.getBigUint64(8, true);
  }

  getDatasetType(childName) {
    console.log("getDatasetType? childName: "+childName+" "+datasetName.endsWith("\0"));
    let hlType = HLType.HL_TYPE_LITE;
    console.log("getDatasetType? childName: "+childName);
    if (h5im.H5IMis_image(this.id, childName)) {
      hlType = HLType.HL_TYPE_IMAGE;
    }else{
      console.log("getDatasetType dsopen2");
      const ds = H5Dopen2(this.id, childNamePtr, BigInt(H5P_DEFAULT));
      if (ds >= 0) {
        const type = H5Dget_type(ds);
        switch (H5Tget_class(type)) {
          case H5T_COMPOUND: {
            console.log("getDatasetType compound");
            let  nmembers     = H5Tget_nmembers(type);
            let variableType = true;
            for (let memberIndex = 0; memberIndex < nmembers; memberIndex++) {
              const memberType = H5Tget_member_type(type, memberIndex);
              if (!(H5Tis_variable_str(memberType)>0)) {
                variableType = false;
              }
              H5Tclose(memberType);
            }
            if (variableType) {
              hlType = HLType.HL_TYPE_PACKET_TABLE;
            } else {
              hlType = HLType.HL_TYPE_TABLE;
            }
            break;
          }
          case H5T_STRING: console.log("getDatasetType string"); hlType = HLType.HL_TYPE_TEXT; break;
          default: break;
        }
        if (type >= 0) {
          H5Tclose(type);
        }
        H5Dclose(ds);
      }
      else console.log("getDatasetType dsopen2 failed");
    }
        return hlType; 
  }

  getDatasetDimensions(datasetName) {
    const dataset=hdf5.H5Dopen2(this.id, datasetName, hdf5.H5P_DEFAULT);
    if(dataset<0){
      throw new Error("Failed to open dataset");
    }
    const dataspace=hdf5.H5Dget_space(dataset);
    if(dataspace<0){
      hdf5.H5Dclose(dataset);
      throw new Error("Failed to get dataset space");
    }
    const rank = hdf5.H5Sget_simple_extent_ndims(dataspace);
    let dimsBuffer = new BigUint64Array(rank);
    let maxdimsBuffer = new BigUint64Array(rank);
    hdf5.H5Sget_simple_extent_dims(dataspace, dimsBuffer, maxdimsBuffer);
    let array = new Array(rank);
    if (rank < 0) {
      throw new Error("HDF5 Error: Failed to get simple extent dimensions.");
    }

    const dims = Array.from(dimsBuffer.subarray(0, rank)).map(Number);
    const maxdims = Array.from(maxdimsBuffer.subarray(0, rank)).map(Number);
    for (let elementIndex = 0; elementIndex < rank; elementIndex++) {
      array[elementIndex] = dims[elementIndex];
    }
    hdf5.H5Sclose(dataspace);
    hdf5.H5Dclose(dataset);
    return array;
  }

  getByteOrder(datasetName) {
    const dataset=hdf5.H5Dopen2(this.id, datasetName, hdf5.H5P_DEFAULT);
    if(dataset<0){
      throw new Error("Failed to open dataset");
    }
    const typeId = hdf5.H5Dget_type(dataset);
    const order = hdf5.H5Tget_order(typeId);
    hdf5.H5Tclose(typeId);
    hdf5.H5Dclose(dataset);
    return order;
  }

  getObjnameByIdx(idx) {
    // call H5Lget_name_by_idx with name as NULL to get its length
    let name_len = hdf5.H5Lget_name_by_idx(this.id, ".", globs.H5Index.H5_INDEX_NAME, globs.H5IterOrder.H5_ITER_INC, idx, null, 0, H5P_DEFAULT);

    // now, allocate C buffer to get the name
    const name_C = Buffer.alloc(Number(name_len) + 1);
    name_len = hdf5.H5Lget_name_by_idx(this.id, ".", globs.H5Index.H5_INDEX_NAME, globs.H5IterOrder.H5_ITER_INC, idx, name_C, Number(name_len)+1, H5P_DEFAULT);
    return name_C.toString('utf-8', 0, Number(name_len));
  }

  getMemberNamesByCreationOrder() {
    const structBuffer = new Uint8Array(32);
    if(hdf5.H5Gget_info(this.id, ptr(structBuffer))<0){
      throw new Error("Failed to get info");
    }
    const view = new DataView(structBuffer.buffer);
    let nlinks = view.getBigUint64(8, true);
      const members = new Array(Number(nlinks));
    for (let index = 0; index < nlinks; index++) {
      let name_C = this.getObjnameByIdx(this.id, index);
      members[index] = name_C;
    }
    return members;
  }

  getFilters() {
    // const structBuffer = new Uint8Array(32);
    // if(hdf5.H5Gget_info(this.id, ptr(structBuffer))<0){
    //   throw new Error("Failed to get info");
    // }
    // const view = new DataView(structBuffer.buffer);
    // let nfilters = view.getBigUint64(16, true);
    // const filters = new Array(Number(nfilters));
    // for (let index = 0; index < nfilters; index++) {
    //   let name_C = this.getObjnameByIdx(this.id, index);
    //   filters[index] = name_C;
    // }
    return new Filters(this.id, datasetName);
  }
}
