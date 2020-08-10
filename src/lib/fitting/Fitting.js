import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import FittingGarment from "./FittingGarment";
import ResizableBody from "./FittingResizableBody";
import { loadZrestForFitting, processAvatarSizingFile } from "./FittingIO";
import { computeBarycentric } from "./FittingBarycentricCoord";
import FittingSkinControllerManager from "./FittingSkinControllerManager";

export default class Fitting {
  constructor({ scene: scene, zrest: zrest }) {
    // NOTE: This is named "list" but actually a map. This name according to the CLO SW.
    this.listSkinController = new Map();

    // NOTE: This map is created by parsing the listSkinController.
    //       Keys are the name of the SkinController. After creating this map, listSkinController is deallocated from memory.
    this.mapSkinController = new Map();

    // Set containers for three.js
    this.scene = scene;
    // this.container = new THREE.Object3D();
    // this.container.name = "fittingContainer";

    this.accessoryContainer = new THREE.Object3D();
    this.accessoryContainer.name = "fittingAccessoryContainer";
    this.scene.add(this.accessoryContainer);

    this.avatarContainer = new THREE.Object3D();
    this.avatarContainer.name = "fittingAvatarContainer";
    this.scene.add(this.avatarContainer);

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
    // this.avatar = new FittingAvatar();

    // this.accessoryContainer = new THREE.Object3D();
    // this.accessory = new FittingAccessory(this.accessoryContainer);

    this.garment = new FittingGarment();
    this.loadZcrp = this.garment.loadZcrp;
    this.loadDrapingSamplingJSON = this.garment.loadSamplingJson;
    this.loadDrapingData = this.garment.loadDrapingData;
    this.loadDrapingDataFromURL = this.garment.loadDrapingDataFromURL;
    this.draping = this.garment.draping;

    this.scManager = new FittingSkinControllerManager(this.zrest);
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
    console.log(this.zrest);

    // TODO: Move this modules into FittingAvatar.js
    const avatarGeometry = new Map(
      this.zrest.zProperty.rootMap.get("mapGeometry")
    );
    const listSkinController = this.loadGeometry({
      mapGeometry: avatarGeometry,
    });
    this.setAvatarInfo(listSkinController);
    const mapSkinController = this.convertListSCtoMap(listSkinController);

    this.scManager.init(this.zrest);
  }

  async loadAvatarResizingData({ sizingURL, accURL }) {
    const retObj = await processAvatarSizingFile({ sizingURL, accURL });
    // console.warn(retObj);
    this.resizableBody = new ResizableBody({
      gender: 0,
      mapBaseMesh: retObj.mapBaseMesh,
      convertingMatData: retObj.convertingMatData,
      mapHeightWeightTo5Sizes: retObj.mapHeightWeightTo5Sizes,
      mapAccessoryMesh: retObj.mapAccessoryMesh,
      scManager: this.scManager,
    });
    this.getSizes = this.resizableBody.getTableSize;
  }

