/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

// import { extractTexture } from "@/lib/clo/readers/zrest_texture";
import { TEXTURE_TYPE, RENDER_FACE_TYPE } from "@/lib/clo/readers/Predefined";
import { makeMaterial, buildMaterial } from "./zrest_material";

const getFilenameFromURL = (url) => {
  const urlSplit = url.split("/");
  return urlSplit[urlSplit.length - 1];
};

export async function loadZrestTexture({
  matProperty: matProperty,
  threeJSMaterial: threeJSMaterial,
  zrestProperty: zProperty,
  jsZip: zip,
}) {
  const material = matProperty.colorwayMaterials[zProperty.colorwayIndex];
  if (!material) {
    console.error("material missing");
  }
  const version = zProperty.version;

  // Load Texture File
  let bHasTexture = false;
  let texture;

  for (const textureInfo of material.texture) {
    if (!zip.file(textureInfo.file)) {
      const textureFilename = getFilenameFromURL(textureInfo.file);
      const threeJSTexture = await getThreeJSTexture(
        textureFilename,
        zip,
        zProperty
      );

      if (threeJSTexture) {
        texture = await setTextureMaterial({
          textureInfo: textureInfo,
          threeJSTexture: threeJSTexture,
          threeJSMaterial: threeJSMaterial,
          zrestVersion: version,
        });
        bHasTexture = true;
      } else {
        console.warn(textureFilename + " is not found.");
      }
    }
  }

  if (
    bHasTexture &&
    matProperty.colorwayObjectTextureTransformation.length > 0
  ) {
    setTextureProperty({
      threeJSMaterial: threeJSMaterial,
      materialInfo: matProperty,
      colorwayIndex: zProperty.colorwayIndex,
    });
  }
  // FIXME: check to assign and dispose of 'texture' variable correctly. It seems works but not matched.
  texture && texture.dispose();
}

// TODO: 이 함수는 실제로 load를 실행하고 있지는 않음, 이름을 바꿔줘야 함.
export async function loadTextureDisassembly({
  matProperty: matProperty,
  zrestProperty: zProperty,
}) {
  const material = matProperty.colorwayMaterials[zProperty.colorwayIndex];
  const listTextureFilename = [];
  for (const textureInfo of material.texture) {
    const textureFilename = getFilenameFromURL(textureInfo.file);
    listTextureFilename.push(textureFilename);
  }

  return listTextureFilename;
}

export async function setTexturePropertyDisassembly({
  textureFilename: textureFilename,
  threeJSTexture: threeJSTexture,
  zProperty: zProperty,
  materialInformationMap: materialInformationMap,
}) {
  const version = zProperty.version;
  const colorwayIndex = zProperty.colorwayIndex;
  const matMeshIdList = zProperty.listMapTextureMatMeshId[colorwayIndex].get(
    textureFilename
  );
  console.log(textureFilename, colorwayIndex);

  if (textureFilename === "seam_puckering_2ol97pf293f2sdk98.png") return;
  if (!matMeshIdList) {
    console.warn("matMeshID missing: " + textureFilename);
    // console.warn(matMeshIdList);
    // console.warn(zProperty.listMapTextureMatMeshId[colorwayIndex]);
    return;
  }

  matMeshIdList.map(async (matMeshId) => {
    const materialInfo = materialInformationMap.get(matMeshId);
    const listTextureInfo =
      materialInfo.colorwayMaterials[colorwayIndex].texture;
    if (!zProperty.matMeshMap.get(matMeshId)) {
      console.error(matMeshId + " missing");
      return;
    }
    const threeJSMaterial = zProperty.matMeshMap.get(matMeshId).material;

    listTextureInfo.map(async textureInfo => {
      if (textureInfo.file.includes(textureFilename)) {
        await setTextureMaterial({
          textureInfo: textureInfo,
          threeJSTexture: threeJSTexture,
          threeJSMaterial: threeJSMaterial,
          zrestVersion: version,
          bUseSeamPuckeringNormalMap:
              zProperty.seamPuckeringNormalMap !== undefined &&
              zProperty.seamPuckeringNormalMap !== null,
        });

        setTextureProperty({
          threeJSMaterial: threeJSMaterial,
          materialInfo: materialInfo,
          colorwayIndex: colorwayIndex,
        });
      }
    })
  });
}

const getThreeJSTexture = async (filename, jsZip, zProperty) => {
  const loaded = zProperty.nameToTextureMap.get(filename); // NOTE: Three.js Texture
  if (loaded) return loaded;

  const texture = await extractTexture(jsZip, filename);
  if (!texture) return;
  zProperty.nameToTextureMap.set(filename, texture);
  return texture;
};

const setTextureProperty = ({
  threeJSMaterial: threeJSMaterial,
  materialInfo: matProperty,
  colorwayIndex: colorwayIndex,
}) => {
  // console.log({
  //   setTextureProperty: "->",
  //   threeJSMaterial: threeJSMaterial,
  //   materialInfo: matProperty,
  //   colorwayIndex: colorwayIndex,
  // });
  // console.log(colorwayIndex, matProperty.colorwayObjectTextureTransformation);
  const transformed = matProperty.colorwayObjectTextureTransformation;
  if (transformed.length <= 0) {
    // console.error("transformed empty: " + transformed);
    // console.error(matProperty);
    return;
  }

  const grot = new THREE.Matrix4();
  grot.identity();
  grot.makeRotationZ(-THREE.Math.degToRad(transformed[colorwayIndex].angle));

  const gtra = new THREE.Matrix4();
  gtra.identity();

  gtra.makeTranslation(
    -transformed[colorwayIndex].translate.x,
    -transformed[colorwayIndex].translate.y,
    0.0
  );

  threeJSMaterial.uniforms.gRotMatrix.value = grot;
  threeJSMaterial.uniforms.gTransMatrix.value = gtra;
};

