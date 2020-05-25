/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { MATMESH_TYPE } from "@/lib/clo/readers/Predefined";
import { makeMaterial } from "@/lib/clo/readers/zrest_material";
import { unZip } from "./FileLoader";

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

      for (const childTF3D of listCT3D) {
        if (zrestLoader.aborted) return;

        const childTF = await this.getMatMeshs(
          zrestLoader,
          childTF3D,
          zip,
          bLoadTransparentObject,
          materialInformationMap,
          colorwayIndex,
          loadedCamera
          // version
        );

        if (zrestLoader.aborted) return;
        tf.add(childTF);
      }
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
      if (zrestLoader.aborted) return;
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

      await this.parseListMatShape(
        zrestLoader,
        zip,
        listMatShape,
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

  // 여기가 끝판왕; 여기만 잡으면 승산 있다
  async parseListMatShape(
    zrestLoader,
    JSZipOrDracoData,
    listMatShape,
    tf,
    bLoadTransparentObject,
    materialInformationMap
  ) {
    // TODO: Do refactor more!
    // TODO: Is this the appropriate function name??
    const splitMatSpaceToMatMesh = async (
      listMatMeshIDOnIndexedMesh,
      totalIdxCount,
      listIdxCount,
      dracoGeometry,
      bVisible
    ) => {
      const zrestVersion = this.zProperty.version;
      let indexOffset = zrestVersion > 4 ? 0 : totalIdxCount;
      for (let m = 0; m < listIdxCount.length; ++m) {
        if (zrestVersion <= 4) {
          indexOffset = indexOffset - listIdxCount[m];
        }
        /**
         * NOTE:
         * to Rayn 왜 이렇게 index 를 거꾸로 해야 제대로 렌더링되는지 원인을 모르겠음.
         * 일단 이렇게 해서 되는 것 같지만 찜찜..
         * Jaden 2017.06.25
         */
        const matMeshID = listMatMeshIDOnIndexedMesh[m].get("uiMatMeshID");
        const matProperty = materialInformationMap.get(matMeshID);
        const indexSize = listIdxCount[m];

        /**
         * NOTE:
         * 이제는 bPerfectTransparent 해도 무조건 그린다.
         * colorway 중 하나만 perfect transparent했을 때 mesh 안그리게 하면 perfect transparent 하지 않는 colorway 로 바꿨을 때도 아예 안그려지는 버그 발생.
         */

        // TODO: refactor this
        const bTransparent =
          matProperty.colorwayMaterials[this.colorwayIndex].bTransparent;

        // TODO: TEMP; 투명, 불투명 처리하려면 이 부분을 잘 건드려야 한다
        if (bLoadTransparentObject) {
          if (!bTransparent) {
            if (zrestVersion > 4) {
              indexOffset += indexSize;
            }
            continue;
          }
        } else {
          if (bTransparent) {
            if (zrestVersion > 4) {
              indexOffset += indexSize;
            }
            continue;
          }
        }

        /**
         * NOTE:
         * THREE.Geometry 를 사용하면 실제 메쉬의 메모리보다 10배 가까운 메모리를 사용하게 된다.
         * 왜 그정도인지는 모르겠지만.. 그래서 BufferGeometry 사용한다.
         * Jaden 2017.06.08
         */
        const bufferGeometry = new THREE.BufferGeometry();

        /**
         * NOTE:
         * dracoGeometry의 해당 mesh에 의해 사용된 vertex들로만 새로운 메쉬를 만들기 위해 changeVertexIndex 만든다.
         * 값은 새로운 메쉬에서의 vertexIndex. 초기값은 -1.
         */
        const changeVertexIndex = new Int32Array(
          dracoGeometry.vertices.length / 3
        );

        // console.log(dracoGeometry.vertices.length);

        for (let j = 0; j < dracoGeometry.vertices.length / 3; j++) {
          changeVertexIndex[j] = -1;
        }

        // console.log("changeVertexIndex done");

        const posAttrib = [];
        const normalAttrib = [];
        const uvAttrib = [];
        const uv2Attrib = [];

        let count = 0;

        for (let j = 0; j < indexSize; j++) {
          const index = dracoGeometry.indices[indexOffset + j];
          if (changeVertexIndex[index] === -1) {
            // 방문되지 않은 녀석들만 새로운 mesh vertex 로 추가한다.
            changeVertexIndex[index] = count;
            count++;

            const threePos = new THREE.Vector3(
              dracoGeometry.vertices[index * 3],
              dracoGeometry.vertices[index * 3 + 1],
              dracoGeometry.vertices[index * 3 + 2]
            );
            // threePos.applyMatrix4(m4);

            posAttrib.push(threePos.x);
            posAttrib.push(threePos.y);
            posAttrib.push(threePos.z);

            if (dracoGeometry.useNormal) {
              normalAttrib.push(dracoGeometry.normals[index * 3]);
              normalAttrib.push(dracoGeometry.normals[index * 3 + 1]);
              normalAttrib.push(dracoGeometry.normals[index * 3 + 2]);
            }

            uvAttrib.push(dracoGeometry.uvs[index * 2]);
            uvAttrib.push(dracoGeometry.uvs[index * 2 + 1]);

            if (dracoGeometry.numUVs >= 2) {
              uv2Attrib.push(dracoGeometry.uv2s[index * 2]);
              uv2Attrib.push(dracoGeometry.uv2s[index * 2 + 1]);
            }
          }
        }

        // console.log("index loop done");

        if (m === 0) {
          frontVertexCount = count;
        }

        bufferGeometry.addAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(posAttrib), 3)
        );

        if (dracoGeometry.useNormal) {
          bufferGeometry.addAttribute(
            "normal",
            new THREE.BufferAttribute(new Float32Array(normalAttrib), 3)
          );
        }

        bufferGeometry.addAttribute(
          "uv",
          new THREE.BufferAttribute(new Float32Array(uvAttrib), 2)
        );
        if (dracoGeometry.numUVs >= 2) {
          bufferGeometry.addAttribute(
            "uv2",
            new THREE.BufferAttribute(new Float32Array(uv2Attrib), 2)
          );
        }

        // Set Indices
        const indexAttrib = [];

        if (zrestVersion > 4) {
          for (let k = 0; k < indexSize; k++) {
            const index = dracoGeometry.indices[indexOffset + k];
            indexAttrib.push(changeVertexIndex[index]);
          }

          indexOffset += indexSize;
        } else {
          for (let j = indexSize / 3 - 1; j >= 0; j--) {
            indexAttrib.push(
              changeVertexIndex[dracoGeometry.indices[indexOffset + j * 3]]
            );
            indexAttrib.push(
              changeVertexIndex[dracoGeometry.indices[indexOffset + j * 3 + 1]]
            );
            indexAttrib.push(
              changeVertexIndex[dracoGeometry.indices[indexOffset + j * 3 + 2]]
            );
          }
        }

        bufferGeometry.setIndex(
          new THREE.BufferAttribute(new Uint32Array(indexAttrib), 1)
        );

        if (!dracoGeometry.useNormal) {
          bufferGeometry.computeFaceNormals();
          bufferGeometry.computeVertexNormals();
        }

        if (zrestLoader.aborted) return;

        const bUseSeamPuckeringNormalMap = dracoGeometry.numUVs >= 2;

        const material = await makeMaterial({
          jsZip: JSZipOrDracoData,
          matProperty: matProperty,
          zProperty: this.zProperty,
          matMeshID: matMeshID,
          bUseSeamPuckeringNormalMap: bUseSeamPuckeringNormalMap,
        });

        if (zrestLoader.aborted) return;
        if (material === "undefined") {
          console.error("material(" + matMeshID + ") undefined!");
          return;
        }

        const threeMesh = new THREE.Mesh(bufferGeometry, material);
        const matMeshType = listMatMeshIDOnIndexedMesh[m].get("enType");
        // 여기서 center, normal, bounding sphere radius,

        // TODO: OMG, please refactor here
        let type = MATMESH_TYPE.PATTERN_MATMESH;
        if (MATMESH_TYPE !== undefined || MATMESH_TYPE !== null) {
          if (MATMESH_TYPE === 0) {
            type = MATMESH_TYPE.PATTERN_MATMESH;
          } else if (matMeshType === 1) {
            type = MATMESH_TYPE.TRIM_MATMESH;
          } else if (matMeshType === 2) {
            type = MATMESH_TYPE.PRINTOVERLAY_MATMESH;
          } else if (matMeshType === 3) {
            type = MATMESH_TYPE.BUTTONHEAD_MATMESH;
          } else if (matMeshType === 4) {
            type = MATMESH_TYPE.NORMAL_MATMESH;
          } else if (matMeshType === 5) {
            type = MATMESH_TYPE.AVATAR_MATMESH;
          } else if (matMeshType === 6) {
            type = MATMESH_TYPE.STITCH_MATMESH;
          } else if (matMeshType === 7) {
            type = MATMESH_TYPE.BUTTONHOLE_MATMESH;
          }
        }

        // TODO: 피팅맵 임시
        if (type === MATMESH_TYPE.PATTERN_MATMESH) {
          this.zProperty.mapChangedIndex.set(matMeshID, changeVertexIndex);
        }

        const center = new THREE.Vector3(-1, -1, -1);
        const normal = new THREE.Vector3(-1, -1, -1);
        const boundingSphereRadius = 0.0;

        // 여기도 version 가지고 나누는게 나을까? center랑 이런거 데이터가 없을텐데.
        threeMesh.userData = {
          SELECTED: false,
          MATMESH_ID: matMeshID,
          TYPE: type,
          CENTER: center,
          NORMAL: normal,
          BOUNDING_SPHERE_RADIUS: boundingSphereRadius,
        };

        if (zrestVersion >= 4) {
          if (bVisible === undefined || bVisible === null) {
            threeMesh.visible = true;
          } else {
            threeMesh.visible = bVisible;
            // if (bVisible === 0) {
            //   threeMesh.visible = false;
            // } else if (bVisible === 1) {
            //   threeMesh.visible = true;
            // }
          }
        } else {
          threeMesh.visible = true;
        }

        let b = true;
        if (material.uniforms.materialOpacity.value == 0) {
          b = false;
        }

        threeMesh.castShadow = b;
        threeMesh.receiveShadow = b;
        tf.add(threeMesh);

        this.matMeshMap.set(matMeshID, threeMesh);

        if (zrestVersion > 4) {
          // marker 만들자.
          const cameraPos = new THREE.Vector3();
          cameraPos.copy(center);

          const distanceVector = new THREE.Vector3();
          distanceVector.copy(normal);
          distanceVector.normalize();

          distanceVector.multiplyScalar(boundingSphereRadius * 13);

          cameraPos.add(distanceVector);
        }
      }
    };

    const getDracoGeometry = async (qsDracoFileName) => {
      // Draco Compression
      const dracoMeshFilename = readByteArray("String", qsDracoFileName);
      if (!dracoMeshFilename) {
        console.error("cannot find draco Mesh");
        return false;
      }

      const getFromMapDracoData = async () => {
        // TODO: This is really dangerous code!
        // const order = dracoMeshFilename.replace("drc", "").replace(".", "");
        // console.log(order);
        // console.log(JSZipOrDracoData);
        // console.log(dracoMeshFilename);

        const zippedData = JSZipOrDracoData.get(dracoMeshFilename);
        const drcArrayBuffer = await unZip(zippedData, dracoMeshFilename);

        // TODO: File load 분할화 시도
        // const drcArrayBuffer = await unZip(JSZipOrDracoData, dracoMeshFilename);
        return drcArrayBuffer;
      };

      const getFromJSZip = async () => {
        const drcArrayBuffer = await JSZipOrDracoData.file(
          dracoMeshFilename
        ).async("arrayBuffer");

        return drcArrayBuffer;
      };

      // console.log(this.zProperty.bDisassembled);
      const drcArrayBuffer = this.zProperty.bDisassembled
        ? await getFromMapDracoData()
        : await getFromJSZip();

      const dracoLoader = new THREE.DRACOLoader();

      return dracoLoader.decodeDracoFile(drcArrayBuffer);
    };

    const buildStyleLines = (dracoGeometry, patternIdx, listLine) => {
      if (!listLine) {
        return;
      }

      const styleLineMaterial = new THREE.LineBasicMaterial({
        color: 0xfffe00,
      });
      const currentStyleLineSet = new Set();

      for (let k = 0; k < listLine.length; ++k) {
        const frontStyleLineGeometry = new THREE.Geometry();
        const backStyleLineGeometry = new THREE.Geometry();

        const listMeshPointIndex = listLine[k].get("listMeshPointIndex");
        if (listMeshPointIndex !== undefined && listMeshPointIndex !== null) {
          for (let h = 0; h < listMeshPointIndex.length; ++h) {
            let vIndex = listMeshPointIndex[h].get("uiMeshPointIndex");
            if (vIndex !== undefined && vIndex !== null) {
              const frontStyleLinePos = new THREE.Vector3();
              frontStyleLinePos.x = dracoGeometry.vertices[vIndex * 3];
              frontStyleLinePos.y = dracoGeometry.vertices[vIndex * 3 + 1];
              frontStyleLinePos.z = dracoGeometry.vertices[vIndex * 3 + 2];
              frontStyleLineGeometry.vertices.push(frontStyleLinePos);

              const backStyleLinePos = new THREE.Vector3();
              vIndex += frontVertexCount;
              backStyleLinePos.x = dracoGeometry.vertices[vIndex * 3];
              backStyleLinePos.y = dracoGeometry.vertices[vIndex * 3 + 1];
              backStyleLinePos.z = dracoGeometry.vertices[vIndex * 3 + 2];
            }
          }

          frontStyleLineGeometry.computeFaceNormals();
          frontStyleLineGeometry.computeVertexNormals();
          const frontStyleLine = new THREE.Line(
            frontStyleLineGeometry,
            styleLineMaterial
          );
          currentStyleLineSet.add(frontStyleLine);

          backStyleLineGeometry.computeFaceNormals();
          backStyleLineGeometry.computeVertexNormals();
          const backStyleLine = new THREE.Line(
            backStyleLineGeometry,
            styleLineMaterial
          );
          currentStyleLineSet.add(backStyleLine);
        }

        this.styleLineMap.set(patternIdx, currentStyleLineSet);
      }
    };

    let frontVertexCount = 0;

    for (let i = 0; i < listMatShape.length; ++i) {
      // listMatShape.forEach(async (matShape) => { // NOTE: These codes working wrong if applied, but I don't know why.
      const matShape = listMatShape[i];
      const listMatMeshIDOnIndexedMesh = matShape.get(
        "listMatMeshIDOnIndexedMesh"
      );

      const mapShape = matShape.get("mapShape");
      if (!mapShape) {
        console.error("mapShape is null");
        return false;
      }

      const listIndexCount = mapShape.get("listIndexCount");
      if (!listIndexCount || listIndexCount.length == 0) {
        console.error("listIndexCount is null");
        return false;
      }

      // TODO: Refactor this module
      let totalIndexCount = 0;
      for (let m = 0; m < listIndexCount.length; ++m) {
        totalIndexCount += listIndexCount[m];
      }

      const dracoFilename =
        mapShape.get("qsDracoFileNameUTF8") || mapShape.get("qsDracoFileName");

      // console.log(readByteArray("String", dracoFilename));

      const dracoGeometry = await getDracoGeometry(dracoFilename);
      // console.log("dragoGeometry done");

      const bVisiable = matShape.get("bMatShapeVisible") || false;

      await splitMatSpaceToMatMesh(
        listMatMeshIDOnIndexedMesh,
        totalIndexCount,
        listIndexCount,
        dracoGeometry,
        bVisiable,
        this.drawMode
      );

      const listLine = matShape.get("listLine");
      const firstMatMeshID = listMatMeshIDOnIndexedMesh[0].get("uiMatMeshID");

      if (listLine) {
        buildStyleLines(dracoGeometry, firstMatMeshID, listLine);
      }
    }
  },

  getStyleLineMap() {
    return this.styleLineMap;
  },
};
