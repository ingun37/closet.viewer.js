function PatternFactoryForWeb(map, zip){
	//console.log(map);

	_globalColorwaySize = map.get("uiCoordinationSize");
	//console.log(_globalColorwaySize);

	_initialColorwayIndex = map.get("uiCurrentCoordinationIndex");
	//console.log(_globalColorwayIndex);
	_globalCurrentColorwayIndex = _initialColorwayIndex;
	//console.log(_globalCurrentColorwayIndex);

	var GeometryList = createPatternGeometryListForWeb(map);
	//console.log(GeometryList);

	var PatternGeometryList = GeometryList.Patterns;
	//console.log(PatternGeometryList);

	var ButtonGeometryMap = GeometryList.Buttons;
	//console.log(ButtonGeometryMap);

	var PipingGeometryList = GeometryList.Pipings;
	//console.log(PipingGeometryList);

	var FabricList = createFabricListForWeb(map);
	//console.log(FabricList);

	var MaterialList = createMaterialListForWeb(zip, FabricList);
	//console.log(MaterialList);

	var ButtonObject3D = createButtonMeshList(zip, map.get("listButtonHeadStyle"), ButtonGeometryMap);
	//console.log(ButtonList);
	SafeAddSceneObject(ButtonObject3D, THREE.Object3D);

	var PipingObject3D = createPipingMeshList(PipingGeometryList, MaterialList);
	//console.log(PipingObject3D);
	SafeAddSceneObject(PipingObject3D, THREE.Object3D);	

	var container = new THREE.Object3D();
	//var container = [];

	for(var i = 0 ; i < PatternGeometryList.length ; ++i)
	{
		var type = PatternGeometryList[i].Type;
	    var stringType = getPatternType(type);

		var pattern = PatternGeometryList[i].Data;
	    var fabindex = pattern.FabricIndex;
	    var colorwayindex = _initialColorwayIndex;

	    //**Fabric Set**
		var fabric = FabricList[fabindex][colorwayindex];
	    var fmaterial = MaterialList[fabindex][colorwayindex];

	    //console.log(pattern.Name + "'s Fabric Index : "+ fabindex);
	    //console.log(pattern);

	    var texture = zip.file(fabric.TextureName);

	    var globalPatternValue = {_type: type, _isTexture: false, _fabricIndex: fabindex, _mesh: null, _rotate: [], _translate: []};

	    if(texture)
	    {
	    	//!** caution
    		//!** three.js : line 21956.
    		//albert
    		for(var j = 0 ; j < _globalColorwaySize ; ++j)
    		{
    			var gangle = THREE.Math.degToRad( pattern.GrainlineAngle[j] );
		    	var gtranslation = pattern.GrainlineTranslation[j];

		    	//var transformerMatrix = convertToMatrix3(pattern.Transform2DMatrix);
		    	//console.log(transformerMatrix);

		    	//var tempVector = new THREE.Vector2(gtranslation.x, gtranslation.y);
		    	//console.log(tempVector);
		    	//var patternInverseMatrix = getInverseMatrixFromPatternRotationAndTranslation(transformerMatrix);
		    	//console.log(patternInverseMatrix);

		    	//var grainlineTranslation = multiplyMatrix3AndVector2( patternInverseMatrix , multiplyMatrix3AndVector2(transformerMatrix , tempVector) );
		    	//console.log(grainlineTranslation);

		    	var grotMatrix = new THREE.Matrix4();
		    	var gtransMatrix = new THREE.Matrix4();

		    	grotMatrix.identity();
		    	grotMatrix.makeRotationZ( -gangle );

		    	gtransMatrix.identity();
		    	gtransMatrix.makeTranslation( -gtranslation.x, -gtranslation.y, 0.0 );
				//gtransMatrix.makeTranslation( -grainlineTranslation.x, -grainlineTranslation.y, 0.0 );

				globalPatternValue._rotate.push(grotMatrix);
				globalPatternValue._translate.push(gtransMatrix);

	    		//console.log(pattern.Name + "'s Grainline Angle : "+ pattern.GrainlineAngle[j]);
    		}
	    	
	    	//console.log(fmaterial.uniforms.texture0);
			var mesh = createPattern(pattern, fmaterial);
			fmaterial.uniforms.gRotMatrix.value = globalPatternValue._rotate[0];
			fmaterial.uniforms.gTransMatrix.value = globalPatternValue._translate[0];
			mesh.userData = {_rotation: globalPatternValue._rotate[0], _translation: globalPatternValue._translate[0]};

			//console.log(mesh);
			container.add(mesh);

			globalPatternValue._isTexture = true;
			globalPatternValue._mesh = mesh;
    	}
		else
		{
			// ** null texture
			//console.log("null texture");
			//var baseColor = fabric.BaseColor;
			//var fabColor = new THREE.Color(baseColor.x, baseColor.y, baseColor.z);
			//console.log(baseColor);
			//var material = new THREE.MeshPhongMaterial({color: fabColor.getHex(), side: THREE.DoubleSide, wireframe: drawMode.wireframe.pattern, transparent: true, opacity: 0.5});

			//var mesh = createPattern(pattern, material);

			var mesh = createPattern(pattern, fmaterial);
			mesh.userData = null;
			//console.log(mesh);
			container.add(mesh);

			globalPatternValue._isTexture = false;
			globalPatternValue._mesh = mesh;
		}
		_globalMeshInformation.pattern.push(globalPatternValue);

		// Make PrintTexture Mesh.
		createPrintTexture(zip, container, pattern.PrintTextureList);

		// Make Button Hole Mesh.

		var ButtonHoleObject3D = createButtonHoleMeshList(zip, map.get("listButtonHoleStyle"), pattern.ButtonHoleList);
		SafeAddSceneObject(ButtonHoleObject3D, THREE.Object3D);
		//container.add(ButtonHoleObject3D);
		//console.log(readByteArray("String", map.get("listButtonHoleStyle")[0].get("qsName")));

		// Make Stitch Mesh.
		//var StitchObject3D = createStitchMeshList(zip, map, pattern.DecorStitchList);
		//SafeAddSceneObject(StitchObject3D, THREE.Object3D);
	}
	container.name = "3D_Pattern";
	//console.log(container.children);
	return container;
}

