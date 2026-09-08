import { ptr } from "bun:ffi";
import * as hdf5 from "./hdf5.js";
import { H5P_DEFAULT } from "./hdf5.js";

export class Filters {
    #parentId;
    #datasetName;
  constructor(parentId, datasetName) {
    this.parentId = parentId;
    this.datasetName = datasetName;
  }

  isAvailable(type) {
    const status = hdf5.H5Zfilter_avail(type);
    if (status < 0) {
      throw new Error("failed to check if filter is available");
    }
    return status > 0;
  }
  getNFilters() {
      const    did = hdf5.H5Dopen(this.parentId, this.datasetName, hdf5.H5P_DEFAULT);
      const    pl  = hdf5.H5Dget_create_plist(did);
      const      n   = hdf5.H5Pget_nfilters(pl);
      hdf5.H5Pclose(pl);
      hdf5.H5Dclose(did);
    return n;
  }
}