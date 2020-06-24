/* eslint-disable max-len */
"use strict";

/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
import JSZip from "@/lib/jszip/dist/jszip";

export default class FileLoader {
  constructor(loadManager, parse) {
    this.manager =
      loadManager !== undefined ? manager : THREE.DefaultLoadingManager;
    // this.loader = new THREE.FileLoader(this.manager);
    // this.loader.setResponseType("arraybuffer");
    this.req = undefined;
    this.parse = parse;
  }
  onProgress = () => {};
  onError = () => {};
  onLoad = () => {};

  loadZrest = (url, onLoad, onProgress, onError) => {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    this.req = loader.load(
      url,
      (data) => {
        this.parse(data, onLoad);
      },
      onProgress,
      onError
    );
  };

  abort = () => {
    if (this.req) {
      this.aborted = true;
      this.req.abort();
    }
  };
}

export async function unZip(zippedData, filename) {
  console.log(zippedData, filename);
  const jsZip = new JSZip();
  await jsZip.loadAsync(zippedData);

  let unzipped = null;
  try {
    unzipped = await jsZip.file(filename).async("arrayBuffer");
  } catch (e) {
    console.error("ERROR: " + filename + " not found.");
  }

  return unzipped;
}

export async function loadFile(url, onLoad, onProgress, onError) {
  const loader = new THREE.FileLoader(THREE.DefaultLoadingManager);
  loader.setResponseType("arraybuffer");
  return new Promise((onLoad) => {
    loader.load(url, onLoad, onProgress, onError);
  });
}

// FIXME: Refactor this
export async function loadJson(url, onLoad, onProgress, onError) {
  const loader = new THREE.FileLoader(THREE.DefaultLoadingManager);
  loader.setResponseType("json");
  return new Promise((onLoad) => {
    loader.load(url, onLoad, onProgress, onError);
  });
}
