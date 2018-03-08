import { fread } from '@/lib/clo/file/FileTypeReader'
import { getType } from '@/lib/clo/file/Types'
import { readString } from '@/lib/clo/file/FileStrReader'
//@ [Caution] Only read TrianglePointList at Class FabricShape2D.

function readByteArrayFromArrayBuffer(type, array){
	var offset = {Offset: 0};
	var ret_array = [];
	var length = array.ArrayLength;
	//console.log(length);

	if(array.IsArray)
	{
		for(var i = 0 ; i < length ; ++i)
		{
			var value = {Index: 0, PtIndex: [], Alpha: 0.0, Beta: 0.0, Gamma: 0.0, doNotUseTriIndex: 0};

			value.Index = fread(array.Data, "Uint", 1, offset);
			value.PtIndex.push(fread(array.Data, "Uint", 1, offset));
			value.PtIndex.push(fread(array.Data, "Uint", 1, offset));
			value.PtIndex.push(fread(array.Data, "Uint", 1, offset));

			value.Alpha = fread(array.Data, "Float", 1, offset);
			value.Beta = fread(array.Data, "Float", 1, offset);
			value.Gamma = fread(array.Data, "Float", 1, offset);
			value.doNotUseTriIndex = fread(array.Data, "Uint", 1, offset);

			ret_array.push(value);
		}
	}
	return ret_array;
}

//@ [Caution] Only read StitchData in TopStitchProperty.
function readStitchDataFromByteArrayBuffer(blob){
	var offset = {Offset: 0};
	var ret = {StitchType: 0, StitchOffset: 0, ThreadType: 0, CottonYarnSizeIndex: 0, CottonPlySizeIndex: 0, TexIndex: 0, SPIIndex: 0, PickStitchIndex: 0, NumberOfLines: 0, StitchDistance: 0, ThreadThicknessPresetIndex: 0, reserved: new Array(7)};

	ret.StitchType = fread(blob, "Uint", 1, offset);
	ret.StitchOffset = fread(blob, "Uint", 1, offset);
	ret.ThreadType = fread(blob, "Uint", 1, offset);
	ret.CottonYarnSizeIndex = fread(blob, "Uint", 1, offset);
	ret.CottonPlySizeIndex = fread(blob, "Uint", 1, offset);
	ret.TexIndex = fread(blob, "Uint", 1, offset);
	ret.SPIIndex = fread(blob, "Uint", 1, offset);
	ret.PickStitchIndex = fread(blob, "Uint", 1, offset);
	ret.NumberOfLines = fread(blob, "Uint", 1, offset);
	ret.StitchDistance = fread(blob, "Uint", 1, offset);
	ret.ThreadThicknessPresetIndex = fread(blob, "Uint", 1, offset);

	ret.reserved[0] = fread(blob, "Uint", 1, offset);
	ret.reserved[1] = fread(blob, "Uint", 1, offset);
	ret.reserved[2] = fread(blob, "Uint", 1, offset);
	ret.reserved[3] = fread(blob, "Uint", 1, offset);
	ret.reserved[4] = fread(blob, "Uint", 1, offset);
	ret.reserved[5] = fread(blob, "Uint", 1, offset);
	ret.reserved[6] = fread(blob, "Uint", 1, offset);

	return ret;
}

// ByteArray conversion defined type
export function readByteArray(type, blob){
	var offset = {Offset: 0};
	var value;


	if(type != "String")
	{
		var array = [];

		while(offset.Offset < blob.byteLength){
			array.push(fread(blob, type, 1, offset));
		}

		value = array;
	}
	else
		value = readString(blob, blob.byteLength, offset);

	return value;
}

function freadMap(blob, offset){
	return readMap(blob, offset);
}

