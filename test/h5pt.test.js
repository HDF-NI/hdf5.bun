import { describe, beforeAll, afterAll, test, expect } from "bun:test";

import { hdf5Lib, hdf5, h5pt } from '../index.js';
import globs from '../lib/globals.js';
import { Access, CreationOrder } from '../lib/globals.js';

describe("testing table interface ", function() {

    describe("create an h5, group and some tables ",function() {
        // open hdf file
        let file;
        beforeAll(() => {
          file = new hdf5.File('./h5pt.h5', Access.ACC_TRUNC);
        });

        test("should be Table io ", () => {
            const group=file.createGroup('pmc/refinement');
            expect(group.id).not.toBe(-1);
            const table  = new h5pt.PacketTable(new hdf5.Int64(0), 5);
            table.record = {};
            table.record.Set          = "Single Point";
            table.record["Date Time"] = "Mon Nov 24 13:10:44 2014";
            table.record.Name         = "Temperature";
            table.record.Value        = "37.4";
            table.record.Units        = "Celcius";

            h5pt.makeTable(group.id, 'Events', table);
            table.record.Set          = "Single Point";
            table.record["Date Time"] = "Mon Nov 24 13:20:44 2014";
            table.record.Name         = "Temperature";
            table.record.Value        = "37.3";
            table.record.Units        = "Celcius";
            table.append();
            table.record.Set          = "Single Point";
            table.record["Date Time"] = "Mon Nov 24 13:20:44 2014";
            table.record.Name         = "Temperature";
            table.record.Value        = "37.5";
            table.record.Units        = "Celcius";
            table.append();
            table.close();
            group.close();
        });

        test("should close pmc/refinement", () => {
            file.close();
        });
    });

    describe("should read table", () => {
        let file;
        beforeAll(() => {
          file = new hdf5.File('./h5pt.h5', Access.ACC_RDONLY);
        });

        test("should be Table input ", () => {
            const groupTarget=file.openGroup('pmc/refinement', CreationOrder.H5P_CRT_ORDER_TRACKED| CreationOrder.H5P_CRT_ORDER_TRACKED);
            expect(groupTarget.getDatasetType("Events")).toBe(HLType.HL_TYPE_PACKET_TABLE);
            const table = h5pt.readTable(groupTarget.id, "Events");

            const actualKeys   = Object.keys(table.record);
            const expectedKeys = [ 'Set', 'Date Time', 'Name', 'Value', 'Units' ];
            for (let i = 0; i < actualKeys.length; ++i) {
                expect(actualKeys[i]).toBe(expectedKeys[i]);
            }

            let idx = 0;
            const expectedVals = ['Single Point Mon Nov 24 13:10:44 2014 Temperature 37.4 Celcius',
                                  'Single Point Mon Nov 24 13:20:44 2014 Temperature 37.3 Celcius',
                                  'Single Point Mon Nov 24 13:20:44 2014 Temperature 37.5 Celcius'];
            while (table.next()) {
                const actualVal = table.record.Set + " " + table.record["Date Time"]+" "+table.record.Name + " "+table.record.Value + " " + table.record.Units;
                expect(actualVal).toBe(expectedVals[idx++]);
            }
            table.close();
            groupTarget.close();
        });

        afterAll(() => {
            file.close();
        });
    });

});

