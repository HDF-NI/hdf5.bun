import { dlopen, FFIType, suffix } from "bun:ffi";

const { symbols: { H5LTmake_dataset, H5LTread_dataset, H5LTset_attribute_string, H5IMis_image, H5IMget_image_info } } = dlopen(`libhdf5_hl.${suffix}`, {
  H5LTmake_dataset: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i32, FFIType.ptr, FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },
  H5LTread_dataset: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64, FFIType.ptr],
    returns: FFIType.i32,
  },
  H5LTset_attribute_string: {
    args: [FFIType.i64, FFIType.cstring, FFIType.cstring, FFIType.cstring],
    returns: FFIType.i32,
  },
  H5IMis_image: {
    args: [FFIType.i64, FFIType.cstring],
    returns: FFIType.i32,
  },
  H5IMget_image_info: {
    args: [FFIType.i64, FFIType.cstring, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.cstring, FFIType.ptr],
    returns: FFIType.i32,
  },
});


export const hdf5_hl = {
  H5LTmake_dataset,
  H5LTread_dataset,
  H5LTset_attribute_string,
  H5IMis_image,
  H5IMget_image_info,
}