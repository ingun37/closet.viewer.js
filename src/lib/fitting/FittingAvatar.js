import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import FittingSkinControllerManager from "@/lib/fitting/FittingSkinControllerManager";
import ResizableBody from "@/lib/fitting/FittingResizableBody";
import Accessory from "@/lib/fitting/FittingAccessory";
import FittingAccessory from "@/lib/fitting/FittingAccessory";

export default class FittingAvatar {
  constructor(container, zrest) {
    this.parentContainer = container;
    this.zrest = zrest;

    // NOTE: This is named "list" but actually a map. This name according to the CLO SW.
    // this.listSkinController = new Map();

    // NOTE: This map is created by parsing the listSkinController.
    //       Keys are the name of the SkinController. After creating this map, listSkinController is deallocated from memory.
    // this.mapSkinController = new Map();

    this.avatarContainer = null;
    // this.accessoryContainer = null;

    this.accessory = null;

    // this.scManager = new FittingSkinControllerManager(this.zrest);
    this.resizableBody = null;
    this.scManager = null;

    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];
  }

  init() {
    if (!this.zrest) return;

    const arrFoundContainer = this.parentContainer.children.filter(
      (obj) => obj.name === "fittingAvatarContainer"
    );

    if (arrFoundContainer.length <= 0) {
      console.error("FittingAvatar init failed.");
    }

    this.avatarContainer = arrFoundContainer[0];

    const avatarGeometry = new Map(
      this.zrest.zProperty.rootMap.get("mapGeometry")
    );
    const listSkinController = this.loadGeometry({
      mapGeometry: avatarGeometry,
    });
    this.setAvatarInfo(listSkinController);

    this.scManager = new FittingSkinControllerManager(this.zrest);
    this.scManager.init(this.zrest);

    this.accessory = new FittingAccessory(listSkinController, this.scManager);
    this.accessory.attachThreeJSContainer(this.parentContainer);
    this.accessory.putBodyVertexInfo(this.bodyVertexPos, this.bodyVertexIndex);

    // this.mapSkinController = this.convertListSCtoMap(listSkinController);
    // console.warn("mapSkinController");
    // console.warn(this.mapSkinController)
  }

  // Init resizable body and accessory
  initResizableBodyWithAcc(avatarSizingInfoObj) {
    this.resizableBody = new ResizableBody({
      gender: 0,
      mapBaseMesh: avatarSizingInfoObj.mapBaseMesh,
      convertingMatData: avatarSizingInfoObj.convertingMatData,
      mapHeightWeightTo5Sizes: avatarSizingInfoObj.mapHeightWeightTo5Sizes,
      mapAccessoryMesh: avatarSizingInfoObj.mapAccessoryMesh,
      scManager: this.scManager,
    });

    // TODO: Move this module to the proper position.
    this.accessory.putMeshInfo(avatarSizingInfoObj.mapAccessoryMesh);
  }

  async resize({
    height,
    weight,
    bodyShape,
    chest = -1,
    waist = -1,
    hip = -1,
    armLength = -1,
    legLength = -1,
  }) {
    const computed = this.resizableBody.computeResizing(
      height,
      weight,
      bodyShape,
      chest,
      waist,
      hip,
      armLength,
      legLength
    );

    // TODO: CHECK THIS OUT
    // console.warn(computed);
    const v = [];

    console.log(computed);
    computed.forEach((vector) => {
      if (!vector.x || !vector.y || !vector.z) {
        console.warn(vector);
      }
      v.push(vector.x, vector.y, vector.z);
    });

    const l = this.bodyVertexPos.length;
    const nb = v.slice(0, l);
    this.bodyVertexPos = nb.map((x) => x * 10);
    // const bv = [];

    // const bufferGeometry = new THREE.BufferGeometry();
    if (this.resizableBufferGeometry) this.resizableBufferGeometry.dispose();
    this.resizableBufferGeometry = new THREE.BufferGeometry();

    for (const entries of this.resizableBody.mapStartIndex.entries()) {
      const partName = entries[0];
      const partRenderPos = this.resizableBody.updateRenderPositionFromPhysical(
        partName,
        computed
      );
      console.log("\t\t++" + partName);
      // console.log(v);
      this.resizableBody.scManager.putVertexOnMatMeshByPartName(
        partName,
        partRenderPos
      );
    }
  }

  resizeAccessory() {
    if (this.resizeAccessory) {
      this.accessory.putBodyVertexInfo(
        this.bodyVertexPos,
        this.bodyVertexIndex
      );
      this.accessory.resize();
    }
    // else console.warn("Can't access accessory");
  }

  getAvatarURL({ id: avatarId, skinType: avatarSkinType }) {
    this.avatarId = avatarId;

    const listById = this.mapAvtPath.get(avatarId);
    const zrestFileName = listById[avatarSkinType];
    const avtURL = this.avtRootPath + "/" + zrestFileName;
    console.log(avtURL);
    return avtURL;
  }

  loadGeometry({ mapGeometry: mapGeometry }) {
    this.extractController(mapGeometry);
    // this.convertListSCtoMap(this.listSkinController);
    return this.listSkinController;
  }

  setAvatarInfo(listSkinController) {
    const bodySkinController = this.findBodySkinController(listSkinController);
    console.log("bodySkin is");
    console.log(bodySkinController);
    this.bodySkinController = bodySkinController;

    const mapMesh = bodySkinController.get("mapMesh");
    const meshIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    const meshPosition = readByteArray("Float", mapMesh.get("baPosition"));
    this.bodyVertexIndex = meshIndex;
    this.bodyVertexPos = meshPosition;

    // TODO: Set this function correctly
    // this.garment.setBody(this.bodyVertexPos, this.bodyVertexIndex);

    // NOTE: For test only
    // this.avatar.buildMeshUsingMapMesh(mapMesh);
  }

  // TODO: Refactor this module
  extractController(mapInput) {
    const shouldRecursive = (element) => {
      return (
        element instanceof Map &&
        element.has("listChildrenTransformer3D") &&
        element.get("listChildrenTransformer3D") != null
      );
    };

    if (shouldRecursive(mapInput)) {
      this.extractController(mapInput.get("listChildrenTransformer3D"));
    } else {
      mapInput.forEach((inputElement) => {
        if (shouldRecursive(inputElement)) {
          return this.extractController(inputElement);
        }
        if (inputElement.has("listSkinController")) {
          console.log(inputElement);
          console.log(inputElement.get("listSkinController"));
          this.listSkinController = inputElement.get("listSkinController");
        }
      });
    }
  }

  findBodySkinController(listSkinController) {
    let largestSC = null;
    let largestLength = 0;
    listSkinController.forEach((sc) => {
      if (sc.has("baInitPosition")) {
        const length = sc.get("baInitPosition").byteLength;
        if (largestLength < length) {
          largestLength = length;
          largestSC = sc;
        }
      }
    });

    return largestSC;
  }
}
