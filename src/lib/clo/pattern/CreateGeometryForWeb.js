//Get PatternGeometry Information from map...
function createPatternGeometryListForWeb(map){
	if(!map instanceof Map)
	{
		//console.log("[function::createPatternGeometryList(map)] argument 'map' is not instanceof Map");
		return null;
	}
	var ret_array = {Patterns: [], Pipings: [], Buttons: new Map()};

	var pattern_list = map.get("listPattern");
	//console.log("Pattern Count : "+pattern_list.length);

	if(pattern_list)
	{
		for(var i = 0; i < pattern_list.length; ++i)
		{
			var patternIter = pattern_list[i];
			if(patternIter)
			{
				// Normal Pattern.
				var pattern_geometry = {
					Vertex: [], 
					Index: [], 
					TexCoord: [], 
					FabricIndex: 0, 
					GrainlineTranslation: [], 
					GrainlineAngle: [], 
					PrintTextureList: [], 
					ButtonHoleList: [], 
					Transform2DMatrix: null,
					DecorStitchList: null
				};
				
				pattern_geometry.Vertex = readByteArray("Vec3", patternIter.get("baPosition3D"));
				pattern_geometry.Index = readByteArray("Uint", patternIter.get("baTri"));
				pattern_geometry.TexCoord = readByteArray("Vec2", patternIter.get("baTex"));
				pattern_geometry.FabricIndex = patternIter.get("iFabricIndex");
				pattern_geometry.Transform2DMatrix = patternIter.get("m3Matrix");

				var gli = patternIter.get("listGrainLineInfo");
				for(var j = 0 ; j < gli.length ; ++j)
				{
					pattern_geometry.GrainlineTranslation.push(gli[j].get("v2Translation"));
					//console.log(gli[j].get("v2Translation"));
					pattern_geometry.GrainlineAngle.push(gli[j].get("fAngle"));
					//console.log(gli[j].get("fAngle"));
				}

				// Create Print Texture Information.
				var _PrintTextureList = patternIter.get("listPrintTexture");
				//console.log(_PrintTextureList);
				if(_PrintTextureList)
				{
					for(var j = 0 ; j < _PrintTextureList.length ; ++j)
					{
						pattern_geometry.PrintTextureList.push( createGraphicForWeb( pattern_geometry, _PrintTextureList[j] ) );
					}
				}

				var _ButtonHoleList = patternIter.get("listButtonHole");
				//console.log(_ButtonHoleList)
				if(_ButtonHoleList)
				{
					for(var j = 0 ; j < _ButtonHoleList.length ; ++j)
					{
						pattern_geometry.ButtonHoleList.push( createButtonHoleForWeb( pattern_geometry, _ButtonHoleList[j] ) );
					}
				}
				
				// Stitch
				//var _DecorStitchList = patternIter.get("mapShape2D").get("listDecorStitch");
				//var _TopStitchStylePropertyList = map.get("listTopStitchStyleProperty");
				//if(_DecorStitchList)
				//{
					//pattern_geometry.DecorStitchList = DoSomething(pattern_geometry, _DecorStitchList, _TopStitchStylePropertyList);
				//}

				// Puckering
				
				ret_array.Patterns.push({Type: 0, Data: pattern_geometry});
			}
		}
	}


	// Piping
	var piping_list = map.get("listPiping");

	if(piping_list)
	{
		for(var i = 0 ; i < piping_list.length ; ++i)
		{
			var pipingIter = piping_list[i];
			if(pipingIter)
			{
				// Piping Pattern
				var piping_geometry = {Vertex: [], Index: [], TexCoord: [], FabricIndex: 0, GrainlineTranslation: [], GrainlineAngle: []};
				piping_geometry.Vertex = readByteArray("Vec3", pipingIter.get("baPosition3D"));
				piping_geometry.Index = readByteArray("Uint", pipingIter.get("baTri"));
				piping_geometry.TexCoord = readByteArray("Vec2", pipingIter.get("baTex"));
				piping_geometry.FabricIndex = pipingIter.get("iFabricIndex");

				var grainLineList = pipingIter.get("listGrainLineInfo");
				for(var j = 0 ; j < grainLineList.length ; ++j)
				{
					piping_geometry.GrainlineTranslation.push(grainLineList[j].get("v2Translation"));
					piping_geometry.GrainlineAngle.push(grainLineList[j].get("fAngle"));
				}

				ret_array.Pipings.push({Type: 1, Data: piping_geometry});
			}
			
		}
	}

	// Button Head
	var buttonhead_list = map.get("listButtonHead");

	if(buttonhead_list)
	{
		for(var i = 0 ; i < buttonhead_list.length ; ++i)
		{
			var buttonIter = buttonhead_list[i];
			if(buttonIter)
			{
				var button_geometry = {StyleIndex: 0, Mesh: null};

				var button_mesh = new THREE.Mesh(undefined, undefined);
				button_mesh.name = "3D_Pattern";
				//var button_mesh  = createMaterialEdgeCube(1.0, mat);

				var index = buttonIter.get("uiButtonHeadStyleIndex");
				var key = index.toString();
				button_geometry.StyleIndex = index;
				
				var matrix = buttonIter.get("m4OffsetMatrix");
				var offset = convertToMatrix4(matrix);
				
				button_mesh.matrix.identity();
				button_mesh.applyMatrix(offset);

				button_geometry.Mesh = button_mesh;

				if(ret_array.Buttons.get(index.toString()) instanceof Array === false)
					ret_array.Buttons.set(index.toString(), new Array());

				ret_array.Buttons.get(key).push({Type: 2, Data: button_geometry});
			}
			
		}
	}
	
			
	return ret_array;
}

