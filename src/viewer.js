/* eslint-disable require-jsdoc */
import ZRestLoader, {
  dataWorkerFunction,
  checkFileReaderSyncSupport,
} from "@/lib/clo/readers/ZrestLoader";
import * as THREE from "@/lib/threejs/three";
import "@/lib/threejs/OrbitControls";
import "@/lib/draco/DRACOLoader";

import AnnotationManager from "@/lib/annotation/AnnotationManager";
import TechPackManager from "@/lib/techPack/TechPackManager";
import FittingMap from "@/lib/fitting/FittingMap";

import RendererStats from "@xailabs/three-renderer-stats";
import screenfull from "screenfull";

import { MATMESH_TYPE } from "@/lib/clo/readers/Predefined";
import { addLightForOldVersion } from "@/lib/control/lights";
import { getTestData } from "./test.js";
import "@/lib/threejs/BufferGeometryUtils";
import Fitting from "./lib/fitting/Fitting.js";

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let rendererStats = null;

checkFileReaderSyncSupport();

const cameraHeight = 1100;
const cameraDistance = 5000;
const camMatrixPushOrder = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14];

let requestId = null;

if (!PRODUCTION) rendererStats = new RendererStats();

export default class ClosetViewer {
  constructor() {
    this.init = this.init.bind(this);
    this.render = this.render.bind(this);
    this.loadZrestUrl = this.loadZrestUrl.bind(this);

    this.getCameraMatrix = this.getCameraMatrix.bind(this);
    this.setCameraMatrix = this.setCameraMatrix.bind(this);

    this.setWindowSize = this.setWindowSize.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    this.changeColorway = this.changeColorway.bind(this);
    this.getColorwaySize = this.getColorwaySize.bind(this);
    this.onUpdateCamera = this.onUpdateCamera.bind(this);
    this.stopRender = this.stopRender.bind(this);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseClick = this.onMouseClick.bind(this);

    this.setVisibleAllGarment = this.setVisibleAllGarment.bind(this);
    this.setVisibleAllAvatar = this.setAllAvatarVisible.bind(this);
    this.isExistGarment = this.isExistGarment.bind(this);
    this.isExistAvatar = this.isExistAvatar.bind(this);
    this.getGarmentShowHideStatus = this.getGarmentShowHideStatus.bind(this);
    this.getAvatarShowHideStatus = this.getAvatarShowHideStatus.bind(this);
    this.GetGarmentShowHideStatus = this.getGarmentShowHideStatus.bind(this); // Deprecated
    this.GetAvatarShowHideStatus = this.getAvatarShowHideStatus.bind(this); // Deprecated
    this.isAvailableShowHide = this.isAvailableShowHide.bind(this);
    this.setCameraPosition = this.setCameraPosition.bind(this);
    this.updateRenderer = this.updateRenderer.bind(this);
    this.loadZrestData = this.loadZrestData.bind(this);
    this.fullscreen = this.fullscreen.bind(this);

    this.object3D = null;
    this.loadTechPack = this.loadTechPack.bind(this);

    this.mobileDetect = null;
    this.alertVersion = this.alertVersion.bind(this);
    this.MATMESH_TYPE = MATMESH_TYPE;
  }

  init({ width, height, element, cameraPosition = null, stats }) {
    const w = (this.defaultWidth = width);
    const h = (this.defaultHeight = height);

    this.setter =
      typeof element === "string"
        ? document.getElementById(element) || document.querySelector(element)
        : element;
    this.id = element;
    this.cameraPosition = cameraPosition;
    this.stats = stats;

    windowHalfX = w / 2;
    windowHalfY = h / 2;

    // create webgl renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    this.renderer.setClearAlpha(0);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.sortObjects = false; // 투명 object 제대로 렌더링하려면 자동 sort 꺼야 한다
    this.renderer.shadowMap.enabled = true;
    // NOTE: THREE.PCFSoftShadowMap causes performance problem on Android;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    this.setter.appendChild(this.renderer.domElement);

    // create camera
    this.camera = appendDefaultCamera();
    this.camera.position.set(0, cameraHeight, cameraDistance);

    // create camera controller
    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.target = new THREE.Vector3(0, cameraHeight, 0);
    this.controls.update();
    this.controls.addEventListener("change", () => {
      if (this.updateCamera) {
        this.updateCamera({
          target: this.controls.target,
          position: this.camera.position,
          id: this.id,
        });
      }
      this.render();
    });

    // create scenegraph
    this.scene = new THREE.Scene();

    addLightForOldVersion(this.scene);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      require("@/lib/clo/background/img_3dwindow_bg_Designer.png")
    );

