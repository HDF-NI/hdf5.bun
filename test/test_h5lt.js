import { describe, beforeAll, afterAll, test, expect } from "bun:test";

import { hdf5, h5lt, h5im } from "../index.js";
import globs from '../lib/globals.js';
import { Access, CreationOrder, State, H5SType, HLType, H5Type, H5OType, H5TOrder, H5RType, Interlace, ObjectInfoFlags, H5Index, H5IterOrder } from '../lib/globals.js';

describe("testing lite interface ", () => {

    describe("create an h5, group and some datasets ", function() {
        // open hdf file
        let file;
        beforeAll(() => {
          file = new hdf5.File('./h5lt.h5', Access.ACC_TRUNC);
        });
        /** @type {Group} */
        let group;
        test("should be >0 ", () => {
            group=file.createGroup('pmc');
            expect(group.id).not.toBe(-1);

        });
        test("should be variable array of Uint8Array's", () => {
            const buffer=new Array(3);
            for(var i=0;i<3;i++){
                buffer[i]=new Uint8Array(i+1);
                for(var j=0;j<i+1;j++)
                    buffer[i][j]=j;
            }
            console.log("make dataset");
            h5lt.makeDataset(group.id, 'real labels', buffer, {type: H5Type.H5T_STD_U8LE});
            console.log("make dataset done");
            const readBuffer=h5lt.readDataset(group.id, 'real labels', function(options){
                expect(options.rank).toBe(1);
                expect(options.rows).toBe(3);
            });
            expect(readBuffer.constructor.name).toMatch('Array');
            expect(readBuffer.length).toBe(3);
            //readBuffer.buffer.byteLength.should.match(buffer.buffer.byteLength);
            expect([...buffer]).toEqual([...readBuffer]);
            for(var i in readBuffer){
                console.log(readBuffer[i]);
            }
            //const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Refractive Index');
            //readAsBuffer.readDoubleLE(4*8).should.equal(5.0);
        });
        test("should be Float64Array io ", () => {
            const buffer=new Float64Array(5);
            buffer[0]=1.0;
            buffer[1]=2.0;
            buffer[2]=3.0;
            buffer[3]=4.0;
            buffer[4]=5.0;
            console.log("make dataset");
            h5lt.makeDataset(group.id, 'Refractive Index', buffer);
            console.log("read dataset");
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index', function(options){
                expect(options.rank).toBe(1);
                expect(options.rows).toBe(5);
            });
            console.dir(" after options cb: ");
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(5);
            expect(readBuffer.buffer.byteLength).toBe(buffer.buffer.byteLength);
            expect([...buffer]).toEqual([...readBuffer]);
            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Refractive Index');
            expect(readAsBuffer.readDoubleLE(4*8)).toBe(5.0);

        });
        test("should be node::Buffer io for double le", () => {
            const buffer=Buffer.alloc(5*8, "\0", "binary");
            buffer.type=H5Type.H5T_NATIVE_DOUBLE;
            buffer.writeDoubleLE(1.0, 0);
            buffer.writeDoubleLE(2.0, 8);
            buffer.writeDoubleLE(3.0, 16);
            buffer.writeDoubleLE(4.0, 24);
            buffer.writeDoubleLE(5.0, 32);
            h5lt.makeDataset(group.id, 'Dielectric Constant', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Dielectric Constant', function(options){
                expect(options.rank).toBe(1);
                expect(options.rows).toBe(5);
            });
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(5);

            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Dielectric Constant');
            expect(readAsBuffer.readDoubleLE(4*8)).toBe(5.0);

        });
        test("should be node::Buffer io for double rank data", () => {
            const buffer=Buffer.alloc(6*8, "\0", "binary");
            buffer.writeDoubleLE(1.0, 0);
            buffer.writeDoubleLE(2.0, 8);
            buffer.writeDoubleLE(3.0, 16);
            buffer.writeDoubleLE(1.0, 24);
            buffer.writeDoubleLE(2.0, 32);
            buffer.writeDoubleLE(3.0, 40);
            h5lt.makeDataset(group.id, 'Two Rank', buffer, {type: H5Type.H5T_NATIVE_DOUBLE, rank: 2, rows: 3, columns: 2});
            var byteOrder=group.getByteOrder('Two Rank');
            expect(byteOrder).toBe(0);
            const readBuffer=h5lt.readDataset(group.id, 'Two Rank', function(options) {
                    expect(JSON.stringify(options)).toBe('{"rank":2,"endian":0,"rows":3,"columns":2}')
                });
                // console.dir(" after options cb: ");
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(6);

            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Two Rank');
            expect(readAsBuffer.readDoubleLE(4*8)).toBe(2.0);
            expect(readAsBuffer.rows).toBe(3);
            expect(readAsBuffer.columns).toBe(2);
        });
        test("should be node::Buffer io for quadruple rank data", () => {
            const buffer=Buffer.alloc(2*2*6*8, "\0", "binary");
            buffer.type=H5Type.H5T_NATIVE_DOUBLE;
            buffer.writeDoubleLE(1.0, 0);
            buffer.writeDoubleLE(2.0, 8);
            buffer.writeDoubleLE(3.0, 16);
            buffer.writeDoubleLE(1.0, 24);
            buffer.writeDoubleLE(2.0, 32);
            buffer.writeDoubleLE(3.0, 40); //6
            buffer.writeDoubleLE(2.0, 48);
            buffer.writeDoubleLE(4.0, 56);
            buffer.writeDoubleLE(6.0, 64);
            buffer.writeDoubleLE(2.0, 72);
            buffer.writeDoubleLE(4.0, 80);
            buffer.writeDoubleLE(6.0, 88); //12
            buffer.writeDoubleLE(3.0, 96);
            buffer.writeDoubleLE(6.0, 104);
            buffer.writeDoubleLE(9.0, 112);
            buffer.writeDoubleLE(3.0, 120);
            buffer.writeDoubleLE(6.0, 128);
            buffer.writeDoubleLE(9.0, 136); //18
            buffer.writeDoubleLE(4.0, 144);
            buffer.writeDoubleLE(8.0, 152);
            buffer.writeDoubleLE(12.0, 160);
            buffer.writeDoubleLE(4.0, 168);
            buffer.writeDoubleLE(8.0, 176);
            buffer.writeDoubleLE(12.0, 184); //24
            buffer.rank=4;
            buffer.rows=3;
            buffer.columns=2;
            buffer.sections=2;
            buffer.files=2;
            h5lt.makeDataset(group.id, 'Quadruple Rank', buffer);
            var byteOrder=group.getByteOrder('Quadruple Rank');
            expect(byteOrder).toBe(0);
            const readBuffer=h5lt.readDataset(group.id, 'Quadruple Rank', function(options) {
                    expect(JSON.stringify(options)).toBe('{"rank":4,"endian":0,"rows":3,"columns":2,"sections":2,"files":2}')
                });
                // console.dir(" after options cb: ");
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(24);

            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Quadruple Rank');
            expect(readAsBuffer.readDoubleLE(4*8)).toBe(2.0);
            expect(readAsBuffer.rows).toBe(3);
            expect(readAsBuffer.columns).toBe(2);
            expect(readAsBuffer.sections).toBe(2);
            expect(readAsBuffer.files).toBe(2);

        });
        test("should be Float32Array io ", () => {
            const buffer=new Float32Array(5);
            buffer[0]=5.0;
            buffer[1]=4.0;
            buffer[2]=3.0;
            buffer[3]=2.0;
            buffer[4]=1.0;
            h5lt.makeDataset(group.id, 'Refractive Index f', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index f');
            expect(readBuffer.constructor.name).toMatch('Float32Array');
            expect(readBuffer.length).toBe(5);
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);

        });
        test("should be Int32Array io ", () => {
            const buffer=new Int32Array(5);
            buffer[0]=5;
            buffer[1]=4;
            buffer[2]=3;
            buffer[3]=2;
            buffer[4]=1;
            h5lt.makeDataset(group.id, 'Refractive Index l', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index l');
            expect(readBuffer.constructor.name).toMatch('Int32Array');
            expect(readBuffer.length).toBe(5);
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);

        });
        test("should be Uint32Array io ", () => {
            const buffer=new Uint32Array(5);
            buffer[0]=5;
            buffer[1]=4;
            buffer[2]=3;
            buffer[3]=2;
            buffer[4]=1;
            h5lt.makeDataset(group.id, 'Refractive Index ui', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index ui');
            expect(readBuffer.length).toBe(5);
            expect(readBuffer.constructor.name).toMatch('Uint32Array');
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);
        });
        test("should be Int16Array io ", () => {
            const buffer=new Int16Array(5);
            buffer[0]=5;
            buffer[1]=4;
            buffer[2]=3;
            buffer[3]=2;
            buffer[4]=1;
            h5lt.makeDataset(group.id, 'Refractive Index s', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index s');
            expect(readBuffer.constructor.name).toMatch('Int16Array');            
            expect(readBuffer.length).toBe(5);
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);

        });
        test("should be Uint16Array io ", () => {
            const buffer=new Uint16Array(5);
            buffer[0]=5;
            buffer[1]=4;
            buffer[2]=3;
            buffer[3]=2;
            buffer[4]=1;
            h5lt.makeDataset(group.id, 'Refractive Index us', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index us');
            expect(readBuffer.length).toBe(5);
            expect(readBuffer.constructor.name).toMatch('Uint16Array');
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);

        });
        test("should be Int8Array io ", () => {
            const buffer=new Int8Array(5);
            buffer[0]=5;
            buffer[1]=4;
            buffer[2]=3;
            buffer[3]=2;
            buffer[4]=1;
            h5lt.makeDataset(group.id, 'Refractive Index 8', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index 8');
            expect(readBuffer.constructor.name).toMatch('Int8Array');
            expect(readBuffer.length).toBe(5);
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);
        });
        test("should be Uint8Array io ", () => {
            const buffer=new Uint8Array(5);
            buffer[0]=5;
            buffer[1]=4;
            buffer[2]=3;
            buffer[3]=2;
            buffer[4]=1;
            buffer.rank=1;
            buffer.rows=5;
            buffer.type=H5Type.H5T_NATIVE_UCHAR;
            h5lt.makeDataset(group.id, 'Refractive Index u8', buffer);
            const readBuffer=h5lt.readDataset(group.id, 'Refractive Index u8');
            expect(readBuffer.length).toBe(5);
            expect(readBuffer.constructor.name).toMatch('Uint8Array');
            buffer.rank=1;
            buffer.rows=5;
            //buffer.should.match(readBuffer);

        });

        test("should be make a dataset with compression ", () => {
            const buffer=new Float64Array(5);
            buffer[0]=1.0;
            buffer[1]=2.0;
            buffer[2]=3.0;
            buffer[3]=4.0;
            buffer[4]=5.0;
            h5lt.makeDataset(group.id, 'Compressed Index', buffer, { compression: 7});
            const readBuffer=h5lt.readDataset(group.id, 'Compressed Index');
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(5);
            expect(readBuffer.buffer.byteLength).toBe(buffer.buffer.byteLength);
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);
            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Refractive Index');
            expect(readAsBuffer.readDoubleLE(4*8)).toBe(5.0);
        });

        test("should be make a dataset with custom chunk size ", () => {
            const buffer=new Float64Array(5);
            buffer[0]=1.0;
            buffer[1]=2.0;
            buffer[2]=3.0;
            buffer[3]=4.0;
            buffer[4]=5.0;
            h5lt.makeDataset(group.id, 'Custom-chunked Index', buffer, { chunkSize: 2});
            const readBuffer=h5lt.readDataset(group.id, 'Custom-chunked Index');
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(5);
            expect(readBuffer.buffer.byteLength).toBe(buffer.buffer.byteLength);
            buffer.rank=1;
            buffer.rows=5;
            expect([...buffer]).toEqual([...readBuffer]);
            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Refractive Index');
            expect(readAsBuffer.readDoubleLE(4*8)).toBe(5.0);

        });

        test("should be make a dataset with arrayed chunk size ", () => {
            const buffer=new Float64Array(10);
            buffer[0]=1.0;
            buffer[1]=2.0;
            buffer[2]=3.0;
            buffer[3]=4.0;
            buffer[4]=5.0;
            buffer[5]=1.0;
            buffer[6]=2.0;
            buffer[7]=3.0;
            buffer[8]=4.0;
            buffer[9]=5.0;
            h5lt.makeDataset(group.id, 'Arrayed-chunked Index', buffer, {rank:2, rows: 5, columns:2, chunkSize: [3,2]});
            const readBuffer=h5lt.readDataset(group.id, 'Arrayed-chunked Index', function(options){
                
            });
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(10);
            expect(readBuffer.buffer.byteLength).toBe(buffer.buffer.byteLength);
            expect([...buffer]).toEqual([...readBuffer]);
            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Arrayed-chunked Index');
            expect(readAsBuffer.readDoubleLE(4*8)).toBe(5.0);

        });

        test("flush properties to h5 ", () => {
            expect(group.id).not.toBe(-1);
            expect(group.getNumAttrs()).toBe(0);
            group.flush();
            expect(group.getNumAttrs()).toBe(1);
            group[ 'Computed Heat of Formation' ]=7.77;
            group.flush();
            expect(group.getNumAttrs()).toBe(1);
            group.Status=256;
            group.flush();
            expect(group.getNumAttrs()).toBe(2);
            group.Status=-1;
            group.flush();
            expect(group.getNumAttrs()).toBe(2);
            group.Information="\"There are no solutions; there are only trade-offs.\" -- Thomas Sowell";
            group.flush();
            expect(group.getNumAttrs()).toBe(3);

        });
        test("should close pmc ", () => {
            try{
            group.close();
        }
        catch(err){
            console.log("err "+err.message);
        }

        });
        afterAll(() =>{
          file.close();

        });
    });

    describe("create an h5, group and some documents ", () => {
        let file;
        beforeAll(() =>{
          file = new hdf5.File('./pmc.h5', Access.ACC_TRUNC);

        });

        test("open of Geometries should be >0", () => {
            const groupPMCServices=file.createGroup('pmcservices');
            const groupTargets=file.createGroup('pmcservices/sodium-icosanoate');
            groupTargets[ 'Computed Heat of Formation' ]=-221.78436098572274;
            groupTargets[ 'Computed Ionization Potential' ]=9.57689311885752;
            groupTargets[ 'Computed Total Energy' ]=-3573.674399276322;
            groupTargets.flush();
            const groupDocuments      = file.createGroup('pmcservices/sodium-icosanoate/Documents');
            const groupFrequencyData  = file.createGroup('pmcservices/sodium-icosanoate/Frequency Data');
            const groupTrajectories   = file.createGroup('pmcservices/sodium-icosanoate/Trajectories');
            const sodiumIcosanoateXml = Bun.file("./test/examples/sodium-icosanoate.xml").value?.toString();
            h5lt.makeDataset(groupDocuments.id, 'sodium-icosanoate.xml', sodiumIcosanoateXml);
            groupTrajectories.close();
            groupFrequencyData.close();
            groupDocuments.close();

            const sodiumIcosanoateXmol =  Bun.file("./test/examples/sodium-icosanoate.xmol", "ascii").value?.toString();
            let count              = 0;
            let numberOfDataLines;
            let title;
            let state              = State.COUNT;
            const lineArr          =  sodiumIcosanoateXmol.trim().split("\n");
            let columnCount        = 0;
            let firstFrequency     = true;
            let firstTrajectory    = new Float64Array(3*numberOfDataLines);
            let lastTrajectory     = new Float64Array(3*numberOfDataLines);
            let frequency          = new Float64Array(3*numberOfDataLines);
            /* Loop over every line. */
            lineArr.forEach(function (line) {
                switch(state) {
                    case State.COUNT:
                        numberOfDataLines = parseInt(line);
                        firstTrajectory   = new Float64Array(3*numberOfDataLines);
                        lastTrajectory    = new Float64Array(3*numberOfDataLines);
                        frequency         = new Float64Array(3*numberOfDataLines);
                        state             = State.TITLE;
                        break;
                    case State.TITLE:
                        title=line;
                        state=State.DATA;
                        break;
                    case State.DATA:
                        const columnArr = line.split(" ");
                        columnArr.forEach(function (value) {
                        switch(columnCount)
                        {
                            case 0:
                                break;
                            case 1:
                            case 2:
                            case 3:
                                firstTrajectory[3*count+columnCount-1]=parseFloat(value);
                                lastTrajectory[3*count+columnCount-1]=parseFloat(value);
                                break;
                            case 4:
                            case 5:
                            case 6:
                                frequency[3*count+columnCount-4]=parseFloat(value);
                                if(columnCount===6){ count++; }
                                break;
                        }
                        columnCount++;
                        if(columnCount===7){columnCount=0;}
                        if(count === numberOfDataLines){
                        count=0;
                        if(firstFrequency)
                        {
                            try{
                            const groupGeometries=file.createGroup('pmcservices/sodium-icosanoate/Trajectories/Geometries');
                            firstTrajectory.Dipole=2.9;
                            h5lt.makeDataset(groupGeometries.id, '0', firstTrajectory, {rank: 2, rows: numberOfDataLines, columns: 3});
                            h5lt.makeDataset(groupGeometries.id, '1', lastTrajectory, {rank: 2, rows: numberOfDataLines, columns: 3});
                            const groupFrequencies=file.createGroup('pmcservices/sodium-icosanoate/Frequency Data/Frequencies');
                            groupFrequencies.close();
                            groupGeometries.close();
                            firstFrequency=false;
                            }
                            catch(err){
                                console.dir("what? "+err.message);
                            }
                        }
                            const groupFrequencies=file.openGroup('pmcservices/sodium-icosanoate/Frequency Data/Frequencies');
                            h5lt.makeDataset(groupFrequencies.id, title, frequency, {rank: 2, rows: numberOfDataLines, columns: 3});
                            state=State.COUNT;
                            groupFrequencies.close();
                        }
                        });
                        break;
                }
            });
            groupTargets.close();
            groupPMCServices.close();

        });

        test("Existing group should throw exception when trying to create again ", () => {
            try {
                const groupTargets=file.createGroup('pmcservices/sodium-icosanoate');
                groupTargets.close();
            } catch(err) {
                expec(err.message).toBe("");
                console.dir(err.message);
            }
            try {
                const groupDocuments=file.createGroup('pmcservices/sodium-icosanoate/Documents');
                groupDocuments.close();
            } catch(err) {
                expec(err.message).toBe("");
                console.dir(err.message);
            }

        });

        afterAll(() => {
          file.close();

        });
    }, { timeout: 35000 });

    describe("create dataset and extract subset", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);

        });

        test("should be node::Buffer io for double rank hyperslab", () => {
            const group=file.createGroup('pmcservices/Double');
            const buffer=Buffer.alloc(8*10*8);
            for (let j = 0; j < 10; j++) {
                for (let i = 0; i < 8; i++){
                        if (j< (10/2)) {
                            buffer.writeDoubleLE(1.0, 8*(i*10+j));
                        } else {
                            buffer.writeDoubleLE(2.0, 8*(i*10+j));
                        }
                }
            }

            h5lt.makeDataset(group.id, 'Waldo', buffer, {type: H5Type.H5T_NATIVE_DOUBLE, rank: 2, rows: 8, columns: 10});
            var dimensions=group.getDatasetDimensions('Waldo');
            expect(dimensions.length).toBe(2);
            expect(dimensions[0]).toBe(8);
            expect(dimensions[1]).toBe(10);
            expect(subsetBuffer.type).toBe(H5Type.H5T_NATIVE_DOUBLE);
            expect(subsetBuffer.length).toBe(3*4*8);
            const subsetBuffer=Buffer.alloc(3*4*8, "\0", "binary");
            subsetBuffer.type=H5Type.H5T_NATIVE_DOUBLE;
            for (let j = 0; j < 4; j++) {
                for (let i = 0; i < 3; i++){
                            subsetBuffer.writeDoubleLE(5.0, 8*(i*4+j));
                }
            }

            h5lt.writeDataset(group.id, 'Waldo', subsetBuffer, {start: [1,2], stride: [1,1], count: [3,4]});
            let theType=group.getDataType('Waldo');
            expect(theType).toBe(H5Type.H5T_IEEE_F64LE);
            const readBuffer=h5lt.readDataset(group.id, 'Waldo', function(options) {
                expect(options.rank).toBe(2);
                expect(options.rows).toBe(8);
                expect(options.columns).toBe(10);
            });
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(8*10);

            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Waldo', {start: [3,4], stride: [1,1], count: [2,2]});
            expect(readAsBuffer.rank).toBe(2);
            expect(readAsBuffer.rows).toBe(2);
            expect(readAsBuffer.columns).toBe(2);
            expect(readAsBuffer.readDoubleLE(0*8)).toBe(5.0);
            expect(readAsBuffer.readDoubleLE(1*8)).toBe(5.0);
            expect(readAsBuffer.readDoubleLE(2*8)).toBe(1.0);
            expect(readAsBuffer.readDoubleLE(3*8)).toBe(2.0);
            expect(readAsBuffer.type).toBe(H5Type.H5T_IEEE_F64LE);
            group.close();

        });
        test("should be node::Buffer io for triple rank hyperslab", () => {
            const group=file.createGroup('pmcservices/Triple');
            const buffer=Buffer.alloc(3*8*10*8, "\0", "binary");
            buffer.rank=3;
            buffer.rows=8;
            buffer.columns=10;
            buffer.sections=3;
            buffer.type=H5Type.H5T_NATIVE_DOUBLE;
            for (let k = 0; k < buffer.sections; k++) {
                for (let j = 0; j < buffer.columns; j++) {
                    for (let i = 0; i < buffer.rows; i++){
                            if (j< (buffer.columns/2)) {
                                buffer.writeDoubleLE(1.0, 8*(k*buffer.columns*buffer.rows+i*buffer.columns+j));
                            } else {
                                buffer.writeDoubleLE(2.0, 8*(k*buffer.columns*buffer.rows+i*buffer.columns+j));
                            }
                    }
                }
            }
            h5lt.makeDataset(group.id, 'Waldo', buffer);
            var dimensions=group.getDatasetDimensions('Waldo');
            expect(dimensions.length).toBe(3);
            expect(dimensions[0]).toBe(3);
            expect(dimensions[1]).toBe(8);
            expect(dimensions[2]).toBe(10);
            const subsetBuffer=Buffer.alloc(3*4*8, "\0", "binary");
            subsetBuffer.rank=3;
            subsetBuffer.rows=3;
            subsetBuffer.columns=4;
            subsetBuffer.sections=1;
            subsetBuffer.type=H5Type.H5T_NATIVE_DOUBLE;
            for (let k = 0; k < subsetBuffer.sections; k++) {
                for (let j = 0; j < subsetBuffer.columns; j++) {
                    for (let i = 0; i < subsetBuffer.rows; i++){
                                subsetBuffer.writeDoubleLE(5.0, 8*(k*buffer.columns*buffer.rows+i*subsetBuffer.columns+j));
                    }
                }
            }
//
            h5lt.writeDataset(group.id, 'Waldo', subsetBuffer, {start: [1,2,1], stride: [1,1,1], count: [1,3,4]});
            let theType=group.getDataType('Waldo');
            expec(theType).toBe(H5Type.H5T_IEEE_F64LE);
            const readBuffer=h5lt.readDataset(group.id, 'Waldo');
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(3*8*10);
            expect(readBuffer.rows).toBe(8);
            expect(readBuffer.columns).toBe(10);
            expect(readBuffer.sections).toBe(3);

            const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Waldo', {start: [1,3,4], stride: [1,1,1], count: [1,2,2]});
            expect(readAsBuffer.readDoubleLE(0*8)).toBe(5.0);
            expect(readAsBuffer.readDoubleLE(1*8)).toBe(2.0);
            expect(readAsBuffer.readDoubleLE(2*8)).toBe(5.0);
            expect(readAsBuffer.readDoubleLE(3*8)).toBe(2.0);
            expect(readAsBuffer.type).toBe(H5Type.H5T_IEEE_F64LE);
            group.close();

        });
        afterAll(() => {
          file.close();

        });
    });

    describe.skip("should read loom attributes", function() {
        let file;
        beforeAll(() => {
          file = new hdf5Lib.hdf5.File('/home/roger/Downloads/hgForebrainGlut.loom', Access.ACC_RDONLY);

        });

        test("should be slab info ", () => {
            console.log(file);
            console.log(file.getNumAttrs());
            file.refresh();
            for (var property in file) {
                if (file.hasOwnProperty(property)) {
                    console.log(property+": "+file[property]);
                }
            }
            var dim = file.getDatasetDimensions('matrix');
            console.log(dim.length);
            console.log(dim);
            for (var i = 0; i < dim[0]/1000; i++) {
              var buffer = h5lt.readDatasetAsBuffer(file.id, 'matrix', {
                  start: [i, 0],
                  stride: [1, 1],
                  count: [1, dim[1]]
                });
            }

        });

        afterAll(() => {
            file.close();

        });
    });

    describe("create dataset and fail extracting subset", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);

        });

        test("should fail when count is not given for the subset", () => {
            const group=file.createGroup('pmcservices/Forest');
            const buffer=Buffer.alloc(8*10*8);
            for (let j = 0; j < 10; j++) {
                for (let i = 0; i < 8; i++){
                        if (j< (10/2)) {
                            buffer.writeDoubleLE(1.0, 8*(i*10+j));
                        } else {
                            buffer.writeDoubleLE(2.0, 8*(i*10+j));
                        }
                }
            }
            h5lt.makeDataset(group.id, 'Waldo', buffer, {type: H5Type.H5T_NATIVE_DOUBLE, rank: 2, rows: 8, columns: 10});
            var dimensions=group.getDatasetDimensions('Waldo');
            expect(dimensions.length).toBe(2);
            expect(dimensions[0]).toBe(8);
            expect(dimensions[1]).toBe(10);
            const subsetBuffer=Buffer.alloc(3*4*8, "\0", "binary");
            subsetBuffer.type=H5Type.H5T_NATIVE_DOUBLE;
            for (let j = 0; j < 4; j++) {
                for (let i = 0; i < 3; i++){
                            subsetBuffer.writeDoubleLE(5.0, 8*(i*4+j));
                }
            }

            h5lt.writeDataset(group.id, 'Waldo', subsetBuffer, {start: [1,2], stride: [1,1], count: [3,4]});
            let theType=group.getDataType('Waldo');
            expect(theType).toBe(H5Type.H5T_IEEE_F64LE);
            const readBuffer=h5lt.readDataset(group.id, 'Waldo', function(options) {
                expect(options.rank).toBe(2);
                expect(options.rows).toBe(8);
                expect(options.columns).toBe(10);
            });
            expect(readBuffer.constructor.name).toMatch('Float64Array');
            expect(readBuffer.length).toBe(8*10);

            try{
              const readAsBuffer=h5lt.readDatasetAsBuffer(group.id, 'Waldo', {start: [3,4], stride: [1,1]});
            }
            catch (e) {
                expect(e.message).toBe("Need to supply the subspace count dimensions. Start and stride are optional.");
            }
            group.close();

        });
        afterAll(() => {
          file.close();

        });
    });
    
    describe("varlen char arrays", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);

        });
        test("create array of varlen's", () => {
            let group=file.createGroup('pmcservices/Quotes');
            const quotes=new Array(7);
            quotes[0]="Never put off till tomorrow what may be done day after tomorrow just as well.";
            quotes[1]="I have never let my schooling interfere with my education";
            quotes[2]="Reader, suppose you were an idiot. And suppose you were a member of Congress. But I repeat myself.";
            quotes[3]="Substitute 'damn' every time you're inclined to write 'very;' your editor will delete it and the writing will be just as it should be.";
            quotes[4]="Don’t go around saying the world owes you a living. The world owes you nothing. It was here first.";
            quotes[5]="Loyalty to country ALWAYS. Loyalty to government, when it deserves it.";
            quotes[6]="What would men be without women? Scarce, sir...mighty scarce.";
            h5lt.makeDataset(group.id, "Mark Twain", quotes);
            group.close();
            file.close();
            file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);
            group=file.openGroup('pmcservices/Quotes');
            const array=h5lt.readDataset(group.id, 'Mark Twain');
            group.close();

        });
        afterAll(() => {
          file.close();

        });
    });

    describe("fixed char multi-dimension arrays", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);

        });
        test("create 2d array of strings", () => {
           try{
           let group=file.createGroup('pmcservices');
            const rotation=new Array(3);
            rotation[0]=new Array(3);
            rotation[0][0]="1";
            rotation[0][1]="0";
            rotation[0][2]="0";
            rotation[1]=new Array(3);
            rotation[1][0]="0";
            rotation[1][1]="\\cos\\theta";
            rotation[1][2]="-\\sin\\theta";
            rotation[2]=new Array(3);
            rotation[2][0]="0";
            rotation[2][1]="\\sin\\theta";
            rotation[2][2]="\\cos\\theta";



            h5lt.makeDataset(group.id, "RotationX", rotation, {fixed_width : 12});
            group.close();
            file.close();
            file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);
            group=file.openGroup('pmcservices');
            const matrix=h5lt.readDataset(group.id, 'RotationX');
            expect(matrix.length).toBe(3);
            expect(matrix[1].length).toBe(3);
            expect(matrix[1][1]).toBe("\\cos\\theta");
            console.dir(matrix);
            group.close();
            } catch (e) {
                console.log(e.message);
            }

        });
        test("create 2d array of strings with padding", () => {
            /** @type {Group} */
            let group;
           try{
            group=file.openGroup('pmcservices');
            const rotation=new Array(3);
            rotation[0]=new Array(3);
            rotation[0][0]="\\cos\\theta";
            rotation[0][1]="-\\sin\\theta";
            rotation[0][2]="0";
            rotation[1]=new Array(3);
            rotation[1][0]="\\sin\\theta";
            rotation[1][1]="\\cos\\theta";
            rotation[1][2]="0";
            rotation[2]=new Array(3);
            rotation[2][0]="0";
            rotation[2][1]="0";
            rotation[2][2]="1";



            h5lt.makeDataset(group.id, "RotationZ", rotation, {fixed_width : 12, padding : H5Type.H5T_STR_SPACEPAD});
            group.close();
            file.close();
            file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);
            group=file.openGroup('pmcservices');
            const matrix=h5lt.readDataset(group.id, 'RotationZ');
            expect(matrix.length).toBe(3);
            expect(matrix[1].length).toBe(3);
            expect(matrix[1][1]).toBe("\\cos\\theta");
            console.dir(matrix);
            group.close();
            } catch (e) {
                console.log("bad "+e.message);
                group.close();
            }

        });
        afterAll(() => {
          file.close();

        });
    });

    describe("huge varlen char arrays", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);

        });
        test("create huge array of varlen's", () => {
            let group=file.createGroup('pmcservices/Huge Quotes');
            const quotes=new Array(7);
            quotes[0]="Never put off till tomorrow what may be done day after tomorrow just as well.";
            quotes[1]="I have never let my schooling interfere with my education";
            quotes[2]="Reader, suppose you were an idiot. And suppose you were a member of Congress. But I repeat myself.";
            quotes[3]="Substitute 'damn' every time you're inclined to write 'very;' your editor will delete it and the writing will be just as it should be.";
            quotes[4]="Don’t go around saying the world owes you a living. The world owes you nothing. It was here first.";
            quotes[5]="Loyalty to country ALWAYS. Loyalty to government, when it deserves it.";
            quotes[6]="What would men be without women? Scarce, sir...mighty scarce.";

            const hugeQuotes=new Array(250000);
            for(var i =0;i<250000;i++){
                hugeQuotes[i]=quotes[i % 7];
            }
            h5lt.makeDataset(group.id, "Mark Twain", hugeQuotes);
            group.close();
            file.close();
            file = new hdf5.File('./pmc.h5', Access.ACC_RDWR);
            group=file.openGroup('pmcservices/Huge Quotes');
            const array=h5lt.readDataset(group.id, 'Mark Twain', {start: [1000], stride: [1], count: [21]});
            console.dir(array[0]+" -- Mark Twain");
            expect(array.length).toBe(21);
            group.close();

        }, { timeout: 7000 });

        afterAll(() => {
          file.close();

        });
    });
    
    describe("varlen chars", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./test/examples/nba.h5', Access.ACC_RDONLY);

        });
        test("read varlen's", () => {
            const array=h5lt.readDataset(file.id, 'player');
            expect(array.length).toBe(500);
            if(array.constructor.name==='Array'){
                for(let mIndex=0;mIndex<array.length;mIndex++){
                    //console.dir(array[mIndex]);
                }
            }

        });
        afterAll(() => {
          file.close();

        });
    });


    describe("write/read enum", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./enum.h5', Access.ACC_TRUNC);

        });
        test("write enum", () => {
            var phases = {
                SOLID: 0,
                LIQUID: 1,
                GAS: 2,
                PLASMA: 3
            };
            const buffer=new Uint16Array(35);
            buffer[0]=phases.SOLID,  buffer[2]=phases.SOLID,  buffer[3]=phases.SOLID,  buffer[4]=phases.SOLID,  buffer[5]=phases.SOLID,  buffer[6]=phases.SOLID,  buffer[7]=phases.SOLID;
            buffer[8]=phases.SOLID,  buffer[9]=phases.LIQUID, buffer[10]=phases.GAS,    buffer[11]=phases.PLASMA, buffer[12]=phases.SOLID,  buffer[13]=phases.LIQUID, buffer[14]=phases.GAS;
            buffer[15]=phases.SOLID,  buffer[16]=phases.GAS,    buffer[17]=phases.SOLID,  buffer[18]=phases.GAS,    buffer[19]=phases.SOLID,  buffer[20]=phases.GAS,    buffer[21]=phases.SOLID;
            buffer[22]=phases.SOLID,  buffer[23]=phases.PLASMA, buffer[24]=phases.GAS,    buffer[2]=phases.LIQUID, buffer[26]=phases.SOLID,  buffer[27]=phases.PLASMA, buffer[28]=phases.GAS;
            h5lt.makeDataset(file.id, 'states', buffer, {rank: 2, rows: 5, columns: 7, enumeration: phases});


        });
        test("read enum", () => {
            const enumeration=h5lt.readDataset(file.id, 'states', (options) =>{
                console.dir(options.enumeration);
            });
            expect(enumeration.length).toBe(35);

        });
        afterAll(() => {
          file.close();

        });
    });

    describe.skip("reading inchies", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('/home/roger/Downloads/inchies/inchies_2.h5', Access.ACC_RDWR);

        });
        test("read an inchie data", () => {
var start = process.hrtime();
            const array=h5lt.readDataset(file.id, 'inchies');
    var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
    console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(4) + " ms"); // print message + time
            console.dir(array.length);
            console.dir(array[0]);
            expect(array.length).toBe(1000000);
            var ll=27;
            var hl=0;
            for(var i in array){
                if(array[i].length<ll)ll=array[i].length;
                if(array[i].length>hl)hl=array[i].length;
            }
            console.dir(ll+" "+hl);

        });
        afterAll(() => {
          file.close();

        });
    });
    
    describe("create an xmol with frequency pulled from h5 ", () => {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./pmc.h5', Access.ACC_RDONLY);

        });
        /** @type {Group} */
        let groupTarget;
        test("open of target should be >0", () => {
            groupTarget=file.openGroup('pmcservices/sodium-icosanoate', CreationOrder.H5P_CRT_ORDER_TRACKED| CreationOrder.H5P_CRT_ORDER_TRACKED);
            expect(groupTarget.id).not.toBe(-1);

        });
        test("getNumAttrs of groupTarget should be 3", () => {
            expect(groupTarget.getNumAttrs()).toBe(3);
            groupTarget.refresh();

            test("readAttribute Computed Heat Of Formation should be -221.78436098572274", () => {
                expect(groupTarget.refresh()).toBe(3);
                expect(groupTarget[ 'Computed Heat Of Formation' ]).toBe(-221.78436098572274);
                expect(groupTarget[ 'Computed Ionization Potential' ]).toBe(9.57689311885752);
                expect(groupTarget[ 'Computed Total Energy' ]).toBe(-3573.674399276322);
    
            });

        });
        test("open of Geometries should be >0", () => {
            const groupDocuments = file.openGroup('pmcservices/sodium-icosanoate/Documents');
            const xmlDocument    = h5lt.readDataset(groupDocuments.id, 'sodium-icosanoate.xml');
            parseString(xmlDocument, function (err, result) {
            const molecule=result['cml:cml']['cml:molecule'][0];

            const elements     =[];
            let elementIndex =0;
            for (let moleculeIndex = 0; moleculeIndex < molecule['cml:molecule'].length; moleculeIndex++)
            {
                const atoms=molecule['cml:molecule'][moleculeIndex]['cml:atomArray'][0]['cml:atom'];
                elements.length+=atoms.length;
                for (let index = 0; index < atoms.length; index++)
                {
                    elements[elementIndex] = util.inspect(atoms[index].$.elementType, false, null);
                    elements[elementIndex] = elements[elementIndex].substr(1,elements[elementIndex].length -2);
                    elementIndex++;
                }
            }
            const groupGeometries=file.openGroup('pmcservices/sodium-icosanoate/Trajectories/Geometries');
            const array=groupGeometries.getMemberNamesByCreationOrder();
            const groupFrequencies=file.openGroup('pmcservices/sodium-icosanoate/Frequency Data/Frequencies');
            const frequencyNames=groupFrequencies.getMemberNamesByCreationOrder();

            expect(array[1]).toBe("1");
            let xmolDocument="";
            expect(groupGeometries.getDatasetType(array[1])).toBe(HLType.HL_TYPE_LITE);
            const lastTrajectory=h5lt.readDataset(groupGeometries.id, array[1],  function(options) {
              expect(options.rank).toBe(2);
              expect(options.columns).toBe(3);
            });
                for (let frequencyIndex = 0; frequencyIndex < frequencyNames.length; frequencyIndex++)
                {
                    xmolDocument+=elements.length+'\n';
                    xmolDocument+=frequencyNames[frequencyIndex]+'\n';
                    expect(groupFrequencies.getDatasetType(frequencyNames[frequencyIndex])).toBe(HLType.HL_TYPE_LITE);
                    const frequency=h5lt.readDataset(groupFrequencies.id, frequencyNames[frequencyIndex]);
                    for (let index = 0; index < elements.length; index++)
                    {
                        xmolDocument+=elements[index]+' '+lastTrajectory[3*index]+' '+lastTrajectory[3*index+1]+' '+lastTrajectory[3*index+2]+' '+frequency[3*index]+' '+frequency[3*index+1]+' '+frequency[3*index+2]+'\n';
                    }
                }
                expect(xmolDocument.length).toBe(1435803);
                Bun.write('sodium-icosanoate.xmol', xmolDocument);
                Bun.write('sodium-icosanoate.xml', xmlDocument);
                groupGeometries.close();
                groupFrequencies.close();
                groupTarget.close();
            });
            groupDocuments.close();

        });

        /** @type {Group} */
        let groupGeometries;
        test("open of Geometries should be >0", () => {
            groupGeometries=file.openGroup('pmcservices/sodium-icosanoate/Trajectories/Geometries');
            expect(groupGeometries.id).not.toBe(-1);

        });
        test("getNumAttrs of Geometries should be 0", () => {
            expect(groupGeometries.getNumAttrs()).toBe(0);

        });
        test("getNumObjs of Geometries should be 2", () => {
            expect(groupGeometries.getNumObjs()).toBe(2);

        });
        test("getMemberNames of Geometries should be 240 names in creation order", () => {
            const array=groupGeometries.getMemberNamesByCreationOrder();
            expect(array[1]).toBe("1");

        });
        test("Size of dataset '0' should be 186 ", () => {
            expect(groupGeometries.getDatasetType('0')).toBe(HLType.HL_TYPE_LITE);
            const readBuffer=h5lt.readDataset(groupGeometries.id, '0', {bind_attributes:true});
            expect('Float64Array').toMatch(readBuffer.constructor.name);
            const length=186;
            expect(length).toBe(readBuffer.length);
            console.dir(readBuffer.Dipole);
            const value=2.9;
            expect(value).toEqual(readBuffer.Dipole);

        });
        test("Get dataset attributes", () => {
            expect(groupGeometries.getDatasetType('0')).toBe(HLType.HL_TYPE_LITE);
            const readBuffer=h5lt.readDataset(groupGeometries.id, '0');
            expect('Float64Array').toMatch(readBuffer.constructor.name);
            const length=186;
            expect(length).toBe(readBuffer.length);
            var attrs=groupGeometries.getDatasetAttributes('0');
            const value=2.9;
            expect(value).toEqual(attrs.Dipole);

        });
        test("Get dataset individual attribute", () => {
            expect(groupGeometries.getDatasetType('0')).toBe(HLType.HL_TYPE_LITE);
            const readBuffer=h5lt.readDataset(groupGeometries.id, '0');
            expect('Float64Array').toMatch(readBuffer.constructor.name);
            const length=186;
            expect(length).toBe(readBuffer.length);
            var attr=groupGeometries.getDatasetAttribute('0', 'Dipole');
            console.dir(attr);
            const value=2.9;
            expect(value).toEqual(attr);
            groupGeometries.close();

        });
        test("getNumAttrs of file should be 3", () => {
            expect(file.getNumAttrs()).toBe(0);
            file.refresh();

        });
        afterAll(() => {
          file.close();

        });
    }, { timeout: 35000 });
    
    describe("iterations on h5 ", function() {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./pmc.h5', Access.ACC_RDONLY);

        });
        /** @type {Group} */
        let groupTarget;
        test.skip("iterate thru", () => {
            groupTarget=file.openGroup('pmcservices', CreationOrder.H5P_CRT_ORDER_TRACKED| CreationOrder.H5P_CRT_ORDER_TRACKED);
            expect(groupTarget.id).not.toBe(-1);
            var paths=[];
            paths.push('sodium-icosanoate');
            paths.push('Triple');
            paths.push('Double');
            paths.push('Quotes');
            paths.push('namForest');
            try {
                var count=0;
                groupTarget.iterate(1, function(r, name) {
                    expect(paths[count]).toBe(name);
                    count++;
                });
            } catch (e) {

            }
            groupTarget.close();

        });
        
        test.skip("visit thru", () => {
            groupTarget=file.openGroup('pmcservices/sodium-icosanoate/Documents', CreationOrder.H5P_CRT_ORDER_TRACKED| CreationOrder.H5P_CRT_ORDER_TRACKED);
            expect(groupTarget.id).not.toBe(-1);
            try {
                var count=0;
                file.visit(1, function(r, xpath) {
                    //console.dir("visiting name: "+xpath);
                    count++;
                });
                console.log("cout "+count);
                expect(count).toBe(204);
            } catch (e) {
                console.log(e.message);
            }
            groupTarget.close();

        });
        
        afterAll(() => {
          file.close();

        });
    });

}, { timeout: 10000 });
