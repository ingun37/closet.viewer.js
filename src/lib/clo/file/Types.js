const CLOType = {	
	Invalid: 0, 
	Bool: 1, 
	Char: 2,
	UChar: 3, 
	Int: 4, 
	UInt: 5, 
	Float: 6, 
	Double: 7, 
	String: 8, 
	WString: 9, 
	Vec2: 10, 
	Vec3: 11, 
	Vec4: 12, 
	Mat3: 13, 
	Mat4: 14, 
	ByteArray: 15, 
	List: 20, 
	Array: 21, 
	Map: 22
};

const PatternType = {
	Pattern: 0,
	CurvedPattern: 1,
	PipingPattern: 2,
	ButtonHead: 3
};

const SourceType = {
	NONE: 0,
	FLOAT: 1,
	VEC2: 2,
	VEC3: 3,
	VEC4: 4
}

export function getType(type){
	if(type == CLOType.Invalid)
		return "Invalid";
	else if(type == CLOType.Bool)
		return "Bool";
	else if(type == CLOType.Char)
		return "Char";
	else if(type == CLOType.UChar)
		return "UChar";
	else if(type == CLOType.Int)
		return "Int32";
	else if(type == CLOType.UInt)
		return "Uint";
	else if(type == CLOType.Float)
		return "Float";
	else if(type == CLOType.Double)
		return "Double";
	else if(type == CLOType.String)
		return "String";
	else if(type == CLOType.WString)
		return "Char";
	else if(type == CLOType.Vec2)
		return "Vec2";
	else if(type == CLOType.Vec3)
		return "Vec3";
	else if(type == CLOType.Vec4)
		return "Vec4";
	else if(type == CLOType.Mat3)
		return "Mat3";
	else if(type == CLOType.Mat4)
		return "Mat4";
	else if(type == CLOType.ByteArray)
		return "ByteArray";
	else if(type == CLOType.List)
		return "List";
	else if(type == CLOType.Array)
		return "Array";
	else if(type == CLOType.Map)
		return "Map";
	else
		return "Undefined";
}

function getPatternType(type){
	if(type == PatternType.Pattern)
		return "Pattern";
	else if(type == PatternType.CurvedPattern)
		return "CurvedPattern"
	else if(type == PatternType.PipingPattern)
		return "PipingPattern"
	else if(type == PatternType.ButtonHead)
		return "ButtonHead"
	else
		return "Undefined";
}

function getSourceType(type){
	if(type == SourceType.NONE)
		return "NONE";
	else if(type == SourceType.FLOAT)
		return "Float";
	else if(type == SourceType.VEC2)
		return "Vec2";
	else if(type == SourceType.VEC3)
		return "Vec3";
	else if(type == SourceType.VEC4)
		return "Vec4";
	else
		return "Undefined";
}

// WrapMode Conversion
function getWrapMode(wrapMode){
	var mode;
	switch(wrapMode)
	{
		case 10497://WrapMode::REPEAT
			mode = THREE.RepeatWrapping;
			break;
		case 33648://WrapMode::MIRRORED_REPEAT
			mode = THREE.MirroredRepeatWrapping;
			break;
		case 10496://WrapMode::CLAMP
			mode = THREE.ClampToEdgeWrapping;
			break;
		case 33069://WrapMode::CLAMP_TO_BORDER  ** Not Support in WebGL.
			console.log("CLAMP_TO_BORDER is not support in WebGL.");
			mode = THREE.ClampToEdgeWrapping;
			break;
		default:
			mode = THREE.RepeatWrapping;
	}
	return mode;
}

const ThickLineType = {
	REGULAR_THICKLINE: 0,	
	HEM_THICKLINE: 1,
	SEAM_ALLOWANCE_THICKLINE: 2,
	FREE_STITCH_THICKLINE: 3,
	SEAM_LINE_THICKLINE: 4, // added by Joshua(21 July 2014)
	SEAM_LINE_STITCH_THICKLINE: 5,
	GHOST_STITCH_THICKLINE: 6,
	FREE_STITCH_PUCKERING_THICKLINE: 7, // 외곽선 퍼커링 (30 Oct 2015 by Joshua)
	SEAM_LINE_PUCKERING_THICKLINE: 8, // 재봉선 퍼커링 (30 Oct 2015 by Joshua)
	SEAM_LINE_STITCH_PUCKERING_THICKLINE: 9, // 재봉선 스티치 퍼커링(reserved) (30 Oct 2015 by Joshua)};
	GHOST_PUCKERING_THICKLINE: 10, // 고스트 퍼커링 (8 Mar 2016 by Joshua),
	PICKING_GHOST_STITCH_THICKINE: 11,
	PICKING_GHOST_PUCKERING_THICKINE: 12,
};
