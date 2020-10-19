/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "three";

export class StyleLine {
  constructor(styleLineContainer) {
    this.styleLineMap = new Map();
    this.styleLineContainer = styleLineContainer;

    // Functions
    this.clear = this.clear.bind(this);
    this.load = this.load.bind(this);
    this.setVisible = this.setVisible.bind(this);
    this.setVisibleAll = this.setVisibleAll.bind(this);
  }

  clear() {
    this.styleLineMap.clear();
    this.styleLineContainer = new THREE.Object3D();
  }

  load(styleLineMap) {
    if (!styleLineMap) return;

    this.styleLineMap = styleLineMap;
    this.addToContainer(false);
  }

  addToContainer(bVisible = true) {
    this.styleLineMap.forEach(styleLineSet => {
      styleLineSet.forEach(line => {
        line.visible = bVisible;
        this.styleLineContainer.add(line);
      });
    });
  }

  setVisible(firstLayerMatMeshID, bVisible) {
    if (this.styleLineMap.get(firstLayerMatMeshID)) {
      this.styleLineMap.get(firstLayerMatMeshID).forEach(line => {
        line.visible = bVisible;
      });
    }
  }

  setVisibleAll(bVisible) {
    this.styleLineMap.forEach(styleLineSet => {
      styleLineSet.forEach(line => {
        line.visible = bVisible;
      });
    });
  }
}
