import * as THREE from "@/lib/threejs/three";

export default class FittingSkinControllerManager {
  constructor() {
    this.mapSCMatMeshID = null;
    this.mapMatMesh = null;
  }

  init(zrest) {
    this.mapSCMatMeshID = zrest.meshFactory.matmeshManager.mapSCMatmeshID;
    this.mapMatMesh = zrest.zProperty.matMeshMap;

    // console.log(zrest);
    console.log(zrest.meshFactory.matmeshManager.mapSCMatmeshID);
    console.log(zrest.matMeshMap);
  }

  getVertexOnMatMeshByPartName = (partName) => {
    const combinedVertex = [];
    this.mapSCMatMeshID.get(partName).forEach((matMeshId) => {
      const matMesh = this.mapMatMesh.get(matMeshId);
      const vertex = matMesh.geometry.attributes.position.array;
      // const vertex = matMesh.userData.originalPos;

      // console.log("compare");
      // console.log(matMesh.geometry.attributes.position.array);
      // console.log(matMesh.userData.originalPos);

      // console.log("\t\t" + partName + " =+ " + vertex.length / 3);
      // const vertex = matMesh.userData.originalPos;
      // console.log(vertex);

      // console.log(partName + ": " + vertex.length);
      vertex.forEach((v) => combinedVertex.push(v));
      // combinedVertex.push(...vertex);
    });

    return combinedVertex;
  };

  // getInvMatrixWorld = (partName) => {
  //   const matMeshId = this.mapSCMatMeshID.get(partName)[0];
  //   const matMesh = this.mapMatMesh.get(matMeshId);
  //   const matrixWorld = matMesh.matrixWorld;
  //   // console.log(matrixWorld);
  //   // const invMatrixWorld = new THREE.Matrix4().getInverse(matrixWorld);
  //   // console.log(invMatrixWorld);

  //   // return invMatrixWorld;
  //   return matrixWorld;
  // };

  putVertexOnMatMeshByPartName = (partName, partRenderPos) => {
    // prettier-ignore
    const combinedVertex = this.getVertexOnMatMeshByPartName(partName);
    console.log(partRenderPos.length + " ===== " + combinedVertex.length);
    if (partRenderPos.length != combinedVertex.length) {
      console.warn("FAILED: " + partName);
      // console.log(partRenderPos.length + " != " + combinedVertex.length);
      // console.log(partRenderPos);
      // console.log(combinedVertex);
      return;
    }

    let lastIndex = 0;
    const retListMatMesh = [];
    this.mapSCMatMeshID.get(partName).forEach((matMeshId) => {
      const matMesh = this.mapMatMesh.get(matMeshId);
      retListMatMesh.push(matMesh);

      const vertexArr = matMesh.geometry.attributes.position.array;
      const vertexSize = vertexArr.length;
      matMesh.geometry.attributes.position.needsUpdate = true;

      const slicedVertexArr = new Float32Array(
        partRenderPos.slice(lastIndex, lastIndex + vertexSize)
      );

      // TODO: Find better way
      for (let j = 0; j < vertexArr.length; ++j) {
        vertexArr[j] = slicedVertexArr[j];
      }
      lastIndex += vertexSize;
    });

    return retListMatMesh;
  };

  validate = (mapMatshapeRenderToSkinPos) => {
    for (const entries of mapMatshapeRenderToSkinPos.entries()) {
      const partName = entries[0];
      const uiVertexCount = entries[1].get("uiVertexCount");
      const zrestVertexCount =
        this.getVertexOnMatMeshByPartName(partName).length / 3;

      if (uiVertexCount !== zrestVertexCount) return false;
    }
    return true;
  };
}
