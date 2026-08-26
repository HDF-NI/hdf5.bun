import { describe, beforeAll, test, expect } from "bun:test";

import { hdf5Lib } from '../index.js';
import globs from '../lib/globals.js';

describe("testing c interface ", function() {

    describe("create an h5 and group ", function() {
        let file;
        beforeAll(async () => {
          file = new hdf5Lib.hdf5.File('./TRAAAAW128F429D538.h5', globs.Access.ACC_TRUNC);
        });

        test("should be >0", () => {
            const group=file.createGroup('/pmc/x-ray/refinement');
            group.id.should.not.equal(-1);
            group.close();
            done();
        });

        test("reopen of pmc should be >0", () => {
            const groupPmc=file.openGroup('pmc');
            groupPmc.id.should.not.equal(-1);
            groupPmc.close();
            done();
        });

        test("should be >0 ", () => {
            const xpathGroup=file.createGroup('pmc/Trajectories');
            xpathGroup.id.should.not.equal(-1);
            xpathGroup.close();
            done();
        });

        test("initial should be >0 ", () => {
            const xpathGroup=file.createGroup('pmc/Trajectories/0');
            xpathGroup.id.should.not.equal(-1);
            xpathGroup.close();
            done();
        });

        test("move should be 1 ", () => {
            const stemGroup=file.openGroup('pmc/Trajectories');
            stemGroup.move("0", stemGroup.id, "1");
            stemGroup.close();
            done();
        });

        test("move should be pmcservices ", () => {
            file.move("pmc", file.id, "pmcservices");
            done();
        });

        test("should have one child of type group ", () => {
            const group=file.openGroup('pmcservices');
            group.getNumObjs().should.equal(2);
            group.getChildType("Trajectories").should.equal(globs.H5OType.H5O_TYPE_GROUP);
            group.close();
            done();
        });

        test("should get member names ", () => {
            const names=file.getMemberNames();
            names.length.should.equal(1);
            names[0].should.equal('pmcservices');
            done();
        });

        test("should add an attribute to the file ", () => {
            file.role="Target";
            file.flush();
            done();
        });

        test("catch on nonexistent group open try", function(done) {
          try{
            //const group=file.openGroup('pmcservices');
              const groupPmc=file.openGroup('pmc');
              groupPmc.id.should.equal(-1);
              groupPmc.close();
          }
            catch(error) {
            error.message.should.equal("Failed to read group. Group pmc doesn\'t exist.");
          }
          var group;
          try{
            group=file.openGroup('pmcservices');
              const groupPmc=group.openGroup('polywog');
              groupPmc.id.should.equal(-1);
              groupPmc.close();
          }
            catch(error) {
              group.close();
                console.log(error.message);
            error.message.should.equal("Failed to read group. Group polywog doesn\'t exist.");
          }
            done();
        });
        
        afterAll(async () => {
          file.close();
          done();
        });

    });

    // describe("hdf5 check ", function() {
    //     test.skip("should be an hdf5", () => {
    //           hdf5Lib.hdf5.isHDF5('./TRAAAAW128F429D538.h5').should.equal(true);
    //     });

    // });

    // describe("handling errors ", function() {
    //     //let file;
    //     beforeAll(async () => {
    //       //file = new hdf5Lib.hdf5.File('/home/roger/Downloads/sample.h5', Access.ACC_RDONLY);
    //     });

    //     test("file reaad/write when it doesn't exist", () => {
    //     try {
    //       const file = new hdf5Lib.hdf5.File('./record.h5', globs.Access.ACC_RDWR);
    //       const dims = file.getDatasetDimensions('infos');
    //       file.close();
    //       if (dims.length > 0) {
    //       }
    //     } catch (error) {
    //       error.message.should.equal("File ./record.h5 doesn\'t exist.");
    //     }
    //     });
        
    //     test("should stop on broken h5", () => {
    //         try{
    //           console.log("stop on broken");
    //           hdf5Lib.hdf5.isHDF5('./test/examples/broken.h5').should.equal(true);
    //           var file = new hdf5Lib.hdf5.File('./test/examples/broken.h5', globs.Access.ACC_RDONLY);
    //           file.close();
    //         }catch(error){
    //           //console.error(error);
    //           error.message.should.equal("Failed to open file, ./test/examples/broken.h5 and flags 0 with return: -1.");
    //         }
    //     });
        
    //     afterAll(async () => {
    //       //file.close();
    //     });
    // });

});

