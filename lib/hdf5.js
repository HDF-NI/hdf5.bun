import { dlopen, FFIType, suffix } from "bun:ffi";

// Load the libhdf5 library (resolves .so, .dylib, or .dll depending on platform)
const { symbols: { H5Fopen, H5Lexists, H5Gcreate2, H5Fclose, H5Oget_info3 } } = dlopen(`libhdf5.${suffix}`, {
  H5Fopen: {
    // [const char *filename, unsigned flags, hid_t fapl_id]
    args: [FFIType.cstring, FFIType.u32, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Lexists: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64],
    returns: FFIType.i32,
  },
  H5Gcreate2: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Fclose: {
    args: FFIType.i64,
    returns: FFIType.i32,
  },
  H5Oget_info3: {
    args: FFIType.i64, "ptr", FFITypeu32,
    returns: FFIType.i32,
  },
});

export const hdf5 = {
  H5Fopen,
  H5Lexists,
  H5Gcreate2,
  H5Fclose,
  H5Oget_info3,
};
export default hdf5;
