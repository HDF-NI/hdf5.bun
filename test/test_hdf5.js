import { describe, beforeAll, afterAll, test, expect } from "bun:test";

import { hdf5Lib } from '../index.js';
import globs from '../lib/globals.js';

describe("testing c interface ", function() {

    describe("create an h5 and group ", function() {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./TRAAAAW128F429D538.h5', globs.Access.ACC_TRUNC);
        });

        test("should be >0", () => {
            const group=file.createGroup('/pmc/x-ray/refinement');
            expect(group.id).not.toBe(-1);
            group.close();
        });

        test("reopen of pmc should be >0", () => {
            const groupPmc=file.openGroup('pmc');
            expect(groupPmc.id).not.toBe(-1);
            groupPmc.close();
        });

        test("should be >0 ", () => {
            const xpathGroup=file.createGroup('pmc/Trajectories');
            expect(xpathGroup.id).not.toBe(-1);
            xpathGroup.close();
        });

        test("initial should be >0 ", () => {
            const xpathGroup=file.createGroup('pmc/Trajectories/0');
            expect(xpathGroup.id).not.toBe(-1);
            xpathGroup.close();
        });

        test("move should be 1 ", () => {
            const stemGroup=file.openGroup('pmc/Trajectories');
            stemGroup.move("0", stemGroup.getNativeId(), "1");
            stemGroup.close();
        });

        test("move should be pmcservices ", () => {
            file.move("pmc", file.getNativeId(), "pmcservices");
        });

        test("should have one child of type group ", () => {
            const group=file.openGroup('pmcservices');
            expect(group.getNumObjs()).toBe(2n);
            expect(group.getChildType("Trajectories")).toBe(globs.H5OType.H5O_TYPE_GROUP);
            group.close();
        });

        test("should get member names ", () => {
            const names=file.getMemberNames();
            expect(names.length).toBe(1);
            expect(names[0]).toBe('pmcservices');
        });

        test("should add an attribute to the file ", () => {
            file.role="Target";
            file.flush();
        });

        test("catch on nonexistent group open try", () => {
          try{
            //const group=file.openGroup('pmcservices');
              const groupPmc=file.openGroup('pmc');
              expect(groupPmc.id).toBe(-1);
          }
            catch(error) {
            expect(error.message).toBe("Failed to read group. Group pmc doesn\'t exist.");
          }
          var group;
          try{
            group=file.openGroup('pmcservices');
              const groupPmc=group.openGroup('polywog');
              expect(groupPmc.id).toBe(-1);
              groupPmc.close();
          }
            catch(error) {
              group.close();
                console.log(error.message);
            expect(error.message).toBe("Failed to read group. Group polywog doesn\'t exist.");
          }
        });
        
        afterAll(() => {
          file.close();
        });

    });

    // describe("hdf5 check ", () => {
    //     test.skip("should be an hdf5", () => {
    //           expect(hdf5Lib.hdf5.isHDF5('./TRAAAAW128F429D538.h5')).toBe(true);
    //     });

    // });

    describe("handling errors ", () => {
        //let file;
        beforeAll(() => {
          //file = new hdf5Lib.hdf5.File('/home/roger/Downloads/sample.h5', Access.ACC_RDONLY);
        });

        test("file reaad/write when it doesn't exist", () => {
        try {
          const file = new hdf5Lib.hdf5.File('./record.h5', globs.Access.ACC_RDWR);
          const dims = file.getDatasetDimensions('infos');
          file.close();
          if (dims.length > 0) {
          }
        } catch (error) {
          expect(error.message).toBe("HDF5 FFI Error: Failed to open or create file at ./record.h5");
        }
        });
        
        test("should stop on broken h5", () => {
            try{
              console.log("stop on broken");
              const result = hdf5Lib.hdf5.isHDF5('./test/examples/broken.h5');
              expect(result).toBe(true);
              var file = new hdf5Lib.hdf5.File('./test/examples/broken.h5', globs.Access.ACC_RDONLY);
              file.close();
            }catch(error){
              //console.error(error);
              expect(error.message).toBe("HDF5 FFI Error: Failed to open or create file at ./test/examples/broken.h5");
            }
        });
        
        afterAll(() => {
          //file.close();
        });
    });

});

