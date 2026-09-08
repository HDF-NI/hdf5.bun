import * as hdf5 from "../hdf5.js"; 
import { h5ds as nativeH5ds } from "../hdf5_hl.js";

export function isScale(fileId, dsetName) {
    let status = nativeH5ds.H5DSis_scale(fileId);
    if (status < 0) {
        throw new Error("failed to get scale info");
    }
    return status > 0;
}

export function getScaleName(fileId, dsetName) {
    const scaleName = Buffer.alloc(255);
    const status = nativeH5ds.H5DSget_scale_name(fileId, scaleName, scaleName.length);
    if (status < 0) {
        throw new Error("failed to get scale name");
    }
    return scaleName.toString();
}

export function getLabel(fileId, dsetName, index) {
    const label = Buffer.alloc(255);
    const status = nativeH5ds.H5DSget_label(fileId, index, label, label.length);
    if (status < 0) {
        throw new Error("failed to get label");
    }
    return label.toString();
}

export function setScale(fileId, dsetName, scaleName) {
    const status = nativeH5ds.H5DSset_scale(fileId, scaleName);
    if (status < 0) {
        throw new Error("failed to set scale");
    }
}

export function setLabel(fileId, dsetName, index, label) {
    const status = nativeH5ds.H5DSset_label(fileId, index, label);
    if (status < 0) {
        throw new Error("failed to set label");
    }
}

export function attachScale(fileId, dsetName, scaleIndex) {
    const status = nativeH5ds.H5DSattach_scale(fileId, scaleIndex);
    if (status < 0) {
        throw new Error("failed to attach scale");
    }
}

export function detachScale(fileId, dsetName, scaleIndex) {
    const status = nativeH5ds.H5DSdetach_scale(fileId, scaleIndex);
    if (status < 0) {
        throw new Error("failed to detach scale");
    }
}

export function iterateScales(fileId, dsetName, index, cb) {
    const status = nativeH5ds.H5DSiterate_scales(fileId, index, null, null, cb);
    if (status < 0) {
        throw new Error("failed to iterate scales");
    }
}

export function getNumScales(fileId, dsetName, index) {
    const status = nativeH5ds.H5DSget_num_scales(fileId, index);
    if (status < 0) {
        throw new Error("failed to get number of scales");
    }
    return status;
}

export function setExtent(fileId, dsetName, extent) {
    const status = nativeH5ds.H5DSset_extent(fileId, extent);
    if (status < 0) {
        throw new Error("failed to set extent");
    }
}

export function getExtent(fileId, dsetName) {
    const extent = Buffer.alloc(8);
    const status = nativeH5ds.H5DSget_extent(fileId, extent);
    if (status < 0) {
        throw new Error("failed to get extent");
    }
    return extent;
}

export function getName(fileId, dsetName) {
    const name = Buffer.alloc(255);
    const status = nativeH5ds.H5DSget_name(fileId, name, name.length);
    if (status < 0) {
        throw new Error("failed to get name");
    }
    return name.toString();
}