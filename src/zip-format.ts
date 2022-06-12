// NOTE: not using classes for record representation, since classes poorly tree-shake/minify.  

// Local file header
export interface ILocalFileHeader extends DataView {
    __dummy_ILocalFileHeader: boolean
}

export const enum LocalFileHeader {
    VersionNeededToExtract = 4,
    GeneralPurposeBitFlag = 6,
    CompressionMethod = 8,
    LastModFileTime = 10,
    LastModFileDate = 12,
    Crc32 = 14,
    CompressedSize = 18,
    UncompressedSize = 22,
    FileNameLength = 26,
    ExtraFieldLength = 28
}

export function localFileHeader(buffer: ArrayBuffer, byteOffset: number, init: boolean): ILocalFileHeader
{
    return zipRecord(buffer, byteOffset, init, localFileHeader.fixedLength, localFileHeader.signature) as ILocalFileHeader;
}
localFileHeader.fixedLength = 30;
localFileHeader.signature = 0x04034b50;


// Data descriptor
export interface IDataDescriptor extends DataView {
    __dummy_IDataDescriptor: boolean
}

export const enum DataDescriptor {
    Crc32 = 0,
    CompressedSize = 4,
    UncompressedSize = 8
}

export function dataDescriptor(buffer: ArrayBuffer, byteOffset: number, init: boolean): IDataDescriptor
{
    return zipRecord(buffer, byteOffset, init, dataDescriptor.fixedLength, dataDescriptor.signature) as IDataDescriptor;
}
dataDescriptor.fixedLength = 12;
dataDescriptor.signature = 0x08074b50;


// zip64 data descriptor
export interface IZip64DataDescriptor extends DataView {
    __dummy_IZip64DataDescriptor: boolean
}

export const enum Zip64DataDescriptor {
    Crc32 = 0,
    CompressedSize = 4,
    UncompressedSize = 12
}

export function zip64DataDescriptor(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
    return zipRecord(buffer, byteOffset, init, dataDescriptor.fixedLength, zip64DataDescriptor.signature) as IZip64DataDescriptor;
}
zip64DataDescriptor.fixedLength = 24;
zip64DataDescriptor.signature = 0x08074b50;


// File header
export interface IFileHeader extends DataView {
    __dummy_IFileHeader: boolean
}

export const enum FileHeader {
    VersionMadeBy = 4,
    VersionNeededToExtract = 6,
    GeneralPurposeBitFlag = 8,
    CompressionMethod = 10,
    LastModFileTime = 12,
    LastModFileDate = 14,
    Crc32 = 16,
    CompressedSize = 20,
    UncompressedSize = 24,
    FileNameLength = 28,
    ExtraFieldLength = 30,
    FileCommentLength = 32,
    DiskNumberStart = 34,
    InternalFileAttributes = 36,
    ExternalFileAttributes = 38,
    RelativeOffsetOfLocalHeader = 42
}

export function fileHeader(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
    return zipRecord(buffer, byteOffset, init, fileHeader.fixedLength, fileHeader.signature) as IFileHeader;
}
fileHeader.fixedLength = 46;
fileHeader.signature = 0x02014b50;


// Zip64 end of central directory
export interface IZip64EndOfCentralDirectoryRecord extends DataView {
    __dummy_IZip64EndOfCentralDirectoryRecord: boolean
}

export const enum Zip64EndOfCentralDirectoryRecord {
    SizeOfZip64EndOfCentralDirectoryRecord = 4,
    VersionMadeBy = 12,
    VersionNeededToExtract = 14,
    NumberOfThisDisk = 16,
    NumberOfThisDiskWithTheStartOfCentralDirectory = 20,
    TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk = 24,
    TotalNumberOfEntriesInTheCentralDirectory = 32,
    SizeOfTheCentralDirectory = 40,
    OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber = 48
}

export function zip64EndOfCentralDirectoryRecord(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
    return zipRecord(buffer, byteOffset, init, zip64EndOfCentralDirectoryRecord.fixedLength, zip64EndOfCentralDirectoryRecord.signature) as IZip64EndOfCentralDirectoryRecord;
}
zip64EndOfCentralDirectoryRecord.fixedLength = 56;
zip64EndOfCentralDirectoryRecord.signature = 0x06064b50;


