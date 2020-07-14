import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import FittingGarment from "./FittingGarment";
import { loadJson } from "@/lib/clo/readers/FileLoader";
import { getGarmentFileName } from "@/lib/clo/utils/UtilFunctions";
import ResizableBody from "./AvatarSizing";
import { loadZrestForFitting, processAvatarSizingFile } from "./FittingIO";
// import ZrestLoader from "@/lib/clo/readers/ZrestLoader";

export default class Fitting {
  constructor({ scene: scene, zrest: zrest }) {
    this.listSkinController = new Map(); // This is named "list" but actually a map. This name according to the CLO SW.
    this.mapSkinController = new Map(); // NOTE: This map is created by parsing the listSkinController. Keys are the name of the SkinController. After creating this map, listSkinController is deallocated from memory.

    this.scene = scene;
    this.container = new THREE.Object3D();
    this.container.name = "fittingContainer";
    this.scene.add(this.container);

    this.mapTriangleIdx = new Map();

    this.listPositions = [];
    this.listAvatarMesh = [];
    this.listAvatarMeshIdx = [];
    this.bodySkinController = null;
    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];

    this.garments = new FittingGarment();
    this.loadZcrp = this.garments.loadZcrp;

    this.processAvatarSizingFile = processAvatarSizingFile;

    this.resizableBody = null;
    this.avatarId = 0;
    this.avatarSkinType = 0;

