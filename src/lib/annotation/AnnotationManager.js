/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
import { TweenMax } from "gsap/TweenMax";
import { Marker, makeTextSprite } from "@/lib/marker/Marker";
import FlashAnnotation from "./FlashAnnotation";

const pointerScaleVector = new THREE.Vector3();
const pointerScaleFactor = 65;

// variables for animation between annotation markers
let tween;
const startQuaternion = new THREE.Quaternion();
const endQuaternion = new THREE.Quaternion();

class AnnotationManager {
  constructor({ scene, camera, renderer, controls, updateRenderer, setter }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.updateRenderer = updateRenderer;
    this.setter = setter;

    this.annotationList = [];
    this.annotationPointerList = [];
    this.isCreateAnnotation = false;

    this.annotationContainer = new THREE.Object3D();
    this.annotationContainer.name = "annotationContainer";
    this.scene.add(this.annotationContainer);

    this.flash = new FlashAnnotation(
      this.annotationContainer,
      this.updateRenderer
    );

    this.clear = () => {
      this.flash.clear();
    };

    this.mousePosition = {};

    // raycaster for picking
    this.raycaster = new THREE.Raycaster();

    this.getAnnotationList = this.getAnnotationList.bind(this);
    this.setAnnotationList = this.setAnnotationList.bind(this);
    this.deleteAnnotation = this.deleteAnnotation.bind(this);
    this.deleteAllAnnotation = this.deleteAllAnnotation.bind(this);
    this.createAnnotation = this.createAnnotation.bind(this);
    this.showAnnotation = this.showAnnotation.bind(this);
    this.showAllAnnotation = this.showAllAnnotation.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.bindEventListener = this.bindEventListener.bind(this);
    this.setVisibleContainer = this.setVisibleContainer.bind(this);

    this.pickedAnnotation = null;
    this.hoverAnnotation = null;
    this.mouseButtonDown = false;
    this.isMouseMoved = false;

    this.onCompleteAnnotationMove = () => {};
    this.onCompleteAnimation = () => {};
  }

  init({ zrest }) {
    this.zrest = zrest;
  }

  bindEventListener({ onCompleteAnnotationMove, onCompleteAnimation }) {
    this.onCompleteAnnotationMove = onCompleteAnnotationMove;
    this.onCompleteAnimation = onCompleteAnimation;
  }

  getAnnotationList() {
    return this.annotationList.map((item) => {
      const { message, sprite, ...data } = item;
      return data;
    });
  }

  setAnnotationList(listArray) {
    listArray.map((item) => {
      this.createAnnotation(item);
    });
  }

  updateAnnotationPointerSize() {
    for (let i = 0; i < this.annotationList.length; i++) {
      const scale =
        pointerScaleVector
          .subVectors(
            this.annotationList[i].sprite.position,
            this.camera.position
          )
          .length() / pointerScaleFactor;
      this.annotationList[i].sprite.scale.set(scale / 2, scale / 2, 1);
    }
  }

  createAnnotation(
    {
      pointerPos,
      faceNormal,
      cameraPos,
      cameraTarget,
      cameraQuaternion,
      message,
    },
    isVisible = true
  ) {
    let id = undefined;

    // pointer 좌표만 들고있다가 render 할때마다 만드는건 개 비효율이겠지? 그냥 그때 그때 계속 추가하자.
    const params = {
      fontsize: 48,
      borderColor: { r: 255, g: 255, b: 255, a: 0.5 },
      backgroundColor: { r: 0, g: 0, b: 0, a: 0.5 },
      fillStyle: "rgba(255, 255, 255, 1.0)",
      name: "annotation",
    };

    const sprite = makeTextSprite(message, params);
    sprite.position.set(pointerPos.x, pointerPos.y, pointerPos.z);
    sprite.visible = isVisible;
    this.annotationContainer.add(sprite);
    this.annotationPointerList.push(sprite);
    id = sprite.id;

    const annotation = new Marker(
      pointerPos,
      faceNormal,
      cameraPos,
      this.controls.target,
      this.camera.quaternion,
      message,
      sprite
    );
    this.annotationList.push(annotation);
    this.updateRenderer();

    return id;
  }

  deleteAnnotation(name) {
    this.annotationPointerList = this.annotationPointerList.filter(
      (item) => item.name !== "annotation_" + name
    );
    this.annotationList = this.annotationList.filter((item) => {
      const sprite = this.annotationContainer.getObjectByName(
        "annotation_" + name
      );
      if (sprite) this.annotationContainer.remove(sprite);
      return item.message !== name;
    });

    this.updateRenderer();
  }