    this.annotation = new AnnotationManager({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      updateRenderer: this.updateRenderer,
      setter: this.setter,
    });

    this.techPack = new TechPackManager({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      updateRenderer: this.updateRenderer,
      setter: this.setter,
    });

    this.zrest = new ZRestLoader({
      scene: this.scene,
      camera: this.camera,
      controls: this.controls,
      cameraPosition: this.cameraPosition,
    });

    this.fittingMap = new FittingMap();
    this.fitting = new Fitting({ scene: this.scene, zrest: this.zrest });

    // canvas event
    const canvas = this.setter;
    canvas.addEventListener("mouseout", this.onPanControls, false);
    canvas.addEventListener("mouseover", this.offPanControls, false);
    canvas.addEventListener("mousedown", this.onMouseDown, false);
    canvas.addEventListener("mousemove", this.onMouseMove, false);
    canvas.addEventListener("mouseup", this.onMouseUp, false);
    canvas.addEventListener("click", this.onMouseClick, false);

    function appendDefaultCamera() {
      const fov = 15;
      const aspect = w / h;
      const near = 100;
      const far = 100000;

      return new THREE.PerspectiveCamera(fov, aspect, near, far);
    }

    if (!PRODUCTION && this.stats) {
      rendererStats.domElement.style.position = "absolute";
      rendererStats.domElement.style.left = "-100px";
      rendererStats.domElement.style.top = "0px";
      this.setter.appendChild(rendererStats.domElement);
    }

