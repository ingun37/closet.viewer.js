/* eslint-disable require-jsdoc */
"use strict";
import { TextureLoader } from "three/src/loaders/TextureLoader";
import LibArchive, { Extraction } from "../../jszip/dist/jszip";


export async function loadTexture(zip:Extraction, textureFileName:string) {

  const file = zip.file(textureFileName);
  if (!file) {
    return null;
  }
  const blob = file;
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const loader = new TextureLoader();
    return loader.load(url, texture => {
      URL.revokeObjectURL(url);
      resolve(texture);
    });
  });
}
