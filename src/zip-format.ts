
class ZipRecord {
    protected readonly _data;
    
    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean, fixedLength: number, signature?: number)
    {
        if (buffer.byteLength < fixedLength)
            throw new Error("Buffer to short");

        this._data = new DataView(buffer, byteOffset);

        // init header if requested
        if (init && signature)
            this._data.setUint32(0, signature, true);

        // validate otherwise
        if (!init && signature && this._data.getUint32(0, true) !== signature)
            throw new Error("Data signature is not matching data type");
    }
}

export class LocalFileHeader extends ZipRecord {
    static readonly fixedLength = 30;
    static readonly signature = 0x04034b50;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
        super(buffer, byteOffset, init, LocalFileHeader.fixedLength, LocalFileHeader.signature);
    }

    get versionNeededToExtract() { return this._data.getUint16(4, true); }
    set versionNeededToExtract(value: number) { this._data.setUint16(4, value, true); }

    get generalPurposeBitFlag() { return this._data.getUint16(6, true); }
    set generalPurposeBitFlag(value: number) { this._data.setUint16(6, value, true); }

    get compressionMethod() { return this._data.getUint16(8, true); }
    set compressionMethod(value: number) { this._data.setUint16(8, value, true); }

    get lastModFileTime() { return this._data.getUint16(10, true); }
    set lastModFileTime(value: number) { this._data.setUint16(10, value, true); }

    get lastModFileDate() { return this._data.getUint16(12, true); }
    set lastModFileDate(value: number) { this._data.setUint16(12, value, true); }

    get crc32() { return this._data.getUint32(14, true); }
    set crc32(value: number){ this._data.setUint32(14, value, true); }

    get compressedSize() { return this._data.getUint32(18, true); }
    set compressedSize(value: number) { this._data.setUint32(18, value, true); }

    get uncompressedSize() { return this._data.getUint32(22, true); }
    set uncompressedSize(value: number) { this._data.setUint32(22, value, true); }

    get fileNameLength() { return this._data.getUint16(26, true); }
    set fileNameLength(value: number) { this._data.setUint16(26, value, true); }

    get extraFieldLength() { return this._data.getUint16(28, true); }
    set extraFieldLength(value: number) { this._data.setUint16(28, value, true); }
}

export class DataDescriptor extends ZipRecord {
    static readonly fixedLength = 12;
    static readonly signature = 0x08074b50;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
        super(buffer, byteOffset, init, DataDescriptor.fixedLength, DataDescriptor.signature);
    }

    get crc32() { return this._data.getUint32(0, true); }
    set crc32(value: number) { this._data.setUint32(0, value, true); }

    get compressedSize() { return this._data.getUint32(4, true); }
    set compressedSize(value: number) { this._data.setUint32(4, value, true); }

    get uncompressedSize() { return this._data.getUint32(8, true); }
    set uncompressedSize(value: number) { this._data.setUint32(8, value, true); }
}

export class Zip64DataDescriptor extends ZipRecord {
    static readonly fixedLength = 24;
    static readonly signature = 0x08074b50;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
        super(buffer, byteOffset, init, Zip64DataDescriptor.fixedLength, Zip64DataDescriptor.signature);
    }

    get crc32() { return this._data.getUint32(0, true); }
    set crc32(value: number) { this._data.setUint32(0, value, true); }

    get compressedSize() { return this._data.getBigUint64(4, true); }
    set compressedSize(value: bigint) { this._data.setBigUint64(4, value, true); }

    get uncompressedSize() { return this._data.getBigUint64(12, true); }
    set uncompressedSize(value: bigint) { this._data.setBigUint64(12, value, true); }
}

