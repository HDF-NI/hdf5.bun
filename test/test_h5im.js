import { describe, beforeAll, afterAll, test, expect } from "bun:test";

import { hdf5, h5im } from "../index.js";
import globs from '../lib/globals.js';

import { Group } from "../lib/Group.js"; 

describe("testing images ", () => {

    describe("read image and transfer",function() {
        // open hdf file
        let file;
        let file2;
        let image;
        beforeAll(() => {
            try {
            file  = new hdf5.File('./h5im.h5', globs.Access.ACC_TRUNC);
            file2 = new hdf5.File('./test/examples/hdf5.h5', globs.Access.ACC_RDONLY);
            image = h5im.readImage(file2.getNativeId(), 'hdf_logo.jpg');
            } catch(err) {
                expect(err.message).toBe("");
                console.dir(err.message);
            }
        });

        test("should be 1.14.6 ", () =>  {
            var version=hdf5.getLibVersion();
            expect(version).toStartWith('1.');
        });

        /** @type {Group} */
        let group;
        test("should be >0 ", () =>   {
            group = file.createGroup('pmc');
            expect(group.getNativeId()).not.toBe(-1);
        });

        test("should be an image ", () =>   {
            const res = h5im.isImage(file2.getNativeId(), 'hdf_logo.jpg');
            expect(res).toBe(true);
        });

        test("image width should be 48 ", () =>   {
            expect(image.width).toBe(48);
        });

        test("image height should be 45 ", () =>   {
            expect(image.height).toBe(45);
        });

        test("image interlace should be INTERLACE_PIXEL ", () =>   {
            expect(image.interlace).toBe('INTERLACE_PIXEL');
        });

        test("image planes should be 3 ", () =>   {
            expect(image.planes).toBe(3);
        });

        test("image length should be 6480 ", () =>   {
            expect(image.length).toBe(6480);
        });

        test("make image  ", () =>   {
            h5im.makeImage(group.getNativeId(), 'hdf_logo.jpg', image);
        });

        let imageAgain;
        test("again image width should be 48 ", () =>   {
            imageAgain=h5im.readImage(group.getNativeId(), 'hdf_logo.jpg');
            expect(imageAgain.width).toBe(48);
        });

        test("again make image  ", () =>   {
            h5im.makeImage(group.getNativeId(), 'repeat.jpg', imageAgain, {width: imageAgain.width, height: imageAgain.height, planes: imageAgain.planes});
        });

        test("repeat image options.width should be 48 ", () =>   {
            let imageRepeat=h5im.readImage(group.getNativeId(), 'repeat.jpg', (options) =>{
                expect(options.width).toBe(48);
                expect(options.height).toBe(45);
                expect(options.planes).toBe(3);
                expect(options.interlace).toBe('INTERLACE_PIXEL');
            });
        });

        afterAll(() => {
            group?.close();
            file.close();
            file2.close();
        });
    });
});
