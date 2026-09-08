import * as hdf5 from "../hdf5.js"; 
import { h5lt, h5pt } from "../hdf5_hl.js";

export function readPacketTable(fileId, dsetName, optionsOrCb, cb) {
}

export function makePacketTable(fileId, dsetName, buffer, options = {}) {
}

export class PacketTable {
    #nativeId      = 0;
    #gcpl_id = 0;
    #rank = 0;
    
  constructor(id, rank) {
    this.#nativeId = id; // The raw native hid_t identifier
    this.rank = rank;
  }

  getId() {
    return this.getNativeId(); 
  }

  getNativeId() {
    return this.#nativeId;
  }

  readTable(tableName, cb) {
    const table = new PacketTable(h5pt.H5PTopen(this.id, tableName), h5pt.H5PTget_nmembers(this.id, tableName));
    h5pt.H5PTcreate_index(this.id);
    h5pt.H5PTget_num_packets(this.id, (nrecords) => {
       table.nrecords = nrecords;
      H5PTcreate_index(this.id);
    //   H5PTget_info(this.id, tableName, (info) => {
    //     table.info = info;
    //               });
        h5pt.H5PTget_next(this.id, (first) => {
        if (first) {
            table.record = H5PTget_packet(this.id, 0);
            cb(table);
        } else {
            cb(table);
        }
        });
    });
    }
                

    close() {
      h5pt.H5PTclose(this.id);
    }
    
    getRecord() {
    return this.record;
  }

  setRecord(record) {
    this.record = record;
  }

  getFieldNames() {
    return Object.keys(this.record);
  }

  getField(fieldName) {
    return this.record[fieldName];
  }

  setField(fieldName, value) {
    this.record[fieldName] = value;
  }

  append() {
    const record = {};
    for (let i = 0; i < this.rank; i++) {
      record[this.getFieldNames()[i]] = this.getField(this.getFieldNames()[i]);
    }
    this.record = record;
  }

  next() {
    H5PTget_next(this.id);
    return false;
  }
}
