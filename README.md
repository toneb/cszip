# cszip
Cszip is *tiny*, *fast*, *async*, and *streaming* zip library for browser, node.js and deno, designed to handle large zip files.

## Features
* **Streaming by default**. Generate large files on the fly without pre-allocating memory. Based around [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) and [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API). 
* **Handles archives larger than 4GB** (zip64).
* **Async and non-blocking**. Compression is done in the background, not blocking the main thread. 
* **No-dependencies**. Runs on any platform supporting web streams (browser, node.js, deno).
* **[ISO/IEC 21320-1](https://www.iso.org/standard/60101.html) compatible**. Generate and cunsume Office Open XML, OpenDocument Format, EPUB compatible files.
* **Tiny**.

## Usage
Install ```cszip```:  
```
npm i cszip 
```

Create zip files:
```javascript
import { ZipWriter } from "@toneb/cszip";

// create output stream (browser)
const fileHandle = await window.showSaveFilePicker();

// create zip file
const zip = new ZipWriter(fileHandle.createWritable());

// stream large file into zip
const entry1 = zip.addEntry("largefile.bin");
const largeFile = await fetch("/largeFile");
await largeFile.pipeTo(entry1);

// add text file via stream writer
const entry2 = zip.addEntry("README");
const entry2writer = entry2.getWriter();
await entry2writer.write(new TextEncoder().encode("Hello, World!"));
await entry2writer.close();

// finalize zip file
await test.close();
```

## API
```typescript
/**
 * The zip file writer.
 */
class ZipWriter {
    /**
     * Creates new instance of zip writer.
     * @param stream The output stream where data will be written. 
     */
    constructor(stream: WritableStream<BufferSource>);

    /**
     * Adds new entry to zip file. Returns WritableStream which should be used to write entry data.
     * @param name File name.
     * @param options Additional options.
     */
    async addEntry(name: string, options?: { noCompression?: boolean, dateModified?: Date }): Promise<WritableStream<BufferSource>>;

    /**
     * Finalizes the file (writes entries) and closes input stream. 
     */
    async close(): Promise<void>;
}
```

## Attributions
* [CRC32 implementation](https://gist.github.com/101arrowz/e58695f7ccfdf74f60ba22018093edea) by [101arrowz](https://gist.github.com/101arrowz) 
