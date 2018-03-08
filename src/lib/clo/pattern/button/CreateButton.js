function readObjFile(data, onload){

  if(!FileReaderSyncSupport)
    return;

  var syncWorker = new Worker(textSyncWorkerURL);

  if(syncWorker){
    ++_globalWorkerCount;
    _globalWorkerCreateFlag = true;
    syncWorker.onmessage = function(e){

      var objloader = new CLO.OBJLoader();
      objloader.load(e.data.Text, data.Mesh, data.Material, function( object, mesh, material ){

        for(var a = 0 ; a < object.children.length ; ++a)
        {
          var isRenMesh = false;
          try {

            isRenMesh = object.children[a].name.includes("ren_mesh");

          } catch ( e ) {

            isRenMesh = object.children[a].name.indexOf("ren_mesh") >= 0 ? true : false;

          }
          
          if(object.children[a] instanceof THREE.Mesh && isRenMesh)
          {
            var o = object.children[a];

            //mesh.scale.x = 1;
            //mesh.scale.y = 1;
            //mesh.scale.z = 1;

            //mesh.geometry = new THREE.Geometry().fromBufferGeometry(o.geometry);
            //mesh.material = material;

            for(var b = 0 ; b < data.ButtonList.length ; ++b)
            {
              var m = data.ButtonList[b].Data.Mesh;
              m.geometry = new THREE.Geometry().fromBufferGeometry(o.geometry);
              m.material = material;
            }
          }
        }
      });

      onload(e.data.Result);
      this.terminate();
      --_globalWorkerCount;
      onLoadWorker();
    };

    syncWorker.postMessage({Blob: data.Blob});
  }

}

function readBtnFile(data, onload){

  if(!FileReaderSyncSupport)
    return;

  var syncWorker = new Worker(bufferIndexSyncWorkerURL);

  if(syncWorker){
    ++_globalWorkerCount;
    _globalWorkerCreateFlag = true;
    syncWorker.onmessage = function(e){

      var zip = new JSZip(e.data.Buffer);
      var keyList = Object.keys(zip.files);
      //console.log(keyList);

      var objName;
      var bndName;
      var pngName;
      var texName;

      keyList.forEach(function(value){
        try {

          if(value.includes('obj'))
            objName = value;
          else if(value.includes('bnd'))
            bndName = value;
          else if(value.includes('png'))
            pngName = value;

        } catch ( e ) {

          if(value.indexOf('obj') >= 0)
            objName = value;
          else if(value.indexOf('bnd') >= 0)
            bndName = value;
          else if(value.indexOf('png') >= 0)
            pngName = value;

        }
      });

      var bndDataView = new DataView(zip.file(bndName).asArrayBuffer());
      var bndOffset = {Offset: 0};
      var bndMap = readBND(bndDataView, bndOffset);

      var btncolorwayList = bndMap.get("mapFabric").get("mapColorwayInfo").get("listColorwayInfo");
      var globalbuttonList = [];
      
      for(var i = 0 ; i < btncolorwayList.length ; ++i)
      {
        var btnfacematerial = btncolorwayList[i].get("listFaceMaterial")[0];
        var btnDiffuse = btnfacematerial.get("v4Diffuse");
        var btnAmbient = btnfacematerial.get("v4Ambient");
        var btnSpecular = btnfacematerial.get("v4Specular");
        
        var listTexture = btnfacematerial.get("listTexture");
        if(listTexture && listTexture.length > 0)
        {
          texName = readByteArray("String", listTexture[0].get("qsFileName"));
          //console.log(texName);
        }

        var textureArraybuffer = null;
        var textureBlob = null;
        var material = new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib['lights'],
            {
              TransformMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
              gRotMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
              gTransMatrix: {type: "m4", value: new THREE.Matrix4().identity()},
              texture0: {type: 't', value: null},
              bUseTexture: {type: 'i', value: 1},

              materialAmbient: {type: "v3", value: new THREE.Vector3( btnAmbient.x, btnAmbient.y, btnAmbient.z )},
              materialDiffuse: {type: "v3", value: new THREE.Vector3( btnDiffuse.x, btnDiffuse.y, btnDiffuse.z )},
              materialSpecular: {type: "v3", value: new THREE.Vector3( btnSpecular.x, btnSpecular.y, btnSpecular.z )},
              materialOpacity: {type: 'f', value: btnDiffuse.w}
            }
          ]),
          vertexShader: document.getElementById('vertexShader').textContent,
          fragmentShader: document.getElementById('fragmentShader').textContent,
          side: THREE.DoubleSide,
          wireframe: drawMode.wireframe.button,
          lights: true,
          transparent: true
        });

        if(zip.file(texName))
        {
          textureArraybuffer = zip.file(texName).asArrayBuffer();
          textureBlob = new Blob([new Uint8Array(textureArraybuffer).buffer]);

          globalbuttonList.push(material);

          readTextureFile({Blob: textureBlob, Material: material}, function(result){
            //console.log(result);
          });
        }
        else
        {
          var temp = fabMaterial[j].TextureName;
          var list = temp.split('\\');
          texName = list[list.length - 1];

          if(zip.file(texName))
          {
            textureArraybuffer = zip.file(texName).asArrayBuffer();
            textureBlob = new Blob([new Uint8Array(textureArraybuffer).buffer]);

            globalbuttonList.push(material);

            readTextureFile({Blob: textureBlob, Material: material}, function(result){
              //console.log(result);
            });
          }
          else
          {
            //material = new THREE.MeshLambertMaterial({color: new THREE.Color( btnDiffuse.x, btnDiffuse.y, btnDiffuse.z ).getHex(), wireframe: drawMode.wireframe.button});
            material.uniforms.bUseTexture.value = 0;
            globalbuttonList.push(material);
          }
        }
      }
      _globalMaterialInformation.button.set(e.data.Index , globalbuttonList);

      var objBlob;
      try {

        objBlob = new Blob([new DataView(zip.file(objName).asArrayBuffer())]);

      } catch ( e ) {

        // Old browser, need to use blob builder
        window.BlobBuilder = window.BlobBuilder ||
                   window.WebKitBlobBuilder ||
                   window.MozBlobBuilder ||
                   window.MSBlobBuilder;
        if(window.BlobBuilder) {
          var builder = new BlobBuilder();
          builder.append(zip.file(objName).asArrayBuffer());
          objBlob = builder.getBlob();
        }

      }

      readObjFile({Blob: objBlob, Mesh: data.Mesh, Material: globalbuttonList[_initialColorwayIndex], ButtonList: data.ButtonList}, function(result){
        //console.log(result);
      });
      //JSZip End

      onload(e.data.Result);
      this.terminate();
      --_globalWorkerCount;
      onLoadWorker();
      //worker end
    };

    syncWorker.postMessage({Blob: data.Blob, Index: data.Index});
  }

}


