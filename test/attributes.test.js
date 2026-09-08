import { describe, beforeAll, afterAll, test, expect } from "bun:test";

import { hdf5Lib } from '../index.js';
import globs from '../lib/globals.js';

describe("testing attribute interface", () => {

    describe("create an h5, group and some attributes", () => {
        // open hdf file
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./attributes.h5', globs.Access.ACC_TRUNC);
        });

        test("should set filter ", () => {
            const group = file.createGroup('pmc/refinement');
            expect(group.id).not.toBe(-1);
            var name=new String("3FVA");
            name.type="variable-length";
            group.name=name;
            group.size=new Float64Array([0.1, 0.1, 0.1]);
            const notes=new Array(3);
            notes[0]="Pick up dry cleaning";
            notes[1]="Prefry the refried beans";
            notes[2]="Remember Mother's Day";
            group.notes=notes;
            group.flush();
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

    describe("should read attributes", () => {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./attributes.h5', globs.Access.ACC_RDONLY);
        });

        test("should be attribute info ", () => {
            const group   = file.openGroup('pmc/refinement');
            group.refresh();
            expect(group.name).toBe("3FVA");
            expect(group.name.type).toBe("variable-length");
            expect(group.size.constructor.name).toMatch('Float64Array');
             console.dir(group.notes);
            expect(group.notes.constructor.name).toMatch('Array');
            group.close();

        });

        test("should be separate attributes ", () => {
            var group, attrs;
            [group, attrs]= file.openGroup('pmc/refinement', {separate_attributes: true});
            expect(attrs.name).toBe("3FVA");
            expect(attrs.name.type).toBe("variable-length");
            expect(attrs.size.constructor.name).toMatch('Float64Array');
             console.dir(attrs.notes);
            expect(attrs.notes.constructor.name).toMatch('Array');
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

    describe("should modify attributes", function() {
        let file;
      beforeAll( () => {
          file = new hdf5Lib.hdf5.File('./attributes.h5', globs.Access.ACC_RDWR);
        });

        test("should create and delete attribute ", () => {
            const group   = file.openGroup('pmc/refinement');
            group.refresh();
            group.spaceGroup="P63/m";
            group.flush();
            var spaceGroup = group.readAttribute("spaceGroup");
            expect(spaceGroup).toBe("P63/m");
            group.deleteAttribute("spaceGroup");
            try{
              spaceGroup = group.readAttribute("spaceGroup");
              }
              catch (e) {
                expect(e.message).toBe("Attribute 'spaceGroup' does not exist.");
              }
            group.close();

        });
        
        test("should create and delete attribute via delete", () => {
            const group   = file.openGroup('pmc/refinement');
            group.refresh();
            group.unitCell="1 1 1 90 90 90";
            group.flush();
            var unitCell = group.readAttribute("unitCell");
            expect(unitCell).toBe("1 1 1 90 90 90");
            delete group.unitCell;
            try{
              unitCell = group.readAttribute("unitCell");
              }
              catch (e) {
                expect(e.message).toBe("Attribute 'unitCell' does not exist.");
              }
            group.close();

        });
        
        afterAll(() => {
            file.close();

        });
    });

    describe.skip("should read biom attributes", function() {
        let file;
      beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./long_attributes.biom', globs.Access.ACC_TRUNC);
        });

        test("write attribute info", () => {
            file.nnz=new hdf5Lib.hdf5.Int64("15");
            file.unnz=new hdf5Lib.hdf5.Uint64("40");
            var fv=new Array(2);
            fv[0]=new hdf5Lib.hdf5.Int64("2");
            fv[1]=new hdf5Lib.hdf5.Int64("1");
            file["formart-version"]=fv;
            var ufv=new Array(2);
            ufv[0]=new hdf5Lib.hdf5.Uint64("20");
            ufv[1]=new hdf5Lib.hdf5.Uint64("10");
            file["uformart-version"]=ufv;
            file.flush();

        });
        
        test("should be attribute info ", () => {
            console.log(file);
            console.log(file.getNumAttrs());
            file.refresh();
            for (var property in file) {
                if (file.hasOwnProperty(property)) {
                    console.log(property+": "+file[property]);
                }
            }

        });

        afterAll(() => {
            file.close();

        });
    });

    describe("read variable string attributes", () => {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./sample.h5', globs.Access.ACC_TRUNC);
        });

        test("should be variable string info", () => {
            const group   = file.createGroup('neuron_layer_0');
            group.name = "mflayer";
            group.size = new Float64Array(3);
            group.size[0] = 0.1;
            group.size[1] = 0.1;
            group.size[2] = 0.1;
            var attrText = '';
            group.flush();
            var attrs = group.getAttributeNames();
            for(var attr in attrs){
              var attrValue = group.readAttribute(attrs[attr]);
              console.log(attrs[attr]+" "+attrValue);
            }
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

    describe.skip("read two attributes", () => {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('/home/roger/Downloads/HAA-NL-OPA-picnictd-BE-341.hdf5', globs.Access.ACC_RDONLY);
        });

        test("should be variable string in Array", () => {
            const group   = file.openGroup('LEG_L_KBA_FLUX');
            group.refresh();
            var attrs = group.getDatasetAttributes("y");
            var attrText = '';
            Object.getOwnPropertyNames(attrs).forEach(function(val, idx, array) {
//              if (val !=  'id') {
                if (attrs[val].constructor.name === Array) {
                  attrText += val + ' :  ';
                  for (var mIndex = 0; mIndex < attrs[val].Length(); mIndex++) {
                    attrText += attrs[val][mIndex];
                    if (mIndex < attrs[val].Length() - 1) {
                      attrText += ',';
                    }
                  }
                }
                else{
                  attrText += val + ' :  ' + attrs[val] + '\n';
                  console.dir("directly a string ");
                }
//              }
            });
            console.dir(attrText);
            var buffer=h5lt.readDataset(group.id, 'y');
            attrText = "";
            Object.getOwnPropertyNames(buffer).forEach(function(val, idx, array) {
//              if (val !=  'id') {
                if (buffer[val].constructor.name === Array) {
                  attrText += val + ' :  ';
                  for (var mIndex = 0; mIndex < buffer[val].Length(); mIndex++) {
                    attrText += buffer[val][mIndex];
                    if (mIndex < buffer[val].Length() - 1) {
                      attrText += ',';
                    }
                  }
                }
                else{
                  attrText += val + ' :  ' + buffer[val] + '\n';
                }
//              }
            });
            console.dir(attrText);
            
            group.close();

        });

        afterAll(() => {
            file.close();

        });
    });

    describe("reference attributes", () => {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('./reference.h5', globs.Access.ACC_TRUNC);
        });

        test("should create reference to clock signal", () => {
            const group   = file.createGroup('Group_1');
            var signals=new Float64Array(10);
            signals[0]=16.727220199999998;
            signals[1]=16.7322189;
            signals[2]=16.737217599999997;
            signals[3]=16.7422163;
            signals[4]=16.747215;
            signals[5]=16.7522137;
            signals[6]=16.7572124;
            signals[7]=16.7622111;
            signals[8]=16.7672098;
            signals[9]=16.772208499999998;
            h5lt.makeDataset(group.id, 'Dataset_Time', signals, {rank: 2, rows: 10, columns: 1});
            var datum=new Float64Array(10);
            datum[0]=1.5001427271366174;
            datum[1]=1.5001369752883966;
            datum[2]=1.5001381375789697;
            datum[3]=1.5001336672306116;
            datum[4]=1.5001220741272028;
            datum[5]=1.500117395162588;
            datum[6]=1.5001219847202356;
            datum[7]=1.5001274087429102;
            datum[8]=1.500133935451513;
            datum[9]=1.5001405515670831;
            datum.bases=new h5lt.Reference(file.id, 'Group_1/Dataset_Time', H5RType.H5R_OBJECT);
            h5lt.makeDataset(group.id, "Dataset_1", datum, {rank: 2, rows: 10, columns: 1});
            group.flush();
            group.close();
            file.flush();
            //file.close();

        });

        test.skip("should be reference to clock signal", () => {
          try{
              file = new hdf5Lib.hdf5.File('./reference.h5', globs.Access.ACC_RDONLY);
            const group   = file.openGroup('Group_1');
            const readBuffer=h5lt.readDataset(group.id, 'Dataset_1', {bind_attributes: true}, function(options){
                expect(options.rank).toBe(2);
                expect(options.rows).toBe(10);
                expect(options.columns).toBe(1);
            });
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toMatch(10);
            var refName=readBuffer.bases.getName(file.id, H5RType.H5R_OBJECT);
            console.log(refName);
            const refBuffer=h5lt.readDataset(file.id, refName, function(options){
                expect(options.rank).toBe(2);
                expect(options.rows).toBe(10);
                expect(options.columns).toBe(1);
            });
            
            group.close();
          }
          catch (e) {
            console.log("\t\t"+e.message);
            expect(e.message).toBe("unsupported data type");
          }

        });

        afterAll(() => {
            file.close();

        });
    });

    describe.skip("read 32 bit floating attributes", function() {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('/home/roger/Downloads/OR_GLM-L2-LCFA_G16_s20182632044200_e20182632044400_c20182632044426.nc', globs.Access.ACC_RDONLY);
        });

        test("file attributes", () => {

            var attrs = file.getAttributeNames();
            for(var attr in attrs){
              var attrValue = file.readAttribute(attrs[attr]);
              console.log(attrs[attr]+" "+attrValue);
            }

        });

        test("32 bit floating attr", () => {
            var scale_factor = file.getDatasetAttribute("group_energy", "scale_factor");
            console.dir(scale_factor);
            
            var attrs = file.getDatasetAttributes("group_energy");
            var attrText = "";
            Object.getOwnPropertyNames(attrs).forEach(function(val, idx, array) {
//              if (val !=  'id') {
                if (attrs[val].constructor.name === Array) {
                  attrText += val + ' :  ';
                  for (var mIndex = 0; mIndex < attrs[val].Length(); mIndex++) {
                    attrText += attrs[val][mIndex];
                    if (mIndex < attrs[val].Length() - 1) {
                      attrText += ',';
                    }
                  }
                }
                else{
                  attrText += val + ' :  ' + attrs[val] + "\n";
                  //console.dir("directly a string ");
                }
//              }
            });
            console.log(attrText);

        });

        afterAll(() => {
            file.close();

        });
    });


});

