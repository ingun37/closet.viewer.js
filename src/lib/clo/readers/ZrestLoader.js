/* eslint-disable max-len */
"use strict";

/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
import JSZip from "@/lib/jszip/dist/jszip";
import { readHeader } from "@/lib/clo/file/FileHeader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";

import { makeMaterial } from "@/lib/clo/readers/zrest_material";
import { loadTexture } from "@/lib/clo/readers/zrest_texture";
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";
import MeshFactory from "./zrest_meshFactory";

const zrestProperty = {
  seamPuckeringNormalMap: null,
  drawMode: {
    wireframe: {
      pattern: false,
      button: false
    }
  }
  // version: -1
};
const _nameToTextureMap = new Map();
let _fileReaderSyncSupport = false;
const _syncDetectionScript = "onmessage = function(e) { postMessage(!!FileReaderSync); };";
// const _drawMode = { wireframe: { pattern: false, button: false } };
const _version = -1;

export default function ZRestLoader({ scene, camera, controls, cameraPosition, drawMode }, manager) {
  this.scene = scene;
  this.camera = camera;
  this.controls = controls;
  this.cameraPosition = cameraPosition;
  this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;

  // ZREST property
  this.zProperty = zrestProperty;
  this.zProperty.drawMode = this.getDrawMode(drawMode);
  console.log(this.zProperty);

  this.materialList = [];
  this.matMeshMap = new Map();
  this.currentColorwayIndex = 0;
  this.jsZip = null;
  /* 
  matMeshMap: matMeshMap,
  -- matShapeMap: matShapeMap,
  materialList: materialList,
  materialInformationMap: materialInformationMap,
  camera: loadedCamera,
  zrestProperty: zrestProperty,
  nameToTextureMap: nameToTextureMap,
  version: version
  */

  (this.meshFactory = new MeshFactory({
    matMeshMap: this.matMeshMap,
    materialList: this.materialList,
    materialInformationMap: this.materialInformationMap,
    camera: this.camera,
    zrestProperty: this.zProperty,
    nameToTextureMap: _nameToTextureMap,
    version: _version
  })),
    (this.MATMESH_TYPE = MATMESH_TYPE);
}

