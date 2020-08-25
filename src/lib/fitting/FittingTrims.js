import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export default class FittingTrims {
  constructor(zrest) {
    const zProperty = zrest.zProperty;

    this.mapMatMesh = zProperty.matMeshMap;
    this.mapBarycentricPrintTexture = zProperty.rootMap.get(
      "mapBarycentricPrintTexture"
    );
    this.listPrintBary = this.mapBarycentricPrintTexture
      ? this.mapBarycentricPrintTexture.get("listPrintTextureBarycentric")
      : [];

    this.mapPrintTexture = this.read(this.listPrintBary);

    console.log(this.mapPrintTexture);
    console.log("FittingTrims load complete");
  }

  read(listPrintTextureBarycentric) {
    console.log(listPrintTextureBarycentric);
    const mapPrintTexture = new Map();

    listPrintTextureBarycentric.forEach((element) => {
      // TODO: Ask to change the data type from byte to int
      const matMeshID = parseInt(
        readByteArray("String", element.get("patternMatMeshID"))
      );
      const printTextureMatMeshID = parseInt(
        readByteArray("String", element.get("printTextureMatMeshID"))
      );
      const baBarycentricPointList = element.get("baBarycentricPointList");
      const baryPointList = readByteArray("Float", baBarycentricPointList);

      console.log(matMeshID);
      console.log(printTextureMatMeshID);
      console.log(baryPointList);

      const obj = new Object();
      obj["printTextureMatMeshID"] = printTextureMatMeshID;
      obj["baryPointList"] = baryPointList;

      mapPrintTexture.set(matMeshID, obj);
    });

    return mapPrintTexture;
  }

  processOverlay() {}
}