  loadGeometry({ mapGeometry: mapGeometry }) {
    this.extractController(mapGeometry);
    // this.convertListSCtoMap(this.listSkinController);
    return this.listSkinController;
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

  convertListSCtoMap(listSkinController) {
    listSkinController.forEach((sc) => {
      const mapElement = sc.get("mapElement");
      const qsNameUTF8 = mapElement.get("qsNameUTF8");
      const scName = readByteArray("String", qsNameUTF8);

      this.mapSkinController.set(scName, sc);
    });
    listSkinController = [];

    console.log(this.mapSkinController);
    return this.mapSkinController;
  }

  parseSkinControllerUsingABG(skinController) {
    const readData = (type, field) => {
      return this.readBA({
        sc: skinController,
        type: type,
        field: field,
      });
    };

    const demarcationLine = skinController.get("fDemarcationLine");
    const ABGList = readData("Float", "baABGList");
    const triangleIndexList = readData("Uint", "baTriangleIndexList");
    console.log("demarcationLine: " + demarcationLine);

    const mapMesh = skinController.get("mapMesh");
    const meshIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    // const meshPosition = readByteArray("Float", mapMesh.get("baPosition"));
    const vertexCount = mapMesh.get("uiVertexCount");

    if (ABGList.length <= 0) {
      // console.warn("ABGList is empty");
      // console.warn(ABGList);
      return;
    }
    // console.log(skinController);

    const calculatedPosition = computeBarycentric({
      listABG: ABGList,
      listTriangleIndex: triangleIndexList,
      bodyVertexPos: this.bodyVertexPos,
      bodyVertexIndex: this.bodyVertexIndex,
    });

    // console.log("calculatedPosition");
    // console.log(calculatedPosition);

    // Build Mesh
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.addAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(calculatedPosition), 3)
    );
    bufferGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(meshIndex), 1)
    );
    bufferGeometry.computeVertexNormals();
    bufferGeometry.computeFaceNormals();

    return this.buildMesh(bufferGeometry);
  }

  buildMesh(bufferGeometry, material = null) {
    // console.warn("buildMesh");
    const defaultMaterial = new THREE.MeshPhongMaterial({});
    defaultMaterial.color = THREE.Vector3(1, 1, 1);

    // const defaultMaterial = new THREE.PointsMaterial({
    //   color: 0x880000,
    // });
    const threeMaterial = material ? material : defaultMaterial;
    // const threeMesh = new THREE.Points(bufferGeometry, threeMaterial);
    const threeMesh = new THREE.Mesh(bufferGeometry, threeMaterial);
    // console.log(threeMesh);
    // this.container.add(threeMesh);

    return threeMesh;
  }

  readBA({ sc: skinController, type: type, field: field }) {
    return skinController.has(field)
      ? readByteArray(type, skinController.get(field))
      : [];
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
    this.garment.setBody(this.bodyVertexPos, this.bodyVertexIndex);
    // console.log(this.bodyVertexIndex);
    // console.log(this.bodyVertexPos);

    // NOTE: For test only
    // this.buildMeshUsingMapMesh(mapMesh);
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

    if (!computed) return;

    // TODO: CHECK THIS OUT
    // console.warn(computed);
    const v = [];
    computed.forEach((vector) => {
      if (!vector.x || !vector.y || !vector.z) {
        console.warn(vector);
      }
      v.push(vector.x, vector.y, vector.z);
    });
    // console.log(v);
    // this.bodyVertexPos = [
    //   ...computed.map((v) => {
    //     // console.log(v);
    //     return [v.x, v.y, v.z];
    //   }),
    // ];
    // console.log("this.bodyVertexPos");
    // console.log(this.bodyVertexPos);
    // console.log(this.resizableBody.mBaseVertex);
    // this.resizableBody.mBaseVertex = computed;
    const l = this.bodyVertexPos.length;
    const nb = v.slice(0, l);
    this.bodyVertexPos = nb.map((x) => x * 10);
    // const bv = [];

    // const bufferGeometry = new THREE.BufferGeometry();
    if (this.resizableBufferGeometry) this.resizableBufferGeometry.dispose();
    this.resizableBufferGeometry = new THREE.BufferGeometry();

    // const m = 10.0;
    // computed.forEach((vertex) => {
    //   // this.bodyVertexPos.forEach((vertex) => {
    //   bv.push(vertex.x * m, vertex.y * m, vertex.z * m);
    // });

    for (const entries of this.resizableBody.mapStartIndex.entries()) {
      const partName = entries[0];
      const partRenderPos = this.resizableBody.updateRenderPositionFromPhysical(
        partName,
        computed
      );
      // console.warn(partName);
      // console.log(v);
      this.resizableBody.scManager.putVertexOnMatMeshByPartName(
        partName,
        partRenderPos
      );
    }
  }

  resizeAccessory() {
    this.buildAvatarUsingSC(this.mapSkinController);
    // this.accessoryContainer.dispose();
    // this.accessoryContainer.children = [];

    for (const entries of this.mapSkinMesh.entries()) {
      const partName = entries[0];
      const phyPos = this.mapSkinMesh.get(partName).geometry.attributes.position
        .array;

      const phyPosVec3 = this.resizableBody.convertFloatArrayToVec3Array(
        phyPos
      );
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
      // console.log(listMatMesh);
      this.accessoryContainer.add(...listMatMesh);
      console.log(this.accessoryContainer);
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
        // console.log(id);
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