// Zip64 end of central directory locator
export interface IZip64EndOfCentralDirectoryLocator extends DataView {
    __dummy_IZip64EndOfCentralDirectoryLocator: boolean
}

export const enum Zip64EndOfCentralDirectoryLocator {
    NumberOfTheDiskWithTheStartOfTheZip64EndOfCentralDirectory = 4,
    RelativeOffsetOfTheZip64EndOfCentralDirectoryRecord = 8,
    TotalNumberOfDisks = 16
}

export function zip64EndOfCentralDirectoryLocator(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
    return zipRecord(buffer, byteOffset, init, zip64EndOfCentralDirectoryLocator.fixedLength, zip64EndOfCentralDirectoryLocator.signature) as IZip64EndOfCentralDirectoryLocator;
}
zip64EndOfCentralDirectoryLocator.fixedLength = 20;
zip64EndOfCentralDirectoryLocator.signature = 0x07064b50;


// End of central directory record
export interface IEndOfCentralDirectoryRecord extends DataView {
    __dummy_IEndOfCentralDirectoryRecord: boolean
}

export const enum EndOfCentralDirectoryRecord {
    NumberOfThisDisk = 4,
    NumberOfThisDiskWithTheStartOfCentralDirectory = 6,
    TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk = 8,
    TotalNumberOfEntriesInTheCentralDirectory = 10,
    SizeOfTheCentralDirectory = 12,
    OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber = 16,
    ZipFileCommentLength = 20
}

export function endOfCentralDirectoryRecord(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
    return zipRecord(buffer, byteOffset, init, endOfCentralDirectoryRecord.fixedLength, endOfCentralDirectoryRecord.signature) as IEndOfCentralDirectoryRecord;
}
endOfCentralDirectoryRecord.fixedLength = 22;
endOfCentralDirectoryRecord.signature = 0x06054b50;


// Zip64 extended information extra field
export interface IZip64ExtendedInformationExtraField extends DataView {
    __dummy_IZip64ExtendedInformationExtraField: boolean
}

export const enum Zip64ExtendedInformationExtraField {
    Size = 2
}

export function zip64ExtendedInformationExtraField(buffer: ArrayBuffer, byteOffset: number, init: boolean) {
    const data = zipRecord(buffer, byteOffset, init, zip64ExtendedInformationExtraField.fixedLength);

    // init header if requested
    if (init)
        setUint16(data as any, 0, zip64ExtendedInformationExtraField.tag);

    // validate otherwise
    if (!init && getUint16(data as any, 0) !== zip64ExtendedInformationExtraField.tag)
        throw new Error("Extra field tag is not matching data tag");
    
    return data as IZip64ExtendedInformationExtraField;
}
zip64ExtendedInformationExtraField.fixedLength = 4;
zip64ExtendedInformationExtraField.tag = 0x0001;


// helpers
export function getUint16(data: IZip64ExtendedInformationExtraField, byteOffset: Zip64ExtendedInformationExtraField.Size): number;
export function getUint16(data: IEndOfCentralDirectoryRecord, byteOffset: EndOfCentralDirectoryRecord.NumberOfThisDisk | EndOfCentralDirectoryRecord.NumberOfThisDiskWithTheStartOfCentralDirectory | EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk | EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory | EndOfCentralDirectoryRecord.ZipFileCommentLength): number;
export function getUint16(data: IZip64EndOfCentralDirectoryRecord, byteOffset: Zip64EndOfCentralDirectoryRecord.VersionMadeBy | Zip64EndOfCentralDirectoryRecord.VersionNeededToExtract): number;
export function getUint16(data: IFileHeader, byteOffset: FileHeader.VersionMadeBy | FileHeader.VersionNeededToExtract | FileHeader.GeneralPurposeBitFlag | FileHeader.CompressionMethod | FileHeader.LastModFileTime | FileHeader.LastModFileDate | FileHeader.FileNameLength | FileHeader.ExtraFieldLength | FileHeader.FileCommentLength | FileHeader.DiskNumberStart | FileHeader.InternalFileAttributes): number;
export function getUint16(data: ILocalFileHeader, byteOffset: LocalFileHeader.VersionNeededToExtract | LocalFileHeader.GeneralPurposeBitFlag | LocalFileHeader.CompressionMethod | LocalFileHeader.LastModFileTime | LocalFileHeader.LastModFileDate | LocalFileHeader.FileNameLength | LocalFileHeader.ExtraFieldLength): number;
export function getUint16(data: DataView, byteOffset: number) {
    return data.getUint16(byteOffset, true);
}

