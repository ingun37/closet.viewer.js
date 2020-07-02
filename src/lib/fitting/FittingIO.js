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

  const unzippedConvertingMatData = await unZip(
    loadedData,
    "ConvertingMat_DETAIL_Simple_Weight_TotalHeight.bd"
  );
  const convertingMatData = new Float32Array(unzippedConvertingMatData, {
    Offset: 0,
  });

  const mapHeightWeightTo5Sizes = await getParsedData(
    "HeightWeightTo5SizesMap.map"
  );

  return { mapBaseMesh, convertingMatData, mapHeightWeightTo5Sizes };
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
