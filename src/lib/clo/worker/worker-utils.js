function makeWorker(script){

  var URL = window.URL || window.webkitURL;
  var Blob = window.Blob;
  var worker = window.Worker;

  if(!URL || !Blob || !Worker || !script)
    return null;

  var blob = new Blob([script]);
  var worker = new Worker(URL.createObjectURL(blob));
  return worker;

}

function checkFileReaderSyncSupport(){

  var worker = makeWorker(syncDetectionScript);
  if(worker){
    worker.onmessage = function(e){
      FileReaderSyncSupport = e.data;
      if(FileReaderSyncSupport){
        console.log("Your browser supports FileReaderSync.");
      }
    };
    worker.postMessage({});
  }
  
}

function readTextureFile(data, onload){

  if(!FileReaderSyncSupport || !data.Blob)
    return null;

  var syncWorker = new Worker(dataSyncWorkerURL);
  //var syncWorker = makeWorker(document.getElementById('worker-script'));

  if(syncWorker){
    ++_globalWorkerCount;
    _globalWorkerCreateFlag = true;
    syncWorker.onmessage = function(e){
      var loader = new THREE.TextureLoader();

      var texture = loader.load(e.data.URL);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      data.Material.uniforms.texture0.value = texture;
      onload(e.data.Result);

      this.terminate();
      --_globalWorkerCount;
      onLoadWorker();
    };

    syncWorker.postMessage({Blob: data.Blob});
  }

}

function removeCloth(data, onload){

  if(!FileReaderSyncSupport)
    return;

  var removeWorker = new Worker(bufferSyncWorkerURL);

  if(removeWorker){
    removeWorker.onmessage = function(e){

      onload(e.data.Result);
      this.terminate();
    };

    removeWorker.postMessage(data);
  }
}