function meshFactory(map, zip){

	var retObject = new THREE.Object3D();

	var colorways = map.get("mapColorWay");
	if(colorways === undefined)
	{
		//console.log("no colorways");
	}
	else
	{
		_globalCurrentColorwayIndex = colorways.get("uiCurrentCoordinationIndex");
		_globalColorwaySize = colorways.get("listColorway").length;
	}

	var listmaterials = map.get("listMaterials");
	//var materialMap = new Map();
	_globalMaterialInformationMap = new Map();
	//_globalMaterialInformationList = materialMap;

	if(listmaterials === undefined)
	{
		//console.log("no materials");
	}
	else
	{
		//console.log(materials.length);
		for(var i = 0 ; i < listmaterials.length ; ++i)
		{
			var value = {
				bpattern: false,
				materials: [],
				texcoords: [],
				texinfo: [],
			};

			var id = listmaterials[i].get("uiMatMeshID");
			//console.log(listmaterials[i].get("bPattern"));
			value.bpattern = listmaterials[i].get("bPattern");
			//console.log(value.bpattern);

			var listTexInfo = listmaterials[i].get("listTexInfo");
			if(listTexInfo !== undefined)
			{
				for(var j = 0 ; j < listTexInfo.length ; ++j)
				{
					var info = { 
						angle: 0.0,
						//scale: null,
						translate: {x: 0.0, y: 0.0}
					};

					//var rotMatrix = new THREE.Matrix4();
			    	//rotMatrix.identity();
			    	//rotMatrix.makeRotationZ( -THREE.Math.degToRad(listTexInfo[j].get("fAngle")) );

			    	//var transMatrix = new THREE.Matrix4();
			    	//transMatrix.identity();
			    	//transMatrix.makeTranslation( -listTexInfo[j].get("v2Trans").x, -listTexInfo[j].get("v2Trans").y, 0.0 );

			    	//var scaleMatrix = new THREE.Matrix4();
			    	//scaleMatrix.identity();

					info.angle = listTexInfo[j].get("fAngle");
					info.translate = listTexInfo[j].get("v2Trans");

					//console.log(info.angle);
					//console.log(info.translate);

					value.texinfo.push(info);
				}
			}

			var listMaterial = listmaterials[i].get("listMaterial");
			if(listMaterial !== undefined)
			{
				for(var j = 0 ; j < listMaterial.length ; ++j)
				{
					var material = {
						ambient: null,
						diffuse: null,
						specular: null,
						emission: null,
						shininess: 0.0,
						alpha: 0.0,

						ambientBack: null,
						diffuseBack: null,
						specularBack: null,
						emissionBack: null,
						shininessBack: 0.0,

						base: null,
						blendFuncSrc: 0,
						blendFuncDst: 0,
						blendColor: 0,

						opaqueMode: 0,
						ambientIntensity: 0.0,
						diffuseIntensity: 0.0,
						zero: 0.0,
						texture: []
					};
					material.ambient = new THREE.Vector3(listMaterial[j].get("v4Ambient").x, listMaterial[j].get("v4Ambient").y, listMaterial[j].get("v4Ambient").z);
					material.diffuse = new THREE.Vector3(listMaterial[j].get("v4Diffuse").x, listMaterial[j].get("v4Diffuse").y, listMaterial[j].get("v4Diffuse").z);
					material.specular = new THREE.Vector3(listMaterial[j].get("v4Specular").x, listMaterial[j].get("v4Specular").y, listMaterial[j].get("v4Specular").z);
					material.emission = new THREE.Vector3(listMaterial[j].get("v4Emission").x, listMaterial[j].get("v4Emission").y, listMaterial[j].get("v4Emission").z);
					material.shininess = listMaterial[j].get("fShininess");
					material.alpha = listMaterial[j].get("v4Diffuse").w;

					material.ambientBack = new THREE.Vector3(listMaterial[j].get("v4AmbientBack").x, listMaterial[j].get("v4AmbientBack").y, listMaterial[j].get("v4AmbientBack").z);
					material.diffuseBack = new THREE.Vector3(listMaterial[j].get("v4DiffuseBack").x, listMaterial[j].get("v4DiffuseBack").y, listMaterial[j].get("v4DiffuseBack").z);
					material.specularBack = new THREE.Vector3(listMaterial[j].get("v4SpecularBack").x, listMaterial[j].get("v4SpecularBack").y, listMaterial[j].get("v4SpecularBack").z);
					material.emissionBack = new THREE.Vector3(listMaterial[j].get("v4EmissionBack").x, listMaterial[j].get("v4EmissionBack").y, listMaterial[j].get("v4EmissionBack").z);
					material.shininessBack = listMaterial[j].get("fShininessBack");

					material.base = new THREE.Vector3(listMaterial[j].get("v3BaseColor").x, listMaterial[j].get("v3BaseColor").y, listMaterial[j].get("v3BaseColor").z);
					material.blendFuncSrc = listMaterial[j].get("uiBlendFuncSrc");
					material.blendFuncDst = listMaterial[j].get("uiBlendFuncDst");
					material.blendColor = new THREE.Vector3(listMaterial[j].get("v4BlendColor").x, listMaterial[j].get("v4BlendColor").y, listMaterial[j].get("v4BlendColor").z); 

					material.opaqueMode = listMaterial[j].get("enOpaqueMode");
					material.ambientIntensity = listMaterial[j].get("fAmbientIntensity");
					material.diffuseIntensity = listMaterial[j].get("fDiffuseIntensity");
					material.zero = listMaterial[j].get("fZero");

					var tex = listMaterial[j].get("listTexture");
					if(tex !== undefined && tex !== null)
					{
						for(var k = 0 ; k < tex.length ; ++k)
						{
							var textureProperty = {
								file: '',
								aifile: '',
								uniqfile: '',
								type: 0,
								wrapS: 0,
								wrapT: 0,
								minFilter: 0,
								magFilter: 0,
								borderColor: null,
								
								angle: 0.0,
								translate: {x: 0.0, y: 0.0},
								scale: {x: 0.0, y: 0.0}
								//translation: null,
								//scale: null,
								//rotation: null
							};

							//var rotMatrix = new THREE.Matrix4();
					    	//rotMatrix.identity();
					    	//rotMatrix.makeRotationZ( -THREE.Math.degToRad(tex[k].get("fSignedAngle")) );

					    	//var transMatrix = new THREE.Matrix4();
					    	//transMatrix.identity();
					    	//transMatrix.makeTranslation( tex[k].get("v2Translation").x, tex[k].get("v2Translation").y, 0.0 );

					    	//var scaleMatrix = new THREE.Matrix4();
					    	//scaleMatrix.identity();
					    	//scaleMatrix.makeScale( 1.0 / tex[k].get("v2Size").x, 1.0 / tex[k].get("v2Size").y, 1.0 );

							textureProperty.file = readByteArray("String", tex[k].get("qsFileName"));
							textureProperty.type = tex[k].get("enType");
							textureProperty.wrapS = tex[k].get("enWrapS");
							textureProperty.wrapT = tex[k].get("enWrapT");
							textureProperty.minFilter = tex[k].get("enMinFilter");
							textureProperty.magFilter = tex[k].get("enMagFilter");
							textureProperty.borderColor = new THREE.Vector4(tex[k].get("v4BorderColor").x, tex[k].get("v4BorderColor").y, tex[k].get("v4BorderColor").z, tex[k].get("v4BorderColor").w);

							//textureProperty.translation = transMatrix;
							//textureProperty.scale = scaleMatrix;
							//textureProperty.rotation = rotMatrix;

							textureProperty.angle = tex[k].get("fSignedAngle");
							textureProperty.translate = tex[k].get("v2Translation");
							textureProperty.scale = tex[k].get("v2Size");

							material.texture.push(textureProperty);
						}
					}

					value.materials.push(material);
				}
			}

			_globalMaterialInformationMap.set(id, value);
		}
	}

	var geometry = map.get("mapGeometry");
	if(geometry === undefined || geometry === null)
	{
		//console.log("geometry is null");
		return false;
	}

	var matMeshs = GetMatMeshs(geometry, zip);

	for(let k = 0; k<matMeshs.length; k++)
	{
		_globalMatMeshInformationList.push(matMeshs[k]);
		retObject.add(matMeshs[k]);
	}

	return retObject;
}

