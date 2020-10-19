/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "three";

import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { RENDER_FACE_TYPE } from "@/lib/clo/readers/predefined";

import MatMeshManager from "./zrest_matMesh";

export default function MeshFactory({ matMeshMap: matMeshMap, matShapeMap: matShapeMap, materialInformationMap: materialInformationMap, camera: loadedCamera, zrestProperty: zrestProperty }) {
  this.matMeshMap = matMeshMap;
  this.materialList = [];
  this.matShapeMap = matShapeMap;
  this.materialInformationMap = materialInformationMap;
  this.camera = loadedCamera;
  this.zProperty = zrestProperty;
  this.drawMode = zrestProperty.drawMode;
  this.colorwaySize = 0;

  // console.log("meshFactory Init");
  // console.log(this.zProperty);

  this.matmeshManager = new MatMeshManager({
    matMeshMap: this.matMeshMap,
    matShapeMap: this.matShapeMap,
    materialInformationMap: this.materialInformationMap,
    camera: this.camera,
    zrestProperty: this.zProperty,
    drawMode: this.drawMode
  });
}

MeshFactory.prototype = {
  constructor: MeshFactory,

  async build(zrestLoader, map, zip, retObject, loadedCamera) {
    const zrestVersion = map.get("uiVersion") || 1;
    this.zProperty.version = zrestVersion;

    console.log("ZREST version: " + this.zProperty.version);

    this.materialInformationMap = new Map();

    const camLtoW = map.get("m4CameraLocalToWorldMatrix");
    getCameraLtoW(camLtoW, loadedCamera);

    const mapColorways = map.get("mapColorWay");
    if (mapColorways !== undefined) {
      this.currentColorwayIndex = mapColorways.get("uiCurrentCoordinationIndex");
      this.colorwaySize = mapColorways.get("listColorway").length;
    }

    // Set colorway index to default
    this.matmeshManager.setColorwayIndex(this.currentColorwayIndex);

    if (zrestVersion > 4) {
      const listMaterial = map.get("listMaterial");
      if (listMaterial !== undefined) {
        for (let j = 0; j < listMaterial.length; ++j) {
          const material = setMaterial(listMaterial[j]);
          this.materialList.push(material);
        }
      }
    }

    const zRestMatMeshArray = map.get("listMatMesh") || map.get("listMaterials");
    if (zRestMatMeshArray !== undefined) {
      for (let i = 0; i < zRestMatMeshArray.length; ++i) {
        const zRestColorwayMaterials = setZRestColorwayMaterials(zRestMatMeshArray[i]);

        if (zrestVersion > 4) {
          const renderFace = zRestMatMeshArray[i].get("enRenderFace");
          const listMaterialInfo = zRestMatMeshArray[i].get("listMaterialInfo");

          if (listMaterialInfo !== undefined) {
            for (let j = 0; j < listMaterialInfo.length; ++j) {
              // TODO: refactor here
              const mapMaterialInfo = {
                index: -1
              };
              mapMaterialInfo.index = listMaterialInfo[j].get("iMaterialIndex");
              if (mapMaterialInfo.index < this.materialList.length) {
                // 나중에 작성자의 의도를 파악해야 함. 미심쩍다...왜 Material이 renderFace 정보를 가지고 있는지 잘 모르겠음.
                // by Jaden
                this.materialList[mapMaterialInfo.index].renderFace = renderFace;
                zRestColorwayMaterials.colorwayMaterials.push(this.materialList[mapMaterialInfo.index]);
              }
            }
          }
        } else {
          const listMaterial = zrestVersion > 4 ? map.get("listMaterial") : zRestMatMeshArray[i].get("listMaterial");

          if (listMaterial !== undefined) {
            for (let j = 0; j < listMaterial.length; ++j) {
              const material = setMaterial(listMaterial[j]);
              zRestColorwayMaterials.colorwayMaterials.push(material);
            }
          }
        }
        this.materialInformationMap.set(zRestMatMeshArray[i].get("uiMatMeshID"), zRestColorwayMaterials);
      }
    }

    const mapGeometry = map.get("mapGeometry");
    if (!mapGeometry) {
      // FIXME: synchronize return type
      return false;
    }
    if (zrestLoader.aborted) return;
    // 불투명 부터 추가해서 불투명 object 부터 그리기
    let tf = await this.matmeshManager.getMatMeshs(zrestLoader, mapGeometry, zip, false, this.materialInformationMap, this.currentColorwayIndex, this.camera, zrestVersion);
    if (zrestLoader.aborted) return;
    retObject.add(tf);

    // 투명한것 추가
    tf = await this.matmeshManager.getMatMeshs(zrestLoader, mapGeometry, zip, true, this.materialInformationMap, this.currentColorwayIndex, this.camera, zrestVersion);
    if (zrestLoader.aborted) return;
    retObject.add(tf);

    this.matShapeMap = this.matmeshManager.matShapeMap;

    // FIXME: synchronize return type
    return retObject;
  },

  getStyleLineMap() {
    return this.matmeshManager.getStyleLineMap();
  },

  getColorwaySize() {
    return this.colorwaySize;
  }
};

