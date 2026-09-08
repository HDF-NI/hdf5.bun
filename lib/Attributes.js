import { FFIType, JSCallback, ptr } from "bun:ffi";
import * as hdf5 from "./hdf5.js";
import {   H5P_DEFAULT } from "./hdf5.js";
import { H5Index, H5IterOrder, H5S_class, H5Type } from "./globals.js";

function makeAttributeFromTypedArray(groupId, name, typedArray, typeId) {
    const rank = 1;
    const dims = new BigUint64Array([BigInt(typedArray.length)]);
    
    const spaceId = hdf5.H5Screate_simple(rank, Bun.ffi.ptr(dims), null);
    if (spaceId < 0) return;

    const attrTypeId = hdf5.H5Tcopy(typeId);
    const attrId = hdf5.H5Acreate2(groupId, name, attrTypeId, spaceId, H5P_DEFAULT, H5P_DEFAULT);

    if (attrId >= 0) {
        // Pass the array buffer pointer directly to the native driver layer
        hdf5.H5Awrite(attrId, attrTypeId, Bun.ffi.ptr(typedArray));
        hdf5.H5Aclose(attrId);
    }
    hdf5.H5Tclose(attrTypeId);
    hdf5.H5Sclose(spaceId);
}

function makeScalarAttribute(groupId, name, value, typeId) {
    const attrTypeId = hdf5.H5Tcopy(typeId);
    const spaceId = hdf5.H5Screate(BigInt(H5S_class.H5S_SCALAR));
    
    const attrId = hdf5.H5Acreate2(groupId, name, attrTypeId, spaceId, H5P_DEFAULT, H5P_DEFAULT);
    if (attrId >= 0) {
        // Allocate a tiny stack buffer for the raw native numeric bytes
        let dataBuffer;
        if (typeId === hdf5.H5T_NATIVE_DOUBLE) {
            dataBuffer = new Float64Array([value]);
        } else if (typeId === hdf5.H5T_NATIVE_INT64) {
            dataBuffer = new BigInt64Array([value]);
        } else {
            dataBuffer = new Int32Array([value]);
        }

        hdf5.H5Awrite(attrId, attrTypeId, Bun.ffi.ptr(dataBuffer));
        hdf5.H5Aclose(attrId);
    }
    hdf5.H5Sclose(spaceId);
    hdf5.H5Tclose(attrTypeId);
}

function makeAttributeFromArray(groupId, name, typedArray) {
    const rank = 1;
    const dims = new BigUint64Array([BigInt(typedArray.length)]);
    
    const spaceId = hdf5.H5Screate_simple(rank, dims, null);
    if (spaceId < 0) return;

    const attrTypeId = hdf5.H5Tcopy(hdf5.H5T_C_S1);
    hdf5.H5Tset_size(attrTypeId, H5Type.H5T_VARIABLE);
    const attrId = hdf5.H5Acreate2(groupId, name, attrTypeId, spaceId, H5P_DEFAULT, H5P_DEFAULT);

    if (attrId >= 0) {
        // Pass the array buffer pointer directly to the native driver layer
        hdf5.H5Awrite(attrId, attrTypeId, Bun.ffi.ptr(typedArray));
        hdf5.H5Aclose(attrId);
    }
    hdf5.H5Tclose(attrTypeId);
    hdf5.H5Sclose(spaceId);
}

function makeStringAttribute(groupId, name, value) {
          const  attr_type = hdf5.H5Tcopy(hdf5.H5T_C_S1);
          const byteLength = Buffer.byteLength(value, "utf8");
          if (byteLength>0) {
            hdf5.H5Tset_size(attr_type, byteLength);
          }
          const attr_space = hdf5.H5Screate(H5S_class.H5S_SCALAR);
          // console.log(byteLength, groupId, "msa name:", name, attr_type, attr_space, H5P_DEFAULT);
          const attr_id = hdf5.H5Acreate2(groupId, name, attr_type, attr_space, H5P_DEFAULT, H5P_DEFAULT);
          if (attr_id < 0) {
            hdf5.H5Sclose(attr_space);
            hdf5.H5Tclose(attr_type);
            throw new Error("failed creating attribute");
          }
          const valueBuf = Buffer.from(value + "\0", "utf8");
          hdf5.H5Awrite(attr_id, attr_type, valueBuf);
          hdf5.H5Sclose(attr_space);
          hdf5.H5Tclose(attr_type);
          hdf5.H5Aclose(attr_id);
}

export class Attributes {
  #nativeId      = 0;
  #gcpl_id = 0;

  constructor(id) {
    this.#nativeId = id; // The raw native hid_t identifier
  }

  get id() {
    return this.getNativeId(); 
  }

  // ✅ INTERNAL METHOD: Used strictly by your other FFI classes to get the real C pointer
  getNativeId() {
    return this.#nativeId;
  }
  
  // Example of a shared attribute method
  getNumAttrs() {
    throw new Error("Abstract method 'getNumAttrs' must be implemented by subclass.");
  }

