// Temporary declaration
// Remove when start using npm for ThreeJS
// npm 으로 ThreeJS 관리 시작하면 지우기 (npm 으로 threejs 쓰면 declaration 을 기본으로 지원하기 때문)
declare class Vector3 {
    constructor();
    copy(from:Vector3):void;
    set(x:number, y:number, z:number):void;
}
declare class Quaternion {
    constructor();
    copy(from:Quaternion):void;
}
declare class Sprite {
    constructor(materiail:SpriteMaterial);
    public get scale() : Vector3;
    
    public set name(v : string);
    
}
declare class Texture {
    constructor(canvas:HTMLCanvasElement);
    
    public set needsUpdate(v : boolean);
    
}
declare class SpriteMaterial {
    constructor({map, depthTest}:{map:Texture, depthTest:boolean})
}
export {Vector3, Quaternion, Sprite, Texture, SpriteMaterial}