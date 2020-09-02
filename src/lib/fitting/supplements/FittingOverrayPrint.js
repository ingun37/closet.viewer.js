import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export function processOverrayPrint(listPrintTextureBarycentric, mapMatMesh) {
  if (!listPrintTextureBarycentric || !mapMatMesh) return;

  // TODO: Test only
  //   mapMatMesh.forEach((matMesh) => (matMesh.visible = false));

  const listPrintTexture = readData(listPrintTextureBarycentric);
  // console.log(listPrintTexture);

  // TEST: turn off all matmesh
  // mapMatMesh.forEach((m) => {
  //   if (m.userData.TYPE === 2) {
  //     console.log(m.userData.MATMESH_ID);
  //     m.visible = true;
  //   } else m.visible = false;
  // m.visible = false;
  // });

  listPrintTexture.forEach((obj) => {
    const matMeshID = obj.matMeshID;
    const matMesh = mapMatMesh.get(matMeshID);

    // if (matMesh) {
    //   console.log(matMesh);
    //   matMesh.visible = false;
    // }
    const textureMatMesh = mapMatMesh.get(obj.printTextureMatMeshID);
    console.log(textureMatMesh);
    // console.log(obj.printTextureMatMeshID);
    // if (textureMatMesh) {
    //   console.log(textureMatMesh);
    // textureMatMesh.visible = true;
    // } else {
    //   console.log("textureMatMesh missing: " + obj.printTextureMatMeshID);
    // }
    // // const baryPointList = obj.baryPointList;

    process(matMesh, textureMatMesh, obj.listABG, obj.listPtIndex);

    // console.log(textureMatMesh);
    // textureMatMesh.visible = true;
  });
}

function readData(listPrintTextureBarycentric) {
  const listPrintTexture = [];

  listPrintTextureBarycentric.forEach((element) => {
    // TODO: Ask to change the data type from byte to int
    const matMeshID = parseInt(
      readByteArray("String", element.get("patternMatMeshID"))
    );
    const printTextureMatMeshID = parseInt(
      readByteArray("String", element.get("printTextureMatMeshID"))
    );
    const listIndex = readByteArray("Uint", element.get("baIndices"));
    const loadedABG = readByteArray("Float", element.get("baAbgs"));
    const loadedPtIndex = readByteArray("Uint", element.get("baPtIndices"));

    const listABG = [];
    const listPtIndex = [];

    // Parse data
    for (let i = 0; i < listIndex.length; ++i) {
      const idx = i * 3;

      const ABG = new Object({
        a: loadedABG[idx],
        b: loadedABG[idx + 1],
        g: loadedABG[idx + 2],
      });
      listABG.push(ABG);

      listPtIndex.push([
        loadedPtIndex[idx],
        loadedPtIndex[idx + 1],
        loadedPtIndex[idx + 2],
      ]);
    }

    const obj = new Object();
    obj["matMeshID"] = matMeshID;
    obj["printTextureMatMeshID"] = printTextureMatMeshID;
    obj["listABG"] = listABG;
    obj["listIndex"] = listIndex;
    obj["listPtIndex"] = listPtIndex;

    listPrintTexture.push(obj);
  });

  return listPrintTexture;
}

function process(matMesh, textureMatMesh, listABG, listPtIndex) {
  if (!matMesh) return;

  const vertexCount = textureMatMesh.geometry.attributes.position.count;
  const texturePos = textureMatMesh.geometry.attributes.position.array;
  const textureNormal = textureMatMesh.geometry.attributes.normal.array;

  const meshPos = matMesh.geometry.attributes.position.array;
  const meshNormal = matMesh.geometry.attributes.normal.array;
  // const renderPos = new THREE.Vector3(vertexCount);
  // const texCoord = new THREE.Vector2(vertexCount);

  if (vertexCount !== listABG.length || vertexCount !== listPtIndex.length) {
    console.log("Warning: Invalid data");
    console.log({ pos: meshPos, listAGB: listABG, listPtIndex: listPtIndex });
    console.log(matMesh);
    return;
  } else {
    console.log("ok");
    console.log({ pos: meshPos, listAGB: listABG, listPtIndex: listPtIndex });
  }

  const getPos = (idx) => {
    if (idx * 3 > meshPos.length) console.log(idx);
    // console.log(meshPos[idx * 3]);
    // console.log(
    //   idx,
    //   meshPos.length,
    //   meshPos[idx * 3],
    //   meshPos[idx * 3 + 1],
    //   meshPos[idx * 3 + 2]
    // );

    return new THREE.Vector3(
      meshPos[idx * 3],
      meshPos[idx * 3 + 1],
      meshPos[idx * 3 + 2]
    );
  };

  const getNormal = (idx) => {
    return new THREE.Vector3(
      meshNormal[idx * 3],
      meshNormal[idx * 3 + 1],
      meshNormal[idx * 3 + 2]
    );
  };

  // console.log(vertexCount);
  // console.log(texturePos.length / 3);
  // // console.log(listPos);
  // // console.log(listABG.length);
  // // console.log(listPtIndex.length);
  // // console.log("===");

  const renderPos = [];

  // for (let i = 0; i < vertexCount; i += 100) {
  for (let i = 0; i < vertexCount; ++i) {
    const step1 = getPos(listPtIndex[i][0]).multiplyScalar(listABG[i].a);
    const step2 = getPos(listPtIndex[i][1]).multiplyScalar(listABG[i].b);
    const step3 = getPos(listPtIndex[i][2]).multiplyScalar(listABG[i].g);

    texturePos[i * 3] = step1.x + step2.x + step3.x;
    texturePos[i * 3 + 1] = step1.y + step2.y + step3.y;
    texturePos[i * 3 + 2] = step1.z + step2.z + step3.z;
  }

  // Needs update
  textureMatMesh.geometry.computeFaceNormals();
  textureMatMesh.geometry.computeVertexNormals();
  textureMatMesh.geometry.attributes.position.needsUpdate = true;
  textureMatMesh.geometry.attributes.normal.needsUpdate = true;

  // NOTE: Modules to avoid z-fighting. It works for now but could be a problem in the future.
  textureMatMesh.material.polygonOffset = true;
  textureMatMesh.material.polygonOffsetFactor = -1;
  textureMatMesh.material.needsUpdate = true;

  // console.log(textureMatMesh);
}
