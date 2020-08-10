export default class FittingAvatar {
  constructor(container, zrest) {
    this.container = container;
  }
  async resize({
    height,
    weight,
    bodyShape,
    chest = -1,
    waist = -1,
    hip = -1,
    armLength = -1,
    legLength = -1,
  }) {
    const computed = this.resizableBody.computeResizing(
      height,
      weight,
      bodyShape,
      chest,
      waist,
      hip,
      armLength,
      legLength
    );

    // TODO: CHECK THIS OUT
    // console.warn(computed);
    const v = [];
    computed.forEach((vector) => {
      if (!vector.x || !vector.y || !vector.z) {
        console.warn(vector);
      }
      v.push(vector.x, vector.y, vector.z);
    });

    const l = this.bodyVertexPos.length;
    const nb = v.slice(0, l);
    this.bodyVertexPos = nb.map((x) => x * 10);
    // const bv = [];

    // const bufferGeometry = new THREE.BufferGeometry();
    if (this.resizableBufferGeometry) this.resizableBufferGeometry.dispose();
    this.resizableBufferGeometry = new THREE.BufferGeometry();

    for (const entries of this.resizableBody.mapStartIndex.entries()) {
      const partName = entries[0];
      const partRenderPos = this.resizableBody.updateRenderPositionFromPhysical(
        partName,
        computed
      );
      console.warn(partName);
      // console.log(v);
      this.resizableBody.scManager.putVertexOnMatMeshByPartName(
        partName,
        partRenderPos
      );
    }
  }

  getAvatarURL({ id: avatarId, skinType: avatarSkinType }) {
    this.avatarId = avatarId;

    const listById = this.mapAvtPath.get(avatarId);
    const zrestFileName = listById[avatarSkinType];
    const avtURL = this.avtRootPath + "/" + zrestFileName;
    console.log(avtURL);
    return avtURL;
  }
}
