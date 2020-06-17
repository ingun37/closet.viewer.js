"use strict";
import * as THREE from "@/lib/threejs/three";

import { unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";

export default class FitGarment {
  // listBarycentric = [];
  constructor() {
    this.listBarycentricCoord = [];
  }
  loadFile = async (url, onLoad, onProgress, onError) => {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    return new Promise((onLoad) => {
      loader.load(url, onLoad, onProgress, onError);
    });
  };

  loadZcrp = async (url, zcrpFileName) => {
    const loadedData = await this.loadFile(url);
    console.log("loadedData");
    console.log(loadedData);
    if (!loadedData) return;

    const unzippedData = await unZip(loadedData, zcrpFileName);
    console.log("unzippedData");
    console.log(unzippedData);

    const fileOffset = { Offset: 0 };
    const dataView = new DataView(unzippedData);
    const loadedMap = readMap(dataView, fileOffset);
    console.log(this.listBarycentricCoord);
    this.listBarycentricCoord = loadedMap.get("listBaryCentric"); // FIX ME: Would be "listBarycentric"
    console.log(this.listBarycentricCoord);

    return this.listBarycentricCoord;
  };

  getListBaryCoord = () => {
    return this.listBarycentricCoord;
  };
}
