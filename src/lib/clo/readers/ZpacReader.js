// Read zpac file
function readZpac(file, header, scene){
	var reader = new FileReader();

	// get file name.
	var fileNameList = file.name.split('.');
	var fileName = fileNameList[0];

	// @read zip file.
	var blob = file.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

	var pacMap;
	var pacName = "";
	var btnNameList = [];
	var bthNameList = [];

	reader.onload = function(e){
		var zip = new JSZip(e.target.result);
		var keyList = Object.keys(zip.files);
		//console.log(keyList);

		keyList.forEach(function(value){
			var list = value.split('.');
			var extension = list[list.length-1];

			switch(extension)
			{
			case 'pac':
				pacName = value;
				break;
			case 'btn':
				btnNameList.push(value);
				break;
			case 'bth':
				bthNameList.push(value);
				break;
			case 'png':
			case 'jpg':

				break;
			case 'pos':

				break;
			default:
			};
		});

		var fileOffset = {Offset: 0};
		var dataView = new DataView(zip.file(pacName).asArrayBuffer());

		pacMap = readMap(dataView, fileOffset);

		var patternContainer = PatternFactory(pacMap, zip);
		//console.log(patternContainer);

		scene.add(patternContainer);
		
		if(!_globalWorkerCreateFlag)
			onLoadWorker();
		else
			_globalWorkerCreateFlag = false;
	}
	reader.readAsArrayBuffer(blob);
}


// Read zpac file from blob
function readZpacFromBlob(blob, header, scene){
	var reader = new FileReader();

	var contentBlob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

	var pacMap;
	var pacName = "";
	var btnNameList = [];
	var bthNameList = [];

	reader.onload = function(e){
		var zip = new JSZip(e.target.result);
		var keyList = Object.keys(zip.files);
		//console.log(keyList);

		keyList.forEach(function(value){
			var list = value.split('.');
			var extension = list[list.length-1];

			switch(extension)
			{
			case 'pac':
				pacName = value;
				break;
			case 'btn':
				btnNameList.push(value);
				break;
			case 'bth':
				bthNameList.push(value);
				break;
			case 'png':
			case 'jpg':

				break;
			case 'pos':

				break;
			default:
			};
		});

		var fileOffset = {Offset: 0};
		var dataView = new DataView(zip.file(pacName).asArrayBuffer());
		_globalPacFileSize = dataView.byteLength;

		pacMap = readMap(dataView, fileOffset);

		var patternContainer = PatternFactory(pacMap, zip);
		//console.log(patternContainer);

		scene.add(patternContainer);

		if(!_globalWorkerCreateFlag)
			onLoadWorker();
		else
			_globalWorkerCreateFlag = false;
	}
	reader.readAsArrayBuffer(contentBlob);
}

function readZpacFromBlobForWeb(blob, scene){
	var reader = new FileReader();

	//var contentBlob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

	var pacMap;
	var pacName = "";
	var btnNameList = [];
	var bthNameList = [];

	reader.onload = function(e){
		var zip = new JSZip(e.target.result);
		var keyList = Object.keys(zip.files);
		//console.log(keyList);

		keyList.forEach(function(value){
			var list = value.split('.');
			var extension = list[list.length-1];

			switch(extension)
			{
			case 'pac':
				pacName = value;
				break;
			case 'btn':
				btnNameList.push(value);
				break;
			case 'bth':
				bthNameList.push(value);
				break;
			case 'png':
			case 'jpg':

				break;
			case 'pos':

				break;
			default:
			};
		});

		var fileOffset = {Offset: 0};
		var dataView = new DataView(zip.file(pacName).asArrayBuffer());
		_globalPacFileSize = dataView.byteLength;

		pacMap = readMap(dataView, fileOffset);

		var patternContainer = PatternFactoryForWeb(pacMap, zip);
		//console.log(patternContainer);

		scene.add(patternContainer);

		if(!_globalWorkerCreateFlag)
			onLoadWorker();
		else
			_globalWorkerCreateFlag = false;
	}
	reader.readAsArrayBuffer(blob);
}