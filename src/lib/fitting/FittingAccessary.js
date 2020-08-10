export default class FittingAccessory {
  constructor(threejsContainer) {
    this.container = threejsContainer;
    this.container.name = "fittingAccessoryContainer";
    this.container.children = [];
  }

  dispose() {}

  resizing() {
    this.buildAvatarUsingSC(this.mapSkinController);
    // this.accessoryContainer.dispose();
    this.container.children = [];

    for (const entries of this.mapSkinMesh.entries()) {
      // for (const entries of this.scManager.) {
      const partName = entries[0];
      // const partName = "hair_Shape";
      // const combined = this.scManager.getVertexOnMatMeshByPartName(partName);
      // const invMatrixWorld = this.scManager.getInvMatrixWorld(partName);
      // console.log(invMatrixWorld);
      // console.log(partName + " =====================");
      // console.log("combined.length: " + combined.length);
      const phyPos = this.mapSkinMesh.get(partName).geometry.attributes.position
        .array;

      // console.log(phyPos);
      // console.log("phyPos.length: " + phyPos.length);
      const phyPosVec3 = this.resizableBody.convertFloatArrayToVec3Array(
        // combined
        phyPos
      );
      // console.log(phyPosVec3);
      const renderToSkinPos = this.resizableBody.mapAccessoryMSRenderToSkinPos
        .get(partName)
        .get("renderToSkinPos");
      // console.log(renderToSkinPos);
      const renderPos = this.resizableBody.updateRenderPositionFromPhysical2(
        phyPosVec3,
        renderToSkinPos
        // invMatrixWorld
      );
      // console.log(renderPos);
      // console.log("renderPos.length: " + renderPos.length);
      const listMatMesh = this.scManager.putVertexOnMatMeshByPartName(
        partName,
        renderPos
      );
      this.accessoryContainer.add(...listMatMesh);
    }
  }

  buildAvatarUsingSC(mapSkinController) {
    this.mapSkinMesh = new Map();
    for (const entries of mapSkinController) {
      const id = entries[0];
      const sc = entries[1];
      // const mapMesh = entries[1].get("mapMesh");
      // const mesh = this.buildMeshUsingMapMesh(mapMesh);
      // this.mapSkinMesh.set(id, mesh);
      // this.mapSkinMesh.set(id, mapMesh);
      // console.log(this.buildMeshUsingMapMesh(mapMesh));

      if (id !== "body" && id !== "body_Shape") {
        console.log(id);
        const mesh = this.parseSkinControllerUsingABG(sc);

        // TODO: FIX THIS
        if (mesh) {
          // console.log(mesh);
          // this.scManager.putVertexOnMatMeshByPartName(
          //   id,
          //   v
          // mesh.userData.originalPos
          //mesh.geometry.attributes.position.array
          // );
          this.mapSkinMesh.set(id, mesh);
        }
      }
      // else console.warn(id);
    }
    // console.log(this.mapSkinMesh);
  }
}
