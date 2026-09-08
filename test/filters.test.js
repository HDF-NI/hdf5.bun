import { describe, beforeAll, afterAll, test, expect } from "bun:test";

import { hdf5Lib, hdf5 } from '../index.js';
import globs from '../lib/globals.js';

describe("testing fiter interface ", () => {

    describe("create an h5, group and some compressed datasets ", () => {
        // open hdf file
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./filters.h5', globs.Access.ACC_TRUNC);
        });

        test("should set filter ", () => {
            const group = file.createGroup('pmc/refinement');
            expect(group.id).not.toBe(-1);
            const buffer = Buffer.alloc(5000*8, "\0", "binary");

            buffer.type = globs.H5Type.H5T_NATIVE_DOUBLE;
            for (let index = 0; index < 5000;index++) {
                buffer.writeDoubleLE((index % 1000), index*8);
            }
            hdf5Lib.h5lt.makeDataset(group.id, 'Data', buffer, {compression: 7});

            const filters = group.getFilters('Data');
            expect(filters.isAvailable(globs.H5ZType.H5Z_FILTER_DEFLATE)).toBe(true);
            expect(filters.isAvailable(32004)).toBe(false);
            expect(filters.getNFilters()).toBe(1);

            const readAsBuffer = hdf5Lib.h5lt.readDatasetAsBuffer(group.id, 'Data');
            expect(readAsBuffer.length).toBe(40000);
            expect(readAsBuffer.rows).toBe(5000);
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

    describe("should read compressed dataset", () => {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./filters.h5', globs.Access.ACC_RDONLY);
        });

        test("should be compression filter info ", () => {
            const group   = file.openGroup('pmc/refinement');
            const filters = group.getFilters('Data');
            expect(filters.isAvailable(globs.H5ZType.H5Z_FILTER_DEFLATE)).toBe(true);
            expect(filters.getNFilters()).toBe(1);
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

});

