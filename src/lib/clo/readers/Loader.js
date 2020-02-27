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

  const btnNameList = [];
  const bthNameList = [];

  reader.onload = e => {
    this.jsZip = new JSZip();
    this.jsZip.loadAsync(e.target.result).then(zip => {
      const keyList = Object.keys(zip.files);
      console.log(keyList);
      console.log(zip);

      jsZipSizeAnalyzer(zip);

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

          console.log("rootMap: ");
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

          this.zProperty.nameToTextureMap.clear();
        });
    });
  };

  reader.readAsArrayBuffer(contentBlob);
}

function jsZipSizeAnalyzer(jsZip) {
  let meshFileSize = 0;
  let textureFileSize = 0;
  let dotRestFileSize = 0;
  const meshFileList = [];
  const restFileList = [];

  const files = Object.entries(jsZip.files);
  files.forEach(entry => {
    const name = entry[1].name;
    const size = entry[1]._data.compressedSize;
    if (name.includes(".drc")) {
      meshFileSize += size;
      meshFileList.push(name);
    } else {
      if (name.includes(".rest")) {
        dotRestFileSize = size;
      } else {
        textureFileSize += size;
        restFileList.push(name);
      }
    }
  });
  const totalSize = meshFileSize + textureFileSize + dotRestFileSize;
  const buildPercentage = (size, total) => {
    return "  (" + (size / total) * 100 + "%)";
  };

  console.log("\n====== JSZIP SIZE REPORT ======");
  console.log("Total: " + totalSize);
  console.log("Mesh: " + meshFileSize + buildPercentage(meshFileSize, totalSize));
  console.log("Texture: " + textureFileSize + buildPercentage(textureFileSize, totalSize));
  console.log(".rest: " + dotRestFileSize + buildPercentage(dotRestFileSize, totalSize));
  console.log("===============================");
  console.log(meshFileList);
  console.log(restFileList);
  console.log("===============================\n");
}
