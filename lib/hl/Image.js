import * as hdf5 from "../hdf5.js"; 
import { h5lt, h5im as nativeH5im } from "../hdf5_hl.js";

export function isImage(fileId, dsetName) {
    let status = nativeH5im.H5IMis_image(fileId, dsetName);
    if (status < 0) {
        throw new Error("failed to get image info");
    }
    return status > 0;
}

export function makeImage(fileId, dsetName, buffer, options) {
    const width = buffer.width ?? options?.width;
    const height = buffer.height ?? options?.height;
    const planes = buffer.planes ?? options?.planes;
    const interlace = buffer.interlace ?? options?.interlace;
    const dsetNamePtr = Buffer.from(dsetName + "\0");
    const dims = new BigInt64Array(3);
    dims[1] = BigInt(width);
    dims[0] = BigInt(height);
    dims[2] = BigInt(planes);
    let status = h5lt.H5LTmake_dataset(fileId, dsetNamePtr, 3, dims, hdf5.H5T_NATIVE_UCHAR, buffer);
    console.log("H5LTmake_dataset status: "+status);
    if (status < 0) {
        throw new Error("failed to make image");
    }
    status = h5lt.H5LTset_attribute_string(fileId, dsetNamePtr, "CLASS", "IMAGE");
    status = h5lt.H5LTset_attribute_string(fileId, dsetNamePtr, "IMAGE_SUBCLASS", "IMAGE_BITMAP");
    status = h5lt.H5LTset_attribute_string(fileId, dsetNamePtr, "IMAGE_SUBCLASS", "IMAGE_TRUECOLOR");
    status = h5lt.H5LTset_attribute_string(fileId, dsetNamePtr, "IMAGE_VERSION", "1.2");
    if (interlace) {
        status = h5lt.H5LTset_attribute_string(fileId, dsetNamePtr, "INTERLACE_MODE", interlace);
        if (status < 0) {
            throw new Error("failed to make image");
        }
    }
}
export function readImage(fileId, dsetName, cb) {
    const width = new BigInt64Array(1);
    const height = new BigInt64Array(1);
    const planes = new BigInt64Array(1);
    const interlace = Buffer.alloc(255);
    const npals = new BigInt64Array(1);
    const dsetNamePtr = Buffer.from(dsetName + "\0");
    let status = nativeH5im.H5IMget_image_info(fileId, dsetNamePtr, width, height, planes, interlace, npals);
    if (status < 0) {
        throw new Error("failed to get image info");
    }
    const w = width[0];
    const h = height[0];
    const p = planes[0];
    const n = npals[0];
    const wNum = Number(w);
    const hNum = Number(h);
    const pNum = Number(p);
    const nNum = Number(n);
    const nullIdx = interlace.indexOf(0);
    const interlaceStr = nullIdx === -1 ? interlace.toString() : interlace.toString("utf8", 0, nullIdx);
    console.log("cb? "+cb);
    if (cb) {
        cb({
            width: wNum,
            height: hNum,
            planes: pNum,
            interlace: interlaceStr,
            npals: nNum
        });
    }
    const contentBuffer = new Uint8Array(wNum * hNum * pNum);
    const datasetId = hdf5.H5Dopen2(fileId, dsetNamePtr, hdf5.H5P_DEFAULT);
    console.log(`Resolved true file type ID from asset payload: ${datasetId}`);
    const fileDataTypeId = hdf5.H5Dget_type(datasetId);
    
    status = h5lt.H5LTread_dataset(fileId, dsetNamePtr, fileDataTypeId, contentBuffer);
    console.log("H5LTread_dataset status: "+status);
    if (status < 0) {
        throw new Error("failed to read image");
    }
    contentBuffer.width = wNum;
    contentBuffer.height = hNum;
    contentBuffer.planes = pNum;
    contentBuffer.interlace = interlaceStr;
    contentBuffer.npals = nNum;
    
    console.log("returning "+contentBuffer.length);
    return contentBuffer;
}

export const h5im = {
    isImage,
    makeImage,
    readImage,
};
export default h5im;
