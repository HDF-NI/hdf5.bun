import { dlopen, FFIType, read, suffix } from "bun:ffi";

// Load the libhdf5 library (resolves .so, .dylib, or .dll depending on platform)
const { symbols: { H5Fopen, H5Fcreate, H5Lexists, H5Fclose, H5Gopen2, H5Gcreate2, H5Gclose, H5Oget_info3, H5Pcreate } } = dlopen(`libhdf5.${suffix}`, {
  H5Fopen: {
    // [const char *filename, unsigned flags, hid_t fapl_id]
    args: [FFIType.cstring, FFIType.u32, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Fcreate: {
    args: [FFIType.cstring, FFIType.u32, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Lexists: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64],
    returns: FFIType.i32,
  },
  H5Fclose: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
  H5Gopen2: {
    // [const char *filename, unsigned flags, hid_t fapl_id]
    args: [FFIType.u32, FFIType.cstring, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Gcreate2: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Gclose: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
  H5Oget_info3: {
    args: [FFIType.i64, "ptr", FFIType.u32],
    returns: FFIType.i32,
  },
  H5Pcreate: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
});

export const H5P_DEFAULT = 0;
export const H5P_FILE_ACCESS = 50331652; 


export const hdf5 = {
  H5Fopen,
  H5Fcreate,
  H5Lexists,
  H5Gcreate2,
  H5Fclose,
  H5Gopen2,
  H5Gcreate2,
  H5Gclose,
  H5Oget_info3,
  H5P_FILE_ACCESS,
  H5Pcreate,
};
export default hdf5;
