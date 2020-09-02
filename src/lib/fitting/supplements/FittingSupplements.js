import { processOverrayPrint } from "@/lib/fitting/supplements/FittingOverrayPrint";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";

export default class FittingSupplements {
  constructor(zrest) {
    const zProperty = zrest.zProperty;

    this.mapMatMesh = zProperty.matMeshMap;
    // this.mapBarycentricPrintTexture = zProperty.rootMap.get(
    //   "mapBarycentricPrintTexture"
    // );
    // this.listPrintBary = this.mapBarycentricPrintTexture
    //   ? this.mapBarycentricPrintTexture.get("listPrintTextureBarycentric")
    //   : [];

    // NOTE: Test only
    // processOverrayPrint(this.listPrintBary, zrest);

    // this.mapPrintTexture = this.read(this.listPrintBary);
    // console.log(this.mapPrintTexture);

    console.log("FittingSupplements load complete");
  }

  async test(supplementsFile, mapMatMesh) {
    const rootMap = await this.load(supplementsFile);

    const listPrintBary = rootMap.get("listPrintTextureBarycentric");
    if (listPrintBary) processOverrayPrint(listPrintBary, mapMatMesh);

    // this.listPrintBary = this.mapBarycentricPrintTexture
    //   ? this.mapBarycentricPrintTexture.get("listPrintTextureBarycentric")
    //   : [];

    // NOTE: Test only
    // processOverrayPrint(this.listPrintBary, zrest);

    // this.mapPrintTexture = this.read(this.listPrintBary);
    // console.log(this.mapPrintTexture);
  }

  async load(supplementsFile) {
    const loadedData = await loadFile(supplementsFile);
    const rootMap = readMap(new DataView(loadedData), { Offset: 0 });
    return rootMap;
  }
}
