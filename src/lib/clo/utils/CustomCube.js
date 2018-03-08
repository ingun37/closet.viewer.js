//Cube Mesh
function createTextureCube(texture){
	if(texture instanceof THREE.Texture == false)
		return null;

 	var quadGeometry = new THREE.Geometry();
    quadGeometry.vertices.push(new THREE.Vector3(-100, 100, 0));
    quadGeometry.vertices.push(new THREE.Vector3(100, 100, 0));
    quadGeometry.vertices.push(new THREE.Vector3(100, -100, 0));
    quadGeometry.vertices.push(new THREE.Vector3(-100, -100, 0));

    quadGeometry.vertices.push(new THREE.Vector3(-100, 100, 200));
    quadGeometry.vertices.push(new THREE.Vector3(100, 100, 200));
    quadGeometry.vertices.push(new THREE.Vector3(100, -100, 200));
    quadGeometry.vertices.push(new THREE.Vector3(-100, -100, 200));

    quadGeometry.faces.push(new THREE.Face3(0, 1, 2));
    quadGeometry.faces.push(new THREE.Face3(0, 2, 3));

    quadGeometry.faces.push(new THREE.Face3(4, 5, 6));
    quadGeometry.faces.push(new THREE.Face3(4, 6, 7));

    quadGeometry.faces.push(new THREE.Face3(0, 3, 7));
    quadGeometry.faces.push(new THREE.Face3(0, 7, 4));

    quadGeometry.faces.push(new THREE.Face3(0, 1, 5));
    quadGeometry.faces.push(new THREE.Face3(0, 5, 4));

    quadGeometry.faces.push(new THREE.Face3(1, 2, 6));
    quadGeometry.faces.push(new THREE.Face3(1, 6, 5));

    quadGeometry.faces.push(new THREE.Face3(3, 2, 6));
    quadGeometry.faces.push(new THREE.Face3(3, 6, 7));

    var a = new THREE.Vector2(0,0);
    var b = new THREE.Vector2(1,0);
    var c = new THREE.Vector2(1,1);
    var d = new THREE.Vector2(0,1);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);
    
    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);


    quadGeometry.computeFaceNormals();
    quadGeometry.computeBoundingSphere();
    var quadMaterial = new THREE.MeshLambertMaterial({map: texture});

    quadMesh = new THREE.Mesh(quadGeometry, quadMaterial);
    quadMesh.traverse(function(node){
      if(node.material){
        node.material.side = THREE.DoubleSide;
      }
    })
    return quadMesh;
}

function createMaterialCube(material){
    if(material instanceof THREE.Material == false)
        return null;

    var quadGeometry = new THREE.Geometry();
    quadGeometry.vertices.push(new THREE.Vector3(-100, 100, 0));
    quadGeometry.vertices.push(new THREE.Vector3(100, 100, 0));
    quadGeometry.vertices.push(new THREE.Vector3(100, -100, 0));
    quadGeometry.vertices.push(new THREE.Vector3(-100, -100, 0));

    quadGeometry.vertices.push(new THREE.Vector3(-100, 100, 200));
    quadGeometry.vertices.push(new THREE.Vector3(100, 100, 200));
    quadGeometry.vertices.push(new THREE.Vector3(100, -100, 200));
    quadGeometry.vertices.push(new THREE.Vector3(-100, -100, 200));

    quadGeometry.faces.push(new THREE.Face3(0, 1, 2));
    quadGeometry.faces.push(new THREE.Face3(0, 2, 3));

    quadGeometry.faces.push(new THREE.Face3(4, 5, 6));
    quadGeometry.faces.push(new THREE.Face3(4, 6, 7));

    quadGeometry.faces.push(new THREE.Face3(0, 3, 7));
    quadGeometry.faces.push(new THREE.Face3(0, 7, 4));

    quadGeometry.faces.push(new THREE.Face3(0, 1, 5));
    quadGeometry.faces.push(new THREE.Face3(0, 5, 4));

    quadGeometry.faces.push(new THREE.Face3(1, 2, 6));
    quadGeometry.faces.push(new THREE.Face3(1, 6, 5));

    quadGeometry.faces.push(new THREE.Face3(3, 2, 6));
    quadGeometry.faces.push(new THREE.Face3(3, 6, 7));

    var a = new THREE.Vector2(0,0);
    var b = new THREE.Vector2(1,0);
    var c = new THREE.Vector2(1,1);
    var d = new THREE.Vector2(0,1);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);
    
    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);


    quadGeometry.computeFaceNormals();
    quadGeometry.computeBoundingSphere();

    quadMesh = new THREE.Mesh(quadGeometry, material);
    quadMesh.traverse(function(node){
      if(node.material){
        node.material.side = THREE.DoubleSide;
      }
    })
    return quadMesh;
}


function createMaterialEdgeCube(length, material){
    if(material instanceof THREE.Material == false)
        return null;

    var quadGeometry = new THREE.Geometry();
    quadGeometry.vertices.push(new THREE.Vector3(-length, length, 0));
    quadGeometry.vertices.push(new THREE.Vector3(length, length, 0));
    quadGeometry.vertices.push(new THREE.Vector3(length, -length, 0));
    quadGeometry.vertices.push(new THREE.Vector3(-length, -length, 0));

    quadGeometry.vertices.push(new THREE.Vector3(-length, length, 2 * length));
    quadGeometry.vertices.push(new THREE.Vector3(length, length, 2 * length));
    quadGeometry.vertices.push(new THREE.Vector3(length, -length, 2 * length));
    quadGeometry.vertices.push(new THREE.Vector3(-length, -length, 2 * length));

    quadGeometry.faces.push(new THREE.Face3(0, 1, 2));
    quadGeometry.faces.push(new THREE.Face3(0, 2, 3));

    quadGeometry.faces.push(new THREE.Face3(4, 5, 6));
    quadGeometry.faces.push(new THREE.Face3(4, 6, 7));

    quadGeometry.faces.push(new THREE.Face3(0, 3, 7));
    quadGeometry.faces.push(new THREE.Face3(0, 7, 4));

    quadGeometry.faces.push(new THREE.Face3(0, 1, 5));
    quadGeometry.faces.push(new THREE.Face3(0, 5, 4));

    quadGeometry.faces.push(new THREE.Face3(1, 2, 6));
    quadGeometry.faces.push(new THREE.Face3(1, 6, 5));

    quadGeometry.faces.push(new THREE.Face3(3, 2, 6));
    quadGeometry.faces.push(new THREE.Face3(3, 6, 7));

    var a = new THREE.Vector2(0,0);
    var b = new THREE.Vector2(1,0);
    var c = new THREE.Vector2(1,1);
    var d = new THREE.Vector2(0,1);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);

    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);
    
    quadGeometry.faceVertexUvs[0].push([a, b, c]);
    quadGeometry.faceVertexUvs[0].push([a, c, d]);


    quadGeometry.computeFaceNormals();
    quadGeometry.computeBoundingSphere();

    quadMesh = new THREE.Mesh(quadGeometry, material);
    quadMesh.traverse(function(node){
      if(node.material){
        node.material.side = THREE.DoubleSide;
      }
    })
    return quadMesh;
}