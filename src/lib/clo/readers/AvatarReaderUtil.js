
function MapToMesh(root_map, material_map, scene){
	var ret = [];
	var transparentMesh = {pre: [], post: []};
	//console.log(material_map);

	var transformer3D = root_map.get( "mapTransformer3D" );
	if( transformer3D !== null && transformer3D instanceof Map ) {

		RecursiveTransformer3D( transformer3D, material_map, scene, transparentMesh );

		for( var a = 0 ; a < transparentMesh.pre.length ; ++a )
			scene.add( transparentMesh.pre[a] );

		for( var c = 0 ; c < transparentMesh.post.length ; ++c )
			scene.add( transparentMesh.post[c] );

	}
	console.log("load Complete");
	return ret;
}

function RecursiveTransformer3D(transformer_map, material_map, scene, transparentlist){
	var baPosition = null, baIndex = null, baTexCoord = null, TexName = "", material = null;

	//console.log("call RecursiveTransformer");
	var list = transformer_map.get( "listChildrenTransformer3D" );
	if( list !== null ) {
		//console.log(list);
		for( var i = 0; i < list.length ; ++i ) {
			var listMatShape = list[i].get( "listMatShape" );
			//console.log(listMatShape);
			if( listMatShape !== null ) {
				//console.log(listMatShape);
				for( var j = 0 ; j < listMatShape.length ; ++j ) {
					loadMatShape(listMatShape[j], transparentlist, material_map);
				}
			}
			
			RecursiveTransformer3D( list[i], material_map, scene, transparentlist );
		}
	}
}

function loadMatShape(map, transparentlist, material_map) {
	var elementName = readByteArray("String", map.get("mapElement").get("qsName"));
	//console.log(elementName);

	var mapShape = map.get("mapShape");
	var listMatMesh = map.get("listMatMesh");
	if( listMatMesh !== null ) {
		for( var k = 0 ; k < listMatMesh.length ; ++k ) {
			loadMatMesh(mapShape, listMatMesh[k], k, transparentlist, material_map);
		}
	}
}

function loadMatMesh(shape, mesh, index, transparentlist, material_map) {

	var mapMaterial = mesh.get("mapMaterial");
	var meshTextureFileName = '';

	if( mapMaterial !== null ) {

		var listTexture = mapMaterial.get("listTexture");

		if( listTexture !== null ) {
			for( var l = 0 ; l < listTexture.length ; ++l ) {

				var texFileName = readByteArray( "String", listTexture[l].get( "qsFileName" ) );

				var NameList = texFileName.split( '/' );
				if( NameList !== null ) {
					meshTextureFileName = NameList[ NameList.length - 1 ];
					material = material_map.get( meshTextureFileName );
					//console.log(material);
					//console.log(textureName);

					var diffuse = mapMaterial.get("v4Diffuse");
					var ambient = mapMaterial.get("v4Ambient");
					var specular = mapMaterial.get("v4Specular");
					var alpha = diffuse.w;

					var tscale = listTexture[l].get("v2Size");
					var tangle = THREE.Math.degToRad(listTexture[l].get("fSignedAngle"));
					var ttrans = listTexture[l].get("v2Translation");

					var tscalMatrix = new THREE.Matrix4();
					var trotMatrix = new THREE.Matrix4();
					var ttransMatrix = new THREE.Matrix4();

					tscalMatrix.identity();
					tscalMatrix.makeScale( 1.0 / tscale.x, 1.0 / tscale.y, 1.0 );

					trotMatrix.identity();
					trotMatrix.makeRotationZ( -tangle );

					ttransMatrix.identity();
					ttransMatrix.makeTranslation( -ttrans.x, -ttrans.y, 0.0);

					var transform = new THREE.Matrix4();

					transform.identity();
					transform.multiply(tscalMatrix);
					transform.multiply(trotMatrix);
					transform.multiply(ttransMatrix);

					material.uniforms.TransformMatrix.value = transform;
					material.uniforms.materialAmbient.value = new THREE.Vector3(ambient.x, ambient.y, ambient.z);
					material.uniforms.materialDiffuse.value = new THREE.Vector3(diffuse.x, diffuse.y, diffuse.z);
					material.uniforms.materialSpecular.value = new THREE.Vector3(specular.x, specular.y, specular.z);
					material.uniforms.materialOpacity.value = alpha;
				} else {
					material = new THREE.MeshBasicMaterial( { color : 0x000000, wireframe : false } );
				}
			}
		} else {
			material = new THREE.MeshBasicMaterial( { color : 0x000000, wireframe : false } );
		}
	} else {
		material = new THREE.MeshBasicMaterial( { color : 0x000000, wireframe : false } );
	}

	if( shape !== null) {
		var meshInformation = loadIndexedMesh(shape, index);
		var mesh = createAvatarMesh( meshInformation.vertices, meshInformation.indices, meshInformation.texcoord, material );
		if( mesh !== null ) {
			if( meshTextureFileName.indexOf('.png') > 0 ) {
				mesh.material.depthWrite = false;
				transparentlist.post.push(mesh);
			} else {
				mesh.material.transparent = false;
				transparentlist.pre.push(mesh);
			}
		}
	}
}

