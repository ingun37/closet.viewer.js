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

export function drawCircleOnContext(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number,
    sAngle: number, eAngle: number,
    counterclockwise: boolean) {
        ctx.beginPath();
        ctx.arc(x, y, r, sAngle, eAngle, counterclockwise);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
}