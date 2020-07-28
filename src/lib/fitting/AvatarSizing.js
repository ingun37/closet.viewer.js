import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import {
  MEASUREMENT_LIST_NAME,
  AVATAR_GENDER,
} from "@/lib/fitting/FittingConst";

// baseMeshMap은 MVMap
// convertinMatData 는 float array
// heightWeightTo5SizesMap MVMap
// zrestSkinControllerArray 아바타 zrest의 1) skincontroller name(or matshape name), 2) 해당 메쉬의 vertexCount 3) three.js vertex3d 의 pointer 세개를 가지고 있는 triple의 array
export default class ResizableBody {
  constructor(
    gender,
    baseMeshMap,
    convertingMatData,
    heightWeightTo5SizesMap,
    // zrestSkinControllerArray,
    scManager
  ) {
    console.warn(baseMeshMap);

    this.mCurrentGender = gender;
    this.mConvertingMatData = convertingMatData;
    this.mHeightWeightTo5SizesMap = heightWeightTo5SizesMap;
    // this.mZrestSkinControllerArray = zrestSkinControllerArray;
    this.scManager = scManager;

    this.mVertexSize = baseMeshMap.get("uiVertexCount");
    this.mSymmetryIndex = readByteArray(
      "Uint",
      baseMeshMap.get("baSymmetryIndex")
    );

    this.mFeatureEnable = this.setFeatureEnable();
    this.mBaseVertex = this.buildBaseVertex(baseMeshMap);
    this.mapMatshapeRenderToSkinPos = this.buildMapMatshapeRenderToSkinPos(
      baseMeshMap
    );
    this.mapStartIndex = baseMeshMap.get("mapStartIndex");

    // this.mapStartIndex = new Map([
    //   ["body", 0],
    //   ["eye_L", 35739],
    //   ["eye_R", 18843],
    //   ["eyelash_L", 19165],
    //   ["eyelash_R", 21643],
    // ]);

    console.log(this.mBaseVertex);
    console.log(this.mapStartIndex);
    console.log(this.mapMatshapeRenderToSkinPos);
  }

  setFeatureEnable = () => {
    const featureEnable = new Array(
      MEASUREMENT_LIST_NAME.SIZE_OF_MEASUREMENT_LIST
    ).fill(false);

    // 다음을 default로. 따로 파일 읽을 필요 없음
    featureEnable[MEASUREMENT_LIST_NAME.HEIGHT_Total] = true;
    featureEnable[MEASUREMENT_LIST_NAME.CIRCUMFERENCE_Bust] = true;
    featureEnable[MEASUREMENT_LIST_NAME.CIRCUMFERENCE_Waist] = true;
    featureEnable[MEASUREMENT_LIST_NAME.CIRCUMFERENCE_LowHip] = true;
    featureEnable[MEASUREMENT_LIST_NAME.LENGTH_Arm] = true;
    featureEnable[MEASUREMENT_LIST_NAME.HEIGHT_Crotch] = true;

    return featureEnable;
  };

  buildBaseVertex = (baseMeshMap) => {
    const baPosition = readByteArray("Float", baseMeshMap.get("baPosition"));
    const baseVertex = new Array(this.mVertexSize);

    for (let i = 0; i < this.mVertexSize; i++) {
      baseVertex[i] = new THREE.Vector3(
        baPosition[i * 3],
        baPosition[i * 3 + 1],
        baPosition[i * 3 + 2]
      );
    }

    return baseVertex;
  };

  buildMapMatshapeRenderToSkinPos = (baseMeshMap) => {
    const listMatshapeRenderToSkinPos = baseMeshMap.get(
      "listMatshapeRenderToSkinPos"
    );
    const mapMatshapeRenderToSkinPos = new Map();
    // this.mapMatshapeRenderToSkinPos = new Map();

    listMatshapeRenderToSkinPos.forEach((entry) => {
      const renderToSkinPos = readByteArray(
        "Int",
        entry.get("baRenderToSkinPos")
      );
      const strName = readByteArray("String", entry.get("strNameUTF8"));
      const uiVertexCount = entry.get("uiVertexCount");

      mapMatshapeRenderToSkinPos.set(
        strName,
        new Map([
          ["renderToSkinPos", renderToSkinPos],
          ["uiVertexCount", uiVertexCount],
        ])
      );
    });

    return mapMatshapeRenderToSkinPos;
  };