export function setUint16(data: IZip64ExtendedInformationExtraField, byteOffset: Zip64ExtendedInformationExtraField.Size, value: number): void;
export function setUint16(data: IEndOfCentralDirectoryRecord, byteOffset: EndOfCentralDirectoryRecord.NumberOfThisDisk | EndOfCentralDirectoryRecord.NumberOfThisDiskWithTheStartOfCentralDirectory | EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk | EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory | EndOfCentralDirectoryRecord.ZipFileCommentLength, value: number): void;
export function setUint16(data: IZip64EndOfCentralDirectoryRecord, byteOffset: Zip64EndOfCentralDirectoryRecord.VersionMadeBy | Zip64EndOfCentralDirectoryRecord.VersionNeededToExtract, value: number): void;
export function setUint16(data: IFileHeader, byteOffset: FileHeader.VersionMadeBy | FileHeader.VersionNeededToExtract | FileHeader.GeneralPurposeBitFlag | FileHeader.CompressionMethod | FileHeader.LastModFileTime | FileHeader.LastModFileDate | FileHeader.FileNameLength | FileHeader.ExtraFieldLength | FileHeader.FileCommentLength | FileHeader.DiskNumberStart | FileHeader.InternalFileAttributes, value: number): void;
export function setUint16(data: ILocalFileHeader, byteOffset: LocalFileHeader.VersionNeededToExtract | LocalFileHeader.GeneralPurposeBitFlag | LocalFileHeader.CompressionMethod | LocalFileHeader.LastModFileTime | LocalFileHeader.LastModFileDate | LocalFileHeader.FileNameLength | LocalFileHeader.ExtraFieldLength, value: number): void;
export function setUint16(data: DataView, byteOffset: number, value: number) {
    return data.setUint16(byteOffset, value, true);
}

export function getUint32(data: IEndOfCentralDirectoryRecord, byteOffset: EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory | EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber): number;
export function getUint32(data: IZip64EndOfCentralDirectoryLocator, byteOffset: Zip64EndOfCentralDirectoryLocator.NumberOfTheDiskWithTheStartOfTheZip64EndOfCentralDirectory | Zip64EndOfCentralDirectoryLocator.TotalNumberOfDisks): number;
export function getUint32(data: IZip64EndOfCentralDirectoryRecord, byteOffset: Zip64EndOfCentralDirectoryRecord.NumberOfThisDisk | Zip64EndOfCentralDirectoryRecord.NumberOfThisDiskWithTheStartOfCentralDirectory): number;
export function getUint32(data: IFileHeader, byteOffset: FileHeader.Crc32 | FileHeader.CompressedSize | FileHeader.UncompressedSize | FileHeader.ExternalFileAttributes | FileHeader.RelativeOffsetOfLocalHeader): number;
export function getUint32(data: IZip64DataDescriptor, byteOffset: Zip64DataDescriptor.Crc32): number;
export function getUint32(data: ILocalFileHeader, byteOffset: LocalFileHeader.Crc32 | LocalFileHeader.CompressedSize | LocalFileHeader.UncompressedSize): number;
export function getUint32(data: IDataDescriptor, byteOffset: DataDescriptor.Crc32 | DataDescriptor.CompressedSize | DataDescriptor.UncompressedSize): number;
export function getUint32(data: DataView, byteOffset: number) {
    return data.getUint32(byteOffset, true);
}

