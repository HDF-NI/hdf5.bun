import { dlopen, FFIType, suffix, ptr } from "bun:ffi";

// Load the libhdf5 library (resolves .so, .dylib, or .dll depending on platform)
const coreLib = dlopen(`libhdf5.${suffix}`, {
  H5get_libversion: {
    // Signature: herr_t H5get_libversion(unsigned *majnum, unsigned *minnum, unsigned *relnum)
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5Aexists: {
    args: [FFIType.i64,  FFIType.cstring, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Aopen: {
    args: [FFIType.i64,  FFIType.cstring, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Acreate2: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64, FFIType.i64, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Aget_space: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Aget_type: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Aread: {
    args: [FFIType.i64, FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5Awrite: {
    args: [FFIType.i64, FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5Aiterate2: {
    args: [FFIType.i64, FFIType.u32, FFIType.u32, FFIType.ptr, FFIType.function, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5Aclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Dopen2: {
    args: [FFIType.i64,  FFIType.cstring, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Dget_type: {
    args: [FFIType.i64],
    returns: FFIType.i64
  },
  H5Dread: {
      // hid_t dataset_id, hid_t mem_type_id, hid_t mem_space_id, 
      // hid_t file_space_id, hid_t xfer_plist_id, void *buf
      args: [FFIType.i64, FFIType.i64, FFIType.i64, FFIType.i64, FFIType.i64, FFIType.ptr],
      returns: FFIType.i64,
  },
  H5Dwrite: {
      args: [FFIType.i64, FFIType.i64, FFIType.i64, FFIType.i64, FFIType.i64, FFIType.ptr],
      returns: FFIType.i64,
  },
  H5Dget_space: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Dget_create_plist: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Dclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Eprint2: {
    args: [FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5Fopen: {
    // [const char *filename, unsigned flags, hid_t fapl_id]
    args: [ FFIType.cstring, FFIType.u32, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Fcreate: {
    args: [ FFIType.cstring, FFIType.u32, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Fis_hdf5: {
    args: [ FFIType.cstring],
    returns: FFIType.i64,
  },
  H5Fis_accessible: {
    args: [ FFIType.cstring, FFIType.i64],         // const char *container_name, hid_t fapl_id
    returns: FFIType.i32                         // Returns a standard C boolean integer trilateral (htri_t)
  },
  H5Fclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Gopen2: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64],
    returns: FFIType.i64, // hid_t return type
  },
  H5Gcreate2: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64, FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Gget_info_by_name: {
    args: [FFIType.i64,  FFIType.cstring, FFIType.ptr, FFIType.i64],
    returns: FFIType.i64,
  },
  H5Gget_info: {
    args: [FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5Gclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
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
    returns: FFIType.i64,
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
    args: [FFIType.i64, FFIType.ptr, FFIType.u32],
    returns: FFIType.i64,
  },
  H5Oget_info_by_name3: {
    args: [
      FFIType.i64,
       FFIType.cstring,
      FFIType.ptr,
      FFIType.u32,
      FFIType.i64,
    ],
    returns: FFIType.i64,
  },
  H5Pcreate: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Screate: {
    args: [FFIType.i32],
    returns: FFIType.i64,
  },
  H5Screate_simple: {
      // int rank, const hsize_t *current_dims, const hsize_t *max_dims
      args: [FFIType.i32, FFIType.ptr, FFIType.ptr],
      returns: FFIType.i64 // returns memory space hid_t
  },
  H5Sget_simple_extent_ndims: {
    args: [FFIType.i64],
    returns: FFIType.i32,
  },
  H5Sget_simple_extent_dims: {
    args: [FFIType.i64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5Sselect_hyperslab: {
    // hid_t space_id, H5S_seloper_t op, const const hsize_t *start, 
    // const hsize_t *stride, const hsize_t *count, const hsize_t *block
    args: [FFIType.i64, FFIType.i32, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32 // herr_t
  },
  H5Sclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Tget_class: {
    args: [FFIType.ptr],
    returns: FFIType.i32
  },
  H5Tget_nmembers: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Tget_member_type: {
    args: [FFIType.i64, "u32"],
    returns: FFIType.i64,
  },
  H5Tget_sign: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Tget_size: {
    args: [FFIType.i64],
    returns: "u64",
  },
  H5Tset_size: {
    args: [FFIType.i64, FFIType.u64],
    returns: FFIType.i64,
  },
  H5Tcopy: {
     args: [FFIType.i64],
     returns: FFIType.i64
  },
  H5Tvlen_create: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Tget_native_type: {
    args: [FFIType.i64, FFIType.i32],
    returns: FFIType.i64
  },
  H5Tget_order: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Tis_variable_str: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Tclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Zfilter_avail: {
    args: [FFIType.i32],
    returns: FFIType.i64,
  },
  H5Pget_nfilters: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5Pclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
});

export const {
  H5get_libversion,
  H5Aexists,
  H5Aopen,
  H5Acreate2,
  H5Aget_space,
  H5Aget_type,
  H5Aread,
  H5Awrite,
  H5Aiterate2,
  H5Aclose,
  H5Dopen2,
  H5Dcreate,
  H5Dget_type,
  H5Dread,
  H5Dwrite,
  H5Dget_space,
  H5Dget_create_plist,
  H5Dclose,
  H5Eprint2,
  H5Fopen,
  H5Fcreate,
  H5Fis_hdf5,
  H5Fis_accessible,
  H5Fclose,
  H5Gcreate2,
  H5Gopen2,
  H5Gget_info,
  H5Gclose,
  H5Lexists,
  H5Lmove,
  H5Lget_name_by_idx,
  H5Oget_info3,
  H5Oget_info_by_name3,
  H5Pcreate,
  H5Pget_nfilters,
  H5Pclose,
  H5Screate,
  H5Screate_simple,
  H5Sget_simple_extent_ndims,
  H5Sget_simple_extent_dims,
  H5Sclose,
  H5Tget_class,
  H5Tget_nmembers,
  H5Tget_member_type,
  H5Tget_sign,
  H5Tget_size,
  H5Tset_size,
  H5Tcopy,
  H5Tvlen_create,
  H5Tget_native_type,
  H5Tget_order,
  H5Tis_variable_str,
  H5Tclose,
  H5Zfilter_avail,
} = coreLib.symbols;

const middlewareLib = dlopen(`libtesth5.${suffix}`, {
  get_h5t_c_s1_type_id: { args: [], returns: FFIType.i64 },
  get_std_u8le_type_id: { args: [], returns: FFIType.i64 },
  get_native_uchar_type_id: { args: [], returns: FFIType.i64 },
  get_native_short_type_id: { args: [], returns: FFIType.i64 },
  get_native_ushort_type_id:{ args: [], returns: FFIType.i64 },
  get_native_int_type_id:   { args: [], returns: FFIType.i64 },
  get_native_int8_type_id:  { args: [], returns: FFIType.i64 },
  get_native_uint_type_id:  { args: [], returns: FFIType.i64 },
  get_native_float_type_id: { args: [], returns: FFIType.i64 },
  get_native_double_type_id:{ args: [], returns: FFIType.i64 },
});

// export const H5S_SCALAR = 0;
export const H5T_C_S1 = middlewareLib.symbols.get_h5t_c_s1_type_id();
export const H5T_STD_U8LE = middlewareLib.symbols.get_std_u8le_type_id();
export const H5T_NATIVE_UCHAR  = middlewareLib.symbols.get_native_uchar_type_id();
export const H5T_NATIVE_SHORT  = middlewareLib.symbols.get_native_short_type_id();
export const H5T_NATIVE_USHORT = middlewareLib.symbols.get_native_ushort_type_id();
export const H5T_NATIVE_INT    = middlewareLib.symbols.get_native_int_type_id();
export const H5T_NATIVE_INT8   = middlewareLib.symbols.get_native_int8_type_id();
export const H5T_NATIVE_UINT   = middlewareLib.symbols.get_native_uint_type_id();
export const H5T_NATIVE_LONG = H5T_NATIVE_INT;
export const H5T_NATIVE_FLOAT  = middlewareLib.symbols.get_native_float_type_id();
export const H5T_NATIVE_DOUBLE = middlewareLib.symbols.get_native_double_type_id();

export const H5P_DEFAULT = 0n;
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


