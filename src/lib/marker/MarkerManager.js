/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
import { Marker, makeTextSprite } from "@/lib/marker/Marker";

const pointerScaleVector = new THREE.Vector3();
const pointerScaleFactor = 65;

class MarkerManager {
  constructor(markerName, { scene, camera, renderer, controls }) {
    this.markerName = markerName;

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.markerMap = new Map();
    this.geometryList = []; // Geometry information for three.js
    this.refreshGeometryList = this.refreshGeometryList.bind(this);

    this.add = this.add.bind(this);

    this.addToScene = this.addToScene.bind(this);
    this.removeFromScene = this.removeFromScene.bind(this);

    this.raycaster = new THREE.Raycaster();
    this.checkIntersectObject = this.checkIntersectObject.bind(this);

    // this.onMouseDown = this.onMouseDown.bind(this);
    // this.onMarker = this.onMarker.bind(this);
    this.init();
  }

  init() {
    this.container = new THREE.Object3D();
    this.container.name = this.markerName + "Container";

    this.addToScene();
  }

  updatePointerSize() {
    this.markerMap.forEach(marker => {
      const scale = pointerScaleVector.subVectors(marker.sprite.position, this.camera.position).length() / pointerScaleFactor;
      marker.sprite.scale.set(scale / 2, scale / 2, 1);
    });
  }

  refreshGeometryList() {
    this.geometryList = [];

    // NOTE: Index of a marker begins at 1
    for (let i = 0; i < this.markerMap.size; i++) {
      const marker = this.markerMap.get(i + 1).sprite;
      this.geometryList.push(marker);
    }
  }

  add(index, { pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message }, isVisible = true) {
    // pointer 좌표만 들고있다가 render 할때마다 만드는건 개 비효율이겠지? 그냥 그때 그때 계속 추가하자.
    const params = {
      fontsize: 48,
      borderColor: { r: 255, g: 255, b: 255, a: 0.5 },
      backgroundColor: { r: 255, g: 245, b: 0, a: 1 },
      fillStyle: "rgba(25, 25, 26, 1.0)",
      name: this.markerName
    };

    const sprite = makeTextSprite(message, params);
    sprite.position.set(pointerPos.x, pointerPos.y, pointerPos.z);
    sprite.visible = isVisible;

    this.container.add(sprite);

    // NOTE: A message of a marker replaced with a index.
    const marker = new Marker(pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, index, sprite);
    this.markerMap.set(index, marker);

    this.refreshGeometryList();

    return sprite.id;
  }

  insert({ pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message }, isVisible = true) {
    this.add(
      this.markerMap.size + 1,
      {
        pointerPos,
        faceNormal,
        cameraPos,
        cameraTarget,
        cameraQuaternion,
        message
      },
      isVisible
    );
  }

  setVisible(index, bVisible) {
    const marker = this.markerMap.get(index + 1);
    if (marker) {
      marker.sprite.visible = bVisible;
    }
  }

  setVisibleForAll(bVisible) {
    this.markerMap.forEach(marker => {
      if (!marker.sprite) {
        return;
      }
      marker.sprite.visible = bVisible;
    });
  }

  deleteAll() {
    this.markerMap.clear();
    const names = this.container.children.map(item => item.name);
    names.map(name => {
      const sprite = this.container.getObjectByName(name);
      this.container.remove(sprite);
    });
  }

  getMousePosition({ clientX, clientY }) {
    const canvasBounds = this.renderer.context.canvas.getBoundingClientRect();
    const x = ((clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
    const y = -((clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;

    return { x, y };
  }

  checkIntersectObject({ clientX, clientY }) {
    if (this.markerMap.length <= 0) {
      return;
    }
    const mouse = this.getMousePosition({ clientX, clientY });
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.geometryList, true);

    if (intersects.length > 0) {
      // 처리할거 하고 return;
      for (let i = 1; i <= this.markerMap.size; ++i) {
        const marker = this.markerMap.get(i);
        if (intersects[0].object === marker.sprite) {
          console.log(marker);
          return marker;
        }
      }
    }
  }

  removeFromScene() {
    this.scene.remove(this.container);
  }

  addToScene() {
    this.scene.add(this.container);
  }
}

export default MarkerManager;
