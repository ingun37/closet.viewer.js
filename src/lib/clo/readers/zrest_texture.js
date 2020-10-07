/* eslint-disable require-jsdoc */
"use strict";
import { TextureLoader } from "three/src/loaders/TextureLoader";


export async function loadTexture(zip, textureFileName) {
  const file = zip.file(textureFileName);
  if (!file) {
    return null;
  }

  const arraybuffer = await file.async("arrayBuffer");
  const bytes = new Uint8Array(arraybuffer);
  const blob = new Blob([bytes.buffer]);
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const loader = new TextureLoader();
    return loader.load(url, texture => {
      URL.revokeObjectURL(url);
      resolve(texture);
    });
  });
}
