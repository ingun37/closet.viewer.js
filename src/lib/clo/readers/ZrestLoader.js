/* eslint-disable max-len */
"use strict";

/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";

import JSZip from "@/lib/jszip/dist/jszip";
import { readHeader } from "@/lib/clo/file/FileHeader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";
import {
  extractTexture,
  getTexture,
  setTexturePropertyDisassembly,
} from "./TextureManager";

import { MATMESH_TYPE } from "@/lib/clo/readers/Predefined";
import MeshFactory from "./MeshFactory";
import Wireframe from "./Wireframe";

import { getObjectsCenter, zoomToObjects } from "./ObjectUtils";
import { makeMaterial } from "./zrest_material";
import Colorway, { changeColorway } from "./Colorway";
import { safeDeallocation } from "@/lib/clo/readers/MemoryUtils";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { getFilename } from "@/lib/clo/readers/FileLoader";

const zrestProperty = {};
// const zrestProperty = {
//   version: -1,
//   drawMode: {
//     wireframe: {
//       pattern: false,
//       // button: false
//     },
//   },
//   colorwayIndex: -1,
//   colorwaySize: 0,
//   bDisassembled: false,

//   // global variable
//   nameToTextureMap: new Map(),
//   loadedCamera: {
//     ltow: new THREE.Matrix4(),
//     bLoaded: false,
//   },
//   renderCamera: null,

//   // zElement
//   rootMap: new Map(),
//   seamPuckeringNormalMap: null,
//   listMapTextureMatMeshId: null,
//   mapMatMeshIndex: new Map(),
// };

let _fileReaderSyncSupport = false;
const _syncDetectionScript =
  "onmessage = function(e) { postMessage(!!FileReaderSync); };";

export default class ZRestLoader {
  constructor({ scene, camera, controls, cameraPosition, drawMode }, manager) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.cameraPosition = cameraPosition;
    this.manager =
      manager !== undefined ? manager : THREE.DefaultLoadingManager;

    this.rootObject = new THREE.Object3D();
    this.rootObject.name = "object3D";

    // ZREST property
    this.zProperty = this.initZrestProperty();
    this.zProperty.drawMode = this.getParsedDrawMode(drawMode);
    this.zProperty.renderCamera = camera;

    this.matMeshMap = new Map();
    // this.currentColorwayIndex = 0;
    this.jsZip = null;

    this.textureMap = new Map();

    // List for measurement
    this.listPatternMeasure = [];
    this.materialInformationMap = new Map();

    this.meshFactory = new MeshFactory({
      matMeshMap: this.matMeshMap,
      matShapeMap: this.matShapeMap,
      materialInformationMap: this.materialInformationMap,
      camera: this.camera,
      zrestProperty: this.zProperty,
    });

    this.colorway = new Colorway({
      zProperty: this.zProperty,
      matInfoMap: this.materialInformationMap,
      clearFunc: this.clearMaps,
    });

    this.wireframe = new Wireframe(this.matMeshMap);

    // Export functions
    this.getObjectsCenter = getObjectsCenter;
    this.zoomToObjects = zoomToObjects;

    this.MATMESH_TYPE = MATMESH_TYPE;

    this.isDisassembled = () => {
      return this.zProperty.bDisassembled;
    };

    this.safeDeallocation = safeDeallocation;
    this.changeColorway = async (colorwayIndex) => {
      await this.colorway.changeColorway({
        colorwayIndex: colorwayIndex,
        jsZip: this.jsZip,
      });
    };

