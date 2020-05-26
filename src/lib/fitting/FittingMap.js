import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import * as THREE from "@/lib/threejs/three";

export default class FittingMap {
  constructor() {
    this.mapVertexColor = new Map();
    // this.geometry = new THREE.Geometry();
    this.geometry = new THREE.BufferGeometry();
    this.mapChangedIndex = new Map();
  }

  clear() {
    this.mapVertexColor.clear();
    this.mapChangedIndex.clear();
  }

  load({ mapGeometry: mapGeometry, mapChangedIndex: mapChangedIndex }) {
    this.mapChangedIndex = mapChangedIndex;
    this.clear();
    this.extract(mapGeometry);
  }

  extract(mapInput) {
    const shouldRecursive = (element) => {
      return (
        element instanceof Map &&
        element.has("listChildrenTransformer3D") &&
        element.get("listChildrenTransformer3D") != null
      );
    };

    if (shouldRecursive(mapInput)) {
      this.extract(mapInput.get("listChildrenTransformer3D"));
    } else {
      mapInput.forEach((element) => {
        if (shouldRecursive(element)) {
          this.extract(element);
        }
        const listMatShape = element.get("listMatShape");
        if (listMatShape) {
          this.extractFitmapData(listMatShape);
        }
      });
    }
  }

  extractFitmapData(listMatShape) {
    const vertexColor = "baFitmapVertexColor";
    //  const vertexValue = "baFitmapVertexValue";  // NOTE: Not used yet.
    listMatShape.forEach((matShape) => {
      if (matShape.has(vertexColor)) {
        const meshIDs = matShape.get("listMatMeshIDOnIndexedMesh");
        const baVertexColor = readByteArray("Float", matShape.get(vertexColor));
        meshIDs.forEach((meshID) => {
          // NOTE: meshID is an array but might have only 1 element
          const matMeshID = meshID.get("uiMatMeshID");
          this.mapVertexColor.set(matMeshID, baVertexColor);
        });
      }
    });
  }

  createVertice(mapMatMesh) {
    // console.log("======= create Vertice");
    // console.log(mapMatMesh);
    this.mapMatMesh = mapMatMesh;
    for (const entries of this.mapVertexColor) {
      const matMeshID = entries[0];
      const arrayVertexColor = entries[1];

      const matMesh = mapMatMesh.get(matMeshID);
      const colorsWithChangedIndex = this.changeVerticeIndex(
        matMeshID,
        arrayVertexColor
      );
      const colors = colorsWithChangedIndex; // || new Float32Array(arrayVertexColor.length);
      // console.log(matMeshID, arrayVertexColor.length / 4);

      const geometry = matMesh.geometry;
      geometry.addAttribute(
        "vFittingColor",
        new THREE.BufferAttribute(colors, 4)
      );

      matMesh.material.fittingColor = new THREE.BufferAttribute(
        colors,
        colors.length
      );
      matMesh.material.uniforms.bUseFittingMap = {
        type: "i",
        value: 1,
      };
    }
  }

  changeVerticeIndex(matMeshID, arrayVertexColor) {
    if (!this.mapChangedIndex.has(matMeshID)) {
      console.warn(matMeshID + " has no changed index info");
      return;
    }

    const colors = new Float32Array(arrayVertexColor.length).fill(-1.0);
    const arrayChangedIndex = this.mapChangedIndex.get(matMeshID);

    for (let index = 0; index < arrayChangedIndex.length; ++index) {
      const changedIndex = arrayChangedIndex[index];
      for (let i = 0; i < 4; ++i) {
        const scaledIdx = changedIndex * 4 + i;
        colors[scaledIdx] =
          changedIndex >= 0 ? arrayVertexColor[index * 4 + i] : 0.0;
      }
    }

    return colors;
  }
}
