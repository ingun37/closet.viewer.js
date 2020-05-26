import * as THREE from "@/lib/threejs/three";
import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export default class Avatar {
  constructor(scene) {
    this.listSkinController = new Map();
    this.scene = scene;
  }

  load({ mapGeometry: mapGeometry }) {
    this.extractController(mapGeometry);
    return this.listSkinController;
  }

  clear() {}

  // TODO: Refactor this module
  extractController(mapInput) {
    const shouldRecursive = (element) => {
      return (
        element instanceof Map &&
        element.has("listChildrenTransformer3D") &&
        element.get("listChildrenTransformer3D") != null
      );
    };

    if (shouldRecursive(mapInput)) {
      this.extractController(mapInput.get("listChildrenTransformer3D"));
    } else {
      mapInput.forEach((inputElement) => {
        if (shouldRecursive(inputElement)) {
          return this.extractController(inputElement);
        }
        if (inputElement.has("listSkinController")) {
          console.log(inputElement);
          console.log(inputElement.get("listSkinController"));
          this.listSkinController = inputElement.get("listSkinController");
        }
      });
    }
  }

  buildMesh(mapMesh) {
    const bufferGeometry = new THREE.BufferGeometry();
    const arrayIndex = readByteArray("Int", mapMesh.get("baIndex"));
    const arrayPosition = readByteArray("Float", mapMesh.get("baPosition"));

    bufferGeometry.addAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(arrayPosition), 3)
    );
    bufferGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(arrayIndex), 1)
    );
    bufferGeometry.computeFaceNormals();
    bufferGeometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial();
    // material.wireframe = true;
    material.color = THREE.Vector3(1, 1, 1);
    const threeMesh = new THREE.Mesh(bufferGeometry, material);

    this.scene.add(threeMesh);

    // const light = new THREE.DirectionalLight(0xffffff);
    // light.position.set(0, 1, 1).normalize();
    // this.scene.add(light);

    console.log(threeMesh);
  }

  test(listSkinController) {
    const sc = listSkinController[0];
    const mapMesh = sc.get("mapMesh");

    this.buildMesh(mapMesh);
    //const baVertexColor = readByteArray("Float", matShape.get(vertexColor));
  }
}
