import * as THREE from "@/lib/threejs/three";
import MobileDetect from "mobile-detect";

export function addLightForOldVersion(scene) {
  const mobileDetect = new MobileDetect(window.navigator.userAgent);

  /*
   * 이제 version 3 이후 파일에 대해서는 shader에서 light 설정을 hard coding해서 사용한다.
   * 하지만 version 2 이하 파일을 위해 여기에서도 설정한다.
   * by Jaden
   */
  const DirLight0 = new THREE.DirectionalLight(0xd2d2d2);
  DirLight0.position.set(0, 0, 1).normalize();
  DirLight0.castShadow = false;
  // specular1 : 464646

  const DirLight1 = new THREE.DirectionalLight(0x6e6e6e);
  DirLight1.position.set(1500, 3000, 1500);
  DirLight1.castShadow = mobileDetect.os() === "iOS" ? false : true;

  // set up shadow properties for the light
  DirLight1.shadow.mapSize.width = 2048; // default
  DirLight1.shadow.mapSize.height = 2048; // default
  DirLight1.shadow.camera.near = 2000; // default
  DirLight1.shadow.camera.far = 7000; // default
  DirLight1.shadow.camera.right = 1500;
  DirLight1.shadow.camera.left = -1500;
  DirLight1.shadow.camera.top = 1500;
  DirLight1.shadow.camera.bottom = -1500;
  DirLight1.shadow.bias = -0.001;
  // specular2 : 3c3c3c

  /*
   * scene.add(new THREE.AmbientLight(0x8c8c8c));
   * amibent light은 추가하지 않고 shader에서 하드코딩으로 처리한다.
   * CLO와 three.js 의 light 구조가 다르므로 이렇게 하자.
   * by Jaden
   */

  scene.add(DirLight0);
  scene.add(DirLight1);
}
