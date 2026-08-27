import { dlopen, FFIType, suffix } from "bun:ffi";

// Load the libhdf5 library (resolves .so, .dylib, or .dll depending on platform)
const { symbols: { H5get_libversion, H5Dopen2, H5Dget_space, H5Dclose, H5Fopen, H5Fcreate, H5Fis_hdf5, H5Fis_accessible, H5Fclose, H5Gopen2, H5Gcreate2, H5Gget_info, H5Gclose, H5Lexists, H5Lmove, H5Lget_name_by_idx, H5Oget_info3, H5Oget_info_by_name3, H5Pcreate, H5Sget_simple_extent_ndims, H5Sget_simple_extent_dims, H5Sclose } } = dlopen(`libhdf5.${suffix}`, {
  H5get_libversion: {
    // Signature: herr_t H5get_libversion(unsigned *majnum, unsigned *minnum, unsigned *relnum)
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  H5Dopen2: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Dget_space: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Dclose: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
  H5Fopen: {
    // [const char *filename, unsigned flags, hid_t fapl_id]
    args: [FFIType.cstring, FFIType.u32, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Fcreate: {
    args: [FFIType.cstring, FFIType.u32, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Fis_hdf5: {
    args: [FFIType.cstring],
    returns: FFIType.i32,
  },
  H5Fis_accessible: {
    args: [FFIType.cstring, FFIType.i64],         // const char *container_name, hid_t fapl_id
    returns: FFIType.i32                         // Returns a standard C boolean integer trilateral (htri_t)
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
  H5Sget_simple_extent_ndims: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
  H5Sget_simple_extent_dims: {
    args: [FFIType.i64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  H5Sclose: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
});

export const H5P_DEFAULT = 0;
export const H5P_FILE_ACCESS = 50331652;

export function getLibVersion() {
  const major = new Uint32Array(1);
  const minor = new Uint32Array(1);
  const release = new Uint32Array(1);

  const status = H5get_libversion(ptr(major), ptr(minor), ptr(release));
  if (status < 0) throw new Error("HDF5 FFI Error: Failed to check library compilation version.");

  return `${major[0]}.${minor[0]}.${release[0]}`;
}

export function isHDF5(path) {
  // Use H5Fis_accessible (the 1.14+/2.x standard replacement for the legacy H5Fis_hdf5)
  // Passing 0n (H5P_DEFAULT) for the file access property list
  const result = H5Fis_accessible(path, 0n);
  
  // Under the HDF5 C engine specification:
  // > 0 means True (It is a valid HDF5 file)
  // == 0 means False (It is a file, but NOT HDF5)
  // < 0 means Error (The file physically doesn't exist or is locked)
  return result > 0;
}

export const hdf5 = {
  getLibVersion,
  isHDF5,
  H5Dopen2,
  H5Dget_space,
  H5Dclose,
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
  H5Sget_simple_extent_ndims,
  H5Sget_simple_extent_dims,
  H5Sclose,
};
export default hdf5;
