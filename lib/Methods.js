import { symbols as hdf5 } from "./hdf5.js";

class Methods extends Attributes {
  constructor(id) {
    super(id); // Initializes the parent Attributes constructor
  }

  createGroup(groupName) {
    return new Group(this.id, groupName);
  }

  // Example of a shared structural method for both Files and Groups
  GetNumAttrs() {
    const H5O_INFO_ALL = 0x00FF;

// Allocate memory buffer for H5O_info2_t struct (~96 bytes)
    const oinfoBuffer = new Uint8Array(128);

    const status = hdf5.H5Oget_info3(fileId, ptr(oinfoBuffer), H5O_INFO_ALL);

    if (status < 0) {
        throw new Error(`GetNumAttrs failed with status code: ${status}`);
    }
    const dataView = new DataView(oinfoBuffer.buffer);
    return dataView.getBigUint64(64, true);
  }

}