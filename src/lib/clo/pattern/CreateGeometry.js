//Get PatternGeometry Information from map...
function createPatternGeometryList(map){
	if(!map instanceof Map)
	{
		//console.log("[function::createPatternGeometryList(map)] argument 'map' is not instanceof Map");
		return null;
	}
	var ret_array = {Patterns: [], Pipings: [], Buttons: new Map()};

	var pattern_list = map.get("mapPatternEditor").get("mapPatternList").get("listPattern");
	//console.log("Pattern Count : "+pattern_list.length);

	for(var i = 0; i < pattern_list.length; ++i)
	{
		var pattern = pattern_list[i];
		var patternType = pattern.get("uiPatternType");

		switch(patternType)
		{
		case 0:
		// Normal Pattern.
			var pattern_geometry = {
				Name: "", 
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
			
			pattern_geometry.Name = readByteArray("String", pattern.get("mapElement").get("qsName"));
			pattern_geometry.Vertex = readByteArray("Vec3", pattern.get("baPosition3D"));
			pattern_geometry.Index = readByteArray("Uint", pattern.get("mapFabricShape2D").get("mapMesh2D").get("baTri"));
			pattern_geometry.TexCoord = readByteArray("Vec2", pattern.get("mapFabricShape2D").get("mapMesh2D").get("baTex"));
			pattern_geometry.FabricIndex = pattern.get("mapFabricShape2D").get("iFabricIndex");
			pattern_geometry.Transform2DMatrix = pattern.get("mapShape2D").get("mapTransformer2D").get("m3Matrix");

			var gli = pattern.get("mapFabricShape2D").get("listGrainLineInfo");
			for(var j = 0 ; j < gli.length ; ++j)
			{
				pattern_geometry.GrainlineTranslation.push(gli[j].get("v2Translation"));
				//console.log(gli[j].get("v2Translation"));
				pattern_geometry.GrainlineAngle.push(gli[j].get("fAngle"));
				//console.log(gli[j].get("fAngle"));
			}

			// Create Print Texture Information.
			var _PrintTextureList = pattern.get("listPrintTexture");
			//console.log(_PrintTextureList);
			if(_PrintTextureList)
			{
				for(var j = 0 ; j < _PrintTextureList.length ; ++j)
				{
					var bButtonHole = _PrintTextureList[j].get("bButtonHole");
					if(bButtonHole) {
						pattern_geometry.ButtonHoleList.push(createButtonHole( pattern_geometry, _PrintTextureList[j] ) );
					} else {
						pattern_geometry.PrintTextureList.push(createGraphic( pattern_geometry, _PrintTextureList[j] ) );
					}

				}
			}


			// Stitch
			var _DecorStitchList = pattern.get("mapShape2D").get("listDecorStitch");
			var _TopStitchStylePropertyList = map.get("listTopStitchStyleProperty");
			if(_DecorStitchList)
			{
				//pattern_geometry.DecorStitchList = DoSomething(pattern_geometry, _DecorStitchList, _TopStitchStylePropertyList);
			}

			// Puckering
			
			ret_array.Patterns.push({Type: patternType, Data: pattern_geometry});
			break;
		case 1:
		// Curved Pattern
			break;
		case 2:
		// Piping Pattern
		var piping_geometry = {Name: "", Vertex: [], Index: [], TexCoord: [], FabricIndex: 0, GrainlineTranslation: {x: 0.0, y: 0.0}, GrainlineAngle: 0.0};
			piping_geometry.Name = readByteArray("String", pattern.get("mapElement").get("qsName"));
			piping_geometry.Vertex = readByteArray("Vec3", pattern.get("baPosition3D"));
			piping_geometry.Index = readByteArray("Uint", pattern.get("mapFabricShape2D").get("mapMesh2D").get("baTri"));
			piping_geometry.TexCoord = readByteArray("Vec2", pattern.get("mapFabricShape2D").get("mapMesh2D").get("baTex"));
			piping_geometry.FabricIndex = pattern.get("mapFabricShape2D").get("iFabricIndex");

			piping_geometry.GrainlineTranslation = pattern.get("mapFabricShape2D").get("listGrainLineInfo")[0].get("v2Translation");
			piping_geometry.GrainlineAngle = pattern.get("mapFabricShape2D").get("listGrainLineInfo")[0].get("fAngle");

			ret_array.Pipings.push({Type: patternType, Data: piping_geometry});
			break;
		case 3:
		// Button Head
			var button_geometry = {StyleIndex: 0, Mesh: null};

			var button_mesh = new THREE.Mesh(undefined, undefined);
			button_mesh.name = "3D_Pattern";
			//var button_mesh  = createMaterialEdgeCube(1.0, mat);

			var index = pattern.get("uiButtonHeadStyleIndex");
			var key = index.toString();
			button_geometry.StyleIndex = index;
			
			var matrix = pattern.get("m4OffsetMatrix");
			var offset = new THREE.Matrix4();
			offset.set(matrix.a00, matrix.a01, matrix.a02, matrix.a03, 
					   matrix.a10, matrix.a11, matrix.a12, matrix.a13, 
					   matrix.a20, matrix.a21, matrix.a22, matrix.a23, 
					   matrix.a30, matrix.a31, matrix.a32, matrix.a33);
			
			button_mesh.matrix.identity();
			button_mesh.applyMatrix(offset);

			button_geometry.Mesh = button_mesh;

			if(ret_array.Buttons.get(index.toString()) instanceof Array === false)
				ret_array.Buttons.set(index.toString(), new Array());

			ret_array.Buttons.get(key).push({Type: patternType, Data: button_geometry});
			break;
		default:
			//console.log("undefined pattern type");
		};
	}
	return ret_array;
}

function createGraphic(geometry, map) {

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

	ret.Index = readByteArray("Uint", map.get("mapFabricShape2D").get("mapMesh2D").get("baTri"));
	ret.TexCoord = map.get("arrTex");

	var colorwayList = map.get("mapFabricShape2D").get("mapFabric").get("mapColorwayInfo").get("listColorwayInfo");

	for(var l = 0 ; l < colorwayList.length ; ++l)
	{
		var Texture0 = colorwayList[l].get("listFaceMaterial")[0].get("listTexture")[0];
		var materialInformation = {
			TexName: "", 
			TexSize: {x: 0.0, y: 0.0}, 
			TexTranslation: {x: 0.0, y: 0.0}, 
			TexAngle: 0.0, 
			TexSignedAngle: 0.0,
			Diffuse: {x: 0.0, y: 0.0, z: 0.0, w: 0.0}, 
			Ambient: {x: 0.0, y: 0.0, z: 0.0, w: 0.0}, 
			Specular: {x: 0.0, y: 0.0, z: 0.0, w: 0.0}, 
			Emission: {x: 0.0, y: 0.0, z: 0.0, w: 0.0}, 
			BaseColor: {x: 0.0, y: 0.0, z: 0.0, w: 0.0},
			Shininess: 0.0,
			Desaturated: 0.0,
		};

		if(Texture0) {

			var texturePath = readByteArray("String", Texture0.get("qsFileName"));
			if(materialInformation.Desaturated === 1.0)
			{
				var array = texturePath.split('\\');
				texturePath = array[0] + "\\d_" + array[1];
			}
			materialInformation.TexName = name;
			materialInformation.TexSize = Texture0.get("v2Size");
			materialInformation.TexSignedAngle = Texture0.get("fSignedAngle");

		}
		var grainlineInfo = map.get("mapFabricShape2D").get("listGrainLineInfo")[l];
		materialInformation.TexTranslation = grainlineInfo.get("v2Translation");
		materialInformation.TexAngle = grainlineInfo.get("fAngle");

		materialInformation.Diffuse = colorwayList[l].get("listFaceMaterial")[0].get("v4Diffuse");
		materialInformation.Ambient = colorwayList[l].get("listFaceMaterial")[0].get("v4Ambient");
		materialInformation.Specular = colorwayList[l].get("listFaceMaterial")[0].get("v4Specular");
		materialInformation.Emission = colorwayList[l].get("listFaceMaterial")[0].get("v4Emission");
		materialInformation.Shininess = colorwayList[l].get("listFaceMaterial")[0].get("fShininess");
		materialInformation.Desaturated = colorwayList[l].get("listFaceMaterial")[0].get("fDesaturated");
		materialInformation.BaseColor = colorwayList[l].get("listFaceMaterial")[0].get("v3BaseColor");

		ret.Materials.push(materialInformation);
	}

	return ret;
}

function createButtonHole(geometry, map) {

	var ret = {IsButton: true, Vertex: [], Index: [], TexCoord: [], StyleIndex: 0, GrainlineInfo: {R: null, T: null}};

	var ptMap = map.get("mapPrintTexture");
	//console.log(map);

	var rotation = ptMap.get("mapFabricShape2D").get("listGrainLineInfo")[0].get("fAngle");
	var grotMatrix = new THREE.Matrix4();
    grotMatrix.identity();
    grotMatrix.makeRotationZ(-rotation);

	var translation = ptMap.get("mapFabricShape2D").get("listGrainLineInfo")[0].get("v2Translation");
    var gtransMatrix = new THREE.Matrix4();
    gtransMatrix.identity();
    gtransMatrix.makeTranslation(-translation.x, -translation.y, 0.0);
	//console.log(ptMap.get("mapFabricShape2D").get("listGrainLineInfo")[0]);

	var trianglePointArray = readByteArrayFromArrayBuffer("None", ptMap.get("arrTrianglePoint"));
	var length = ptMap.get("arrTrianglePoint").ArrayLength;

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
	ret.Index = readByteArray("Uint", ptMap.get("mapFabricShape2D").get("mapMesh2D").get("baTri"));
	//console.log(ret.Index);
	ret.TexCoord = ptMap.get("arrTex");
	//console.log(ret.TexCoord);

	ret.StyleIndex = map.get("uiButtonHeadStyleIndex");

	ret.GrainlineInfo.R = grotMatrix;

	ret.GrainlineInfo.T = gtransMatrix;

	return ret;
}