function makeMaterialForZrest(zip, property, index) {

	var texProperty = property.materials;
	//texIndex used like constant now, but this value must have other number(variable) when this viewer be applied multi-texturing render.
	var texIndex = 0;

	//index is one of texture list. this value only zero now.
	var material = new THREE.ShaderMaterial({
	uniforms: THREE.UniformsUtils.merge([
			THREE.UniformsLib['lights'],
			{
				TransformMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
				gRotMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
				gTransMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
				texture0: {type: 't', value: null},
				bUseTexture: {type: 'i', value: 1},

				materialAmbient: {type: "v3", value: texProperty[index].ambient},
				materialDiffuse: {type: "v3", value: texProperty[index].diffuse},
				materialSpecular: {type: "v3", value: texProperty[index].specular},
				materialEmission: {type: "v3", value: texProperty[index].emission},
				materialShininess: {type: 'f', value: texProperty[index].shininess},
				materialOpacity: {type: 'f', value: texProperty[index].alpha},
				materialDesaturated: {type: 'f', value: 0.0}
			}
		]),
		vertexShader: document.getElementById('vertexShader').textContent,
		fragmentShader: document.getElementById('fragmentShader').textContent,
		side: THREE.DoubleSide,
		wireframe: drawMode.wireframe.pattern,
		lights: true,
		polygonOffset: property.bpattern === 0,
		polygonOffsetFactor: -2.5,
		polygonOffsetUnits: -2.5,
		//blending: THREE.MultiplyBlending,
		//blendSrc: THREE.SrcAlphaFactor,
		//blendDst: THREE.oneMinusSrcAlphaFactor,
		//depthWrite: false,
		//depthTest: false,
		transparent: true
	});
	
	//var baseColor = texProperty[l].base;
	//console.log(baseColor);
	//var fabColor = new THREE.Color(baseColor.x, baseColor.y, baseColor.z);
	//var material = new THREE.MeshPhongMaterial({color: fabColor.getHex(), side: THREE.DoubleSide, wireframe: false});
	//@ Load Texture File.

	var onlyFileName = '';
	var bRenderTexture = true;

	if(texProperty[index].texture.length !== 0)
	{
		if(!zip.file(texProperty[index].texture[texIndex].file))
		{
			var temp = texProperty[index].texture[texIndex].file;
			
			var list = temp.split('/');
			onlyFileName = list[list.length - 1];
			
			if(!zip.file(onlyFileName))
			{
				// ** null texture ZpacReaderUtil.js -- Line 265 ???.
				material.uniforms.bUseTexture.value = 0;
				bRenderTexture = false;
			}
		}
	}
	else
	{
		//console.log("this don't use texture");
		material.uniforms.bUseTexture.value = 0;
		bRenderTexture = false;
	}

	if(bRenderTexture)
	{
		var arraybuffer = zip.file(onlyFileName).asArrayBuffer();
		var bytes = new Uint8Array(arraybuffer);
		var blob = new Blob([bytes.buffer]);

		readTextureFile({Blob: blob, Material: material}, function(result){
			//console.log(result);
		});

		var rotMatrix = new THREE.Matrix4();
    	rotMatrix.identity();
    	rotMatrix.makeRotationZ( -THREE.Math.degToRad(texProperty[index].texture[texIndex].angle) );

    	var transMatrix = new THREE.Matrix4();
    	transMatrix.identity();
    	transMatrix.makeTranslation( -texProperty[index].texture[texIndex].translate.x, texProperty[index].texture[texIndex].translate.y, 0.0 );

    	var scaleMatrix = new THREE.Matrix4();
    	scaleMatrix.identity();
    	scaleMatrix.makeScale( 1.0 / texProperty[index].texture[texIndex].scale.x, 1.0 / texProperty[index].texture[texIndex].scale.y, 1.0 );

		var transform = new THREE.Matrix4();
		transform.identity();
		transform.multiply(scaleMatrix);
		transform.multiply(rotMatrix);
		transform.multiply(transMatrix);

		material.uniforms.TransformMatrix.value = transform;
		if(property.texinfo.length > 0)
		{
			var grot = new THREE.Matrix4();
			grot.identity();
			grot.makeRotationZ( -THREE.Math.degToRad(property.texinfo[index].angle) );

			var gtra = new THREE.Matrix4();
			gtra.identity();
			gtra.makeTranslation( -property.texinfo[index].translate.x, -property.texinfo[index].translate.y, 0.0);

			material.uniforms.gRotMatrix.value = grot;
			material.uniforms.gTransMatrix.value = gtra;							
		}
	}
	return material;
}