export class FileHeader extends ZipRecord {
    static readonly fixedLength = 46;
    static readonly signature = 0x02014b50;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
        super(buffer, byteOffset, init, FileHeader.fixedLength, FileHeader.signature);
    }

    get versionMadeBy() { return this._data.getUint16(4, true); }
    set versionMadeBy(value: number) { this._data.setUint16(4, value, true); }

    get versionNeededToExtract() { return this._data.getUint16(6, true); }
    set versionNeededToExtract(value: number) { this._data.setUint16(6, value, true); }

    get generalPurposeBitFlag() { return this._data.getUint16(8, true); }
    set generalPurposeBitFlag(value: number) { this._data.setUint16(8, value, true); }

    get compressionMethod() { return this._data.getUint16(10, true); }
    set compressionMethod(value: number) { this._data.setUint16(10, value, true); }

    get lastModFileTime() { return this._data.getUint16(12, true); }
    set lastModFileTime(value: number) { this._data.setUint16(12, value, true); }

    get lastModFileDate() { return this._data.getUint16(14, true); }
    set lastModFileDate(value: number) { this._data.setUint16(14, value, true); }

    get crc32() { return this._data.getUint32(16, true); }
    set crc32(value: number){ this._data.setUint32(16, value, true); }

    get compressedSize() { return this._data.getUint32(20, true); }
    set compressedSize(value: number) { this._data.setUint32(20, value, true); }

    get uncompressedSize() { return this._data.getUint32(24, true); }
    set uncompressedSize(value: number) { this._data.setUint32(24, value, true); }

    get fileNameLength() { return this._data.getUint16(28, true); }
    set fileNameLength(value: number) { this._data.setUint16(28, value, true); }

    get extraFieldLength() { return this._data.getUint16(30, true); }
    set extraFieldLength(value: number) { this._data.setUint16(30, value, true); }

    get fileCommentLength() { return this._data.getUint16(32, true); }
    set fileCommentLength(value: number) { this._data.setUint16(32, value, true); }

    get diskNumberStart() { return this._data.getUint16(34, true); }
    set diskNumberStart(value: number) { this._data.setUint16(34, value, true); }

    get internalFileAttributes() { return this._data.getUint16(36, true); }
    set internalFileAttributes(value: number) { this._data.setUint16(36, value, true); }

    get externalFileAttributes() { return this._data.getUint32(38, true); }
    set externalFileAttributes(value: number) { this._data.setUint32(38, value, true); }

    get relativeOffsetOfLocalHeader() { return this._data.getUint32(42, true); }
    set relativeOffsetOfLocalHeader(value: number) { this._data.setUint32(42, value, true); }
}

export class Zip64EndOfCentralDirectoryRecord extends ZipRecord {
    static readonly fixedLength = 56;
    static readonly signature = 0x06064b50;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
        super(buffer, byteOffset, init, Zip64EndOfCentralDirectoryRecord.fixedLength, Zip64EndOfCentralDirectoryRecord.signature);
    }

    get sizeOfZip64EndOfCentralDirectoryRecord() { return this._data.getBigUint64(4, true); }
    set sizeOfZip64EndOfCentralDirectoryRecord(value: bigint) { this._data.setBigUint64(4, value, true); }

    get versionMadeBy() { return this._data.getUint16(12, true); }
    set versionMadeBy(value: number) { this._data.setUint16(12, value, true); }

    get versionNeededToExtract() { return this._data.getUint16(14, true); }
    set versionNeededToExtract(value: number) { this._data.setUint16(14, value, true); }

    get numberOfThisDisk() { return this._data.getUint32(16, true); }
    set numberOfThisDisk(value: number) { this._data.setUint32(16, value, true); }

    get numberOfThisDiskWithTheStartOfCentralDirectory() { return this._data.getUint32(20, true); }
    set numberOfThisDiskWithTheStartOfCentralDirectory(value: number) { this._data.setUint32(20, value, true); }

    get totalNumberOfEntriesInTheCentralDirectoryOnThisDisk() { return this._data.getBigUint64(24, true); }
    set totalNumberOfEntriesInTheCentralDirectoryOnThisDisk(value: bigint) { this._data.setBigUint64(24, value, true); }

    get totalNumberOfEntriesInTheCentralDirectory() { return this._data.getBigUint64(32, true); }
    set totalNumberOfEntriesInTheCentralDirectory(value: bigint) { this._data.setBigUint64(32, value, true); }

    get sizeOfTheCentralDirectory() { return this._data.getBigUint64(40, true); }
    set sizeOfTheCentralDirectory(value: bigint) { this._data.setBigUint64(40, value, true); }

    get offsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber() { return this._data.getBigUint64(48, true); }
    set offsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber(value: bigint) { this._data.setBigUint64(48, value, true); }
}

