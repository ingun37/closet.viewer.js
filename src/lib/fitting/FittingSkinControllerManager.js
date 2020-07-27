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
      // console.log("\t\t" + partName + " =+ " + vertex.length / 3);
      // const vertex = matMesh.userData.originalPos;
      combinedVertex.push(...vertex);
    });

    return combinedVertex;
  };

  putVertexOnMatMeshByPartName = (partName, vertex) => {
    const combinedVertex = this.getVertexOnMatMeshByPartName(partName);
    if (vertex.length != combinedVertex.length) {
      console.warn("FAILED");
      return;
    }

    let lastIndex = 0;
    this.mapSCMatMeshID.get(partName).forEach((matMeshId) => {
      const matMesh = this.mapMatMesh.get(matMeshId);
      console.log(matMesh);
      const vertexArr = matMesh.geometry.attributes.position.array;
      const vertexSize = vertexArr.length;

      const slicedVertexArr = new Float32Array(
        vertex.slice(lastIndex, lastIndex + vertexSize)
      );
      // TODO: Find better way
      for (let j = 0; j < vertexArr.length; ++j) {
        vertexArr[j] = slicedVertexArr[j];
      }
      lastIndex += vertexSize;
    });
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

  // getMesh(matMeshID) {}
}
