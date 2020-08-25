"use strict";
import * as THREE from "@/lib/threejs/three";

import { loadJson } from "@/lib/clo/readers/FileLoader";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap, readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { getGarmentFileName } from "@/lib/clo/utils/UtilFunctions";
import { computeBarycentric } from "./FittingBarycentricCoord";
import FittingTrims from "./FittingTrims";

export default class FittingGarment {
  constructor() {
    this.listBarycentricCoord = [];
    // this.samplingJSON = null;
    FittingGarment.prototype.samplingJSON = null;

    // TODO: Consider getting the address, not the value.
    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];
  }

  // TODO: rootMap is huge. Find out better way.
  init({bodyVertexPos, bodyVertexIndex, zrest}) {
    //mapBarycentricPrintTexture
    console.log({bodyVertexPos, bodyVertexIndex, zrest})
    this.setBody(bodyVertexPos, bodyVertexIndex);
    this.trims = new FittingTrims(zrest);
  }

  setBody = (bodyVertexPos, bodyVertexIndex) => {
    this.bodyVertexPos = bodyVertexPos;
    this.bodyVertexIndex = bodyVertexIndex;
  }

  async loadSamplingJson({ jsonURL }) {
    const onLoad = (data) => {
      return data;
    };
    const jsonData = await loadJson(jsonURL, onLoad);
    this.samplingJSON = jsonData;
    return jsonData;
  }

  async loadZcrp(url) {
    const getFilename = (textureURL) => {
      const splitTextureURL = textureURL.split("/");
      const filenameWithToken = splitTextureURL[splitTextureURL.length - 1];
      const filenameWithoutToken = filenameWithToken.split("?")[0];

      return filenameWithoutToken;
    };

    const loadedData = await loadFile(url);
    if (!loadedData) return;

    const crpFilename = getFilename(url).replace(".zcrp", ".crp");
    const unzippedData = await unZip(loadedData, crpFilename);

    const fileOffset = { Offset: 0 };
    const dataView = new DataView(unzippedData);
    const loadedMap = readMap(dataView, fileOffset);
    this.listBarycentricCoord =
      loadedMap.get("listBarycentric") || loadedMap.get("listBaryCentric"); // FIX ME: Would be "listBarycentric"

    return this.listBarycentricCoord;
  }

  async loadDrapingDataFromURL({ zcrpURL, mapMatMesh }) {
    const listBarycentricCoord = await this.loadZcrp(zcrpURL);
    // return this.draping({ listBarycentricCoord, mapMatMesh });
  }

  async loadDrapingData({ rootPath, height, weight, mapMatMesh }) {
    const zcrpName = getGarmentFileName(height, weight, this.samplingJSON);
    // const zcrpURL = rootPath + `P0_${height}_${weight}.zcrp`;
    const zcrpURL = rootPath + zcrpName;
    const listBarycentricCoord = await this.loadZcrp(zcrpURL);

    // console.log(this.samplingJSON);
    // console.log(mapMatMesh);
    // console.log(listBarycentricCoord);

    // return this.draping({ listBarycentricCoord, mapMatMesh });
  }

  getListBarycentricCoord() {
    return this.listBarycentricCoord;
  }

  draping({ listBarycentricCoord, mapMatMesh }) {
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
        const uv2 = uv;

        // console.log(index);
        // console.log(uv);
        // console.log(uv2);

        const calculatedCoord = computeBarycentric({
          listABG: listABG,
          listTriangleIndex: listTriangleIndex,
          bodyVertexPos: this.bodyVertexPos,
          bodyVertexIndex: this.bodyVertexIndex,
        });
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
    });
  }
}
