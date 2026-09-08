import { describe, beforeAll, afterAll, test, expect } from "bun:test";
import { h5lt } from '../index.js';
import { hdf5Lib } from '../index.js';
import globs from '../lib/globals.js';

/*test inspired/brought from https://github.com/KirmTwinty work*/
describe("testing hdf5 dataset reading in SWMR mode ", () => {
    describe("opening hdf5 dataset ", () => {
	let file;
	beforeAll(() => {
	    file = new hdf5Lib.hdf5.File('./test/examples/swmr-1.h5', globs.Access.ACC_RDONLY | globs.Access.ACC_SWMR_READ);
	});

	test('should be > 0, opening from file ', () => {
                expect(file.id).not.toBe(-1);
            const readBuffer=h5lt.readDataset(file.id, 'group1/dataset-int', function(options){
                expect(options.rank).toBe(2);
                expect(options.rows).toBe(1);
            });
	});

	test('should be > 0, opening from group ', () => {
	    var group = file.openGroup('group1');
                expect(group.id).not.toBe(-1);
            const readBuffer=h5lt.readDataset(group.id, 'dataset-int', function(options){
                expect(options.rank).toBe(2);
                expect(options.rows).toBe(1);
            });
	    group.close();
	});

	test("catch on nonexistent dataset open try on file", () => {
	    try{
                const readBuffer=h5lt.readDataset(file.id, 'nonexistingdataset', function(options){
            });
		}
		catch(error) {
			expect(error.message).toBe("failed to find dataset rank");
		}
	});

	test("catch on nonexistent dataset open try on group", () => {
	    try{
		var group = file.openGroup('group1');
                const readBuffer=h5lt.readDataset(group.id, 'nonexistingdataset', function(options){});
		}
		catch(error) {
			expect(error.message).toBe("failed to find dataset rank");
			group.close()
		}
	});
        
	afterAll(() => {
	    file.close();

	});
    });

});

