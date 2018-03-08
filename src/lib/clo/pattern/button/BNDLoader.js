function readBND(blob, offset){

	return readMap(blob, offset);
	
}

function readFAB(blob, offset){

	var ret_value = {version: 0, name: '', bIsBackFaceMaterial: false, bIsSideFaceMaterial: false, bDoubleSidedRendering: false, bFixedAspectRatio: false,  Colorway: null, FabricPhysical: {}};

	var fabVersion = fread(blob, "Uint", 1, offset);
	ret_value.version = fabVersion;

	ret_value.name = freadString(blob, offset);

	if(fabVersion >= 4)
	{
		ret_value.bIsBackFaceMaterial = fread(blob, "Bool", 1, offset);
		ret_value.bIsSideFaceMaterial = fread(blob, "Bool", 1, offset);
	}
	else if(fabVersion >= 3)
	{
		ret_value.bDoubleSidedRendering = fread(blob, "Bool", 1, offset);
	}
	else
	{
		ret_value.bFixedAspectRatio = fread(blob, "Bool", 1, offset);
	}

	ret_value.Colorway = readColorwayList(blob, offset, fabVersion);

	return ret_value;

}

function readColorwayList(blob, offset, ver){

	var ret_value = {List: [], uFabIndex: 0, uFabCount: 1};

	if(ver >= 8)
	{
		if(ver < 10)
		{
			ret_value.uFabCount = fread(blob, "Uint", 1, offset);
			ret_value.uFabIndex = fread(blob, "Uint", 1, offset);
		}
		else
		{
			ret_value.uFabIndex = fread(blob, "Uint", 1, offset);
			ret_value.uFabCount = fread(blob, "Uint", 1, offset);
		}
	}

	for(var i = 0 ; i < ret_value.uFabCount ; ++i)
		ret_value.List.push(readFaceMaterial(blob, offset, ver));

	return ret_value;

}

function readFaceMaterial(blob, offset, ver){

	var ret_value = {FaceMaterial: []};

	for(var i = 0 ; i < 1 ; ++i)
	{
		var fm = {fTextureAngle: 0.0, vTextureSize: null, bFixedAspectRatio: false, Material: null};
		if(ver >= 3)
		{
			if(ver < 6)
			{
				fm.fTextureAngle = fread(blob, "Float", 1, offset);
				fm.vTextureSize = readVector2(blob, offset);
			}
			fm.bFixedAspectRatio = fread(blob, "Bool", 1, offset);
		}
		fm.Material = readMaterial(blob, offset, ver);
		ret_value.FaceMaterial.push(fm);
	}

	return ret_value;
}

function readMaterial(blob, offset, ver){

	var ret_value = {
		Ambient: null, AmbientBack: null, 
		Diffuse: null, DiffuseBack: null, 
		Specular: null, SpecularBack: null, 
		Emission: null, EmissionBack: null, 
		fShininess: 0.0, fShininessBack: 0.0, 
		uBlendFuncSrc: 0, uBlendFuncDst: 0,
		BlendColor: null, uOpaqueMode: 0,
		BaseColor: null,
		fAmbientIntensity: 0.0, fDiffuseIntensity: 0.0,
		Texture: [],
		fDesaturate: 0.0,
		iNormalIntensity: 0,  iShadowIntensity: 0,
		iShodowGrey: 0, fHasBump: 0.0
	};

	ret_value.Ambient = readVector4(blob, offset);
	ret_value.AmbientBack = readVector4(blob, offset);
	ret_value.Diffuse = readVector4(blob, offset);
	ret_value.DiffuseBack = readVector4(blob, offset);
	ret_value.Specular = readVector4(blob, offset);
	ret_value.SpecularBack = readVector4(blob, offset);
	ret_value.Emission = readVector4(blob, offset);
	ret_value.EmissionBack = readVector4(blob, offset);
	ret_value.Shininess = fread(blob, "Float", 1, offset);
	ret_value.ShininessBack = fread(blob, "Float", 1, offset);
	ret_value.uBlendFuncSrc = fread(blob, "Uint", 1, offset);
	ret_value.uBlendFuncDst = fread(blob, "Uint", 1, offset);
	ret_value.BlendColor = readVector4(blob, offset);
	ret_value.uOpaqueMode = fread(blob, "Uint", 1, offset);

	ret_value.BaseColor = readVector3(blob, offset);
	ret_value.fAmbientIntensity = fread(blob, "Float", 1, offset);
	ret_value.fDiffuseIntensity = fread(blob, "Float", 1, offset);

	var tempColor = fread(blob, "Float", 1, offset);

	var texCount = fread(blob, "Uint", 1, offset);

	for(var i = 0 ; i < texCount ; ++i)
	{
		ret_value.Texture.push(readTexture(blob, offset, ver));
	}

	ret_value.fDesaturate = fread(blob, "Float", 1, offset);
	ret_value.iNormalIntensity = fread(blob, "Int", 1, offset);
	ret_value.iShadowIntensity = fread(blob, "Int", 1, offset);
	ret_value.iShodowGrey = fread(blob, "Int", 1, offset);
	ret_value.fHasBump = fread(blob, "Float", 1, offset);

	return ret_value;

}

function readTexture(blob, offset, ver){

	ret_value = {
		Path: null, uType: 0, 
		uWrapS: 0, uWrapT: 0,
		uMinFilter: 0, uMagFilter: 0,
		BorderColor: null, Translation: null,
		Size: null, fAngle: 0.0
	};

	ret_value.Path = freadString(blob, offset);
	ret_value.uType = fread(blob, "Uint", 1, offset);
	ret_value.uWrapS = fread(blob, "Uint", 1, offset);
	ret_value.uWrapT = fread(blob, "Uint", 1, offset);
	ret_value.uMinFilter = fread(blob, "Uint", 1, offset);
	ret_value.uMagFilter = fread(blob, "Uint", 1, offset);
	ret_value.BorderColor = readVector4(blob, offset);
	ret_value.Translation = readVector2(blob, offset);
	ret_value.Size = readVector2(blob, offset);
	ret_value.fAngle = fread(blob, "Float", 1, offset);

	return ret_value;

}