﻿import { rawCRC } from "./crc32";
import {
    endOfCentralDirectoryRecord,
    EndOfCentralDirectoryRecord, fileHeader,
    FileHeader,
    localFileHeader,
    LocalFileHeader, setBigUint64, setUint16, setUint32, zip64DataDescriptor,
    Zip64DataDescriptor, zip64EndOfCentralDirectoryLocator,
    Zip64EndOfCentralDirectoryLocator, zip64EndOfCentralDirectoryRecord,
    Zip64EndOfCentralDirectoryRecord,
    zip64ExtendedInformationExtraField,
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

const isCompressionSupported = !!(globalThis as any).CompressionStream && (() => { try { new CompressionStream("deflate-raw"); return true; } catch { return false } })();

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
        const headerBuffer = new ArrayBuffer(localFileHeader.fixedLength + encodedName.length + zip64ExtendedInformationExtraField.fixedLength);

        const localHeader = localFileHeader(headerBuffer, 0, true);
        setUint16(localHeader, LocalFileHeader.VersionNeededToExtract, zipVersion);
        setUint16(localHeader, LocalFileHeader.GeneralPurposeBitFlag, generalPurposeBitFlags);
        setUint16(localHeader, LocalFileHeader.CompressionMethod, isCompressed ? 8 : 0);
        setUint16(localHeader, LocalFileHeader.LastModFileTime, getDosTime(lastModDate));
        setUint16(localHeader, LocalFileHeader.LastModFileDate, getDosDate(lastModDate));
        setUint16(localHeader, LocalFileHeader.FileNameLength, encodedName.length);
        setUint16(localHeader, LocalFileHeader.ExtraFieldLength, zip64ExtendedInformationExtraField.fixedLength);

        new Uint8Array(headerBuffer).set(encodedName, localFileHeader.fixedLength);

        const zip64ExtendedInfo = zip64ExtendedInformationExtraField(headerBuffer, localFileHeader.fixedLength + encodedName.length, true);
        setUint16(zip64ExtendedInfo, Zip64ExtendedInformationExtraField.Size, 0);

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
                    compressedSize += BigInt(value.byteLength);
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
                crc = rawCRC("buffer" in chunk ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength) : new Uint8Array(chunk), crc);

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
                
                // finish crc
                if (crc < 0)
                    crc = crc + 0x1_0000_0000;

                // create data descriptor
                const descriptorBuffer = new ArrayBuffer(zip64DataDescriptor.fixedLength);
                const descriptor = zip64DataDescriptor(descriptorBuffer, 0, true);
                setUint32(descriptor, Zip64DataDescriptor.Crc32, crc);
                setBigUint64(descriptor, Zip64DataDescriptor.CompressedSize, compressedSize);
                setBigUint64(descriptor, Zip64DataDescriptor.UncompressedSize, uncompressedSize);

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
            const headerBuffer = new ArrayBuffer(fileHeader.fixedLength + entry.name.length + zip64ExtendedInformationExtraField.fixedLength + 24 /* zip64 extra field compressed size, uncompressed size, and offset */);
            const header = fileHeader(headerBuffer, 0, true);
            setUint16(header, FileHeader.VersionMadeBy, zipVersion);
            setUint16(header, FileHeader.VersionNeededToExtract, zipVersion);
            setUint16(header, FileHeader.GeneralPurposeBitFlag, generalPurposeBitFlags);
            setUint16(header, FileHeader.CompressionMethod, entry.isCompressed ? 8 : 0);
            setUint16(header, FileHeader.LastModFileTime, getDosTime(entry.lastModDate));
            setUint16(header, FileHeader.LastModFileDate, getDosDate(entry.lastModDate));
            setUint32(header, FileHeader.Crc32, entry.crc32);
            setUint32(header, FileHeader.UncompressedSize, 0xFFFFFFFF); // will be set in zip64 extended info
            setUint32(header, FileHeader.CompressedSize,  0xFFFFFFFF); // will be set in zip64 extended info
            setUint16(header, FileHeader.FileNameLength, entry.name.length);
            setUint16(header, FileHeader.ExtraFieldLength, zip64ExtendedInformationExtraField.fixedLength + 24);
            setUint32(header, FileHeader.RelativeOffsetOfLocalHeader, 0xFFFFFFFF); // will be set in zip64 extended info

            new Uint8Array(headerBuffer).set(entry.name, fileHeader.fixedLength);

            const zip64ExtendedInfo = zip64ExtendedInformationExtraField(headerBuffer, fileHeader.fixedLength + entry.name.length, true);
            setUint16(zip64ExtendedInfo, Zip64ExtendedInformationExtraField.Size, 24);
            const additionalData = new DataView(headerBuffer, fileHeader.fixedLength + entry.name.length + zip64ExtendedInformationExtraField.fixedLength);
            additionalData.setBigUint64(0, entry.uncompressedSize, true);
            additionalData.setBigUint64(8, entry.compressedSize, true);
            additionalData.setBigUint64(16, entry.offset, true);

            // write header
            await this._writer.write(headerBuffer);
            centralDirectorySize += BigInt(headerBuffer.byteLength);
        }

        const endBuffer = new ArrayBuffer(zip64EndOfCentralDirectoryRecord.fixedLength + zip64EndOfCentralDirectoryLocator.fixedLength + endOfCentralDirectoryRecord.fixedLength);
        const zip64endRecord = zip64EndOfCentralDirectoryRecord(endBuffer, 0, true);
        setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.SizeOfZip64EndOfCentralDirectoryRecord, BigInt(zip64EndOfCentralDirectoryRecord.fixedLength - 12));
        setUint16(zip64endRecord, Zip64EndOfCentralDirectoryRecord.VersionMadeBy, zipVersion);
        setUint16(zip64endRecord, Zip64EndOfCentralDirectoryRecord.VersionNeededToExtract, zipVersion);
        setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk, BigInt(this._entries.length));
        setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory, BigInt(this._entries.length));
        setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory, centralDirectorySize);
        setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber, this._position);

        const zip64EndLocator = zip64EndOfCentralDirectoryLocator(endBuffer, zip64EndOfCentralDirectoryRecord.fixedLength, true);
        setBigUint64(zip64EndLocator, Zip64EndOfCentralDirectoryLocator.RelativeOffsetOfTheZip64EndOfCentralDirectoryRecord, this._position + centralDirectorySize);
        setUint32(zip64EndLocator, Zip64EndOfCentralDirectoryLocator.TotalNumberOfDisks, 1);

        const endRecord = endOfCentralDirectoryRecord(endBuffer, zip64EndOfCentralDirectoryRecord.fixedLength + zip64EndOfCentralDirectoryLocator.fixedLength, true);
        setUint16(endRecord, EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk, 0xFFFFFFFF); // is set in zip64 end record
        setUint16(endRecord, EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory, 0xFFFFFFFF); // is set in zip64 end record
        setUint32(endRecord, EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory, 0xFFFFFFFF); // is set in zip64 end record
        setUint32(endRecord, EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber, 0xFFFFFFFF); // is set in zip64 end record;

        await this._writer.write(endBuffer);
        await this._writer.releaseLock();
        await this._stream.close();
    }
}
