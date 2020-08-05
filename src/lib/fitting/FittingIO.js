import { loadFile, unZip } from "@/lib/clo/readers/FileLoader";
import { readMap } from "@/lib/clo/file/KeyValueMapReader";

export async function processAvatarSizingFile({ sizingURL, accURL }) {
  const loadedSizingData = await loadFile(sizingURL);
  const loadedAccData = await loadFile(accURL);

  const getParsedData = async (filename, loadedData) => {
    return await unzipParse({
      loadedData: loadedData,
      filename: filename,
    });
  };

  const mapBaseMesh = await getParsedData("BaseMesh.map", loadedSizingData);

  const unzippedConvertingMatData = await unZip(
    loadedSizingData,
    "ConvertingMat_DETAIL_Simple_Weight_TotalHeight.bd"
  );

  const convertingMatData = readConvertingMatData({
    unzippedConvertingMatData,
  });

  const mapHeightWeightTo5Sizes = await getParsedData(
    "HeightWeightTo5SizesMap.map",
    loadedSizingData
  );

  const mapAccessoryMesh = await readMapFromUnzippedData(loadedAccData, 0);

  return {
    mapBaseMesh,
    convertingMatData,
    mapHeightWeightTo5Sizes,
    mapAccessoryMesh,
  };
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
  return readMapFromUnzippedData(unzippedData, 0);
}

function readMapFromUnzippedData(unzippedData, offset) {
  const fileOffset = { Offset: offset };
  const dataView = new DataView(unzippedData);
  return readMap(dataView, fileOffset);
}

export async function loadZrestForFitting({
  url: url,
  funcOnProgress: onProgress,
  funcOnLoad: onLoad,
  zrest: zrest,
  isAvatar: isAvatar = false,
}) {
  // const scene = this.scene;

  const progress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      const percent = Math.round(percentComplete, 2);
      if (onProgress) onProgress(percent);
    }
  };

  const error = function (xhr) {};

  // const loaded = () => {};
  const loaded = async (object, loadedCamera, data) => {
    if (isAvatar) zrest.addToScene(object, "fittingAvatar");
    else zrest.addToScene(object);
    // this.addToScene(object);

    if (onLoad) onLoad(this);

    zrest.zoomToObjects(loadedCamera, zrest.scene);
    if (!isAvatar) this.updateRenderer();
    // this.updateRenderer();

    return zrest.scene;
  };

  if (zrest !== undefined) {
    zrest.clearMaps();
    // zrest = null;
  }

  // const zrest = new ZRestLoader({
  //   scene: this.scene,
  //   camera: this.camera,
  //   controls: this.controls,
  //   cameraPosition: this.cameraPosition,
  // });

  const dataArr = await zrest.loadOnly(url, progress);
  await zrest.parseAsync(dataArr, loaded);

  return zrest;
}
