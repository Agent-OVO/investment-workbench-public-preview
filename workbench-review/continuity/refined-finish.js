// Browser lighting only. The imported model, camera and interaction stay fixed.
export const FINISH = Object.freeze({
  revision: 'warm-soft-local-v1', exposure: 1.02,
  key: 2.35, fill: .38, bounce: .58, rim: .36, environment: .48,
  fogNear: 23, fogFar: 65
});

export function createFinishLighting(T, renderer, scene) {
  const environmentScene = new T.Scene();
  environmentScene.background = new T.Color('#5b6a77');
  const emitter = (color, intensity, position, size) => {
    const material = new T.MeshBasicMaterial({color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide});
    const mesh = new T.Mesh(new T.PlaneGeometry(...size), material);
    mesh.position.fromArray(position); mesh.lookAt(0, 1, 0); environmentScene.add(mesh);
  };
  // Soft windows give brass readable highlights without a flat white environment.
  emitter('#fff2dd', 4.8, [-7, 9, 4], [8, 10]);
  emitter('#d9e7f5', 1.6, [8, 5, -6], [7, 9]);
  emitter('#e5d4b8', .34, [0, -5, 0], [28, 28]);
  const pmrem = new T.PMREMGenerator(renderer);
  let environment;
  try { environment = pmrem.fromScene(environmentScene, .08, .1, 100); }
  finally {
    pmrem.dispose();
    environmentScene.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
  }
  scene.environment = environment.texture;
  const key = new T.DirectionalLight('#fff0dc', FINISH.key);
  key.position.set(-8, 11, 7); key.target.position.set(0, 1.5, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left: -8, right: 8, top: 8, bottom: -6, near: .5, far: 36});
  key.shadow.bias = -.0001; key.shadow.normalBias = .012;
  const fill = new T.HemisphereLight('#d9e8f4', '#b3a18b', FINISH.fill);
  const rim = new T.DirectionalLight('#f2d7b1', FINISH.rim); rim.position.set(5, 7, -5);
  const bounce = new T.DirectionalLight('#e3ebf0', FINISH.bounce);
  bounce.position.set(3, 5, 12); bounce.target.position.set(0, 2, 0);
  scene.add(key, key.target, fill, bounce, bounce.target, rim);
  return {dispose() {
    if (scene.environment === environment.texture) scene.environment = null;
    environment.dispose(); key.shadow.map?.dispose();
    scene.remove(key, key.target, fill, bounce, bounce.target, rim);
  }};
}

export function calibrateFinishMaterials(T, root) {
  const protectedRoots = new Set(['ROOT__mountain_landscape', 'ROOT__research_terrain', 'ROOT__sky_backdrop']);
  const clones = new Map(), audit = [];
  const protectedNode = object => {
    for (let p = object; p; p = p.parent) if (protectedRoots.has(p.name)) return true;
    return false;
  };
  const profile = material => {
    if (material.name === 'Champagne_brass') return {envMapIntensity: 1.15, roughness: .27};
    if (material.name === 'Dark_bronze') return {envMapIntensity: .9, roughness: .34};
    if (material.name === 'Glass_clear') return {envMapIntensity: 1.4};
    if (material.name === 'Glass_frost') return {envMapIntensity: .8};
    if (material.name.startsWith('Ivory_')) return {envMapIntensity: .4};
    if (material.name.startsWith('Leather_')) return {envMapIntensity: .3};
    if (['Paper_edges', 'Warm_paper', 'Ink', 'Ink_muted'].includes(material.name)) return {envMapIntensity: .3};
    if (material.name === 'Graphite') return {envMapIntensity: .65};
    return {envMapIntensity: FINISH.environment};
  };
  root.traverse(object => {
    if (!object.isMesh || protectedNode(object)) return;
    const calibrate = original => {
      if (!original.isMeshStandardMaterial || original.name === 'Sky_mesh_emission') return original;
      if (!clones.has(original)) {
        const copy = original.clone(), values = profile(original);
        Object.assign(copy, values); clones.set(original, copy);
        audit.push({name: original.name, values});
      }
      return clones.get(original);
    };
    object.material = Array.isArray(object.material) ? object.material.map(calibrate) : calibrate(object.material);
  });
  return {audit, protectedRoots: [...protectedRoots], dispose() { for (const material of clones.values()) material.dispose(); }};
}