  computeResizing = (
    height,
    weight,
    bodyShape,
    chest,
    waist,
    hip,
    armLength,
    legLength
  ) => {
    const featureValues = new Array(
      MEASUREMENT_LIST_NAME.SIZE_OF_MEASUREMENT_LIST
    );

    var tableSize = this.getTableSize(height, weight);
    var changedSize = this.applyBodyShape(
      bodyShape,
      tableSize.chest,
      tableSize.waist,
      tableSize.hip
    );
    tableSize.chest = changedSize.chest;
    tableSize.waist = changedSize.waist;
    tableSize.hip = changedSize.hip;

    if (chest < 0) chest = tableSize.chest;
    if (waist < 0) waist = tableSize.waist;
    if (hip < 0) hip = tableSize.hip;
    if (armLength < 0) armLength = tableSize.armLength;
    if (legLength < 0) legLength = tableSize.legLen;

    featureValues[MEASUREMENT_LIST_NAME.HEIGHT_Total] = height;
    //featureValues[MEASUREMENT_LIST_NAME.WEIGHT_Total] = weight; // 의미 없다. 안쓰이기 때문에
    featureValues[MEASUREMENT_LIST_NAME.CIRCUMFERENCE_Bust] = Math.pow(
      Math.min(Math.max(65, chest), 150),
      0.5
    );
    featureValues[MEASUREMENT_LIST_NAME.CIRCUMFERENCE_Waist] = Math.pow(
      Math.min(Math.max(50, waist), 140),
      0.5
    );
    featureValues[MEASUREMENT_LIST_NAME.CIRCUMFERENCE_LowHip] = Math.pow(
      Math.min(Math.max(80, hip), 140),
      0.5
    );
    featureValues[MEASUREMENT_LIST_NAME.LENGTH_Arm] = Math.min(
      Math.max(40, armLength),
      80
    );
    featureValues[MEASUREMENT_LIST_NAME.HEIGHT_Crotch] = Math.min(
      Math.max(60, legLength),
      100
    );

    return this.computeResizingWithFeatureValues(featureValues);
  };

  computeResizingWithFeatureValues = (featureValues) => {
    const returnVertex = new Array(this.mBaseVertex.length);
    for (let i = 0; i < this.mBaseVertex.length; i++)
      returnVertex[i] = new THREE.Vector3();

    for (let i = 0; i < this.mBaseVertex.length; i++) {
      returnVertex[i].copy(this.mBaseVertex[i]);

      for (let j = 0; j < 3; j++) {
        let index = i * 3 + j;
        let featureIdx = 0;

        for (
          let k = 0;
          k < MEASUREMENT_LIST_NAME.SIZE_OF_MEASUREMENT_LIST;
          k++
        ) {
          if (this.mFeatureEnable[k]) {
            if (j == 0)
              returnVertex[i].x +=
                this.mConvertingMatData[featureIdx][index] * featureValues[k];
            else if (j == 1)
              returnVertex[i].y +=
                this.mConvertingMatData[featureIdx][index] * featureValues[k];
            else
              returnVertex[i].z +=
                this.mConvertingMatData[featureIdx][index] * featureValues[k];

            featureIdx++;
          }
        }

        if (j == 0)
          returnVertex[i].x += this.mConvertingMatData[featureIdx][index];
        else if (j == 1)
          returnVertex[i].y += this.mConvertingMatData[featureIdx][index];
        else if (j == 2)
          returnVertex[i].z += this.mConvertingMatData[featureIdx][index];
      }
    }

    this.dataSymmetrization(returnVertex);
    this.dataNormalization(returnVertex);

    console.log("after computeResizingWithFeatureValues: ");
    console.log(returnVertex);

    // const bodyStartIndex = this.mStartIndexMap.get("body");
    // console.log("bodyStartIndex: " + bodyStartIndex);
    // console.log(this.mStartIndexMap);

    return returnVertex;

    // returnVertex 순서를 실제 avt/zrest vertex order 로 변경해서 avatar의 해당 vertex에 position 값 업데이트하기
    // for (let i = 0; i < this.mZrestSkinControllerArray.length; ++i) {
    //   const matShapeName = this.mZrestSkinControllerArray[i][0];
    //   const vCount = this.mZrestSkinControllerArray[i][1];
    //   var position = this.mZrestSkinControllerArray[i][2];

    //   const startIndex = this.mStartIndexMap.get(matShapeName);

    //   for (let j = 0; j < vCount; j++)
    //     position[j].copy(returnVertex[startIndex + j]);
    // }
  };

