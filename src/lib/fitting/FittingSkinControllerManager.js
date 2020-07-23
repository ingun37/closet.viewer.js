export default class FittingSkinControllerManager {
  constructor() {
    this.mapSCMatMeshID = null;
    this.mapMatMesh = null;
  }

  init(zrest) {
    this.mapSCMatMeshID = zrest.meshFactory.matmeshManager.mapSCMatmeshID;
    this.mapMatMesh = zrest.zProperty.matMeshMap;

    console.log(zrest);
    console.log(zrest.meshFactory.matmeshManager.mapSCMatmeshID);
    console.log(zrest.matMeshMap);
  }

  getVertexByPartName = (partName) => {
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

  validate = (mapMatshapeRenderToSkinPos) => {
    for (const entries of mapMatshapeRenderToSkinPos.entries()) {
      // console.log(entries);
      const partName = entries[0];
      const uiVertexCount = entries[1].get("uiVertexCount");
      const zrestVertexCount = this.getVertexByPartName(partName).length / 3;

      if (uiVertexCount !== zrestVertexCount) return false;
    }
    return true;
  };

  // getMesh(matMeshID) {}
}
