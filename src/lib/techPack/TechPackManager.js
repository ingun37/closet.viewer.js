/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
// import {Marker, makeTextSprite} from '@/lib/marker/Marker';
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";
import { StyleLine } from "@/lib/techPack/StyleLine";
import MarkerManager from "@/lib/marker/MarkerManager";

const config = {
  unselectedMarkerOpacity: 0.1,
  defaultMarkerOpacity: 1.0,
  meshTransparentOpacity: 0.1,
  meshDefaultOpacity: 1.0,
  meshHighlightColor: new THREE.Vector3(1, 1, 0),
  meshDefaultColor: new THREE.Vector3(1, 1, 1),
  boundingBoxThreshold: 15.0,
  INF: 999999
};

let bHasMissingInfo = false;

class TechPackManager {
  constructor({ scene, camera, renderer, controls }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.matShapeMap = new Map();
    this.matMeshMap = new Map();

    this.patternMap = new Map();
    this.trimMapList = [];
    this.fabricsWithPatterns = [];
    this.stitchMeshMap = new Map(); // NOTE: This is temporary
    this.uncategorizedMeshMap = new Map();

    this.opacityValueMap = new Map();
    this.baseColorMap = new Map();

    this.raycaster = new THREE.Raycaster(); // FIXME: Is this necessary?

    this.load = this.load.bind(this);

    this.setActiveMarkerManager = this.setActiveMarkerManager.bind(this);
    this.setActiveMarker = this.setActiveMarkerManager.bind(this); // Deprecated

    this.init();

    this.styleLine = new StyleLine(this.styleLineContainer);
    this.loadStyleLine = styleLineMap => {
      this.styleLine.load(styleLineMap, this.styleLineContainer);
    };
    this.setStyleLineVisibleByPatternNo = this.setStyleLineVisibleByPatternNo;

    this.getShouldReconvert = () => bHasMissingInfo;

    this.deleteAllMarker = this.deleteAllMarker.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
  }

  init() {
    const params = {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls
    };

    this.initTrimMapList();

    // Init MarkerManagers
    this.patternMarker = new MarkerManager("pattern", params);
    this.fabricMarker = new MarkerManager("fabric", params);
    this.trimMarker = new MarkerManager("trim", params);

    this.markerManagers = [this.patternMarker, this.fabricMarker, this.trimMarker];

    // Init the container for style line
    this.styleLineContainer = new THREE.Object3D();
    this.styleLineContainer.name = "styleLineContainer";
    this.scene.add(this.styleLineContainer);

    bHasMissingInfo = false;
  }

  load(matShapeMap, matMeshMap, fabricsWithPatterns, trims, defaultMarker = "pattern") {
    // TODO: Write completely this code
    this.clear();
    this.init();

    this.matShapeMap = matShapeMap || new Map();
    this.matMeshMap = matMeshMap || new Map();
    this.extractInfoFromAPI(fabricsWithPatterns, trims).then(this.setActiveMarkerManager(defaultMarker));
  }

  setActiveMarkerManager(markerType) {
    this.markerManagers.forEach(markerManager => {
      if (markerManager.markerName === markerType) {
        markerManager.activate();
        console.log(markerManager.markerName + " activated");
      } else {
        markerManager.deactivate();
      }
    });
  }

  initTrimMapList() {
    this.trimMapList = {
      Graphic: new Map(),
      ButtonHead: new Map(),
      ButtonHole: new Map(),
      Topstitch: new Map(),
      Zipper: new Map()
    };
  }

  clear() {
    // NOTE: Actually, this function does not work to 'clear'.
    //       Generally 'clear' means function for memory deallocation.
    //       Should be changed in the future, at least when releasing to the public.

    this.matShapeMap = new Map();
    this.matMeshMap = new Map();
    this.patternMap = new Map();
    this.trimMapList = [];
    this.fabricsWithPatterns = [];
    this.stitchMeshMap = new Map(); // NOTE: This is temporary
    this.opacityValueMap = new Map();
    this.baseColorMap = new Map();
    this.uncategorizedMeshMap = new Map();

    this.markerManagers.forEach(manager => {
      manager.deactivate();
    });
    this.styleLine.clear();

    delete this.patternMarkerContainer;
    delete this.styleLineContainer;
  }