    this.zrest = zrest;
  }

  init({ rootPath: rootPath, mapAvatarPath: mapAvatarPath }) {
    this.avtRootPath = rootPath;
    this.mapAvtPath = mapAvatarPath;
    // Load path list
    console.log(rootPath);

    // Load Avatar zrest
    mapAvatarPath.forEach((listAvatarPath) => {
      console.log(listAvatarPath);
      listAvatarPath.forEach((avatarPath) => {
        console.log(rootPath + "/" + avatarPath);
      });
    });
  }

  async initResizableAvatar({ url }) {
    const retObj = await processAvatarSizingFile({ url });
    this.resizableBody = new ResizableBody(
      0,
      retObj.mapBaseMesh,
      retObj.convertingMatData,
      retObj.mapHeightWeightTo5Sizes
    );
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
    this.convertListSCtoMap(this.listSkinController);
    return this.listSkinController;
  }

  async getSamplingJson(styleId, version) {
    this.styleId = styleId;
    this.styleVersion = version;
    const jsonURL =
      this.avtRootPath +
      "/" +
      styleId +
      "/" +
      version +
      "/" +
      this.avatarId +
      "/sampling.json";
    console.log(jsonURL);

    const onLoad = (data) => {
      return data;
    };
    const jsonData = await loadJson(jsonURL, onLoad);
    console.log("jsonData: ");
    console.log(jsonData);
    return jsonData;
  }

  getInitGarmentURL(styleId, styleVersion, gradingIndex, avatarId) {
    // {styleId}/{version}/{avatarId}/{grading index}
    if (avatarId) {
      this.avatarId = avatarId;
    }

    const getInitGarmentURL =
      this.avtRootPath +
      "/" +
      styleId +
      "/" +
      styleVersion +
      "/" +
      this.avatarId +
      "/" +
      gradingIndex +
      "/garment.zrest";

    return getInitGarmentURL;
  }

  getDrapingDataURL(height, weight, samplingData, gradingIndex) {
    const garmentFilename = getGarmentFileName(height, weight, samplingData);
    const garmentURL =
      this.avtRootPath +
      "/" +
      this.styleId +
      "/" +
      this.styleVersion +
      "/" +
      this.avatarId +
      "/" + //"/G" +
      gradingIndex +
      "/" +
      garmentFilename;
    console.log(garmentURL);

    return garmentURL;
  }

  getDrapingData = async (zcrpURL, mapMatMesh) => {
    console.log("loadGarment");
    const listBarycentricCoord = await this.garments.loadZcrp(zcrpURL);
    if (!listBarycentricCoord) {
      console.warn("Build barycentric coordinate failed.");
      return;
    }

    listBarycentricCoord.forEach((garment) => {
      // const garment = listBarycentricCoord[0];
      // console.log(garment);
      const listABG = readByteArray("Float", garment.get("baAbgs"));
      const listTriangleIndex = readByteArray(
        "Uint",
        garment.get("baTriangleIndices")
      );
      const listMatMeshID = garment.get("listMatMeshID");
      if (!listMatMeshID) {
        console.warn("MatMeshID info missing");
        return;
      }

      // const listUV = readByteArray("Float", garment.get("baTexCoord"));

      //const matMeshId = listMatMeshID[0];
      listMatMeshID.forEach((matMeshId) => {
        const matMesh = mapMatMesh.get(matMeshId);

        if (!matMesh) {
          console.error(
            "matMesh(" + matMeshId + ") is not exist on init garment"
          );
          console.log(matMeshId);
          console.log(mapMatMesh);

          return;
        }
        // console.log(matMesh);

        const index = matMesh.userData.originalIndices;
        const uv = matMesh.userData.originalUv;
        const uv2 = matMesh.userData.originalUv2;

        // console.log(index);
        // console.log(uv);
        // console.log(uv2);

        const calculatedCoord = this.computeBarycentric(
          listABG,
          listTriangleIndex
        );
        const bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.addAttribute(
          "position",
          new THREE.Float32BufferAttribute(new Float32Array(calculatedCoord), 3)
        );

        bufferGeometry.setIndex(
          new THREE.BufferAttribute(new Uint32Array(index), 1)
        );

        // bufferGeometry.computeBoundingBox();
        bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();

        bufferGeometry.addAttribute(
          "uv",
          new THREE.Float32BufferAttribute(uv, 2)
        );
        bufferGeometry.addAttribute(
          "uv2",
          new THREE.Float32BufferAttribute(uv2, 2)
        );

        matMesh.geometry = bufferGeometry;
      });

      // bufferGeometry.attributes.uv2 = uv2;

      // const threeMesh = new THREE.Mesh(bufferGeometry, material);
      // console.log("threeMesh");
      // console.log(threeMesh);
      // this.container.add(threeMesh);
      // this.buildMesh(bufferGeometry, material);
    });

    console.log("loadGarment Done");
  };

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
    console.log("====================");
    listSkinController.forEach((sc) => {
      // for (let i = 0; i < listSkinController.length; ++i) {
      const mapElement = sc.get("mapElement");
      const qsNameUTF8 = mapElement.get("qsNameUTF8");
      const scName = readByteArray("String", qsNameUTF8);

      // console.log(sc);
      // console.log(scName);

      this.mapSkinController.set(scName, sc);
    });
    listSkinController = [];

    console.log(this.mapSkinController);
    return this.mapSkinController;
  }

  buildMeshUsingMapMesh(mapMesh) {
    const bufferGeometry = new THREE.BufferGeometry();
    const arrayIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    const arrayPosition = readByteArray("Float", mapMesh.get("baPosition"));

    // console.log(mapMesh);
    // console.log(arrayPosition);
    // console.log(arrayIndex);

    bufferGeometry.addAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(arrayPosition), 3)
    );
    bufferGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(arrayIndex), 1)
    );
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();

    // const material = new THREE.PointsMaterial({ color: 0x880000 });
    // const threeMesh = new THREE.Points(bufferGeometry, material);
    const material = new THREE.MeshPhongMaterial();
    material.color = THREE.Vector3(1, 1, 1);
    const threeMesh = new THREE.Mesh(bufferGeometry, material);

    this.container.add(threeMesh);

    // console.log(threeMesh);
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
      return;
    }
    console.log(skinController);

    const calculatedPosition = this.computeBarycentric(
      ABGList,
      triangleIndexList
    );

    console.log("calculatedPosition");
    console.log(calculatedPosition);

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

    this.buildMesh(bufferGeometry);
  }

  computeBarycentric(listAGB, listTriangleIndex, demarcationLine) {
    const calculatedPosition = [];
    for (let i = 0; i < listTriangleIndex.length; ++i) {
      const triIndex = listTriangleIndex[i];

      const abg = new THREE.Vector3();
      abg.x = listAGB[i * 3];
      abg.y = listAGB[i * 3 + 1];
      abg.z = listAGB[i * 3 + 2];

      // FIXME: Check this out
      if (1) {
        // if (abg.z <= demarcationLine) {

        const v0 = this.get3VerticeFromBody(triIndex * 3);
        const v1 = this.get3VerticeFromBody(triIndex * 3 + 1);
        const v2 = this.get3VerticeFromBody(triIndex * 3 + 2);

        const n = this.triangleCross(v0, v1, v2);
        n.normalize();

        const p0 = new THREE.Vector3(v0.x, v0.y, v0.z);
        const A = new THREE.Vector3().subVectors(v1, v0);
        const B = new THREE.Vector3().subVectors(v2, v0);

        const alphaXA = new THREE.Vector3(
          abg.x * A.x,
          abg.x * A.y,
          abg.x * A.z
        );
        const betaXB = new THREE.Vector3(abg.y * B.x, abg.y * B.y, abg.y * B.z);
        const normalXG = new THREE.Vector3(
          abg.z * n.x,
          abg.z * n.y,
          abg.z * n.z
        );

        let position = new THREE.Vector3(0, 0, 0)
          .add(p0)
          .add(alphaXA)
          .add(betaXB)
          .add(normalXG);

        calculatedPosition.push(position.x, position.y, position.z);
      } else {
        console.warn("ELSE");
      }
    }

    return calculatedPosition;
  }

  buildMesh(bufferGeometry, material = null) {
    // const defaultMaterial = new THREE.MeshPhongMaterial({});
    // defaultMaterial.color = THREE.Vector3(1, 1, 1);

    const defaultMaterial = new THREE.PointsMaterial({
      color: 0x880000,
    });
    const threeMaterial = material ? material : defaultMaterial;
    const threeMesh = new THREE.Points(bufferGeometry, threeMaterial);
    // const threeMesh = new THREE.Mesh(bufferGeometry, threeMaterial);
    this.container.add(threeMesh);
  }

  readBA({ sc: skinController, type: type, field: field }) {
    return skinController.has(field)
      ? readByteArray(type, skinController.get(field))
      : [];
  }

  /*
  extractAvatarMeshes(mapMatMesh) {
    let cnt = 0;
    mapMatMesh.forEach((matMesh) => {
      if (matMesh.userData.TYPE === 5) {
        // AVATAR_MATMESH:
        // console.log(matMesh);
        console.log(matMesh.geometry.attributes.position.count);
        cnt += matMesh.geometry.attributes.position.count;
        this.listAvatarMesh.push(matMesh);
        this.listAvatarMeshIdx.push(cnt);
      }
    });
    console.log("total: " + cnt);
  }
  */

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
    // console.log(this.bodyVertexIndex);
    // console.log(this.bodyVertexPos);

    // NOTE: For test only
    // this.buildMeshUsingMapMesh(mapMesh);
  }

  buildAvatarUsingSC(listSkinController) {
    listSkinController.forEach((sc) => {
      const mapMesh = sc.get("mapMesh");
      this.buildMeshUsingMapMesh(mapMesh);
    });
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

  triangleCross(v0, v1, v2) {
    const compare = (v0, v1) => {
      return v0.x == v1.x || v0.y == v1.y || v0.z == v1.z;
    };

    // if (compare(v0, v1) || compare(v0, v2) || compare(v1, v2)) {
    //   console.warn("error on triangleCross");
    // }
    /*
      x = (v1.y-v0.y) * (v2.z-v0.z) - (v1.z-v0.z) * (v2.y-v0.y);
      y = (v1.z-v0.z) * (v2.x-v0.x) - (v1.x-v0.x) * (v2.z-v0.z);
      z = (v1.x-v0.x) * (v2.y-v0.y) - (v1.y-v0.y) * (v2.x-v0.x);
    */
    const x = (v1.y - v0.y) * (v2.z - v0.z) - (v1.z - v0.z) * (v2.y - v0.y);
    const y = (v1.z - v0.z) * (v2.x - v0.x) - (v1.x - v0.x) * (v2.z - v0.z);
    const z = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);

    return new THREE.Vector3(x, y, z);
  }

  get3VerticeFromBody = (triangleIndex) => {
    // const triIdxOnVertexIdx = triangleIndex * 3;
    const triIdxOnVertexIdx = triangleIndex;
    if (
      triIdxOnVertexIdx < 0 ||
      triIdxOnVertexIdx >= this.bodyVertexIndex.length
    ) {
      console.warn(
        "Wrong meshIdx: " +
          triIdxOnVertexIdx +
          " of " +
          this.bodyVertexIndex.length
      );
    }

    // 3 vertice for 1 triangle
    const vertexIdx = this.bodyVertexIndex[triIdxOnVertexIdx];

    const v = new THREE.Vector3(
      this.bodyVertexPos[vertexIdx * 3],
      this.bodyVertexPos[vertexIdx * 3 + 1],
      this.bodyVertexPos[vertexIdx * 3 + 2]
    );

    return v;
  };

  // NOTE: Test code for avatar resizing
  r = async (testNo = 0) => {
    await this.initResizableAvatar({
      url:
        "https://files.clo-set.com/public/fitting/avatar/" +
        testNo +
        "/Sizing.zip",
    });

    const bodyShape = this.resizableBody.mBaseVertex;
    const computed = this.resizableBody.computeResizing(
      180,
      95,
      0,
      -1,
      -1,
      -1,
      -1,
      -1
      // sizes.chest,
      // sizes.waist,
      // sizes.hip,
      // sizes.armLength,
      // sizes.legLength
    );

    console.log("mBaseVertex: ");
    console.log(bodyShape);

    console.log("after computeResizing: ");
    console.log(computed);

    // // Render for test only
    // const v = this.resizableBody.mBaseVertex;
    // const bv = [];

    // // const bufferGeometry = new THREE.BufferGeometry();
    // this.resizableBufferGeometry = new THREE.BufferGeometry();
    // // v.forEach((vertex) => {
    // bodyShape.forEach((vertex) => {
    //   bv.push(vertex.x, vertex.y, vertex.z);
    // });
    // //computed
    // computed.forEach((vertex) => {
    //   bv.push(vertex.x, vertex.y, vertex.z);
    // });
    // // const bufferGeometry = matMesh.geometry;
    // this.resizableBufferGeometry.addAttribute(
    //   "position",
    //   new THREE.Float32BufferAttribute(new Float32Array(bv), 3)
    // );
    // this.buildMesh(this.resizableBufferGeometry);
  };

  async rz() {
    await loadZrestForFitting({
      url: "https://files.clo-set.com/public/fitting/avatar/0/Thomas.zrest",
      funcOnProgress: null,
      funcOnLoad: null,
      zrest: this.zrest,
      isAvatar: true,
    });

    const avatarGeometry = new Map(
      this.zrest.zProperty.rootMap.get("mapGeometry")
    );
    const listSkinController = this.loadGeometry({
      mapGeometry: avatarGeometry,
    });
    this.setAvatarInfo(listSkinController);

    this.buildAvatarUsingSC(listSkinController);

    this.convertListSCtoMap(listSkinController);

    await this.r(0);
    // TODO: This is test only, very confusing code
    const geoIdx = this.resizableBody.inputBaseVertex(this.mapSkinController);

    // const computed = this.resizableBody.computeResizing(
    //   170,
    //   95,
    //   0,
    //   -1,
    //   -1,
    //   -1,
    //   -1,
    //   -1
    //   // sizes.chest,
    //   // sizes.waist,
    //   // sizes.hip,
    //   // sizes.armLength,
    //   // sizes.legLength
    // );

    // const geometry = this.container.children[0].geometry;
    // const geoPos = [];

    // const m = 1.0;
    // computed.forEach((pos) => {
    //   geoPos.push(pos.x * m, pos.y * m, pos.z * m);
    // });

    // // console.warn(geometry.attributes.position);

    // geometry.addAttribute(
    //   "position",
    //   new THREE.BufferAttribute(new Float32Array(geoPos), 3)
    // );

    // console.log(geoPos);
    // console.log(geoIdx);
    // geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geoIdx), 1));

    // console.warn(geometry.attributes.position);
  }
}
