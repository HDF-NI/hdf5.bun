import { dlopen, FFIType, suffix } from "bun:ffi";

const { symbols: { H5DSget_scale_name, H5DSget_label, H5DSset_scale, H5DSset_label, H5DSattach_scale, H5DSdetach_scale, H5DSiterate_scales, H5DSget_num_scales, H5DSis_scale, H5DSis_attached, H5LTmake_dataset, H5LTread_dataset, H5LTset_attribute_string, H5LTmake_dataset_int, H5LTmake_dataset_double, H5LTmake_dataset_float, H5LTmake_dataset_char, H5LTread_dataset_int, H5LTread_dataset_double, H5LTread_dataset_float, H5LTread_dataset_char, H5LTget_dataset_info, H5IMis_image, H5IMget_image_info, H5PTopen, H5PTcreate_index, H5PTget_next, H5PTget_num_packets, H5PTclose } } = dlopen(`libhdf5_hl.${suffix}`, {
  H5DSget_scale_name: {
    args: [FFIType.i64, FFIType.ptr, FFIType.i64],
    returns: FFIType.i64,
  },
  H5DSget_label: {
    args: [FFIType.i64, FFIType.i32, FFIType.ptr, FFIType.i64],
    returns: FFIType.i64,
  },
  H5DSset_scale: {
    args: [FFIType.i64, FFIType.cstring],
    returns: FFIType.i64,
  },
  H5DSset_label: {
    args: [FFIType.i64, FFIType.i32, FFIType.cstring],
    returns: FFIType.i64,
  },
  H5DSattach_scale: {
    args: [FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5DSdetach_scale: {
    args: [FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5DSiterate_scales: {
    args: [FFIType.i64, FFIType.i32, FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5DSget_num_scales: {
    args: [FFIType.i64, FFIType.i32],
    returns: FFIType.i64,
  },
  H5DSis_scale: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5DSis_attached: {
    args: [FFIType.i64, FFIType.i64],
    returns: FFIType.i64,
  },
  H5LTmake_dataset: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i32, FFIType.ptr, FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5LTread_dataset: {
    args: [FFIType.i64, FFIType.cstring, FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5LTset_attribute_string: {
    args: [FFIType.i64, FFIType.cstring, FFIType.cstring, FFIType.cstring],
    returns: FFIType.i64,
  },
  H5LTmake_dataset_double: { 
      args: [FFIType.i64, FFIType.cstring, FFIType.i32, FFIType.ptr, FFIType.ptr], 
      returns: FFIType.i64,
  },
  H5LTmake_dataset_int: { 
      args: [FFIType.i64, FFIType.cstring, FFIType.i32, FFIType.ptr, FFIType.ptr], 
      returns: FFIType.i64,
  },
  H5LTmake_dataset_float: { 
      args: [FFIType.i64, FFIType.cstring, FFIType.i32, FFIType.ptr, FFIType.ptr], 
      returns: FFIType.i64,
  },
  H5LTmake_dataset_char: { 
      args: [FFIType.i64, FFIType.cstring, FFIType.i32, FFIType.ptr, FFIType.ptr], 
      returns: FFIType.i64,
  },
  H5LTread_dataset_int:    { args: [FFIType.i64, FFIType.cstring, FFIType.ptr], returns: FFIType.i64 },
  H5LTread_dataset_double: { args: [FFIType.i64, FFIType.cstring, FFIType.ptr], returns: FFIType.i64 },
  H5LTread_dataset_float:  { args: [FFIType.i64, FFIType.cstring, FFIType.ptr], returns: FFIType.i64 },
  H5LTread_dataset_char:   { args: [FFIType.i64, FFIType.cstring, FFIType.ptr], returns: FFIType.i64 },
  H5LTget_dataset_info:    { args: [FFIType.i64, FFIType.cstring, FFIType.ptr, FFIType.ptr, FFIType.ptr], returns: FFIType.i64 },
  H5LTmake_dataset_string: {
    args: [FFIType.i64, FFIType.cstring, FFIType.cstring],
    returns: FFIType.i64,
  },
  H5IMis_image: {
    args: [FFIType.i64, FFIType.cstring],
    returns: FFIType.i64,
  },
  H5IMget_image_info: {
    args: [FFIType.i64, FFIType.cstring, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.cstring, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5PTopen: {
    args: [FFIType.i64, FFIType.cstring],
    returns: FFIType.i64,
  },
  H5PTcreate_index: {
    args: [FFIType.i64],
    returns: FFIType.i64,
  },
  H5PTget_next: {
    args: [FFIType.i64, FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5PTget_num_packets: {
    args: [FFIType.i64, FFIType.ptr],
    returns: FFIType.i64,
  },
  H5PTclose: {
    args: [FFIType.i64],
    returns: FFIType.i64,
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

export const h5pt = {
  H5PTopen,
  H5PTcreate_index,
  H5PTget_next,
  H5PTget_num_packets,
  H5PTclose,
};

export const h5ds = {
  H5DSget_scale_name,
  H5DSget_label,
  H5DSset_scale,
  H5DSset_label,
  H5DSattach_scale,
  H5DSdetach_scale,
  H5DSiterate_scales,
  H5DSget_num_scales,
  H5DSis_scale,
  H5DSis_attached,
};