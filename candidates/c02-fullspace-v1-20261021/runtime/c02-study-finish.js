// V1 fixed-view lighting. Visible environment is retained original geometry, not PMREM.
export const FINISH = Object.freeze({
  revision: 'c02-complete-space-light-v1', exposure: 1.08,
  key: 2.8, fill: .38, bounce: .55, rim: .8, environment: .55,
  fogNear: 32, fogFar: 130
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
  emitter('#ffe8c4', 7.2, [-7, 9, 4], [6, 9]);
  emitter('#d9e7f5', 1.6, [8, 5, -6], [7, 9]);
  emitter('#e5d4b8', .34, [0, -5, 0], [28, 28]);
  const pmrem = new T.PMREMGenerator(renderer);
  let environment;
  try { environment = pmrem.fromScene(environmentScene, 0, .1, 100); }
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
  const reflection=createGroundReflection(T,renderer,scene);
  return {renderReflection:reflection.render,reflectionAudit:reflection.audit,dispose() {
    reflection.dispose();
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

// One bounded 1024px planar pass of the current 3D scene, not an environment-map claim.
// DOM remains separate: letters, links and SVGs are not present in this reflection.
function createGroundReflection(T,renderer,scene){
 const y=-.417,target=new T.WebGLRenderTarget(1024,576,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat}),textureMatrix=new T.Matrix4();
 const material=new T.ShaderMaterial({name:'V1 bounded floor reflection',transparent:true,depthWrite:false,uniforms:{map:{value:target.texture},textureMatrix:{value:textureMatrix}},vertexShader:`uniform mat4 textureMatrix;varying vec4 vReflection;varying vec2 vUv;void main(){vUv=uv;vReflection=textureMatrix*modelMatrix*vec4(position,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform sampler2D map;varying vec4 vReflection;varying vec2 vUv;void main(){vec4 reflected=texture2DProj(map,vReflection);float edge=smoothstep(0.0,.09,vUv.x)*smoothstep(0.0,.09,1.0-vUv.x)*smoothstep(0.0,.09,vUv.y)*smoothstep(0.0,.09,1.0-vUv.y);gl_FragColor=vec4(reflected.rgb,.20*edge);
#include <tonemapping_fragment>
#include <encodings_fragment>
}`});
 const floor=new T.Mesh(new T.PlaneGeometry(40,16),material);floor.name='V1_ground_reflection_pass';floor.rotation.x=-Math.PI/2;floor.position.set(0,y,-2.5);floor.renderOrder=1;scene.add(floor);
 let virtual=null;const audit={kind:'single planar scene reflection',targetSize:[1024,576],planeY:y,additionalScenePasses:1,includesCurrent3D:true,includesDOM:false,visualAccepted:false,successfulPasses:0};
 return {audit,render(camera){
  if(camera.position.y<=y)return;
  if(!virtual||virtual.type!==camera.type)virtual=camera.clone();
  virtual.copy(camera);virtual.position.y=2*y-camera.position.y;
  const look=camera.getWorldDirection(new T.Vector3()).add(camera.position);look.y=2*y-look.y;
  virtual.up.copy(camera.up);virtual.up.y*=-1;virtual.lookAt(look);virtual.updateMatrixWorld(true);virtual.projectionMatrix.copy(camera.projectionMatrix);
  const bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  textureMatrix.copy(bias).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse);
  // Oblique near-plane clipping keeps below-ground objects out of the reflected scene.
  const plane=new T.Plane(new T.Vector3(0,1,0),-y).applyMatrix4(virtual.matrixWorldInverse),clip=new T.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant),q=new T.Vector4(Math.sign(clip.x),Math.sign(clip.y),1,1).applyMatrix4(new T.Matrix4().copy(virtual.projectionMatrix).invert());
  const denominator=clip.dot(q);if(Math.abs(denominator)<1e-8)return;clip.multiplyScalar(2/denominator);const m=virtual.projectionMatrix.elements;m[2]=clip.x-m[3];m[6]=clip.y-m[7];m[10]=clip.z-m[11];m[14]=clip.w-m[15];virtual.projectionMatrixInverse.copy(virtual.projectionMatrix).invert();
  const previous=renderer.getRenderTarget(),shadow=renderer.shadowMap.autoUpdate;floor.visible=false;
  try{renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,virtual);audit.successfulPasses++;}
  finally{floor.visible=true;renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=shadow;}
 },dispose(){scene.remove(floor);floor.geometry.dispose();material.dispose();target.dispose();}};
}
