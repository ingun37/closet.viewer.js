import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export default class Avatar {
  constructor() {
    this.listSkinController = new Map();
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
    console.log(readByteArray("Int", mapMesh.get("baIndex")));
    console.log(readByteArray("Float", mapMesh.get("baPosition")));
  }

  test(listSkinController) {
    const sc = listSkinController[0];
    const mapMesh = skinController.get("mapMesh");

    this.buildMesh(mapMesh);
    //const baVertexColor = readByteArray("Float", matShape.get(vertexColor));
  }
}
