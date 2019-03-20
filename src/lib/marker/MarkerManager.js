import * as THREE from "@/lib/threejs/three"
import {TweenMax} from "gsap/TweenMax"


const pointerScaleVector = new THREE.Vector3()
const pointerScaleFactor = 65


class MarkerManager {
  constructor({scene, camera, renderer, controls, updateRender}) {

    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.controls = controls

    this.updateRender = updateRender

    this.markerList = []
    this.markerPointerList = []

    // raycaster for picking
    this.raycaster = new THREE.Raycaster()

    this.getMarkerList = this.getMarkerList.bind(this)
    this.setMarkerList = this.setMarkerList.bind(this)
    this.createMarker = this.createMarker.bind(this)
    this.showMarker = this.showMarker.bind(this)
    this.showAllMakrer = this.showAllMarker.bind(this)
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
    this.bindEventListener = this.bindEventListener.bind(this)

    this.pickedMarker = null;
    this.mouseButtonDown = false;
    //this.isMouseMoved = false

    this.onCompleteMove = () => {}
    this.onCompleteAnimation = () => {}
  }

  init({ zrest }) {
    this.zrest = zrest
  }

  bindEventListener({ onCompleteMove, onCompleteAnimation }) {
    this.onCompleteMove = onCompleteMove
    this.onCompleteAnimation = onCompleteAnimation
  }

  getMarkerList() {
    return this.markerList.map(item => {
      const {message, sprite, ...data} = item
      return data
    })
  }

  setMarkerList(listArray) {
    listArray.map(item => {
      this.createMarker(item)
    })
  }

  updatePointerSize() {
    for (let i = 0; i < this.markerList.length; i++) {
        const scale = pointerScaleVector.subVectors(this.markerList[i].sprite.position, this.camera.position).length() / pointerScaleFactor
        this.markerList[i].sprite.scale.set(scale / 2, scale / 2, 1)
    }
  }

  createMarker({pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message}, isVisible = true) {
    
    let id = undefined

    // pointer 좌표만 들고있다가 render 할때마다 만드는건 개 비효율이겠지? 그냥 그때 그때 계속 추가하자.
    var sprite = makeTextSprite(message, 
        {fontsize: 48, borderColor: {r: 255, g: 255, b: 255, a: 0.5}, backgroundColor: {r: 0, g: 0, b: 0, a: 0.5}})
    sprite.position.set(pointerPos.x, pointerPos.y, pointerPos.z)
    sprite.visible = isVisible
    this.scene.add(sprite)
    this.markerPointerList.push(sprite)
    id = sprite.id

    let marker = new Marker(pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message, sprite)
    this.markerList.push(marker)
    this.updateRender()

    return id
  }
  
  showMarker(arr) {

    this.markerPointerList.map(item => {

      const names = arr ? arr.filter(o => 'marker_'+o === item.name) : []
      if(names.length){
        this.scene.getObjectByName('marker_'+names[0]).visible = true
      }else{
        this.scene.getObjectByName(item.name).visible = false
      }
    })

    this.updateRender()
  }

  showAllMarker() {
    this.markerPointerList.map(item => {
      const sprite = this.scene.getObjectByName(item.name)
      sprite.visible = true
    })
    this.updateRender()
  }

  // viewer에서 canvas 클릭시 실행
  onMouseDown(e)
  {
    this.mouseButtonDown = true;
    const item = this.checkIntersectObject(e)
    if(item)
    {
        this.pickedMarker = item;
        this.isMouseMoved = false
        // this.animateCamera(annotationItem)
    }
  }

  onMouseMove(e)
  {
      //if(this.mouseButtonDown === true && this.pickedMarker !== null)
      //{
      //  this.isMouseMoved = true
      //  this.controls.enabled = false;
      //  const position = this.createIntersectPosition(e)
      //  this.pickedMarker.sprite.position.copy(position.pointerPos);
      //  this.updateRender();
      //}
  }

  onMouseUp(e)
  {
      this.mouseButtonDown = false;
      this.controls.enabled = true;

      if(this.isMouseMoved){
        this.onCompleteMove(this.pickedMarker)

      }else{
        const item = this.checkIntersectObject(e)
        if(item)
        {
          this.pickedMarker = item;
          this.animateCamera(item)
        }
        this.isMouseMoved = false
      }

  }

  checkIntersectObject({ clientX, clientY }) {

    // test code : annotation pointer부터 검사하자.
    if (this.markerPointerList.length) {

      const mouse = this.getMousePosition({ clientX, clientY })

      this.raycaster.setFromCamera(mouse, this.camera)
      var intersects = this.raycaster.intersectObjects(this.markerPointerList, true)

      if (intersects.length > 0) {
        // 처리할거 하고 return;
        //for(var i=0; i<this.annotationPointerList.length; i++)
        for (let i = 0; i < this.markerList.length; i++) {
          if (intersects[0].object === this.markerList[i].sprite) {
            return this.markerList[i]
            // this.animateCamera(this.annotationList[i].cameraPos)
          }
        }
      }
    }
  }

