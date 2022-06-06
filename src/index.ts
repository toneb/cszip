import { rawCRC } from "./crc32";
import {
    EndOfCentralDirectoryRecord, FileHeader,
    LocalFileHeader,
    Zip64DataDescriptor, Zip64EndOfCentralDirectoryLocator, Zip64EndOfCentralDirectoryRecord,
    Zip64ExtendedInformationExtraField
} from "./zip-format";

// version needed to extract
// byte 1 = 0 - MS-DOS attribute information compatibility
// byte 2 = 45 - minimum ZIP specification version needed to extract = 4.5 - needs to support ZIP64 
const zipVersion = 0x2d;

// general purpose bit flags
// bit 1, 2 = 0 - Normal compression
// bit 3    = 1 - Sizes are set to zero in local header
// bit 11   = 1 - UTF-8 encoding of filename
const generalPurposeBitFlags = 0x0808;

const getDosTime = (date: Date) => (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2);
const getDosDate = (date: Date) => ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

const isCompressionSupported = !!(window as any).CompressionStream && (() => { try { new CompressionStream("deflate-raw"); return true; } catch { return false } })();

/**
 * The zip file writer.
 */
export class ZipWriter {
    private readonly _stream: WritableStream<BufferSource>
    private readonly _writer: WritableStreamDefaultWriter<BufferSource>;
    private readonly _encoder = new TextEncoder();
    private _isOpenWriter = false;
    private _position = BigInt(0);
    private _entries: { name: Uint8Array, compressedSize: bigint, uncompressedSize: bigint, offset: bigint, crc32: number, isCompressed: boolean, lastModDate: Date }[] = [];

    /**
     * Creates new instance of zip writer.
     * @param stream The output stream where data will be written.
     */
    constructor(stream: WritableStream<BufferSource>) {
        this._stream = stream;
        this._writer = stream.getWriter();   
    }

    /**
     * Adds new entry to zip file. Returns WritableStream which should be used to write entry data.
     * @param name File name.
     * @param options Additional options.
     */
    async addEntry(name: string, options?: { noCompression?: boolean, dateModified?: Date }): Promise<WritableStream<BufferSource>> {
        const isCompressed = options?.noCompression ? false : isCompressionSupported;
        const lastModDate = options?.dateModified ?? new Date();
        const encodedName = this._encoder.encode(name);
        
        if (this._isOpenWriter)
            throw new Error("Previous entry needs to be closed before new entry can be added.");
        
        // create header
        const headerBuffer = new ArrayBuffer(LocalFileHeader.fixedLength + encodedName.length + Zip64ExtendedInformationExtraField.fixedLength);
        
        const localHeader = new LocalFileHeader(headerBuffer, 0, true);
        localHeader.versionNeededToExtract = zipVersion;
        localHeader.generalPurposeBitFlag = generalPurposeBitFlags;
        localHeader.compressionMethod = isCompressed ? 8 : 0;
        localHeader.lastModFileTime = getDosTime(lastModDate);
        localHeader.lastModFileDate = getDosDate(lastModDate);
        localHeader.fileNameLength = encodedName.length;
        localHeader.extraFieldLength = Zip64ExtendedInformationExtraField.fixedLength;
        
        new Uint8Array(headerBuffer).set(encodedName, LocalFileHeader.fixedLength);
        
        const zip64ExtendedInfo = new Zip64ExtendedInformationExtraField(headerBuffer, LocalFileHeader.fixedLength + encodedName.length, true);
        zip64ExtendedInfo.size = 0;
        
        // write header
        const zipWriter = this._writer;
        await zipWriter.ready;
        await zipWriter.write(headerBuffer);

        // write body
        let uncompressedSize = BigInt(0);
        let compressedSize = BigInt(0);
        let crc = 0;
        let compressWriter: WritableStreamDefaultWriter<BufferSource> | null = null;
        let compressReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        
        if (isCompressed)
        {
            let compressionStream = new CompressionStream("deflate-raw");
            compressReader = compressionStream.readable.getReader();
            
            // start processing compressed chunks as they are arriving
            compressReader.read().then(async function process({ value, done }): Promise<void> {
                if (value) {
                    compressedSize += BigInt(value.length);
                    await zipWriter.ready;
                    await zipWriter.write(value);
                }
                
                if (!done)
                    return compressReader!.read().then(process);
            });
            
            compressWriter = compressionStream.writable.getWriter();
        }
        
        // return writable stream
        this._isOpenWriter = true;
        const self = this;
        
        return new WritableStream<BufferSource>({
            async write(chunk) {
                uncompressedSize += BigInt(chunk.byteLength);
                crc = rawCRC(chunk, crc);
                
                if (compressWriter)
                    await compressWriter.write(chunk);
                else
                    await zipWriter.write(chunk);
            },
            async close() {
                if (compressWriter) {
                    await compressWriter.close();
                    await compressReader!.closed;
                }
                else {
                    compressedSize = uncompressedSize;
                }
                
                // create data descriptor
                const descriptorBuffer = new ArrayBuffer(Zip64DataDescriptor.fixedLength);
                const descriptor = new Zip64DataDescriptor(descriptorBuffer, 0, true);
                descriptor.crc32 = crc;
                descriptor.compressedSize = compressedSize;
                descriptor.uncompressedSize = uncompressedSize;
                
                // write data descriptor
                await zipWriter.write(descriptorBuffer);
                
                // add to list of records
                self._entries.push({
                    name: encodedName,
                    compressedSize: compressedSize,
                    uncompressedSize: uncompressedSize,
                    offset: self._position,
                    crc32: crc,
                    isCompressed: isCompressed,
                    lastModDate: lastModDate
                });

                // cleanup
                self._isOpenWriter = false;
                self._position += BigInt(headerBuffer.byteLength) + compressedSize + BigInt(descriptorBuffer.byteLength);
            },
            abort(err) {
                throw new Error("Zip entry was aborted. " + err);
            }
        });
    }

