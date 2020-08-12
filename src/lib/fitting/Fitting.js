import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import FittingGarment from "./FittingGarment";
import FittingAvatar from "./FittingAvatar";
import ResizableBody from "./FittingResizableBody";
import { loadZrestForFitting, processAvatarSizingFile } from "./FittingIO";
import { computeBarycentric } from "./FittingBarycentricCoord";
import FittingSkinControllerManager from "./FittingSkinControllerManager";

export default class Fitting {
  constructor({ scene: scene, zrest: zrest }) {
    // Set containers for three.js
    this.scene = scene;
    this.container = new THREE.Object3D();
    this.container.name = "fittingContainer";
    this.scene.add(this.container);

    // this.mapTriangleIdx = new Map();

    this.listPositions = [];
    this.listAvatarMesh = [];
    this.listAvatarMeshIdx = [];
    this.bodySkinController = null;
    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];

    this.processAvatarSizingFile = processAvatarSizingFile;
    this.getSizes = () => {
      return null;
    };

    this.resizableBody = null;
    this.avatarId = 0;
    this.avatarSkinType = 0;

    this.zrest = zrest;
    this.avatar = null;

    this.garment = new FittingGarment();
    this.loadZcrp = this.garment.loadZcrp;
    this.loadDrapingSamplingJSON = this.garment.loadSamplingJson;
    this.loadDrapingData = this.garment.loadDrapingData;
    this.loadDrapingDataFromURL = this.garment.loadDrapingDataFromURL;
    this.draping = this.garment.draping;
  }

  async loadResizableAvatar({ avatarURL, sizingURL, accURL }) {
    await this.loadAvatar({ url: avatarURL });
    await this.loadAvatarResizingData({ sizingURL, accURL });
  }

  async loadAvatar({ url, onProgress, onLoad }) {
    // TODO: Error when calling repeatedly. Fix it.
    this.zrest.clear();
    await loadZrestForFitting({
      url: url,
      funcOnProgress: onProgress,
      funcOnLoad: onLoad,
      zrest: this.zrest,
      isAvatar: true,
    });

    this.avatar = new FittingAvatar(this.container, this.zrest);
    this.avatar.init();

    // // TODO: Move this modules into FittingAvatar.js
    // const avatarGeometry = new Map(
    //   this.zrest.zProperty.rootMap.get("mapGeometry")
    // );
    // const listSkinController = this.loadGeometry({
    //   mapGeometry: avatarGeometry,
    // });
    // this.setAvatarInfo(listSkinController);
    // const mapSkinController = this.convertListSCtoMap(listSkinController);

    // this.scManager.init(this.zrest);
  }

  async loadAvatarResizingData({ sizingURL, accURL }) {
    const avatarSizingInfoObj = await processAvatarSizingFile({
      sizingURL,
      accURL,
    });
    this.avatar.initResizableBodyWithAcc(avatarSizingInfoObj);

    // this.accessoryContainer = new THREE.Object3D();
    // this.accessoryContainer.name = "fittingAccessoryContainer";
    // this.scene.add(this.accessoryContainer);

    // this.avatarContainer = new THREE.Object3D();
    // this.avatarContainer.name = "fittingAvatarContainer";
    // this.scene.add(this.avatarContainer);

    // console.warn(retObj);
    // this.resizableBody = new ResizableBody({
    //   gender: 0,
    //   mapBaseMesh: retObj.mapBaseMesh,
    //   convertingMatData: retObj.convertingMatData,
    //   mapHeightWeightTo5Sizes: retObj.mapHeightWeightTo5Sizes,
    //   mapAccessoryMesh: retObj.mapAccessoryMesh,
    //   scManager: this.scManager,
    // });
    // this.getSizes = this.resizableBody.getTableSize;
  }

  async resizeAvatar({
    height,
    weight,
    bodyShape,
    chest = -1,
    waist = -1,
    hip = -1,
    armLength = -1,
    legLength = -1,
  }) {
    if (!this.avatar) return;
    this.avatar.resize({
      height,
      weight,
      bodyShape,
      chest,
      waist,
      hip,
      armLength,
      legLength,
    });
  }

  resizeAccessory() {
    if (!this.avatar) return;
    this.avatar.resizeAccessory();
  }

  // async resizeAvatar({
  //   height,
  //   weight,
  //   bodyShape,
  //   chest = -1,
  //   waist = -1,
  //   hip = -1,
  //   armLength = -1,
  //   legLength = -1,
  // }) {
  //   const computed = this.resizableBody.computeResizing(
  //     height,
  //     weight,
  //     bodyShape,
  //     chest,
  //     waist,
  //     hip,
  //     armLength,
  //     legLength
  //   );
  //
  //   if (!computed) return;
  //
  //   // TODO: CHECK THIS OUT
  //   // console.warn(computed);
  //   const v = [];
  //   computed.forEach((vector) => {
  //     if (!vector.x || !vector.y || !vector.z) {
  //       console.warn(vector);
  //     }
  //     v.push(vector.x, vector.y, vector.z);
  //   });
  //   // console.log(v);
  //   // this.bodyVertexPos = [
  //   //   ...computed.map((v) => {
  //   //     // console.log(v);
  //   //     return [v.x, v.y, v.z];
  //   //   }),
  //   // ];
  //   // console.log("this.bodyVertexPos");
  //   // console.log(this.bodyVertexPos);
  //   // console.log(this.resizableBody.mBaseVertex);
  //   // this.resizableBody.mBaseVertex = computed;
  //   const l = this.bodyVertexPos.length;
  //   const nb = v.slice(0, l);
  //   this.bodyVertexPos = nb.map((x) => x * 10);
  //   // const bv = [];
  //
  //   // const bufferGeometry = new THREE.BufferGeometry();
  //   if (this.resizableBufferGeometry) this.resizableBufferGeometry.dispose();
  //   this.resizableBufferGeometry = new THREE.BufferGeometry();
  //
  //   // const m = 10.0;
  //   // computed.forEach((vertex) => {
  //   //   // this.bodyVertexPos.forEach((vertex) => {
  //   //   bv.push(vertex.x * m, vertex.y * m, vertex.z * m);
  //   // });
  //
  //   for (const entries of this.resizableBody.mapStartIndex.entries()) {
  //     const partName = entries[0];
  //     const partRenderPos = this.resizableBody.updateRenderPositionFromPhysical(
  //       partName,
  //       computed
  //     );
  //     // console.warn(partName);
  //     // console.log(v);
  //     this.resizableBody.scManager.putVertexOnMatMeshByPartName(
  //       partName,
  //       partRenderPos
  //     );
  //   }
  // }

  // resizeAccessory() {
  //   this.buildAvatarUsingSC(this.mapSkinController);
  //   // this.accessoryContainer.dispose();
  //   // this.accessoryContainer.children = [];
  //
  //   for (const entries of this.mapSkinMesh.entries()) {
  //     const partName = entries[0];
  //     const phyPos = this.mapSkinMesh.get(partName).geometry.attributes.position
  //       .array;
  //
  //     const phyPosVec3 = this.resizableBody.convertFloatArrayToVec3Array(
  //       phyPos
  //     );
  //     const renderToSkinPos = this.resizableBody.mapAccessoryMSRenderToSkinPos
  //       .get(partName)
  //       .get("renderToSkinPos");
  //     // console.log(renderToSkinPos);
  //     const renderPos = this.resizableBody.updateRenderPositionFromPhysical2(
  //       phyPosVec3,
  //       renderToSkinPos
  //       // invMatrixWorld
  //     );
  //     // console.log(renderPos);
  //     // console.log("renderPos.length: " + renderPos.length);
  //     const listMatMesh = this.scManager.putVertexOnMatMeshByPartName(
  //       partName,
  //       renderPos
  //     );
  //     // console.log(listMatMesh);
  //     this.accessoryContainer.add(...listMatMesh);
  //     console.log(this.accessoryContainer);
  //   }
  // }
  //
  // buildAvatarUsingSC(mapSkinController) {
  //   this.mapSkinMesh = new Map();
  //   for (const entries of mapSkinController) {
  //     const id = entries[0];
  //     const sc = entries[1];
  //     // const mapMesh = entries[1].get("mapMesh");
  //     // const mesh = this.buildMeshUsingMapMesh(mapMesh);
  //     // this.mapSkinMesh.set(id, mesh);
  //     // this.mapSkinMesh.set(id, mapMesh);
  //     // console.log(this.buildMeshUsingMapMesh(mapMesh));
  //
  //     if (id !== "body" && id !== "body_Shape") {
  //       // console.log(id);
  //       const mesh = this.parseSkinControllerUsingABG(sc);
  //
  //       // TODO: FIX THIS
  //       if (mesh) {
  //         // console.log(mesh);
  //         // this.scManager.putVertexOnMatMeshByPartName(
  //         //   id,
  //         //   v
  //         // mesh.userData.originalPos
  //         //mesh.geometry.attributes.position.array
  //         // );
  //         this.mapSkinMesh.set(id, mesh);
  //       }
  //     }
  //     // else console.warn(id);
  //   }
  //   // console.log(this.mapSkinMesh);
  // }
}
