function createPattern(geometry, material){
	if(geometry.Vertex.length==0)
	{
		console.log("Error : Geometry information is invalid.");
		return null;
	}
	var MeshGeometry = new THREE.Geometry();
	var ret_mesh;

	for(var i = 0 ; i < geometry.Vertex.length ; ++i)
	{
		MeshGeometry.vertices.push(new THREE.Vector3(geometry.Vertex[i].x, geometry.Vertex[i].y, geometry.Vertex[i].z));
	}

	for(var j = 0 ; j < geometry.Index.length / 3 ; ++j)
	{
		var Offset = 3 * j;
		MeshGeometry.faces.push(new THREE.Face3(geometry.Index[Offset + 0], geometry.Index[Offset + 1], geometry.Index[Offset + 2]));

		var a = geometry.TexCoord[geometry.Index[Offset + 0]];
		//console.log(a);
		var b = geometry.TexCoord[geometry.Index[Offset + 1]];
		//console.log(b);
		var c = geometry.TexCoord[geometry.Index[Offset + 2]];
		//console.log(c);

		var texCoord0 = new THREE.Vector2(a.x, a.y);
		var texCoord1 = new THREE.Vector2(b.x, b.y);
		var texCoord2 = new THREE.Vector2(c.x, c.y);

		MeshGeometry.faceVertexUvs[0].push([texCoord0, texCoord1, texCoord2]);
	}
	MeshGeometry.mergeVertices();
	MeshGeometry.computeFaceNormals();
	MeshGeometry.computeVertexNormals();
	MeshGeometry.computeBoundingSphere();

	ret_mesh = new THREE.Mesh(MeshGeometry, material);
	//ret_mesh.name = geometry.Name;
	//ret_mesh.position.y -= 1000;

	return ret_mesh;
}

function createButtonMeshList(zip, list, btnmap){

	if(list === null)
		return null;

	var ret_object3d = new THREE.Object3D();
	ret_object3d.name = "3D_Pattern";

	for(var i = 0 ; i < list.length ; ++i)
	{
		var local_mesh = new THREE.Mesh(undefined, undefined);
		local_mesh.name = "3D_Pattern";

		var fileName = readByteArray("String", list[i].get("qsName"));

		var arrayBuffer = zip.file(fileName).asArrayBuffer();
		var dataView = new DataView(arrayBuffer);

		//var headerOffset = {Offset: 0};
		//var header = readHeader(dataView, headerOffset);
		//console.log(header);

		var blob;
		try {

			blob = new Blob([dataView]);

		} catch (e) {
			// Old browser, need to use blob builder
			window.BlobBuilder = window.BlobBuilder ||
								 window.WebKitBlobBuilder ||
								 window.MozBlobBuilder ||
								 window.MSBlobBuilder;
			if(window.BlobBuilder) {
				var builder = new BlobBuilder();
				builder.append(arrayBuffer);
				blob = builder.getBlob();
			}
		}
		
		//blob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

		readBtnFile({Blob: blob, Mesh: local_mesh, ButtonList: btnmap.get(i.toString()), Index: i}, function(result){
			//console.log(result);
		});
	}

	btnmap.forEach(function(value, key, map){
		value.forEach(function(object){
			//console.log("btn style index : "+object.Data.StyleIndex);

		    object.Data.Mesh.userData = null;
		    _globalMeshInformation.button.push({_mesh: object.Data.Mesh, _styleindex: object.Data.StyleIndex});
			ret_object3d.add(object.Data.Mesh);
		});
	});

	return ret_object3d;

}

