
declare class CompressionStream extends TransformStream<Uint8Array, Uint8Array> {
    constructor(type: "deflate-raw");
}