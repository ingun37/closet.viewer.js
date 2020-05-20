/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

import { envDiffuseMap, envSpecularMap } from "@/lib/clo/file/EnvMapReader";

import fragmentShader from "raw-loader!@/lib/clo/shader/fragmentShader.frag";
import pbrFragmentShader from "raw-loader!@/lib/clo/shader/pbrFragmentShader.frag";
import vertexShader from "raw-loader!@/lib/clo/shader/vertexShader.vert";
import pbrVertexShader from "raw-loader!@/lib/clo/shader/pbrVertexShader.vert";

import { TEXTURE_TYPE, RENDER_FACE_TYPE } from "@/lib/clo/readers/Predefined";
import { loadZrestTexture, loadTextureDisassembly } from "./TextureManager";

// NOTE: 여기에서 모든 colorway에 대한 material을 만들어야 하나?
export async function makeMaterial({
  jsZip: zip,
  matProperty: matProperty,
  zProperty: zProperty,
  // matMeshID: matMeshId,
  bUseSeamPuckeringNormalMap: bUseSeamPuckeringNormalMap,
}) {
  const colorwayIndex = zProperty.colorwayIndex;
  const seamPuckeringNormalMap = zProperty.seamPuckeringNormalMap;
  const version = zProperty.version;
  const drawMode = zProperty.drawMode;
  const renderCamera = zProperty.renderCamera;

  /*
  "matProperty"
  id: matMesh ID
  value:
    - bPattern
    - bPolygonOffset
    - colorwayMaterials
    - colorwayObjectTextureTransformation
    - zOffset
  */
  const colorwayMaterials = matProperty.colorwayMaterials;
  if (!colorwayMaterials) {
    console.error("colorway Materials missing");
    return;
  }
  //console.log("colorwayIndex@Material: " + colorwayIndex);
  const currMaterial = colorwayMaterials[colorwayIndex];
  // console.log(currMaterial);
  if (!currMaterial) {
    console.error("Current material missing");
    return;
  }

  const rFace = getRenderFaceType(currMaterial.renderFace);
  const uniforms = getUniform(version);

  // index is one of texture list. this value only zero now.
  const threeJSMaterial = attachShaderMaterial(drawMode, version);
  //console.log(threeJSMaterial);

  if (zProperty.bDisassembled) {
    // console.log(matMeshID);
    const listTexture = await loadTextureDisassembly({
      matProperty: matProperty,
      zrestProperty: zProperty,
      threeJSMaterial: threeJSMaterial,
    });

    const mapTextureMatMeshId =
      zProperty.listMapTextureMatMeshId[colorwayIndex];

    // (x)모든 colorway에 대해 실행
    // zProperty.listMapTextureMatMeshId.forEach((mapTextureMatMeshId) => {
    // listTexture.forEach((textureFilename) => {
    //   //   // TODO: 일단 그냥 해준다, 최적화 하다보니 동작을 안하니까.
    // const threeJSTexture = zProperty.nameToTextureMap.get(textureFilename);
    //   setTexturePropertyDisassembly({
    //     textureFilename: textureFilename,
    //     threeJSTexture: threeJSTexture,
    //     zProperty: zProperty,
    //     materialInformationMap: materialInformationMap,
    //   });
    // });

    //setTextureMaterial

    // TODO: setTextureMaterial 어디갔음?
    // 일단 setTexturePropertyDisassembly에서 호출함 잘하고 있는지 모르지만.

    // });
  } else {
    await loadZrestTexture({
      matProperty: matProperty,
      threeJSMaterial: threeJSMaterial,
      colorwayIndex: colorwayIndex,
      zrestProperty: zProperty,
      jsZip: zip,
    });
  }

  return threeJSMaterial;

  function attachShaderMaterial(drawMode, version) {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib["lights"],
        uniforms,
      ]),
      vertexShader: null,
      fragmentShader: null,
      side: rFace, // double side로 하면 zfighting이 생각보다 심해진다. 나중에 이문제 해결 필요
      wireframe: drawMode.wireframe.pattern,
      lights: true,
      // zOffset 이전 버전에서는 bPolygonOffset 사용, zOffset 사용 버전부터는 bPolygonOffset = false 로 설정됨
      polygonOffset: matProperty.bPolygonOffset,
      polygonOffsetFactor: -0.5,
      polygonOffsetUnits: -2.0,
      depthWrite: !currMaterial.bTransparent,
      transparent: true,
    });

    m.extensions.derivatives = true;
    m.extensions.shaderTextureLOD = true;

    if (version <= 2) {
      m.vertexShader = vertexShader;
      m.fragmentShader = fragmentShader;
    } else {
      m.vertexShader = pbrVertexShader;
      m.fragmentShader = pbrFragmentShader;

      m.uniforms.sDiffuseEnvironmentMap.value = envDiffuseMap;
      m.uniforms.sSpecularEnvironmentMap.value = envSpecularMap;
    }

    if (seamPuckeringNormalMap !== null && bUseSeamPuckeringNormalMap) {
      m.uniforms.bUseSeamPuckeringNormal.value = bUseSeamPuckeringNormalMap;
      m.uniforms.sSeamPuckeringNormal.value = seamPuckeringNormalMap;
    }

    return m;
  }

  function getRenderFaceType(renderFace) {
    // 기본값은 두께보기의상이 기본이므로 front로 하자.
    // double 이 아닌 front로 하면 아바타 헤어 투명도가 CLO와 다르게 나오는 문제가 생기긴 하지만

    switch (renderFace) {
      case RENDER_FACE_TYPE.MV_DOUBLE_FACE:
        return THREE.DoubleSide;

      case RENDER_FACE_TYPE.MV_FRONT_FACE:
        return THREE.FrontSide;

      case RENDER_FACE_TYPE.MV_BACK_FACE:
        return THREE.BackSide;

      default:
        return THREE.FrontSide;
    }
  }

  function getUniform(version) {
    const buildTypeValue = (_type, _value) => {
      return {
        type: _type,
        value: _value,
      };
    };
    const buildFValue = (_value) => buildTypeValue("f", _value);
    const buildV3Value = (_value) => buildTypeValue("v3", _value);

    const identityMatrix = buildTypeValue("m4", new THREE.Matrix4().identity());
    const tNull = buildTypeValue("t", null);
    const iZero = buildTypeValue("i", 0);

    const lessThanVer3 = () => {
      return {
        matGlobal: identityMatrix,
        matAmbient: identityMatrix,
        matDiffuse: identityMatrix,
        matSpecular: identityMatrix,
        matNormal: identityMatrix,
        matTransparent: identityMatrix,
        gRotMatrix: identityMatrix,
        gTransMatrix: identityMatrix,

        sGlobal: tNull,
        sAmbient: tNull,
        sDiffuse: tNull,
        sSpecular: tNull,
        sNormal: tNull,
        sTransparent: tNull,

        bUseGlobal: iZero,
        bUseAmbient: iZero,
        bUseDiffuse: iZero,
        bUseSpecular: iZero,
        bUseNormal: iZero,
        bUseTransparent: iZero,

        materialAmbient: buildV3Value(currMaterial.ambient),
        materialDiffuse: buildV3Value(currMaterial.diffuse),
        materialSpecular: buildV3Value(currMaterial.specular),
        materialEmission: buildV3Value(currMaterial.emission),
        materialShininess: buildFValue(currMaterial.shininess),
        materialOpacity: buildFValue(currMaterial.alpha),
        normalMapIntensityInPercentage: buildFValue(
          currMaterial.normalMapIntensityInPercentage
        ),
      };
    };

    const StartingWithVer3 = () => {
      return {
        m_bUseMetalnessRoughnessPBR: buildTypeValue(
          "i",
          currMaterial.bUseMetalnessRoughnessPBR
        ),
        m_Metalness: buildFValue(currMaterial.metalness),
        m_Glossiness: buildFValue(currMaterial.glossiness),
        m_bInvertGlossinessMap: iZero, // 아래 텍스처 로드하면서 설정
        m_GlossinessMapIntensity: iZero, // 아래서 설정
        // m_EnvironmentAngle: { type: 'f', value: 0.0 }, // 나중에 zprj 파일에서 읽자
        m_EnvironmentLightIntensity: buildFValue(
          currMaterial.environmentLightIntensity
        ),
        m_CameraLightIntensity: buildFValue(currMaterial.cameraLightIntensity),
        m_ReflectionIntensity: buildFValue(currMaterial.reflectionIntensity),
        m_RoughnessUIType: buildTypeValue("i", currMaterial.roughnessUIType),
        m_FrontColorMult: buildFValue(currMaterial.frontColorMult),
        m_SideColorMult: buildFValue(currMaterial.sideColorMult),

        materialBaseColor: buildV3Value(currMaterial.base),
        materialSpecular: buildV3Value(currMaterial.reflectionColor),
        materialOpacity: buildFValue(currMaterial.alpha),
        normalMapIntensityInPercentage: buildFValue(
          currMaterial.normalMapIntensityInPercentage
        ),

        // 아래는 texture 정보에서 설정
        bUseGlobal: iZero,
        bUseNormal: iZero,
        bUseSeamPuckeringNormal: iZero,
        bUseTransparent: iZero,
        bUseGlossinessMap: iZero,
        bUseMetalnessMap: iZero,
        bUseAmbientOcclusion: iZero,

        matGlobal: identityMatrix,
        matNormal: identityMatrix,
        matTransparent: identityMatrix,
        matGlossiness: identityMatrix,
        matMetalness: identityMatrix,

        gRotMatrix: identityMatrix,
        gTransMatrix: identityMatrix,

        positionOffset: buildFValue(matProperty.zOffset),
        cameraNear: buildFValue(renderCamera.near),
        cameraFar: buildFValue(renderCamera.far),
        sGlobal: tNull,
        sNormal: tNull,
        sSeamPuckeringNormal: tNull,
        sTransparent: tNull,
        sGlossiness: tNull,
        sMetalness: tNull,
        sDiffuseEnvironmentMap: tNull, // 여기서 바로 value: envDiffuseMap 으로 설정하면 안먹힌다.
        sSpecularEnvironmentMap: tNull, // 여기서 바로 value: envDiffuseMap 으로 설정하면 안먹힌다.
        // uniform sampler2D sAmbientOcclusionMap;
      };
    };

    if (version < 3) {
      return lessThanVer3();
    } else {
      return StartingWithVer3();
    }
  }
}
