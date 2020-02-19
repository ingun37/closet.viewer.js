/* eslint-disable require-jsdoc */
import { MATMESH_TYPE } from "@/lib/clo/readers/predefined";

class MatMeshController {
  constructor({ matMeshMap: matMeshMap }) {
    this.matMeshMap = matMeshMap;

    // this.setVisible = this.setVisible.bind();
    // this.setVisibleByList = this.setVisibleByList.bind();
    // this.getMatMeshIdList = this.getMatMeshIdList.bind();
  }

  g() {
    console.log(this.matMeshMap);
  }

  // setVisible() {
  setVisible(matMeshId, bVisible) {
    console.log(this.matMeshMap);
    const mesh = this.matMeshMap.get(matMeshId);
    if (mesh) {
      mesh.visible = bVisible;
    }
  }

  setVisibleByList({ matMeshIdList: matMeshIdList, bVisible: bVisible }) {
    matMeshIdList.forEach(matMeshId => {
      this.setVisible(matMeshId, bVisible);
    });
  }

  isMatMeshType(matMeshType) {
    console.log(MATMESH_TYPE);
    return MATMESH_TYPE.indexOf(matMeshType) > -1;
  }

  getMatMeshIdList(matMeshType) {
    const isCorrectType = this.isMatMeshType(matMeshType);
    if (!isCorrectType) return [];

    const list = [];
    this.matMeshMap.forEach(matMesh => {
      if (matMesh.userData) {
        const type = matMesh.userData.TYPE;
        if (type === matMeshType) {
          list.push(matMesh.userData.MATMESH_ID);
        }
      }
    });

    return list.sort();
  }

  //   setTransparent(matMeshId, bTransparent) {
  //     const mesh = this.matMeshMap.get(matMeshId);
  //     if (mesh) {
  //       if (bTransparent) set();
  //       else reset(mesh);
  //     }
  //   }

  //   setVisibleAllGarment(visibility) {
  //     if (!this.zrest) return;

  //     const isGarment = patternType => {
  //       return this.mapGarmentType.indexOf(patternType) > -1;
  //     };

  //     this.zrest.matMeshMap.forEach(matMesh => {
  //       if (isGarment(matMesh.userData.TYPE)) {
  //         matMesh.visible = visibility;
  //       }
  //     });

  //     this.updateRenderer();
  //   }
}
// const mapGarmentType = [
//   matMeshType.PATTERN_MATMESH,
//   matMeshType.TRIM_MATMESH,
//   matMeshType.PRINTOVERLAY_MATMESH,
//   matMeshType.BUTTONHEAD_MATMESH,
//   matMeshType.STITCH_MATMESH,
//   matMeshType.BUTTONHOLE_MATMESH,
//   matMeshType.ZIPPER_MATMESH
// ];

// export function isGarment(matMesh_TYPE) {
//   return mapGarmentType.indexOf(matMesh_TYPE) > -1;
// }

// export function setVisible() {}
// export function setTransparent(matMeshId, bTransparent) {
//   const mesh = this.matMeshMap.get(matMeshId);
//   if (mesh) {
//     if (bTransparent) set();
//     else reset(mesh);
//   }
// }

export default MatMeshController;
