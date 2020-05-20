import { makeMaterial } from "./zrest_material";
import { setTexturePropertyDisassembly } from "./TextureManager";
export default class Colorway {
  constructor({ zProperty: zProperty, matInfoMap: matInfoMap, clearFunc: clearFunc }) {
    this.zProperty = zProperty;
    this.matInfoMap = matInfoMap;
    this.clear = clearFunc; // NOTE: Consider whether this function is necessary.
  }

  changeColorway = async ({ colorwayIndex: colorwayIndex, jsZip: jsZip }) => {
    if (!this.checkColorwayIndex({ colorwayIndex: colorwayIndex, jsZip: jsZip })) {
      console.warn("colorwayIndex false");
      return false;
    }

    this.zProperty.colorwayIndex = colorwayIndex;

    if (this.zProperty.bDisassembled) {
      await this.changeColorwayForSeparatedZRest();
    } else {
      await this.changeColorwayForUnitedZRest({ jsZip: jsZip });
    }
    return true;
  };

  // NOTE: Consider outputing error codes
  checkColorwayIndex = ({ colorwayIndex: colorwayIndex, jsZip: jsZip }) => {
    if (colorwayIndex === undefined) {
      console.warn("Invalid colorwayIndex");
      return false;
    }

    const colorwaySize = this.zProperty.colorwaySize;
    if (colorwaySize - 1 < colorwayIndex || colorwaySize < 0) {
      console.warn("Invalid range of colorwayIndex");
      return false;
    }

    const isUnitedZRest = !this.zProperty.bDisassembled;
    const hasJSZip = jsZip !== undefined && jsZip !== null;
    if (isUnitedZRest && !hasJSZip) {
      console.warn("jsZip missing");
      return false;
    }

    return true;
  };

  changeColorwayForUnitedZRest = async ({ jsZip: jsZip }) => {
    this.clear();

    const matMeshMap = this.zProperty.matMeshMap;
    for (const matMesh of matMeshMap.values()) {
      const prevMaterial = matMesh.material;
      if (!prevMaterial) continue;

      const bPrevUseSeamPuckeringMap = prevMaterial.uniforms.bUseSeamPuckeringNormal !== undefined ? prevMaterial.uniforms.bUseSeamPuckeringNormal.value : false;
      const id = matMesh.userData.MATMESH_ID;
      const matInfo = this.matInfoMap.get(id);
      const material = await makeMaterial({ jsZip: jsZip, matProperty: matInfo, zProperty: this.zProperty, bUseSeamPuckeringNormalMap: bPrevUseSeamPuckeringMap });
      matMesh.material = material;
    }
  };

  changeColorwayForSeparatedZRest = async () => {
    const materialInformationMap = this.matInfoMap;
    console.log(materialInformationMap);

    for (const entries of this.zProperty.matMeshMap.entries()) {
      const matMeshId = entries[0];
      const matMesh = entries[1];

      const matProperty = materialInformationMap.get(matMeshId);
      const bPrevUseSeamPuckeringMap = matMesh.material.uniforms.bUseSeamPuckeringNormal.value;
      const material = await makeMaterial({
        jsZip: null,
        matProperty: matProperty,
        zProperty: this.zProperty,
        matMeshID: matMeshId,
        bUseSeamPuckeringNormalMap: bPrevUseSeamPuckeringMap
      });

      matMesh.material = material;
    }

    this.zProperty.nameToTextureMap.forEach(async (threeJSTexture, textureFilename) => {
      await setTexturePropertyDisassembly({
        textureFilename: textureFilename,
        threeJSTexture: threeJSTexture,
        materialInformationMap: this.matInfoMap,
        zProperty: this.zProperty
      });
    });
  };
}
