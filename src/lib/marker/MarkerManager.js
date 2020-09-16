/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
import { Marker, makeTextSprite } from "./";

const pointerScaleVector = new THREE.Vector3();
const pointerScaleFactor = 100;

// TODO: Index and message are ambiguous and used mixed up. Have to fix.

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
    this.removeAll = this.removeAll.bind(this);

    this.activate = this.activate.bind(this);
    this.deactivate = this.deactivate.bind(this);

    this.checkIntersect = this.checkIntersect.bind(this);
    this.setVisibleByMessage = this.setVisibleByMessage.bind(this);

    this.bActivate = false;
    this.isActivated = () => {
      return this.bActivate;
    };

    this.init();
  }

  init() {
    this.container = new THREE.Object3D();
    this.container.name = this.markerName + "Container";

    this.activate();
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
    const marker = new Marker(pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message, sprite);
    this.markerMap.set(index, marker);

    this.refreshGeometryList();

    return sprite.id;
  }

  push({ pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message }, isVisible = true) {
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

  setVisibleByMessage(message, bVisible) {
    this.markerMap.forEach(marker => {
      if (marker.message == message) {
        console.log("marker.massage: " + message);
        console.log(marker.sprite);
        marker.sprite.visible = bVisible;
      }
    });
  }

  setVisibleForAll(bVisible) {
    this.markerMap.forEach(marker => {
      if (!marker.sprite) {
        return;
      }
      marker.sprite.visible = bVisible;
    });
  }

  removeAll() {
    this.markerMap.clear();
    const names = this.container.children.map(item => item.name);
    names.map(name => {
      const sprite = this.container.getObjectByName(name);
      this.container.remove(sprite);
    });
  }

  checkIntersect(mousePosition, raycaster) {
    if (this.markerMap.size <= 0) {
      return;
    }

    raycaster.setFromCamera(mousePosition, this.camera);
    const intersects = raycaster.intersectObjects(this.geometryList, true);

    if (intersects.length > 0) {
      for (let i = 1; i <= this.markerMap.size; ++i) {
        const marker = this.markerMap.get(i);
        if (intersects[0].object === marker.sprite) {
          return marker;
        }
      }
    }
  }

  activate() {
    this.scene.add(this.container);
    this.container.visible = true;
    this.bActivate = true;
  }

  deactivate() {
    this.scene.remove(this.container);
    this.container.visible = false;
    this.bActivate = false;
  }
}

export default MarkerManager;
