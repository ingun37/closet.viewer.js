/* eslint-disable require-jsdoc */
import * as THREE from '@/lib/threejs/three';
import {Marker, makeTextSprite} from '@/lib/marker/Marker';
import {MATMESH_TYPE} from '@/lib/clo/readers/predefined';

const pointerScaleVector = new THREE.Vector3();
const pointerScaleFactor = 65;

class TechPackManager {
  constructor({scene, camera, renderer, controls}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.markerMap = new Map();
    this.markerGeometryList = [];
    this.styleLineMap = new Map();

    this.markerContainer = new THREE.Object3D();
    this.markerContainer.name = 'annotationContainer';
    this.scene.add(this.markerContainer);

    this.styleLineContainer = new THREE.Object3D();
    this.styleLineContainer.name = 'styleLineContainer';
    this.scene.add(this.styleLineContainer);

    this.raycaster = new THREE.Raycaster();

    this.loadTechPack = this.loadTechPack.bind(this);
    this.loadStyleLine = this.loadStyleLine.bind(this);
    this.addMarker = this.addMarker.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.refreshMarkerGeometryList = this.refreshMarkerGeometryList.bind(this);
    this.checkIntersectObject = this.checkIntersectObject.bind(this);

    this.extractPatternsFromMatMeshList = this.extractPatternsFromMatMeshList.bind(this);
    this.patternList = [];
  }

  loadTechPack(matShapeList, matMeshList) {
    this.loadTechPackFromMatShapeList(matShapeList);
    this.extractPatternsFromMatMeshList(matMeshList);
  }

  loadTechPackFromMatShapeList(matShapeList) {
    if (!matShapeList) return;

    this.markerMap.clear();
    //  NOTE: All elements in mapShape array have the same value.
    //  This module will be modified by TKAY and Daniel.
    let labelCounter = 1;
    for (let i = 0; i < matShapeList.length; ++i) {
      const matShape = matShapeList[i].get('listMatMeshIDOnIndexedMesh');
      const center = matShape[0].get('v3Center');
      const normal = matShape[0].get('v3Normal');
      const isPatternMesh = matShape.length === 3;

      if (!center || !normal || !isPatternMesh) {
        continue;
      }

      const position = {
        pointerPos: center,
        faceNormal: normal,
        cameraPos: this.camera.position,
        cameraTarget: this.controls.target,
        cameraQuaternion: this.camera.quaternion,
      };

      const index = labelCounter++;
      this.addMarker(index, {...position, message: index}, false);
    }
  }

  loadStyleLine(styleLineMap) {
    if (!styleLineMap) return;

    this.styleLineMap = styleLineMap;
    this.addStyleLinesToScene(false);
  }

  bindEventListener({onCompleteMove, onCompleteAnimation}) {
    this.onCompleteMove = onCompleteMove;
    this.onCompleteAnimation = onCompleteAnimation;
  }

  updatePointerSize() {
    this.markerMap.forEach( (marker) => {
      const scale = pointerScaleVector.subVectors(marker.sprite.position, this.camera.position).length() / pointerScaleFactor;
      marker.sprite.scale.set(scale / 2, scale / 2, 1);
    });
  }

  refreshMarkerGeometryList() {
    this.markerGeometryList = [];

    // NOTE: Index of a marker begins at 1
    for (let i = 0; i < this.markerMap.size; i++) {
      const marker = this.markerMap.get(i + 1).sprite;
      this.markerGeometryList.push(marker);
    }
  }

  addMarker(index, {pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message}, isVisible = true) {
    // pointer 좌표만 들고있다가 render 할때마다 만드는건 개 비효율이겠지? 그냥 그때 그때 계속 추가하자.
    const params = {
      fontsize: 48,
      borderColor: {r: 255, g: 255, b: 255, a: 0.5},
      backgroundColor: {r: 255, g: 245, b: 0, a: 1},
      fillStyle: 'rgba(25, 25, 26, 1.0)',
      name: 'techpack',
    };

    const sprite = makeTextSprite(message, params);
    sprite.position.set(pointerPos.x, pointerPos.y, pointerPos.z);
    sprite.visible = isVisible;

    this.markerContainer.add(sprite);

    // NOTE: A message of a marker replaced with a index.
    const marker = new Marker(pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, index, sprite);
    this.markerMap.set(index, marker);

    this.refreshMarkerGeometryList();

    return sprite.id;
  }

  setMarkerVisible(index, bVisible) {
    if (!this.markerMap.get(index).sprite.visible) {
      return;
    }

    this.markerMap.get(index).sprite.visible = bVisible;
  }

