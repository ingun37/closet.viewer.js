"use strict";
import * as THREE from "@/lib/threejs/three";

import { loadJson } from "@/lib/clo/readers/FileLoader";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

import { getGarmentFileName } from "@/lib/clo/utils/UtilFunctions";

export default class FittingGarment {
  // listBarycentric = [];
  constructor() {
    this.listBarycentricCoord = [];
    this.samplingJSON = null;
    // this.getGarmentFileName = (height, weight) => {
    //   return getGarmentFileName(height, weight, this.samplingJSON);
    // }
  }

  loadGarment() {}

  async loadSamplingJson({ jsonURL }) {
    const onLoad = (data) => {
      return data;
    };
    const jsonData = await loadJson(jsonURL, onLoad);
    this.samplingJSON = jsonData;
    return jsonData;
  }

  // loadDrapingSamplingJSON() {}

  draping() {}

  // loadFile = async (url, onLoad, onProgress, onError) => {
  //   const loader = new THREE.FileLoader(this.manager);
  //   loader.setResponseType("arraybuffer");
  //   return new Promise((onLoad) => {
  //     loader.load(url, onLoad, onProgress, onError);
  //   });
  // };

  async loadZcrp(url) {
    const getFilename = (textureURL) => {
      const splitTextureURL = textureURL.split("/");
      const filenameWithToken = splitTextureURL[splitTextureURL.length - 1];
      const filenameWithoutToken = filenameWithToken.split("?")[0];

      return filenameWithoutToken;
    };

    const loadedData = await loadFile(url);
    // console.log("loadedData");
    // console.log(loadedData);
    if (!loadedData) return;

    const crpFilename = getFilename(url).replace(".zcrp", ".crp");
    const unzippedData = await unZip(loadedData, crpFilename);
    // console.log("unzippedData");
    // console.log(unzippedData);

    const fileOffset = { Offset: 0 };
    const dataView = new DataView(unzippedData);
    const loadedMap = readMap(dataView, fileOffset);
    // console.log(loadedMap);
    // console.log(this.listBarycentricCoord);
    this.listBarycentricCoord =
      loadedMap.get("listBarycentric") || loadedMap.get("listBaryCentric"); // FIX ME: Would be "listBarycentric"
    // console.log(this.listBarycentricCoord);

    return this.listBarycentricCoord;
  }

  getListBaryCoord() {
    return this.listBarycentricCoord;
  }

  // getDrapingData = async (zcrpURL, mapMatMesh) => {
  async loadDrapingData({ rootPath, height, weight, mapMatMesh }) {
    const zcrpName = getGarmentFileName(height, weight, this.samplingJSON);
    const zcrpURL = rootPath + `P0_${height}_${weight}.zcrp`;
    // const zcrpURL = rootPath + zcrpURL;
    const listBarycentricCoord = await this.loadZcrp(zcrpURL);
    if (!listBarycentricCoord) {
      console.warn("Build barycentric coordinate failed.");
      return;
    }

    listBarycentricCoord.forEach((garment) => {
      // const garment = listBarycentricCoord[0];
      // console.log(garment);
      const listABG = readByteArray("Float", garment.get("baAbgs"));
      const listTriangleIndex = readByteArray(
        "Uint",
        garment.get("baTriangleIndices")
      );
      const listMatMeshID = garment.get("listMatMeshID");
      if (!listMatMeshID) {
        console.warn("MatMeshID info missing");
        return;
      }

      listMatMeshID.forEach((matMeshId) => {
        const matMesh = mapMatMesh.get(matMeshId);

        if (!matMesh) {
          console.error(
            "matMesh(" + matMeshId + ") is not exist on init garment"
          );
          console.log(matMeshId);
          console.log(mapMatMesh);

          return;
        }
        // console.log(matMesh);

        const index = matMesh.userData.originalIndices;
        const uv = matMesh.userData.originalUv;
        const uv2 = matMesh.userData.originalUv2;

        // console.log(index);
        // console.log(uv);
        // console.log(uv2);

        const calculatedCoord = this.computeBarycentric(
          listABG,
          listTriangleIndex
        );
        const bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.addAttribute(
          "position",
          new THREE.Float32BufferAttribute(new Float32Array(calculatedCoord), 3)
        );

        bufferGeometry.setIndex(
          new THREE.BufferAttribute(new Uint32Array(index), 1)
        );

        // bufferGeometry.computeBoundingBox();
        bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();

        bufferGeometry.addAttribute(
          "uv",
          new THREE.Float32BufferAttribute(uv, 2)
        );
        bufferGeometry.addAttribute(
          "uv2",
          new THREE.Float32BufferAttribute(uv2, 2)
        );

        matMesh.geometry = bufferGeometry;
      });

      // bufferGeometry.attributes.uv2 = uv2;

      // const threeMesh = new THREE.Mesh(bufferGeometry, material);
      // console.log("threeMesh");
      // console.log(threeMesh);
      // this.container.add(threeMesh);
      // this.buildMesh(bufferGeometry, material);
    });

    console.log("loadGarment Done");
  }

  // async getSamplingJson(styleId, version) {
  //   this.styleId = styleId;
  //   this.styleVersion = version;
  //   const jsonURL =
  //     this.avtRootPath +
  //     "/" +
  //     styleId +
  //     "/" +
  //     version +
  //     "/" +
  //     this.avatarId +
  //     "/sampling.json";
  //   console.log(jsonURL);

  //   const onLoad = (data) => {
  //     return data;
  //   };
  //   const jsonData = await loadJson(jsonURL, onLoad);
  //   console.log("jsonData: ");
  //   console.log(jsonData);
  //   return jsonData;
  // }

  // getDrapingDataURL({pathRoot, height, weight, samplingData, gradingIndex}) {
  //   const garmentFilename = getGarmentFileName(height, weight, samplingData);
  //   const garmentURL =
  //     pathRoot +
  //     "/" +
  //     this.styleId +
  //     "/" +
  //     this.styleVersion +
  //     "/" +
  //     this.avatarId +
  //     "/" +
  //     gradingIndex +
  //     "/" +
  //     garmentFilename;
  //   // console.log(garmentURL);

  //   return garmentURL;
  // }
}