const setTextureMaterial = async ({
  threeJSTexture: texture,
  textureInfo: textureInfo,
  threeJSMaterial: threeJSMaterial,
  zrestVersion: version,
}) => {
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
  rotMatrix.makeRotationZ(-THREE.Math.degToRad(textureInfo.angle));

  const transMatrix = new THREE.Matrix4();
  transMatrix.identity();
  transMatrix.makeTranslation(
    -textureInfo.translate.x,
    -textureInfo.translate.y,
    0.0
  );

  const scaleMatrix = new THREE.Matrix4();
  scaleMatrix.identity();
  scaleMatrix.makeScale(
    1.0 / textureInfo.scale.x,
    1.0 / textureInfo.scale.y,
    1.0
  );

  const transform = new THREE.Matrix4();
  transform.identity();
  transform.multiply(scaleMatrix);
  transform.multiply(rotMatrix);
  transform.multiply(transMatrix);

  if (textureInfo.type === TEXTURE_TYPE.GLOBAL_MAP) {
    threeJSMaterial.uniforms.sGlobal.value = texture;
    threeJSMaterial.uniforms.bUseGlobal.value = 1;
    threeJSMaterial.uniforms.matGlobal.value = transform;
  } else if (textureInfo.type === TEXTURE_TYPE.DIFFUSE_MAP) {
    if (version <= 2) {
      threeJSMaterial.uniforms.sDiffuse.value = texture;
      threeJSMaterial.uniforms.bUseDiffuse.value = 1;
      threeJSMaterial.uniforms.matDiffuse.value = transform;
    }
  } else if (textureInfo.type === TEXTURE_TYPE.AMBIENT_MAP) {
    if (version <= 2) {
      threeJSMaterial.uniforms.sAmbient.value = texture;
      threeJSMaterial.uniforms.bUseAmbient.value = 1;
      threeJSMaterial.uniforms.matAmbient.value = transform;
    }
  } else if (textureInfo.type === TEXTURE_TYPE.SPECULAR_MAP) {
    if (version <= 2) {
      threeJSMaterial.uniforms.sSpecular.value = texture;
      threeJSMaterial.uniforms.bUseSpecular.value = 1;
      threeJSMaterial.uniforms.matSpecular.value = transform;
    }
  } else if (textureInfo.type === TEXTURE_TYPE.NORMAL_MAP) {
    if (version >= 2) {
      // 버전 2 이상일 때만 노말맵 지원. 그렇지 않으면 1.0에서 제작된 zrest 파일은 desaturated 된 이미지가 normal map 으로 인식되었던 버그때문에 렌더링 이상해진다.
      threeJSMaterial.uniforms.sNormal.value = texture;
      threeJSMaterial.uniforms.bUseNormal.value = 1;
      threeJSMaterial.uniforms.matNormal.value = transform;
    }
  } else if (textureInfo.type === TEXTURE_TYPE.TRANSPARENTT_MAP) {
    threeJSMaterial.uniforms.sTransparent.value = texture;
    threeJSMaterial.uniforms.bUseTransparent.value = 1;
    threeJSMaterial.uniforms.matTransparent.value = transform;
  } else if (textureInfo.type === TEXTURE_TYPE.GLOSSINESS_MAP) {
    if (version >= 3) {
      threeJSMaterial.uniforms.sGlossiness.value = texture;
      threeJSMaterial.uniforms.bUseGlossinessMap.value = 1;
      threeJSMaterial.uniforms.matGlossiness.value = transform;

      if (textureInfo.colorInverted) {
        threeJSMaterial.uniforms.m_bInvertGlossinessMap.value = 1;
      } else {
        threeJSMaterial.uniforms.m_bInvertGlossinessMap.value = 0;
      }

      threeJSMaterial.uniforms.m_GlossinessMapIntensity.value =
        textureInfo.intensity;
    }
  }

  return texture;
};

export async function extractTexture(zip, textureFileName) {
  console.log(textureFileName);
  const file = zip.file(textureFileName);
  if (!file) {
    return null;
  }

  const arraybuffer = await file.async("arrayBuffer");
  return getTexture(arraybuffer);
}

export const getTexture = (textureArrayBuffer) => {
  const bytes = new Uint8Array(textureArrayBuffer);
  const blob = new Blob([bytes.buffer]);
  const url = URL.createObjectURL(blob);
  const reject = () => {
    console.log("texture load error");
  };

  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    return loader.load(
      url,
      (texture) => {
        URL.revokeObjectURL(url);
        resolve(texture);
      },
      undefined,
      (err) => {
        // console.log("An error happened.");
        console.error(err);
        console.log(url);
        return null;
      }
    );
  });
};