function createButtonHoleMeshList(zip, list, bthlist){

	if(list === null || bthlist === null)
		return null;

	var ret_object3d = new THREE.Object3D();
	ret_object3d.name = "3D_Pattern";

	for(var j = 0 ; j < bthlist.length ; ++j)
	{
		var geometry = bthlist[j];
		var styleindex = geometry.StyleIndex;
		//console.log(geometry);

		var material = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib['lights'],
				{
					TransformMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
					gRotMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
					gTransMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
					texture0: {type: 't', value: null},
					bUseTexture: {type: 'i', value: 1},

					materialAmbient: {type: "v3", value: new THREE.Vector3(0, 0, 0)},
					materialDiffuse: {type: "v3", value: new THREE.Vector3(0, 0, 0)},
					materialSpecular: {type: "v3", value: new THREE.Vector3(0, 0, 0)},
					materialOpacity: {type: 'f', value: 0.0}
				}
			]),
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.DoubleSide,
			wireframe: drawMode.wireframe.pattern,
			lights: true,
			polygonOffset: true,
			polygonOffsetFactor: -2.0,
			polygonOffsetUnits: -2.0,
			//blending: THREE.CustomBlending,
			//blendSrc: THREE.SrcAlphaFactor,
			//blendDst: THREE.OneMinusSrcAlphaFactor,
			transparent: true
		});


		var fileName = readByteArray("String", list[styleindex].get("qsName"));
		var arrayBuffer = zip.file(fileName).asArrayBuffer();
		var dataView = new DataView(arrayBuffer);

		//var headerOffset = {Offset: 0};
		//var header = readHeader(dataView, headerOffset);
		//console.log(header);

		var blob;
		try {
			blob = new Blob([dataView]);
		} catch (e) {
			// Old browser, need to use blob builder
			window.BlobBuilder = window.BlobBuilder ||
								 window.WebKitBlobBuilder ||
								 window.MozBlobBuilder ||
								 window.MSBlobBuilder;
			if(window.BlobBuilder) {
				var builder = new BlobBuilder();
				builder.append(arrayBuffer);
				blob = builder.getBlob();
			}
		}

		//blob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);


		readBthFile({Blob: blob, Material: material, Index: j}, function(result){
			//console.log(result);
		});
		//console.log(fileName);

		material.uniforms.gRotMatrix.value = geometry.GrainlineInfo.R;
		material.uniforms.gTransMatrix.value = geometry.GrainlineInfo.T;
		var mesh = createPattern(geometry, material);
		mesh.userData = null;
		mesh.name = "3D_Pattern";

		_globalMeshInformation.buttonhole.push({_mesh: mesh, _styleindex: styleindex});
		ret_object3d.add(mesh);
	}

	return ret_object3d;
}