ZRestLoader.prototype = {
  constructor: ZRestLoader,

  // TODO: This wrapper function placed very temporarily.
  async makeMaterialForZrest(zip, matProperty, colorwayIndex, bUseSeamPuckeringNormalMap, camera, version) {
    return await makeMaterial(zip, matProperty, colorwayIndex, bUseSeamPuckeringNormalMap, camera, this.zProperty.drawMode, this.zProperty.seamPuckeringNormalMap, _nameToTextureMap, version);
  },

  clearMaps() {
    _nameToTextureMap.clear();
    global.seamPuckeringNormalMap = null;
  },

  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    loader.load(
      url,
      data => {
        this.parse(data, onLoad);
      },
      onProgress,
      onError
    );
  },

  setPath(value) {
    this.path = value;
  },

  getColorwaySize() {
    return this.meshFactory.getColorwaySize();
  },

  getMaterialInformationMap() {
    return this.meshFactory.materialInformationMap;
  },

  getMatShapeMap() {
    return this.meshFactory.matShapeMap;
  },

  getMatMeshMap() {
    return this.matMeshMap;
  },

  getStyleLineMap() {
    return this.meshFactory.getStyleLineMap();
  },

  getDrawMode(drawMode) {
    const defaultDrawMode = {
      wireframe: {
        pattern: false,
        button: false
      }
    };

    if (drawMode && drawMode.wireframe) {
      defaultDrawMode.wireframe.pattern = drawMode.wireframe.pattern || false;
      defaultDrawMode.wireframe.button = drawMode.wireframe.button || false;
    }

    return defaultDrawMode;
  },

  setWireframe(bWireframe) {
    this.matMeshMap.forEach(matMesh => {
      matMesh.material.wireframe = bWireframe;
    });
  },

  parse(data, onLoad) {
    this.data = data;
    this.onLoad = onLoad;

    const headerOffset = { Offset: 0 };
    const blob = new Blob([data]);
    const dataView = new DataView(data);
    const header = readHeader(dataView, headerOffset);

    return this.readZrestFromBlobForWeb(blob, header);
  },

  readZrestFromBlobForWeb(blob, header) {
    const object3D = new THREE.Object3D();
    // const object3D = new THREE.LOD();
    object3D.name = "object3D";

    const reader = new FileReader();

    const contentBlob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

    let rootMap;
    let restName = "";

    // TODO: consider change names. btn and bth are confusing easily
    const btnNameList = [];
    const bthNameList = [];

    reader.onload = e => {
      this.jsZip = new JSZip();
      this.jsZip.loadAsync(e.target.result).then(zip => {
        const keyList = Object.keys(zip.files);
        keyList.forEach(value => {
          const list = value.split(".");
          const extension = list[list.length - 1];

          switch (extension) {
            case "rest":
              restName = value;
              break;
            case "btn":
              btnNameList.push(value);
              break;
            case "bth":
              bthNameList.push(value);
              break;
            case "png":
            case "jpg":
            case "pos":
              break;
            default:
          }
        });

        const fileOffset = { Offset: 0 };
        zip
          .file(restName)
          .async("arrayBuffer")
          .then(async restContent => {
            const dataView = new DataView(restContent);

            console.log("pac file size = " + dataView.byteLength);

            rootMap = readMap(dataView, fileOffset);

            // seam puckering normal map 로드
            this.zProperty.seamPuckeringNormalMap = await loadTexture(zip, "seam_puckering_2ol97pf293f2sdk98.png");

            const loadedCamera = {
              ltow: new THREE.Matrix4(),
              bLoaded: false
            };

            await this.meshFactory.build(rootMap, zip, object3D, loadedCamera);

            // 여기가 실질적으로 Zrest 로드 완료되는 시점
            this.onLoad(object3D, loadedCamera, this.data);

            // add 할때 cameraPosition 이 있으면 설정해준다.
            if (this.cameraPosition) {
              this.camera.position.copy(this.cameraPosition);
            }

            // NOTE: This is temporary
            // this.buildCategorizeMatMeshList();

            // 임시 데이터 clear
            _nameToTextureMap.clear();
          });
      });
    };

    reader.readAsArrayBuffer(contentBlob);
  },

  getObjectsCenter(scene) {
    const box = new THREE.Box3();
    box.expandByObject(scene);
    const center = new THREE.Vector3(0.5 * (box.min.x + box.max.x), 0.5 * (box.min.y + box.max.y), 0.5 * (box.min.z + box.max.z));
    return center;
  },

  zoomToObjects(loadedCamera, scene) {
    // scene 의 모든 geometry 방문하면서 bounding cube 계산해서 전체 scene bounding cube 계산
    const center = new THREE.Vector3();
    center.copy(this.getObjectsCenter(scene));

    if (loadedCamera.bLoaded) {
      this.camera.position.copy(new THREE.Vector3(loadedCamera.ltow.elements[12], loadedCamera.ltow.elements[13], loadedCamera.ltow.elements[14]));

      const xAxis = new THREE.Vector3();
      const yAxis = new THREE.Vector3();
      const zAxis = new THREE.Vector3();
      loadedCamera.ltow.extractBasis(xAxis, yAxis, zAxis);

      zAxis.negate();

      center.sub(this.camera.position);

      // TODO: check again if below are the best solution
      let dotProd = center.dot(zAxis);
      if (dotProd < 0.0) {
        // center가 이상하게 들어오는 경우 예외 처리. trim이 아주 먼 위치 로드된 경우 center가 이상하게 들어온다. 제대로 해결하려면 dll에서 convert시 camera target 도 읽어들이는게 좋을 듯.
        center.x = center.y = center.z = 0.0; // 맨 처음에는 center를 원점으로 해서. 그래야 무조건 8000.0 떨어뜨리는 것보다 view 회전이 좀 더 잘 된다.
        center.sub(this.camera.position);
        dotProd = center.dot(zAxis);

        if (dotProd < 0.0) {
          // 그래도 이상하면.
          dotProd = 8000.0;
        }
      }

      zAxis.multiplyScalar(dotProd);
      zAxis.add(this.camera.position);
      this.controls.target.copy(zAxis);
    } else {
      const box = new THREE.Box3();
      box.expandByObject(scene);

      // trim이나 이상한 점 하나가 너무 동떨어진 경우에는 정해진 center 바라보게 하자
      const maxDistance = 10000.0;
      if (box.min.x < -maxDistance || box.min.y < -1000.0 || box.min.z < -maxDistance || box.max.x > maxDistance || box.max.y > maxDistance || box.max.z > maxDistance) {
        center.x = 0.0;
        center.y = 1100.0;
        center.z = 0.0;
        this.controls.target.copy(center);
        center.z = 8000.0;
        this.camera.position.copy(center);
      } else {
        // 전체 scene bounding cube 의 중심을 바라보고 cube 를 fit하도록 camera zoom 설정
        this.camera.position.copy(center);
        this.camera.position.z = box.max.z + (0.5 * (box.max.y - box.min.y + 100.0)) / Math.tan(((this.camera.fov / 2) * Math.PI) / 180.0); // 위아래로 100 mm 정도 여유있게
        this.controls.target.copy(center);
      }
    }
  }
};

function makeWorker(script) {
  const URL = window.URL || window.webkitURL;
  let blob = window.Blob;
  let worker = window.Worker;

  if (!URL || !blob || !worker || !script) {
    return null;
  }

  blob = new Blob([script]);
  worker = new Worker(URL.createObjectURL(blob));

  return worker;
}

export function checkFileReaderSyncSupport() {
  const worker = makeWorker(_syncDetectionScript);
  if (worker) {
    worker.onmessage = function(e) {
      _fileReaderSyncSupport = e.data;
      if (_fileReaderSyncSupport) {
        console.log("Your browser supports FileReaderSync.");
      }
    };
    worker.postMessage({});
  }
}
