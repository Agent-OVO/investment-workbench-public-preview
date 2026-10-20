// Shared CPU-testable contracts for the independent art viewer. No business state.
export const rawName = object => object.userData?.name || object.name;

export function inspectAsset(T, root) {
  root.updateMatrixWorld(true);
  let nodes = 0, meshes = 0, triangles = 0;
  const names = [], materials = new Set(), textures = new Set();
  const transmissionMeshes = [], alphaZeroMeshes = [];
  root.traverse(object => {
    if (object !== root) { nodes++; names.push(rawName(object)); }
    if (!object.isMesh) return;
    meshes++;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    const entries = Array.isArray(object.material) ? object.material : [object.material];
    if (entries.some(m => m.transmission > 0)) transmissionMeshes.push(rawName(object));
    if (entries.every(m => m.opacity === 0)) alphaZeroMeshes.push(rawName(object));
    entries.forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
    });
  });
  const bounds = new T.Box3().setFromObject(root);
  return {
    nodes, meshes, triangles, materialCount: materials.size, textureCount: textures.size,
    roots: root.children.map(rawName), rootCount: root.children.length,
    duplicateNodeNames: [...new Set(names.filter((name, index) => name && names.indexOf(name) !== index))],
    bounds: {min: bounds.min.toArray(), max: bounds.max.toArray()},
    transmissionMeshes, alphaZeroMeshes,
    materials: [...materials].map(m => ({
      name: m.name, type: m.type, color: m.color?.toArray(), roughness: m.roughness,
      metalness: m.metalness, opacity: m.opacity, transparent: m.transparent,
      alphaTest: m.alphaTest, transmission: m.transmission || 0, ior: m.ior,
      thickness: m.thickness || 0, side: m.side, depthWrite: m.depthWrite,
      envMapIntensity: m.envMapIntensity,
      textures: Object.entries(m).filter(([,v]) => v?.isTexture).map(([slot,t]) => ({
        slot, name: t.name, size: [t.image?.width || 0, t.image?.height || 0],
        encoding: t.encoding, flipY: t.flipY, repeat: t.repeat.toArray(), offset: t.offset.toArray()
      }))
    }))
  };
}

export function validateAsset(T, root, asset) {
  const actual = inspectAsset(T, root), expected = asset.expected;
  for (const key of ['nodes','meshes','triangles','materialCount']) {
    if (actual[key] !== expected[key]) throw new Error(`${asset.id}: ${key} contract mismatch`);
  }
  if (JSON.stringify(actual.roots) !== JSON.stringify(expected.roots)) throw new Error(`${asset.id}: root contract mismatch`);
  if (actual.duplicateNodeNames.length) throw new Error(`${asset.id}: duplicate node names`);
  for (const edge of ['min','max']) for (let i = 0; i < 3; i++) {
    if (!Number.isFinite(actual.bounds[edge][i]) || Math.abs(actual.bounds[edge][i] - expected.bounds[edge][i]) > 1e-6) {
      throw new Error(`${asset.id}: world bounds mismatch`);
    }
  }
  for (const [key, filter] of [
    ['transmissionMaterials', m => m.transmission > 0],
    ['alphaZeroMaterials', m => m.opacity === 0]
  ]) {
    const names = actual.materials.filter(filter).map(m => m.name).sort();
    if (JSON.stringify(names) !== JSON.stringify([...expected[key]].sort())) throw new Error(`${asset.id}: ${key} mismatch`);
  }
  return actual;
}

export function prepareShadowFlags(root) {
  // glTF has no standard cast/receive-shadow flags. Preserve every material value;
  // transmissive/empty layers do not cast an opaque substitute shadow.
  root.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const opaque = materials.every(m => !m.transparent && !(m.transmission > 0) && m.opacity > 0);
    object.castShadow = opaque;
    object.receiveShadow = opaque;
  });
}

export function createCommonFrame(T, group) {
  // Compute a single envelope from the whole comparison group's fixed bounds.
  // Variant switching never calls this function or changes the camera pose.
  const target = new T.Vector3().fromArray(group.target);
  const delta = new T.Vector3().fromArray(group.position).sub(target);
  const radius = delta.length(), baseYaw = Math.atan2(delta.x, delta.z);
  const basePitch = Math.asin(delta.y / radius), radians = Math.PI / 180;
  const corners = [];
  for (const x of [group.commonBounds.min[0], group.commonBounds.max[0]])
    for (const y of [group.commonBounds.min[1], group.commonBounds.max[1]])
      for (const z of [group.commonBounds.min[2], group.commonBounds.max[2]]) corners.push(new T.Vector3(x,y,z));
  let halfWidth = 0, halfHeight = 0;
  const probe = new T.OrthographicCamera(-1,1,1,-1,.1,200);
  for (const yaw of [-12,0,12]) for (const pitch of [-4,0,4]) {
    const a = baseYaw + yaw*radians, b = basePitch + pitch*radians;
    probe.position.set(target.x+radius*Math.cos(b)*Math.sin(a),target.y+radius*Math.sin(b),target.z+radius*Math.cos(b)*Math.cos(a));
    probe.lookAt(target); probe.updateMatrixWorld(true);
    for (const corner of corners) {
      const p = corner.clone().applyMatrix4(probe.matrixWorldInverse);
      halfWidth = Math.max(halfWidth,Math.abs(p.x)); halfHeight = Math.max(halfHeight,Math.abs(p.y));
    }
  }
  return Object.freeze({halfWidth: halfWidth*1.08, halfHeight: halfHeight*1.08,
    authoredScale: group.orthoScale, commonBounds: group.commonBounds, fitCount: 1});
}

export function resizeProjection(camera, frame, width, height) {
  const aspect = Math.max(1,width)/Math.max(1,height);
  const halfHeight = Math.max(frame.authoredScale/2,frame.halfHeight,frame.halfWidth/aspect);
  Object.assign(camera,{left:-halfHeight*aspect,right:halfHeight*aspect,top:halfHeight,bottom:-halfHeight});
  camera.updateProjectionMatrix();
}
