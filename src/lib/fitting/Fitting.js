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
    // this.container.name = "fittingContainer";
    // this.scene.add(this.container);
    zrest.addThreeContainerUniquely(this.container, "fittingContainer");

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
    this.loadDrapingSamplingJSON = ({
      rootPath,
      height,
      weight,
      mapMatMesh,
    }) => {
      return this.garment.loadSamplingJson({
        rootPath,
        height,
        weight,
        mapMatMesh,
      });
    };
    // this.loadDrapingData = ({ rootPath, height, weight }) => {
    //   const mapMatMesh = this.zrest.matMeshMap;
    //   console.log(mapMatMesh);
    //   return this.garment.loadDrapingData({
    //     rootPath,
    //     height,
    //     weight,
    //     mapMatMesh: mapMatMesh,
    //   });
    // };
    this.loadDrapingDataFromURL = this.garment.loadDrapingDataFromURL;
    // this.draping = this.garment.draping;
  }

  async loadResizableAvatar({ avatarURL, sizingURL, accURL }) {
    console.log("\t++loadAvatar");
    await this.loadAvatar({ url: avatarURL });
    console.log("\t--loadAvatar");
    console.log("\t++loadAvatarResizingData");
    await this.loadAvatarResizingData({ sizingURL, accURL });
    console.log("\t--loadAvatarResizingData");
  }

  async loadAvatar({ url, onProgress, onLoad }) {
    // TODO: Error when calling repeatedly. Fix it.
    // this.zrest.clear();
    await loadZrestForFitting({
      url: url,
      funcOnProgress: onProgress,
      funcOnLoad: onLoad,
      zrest: this.zrest,
      isAvatar: true,
    });

    this.avatar = new FittingAvatar(this.container, this.zrest);
    this.avatar.init();
  }

  async loadAvatarResizingData({ sizingURL, accURL }) {
    console.log("\t\t++processAvatarSizingFile");
    const avatarSizingInfoObj = await processAvatarSizingFile({
      sizingURL,
      accURL,
    });
    console.log("\t\t--processAvatarSizingFile");
    console.log("\t\t++initResizableBodyWithAcc");
    this.avatar.initResizableBodyWithAcc(avatarSizingInfoObj);
    console.log("\t\t--initResizableBodyWithAcc");
  }

  async resizeAvatarWithAcc({
    height,
    weight,
    bodyShape,
    chest = -1,
    waist = -1,
    hip = -1,
    armLength = -1,
    legLength = -1,
  }) {
    console.log({
      height,
      weight,
      bodyShape,
    });
    await this.resizeAvatar({
      height,
      weight,
      bodyShape,
      chest,
      waist,
      hip,
      armLength,
      legLength,
    });
    await this.resizeAccessory();
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

  async loadGarmentData({ garmentURL, samplingURL }) {
    console.log("+ loadGarment");
    await this.loadGarment({ url: garmentURL, onProgress: null, onLoad: null });
    console.log("- loadGarment");
    this.garment.setBody(
      this.avatar.bodyVertexPos,
      this.avatar.bodyVertexIndex
    );
    // console.log(this.avatar.bodyVertexPos, this.avatar.bodyVertexIndex);
    //this.avatar.get
    console.log("+ loadSamplingJson");
    await this.garment.loadSamplingJson({
      jsonURL: samplingURL,
    });
    console.log("- loadSamplingJson");
    // await loadZrestForFitting({
    //   url: garmentURL,
    //   //   // url:
    //   //   //   "https://files.clo-set.com/public/fitting/4decc245ab5f4ec7bd0687a94e7ec8e8/1/0/0/garment.zrest",
    //   //   // funcOnProgress: onProgress,
    //   funcOnLoad: null,
    //   isAvatar: false,
    // });
  }

  async loadGarment({ url, onProgress, onLoad }) {
    // TODO: Error when calling repeatedly. Fix it.
    // this.zrest.clear();
    await loadZrestForFitting({
      url: url,
      // funcOnProgress: onProgress,
      // funcOnLoad: onLoad,
      zrest: this.zrest,
      isAvatar: false,
    });
  }

  async drapingUsingZcrpURL({ zcrpURL }) {
    await this.garment.loadZcrp(zcrpURL);
    // { listBarycentricCoord, mapMatMesh }
    const listBarycentricCoord = this.garment.listBarycentricCoord;
    const mapMatMesh = this.zrest.matMeshMap;
    this.garment.draping({ listBarycentricCoord, mapMatMesh });
  }
}
