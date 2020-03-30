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

import { getObjectsCenter, zoomToObjects } from "./ObjectUtils";

const zrestProperty = {
  version: -1,
  seamPuckeringNormalMap: null,
  drawMode: {
    wireframe: {
      pattern: false
      // button: false
    }
  },
  // global variable
  nameToTextureMap: new Map()
};
let _fileReaderSyncSupport = false;
const _syncDetectionScript = "onmessage = function(e) { postMessage(!!FileReaderSync); };";

export default class ZRestLoader {
  constructor({ scene, camera, controls, cameraPosition, drawMode }, manager) {
    this.req = undefined;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.cameraPosition = cameraPosition;
    this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;

    // ZREST property
    this.zProperty = zrestProperty;
    this.zProperty.drawMode = this.getParsedDrawMode(drawMode);

    this.matMeshMap = new Map();
    this.currentColorwayIndex = 0;
    this.jsZip = null;

    // List for measurement
    this.listPatternMeasure = [];

    // this.readZrestFromBlobForWeb = readZrestFromBlob(this, blob, header);

    this.meshFactory = new MeshFactory({
      matMeshMap: this.matMeshMap,
      materialInformationMap: this.materialInformationMap,
      camera: this.camera,
      zrestProperty: this.zProperty,
      zrestVersion: this.zProperty._version
    });

    // Export functions
    this.getObjectsCenter = getObjectsCenter;
    this.zoomToObjects = zoomToObjects;

    this.MATMESH_TYPE = MATMESH_TYPE;
  }

  // TODO: This wrapper function placed very temporarily.
  makeMaterialForZrest = async (zip, matProperty, colorwayIndex, bUseSeamPuckeringNormalMap, camera) => {
    // console.log(zip, matProperty, colorwayIndex, bUseSeamPuckeringNormalMap, camera, version);
    return await makeMaterial({
      jsZip: zip,
      matProperty: matProperty,
      colorwayIndex: colorwayIndex,
      bUseSeamPuckeringNormalMap: bUseSeamPuckeringNormalMap,
      camera: camera,
      drawMode: this.zProperty.drawMode,
      seamPuckeringNormalMap: this.zProperty.seamPuckeringNormalMap,
      nameToTextureMap: this.zProperty.nameToTextureMap,
      zrestVersion: this.zProperty.version
    });
  };

  clearMaps = () => {
    this.zProperty.seamPuckeringNormalMap = null;
    this.zProperty.nameToTextureMap.clear();
    this.listPatternMeasure = [];
  };

  load = (url, onLoad, onProgress, onError) => {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    this.req = loader.load(
      url,
      data => {
        this.parse(data, onLoad);
      },
      onProgress,
      onError
    );
  };

  abort = () => {
    if (this.req) {
      this.aborted = true;
      this.req.abort();
    }
  };

  setPath = value => {
    this.path = value;
  };

  getColorwaySize = () => this.meshFactory.getColorwaySize();

  getMaterialInformationMap = () => this.meshFactory.materialInformationMap;

  getMatShapeMap = () => this.meshFactory.matShapeMap;

  getMatMeshMap = () => this.matMeshMap;

  getStyleLineMap = () => this.meshFactory.getStyleLineMap();

  getListPatternMeasure = () => this.listPatternMeasure;

  getParsedDrawMode = drawMode => {
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
  };

  // NOTE: This function designed to set wireframe for several types of meshes.
  //       But for now, works for pattern meshes only.
  setWireframe = bWireframe => {
    try {
      this.zProperty.drawMode.wireframe.pattern = bWireframe;
      this.matMeshMap.forEach(matMesh => {
        if (typeof matMesh.material === "undefined" || typeof matMesh.material.wireframe === "undefined") {
          throw BreakException;
        }
        matMesh.material.wireframe = bWireframe;
      });

      return true;
    } catch (e) {
      return false;
    }
  };

  parse = (data, onLoad) => {
    if (drawMode && drawMode.wireframe) {
      defaultDrawMode.wireframe.pattern = drawMode.wireframe.pattern || false;
      defaultDrawMode.wireframe.button = drawMode.wireframe.button || false;
    }

    return defaultDrawMode;
  };

  launchTest = () => {
    // TEST ONLY
    for (const key of this.zProperty.nameToTextureMap.keys()) {
      if (key.startsWith("a_")) {
        const origFileName = key.replace("a_", "");
        const adapTexture = this.zProperty.nameToTextureMap.get(key);
        const origTexture = this.zProperty.nameToTextureMap.get(origFileName);

        //adapTexture.dispose();
        adapTexture.image = origTexture.image;
        adapTexture.needsUpdate = true;
      }
    }

    console.log("Texture update Done.");
  };

  parse = (data, onLoad) => {
    this.data = data;
    this.onLoad = onLoad;

    const headerOffset = { Offset: 0 };
    const blob = new Blob([data]);
    const dataView = new DataView(data);
    const header = readHeader(dataView, headerOffset);

    return this.readZrestFromBlobForWeb(blob, header);
  };

  readZrestFromBlobForWeb = (blob, header) => {
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
            this.zProperty.rootMap = rootMap; // NOTE: This is temporary

            // seam puckering normal map 로드
            this.zProperty.seamPuckeringNormalMap = await loadTexture(zip, "seam_puckering_2ol97pf293f2sdk98.png");

            const loadedCamera = {
              ltow: new THREE.Matrix4(),
              bLoaded: false
            };

            await this.meshFactory.build(this, rootMap, zip, object3D, loadedCamera);

            // Build list for pattern measurement
            this.listPatternMeasure = rootMap.get("listPatternMeasure");

            // 여기가 실질적으로 Zrest 로드 완료되는 시점
            this.onLoad(object3D, loadedCamera, this.data);

            // add 할때 cameraPosition 이 있으면 설정해준다.
            if (this.cameraPosition) {
              this.camera.position.copy(this.cameraPosition);
            }

            // NOTE: This is temporary
            // this.buildCategorizeMatMeshList();

            // 임시 데이터 clear
            // this.zProperty.nameToTextureMap.clear();
          });
      });
    };

    reader.readAsArrayBuffer(contentBlob);
  };
}

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
