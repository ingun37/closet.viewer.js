/* eslint-disable require-jsdoc */
"use strict";
import * as THREE from "@/lib/threejs/three";

import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";
import { RENDER_FACE_TYPE } from "@/lib/clo/readers/Predefined";

import MatMeshManager from "./zrest_matMesh";

export default class MeshFactory {
  constructor({ matMeshMap: matMeshMap, matShapeMap: matShapeMap, materialInformationMap: materialInformationMap, camera: loadedCamera, zrestProperty: zrestProperty, zrestElement: zrestElement }) {
    this.matMeshMap = matMeshMap;
    this.materialList = [];
    this.matShapeMap = matShapeMap;
    this.materialInformationMap = materialInformationMap;
    this.camera = loadedCamera;
    this.zProperty = zrestProperty;
    // this.zElement = zrestElement;
    // this.drawMode = zrestProperty.drawMode;
    this.colorwaySize = this.zProperty.colorwaySize;

    this.rootMap = new Map();

    this.zProperty.matMeshMap = this.matMeshMap;
    this.zProperty.matShapeMap = this.matShapeMap;
    // this.zElement.matMeshMap = this.matMeshMap;
    // this.zElement.matShapeMap = this.matShapeMap;

    this.matmeshManager = new MatMeshManager({
      // matMeshMap: this.matMeshMap,
      // matShapeMap: this.matShapeMap,
      materialInformationMap: this.materialInformationMap,
      camera: this.camera,
      zrestProperty: this.zProperty
      // zrestElement: this.zElement
      // drawMode: this.drawMode
    });
  }

  buildRest = (rootMap, loadedCamera) => {
    const parseMapColorWay = () => {
      const mapColorways = rootMap.get("mapColorWay");
      if (mapColorways !== undefined) {
        // NOTE: CLO SW에서 선택한 기본 colorIndex(로 예상됨)
        this.zProperty.colorwayIndex = mapColorways.get("uiCurrentCoordinationIndex");
        this.colorwaySize = mapColorways.get("listColorway").length;
        this.zProperty.colorwaySize = this.colorwaySize;
      }
    };

    const parseListMaterial = () => {
      if (zrestVersion < 4) return;

      const listMaterial = rootMap.get("listMaterial");
      this.zProperty.materialList = listMaterial;
      if (listMaterial === undefined) {
        console.error("listMaterial missing.");
        return;
      }

      for (let j = 0; j < listMaterial.length; ++j) {
        const material = this.setMaterial(listMaterial[j]);
        this.materialList.push(material);
      }

      console.log(this.materialList);
      console.log("parseListMaterial done");
    };

    const parseListMatMesh = () => {
      const listMatMesh = rootMap.get("listMatMesh") || rootMap.get("listMaterials");

      if (listMatMesh === undefined) {
        console.error("ERROR: MatMesh missing");
        return;
      }

      for (let i = 0; i < listMatMesh.length; ++i) {
        const matMesh = this.setMatMesh(listMatMesh[i]);
        // console.log(matMesh);

        if (zrestVersion > 4) {
          const renderFace = listMatMesh[i].get("enRenderFace");
          const listMaterialInfo = listMatMesh[i].get("listMaterialInfo");

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
                matMesh.colorwayMaterials.push(this.materialList[mapMaterialInfo.index]);
              }
            }
          }
        } else {
          // const listMaterial =
          //   zrestVersion > 4
          //     ? rootMap.get("listMaterial")
          //     : zRestMatMeshArray[i].get("listMaterial");

          const listMaterial = listMatMesh[i].get("listMaterial");

          if (listMaterial !== undefined) {
            for (let j = 0; j < listMaterial.length; ++j) {
              const material = this.setMaterial(listMaterial[j]);
              matMesh.colorwayMaterials.push(material);
            }
          }
        }