  applyBodyShape = (_bodyShape, _chest, _waist, _hip) => {
    if (this.mCurrentGender == AVATAR_GENDER.GENDER_FEMALE) {
      switch (_bodyShape) {
        case 0: // default
          break;
        case 1: // hourglass
          _chest += 3;
          _waist += -2;
          _hip += 3;
          break;
        case 2: //inverted triangle
          _chest += 5;
          _waist += -2;
          _hip += -5;
          break;
        case 3: //round(apple)
          _chest += -2;
          _waist += 5;
          _hip += -2;
          break;
        case 4: // triangle(pear)
          _chest += -5;
          _waist += 0;
          _hip += 5;
          break;
        default:
          break;
      }
    } else if (this.mCurrentGender == AVATAR_GENDER.GENDER_MALE) {
      switch (_bodyShape) {
        case 0: // default
          break;
        case 1: // rhomboid
          _chest += 3;
          _waist += 0;
          _hip += -3;
          break;
        case 2: // inverted triangle
          _chest += 7;
          _waist += -1;
          _hip += -4;
          break;
        case 3: // oval
          _chest += -2;
          _waist += 7;
          _hip += -2;
          break;
        case 4: // triangle(pear)
          _chest += -4;
          _waist += 0;
          _hip += 5;
          break;
        default:
          break;
      }
    }

    var returnValue = {};
    returnValue.chest = _chest;
    returnValue.waist = _waist;
    returnValue.hip = _hip;

    return returnValue;
  };

  getTableSize = (height, weight) => {
    console.log(this.mHeightWeightTo5SizesMap);
    console.log(height, weight);
    const arrSize = this.mHeightWeightTo5SizesMap
      .get(String(height))
      .get(String(weight));

    // TODO: Check if this order is correct
    const returnValue = {};
    returnValue["chest"] = arrSize[0];
    returnValue["waist"] = arrSize[1];
    returnValue["hip"] = arrSize[2];
    returnValue["armLength"] = arrSize[3];
    returnValue["legLength"] = arrSize[4];

    return returnValue;
  };

  dataSymmetrization = (returnVertex) => {
    // console.warn(returnVertex);
    // console.warn(this.mSymmetryIndex);
    // const bodyLength = 35739;
    const bodyLength = returnVertex.length;
    let newTempP;
    let newVertex = new Array(returnVertex.length);

    // for (let i = 0; i < returnVertex.length; i++) {
    for (let i = 0; i < bodyLength; i++) {
      newVertex[i] = returnVertex[i].clone();
    }

    for (let i = 0; i < bodyLength; i++) {
      // for (let i = 0; i < returnVertex.length; i++) {
      if (i == this.mSymmetryIndex[i]) {
        newVertex[i].x = 0.0;
      } else {
        const symmetry = returnVertex[this.mSymmetryIndex[i]];
        if (symmetry) {
          newTempP = returnVertex[this.mSymmetryIndex[i]].clone();
          newTempP.x *= -1.0;
          newVertex[i].add(newTempP);
          newVertex[i].divideScalar(2.0);
        } else {
          console.warn("symmetry index missing: " + i);
        }
      }
    }

    // for (let i = 0; i < returnVertex.length; i++)
    for (let i = 0; i < bodyLength; i++) returnVertex[i].copy(newVertex[i]);
  };

  dataNormalization = (returnVertex) => {
    const meanPosition = new THREE.Vector3(0, 0, 0);
    let yMin = 100000.0;

    for (let i = 0; i < returnVertex.length; i++) {
      meanPosition.add(returnVertex[i]);

      if (returnVertex[i].y < yMin) {
        yMin = returnVertex[i].y;
      }
    }

    meanPosition.divideScalar(returnVertex.length);
    meanPosition.y = yMin;

    for (let i = 0; i < returnVertex.length; i++)
      returnVertex[i].sub(meanPosition);
  };

