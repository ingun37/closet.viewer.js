// Temporary declaration
// Remove when start using npm for ThreeJS
// npm 으로 ThreeJS 관리 시작하면 지우기 (npm 으로 threejs 쓰면 declaration 을 기본으로 지원하기 때문)
declare class Vector3 {
    constructor()
    copy(from:Vector3):void;
}
declare class Quaternion {
    constructor()
    copy(from:Quaternion):void;
}
declare class Sprite {}
export {Vector3, Quaternion, Sprite}