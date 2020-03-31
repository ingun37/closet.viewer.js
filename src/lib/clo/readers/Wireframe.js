import * as THREE from "@/lib/threejs/three";

export default class Wireframe {
  constructor(matMeshMap) {
    // Inner storage
    this.matMeshMap = matMeshMap;
    this.materialMap = new Map();

    // Default mesh material for wire
    this.wireMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });

    // External interface
    this.set = this.set.bind(this);
    this.setColorHex = this.setColorHex.bind(this);
    this.setColorRGB = this.setColorRGB.bind(this);
  }

  set = bWire => {
    if (bWire) {
      this.save();

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

  // Hexadecimal color (recommended). (ex: 0xff0000)
  setColorHex = hexColor => {
    const color = new THREE.Color(hexColor);
    this.wireMaterial.color = color;
  }

  // Separate RGB values between 0 and 1. (ex: (1, 0, 0.5))
  setColorRGB = (R, G, B) => {
    const color = new THREE.Color(R, G, B);
    this.wireMaterial.color = color;
  }

  save = () => {
    for (const [id, mesh] of this.matMeshMap.entries()) {
      const material = mesh.material;
      if (material) {
        this.materialMap.set(id, material);
      }
    }
  }
}