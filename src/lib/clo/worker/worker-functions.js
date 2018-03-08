function dataWorkerFunction(){
	self.addEventListener('message', function(e){
	  try{
	    var reader = new FileReaderSync();
	    var url = reader.readAsDataURL(e.data.Blob);
	    postMessage({Result: 'FileReaderSync() complete', URL: url});
	  }catch(e){
	    postMessage({
	      result: 'error'
	    });
	  }
	}, false);
}

function arraybufferindexWorkerFunction(){
	self.addEventListener('message', function(e){
	  try{
	    var reader = new FileReaderSync();
	    var buffer = reader.readAsArrayBuffer(e.data.Blob);
	    postMessage({Result: 'FileReaderSync() complete', Buffer: buffer, Index: e.data.Index});
	  }catch(e){
	    postMessage({
	      result: 'error'
	    });
	  }
	}, false);
}

function arraybufferWorkerFunction(){
	self.addEventListener('message', function(e){
	  try{
	    var reader = new FileReaderSync();
	    var buffer = reader.readAsArrayBuffer(e.data.Blob);
	    postMessage({Result: 'FileReaderSync() complete', Buffer: buffer});
	  }catch(e){
	    postMessage({
	      result: 'error'
	    });
	  }
	}, false);
}

function textWorkerFunction(){
	self.addEventListener('message', function(e){
	  try{
	    var reader = new FileReaderSync();
	    var text = reader.readAsText(e.data.Blob);
	    postMessage({Result: 'FileReaderSync() complete', Text: text});
	  }catch(e){
	    postMessage({
	      result: 'error'
	    });
	  }
	}, false);
}

function onLoadWorker(){
	if(_globalWorkerCount === 0)
    {
      _globalCompleteLoadFile = true;
      //console.log("load complete");
    }
}