  deleteAllAnnotation() {
    const names = this.annotationContainer.children.map((item) => item.name);
    names.map((name) => {
      const sprite = this.annotationContainer.getObjectByName(name);
      this.annotationContainer.remove(sprite);
    });
    this.annotationPointerList = [];
    this.annotationList = [];
    this.updateRenderer();
  }

  showAnnotation(arr) {
    if (!Array.isArray(arr)) {
      arr = [];
    }

    this.annotationContainer.children.map((item) => {
      const name = arr.find((o) => "annotation_" + o === item.name);
      if (name) {
        this.annotationContainer.getObjectByName(
          "annotation_" + name
        ).visible = true;
      } else {
        this.annotationContainer.getObjectByName(item.name).visible = false;
      }
    });
    this.updateRenderer();
  }

  showAllAnnotation() {
    this.annotationPointerList.map((item) => {
      const sprite = this.annotationContainer.getObjectByName(item.name);
      sprite.visible = true;
    });
    this.updateRenderer();
  }

  // viewer에서 canvas 클릭시 실행
  onMouseDown(e) {
    this.mousePosition = { x: e.clientX, y: e.clientY };
    this.pickedAnnotation = this.checkIntersectObject(e);
    if (this.pickedAnnotation) {
      this.controls.enabled = false;
    }
  }

  onMouseMove(e) {
    const annotationItem = this.checkIntersectObject(e);
    if (annotationItem) {
      this.setter.style.cursor = "pointer";
      if (!this.hoverAnnotation) {
        annotationItem.sprite.material.color.r = 0.5;
        this.hoverAnnotation = annotationItem;
        this.updateRenderer();
      }
    } else if (!annotationItem && this.setter.style.cursor === "pointer") {
      this.setter.style.cursor = "default";
      if (this.hoverAnnotation) {
        this.hoverAnnotation.sprite.material.color.r = 1;
        this.updateRenderer();
        this.hoverAnnotation = undefined;
      }
    }

    if (this.pickedAnnotation) {
      console.log("pickedAnnotation!");
      console.log(this.pickedAnnotation);
      if (
        Math.abs(e.clientX - this.mousePosition.x) > 5 ||
        Math.abs(e.clientY - this.mousePosition.y) > 5
      ) {
        this.isMouseMoved = true;
        const position = this.createIntersectPosition(e);
        this.pickedAnnotation.sprite.position.copy(position.pointerPos);
        this.pickedAnnotation.sprite.material.color.r = 0.5;
        this.updateRenderer();
      }
    }
  }

  onMouseUp(e) {
    this.controls.enabled = true;
  }

  onMouseClick(e) {
    if (this.isMouseMoved) {
      this.onCompleteAnnotationMove(this.pickedAnnotation, e);
      this.isMouseMoved = false;
      this.pickedAnnotation = undefined;
      return;
    }

    const annotationItem = this.checkIntersectObject(e); // FIXME: This line makes warning message
    if (annotationItem) {
      if (!this.isMouseMoved) {
        // animation
        this.animateCamera(annotationItem);
      }
    } else {
      // create annotation
      if (
        Math.abs(e.clientX - this.mousePosition.x) < 5 &&
        Math.abs(e.clientY - this.mousePosition.y) < 5
      ) {
        const position = this.createIntersectPosition(e);
        if (this.isCreateAnnotation) {
          this.createAnnotation({ ...position, message: "12" });
        }
      }
    }
    this.isMouseMoved = false;
    this.pickedAnnotation = undefined;
  }

  createIntersectPosition({ clientX, clientY }) {
    if (!this.zrest || this.zrest.matMeshMap === undefined) {
      // console.log("matMeshMap is missing");
      return;
    }

    const mouse = this.getMousePosition({
      clientX: clientX,
      clientY: clientY - 10,
    });

    this.raycaster.setFromCamera(mouse, this.camera);

    // 여기서 평면에다 다시 쏴야 함.
    const pointerPos = new THREE.Vector3();
    pointerPos.copy(this.computePointerPosition(mouse));

    const cameraDirection = new THREE.Vector3();
    cameraDirection.copy(this.getCameraDirection());
    console.log("cameraDirection");
    console.log(cameraDirection);

    return {
      pointerPos: pointerPos,
      faceNormal: cameraDirection.negate(),
      cameraPos: this.camera.position,
      cameraTarget: this.controls.target,
      cameraQuaternion: this.camera.quaternion,
    };
  }

  checkIntersectObject({ clientX, clientY }) {
    // annotation pointer부터 검사하자.
    if (this.annotationPointerList.length) {
      const mouse = this.getMousePosition({ clientX, clientY });

      this.raycaster.setFromCamera(mouse, this.camera);
      let intersects = this.raycaster.intersectObjects(
        this.annotationPointerList,
        true
      );

      intersects = intersects.filter((item) => item.distance > 0);

      if (intersects.length > 0) {
        // 처리할거 하고 return;
        for (let i = 0; i < this.annotationList.length; i++) {
          if (intersects[0].object === this.annotationList[i].sprite) {
            return this.annotationList[i];
          }
        }
      }
    }
  }