function loadIndexedMesh(map, index) {
	var ret = { vertices: null, indices: null, texcoord: null };
	var listSource = map.get("listSource");
	if( listSource !== null ) {
		var listIndexedMesh = map.get("listIndexedMesh");
		if( listIndexedMesh !== null ) {
			var PositionIndex = listIndexedMesh[index].get("iPositionSourceI");
			var NormalIndex = listIndexedMesh[index].get("iNormalSourceI");
			var TexCoordIndexList = listIndexedMesh[index].get("arrTexCoordSourceI");

			ret.vertices = readByteArray("Vec3", listSource[PositionIndex].get("baArray"));
			//console.log(baPosition);
			ret.indices = readByteArray("Uint", listIndexedMesh[index].get("baPositionIndex"));
			//console.log(baIndex);
			ret.texcoord = readByteArray("Vec2", listSource[TexCoordIndexList[0]].get("baArray"));
			//console.log(baTexCoord);
		}
	}

	return ret;
}

function loadAvtMaterial(file) {
	var material = new THREE.ShaderMaterial({
		uniforms: THREE.UniformsUtils.merge([
			THREE.UniformsLib['lights'],
			{
				TransformMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
				gRotMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
				gTransMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
				texture0: {type: 't', value: null},

				materialAmbient: {type: "v3", value: new THREE.Vector3(0.8, 0.8, 0.8)},
				materialDiffuse: {type: "v3", value: new THREE.Vector3(0.8, 0.8, 0.8)},
				materialSpecular: {type: "v3", value: new THREE.Vector3(0, 0, 0)},
				materialOpacity: {type: 'f', value: 0.0}
			}
		]),
		vertexShader: document.getElementById( 'vertexShader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		side: THREE.DoubleSide,
		//side: THREE.FrontSide,
		wireframe: false,
		lights: true,
		transparent: true,
	});

	var arraybuffer = file.asArrayBuffer();
	var bytes = new Uint8Array(arraybuffer);
	var blob = new Blob([bytes.buffer]);

	readTextureFile({Blob: blob, Material: material}, function(result){
		//console.log(result);
	});

	return material;
}

function createAvatarMesh(vertices, indices, texcoord, material){
	if( vertices == null || indices == null || material == null ) {
		//console.log("Error : Geometry information is null.");
		return null;
	}
	var MeshGeometry = new THREE.Geometry();
	var ret_mesh;

	for( var i = 0 ; i < vertices.length ; ++i )
	{
		MeshGeometry.vertices.push(new THREE.Vector3(vertices[i].x, vertices[i].y, vertices[i].z));
	}

	for( var j = 0 ; j < indices.length / 3 ; ++j )
	{
		var Offset = 3 * j;
		MeshGeometry.faces.push(new THREE.Face3(indices[Offset + 0], indices[Offset + 1], indices[Offset + 2]));

		if( texcoord !== null ) {
			var a = texcoord[indices[Offset + 0]];
			//console.log(a);
			var b = texcoord[indices[Offset + 1]];
			//console.log(b);
			var c = texcoord[indices[Offset + 2]];
			//console.log(c);

			var texCoord0 = new THREE.Vector2(a.x, a.y);
			var texCoord1 = new THREE.Vector2(b.x, b.y);
			var texCoord2 = new THREE.Vector2(c.x, c.y);

			MeshGeometry.faceVertexUvs[0].push([texCoord0, texCoord1, texCoord2]);
		}
	}
	MeshGeometry.mergeVertices();
	MeshGeometry.computeFaceNormals();
	MeshGeometry.computeVertexNormals();
	MeshGeometry.computeBoundingSphere();

	ret_mesh = new THREE.Mesh(MeshGeometry, material);
	ret_mesh.name = "avatarMesh";
	return ret_mesh;
}