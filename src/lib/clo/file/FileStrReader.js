import { fread } from '@/lib/clo/file/FileTypeReader'


export function readString(blob, size, offset){
	var str = "";
	for(var n = 0; n < size ; ++n)
	{
		str += fread(blob, "Char", 1, offset);
	}
	return str;
}

export function freadString(blob, offset){
	var str = "";
	var count = fread(blob, "Uint", 1, offset);
	for(var n = 0 ; n < count ; ++n)
	{
		str += fread(blob, "Char", 1, offset);
	}
	return str;
}