export class Zip64EndOfCentralDirectoryLocator extends ZipRecord  {
    static readonly fixedLength = 20;
    static readonly signature = 0x07064b50;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
        super(buffer, byteOffset, init, Zip64EndOfCentralDirectoryLocator.fixedLength, Zip64EndOfCentralDirectoryLocator.signature);
    }

    get numberOfTheDiskWithTheStartOfTheZip64EndOfCentralDirectory() { return this._data.getUint32(4, true); }
    set numberOfTheDiskWithTheStartOfTheZip64EndOfCentralDirectory(value: number) { this._data.setUint32(4, value, true); }

    get relativeOffsetOfTheZip64EndOfCentralDirectoryRecord() { return this._data.getBigUint64(8, true); }
    set relativeOffsetOfTheZip64EndOfCentralDirectoryRecord(value: bigint) { this._data.setBigUint64(8, value, true); }

    get totalNumberOfDisks() { return this._data.getUint32(16, true); }
    set totalNumberOfDisks(value: number) { this._data.setUint32(16, value, true); }
}

export class EndOfCentralDirectoryRecord extends ZipRecord {
    static readonly fixedLength = 22;
    static readonly signature = 0x06054b50;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
        super(buffer, byteOffset, init, EndOfCentralDirectoryRecord.fixedLength, EndOfCentralDirectoryRecord.signature);
    }

    get numberOfThisDisk() { return this._data.getUint16(4, true); }
    set numberOfThisDisk(value: number) { this._data.setUint16(4, value, true); }

    get numberOfThisDiskWithTheStartOfCentralDirectory() { return this._data.getUint16(6, true); }
    set numberOfThisDiskWithTheStartOfCentralDirectory(value: number) { this._data.setUint16(6, value, true); }

    get totalNumberOfEntriesInTheCentralDirectoryOnThisDisk() { return this._data.getUint16(8, true); }
    set totalNumberOfEntriesInTheCentralDirectoryOnThisDisk(value: number) { this._data.setUint16(8, value, true); }

    get totalNumberOfEntriesInTheCentralDirectory() { return this._data.getUint16(10, true); }
    set totalNumberOfEntriesInTheCentralDirectory(value: number) { this._data.setUint16(10, value, true); }

    get sizeOfTheCentralDirectory() { return this._data.getUint32(12, true); }
    set sizeOfTheCentralDirectory(value: number) { this._data.setUint32(12, value, true); }

    get offsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber() { return this._data.getUint32(16, true); }
    set offsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber(value: number) { this._data.setUint32(16, value, true); }

    get zipFileCommentLength() { return this._data.getUint16(20, true); }
    set zipFileCommentLength(value: number) { this._data.setUint16(20, value, true); }
}

export class Zip64ExtendedInformationExtraField extends ZipRecord {
    static readonly fixedLength = 4;
    static readonly tag = 0x0001;

    constructor(buffer: ArrayBuffer, byteOffset: number, init: boolean)
    {
        super(buffer, byteOffset, init, Zip64ExtendedInformationExtraField.fixedLength);
        
        // init header if requested
        if (init)
            this._data.setUint16(0, Zip64ExtendedInformationExtraField.tag, true);

        // validate otherwise
        if (!init && this._data.getUint16(0, true) !== Zip64ExtendedInformationExtraField.tag)
            throw new Error("Extra field tag is not matching data tag");
    }

    get size() { return this._data.getUint16(2, true); }
    set size(value: number) { this._data.setUint16(2, value, true); }
}