  deleteAllMarker() {
    this.markerMap.clear();
    const names = this.markerContainer.children.map((item) => item.name);
    names.map((name) => {
      const sprite = this.markerContainer.getObjectByName(name);
      this.markerContainer.remove(sprite);
    });
  }

  setAllMarkerVisible(bVisible) {
    this.markerMap.forEach( (marker) => {
      if (!marker.sprite) {
        return;
      }
      marker.sprite.visible = bVisible;
    });
  }

  extractPatternsFromMatMeshList(matMeshList) {
    if (!matMeshList) return;

    const meshListWithoutAvater = [];
    for (let i = 0; i < matMeshList.length; ++i) {
      if (matMeshList[i].userData.TYPE == MATMESH_TYPE.PATTERN_MATMESH) {
        meshListWithoutAvater.push(matMeshList[i]);
      }
    }

    this.patternList = [];
    if (meshListWithoutAvater.length % 3 != 0) {
      console.log('Pattern extract failed.');
    } else {
      for (let i = 0; i < meshListWithoutAvater.length; i+=3) {
        this.patternList.push([meshListWithoutAvater[i], meshListWithoutAvater[i + 1], meshListWithoutAvater[i + 2]]);
      }
    }
    return this.patternList;
  }

  setPatternVisible(patternIdx, bVisible) {
    for (let i = 0; i < 3; ++i) {
      this.patternList[patternIdx][i].visible = bVisible;
    }
  }

  setAllPatternVisible(bVisible) {
    for (let i = 0; i < this.patternList.length; ++i) {
      this.setPatternVisible(i, bVisible);
    }
  }

  isValidPatternIdx(patternIdx) {
    return patternIdx >= 0 && patternIdx <= this.patternList.length;
  }

  setAllPatternTransparency(opacity) {
    for (let i = 0; i < this.patternList.length; ++i) {
      this.setPatternTransparency(i, opacity);
    }
  }

  setPatternTransparency(patternIdx, opacity) {
    if (!this.isValidPatternIdx) return;

    for (let i = 0; i < 3; ++i) {
      this.patternList[patternIdx][i].material.uniforms.materialOpacity = {type: 'f', value: opacity};
    }
  }

  togglePatternTransparency(patternIdx, selectedOpacity = 0.5, defaultOpacity = 1.0) {
    if (!this.isValidPatternIdx) return;

    for (let i = 0; i < 3; ++i) {
      const currentPattern = this.patternList[patternIdx][i];
      const currentOpacity = currentPattern.material.uniforms.materialOpacity.value;
      const opacity = (currentOpacity >= defaultOpacity) ? selectedOpacity : defaultOpacity;
      currentPattern.material.uniforms.materialOpacity = {type: 'f', value: opacity};
    }
  }

  addStyleLinesToScene(bVisible = true) {
    this.styleLineMap.forEach((styleLineSet) => {
      styleLineSet.forEach((line) => {
        line.visible = bVisible;
        this.styleLineContainer.add(line);
      });
    });
  }

  setStyleLineVisible(patternIdx, bVisible) {
    this.styleLineMap.get(patternIdx).forEach((line) => {
      line.visible = bVisible;
    });
  }

  setAllStyleLineVisible(bVisible) {
    this.styleLineMap.forEach((styleLineSet) => {
      styleLineSet.forEach((line) => {
        line.visible = bVisible;
      });
    });
  }

  // viewer에서 canvas 클릭시 실행
  onMouseDown(e, action) {
    this.mouseButtonDown = true;
    const item = this.checkIntersectObject(e);
    if (item) {
      this.pickedMarker = item;
      this.isMouseMoved = false;
      console.log(item);
      return item;
    }
  }

  onMouseMove(e) {
    // FIXME: This function does nothing
  }

  checkIntersectObject({clientX, clientY}) {
    if (this.markerMap.length <= 0) {
      return;
    }
    const mouse = this.getMousePosition({clientX, clientY});
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.markerGeometryList, true);

    if (intersects.length > 0) {
      // 처리할거 하고 return;
      for (let i = 1; i <= this.markerMap.size; ++i) {
        const marker = this.markerMap.get(i);
        if (intersects[0].object === marker.sprite) {
          return marker;
        }
      }
    }
  }

  getMousePosition({clientX, clientY}) {
    const canvasBounds = this.renderer.context.canvas.getBoundingClientRect();
    const x = ((clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
    const y = -((clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;

    return {x, y};
  }
}

export default TechPackManager;
