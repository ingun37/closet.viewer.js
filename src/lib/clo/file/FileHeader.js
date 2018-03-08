import { freadString, readString } from '@/lib/clo/file/FileStrReader'
import { fread } from '@/lib/clo/file/FileTypeReader'

// Read header information from zpac file
export function readHeader(blob, offset){
	var SignatureSize = 16;
	var ProductVersionSize = 4;
	var value = {
		Signature: "", 
		HeaderVersion: 0, 
		HeaderSize: 0, 
		ThumbnailPos: 0, 
		ThumbnailSize: 0, 
		FileContentPos: 0, 
		FileContentSize: 0,
		CreateDate: 0,
		CreateOSType: 0,
		ModifiedDate: 0,
		ModifiedOSType: 0,
		UserID: "",
		UserName: "",
		TeamName: "",
		Company: "",
		ProductName: "",
		MajorVersion: 0, 
		MinorVersion: 0,
		PatchVersion: 0,
		RevisionVersion: 0,
		HasHeader: false
	};

	value.Signature = readString(blob, SignatureSize, offset);
	value.HeaderVersion = fread(blob, "Uint", 1, offset);
	value.HeaderSize = fread(blob, "Uint", 1, offset);

	if(value.HeaderSize < 0)
	{
		return null;
	}
	else
	{
		value.ThumbnailPos = fread(blob, "Uint", 1, offset);
		value.ThumbnailSize = fread(blob, "Uint", 1, offset);
		value.FileContentPos = fread(blob, "Uint", 1, offset);
		value.FileContentSize = fread(blob, "Uint", 1, offset);
		value.CreateDate = fread(blob, "Int64", 1, offset); // Dont't Use.
		value.CreateOSType = fread(blob, "Uint", 1, offset);
		value.ModifiedData = fread(blob, "Int64", 1, offset); // Don't Use.
		value.ModifiedOSType = fread(blob, "Uint", 1, offset);

		value.UserID = freadString(blob, offset);
		value.UserName = freadString(blob, offset);
		value.TeamName = freadString(blob, offset);
		value.Company = freadString(blob, offset);
		value.ProductName = freadString(blob, offset);
		value.MajorVersion = fread(blob, "Uint", 1, offset);
		value.MinorVersion = fread(blob, "Uint", 1, offset);
		value.PatchVersion = fread(blob, "Uint", 1, offset);
		value.RevisionVersion = fread(blob, "Uint", 1, offset);
	}
	value.HasHeader = true;
	return value;
}