/* eslint-disable require-jsdoc */
'use strict';
import * as THREE from '@/lib/threejs/three';

export async function loadTexture(zip, textureFileName) {
  const file = zip.file(textureFileName);
  if (!file) {
    return null;
  }

  const arraybuffer = await file.async('arrayBuffer');
  const bytes = new Uint8Array(arraybuffer);
  const blob = new Blob([bytes.buffer]);
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    return loader.load(url, (texture) => {
      URL.revokeObjectURL(url);
      resolve(texture);
    });
  });
};
