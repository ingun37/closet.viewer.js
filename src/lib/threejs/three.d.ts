// Temporary declaration
// Remove when start using npm for ThreeJS
// npm 으로 ThreeJS 관리 시작하면 지우기 (npm 으로 threejs 쓰면 declaration 을 기본으로 지원하기 때문)
declare class Vector3 {
    constructor();
    copy(from:Vector3):void;
    set(x:number, y:number, z:number):void;
    subVectors ( a : Vector3, b : Vector3 ) : this
    length():number;
    
    public get x() : number
    public get y() : number
    public get z() : number
    
}
declare class Quaternion {
    constructor();
    copy(from:Quaternion):void;
}
declare class Object3D {
    public set name(v : string);
    
    public get position() : Vector3;
    
    public get visible() : boolean;
    
    public set visible(v : boolean)
    
    constructor();
    add ( object : Object3D ) : this
    
    public get id() : number;
    
    public get children() : Object3D[];
    getObjectByName ( name : String ) : Object3D
    remove ( object : Object3D ) : this
}
declare class Sprite extends Object3D{
    constructor(materiail:SpriteMaterial);
    public get scale() : Vector3;
    
    public set name(v : string);
    material : SpriteMaterial;
    
}
declare class Texture {
    constructor(canvas:HTMLCanvasElement);
    
    public set needsUpdate(v : boolean);
    
}
declare class SpriteMaterial {
    constructor({map, depthTest}:{map:Texture, depthTest:boolean})
    
    public get color() : Color;
    
}
declare class Color {
    public get r() : number
    
    public set r(v : number) ;
    
}

export {Vector3, Quaternion, Sprite, Texture, SpriteMaterial, Object3D}