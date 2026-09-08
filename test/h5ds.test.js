import { describe, beforeAll, afterAll, test, expect } from "bun:test";

import { hdf5Lib, h5ds } from '../index.js';
import globs from '../lib/globals.js';

describe("testing dimension scale interface ", () => {

    describe("create an h5, group and some dimension scales ", () => {
        // open hdf file
        let file;
        beforeAll(() => {
          file = new hdf5.File('./h5ds.h5', globs.Access.ACC_TRUNC);
        });

        test("should set scale ", () => {
            const group=file.createGroup('pmc/refinement');
            expect(group.id).not.toBe(-1);
            const buffer=Buffer.alloc(4096*4, "\0", "binary");
            buffer.type=H5Type.H5T_NATIVE_UINT;
            buffer.rank=2;
            buffer.rows=64;
            buffer.columns=64;
            for(let index=0;index<4096;index++) {
                buffer.writeUInt32LE((index % 1000), index*4);
            }
            h5lt.makeDataset(group.id, 'Data', buffer);

            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Data');
            expect(readAsBuffer.length).toBe(16384);
            expect(readAsBuffer.rows).toBe(64);

            const scaleBuffer=Buffer.alloc(64*8, "\0", "binary");
            scaleBuffer.type=H5Type.H5T_NATIVE_DOUBLE;
            for(let index=0;index<64;index++) {
                scaleBuffer.writeDoubleLE(index, index*8);
            }
            h5lt.makeDataset(group.id, 'X(dim)', scaleBuffer);
            expect(h5ds.isScale(group.id, 'X(dim)')).toBe(false);
            h5ds.setScale(group.id, 'X(dim)', "The X Scale");
            expect(h5ds.isScale(group.id, 'X(dim)')).toBe(true);

            expect(h5ds.isAttached(group.id, 'Data', 'X(dim)', 0)).toBe(false);
            h5ds.attachScale(group.id, 'Data', 'X(dim)', 0);
            expect(h5ds.isAttached(group.id, 'Data', 'X(dim)', 0)).toBe(true);

            const scaleYBuffer=Buffer.alloc(64*8, "\0", "binary");
            scaleYBuffer.type=H5Type.H5T_NATIVE_DOUBLE;
            for(let index=0;index<64;index++) {
                scaleYBuffer.writeDoubleLE(index-31, index*8);
            }
            h5lt.makeDataset(group.id, 'Y(dim)', scaleYBuffer);
            expect(h5ds.isScale(group.id, 'Y(dim)')).toBe(false);
            h5ds.setScale(group.id, 'Y(dim)', "The Y Scale");
            expect(h5ds.isScale(group.id, 'Y(dim)')).toBe(true);

            expect(h5ds.isAttached(group.id, 'Data', 'Y(dim)', 1)).toBe(false);
            h5ds.attachScale(group.id, 'Data', 'Y(dim)', 1);
            expect(h5ds.isAttached(group.id, 'Data', 'Y(dim)', 1)).toBe(true);
            expect(h5ds.getNumberOfScales(group.id, 'Data', 1)).toBe(1);
            expect(h5ds.getScaleName(group.id, 'Y(dim)')).toBe("The Y Scale");
            expect(h5ds.getLabel(group.id, 'Data', 1)).toBe("");
            expect(h5ds.setLabel(group.id, 'Data', 1, "y")).toBe(0);
            expect(h5ds.getLabel(group.id, 'Data', 1)).toBe("y");

            try {
                h5ds.iterateScale(group.id, 'Data', 1, function(r, status) {
                    console.dir("status: "+status);
                });
            } catch (e) {

            }
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

    describe("should read dimension scales ", () => {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./h5ds.h5', globs.Access.ACC_RDONLY);
        });

        test("should be dimension scales info ", () => {
            const group  = file.openGroup('pmc/refinement');
            let attrs    = group.getDatasetAttributes("Data");
            let attrText = "";
            Object.getOwnPropertyNames(attrs).forEach(function(val) {
                if (val!=="id") {
                    if(attrs[val].constructor.name===Array) {
                        attrText+=val+" :  ";
                        for(let mIndex=0;mIndex<attrs[val].Length();mIndex++) {
                            attrText+=attrs[val][mIndex];
                            if(mIndex<attrs[val].Length()-1) {attrText+=",";}
                        }
                    }
                    else{
                        attrText+=val+" :  "+attrs[val]+"\n";
                    }
                }
            });
            expect(attrText).toBe('DIMENSION_LIST :  ->/pmc/refinement/X(dim),->/pmc/refinement/Y(dim)\nDIMENSION_LABELS :  ,y\n');
            attrs = group.getDatasetAttributes("X(dim)");
            attrText="";
            Object.getOwnPropertyNames(attrs).forEach(function(val) {
                if (val !== "id") {
                    if(attrs[val].constructor.name===Array) {
                        attrText+=val+" :  ";
                        for(let mIndex=0;mIndex<attrs[val].Length();mIndex++) {
                            attrText+=attrs[val][mIndex];
                            if(mIndex<attrs[val].Length()-1) {attrText+=",";}
                        }
                    }
                    else{
                        attrText+=val+" :  "+attrs[val]+"\n";
                    }
                }
            });
            expect(attrText).toBe('CLASS :  DIMENSION_SCALE\nNAME :  The X Scale\nREFERENCE_LIST :  ->/pmc/refinement/Data,0\n');
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

});