  animateCamera(annotationItem) {
    this.controls.enabled = false;

    const dest = {
      x: annotationItem.cameraPos.x,
      y: annotationItem.cameraPos.y,
      z: annotationItem.cameraPos.z,
    };

    const onUpdate = () => {
      // camera quaternion update
      // eslint-disable-next-line prefer-const
      let q = new THREE.Quaternion();
      // eslint-disable-next-line prefer-const
      let t = tween.progress();
      THREE.Quaternion.slerp(startQuaternion, endQuaternion, q, t);
      q.normalize();

      this.camera.quaternion.copy(q);
      this.updateRenderer();
    };

    const onComplete = () => {
      this.onCompleteAnimation(annotationItem);
      annotationItem.sprite.material.color.r = 1;
      this.controls.enabled = true;
    };

    // 여기서 interpolation 해야할게, camera position, camera upVector
    if (
      this.camera.position.x !== dest.x ||
      this.camera.position.y !== dest.y ||
      this.camera.position.z !== dest.z
    ) {
      startQuaternion.copy(this.camera.quaternion);
      startQuaternion.normalize();

      endQuaternion.copy(annotationItem.cameraQuaternion);
      endQuaternion.normalize();

      const target = new THREE.Vector3();
      target.copy(annotationItem.cameraTarget);

      tween = TweenMax.to(this.camera.position, 0.8, {
        x: dest.x,
        y: dest.y,
        z: dest.z,
        ease: Power1.easeInOut,
        onUpdate: onUpdate,
        onComplete: onComplete,
      });
    } else {
      onComplete();
    }
  }

  setVisibleContainer(visible) {
    this.annotationContainer.visible = visible;
    this.updateRenderer();
  }

  getMousePosition({ clientX, clientY }) {
    const canvasBounds = this.renderer.context.canvas.getBoundingClientRect();
    const x =
      ((clientX - canvasBounds.left) /
        (canvasBounds.right - canvasBounds.left)) *
        2 -
      1;
    const y =
      -(
        (clientY - canvasBounds.top) /
        (canvasBounds.bottom - canvasBounds.top)
      ) *
        2 +
      1;
    return { x, y };
    // return this.createIntersectPosition({x, y})
  }

  getCameraDirection() {
    const directionVector = new THREE.Vector3();
    directionVector.x = this.controls.target.x - this.camera.position.x;
    directionVector.y = this.controls.target.y - this.camera.position.y;
    directionVector.z = this.controls.target.z - this.camera.position.z;

    const normalizedCameraDirVector = new THREE.Vector3();
    normalizedCameraDirVector.copy(directionVector.normalize());

    return normalizedCameraDirVector;
  }

  computePointerPosition(mouse) {
    // 여기서 마우스 클릭한 지점만큼 이동시켜 줘야 한다.
    this.camera.updateProjectionMatrix();

    // 1. 카메라 포지션 - center 포지션 dot product 카메라 디렉션의 반대 방향
    const cameraPos = new THREE.Vector3();
    cameraPos.copy(this.camera.position);

    //
    const centerPos = new THREE.Vector3(0.0, 0.0, 0.0);
    centerPos.copy(this.zrest.getObjectsCenter(this.scene));

    const cameraDirection = new THREE.Vector3();
    cameraDirection.copy(this.getCameraDirection());

    const cameraToCenter = new THREE.Vector3();
    cameraToCenter.x = centerPos.x - cameraPos.x;
    cameraToCenter.y = centerPos.y - cameraPos.y;
    cameraToCenter.z = centerPos.z - cameraPos.z;

    const distance = Math.abs(cameraDirection.dot(cameraToCenter));
    // var transformVector = cameraDirection.multiplyScalar(distance);

    const intersectPos = new THREE.Vector3();

    // 1. camera와 평면까지의 distance 구하기
    // 2. distance plane의 width, hight 계산
    const rad = (this.camera.fov * 0.5 * Math.PI) / 180;
    const height = distance * Math.tan(rad) * 2;
    const width = this.camera.aspect * height;

    const localPos = new THREE.Vector3(
      width * 0.5 * mouse.x,
      height * 0.5 * mouse.y,
      -distance
    );
    this.camera.updateMatrixWorld();

    const worldPos = new THREE.Vector3();
    worldPos.copy(localPos);
    worldPos.applyMatrix4(this.camera.matrixWorld);
    intersectPos.copy(worldPos);

    return intersectPos;
  }
}

export default AnnotationManager;