export function readMap(blob, offset){
	var map_size = fread(blob, "Int8", 1, offset);
	//console.log("readMap::MapSize : "+map_size);

	if(map_size)
	{
		var keySize = readKeySize(blob, map_size, offset);
		//console.log("readMap::KeySize : "+keySize);

		var valueType = readValueType(blob, map_size, offset);
		//console.log("readMap::ValueType : "+valueType);

		var valueSize = readValueSize(blob, map_size, offset);
		//console.log("readMap::ValueSize : "+valueSize);

		return createMap(blob, map_size, offset, keySize, valueType, valueSize);
	}
	return null;
}

function readList(blob, offset){
	var list_size = fread(blob, "Int32", 1, offset);
	//console.log("ListSize : "+list_size);

	if(list_size)
	{
		var valueType = fread(blob, "Int8", 1, offset);
		//console.log("ListValueType : "+valueType);

		var valueSize = readValueSize(blob, list_size, offset);
		//console.log("ListValueSize : "+valueSize);

		return createList(blob, list_size, offset, valueType, valueSize);
	}
	return null;
}

function readArray(blob, offset, size){
	var array_size = fread(blob, "Int32", 1, offset);
	//console.log("ArraySize : "+array_size);

	if(array_size)
	{
		var valueType = fread(blob, "Int8", 1, offset);
		//console.log("ArrayValueType : "+valueType);
		if(getType(valueType) == "ByteArray")
		{
			//console.log(offset.Offset);
			var value = {IsArray: true, ArrayLength: array_size, Data: fread(blob, "ByteArray", size-5, offset)};
			//console.log(offset.Offset);
			return value;
		}
		else
			return createArray(blob, array_size, offset, valueType);
	}
	return null;
}

function readKeySize(blob, size, offset){
	var keySize = new Array();
	for(var i = 0; i < size; ++i)
	{
		keySize[i] = fread(blob, "Uint8", 1, offset);
	}
	return keySize;
}

function readValueType(blob, size, offset){
	var valueType = new Array();
	for(var i = 0; i < size; ++i)
	{
		valueType[i] = fread(blob, "Uint8", 1, offset);
	}
	return valueType;
}

function readValueSize(blob, size, offset){
	var valueSize = new Array();
	for(var i = 0; i < size; ++i)
	{
		valueSize[i] = fread(blob, "Uint", 1, offset);
	}
	return valueSize;
}

function createMap(blob, size, offset, keySizeArray, valueTypeArray, valueSizeArray){
	var key = new Array();
	var value = new Array();
	var map = new Map();
	for(var i = 0; i < size; ++i)
	{
		key[i] = fread(blob, "String", keySizeArray[i], offset);

		if(valueSizeArray[i] == 0) //valueSizeArray is zero Exception.
			continue;

		if(getType(valueTypeArray[i]) == "Map")
		{
			value[i] = readMap(blob, offset);
		}
		else if(getType(valueTypeArray[i]) == "List")
		{
			value[i] = readList(blob, offset);
		}
		else if(getType(valueTypeArray[i]) == "Array")
		{
			value[i] = readArray(blob, offset, valueSizeArray[i]);
		}
		else
		{
			value[i] = fread(blob, getType(valueTypeArray[i]), valueSizeArray[i], offset);
		}
		map.set(key[i], value[i]);
	}
	return map;
}

function createList(blob, size, offset, valueType, valueSizeArray){
	var value = new Array();
	var Type = getType(valueType);
	for(var i = 0; i < size; ++i)
	{
		if(valueSizeArray[i] == 0) //valueSizeArray is zero Exception.
			continue;

		if(Type == "List")
		{
			value[i] = readList(blob, offset);
		}
		else if(Type == "Array")
		{
			value[i] = readArray(blob, offset, valueSizeArray[i]);
		}
		else if(Type == "Map")
		{
			value[i] = readMap(blob, offset);
		}
		else
		{
			value[i] = fread(blob, Type, 1, offset);
		}
	}
	return value;
}

function createArray(blob, size, offset, valueType){
	var value = new Array();
	var Type = getType(valueType);
	for(var i = 0; i < size; ++i)
	{
		value[i] = fread(blob, Type, 1, offset);
	}
	return value;
}