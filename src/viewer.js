/* eslint-disable require-jsdoc */
import ZRestLoader, {dataWorkerFunction, checkFileReaderSyncSupport} from './lib/clo/readers/ZrestReader';
import * as THREE from '@/lib/threejs/three';
import '@/lib/threejs/OrbitControls';
import '@/lib/draco/DRACOLoader';

import RendererStats from '@xailabs/three-renderer-stats';
import AnnotationManager from '@/lib/annotation/AnnotationManager';
import screenfull from 'screenfull';
import MarkerManager from '@/lib/Marker/MarkerManager';
import MobileDetect from 'mobile-detect';

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let rendererStats = null;

checkFileReaderSyncSupport();

const cameraHeight = 1100;
const cameraDistance = 5000;

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
    this.setVisibleAllAvatar = this.setVisibleAllAvatar.bind(this);
    this.isExistGarment = this.isExistGarment.bind(this);
    this.isExistAvatar = this.isExistAvatar.bind(this);
    this.getGarmentShowHideStatus = this.getGarmentShowHideStatus.bind(this);
    this.getAvatarShowHideStatus = this.getAvatarShowHideStatus.bind(this);
    this.isAvailableShowHide = this.isAvailableShowHide.bind(this);
    this.setCameraPosition = this.setCameraPosition.bind(this);
    this.updateRender = this.updateRender.bind(this);
    this.loadZrestData = this.loadZrestData.bind(this);
    this.fullscreen = this.fullscreen.bind(this);

    this.object3D = null;
  }

  init({width, height, element, cameraPosition = null, stats}) {
    const mobileDetect = new MobileDetect(window.navigator.userAgent);
    const w = this.defaultWidth = width;
    const h = this.defaultHeight = height;

    this.setter = document.getElementById(element) || document.querySelector(element);
    this.id = element;
    this.cameraPosition = cameraPosition;
    this.stats = stats;

    windowHalfX = w / 2;
    windowHalfY = h / 2;

    // create webgl renderer
    this.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    this.renderer.setClearColor(0xcccccc);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.sortObjects = false; // 투명 object 제대로 렌더링하려면 자동 sort 꺼야 한다
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setter.appendChild(this.renderer.domElement);

    // create camera
    this.camera = appendDefaultCamera();
    this.camera.position.set(0, cameraHeight, cameraDistance);

    // create camera controller
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target = new THREE.Vector3(0, cameraHeight, 0);
    this.controls.update();
    this.controls.addEventListener('change', () => {
      if (this.updateCamera) this.updateCamera({target: this.controls.target, position: this.camera.position, id: this.id});
      this.render();
    });


    // create scenegraph
    this.scene = new THREE.Scene();

    // 이제 version 3 이후 파일에 대해서는 shader에서 light 설정을 hard coding해서 사용한다. 하지만 version 2 이하 파일을 위해 여기에서도 설정한다.
    const DirLight0 = new THREE.DirectionalLight(0xd2d2d2);
    DirLight0.position.set(0, 0, 1).normalize();
    DirLight0.castShadow = false;
    // specular1 : 464646

    const DirLight1 = new THREE.DirectionalLight(0x6e6e6e);
    DirLight1.position.set(1500, 3000, 1500);
    DirLight1.castShadow = (mobileDetect.os() === "iOS")? false : true;

    // set up shadow properties for the light
    DirLight1.shadow.mapSize.width = 2048;  // default
    DirLight1.shadow.mapSize.height = 2048; // default
    DirLight1.shadow.camera.near = 2000;    // default
    DirLight1.shadow.camera.far = 7000;     // default
    DirLight1.shadow.camera.right = 1500;
    DirLight1.shadow.camera.left = -1500;
    DirLight1.shadow.camera.top = 1500;
    DirLight1.shadow.camera.bottom = -1500;
    DirLight1.shadow.bias = -0.001;
    // specular2 : 3c3c3c

    // scene.add(new THREE.AmbientLight(0x8c8c8c));// amibent light은 추가하지 않고 shader에서 하드코딩으로 처리한다. CLO와 three.js 의 light 구조가 다르므로 이렇게 하자
    this.scene.add(DirLight0);
    this.scene.add(DirLight1);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(require('@/lib/clo/background/img_3dwindow_bg_Designer.png'));
    this.backgroundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2, 0),
        new THREE.MeshBasicMaterial({
          map: texture,
        })
    );

    this.backgroundMesh.material.depthTest = false;
    this.backgroundMesh.material.depthWrite = false;

    this.background_scene = new THREE.Scene();
    this.background_camera = new THREE.Camera();

    this.background_scene.add(this.background_camera);
    this.background_scene.add(this.backgroundMesh);

    this.annotation = new AnnotationManager({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      updateRender: this.updateRender,
      setter: this.setter,
    });

    this.marker = new MarkerManager({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      updateRender: this.updateRender,
    });

    // canvas event
    const canvas = this.setter;
    canvas.addEventListener('mouseout', () => this.controls.noPan = true, false);
    canvas.addEventListener('mouseover', () => this.controls.noPan = false, false);
    canvas.addEventListener('mousedown', this.onMouseDown, false);
    canvas.addEventListener('mousemove', this.onMouseMove, false);
    canvas.addEventListener('mouseup', this.onMouseUp, false);
    canvas.addEventListener('click', this.onMouseClick, false);

    function appendDefaultCamera() {
      let fov = 15;
      let aspect = w / h;
      let near = 100;
      let far = 100000;

      return new THREE.PerspectiveCamera(fov, aspect, near, far);
    }

    if (!PRODUCTION && this.stats) {
      rendererStats.domElement.style.position	= 'absolute';
      rendererStats.domElement.style.left	= '-100px';
      rendererStats.domElement.style.top	= '0px';
      this.setter.appendChild( rendererStats.domElement );
    }

    this.updateRender(1);
  }

  onMouseMove( e ) {
    e.preventDefault();
    if (this.annotation && this.object3D) this.annotation.onMouseMove(e);
    if (this.marker) this.marker.onMouseMove(e);
  }

  onMouseDown( e ) {
    e.preventDefault();
    if (this.annotation && this.object3D) this.annotation.onMouseDown(e);
    if (this.marker) this.marker.onMouseDown(e);
  }

  onMouseUp( e ) {
    e.preventDefault();
    if (this.annotation && this.object3D) this.annotation.onMouseUp(e);
    if (this.marker) this.marker.onMouseUp(e);
  }

  onMouseClick( e ) {
    e.preventDefault();
    if (this.annotation && this.object3D) this.annotation.onMouseClick(e);
    if (this.marker) this.marker.onMouseUp(e);
  }

  setVisibleAllGarment(visibility) {
    let matMeshType = this.zrest.MATMESH_TYPE;

    for(let i=0; i<this.zrest.matMeshList.length; ++i) {
      let t = this.zrest.matMeshList[i].userData.TYPE;

      if(t == matMeshType.PATTERN_MATMESH || t == matMeshType.TRIM_MATMESH || t == matMeshType.PRINTOVERLAY_MATMESH || t == matMeshType.BUTTONHEAD_MATMESH || t == matMeshType.STITCH_MATMESH ) {
        this.zrest.matMeshList[i].visible = visibility;
      }
    }

    this.updateRender();
  }



  isExistGarment() {
    return isExistMatMeshType(this.zrest.MATMESH_TYPE.PATTERN_MATMESH)
  }
  
  isExistAvatar() {
    return isExistMatMeshType(this.zrest.MATMESH_TYPE.AVATAR_MATMESH)
  }

  setVisibleAllAvatar(visibility) {
    for(let i=0; i<this.zrest.matMeshList.length; i++) {
      if(this.zrest.matMeshList[i].userData.TYPE == this.zrest.MATMESH_TYPE.AVATAR_MATMESH) {
        this.zrest.matMeshList[i].visible = visibility;
      }
    }
    
    this.updateRender();
  }
  
  getShowHideStatus(type) {
    for (let i=0; i<this.zrest.matMeshList.length; i++) {
      if (this.zrest.matMeshList[i].userData.TYPE == type) {
        if (this.zrest.matMeshList[i].visible === true) {
          return true;
        }
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

  isAvailableShowHide() {
    return (this.zrest.gVersion >= 4) // TODO: check this condition statement always works stable
  }

  getCameraMatrix() {
    let camMatrix = this.camera.matrix.elements;
    const camMatrixPushOrder = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14];

    return camMatrixPushOrder.map(index => camMatrix[index]);
  }

  // TODO: consider remove duplicated routine about camMatrixPushOrder with getCameraMatrix()
  setCameraMatrix(mat, bUpdateRendering) {
    if (mat !== undefined && mat.length === 12) {
      let camMatrixPushOrder = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14];  

      for (let i=0; i<camMatrixPushOrder.length; ++i) {
        this.camera.matrix.elements[camMatrixPushOrder[i]] = mat[i];
      }

      // TODO: consider remove === operation
      if (bUpdateRendering === true)   
        this.updateRender()
    }
  }

  fullscreen = () => {
    if (!screenfull.isFullscreen) {
      this.lastWidth = this.setter.clientWidth
      this.lastHeight = this.setter.clientHeight
    }

    const elem = this.setter
    if (screenfull.enabled) {
      screenfull.on('change', () => {
        if(screenfull.isFullscreen) {
          this.setWindowSize(screen.width, screen.height)
        } else {
          this.setWindowSize(this.lastWidth, this.lastHeight)
        }
      });

      screenfull.toggle(elem)
    }
  }

  setWindowSize = (w, h) => {
    windowHalfX = w / 2;
    windowHalfY = h / 2;

    this.renderer.setSize(w, h);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.render()
  }

  onWindowResize(datas) {
    var data = {
      width : screen.width,
      height : screen.height,
      fullscreen : false,
      marketplace : false,
      reponsive : false,
    }
    $.extend(data, datas);    // TODO: Is it necessary using jQuery? Why?

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

    if (this.marker) this.marker.updatePointerSize(); // update pointer size
    //
    this.renderer.autoClear = false;
    this.renderer.clear();

    this.renderer.render(this.background_scene, this.background_camera); // draw background
    this.renderer.render(this.scene, this.camera); // draw object

    if (!PRODUCTION) rendererStats.update(this.renderer);
  }

  updateRender(t = 100) {
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

  onUpdateCamera(callback) {
    this.updateCamera = callback;
  }

  loadZrestUrl(url, onProgress, onLoad, colorwayIndex) {
    if (!url) return;
    this.loadZrestUrlWithParameters(url, onProgress, onLoad, colorwayIndex);
  }

  loadZrestData(data, onLoad, colorwayIndex) {
    if (!data) return;
    this.loadZrestUrlWithParameters(data, null, onLoad, colorwayIndex);
  }

  loadZrestUrlWithParameters(url, onProgress, onLoad, colorwayIndex) {
    const progress = function(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = xhr.loaded / xhr.total * 100;
        const percent = Math.round(percentComplete, 2);
        if (onProgress) onProgress(percent);
      }
    };

    const error = function(xhr) { };

    const loaded = async (object, loadedCamera, data) => {
      this.annotation.init({
        zrest: this.zrest,
      });

      this.marker.init({
        zrest: this.zrest,
      });

      // delete object3D, geometry, material dispose
      for (let i = 0; i < this.scene.children.length; i++) {
        if (this.scene.children[i].name === 'object3D') {
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

      this.updateRender();
    };

    if (this.zrest !== undefined) {
      this.zrest.clearMaps();
      this.zrest = null;
    }

    if (url.constructor === ArrayBuffer) {
      this.zrest = new ZRestLoader({scene: this.scene, marker: this.marker, camera: this.camera, controls: this.controls, cameraPosition: this.cameraPosition});
      this.zrest.parse(url, loaded);
      return;
    }

    if (url.constructor === String) {
      this.zrest = new ZRestLoader({scene: this.scene, marker: this.marker, camera: this.camera, controls: this.controls, cameraPosition: this.cameraPosition});
      this.zrest.load(url, loaded, progress, error);
    }
  }

  setCameraPosition(position, target) {
    this.camera.position.copy(position);
    if (target) this.controls.target.copy(target);
    this.updateRender();
  }

  getColorwaySize() {
    return this.zrest.getColorwaySize();
  }

  // TODO: This function should be moved to zrestReader.js
  async changeColorway(number) {
    if (number === undefined) {
      return;
    }

    if (this.zrest.colorwaySize - 1 < number) {
      console.log('index is over colorway size');
      return;
    }

    if (this.zrest.currentColorwayIndex === number) {
      console.log('index is same current index');
      return;
    }

    if (this.zrest.jsZip === undefined || this.zrest.jsZip === null) {
      console.log('zip is null');
      return;
    }
    this.zrest.currentColorwayIndex = number;
    console.log("selected colorway index: " + number);

    const matMeshList = this.zrest.matMeshList;

    for (let i = 0; i < matMeshList.length; ++i) {
      const prevMaterial = matMeshList[i].material;
      let preUseSeamPuckeringMap = false;
      //console.log(prevMaterial.uniforms, prevMaterial.uniforms.bUseSeamPuckeringNormal);
      if (prevMaterial.uniforms.bUseSeamPuckeringNormal !== undefined) {
        preUseSeamPuckeringMap = prevMaterial.uniforms.bUseSeamPuckeringNormal.value;
      }

      this.SafeDeallocation(prevMaterial, THREE.ShaderMaterial, function() {/* console.log("success deallocation");*/}, function() {/* console.log("unsuccess deallocation");*/});

      const id = matMeshList[i].userData.MATMESH_ID;

      // TODO: hide this function!
      matMeshList[i].material = await this.zrest.makeMaterialForZrest(this.zrest.jsZip, this.zrest.materialInformationMap.get(id), number, preUseSeamPuckeringMap, this.zrest.camera, this.zrest.meshFactory.version);
    }

    this.updateRender();
  }

  SafeDeallocation(object, type, type_cb, nontype_cb) {
    if (object instanceof type) {
      type_cb(object);
    } else {
      nontype_cb(object);
    }
  }
};

function isExistMatMeshType(type) {
  console.log('isExistMatMeshType');
  for(let i=0; i<this.zrest.matMeshList.length; ++i) {
    if(this.zrest.matMeshList[i].userData.TYPE == type) {
      return true;
    }
  }
  return false;
};

function clearThree(obj) {
  while (obj.children.length > 0) {
    clearThree(obj.children[0]);
    obj.remove(obj.children[0]);
  }

  const disposeIfExists = (component) => {
    if(component !== undefined)
      component.dispose();
  };

  disposeIfExists(obj.geometry);
  disposeIfExists(obj.material);
  disposeIfExists(obj.texture);

  obj = undefined;
}