function createGraphicForWeb(geometry, map) {

	//console.log(map);
	var ret = {IsButton: false, Vertex: [], Index: [], TexCoord: [], Materials: []};

	var trianglePointArray = readByteArrayFromArrayBuffer("None", map.get("arrTrianglePoint"));

	var length = map.get("arrTrianglePoint").ArrayLength;


	for(var k = 0 ; k < length ; ++k)
	{
		var alpha = trianglePointArray[k].Alpha;
		var beta = trianglePointArray[k].Beta;
		var gamma = trianglePointArray[k].Gamma;

		var position3D_Index0 = geometry.Vertex[trianglePointArray[k].PtIndex[0]];
		var position3D_Index1 = geometry.Vertex[trianglePointArray[k].PtIndex[1]];
		var position3D_Index2 = geometry.Vertex[trianglePointArray[k].PtIndex[2]];

		var VertexPosition = {x: alpha * position3D_Index0.x + beta * position3D_Index1.x + gamma * position3D_Index2.x,
							  y: alpha * position3D_Index0.y + beta * position3D_Index1.y + gamma * position3D_Index2.y,
							  z: alpha * position3D_Index0.z + beta * position3D_Index1.z + gamma * position3D_Index2.z};

		ret.Vertex.push(VertexPosition);
	}

	ret.Index = readByteArray("Uint", map.get("baTri"));
	ret.TexCoord = map.get("arrTex");

	var colorwayList = map.get("listColorwayInfo");

	for(var l = 0 ; l < colorwayList.length ; ++l)
	{
		var materialInformation = {
			TexName: "", 
			TexSize: {x: 0.0, y: 0.0}, 
			TexTranslation: {x: 0.0, y: 0.0}, 
			TexAngle: 0.0, 
			TexSignedAngle: 0.0,
			Diffuse: {x: 0.0, y: 0.0, z: 0.0}, 
			Ambient: {x: 0.0, y: 0.0, z: 0.0}, 
			Specular: {x: 0.0, y: 0.0, z: 0.0}, 
			Emission: {x: 0.0, y: 0.0, z: 0.0}, 
			BaseColor: {x: 0.0, y: 0.0, z: 0.0},
			Alpha: 0.0,
			Shininess: 0.0,
			Desaturated: 0.0
		};

		materialInformation.Diffuse = colorwayList[l].get("v3Diffuse");
		materialInformation.Ambient = colorwayList[l].get("v3Ambient");
		materialInformation.Specular = colorwayList[l].get("v3Specular");
		materialInformation.Emission = colorwayList[l].get("v3Emission");
		materialInformation.BaseColor = colorwayList[l].get("v3BaseColor");
		materialInformation.Alpha = colorwayList[l].get("fAlpha");
		materialInformation.Shininess = colorwayList[l].get("fShininess");
		materialInformation.Desaturated = colorwayList[l].get("fDesaturated");

		materialInformation.TexSize = colorwayList[l].get("v2Size");
		materialInformation.TexSignedAngle = colorwayList[l].get("fSignedAngle");

		var grainlineInfo = map.get("listGrainLineInfo");
		materialInformation.TexTranslation = grainlineInfo[l].get("v2Translation");
		materialInformation.TexAngle = grainlineInfo[l].get("fAngle");

		var texturePath = readByteArray("String", colorwayList[l].get("qsFileName"));

		materialInformation.TexName = texturePath;

		ret.Materials.push(materialInformation);
	}

	return ret;
}

function createButtonHoleForWeb(geometry, map) {

	var ret = {IsButton: true, Vertex: [], Index: [], TexCoord: [], StyleIndex: 0, GrainlineInfo: {R: null, T: null}};

	var rotation = map.get("listGrainLineInfo")[0].get("fAngle");
	var grotMatrix = new THREE.Matrix4();
    grotMatrix.identity();
    grotMatrix.makeRotationZ(-rotation);

	var translation = map.get("listGrainLineInfo")[0].get("v2Translation");
    var gtransMatrix = new THREE.Matrix4();
    gtransMatrix.identity();
    gtransMatrix.makeTranslation(-translation.x, -translation.y, 0.0);
	//console.log(ptMap.get("mapFabricShape2D").get("listGrainLineInfo")[0]);

	var trianglePointArray = readByteArrayFromArrayBuffer("None", map.get("arrTrianglePoint"));
	var length = map.get("arrTrianglePoint").ArrayLength;

	for(var k = 0 ; k < length ; ++k)
	{
		var alpha = trianglePointArray[k].Alpha;
		var beta = trianglePointArray[k].Beta;
		var gamma = trianglePointArray[k].Gamma;

		var position3D_Index0 = geometry.Vertex[trianglePointArray[k].PtIndex[0]];
		var position3D_Index1 = geometry.Vertex[trianglePointArray[k].PtIndex[1]];
		var position3D_Index2 = geometry.Vertex[trianglePointArray[k].PtIndex[2]];

		var VertexPosition = {x: alpha * position3D_Index0.x + beta * position3D_Index1.x + gamma * position3D_Index2.x,
							  y: alpha * position3D_Index0.y + beta * position3D_Index1.y + gamma * position3D_Index2.y,
							  z: alpha * position3D_Index0.z + beta * position3D_Index1.z + gamma * position3D_Index2.z};

		ret.Vertex.push(VertexPosition);
	}
	//console.log(ret.Vertex);
	ret.Index = readByteArray("Uint", map.get("baTri"));
	//console.log(ret.Index);
	ret.TexCoord = map.get("arrTex");
	//console.log(ret.TexCoord);

	ret.StyleIndex = map.get("uiButtonHoleStyleIndex");

	ret.GrainlineInfo.R = grotMatrix;

	ret.GrainlineInfo.T = gtransMatrix;

	return ret;
}