    console.log("ZRestLoader initialized.");
  }

  // TODO: This wrapper function placed very temporarily.
  // makeMaterialForZRest = async (zip, matProperty, colorwayIndex, bUseSeamPuckeringNormalMap, camera) => {
  //   zrestProperty.colorwayIndex = colorwayIndex;
  //   zrestProperty.bUseSeamPuckeringNormalMap = zrestProperty;
  //   //zrestProperty.loadedCamera = camera;

  //   return await makeMaterial({
  //     jsZip: zip,
  //     matProperty: matProperty,
  //     zProperty: zrestProperty,
  //     bUseSeamPuckeringNormalMap: bUseSeamPuckeringNormalMap
  //   });
  // };

  initZrestProperty = () => {
    const zProperty = {
      version: -1,
      drawMode: {
        wireframe: {
          pattern: false,
          // button: false
        },
      },
      colorwayIndex: -1,
      colorwaySize: 0,
      bDisassembled: false,

      // global variable
      nameToTextureMap: new Map(),
      loadedCamera: {
        ltow: new THREE.Matrix4(),
        bLoaded: false,
      },
      renderCamera: null,

      // zElement
      rootMap: new Map(),
      seamPuckeringNormalMap: null,
      listMapTextureMatMeshId: null,
      mapMatMeshIndex: new Map(),
    };

    // console.log("@initZrestProperty");
    // console.warn(this.camera);
    for (const key in zProperty) {
      zrestProperty[key] = zProperty[key]; // copies each property to the objCopy object
    }
    if (this.camera)
      zrestProperty.renderCamera = Object.assign({}, this.camera);

    // console.warn(zrestProperty);

    return zrestProperty;
  };

  // TODO: Write more code very carefully
  clear = () => {
    for (const matMesh of this.zProperty.matMeshMap.values()) {
      this.safeDeallocation(
        matMesh.material,
        THREE.ShaderMaterial,
        function () {
          // console.log("success deallocation");
        },
        function () {
          console.log("unsuccess deallocation");
        }
      );
    }

    this.zProperty = this.initZrestProperty();
    // console.log(this.initZproperty);
    this.clearMaps();
  };

  clearMaps = () => {
    // TODO: 여기 좀 고치자
    // this.zProperty.seamPuckeringNormalMap = null;
    this.zProperty.nameToTextureMap.clear();
    this.listPatternMeasure = [];
    // this.materialInformationMap.clear();
  };

  loadOnly = (url, onProgress) => {
    zrestProperty.bDisassembled = false;
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");

    return new Promise((resolve) => {
      loader.load(url, resolve, onProgress);
    });
  };

  load = (url, onLoad, onProgress, onError) => {
    zrestProperty.bDisassembled = false;
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    // loader.loadZrest(url, onLoad, onProgress, onError);
    this.req = loader.load(
      url,
      (data) => {
        this.parse(data, onLoad);
      },
      onProgress,
      onError
    );
  };

  loadUrl = (url, onLoad, onProgress, onError) => {
    zrestProperty.bDisassembled = false;

    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    return new Promise((resolve, reject) => {
      this.req = loader.load(
        url,
        (data) => {
          this.parse(data, onLoad);
          resolve();
        },
        onProgress,
        reject
      );
    });
  };

  abort = () => {
    if (this.req) {
      this.aborted = true;
      this.req.abort();
    }
  };

  addThreeContainerUniquely(
    container,
    containerName = "object3D",
    parentContainerName
  ) {
    if (container.name !== containerName) {
      container.name = containerName;
    }

    const foundContainer = this.scene.children.filter(
      (obj) => obj.name === parentContainerName
    );
    const parent = foundContainer.length > 0 ? foundContainer[0] : this.scene;

    let objIndex = -1;
    for (let i = 0; i < parent.children.length; ++i) {
      if (parent.children[i].name === containerName) {
        this.clearThree(parent.children[i]);
        parent.children[i].remove(...parent.children[i].children);
        objIndex = i;
      }
    }

    if (objIndex >= 0) {
      parent.children[objIndex] = container;
    } else {
      parent.add(container);
    }

    // this.object3D = container;
  }

  clearThree = (obj) => {
    while (obj.children.length > 0) {
      this.clearThree(obj.children[0]);
      obj.remove(obj.children[0]);
    }

    const disposeIfExists = (component) => {
      if (component !== undefined) {
        component.dispose();
      }
    };

    disposeIfExists(obj.geometry);
    disposeIfExists(obj.material);
    disposeIfExists(obj.texture);

    obj = undefined;
  };

  parse = (data, onLoad) => {
    this.data = data;
    this.onLoad = onLoad;

    const headerOffset = { Offset: 0 };
    const blob = new Blob([data]);
    const dataView = new DataView(data);
    const header = readHeader(dataView, headerOffset);

    const object3D = this.rootObject;
    // new THREE.Object3D();
    // // const object3D = new THREE.LOD();
    // object3D.name = "object3D";

    const reader = new FileReader();
    const contentBlob = blob.slice(
      header.FileContentPos,
      header.FileContentPos + header.FileContentSize
    );

    reader.onload = async (e) => {
      // this.extractRestFileName(e);
      this.jsZip = new JSZip();
      const zip = await this.jsZip.loadAsync(e.target.result);
      const keyList = Object.keys(zip.files);

      const restFileName = keyList.find((value) => {
        const list = value.split(".");
        const extension = list[list.length - 1];

        return extension === "rest";
      });

      // Uncompress zip (restFile)
      const restContent = await zip.file(restFileName).async("arrayBuffer");
      this.parseRestContents(object3D, restContent, zip);
    };

    reader.readAsArrayBuffer(contentBlob);
  };

  // NOTE: For now, this function use for avatar only (for fitting service)
  parseAsync = async (data, onLoad) => {
    this.data = data;
    this.onLoad = onLoad;

    const headerOffset = { Offset: 0 };
    const blob = new Blob([data]);
    const dataView = new DataView(data);
    const header = readHeader(dataView, headerOffset);

    this.rootObject = new THREE.Object3D();
    this.rootObject.name = "object3D";
    const object3D = this.rootObject;

    const contentBlob = blob.slice(
      header.FileContentPos,
      header.FileContentPos + header.FileContentSize
    );

    const readFileAsync = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result);
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
      });
    };

    const unzipRest = async (e) => {
      this.jsZip = new JSZip();
      const zip = await this.jsZip.loadAsync(e);
      const keyList = Object.keys(zip.files);

      const restFileName = keyList.find((value) => {
        const list = value.split(".");
        const extension = list[list.length - 1];

        return extension === "rest";
      });

      // Uncompress zip (restFile)
      const restContent = await zip.file(restFileName).async("arrayBuffer");
      // return restContent;
      return await this.parseRestContents(object3D, restContent, zip);
    };

    await onLoad;
    const contentsData = await readFileAsync(contentBlob);
    const rootMap = await unzipRest(contentsData);
    return rootMap;
  };

  getColorwaySize = () => this.meshFactory.getColorwaySize();

  getCurrentColorwayIndex = () => this.zProperty.colorwayIndex;

  getMaterialInformationMap = () => this.meshFactory.materialInformationMap;

  getMatShapeMap = () => this.meshFactory.matShapeMap;

  getMatMeshMap = () => this.matMeshMap;

  getStyleLineMap = () => this.meshFactory.getStyleLineMap();

  getListPatternMeasure = () => this.listPatternMeasure;

  getParsedDrawMode = (drawMode) => {
    const defaultDrawMode = {
      wireframe: {
        pattern: false,
        button: false,
      },
    };

    if (drawMode && drawMode.wireframe) {
      defaultDrawMode.wireframe.pattern = drawMode.wireframe.pattern || false;
      defaultDrawMode.wireframe.button = drawMode.wireframe.button || false;
    }

    return defaultDrawMode;
  };

  parseRest = (restFileData) => {
    const fileOffset = { Offset: 0 };
    const dataView = new DataView(restFileData);

    // console.log("pac file size = " + dataView.byteLength);
    const rootMap = readMap(dataView, fileOffset);
    const zVersion = this.meshFactory.parseVersion(rootMap);
    this.zProperty.version = zVersion;

    const loadedCamera = {
      ltow: new THREE.Matrix4(),
      bLoaded: false,
    };
    this.zProperty.loadedCamera = loadedCamera;
    const camLtoW = rootMap.get("m4CameraLocalToWorldMatrix");
    this.meshFactory.getCameraLtoW(camLtoW, this.zProperty.loadedCamera);

    // this.meshFactory.build.parseMapColorWay();

    return rootMap;
  };

  parseRestContents = async (object3D, restContent, zip) => {
    // Parse Rest file data to RootMap
    const rootMap = this.parseRest(restContent);
    this.zProperty.rootMap = rootMap;

    // seam puckering normal map 로드
    this.zProperty.seamPuckeringNormalMap = await extractTexture(
      zip,
      "seam_puckering_2ol97pf293f2sdk98.png"
    );
    const loadedCamera = {
      ltow: new THREE.Matrix4(),
      bLoaded: false,
    };
    this.zProperty.loadedCamera = loadedCamera;

    await this.meshFactory.build(
      this,
      rootMap,
      zip,
      object3D,
      this.zProperty.loadedCamera
    );

    // Build list for pattern measurement
    this.listPatternMeasure = rootMap.get("listPatternMeasure");

    // console.log("==========================");
    // console.log("zrest load complete");
    // console.log(this.cameraPosition);
    // console.log(this.zProperty.loadedCamera);
    // console.log("==========================");

    // if (this.zProperty.loadedCamera) {
    //   this.camera.position.copy(this.zProperty.loadedCamera);
    // }

    // add 할때 cameraPosition 이 있으면 설정해준다.
    if (this.cameraPosition) {
      this.camera.position.copy(this.cameraPosition);
      this.zProperty.loadedCamera = this.cameraPosition;
    }

    // 여기가 실질적으로 Zrest 로드 완료되는 시점
    if (this.onLoad) {
      this.onLoad(object3D, this.zProperty.loadedCamera, this.data);
    }

    // 임시 데이터 clear
    // this.zProperty.nameToTextureMap.clear();
    // };
    return rootMap;
  };

  processRestFile = async (restURL) => {
    // Load Rest file
    const loadedData = await loadFile(restURL);

    // Unzip Rest data
    const restFileName = "viewer.rest";
    const unzippedData = await unZip(loadedData, restFileName);

    // Parse Rest data
    const rootMap = this.parseRest(unzippedData);
    this.zProperty.rootMap = rootMap;
  };

  processDracoFiles = async (dracoURLList, object3D, onProgress) => {
    const loadDracoFiles = async () => {
      // NOTE: forEach not working correctly with await/async

      const newDracoURLPromise = dracoURLList.map(async (dracoURL) => {
        const loadedData = await loadFile(dracoURL);
        const dracoFilenameWithoutZip = getFilename(dracoURL).replace(
          ".zip",
          ""
        );
        return [dracoFilenameWithoutZip, loadedData];
      });
      return await Promise.all(newDracoURLPromise);
    };

    const unzipDracoFiles = async (mapDracoUrls) => {
      const newDracoURLPromise = mapDracoUrls.map(async (data) => {
        const [dracoFilenameWithoutZip, loadedData] = data;
        const drcArrayBuffer = await unZip(loadedData, dracoFilenameWithoutZip);
        return [dracoFilenameWithoutZip, drcArrayBuffer];
      });
      const newDracoArrayBuffer = await Promise.all(newDracoURLPromise);
      return new Map(newDracoArrayBuffer);
    };

    console.log("=======================");
    console.log("Set mesh material without texture");
    console.log("=======================");

    const mapDracoUrls = await loadDracoFiles();
    onProgress(80);
    const mapDracoData = await unzipDracoFiles(mapDracoUrls);
    onProgress(90);
    await this.meshFactory.buildDracos(this, mapDracoData, object3D); //, reObject, loadedCamera);
    mapDracoData.clear();
    console.log("processDracoFiles done.");
  };

  loadTextureFromURL = async (url) => {
    const textureArrayBuffer = await loadFile(url);
    const threeJSTexture = await getTexture(textureArrayBuffer);

    // TODO: 개발 마무리 할 것
    this.zProperty.nameToTextureMap.set(getFilename(url), threeJSTexture);

    return threeJSTexture;
  };

  processTextureFiles = async (textureURLList, object3D, updateRenderer) => {
    // console.log(textureURLList);

    // NOTE: 만약 texture list가 중요도 순으로 sort가 되어 있다면 참 좋을텐데
    textureURLList.map(async (textureURL) => {
      const threeJSTexture = await this.loadTextureFromURL(textureURL);
      const textureFilename = getFilename(textureURL);

      // if (this.zProperty.listMapTextureMatMeshId[colorwayIndex].has(textureFilename)) {
      // NOTE: colorway와 상관 없이 모든 texture의 정보를 취득한다
      // await initListMapTextureMatMeshId({
      await setTexturePropertyDisassembly({
        textureFilename: textureFilename,
        threeJSTexture: threeJSTexture,
        materialInformationMap: this.getMaterialInformationMap(), // NOTE: 이거 property에 넣을까?
        zProperty: this.zProperty,
      });
      // console.log(textureURL + " loaded");
      updateRenderer();
      // } else {
      // console.log("TEXTURE: " + textureFilename + " has passed.");
      // }

      // console.log(texture);
      // this.textureMap.set(getFilename(textureURL), textureArrayBuffer);
    });

    console.log("processTextureFiles done.");
  };

  loadZrestDisassembly = async (
    restURL,
    dracoURLList,
    textureURLList,
    updateRenderer,
    onProgress
  ) => {
    const loadSeamPuckeringMap = async () => {
      const seamPuckeringMapURL = textureURLList.filter((url) =>
        url.includes("seam_puckering_2ol97pf293f2sdk98.png")
      );
      if (seamPuckeringMapURL.length <= 0) return;

      return await this.loadTextureFromURL(seamPuckeringMapURL[0]);
    };

    this.zProperty.bDisassembled = true;

    const object3D = this.rootObject;
    // const object3D = new THREE.Object3D();
    // object3D.name = "object3D";

    await this.processRestFile(restURL[0]);
    onProgress(50);
    this.zProperty.seamPuckeringNormalMap = await loadSeamPuckeringMap();
    await this.processDracoFiles(dracoURLList, object3D, onProgress);
    await this.processTextureFiles(textureURLList, object3D, updateRenderer);
    onProgress(100);
    console.log("=== after RestFile ===");
    return object3D;
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
    worker.onmessage = function (e) {
      _fileReaderSyncSupport = e.data;
      if (_fileReaderSyncSupport) {
        console.log("Your browser supports FileReaderSync.");
      }
    };
    worker.postMessage({});
  }
}
