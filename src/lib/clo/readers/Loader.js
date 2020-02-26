"use strict";
import * as THREE from "@/lib/threejs/three";
import JSZip from "@/lib/jszip/dist/jszip";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";
import { loadTexture } from "@/lib/clo/readers/zrest_texture";

export function readZrestFromBlobForWeb(blob, header) {
  const object3D = new THREE.Object3D();
  object3D.name = "object3D";

  const reader = new FileReader();

  const contentBlob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

  let rootMap;
  let restName = "";

  // TODO: consider change names. btn and bth are confusing easily
  const btnNameList = [];
  const bthNameList = [];

  reader.onload = e => {
    this.jsZip = new JSZip();
    this.jsZip.loadAsync(e.target.result).then(zip => {
      const keyList = Object.keys(zip.files);
      keyList.forEach(value => {
        const list = value.split(".");
        const extension = list[list.length - 1];

        switch (extension) {
          case "rest":
            restName = value;
            break;
          case "btn":
            btnNameList.push(value);
            break;
          case "bth":
            bthNameList.push(value);
            break;
          case "png":
          case "jpg":
          case "pos":
            break;
          default:
        }
      });

      const fileOffset = { Offset: 0 };
      zip
        .file(restName)
        .async("arrayBuffer")
        .then(async restContent => {
          const dataView = new DataView(restContent);
          console.log("pac file size = " + dataView.byteLength);
          rootMap = readMap(dataView, fileOffset);

          console.log(dataView);
          console.log(rootMap);

          // seam puckering normal map 로드
          this.zProperty.seamPuckeringNormalMap = await loadTexture(zip, "seam_puckering_2ol97pf293f2sdk98.png");

          const loadedCamera = {
            ltow: new THREE.Matrix4(),
            bLoaded: false
          };

          await this.meshFactory.build(rootMap, zip, object3D, loadedCamera);

          // 여기가 실질적으로 Zrest 로드 완료되는 시점
          this.onLoad(object3D, loadedCamera, this.data);

          // add 할때 cameraPosition 이 있으면 설정해준다.
          if (this.cameraPosition) {
            this.camera.position.copy(this.cameraPosition);
          }
        });
    });
  };

  reader.readAsArrayBuffer(contentBlob);
}
