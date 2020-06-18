import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import FitGarment from "./FittingGarment";
import { loadJson } from "@/lib/clo/readers/FileLoader";
import { getGarmentFileName } from "@/lib/clo/utils/UtilFunctions";

// import ZrestLoader from "@/lib/clo/readers/ZrestLoader";

export default class Fitting {
  constructor(scene, funcLoadZrest) {
    this.listSkinController = new Map();
    this.scene = scene;
    this.container = new THREE.Object3D();
    this.container.name = "fittingContainer";
    this.scene.add(this.container);
    this.mapTriangleIdx = new Map();
    this.listPositions = [];
    this.listAvatarMesh = [];
    this.listAvatarMeshIdx = [];
    this.bodySkinController = null;
    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];

    this.garments = new FitGarment();
    this.loadZcrp = this.garments.loadZcrp;

    this.avatarId = 0;
    this.avatarRace = 0;
  }

  init({ rootPath: rootPath, mapAvatarPath: mapAvatarPath }) {
    this.avtRootPath = rootPath;
    this.mapAvtPath = mapAvatarPath;
    // Load path list
    console.log(rootPath);

    // Load Avatar zrest
    mapAvatarPath.forEach((listAvatarPath) => {
      console.log(listAvatarPath);
      listAvatarPath.forEach((avatarPath) => {
        console.log(rootPath + "/" + avatarPath);
      });
    });
  }

  getAvatarURL({ id: avatarId, race: avatarRace }) {
    this.avatarId = avatarId;
    // this.avtRace = avatarRace;

    const listById = this.mapAvtPath.get(avatarId);
    const zrestFileName = listById[avatarRace];
    const avtURL = this.avtRootPath + "/" + zrestFileName;
    console.log(avtURL);
    return avtURL;
  }

  async getSamplingJson(styleId, version) {
    this.styleId = styleId;
    this.styleVersion = version;
    const jsonURL =
      this.avtRootPath +
      "/" +
      styleId +
      "/" +
      version +
      "/" +
      this.avatarId +
      "/sampling.json";
    console.log(jsonURL);

    const onLoad = (data) => {
      return data;
    };
    const jsonData = await loadJson(jsonURL, onLoad);
    console.log(jsonData);
    return jsonData;

    // const fileOffset = { Offset: 0 };
    // const dataView = new DataView(jsonData);
    // const loadedMap = readMap(dataView, fileOffset);
    // console.log(loadedMap);

    // https://files.clo-set.com/public/fitting/33dbf1ff4a5f4f599317915f9343d6ca/1/0/sampling.json
  }

  getGarmentURL(height, weight, samplingData, gradingIndex) {
    console.log("getGarment");
    console.log(samplingData);
    const garmentFilename = getGarmentFileName(height, weight, samplingData);
    console.log(garmentFilename);
    const garmentURL =
      this.avtRootPath +
      "/" +
      this.styleId +
      "/" +
      this.styleVersion +
      "/" +
      this.avatarId +
      "/G" +
      gradingIndex +
      "/" +
      garmentFilename;
    console.log(garmentURL);

    return garmentURL;
  }

  loadGeometry({ mapGeometry: mapGeometry }) {
    this.extractController(mapGeometry);
    return this.listSkinController;
  }

  loadGarment = async (zcrpURL, mapMatMesh) => {
    console.log("loadGarment");
    const listBarycentricCoord = await this.garments.loadZcrp(zcrpURL);
    if (!listBarycentricCoord) {
      console.warn("Build barycentric coordinate failed.");
      return;
    }

    listBarycentricCoord.forEach((garment) => {
      // const garment = listBarycentricCoord[0];
      console.log(garment);
      const listABG = readByteArray("Float", garment.get("baAbgs"));
      const listTriangleIndex = readByteArray(
        "Uint",
        garment.get("baTriangleIndices")
      );
      console.log(listTriangleIndex.length);
      const listMatMeshID = garment.get("listMatMeshID");
      console.log(listMatMeshID);

      if (!listMatMeshID) {
        console.warn("MatMeshID info missing");
        return;
      }

      // listMatMeshID.forEach(matMeshId => {
      const matMeshId = listMatMeshID[0];
      const matMesh = mapMatMesh.get(matMeshId);
      const material = matMesh.material;
      // console.log(count);
      // console.log("matMesh");
      // console.log(matMesh);
      const index = matMesh.userData.originalIndices;
      const uv = matMesh.userData.originalUv;
      const uv2 = matMesh.userData.originalUv2;
      // console.log(index);

      // const index = Array.from(matMesh.geometry.index.array);
      // index.forEach(i => totalIndex.push((i + lastCnt)));

      // const count = matMesh.geometry.attributes.position.count;
      // const uv = matMesh.geometry.attributes.uv;
      // const uv2 = matMesh.geometry.attributes.uv2;
      // lastCnt += count;

      // console.log(index);

      // console.log(totalIndex);
      // })

      // console.log(listABG);
      // console.log(listTriangleIndex);

      const calculatedCoord = this.computeBarycentric(
        listABG,
        listTriangleIndex
      );
      // console.log("calculatedCoord.length: " + calculatedCoord.length);

      // console.log(calculatedCoord);
      const bufferGeometry = new THREE.BufferGeometry();
      bufferGeometry.addAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(calculatedCoord), 3)
      );

      bufferGeometry.setIndex(
        new THREE.BufferAttribute(new Uint32Array(index), 1)
      );
      bufferGeometry.computeFaceNormals();
      bufferGeometry.computeVertexNormals();
      // bufferGeometry.computeBoundingBox();
      // console.log(uv);
      // console.log(uv2);
      // const new_uv = this.buildUVs(calculatedCoord, totalIndex);
      // const new_uv = this.assignUVs(bufferGeometry);
      // console.log(new_uv);
      // bufferGeometry.attributes.uv = uv;
      bufferGeometry.addAttribute(
        "uv",
        new THREE.Float32BufferAttribute(uv, 2)
      ).needsUpdate = true;
      bufferGeometry.addAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(uv2, 2)
      ).needsUpdate = true;

      // bufferGeometry.attributes.uv2 = uv2;

      const threeMesh = new THREE.Mesh(bufferGeometry, material);
      // console.log("threeMesh");
      // console.log(threeMesh);
      this.container.add(threeMesh);

      // this.buildMesh(bufferGeometry, material);
    });

    console.log("loadGarment Done");
  };

  clear() {}

  // TODO: Refactor this module
  extractController(mapInput) {
    const shouldRecursive = (element) => {
      return (
        element instanceof Map &&
        element.has("listChildrenTransformer3D") &&
        element.get("listChildrenTransformer3D") != null
      );
    };

    if (shouldRecursive(mapInput)) {
      this.extractController(mapInput.get("listChildrenTransformer3D"));
    } else {
      mapInput.forEach((inputElement) => {
        if (shouldRecursive(inputElement)) {
          return this.extractController(inputElement);
        }
        if (inputElement.has("listSkinController")) {
          console.log(inputElement);
          console.log(inputElement.get("listSkinController"));
          this.listSkinController = inputElement.get("listSkinController");
        }
      });
    }
  }

  buildMeshUsingMapMesh(mapMesh) {
    const bufferGeometry = new THREE.BufferGeometry();
    const arrayIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    const arrayPosition = readByteArray("Float", mapMesh.get("baPosition"));

    // console.log(mapMesh);
    // console.log(arrayPosition);
    // console.log(arrayIndex);

    bufferGeometry.addAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(arrayPosition), 3)
    );
    bufferGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(arrayIndex), 1)
    );
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();

    // const material = new THREE.PointsMaterial({ color: 0x880000 });
    // const threeMesh = new THREE.Points(bufferGeometry, material);
    const material = new THREE.MeshPhongMaterial();
    material.color = THREE.Vector3(1, 1, 1);
    const threeMesh = new THREE.Mesh(bufferGeometry, material);

    this.container.add(threeMesh);

    // console.log(threeMesh);
  }

  parseSkinControllerUsingABG(skinController) {
    const readData = (type, field) => {
      return this.readBA({
        sc: skinController,
        type: type,
        field: field,
      });
    };

    const demarcationLine = skinController.get("fDemarcationLine");
    const ABGList = readData("Float", "baABGList");
    const triangleIndexList = readData("Uint", "baTriangleIndexList");
    console.log("demarcationLine: " + demarcationLine);

    const mapMesh = skinController.get("mapMesh");
    const meshIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    // const meshPosition = readByteArray("Float", mapMesh.get("baPosition"));
    const vertexCount = mapMesh.get("uiVertexCount");

    if (ABGList.length <= 0) {
      return;
    }
    console.log(skinController);

    const calculatedPosition = this.computeBarycentric(
      ABGList,
      triangleIndexList
    );
    // console.log(triangleIndexList);
    // console.log("vertexCount: " + vertexCount);
    // const max = Math.max(...triangleIndexList);
    // const min = Math.min(...triangleIndexList);
    // console.log(max, min);
    // console.log(triangleIndexList.length);

    // for (let i = min; i < max; ++i) {
    // for (let i = 0; i < 18; ++i) {

    console.log("calculatedPosition");
    console.log(calculatedPosition);

    // Build Mesh
    const bufferGeometry = new THREE.BufferGeometry();
    // bufferGeometry.addAttribute(
    //   "position",
    //   new THREE.Float32BufferAttribute(new Float32Array(this.bodyVertexPos), 3)
    // );
    // bufferGeometry.setIndex(
    //   new THREE.BufferAttribute(new Uint32Array(this.bodyVertexIndex), 1)
    // );

    bufferGeometry.addAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(calculatedPosition), 3)
    );
    // bufferGeometry.addAttribute(
    //   "position",
    //   new THREE.Float32BufferAttribute(new Float32Array(meshPosition), 3)
    // );
    // console.log(meshIndex);

    bufferGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(meshIndex), 1)
    );
    // bufferGeometry.setIndex(
    //   new THREE.BufferAttribute(new Uint32Array(calculatedIndex), 1)
    // );

    bufferGeometry.computeVertexNormals();
    bufferGeometry.computeFaceNormals();

    this.buildMesh(bufferGeometry);
  }

  computeBarycentric(listAGB, listTriangleIndex, demarcationLine) {
    const calculatedPosition = [];
    for (let i = 0; i < listTriangleIndex.length; ++i) {
      const triIndex = listTriangleIndex[i];

      const abg = new THREE.Vector3();
      abg.x = listAGB[i * 3];
      abg.y = listAGB[i * 3 + 1];
      abg.z = listAGB[i * 3 + 2];

      // FIX ME: Check this out
      if (1) {
        // if (abg.z <= demarcationLine) {

        const v0 = this.get3VerticeFromBody(triIndex * 3);
        const v1 = this.get3VerticeFromBody(triIndex * 3 + 1);
        const v2 = this.get3VerticeFromBody(triIndex * 3 + 2);

        const n = this.triangleCross(v0, v1, v2);
        n.normalize();

        const p0 = new THREE.Vector3(v0.x, v0.y, v0.z);
        const A = new THREE.Vector3().subVectors(v1, v0);
        const B = new THREE.Vector3().subVectors(v2, v0);

        const alphaXA = new THREE.Vector3(
          abg.x * A.x,
          abg.x * A.y,
          abg.x * A.z
        );
        const betaXB = new THREE.Vector3(abg.y * B.x, abg.y * B.y, abg.y * B.z);
        const normalXG = new THREE.Vector3(
          abg.z * n.x,
          abg.z * n.y,
          abg.z * n.z
        );

        let position = new THREE.Vector3(0, 0, 0)
          .add(p0)
          .add(alphaXA)
          .add(betaXB)
          .add(normalXG);

        calculatedPosition.push(position.x, position.y, position.z);
      } else {
        console.warn("ELSE");
      }
    }

    return calculatedPosition;
  }

  buildMesh(bufferGeometry, material = null) {
    const defaultMaterial = new THREE.MeshPhongMaterial({
      // side: THREE.DoubleSide,
    });
    defaultMaterial.color = THREE.Vector3(1, 1, 1);

    // const defaultMaterial = new THREE.PointsMaterial({
    //   color: 0x880000,
    // });
    // const threeMesh = new THREE.Points(bufferGeometry, threeMaterial);
    const threeMaterial = material ? material : defaultMaterial;
    console.log(threeMaterial);
    const threeMesh = new THREE.Mesh(bufferGeometry, threeMaterial);
    console.log(threeMesh);
    this.container.add(threeMesh);
  }

  readBA({ sc: skinController, type: type, field: field }) {
    return skinController.has(field)
      ? readByteArray(type, skinController.get(field))
      : [];
  }

  /*
  extractAvatarMeshes(mapMatMesh) {
    let cnt = 0;
    mapMatMesh.forEach((matMesh) => {
      if (matMesh.userData.TYPE === 5) {
        // AVATAR_MATMESH:
        // console.log(matMesh);
        console.log(matMesh.geometry.attributes.position.count);
        cnt += matMesh.geometry.attributes.position.count;
        this.listAvatarMesh.push(matMesh);
        this.listAvatarMeshIdx.push(cnt);
      }
    });
    console.log("total: " + cnt);
  }
  */

  test(listSkinController) {
    const bodySkinController = this.findBodySkinController(listSkinController);
    console.log("bodySkin is");
    console.log(bodySkinController);
    this.bodySkinController = bodySkinController;

    const mapMesh = bodySkinController.get("mapMesh");
    const meshIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    const meshPosition = readByteArray("Float", mapMesh.get("baPosition"));
    this.bodyVertexIndex = meshIndex;
    this.bodyVertexPos = meshPosition;
    console.log(this.bodyVertexIndex);
    // console.log(readByteArray("Int", mapMesh.get("baIndex")));
    console.log(this.bodyVertexPos);
    // console.log(readByteArray("Double", mapMesh.get("baPosition")));

    // this.buildMeshUsingMapMesh(mapMesh);

    for (let i = 0; i < listSkinController.length; ++i) {
      const sc = listSkinController[i];

      if (sc !== bodySkinController) {
        // console.log(i);
        this.parseSkinControllerUsingABG(sc);
        // break;
      }
    }

    // this.parseSkinControllerUsingABG(listSkinController[2]);

    // listSkinController.forEach((sc) => {
    //   if (sc !== bodySkinController) {
    //     this.parseSkinControllerUsingABG(sc);
    //     // this.buildMeshUsingInitPos(sc.get("mapMesh"));
    //   }
    // });
  }

  findBodySkinController(listSkinController) {
    let largestSC = null;
    let largestLength = 0;
    listSkinController.forEach((sc) => {
      if (sc.has("baInitPosition")) {
        const length = sc.get("baInitPosition").byteLength;
        if (largestLength < length) {
          largestLength = length;
          largestSC = sc;
        }
      }
    });

    return largestSC;
  }

  triangleCross(v0, v1, v2) {
    const compare = (v0, v1) => {
      return v0.x == v1.x || v0.y == v1.y || v0.z == v1.z;
    };

    // if (compare(v0, v1) || compare(v0, v2) || compare(v1, v2)) {
    //   console.warn("error on triangleCross");
    // }
    /*
      x = (v1.y-v0.y) * (v2.z-v0.z) - (v1.z-v0.z) * (v2.y-v0.y);
      y = (v1.z-v0.z) * (v2.x-v0.x) - (v1.x-v0.x) * (v2.z-v0.z);
      z = (v1.x-v0.x) * (v2.y-v0.y) - (v1.y-v0.y) * (v2.x-v0.x);
    */
    const x = (v1.y - v0.y) * (v2.z - v0.z) - (v1.z - v0.z) * (v2.y - v0.y);
    const y = (v1.z - v0.z) * (v2.x - v0.x) - (v1.x - v0.x) * (v2.z - v0.z);
    const z = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);

    // console.log("---");
    // console.log(v0, v1, v2);
    // console.log(x, y, z);

    return new THREE.Vector3(x, y, z);
  }

  /*
  computeNormal(triangleCount) {
    const listTriNormal = new Array(triangleCount);

    for (let i = 0; i < triangleCount; ++i) {
      const i0 = this.bodyVertexIndex[i * 3];
      const i1 = this.bodyVertexIndex[i * 3 + 1];
      const i2 = this.bodyVertexIndex[i * 3 + 2];

      // collapsed 된거는 스킵. vertexnormal은 업데이트안해야 한다. 업데이트하면 이상한 노말값이 vertexnormal에 더해져서 vertexnormal이 이상해진다.
      if (i0 == i1 || i1 == i2 || i0 == i2) {
        listTriNormal[i] = new THREE.Vector3(0, 0, 1); // 쓰레기값 들어가서 다른 코드에서 문제 될 수 있는것 방지하기 위해
        continue;
      }

      const normal = this.triangleCross(
        this.get3VerticeFromBody(i0),
        this.get3VerticeFromBody(i1),
        this.get3VerticeFromBody(i2)
      );
      // console.log(normal);
      normal.normalize();
      // console.log(normal);
      listTriNormal[i] = normal;
      // triNormal.triangleCross(m_Position[i0] , m_Position[i1], m_Position[i2]);
      // triNormal.normalize();
      // m_TriNormal[i] = triNormal;
    }

    console.log(listTriNormal);
    return listTriNormal;
  }
  */

  /*
  updateRenderPositionFromPhysical(calculatedPos, v3PhyPos, v3PhyNormal) {
    const pos = calculatedPos;
    // vec3* pos = GetPosition();
    // vec3* normal = GetNormal();
    // mat4 wtol = GetWorldToLocalMatrix();
    // #pragma omp parallel for
    // for(int i=0;i<(int)GetVertexCount();i++)
    // {
    // 	pos[i] = wtol * phyPos[m_RenderToSkinPos[i]];
    // 	if (phyNormal)
    // 	{
    // 		vec3 tmpV; // omp 바깥으로 빼서 공유하게 되면 결과값 이상해 진다
    // 		normal[i] = mult_dir(tmpV, wtol, phyNormal[m_RenderToSkinPos[i]]);
    // 		normal[i].normalize();
    // 	}
    // }
    // Shape_sptr this_sptr = GetSharedPointerThis();
    // if(phyNormal)
    // 	VertexBufferUtility::MakeDirtyNormal(this_sptr);
    // VertexBufferUtility::MakeDirtyPosition(this_sptr);
  }
  */

  get3VerticeFromBody = (triangleIndex) => {
    // const triIdxOnVertexIdx = triangleIndex * 3;
    const triIdxOnVertexIdx = triangleIndex;
    if (
      triIdxOnVertexIdx < 0 ||
      triIdxOnVertexIdx >= this.bodyVertexIndex.length
    ) {
      console.warn("Wrong meshIdx");
    }

    // 3 vertice for 1 triangle
    const vertexIdx = this.bodyVertexIndex[triIdxOnVertexIdx];

    const v = new THREE.Vector3(
      this.bodyVertexPos[vertexIdx * 3],
      this.bodyVertexPos[vertexIdx * 3 + 1],
      this.bodyVertexPos[vertexIdx * 3 + 2]
    );

    return v;
  };
}

/*
    const get3Vertice = (triangleIndex, idx, pos) => {
      const triIdxOnVertexIdx = triangleIndex * 3;
      if (
        triIdxOnVertexIdx < 0 ||
        triIdxOnVertexIdx > this.bodyVertexIndex.length
      ) {
        console.warn("Wrong meshIdx");
      }
      // console.log(triIdxOnVertexIdx);

      // 3 vertice for 1 triangle
      const vertexIdx = idx[triIdxOnVertexIdx];
      // console.log(vertexIdx);
      const v = new THREE.Vector3(
        pos[vertexIdx * 3],
        pos[vertexIdx * 3 + 1],
        pos[vertexIdx * 3 + 2]
      );

      // console.log(v);

      return v;
    };
    */