  async extractInfoFromAPI(fabricsWithPatterns, trims) {
    this.fabricsWithPatterns = fabricsWithPatterns;
    this.uncategorizedMeshMap = new Map(this.matMeshMap);

    const isEmpty = obj => {
      if (typeof obj === "undefined") return true;
      else return obj.length <= 0;
    };

    const buildPatternMap = fabricsWithPatterns => {
      if (isEmpty(fabricsWithPatterns)) return;

      fabricsWithPatterns.forEach(fabric => {
        const patterns = fabric.Patterns;
        if (patterns.length) {
          patterns.forEach(pattern => {
            this.patternMap.set(parseInt(pattern.Number), pattern);
          });
        }
      });
    };

    // NOTE: This filter is temperal.
    // The filter should be removed when updating API with the right information about topstitch.
    const buildTrimMapList = trims => {
      if (!trims || isEmpty(trims)) return;

      let numberForNull = 0;  // NOTE: Temporary code. There is a bug on API.
      trims.forEach(group => {
        // Remove spaces on string
        const groupName = group.GroupName.replace(/\s/g, "");
        group.Trims.forEach(trim => {
          if (trim.Number) {
            numberForNull = trim.Number;
          } else {
            trim.Number = ++numberForNull;
          }
          this.trimMapList[groupName].set(trim.Number, trim);
        });
      });
    };

    const buildStitchMeshMap = () => {
      if (this.matMeshMap.size <= 0) return;

      this.stitchMeshMap = new Map();
      this.matMeshMap.forEach(mesh => {
        if (mesh.userData.TYPE == MATMESH_TYPE.STITCH_MATMESH) {
          const matMeshID = mesh.userData.MATMESH_ID;
          this.stitchMeshMap.set(matMeshID, mesh);
        }
      });
    };

    const buildUncategrizedMeshMap = () => {
      const extractMatMeshId = map => {
        map.forEach(element => {
          if (element.MatMeshIdList) {
            element.MatMeshIdList.forEach(matMeshId => {
              this.uncategorizedMeshMap.delete(matMeshId);
            });
          }
        });
      };

      // Init
      this.uncategorizedMeshMap = new Map(this.matMeshMap);

      // Remove matMeshes that recorded on patternMap and trimMapList
      extractMatMeshId(this.patternMap);
      Object.values(this.trimMapList).forEach(trimMap => {
        extractMatMeshId(trimMap);
      });

      // Remove avatar meshes
      this.uncategorizedMeshMap.forEach(matMesh => {
        if (matMesh.userData.TYPE === MATMESH_TYPE.AVATAR_MATMESH) {
          this.uncategorizedMeshMap.delete(matMesh.userData.MATMESH_ID);
        }
      });
    };

    // Build maps from API
    buildPatternMap(fabricsWithPatterns);
    buildTrimMapList(trims);
    buildStitchMeshMap();

    // Build remained mesh Id list
    buildUncategrizedMeshMap();

    // Build markers
    this.buildPatternMarkers(fabricsWithPatterns);
    this.buildFabricMarkers(fabricsWithPatterns);
    this.buildTrimMarkers(trims);
  }

