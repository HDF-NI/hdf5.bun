import { ptr } from "bun:ffi";
import * as hdf5 from "./hdf5.js";
import { h5lt, h5im } from "./hdf5_hl.js";
import { Attributes } from "./Attributes.js";
import { HLType } from '../lib/globals.js';


class Methods extends Attributes {
  constructor(id) {
    super(id); // Initializes the parent Attributes constructor
  }

  createGroup(groupName) {
    const { Group } = require("./Group.js");
    return new Group(this.id, groupName);
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
        // 1. Grabs the Group's native 64-bit BigInt handle!
        const childNamePtr = Buffer.from(childName + "\0");

    let hlType = HLType.HL_TYPE_LITE;
    if (H5IMis_image(this.id, childNamePtr)) {
      hlType = HLType.HL_TYPE_IMAGE;
    }else{
      const ds = H5Dopen2(this.id, childNamePtr, H5P_DEFAULT);
      if (ds >= 0) {
        const type = H5Dget_type(ds);
        switch (H5Tget_class(type)) {
          case H5T_COMPOUND: {
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
          case H5T_STRING: hlType = HLType.HL_TYPE_TEXT; break;
          default: break;
        }
        if (type >= 0) {
          H5Tclose(type);
        }
        H5Dclose(ds);
      }
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
    let dims = new BigUint64Array(rank);
    let maxdims = new BigUint64Array(rank);
    hdf5.H5Sget_simple_extent_dims(dataspace, dims, maxdims);
    array = new Array(rank);
    for (elementIndex = 0; elementIndex < rank; elementIndex++) {
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
  flush() {
    // return hdf5.H5Fflush(this.id, globs.H5F_scope_t.H5F_SCOPE_GLOBAL);
  }

}

export { Methods };