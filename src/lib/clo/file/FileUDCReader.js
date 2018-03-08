import { fread } from '@/lib/clo/file/FileTypeReader'

export function readVector2(blob, offset){ // List or Array Element Vector2
	var value = {x: 0.0, y: 0.0};
	value.x = fread(blob, "Float", 1, offset);
	value.y = fread(blob, "Float", 1, offset);

	//console.log(value);
	return value;
}

export function readVector3(blob, offset){
	var value = {x: 0.0, y: 0.0, z: 0.0};
	value.x = fread(blob, "Float", 1, offset);
	value.y = fread(blob, "Float", 1, offset);
	value.z = fread(blob, "Float", 1, offset);

	//console.log(value);
	return value;
}

export function readVector4(blob, offset){
	var value = {x: 0.0, y: 0.0, z: 0.0, w: 0.0};
	value.x = fread(blob, "Float", 1, offset);
	value.y = fread(blob, "Float", 1, offset);
	value.z = fread(blob, "Float", 1, offset);
	value.w = fread(blob, "Float", 1, offset);

	//console.log(value);
	return value;
}

export function readMatrix3(blob, offset){
	var value = {a00: 0.0, a10: 0.0, a20: 0.0,
			a01: 0.0, a11: 0.0, a21: 0.0,
			a02: 0.0, a12: 0.0, a22: 0.0};

	value.a00 = fread(blob, "Float", 1, offset);
	value.a10 = fread(blob, "Float", 1, offset);
	value.a20 = fread(blob, "Float", 1, offset);

	value.a01 = fread(blob, "Float", 1, offset);
	value.a11 = fread(blob, "Float", 1, offset);
	value.a21 = fread(blob, "Float", 1, offset);

	value.a02 = fread(blob, "Float", 1, offset);
	value.a12 = fread(blob, "Float", 1, offset);
	value.a22 = fread(blob, "Float", 1, offset);

	//console.log(value);
	return value;
}

export function readMatrix4(blob, offset){
	var value = {a00: 0.0, a10: 0.0, a20: 0.0, a30: 0.0,
			a01: 0.0, a11: 0.0, a21: 0.0, a31: 0.0,
			a02: 0.0, a12: 0.0, a22: 0.0, a32: 0.0,
			a03: 0.0, a13: 0.0, a23: 0.0, a33: 0.0,};

	value.a00 = fread(blob, "Float", 1, offset);
	value.a10 = fread(blob, "Float", 1, offset);
	value.a20 = fread(blob, "Float", 1, offset);
	value.a30 = fread(blob, "Float", 1, offset);

	value.a01 = fread(blob, "Float", 1, offset);
	value.a11 = fread(blob, "Float", 1, offset);
	value.a21 = fread(blob, "Float", 1, offset);
	value.a31 = fread(blob, "Float", 1, offset);

	value.a02 = fread(blob, "Float", 1, offset);
	value.a12 = fread(blob, "Float", 1, offset);
	value.a22 = fread(blob, "Float", 1, offset);
	value.a32 = fread(blob, "Float", 1, offset);

	value.a03 = fread(blob, "Float", 1, offset);
	value.a13 = fread(blob, "Float", 1, offset);
	value.a23 = fread(blob, "Float", 1, offset);
	value.a33 = fread(blob, "Float", 1, offset);

	//console.log(value);
	return value;
}
