/// <reference path="./global.d.ts" />

import { rawCRC } from "./crc32";
import {
    endOfCentralDirectoryRecord,
    EndOfCentralDirectoryRecord, fileHeader,
    FileHeader, FieldLength,
    localFileHeader,
    LocalFileHeader, setBigUint64, setUint16, setUint32, zip64DataDescriptor,
    Zip64DataDescriptor, zip64EndOfCentralDirectoryLocator,
    Zip64EndOfCentralDirectoryLocator, zip64EndOfCentralDirectoryRecord,
    Zip64EndOfCentralDirectoryRecord,
    zip64ExtendedInformationExtraField,
    Zip64ExtendedInformationExtraField, dataDescriptor, DataDescriptor
} from "./zip-format";

// version needed to extract
// byte 1 = 0 - MS-DOS attribute information compatibility
// byte 2 = 45 - minimum ZIP specification version needed to extract = 4.5 - needs to support ZIP64 
const zipVersion64 = 0x2d;
const zipVersion = 0x14;

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
    private readonly _options: { zip64?: boolean };
    private readonly _encoder = new TextEncoder();
    private _isOpenWriter = false;
    private _position = BigInt(0);
    private _entries: { name: Uint8Array, compressedSize: bigint, uncompressedSize: bigint, offset: bigint, crc32: number, isCompressed: boolean, lastModDate: Date }[] = [];

    /**
     * Creates new instance of zip writer.
     * @param stream The output stream where data will be written.
     * @param options The excel options, zip64 is enabled by default.
     */
    constructor(stream: WritableStream<BufferSource>, options?: { zip64?: boolean }) {
        this._stream = stream;
        this._writer = stream.getWriter();
        this._options = options ?? {};
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
        const zip64 = this._options.zip64 !== false;

        if (this._isOpenWriter)
            throw new Error("Previous entry needs to be closed before new entry can be added.");

        // create header
        const headerBuffer = new ArrayBuffer(FieldLength.LocalFileHeader + encodedName.length + (zip64 ? FieldLength.Zip64ExtendedInformationExtraField : 0));

        const localHeader = localFileHeader(headerBuffer, 0, true);
        setUint16(localHeader, LocalFileHeader.VersionNeededToExtract, zip64 ? zipVersion64 : zipVersion);
        setUint16(localHeader, LocalFileHeader.GeneralPurposeBitFlag, generalPurposeBitFlags);
        setUint16(localHeader, LocalFileHeader.CompressionMethod, isCompressed ? 8 : 0);
        setUint16(localHeader, LocalFileHeader.LastModFileTime, getDosTime(lastModDate));
        setUint16(localHeader, LocalFileHeader.LastModFileDate, getDosDate(lastModDate));
        setUint16(localHeader, LocalFileHeader.FileNameLength, encodedName.length);
        setUint16(localHeader, LocalFileHeader.ExtraFieldLength, zip64 ? FieldLength.Zip64ExtendedInformationExtraField : 0);

        new Uint8Array(headerBuffer).set(encodedName, FieldLength.LocalFileHeader);

        if (zip64) {
            const zip64ExtendedInfo = zip64ExtendedInformationExtraField(headerBuffer, FieldLength.LocalFileHeader + encodedName.length, true);
            setUint16(zip64ExtendedInfo, Zip64ExtendedInformationExtraField.Size, 0);
        }

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
                const descriptorBuffer = new ArrayBuffer(zip64 ? FieldLength.Zip64DataDescriptor : FieldLength.DataDescriptor);

                if (zip64) {
                    const descriptor = zip64DataDescriptor(descriptorBuffer, 0, true);
                    setUint32(descriptor, Zip64DataDescriptor.Crc32, crc);
                    setBigUint64(descriptor, Zip64DataDescriptor.CompressedSize, compressedSize);
                    setBigUint64(descriptor, Zip64DataDescriptor.UncompressedSize, uncompressedSize);

                    // write data descriptor
                    await zipWriter.write(descriptorBuffer);
                }
                else {
                    const descriptor = dataDescriptor(descriptorBuffer, 0, true);
                    setUint32(descriptor, DataDescriptor.Crc32, crc);
                    setUint32(descriptor, DataDescriptor.CompressedSize, Number(compressedSize));
                    setUint32(descriptor, DataDescriptor.UncompressedSize, Number(uncompressedSize));

                    // write data descriptor
                    await zipWriter.write(descriptorBuffer);
                }

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
        const zip64 = this._options.zip64 !== false;
        const version = zip64 ? zipVersion64 : zipVersion;

        for (const entry of this._entries)
        {
            // build header
            const headerBuffer = new ArrayBuffer(FieldLength.FileHeader + entry.name.length + (zip64 ? (FieldLength.Zip64ExtendedInformationExtraField + 24 /* zip64 extra field compressed size, uncompressed size, and offset */) : 0));
            const header = fileHeader(headerBuffer, 0, true);
            setUint16(header, FileHeader.VersionMadeBy, version);
            setUint16(header, FileHeader.VersionNeededToExtract, version);
            setUint16(header, FileHeader.GeneralPurposeBitFlag, generalPurposeBitFlags);
            setUint16(header, FileHeader.CompressionMethod, entry.isCompressed ? 8 : 0);
            setUint16(header, FileHeader.LastModFileTime, getDosTime(entry.lastModDate));
            setUint16(header, FileHeader.LastModFileDate, getDosDate(entry.lastModDate));
            setUint32(header, FileHeader.Crc32, entry.crc32);
            setUint32(header, FileHeader.UncompressedSize, zip64 ? 0xFFFFFFFF /* will be set in zip64 extended info */ : Number(entry.uncompressedSize));
            setUint32(header, FileHeader.CompressedSize,  zip64 ? 0xFFFFFFFF /* will be set in zip64 extended info */ : Number(entry.compressedSize));
            setUint16(header, FileHeader.FileNameLength, entry.name.length);
            setUint16(header, FileHeader.ExtraFieldLength, zip64 ? (FieldLength.Zip64ExtendedInformationExtraField + 24) : 0);
            setUint32(header, FileHeader.RelativeOffsetOfLocalHeader, zip64 ? 0xFFFFFFFF /* will be set in zip64 extended info */ : Number(entry.offset));

            new Uint8Array(headerBuffer).set(entry.name, FieldLength.FileHeader);

            if (zip64) {
                const zip64ExtendedInfo = zip64ExtendedInformationExtraField(headerBuffer, FieldLength.FileHeader + entry.name.length, true);
                setUint16(zip64ExtendedInfo, Zip64ExtendedInformationExtraField.Size, 24);
                const additionalData = new DataView(headerBuffer, FieldLength.FileHeader + entry.name.length + FieldLength.Zip64ExtendedInformationExtraField);
                additionalData.setBigUint64(0, entry.uncompressedSize, true);
                additionalData.setBigUint64(8, entry.compressedSize, true);
                additionalData.setBigUint64(16, entry.offset, true);
            }

            // write header
            await this._writer.write(headerBuffer);
            centralDirectorySize += BigInt(headerBuffer.byteLength);
        }

        if (zip64) {
            const endBuffer = new ArrayBuffer(FieldLength.Zip64EndOfCentralDirectoryRecord + FieldLength.Zip64EndOfCentralDirectoryLocator + FieldLength.EndOfCentralDirectoryRecord);
            const zip64endRecord = zip64EndOfCentralDirectoryRecord(endBuffer, 0, true);
            setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.SizeOfZip64EndOfCentralDirectoryRecord, BigInt(FieldLength.Zip64EndOfCentralDirectoryRecord - 12));
            setUint16(zip64endRecord, Zip64EndOfCentralDirectoryRecord.VersionMadeBy, version);
            setUint16(zip64endRecord, Zip64EndOfCentralDirectoryRecord.VersionNeededToExtract, version);
            setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk, BigInt(this._entries.length));
            setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory, BigInt(this._entries.length));
            setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory, centralDirectorySize);
            setBigUint64(zip64endRecord, Zip64EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber, this._position);

            const zip64EndLocator = zip64EndOfCentralDirectoryLocator(endBuffer, FieldLength.Zip64EndOfCentralDirectoryRecord, true);
            setBigUint64(zip64EndLocator, Zip64EndOfCentralDirectoryLocator.RelativeOffsetOfTheZip64EndOfCentralDirectoryRecord, this._position + centralDirectorySize);
            setUint32(zip64EndLocator, Zip64EndOfCentralDirectoryLocator.TotalNumberOfDisks, 1);

            const endRecord = endOfCentralDirectoryRecord(endBuffer, FieldLength.Zip64EndOfCentralDirectoryRecord + FieldLength.Zip64EndOfCentralDirectoryLocator, true);
            setUint16(endRecord, EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk, 0xFFFFFFFF); // is set in zip64 end record
            setUint16(endRecord, EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory, 0xFFFFFFFF); // is set in zip64 end record
            setUint32(endRecord, EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory, 0xFFFFFFFF); // is set in zip64 end record
            setUint32(endRecord, EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber, 0xFFFFFFFF); // is set in zip64 end record;

            await this._writer.write(endBuffer);
        }
        else {
            const endBuffer = new ArrayBuffer(FieldLength.EndOfCentralDirectoryRecord);

            const endRecord = endOfCentralDirectoryRecord(endBuffer, 0, true);
            setUint16(endRecord, EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk, this._entries.length);
            setUint16(endRecord, EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory, this._entries.length);
            setUint32(endRecord, EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory, Number(centralDirectorySize));
            setUint32(endRecord, EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber, Number(this._position));

            await this._writer.write(endBuffer);
        }

        await this._writer.releaseLock();
        await this._stream.close();
    }
}