  buildPatternMarkers(fabricsWithPatterns) {
    if (!fabricsWithPatterns) return;

    const addOpacityToMap = matMeshIdList => {
      matMeshIdList.forEach(matMeshId => {
        const mesh = this.matMeshMap.get(matMeshId);
        if (mesh) {
          const bVisible = mesh.visible;
          const opacity = mesh.material.uniforms.materialOpacity.value;
          if (bVisible && opacity !== config.meshDefaultOpacity) {
            this.opacityValueMap.set(matMeshId, opacity);
          }
        }
      });
    };

    const patternMeshIdList = [];
    fabricsWithPatterns.forEach(fabric => {
      const patterns = fabric.Patterns;
      if (patterns) {
        patterns.forEach(pattern => {
          const matMeshIdList = pattern.MatMeshIdList;
          if (matMeshIdList) {
            patternMeshIdList.push(matMeshIdList[0]);

            // FIXME: It's working, but should be improved.
            addOpacityToMap(matMeshIdList);
          } else {
            bHasMissingInfo = true;
          }
        });
      }
    });

    this.buildMarkersFromList(this.patternMarker, patternMeshIdList, this.matShapeMap);
  }

  buildFabricMarkers(fabricsWithPatterns) {
    if (!fabricsWithPatterns) return;

    const fabricMeshIdList = [];
    fabricsWithPatterns.forEach(fabric => {
      const patterns = fabric.Patterns;
      if (patterns.length) {
        const matMeshIdList = patterns[0].MatMeshIdList;
        if (matMeshIdList) {
          fabricMeshIdList.push(fabric.Patterns[0].MatMeshIdList[0]);
        } else {
          bHasMissingInfo = true;
        }
      }
    });
    this.buildMarkersFromList(this.fabricMarker, fabricMeshIdList, this.matShapeMap);
  }

  buildTrimMarkers(trims) {
    if (!trims) return;

    const addColorToMap = matMeshIdList => {
      matMeshIdList.forEach(matMeshId => {
        const mesh = this.matMeshMap.get(matMeshId);
        if (mesh) {
          const baseColor = mesh.material.uniforms.materialBaseColor.value;
          if (baseColor) {
            this.baseColorMap.set(matMeshId, baseColor);
          }
        }
      });
    };    

    // NOTE: This is a temporary code to filter zipper.
    //       Because zipper needs only 1 marker, unlike other type trims.
    const isZipper = groupName => {
      return groupName === "Zipper";
    };
    const isTopstitch = groupName => {
      return groupName === "Topstitch";
    };

    let labelCounter = 1;
    trims.forEach(trimGroup => {
      // NOTE: labelIncrement should be 0 to build to multiple markers that have the same number.
      //       Because trims except zipper could have many markers.
      const labelIncrement = isZipper(trimGroup.GroupName) ? 1 : 0;

      trimGroup.Trims.forEach(trim => {
        if (trim.MatMeshIdList) {
          addColorToMap(trim.MatMeshIdList);
          const matMeshIdList = isTopstitch(trimGroup.GroupName) ? [trim.MatMeshIdList[0]] : trim.MatMeshIdList;  // NOTE: Topstitch has only one marker
          labelCounter = this.buildMarkersFromList(this.trimMarker, matMeshIdList, this.matShapeMap, labelCounter, labelIncrement);
        }
      });
    });
  }

  isSmallerThanMarker(matMeshId) {
    const matShape = this.matShapeMap.get(matMeshId);
    if (!matShape) return false;
    else {
      const radius = matShape.get("fBoundingSphereRadius") || config.INF;
      return radius < config.boundingBoxThreshold;
    }
  }

