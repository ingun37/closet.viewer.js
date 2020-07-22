"use strict";
import * as THREE from "@/lib/threejs/three";

import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";

export default class FittingGarment {
  // listBarycentric = [];
  constructor() {
    this.listBarycentricCoord = [];
  }
  // loadFile = async (url, onLoad, onProgress, onError) => {
  //   const loader = new THREE.FileLoader(this.manager);
  //   loader.setResponseType("arraybuffer");
  //   return new Promise((onLoad) => {
  //     loader.load(url, onLoad, onProgress, onError);
  //   });
  // };

  loadZcrp = async (url) => {
    const getFilename = (textureURL) => {
      const splitTextureURL = textureURL.split("/");
      const filenameWithToken = splitTextureURL[splitTextureURL.length - 1];
      const filenameWithoutToken = filenameWithToken.split("?")[0];

      return filenameWithoutToken;
    };

    const loadedData = await loadFile(url);
    console.log("loadedData");
    console.log(loadedData);
    if (!loadedData) return;

    const crpFilename = getFilename(url).replace(".zcrp", ".crp");
    const unzippedData = await unZip(loadedData, crpFilename);
    console.log("unzippedData");
    console.log(unzippedData);

    const fileOffset = { Offset: 0 };
    const dataView = new DataView(unzippedData);
    const loadedMap = readMap(dataView, fileOffset);
    console.log(loadedMap);
    // console.log(this.listBarycentricCoord);
    this.listBarycentricCoord =
      loadedMap.get("listBarycentric") || loadedMap.get("listBaryCentric"); // FIX ME: Would be "listBarycentric"
    // console.log(this.listBarycentricCoord);

    return this.listBarycentricCoord;
  };

  getListBaryCoord = () => {
    return this.listBarycentricCoord;
  };
}