const getCameraLtoW = (LtoWMatrix, loadedCamera) => {
  if (!LtoWMatrix) return false;

  loadedCamera.bLoaded = true;

  // prettier-ignore
  loadedCamera.ltow.set(
    LtoWMatrix.a00, LtoWMatrix.a01, LtoWMatrix.a02, LtoWMatrix.a03,
    LtoWMatrix.a10, LtoWMatrix.a11, LtoWMatrix.a12, LtoWMatrix.a13,
    LtoWMatrix.a20, LtoWMatrix.a21, LtoWMatrix.a22, LtoWMatrix.a23,
    LtoWMatrix.a30, LtoWMatrix.a31, LtoWMatrix.a32, LtoWMatrix.a33
  );

  return true;
};

const setMaterial = source => {
  // TODO: 'material' is assigned every loop. Should be improved.
  const material = {
    id: -1,

    ambient: null,
    diffuse: null,
    specular: null,
    emission: null,
    shininess: 0.0,
    alpha: 0.0,

    base: null,
    reflectionColor: null,
    blendFuncSrc: 0,
    blendFuncDst: 0,
    blendColor: 0,

    opaqueMode: 0,
    ambientIntensity: 0.0,
    diffuseIntensity: 0.0,
    normalMapIntensityInPercentage: 10.0,
    zero: 0.0,
    bPerfectTransparent: false,
    bTransparent: false,
    renderFace: RENDER_FACE_TYPE.MV_FRONT_FACE, // 기본값은 두께보기의상이 기본이므로 front로 하자. double 이 아닌 front로 하면 아바타 헤어 투명도가 CLO와 다르게 나오는 문제가 생기긴 하지만

    // PBR 쪽 변수
    materialType: 0,
    bUseMetalnessRoughnessPBR: true,
    glossiness: 0.0,
    metalness: 0.0,
    environmentLightIntensity: 0.0,
    cameraLightIntensity: 0.0,
    roughnessUIType: 0,
    reflectionIntensity: 0.0,
    frontColorMult: 1.0,
    sideColorMult: 1.0,

    texture: []
  };

  // For high version only
  // TODO: consider removing this module
  const element = source.get("mapElement");
  if (element !== undefined) {
    material.id = element.get("uiID");
  }

  material.renderFace = source.get("enRenderFace");
  material.bTransparent = source.get("bTransparent");
  material.bPerfectTransparent = source.get("bPerfectTransparent");

  material.ambient = new THREE.Vector3(source.get("v4Ambient").x, source.get("v4Ambient").y, source.get("v4Ambient").z);
  material.diffuse = new THREE.Vector3(source.get("v4Diffuse").x, source.get("v4Diffuse").y, source.get("v4Diffuse").z);
  material.specular = new THREE.Vector3(source.get("v4Specular").x, source.get("v4Specular").y, source.get("v4Specular").z);
  material.emission = new THREE.Vector3(source.get("v4Emission").x, source.get("v4Emission").y, source.get("v4Emission").z);
  material.shininess = source.get("fShininess");
  material.alpha = source.get("v4Diffuse").w;

  if (material.bPerfectTransparent) {
    material.alpha = 0.0;
  }

  const normalIntensity = source.get("iNormalIntensity");
  if (normalIntensity !== undefined && normalIntensity !== null) {
    // 기존에 최대 10인 intensity여서 10만 곱해서 최대 100% 로 맞춘다.
    material.normalMapIntensityInPercentage = normalIntensity * 10.0;
  } else {
    material.normalMapIntensityInPercentage = source.get("iNormalIntensityInPercentage");
  }

  material.base = new THREE.Vector3(source.get("v3BaseColor").x, source.get("v3BaseColor").y, source.get("v3BaseColor").z);

  material.blendFuncSrc = source.get("uiBlendFuncSrc");
  material.blendFuncDst = source.get("uiBlendFuncDst");
  material.blendColor = new THREE.Vector3(source.get("v4BlendColor").x, source.get("v4BlendColor").y, source.get("v4BlendColor").z);

  material.opaqueMode = source.get("enOpaqueMode");
  material.ambientIntensity = source.get("fAmbientIntensity");
  material.diffuseIntensity = source.get("fDiffuseIntensity");
  material.zero = source.get("fZero");

  // pbr
  material.materialType = source.get("iMaterialType");
  if (material.materialType === undefined) {
    material.materialType = 0;
  }

  const bUseMetalnessRoughnessPBR = source.get("bUseMetalnessRoughnessPBR");
  if (bUseMetalnessRoughnessPBR !== undefined) {
    material.bUseMetalnessRoughnessPBR = bUseMetalnessRoughnessPBR;
  } else {
    material.bUseMetalnessRoughnessPBR = true;
  }

  material.glossiness = source.get("fGlossiness");
  material.metalness = source.get("fMetalness");
  const bMetal = source.get("bMetal");

  // metalness 는 m_bMetal 에 의해 지배되고 있음. bMetal은 없어졌지만 기존 버전 호환을 위해 필요함.
  if (bMetal !== undefined && bMetal == false) {
    material.metalness = 0.0;
  }

  material.environmentLightIntensity = source.get("fEnvironmentLightIntensity");
  material.cameraLightIntensity = source.get("fCameraLightIntensity");

  // velvet
  if (material.materialType == 6) {
    material.environmentLightIntensity = 0.0;
    material.cameraLightIntensity = 0.7;
  }

  material.frontColorMult = source.get("fFrontColorMult");
  if (material.frontColorMult === undefined) {
    material.frontColorMult = 1.0;
  }

  material.sideColorMult = source.get("fSideColorMult");
  if (material.sideColorMult === undefined) {
    material.sideColorMult = 1.0;
  }

  material.roughnessUIType = source.get("iRoughnessUIType");
  material.reflectionIntensity = source.get("fReflectionIntensity");

  // 다음(v3ReflectionColor)은 사용되고 있지 않은 코드같다..
  const reflectionColor = source.get("v3ReflectionColor");
  if (reflectionColor !== undefined && reflectionColor !== null) {
    material.reflectionColor = new THREE.Vector3(source.get("v3ReflectionColor").x, source.get("v3ReflectionColor").y, source.get("v3ReflectionColor").z);
  } else {
    material.reflectionColor = new THREE.Vector3(0.04, 0.04, 0.04);
  } // 실제로는 사용되지 않는 값이지만 초기화하자

  // silk satin 의 specular color(여기서는 reflection color) 적용하기. 여기 바뀌면 CLO에서도 바꿔 줘야 한다.
  // silk & satin
  if (material.bUseMetalnessRoughnessPBR == false && material.materialType == 5) {
    material.reflectionColor.x = material.reflectionIntensity * (material.base.x + 0.1); // 하얀색 하이라이트가 약하니 0.1 더해준다.
    material.reflectionColor.y = material.reflectionIntensity * (material.base.y + 0.1);
    material.reflectionColor.z = material.reflectionIntensity * (material.base.z + 0.1);

    material.base.x = 0.8 * material.base.x; // CLO쪽과 동일한 코드로 만들기 위해 0.8 곱해준다.
    material.base.y = 0.8 * material.base.y;
    material.base.z = 0.8 * material.base.z;
  } else {
    material.reflectionColor = new THREE.Vector3(0.04, 0.04, 0.04);
  } // linear 0.04 에 해당하는 sRGB 값 59 리턴 -> linear 값이 사용된다.

  const tex = source.get("listTexture");
  if (tex !== undefined && tex !== null) {
    for (let k = 0; k < tex.length; ++k) {
      // TODO: 'textureProperty' is assigned every loop. Should be improved.
      const textureProperty = {
        file: "",
        aifile: "",
        uniqfile: "",
        type: 0,

        angle: 0.0,
        translate: { x: 0.0, y: 0.0 },
        scale: { x: 0.0, y: 0.0 },
        colorInverted: false,
        intensity: 1.0
      };

      textureProperty.file = readByteArray("String", tex[k].get("qsFileName"));
      textureProperty.type = tex[k].get("enType");

      textureProperty.angle = tex[k].get("fSignedAngle");
      textureProperty.translate = tex[k].get("v2Translation");
      textureProperty.scale = tex[k].get("v2Size");

      textureProperty.colorInverted = tex[k].get("bColorInverted");
      textureProperty.intensity = tex[k].get("fIntensity");

      material.texture.push(textureProperty);
    }
  }
  return material;
};

