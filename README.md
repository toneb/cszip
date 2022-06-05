# cszip
Tiny, fast, async, streaming zip library.

## Why cszip?
* **Streaming** - generate large files on the fly without pre-allocating memory. Based around [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) and [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API) 
* **Zip64** - create and consume zip files larger than 4GB
* **Async API** - compression is done in the background, not blocking the UI thread
* **[ISO/IEC 21320-1](https://www.iso.org/standard/60101.html) compatibility** - generate and consume Office Open XML, OpenDocument Format, EPUB compatible files
* **no-dependencies** - runs on any platform - browser, nodejs, deno. 

## Attributions
* [CRC32 implementation](https://gist.github.com/101arrowz/e58695f7ccfdf74f60ba22018093edea) by [101arrowz](https://gist.github.com/101arrowz) 
