/* eslint-disable require-jsdoc */
import * as THREE from '@/lib/threejs/three';
import {Marker, makeTextSprite} from '@/lib/marker/Marker';

const pointerScaleVector = new THREE.Vector3();
const pointerScaleFactor = 65;

class TechPackManager {
  constructor({scene, camera, renderer, controls, updateRenderer, setter}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.markerList = [];
    this.markerPointerList = [];
  }

  buildFromZRest(zrest) {

  }

  init({zrest}) {
    this.zrest = zrest;
  }

  bindEventListener({onCompleteMove, onCompleteAnimation}) {
    this.onCompleteMove = onCompleteMove;
    this.onCompleteAnimation = onCompleteAnimation;
  }

  getMarkerList() {
    return this.markerList.map((item) => {
      const {message, sprite, ...data} = item;
      return data;
    });
  }

  setMarkerList(listArray) {
    listArray.map((item) => {
      this.createMarker(item);
    });
  }

  updatePointerSize() {
    for (let i = 0; i < this.markerList.length; i++) {
      const scale = pointerScaleVector.subVectors(this.markerList[i].sprite.position, this.camera.position).length() / pointerScaleFactor;
      this.markerList[i].sprite.scale.set(scale / 2, scale / 2, 1);
    }
  }

  createMarker({pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message}, isVisible = true) {
    let id = undefined;

    // pointer 좌표만 들고있다가 render 할때마다 만드는건 개 비효율이겠지? 그냥 그때 그때 계속 추가하자.
    const sprite = makeTextSprite(message,
        {fontsize: 48, borderColor: {r: 255, g: 255, b: 255, a: 0.5}, backgroundColor: {r: 0, g: 0, b: 0, a: 0.5}});
    sprite.position.set(pointerPos.x, pointerPos.y, pointerPos.z);
    sprite.visible = isVisible;
    this.scene.add(sprite);
    this.markerPointerList.push(sprite);
    id = sprite.id;

    const marker = new Marker(pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message, sprite);
    this.markerList.push(marker);

    return id;
  }

  showMarker(arr) {
    this.markerPointerList.map((item) => {
      const names = arr ? arr.filter((o) => 'marker_'+o === item.name) : [];
      if (names.length) {
        this.scene.getObjectByName('marker_'+names[0]).visible = true;
      } else {
        this.scene.getObjectByName(item.name).visible = false;
      }
    });

    this.updateRender();
  }

  showAllMarker() {
    this.markerPointerList.map((item) => {
      const sprite = this.scene.getObjectByName(item.name);
      sprite.visible = true;
    });
    this.updateRender();
  }

  // viewer에서 canvas 클릭시 실행
  onMouseDown(e) {
    console.log('onMouseDown on MM');
    this.mouseButtonDown = true;
    const item = this.checkIntersectObject(e);
    if (item) {
      this.pickedMarker = item;
      this.isMouseMoved = false;
      // this.animateCamera(annotationItem)
    }
  }

  onMouseMove(e) {
    // FIXME: This function does nothing
  }

  onMouseUp(e) {
    this.mouseButtonDown = false;
    this.controls.enabled = true;

    if (this.isMouseMoved) {
      this.onCompleteMove(this.pickedMarker);
    } else {
      const item = this.checkIntersectObject(e);
      if (item) {
        this.pickedMarker = item;
        this.animateCamera(item);
      }
      this.isMouseMoved = false;
    }
  }

  checkIntersectObject({clientX, clientY}) {
    // test code : annotation pointer부터 검사하자.
    if (this.markerPointerList.length) {
      const mouse = this.getMousePosition({clientX, clientY});

      this.raycaster.setFromCamera(mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.markerPointerList, true);

      if (intersects.length > 0) {
        // 처리할거 하고 return;
        // for(var i=0; i<this.annotationPointerList.length; i++)
        for (let i = 0; i < this.markerList.length; i++) {
          if (intersects[0].object === this.markerList[i].sprite) {
            return this.markerList[i];
            // this.animateCamera(this.annotationList[i].cameraPos)
          }
        }
      }
    }
  }

  getMousePosition({clientX, clientY}) {
    const canvasBounds = this.renderer.context.canvas.getBoundingClientRect();
    const x = ((clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
    const y = -((clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;
    return {x, y};
    // return this.createIntersectPosition({x, y})
  }

  GetCameraDirection() {
    const directionVector = new THREE.Vector3();
    directionVector.x = this.controls.target.x - this.camera.position.x;
    directionVector.y = this.controls.target.y - this.camera.position.y;
    directionVector.z = this.controls.target.z - this.camera.position.z;

    const normalizedCameraDirVector = new THREE.Vector3();
    normalizedCameraDirVector.copy(directionVector.normalize());

    return normalizedCameraDirVector;
  }
}

export default TechPackManager;