  buildMarkersFromList(markerManager, matMeshIdList, matShapeMap, labelStartNumber = 1, labelIncrement = 1) {
    if (!markerManager || !matMeshIdList || !matShapeMap) {
      console.log("Some information missed to build markers");
      return;
    }

    let labelCounter = labelStartNumber;
    let amountOfBuiltMarkers = 0;

    const shouldTranslate = this.isSmallerThanMarker(matMeshIdList[0]);
    const isZero = center => {
      return center.x === 0 && center.y === 0 && center.z === 0;
    };

    matMeshIdList.forEach(matMeshId => {
      const matShape = matShapeMap.get(Number(matMeshId));
      const matShapeCenter = matShape.get("v3Center");

      console.log(isZero(matShapeCenter));
      // check and update marker position
      if (isZero(matShapeCenter)) {
        const matMesh = this.matMeshMap.get(matMeshId);
        if (matMesh) {
          matMesh.geometry.computeBoundingSphere();
          const center = matMesh.geometry.boundingSphere.center;
          matShape.set("v3Center", center);
        }
      }

      const isSucceedToBuild = this.buildMarker(labelCounter, markerManager, matShape, -1, shouldTranslate);
      if (isSucceedToBuild) {
        amountOfBuiltMarkers++;
      }
      labelCounter += labelIncrement;
    });

    const isAlreadyIncreased = labelIncrement > 0;
    const isBuildMarkersSuccess = amountOfBuiltMarkers > 0;

    return isAlreadyIncreased || !isBuildMarkersSuccess ? labelCounter : labelCounter + 1;
  }

  // NOTE: Returns 'true' if success to build
  buildMarker(markerMessage, markerManager, matShape, index = -1, shouldTranslate = false) {
    if (!matShape) {
      return false;
    }

    const center = matShape.get("v3Center");
    const radius = matShape.get("fBoundingSphereRadius");
    const translatedCenter = shouldTranslate ? { x: center.x + 2 * radius, y: center.y, z: center.z } : center;
    const normal = matShape.get("v3Normal");
    const position = {
      pointerPos: translatedCenter,
      faceNormal: normal,
      cameraPos: this.camera.position,
      cameraTarget: this.controls.target,
      cameraQuaternion: this.camera.quaternion
    };

    if (index > 0) {
      markerManager.add(index, { ...position, message: markerMessage }, false);
    } else {
      markerManager.push({ ...position, message: markerMessage }, false);
    }

    return true;
  }

  setPatternVisible(patternNo, bVisible) {
    if (!this.isValidPatternNo) return;

    const pattern = this.patternMap.get(patternNo);
    const matMeshIdList = pattern.MatMeshIdList;

    if (!matMeshIdList) return;

    matMeshIdList.forEach(matMeshId => {
      const mesh = this.matMeshMap.get(matMeshId);
      if (mesh) {
        mesh.visible = bVisible;
      }
    });
  }

  setAllPatternVisible(bVisible) {
    this.patternMap.forEach(pattern => {
      this.setPatternVisible(pattern.Number, bVisible);
    });
  }

  setPatternTransparent(patternNo, bTransparent) {
    if (!this.isValidPatternNo) return;

    const pattern = this.patternMap.get(patternNo);
    const matMeshIdList = pattern.MatMeshIdList;

    if (!matMeshIdList) return;

    matMeshIdList.forEach(matMeshId => {
      this.setMatMeshTransparent(matMeshId, bTransparent);
    });
  }

  setAllPatternTransparent(bTransparent) {
    this.patternMap.forEach(pattern => {
      this.setPatternTransparent(pattern.Number, bTransparent);
    });
  }

  isValidPatternNo(patternNo) {
    return patternNo > 0 && patternNo <= this.patternMap.size;
  }

  setTrimVisible(trimNo, bVisible) {
    Object.values(this.trimMapList).forEach(trimMap => {
      if (trimMap.has(trimNo)) {
        const matMeshIdList = trimMap.get(trimNo).MatMeshIdList;
        if (matMeshIdList) {
          matMeshIdList.forEach(matMeshId => {
            this.setMatMeshVisible(matMeshId, bVisible);
          });
        }
      }
    });
  }

  setTrimHighlight(trimNo, bHighlight) {
    Object.values(this.trimMapList).forEach(trimMap => {
      if (trimMap.has(trimNo)) {
        const matMeshIdList = trimMap.get(trimNo).MatMeshIdList;
        if (matMeshIdList) {
          matMeshIdList.forEach(matMeshId => {
            this.setMatMeshHighlight(matMeshId, bHighlight);
          });
        }
      }
    });
  }