function readBthFile(data, onload){

  if(!FileReaderSyncSupport)
    return;

  var syncWorker = new Worker(bufferIndexSyncWorkerURL);

  if(syncWorker){
    ++_globalWorkerCount;
    _globalWorkerCreateFlag = true;
    syncWorker.onmessage = function(e){

      var zip = new JSZip(e.data.Buffer);
      var keyList = Object.keys(zip.files);
      //console.log(keyList);

      var bndName;

      keyList.forEach(function(value){
        try {

          if(value.includes('bnd'))
            bndName = value;

        } catch ( e ) {
          if(value.indexOf('bnd') >= 0)
            bndName = value;
        }
      });

      var bndDataView = new DataView(zip.file(bndName).asArrayBuffer());
      var bndOffset = {Offset: 0};
      var bndMap = readBND(bndDataView, bndOffset);

      var bthcolorwayList = bndMap.get("mapFabric").get("mapColorwayInfo").get("listColorwayInfo");
      var globalbuttonholeList = [];

      for(var i = 0 ; i < bthcolorwayList.length ; ++i)
      {
        var bthfacematerial = bthcolorwayList[i].get("listFaceMaterial")[0];
        var bthtexture = bthfacematerial.get("listTexture");

        var TexScale = bthtexture[0].get("v2Size");
        var TexTranslate = bthtexture[0].get("v2Translation");

        var tscalMatrix = new THREE.Matrix4();
        tscalMatrix.identity();
        tscalMatrix.makeScale(1.0 / TexScale.x, 1.0 / TexScale.y, 1.0 );

        var ttransMatrix = new THREE.Matrix4();
        ttransMatrix.identity();
        ttransMatrix.makeTranslation( -TexTranslate.x, -TexTranslate.y, 0.0 );


        var transform = new THREE.Matrix4();
        transform.identity();
        transform.multiply(tscalMatrix);
        transform.multiply(ttransMatrix);
        data.Material.uniforms.TransformMatrix.value = transform;

        var bthDiffuse = bthfacematerial.get("v4Diffuse");
        var bthAmbient = bthfacematerial.get("v4Ambient");
        var bthSpecular = bthfacematerial.get("v4Specular");

        var buttonholeValue = {_diffuse: new THREE.Vector3(bthDiffuse.x, bthDiffuse.y, bthDiffuse.z), _ambient: new THREE.Vector3(bthAmbient.x, bthAmbient.y, bthAmbient.z), _specular: new THREE.Vector3(bthSpecular.x, bthSpecular.y, bthSpecular.z)};
        globalbuttonholeList.push(buttonholeValue);

      }
      _globalMaterialInformation.buttonhole.set(e.data.Index, globalbuttonholeList);

      data.Material.uniforms.materialDiffuse.value = globalbuttonholeList[_initialColorwayIndex]._diffuse;
      data.Material.uniforms.materialAmbient.value = globalbuttonholeList[_initialColorwayIndex]._ambient;
      data.Material.uniforms.materialSpecular.value = globalbuttonholeList[_initialColorwayIndex]._specular;

      var texturelist = bthcolorwayList[0].get("listFaceMaterial")[0].get("listTexture");

      if(texturelist && texturelist.length > 0)
      {
        texName = readByteArray("String", texturelist[0].get("qsFileName"));
        //console.log(texName);
      }

      var textureArraybuffer = null;
      var textureBlob = null;

      if(zip.file(texName))
      {
        textureArraybuffer = zip.file(texName).asArrayBuffer();
        textureBlob = new Blob([new Uint8Array(textureArraybuffer).buffer]);

        readTextureFile({Blob: textureBlob, Material: data.Material}, function(result){
          //console.log(result);
        });
      }
      else
      {
        var temp = fabMaterial[j].TextureName;
        var list = temp.split('\\');
        texName = list[list.length - 1];

        if(zip.file(texName))
        {
          textureArraybuffer = zip.file(texName).asArrayBuffer();
          textureBlob = new Blob([new Uint8Array(textureArraybuffer).buffer]);

          globalbuttonList.push(material);

          readTextureFile({Blob: textureBlob, Material: material}, function(result){
            //console.log(result);
          });
        }
      }
      //JSZip End

      onload(e.data.Result);
      this.terminate();
      --_globalWorkerCount;
      onLoadWorker();
      //worker end
    };

    syncWorker.postMessage({Blob: data.Blob, Index: data.Index});
  }

}