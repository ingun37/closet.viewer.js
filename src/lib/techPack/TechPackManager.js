/* eslint-disable require-jsdoc */
import * as THREE from "@/lib/threejs/three";
// import {Marker, makeTextSprite} from '@/lib/marker/Marker';
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";
import MarkerManager from "@/lib/marker/MarkerManager";

const config = { selectedMarkerOpacity: 0.1, INF: 999999 };

class TechPackManager {
  constructor({ scene, camera, renderer, controls }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.matShapeMap = new Map();
    this.matMeshMap = new Map();
    this.styleLineMap = new Map();
    this.jsonLists = {}; // NOTE: This array will be inited by clearJsonLists()

    this.raycaster = new THREE.Raycaster(); // FIXME: Is this necessary?
    this.loadTechPack = this.loadTechPack.bind(this);
    this.loadStyleLine = this.loadStyleLine.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);

    // this.extractPatternListFromMatMeshList = this.extractPatternListFromMatMeshList.bind(this);
    this.init();
  }

  init() {
    const params = {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls
    };

    this.clearJsonLists();

    // Init MarkerManagers
    this.patternMarker = new MarkerManager("pattern", params);
    this.fabricMarker = new MarkerManager("fabric", params);
    this.trimMarker = new MarkerManager("trim", params);

    // Init the container for style line
    this.styleLineContainer = new THREE.Object3D();
    this.styleLineContainer.name = "styleLineContainer";
    this.scene.add(this.styleLineContainer);
  }

  assignThreeJSContainer(beAssignedVariable, name) {
    beAssignedVariable = new THREE.Object3D();
    beAssignedVariable.name = name;
    // this.scene.add(beAssignedVariable);
  }

  // This function also used for init to jsonLists
  clearJsonLists() {
    this.jsonLists = {
      pattern: [],
      fabric: [],
      trim: {
        graphic: [],
        buttonHead: [],
        buttonHole: [],
        topstitch: []
      }
    };
  }

  clearTechPack() {
    // FIXME: This module not gonna work
    this.markerMap = new Map();
    this.markerGeometryList = [];
    this.styleLineMap = new Map();
    this.patternList = [];

    this.scene.remove(this.patternMarkerContainer);
    this.scene.remove(this.styleLineContainer);

    delete this.patternMarkerContainer;
    delete this.styleLineContainer;

    this.init();
  }

  // loadTechPackOld(matShapeMap, matMeshList) {
  //   // TODO: Write completely this code
  //   // this.clearTechPack();

  //   this.loadTechPackFromMatShapeMap(matShapeMap);
  //   this.extractPatternListFromMatMeshList(matMeshList);
  // }

  loadTechPack(matShapeMap, matMeshMap) {
    // TODO: Write completely this code
    // this.clearTechPack();

    this.matShapeMap = matShapeMap;
    this.matMeshMap = matMeshMap;

    // Build pattern markers
    this.buildMarkersFromList(
      this.patternMarker,
      this.jsonLists.pattern.map(pattern => {
        return pattern.matMeshIdList[0];
      }),
      matShapeMap
    );

    this.buildFabricMarkers(matShapeMap);

    // Build trim markers
    const jsonTrimValueArray = Object.values(this.jsonLists.trim);
    let labelCounter = 1;
    jsonTrimValueArray.forEach(trimElement => {
      if (trimElement) {
        labelCounter = this.buildMarkersFromList(
          this.trimMarker,
          trimElement[0].matMeshIdList,
          matShapeMap,
          labelCounter,
          0
        );
      }
    });

    this.setActiveMarker("pattern");
  }

  loadJsonFromAPI(
    pattern,
    fabric,
    { graphic, buttonHead, buttonHole, topstitch }
  ) {
    this.jsonLists.pattern = pattern;
    this.jsonLists.fabric = fabric;
    this.jsonLists.trim = {
      graphic: graphic,
      buttonHead: buttonHead,
      buttonHole: buttonHole,
      topstitch: topstitch
    };
    console.log(this.jsonLists);
  }

  updatePointerSize() {
    // TODO: update active marker only
    this.patternMarker.updatePointerSize();
    this.fabricMarker.updatePointerSize();
    this.trimMarker.updatePointerSize();
  }

  buildFabricMarkers(matMeshIdIndexedMatShapeMap) {
    // Extract MATMESH_IDs from fabric list
    const fabricIdList = [];
    this.jsonLists.fabric.forEach(fabric => {
      fabricIdList.push(Number(fabric.patternIdList[0]));
    });

    // Find matched meshes with above list.
    const matchedMatMeshList = Array(fabricIdList.length);

    for (let i = 0; i < this.jsonLists.pattern.length; ++i) {
      const fabricIdx = fabricIdList.findIndex(
        idx => idx === this.jsonLists.pattern[i].id
      );
      if (fabricIdx >= 0) {
        // NOTE: The length of matMeshIdList might be 1 to 3 depends on mesh type.
        // TODO: Test for empty arrays
        const currPatternMatMeshIdList = this.jsonLists.pattern[i]
          .matMeshIdList;
        const firstPatternIdForMarking = currPatternMatMeshIdList[0];
        matchedMatMeshList[fabricIdx] = firstPatternIdForMarking;
      }
    }

    this.buildMarkersFromList(
      this.fabricMarker,
      matchedMatMeshList,
      matMeshIdIndexedMatShapeMap
    );
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

    matMeshIdList.forEach(matMeshId => {
      const matShape = matShapeMap.get(Number(matMeshId));
      if (this.buildMarker(matMeshId, labelCounter, markerManager, matShape)) {
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
  buildMarker(matMeshId, markerMessage, markerManager, matShape, index = -1) {
    if (!matShape) {
      console.log("DEBUG: " + matMeshId + " is missing");
      return false;
    }
    const center = matShape.get("v3Center");
    const normal = matShape.get("v3Normal");
    const position = {
      pointerPos: center,
      faceNormal: normal,
      cameraPos: this.camera.position,
      cameraTarget: this.controls.target,
      cameraQuaternion: this.camera.quaternion
    };

    if (index > 0) {
      markerManager.add(index, { ...position, message: markerMessage }, false);
    } else markerManager.insert({ ...position, message: markerMessage }, false);

    return true;
  }

  loadTechPackFromMatShapeMap(matShapeMap) {
    if (!matShapeMap) return;

    //  NOTE: All elements in mapShape array have the same value.
    //  This module will be modified by TKAY and Daniel.
    let labelCounter = 1;
    for (let i = 0; i < matShapeMap.length; ++i) {
      const matShape = matShapeMap[i].get("listMatMeshIDOnIndexedMesh");
      const center = matShape[0].get("v3Center");
      const normal = matShape[0].get("v3Normal");
      const isPatternMesh = matShape.length === 3;

      if (!center || !normal || !isPatternMesh) {
        continue;
      }

      const position = {
        pointerPos: center,
        faceNormal: normal,
        cameraPos: this.camera.position,
        cameraTarget: this.controls.target,
        cameraQuaternion: this.camera.quaternion
      };

      const index = labelCounter++;
      this.patternMarker.addMarker(
        index,
        { ...position, message: index },
        false
      );
    }
  }

  setActiveMarker(markerType) {
    this.patternMarker.container.visible = false;
    this.fabricMarker.container.visible = false;
    this.trimMarker.container.visible = false;

    this.patternMarker.removeFromScene();
    this.fabricMarker.removeFromScene();
    this.trimMarker.removeFromScene();

    if (markerType == "pattern") {
      this.patternMarker.addToScene();
      this.patternMarker.container.visible = true;
      console.log("pattern activated");
    } else if (markerType == "fabric") {
      this.fabricMarker.addToScene();
      this.fabricMarker.container.visible = true;
      console.log("fabric activated");
    } else if (markerType == "trim") {
      this.trimMarker.addToScene();
      this.trimMarker.container.visible = true;
      console.log("trim activated");
    }
  }

  setPatternVisible(patternIdx, bVisible) {
    if (
      typeof this.jsonLists.pattern === "undefined" ||
      !this.isValidPatternIdx
    )
      return;

    const patternList = this.jsonLists.pattern;
    console.log(patternList);
    console.log(patternList[patternIdx]);
    patternList[patternIdx].matMeshIdList.forEach(matMeshId => {
      this.matMeshMap.get(matMeshId).visible = bVisible;
    });
  }

  setAllPatternVisible(bVisible) {
    if (typeof this.jsonLists.pattern === "undefined") return;

    const patternList = this.jsonLists.pattern;
    for (let i = 0; i < patternList.length; ++i) {
      this.setPatternVisible(i, bVisible);
    }
  }

  isValidPatternIdx(patternIdx) {
    return patternIdx >= 0 && patternIdx <= this.patternList.length;
  }

  setAllPatternTransparency(opacity) {
    if (typeof this.jsonLists.pattern === "undefined") return;

    const patternList = this.jsonLists.pattern;
    for (let i = 0; i < patternList.length; ++i) {
      this.setPatternTransparency(i, opacity);
    }
  }

  setPatternTransparency(patternIdx, opacity) {
    if (
      typeof this.jsonLists.pattern === "undefined" ||
      !this.isValidPatternIdx
    )
      return;

    const patternList = this.jsonLists.pattern;
    patternList[patternIdx].matMeshIdList.forEach(matMeshId => {
      this.matMeshMap.get(matMeshId).material.uniforms.materialOpacity = {
        type: "f",
        value: opacity
      };
    });

    // for (let i = 0; i < 3; ++i) {
    //   this.patternList[patternIdx][i].material.uniforms.materialOpacity = {
    //     type: "f",
    //     value: opacity
    //   };
    // }
  }

  togglePatternTransparency(
    patternIdx,
    selectedOpacity = 0.5,
    defaultOpacity = 1.0
  ) {
    if (!this.isValidPatternIdx) return;

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

  setStyleLineVisible(patternIdx, bVisible) {
    if (this.styleLineMap.get(patternIdx)) {
      this.styleLineMap.get(patternIdx).forEach(line => {
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
    this.patternMarker.setVisibleForAll(bVisible);
    this.fabricMarker.setVisibleForAll(bVisible);
    this.trimMarker.setVisibleForAll(bVisible);
  }

  bindEventListener({ onCompleteMove, onCompleteAnimation }) {
    this.onCompleteMove = onCompleteMove;
    this.onCompleteAnimation = onCompleteAnimation;
  }

  onMarker(onMarkerItems) {
    if (onMarkerItems.length) {
      this.setAllPatternTransparency(config.selectedMarkerOpacity);
    } else {
      this.setAllPatternTransparency(1.0);
    }
    this.setAllMarkerVisible(false);
    this.setAllStyleLineVisible(false);

    onMarkerItems.map(({ index, id }) => {
      this.setPatternTransparency(index, 1.0);
      this.patternMarker.setVisible(index, true);
      // this.setMarkerVisible(index, true); // REMEMBER: What was this?
      this.setStyleLineVisible(index, true);
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
    if (this.patternMarker) {
      return this.patternMarker.checkIntersectObject({ clientX, clientY });
    }
  }
}

export default TechPackManager;