  animateCamera(item) {
    var to = {
      x: item.cameraPos.x,
      y: item.cameraPos.y,
      z: item.cameraPos.z
    }

    var totalTime = 1.6
    var target = this.controls.target

    // 여기서 interpolation 해야할게, camera position, camera upVector
    if (this.camera.position.x !== to.x || this.camera.position.y !== to.y || this.camera.position.z !== to.z) {

      var onUpdate = () => {
        // camera quaternion update
        //var q = new THREE.Quaternion()
        var t = tween.progress()
        //THREE.Quaternion.slerp(startQuaternion, endQuaternion, q, t)
        //q.normalize()
        //this.camera.quaternion.copy(q)
        this.camera.position.copy(position)

        // target 도 인터폴레이션 해야 한다.
        //target + (item.cameraTarget - target) * t
        var interpolationTarget = new THREE.Vector3()
        interpolationTarget.copy(item.cameraTarget)
        interpolationTarget.sub(target)
        interpolationTarget.multiplyScalar(t)
        interpolationTarget.add(target)
        
        this.controls.target.copy(interpolationTarget)
        this.updateRender()
      }

      var onComplete = () => {
        this.onCompleteAnimation(this.pickedMarker)
      }

      var position = this.camera.position
      var tween = TweenMax.to(position, totalTime, {
        x: to.x,
        y: to.y,
        z: to.z,
        ease: Power1.easeInOut,
        onUpdate: onUpdate,
        onComplete: onComplete
      })
    }
  }

  getMousePosition({ clientX, clientY }) {
    let canvasBounds = this.renderer.context.canvas.getBoundingClientRect()
    const x = ((clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1
    const y = -((clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1
    return { x, y }
    // return this.createIntersectPosition({x, y})
  }

  GetCameraDirection() {
    var directionVector = new THREE.Vector3()
    directionVector.x = this.controls.target.x - this.camera.position.x
    directionVector.y = this.controls.target.y - this.camera.position.y
    directionVector.z = this.controls.target.z - this.camera.position.z

    var normalizedCameraDirVector = new THREE.Vector3()
    normalizedCameraDirVector.copy(directionVector.normalize())

    return normalizedCameraDirVector
  }
}


function Marker(pointer_position, normal, camera_position, camera_target, camera_quaternion, _message, _sprite) {
  this.pointerPos = new THREE.Vector3()
  this.pointerPos.copy(pointer_position)

  this.faceNormal = new THREE.Vector3()
  this.faceNormal.copy(normal)

  this.cameraPos = new THREE.Vector3()
  this.cameraPos.copy(camera_position)

  this.cameraTarget = new THREE.Vector3()
  this.cameraTarget.copy(camera_target)

  this.cameraQuaternion = new THREE.Quaternion()
  this.cameraQuaternion.copy(camera_quaternion)

  this.message = _message
  this.sprite = _sprite
}

function makeTextSprite(message, parameters) {
  if (parameters === undefined) parameters = {}

  var fontface = parameters.hasOwnProperty("fontface") ?
    parameters["fontface"] : "Arial"

  var fontsize = parameters.hasOwnProperty("fontsize") ?
    parameters["fontsize"] : 18

  var borderThickness = parameters.hasOwnProperty("borderThickness") ?
    parameters["borderThickness"] : 8

  var borderColor = parameters.hasOwnProperty("borderColor") ?
    parameters["borderColor"] : {r: 0, g: 0, b: 0, a: 1.0}

  var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
    parameters["backgroundColor"] : {r: 255, g: 255, b: 255, a: 1.0}

  //var spriteAlignment = THREE.SpriteAlignment.topLeft;

  var canvas = document.createElement('canvas')
  var size = 100
  canvas.width = size
  canvas.height = size
  var context = canvas.getContext('2d')
  context.font = "Bold " + fontsize + "px " + fontface

  // get size data (height depends only on font size)
  var metrics = context.measureText(message)
  var textWidth = metrics.width

  // background color
  context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
    + backgroundColor.b + "," + backgroundColor.a + ")"
  // border color
  context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
    + borderColor.b + "," + borderColor.a + ")"

  context.lineWidth = borderThickness
  //roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
  //circle(context, 0, 0, 50, 0, 2*Math.PI, false);

  circle(context, canvas.width / 2, canvas.height / 2, canvas.width / 2 - borderThickness, 0, 2 * Math.PI)
  //circle(context, 0, 0, 50, 0, 2*Math.PI);
  // 1.4 is extra height factor for text below baseline: g,j,p,q.

  // text color
  context.fillStyle = "rgba(255, 255, 255, 1.0)"

  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(message, canvas.width / 2, canvas.height / 2)

  // canvas contents will be used for a texture
  var texture = new THREE.Texture(canvas)
  texture.needsUpdate = true

  var spriteMaterial = new THREE.SpriteMaterial(
    {map: texture, useScreenCoordinates: false, depthTest: false})

  var sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(50, 50, 1.0)
  sprite.name = 'marker_' + message
  return sprite
}


// x : The x-coordinate of the center of the circle
// y : The y-coordinate of the center of the circle
// r : The radius of the circle
// sAngle : The starting angle, in radians (0 is at the 3 o'clock position of the arc's circle)
// eAngle : The ending angle, in radians
// counterclockwise : Optional. Specifies whether the drawing should be counterclockwise or clockwise. False is default, and indicates clockwise, while true indicates counter-clockwise.
function circle(ctx, x, y, r, sAngle, eAngle, counterclockwise) {
  ctx.beginPath()
  ctx.arc(x, y, r, sAngle, eAngle, counterclockwise)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}


export default MarkerManager