function MakeMesh(zip, m4, list) {
	var FaceState = { 
		FACE_FRONT : 0, 
		FACE_BACK : 1, 
		FACE_SIDE : 2};

	var meshArray = new Array();

	for(var i = 0 ; i < list.length ; ++i)
	{
		// console.log('PatternCount : ' + i);
	
		var listMatMeshIDOnIndexedMesh = list[i].get("listMatMeshIDOnIndexedMesh");

		var mapShape = list[i].get("mapShape");
		if(mapShape === undefined || mapShape === null)
		{
			console.log("mapShape is null");
			return false;
		}

		var listIndexCount = mapShape.get("listIndexCount");
		if(listIndexCount === undefined || listIndexCount === null)
		{
			console.log("listIndexCount is null");
			return false;
		}

		// Draco Compression
		var dracoMeshFilename = readByteArray("String", mapShape.get("qsDracoFileName"));
		if(dracoMeshFilename === undefined || dracoMeshFilename === null)
		{
			console.log("cannot find dracoMesh");
			return false;
		}
		
		var drcArrayBuffer = zip.file(dracoMeshFilename).asArrayBuffer();

		const dracoLoader = new THREE.DRACOLoader();
		const bufferGeometry = dracoLoader.decodeDracoFile(drcArrayBuffer);

		// Split MatShape to MatMesh
		var indexOffset = 0;

		// console.log('totalVertexCount (x3) : ' + bufferGeometry.vertices.length);
		// console.log('totalTexCount (x2) : ' + bufferGeometry.uvs.length);
		// console.log('totalIndexCount : ' + bufferGeometry.indices.length);

		for(var m = 0; m < listIndexCount.length; ++m)
		{
			var meshGeometry = new THREE.Geometry();
	
			// Set Position for matMesh
			let faceInfo = FaceState.FACE_FRONT;

			if(listIndexCount.length === 3)
			{
				if(m == 0)  // side
					faceInfo = FaceState.FACE_SIDE;
				else if(m == 1) // front
					faceInfo = FaceState.FACE_BACK;
				else // back
					faceInfo = FaceState.FACE_FRONT;
			}

			var matMeshID = listMatMeshIDOnIndexedMesh[faceInfo].get("uiMatMeshID");
			var matProperty = _globalMaterialInformationMap.get(matMeshID);

			var indexSize = listIndexCount[faceInfo];
			

			for(var ind = 0; ind < indexSize; ++ind)
			{
				var index = bufferGeometry.indices[indexOffset + ind];

				var x = bufferGeometry.vertices[3 * index];
				var y = bufferGeometry.vertices[3 * index + 1];
				var z = bufferGeometry.vertices[3 * index + 2];

				var threePos = new THREE.Vector3(x, y, z);
				threePos.applyMatrix4(m4);

				meshGeometry.vertices.push(threePos);
			}

			// Set Indices
			for(var ind = 0; ind < indexSize/3; ++ind)
				meshGeometry.faces.push(new THREE.Face3(3*ind, 3*ind+1, 3*ind+2));
		
			// Set TexCoords - same as positionIndex
			for(var ind = 0; ind < indexSize/3; ++ind)
			{
				var texCoordArray = new Array(3);

				for(var k = 0; k < 3; k++)
				{
					var index = bufferGeometry.indices[indexOffset + 3 * ind + k];

					var x = bufferGeometry.uvs[2 * index];
					var y = bufferGeometry.uvs[2 * index + 1];

					texCoordArray[k] = new THREE.Vector2(x, y);
				}

				meshGeometry.faceVertexUvs[0].push( [texCoordArray[0], texCoordArray[1], texCoordArray[2]] );
			}

			meshGeometry.mergeVertices();
			meshGeometry.computeFaceNormals();
			meshGeometry.computeVertexNormals();

			var material = makeMaterialForZrest(zip, matProperty, _globalCurrentColorwayIndex);

			var threeMesh = new THREE.Mesh(meshGeometry, material);
			threeMesh.userData = matMeshID;

			meshArray.push(threeMesh);
	
			indexOffset = indexOffset + indexSize;
		}
	}

	return meshArray;
}

