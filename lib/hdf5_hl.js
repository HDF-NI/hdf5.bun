import { dlopen, FFIType, suffix } from "bun:ffi";

const { symbols: { H5LTmake_dataset, H5LTread_dataset, H5LTset_attribute_string, H5LTmake_dataset_int, H5LTmake_dataset_double, H5LTmake_dataset_float, H5LTmake_dataset_char, H5LTread_dataset_int, H5LTread_dataset_double, H5LTread_dataset_float, H5LTread_dataset_char, H5LTget_dataset_info, H5IMis_image, H5IMget_image_info } } = dlopen(`libhdf5_hl.${suffix}`, {
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
  H5LTmake_dataset_double: { 
      args: ["i64", "cstring", "i32", "ptr", "ptr"], 
      returns: "i32" 
  },
  H5LTmake_dataset_int: { 
      args: ["i64", "cstring", "i32", "ptr", "ptr"], 
      returns: "i32" 
  },
  H5LTmake_dataset_float: { 
      args: ["i64", "cstring", "i32", "ptr", "ptr"], 
      returns: "i32" 
  },
  H5LTmake_dataset_char: { 
      args: ["i64", "cstring", "i32", "ptr", "ptr"], 
      returns: "i32" 
  },
  H5LTread_dataset_int:    { args: ["i64", "cstring", "ptr"], returns: "i32" },
  H5LTread_dataset_double: { args: ["i64", "cstring", "ptr"], returns: "i32" },
  H5LTread_dataset_float:  { args: ["i64", "cstring", "ptr"], returns: "i32" },
  H5LTread_dataset_char:   { args: ["i64", "cstring", "ptr"], returns: "i32" },
  H5LTget_dataset_info:    { args: ["i64", "cstring", "ptr", "ptr", "ptr"], returns: "i32" },
  H5IMis_image: {
    args: [FFIType.i64, FFIType.cstring],
    returns: FFIType.i32,
  },
  H5IMget_image_info: {
    args: [FFIType.i64, FFIType.cstring, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.cstring, FFIType.ptr],
    returns: FFIType.i32,
  },
});


export const h5im = {
  H5IMis_image,
  H5IMget_image_info,
}

export const h5lt = {
  H5LTmake_dataset,
  H5LTread_dataset,
  H5LTset_attribute_string,
  H5LTmake_dataset_int,
  H5LTmake_dataset_double,
  H5LTmake_dataset_float,
  H5LTmake_dataset_char,
  H5LTread_dataset_int,
  H5LTread_dataset_double,
  H5LTread_dataset_float,
  H5LTread_dataset_char,
  H5LTget_dataset_info,
}