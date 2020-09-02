import * as THREE from "@/lib/threejs/three";

export function computeBarycentric({
  listABG,
  listTriangleIndex,
  bodyVertexPos,
  bodyVertexIndex,
}) {
  // demarcationLine
  const calculatedPosition = [];
  for (let i = 0; i < listTriangleIndex.length; ++i) {
    const triIndex = listTriangleIndex[i];

    const abg = new THREE.Vector3();
    abg.x = listABG[i * 3]; // alpha
    abg.y = listABG[i * 3 + 1]; // beta
    abg.z = listABG[i * 3 + 2]; // gamma

    // FIXME: Check this out
    if (1) {
      // if (abg.z <= demarcationLine) {

      const v0 = get3Vertices(triIndex * 3, bodyVertexPos, bodyVertexIndex);
      const v1 = get3Vertices(triIndex * 3 + 1, bodyVertexPos, bodyVertexIndex);
      const v2 = get3Vertices(triIndex * 3 + 2, bodyVertexPos, bodyVertexIndex);

      const n = triangleCross(v0, v1, v2);
      n.normalize();

      const p0 = new THREE.Vector3(v0.x, v0.y, v0.z);
      const A = new THREE.Vector3().subVectors(v1, v0);
      const B = new THREE.Vector3().subVectors(v2, v0);

      const alphaXA = new THREE.Vector3(abg.x * A.x, abg.x * A.y, abg.x * A.z);
      const betaXB = new THREE.Vector3(abg.y * B.x, abg.y * B.y, abg.y * B.z);
      const normalXG = new THREE.Vector3(abg.z * n.x, abg.z * n.y, abg.z * n.z);

      let position = new THREE.Vector3(0, 0, 0)
        .add(p0)
        .add(alphaXA)
        .add(betaXB)
        .add(normalXG);

      calculatedPosition.push(position.x, position.y, position.z);
    } else {
      console.warn("ELSE");
    }
  }

  return calculatedPosition;
}

function get3Vertices(triangleIndex, bodyVertexPos, bodyVertexIndex) {
  // const triIdxOnVertexIdx = triangleIndex * 3;
  const triIdxOnVertexIdx = triangleIndex;
  if (triIdxOnVertexIdx < 0 || triIdxOnVertexIdx >= bodyVertexIndex.length) {
    console.warn(
      "Wrong meshIdx: " + triIdxOnVertexIdx + " of " + bodyVertexIndex.length
    );
  }

  // 3 vertices for 1 triangle
  const vertexIdx = bodyVertexIndex[triIdxOnVertexIdx];

  const v = new THREE.Vector3(
    bodyVertexPos[vertexIdx * 3],
    bodyVertexPos[vertexIdx * 3 + 1],
    bodyVertexPos[vertexIdx * 3 + 2]
  );

  return v;
}

function triangleCross(v0, v1, v2) {
  const compare = (v0, v1) => {
    return v0.x == v1.x || v0.y == v1.y || v0.z == v1.z;
  };

  const x = (v1.y - v0.y) * (v2.z - v0.z) - (v1.z - v0.z) * (v2.y - v0.y);
  const y = (v1.z - v0.z) * (v2.x - v0.x) - (v1.x - v0.x) * (v2.z - v0.z);
  const z = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);

  return new THREE.Vector3(x, y, z);
}