  setAllStitchTransparent(bTransparent) {
    this.stitchMeshMap.forEach(stitchMesh => {
      const matMeshId = stitchMesh.userData.MATMESH_ID;
      this.setMatMeshTransparent(matMeshId, bTransparent);
    });
  }

  setAllStitchVisible(bVisible) {
    this.stitchMeshMap.forEach(stitchMesh => {
      const matMeshId = stitchMesh.userData.MATMESH_ID;
      this.setMatMeshVisible(matMeshId, bVisible);
    });
  }

  setMatMeshTransparent(matMeshId, bTransparent) {
    const set = () => {
      this.setMatMeshTransparencyByValue(matMeshId, config.meshTransparentOpacity);
    };

    const reset = () => {
      const opacity = this.opacityValueMap.has(matMeshId) ? this.opacityValueMap.get(matMeshId) : config.meshDefaultOpacity;
      this.setMatMeshTransparencyByValue(matMeshId, opacity);
    };

    const mesh = this.matMeshMap.get(matMeshId);
    if (mesh) {
      if (bTransparent) set();
      else reset(mesh);
    }
  }

  setMatMeshHighlight(matMeshId, bHighlight) {
    const set = () => {
      this.setMatMeshColor(matMeshId, config.meshHighlightColor);
    };

    const reset = () => {
      const baseColor = this.baseColorMap.has(matMeshId) ? this.baseColorMap.get(matMeshId) : config.meshDefaultColor;
      this.setMatMeshColor(matMeshId, baseColor);
    };

    const mesh = this.matMeshMap.get(matMeshId);
    if (mesh) {
      if (bHighlight) set();
      else reset(mesh);
    }    
  }

  setMatMeshTransparencyByValue(matMeshId, opacity) {
    const mesh = this.matMeshMap.get(matMeshId);
    if (mesh) {
      mesh.material.uniforms.materialOpacity = {
        type: "f",
        value: opacity
      };
    }
  }

  setMatMeshVisible(matMeshId, bVisible) {
    const mesh = this.matMeshMap.get(matMeshId);
    if (mesh) {
      mesh.visible = bVisible;
    }
  }

  setMatMeshColor(matMeshId, v3Color) {
    const mesh = this.matMeshMap.get(matMeshId);
    if (mesh) {
      mesh.material.uniforms.materialBaseColor.value = v3Color;
    }
  }

  setAllTrimVisible(bVisible) {
    Object.values(this.trimMapList).forEach(groupMap => {
      if (groupMap.size > 0) {
        groupMap.forEach(trim => {
          if (trim.MatMeshIdList) {
            trim.MatMeshIdList.forEach(matMeshId => {
              this.setMatMeshVisible(matMeshId, bVisible);
            });
          }
        });
      }
    });
  }

  setAllTrimHighlight(bHighlight) {
    Object.values(this.trimMapList).forEach(groupMap => {
      if (groupMap.size > 0) {
        groupMap.forEach(trim => {
          if (trim.MatMeshIdList) {
            trim.MatMeshIdList.forEach(matMeshId => {
              this.setMatMeshHighlight(matMeshId, bHighlight);
            });
          }
        });
      }
    });
  }

  setAllMarkerVisible(bVisible) {
    this.markerManagers.forEach(manager => {
      manager.setVisibleForAll(bVisible);
    });
  }

  deleteAllMarker() {
    this.markerManagers.forEach(manager => {
      manager.removeAll();
    });
  }

  setStyleLineVisibleByPatternNo(patternNo, bVisible) {
    const pattern = this.patternMap.get(patternNo);
    const matMeshIdList = pattern.MatMeshIdList;
    if (!matMeshIdList) return;

    const firstMatMeshIdOnMarker = matMeshIdList[0];
    this.styleLine.setVisible(firstMatMeshIdOnMarker, bVisible);
  }