    /**
     * Finalizes the file (writes entries) and closes output stream.
     */
    async close()
    {
        if (this._isOpenWriter)
            throw new Error("All entries must be closed before zip writer can be closed.");
        
        // generate central directory
        let centralDirectorySize = BigInt(0);
        
        for (const entry of this._entries)
        {
            // build header
            const headerBuffer = new ArrayBuffer(FileHeader.fixedLength + entry.name.length + Zip64ExtendedInformationExtraField.fixedLength + 24 /* zip64 extra field compressed size, uncompressed size, and offset */);
            const header = new FileHeader(headerBuffer, 0, true);
            header.versionMadeBy = zipVersion;
            header.versionNeededToExtract = zipVersion;
            header.generalPurposeBitFlag = generalPurposeBitFlags;
            header.compressionMethod = entry.isCompressed ? 8 : 0;
            header.lastModFileTime = getDosTime(entry.lastModDate); 
            header.lastModFileDate = getDosDate(entry.lastModDate);
            header.crc32 = entry.crc32;
            header.uncompressedSize = 0xFFFFFFFF; // will be set in zip64 extended info
            header.compressedSize = 0xFFFFFFFF; // will be set in zip64 extended info
            header.fileNameLength = entry.name.length;
            header.extraFieldLength = Zip64ExtendedInformationExtraField.fixedLength + 24;
            header.relativeOffsetOfLocalHeader = 0xFFFFFFFF; // will be set in zip64 extended info

            new Uint8Array(headerBuffer).set(entry.name, FileHeader.fixedLength);

            const zip64ExtendedInfo = new Zip64ExtendedInformationExtraField(headerBuffer, FileHeader.fixedLength + entry.name.length, true);
            zip64ExtendedInfo.size = 24;
            const additionalData = new DataView(headerBuffer, FileHeader.fixedLength + entry.name.length + Zip64ExtendedInformationExtraField.fixedLength);
            additionalData.setBigUint64(0, entry.uncompressedSize, true);
            additionalData.setBigUint64(8, entry.compressedSize, true);
            additionalData.setBigUint64(16, entry.offset, true);
            
            // write header
            await this._writer.write(headerBuffer);
            centralDirectorySize += BigInt(headerBuffer.byteLength);
        }
        
        const endBuffer = new ArrayBuffer(Zip64EndOfCentralDirectoryRecord.fixedLength + Zip64EndOfCentralDirectoryLocator.fixedLength + EndOfCentralDirectoryRecord.fixedLength);
        const zip64endRecord = new Zip64EndOfCentralDirectoryRecord(endBuffer, 0, true);
        zip64endRecord.sizeOfZip64EndOfCentralDirectoryRecord = BigInt(Zip64EndOfCentralDirectoryRecord.fixedLength - 12);
        zip64endRecord.versionMadeBy = zipVersion;
        zip64endRecord.versionNeededToExtract = zipVersion;
        zip64endRecord.totalNumberOfEntriesInTheCentralDirectoryOnThisDisk = BigInt(this._entries.length);
        zip64endRecord.totalNumberOfEntriesInTheCentralDirectory = BigInt(this._entries.length);
        zip64endRecord.sizeOfTheCentralDirectory = centralDirectorySize;
        zip64endRecord.offsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber = this._position;
        
        const zip64EndLocator = new Zip64EndOfCentralDirectoryLocator(endBuffer, Zip64EndOfCentralDirectoryRecord.fixedLength, true);
        zip64EndLocator.relativeOffsetOfTheZip64EndOfCentralDirectoryRecord = this._position + centralDirectorySize;
        zip64EndLocator.totalNumberOfDisks = 1;

        const endRecord = new EndOfCentralDirectoryRecord(endBuffer, Zip64EndOfCentralDirectoryRecord.fixedLength + Zip64EndOfCentralDirectoryLocator.fixedLength, true);
        endRecord.totalNumberOfEntriesInTheCentralDirectoryOnThisDisk = 0xFFFFFFFF; // is set in zip64 end record
        endRecord.totalNumberOfEntriesInTheCentralDirectory = 0xFFFFFFFF; // is set in zip64 end record
        endRecord.sizeOfTheCentralDirectory = 0xFFFFFFFF; // is set in zip64 end record
        endRecord.offsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber = 0xFFFFFFFF; // is set in zip64 end record;
        
        await this._writer.write(endBuffer);
        await this._writer.releaseLock();
        await this._stream.close();
    }
}
