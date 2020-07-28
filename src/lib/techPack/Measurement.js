/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

export class Measurement {
  constructor(measurementContainer) {
    this.geometryMap = new Map();
    this.container = measurementContainer;
    this.matMeshMap = null;

    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x000ff });
  }

  load(matMeshMap, listPatternMeasure) {
    if (!listPatternMeasure || !matMeshMap) return;

    this.matMeshMap = matMeshMap;

    let geometryIndex = 0;
    listPatternMeasure.forEach((entry) => {
      const arrPos = entry.get("arrPosition3D");
      if (!arrPos) {
        return;
      }

      // Gather points for measure lines
      const points = [];
      arrPos.forEach((pos) => {
        points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      });

      // Build line and add container
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, this.lineMaterial);
      line.visible = false; // Set invisible as default
      this.container.add(line);

      // Add position and geometry to local maps
      this.geometryMap.set(geometryIndex++, line);
    });
  }

  isAvailable() {
    return this.geometryMap.size > 0;
  }

  setVisible(index, bVisible) {
    const line = this.geometryMap.get(index);
    if (line) {
      line.visible = bVisible;
    }
  }

  setAllVisible(bVisible) {
    this.geometryMap.forEach((line) => {
      line.visible = bVisible;
    });
  }

  activate() {
    this.adjustAllMeshOffset(true);
  }

  deactivate() {
    this.adjustAllMeshOffset(false);
    this.setAllVisible(false);
  }

  adjustAllMeshOffset(bOffset, offset = 100) {
    this.matMeshMap.forEach((matMesh) => {
      const material = matMesh.material;
      if (material) {
        material.polygonOffset = bOffset;
        material.polygonOffsetFactor = 1;
        material.polygonOffsetUnits = offset;
      }
    });
  }
}