        this.materialInformationMap.set(listMatMesh[i].get("uiMatMeshID"), matMesh);
      }

      // console.log(this.materialList);
      // console.log(this.materialInformationMap);
      // console.log("parseListMatMesh done");
    };

    // Colorway에 따른 texture map 생성 (by TKAY)
    const initListMapTextureMatMeshId = () => {
      // TODO: 이 함수는 따로 묶을 것.
      const getFilename = (textureURL) => {
        const splitTextureURL = textureURL.split("/");
        const filenameWithToken = splitTextureURL[splitTextureURL.length - 1];
        const filenameWithoutToken = filenameWithToken.split("?")[0];

        return filenameWithoutToken;
      };

      // TODO: 이 부분 고치자
      this.zProperty.listMapTextureMatMeshId = [];
      // const listMTMMId = [];
      for (let i = 0; i < this.colorwaySize; ++i) {
        this.zProperty.listMapTextureMatMeshId.push(new Map());
      }

      const listMTMMId = this.zProperty.listMapTextureMatMeshId;

      this.materialInformationMap.forEach((value, matMeshId) => {
        const colorwayMaterials = value.colorwayMaterials;
        for (let i = 0; i < this.zProperty.colorwaySize; ++i) {
          //colorwayMaterials.forEach((material, colorway) => {
          const material = colorwayMaterials[i];
          const colorway = i;
          const textures = material.texture;

          if (textures.length > 0) {
            textures.forEach((texture) => {
              const filenameWithPath = texture.file;
              const filename = getFilename(filenameWithPath);
              const currMap = listMTMMId[colorway];
              // console.log(filename);
              // console.log(colorway);
              //console.log(listMTMMId);

              // NOTE: element 중복 방지
              if (currMap.has(filename)) {
                const matMeshIdList = currMap.get(filename);
                if (matMeshIdList.indexOf(matMeshId) === -1) {
                  matMeshIdList.push(matMeshId);
                }
              } else {
                currMap.set(filename, [matMeshId]);
              }
            });
          }
        }
      });
    };

    // console.warn({ rootMap: rootMap, loadedCamera: loadedCamera });

    const zrestVersion = this.parseVersion(rootMap);
    this.materialInformationMap.clear();
    this.rootMap = rootMap;
    const camLtoW = rootMap.get("m4CameraLocalToWorldMatrix");
    this.getCameraLtoW(camLtoW, this.zProperty.loadedCamera);

    parseMapColorWay();

    parseListMaterial();

    parseListMatMesh();

    // console.log(rootMap);
    // await this.buildRest(rootMap, loadedCamera);

    initListMapTextureMatMeshId();

    console.log("buildRest done.");
  };

  buildDracos = async (zrestLoader, dracosData, retObject, loadedCamera) => {
    const parseMapGeometryDisassembly = async () => {
      console.log("parseMapGeometry@buildDracos Begin");

      // Parse mapGeometry from rootMap
      const mapGeometry = this.zProperty.rootMap.get("mapGeometry");
      if (!mapGeometry) {
        console.error("mapGeometry missing");
        // NOTE: Return input object that nothing changed
        return retObject;
      } else console.log(mapGeometry);

      if (zrestLoader.aborted) return;

      const colorwayIndex = this.zProperty.colorwayIndex;
      // TODO: 투명 여부에 따른 mesh 순서 파악해야 함
      let tf = await this.matmeshManager.getMatMeshs(zrestLoader, mapGeometry, dracosData, false, this.materialInformationMap, colorwayIndex, this.camera, true);
      retObject.add(tf);
      if (zrestLoader.aborted) return;

      tf = await this.matmeshManager.getMatMeshs(zrestLoader, mapGeometry, dracosData, true, this.materialInformationMap, colorwayIndex, this.camera);
      retObject.add(tf);

      if (zrestLoader.aborted) return;
      // retObject.add(tf);

      console.log("parseMapGeometry@buildDracos done");
    };
    this.buildRest(this.zProperty.rootMap, loadedCamera);
    await parseMapGeometryDisassembly();

    console.log("buildDracos done.");
    return retObject;
  };

  build = async (zrestLoader, rootMap, jsZip, retObject, loadedCamera) => {
    const parseMapGeometry = async () => {
      console.log("parseMapGeometry Begin");
      // Parse mapGeometry from rootMap
      const mapGeometry = rootMap.get("mapGeometry");
      if (!mapGeometry) {
        // NOTE: Return input object that nothing changed
        return retObject;
      }

      if (zrestLoader.aborted) return;

      console.warn("Assembled ZRest build @ MeshFactory");
      const colorwayIndex = this.zProperty.colorwayIndex;
      console.log(this.zProperty);
      console.log(colorwayIndex);
      // 불투명 부터 추가해서 불투명 object 부터 그리기
      let tf = await this.matmeshManager.getMatMeshs(zrestLoader, mapGeometry, jsZip, false, this.materialInformationMap, colorwayIndex, this.camera);
      if (zrestLoader.aborted) return;
      retObject.add(tf);
      console.log("first cycle");

      // 투명한것 추가
      tf = await this.matmeshManager.getMatMeshs(zrestLoader, mapGeometry, jsZip, true, this.materialInformationMap, colorwayIndex, this.camera);
      if (zrestLoader.aborted) return;
      retObject.add(tf);
      console.log("second cycle");
    };

    this.buildRest(rootMap, loadedCamera);

    await parseMapGeometry();
    this.matShapeMap = this.matmeshManager.matShapeMap;

    console.log("build complete.");
    // FIXME: synchronize return type
    return retObject;
  };

  getStyleLineMap = () => {
    return this.matmeshManager.getStyleLineMap();
  };

  getColorwaySize = () => {
    return this.colorwaySize;
  };

  parseVersion = (rootMap) => {
    const zrestVersion = rootMap.get("uiVersion") || 1;
    this.zProperty.version = zrestVersion;

    console.log("ZREST version: " + this.zProperty.version);

    return zrestVersion;
  };

  getCameraLtoW = (LtoWMatrix, loadedCamera) => {
    if (!LtoWMatrix) return false;

    // NOTE: FIX HERE
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

  setMaterial = (source) => {
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

    this.setMaterialTexture(source, material);

    return material;
  };

  setMaterialTexture = (source, material) => {
    const tex = source.get("listTexture");
    if (tex === undefined || tex == null) return;

    // NOTE: listTexture의 length는 colorway 갯수와 상관 없음
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

    return material;
  };

  setMatMesh = (matMesh) => {
    // TODO: 'zRestColorwayMaterials' is assigned every loop. Should be improved.
    const material = {
      bPattern: false, // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
      bPolygonOffset: false,
      zOffset: 0.0,
      colorwayMaterials: [],
      colorwayObjectTextureTransformation: []
    };

    material.id = matMesh.get("uiMatMeshID");
    material.bPattern = matMesh.get("bPattern"); // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
    material.bPolygonOffset = matMesh.get("bPolygonOffset");

    if (material.bPolygonOffset === undefined) {
      material.bPolygonOffset = material.bPattern === 0;
    } // 이전 버전에서는 이렇게 설정해 주고 있었다.. bPattern은 이제 사용하지 않는다.

    material.zOffset = matMesh.get("fZOffset");
    if (material.zOffset === undefined) {
      material.zOffset = 0.0;
    } else {
      material.bPolygonOffset = false;
    } // zOffset 사용하는 버전에서는 bPolygonOffset 사용하지 않는다.

    // NOTE: 여기는 colorway와 상관 있는걸까? 있는 듯...
    const listTexInfo = matMesh.get("listTexInfo");
    if (listTexInfo !== undefined) {
      for (let j = 0; j < listTexInfo.length; ++j) {
        const info = {
          angle: 0.0,
          translate: { x: 0.0, y: 0.0 }
        };

        info.angle = listTexInfo[j].get("fAngle");
        info.translate = listTexInfo[j].get("v2Trans");

        material.colorwayObjectTextureTransformation.push(info);
      }
    }
    return material;
  };
}

export class MeshFactoryAsync {}
