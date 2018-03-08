//Get Fabric Information from map...
function createFabricList(map){
	if(!map instanceof Map)
	{
		//console.log("createFabricList(map) argument not instanceof Map");
		return null;
	}

	var ret_array = [];

	var fabric_list = map.get("listFabric");
	for(var i = 0 ; i < fabric_list.length ; ++i)
	{
		var colorwayList = [];
		
		var fabObject = fabric_list[i];
		//var facematerialOjbect = fabObject.get("mapColorwayInfo").get("listColorwayInfo")[0].get("listFaceMaterial")[0];
		//var texlist = facematerialOjbect.get("listTexture");

		var colorwayInfo = fabObject.get("mapColorwayInfo").get("listColorwayInfo");
		//console.log(colorwayInfo.length);
		for(var j = 0 ; j < colorwayInfo.length; ++j)
		{
			//console.log(colorwayInfo[j].get("listFaceMaterial").length);
			var information = {
				Name: "", TextureName: "", 
				TextureAngle: 0.0, 
				TextureScale: {x: 0.0, y: 0.0}, 
				TextureTranslation: {x: 0.0, y: 0.0}, 
				WrapS: 0, WrapT: 0, 
				MinFilter: 0, MagFilter: 0, 
				Diffuse: {x: 0.0, y: 0.0, z: 0.0, w: 0.0}, 
				Ambient: {x: 0.0, y: 0.0, z: 0.0, w: 0.0}, 
				Specular: {x: 0.0, y: 0.0, z: 0.0, w: 0.0}, 
				Emission: {x: 0.0, y: 0.0, z: 0.0, w: 0.0},
				BaseColor: {x: 0.0, y: 0.0, z: 0.0},
				Shininess: 0.0,
				Desaturated: 0.0
			};

			var facematerialObject = colorwayInfo[j].get("listFaceMaterial")[0];
			var texlist = facematerialObject.get("listTexture");

			information.Name = readByteArray("String", fabObject.get("qsFabricName"));
			if(texlist)
			{
				var texObject = texlist[0];
				var name = readByteArray("String", texObject.get("qsFileName"));
				if(information.Desaturated === 1.0)
				{
					var array = name.split('\\');
					name = array[0] + "\\d_" + array[1];
				}
				information.TextureName = name;
				information.TextureAngle = texObject.get("fSignedAngle");
				information.TextureScale = texObject.get("v2Size");
				information.TextureTranslation = texObject.get("v2Translation");

				information.WrapS = texObject.get("enWrapS");
				information.WrapT = texObject.get("enWrapT");

				information.MinFilter = texObject.get("enMinFilter");
				information.MagFilter = texObject.get("enMagFilter");

			}

			information.Diffuse = facematerialObject.get("v4Diffuse");
			information.Ambient = facematerialObject.get("v4Ambient");
			information.Specular = facematerialObject.get("v4Specular");
			information.Emission = facematerialObject.get("v4Emission");
			information.BaseColor = facematerialObject.get("v3BaseColor");
			information.Shininess = facematerialObject.get("fShininess");
			information.Desaturated = facematerialObject.get("fDesaturated");

			colorwayList.push(information);
		}

		ret_array.push(colorwayList);
	}

	return ret_array;
}


function createMaterialList(zip, fablist){

	var ret_array = [];

	for(var i = 0 ; i < fablist.length ; ++i)
	{
		//@ create Material.
		//***************************************************************************
		var materialList = [];
		var fabMaterial = fablist[i];

		for(var j = 0 ; j < fablist[i].length ; ++j)
		{
			var diffuse = fabMaterial[j].Diffuse;
			var ambient = fabMaterial[j].Ambient;
			var specular = fabMaterial[j].Specular;
			var emission = fabMaterial[j].Emission;
			var alpha = diffuse.w;
			var shininess = fabMaterial[j].Shininess;
			var desaturated = fabMaterial[j].Desaturated;

			var tscale = fabMaterial[j].TextureScale;
			var tangle = THREE.Math.degToRad(fabMaterial[j].TextureAngle);
			var ttrans = fabMaterial[j].TextureTranslation;

			var tscalMatrix = new THREE.Matrix4();
			var trotMatrix = new THREE.Matrix4();
			var ttransMatrix = new THREE.Matrix4();

			tscalMatrix.identity();
			tscalMatrix.makeScale( 1.0 / tscale.x, 1.0 / tscale.y, 1.0 );

			trotMatrix.identity();
			trotMatrix.makeRotationZ( -tangle );

			ttransMatrix.identity();
			ttransMatrix.makeTranslation( -ttrans.x, -ttrans.y, 0 );

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
						bUseTexture: {type: 'i', value: 1},

						materialAmbient: {type: "v3", value: new THREE.Vector3( ambient.x, ambient.y, ambient.z )},
						materialDiffuse: {type: "v3", value: new THREE.Vector3( diffuse.x, diffuse.y, diffuse.z )},
						materialSpecular: {type: "v3", value: new THREE.Vector3( specular.x, specular.y, specular.z )},
						materialEmission: {type: "v3", value: new THREE.Vector3( emission.x, emission.y, emission.z )},
						materialShininess: {type: 'f', value: shininess},
						materialOpacity: {type: 'f', value: alpha},
						materialDesaturated: {type: 'f', value: desaturated}
					}
				]),
				vertexShader: document.getElementById('vertexShader').textContent,
				fragmentShader: document.getElementById('fragmentShader').textContent,
				side: THREE.DoubleSide,
				wireframe: drawMode.wireframe.pattern,
				lights: true,
				//blending: THREE.MultiplyBlending,
				//blendSrc: THREE.SrcAlphaFactor,
				//blendDst: THREE.oneMinusSrcAlphaFactor,
				transparent: true
			});
			materialList.push(material);

			//@ Load Texture File.
			if(!zip.file(fabMaterial[j].TextureName))
			{
				var temp = fabMaterial[j].TextureName;
				var list = temp.split('\\');
				var onlyFileName = list[list.length - 1];
				if(!zip.file(onlyFileName))
				{
					// ** null texture ZpacReaderUtil.js -- Line 265 ???.
					material.uniforms.bUseTexture.value = 0;
					//console.log("null texture");
					//materialList.pop();
					//material.dispose();
					//var fabColor = new THREE.Color(diffuse.x, diffuse.y, diffuse.z);
					//material = new THREE.MeshPhongMaterial({color: fabColor.getHex(), side: THREE.DoubleSide, wireframe: drawMode.wireframe.pattern, transparent: true, opacity: alpha});
					//material = new THREE.MeshLambertMaterial({color: fabColor.getHex(), side: THREE.DoubleSide, wireframe: drawMode.wireframe.pattern, transparent: true, opacity: alpha});
					//materialList.push(material);
					continue;
				}
			}

			var arraybuffer = zip.file(fabMaterial[j].TextureName).asArrayBuffer();
			var bytes = new Uint8Array(arraybuffer);
			var blob = new Blob([bytes.buffer]);

			readTextureFile({Blob: blob, Material: material}, function(result){
				//console.log(result);
			});
		}
		//***************************************************************************
		
		ret_array.push(materialList);
		_globalMaterialInformation.pattern.push(materialList);
	}

	return ret_array;

}