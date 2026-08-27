import { dlopen, FFIType, read, suffix } from "bun:ffi";

// Load the libhdf5 library (resolves .so, .dylib, or .dll depending on platform)
const { symbols: { H5Fopen, H5Fcreate, H5Fclose, H5Gopen2, H5Gcreate2, H5Gget_info, H5Gclose, H5Lexists, H5Lmove, H5Lget_name_by_idx, H5Oget_info3, H5Oget_info_by_name3, H5Pcreate } } = dlopen(`libhdf5.${suffix}`, {
  H5Fopen: {
    // [const char *filename, unsigned flags, hid_t fapl_id]
    args: [FFIType.cstring, FFIType.u32, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Fcreate: {
    args: [FFIType.cstring, FFIType.u32, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Fclose: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
  H5Gopen2: {
    // [const char *filename, unsigned flags, hid_t fapl_id]
    args: [FFIType.i64, FFIType.cstring, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Gcreate2: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Gget_info_by_name: {
    args: [FFIType.i64, FFIType.cstring, "ptr", FFIType.i64],
    returns: FFIType.i32,
  },
  H5Gget_info: {
    args: [FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },
  H5Gclose: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
  H5Lexists: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64],
    returns: FFIType.i32,
  },
  H5Lmove: {
    args: [
      FFIType.i64,
      FFIType.cstring,
      FFIType.i64,
      FFIType.cstring,
      FFIType.i64,
      FFIType.i64,
    ],
    returns: FFIType.i32,
  },
  H5Lget_name_by_idx: {
    args: [
      FFIType.i64,
      FFIType.cstring,
      FFIType.i32,
      FFIType.i32,
      FFIType.u64,
      FFIType.ptr,
      FFIType.u64,
      FFIType.i64,
    ],
    returns: FFIType.i64,
  },
  H5Oget_info3: {
    args: [FFIType.i64, "ptr", FFIType.u32],
    returns: FFIType.i32,
  },
  H5Oget_info_by_name3: {
    args: [
      FFIType.i64,
      FFIType.cstring,
      "ptr",
      FFIType.u32,
      FFIType.i64,
    ],
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
  H5Fclose,
  H5Gcreate2,
  H5Gopen2,
  H5Gcreate2,
  H5Gget_info,
  H5Gclose,
  H5Lexists,
  H5Lmove,
  H5Lget_name_by_idx,
  H5Oget_info3,
  H5Oget_info_by_name3,
  H5P_FILE_ACCESS,
  H5Pcreate,
};
export default hdf5;
