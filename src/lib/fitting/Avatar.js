import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export default class Avatar {
  constructor(scene, zProperty) {
    this.listSkinController = new Map();
    this.scene = scene;
    this.container = new THREE.Object3D();
    this.container.name = "avatarContainer";
    this.scene.add(this.container);
    this.mapTriangleIdx = new Map();
    this.listPositions = [];
    this.listAvatarMesh = [];
    this.listAvatarMeshIdx = [];
    this.bodySkinController = null;
    this.bodyVertexIndex = [];
    this.bodyVertexPos = [];
  }

  load({ mapGeometry: mapGeometry }) {
    this.extractController(mapGeometry);
    return this.listSkinController;
  }

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

  buildMeshUsingInitPos(mapMesh) {
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

    const get3VerticeFromBody = (triangleIndex) => {
      const triIdxOnVertexIdx = triangleIndex * 3;
      if (
        triIdxOnVertexIdx < 0 ||
        triIdxOnVertexIdx > this.bodyVertexIndex.length
      ) {
        console.warn("Wrong meshIdx");
      }

      // 3 vertice for 1 triangle
      const vertexIdx = this.bodyVertexIndex[triIdxOnVertexIdx];
      // const v2Idx = this.bodyVertexIndex[vertexIdx + 1];
      // const v3Idx = this.bodyVertexIndex[vertexIdx + 2];

      // console.log(v1Idx % 3);

      const v = new THREE.Vector3(
        this.bodyVertexPos[vertexIdx * 3],
        this.bodyVertexPos[vertexIdx * 3 + 1],
        this.bodyVertexPos[vertexIdx * 3 + 2]
      );

      return v;

      // const xIdx = this.bodyMeshIndex[triangleIndex * 3];
      // const yIdx = this.bodyMeshIndex[triangleIndex * 3 + 1];
      // const zIdx = this.bodyMeshIndex[triangleIndex * 3 + 2];
      const pIdx = this.bodyVertexIndex[triIdxOnVertexIdx];
      // console.log(pIdx % 3);

      // if (pIdx > this.bodyMeshPos.length || pIdx < 0) {
      //   console.warn("Something happened.");
      // }

      // const x = this.bodyMeshPos[xIdx];
      // const y = this.bodyMeshPos[yIdx];
      // const z = this.bodyMeshPos[zIdx];

      const x = this.bodyVertexPos[pIdx];
      const y = this.bodyVertexPos[pIdx + 1];
      const z = this.bodyVertexPos[pIdx + 2];

      if (!x || !y || !z) {
        console.warn("NaN?");
      }

      const r = new THREE.Vector3(x, y, z);
      // console.log(r);
      return r;
    };

    const initPositions = readData("Float", "baInitPosition");
    // const localPositions = readData("Float", "baLocalPosition");
    const ABGList = readData("Float", "baABGList");
    const demarcationLine = skinController.get("fDemarcationLine");
    const triangleIndexList = readData("Uint", "baTriangleIndexList");

    // console.log(meshIndex);
    // console.log(meshPosition);

    if (ABGList.length <= 0) {
      // this.buildMeshUsingInitPos(mapMesh);
      return;
    }
    console.log(skinController);
    // console.log("ABGList: " + ABGList.length);

    const calculatedPosition = [];
    const calculatedIndex = [];

    // console.log(this.bodyMeshPos);
    // console.log(this.bodyMeshIndex);
    // console.log(triangleIndexList);

    const vertexCount = initPositions.length / 3;
    console.log("=======");
    console.log(
      vertexCount,
      this.bodyVertexIndex.length,
      this.bodyVertexPos.length
    );
    console.log("=======");
    for (let i = 0; i < vertexCount; ++i) {
      const triIndex = triangleIndexList[i];
      const abg = new THREE.Vector3();
      abg.x = ABGList[i * 3];
      abg.y = ABGList[i * 3 + 1];
      abg.z = ABGList[i * 3 + 2];

      //this.getVec3ByTriangleIdx(triIndex);

      if (abg.z <= demarcationLine) {
        const v0 = get3VerticeFromBody(triIndex);
        const v1 = get3VerticeFromBody(triIndex + 1);
        const v2 = get3VerticeFromBody(triIndex + 2);

        let n = this.triangleCross(v0, v1, v2);
        n.normalize();

        const p0 = v0;
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

        let position = new THREE.Vector3()
          .addVectors(p0, alphaXA)
          .add(betaXB)
          .add(normalXG);

        // console.log("-");
        // console.log(p0);
        // console.log(alphaXA);
        // console.log(betaXB);
        // console.log(normalXG);
        // console.log(position);

        calculatedPosition.push(position.x, position.y, position.z);
        // calculatedIndex.push(i * 3, i * 3 + 1, i * 3 + 2);

        // calculatedPosition.push(v0.x, v0.y, v0.z);
        // calculatedPosition.push(v1.x, v1.y, v1.z);
        // calculatedPosition.push(v2.x, v2.y, v2.z);
      } else {
        console.warn("ELSE");
      }
    }

    console.log("calculatedPosition");
    console.log(calculatedPosition);

    // Build Mesh
    const bufferGeometry = new THREE.BufferGeometry();
    // bufferGeometry.addAttribute(
    //   "position",
    //   new THREE.Float32BufferAttribute(new Float32Array(this.bodyMeshPos), 3)
    // );
    // bufferGeometry.setIndex(
    //   new THREE.BufferAttribute(new Uint32Array(this.bodyVertexIndex), 1)
    // );

    bufferGeometry.addAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(calculatedPosition), 3)
    );
    // bufferGeometry.setIndex(
    //   new THREE.BufferAttribute(new Uint32Array(calculatedIndex), 1)
    // );
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();

    this.buildMesh(bufferGeometry);
  }

  parseSkinController(skinController) {
    const bUseMap = skinController.get("bUseMap");
    if (bUseMap) return;

    console.log(skinController);
    const readData = (type, field) => {
      return this.readBA({
        sc: skinController,
        type: type,
        field: field,
      });
    };

    const initPositions = readData("Float", "baInitPosition");
    const ItoL = readData("Float", "baItoL");
    const ItoW = readData("Float", "baItoW");
    console.log(initPositions);
    console.log(ItoL);
    console.log(ItoW);

    const rootJointIndexList = skinController.get("arrRootJointIndexList");
    console.log(rootJointIndexList);

    /*
			for(size_t i=0;i< pRootJointList.size();i++)
			{
				pRootJointList[i]->ComputeLtoWAscentOrder();	
				pRootJointList[i]->ComputeLtoW();				
			}

			if (!m_ItoW)
			{
				m_ItoW = new mat4[m_JointCount];
			}

			const auto& jointList = GetJointList();
			for (unsigned int i = 0; i < (int)jointList.size(); i++)
			{
				m_ItoW[i] = jointList[i]->m_LtoW * m_ItoL[i];
			}
			
			memset(m_Position,0,sizeof(vec3) * m_VertexCount);

			#pragma omp parallel for
			for(int i=0;(int)i<(int)m_VertexCount;i++)
			{
				for (int j = 0; j<(int)m_JointWeight[i].m_InfluenceCount; j++)
				{
					//m_Position[i].mult_plus(m_JointWeight[i].m_Weight[j] , m_pJoint[m_JointWeight[i].m_JointIndex[j]]->m_LtoW, m_ItoL[m_JointWeight[i].m_JointIndex[j]], m_InitPosition[i]);
					m_Position[i].mult_plus(m_JointWeight[i].m_Weight[j], m_ItoW[m_JointWeight[i].m_JointIndex[j]], m_InitPosition[i]);
				}
      }
    */

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.addAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(initPositions), 3)
      // new THREE.BufferAttribute(new Float32Array(initPositions), 3)
    );
    // bufferGeometry.setIndex(
    //   new THREE.BufferAttribute(new Uint32Array(triangleIndexList), 1)
    // );
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();

    this.buildMesh(bufferGeometry);
  }

  buildMesh(bufferGeometry) {
    // const material = new THREE.MeshPhongMaterial();
    // material.color = THREE.Vector3(1, 1, 1);
    // const threeMesh = new THREE.Mesh(bufferGeometry, material);

    const material = new THREE.PointsMaterial({
      color: 0x880000,
    });
    const threeMesh = new THREE.Points(bufferGeometry, material);

    this.container.add(threeMesh);
  }

  readBA({ sc: skinController, type: type, field: field }) {
    return skinController.has(field)
      ? readByteArray(type, skinController.get(field))
      : [];
  }

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

  // getVec3ByTriangleIdx(triangleIdx) {
  //   // const targetMeshIdx = triangleIdx * 3;
  //   const avatarMeshIdxKey = this.listAvatarMeshIdx.find(
  //     (cnt) => cnt >= triangleIdx
  //   );
  //   const avatarMeshIdx = this.listAvatarMeshIdx.indexOf(avatarMeshIdxKey);
  //   const idx = (avatarMeshIdxKey - triangleIdx) * 3;
  //   const arrPos = this.listAvatarMesh[avatarMeshIdx].geometry.attributes
  //     .position.array;
  //   return new THREE.Vector3(arrPos[idx], arrPos[idx + 1], arrPos[idx + 2]);
  // }

  // putVec3ToTriangleIdx(triangleIdx, x, y, z) {
  //   // const targetMeshIdx = triangleIdx * 3;
  //   const avatarMeshIdxKey = this.listAvatarMeshIdx.find(
  //     (cnt) => cnt >= triangleIdx
  //   );
  //   const avatarMeshIdx = this.listAvatarMeshIdx.indexOf(avatarMeshIdxKey);
  //   const idx = (avatarMeshIdxKey - triangleIdx) * 3;
  //   const arrPos = this.listAvatarMesh[avatarMeshIdx].geometry.attributes
  //     .position.array;
  //   arrPos[idx] = x;
  //   arrPos[idx + 1] = y;
  //   arrPos[idx + 2] = z;
  // }

  test(listSkinController) {
    // this.parseSkinController(listSkinController[0]);

    const bodySkinController = this.findBodySkinController(listSkinController);
    console.log("bodySkin is");
    console.log(bodySkinController);
    this.bodySkinController = bodySkinController;
    // const triList = readByteArray(
    //   "Float",
    //   bodySkinController.get("baTriangleIndexList")
    // );
    // console.log(triList);
    // this.buildMeshUsingInitPos(bodySkinController.get("mapMesh"));

    const mapMesh = bodySkinController.get("mapMesh");
    const meshIndex = readByteArray("Uint", mapMesh.get("baIndex"));
    const meshPosition = readByteArray("Float", mapMesh.get("baPosition"));

    this.bodyVertexIndex = meshIndex;
    this.bodyVertexPos = meshPosition;

    listSkinController.forEach((sc) => {
      if (sc !== bodySkinController) {
        this.parseSkinControllerUsingABG(sc);
        // this.buildMeshUsingInitPos(sc.get("mapMesh"));
      }
    });

    // listSkinController.forEach((sc) => {
    //   // this.parseSkinController(sc);
    //   this.parseSkinControllerUsingABG(sc);
    //   // const mapMesh = sc.get("mapMesh");
    //   // this.buildMeshUsingInitPos(mapMesh);
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
    const x = (v1.y - v0.y) * (v2.z - v0.z) - (v1.z - v0.z) * (v2.y - v0.y);
    const y = (v1.z - v0.z) * (v2.x - v0.x) - (v1.x - v0.x) * (v2.z - v0.z);
    const z = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);

    return new THREE.Vector3(x, y, z);
  }

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
}
