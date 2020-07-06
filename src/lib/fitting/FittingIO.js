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

  const convertingMatData = readConvertingMatData({
    unzippedConvertingMatData,
  });

  const mapHeightWeightTo5Sizes = await getParsedData(
    "HeightWeightTo5SizesMap.map"
  );

  return { mapBaseMesh, convertingMatData, mapHeightWeightTo5Sizes };
}

function readConvertingMatData({ unzippedConvertingMatData }) {
  const matrixSizes = new Int32Array(unzippedConvertingMatData, 0, 2);
  const matWidth = matrixSizes[0]; // Features
  const matHeight = matrixSizes[1]; // Indices
  const offsetByMatrixSizes = matrixSizes.BYTES_PER_ELEMENT * 2;
  const convertingMatData = new Float32Array(
    unzippedConvertingMatData,
    offsetByMatrixSizes
  );

  const mat = new Array(matWidth);
  for (let i = 0; i < matWidth; ++i) {
    const begin = matHeight * i;
    const end = matHeight * (i + 1) - 1;
    mat[i] = convertingMatData.slice(begin, end);
  }

  return mat;
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
