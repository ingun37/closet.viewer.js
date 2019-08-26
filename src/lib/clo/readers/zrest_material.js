/* eslint-disable require-jsdoc */
'use strict';
import * as THREE from '@/lib/threejs/three';

import {envDiffuseMap, envSpecularMap} from '@/lib/clo/file/EnvMapReader';
import {loadTexture} from '@/lib/clo/readers/zrest_texture';

import fragmentShader from 'raw-loader!@/lib/clo/shader/fragmentShader.frag';
import pbrFragmentShader from 'raw-loader!@/lib/clo/shader/pbrFragmentShader.frag';
import vertexShader from 'raw-loader!@/lib/clo/shader/vertexShader.vert';
import pbrVertexShader from 'raw-loader!@/lib/clo/shader/pbrVertexShader.vert';

import {TEXTURE_TYPE, RENDER_FACE_TYPE} from '@/lib/clo/readers/predefined';

export async function makeMaterial(zip, property, colorwayIndex, bUseSeamPuckeringNormalMap, loadedCamera, _drawMode, _seamPuckeringNormalMap, _nameToTextureMap, version) {
  const zRestColorwayMaterialArray = property.colorwayMaterials;
  const material = zRestColorwayMaterialArray[colorwayIndex];
  const rFace = getRenderFaceType(material.renderFace);
  const uniforms = getUniforms(version, loadedCamera, colorwayIndex);

  const attachShader = (_drawMode, version) => {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib['lights'], uniforms,
      ]),
      vertexShader: null,
      fragmentShader: null,
      side: rFace, // double side로 하면 zfighting이 생각보다 심해진다. 나중에 이문제 해결 필요
      wireframe: _drawMode.wireframe.pattern,
      lights: true,
      polygonOffset: property.bPolygonOffset, // zOffset 이전 버전에서는 bPolygonOffset 사용, zOffset 사용 버전부터는 bPolygonOffset = false 로 설정됨
      polygonOffsetFactor: -0.5,
      polygonOffsetUnits: -2.0,
      depthWrite: !material.bTransparent,
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

    if (_seamPuckeringNormalMap !== null && bUseSeamPuckeringNormalMap) {
      m.uniforms.bUseSeamPuckeringNormal.value = bUseSeamPuckeringNormalMap;
      m.uniforms.sSeamPuckeringNormal.value = _seamPuckeringNormalMap;
    }

    return m;
  };

  // index is one of texture list. this value only zero now.
  const threeJSMaterial = attachShader(_drawMode, version);

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
    if (version <=2) {
      return {
        matGlobal: {type: 'm4', value: new THREE.Matrix4().identity()},
        matAmbient: {type: 'm4', value: new THREE.Matrix4().identity()},
        matDiffuse: {type: 'm4', value: new THREE.Matrix4().identity()},
        matSpecular: {type: 'm4', value: new THREE.Matrix4().identity()},
        matNormal: {type: 'm4', value: new THREE.Matrix4().identity()},
        matTransparent: {type: 'm4', value: new THREE.Matrix4().identity()},
        gRotMatrix: {type: 'm4', value: new THREE.Matrix4().identity()},
        gTransMatrix: {type: 'm4', value: new THREE.Matrix4().identity()},
        sGlobal: {type: 't', value: null},
        sAmbient: {type: 't', value: null},
        sDiffuse: {type: 't', value: null},
        sSpecular: {type: 't', value: null},
        sNormal: {type: 't', value: null},
        sTransparent: {type: 't', value: null},
        bUseGlobal: {type: 'i', value: 0},
        bUseAmbient: {type: 'i', value: 0},
        bUseDiffuse: {type: 'i', value: 0},
        bUseSpecular: {type: 'i', value: 0},
        bUseNormal: {type: 'i', value: 0},
        bUseTransparent: {type: 'i', value: 0},

        materialAmbient: {type: 'v3', value: zRestColorwayMaterialArray[colorwayIndex].ambient},
        materialDiffuse: {type: 'v3', value: zRestColorwayMaterialArray[colorwayIndex].diffuse},
        materialSpecular: {type: 'v3', value: zRestColorwayMaterialArray[colorwayIndex].specular},
        materialEmission: {type: 'v3', value: zRestColorwayMaterialArray[colorwayIndex].emission},
        materialShininess: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].shininess},
        materialOpacity: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].alpha},
        normalMapIntensityInPercentage: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].normalMapIntensityInPercentage},
      };
    } else { // version > 3
      return {
        m_bUseMetalnessRoughnessPBR: {type: 'i', value: zRestColorwayMaterialArray[colorwayIndex].bUseMetalnessRoughnessPBR},
        m_Metalness: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].metalness},
        m_Glossiness: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].glossiness},
        m_bInvertGlossinessMap: {type: 'i', value: 0}, // 아래 텍스처 로드하면서 설정
        m_GlossinessMapIntensity: {type: 'f', value: 1.0}, // 아래서 설정
        // m_EnvironmentAngle: { type: 'f', value: 0.0 }, // 나중에 zprj 파일에서 읽자
        m_EnvironmentLightIntensity: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].environmentLightIntensity},
        m_CameraLightIntensity: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].cameraLightIntensity},
        m_ReflectionIntensity: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].reflectionIntensity},
        m_RoughnessUIType: {type: 'i', value: zRestColorwayMaterialArray[colorwayIndex].roughnessUIType},
        m_FrontColorMult: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].frontColorMult},
        m_SideColorMult: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].sideColorMult},

        materialBaseColor: {type: 'v3', value: zRestColorwayMaterialArray[colorwayIndex].base},
        materialSpecular: {type: 'v3', value: zRestColorwayMaterialArray[colorwayIndex].reflectionColor},
        materialOpacity: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].alpha},
        normalMapIntensityInPercentage: {type: 'f', value: zRestColorwayMaterialArray[colorwayIndex].normalMapIntensityInPercentage},

        // 아래는 texture 정보에서 설정
        bUseGlobal: {type: 'i', value: 0},
        bUseNormal: {type: 'i', value: 0},
        bUseSeamPuckeringNormal: {type: 'i', value: 0},
        bUseTransparent: {type: 'i', value: 0},
        bUseGlossinessMap: {type: 'i', value: 0},
        bUseMetalnessMap: {type: 'i', value: 0},
        bUseAmbientOcclusion: {type: 'i', value: 0},

        matGlobal: {type: 'm4', value: new THREE.Matrix4().identity()},
        matNormal: {type: 'm4', value: new THREE.Matrix4().identity()},
        matTransparent: {type: 'm4', value: new THREE.Matrix4().identity()},
        matGlossiness: {type: 'm4', value: new THREE.Matrix4().identity()},
        matMetalness: {type: 'm4', value: new THREE.Matrix4().identity()},

        gRotMatrix: {type: 'm4', value: new THREE.Matrix4().identity()},
        gTransMatrix: {type: 'm4', value: new THREE.Matrix4().identity()},

        positionOffset: {type: 'f', value: property.zOffset},
        cameraNear: {type: 'f', value: loadedCamera.near},
        cameraFar: {type: 'f', value: loadedCamera.far},

        sGlobal: {type: 't', value: null},
        sNormal: {type: 't', value: null},
        sSeamPuckeringNormal: {type: 't', value: null},
        sTransparent: {type: 't', value: null},
        sGlossiness: {type: 't', value: null},
        sMetalness: {type: 't', value: null},
        sDiffuseEnvironmentMap: {type: 't', value: null}, // 여기서 바로 value: envDiffuseMap 으로 설정하면 안먹힌다.
        sSpecularEnvironmentMap: {type: 't', value: null}, // 여기서 바로 value: envDiffuseMap 으로 설정하면 안먹힌다.
        // uniform sampler2D sAmbientOcclusionMap;
      };
    }
  }

  async function loadZrestTexture(colorwayIndex, version) {
    // Load Texture File
    let bHasTexture = false;
    let texture;

    for (let i = 0; i < zRestColorwayMaterialArray[colorwayIndex].texture.length; i++) {
      const zRestTexture = zRestColorwayMaterialArray[colorwayIndex].texture[i];

      if (!zip.file(zRestTexture.file)) {
        const temp = zRestTexture.file;
        const list = temp.split('/');
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
          texture = _nameToTextureMap.get(textureFileName);

          if (!texture) {
            texture = await loadTexture(zip, textureFileName);
            _nameToTextureMap.set(textureFileName, texture);
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
            if (version >= 2) { // 버전 2 이상일 때만 노말맵 지원. 그렇지 않으면 1.0에서 제작된 zrest 파일은 desaturated 된 이미지가 normal map 으로 인식되었던 버그때문에 렌더링 이상해진다.
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
        const grot = new THREE.Matrix4();
        grot.identity();
        grot.makeRotationZ(-THREE.Math.degToRad(property.colorwayObjectTextureTransformation[colorwayIndex].angle));

        const gtra = new THREE.Matrix4();
        gtra.identity();
        gtra.makeTranslation(-property.colorwayObjectTextureTransformation[colorwayIndex].translate.x, -property.colorwayObjectTextureTransformation[colorwayIndex].translate.y, 0.0);

        threeJSMaterial.uniforms.gRotMatrix.value = grot;
        threeJSMaterial.uniforms.gTransMatrix.value = gtra;
      }
    }

    // FIXME: check to assign and dispose of 'texture' variable correctly. It seems works but not matched.
    texture && texture.dispose();
  }
};