function GetMatMeshs(map, zip)
{
	var matMeshArray = new Array();

	if(map.get("listChildrenTransformer3D") !== undefined)
	{
		var listChildrenTransformer3D = map.get("listChildrenTransformer3D");

		if(listChildrenTransformer3D !== undefined && listChildrenTransformer3D !== null)
		{
			for(let i = 0; i < listChildrenTransformer3D.length; ++i)
			{
				var childTF3D = listChildrenTransformer3D[i];
				var newMatMeshs = GetMatMeshs(childTF3D, zip);

				// console.log(newMatMeshs);

				for(let j = 0; j<newMatMeshs.length; j++)
					matMeshArray.push(newMatMeshs[j]);
			}
		}
	}
	
	let mat4 = new THREE.Matrix4().identity();
	
	if(map.get("m4LtoW") !== undefined)
	{
		const m4LtoW = map.get("m4LtoW");
		
		mat4.set(m4LtoW.a00, m4LtoW.a01, m4LtoW.a02, m4LtoW.a03,
				m4LtoW.a10, m4LtoW.a11, m4LtoW.a12, m4LtoW.a13, 
				m4LtoW.a20, m4LtoW.a21, m4LtoW.a22, m4LtoW.a23, 
				m4LtoW.a30, m4LtoW.a31, m4LtoW.a32, m4LtoW.a33);
	}


	if(map.get("listMatShape") !== undefined)
	{
		var listMatShape = map.get("listMatShape");
		var meshArray = MakeMesh(zip, mat4, listMatShape);

		for(var k = 0; k<meshArray.length; k++)
			matMeshArray.push(meshArray[k]);
	}

	return matMeshArray;
}