export function setUint32(data: IEndOfCentralDirectoryRecord, byteOffset: EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory | EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber, value: number): void;
export function setUint32(data: IZip64EndOfCentralDirectoryLocator, byteOffset: Zip64EndOfCentralDirectoryLocator.NumberOfTheDiskWithTheStartOfTheZip64EndOfCentralDirectory | Zip64EndOfCentralDirectoryLocator.TotalNumberOfDisks, value: number): void;
export function setUint32(data: IZip64EndOfCentralDirectoryRecord, byteOffset: Zip64EndOfCentralDirectoryRecord.NumberOfThisDisk | Zip64EndOfCentralDirectoryRecord.NumberOfThisDiskWithTheStartOfCentralDirectory, value: number): void;
export function setUint32(data: IFileHeader, byteOffset: FileHeader.Crc32 | FileHeader.CompressedSize | FileHeader.UncompressedSize | FileHeader.ExternalFileAttributes | FileHeader.RelativeOffsetOfLocalHeader, value: number): void;
export function setUint32(data: IZip64DataDescriptor, byteOffset: Zip64DataDescriptor.Crc32, value: number): void;
export function setUint32(data: ILocalFileHeader, byteOffset: LocalFileHeader.Crc32 | LocalFileHeader.CompressedSize | LocalFileHeader.UncompressedSize, value: number): void;
export function setUint32(data: IDataDescriptor, byteOffset: DataDescriptor.Crc32 | DataDescriptor.CompressedSize | DataDescriptor.UncompressedSize, value: number): void;
export function setUint32(data: DataView, byteOffset: number, value: number) {
    data.setUint32(byteOffset, value, true);
}

export function getBigUint64(data: IZip64EndOfCentralDirectoryLocator, byteOffset: Zip64EndOfCentralDirectoryLocator.RelativeOffsetOfTheZip64EndOfCentralDirectoryRecord): bigint;
export function getBigUint64(data: IZip64EndOfCentralDirectoryRecord, byteOffset: Zip64EndOfCentralDirectoryRecord.SizeOfZip64EndOfCentralDirectoryRecord | Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk | Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory | Zip64EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory | Zip64EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber): bigint;
export function getBigUint64(data: IZip64DataDescriptor, byteOffset: Zip64DataDescriptor.CompressedSize | Zip64DataDescriptor.UncompressedSize): bigint;
export function getBigUint64(data: DataView, byteOffset: number) {
    return data.getBigUint64(byteOffset, true);
}

export function setBigUint64(data: IZip64EndOfCentralDirectoryLocator, byteOffset: Zip64EndOfCentralDirectoryLocator.RelativeOffsetOfTheZip64EndOfCentralDirectoryRecord, value: bigint): void;
export function setBigUint64(data: IZip64EndOfCentralDirectoryRecord, byteOffset: Zip64EndOfCentralDirectoryRecord.SizeOfZip64EndOfCentralDirectoryRecord | Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectoryOnThisDisk | Zip64EndOfCentralDirectoryRecord.TotalNumberOfEntriesInTheCentralDirectory | Zip64EndOfCentralDirectoryRecord.SizeOfTheCentralDirectory | Zip64EndOfCentralDirectoryRecord.OffsetOfStartOfCentralDirectoryWithRespectToTheStartingDiskNumber, value: bigint): void;
export function setBigUint64(data: IZip64DataDescriptor, byteOffset: Zip64DataDescriptor.CompressedSize | Zip64DataDescriptor.UncompressedSize, value: bigint): void;
export function setBigUint64(data: DataView, byteOffset: number, value: bigint) {
    data.setBigUint64(byteOffset, value, true);
}

function zipRecord(buffer: ArrayBuffer, byteOffset: number, init: boolean, fixedLength: number, signature?: number)
{
    if (buffer.byteLength < fixedLength)
        throw new Error("Buffer to short");

    const data = new DataView(buffer, byteOffset);

    // init header if requested
    if (init && signature)
        setUint32(data as any,0, signature);

    // validate otherwise
    if (!init && signature && getUint32(data as any, 0) !== signature)
        throw new Error("Data signature is not matching data type");
    
    return data;
}