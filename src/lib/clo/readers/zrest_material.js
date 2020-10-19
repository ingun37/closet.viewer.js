/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "three";

import { envDiffuseMap, envSpecularMap } from "@/lib/clo/file/EnvMapReader";
import { loadTexture } from "@/lib/clo/readers/zrest_texture";

import fragmentShader from "raw-loader!@/lib/clo/shader/fragmentShader.frag";
import pbrFragmentShader from "raw-loader!@/lib/clo/shader/pbrFragmentShader.frag";
import vertexShader from "raw-loader!@/lib/clo/shader/vertexShader.vert";
import pbrVertexShader from "raw-loader!@/lib/clo/shader/pbrVertexShader.vert";

import { TEXTURE_TYPE, RENDER_FACE_TYPE } from "@/lib/clo/readers/predefined";

export async function makeMaterial({
  jsZip: zip,
  matProperty: property,
  colorwayIndex: colorwayIndex,
  bUseSeamPuckeringNormalMap: bUseSeamPuckeringNormalMap,
  camera: loadedCamera,
  drawMode: drawMode,
  seamPuckeringNormalMap: seamPuckeringNormalMap,
  nameToTextureMap: nameToTextureMap,
  zrestVersion: version
}) {
  const zRestColorwayMaterialArray = property.colorwayMaterials;
  if (!zRestColorwayMaterialArray) return;
  const material = zRestColorwayMaterialArray[colorwayIndex];
  if (!material) return;
  const rFace = getRenderFaceType(material.renderFace);
  const uniforms = getUniforms(version, loadedCamera, colorwayIndex);

  const attachShader = (drawMode, version) => {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib["lights"], uniforms]),
      vertexShader: null,
      fragmentShader: null,
      side: rFace, // double side로 하면 zfighting이 생각보다 심해진다. 나중에 이문제 해결 필요
      wireframe: drawMode.wireframe.pattern,
      lights: true,
      // zOffset 이전 버전에서는 bPolygonOffset 사용, zOffset 사용 버전부터는 bPolygonOffset = false 로 설정됨
      polygonOffset: property.bPolygonOffset,
      polygonOffsetFactor: -0.5,
      polygonOffsetUnits: -2.0,
      depthWrite: !material.bTransparent,
      transparent: true
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
  };

  // index is one of texture list. this value only zero now.
  const threeJSMaterial = attachShader(drawMode, version);

  await loadZrestTexture(colorwayIndex, version);

  return threeJSMaterial;

  function getRenderFaceType(renderFace) {
    // 기본값은 두께보기의상이 기본이므로 front로 하자.
    // double 이 아닌 front로 하면 아바타 헤어 투명도가 CLO와 다르게 나오는 문제가 생기긴 하지만
    if (renderFace === undefined) {
      return THREE.FrontSide;
    } else if (renderFace === RENDER_FACE_TYPE.MV_DOUBLE_FACE) {
      return THREE.DoubleSide;
    } else if (renderFace === RENDER_FACE_TYPE.MV_FRONT_FACE) {
      return THREE.FrontSide;
    } else {
      return THREE.BackSide;
    }
  }

  function getUniforms(version, camera, colorwayIndex) {
    const buildTypeValue = (_type, _value) => {
      return {
        type: _type,
        value: _value
      };
    };
    const buildFValue = _value => buildTypeValue("f", _value);
    const buildV3Value = _value => buildTypeValue("v3", _value);

    const identityMatrix = buildTypeValue("m4", new THREE.Matrix4().identity());
    const tNull = buildTypeValue("t", null);
    const iZero = buildTypeValue("i", 0);

    if (version <= 2) {
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

        materialAmbient: buildV3Value(material.ambient),
        materialDiffuse: buildV3Value(material.diffuse),
        materialSpecular: buildV3Value(material.specular),
        materialEmission: buildV3Value(material.emission),
        materialShininess: buildFValue(material.shininess),
        materialOpacity: buildFValue(material.alpha),
        normalMapIntensityInPercentage: buildFValue(material.normalMapIntensityInPercentage)
      };
    } else {
      // version > 3
      return {
        m_bUseMetalnessRoughnessPBR: buildTypeValue("i", material.bUseMetalnessRoughnessPBR),
        m_Metalness: buildFValue(material.metalness),
        m_Glossiness: buildFValue(material.glossiness),
        m_bInvertGlossinessMap: iZero, // 아래 텍스처 로드하면서 설정
        m_GlossinessMapIntensity: iZero, // 아래서 설정
        // m_EnvironmentAngle: { type: 'f', value: 0.0 }, // 나중에 zprj 파일에서 읽자
        m_EnvironmentLightIntensity: buildFValue(material.environmentLightIntensity),
        m_CameraLightIntensity: buildFValue(material.cameraLightIntensity),
        m_ReflectionIntensity: buildFValue(material.reflectionIntensity),
        m_RoughnessUIType: buildTypeValue("i", material.roughnessUIType),
        m_FrontColorMult: buildFValue(material.frontColorMult),
        m_SideColorMult: buildFValue(material.sideColorMult),

        materialBaseColor: buildV3Value(material.base),
        materialSpecular: buildV3Value(material.reflectionColor),
        materialOpacity: buildFValue(material.alpha),
        normalMapIntensityInPercentage: buildFValue(material.normalMapIntensityInPercentage),

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

        positionOffset: buildFValue(property.zOffset),
        cameraNear: buildFValue(loadedCamera.near),
        cameraFar: buildFValue(loadedCamera.far),

        sGlobal: tNull,
        sNormal: tNull,
        sSeamPuckeringNormal: tNull,
        sTransparent: tNull,
        sGlossiness: tNull,
        sMetalness: tNull,
        sDiffuseEnvironmentMap: tNull, // 여기서 바로 value: envDiffuseMap 으로 설정하면 안먹힌다.
        sSpecularEnvironmentMap: tNull // 여기서 바로 value: envDiffuseMap 으로 설정하면 안먹힌다.
        // uniform sampler2D sAmbientOcclusionMap;
      };
    }
  }

  async function loadZrestTexture(colorwayIndex, version) {
    // Load Texture File
    let bHasTexture = false;
    let texture;

    for (let i = 0; i < material.texture.length; i++) {
      const zRestTexture = material.texture[i];

      if (!zip.file(zRestTexture.file)) {
        const temp = zRestTexture.file;
        const list = temp.split("/");
        const textureFileName = list[list.length - 1];

        if (!zip.file(textureFileName)) {
          // FIXME: On this condition, does nothing.
        } else {
          /**
           * TODO:
           * 이 쓰레드에서 바로 texture 로딩해 버리자.
           * 이미지 사이즈가 작으면 이게 사용자가 봤을 때 깜박거리지 않고 오히려 낫다.
           * 나중에 큰 이미지 프로그레시브 로딩 적용할 때 다시 비동기 방식 적용해 보자.
           * 비동기 로딩 방식은 아래 주석처리 되어 있다.
           * Jaden 2017.016.16
           *
           * Tkay:
           * 버전 관리 툴을 믿고 삭제했습니다.
           * 기존 코드는 Release v1.0.23을 참고하세요.
           */
          texture = nameToTextureMap.get(textureFileName);

          if (!texture) {
            texture = await loadTexture(zip, textureFileName);
            nameToTextureMap.set(textureFileName, texture);
          }

          // wrap type 외에는 기본값을 그대로 사용하면 된다.
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;

          /**
           * TODO:
           * 이거 설정해 줘야 텍스처 블러링 문제 없어져서 CLO에서처럼 선명하게 나온다.
           * 적당히 16으로 설정했으나 성능 문제 있을 수 있다.
           * Jaden 2018.09.03
           */
          texture.anisotropy = 16;

          const rotMatrix = new THREE.Matrix4();
          rotMatrix.identity();
          rotMatrix.makeRotationZ(-THREE.Math.degToRad(zRestTexture.angle));

          const transMatrix = new THREE.Matrix4();
          transMatrix.identity();
          transMatrix.makeTranslation(-zRestTexture.translate.x, -zRestTexture.translate.y, 0.0);

          const scaleMatrix = new THREE.Matrix4();
          scaleMatrix.identity();
          scaleMatrix.makeScale(1.0 / zRestTexture.scale.x, 1.0 / zRestTexture.scale.y, 1.0);

          const transform = new THREE.Matrix4();
          transform.identity();
          transform.multiply(scaleMatrix);
          transform.multiply(rotMatrix);
          transform.multiply(transMatrix);

          if (zRestTexture.type === TEXTURE_TYPE.GLOBAL_MAP) {
            threeJSMaterial.uniforms.sGlobal.value = texture;
            threeJSMaterial.uniforms.bUseGlobal.value = 1;
            threeJSMaterial.uniforms.matGlobal.value = transform;
          } else if (zRestTexture.type === TEXTURE_TYPE.DIFFUSE_MAP) {
            if (version <= 2) {
              threeJSMaterial.uniforms.sDiffuse.value = texture;
              threeJSMaterial.uniforms.bUseDiffuse.value = 1;
              threeJSMaterial.uniforms.matDiffuse.value = transform;
            }
          } else if (zRestTexture.type === TEXTURE_TYPE.AMBIENT_MAP) {
            if (version <= 2) {
              threeJSMaterial.uniforms.sAmbient.value = texture;
              threeJSMaterial.uniforms.bUseAmbient.value = 1;
              threeJSMaterial.uniforms.matAmbient.value = transform;
            }
          } else if (zRestTexture.type === TEXTURE_TYPE.SPECULAR_MAP) {
            if (version <= 2) {
              threeJSMaterial.uniforms.sSpecular.value = texture;
              threeJSMaterial.uniforms.bUseSpecular.value = 1;
              threeJSMaterial.uniforms.matSpecular.value = transform;
            }
          } else if (zRestTexture.type === TEXTURE_TYPE.NORMAL_MAP) {
            if (version >= 2) {
              // 버전 2 이상일 때만 노말맵 지원. 그렇지 않으면 1.0에서 제작된 zrest 파일은 desaturated 된 이미지가 normal map 으로 인식되었던 버그때문에 렌더링 이상해진다.
              threeJSMaterial.uniforms.sNormal.value = texture;
              threeJSMaterial.uniforms.bUseNormal.value = 1;
              threeJSMaterial.uniforms.matNormal.value = transform;
            }
          } else if (zRestTexture.type === TEXTURE_TYPE.TRANSPARENTT_MAP) {
            threeJSMaterial.uniforms.sTransparent.value = texture;
            threeJSMaterial.uniforms.bUseTransparent.value = 1;
            threeJSMaterial.uniforms.matTransparent.value = transform;
          } else if (zRestTexture.type === TEXTURE_TYPE.GLOSSINESS_MAP) {
            if (version >= 3) {
              threeJSMaterial.uniforms.sGlossiness.value = texture;
              threeJSMaterial.uniforms.bUseGlossinessMap.value = 1;
              threeJSMaterial.uniforms.matGlossiness.value = transform;

              if (zRestTexture.colorInverted) {
                threeJSMaterial.uniforms.m_bInvertGlossinessMap.value = 1;
              } else {
                threeJSMaterial.uniforms.m_bInvertGlossinessMap.value = 0;
              }

              threeJSMaterial.uniforms.m_GlossinessMapIntensity.value = zRestTexture.intensity;
            }
          }

          bHasTexture = true;
        }
      }
    }

    if (bHasTexture) {
      if (property.colorwayObjectTextureTransformation.length > 0) {
        const transformed = property.colorwayObjectTextureTransformation;
        const grot = new THREE.Matrix4();
        grot.identity();
        grot.makeRotationZ(-THREE.Math.degToRad(transformed[colorwayIndex].angle));

        const gtra = new THREE.Matrix4();
        gtra.identity();

        gtra.makeTranslation(-transformed[colorwayIndex].translate.x, -transformed[colorwayIndex].translate.y, 0.0);

        threeJSMaterial.uniforms.gRotMatrix.value = grot;
        threeJSMaterial.uniforms.gTransMatrix.value = gtra;
      }
    }

    // FIXME: check to assign and dispose of 'texture' variable correctly. It seems works but not matched.
    texture && texture.dispose();
  }
}