const setZRestColorwayMaterials = source => {
  // TODO: 'zRestColorwayMaterials' is assigned every loop. Should be improved.
  const zRestColorwayMaterials = {
    bPattern: false, // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
    bPolygonOffset: false,
    zOffset: 0.0,
    colorwayMaterials: [],
    colorwayObjectTextureTransformation: []
  };

  zRestColorwayMaterials.id = source.get("uiMatMeshID");
  zRestColorwayMaterials.bPattern = source.get("bPattern"); // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
  zRestColorwayMaterials.bPolygonOffset = source.get("bPolygonOffset");
  if (zRestColorwayMaterials.bPolygonOffset === undefined) {
    zRestColorwayMaterials.bPolygonOffset = zRestColorwayMaterials.bpattern === 0;
  } // 이전 버전에서는 이렇게 설정해 주고 있었다.. bPattern은 이제 사용하지 않는다.

  zRestColorwayMaterials.zOffset = source.get("fZOffset");
  if (zRestColorwayMaterials.zOffset === undefined) {
    zRestColorwayMaterials.zOffset = 0.0;
  } else {
    zRestColorwayMaterials.bPolygonOffset = false;
  } // zOffset 사용하는 버전에서는 bPolygonOffset 사용하지 않는다.

  const listTexInfo = source.get("listTexInfo");
  if (listTexInfo !== undefined) {
    for (let j = 0; j < listTexInfo.length; ++j) {
      const info = {
        angle: 0.0,
        translate: { x: 0.0, y: 0.0 }
      };

      info.angle = listTexInfo[j].get("fAngle");
      info.translate = listTexInfo[j].get("v2Trans");

      zRestColorwayMaterials.colorwayObjectTextureTransformation.push(info);
    }
  }

  return zRestColorwayMaterials;
};
