/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

export class Measurement {
  constructor(measurementContainer) {
    this.posMap = new Map();
    this.container = measurementContainer;
    this.lineMap = new Map();

    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x000ff });
  }

  load(listPatternMeasure) {
    listPatternMeasure.forEach(entry => {
      const id = entry.get("uiID");
      const arrPos = entry.get("arrPosition3D");
      const points = [];
      arrPos.forEach(pos => {
        points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      });
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.renderOrder;
      const line = new THREE.Line(geometry, this.lineMaterial);
      this.container.add(line);

      this.posMap.set(id, arrPos);
      this.lineMap.set(id, line);
    });

    this.build();

    console.log(this.posMap);
  }

  build() {
    for (const [id, vertice] of Object.entries(this.posMap)) {
      for (let vertex of vertice) {
        console.log(vertex);
      }
    }
  }

  setVisible() {}
}
