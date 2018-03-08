function createPipingMeshList(geometryList, materialList){
	ret_container = new THREE.Object3D;
	ret_container.name = "3D_Pattern";

	var material = null; // = new THREE.MeshPhongMaterial({color: new THREE.Color(15/255, 35/255, 109/255).getHex(), side: THREE.DoubleSide});
	
	for(var i = 0 ; i < geometryList.length ; ++i)
	{
		var index = geometryList[i].Data.FabricIndex;
		material = materialList[index][0];
		//console.log(material);

		var mesh = createPattern(geometryList[i].Data, material);
		mesh.userData = {_rotation: new THREE.Matrix4(), _translation: new THREE.Matrix4()};
		_globalMeshInformation.piping.push({_fabricIndex: index, _mesh: mesh});
		ret_container.add(mesh);
	}

	return ret_container;
}