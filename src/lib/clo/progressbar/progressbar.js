function abortRead() {
  reader.abort();
}

function errorHandler(evt) {
  switch(evt.target.error.code) {
    case evt.target.error.NOT_FOUND_ERR:
      alert('File Not Found!');
      break;
    case evt.target.error.NOT_READABLE_ERR:
      alert('File is not readable');
      break;
    case evt.target.error.ABORT_ERR:
      break; // noop
    default:
      alert('An error occurred reading this file.');
  };
}

function updateProgress(evt) {
  if(evt.lengthComputable) {
    var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
    if(percentLoaded < 100) {
      progress.style.width = percentLoaded + '%';
      progress.textContent = percentLoaded + '%'; 
    }
  }
}

function handleFileSelect(evt) {
  // Reset progress indicator on new file selection.
  progress.style.width = '0%';
  progress.textContent = '0%';

  reader = new FileReader();
  reader.onerror = errorHandler;
  reader.onprogress = updateProgress;
  reader.onabort = function(e) {
    alert('File read cancelled');
  };
  reader.onloadstart = function(e) {
    document.getElementById('progress_bar').style.opacity = 1.0;
  };
  reader.onload = function(e) {
    // Ensure that the progress bar displays 100% at the end.
    progress.style.width = '100%';
    progress.textContent = '100%';

    setTimeout("document.getElementById('progress_bar').style.opacity = 0", 2000);
  };

  reader.readAsBinaryString(evt.target.files[0]);
}

function move() {   
  var val = 1;    
  var interval = 10;    
  //var progress = document.getElementById("myBar");    
  setInterval(frame, 100);

  function frame() {      
    console.log(val);    
    if(val < 100) {       
      progress.style.width = val + '%';   
      progress.textContent = val + '%';    
      val += interval;      
    } else {        
      progress.style.width = '100%';  
      progress.textContent = '100%';          
      val = 1;      
    }   
  } 
}