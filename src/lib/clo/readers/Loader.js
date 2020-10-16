"use strict";
import { Matrix4 } from "three/src/math/Matrix4";
import { Object3D } from "three/src/core/Object3D";

import LibArchive from "../../jszip/dist/jszip";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";
import { loadTexture } from "@/lib/clo/readers/zrest_texture";

export function readZrestFromBlob(zrestLoader, blob, header) {
  const object3D = new Object3D();
  object3D.name = "object3D";


  const contentBlob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

  let rootMap;
  let restName = "";

  // TODO: consider change names. btn and bth are confusing easily
  const btnNameList = [];
  const bthNameList = [];

  {
    this.libArchive = new LibArchive();
    this.libArchive.loadAsync(contentBlob).then(zip => {
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
      zip.file(restName).arrayBuffer().then(async restContent => {
        const dataView = new DataView(restContent);
        console.log("pac file size = " + dataView.byteLength);
        rootMap = readMap(dataView, fileOffset);

        console.log(dataView);
        console.log(rootMap);
        // temp
        this.zProperty.rootMap = rootMap;

        // seam puckering normal map 로드
        this.zProperty.seamPuckeringNormalMap = await loadTexture(zip, "seam_puckering_2ol97pf293f2sdk98.png");

        const loadedCamera = {
          ltow: new Matrix4(),
          bLoaded: false
        };

        await this.meshFactory.build(zrestLoader, rootMap, zip, object3D, loadedCamera);

        // 여기가 실질적으로 Zrest 로드 완료되는 시점
        this.onLoad(object3D, loadedCamera, this.data);

        // add 할때 cameraPosition 이 있으면 설정해준다.
        if (this.cameraPosition) {
          this.camera.position.copy(this.cameraPosition);
        }

        this.zProperty.nameToTextureMap.clear();
      })
    })
  };

}
