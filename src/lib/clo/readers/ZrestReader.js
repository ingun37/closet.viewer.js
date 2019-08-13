'use strict';

/* eslint-disable require-jsdoc */
import * as THREE from '@/lib/threejs/three';
import JSZip from '@/lib/jszip/dist/jszip';
import {readHeader} from '@/lib/clo/file/FileHeader';
import {readByteArray, readMap} from '@/lib/clo/file/KeyValueMapReader';
import {envDiffuseMap, envSpecularMap} from '@/lib/clo/file/EnvMapReader';

import fragmentShader from 'raw-loader!@/lib/clo/shader/fragmentShader.frag';
import pbrFragmentShader from 'raw-loader!@/lib/clo/shader/pbrFragmentShader.frag';
import vertexShader from 'raw-loader!@/lib/clo/shader/vertexShader.vert';
import pbrVertexShader from 'raw-loader!@/lib/clo/shader/pbrVertexShader.vert';

const _gNameToTextureMap = new Map();
let _gSeamPuckeringNormalMap = null;
let _fileReaderSyncSupport = false;
const _syncDetectionScript = 'onmessage = function(e) { postMessage(!!FileReaderSync); };';
const _drawMode = {wireframe: {pattern: false, button: false}};

// !!!! CLO에 있는 TextureType 그대로 가져왔으므로 CLO 변경되면 여기서도 변경해 줘야 함
const TextureType =
    {
      GLOBAL_MAP: 0,
      DIFFUSE_MAP: 1,
      AMBIENT_MAP: 2,
      SPECULAR_MAP: 3,
      NORMAL_MAP: 4,
      DISPLACEMENT_MAP: 5,
      TRANSPARENTT_MAP: 6, // TRANSPARENT 가 win뭐시기에서 이미 정의되어서 이렇게 씀
      DIFFUSE_OVERLAY_MAP: 7,
      SPECULAR_OVERLAY_MAP: 8,
      REFLECTIVE_MAP: 9,
      EMISSION_MAP: 10,
      GLOSSINESS_MAP: 11, // PBR glossiness map,
      METALNESS_MAP: 12,
      // MAX_TEXTURE_TYPE // 항상 마지막에 위치시키기
    };

const RenderFace =
    {
      MV_DOUBLE_FACE: 0,
      MV_FRONT_FACE: 1,
      MV_BACK_FACE: 2,
    };

const MATMESH_TYPE = {
  PATTERN_MATMESH: 0,
  TRIM_MATMESH: 1,
  PRINTOVERLAY_MATMESH: 2,
  BUTTONHEAD_MATMESH: 3,
  NORMAL_MATMESH: 4,
  AVATAR_MATMESH: 5,
  STITCH_MATMESH: 6,
  BUTTONHOLE_MATMESH: 7,
};

export default function ZRestLoader({scene, marker, camera, controls, cameraPosition}, manager) {
  this.scene = scene;
  this.markerManager = marker;
  this.camera = camera;
  this.controls = controls;
  this.cameraPosition = cameraPosition;
  this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

  this.materialList = [];
  this.matMeshList = [];
  this.materialInformationMap = null;
  this.currentColorwayIndex = 0;
  this.colorwaySize = 0;
  this.jsZip = null;

  this.MATMESH_TYPE = MATMESH_TYPE;
};

