// import "@/lib/clo/readers/FileLoader";
//import { FileLoader } from "three";
// import ZRestLoader from "@/lib/clo/readers/ZrestLoader";
import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap, readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export async function processAvatarSizingFile({ url: url }) {
  const loadedData = await loadFile(url);

  const getParsedData = async (filename) => {
    return await unzipParse({
      loadedData: loadedData,
      filename: filename,
    });
  };
  const mapBaseMesh = await getParsedData("BaseMesh.map");
  const convertingMatData = await unZip(
    loadedData,
    "ConvertingMat_DETAIL_Simple_Weight_TotalHeight.bd"
    // "blob"
    // true
  );
  // const m = readByteArray("Float", convertingMatData);
  // getParsedData(
  //   "ConvertingMat_DETAIL_Simple_Weight_TotalHeight.bd"
  // );
  const mapHeightWeightTo5Sizes = await getParsedData(
    "HeightWeightTo5SizesMap.map"
  );

  console.log(mapBaseMesh);
  // console.log(convertingMatData);
  // const m = new DataView(convertingMatData, { Offset: 0 });
  console.log(new Float32Array(convertingMatData, { Offset: 0 }));
  console.log(mapHeightWeightTo5Sizes);

  return { mapBaseMesh };
}

async function unzipParse({ loadedData, filename }) {
  const unzippedData = await unZip(loadedData, filename);

  const fileOffset = { Offset: 0 };
  const dataView = new DataView(unzippedData);
  const parsedData = readMap(dataView, fileOffset);

  return parsedData;
}

async function loadUnzipParse({ url }) {
  const loadedData = await loadFile(url);

  const unzippedData = await unZip(loadedData, "BaseMesh.map");

  const fileOffset = { Offset: 0 };
  const dataView = new DataView(unzippedData);
  const parsedData = readMap(dataView, fileOffset);

  return parsedData;
}
