// Read avt file
function readAvt(file, header, scene){
	var reader = new FileReader();

	// get file name.
	var fileNameList = file.name.split('.');
	var fileName = fileNameList[0];

	// @read zip file.
	var blob = file.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

	var avtMap;
	var avtName = "";
	var imgName = "";
	//var imgList = [];
	var materialMap = new Map();

	reader.onload = function(e){
		var zip = new JSZip(e.target.result);
		var keyList = Object.keys(zip.files);
		//console.log(keyList);
		keyList.forEach(function(value){
			var list = value.split('.');
			var extension = list[list.length-1];

			switch(extension)
			{
			case 'dan':
				avtName = value;
				break;
			case 'png':
			case 'jpg':
				//imgList.push(value);
				imgName = value;
				materialMap.set(imgName, loadAvtMaterial(zip.file(imgName)));
				//console.log(materialMap);
				break;
			default:
			};
		});

		var fileOffset = {Offset: 0};
		var dataView = new DataView(zip.file(avtName).asArrayBuffer());

		//console.log(imgList);
		avtMap = readMap(dataView, fileOffset);
		//console.log(avtMap);
		MapToMesh(avtMap, materialMap, scene);
	}
	reader.readAsArrayBuffer(blob);
}

function readAvtFromBlob(blob, header, scene){
	var reader = new FileReader();

	// @read zip file.
	var blob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

	var avtMap;
	var avtName = "";
	var imgName = "";
	//var imgList = [];
	var materialMap = new Map();

	reader.onload = function(e){
		var zip = new JSZip(e.target.result);
		var keyList = Object.keys(zip.files);
		//console.log(keyList);
		keyList.forEach(function(value){
			var list = value.split('.');
			var extension = list[list.length-1];

			switch(extension)
			{
			case 'dan':
				avtName = value;
				break;
			case 'png':
			case 'jpg':
				//imgList.push(value);
				imgName = value;
				materialMap.set(imgName, loadAvtMaterial(zip.file(imgName)));
				//console.log(materialMap);
				break;
			default:
			};
		});

		var fileOffset = {Offset: 0};
		var dataView = new DataView(zip.file(avtName).asArrayBuffer());

		//console.log(imgList);
		avtMap = readMap(dataView, fileOffset);
		//console.log(avtMap);
		MapToMesh(avtMap, materialMap, scene);
	}
	reader.readAsArrayBuffer(blob);
}