  refresh() {
    const focus = {};
    // this.refreshAttributes(focus, this.id);
  }

flush() {
    // 1. Gather all property names directly present on this JS object instance
    // (Excluding internal identifiers and structural methods like 'id', 'flush', 'refresh')
    const propertyNames = Object.getOwnPropertyNames(this).filter(name => {
        return name !== "id" && typeof this[name] !== "function";
    });

    for (const name of propertyNames) {
        const value = this[name];
        if (value === undefined || value === null) continue;

        // Check if the attribute already exists in the native HDF5 structure
        // (Assuming H5Aexists is declared in your FFI symbol schema)
        const attrExists = hdf5.H5Aexists(this.id, name, H5P_DEFAULT);
        if (attrExists > 0) {
            hdf5.H5Adelete(this.id, name);
        }

        // 🎯 Replicating the massive V8 nested if/else type check block in pure JS:
        if (value instanceof Float64Array) {
            makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_DOUBLE);
        } 
        else if (value instanceof Float32Array) {
            makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_FLOAT);
        } 
        else if (value instanceof Int32Array) {
            makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_INT);
        } 
        else if (value instanceof Uint32Array) {
            makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_UINT);
        } 
        else if (value instanceof Int16Array) {
          _makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_SHORT);
        } 
        else if (value instanceof Uint16Array) {
          _makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_USHORT);
        } 
        else if (value instanceof Int8Array) {
            makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_INT8);
        } 
        else if (value instanceof Uint8Array) {
            makeAttributeFromTypedArray(this.id, name, value, hdf5.H5T_NATIVE_UINT8);
        } 
        else if (typeof value === "number") {
            // Handles native scalars (doubles/floats mapping from regular JS numbers)
            makeScalarAttribute(this.id, name, value, hdf5.H5T_NATIVE_DOUBLE);
        } 
        else if (typeof value === "string") {
          console.log("string name: "+name);
            // Variable or fixed-length string serialization handling
            makeStringAttribute(this.id, name, value);
        } 
        else if (Array.isArray(value)) {
            // Arrays (Strings, Int64 arrays, etc.) matching make_attribute_from_array
            makeAttributeFromArray(this.id, name, value);
        } 
        else if (typeof value === "bigint") {
            // Clean handling for native Int64/Uint64 bindings using JS BigInt
            makeScalarAttribute(this.id, name, value, hdf5.H5T_NATIVE_INT64);
        }
    }
}

  refreshAttributes(focus, id) {
    const idxBuffer = new BigUint64Array(1); 
    idxBuffer[0] = 0n;
    const activeIterations = new Map();
    const h5aCallback = new JSCallback(
      (loc_id, attr_name_ptr, ainfo_ptr, op_data_ptr) => {
        // Read the null-terminated C-string pointer passed by HDF5
        const attrName = new Bun.CString(attr_name_ptr).toString();
        console.log(`Found attribute name: ${attrName}`);

        // 🔍 2. Retrieve your target JS object `{}` using the op_data_ptr context key
        const targetObj = activeIterations.get(op_data_ptr);
        if (!targetObj) return -1; // Safeguard if context trace vanishes

        // 🔍 3. Open the actual attribute to read its value
        // (Assuming H5Aopen is mapped in your lib symbols)
        const attrId = hdf5.H5Aopen(loc_id, attr_name_ptr, 0);
        if (attrId < 0) return 0; // Skip if failed to open

        let attrValue;

        try {
          // 🔍 4. Determine data type and parse the bytes into JS
          // This part mimics what your hdf5.node C++ setup did dynamically
          const spaceId = hdf5.H5Aget_space(attrId);
          const typeId = hdf5.H5Aget_type(attrId);
          
          // Determine your byte size allocation requirements
          const typeSize = hdf5.H5Tget_size(typeId);
          const buffer = new Uint8Array(typeSize);

          // Read raw bytes into your JS array
          hdf5.H5Aread(attrId, typeId, Bun.ffi.ptr(buffer));

          // --- Convert raw buffer to exact type matching your schema ---
          // (Simplified example assuming floating points or string checks)
          const classType = hdf5.H5Tget_class(typeId);
          if (classType === H5T_FLOAT) {
            attrValue = new Float64Array(buffer.buffer)[0]; 
          } else if (classType === H5T_STRING) {
            attrValue = new Bun.CString(Bun.ffi.ptr(buffer)).toString();
          } else {
            attrValue = new Int32Array(buffer.buffer)[0]; // Fallback integer mapping
          }

          // Clean up local tracking IDs
          hdf5.H5Sclose(spaceId);
          hdf5.H5Tclose(typeId);
        } catch (err) {
          console.error(`Failed parsing value for ${attrName}:`, err);
        } finally {
          hdf5.H5Aclose(attrId);
        }

        // 🎯 5. Dynamically assign directly to your {} target!
        focus[attrName] = attrValue;

        // Return 0 to continue iteration, positive to stop and return that value, negative for error
        return 0; 
      },
      {
        // Exact C types matching the operator callback definition
        returns: FFIType.int,
        args: [FFIType.i64, FFIType.ptr, FFIType.ptr, FFIType.ptr],
      }
    );
      hdf5.H5Aiterate2(id,
              H5Index.H5_INDEX_NAME,
              H5IterOrder.H5_ITER_INC,
              ptr(idxBuffer),     // Pointer to track position
              h5aCallback,        // The native function pointer generated by Bun
              null );
  }
}