  bindEventListener({ onCompleteMove, onCompleteAnimation }) {
    this.onCompleteMove = onCompleteMove;
    this.onCompleteAnimation = onCompleteAnimation;
  }

  onMarker(onMarkerItems) {
    console.log(onMarkerItems);

    const actionsForPattern = patternIdx => {
      this.setAllStitchVisible(false);
      this.setAllTrimVisible(false);

      const patternNo = patternIdx + 1;
      this.setPatternTransparent(patternNo, false);
      this.patternMarker.setVisible(patternIdx, true);

      this.setStyleLineVisibleByPatternNo(patternNo, true);
    };

    const actionsForFabric = fabricIdx => {
      this.setAllStitchVisible(false);
      this.setAllTrimVisible(false);

      const selectedPattern = this.fabricsWithPatterns[fabricIdx].Patterns;
      this.fabricMarker.setVisible(fabricIdx, true);
      selectedPattern.forEach(pattern => {
        const patternNo = pattern.Number;
        this.setPatternVisible(patternNo, true);
        this.setPatternTransparent(patternNo, false);
        this.setStyleLineVisibleByPatternNo(patternNo, true);
      });
    };

    const actionsForTrim = trimIdx => {
      //this.setTrimHighlightOff();

      const trimNo = trimIdx + 1;
      this.setTrimVisible(trimNo, true);
      this.setTrimHighlight(trimNo, true);
      this.trimMarker.setVisibleByMessage(trimNo, true);
    };

    const uncategorizedMeshVisible = bVisible => {
      this.uncategorizedMeshMap.forEach(mesh => {
        mesh.visible = bVisible;
      });
    };

    const hasSelectedMarker = onMarkerItems.length > 0;
    if (hasSelectedMarker) {
      this.setAllPatternTransparent(true);
      // this.setAllStitchTransparent(true);
      this.setAllTrimVisible(false);
      uncategorizedMeshVisible(false);
    } else {
      if (this.selectedTrimNo !== null) {
        this.setTrimHighlight(this.selectedTrimNo, false);
        this.selectedTrimNo = null;
      }

      // Return to default setting
      this.setAllPatternTransparent(false);
      this.setAllStitchTransparent(false);
      this.setAllTrimHighlight(false);

      this.setAllPatternVisible(true);
      this.setAllStitchVisible(true);
      this.setAllTrimVisible(true);
      uncategorizedMeshVisible(true);
    }
    this.setAllMarkerVisible(false);
    this.styleLine.setVisibleAll(false);

    // TODO: Do refactoring this module
    onMarkerItems.map(({ index, id }) => {
      if (this.patternMarker.isActivated()) actionsForPattern(index);
      if (this.fabricMarker.isActivated()) actionsForFabric(index);
      if (this.trimMarker.isActivated()) actionsForTrim(index);
    });
  }

  updatePointerSize() {
    this.markerManagers.forEach(manager => {
      if (manager.isActivated()) {
        manager.updatePointerSize();
      }
    });
  }

  // NOTE: Prettier makes code weird. This issue not resolved yet.
  // prettier-ignore
  getMousePosition({ clientX, clientY }) {
    const canvasBounds = this.renderer.context.canvas.getBoundingClientRect();
    const x =
      ((clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
    const y =
      -((clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;

    return { x, y };
  }

  // viewer에서 canvas 클릭시 실행
  onMouseDown(e, action) {
    this.mouseButtonDown = true;
    const item = this.checkIntersectObject(e);
    if (item) {
      this.pickedMarker = item;
      this.isMouseMoved = false;
      return item;
    }
  }

  onMouseMove(e) {
    // FIXME: This function does nothing
  }

  checkIntersectObject({ clientX, clientY }) {
    const mousePos = this.getMousePosition({ clientX, clientY });
    this.markerManagers.forEach(markerManager => {
      if (markerManager.isActivated()) {
        return  markerManager.checkIntersect(mousePos, this.raycaster);
      }
    });
  }
}

export default TechPackManager;
