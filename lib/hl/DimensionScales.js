import * as hdf5 from "../hdf5.js"; 
import { h5ds as nativeH5ds } from "../hdf5_hl.js";

export function isScale(fileId, dsetName) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    let status = nativeH5ds.H5DSis_scale(datasetId);
    hdf5.H5Dclose(datasetId);
    if (status < 0) {
        throw new Error("failed to get scale info");
    }
    return status > 0;
}

export function getScaleName(fileId, dsetName) {
   const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    let size = 0n;
    size = nativeH5ds.H5DSget_scale_name(datasetId, null, size);
    if (size <= 0n) {
        throw new Error("failed to get scale name");
    }

    const scaleName = Buffer.alloc(Number(size)+1);
    const status = nativeH5ds.H5DSget_scale_name(datasetId, scaleName, Number(size)+1);
    hdf5.H5Dclose(datasetId);
    if (status < 0) {
        throw new Error("failed to get scale name");
    }
    return scaleName.toString('utf8', 0, Number(size));
}

export function getLabel(fileId, dsetName, index) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    let size = 0n;
    size = nativeH5ds.H5DSget_label(datasetId, index, null, size);
    if(size == 0n) return "";
    else if (size < 0n) {
        throw new Error("failed to get label");
    }
    const label = Buffer.alloc(Number(size)+1);
    const status = nativeH5ds.H5DSget_label(datasetId, index, label, Number(size)+1);
    if (status < 0) {
        throw new Error("failed to get label");
    }
    return label.toString('utf8', 0, Number(size));
}

export function setScale(fileId, dsetName, scaleName) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    const status = nativeH5ds.H5DSset_scale(datasetId, scaleName);
    hdf5.H5Dclose(datasetId);
    if (status < 0) {
        throw new Error("failed to set scale");
    }
}

export function setLabel(fileId, dsetName, index, label) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    const status = nativeH5ds.H5DSset_label(datasetId, index, label);
    hdf5.H5Dclose(datasetId);
    if (status < 0) {
        throw new Error("failed to set label");
    }
    return status;
}

export function isAttached(fileId, dsetName, dimScaleName, scaleIndex) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    const dimScaleId = hdf5.H5Dopen2(fileId, dimScaleName, 0n);
    if (dimScaleId < 0) {
        hdf5.H5Dclose(datasetId);
            throw new Error("failed checking if attached");
    }
    const status = nativeH5ds.H5DSis_attached(datasetId, dimScaleId, scaleIndex);
    hdf5.H5Dclose(dimScaleId);
    hdf5.H5Dclose(datasetId);
    if (status < 0) {
        throw new Error("failed checking if attached");
    }
    return (status)? true : false;
}

export function attachScale(fileId, dsetName, dimScaleName, scaleIndex) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    const dimScaleId = hdf5.H5Dopen2(fileId, dimScaleName, 0n);
    const status = nativeH5ds.H5DSattach_scale(datasetId, dimScaleId, scaleIndex);
    hdf5.H5Dclose(dimScaleId);
    hdf5.H5Dclose(datasetId);
    if (status < 0) {
        throw new Error("failed to attach scale");
    }
}

export function detachScale(fileId, dsetName, scaleIndex) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    const dimScaleId = hdf5.H5Dopen2(fileId, dimScaleName, 0n);
    const status = nativeH5ds.H5DSdetach_scale(datasetId, dimScaleId, scaleIndex);
    hdf5.H5Dclose(dimScaleId);
    hdf5.H5Dclose(datasetId);
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

export function getNumberOfScales(fileId, dsetName, index) {
    const datasetId = hdf5.H5Dopen2(fileId, dsetName, 0n);
    const status = nativeH5ds.H5DSget_num_scales(datasetId, index);
    hdf5.H5Dclose(datasetId);
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