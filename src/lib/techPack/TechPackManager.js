/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
// import {Marker, makeTextSprite} from '@/lib/marker/Marker';
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";
import MarkerManager from "@/lib/marker/MarkerManager";

const config = {
  unselectedMarkerOpacity: 0.1,
  INF: 999999,
  boundingBoxThreshold: 15.0
};

class TechPackManager {
  constructor({ scene, camera, renderer, controls }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.matShapeMap = new Map();
    this.matMeshMap = new Map();
    this.styleLineMap = new Map();

    this.patternMap = new Map();
    this.trimMapList = [];
    this.fabricsWithPatterns = [];
    this.stitchMeshMap = new Map(); // NOTE: This is temporary

    this.raycaster = new THREE.Raycaster(); // FIXME: Is this necessary?

    this.load = this.load.bind(this);
    this.loadStyleLine = this.loadStyleLine.bind(this);

    this.setActiveMarkerManager = this.setActiveMarkerManager.bind(this);

    this.setPatternVisible = this.setPatternVisible.bind(this);
    this.setAllPatternVisible = this.setAllPatternVisible.bind(this);
    this.setPatternTransparency = this.setPatternTransparency.bind(this);
    this.setAllPatternTransparency = this.setAllPatternTransparency.bind(this);

    this.loadStyleLine = this.loadStyleLine.bind(this);
    this.setStyleLineVisibleByPatternNo = this.setStyleLineVisibleByPatternNo.bind(
      this
    );

    this.deleteAllMarker = this.deleteAllMarker.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);

    this.init();
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

    this.markerManagers = [
      this.patternMarker,
      this.fabricMarker,
      this.trimMarker
    ];

