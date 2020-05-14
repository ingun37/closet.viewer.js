"use strict";
import * as THREE from "@/lib/threejs/three";

export function getObjectsCenter(threeJSScene) {
  const box = new THREE.Box3();
  box.expandByObject(threeJSScene);
  const center = new THREE.Vector3(
    0.5 * (box.min.x + box.max.x),
    0.5 * (box.min.y + box.max.y),
    0.5 * (box.min.z + box.max.z)
  );

  return center;
}

export function zoomToObjects(loadedCamera, scene) {
  // scene 의 모든 geometry 방문하면서 bounding cube 계산해서 전체 scene bounding cube 계산
  const center = new THREE.Vector3();
  center.copy(this.getObjectsCenter(scene));

  if (loadedCamera.bLoaded) {
    this.camera.position.copy(
      new THREE.Vector3(
        loadedCamera.ltow.elements[12],
        loadedCamera.ltow.elements[13],
        loadedCamera.ltow.elements[14]
      )
    );

    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    loadedCamera.ltow.extractBasis(xAxis, yAxis, zAxis);

    zAxis.negate();

    center.sub(this.camera.position);

    // TODO: check again if below are the best solution
    let dotProd = center.dot(zAxis);
    if (dotProd < 0.0) {
      // center가 이상하게 들어오는 경우 예외 처리. trim이 아주 먼 위치 로드된 경우 center가 이상하게 들어온다. 제대로 해결하려면 dll에서 convert시 camera target 도 읽어들이는게 좋을 듯.
      center.x = center.y = center.z = 0.0; // 맨 처음에는 center를 원점으로 해서. 그래야 무조건 8000.0 떨어뜨리는 것보다 view 회전이 좀 더 잘 된다.
      center.sub(this.camera.position);
      dotProd = center.dot(zAxis);

      if (dotProd < 0.0) {
        // 그래도 이상하면.
        dotProd = 8000.0;
      }
    }

    zAxis.multiplyScalar(dotProd);
    zAxis.add(this.camera.position);
    this.controls.target.copy(zAxis);
  } else {
    const box = new THREE.Box3();
    box.expandByObject(scene);

    // trim이나 이상한 점 하나가 너무 동떨어진 경우에는 정해진 center 바라보게 하자
    const maxDistance = 10000.0;
    if (
      box.min.x < -maxDistance ||
      box.min.y < -1000.0 ||
      box.min.z < -maxDistance ||
      box.max.x > maxDistance ||
      box.max.y > maxDistance ||
      box.max.z > maxDistance
    ) {
      center.x = 0.0;
      center.y = 1100.0;
      center.z = 0.0;
      this.controls.target.copy(center);
      center.z = 8000.0;
      this.camera.position.copy(center);
    } else {
      // 전체 scene bounding cube 의 중심을 바라보고 cube 를 fit하도록 camera zoom 설정
      this.camera.position.copy(center);
      this.camera.position.z =
        box.max.z +
        (0.5 * (box.max.y - box.min.y + 100.0)) /
          Math.tan(((this.camera.fov / 2) * Math.PI) / 180.0); // 위아래로 100 mm 정도 여유있게
      this.controls.target.copy(center);
    }
  }
}