  updateRenderPositionFromPhysical = (partName) => {
    // const renderPos = this.scManager.getVertexOnMatMeshByPartName(partName);
    const phyPosStartIndex = this.mapStartIndex.get(partName);
    console.log(this.mapStartIndex);
    console.log(partName + " phyPosStartIndex: " + phyPosStartIndex);
    // const phyPosLength = mapMatshapeRenderToSkinPos.get(partName).get();
    // const phyPos =

    // NOTE: TEST ONLY
    // const vertexSize = 18521;
    const phyPos = this.mBaseVertex.slice(phyPosStartIndex);
    const renderToSkinPos = this.mapMatshapeRenderToSkinPos
      .get(partName)
      .get("renderToSkinPos");
    const renderPos = new Array(renderToSkinPos.length * 3).fill(-999.999);
    console.log(this.mBaseVertex);
    // console.log(renderPos);
    console.log(phyPos);
    console.log(renderToSkinPos);

    // phyPos;
    // vec3* pos = GetPosition();
    // vec3* normal = GetNormal();

    // mat4 wtol = GetWorldToLocalMatrix();

    console.log(
      "MIN: " +
        Math.min(...renderToSkinPos) +
        " / MAX: " +
        Math.max(...renderToSkinPos)
    );

    const multifier = 10.0;
    for (let i = 0; i < renderPos.length; ++i) {
      // const idx = renderToSkinPos[i];
      // const renderVector = phyPos[idx / 3];

      // console.log(renderToSkinPos[i / 3]);
      // console.log(phyPos[renderToSkinPos[i / 3]]);
      // console.log(phyPos[renderToSkinPos[i / 3]].x);
      const vectorIdx = Math.trunc(i / 3);
      const renderVector = phyPos[renderToSkinPos[vectorIdx]];
      if (!renderVector) {
        console.warn(i, vectorIdx, renderToSkinPos[vectorIdx]);
      }
      switch (i % 3) {
        case 0:
          renderPos[i] = renderVector.x;
          break;
        case 1:
          renderPos[i] = renderVector.y;
          break;
        case 2:
          renderPos[i] = renderVector.z;
          break;
      }
      renderPos[i] *= multifier;
      // renderPos[i] = phyPos[renderToSkinPos[i / 3][i % 3]];
      // pos[i] = wtol * phyPos[m_RenderToSkinPos[i]];

      // 	if (phyNormal)
      // 	{
      // 		vec3 tmpV; // omp 바깥으로 빼서 공유하게 되면 결과값 이상해 진다
      // 		normal[i] = mult_dir(tmpV, wtol, phyNormal[m_RenderToSkinPos[i]]);
      // 		normal[i].normalize();
      // 	}
    }

    renderPos.forEach((pos) => {
      if (pos == -999.999) console.warn(pos);
    });

    console.log(renderPos);

    return renderPos;
  };

  // inputBaseVertex = (mapSkinController) => {
  //   console.log("inputBaseVertex");
  //   console.log(mapSkinController);
  //   const integratedPos = new Array(this.mVertexSize * 3);
  //   const integratedIdx = new Array(this.mVertexSize);

  //   for (const entries of this.mStartIndexMap.entries()) {
  //     // const partName = entries[0];
  //     const partName = "body";
  //     const startIndex = entries[1];
  //     const partSC =
  //       mapSkinController.get(partName) ||
  //       mapSkinController.get(partName + "_Shape");
  //     // console.log(partName, startIndex, partSC);

  //     if (partSC) {
  //       const partMapMesh = partSC.get("mapMesh");
  //       const partPosition = readByteArray(
  //         "Float",
  //         partMapMesh.get("baPosition")
  //       );
  //       const partIndex = readByteArray("Uint", partMapMesh.get("baIndex"));
  //       console.log(partIndex);
  //       console.log(partPosition);
  //       // console.log(startIndex, partPosition.length);

  //       for (
  //         let index = startIndex;
  //         index < partPosition.length + startIndex;
  //         ++index
  //       ) {
  //         const curIdx = startIndex + index;
  //         integratedPos[index] = partPosition[curIdx];
  //         integratedIdx[index] = partIndex[curIdx] + index;
  //       }

  //       // console.log(partPosition);
  //       // console.log(partIndex);
  //     } else {
  //       console.warn("Skin controller missing: " + partName);
  //     }
  //   }

  //   this.baseVertex = this.convertFloatArrayToVector3Array(integratedPos);
  //   console.log(this.baseVertex);

  //   return integratedIdx;

  //   // console.log(this.mBaseVertex);
  //   // console.log(baseVertex);
  //   // for (let i = 0; i < baseVertex; ++i) {
  //   //   this.mBaseVertex[i] = baseVertex[i];
  //   // }
  //   // this.mBaseVertex = baseVertex;
  //   // test
  //   // if (baseVertex) {
  //   //   if (baseVertex.length / 3 === this.mVertexSize) {
  //   //     console.log("BASE VERTEX CORRECT");
  //   //   }
  //   // }
  // };

  convertFloatArrayToVector3Array = (floatArray) => {
    const vec3Array = [];
    for (let v = 0; v < floatArray.length; v += 3) {
      const idx = v * 3;
      vec3Array.push(
        new THREE.Vector3(
          floatArray[idx],
          floatArray[idx + 1],
          floatArray[idx + 2]
        )
      );
    }
    return vec3Array;
  };
}
