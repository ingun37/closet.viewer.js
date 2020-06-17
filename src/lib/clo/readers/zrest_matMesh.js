/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { MATMESH_TYPE } from "@/lib/clo/readers/Predefined";
import { makeMaterial } from "@/lib/clo/readers/zrest_material";
import { unZip } from "./FileLoader";
import { createMatMesh } from "@/lib/clo/readers/zrest_draco";

export default function MatMeshManager({
  materialInformationMap: materialInformationMap,
  camera: loadedCamera,
  drawMode: drawMode,
  zrestProperty: zProperty,
}) {
  this.matMeshMap = zProperty.matMeshMap;
  this.matShapeMap = zProperty.matShapeMap;

  this.materialInformationMap = materialInformationMap;
  this.camera = loadedCamera;
  this.drawMode = drawMode;
  this.zProperty = zProperty;
  this.colorwayIndex = zProperty.colorwayIndex;
  this.styleLineMap = new Map();
  this.matShapeMap = new Map();

  this.matMeshManager = zProperty.matMeshManager;

  // TODO: 피팅맵 임시
  this.zProperty.mapChangedIndex = new Map();
}

MatMeshManager.prototype = {
  constructor: MatMeshManager,

  // 난 이 지옥을 벗어날 수 있을까?
  async getMatMeshs(
    zrestLoader,
    mapGeometry,
    zip,
    bLoadTransparentObject,
    materialInformationMap,
    colorwayIndex,
    loadedCamera
  ) {
    if (zrestLoader.aborted) return;

    const processListChildrenTransformer3D = async () => {
      const listCT3D = mapGeometry.get("listChildrenTransformer3D");
      if (!listCT3D) return;

      const newListCT3DPromise = listCT3D.map(async (childTF3D) => {
        return await this.getMatMeshs(
          zrestLoader,
          childTF3D,
          zip,
          bLoadTransparentObject,
          materialInformationMap,
          colorwayIndex,
          loadedCamera
        );
      });
      const newListCT3D = await Promise.all(newListCT3DPromise);
      newListCT3D.map((childTF) => tf.add(childTF));
    };

    const processMapTransformer3D = async () => {
      const mapTransformer3D = mapGeometry.get("mapTransformer3D");
      if (mapTransformer3D) {
        if (zrestLoader.aborted) return;
        const childTF = await this.getMatMeshs(
          zrestLoader,
          mapTransformer3D,
          zip,
          bLoadTransparentObject,
          materialInformationMap,
          colorwayIndex,
          loadedCamera
          // this.zProperty.version
        );
        tf = childTF;
      }
    };

    const processM4Matrix = () => {
      const mat4 = new THREE.Matrix4().identity();
      if (mapGeometry.get("m4Matrix")) {
        const localMatrix = mapGeometry.get("m4Matrix");
        // prettier-ignore
        mat4.set(
          localMatrix.a00, localMatrix.a01, localMatrix.a02, localMatrix.a03,
          localMatrix.a10, localMatrix.a11, localMatrix.a12, localMatrix.a13,
          localMatrix.a20, localMatrix.a21, localMatrix.a22, localMatrix.a23,
          localMatrix.a30, localMatrix.a31, localMatrix.a32, localMatrix.a33
        );
      }
      tf.applyMatrix(mat4);
    };

    // NOTE: This module takes a lot of costs. Should be improved if possible.
    const processListMatShape = async () => {
      const listMatShape = mapGeometry.get("listMatShape");
      if (!listMatShape) return;

      // Convert listMatShape to matShapeMap
      listMatShape.forEach((matShape) => {
        const list = matShape.get("listMatMeshIDOnIndexedMesh");
        list.forEach((matMeshIDOnIndexedMesh) => {
          const n = matMeshIDOnIndexedMesh.get("uiMatMeshID");
          this.matShapeMap.set(n, matMeshIDOnIndexedMesh);
        });
      });

      if (zrestLoader.aborted) return;

      // 여기가 끝판왕; 여기만 잡으면 승산 있다
      await createMatMesh(
        this,
        listMatShape,
        zip,
        tf,
        bLoadTransparentObject,
        materialInformationMap
      );
    };

    this.camera = loadedCamera;
    this.colorwayIndex = colorwayIndex;

    let tf = new THREE.Object3D();

    await processListChildrenTransformer3D();

    await processMapTransformer3D();

    processM4Matrix();

    await processListMatShape();

    return tf;
  },

  getStyleLineMap() {
    return this.styleLineMap;
  },
};
