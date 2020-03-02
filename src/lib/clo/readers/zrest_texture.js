/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

export async function loadTextureFile(zip, textureFileName) {
  const resizedTextureFileURL = "http://dev.clo-set.com:8080/adap/a_" + textureFileName; // NOTE: for test only
  let url;
  if (urlExists(resizedTextureFileURL)) {
    url = resizedTextureFileURL;
  } else {
    const file = zip.file(textureFileName);
    if (!file) {
      return null;
    }
    const arraybuffer = await file.async("arrayBuffer");
    const bytes = new Uint8Array(arraybuffer);
    const blob = new Blob([bytes.buffer]);
    url = URL.createObjectURL(blob);
  }
  console.log(url);

  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    return loader.load(url, texture => {
      URL.revokeObjectURL(url);
      resolve(texture);
    });
  });
}

function urlExists(url) {
  var request = new XMLHttpRequest();
  var status;
  var statusText;
  request.open("GET", url, true);
  request.send();
  request.onload = function() {
    status = request.status;
    statusText = request.statusText;
  };
  return status == 200;
}
