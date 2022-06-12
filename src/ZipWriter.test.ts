import { test, expect } from "vitest";
import { ZipWriter } from "./ZipWriter";

// zip test data
const testDate = new Date(2000, 1, 1, 1, 1, 1, 1);
const referenceEntry = new Uint8Array(16);
const dv = new DataView(referenceEntry.buffer);
dv.setBigUint64(0, BigInt("0xC17E0A48186BCF59"));
dv.setBigUint64(8, BigInt("0xB5B7053E1D15F4B6"));
const referenceZipFile = new Uint8Array([
    0x50, 0x4B, 0x03, 0x04, 0x2D, 0x00, 0x08, 0x08, 0x00, 0x00, 0x20, 0x08,
    0x41, 0x28, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x04, 0x00, 0x04, 0x00, 0x74, 0x65, 0x73, 0x74, 0x01, 0x00,
    0x00, 0x00, 0xC1, 0x7E, 0x0A, 0x48, 0x18, 0x6B, 0xCF, 0x59, 0xB5, 0xB7,
    0x05, 0x3E, 0x1D, 0x15, 0xF4, 0xB6, 0x51, 0x51, 0x36, 0x1F, 0x10, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x50, 0x4B, 0x01, 0x02, 0x2D, 0x00,
    0x2D, 0x00, 0x08, 0x08, 0x00, 0x00, 0x20, 0x08, 0x41, 0x28, 0x51, 0x51,
    0x36, 0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x04, 0x00,
    0x1C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xFF, 0xFF, 0xFF, 0xFF, 0x74, 0x65, 0x73, 0x74, 0x01, 0x00, 0x18, 0x00,
    0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x50, 0x4B, 0x06, 0x06, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x2D, 0x00, 0x2D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x4E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x4E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x50, 0x4B, 0x06, 0x07,
    0x00, 0x00, 0x00, 0x00, 0x9C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0x00, 0x00
]);

test("Entry stream handles ArrayBuffer", async () => {
    const { sink, getData } = createBufferedSink();
    const writer = new ZipWriter(sink);

    const entry = await writer.addEntry("test", { noCompression: true, dateModified: testDate });
    const entryWriter = entry.getWriter();
    await entryWriter.write(referenceEntry.buffer);
    await entryWriter.close();

    await writer.close();

    expect(getData()).toStrictEqual(referenceZipFile);
});

test("Entry stream handles binary TypedArray", async () => {
    const { sink, getData } = createBufferedSink();
    const writer = new ZipWriter(sink);
    
    const entry = await writer.addEntry("test", { noCompression: true, dateModified: testDate });
    const entryWriter = entry.getWriter();
    await entryWriter.write(referenceEntry);
    await entryWriter.close();
    
    await writer.close();
    
    expect(getData()).toStrictEqual(referenceZipFile);
});

test("Entry stream handles non-binary TypedArray", async () => {
    const { sink, getData } = createBufferedSink();
    const writer = new ZipWriter(sink);

    const entry = await writer.addEntry("test", { noCompression: true, dateModified: testDate });
    const entryWriter = entry.getWriter();
    await entryWriter.write(new Int32Array(referenceEntry.buffer));
    await entryWriter.close();

    await writer.close();

    expect(getData()).toStrictEqual(referenceZipFile);
});

test("Entry stream handles TypedArray with buffer offset", async () => {
    const buffer = new ArrayBuffer(25);
    new Uint8Array(buffer).set(referenceEntry, 9);

    const { sink, getData } = createBufferedSink();
    const writer = new ZipWriter(sink);

    const entry = await writer.addEntry("test", { noCompression: true, dateModified: testDate });
    const entryWriter = entry.getWriter();
    await entryWriter.write(new Uint8Array(buffer, 9));
    await entryWriter.close();

    await writer.close();

    expect(getData()).toStrictEqual(referenceZipFile);
});

test("Entry stream handles DataView", async () => {
    const { sink, getData } = createBufferedSink();
    const writer = new ZipWriter(sink);

    const entry = await writer.addEntry("test", { noCompression: true, dateModified: testDate });
    const entryWriter = entry.getWriter();
    await entryWriter.write(new DataView(referenceEntry.buffer));
    await entryWriter.close();

    await writer.close();

    expect(getData()).toStrictEqual(referenceZipFile);
});

test("Entry stream handles empty writes", async () => {
    const { sink, getData } = createBufferedSink();
    const writer = new ZipWriter(sink);

    const entry = await writer.addEntry("test", { noCompression: true, dateModified: testDate });
    const entryWriter = entry.getWriter();
    await entryWriter.write(new Uint8Array(0));
    await entryWriter.write(referenceEntry);
    await entryWriter.write(new Uint8Array(0));
    await entryWriter.write(new Uint8Array(0));
    await entryWriter.close();

    await writer.close();

    expect(getData()).toStrictEqual(referenceZipFile);
});

test("Entry stream handles chunked writes", async () => {
    const { sink, getData } = createBufferedSink();
    const writer = new ZipWriter(sink);

    const entry = await writer.addEntry("test", { noCompression: true, dateModified: testDate });
    const entryWriter = entry.getWriter();
    await entryWriter.write(new Uint8Array(0));
    await entryWriter.write(referenceEntry.slice(0, 1));
    await entryWriter.write(referenceEntry.slice(1, 2));
    await entryWriter.write(new Uint8Array(0));
    await entryWriter.write(referenceEntry.slice(2, 12));
    await entryWriter.write(referenceEntry.slice(12, 16));
    await entryWriter.close();

    await writer.close();

    expect(getData()).toStrictEqual(referenceZipFile);
});

function createBufferedSink()
{
    const data: BufferSource[] = [];
    
    const sink = new WritableStream<BufferSource>({
        write(chunk){
            data.push(chunk);
        }
    });
    
    const getData = () => {
        let length = 0;
        for (const chunk of data)
            length += chunk.byteLength;
        
        const result = new Uint8Array(length);
        let offset = 0;
        
        for (const chunk of data) {
            result.set("buffer" in chunk ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength) : new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }
        
        return result;
    };
    
    return { sink, getData };
}