ZRestLoader.prototype = {
  constructor: ZRestLoader,

  clearMaps() {
    _gNameToTextureMap.clear();
    _gSeamPuckeringNormalMap = null;
  },

  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType('arraybuffer');
    loader.load(url, (data) => {
      this.parse(data, onLoad);
    }, onProgress, onError);
  },

  setPath(value) {
    this.path = value;
  },

  parse(data, onLoad) {
    this.data = data;
    this.onLoad = onLoad;

    const headerOffset = {Offset: 0};
    const blob = new Blob([data]);
    const dataView = new DataView(data);
    const header = readHeader(dataView, headerOffset);

    return this.readZrestFromBlobForWeb(blob, header);
  },

  readZrestFromBlobForWeb(blob, header) {
    const object3D = new THREE.Object3D();
    object3D.name = 'object3D';

    const reader = new FileReader();

    const contentBlob = blob.slice(header.FileContentPos, header.FileContentPos + header.FileContentSize);

    let rootMap;
    let restName = '';
    // TODO: consider change names. btn and bth are confusing easily
    const btnNameList = [];
    const bthNameList = [];

    reader.onload = (e) => {
      this.jsZip = new JSZip();
      this.jsZip.loadAsync(e.target.result).then( (zip) => {
        const keyList = Object.keys(zip.files);
        keyList.forEach((value) => {
          const list = value.split('.');
          const extension = list[list.length - 1];

          switch (extension) {
            case 'rest':
              restName = value;
              break;
            case 'btn':
              btnNameList.push(value);
              break;
            case 'bth':
              bthNameList.push(value);
              break;
            case 'png':
            case 'jpg':
            case 'pos':
              break;
            default:
          };
        });

        const fileOffset = {Offset: 0};
        zip.file(restName).async('arrayBuffer').then( async (restContent) => {
          const dataView = new DataView(restContent);

          console.log('pac file size = ' + dataView.byteLength);

          rootMap = readMap(dataView, fileOffset);

          // seam puckering normal map 로드
          _gSeamPuckeringNormalMap = await this.loadTexture(zip, 'seam_puckering_2ol97pf293f2sdk98.png');

          const loadedCamera = {
            ltow: new THREE.Matrix4(),
            bLoaded: false,
          };

          await this.meshFactory(rootMap, zip, object3D, loadedCamera);

          // 여기가 실질적으로 Zrest 로드 완료되는 시점
          this.onLoad(object3D, loadedCamera, this.data);

          // add 할때 cameraPosition 이 있으면 설정해준다.
          if (this.cameraPosition) {
            this.camera.position.copy(this.cameraPosition);
          }

          // 임시 데이터 clear
          _gNameToTextureMap.clear();
        });
      });
    };

    reader.readAsArrayBuffer(contentBlob);
  },

  getObjectsCenter(scene) {
    const box = new THREE.Box3();
    box.expandByObject(scene);
    const center = new THREE.Vector3(0.5 * (box.min.x + box.max.x), 0.5 * (box.min.y + box.max.y), 0.5 * (box.min.z + box.max.z));
    return center;
  },

  zoomToObjects(loadedCamera, scene) {
    // scene 의 모든 geometry 방문하면서 bounding cube 계산해서 전체 scene bounding cube 계산
    const center = new THREE.Vector3();
    center.copy(this.getObjectsCenter(scene));

    if (loadedCamera.bLoaded) {
      this.camera.position.copy(new THREE.Vector3(loadedCamera.ltow.elements[12], loadedCamera.ltow.elements[13], loadedCamera.ltow.elements[14]));

      const xAxis = new THREE.Vector3();
      const yAxis = new THREE.Vector3();
      const zAxis = new THREE.Vector3();
      loadedCamera.ltow.extractBasis(xAxis, yAxis, zAxis);

      zAxis.negate();

      center.sub(this.camera.position);

      // TODO: check again if below are the best solution
      let dotProd = center.dot(zAxis);
      if (dotProd < 0.0) { // center가 이상하게 들어오는 경우 예외 처리. trim이 아주 먼 위치 로드된 경우 center가 이상하게 들어온다. 제대로 해결하려면 dll에서 convert시 camera target 도 읽어들이는게 좋을 듯.
        center.x = center.y = center.z = 0.0; // 맨 처음에는 center를 원점으로 해서. 그래야 무조건 8000.0 떨어뜨리는 것보다 view 회전이 좀 더 잘 된다.
        center.sub(this.camera.position);
        dotProd = center.dot(zAxis);

        if (dotProd < 0.0) { // 그래도 이상하면.
          dotProd = 8000.0;
        }
      }

      zAxis.multiplyScalar(dotProd);
      zAxis.add(this.camera.position);
      this.controls.target.copy(zAxis);
    } else {
      const box = new THREE.Box3();
      box.expandByObject(scene);

      // trim이나 이상한 점 하나가 너무 동떨어진 경우에는 정해진 center 바라보게 하자
      const maxDistance = 10000.0;
      if (box.min.x < -maxDistance || box.min.y < -1000.0 || box.min.z < -maxDistance || box.max.x > maxDistance || box.max.y > maxDistance || box.max.z > maxDistance) {
        center.x = 0.0;
        center.y = 1100.0;
        center.z = 0.0;
        this.controls.target.copy(center);
        center.z = 8000.0;
        this.camera.position.copy(center);
      } else {
        // 전체 scene bounding cube 의 중심을 바라보고 cube 를 fit하도록 camera zoom 설정
        this.camera.position.copy(center);
        this.camera.position.z = box.max.z + 0.5 * (box.max.y - box.min.y + 100.0) / Math.tan((this.camera.fov / 2) * Math.PI / 180.0); // 위아래로 100 mm 정도 여유있게
        this.controls.target.copy(center);
      }
    }
  },

  async loadTexture(zip, textureFileName) {
    const file = zip.file(textureFileName);
    if (!file) {
      return null;
    }

    const arraybuffer = await file.async('arrayBuffer');
    const bytes = new Uint8Array(arraybuffer);
    const blob = new Blob([bytes.buffer]);
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      return loader.load(url, (texture) => {
        URL.revokeObjectURL(url);
        resolve(texture);
      });
    });
  },

  async meshFactory(map, zip, retObject, loadedCamera) {
    let version = map.get('uiVersion');

    if (version === undefined) {
      version = 1;
    }

    if (version > 4) {
      await this.meshFactory2(map, zip, retObject, loadedCamera);
      return;
    }

    this.gVersion = version;

    const mapCameraLtoW = map.get('m4CameraLocalToWorldMatrix');
    if (mapCameraLtoW !== undefined) {
      loadedCamera.bLoaded = true;
      loadedCamera.ltow.set(mapCameraLtoW.a00, mapCameraLtoW.a01, mapCameraLtoW.a02, mapCameraLtoW.a03,
          mapCameraLtoW.a10, mapCameraLtoW.a11, mapCameraLtoW.a12, mapCameraLtoW.a13,
          mapCameraLtoW.a20, mapCameraLtoW.a21, mapCameraLtoW.a22, mapCameraLtoW.a23,
          mapCameraLtoW.a30, mapCameraLtoW.a31, mapCameraLtoW.a32, mapCameraLtoW.a33);
    }

    const colorways = map.get('mapColorWay');
    if (colorways === undefined) {

    } else {
      this.currentColorwayIndex = colorways.get('uiCurrentCoordinationIndex');
      this.colorwaySize = colorways.get('listColorway').length;
    }

    let zRestMatMeshArray = map.get('listMaterials'); // 옛날 버전 이름
    if (zRestMatMeshArray === undefined) {
      zRestMatMeshArray = map.get('listMatMesh');
    } // 최신 버전에서 사용한 명확한 이름

    this.materialInformationMap = new Map();

    if (zRestMatMeshArray === undefined) {

    } else {
      for (let i = 0; i < zRestMatMeshArray.length; ++i) {
        const zRestColorwayMaterials = {
          bpattern: false, // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
          bPolygonOffset: false,
          zOffset: 0.0,
          colorwayMaterials: [],
          colorwayObjectTextureTransformation: [],
        };

        const id = zRestMatMeshArray[i].get('uiMatMeshID');
        zRestColorwayMaterials.bpattern = zRestMatMeshArray[i].get('bPattern'); // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
        zRestColorwayMaterials.bPolygonOffset = zRestMatMeshArray[i].get('bPolygonOffset');
        if (zRestColorwayMaterials.bPolygonOffset === undefined) {
          zRestColorwayMaterials.bPolygonOffset = (zRestColorwayMaterials.bpattern === 0);
        } // 이전 버전에서는 이렇게 설정해 주고 있었다.. bPattern은 이제 사용하지 않는다.

        zRestColorwayMaterials.zOffset = zRestMatMeshArray[i].get('fZOffset');
        if (zRestColorwayMaterials.zOffset === undefined) {
          zRestColorwayMaterials.zOffset = 0.0;
        } else {
          zRestColorwayMaterials.bPolygonOffset = false;
        } // zOffset 사용하는 버전에서는 bPolygonOffset 사용하지 않는다.

        const listTexInfo = zRestMatMeshArray[i].get('listTexInfo');
        if (listTexInfo !== undefined) {
          for (var j = 0; j < listTexInfo.length; ++j) {
            const info = {
              angle: 0.0,
              // scale: null,
              translate: {x: 0.0, y: 0.0},
            };

            info.angle = listTexInfo[j].get('fAngle');
            info.translate = listTexInfo[j].get('v2Trans');

            zRestColorwayMaterials.colorwayObjectTextureTransformation.push(info);
          }
        }

        const listMaterial = zRestMatMeshArray[i].get('listMaterial');
        if (listMaterial !== undefined) {
          for (var j = 0; j < listMaterial.length; ++j) {
            const material = {
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
              renderFace: RenderFace.MV_FRONT_FACE, // 기본값은 두께보기의상이 기본이므로 front로 하자. double 이 아닌 front로 하면 아바타 헤어 투명도가 CLO와 다르게 나오는 문제가 생기긴 하지만

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

              texture: [],
            };

            material.renderFace = listMaterial[j].get('enRenderFace');
            material.bTransparent = listMaterial[j].get('bTransparent');
            material.bPerfectTransparent = listMaterial[j].get('bPerfectTransparent');

            material.ambient = new THREE.Vector3(listMaterial[j].get('v4Ambient').x, listMaterial[j].get('v4Ambient').y, listMaterial[j].get('v4Ambient').z);
            material.diffuse = new THREE.Vector3(listMaterial[j].get('v4Diffuse').x, listMaterial[j].get('v4Diffuse').y, listMaterial[j].get('v4Diffuse').z);
            material.specular = new THREE.Vector3(listMaterial[j].get('v4Specular').x, listMaterial[j].get('v4Specular').y, listMaterial[j].get('v4Specular').z);
            material.emission = new THREE.Vector3(listMaterial[j].get('v4Emission').x, listMaterial[j].get('v4Emission').y, listMaterial[j].get('v4Emission').z);
            material.shininess = listMaterial[j].get('fShininess');
            material.alpha = listMaterial[j].get('v4Diffuse').w;

            if (material.bPerfectTransparent !== undefined && material.bPerfectTransparent === true) {
              material.alpha = 0.0;
            }

            const normalIntensity = listMaterial[j].get('iNormalIntensity');
            if (normalIntensity !== undefined && normalIntensity !== null) {
              material.normalMapIntensityInPercentage = normalIntensity * 10.0;
            } // 기존에 최대 10인 intensity여서 10만 곱해서 최대 100% 로 맞춘다.
            else {
              material.normalMapIntensityInPercentage = listMaterial[j].get('iNormalIntensityInPercentage');
            }

            material.base = new THREE.Vector3(listMaterial[j].get('v3BaseColor').x, listMaterial[j].get('v3BaseColor').y, listMaterial[j].get('v3BaseColor').z);


            material.blendFuncSrc = listMaterial[j].get('uiBlendFuncSrc');
            material.blendFuncDst = listMaterial[j].get('uiBlendFuncDst');
            material.blendColor = new THREE.Vector3(listMaterial[j].get('v4BlendColor').x, listMaterial[j].get('v4BlendColor').y, listMaterial[j].get('v4BlendColor').z);

            material.opaqueMode = listMaterial[j].get('enOpaqueMode');
            material.ambientIntensity = listMaterial[j].get('fAmbientIntensity');
            material.diffuseIntensity = listMaterial[j].get('fDiffuseIntensity');
            material.zero = listMaterial[j].get('fZero');

            // pbr
            material.materialType = listMaterial[j].get('iMaterialType');
            if (material.materialType === undefined) {
              material.materialType = 0;
            }

            const bUseMetalnessRoughnessPBR = listMaterial[j].get('bUseMetalnessRoughnessPBR');
            if (bUseMetalnessRoughnessPBR !== undefined) {
              material.bUseMetalnessRoughnessPBR = bUseMetalnessRoughnessPBR;
            } else {
              material.bUseMetalnessRoughnessPBR = true;
            }

            material.glossiness = listMaterial[j].get('fGlossiness');
            material.metalness = listMaterial[j].get('fMetalness');
            const bMetal = listMaterial[j].get('bMetal');
            if (bMetal !== undefined && bMetal == false) // metalness 는 m_bMetal 에 의해 지배되고 있음. bMetal은 없어졌지만 기존 버전 호환을 위해 필요함.
            {
              material.metalness = 0.0;
            }

            material.environmentLightIntensity = listMaterial[j].get('fEnvironmentLightIntensity');
            material.cameraLightIntensity = listMaterial[j].get('fCameraLightIntensity');


            if (material.materialType == 6) // velvet
            {
              material.environmentLightIntensity = 0.0;
              material.cameraLightIntensity = 0.7;
            }

            material.frontColorMult = listMaterial[j].get('fFrontColorMult');
            if (material.frontColorMult === undefined) {
              material.frontColorMult = 1.0;
            }

            material.sideColorMult = listMaterial[j].get('fSideColorMult');
            if (material.sideColorMult === undefined) {
              material.sideColorMult = 1.0;
            }

            material.roughnessUIType = listMaterial[j].get('iRoughnessUIType');
            material.reflectionIntensity = listMaterial[j].get('fReflectionIntensity');

            // 다음(v3ReflectionColor)은 사용되고 있지 않은 코드같다..
            const reflectionColor = listMaterial[j].get('v3ReflectionColor');
            if (reflectionColor !== undefined && reflectionColor !== null) {
              material.reflectionColor = new THREE.Vector3(listMaterial[j].get('v3ReflectionColor').x, listMaterial[j].get('v3ReflectionColor').y, listMaterial[j].get('v3ReflectionColor').z);
            } else {
              material.reflectionColor = new THREE.Vector3(0.04, 0.04, 0.04);
            } // 실제로는 사용되지 않는 값이지만 초기화하자

            // silk satin 의 specular color(여기서는 reflection color) 적용하기. 여기 바뀌면 CLO에서도 바꿔 줘야 한다.
            if (material.bUseMetalnessRoughnessPBR == false && material.materialType == 5) // silk & satin
            {
              material.reflectionColor.x = material.reflectionIntensity * (material.base.x + 0.1); // 하얀색 하이라이트가 약하니 0.1 더해준다.
              material.reflectionColor.y = material.reflectionIntensity * (material.base.y + 0.1);
              material.reflectionColor.z = material.reflectionIntensity * (material.base.z + 0.1);

              material.base.x = 0.8 * material.base.x; // CLO쪽과 동일한 코드로 만들기 위해 0.8 곱해준다.
              material.base.y = 0.8 * material.base.y;
              material.base.z = 0.8 * material.base.z;
            } else {
              material.reflectionColor = new THREE.Vector3(0.04, 0.04, 0.04);
            } // linear 0.04 에 해당하는 sRGB 값 59 리턴 -> linear 값이 사용된다.

            const tex = listMaterial[j].get('listTexture');
            if (tex !== undefined && tex !== null) {
              for (let k = 0; k < tex.length; ++k) {
                const textureProperty = {
                  file: '',
                  aifile: '',
                  uniqfile: '',
                  type: 0,

                  angle: 0.0,
                  translate: {x: 0.0, y: 0.0},
                  scale: {x: 0.0, y: 0.0},
                  colorInverted: false,
                  intensity: 1.0,
                };

                textureProperty.file = readByteArray('String', tex[k].get('qsFileName'));
                textureProperty.type = tex[k].get('enType');

                textureProperty.angle = tex[k].get('fSignedAngle');
                textureProperty.translate = tex[k].get('v2Translation');
                textureProperty.scale = tex[k].get('v2Size');

                textureProperty.colorInverted = tex[k].get('bColorInverted');
                textureProperty.intensity = tex[k].get('fIntensity');

                material.texture.push(textureProperty);
              }
            }

            zRestColorwayMaterials.colorwayMaterials.push(material);
          }
        }

        this.materialInformationMap.set(id, zRestColorwayMaterials);
      }
    }

    const geometry = map.get('mapGeometry');
    if (geometry === undefined || geometry === null) {
      return false;
    }

    // 불투명 부터 추가해서 불투명 object 부터 그리기
    let tf = await this.getMatMeshs(geometry, zip, false, version);
    retObject.add(tf);

    // 투명한것 추가
    tf = await this.getMatMeshs(geometry, zip, true, version);
    retObject.add(tf);

    return retObject;
  },

  async meshFactory2(map, zip, retObject, loadedCamera) {
    const version = map.get('uiVersion');

    this.gVersion = version;

    const mapCameraLtoW = map.get('m4CameraLocalToWorldMatrix');
    if (mapCameraLtoW !== undefined) {
      loadedCamera.bLoaded = true;
      loadedCamera.ltow.set(mapCameraLtoW.a00, mapCameraLtoW.a01, mapCameraLtoW.a02, mapCameraLtoW.a03,
          mapCameraLtoW.a10, mapCameraLtoW.a11, mapCameraLtoW.a12, mapCameraLtoW.a13,
          mapCameraLtoW.a20, mapCameraLtoW.a21, mapCameraLtoW.a22, mapCameraLtoW.a23,
          mapCameraLtoW.a30, mapCameraLtoW.a31, mapCameraLtoW.a32, mapCameraLtoW.a33);
    }

    const colorways = map.get('mapColorWay');
    if (colorways === undefined) {

    } else {
      this.currentColorwayIndex = colorways.get('uiCurrentCoordinationIndex');
      this.colorwaySize = colorways.get('listColorway').length;
    }

    // load material list
    const listMaterial = map.get('listMaterial');
    if (listMaterial !== undefined) {
      for (var j = 0; j < listMaterial.length; ++j) {
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
          renderFace: RenderFace.MV_FRONT_FACE, // 기본값은 두께보기의상이 기본이므로 front로 하자. double 이 아닌 front로 하면 아바타 헤어 투명도가 CLO와 다르게 나오는 문제가 생기긴 하지만

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

          texture: [],
        };

        const element = listMaterial[j].get('mapElement');
        if (element !== undefined) {
          material.id = element.get('uiID');
        }

        // material.renderFace = listMaterial[j].get("enRenderFace");
        material.bTransparent = listMaterial[j].get('bTransparent');
        material.bPerfectTransparent = listMaterial[j].get('bPerfectTransparent');

        material.ambient = new THREE.Vector3(listMaterial[j].get('v4Ambient').x, listMaterial[j].get('v4Ambient').y, listMaterial[j].get('v4Ambient').z);
        material.diffuse = new THREE.Vector3(listMaterial[j].get('v4Diffuse').x, listMaterial[j].get('v4Diffuse').y, listMaterial[j].get('v4Diffuse').z);
        material.specular = new THREE.Vector3(listMaterial[j].get('v4Specular').x, listMaterial[j].get('v4Specular').y, listMaterial[j].get('v4Specular').z);
        material.emission = new THREE.Vector3(listMaterial[j].get('v4Emission').x, listMaterial[j].get('v4Emission').y, listMaterial[j].get('v4Emission').z);
        material.shininess = listMaterial[j].get('fShininess');
        material.alpha = listMaterial[j].get('v4Diffuse').w;

        if (material.bPerfectTransparent !== undefined && material.bPerfectTransparent === true) {
          material.alpha = 0.0;
        }

        const normalIntensity = listMaterial[j].get('iNormalIntensity');
        if (normalIntensity !== undefined && normalIntensity !== null) {
          material.normalMapIntensityInPercentage = normalIntensity * 10.0;
        } // 기존에 최대 10인 intensity여서 10만 곱해서 최대 100% 로 맞춘다.
        else {
          material.normalMapIntensityInPercentage = listMaterial[j].get('iNormalIntensityInPercentage');
        }

        material.base = new THREE.Vector3(listMaterial[j].get('v3BaseColor').x, listMaterial[j].get('v3BaseColor').y, listMaterial[j].get('v3BaseColor').z);

        material.blendFuncSrc = listMaterial[j].get('uiBlendFuncSrc');
        material.blendFuncDst = listMaterial[j].get('uiBlendFuncDst');
        material.blendColor = new THREE.Vector3(listMaterial[j].get('v4BlendColor').x, listMaterial[j].get('v4BlendColor').y, listMaterial[j].get('v4BlendColor').z);

        material.opaqueMode = listMaterial[j].get('enOpaqueMode');
        material.ambientIntensity = listMaterial[j].get('fAmbientIntensity');
        material.diffuseIntensity = listMaterial[j].get('fDiffuseIntensity');
        material.zero = listMaterial[j].get('fZero');

        // pbr
        material.materialType = listMaterial[j].get('iMaterialType');
        if (material.materialType === undefined) {
          material.materialType = 0;
        }

        const bUseMetalnessRoughnessPBR = listMaterial[j].get('bUseMetalnessRoughnessPBR');
        if (bUseMetalnessRoughnessPBR !== undefined) {
          material.bUseMetalnessRoughnessPBR = bUseMetalnessRoughnessPBR;
        } else {
          material.bUseMetalnessRoughnessPBR = true;
        }

        material.glossiness = listMaterial[j].get('fGlossiness');
        material.metalness = listMaterial[j].get('fMetalness');
        const bMetal = listMaterial[j].get('bMetal');
        if (bMetal !== undefined && bMetal == false) // metalness 는 m_bMetal 에 의해 지배되고 있음. bMetal은 없어졌지만 기존 버전 호환을 위해 필요함.
        {
          material.metalness = 0.0;
        }

        material.environmentLightIntensity = listMaterial[j].get('fEnvironmentLightIntensity');
        material.cameraLightIntensity = listMaterial[j].get('fCameraLightIntensity');

        if (material.materialType == 6) // velvet
        {
          material.environmentLightIntensity = 0.0;
          material.cameraLightIntensity = 0.7;
        }

        material.frontColorMult = listMaterial[j].get('fFrontColorMult');
        if (material.frontColorMult === undefined) {
          material.frontColorMult = 1.0;
        }

        material.sideColorMult = listMaterial[j].get('fSideColorMult');
        if (material.sideColorMult === undefined) {
          material.sideColorMult = 1.0;
        }

        material.roughnessUIType = listMaterial[j].get('iRoughnessUIType');
        material.reflectionIntensity = listMaterial[j].get('fReflectionIntensity');

        // 다음(v3ReflectionColor)은 사용되고 있지 않은 코드같다..
        const reflectionColor = listMaterial[j].get('v3ReflectionColor');
        if (reflectionColor !== undefined && reflectionColor !== null) {
          material.reflectionColor = new THREE.Vector3(listMaterial[j].get('v3ReflectionColor').x, listMaterial[j].get('v3ReflectionColor').y, listMaterial[j].get('v3ReflectionColor').z);
        } else {
          material.reflectionColor = new THREE.Vector3(0.04, 0.04, 0.04);
        } // 실제로는 사용되지 않는 값이지만 초기화하자

        // silk satin 의 specular color(여기서는 reflection color) 적용하기. 여기 바뀌면 CLO에서도 바꿔 줘야 한다.
        if (material.bUseMetalnessRoughnessPBR == false && material.materialType == 5) // silk & satin
        {
          material.reflectionColor.x = material.reflectionIntensity * (material.base.x + 0.1); // 하얀색 하이라이트가 약하니 0.1 더해준다.
          material.reflectionColor.y = material.reflectionIntensity * (material.base.y + 0.1);
          material.reflectionColor.z = material.reflectionIntensity * (material.base.z + 0.1);

          material.base.x = 0.8 * material.base.x; // CLO쪽과 동일한 코드로 만들기 위해 0.8 곱해준다.
          material.base.y = 0.8 * material.base.y;
          material.base.z = 0.8 * material.base.z;
        } else {
          material.reflectionColor = new THREE.Vector3(0.04, 0.04, 0.04);
        } // linear 0.04 에 해당하는 sRGB 값 59 리턴 -> linear 값이 사용된다.

        const tex = listMaterial[j].get('listTexture');
        if (tex !== undefined && tex !== null) {
          for (let k = 0; k < tex.length; ++k) {
            const textureProperty = {
              file: '',
              aifile: '',
              uniqfile: '',
              type: 0,

              angle: 0.0,
              translate: {x: 0.0, y: 0.0},
              scale: {x: 0.0, y: 0.0},
              colorInverted: false,
              intensity: 1.0,
            };

            textureProperty.file = readByteArray('String', tex[k].get('qsFileName'));
            textureProperty.type = tex[k].get('enType');

            textureProperty.angle = tex[k].get('fSignedAngle');
            textureProperty.translate = tex[k].get('v2Translation');
            textureProperty.scale = tex[k].get('v2Size');

            textureProperty.colorInverted = tex[k].get('bColorInverted');
            textureProperty.intensity = tex[k].get('fIntensity');

            material.texture.push(textureProperty);
          }
        }

        this.materialList.push(material);
      }
    }
    // //

    //
    const zRestMatMeshArray = map.get('listMatMesh'); // 최신 버전에서 사용한 명확한 이름

    this.materialInformationMap = new Map();

    if (zRestMatMeshArray === undefined) {

    } else {
      for (let i = 0; i < zRestMatMeshArray.length; ++i) {
        const zRestColorwayMaterials = {
          bpattern: false, // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
          bPolygonOffset: false,
          zOffset: 0.0,
          // colorwayMaterialIndexList: [],
          colorwayMaterials: [],
          colorwayObjectTextureTransformation: [],
        };

        const id = zRestMatMeshArray[i].get('uiMatMeshID');
        zRestColorwayMaterials.bpattern = zRestMatMeshArray[i].get('bPattern'); // 이제 사용하지 않는다. 기존 버전 호환을 위해 사용할 뿐
        zRestColorwayMaterials.bPolygonOffset = zRestMatMeshArray[i].get('bPolygonOffset');
        if (zRestColorwayMaterials.bPolygonOffset === undefined) {
          zRestColorwayMaterials.bPolygonOffset = (zRestColorwayMaterials.bpattern === 0);
        } // 이전 버전에서는 이렇게 설정해 주고 있었다.. bPattern은 이제 사용하지 않는다.

        zRestColorwayMaterials.zOffset = zRestMatMeshArray[i].get('fZOffset');
        if (zRestColorwayMaterials.zOffset === undefined) {
          zRestColorwayMaterials.zOffset = 0.0;
        } else {
          zRestColorwayMaterials.bPolygonOffset = false;
        } // zOffset 사용하는 버전에서는 bPolygonOffset 사용하지 않는다.

        const listTexInfo = zRestMatMeshArray[i].get('listTexInfo');
        if (listTexInfo !== undefined) {
          for (var j = 0; j < listTexInfo.length; ++j) {
            const info = {
              angle: 0.0,
              // scale: null,
              translate: {x: 0.0, y: 0.0},
            };

            info.angle = listTexInfo[j].get('fAngle');
            info.translate = listTexInfo[j].get('v2Trans');

            zRestColorwayMaterials.colorwayObjectTextureTransformation.push(info);
          }
        }

        //
        const renderFace = zRestMatMeshArray[i].get('enRenderFace');

        //
        const listMaterialInfo = zRestMatMeshArray[i].get('listMaterialInfo');
        if (listMaterialInfo !== undefined) {
          for (var j = 0; j < listMaterialInfo.length; ++j) {
            const mapMaterialInfo = {
              index: -1,
            };

            mapMaterialInfo.index = listMaterialInfo[j].get('iMaterialIndex');
            if (mapMaterialInfo.index < this.materialList.length) {
              this.materialList[mapMaterialInfo.index].renderFace = renderFace; // 나중에 작성자의 의도를 파악해야 함. 미심쩍다...왜 Material이 renderFace 정보를 가지고 있는지 잘 모르겠음.
              zRestColorwayMaterials.colorwayMaterials.push(this.materialList[mapMaterialInfo.index]);
            }
          }
        }

        this.materialInformationMap.set(id, zRestColorwayMaterials);
      }
    }

    const geometry = map.get('mapGeometry');
    if (geometry === undefined || geometry === null) {
      return false;
    }

    // 불투명 부터 추가해서 불투명 object 부터 그리기
    let tf = await this.getMatMeshs(geometry, zip, false, version);
    retObject.add(tf);

    // 투명한것 추가
    tf = await this.getMatMeshs(geometry, zip, true, version);
    retObject.add(tf);

    return retObject;
  },

  async getMatMeshs(map, zip, bLoadTransparentObject, version) {
    let tf = new THREE.Object3D();

    const listChildrenTransformer3D = map.get('listChildrenTransformer3D');
    if (listChildrenTransformer3D) {
      for (let i = 0; i < listChildrenTransformer3D.length; ++i) {
        const childTF3D = listChildrenTransformer3D[i];
        const childTF = await this.getMatMeshs(childTF3D, zip, bLoadTransparentObject, version);
        tf.add(childTF);
      }
    }

    const mapTransformer3D = map.get('mapTransformer3D');
    if (mapTransformer3D) {
      const childTF = await this.getMatMeshs(mapTransformer3D, zip, bLoadTransparentObject, version);
      tf = childTF;
    }

    const mat4 = new THREE.Matrix4().identity();
    if (map.get('m4Matrix')) {
      const localMatrix = map.get('m4Matrix');
      mat4.set(localMatrix.a00, localMatrix.a01, localMatrix.a02, localMatrix.a03,
          localMatrix.a10, localMatrix.a11, localMatrix.a12, localMatrix.a13,
          localMatrix.a20, localMatrix.a21, localMatrix.a22, localMatrix.a23,
          localMatrix.a30, localMatrix.a31, localMatrix.a32, localMatrix.a33);
    }
    tf.applyMatrix(mat4);

    const listMatShape = map.get('listMatShape');
    if (listMatShape) {
      await this.addMatMeshList(zip, listMatShape, tf, bLoadTransparentObject, version);
      // await this.addMatMeshList(this.matMeshList, zip, listMatShape, tf, bLoadTransparentObject, version);
    }

    return tf;
  },


  async makeMaterialForZrest(zip, property, colorwayIndex, bUseSeamPuckeringNormalMap, version) {
    const zRestColorwayMaterialArray = property.colorwayMaterials;
    const material = zRestColorwayMaterialArray[colorwayIndex];

    let rFace;
    if (material.renderFace === undefined) {
      rFace = THREE.FrontSide;
    }// 기본값은 두께보기의상이 기본이므로 front로 하자. double 이 아닌 front로 하면 아바타 헤어 투명도가 CLO와 다르게 나오는 문제가 생기긴 하지만
    else if (material.renderFace === RenderFace.MV_DOUBLE_FACE) {
      rFace = THREE.DoubleSide;
    } else if (material.renderFace === RenderFace.MV_FRONT_FACE) {
      rFace = THREE.FrontSide;
    } else {
      rFace = THREE.BackSide;
    }

    let uniforms;
    if (version <=2) {
      uniforms = {
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
    }
    // version == 3
    else {
      uniforms = {
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
        cameraNear: {type: 'f', value: this.camera.near},
        cameraFar: {type: 'f', value: this.camera.far},

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

    // index is one of texture list. this value only zero now.
    const threeJSMaterial = new THREE.ShaderMaterial({
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

      // blending: THREE.MultiplyBlending,
      // blendSrc: THREE.SrcAlphaFactor,
      // blendDst: THREE.oneMinusSrcAlphaFactor,
      depthWrite: !material.bTransparent,
      // depthTest: true,
      transparent: true,
    });

    threeJSMaterial.extensions.derivatives = true;
    threeJSMaterial.extensions.shaderTextureLOD = true;

    if (version <= 2) {
      threeJSMaterial.vertexShader = vertexShader;
      threeJSMaterial.fragmentShader = fragmentShader;
    } else {
      threeJSMaterial.vertexShader = pbrVertexShader;
      threeJSMaterial.fragmentShader = pbrFragmentShader;

      threeJSMaterial.uniforms.sDiffuseEnvironmentMap.value = envDiffuseMap;
      threeJSMaterial.uniforms.sSpecularEnvironmentMap.value = envSpecularMap;
    }

    if (_gSeamPuckeringNormalMap !== null && bUseSeamPuckeringNormalMap) {
      threeJSMaterial.uniforms.bUseSeamPuckeringNormal.value = bUseSeamPuckeringNormalMap;
      threeJSMaterial.uniforms.sSeamPuckeringNormal.value = _gSeamPuckeringNormalMap;
    }


    // Load Texture File.

    let bRenderTexture = false;

    for (let i = 0; i < zRestColorwayMaterialArray[colorwayIndex].texture.length; i++) {
      const zRestTexture = zRestColorwayMaterialArray[colorwayIndex].texture[i];

      if (!zip.file(zRestTexture.file)) {
        const temp = zRestTexture.file;

        const list = temp.split('/');
        const textureFileName = list[list.length - 1];

        if (!zip.file(textureFileName)) {
        } else {
          // 이 쓰레드에서 바로 texture 로딩해 버리자. 이미지 사이즈가 작으면 이게 사용자가 봤을 때 깜박거리지 않고 오히려 낫다.
          // 나중에 큰 이미지 프로그레시브 로딩 적용할 때 다시 비동기 방식 적용해 보자. 비동기 로딩 방식은 아래 주석처리되어 있다. Jaden 2017.016.16

          var texture = _gNameToTextureMap.get(textureFileName);
          if (!texture) {
            texture = await this.loadTexture(zip, textureFileName);

            _gNameToTextureMap.set(textureFileName, texture);

            // console.log("texture name", texture);
          }

          // wrap type 외에는 기본값을 그대로 사용하면 된다.
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.anisotropy = 16; // 이거 설정해 줘야 텍스처 블러링 문제 없어져서 CLO에서처럼 선명하게 나온다. 적당히 16으로 설정했으나 성능 문제 있을 수 있다 Jaden 2018.09.03

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

          if (zRestTexture.type === TextureType.GLOBAL_MAP) {
            threeJSMaterial.uniforms.sGlobal.value = texture;
            threeJSMaterial.uniforms.bUseGlobal.value = 1;
            threeJSMaterial.uniforms.matGlobal.value = transform;
          } else if (zRestTexture.type === TextureType.DIFFUSE_MAP) {
            if (version <= 2) {
              threeJSMaterial.uniforms.sDiffuse.value = texture;
              threeJSMaterial.uniforms.bUseDiffuse.value = 1;
              threeJSMaterial.uniforms.matDiffuse.value = transform;
            }
          } else if (zRestTexture.type === TextureType.AMBIENT_MAP) {
            if (version <= 2) {
              threeJSMaterial.uniforms.sAmbient.value = texture;
              threeJSMaterial.uniforms.bUseAmbient.value = 1;
              threeJSMaterial.uniforms.matAmbient.value = transform;
            }
          } else if (zRestTexture.type === TextureType.SPECULAR_MAP) {
            if (version <= 2) {
              threeJSMaterial.uniforms.sSpecular.value = texture;
              threeJSMaterial.uniforms.bUseSpecular.value = 1;
              threeJSMaterial.uniforms.matSpecular.value = transform;
            }
          } else if (zRestTexture.type === TextureType.NORMAL_MAP) {
            if (version >= 2) { // 버전 2 이상일 때만 노말맵 지원. 그렇지 않으면 1.0에서 제작된 zrest 파일은 desaturated 된 이미지가 normal map 으로 인식되었던 버그때문에 렌더링 이상해진다.
              threeJSMaterial.uniforms.sNormal.value = texture;
              threeJSMaterial.uniforms.bUseNormal.value = 1;
              threeJSMaterial.uniforms.matNormal.value = transform;
            }
          } else if (zRestTexture.type === TextureType.TRANSPARENTT_MAP) {
            threeJSMaterial.uniforms.sTransparent.value = texture;
            threeJSMaterial.uniforms.bUseTransparent.value = 1;
            threeJSMaterial.uniforms.matTransparent.value = transform;
          } else if (zRestTexture.type === TextureType.GLOSSINESS_MAP) {
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
          /* else if (zRestTexture.type === TextureType.METALNESS_MAP) {
                    threeJSMaterial.uniforms.sMetalness.value = texture;
                    threeJSMaterial.uniforms.bUseMetalnessMap.value = 1;
                    threeJSMaterial.uniforms.matMetalness.value = transform;
                }*/
          /*
                // 아래는 비동기 로딩을 위해 worker 사용하는 경우.
                LoadMaterialTexture(threeJSMaterial, zip, textureFileName, function (resultTexture) {
                    if (zRestTexture.type === TextureType.GLOBAL_MAP) {
                        threeJSMaterial.uniforms.sGlobal.value = resultTexture;
                        threeJSMaterial.uniforms.bUseGlobal.value = 1;
                    }
                    else if (zRestTexture.type === TextureType.DIFFUSE_MAP) {
                        threeJSMaterial.uniforms.sDiffuse.value = resultTexture;
                        threeJSMaterial.uniforms.bUseDiffuse.value = 1;
                    }
                    else if (zRestTexture.type === TextureType.AMBIENT_MAP) {
                        threeJSMaterial.uniforms.sAmbient.value = resultTexture;
                        threeJSMaterial.uniforms.bUseAmbient.value = 1;
                    }
                    else if (zRestTexture.type === TextureType.SPECULAR_MAP) {
                        threeJSMaterial.uniforms.sSpecular.value = resultTexture;
                        threeJSMaterial.uniforms.bUseSpecular.value = 1;
                    }
                    else if (zRestTexture.type === TextureType.NORMAL_MAP) {
                    if (version >= 2) { // 버전 2 이상일 때만 노말맵 지원. 그렇지 않으면 1.0에서 제작된 zrest 파일은 desaturated 된 이미지가 normal map 으로 인식되었던 버그때문에 렌더링 이상해진다.
                        threeJSMaterial.uniforms.sNormal.value = resultTexture;
                        threeJSMaterial.uniforms.bUseNormal.value = 1;
                        }
                    }
                    else if (zRestTexture.type === TextureType.TRANSPARENTT_MAP) {
                        threeJSMaterial.uniforms.sTransparent.value = texture;
                        threeJSMaterial.uniforms.bUseTransparent.value = 1;
                    }
                });*/

          bRenderTexture = true;
        }
      }
    }

    if (bRenderTexture) {
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
    texture && texture.dispose();
    return threeJSMaterial;
  },


  async makeMaterialForZrest_ref(zip, property, colorwayIndex, bUseSeamPuckeringNormalMap, loadedCamera, version) {
    const zRestColorwayMaterialArray = property.colorwayMaterials;
    const material = zRestColorwayMaterialArray[colorwayIndex];
    const rFace = getRenderFaceType(material.renderFace);
    const uniforms = getUniforms(version, loadedCamera, colorwayIndex);

    // index is one of texture list. this value only zero now.
    const threeJSMaterial = attachShader(version);

    loadZrestTexture(colorwayIndex, version);

    return threeJSMaterial;

    function getRenderFaceType(renderFace) {
      // 기본값은 두께보기의상이 기본이므로 front로 하자.
      // double 이 아닌 front로 하면 아바타 헤어 투명도가 CLO와 다르게 나오는 문제가 생기긴 하지만
      if (renderFace === undefined) {
        return THREE.FrontSide;
      } else if (renderFace === RenderFace.MV_DOUBLE_FACE) {
        return THREE.DoubleSide;
      } else if (renderFace === RenderFace.MV_FRONT_FACE) {
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
          cameraNear: {type: 'f', value: camera.near},
          cameraFar: {type: 'f', value: camera.far},

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

    function attachShader(version) {
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

      if (_gSeamPuckeringNormalMap !== null && bUseSeamPuckeringNormalMap) {
        m.uniforms.bUseSeamPuckeringNormal.value = bUseSeamPuckeringNormalMap;
        m.uniforms.sSeamPuckeringNormal.value = _gSeamPuckeringNormalMap;
      }

      return m;
    }

    async function loadZrestTexture(colorwayIndex, version) {
      console.log('colorwayIndex: ' + colorwayIndex);

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
            texture = _gNameToTextureMap.get(textureFileName);

            if (!texture) {
              texture = await ZRestLoader.prototype.loadTexture(zip, textureFileName);
              _gNameToTextureMap.set(textureFileName, texture);
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

            if (zRestTexture.type === TextureType.GLOBAL_MAP) {
              threeJSMaterial.uniforms.sGlobal.value = texture;
              threeJSMaterial.uniforms.bUseGlobal.value = 1;
              threeJSMaterial.uniforms.matGlobal.value = transform;
            } else if (zRestTexture.type === TextureType.DIFFUSE_MAP) {
              if (version <= 2) {
                threeJSMaterial.uniforms.sDiffuse.value = texture;
                threeJSMaterial.uniforms.bUseDiffuse.value = 1;
                threeJSMaterial.uniforms.matDiffuse.value = transform;
              }
            } else if (zRestTexture.type === TextureType.AMBIENT_MAP) {
              if (version <= 2) {
                threeJSMaterial.uniforms.sAmbient.value = texture;
                threeJSMaterial.uniforms.bUseAmbient.value = 1;
                threeJSMaterial.uniforms.matAmbient.value = transform;
              }
            } else if (zRestTexture.type === TextureType.SPECULAR_MAP) {
              if (version <= 2) {
                threeJSMaterial.uniforms.sSpecular.value = texture;
                threeJSMaterial.uniforms.bUseSpecular.value = 1;
                threeJSMaterial.uniforms.matSpecular.value = transform;
              }
            } else if (zRestTexture.type === TextureType.NORMAL_MAP) {
              if (version >= 2) { // 버전 2 이상일 때만 노말맵 지원. 그렇지 않으면 1.0에서 제작된 zrest 파일은 desaturated 된 이미지가 normal map 으로 인식되었던 버그때문에 렌더링 이상해진다.
                threeJSMaterial.uniforms.sNormal.value = texture;
                threeJSMaterial.uniforms.bUseNormal.value = 1;
                threeJSMaterial.uniforms.matNormal.value = transform;
              }
            } else if (zRestTexture.type === TextureType.TRANSPARENTT_MAP) {
              threeJSMaterial.uniforms.sTransparent.value = texture;
              threeJSMaterial.uniforms.bUseTransparent.value = 1;
              threeJSMaterial.uniforms.matTransparent.value = transform;
            } else if (zRestTexture.type === TextureType.GLOSSINESS_MAP) {
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
  },

  async addMatMeshList(zip, listMatShape, tf, bLoadTransparentObject, version) {
    console.log('addMatMeshList', listMatShape.length);

    for (let i = 0; i < listMatShape.length; ++i) {
      const listMatMeshIDOnIndexedMesh = listMatShape[i].get('listMatMeshIDOnIndexedMesh');

      const mapShape = listMatShape[i].get('mapShape');
      if (mapShape === undefined || mapShape === null) {
        console.log('mapShape is null');
        return false;
      }

      const listIndexCount = mapShape.get('listIndexCount');
      if (listIndexCount === undefined || listIndexCount === null || listIndexCount.length == 0) {
        console.log('listIndexCount is null');
        return false;
      }

      // Draco Compression
      const dracoMeshFilename = readByteArray('String', mapShape.get('qsDracoFileName'));
      if (dracoMeshFilename === undefined || dracoMeshFilename === null) {
        console.log('cannot find dracoMesh');
        return false;
      }

      // var drcArrayBuffer = zip.file(dracoMeshFilename).asArrayBuffer();
      const drcArrayBuffer = await zip.file(dracoMeshFilename).async('arrayBuffer');

      const dracoLoader = new THREE.DRACOLoader();
      // dracoLoader.setVerbosity(1); // log 나오게 하려면 주석 풀자
      const dracoGeometry = dracoLoader.decodeDracoFile(drcArrayBuffer);

      //
      let totalIndexCount = 0;
      for (var m = 0; m < listIndexCount.length; ++m) {
        totalIndexCount += listIndexCount[m];
      }

      console.log('totalIndexCount: ' + totalIndexCount);

      // Split MatShape to MatMesh
      let indexOffset = totalIndexCount;
      if (version > 4) {
        indexOffset = 0;
      };

      // 뒷면 그리기용 변수.
      let frontVertexCount = 0;

      for (var m = 0; m < listIndexCount.length; ++m) {
        if (version <= 4) {
          indexOffset = indexOffset - listIndexCount[m];
        }


        // to Rayn 왜 이렇게 index 를 거꾸로 해야 제대로 렌더링되는지 원인을 모르겠음. 일단 이렇게 해서 되는 것 같지만 찜찜.. Jaden 2017.06.25
        const matMeshID = listMatMeshIDOnIndexedMesh[m].get('uiMatMeshID');
        const matProperty = this.materialInformationMap.get(matMeshID);
        const indexSize = listIndexCount[m];

        // 이제는 bPerfectTransparent 해도 무조건 그린다. colorway 중 하나만 perfect transparent했을 때 mesh 안그리게 하면 perfect transparent 하지 않는 colorway 로 바꿨을 때도 아예 안그려지는 버그 발생. 그래서 주석처리
        // if (matProperty.colorwayMaterials[this.currentColorwayIndex].bPerfectTransparent) {             }

        if (bLoadTransparentObject) {
          if (!matProperty.colorwayMaterials[this.currentColorwayIndex].bTransparent) {
            //  indexOffset = indexOffset - listIndexCount[m + 1];
            if (version > 4) {
              indexOffset += indexSize;
            }
            continue;
          }
        } else {
          if (matProperty.colorwayMaterials[this.currentColorwayIndex].bTransparent) {
            // indexOffset = indexOffset - listIndexCount[m + 1];
            if (version > 4) {
              indexOffset += indexSize;
            }
            continue;
          }
        }

        // THREE.Geometry 를 사용하면 실제 메쉬의 메모리보다 10배 가까운 메모리를 사용하게 된다. 왜 그정도인지는 모르겠지만.. 그래서 BufferGeometry 사용한다 Jaden 2017.06.08
        const bufferGeometry = new THREE.BufferGeometry();

        // dracoGeometry의 해당 mesh 에 의해 사용된 vertex 들로만 새로운 메쉬를 만들기 위해 changeVertexIndex 만든다. 값은 새로운 메쉬에서의 vertexIndex. 초기값은 -1
        const changeVertexIndex = new Int32Array(dracoGeometry.vertices.length / 3);
        for (let j = 0; j < dracoGeometry.vertices.length / 3; j++) {
          changeVertexIndex[j] = -1;
        }

        const posAttrib = new Array();
        const normalAttrib = new Array();
        const uvAttrib = new Array();
        const uv2Attrib = new Array();
        let count = 0;
        for (let j = 0; j < indexSize; j++) {
          const index = dracoGeometry.indices[indexOffset + j];
          if (changeVertexIndex[index] === -1) // 방문되지 않은 녀석들만 새로운 mesh vertex 로 추가한다.
          {
            changeVertexIndex[index] = count;
            count++;

            const threePos = new THREE.Vector3(dracoGeometry.vertices[index * 3], dracoGeometry.vertices[index * 3 + 1], dracoGeometry.vertices[index * 3 + 2]);
            // threePos.applyMatrix4(m4);

            posAttrib.push(threePos.x);
            posAttrib.push(threePos.y);
            posAttrib.push(threePos.z);

            if (dracoGeometry.useNormal) {
              normalAttrib.push(dracoGeometry.normals[index * 3]);
              normalAttrib.push(dracoGeometry.normals[index * 3 + 1]);
              normalAttrib.push(dracoGeometry.normals[index * 3 + 2]);
            }

            uvAttrib.push(dracoGeometry.uvs[index * 2]);
            uvAttrib.push(dracoGeometry.uvs[index * 2 + 1]);

            if (dracoGeometry.numUVs >= 2) {
              uv2Attrib.push(dracoGeometry.uv2s[index * 2]);
              uv2Attrib.push(dracoGeometry.uv2s[index * 2 + 1]);
            }
          }
        }

        if (m === 0) {
          frontVertexCount = count
          ;
        };

        bufferGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(posAttrib), 3));

        if (dracoGeometry.useNormal) {
          bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalAttrib), 3));
        }

        bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvAttrib), 2));
        if (dracoGeometry.numUVs >= 2) {
          bufferGeometry.addAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uv2Attrib), 2));
        }

        // Set Indices
        const indexAttrib = new Array();

        if (version > 4) {
          for (let k = 0; k < indexSize; k++) {
            const index = dracoGeometry.indices[indexOffset + k];
            indexAttrib.push(changeVertexIndex[index]);
          }

          indexOffset += indexSize;
        } else {
          for (let j = indexSize / 3 - 1; j >= 0; j--) {
            indexAttrib.push(changeVertexIndex[dracoGeometry.indices[indexOffset + j*3]]);
            indexAttrib.push(changeVertexIndex[dracoGeometry.indices[indexOffset + j*3+1]]);
            indexAttrib.push(changeVertexIndex[dracoGeometry.indices[indexOffset + j*3+2]]);
          }
        }


        bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indexAttrib), 1));

        if (!dracoGeometry.useNormal) {
          bufferGeometry.computeFaceNormals();
          bufferGeometry.computeVertexNormals();
        }

        const material = await this.makeMaterialForZrest(zip, matProperty, this.currentColorwayIndex, dracoGeometry.numUVs >= 2, version);
        //  var material = new THREE.MeshPhongMaterial();
        // material.color = new THREE.Color(0xAAAAAA);
        // material.side = THREE.DoubleSide;
        // material.wireframe = true;

        // var material = new THREE.MeshLambertMaterial({ color: 0xffffff, envMap: envDiffuseMap });

        const threeMesh = new THREE.Mesh(bufferGeometry, material);

        //
        const matMeshType = listMatMeshIDOnIndexedMesh[m].get('enType');
        // 여기서 center, normal, bounding sphere radius,

        let type = this.MATMESH_TYPE.PATTERN_MATMESH;

        if (matMeshType !== undefined || matMeshType !== null) {
          if (matMeshType === 0) {
            type = this.MatMeshType.PATTERN_MATMESH;
          } else if (matMeshType === 1) {
            type = this.MatMeshType.TRIM_MATMESH;
          } else if (matMeshType === 2) {
            type = this.MatMeshType.PRINTOVERLAY_MATMESH;
          } else if (matMeshType === 3) {
            type = this.MatMeshType.BUTTONHEAD_MATMESH;
          } else if (matMeshType === 4) {
            type = this.MatMeshType.NORMAL_MATMESH;
          } else if (matMeshType === 5) {
            type = this.MatMeshType.AVATAR_MATMESH;
          } else if (matMeshType === 6) {
            type = this.MatMeshType.STITCH_MATMESH;
          } else if (matMeshType === 7) {
            type = this.MatMeshType.BUTTONHOLE_MATMESH;
          }
        }

        const center = new THREE.Vector3();
        // center = listMatMeshIDOnIndexedMesh[m].get("v3Center");

        const normal = new THREE.Vector3();
        // normal = listMatMeshIDOnIndexedMesh[m].get("v3Normal");

        // var bounding_sphere_radius = parseFloat(listMatMeshIDOnIndexedMesh[m].get("fBoundingSphereRadius"));
        const bounding_sphere_radius = .0;

        /*
            // outline mesh도 만들자.
            var lineMaterial = new THREE.LineBasicMaterial({color: 0x0000ff})
            var lineGeometry = new THREE.Geometry()
            var boundaryPointCount = parseInt(listMatMeshIDOnIndexedMesh[m].get("iBoundaryPointCount"))
            //for (var v = 0 ; v < threeMesh.geometry.attributes.position.count ; ++v)
            for (var v = 0 ; v <= boundaryPointCount ; ++v)
            {
                var newIndex = changeVertexIndex[v]
                var pos = new THREE.Vector3()
                pos.x = threeMesh.geometry.attributes.position.array[newIndex*3]
                pos.y = threeMesh.geometry.attributes.position.array[newIndex*3+1]
                pos.z = threeMesh.geometry.attributes.position.array[newIndex*3+2]
                lineGeometry.vertices.push(pos)
            }
            var line = new THREE.Line(lineGeometry, lineMaterial)
            this.scene.add(line)
            */

        // lineGeometry.vertices.push()

        // /
        // 여기도 version 가지고 나누는게 나을까? center랑 이런거 데이터가 없을텐데.
        threeMesh.userData = {SELECTED: false, MATMESH_ID: matMeshID, TYPE: type, CENTER: center, NORMAL: normal, BOUNDING_SPHERE_RADIUS: bounding_sphere_radius};


        //
        if (this.gVersion >= 4) {
          const bVisible = listMatShape[i].get('bMatShapeVisible');
          if (bVisible === undefined || bVisible === null) {
            threeMesh.visible = true;
          } else {
            if (bVisible === 0) {
              threeMesh.visible = false;
            } else if (bVisible === 1) {
              threeMesh.visible = true;
            }
          }
        } else {
          threeMesh.visible = true;
        }

        let b = true;
        if (material.uniforms.materialOpacity.value == 0) {
          b = false;
        }

        threeMesh.castShadow = b;
        threeMesh.receiveShadow = b;
        tf.add(threeMesh);
        // Global._globalMatMeshInformationList.push(threeMesh);
        this.matMeshList.push(threeMesh);

        if (this.gVersion > 4) {
          // marker 만들자.
          // createMarker( {pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message}, isVisible = true ) {
          const cameraPos = new THREE.Vector3();
          cameraPos.copy(center);

          const distanceVector = new THREE.Vector3();
          distanceVector.copy(normal);
          distanceVector.normalize();


          distanceVector.multiplyScalar(bounding_sphere_radius * 13);

          cameraPos.add(distanceVector);

          const cameraQuaternion = new THREE.Quaternion(); // 얘는 zrest 만들때 추가해야 한다.

          // this.markerManager.createMarker({
          //    pointerPos: center,
          //    faceNormal: normal,
          //    cameraPos: cameraPos,
          //    cameraTarget: center,
          //    cameraQuaternion: cameraQuaternion,
          //    message: type
          // })
        }

        // console.log(threeMesh);

        // indexOffset = indexOffset - listIndexCount[m + 1];

        // console.log(indexOffset);
      }

      // style line
      const styleLineMaterial = new THREE.LineBasicMaterial({color: 0x0000ff});

      const listLine = listMatShape[i].get('listLine');
      if (listLine !== undefined && listLine !== null) {
        for (let k = 0; k < listLine.length; ++k) {
          const frontStyleLineGeometry = new THREE.Geometry();
          const backStyleLineGeometry = new THREE.Geometry();

          const listMeshPointIndex = listLine[k].get('listMeshPointIndex');
          if (listMeshPointIndex !== undefined && listMeshPointIndex !== null) {
            for (let h=0; h<listMeshPointIndex.length; ++h) {
              let vIndex = listMeshPointIndex[h].get('uiMeshPointIndex');
              if (vIndex !== undefined && vIndex !== null) {
                // var newIndex = changeVertexIndex[vIndex]

                const frontStyleLinePos = new THREE.Vector3();

                // linePos.x = threeMesh.geometry.attributes.position.array[newIndex*3]
                // linePos.y = threeMesh.geometry.attributes.position.array[newIndex*3+1]
                // linePos.z = threeMesh.geometry.attributes.position.array[newIndex*3+2]
                frontStyleLinePos.x = dracoGeometry.vertices[vIndex*3];
                frontStyleLinePos.y = dracoGeometry.vertices[vIndex*3+1];
                frontStyleLinePos.z = dracoGeometry.vertices[vIndex*3+2];

                frontStyleLineGeometry.vertices.push(frontStyleLinePos);

                //
                const backStyleLinePos = new THREE.Vector3();
                vIndex += frontVertexCount;
                backStyleLinePos.x = dracoGeometry.vertices[vIndex*3];
                backStyleLinePos.y = dracoGeometry.vertices[vIndex*3+1];
                backStyleLinePos.z = dracoGeometry.vertices[vIndex*3+2];

                // backStyleLineGeometry.vertices.push(backStyleLinePos)
              }
            }

            frontStyleLineGeometry.computeFaceNormals();
            frontStyleLineGeometry.computeVertexNormals();
            const frontStyleLine = new THREE.Line(frontStyleLineGeometry, styleLineMaterial);
            this.scene.add(frontStyleLine);

            backStyleLineGeometry.computeFaceNormals();
            backStyleLineGeometry.computeVertexNormals();
            const backStyleLine = new THREE.Line(backStyleLineGeometry, styleLineMaterial);
            this.scene.add(backStyleLine);
          }
        }
      }
    }


    const matMeshLength = this.matMeshList.length;
  },

  async addMatMeshList_ref(matMeshList, zip, listMatShape, tf, bLoadTransparentObject, version, bLog = false) {
    for (let i = 0; i < listMatShape.length; ++i) {
      const listMatMeshIDOnIndexedMesh = listMatShape[i].get('listMatMeshIDOnIndexedMesh');
      const mapShape = listMatShape[i].get('mapShape');
      if (! mapShape) {
        console.log('mapShape is null');
        return false;
      }

      const listIndexCount = mapShape.get('listIndexCount');
      if (! listIndexCount || listIndexCount.length == 0) {
        console.log('listIndexCount is null');
        return false;
      }

      let totalIndexCount = 0;
      for (let m = 0; m < listIndexCount.length; ++m) {
        totalIndexCount += listIndexCount[m];
      }

      const dracoGeometry = await getDracoGeometry(mapShape.get('qsDracoFileName'));

      await splitMatSpaceToMatMesh(this.materialInformationMap, this.currentColorwayIndex, this.camera, listMatMeshIDOnIndexedMesh, totalIndexCount, listIndexCount, dracoGeometry);

      // style line
      const styleLineMaterial = new THREE.LineBasicMaterial({color: 0x0000ff});

      const listLine = listMatShape[i].get('listLine');
      if (listLine !== undefined && listLine !== null) {
        for (let k = 0; k < listLine.length; ++k) {
          const frontStyleLineGeometry = new THREE.Geometry();
          const backStyleLineGeometry = new THREE.Geometry();

          const listMeshPointIndex = listLine[k].get('listMeshPointIndex');
          if (listMeshPointIndex !== undefined && listMeshPointIndex !== null) {
            for (let h=0; h<listMeshPointIndex.length; ++h) {
              let vIndex = listMeshPointIndex[h].get('uiMeshPointIndex');
              if (vIndex !== undefined && vIndex !== null) {
                // var newIndex = changeVertexIndex[vIndex]

                const frontStyleLinePos = new THREE.Vector3();

                // linePos.x = threeMesh.geometry.attributes.position.array[newIndex*3]
                // linePos.y = threeMesh.geometry.attributes.position.array[newIndex*3+1]
                // linePos.z = threeMesh.geometry.attributes.position.array[newIndex*3+2]
                frontStyleLinePos.x = dracoGeometry.vertices[vIndex*3];
                frontStyleLinePos.y = dracoGeometry.vertices[vIndex*3+1];
                frontStyleLinePos.z = dracoGeometry.vertices[vIndex*3+2];

                frontStyleLineGeometry.vertices.push(frontStyleLinePos);

                //
                const backStyleLinePos = new THREE.Vector3();
                vIndex += frontVertexCount;
                backStyleLinePos.x = dracoGeometry.vertices[vIndex*3];
                backStyleLinePos.y = dracoGeometry.vertices[vIndex*3+1];
                backStyleLinePos.z = dracoGeometry.vertices[vIndex*3+2];

                // backStyleLineGeometry.vertices.push(backStyleLinePos)
              }
            }

            frontStyleLineGeometry.computeFaceNormals();
            frontStyleLineGeometry.computeVertexNormals();
            const frontStyleLine = new THREE.Line(frontStyleLineGeometry, styleLineMaterial);
            this.scene.add(frontStyleLine);

            backStyleLineGeometry.computeFaceNormals();
            backStyleLineGeometry.computeVertexNormals();
            const backStyleLine = new THREE.Line(backStyleLineGeometry, styleLineMaterial);
            this.scene.add(backStyleLine);
          }
        }
      }
    }


    async function getDracoGeometry(qsDracoFileName) {
      // Draco Compression
      const dracoMeshFilename = readByteArray('String', qsDracoFileName);
      if (! dracoMeshFilename) {
        console.log('cannot find dracoMesh');
        return false;
      }

      const drcArrayBuffer = await zip.file(dracoMeshFilename).async('arrayBuffer');

      const dracoLoader = new THREE.DRACOLoader();
      dracoLoader.setVerbosity(bLog);

      return dracoLoader.decodeDracoFile(drcArrayBuffer);
    }

    async function splitMatSpaceToMatMesh(materialInfoMap, colorwayIndex, loadedCamera, listMatMeshIDOnIndexedMesh, totalIdxCount, listIdxCount, dracoGeometry) {
      console.log('colorway@splitMatSpaceToMatMesh: ' + colorwayIndex);

      let indexOffset = ((version > 4) ? 0 : totalIdxCount);

      // 뒷면 그리기용 변수.
      let frontVertexCount = 0;
      for (let m = 0; m < listIdxCount.length; ++m) {
        if (version <= 4) {
          indexOffset = indexOffset - listIdxCount[m];
        }

        /**
         * NOTE:
         * to Rayn 왜 이렇게 index 를 거꾸로 해야 제대로 렌더링되는지 원인을 모르겠음.
         * 일단 이렇게 해서 되는 것 같지만 찜찜..
         * Jaden 2017.06.25
         */
        const matMeshID = listMatMeshIDOnIndexedMesh[m].get('uiMatMeshID');
        const matProperty = materialInfoMap.get(matMeshID);
        const indexSize = listIdxCount[m];

        /**
         * NOTE:
         * 이제는 bPerfectTransparent 해도 무조건 그린다.
         * colorway 중 하나만 perfect transparent했을 때 mesh 안그리게 하면 perfect transparent 하지 않는 colorway 로 바꿨을 때도 아예 안그려지는 버그 발생.
        */
        if (bLoadTransparentObject) {
          if (!matProperty.colorwayMaterials[colorwayIndex].bTransparent) {
            //  indexOffset = indexOffset - listIndexCount[m + 1];
            if (version > 4) {
              indexOffset += indexSize;
            }
            continue;
          }
        } else {
          if (matProperty.colorwayMaterials[colorwayIndex].bTransparent) {
            // indexOffset = indexOffset - listIndexCount[m + 1];
            if (version > 4) {
              indexOffset += indexSize;
            }
            continue;
          }
        }

        /**
         * NOTE:
         * THREE.Geometry 를 사용하면 실제 메쉬의 메모리보다 10배 가까운 메모리를 사용하게 된다.
         * 왜 그정도인지는 모르겠지만.. 그래서 BufferGeometry 사용한다.
         * Jaden 2017.06.08
         */
        const bufferGeometry = new THREE.BufferGeometry();

        /**
         * NOTE:
         * dracoGeometry의 해당 mesh에 의해 사용된 vertex들로만 새로운 메쉬를 만들기 위해 changeVertexIndex 만든다.
         * 값은 새로운 메쉬에서의 vertexIndex. 초기값은 -1.
         */
        const changeVertexIndex = new Int32Array(dracoGeometry.vertices.length / 3);
        for (let j = 0; j < dracoGeometry.vertices.length / 3; j++) {
          changeVertexIndex[j] = -1;
        }

        const posAttrib = new Array();
        const normalAttrib = new Array();
        const uvAttrib = new Array();
        const uv2Attrib = new Array();

        let count = 0;
        for (let j = 0; j < indexSize; j++) {
          const index = dracoGeometry.indices[indexOffset + j];
          if (changeVertexIndex[index] === -1) // 방문되지 않은 녀석들만 새로운 mesh vertex 로 추가한다.
          {
            changeVertexIndex[index] = count;
            count++;

            const threePos = new THREE.Vector3(dracoGeometry.vertices[index * 3], dracoGeometry.vertices[index * 3 + 1], dracoGeometry.vertices[index * 3 + 2]);
            // threePos.applyMatrix4(m4);

            posAttrib.push(threePos.x);
            posAttrib.push(threePos.y);
            posAttrib.push(threePos.z);

            if (dracoGeometry.useNormal) {
              normalAttrib.push(dracoGeometry.normals[index * 3]);
              normalAttrib.push(dracoGeometry.normals[index * 3 + 1]);
              normalAttrib.push(dracoGeometry.normals[index * 3 + 2]);
            }

            uvAttrib.push(dracoGeometry.uvs[index * 2]);
            uvAttrib.push(dracoGeometry.uvs[index * 2 + 1]);

            if (dracoGeometry.numUVs >= 2) {
              uv2Attrib.push(dracoGeometry.uv2s[index * 2]);
              uv2Attrib.push(dracoGeometry.uv2s[index * 2 + 1]);
            }
          }
        }

        if (m === 0) {
          frontVertexCount = count;
        }

        bufferGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(posAttrib), 3));

        if (dracoGeometry.useNormal) {
          bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalAttrib), 3));
        }

        bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvAttrib), 2));
        if (dracoGeometry.numUVs >= 2) {
          bufferGeometry.addAttribute('uv2', new THREE.BufferAttribute(new Float32Array(uv2Attrib), 2));
        }

        // Set Indices
        const indexAttrib = new Array();

        if (version > 4) {
          for (let k = 0; k < indexSize; k++) {
            const index = dracoGeometry.indices[indexOffset + k];
            indexAttrib.push(changeVertexIndex[index]);
          }

          indexOffset += indexSize;
        } else {
          for (let j = indexSize / 3 - 1; j >= 0; j--) {
            indexAttrib.push(changeVertexIndex[dracoGeometry.indices[indexOffset + j*3]]);
            indexAttrib.push(changeVertexIndex[dracoGeometry.indices[indexOffset + j*3+1]]);
            indexAttrib.push(changeVertexIndex[dracoGeometry.indices[indexOffset + j*3+2]]);
          }
        }
        bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indexAttrib), 1));

        if (!dracoGeometry.useNormal) {
          bufferGeometry.computeFaceNormals();
          bufferGeometry.computeVertexNormals();
        }

        const material = await this.makeMaterialForZrest(zip, matProperty, this.currentColorwayIndex, dracoGeometry.numUVs >= 2, version);
        // const material = await ZRestLoader.prototype.makeMaterialForZrest(zip, matProperty, colorwayIndex, dracoGeometry.numUVs >= 2, loadedCamera, version);
        const threeMesh = new THREE.Mesh(bufferGeometry, material);
        const matMeshType = listMatMeshIDOnIndexedMesh[m].get('enType');
        // 여기서 center, normal, bounding sphere radius,

        let type = MATMESH_TYPE.PATTERN_MATMESH;

        if (matMeshType !== undefined || matMeshType !== null) {
          if (matMeshType === 0) {
            type = this.MatMeshType.PATTERN_MATMESH;
          } else if (matMeshType === 1) {
            type = this.MatMeshType.TRIM_MATMESH;
          } else if (matMeshType === 2) {
            type = this.MatMeshType.PRINTOVERLAY_MATMESH;
          } else if (matMeshType === 3) {
            type = this.MatMeshType.BUTTONHEAD_MATMESH;
          } else if (matMeshType === 4) {
            type = this.MatMeshType.NORMAL_MATMESH;
          } else if (matMeshType === 5) {
            type = this.MatMeshType.AVATAR_MATMESH;
          } else if (matMeshType === 6) {
            type = this.MatMeshType.STITCH_MATMESH;
          } else if (matMeshType === 7) {
            type = this.MatMeshType.BUTTONHOLE_MATMESH;
          }
        }

        const center = new THREE.Vector3();
        const normal = new THREE.Vector3();
        const bounding_sphere_radius = .0;

        // 여기도 version 가지고 나누는게 나을까? center랑 이런거 데이터가 없을텐데.
        threeMesh.userData = {
          SELECTED: false,
          MATMESH_ID: matMeshID,
          TYPE: type,
          CENTER: center,
          NORMAL: normal,
          BOUNDING_SPHERE_RADIUS: bounding_sphere_radius,
        };

        if (version >= 4) {
          const bVisible = listMatShape[i].get('bMatShapeVisible');
          if (bVisible === undefined || bVisible === null) {
            threeMesh.visible = true;
          } else {
            if (bVisible === 0) {
              threeMesh.visible = false;
            } else if (bVisible === 1) {
              threeMesh.visible = true;
            }
          }
        } else {
          threeMesh.visible = true;
        }

        let b = true;
        if (material.uniforms.materialOpacity.value == 0) {
          b = false;
        }

        threeMesh.castShadow = b;
        threeMesh.receiveShadow = b;
        tf.add(threeMesh);
        // Global._globalMatMeshInformationList.push(threeMesh);
        matMeshList.push(threeMesh);

        if (version > 4) {
          // marker 만들자.
          // createMarker( {pointerPos, faceNormal, cameraPos, cameraTarget, cameraQuaternion, message}, isVisible = true ) {
          const cameraPos = new THREE.Vector3();
          cameraPos.copy(center);

          const distanceVector = new THREE.Vector3();
          distanceVector.copy(normal);
          distanceVector.normalize();


          distanceVector.multiplyScalar(bounding_sphere_radius * 13);

          cameraPos.add(distanceVector);

          const cameraQuaternion = new THREE.Quaternion(); // 얘는 zrest 만들때 추가해야 한다.
        }
      }
    }
  },
};

function makeWorker(script) {
  const URL = window.URL || window.webkitURL;
  let blob = window.Blob;
  let worker = window.Worker;

  if (!URL || !blob || !worker || !script) {
    return null;
  }

  blob = new Blob([script]);
  worker = new Worker(URL.createObjectURL(blob));

  return worker;
}

export function dataWorkerFunction() {
  self.addEventListener('message', function(e) {
    try {
      const reader = new FileReaderSync();
      const url = reader.readAsDataURL(e.data.Blob);
      postMessage({Result: 'FileReaderSync() complete', URL: url});
    } catch (e) {
      postMessage({
        result: 'error',
      });
    }
  }, false);
}

export function checkFileReaderSyncSupport() {
  const worker = makeWorker(_syncDetectionScript);
  if (worker) {
    worker.onmessage = function(e) {
      _fileReaderSyncSupport = e.data;
      if (_fileReaderSyncSupport) {
        console.log('Your browser supports FileReaderSync.');
      }
    };
    worker.postMessage({});
  }
}
