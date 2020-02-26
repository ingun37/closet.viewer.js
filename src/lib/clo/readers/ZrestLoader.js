/* eslint-disable max-len */
"use strict";

/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
import { readHeader } from "@/lib/clo/file/FileHeader";

import { makeMaterial } from "@/lib/clo/readers/zrest_material";
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";
import MeshFactory from "./zrest_meshFactory";

import { getObjectsCenter, zoomToObjects } from "./ObjectUtils";
import { readZrestFromBlobForWeb } from "./Loader";

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

export default function ZRestLoader({ scene, camera, controls, cameraPosition, drawMode }, loadingManager) {
  this.scene = scene;
  this.camera = camera;
  this.controls = controls;
  this.cameraPosition = cameraPosition;
  this.manager = loadingManager !== undefined ? loadingManager : THREE.DefaultLoadingManager;

  // ZREST property
  this.zProperty = zrestProperty;
  this.zProperty.drawMode = this.getParsedDrawMode(drawMode);

  this.matMeshMap = new Map();
  this.currentColorwayIndex = 0;
  this.jsZip = null;

  this.readZrestFromBlobForWeb = readZrestFromBlobForWeb;

  this.getObjectsCenter = getObjectsCenter;
  this.zoomToObjects = zoomToObjects;

  (this.meshFactory = new MeshFactory({
    matMeshMap: this.matMeshMap,
    materialInformationMap: this.materialInformationMap,
    camera: this.camera,
    zrestProperty: this.zProperty,
    zrestVersion: this.zProperty._version
  })),
    (this.MATMESH_TYPE = MATMESH_TYPE);
}

ZRestLoader.prototype = {
  constructor: ZRestLoader,

  // TODO: This wrapper function placed very temporarily.
  async makeMaterialForZrest(zip, matProperty, colorwayIndex, bUseSeamPuckeringNormalMap, camera) {
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
  },

  clearMaps() {
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

  getParsedDrawMode(drawMode) {
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
    // NOTE: This function designed to set wireframe for several types of meshes.
    //       But for now, works for pattern meshes only.

    this.zProperty.drawMode.wireframe.pattern = bWireframe;
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