    // Init the container for style line
    this.styleLineContainer = new THREE.Object3D();
    this.styleLineContainer.name = "styleLineContainer";
    this.scene.add(this.styleLineContainer);
  }

  load(
    matShapeMap,
    matMeshMap,
    fabricsWithPatterns,
    trims,
    defaultMarker = "pattern"
  ) {
    // TODO: Write completely this code
    // this.clearTechPack();
    this.matShapeMap = matShapeMap;
    this.matMeshMap = matMeshMap;
    this.extractInfoFromAPI(fabricsWithPatterns, trims).then(
      this.setActiveMarkerManager(defaultMarker)
    );
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
      Topstitch: new Map()
    };
  }

  clearTechPack() {
    // FIXME: This module not gonna work
    this.markerMap = new Map();
    this.markerGeometryList = [];
    this.styleLineMap = new Map();
    this.patternList = [];

    this.markerManagers.forEach(manager => {
      manager.deactivate();
    });

    delete this.patternMarkerContainer;
    delete this.styleLineContainer;

    this.init();
  }

  updatePointerSize() {
    this.markerManagers.forEach(manager => {
      if (manager.isActivated()) {
        manager.updatePointerSize();
      }
    });
  }

  // NOTE: Prettier makes code weird. Find the solution.
  getMousePosition({ clientX, clientY }) {
    const canvasBounds = this.renderer.context.canvas.getBoundingClientRect();
    const x =
      ((clientX - canvasBounds.left) /
        (canvasBounds.right - canvasBounds.left)) *
      2 -
      1;
    const y =
      -(
        (clientY - canvasBounds.top) /
        (canvasBounds.bottom - canvasBounds.top)
      ) *
      2 +
      1;

    return { x, y };
  }

  async extractInfoFromAPI(fabricsWithPatterns, trims) {
    this.fabricsWithPatterns = fabricsWithPatterns;

    // Build PatternMap
    fabricsWithPatterns.forEach(fabric => {
      fabric.Patterns.forEach(pattern => {
        this.patternMap.set(parseInt(pattern.Number), pattern);
      });
    });

    // Build TrimMapList
    // NOTE: This filter is temperal. Filter should be removed after update topstitch.
    trims
      .filter(group => group.GroupName != "Topstitch")
      .forEach(group => {
        // Remove spaces on string
        const groupName = group.GroupName.replace(/\s/g, "");
        group.Trims.forEach(trim => {
          this.trimMapList[groupName].set(trim.Number, trim);
        });
      });

    // Build uncategorizedMeshMap
    this.stitchMeshMap = new Map();
    this.matMeshMap.forEach(mesh => {
      if (mesh.userData.TYPE == MATMESH_TYPE.STITCH_MATMESH) {
        const matMeshID = mesh.userData.MATMESH_ID;
        this.stitchMeshMap.set(matMeshID, mesh);
      }
    }); // filter((mesh) => {return (mesh.userData.TYPE == MATMESH_TYPE.STITCH_MATMESH)});

    this.buildPatternMarkers(fabricsWithPatterns);
    this.buildFabricMarkers(fabricsWithPatterns);
    this.buildTrimMarkers(trims);
  }

  buildPatternMarkers(fabricsWithPatterns) {
    const patternMeshIdList = [];
    fabricsWithPatterns.forEach(fabric => {
      fabric.Patterns.forEach(pattern => {
        patternMeshIdList.push(pattern.MatMeshIdList[0]);
      });
    });
    this.buildMarkersFromList(
      this.patternMarker,
      patternMeshIdList,
      this.matShapeMap
    );
  }

  buildFabricMarkers(fabricsWithPatterns) {
    const fabricMeshIdList = [];
    fabricsWithPatterns.forEach(fabric => {
      fabricMeshIdList.push(fabric.Patterns[0].MatMeshIdList[0]);
    });
    this.buildMarkersFromList(
      this.fabricMarker,
      fabricMeshIdList,
      this.matShapeMap
    );
  }

  buildTrimMarkers(trims) {
    let labelCounter = 1;
    trims.forEach(trimGroup => {
      trimGroup.Trims.forEach(trim => {
        if (trim.MatMeshIdList.length > 0) {
          labelCounter = this.buildMarkersFromList(
            this.trimMarker,
            trim.MatMeshIdList,
            this.matShapeMap,
            labelCounter,
            0
          );
        }
      });
    });
  }

  isSmallerThanMarker(matMeshId) {
    const matShape = this.matShapeMap.get(matMeshId);
    return matShape.get("fBoundingSphereRadius") < config.boundingBoxThreshold;
  }

  buildMarkersFromList(
    markerManager,
    matMeshIdList,
    matShapeMap,
    labelStartNumber = 1,
    labelIncrement = 1
  ) {
    if (!markerManager || !matMeshIdList || !matShapeMap) {
      console.log("Some information missed to build markers");
      return;
    }

    let labelCounter = labelStartNumber;
    let amountOfBuiltMarkers = 0;

    const shouldTranslate = this.isSmallerThanMarker(matMeshIdList[0]);
    matMeshIdList.forEach(matMeshId => {
      const matShape = matShapeMap.get(Number(matMeshId));
      if (
        this.buildMarker(
          labelCounter,
          markerManager,
          matShape,
          -1,
          shouldTranslate
        )
      ) {
        amountOfBuiltMarkers++;
      }
      labelCounter += labelIncrement;
    });

    const isAlreadyIncreased = labelIncrement > 0;
    const isBuildMarkersSuccess = amountOfBuiltMarkers > 0;

    return isAlreadyIncreased || !isBuildMarkersSuccess
      ? labelCounter
      : labelCounter + 1;
  }

  // Return true if success
  buildMarker(
    markerMessage,
    markerManager,
    matShape,
    index = -1,
    shouldTranslate = false
  ) {
    if (!matShape) {
      return false;
    }

    const center = matShape.get("v3Center");
    const radius = matShape.get("fBoundingSphereRadius");
    const translatedCenter = shouldTranslate
      ? { x: center.x + 2 * radius, y: center.y, z: center.z }
      : center;
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
    if (!this.isValidPatternNo) {
      return;
    }
    this.patternMap.get(patternNo).MatMeshIdList.forEach(matMeshId => {
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

  setPatternTransparency(patternNo, opacity) {
    if (!this.isValidPatternNo) {
      return;
    }

    const pattern = this.patternMap.get(patternNo);
    pattern.MatMeshIdList.forEach(matMeshId => {
      this.setMatMeshTransparency(matMeshId, opacity);
    });
  }

  setAllPatternTransparency(opacity) {
    this.patternMap.forEach(pattern => {
      this.setPatternTransparency(pattern.Number, opacity);
    });
  }

  togglePatternTransparency(
    patternIdx,
    selectedOpacity = 0.5,
    defaultOpacity = 1.0
  ) {
    if (!this.isValidPatternNo) return;

    for (let i = 0; i < 3; ++i) {
      const currentPattern = this.patternList[patternIdx][i];
      const currentOpacity =
        currentPattern.material.uniforms.materialOpacity.value;
      const opacity =
        currentOpacity >= defaultOpacity ? selectedOpacity : defaultOpacity;
      currentPattern.material.uniforms.materialOpacity = {
        type: "f",
        value: opacity
      };
    }
  }

  isValidPatternNo(patternNo) {
    return patternNo > 0 && patternNo <= this.patternMap.size;
  }

  setTrimTransparency(trimGroupName, trimNo, opacity) {
    const trim = this.trimMapList[trimGroupName];
    if (trim == "undefined" || trim.get(trimNo) == "undefined") return;

    trim.get(trimNo).matMeshIdList.forEach(matMeshId => {
      this.setMatMeshTransparency(matMeshId, opacity);
    });
  }

  setAllStitchTransparency(opacity) {
    this.stitchMeshMap.forEach(stitchMesh => {
      const matMeshId = stitchMesh.userData.MATMESH_ID;
      this.setMatMeshTransparency(matMeshId, opacity);
    });
  }

  setAllStitchVisible(bVisible) {
    this.trimMapList.Topstitch.forEach(stitchMesh => {
      const matMeshId = stitchMesh.userData.MATMESH_ID;
      this.setMatMeshVisible(matMeshId, bVisible);
    });
  }

  setMatMeshTransparency(matMeshId, opacity) {
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

  setSelectedTrimTransparency(
    selectedTrimNo,
    opacityForSelected,
    opacityForNotSelected
  ) {
    Object.entries(this.trimMapList).forEach(group => {
      const groupMap = group[1]; // Note: group is [trimType, Map]. for example, ["ButtonHead", Map(1)].
      if (groupMap.size > 0) {
        groupMap.forEach(trim => {
          const opacity =
            trim.Number == selectedTrimNo
              ? opacityForSelected
              : opacityForNotSelected;
          trim.MatMeshIdList.forEach(matMeshId => {
            this.setMatMeshTransparency(matMeshId, opacity);
          });
        });
      }
    });
  }

  setAllTrimVisible(bVisible) {
    Object.entries(this.trimMapList).forEach(group => {
      const groupMap = group[1]; // Note: group is [trimType, Map]. for example, ["ButtonHead", Map(1)].
      if (groupMap.size > 0) {
        groupMap.forEach(trim => {
          trim.MatMeshIdList.forEach(matMeshId => {
            this.setMatMeshVisible(matMeshId, bVisible);
          });
        });
      }
    });
  }

  loadStyleLine(styleLineMap) {
    if (!styleLineMap) return;

    this.styleLineMap = styleLineMap;
    this.addStyleLinesToScene(false);
  }

  loadStyleLine(styleLineMap) {
    if (!styleLineMap) return;

    this.styleLineMap = styleLineMap;
    this.addStyleLinesToScene(false);
  }

  addStyleLinesToScene(bVisible = true) {
    this.styleLineMap.forEach(styleLineSet => {
      styleLineSet.forEach(line => {
        line.visible = bVisible;
        this.styleLineContainer.add(line);
      });
    });
  }

  setStyleLineVisibleByPatternNo(patternNo, bVisible) {
    const firstMatMeshIDOnMarker = this.patternMap.get(patternNo)
      .MatMeshIdList[0];
    this.setStyleLineVisible(firstMatMeshIDOnMarker, bVisible);
  }

  setStyleLineVisible(firstLayerMatMeshID, bVisible) {
    if (this.styleLineMap.get(firstLayerMatMeshID)) {
      this.styleLineMap.get(firstLayerMatMeshID).forEach(line => {
        line.visible = bVisible;
      });
    }
  }

  setAllStyleLineVisible(bVisible) {
    this.styleLineMap.forEach(styleLineSet => {
      styleLineSet.forEach(line => {
        line.visible = bVisible;
      });
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

  bindEventListener({ onCompleteMove, onCompleteAnimation }) {
    this.onCompleteMove = onCompleteMove;
    this.onCompleteAnimation = onCompleteAnimation;
  }

  onMarker(onMarkerItems) {
    const actionsForPattern = patternIdx => {
      this.setAllStitchVisible(false);
      this.setAllTrimVisible(false);

      const patternNo = patternIdx + 1;
      this.setPatternTransparency(patternNo, 1.0);
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
        this.setPatternTransparency(patternNo, 1.0);
      });
    };

    const actionsForTrim = trimIdx => {
      const trimNo = trimIdx + 1;
      this.setSelectedTrimTransparency(
        trimNo,
        1.0,
        config.unselectedMarkerOpacity
      );
      this.trimMarker.setVisibleByMessage(trimNo, true);
    };

    const hasSelectedMarker = onMarkerItems.length > 0;
    if (hasSelectedMarker) {
      this.setAllPatternTransparency(config.unselectedMarkerOpacity);
      this.setAllStitchTransparency(config.unselectedMarkerOpacity);
    } else {
      // Return to default setting
      this.setAllPatternTransparency(1.0);
      this.setAllStitchTransparency(1.0);
      this.setAllPatternVisible(true);
      this.setAllStitchVisible(true);
      this.setAllTrimVisible(true);
    }

    this.setAllMarkerVisible(false);
    this.setAllStyleLineVisible(false);

    // TODO: Do refactoring this module
    onMarkerItems.map(({ index, id }) => {
      if (this.patternMarker.isActivated()) actionsForPattern(index);
      if (this.fabricMarker.isActivated()) actionsForFabric(index);
      if (this.trimMarker.isActivated()) actionsForTrim(index);
    });
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
        return markerManager.checkIntersect(mousePos, this.raycaster);
      }
    });
  }
}

export default TechPackManager;