function PatternFactory(map, zip){
	//console.log(map);

	_globalColorwaySize = map.get("mapColorWay").get("listColorway").length;
	//console.log(_globalColorwaySize);

	_initialColorwayIndex = map.get("mapColorWay").get("uiCurrentCoordinationIndex");
	_globalCurrentColorwayIndex = _initialColorwayIndex;
	//console.log(_initialColorwayIndex);

	var GeometryList = createPatternGeometryList(map);
	//console.log(GeometryList);

	var PatternGeometryList = GeometryList.Patterns;
	//console.log(PatternGeometryList);

	var ButtonGeometryMap = GeometryList.Buttons;
	//console.log(ButtonGeometryMap);

	var PipingGeometryList = GeometryList.Pipings;
	//console.log(PipingGeometryList);

	var FabricList = createFabricList(map);
	//console.log(FabricList);

	var MaterialList = createMaterialList(zip, FabricList);
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

function createPrintTexture(zip, container, list) { 
	for(var j = 0 ; j < list.length ; ++j)
	{
		var geometry = list[j];
		var graphicMaterialList = [];
		var globalGraphicValue = {_mesh: null};
		var material = null;
		//console.log(geometry);
		for( var k = 0 ; k < geometry.Materials.length ; ++k)
		{
			var graphicMaterial = geometry.Materials[k];

			var texname = graphicMaterial.TexName;

			//console.log(texname);
			texture = zip.file(texname);
			//console.log(pattern.PrintTextureList[j].TexName);
			if(texture)
			{
				var tscale = graphicMaterial.TexSize;
				var tangle = THREE.Math.degToRad(graphicMaterial.TexAngle);

				var gtranslation = graphicMaterial.TexTranslation;

				var gtransMatrix = new THREE.Matrix4();
				gtransMatrix.identity();
				gtransMatrix.makeTranslation( -gtranslation.x, -gtranslation.y, 0.0 );

				var tscalMatrix = new THREE.Matrix4();
				tscalMatrix.identity();
				tscalMatrix.makeScale( 1.0 / tscale.x, 1.0 / tscale.y, 1.0);

				var trotMatrix = new THREE.Matrix4();
				trotMatrix.identity();
				trotMatrix.makeRotationZ( -tangle );

				var transform = new THREE.Matrix4();

				transform.identity();
				transform.multiply(tscalMatrix);
				transform.multiply(trotMatrix);
				//transform.multiply(grainline_Translation);

				var Diffuse = graphicMaterial.Diffuse;
				var Ambient = graphicMaterial.Ambient;
				var Specular = graphicMaterial.Specular;
				var Emission = graphicMaterial.Emission;
				var Alpha = Diffuse.w;
				var Desaturated = graphicMaterial.Desaturated;

				//var material = new THREE.MeshLambertMaterial({map: texture, color: 0xff0000, polygonOffset: true, polygonOffsetFactor: -1.0, polygonOffsetUnits: -1.0, wireframe: false});
				material = new THREE.ShaderMaterial({
					uniforms: THREE.UniformsUtils.merge([
						THREE.UniformsLib['lights'],
						{
							TransformMatrix: {type: "m4", value: transform},
							gRotMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
							gTransMatrix: {type: "m4", value: gtransMatrix},
							texture0: {type: 't', value: null},
							bUseTexture: {type: 'i', value: 1},

							materialAmbient: {type: "v3", value: new THREE.Vector3(Ambient.x, Ambient.y, Ambient.z)},
							materialDiffuse: {type: "v3", value: new THREE.Vector3(Diffuse.x, Diffuse.y, Diffuse.z)},
							materialSpecular: {type: "v3", value: new THREE.Vector3(Specular.x, Specular.y, Specular.z)},
							materialEmission: {type: "v3", value: new THREE.Vector3(Emission.x, Emission.y, Emission.z)},
							materialOpacity: {type: 'f', value: 0.0},
							materialDesaturated: {type: 'f', value: Desaturated}
						}
					]),
					vertexShader: document.getElementById( 'vertexShader' ).textContent,
					fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
					side: THREE.DoubleSide,
					wireframe: drawMode.wireframe.pattern,
					lights: true,
					polygonOffset: true,
					polygonOffsetFactor: -1.0,
					polygonOffsetUnits: -1.0,
					//blending: THREE.CustomBlending,
					//blendSrc: THREE.SrcAlphaFactor,
					//blendDst: THREE.OneMinusSrcAlphaFactor,
					transparent: true
				});

				//@ Load Texture File.
				//if(!texname)
					//continue;
					
				if(!zip.file(texname))
				{
					var list = texname.split('\\');
					texname = list[list.length - 1];
				}

				var arraybuffer = zip.file(texname).asArrayBuffer();
				var bytes = new Uint8Array(arraybuffer);
				var blob = new Blob([bytes.buffer]);

				readTextureFile({Blob: blob, Material: material}, function(result){
					//console.log(result);
				});

				graphicMaterialList.push(material);
			}
			//else
			//{
				// never pass this block
				//console.log("null texture");
				//var baseColor = geometry.BaseColor;
				//var fabColor = new THREE.Color(baseColor.x, baseColor.y, baseColor.z);
				//console.log(baseColor);
				//var material = new THREE.MeshPhongMaterial({color: fabColor.getHex(), side: THREE.DoubleSide, wireframe: drawMode.wireframe.pattern});

				//var mesh = createPattern(geometry, material);
				//mesh.userData = null;
				//console.log(mesh);
				//container.add(mesh);
			//}
		}

		var mesh = createPattern(geometry, graphicMaterialList[_initialColorwayIndex]);
		mesh.userData = null;

		container.add(mesh);
		_globalMeshInformation.graphic.push(mesh);
		_globalMaterialInformation.graphic.push(graphicMaterialList);
	}
}


function createStitchMeshList(zip, map, stitchlist) {

	if(map === null || stitchlist === null)
		return null;

	var ret_object3d = new THREE.Object3D();
	ret_object3d.name = "3D_Pattern";

	for(var k = 0 ; k < stitchlist.length ; ++k)
	{
		var geometry = stitchlist[k];
		var styleindex = stitchlist[k].StitchIndex;
		
		//console.log(map.get("listTopStitchStyleProperty")[styleindex]);

		var stitchproperty = map.get("listTopStitchStyleProperty")[styleindex].get("mapMultiStitch").get("listStitch")[0];

		if(stitchproperty.get("mapMaterial2DList").get("listMaterial2D")[0].get("listFaceMaterial")[0].get("listTexture") === null)
			continue;
		
		var texpath = readByteArray("String", stitchproperty.get("mapMaterial2DList").get("listMaterial2D")[0].get("listFaceMaterial")[0].get("listTexture")[0].get("qsFileName"));
		var pathlist = texpath.split('/');
		var texname = pathlist[pathlist.length-1];

		var ttranslation = stitchproperty.get("mapMaterial2DList").get("listMaterial2D")[0].get("listFaceMaterial")[0].get("listTexture")[0].get("v2Translation");
		var tscale = stitchproperty.get("mapMaterial2DList").get("listMaterial2D")[0].get("listFaceMaterial")[0].get("listTexture")[0].get("v2Size");
		var tangle = stitchproperty.get("mapMaterial2DList").get("listMaterial2D")[0].get("listFaceMaterial")[0].get("listTexture")[0].get("fSignedAngle");

		var diffuse = stitchproperty.get("mapMaterial2DList").get("listMaterial2D")[0].get("listFaceMaterial")[0].get("v4Diffuse");

		var ttransMatrix = new THREE.Matrix4();
		ttransMatrix.identity();
		ttransMatrix.makeTranslation( -ttranslation.x, -ttranslation.y, 0.0 );

		var tscalMatrix = new THREE.Matrix4();
		tscalMatrix.identity();
		tscalMatrix.makeScale( 1.0 / tscale.x, 1.0 / tscale.y, 1.0);

		var trotMatrix = new THREE.Matrix4();
		trotMatrix.identity();
		trotMatrix.makeRotationZ( -tangle );

		var transform = new THREE.Matrix4();

		transform.identity();
		transform.multiply(tscalMatrix);
		transform.multiply(trotMatrix);
		transform.multiply(ttransMatrix);

		var material = new THREE.ShaderMaterial({
			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib['lights'],
				{
					TransformMatrix: {type: "m4", value: transform},
					gRotMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
					gTransMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
					texture0: {type: 't', value: null},
					bUseTexture: {type: 'b', value: 1},

					materialAmbient: {type: "v3", value: new THREE.Vector3(0, 0, 0)},
					materialDiffuse: {type: "v3", value: new THREE.Vector3(diffuse.x, diffuse.y, diffuse.z)},
					materialSpecular: {type: "v3", value: new THREE.Vector3(0, 0, 0)},
					materialOpacity: {type: 'f', value: 0.0}
				}
			]),
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.DoubleSide,
			wireframe: false,
			lights: true,
			polygonOffset: true,
			polygonOffsetFactor: -2.5,
			polygonOffsetUnits: -2.5,
			//blending: THREE.CustomBlending,
			//blendSrc: THREE.SrcAlphaFactor,
			//blendDst: THREE.OneMinusSrcAlphaFactor,
			//depthWrite: false,
			//depthTest: false,
			transparent: true
		});
		//console.log(texname);
		var arraybuffer = zip.file(texname).asArrayBuffer();
		var bytes = new Uint8Array(arraybuffer);
		var blob = new Blob([bytes.buffer]);

		readTextureFile({Blob: blob, Material: material}, function(result){
			//console.log(result);
		});

		var mesh = createPattern(geometry, material);
		mesh.userData = null;
		mesh.name = "3D_Pattern";
		ret_object3d.add(mesh);
	}
	return ret_object3d;
}