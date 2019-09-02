/* eslint-disable require-jsdoc */
import * as THREE from '@/lib/threejs/three';
import {TweenMax} from 'gsap/TweenMax';


const pointerScaleVector = new THREE.Vector3();
const pointerScaleFactor = 65;


class AnnotationManager {
  constructor({scene, camera, renderer, controls, updateRenderer, setter}) {
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
    this.annotationContainer.name = 'annotationContainer';
    this.scene.add(this.annotationContainer);

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

    this.onCompleteAnnotationMove = () => {
    };
    this.onCompleteAnimation = () => {
    };
  }

  init({zrest}) {
    this.zrest = zrest;
  }

  bindEventListener({onCompleteAnnotationMove, onCompleteAnimation}) {
    this.onCompleteAnnotationMove = onCompleteAnnotationMove;
    this.onCompleteAnimation = onCompleteAnimation;
  }

  getAnnotationList() {
    return this.annotationList.map((item) => {
      const {message, sprite, ...data} = item;
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
      const scale = pointerScaleVector.subVectors(this.annotationList[i].sprite.position, this.camera.position).length() / pointerScaleFactor;
      this.annotationList[i].sprite.scale.set(scale / 2, scale / 2, 1);
    }
  }

  createAnnotation({pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message}, isVisible = true) {
    // 여기서 이미 있으면 안만들기. 검사하자.
    const bDuplicatePos = false;
    // for (var i = 0; i < this.annotationList.length; i++) {
    //   var pointerPosition = this.annotationList[i].pointerPos
    //   if (pointerPosition.equals(pointerPos)) {
    //     bDuplicatePos = true
    //   }
    // }

    let id = undefined;
    if (!bDuplicatePos) {
      // pointer 좌표만 들고있다가 render 할때마다 만드는건 개 비효율이겠지? 그냥 그때 그때 계속 추가하자.
      const sprite = makeTextSprite(message,
          {fontsize: 48, borderColor: {r: 255, g: 255, b: 255, a: 0.5}, backgroundColor: {r: 0, g: 0, b: 0, a: 0.5}});
      sprite.position.set(pointerPos.x, pointerPos.y, pointerPos.z);
      sprite.visible = isVisible;
      this.annotationContainer.add(sprite);
      this.annotationPointerList.push(sprite);
      id = sprite.id;

      const annotation = new Annotation(pointerPos, faceNormal, cameraPos, this.controls.target, this.camera.quaternion, message, sprite);
      this.annotationList.push(annotation);
      this.updateRenderer();
    }
    return id;
  }

  deleteAnnotation(name) {
    this.annotationPointerList = this.annotationPointerList.filter((item) => item.name !== 'annotation_' + name);
    this.annotationList = this.annotationList.filter((item) => {
      const sprite = this.annotationContainer.getObjectByName('annotation_' + name);
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
      const name = arr.find((o) => 'annotation_' + o === item.name);
      if (name) {
        this.annotationContainer.getObjectByName('annotation_' + name).visible = true;
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
    this.mousePosition = {x: e.clientX, y: e.clientY};
    this.pickedAnnotation = this.checkIntersectObject(e);
    if (this.pickedAnnotation) {
      this.controls.enabled = false;
    }
  }

  onMouseMove(e) {
    const annotationItem = this.checkIntersectObject(e);
    if (annotationItem) {
      this.setter.style.cursor = 'pointer';
      if (!this.hoverAnnotation) {
        annotationItem.sprite.material.color.r = 0.5;
        this.hoverAnnotation = annotationItem;
        this.updateRenderer();
      }
    } else if (!annotationItem && this.setter.style.cursor === 'pointer') {
      this.setter.style.cursor = 'default';
      if (this.hoverAnnotation) {
        this.hoverAnnotation.sprite.material.color.r = 1;
        this.updateRenderer();
        this.hoverAnnotation = undefined;
      }
    }

    if (this.pickedAnnotation) {
      if (Math.abs(e.clientX - this.mousePosition.x) > 5 || Math.abs(e.clientY - this.mousePosition.y) > 5) {
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

    const annotationItem = this.checkIntersectObject(e);
    if (annotationItem) {
      if (!this.isMouseMoved) {
        // animation
        this.animateCamera(annotationItem);
      }
    } else {
      // create annotation
      if (Math.abs(e.clientX - this.mousePosition.x) < 5 && Math.abs(e.clientY - this.mousePosition.y) < 5) {
        const position = this.createIntersectPosition(e);
        if (this.isCreateAnnotation) this.createAnnotation({...position, message: '12'});
      }
    }
    this.isMouseMoved = false;
    this.pickedAnnotation = undefined;
  }

  createIntersectPosition({clientX, clientY}) {
    if (this.zrest.matMeshList !== undefined) {
      const mouse = this.getMousePosition({clientX: clientX, clientY: clientY - 10});

      this.raycaster.setFromCamera(mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.zrest.matMeshList);

      if (intersects.length > 0) {
        return {
          pointerPos: intersects[0].point,
          faceNormal: intersects[0].face.normal,
          cameraPos: this.camera.position,
          cameraTarget: this.controls.target,
          cameraQuaternion: this.camera.quaternion,
        };
      } else {
        // 여기서 평면에다 다시 쏴야 함.
        const pointerPos = new THREE.Vector3();
        pointerPos.copy(this.computePointerPosition(mouse));

        const cameraDirection = new THREE.Vector3();
        cameraDirection.copy(this.getCameraDirection());

        return {
          pointerPos: pointerPos,
          faceNormal: cameraDirection.negate(),
          cameraPos: this.camera.position,
          cameraTarget: this.controls.target,
          cameraQuaternion: this.camera.quaternion,
        };
      }
    }
  }

  checkIntersectObject({clientX, clientY}) {
    // test code : annotation pointer부터 검사하자.
    if (this.annotationPointerList.length) {
      const mouse = this.getMousePosition({clientX, clientY});

      this.raycaster.setFromCamera(mouse, this.camera);
      let intersects = this.raycaster.intersectObjects(this.annotationPointerList, true);

      intersects = intersects.filter((item) => item.distance > 0);

      if (intersects.length > 0) {
        // 처리할거 하고 return;
        // for(var i=0; i<this.annotationPointerList.length; i++)
        for (let i = 0; i < this.annotationList.length; i++) {
          if (intersects[0].object === this.annotationList[i].sprite) {
            return this.annotationList[i];
            // this.animateCamera(this.annotationList[i].cameraPos)
          }
        }
      }
    }
  }

  animateCamera(annotationItem) {
    this.controls.enabled = false;

    const to = {
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

      console.log(this.camera.quaternion);

      this.camera.quaternion.copy(q);
      this.updateRenderer();
    };

    const onComplete = () => {
      this.onCompleteAnimation(annotationItem);
      annotationItem.sprite.material.color.r = 1;
      this.controls.enabled = true;
    };

    // 여기서 interpolation 해야할게, camera position, camera upVector
    if (this.camera.position.x !== to.x || this.camera.position.y !== to.y || this.camera.position.z !== to.z) {
      const startQuaternion = new THREE.Quaternion();
      startQuaternion.copy(this.camera.quaternion);
      startQuaternion.normalize();

      console.log(annotationItem);
      const endQuaternion = new THREE.Quaternion();
      endQuaternion.copy(annotationItem.cameraQuaternion);
      endQuaternion.normalize();

      const target = new THREE.Vector3();
      target.copy(annotationItem.cameraTarget);

      const tween = TweenMax.to(this.camera.position, 0.8, {
        x: to.x,
        y: to.y,
        z: to.z,
        ease: Power1.easeInOut,
        onUpdate: onUpdate,
        onComplete: onComplete,
      });
    } else {
      onComplete();
    }
  }

  setVisibleContainer(visible) {
    console.log('visible', visible);
    this.annotationContainer.visible = visible;
    this.updateRenderer();
  }

  getMousePosition({clientX, clientY}) {
    const canvasBounds = this.renderer.context.canvas.getBoundingClientRect();
    const x = ((clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
    const y = -((clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;
    return {x, y};
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
    const rad = this.camera.fov * 0.5 * Math.PI / 180;
    const height = distance * Math.tan(rad) * 2;
    const width = this.camera.aspect * height;

    const localPos = new THREE.Vector3(width * 0.5 * mouse.x, height * 0.5 * mouse.y, -distance);
    this.camera.updateMatrixWorld();

    const worldPos = new THREE.Vector3();
    worldPos.copy(localPos);
    worldPos.applyMatrix4(this.camera.matrixWorld);
    intersectPos.copy(worldPos);

    return intersectPos;
  }
}


function Annotation(pointerPosition, normal, cameraPosition, cameraTarget, cameraQuaternion, _message, _sprite) {
  this.pointerPos = new THREE.Vector3(); // DB
  this.pointerPos.copy(pointerPosition);

  this.faceNormal = new THREE.Vector3(); // DB
  this.faceNormal.copy(normal);

  this.cameraPos = new THREE.Vector3(); // DB
  this.cameraPos.copy(cameraPosition);

  this.cameraTarget = new THREE.Vector3(); // DB
  this.cameraTarget.copy(cameraTarget);

  this.message = _message; // DB
  this.sprite = _sprite;
}

function makeTextSprite(message, parameters) {
  if (parameters === undefined) parameters = {};

  const fontface = parameters.hasOwnProperty('fontface') ?
    parameters['fontface'] : 'Arial';

  const fontsize = parameters.hasOwnProperty('fontsize') ?
    parameters['fontsize'] : 18;

  const borderThickness = parameters.hasOwnProperty('borderThickness') ?
    parameters['borderThickness'] : 8;

  const borderColor = parameters.hasOwnProperty('borderColor') ?
    parameters['borderColor'] : {r: 0, g: 0, b: 0, a: 1.0};

  const backgroundColor = parameters.hasOwnProperty('backgroundColor') ?
    parameters['backgroundColor'] : {r: 255, g: 255, b: 255, a: 1.0};

  // var spriteAlignment = THREE.SpriteAlignment.topLeft;

  const canvas = document.createElement('canvas');
  const size = 100;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.font = 'Bold ' + fontsize + 'px ' + fontface;

  // get size data (height depends only on font size)
  const metrics = context.measureText(message);
  const textWidth = metrics.width;

  // background color
  context.fillStyle = 'rgba(' + backgroundColor.r + ',' + backgroundColor.g + ','
    + backgroundColor.b + ',' + backgroundColor.a + ')';
  // border color
  context.strokeStyle = 'rgba(' + borderColor.r + ',' + borderColor.g + ','
    + borderColor.b + ',' + borderColor.a + ')';

  context.lineWidth = borderThickness;
  // roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
  // circle(context, 0, 0, 50, 0, 2*Math.PI, false);

  circle(context, canvas.width / 2, canvas.height / 2, canvas.width / 2 - borderThickness, 0, 2 * Math.PI);
  // circle(context, 0, 0, 50, 0, 2*Math.PI);
  // 1.4 is extra height factor for text below baseline: g,j,p,q.

  // text color
  context.fillStyle = 'rgba(255, 255, 255, 1.0)';

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(message, canvas.width / 2 - 2, canvas.height / 2 + 4);

  // canvas contents will be used for a texture
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  const spriteMaterial = new THREE.SpriteMaterial(
      {map: texture, useScreenCoordinates: false, depthTest: false});

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(50, 50, 1.0);
  sprite.name = 'annotation_' + message;
  return sprite;
}


/*
 * x: The x-coordinate of the center of the circle
 * y: The y-coordinate of the center of the circle
 * r: The radius of the circle
 * sAngle: The starting angle, in radians (0 is at the 3 o'clock position of the arc's circle)
 * eAngle: The ending angle, in radians
 * counterclockwise: Optional.
 *                   Specifies whether the drawing should be counterclockwise or clockwise.
 *                   False is default, and indicates clockwise, while true indicates counter-clockwise.
*/
function circle(ctx, x, y, r, sAngle, eAngle, counterclockwise) {
  ctx.beginPath();
  ctx.arc(x, y, r, sAngle, eAngle, counterclockwise);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export default AnnotationManager;
