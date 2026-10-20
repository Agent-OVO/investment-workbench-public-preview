// The stage viewer retains clips; the previous static viewer and its loader stay frozen.
function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException('Asset loading aborted', 'AbortError');
}

function resourceRelease(root) {
  const geometries=new Set(), materials=new Set(), textures=new Set(), images=new Set();
  root.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);
    for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]) {
      materials.add(material);
      for(const value of Object.values(material))if(value?.isTexture){textures.add(value);if(value.source?.data)images.add(value.source.data);}
    }
  });
  let released=false;
  return ()=>{
    if(released)return;released=true;
    for(const texture of textures)texture.dispose();
    for(const image of images)image.close?.();
    for(const material of materials)material.dispose();
    for(const geometry of geometries)geometry.dispose();
  };
}

export async function loadStageAsset({THREE,asset,signal,resolveAsset}) {
  checkAbort(signal);
  if(String(THREE?.REVISION)!=='149'||globalThis.THREE!==THREE)throw new Error('Stage assets require the existing local Three r149');
  if(!asset.path||!asset.sha256||!asset.bytes)throw new Error('An immutable asset path, hash and size are required');
  if(!globalThis.crypto?.subtle)throw new Error('SHA-256 verification requires localhost or HTTPS');
  const response=await fetch(resolveAsset(asset),{signal});
  if(!response.ok)throw new Error(`${asset.id}: HTTP ${response.status}`);
  const bytes=await response.arrayBuffer();checkAbort(signal);
  if(bytes.byteLength!==asset.bytes)throw new Error(`${asset.id}: byte size mismatch`);
  const actualSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(actualSha256!==asset.sha256)throw new Error(`${asset.id}: SHA-256 mismatch`);
  checkAbort(signal);
  const {GLTFLoader}=await import('../assets/art-rebuild/runtime/GLTFLoader.js');
  const gltf=await new GLTFLoader().parseAsync(bytes,'');
  // Capture before a whole-tree replacement removes any static source objects.
  const dispose=resourceRelease(gltf.scene);
  if(signal?.aborted){dispose();checkAbort(signal);}
  return {object3D:gltf.scene,animations:gltf.animations,cameras:gltf.cameras,
    receipt:{id:asset.id,path:asset.path,actualSha256,bytes:bytes.byteLength,artCommit:asset.artCommit},dispose};
}
