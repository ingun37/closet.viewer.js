import { readString } from '@/lib/clo/file/FileStrReader'
import { readMatrix3, readMatrix4, readVector2, readVector3, readVector4 } from '@/lib/clo/file/FileUDCReader'
/*argument 'size' used read String and ByteArray*/


let value = ''

export function fread(blob, type, size, offset){
	switch(type)
	{
		case "Bool":
			value = blob.getInt8(offset.Offset, true);
			offset.Offset+=1;
			break;
		case "Char":
			value = String.fromCharCode(blob.getInt8(offset.Offset, true));
			offset.Offset+=1;
			break;
		case "Uchar":
			value = String.fromCharCode(blob.getUint8(offset.Offset, true));
			offset.Offset+=1;
			break;
		case "Uint8":
			value = blob.getUint8(offset.Offset, true);
			offset.Offset+=1;
			break;
		case "Uint":
			value = blob.getUint32(offset.Offset, true);
			offset.Offset+=4;
			break;
		case "Int8":
			value = blob.getInt8(offset.Offset, true);
			offset.Offset+=1;
			break;
		case "Int":
		case "Int32":
			value = blob.getInt32(offset.Offset, true);
			offset.Offset+=4;
			break;
		case "Int64":
			//Not Use.
			value = blob.getInt32(offset.Offset, true);
			value = blob.getInt32(offset.Offset, true);
			offset.Offset+=8;
			break;
		case "Float":
			value = blob.getFloat32(offset.Offset, true);
			offset.Offset+=4;
			break;
		case "Double":
			value = blob.getFloat64(offset.Offset, true);
			offset.Offset+=8;
			break;
		case "String":
			value = readString(blob, size, offset);
			break;
		case "Vec2":
			value = readVector2(blob, offset);
			break;
		case "Vec3":
			value = readVector3(blob, offset);
			break;
		case "Vec4":
			value = readVector4(blob, offset);
			break;
		case "Mat3":
			value = readMatrix3(blob, offset);
			break;
		case "Mat4":
			value = readMatrix4(blob, offset);
			break;
		case "ByteArray":
			//@ [Caution]
			//@ Need conversion DataView to built-in type array or user define type array.
			//@ refer function convertByteArray(byteArray)
			value = new DataView(blob.buffer, offset.Offset, size);
			offset.Offset+=size;
			//value = readString(blob, size, offset);
			break;
		case "Undefined":
			//alert("#error[fread: input undefined type]");
			console.log("#error[fread: input undefined type]");
			value = 0;
	}
	

	return value;
}
