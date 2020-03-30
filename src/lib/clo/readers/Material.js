import * as THREE from "@/lib/threejs/three";

export default class ZrestMaterial {
  constructor(matMeshMap) {
    this.matMeshMap = matMeshMap;
    this.materialMap = new Map();

    this.wireMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });

    this.init();
    this.setWireframe = this.setWireframe;
  }

  init() {
    for (const [id, mesh] of this.matMeshMap.entries()) {
      const material = mesh.material;
      if (material) {
        console.log(material);
        this.materialMap.set(id, material);
      }
    }
  }

  setWireframe = bWire => {
    if (bWire) {
      this.init();

      this.matMeshMap.forEach(matMesh => {
        matMesh.material = this.wireMaterial;
      });
    } else {
      for (const matMeshId of this.matMeshMap.keys()) {
        const matMesh = this.matMeshMap.get(matMeshId);
        const material = this.materialMap.get(matMeshId);

        matMesh.material = material;
      }
    }
  };
}