    this.updateRenderer(1);
  }

  async fit() {
    const sleep = (ms) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };

    const correctlyWorking = async () => {
      console.log("++ loadResizableAvatar");
      await this.fitting.loadResizableAvatar({
        avatarURL:
          "https://files.clo-set.com/public/fitting/avatar/0/Thomas.zrest",
        sizingURL:
          "https://files.clo-set.com/public/fitting/avatar/0/Sizing.zip",
        accURL:
          "https://files.clo-set.com/public/fitting/avatar/0/Thomas.Acc.map",
      });
      console.log("-- loadResizableAvatar");

      console.log("++ resizeAvatarWithAcc");
      await this.fitting.resizeAvatarWithAcc({
        height: 180,
        weight: 90,
        bodyShape: 0,
      });
      console.log("-- resizeAvatarWithAcc");

      await this.fitting.loadGarmentData({
        garmentURL:
          "https://files.clo-set.com/public/fitting/5021883564f647b2813d57c7cd60b66c/1/0/0/garment.zrest",
        samplingURL:
          "https://files.clo-set.com/public/fitting/5021883564f647b2813d57c7cd60b66c/1/0/sampling.json",
      });

      await this.fitting.drapingUsingZcrpURL({
        zcrpURL:
          "https://files.clo-set.com/public/fitting/5021883564f647b2813d57c7cd60b66c/1/0/0/P0_162_52.zcrp",
      });
    };

    const notWorking = async () => {
      console.log("++ loadResizableAvatar");
      await this.fitting.loadResizableAvatar({
        avatarURL:
          "https://files.clo-set.com/public/fitting/avatar/3/Isla.zrest",
        sizingURL:
          "https://files.clo-set.com/public/fitting/avatar/3/Sizing.zip",
        accURL:
          "https://files.clo-set.com/public/fitting/avatar/3/Isla.Acc.map",
      });
      console.log("-- loadResizableAvatar");

      console.log("++ resizeAvatarWithAcc");
      await this.fitting.resizeAvatarWithAcc({
        height: 130,
        weight: 44,
        bodyShape: 3,
      });
      console.log("-- resizeAvatarWithAcc");

      // await this.fitting.loadGarmentData({
      //   garmentURL:
      //     "https://files.clo-set.com/public/fitting/6589407053fb4b88b844f191e3566a4b/1/3/0/garment.zrest",
      //   samplingURL:
      //     "https://files.clo-set.com/public/fitting/6589407053fb4b88b844f191e3566a4b/1/3/sampling.json",
      // });

      // await this.fitting.drapingUsingZcrpURL({
      //   zcrpURL:
      //     "https://files.clo-set.com/public/fitting/6589407053fb4b88b844f191e3566a4b/1/3/0/P0_130_44.zcrp",
      // });
    };

    const test = async () => {
      const samplingConfiguration = await this.fitting.garment.loadSamplingJson(
        {
          jsonURL:
            "https://files.clo-set.com/public/fitting/5021883564f647b2813d57c7cd60b66c/1/0/sampling.json",
        }
      );
      console.log(samplingConfiguration);

      // await this.fitting.loadDrapingDataFromURL({
      //   zcrpURL:
      //     "https://files.clo-set.com/public/fitting/5021883564f647b2813d57c7cd60b66c/1/0/0/P0_162_52.zcrp",
      //   mapMatMesh: this.zrest.matMeshMap,
      // });
      for (let height = 170; height <= 180; height += 100) {
        const avgWeight =
          samplingConfiguration.avgWeight +
          height -
          samplingConfiguration.avgHeight;

        var minWeight = Math.max(
          samplingConfiguration.minWeight,
          avgWeight - samplingConfiguration.weightOffset
        );
        var maxWeight = avgWeight + samplingConfiguration.weightOffset;

        for (let weight = minWeight; weight <= maxWeight; weight += 1) {
          await this.fitting.resizeAvatarWithAcc({
            height,
            weight,
            bodyShape: 0,
          });

          await this.fitting.drapingUsingZcrp({
            zcrpURL:
              "https://files.clo-set.com/public/fitting/5021883564f647b2813d57c7cd60b66c/1/0/0/P0_162_52.zcrp",
          });

          await this.fitting.loadDrapingData({
            rootPath:
              "https://files.clo-set.com/public/fitting/4decc245ab5f4ec7bd0687a94e7ec8e8/1/0/0/",
            height: height,
            weight: weight,
            mapMatMesh: this.zrest.matMeshMap,
          });

          // await this.fitting.getDrapingData(
          //   `https://files.clo-set.com/public/fitting/4decc245ab5f4ec7bd0687a94e7ec8e8/1/0/0/P0_${height}_${weight}.zcrp`,
          //   this.zrest.matMeshMap
          // );

          this.updateRenderer(1);
          await sleep(500);
          this.updateRenderer(1);
        }
      }
    };

    notWorking();
    // correctlyWorking();

    // test();
    this.updateRenderer(1);
  }

  fittingInit({ rootPath: rootPath, mapAvatarPath: mapAvatarPath }) {
    this.fitting.init({
      rootPath: rootPath,
      mapAvatarPath: mapAvatarPath,
    });
  }

  onMouseMove(e) {
    e.preventDefault();
    if (this.annotation && this.object3D) this.annotation.onMouseMove(e);
  }

  onMouseDown(e) {
    e.preventDefault();

    if (this.annotation && this.object3D) {
      this.annotation.onMouseDown(e);
    }

    if (this.techPack && this.techPack.matMeshMap.size > 0) {
      const selectedMarker = this.techPack.onMouseDown(e);
      if (selectedMarker) {
        const selectedMarkerIdx = selectedMarker.message - 1;
        this.techPack.onMarker([
          {
            index: selectedMarkerIdx,
            id: selectedMarker.message,
          },
        ]);
        this.updateRenderer();
      }
    }
  }

  onMouseUp(e) {
    e.preventDefault();
    if (this.annotation && this.object3D) {
      this.annotation.onMouseUp(e);
    }
  }

  onMouseClick(e) {
    e.preventDefault();
    if (this.annotation && this.object3D) {
      this.annotation.onMouseClick(e);
    }
  }

  setVisibleAllGarment(visibility) {
    if (!this.zrest) return;

    const isGarment = (patternType) => {
      return this.MATMESH_TYPE.isGarment(patternType);
    };

    this.zrest.matMeshMap.forEach((matMesh) => {
      if (isGarment(matMesh.userData.TYPE)) {
        matMesh.visible = visibility;
      }
    });

    this.updateRenderer();
  }

  showByType(type) {
    this.zrest.matMeshMap.forEach((matMesh) => {
      matMesh.visible = type === matMesh.userData.TYPE;
    });

    this.updateRenderer();
  }

  setVisibleAllMarker(isVisibleTechPackMarker) {
    if (!this.techPack) {
      console.log("techPack is not found");
      return;
    }
    this.techPack.setAllMarkerVisible(isVisibleTechPackMarker);
    this.updateRenderer();
  }

  isExistGarment() {
    return this.isExistMatMeshType(MATMESH_TYPE.PATTERN_MATMESH);
  }

  isExistAvatar() {
    return this.isExistMatMeshType(MATMESH_TYPE.AVATAR_MATMESH);
  }

  isAvailableShowHide() {
    // TODO: check this condition statement always works stable
    return this.zrest.gVersion >= 4;
  }

  // TODO: consider remove duplicated routine about camMatrixPushOrder with getCameraMatrix()
  setCameraMatrix(mat, bShouldUpdateRendering) {
    if (mat !== undefined && mat.length === 12) {
      for (let i = 0; i < camMatrixPushOrder.length; ++i) {
        this.camera.matrix.elements[camMatrixPushOrder[i]] = mat[i];
      }

      if (bShouldUpdateRendering) {
        this.updateRenderer();
      }
    }
  }

  setAllAvatarVisible(visibility) {
    this.zrest.matMeshMap.forEach((matMesh) => {
      if (matMesh.userData.TYPE === MATMESH_TYPE.AVATAR_MATMESH) {
        matMesh.visible = visibility;
      }
    });

    this.updateRenderer();
  }

  setAllPatternVisible(bVisible) {
    this.techPack.setAllPatternVisible(bVisible);
    this.updateRenderer();
  }

  setStyleLineVisible(patternIdx, bVisible) {
    this.techPack.setStyleLineVisible(patternIdx, bVisible);
    this.updateRenderer();
  }

  setAllPatternTransparency(shouldReset = true) {
    const opacity = shouldReset ? 1.0 : this.config.selectedMarkerOpacity;
    this.techPack.setAllPatternTransparency(opacity);
    this.updateRenderer();
  }

  getShowHideStatus(type) {
    for (const mesh of this.zrest.matMeshMap.values()) {
      if (mesh.userData.TYPE === type) {
        return mesh.visible;
      }
    }
    return false;
  }

  getGarmentShowHideStatus() {
    return this.getShowHideStatus(this.zrest.MATMESH_TYPE.PATTERN_MATMESH);
  }

  getAvatarShowHideStatus() {
    return this.getShowHideStatus(this.zrest.MATMESH_TYPE.AVATAR_MATMESH);
  }

  getCameraMatrix() {
    const camMatrix = this.camera.matrix.elements;
    return camMatrixPushOrder.map((index) => camMatrix[index]);
  }

  fullscreen() {
    if (!screenfull.isFullscreen) {
      this.lastWidth = this.setter.clientWidth;
      this.lastHeight = this.setter.clientHeight;
    }

    const elem = this.setter;
    if (screenfull.enabled) {
      screenfull.on("change", () => {
        if (screenfull.isFullscreen) {
          this.setWindowSize(screen.width, screen.height);
        } else {
          this.setWindowSize(this.lastWidth, this.lastHeight);
        }
      });

      screenfull.toggle(elem);
    }
  }

  setWindowSize(w, h) {
    windowHalfX = w / 2;
    windowHalfY = h / 2;

    this.renderer.setSize(w, h);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.render();
  }

  onWindowResize(datas) {
    const data = {
      width: screen.width,
      height: screen.height,
      fullscreen: false,
      marketplace: false,
      reponsive: false,
    };
    // TODO: Is it necessary using jQuery? Why?
    $.extend(data, datas);

    if (data.fullscreen || data.responsive) {
      setRenderSize(data.width, data.height);
    } else {
      if (data.marketplace) {
        setRenderSize(520, 650);
      } else {
        setRenderSize(650, 750);
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.render();
  }

  render() {
    if (this.annotation) this.annotation.updateAnnotationPointerSize(); // update annotation pointer size
    if (this.techPack) this.techPack.updatePointerSize();

    this.renderer.autoClear = false;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera); // draw object

    if (!PRODUCTION) rendererStats.update(this.renderer);
  }

  updateRenderer(t = 100) {
    // 여기에 pointer 업데이트 하는 함수 콜하기.
    this.controls.update();
    setTimeout(this.render, t);
  }

  stopRender() {
    if (requestId) {
      window.cancelAnimationFrame(requestId);
      this.scene = null;
      this.camera = null;
      this.controls = null;
      this.renderer = null;
      requestId = undefined;
    }
  }

  loadZrestUrl(url, onProgress, onLoad, colorwayIndex) {
    if (!url) return;
    this.loadZrestUrlWithParameters(url, onProgress, onLoad, colorwayIndex);
  }

  loadZrestData(data, onLoad, colorwayIndex) {
    if (!data) return;
    this.loadZrestUrlWithParameters(data, null, onLoad, colorwayIndex);
  }

  async loadZrestUrlWithParameters(
    url,
    onProgress,
    onLoad,
    colorwayIndex = -1,
    isAsync = false
  ) {
    console.log(this.zrest);

    const progress = function (xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        const percent = Math.round(percentComplete, 2);
        if (onProgress) onProgress(percent);
      }
    };

    const error = function (xhr) {};

    const loaded = async (object, loadedCamera, data) => {
      this.annotation.init({
        zrest: this.zrest,
      });

      // FIXME: This module does not work correctly
      // delete object3D, geometry, material dispose
      for (let i = 0; i < this.scene.children.length; ++i) {
        if (this.scene.children[i].name === "object3D") {
          clearThree(this.scene.children[i]);
        }
      }

      if (colorwayIndex > -1) {
        await this.changeColorway(colorwayIndex);
      }

      this.zrest.addThreeContainerUniquely(object);
      // this.scene.add(object);
      // this.object3D = object;
      this.zrest.zoomToObjects(loadedCamera, this.scene);

      if (onLoad) onLoad(this);

      this.updateRenderer();
    };

    if (this.zrest !== undefined) {
      this.zrest.clearMaps();
      this.zrest.clear();
      this.zrest = null;
      this.zrest = new ZRestLoader({
        scene: this.scene,
        camera: this.camera,
        controls: this.controls,
        cameraPosition: this.cameraPosition,
      });
    }

    if (url.constructor === ArrayBuffer) {
      this.zrest.parse(url, loaded);
      return;
    }

    if (isAsync) {
      if (url.constructor === String) {
        await this.zrest.loadUrl(url, loaded, progress, error);
      }
      return;
    }

    if (url.constructor === String) {
      this.zrest.load(url, loaded, progress, error);
    }
  }

  loadTechPack(fabricsWithPatternsFromAPI, trimsFromAPI) {
    const matShapeMap = this.zrest.meshFactory.matmeshManager.matShapeMap;
    const matMeshMap = this.zrest.matMeshMap;
    this.techPack.load(
      matShapeMap,
      matMeshMap,
      fabricsWithPatternsFromAPI,
      trimsFromAPI
    );

    this.loadStyleLine();
    this.loadMeasure();
  }

  loadStyleLine() {
    const styleLineMap = this.zrest.getStyleLineMap();
    this.techPack.loadStyleLine(styleLineMap);
  }

  loadMeasure() {
    const measureData = this.zrest.getListPatternMeasure();
    this.techPack.loadMeasure(measureData);
  }

  onUpdateCamera(callback) {
    this.updateCamera = callback;
  }

  setCameraPosition(position, target) {
    this.camera.position.copy(position);
    if (target) this.controls.target.copy(target);
    this.updateRenderer();
  }

  getColorwaySize() {
    const colorwaySize = this.zrest.getColorwaySize();
    console.log("colorwaySize: " + colorwaySize);
    return colorwaySize;
  }

  getCurrentColorwayIndex() {
    return this.zrest.getCurrentColorwayIndex();
  }

  isExistMatMeshType(type) {
    if (typeof this.zrest === "undefined") return false;

    for (const matMesh of this.zrest.matMeshMap) {
      if (matMesh[1].userData.TYPE === type) {
        return true;
      }
    }
    return false;
  }

  // async loadZrestForFitting({
  //   url: url,
  //   funcOnProgress: onProgress,
  //   funcOnLoad: onLoad,
  //   isAvatar: isAvatar = false,
  // }) {
  //   const scene = this.scene;

  //   const progress = function (xhr) {
  //     if (xhr.lengthComputable) {
  //       const percentComplete = (xhr.loaded / xhr.total) * 100;
  //       const percent = Math.round(percentComplete, 2);
  //       if (onProgress) onProgress(percent);
  //     }
  //   };

  //   const error = function (xhr) {};

  //   // const loaded = () => {};
  //   const loaded = async (object, loadedCamera, data) => {
  //     if (isAvatar) this.zrest.addToScene(object, "fittingAvatar");
  //     else this.zrest.addToScene(object, "fittingGarment");
  //     // this.addToScene(object);

  //     if (onLoad) onLoad(this);

  //     this.zrest.zoomToObjects(loadedCamera, this.scene);
  //     if (!isAvatar) this.updateRenderer();
  //     // else this.setAllAvatarVisible(false);
  //     // this.updateRenderer();

  //     return scene;
  //   };

  //   if (this.zrest !== undefined) {
  //     this.zrest.clearMaps();
  //     this.zrest = null;
  //   }

  //   this.zrest = new ZRestLoader({
  //     scene: this.scene,
  //     camera: this.camera,
  //     controls: this.controls,
  //     cameraPosition: this.cameraPosition,
  //   });

  //   const dataArr = await this.zrest.loadOnly(url, progress);
  //   await this.zrest.parseAsync(dataArr, loaded);

  //   return this.zrest;
  // }

  loadSeparatedZrest = async (zrestJSON, onProgress, colorwayIndex) => {
    const rest = zrestJSON.rest;
    const imgs = zrestJSON.images;
    const dracos = zrestJSON.dracos;

    this.zrest = new ZRestLoader({
      scene: this.scene,
      camera: this.camera,
      controls: this.controls,
      cameraPosition: this.cameraPosition,
    });

    const object = await this.zrest.loadZrestDisassembly(
      rest,
      dracos,
      imgs,
      this.updateRenderer,
      onProgress
    );
    this.annotation.init({
      zrest: this.zrest,
    });

    // FIXME: This module does not work correctly
    // delete object3D, geometry, material dispose
    for (let i = 0; i < this.scene.children.length; ++i) {
      if (this.scene.children[i].name === "object3D") {
        clearThree(this.scene.children[i]);
      }
    }

    // if (colorwayIndex > -1) {
    //   await this.changeColorway(colorwayIndex);
    // }
    this.scene.add(object);
    this.object3D = object;
    this.zrest.zoomToObjects(this.zrest.zProperty.loadedCamera, this.scene);

    // if (onLoad) onLoad(this);

    // TODO
    //  1. Colorway
    //  2. zoomToObject
    //  3. onLoad function

    console.log("==============================");
    console.log("UPDATE RENDERER");
    console.log("==============================");
    this.updateRenderer();
  };

  loadZrest = async (zrestData, onProgress, colorwayIndex) => {
    const zrestItem = zrestData && zrestData.result;
    if (!zrestItem) {
      throw new Error("require zrest data");
    }
    if (typeof zrestItem === "string") {
      await this.loadZrestUrlWithParameters(
        zrestItem,
        onProgress,
        () => {},
        colorwayIndex,
        true
      );
    } else {
      await this.loadSeparatedZrest(zrestItem, onProgress, colorwayIndex);
    }
  };

  s(type) {
    this.zrest.matMeshMap.forEach((matMesh) => {
      if (matMesh.userData.TYPE == type) console.log(matMesh);
    });
  }

  // NOTE: This is test only
  loadZrestTest = (testNo) => {
    const testData = getTestData(testNo);
    console.log(testData);

    const json = Object();
    json.rest = [testData.testRest];
    json.imgs = testData.testImgs;
    json.dracos = testData.testDraco;

    this.loadSeparatedZrest(json);
  };

  async changeColorway(colorwayIdx) {
    await this.zrest.changeColorway(colorwayIdx);
    this.updateRenderer();
  }

  // TEMP
  alertVersion() {
    alert(this.mobileDetect.os());
  }

  dispose() {
    if (this.zrest && this.zrest.req) {
      this.zrest.abort();
    }
    if (this.annotation) {
      this.annotation.clear();
    }
  }
}

function clearThree(obj) {
  while (obj.children.length > 0) {
    clearThree(obj.children[0]);
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
}
