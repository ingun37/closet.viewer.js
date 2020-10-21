/* eslint-disable require-jsdoc */
import ZRestLoader, {
  dataWorkerFunction,
  checkFileReaderSyncSupport,
} from "@/lib/clo/readers/ZrestLoader";
import * as THREE from "three";
import {OrbitControls} from "./lib/custom-orbitcontrol/OrbitControls";
import "@/lib/draco/DRACOLoader";

import AnnotationManager from "@/lib/annotation/AnnotationManager";
import TechPackManager from "@/lib/techPack/TechPackManager";

import screenfull from "screenfull";
import MobileDetect from "mobile-detect";

import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;


checkFileReaderSyncSupport();

const cameraHeight = 1100;
const cameraDistance = 5000;
const camMatrixPushOrder = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14];

let requestId = null;


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
    this.mobileDetect = new MobileDetect(window.navigator.userAgent);

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
    this.controls = new OrbitControls(
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

    /*
     * 이제 version 3 이후 파일에 대해서는 shader에서 light 설정을 hard coding해서 사용한다.
     * 하지만 version 2 이하 파일을 위해 여기에서도 설정한다.
     * by Jaden
     */
    const DirLight0 = new THREE.DirectionalLight(0xd2d2d2);
    DirLight0.position.set(0, 0, 1).normalize();
    DirLight0.castShadow = false;
    // specular1 : 464646

    const DirLight1 = new THREE.DirectionalLight(0x6e6e6e);
    DirLight1.position.set(1500, 3000, 1500);
    DirLight1.castShadow = this.mobileDetect.os() === "iOS" ? false : true;

    // set up shadow properties for the light
    DirLight1.shadow.mapSize.width = 2048; // default
    DirLight1.shadow.mapSize.height = 2048; // default
    DirLight1.shadow.camera.near = 2000; // default
    DirLight1.shadow.camera.far = 7000; // default
    DirLight1.shadow.camera.right = 1500;
    DirLight1.shadow.camera.left = -1500;
    DirLight1.shadow.camera.top = 1500;
    DirLight1.shadow.camera.bottom = -1500;
    DirLight1.shadow.bias = -0.001;
    // specular2 : 3c3c3c

    /*
     * scene.add(new THREE.AmbientLight(0x8c8c8c));
     * amibent light은 추가하지 않고 shader에서 하드코딩으로 처리한다.
     * CLO와 three.js 의 light 구조가 다르므로 이렇게 하자.
     * by Jaden
     */

    this.scene.add(DirLight0);
    this.scene.add(DirLight1);

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

    this.updateRenderer(1);
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
          { index: selectedMarkerIdx, id: selectedMarker.message },
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

  loadZrestUrlWithParameters(url, onProgress, onLoad, colorwayIndex = -1) {
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
      this.scene.add(object);
      this.object3D = object;
      this.zrest.zoomToObjects(loadedCamera, this.scene);

      if (onLoad) onLoad(this);

      this.updateRenderer();
    };

    if (this.zrest !== undefined) {
      this.zrest.clearMaps();
      this.zrest = null;
    }

    if (url.constructor === ArrayBuffer) {
      this.zrest = new ZRestLoader({
        scene: this.scene,
        camera: this.camera,
        controls: this.controls,
        cameraPosition: this.cameraPosition,
      });
      this.zrest.parse(url, loaded);
      return;
    }

    if (url.constructor === String) {
      this.zrest = new ZRestLoader({
        scene: this.scene,
        camera: this.camera,
        controls: this.controls,
        cameraPosition: this.cameraPosition,
      });
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
    return this.zrest.getColorwaySize();
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

  // TODO: This function should be moved to zrestReader.js
  async changeColorway(colorwayIdx) {
    if (colorwayIdx === undefined) {
      return;
    }

    if (this.zrest.colorwaySize - 1 < colorwayIdx) {
      console.log("index is over colorway size");
      return;
    }

    if (this.zrest.jsZip === undefined || this.zrest.jsZip === null) {
      console.log("zip is null");
      return;
    }

    console.log("selected colorway index: " + colorwayIdx);

    const matMeshMap = this.zrest.matMeshMap;
    for (const matMesh of matMeshMap.values()) {
      const prevMaterial = matMesh.material;
      if (!prevMaterial) return;
      const bPrevUseSeamPuckeringMap =
        prevMaterial.uniforms.bUseSeamPuckeringNormal !== undefined
          ? prevMaterial.uniforms.bUseSeamPuckeringNormal.value
          : false;
      const id = matMesh.userData.MATMESH_ID;

      // TODO: hide this function!
      matMesh.material = await this.zrest.makeMaterialForZrest(
        this.zrest.jsZip,
        this.zrest.getMaterialInformationMap().get(id),
        colorwayIdx,
        bPrevUseSeamPuckeringMap,
        this.zrest.camera,
        this.zrest.meshFactory.version
      );
    }

    this.updateRenderer();
  }

  clear() {
    if (!this.zrest) {
      console.log(this.zrest);
      console.log("ZRest not found!");
      return;
    }

    const matMeshMap = this.zrest.matMeshMap;
    for (const matMesh of matMeshMap.values()) {
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

    this.zrest.clearMaps();
  }

  // TEMP
  alertVersion() {
    alert(this.mobileDetect.os());
  }

  safeDeallocation(object, type, type_cb, nontype_cb) {
    if (object instanceof type) {
      type_cb(object);
    } else {
      nontype_cb(object);
    }
  }

  dispose() {
    if (this.zrest.req) {
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
