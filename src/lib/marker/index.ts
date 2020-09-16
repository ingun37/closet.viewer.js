import * as THREE from "../threejs/three";

export class Marker {
    pointerPos: THREE.Vector3;
    faceNormal: THREE.Vector3;
    cameraPos: THREE.Vector3;
    cameraTarget: THREE.Vector3;
    cameraQuaternion: THREE.Quaternion;
    constructor(
        _pointerPos: THREE.Vector3,
        _faceNormal: THREE.Vector3,
        _cameraPos: THREE.Vector3,
        _cameraTarget: THREE.Vector3,
        _cameraQuaternion: THREE.Quaternion,
        public message: string,
        public sprite: THREE.Sprite
    ) {
        this.pointerPos = new THREE.Vector3();
        this.pointerPos.copy(_pointerPos);
        this.faceNormal = new THREE.Vector3();
        this.faceNormal.copy(_faceNormal)
        this.cameraPos = new THREE.Vector3();
        this.cameraPos.copy(_cameraPos)
        this.cameraTarget = new THREE.Vector3();
        this.cameraTarget.copy(_cameraTarget)
        this.cameraQuaternion = new THREE.Quaternion();
        this.cameraQuaternion.copy(_cameraQuaternion)
    }
}

function drawCircleOnContext(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number,
    sAngle: number, eAngle: number,
    counterclockwise: boolean = false) {
        ctx.beginPath();
        ctx.arc(x, y, r, sAngle, eAngle, counterclockwise);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
}

export function makeTextSprite(
    message:string,
    {
      fontface = "Arial",
      fontsize = 18,
      borderThickness = 8,
      borderColor = { r: 0, g: 0, b: 0, a: 1.0 },
      backgroundColor = { r: 255, g: 255, b: 255, a: 1.0 },
      fillStyle,
      name
    }: {
        fontface: string,
        fontsize:number,
        borderThickness:number,
        borderColor: { r: number, g: number, b: number, a: number},
        backgroundColor: { r: number, g: number, b: number, a: number },
        fillStyle:string,
        name:string
    }
  ) {
    const canvas = document.createElement("canvas");
    const size = 100; // Power of 2 has good performance on three.js
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.font = "Bold " + fontsize + "px " + fontface;
  
    // get size data (height depends only on font size)
    // const metrics = context.measureText(message);
    // const textWidth = metrics.width;
  
    // background color
    context.fillStyle =
      "rgba(" +
      backgroundColor.r +
      "," +
      backgroundColor.g +
      "," +
      backgroundColor.b +
      "," +
      backgroundColor.a +
      ")";
    // border color
    context.strokeStyle =
      "rgba(" +
      borderColor.r +
      "," +
      borderColor.g +
      "," +
      borderColor.b +
      "," +
      borderColor.a +
      ")";
  
    context.lineWidth = borderThickness;
  
    drawCircleOnContext(
      context,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2 - borderThickness,
      0,
      2 * Math.PI
    );
    // 1.4 is extra height factor for text below baseline: g,j,p,q.
  
    // text color
    context.fillStyle = fillStyle;
  
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(message, canvas.width / 2 - 2, canvas.height / 2 + 4);
  
    // canvas contents will be used for a texture
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
  
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      // useScreenCoordinates: false,
      depthTest: false
    });
  
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(50, 50, 1.0);
    sprite.name = `${name}_${message}`;
    return sprite;
  }
  