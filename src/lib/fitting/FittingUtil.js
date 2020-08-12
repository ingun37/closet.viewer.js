import { readByteArray } from "@/lib/clo/file/KeyValueMapReader";

export function buildMapMatshapeRenderToSkinPos(baseMeshMap) {
  const listMatshapeRenderToSkinPos = baseMeshMap.get(
    "listMatshapeRenderToSkinPos"
  );
  const mapMatshapeRenderToSkinPos = new Map();
  // this.mapMatshapeRenderToSkinPos = new Map();

  listMatshapeRenderToSkinPos.forEach((entry) => {
    const renderToSkinPos = readByteArray(
      "Int",
      entry.get("baRenderToSkinPos")
    );
    const strName = readByteArray("String", entry.get("strNameUTF8"));
    const uiVertexCount = entry.get("uiVertexCount");

    mapMatshapeRenderToSkinPos.set(
      strName,
      new Map([
        ["renderToSkinPos", renderToSkinPos],
        ["uiVertexCount", uiVertexCount],
      ])
    );
  });

  return mapMatshapeRenderToSkinPos;
}
