import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { computeBarycentric } from "@/lib/fitting/FittingBarycentricCoord";
import { convertFloatArrayToVec3Array } from "@/lib/fitting/FittingIO";
import { buildMapMatshapeRenderToSkinPos } from "./FittingUtil";

export default class FittingAccessory {
  constructor(listSkinController, scManager) {
    this.scManager = scManager;

    this.mapSkinController = this.convertListSCtoMap(listSkinController);
    this.mapSkinMesh = new Map();
    // this.mapSkinMesh = this.mapSkinMesh.bind(this);
    //this.isExistGarment = this.isExistGarment.bind(this);

    this.container = null;

    this.mapAccMatshapeRenderToSkinPos = null;

    this.bodyVertexPos = null;
    this.bodyVertexIndex = null;
  }

  attachThreeJSContainer(parentContainer) {
    const accContainer = parentContainer.getObjectByName(
      "fittingAccessoryContainer"
    );
    const isExist = () => {
      return accContainer !== undefined;
    };

    if (isExist) {
      this.clear(accContainer);
    }

    this.container = new THREE.Object3D();
    this.container.name = "fittingAccessoryContainer";

    parentContainer.add(this.container);
  }

  putMeshInfo(mapAccessoryMesh) {
    this.mapAccMatshapeRenderToSkinPos = buildMapMatshapeRenderToSkinPos(
      mapAccessoryMesh
    );
    // console.warn(this.mapAccMatshapeRenderToSkinPos);
  }

  putBodyVertexInfo(bodyVertexPos, bodyVertexIndex) {
    this.bodyVertexPos = bodyVertexPos;
    this.bodyVertexIndex = bodyVertexIndex;
  }

  dispose() {
    if (!this.container) return;
    this.clear(this.container);
  }

  clear(object3D) {
    if (!object3D) return;

    // Clear every children on fitting accessory container
    object3D.children.forEach((child) => (child = null));

    // TODO: Please improve this code later
    // NOTE: Prevent duplicated object3D on 'fittingContainter'
    const parent = object3D.parent;
    for (let i = 0; i < parent.children.length; ++i) {
      if (parent.children[i].name === "fittingAccessoryContainer") {
        parent.children.splice(i, 1);
        i--;
      }
    }
  }

  resize() {
    this.mapSkinMesh = this.buildMapSkinMeshFromSC(this.mapSkinController);
    // console.log(this.mapSkinMesh);
    this.container.children = [];

    for (const entries of this.mapSkinMesh.entries()) {
      const partName = entries[0];
      const phyPos = this.mapSkinMesh.get(partName).geometry.attributes.position
        .array;
      const phyPosVec3 = convertFloatArrayToVec3Array(phyPos);
      // console.log(phyPos);
      const renderToSkinPos = this.mapAccMatshapeRenderToSkinPos
        .get(partName)
        .get("renderToSkinPos");
      const renderPos = this.updateRenderPositionFromPhysical(
        phyPosVec3,
        renderToSkinPos
      );
      const listMatMesh = this.scManager.putVertexOnMatMeshByPartName(
        partName,
        renderPos
      );
      // console.log(listMatMesh);
      this.container.add(...listMatMesh);
    }
  }

  updateRenderPositionFromPhysical(phyPos, renderToSkinPos) {
    const renderPos = new Array(renderToSkinPos.length * 3).fill(-999.999);
    const multifier = 1.0;

    for (let i = 0; i < renderPos.length; ++i) {
      const vectorIdx = Math.trunc(i / 3);
      const renderVector = phyPos[renderToSkinPos[vectorIdx]];
      if (!renderVector) {
        console.warn(i, vectorIdx, renderToSkinPos[vectorIdx]);
      }
      switch (i % 3) {
        case 0:
          renderPos[i] = renderVector.x;
          break;
        case 1:
          renderPos[i] = renderVector.y;
          break;
        case 2:
          renderPos[i] = renderVector.z;
          break;
      }
      renderPos[i] *= multifier;
    }

    renderPos.forEach((pos) => {
      if (pos == -999.999) console.warn(pos);
    });

    return renderPos;
  }

  convertListSCtoMap(listSkinController) {
    const mapSkinController = new Map();
    listSkinController.forEach((sc) => {
      const mapElement = sc.get("mapElement");
      const qsNameUTF8 = mapElement.get("qsNameUTF8");
      const scName = readByteArray("String", qsNameUTF8);

      mapSkinController.set(scName, sc);
    });
    listSkinController = [];

    return mapSkinController;
  }

  readBA({ sc: skinController, type: type, field: field }) {
    return skinController.has(field)
      ? readByteArray(type, skinController.get(field))
      : [];
  }

  buildMapSkinMeshFromSC(mapSkinController) {
    // console.warn(mapSkinController);
    // this.mapSkinMesh = (this.mapSkinMesh) ? this.mapSkinMesh.clear() : new Map();
    const mapSkinMesh = new Map();

    for (const entries of mapSkinController) {
      const id = entries[0];
      const sc = entries[1];

      if (id !== "body" && id !== "body_Shape") {
        console.log(id);
        const mesh = this.parseSkinControllerUsingABG(sc);

        if (mesh) {
          mapSkinMesh.set(id, mesh);
        }
      }
    }
    // console.warn(this.mapSkinMesh);
    return mapSkinMesh;
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
    // console.log("demarcationLine: " + demarcationLine);

    const mapMesh = skinController.get("mapMesh");
    const meshIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    // const meshPosition = readByteArray("Float", mapMesh.get("baPosition"));
    const vertexCount = mapMesh.get("uiVertexCount");

    if (ABGList.length <= 0) {
      // console.warn("ABGList is empty");
      return;
    }

    const calculatedPosition = computeBarycentric({
      listABG: ABGList,
      listTriangleIndex: triangleIndexList,
      bodyVertexPos: this.bodyVertexPos,
      bodyVertexIndex: this.bodyVertexIndex,
    });

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
    // NOTE: This module used to test only
    const defaultMaterial = new THREE.MeshPhongMaterial({});
    defaultMaterial.color = THREE.Vector3(1, 1, 1);

    const threeMaterial = material ? material : defaultMaterial;
    const threeMesh = new THREE.Mesh(bufferGeometry, threeMaterial);

    return threeMesh;
  }
}
