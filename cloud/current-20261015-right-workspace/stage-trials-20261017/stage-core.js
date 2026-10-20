import {inspectAsset,prepareShadowFlags,rawName} from '../scene-trials/trial-core.js';
export {inspectAsset,prepareShadowFlags,rawName};

export function nodeContracts(root,names) {
  root.updateMatrixWorld(true);
  const wanted=new Set(names),result=[];
  root.traverse(node=>{
    if(!wanted.has(rawName(node)))return;
    const parents=[];
    for(let p=node;p&&p!==root;p=p.parent)parents.unshift(rawName(p));
    result.push({name:rawName(node),path:parents.join('/'),isMesh:!!node.isMesh,
      localMatrix:node.matrix.toArray(),worldMatrix:node.matrixWorld.toArray()});
  });
  return result.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}

function close(actual,expected,label,tolerance=1e-6) {
  if(actual.length!==expected.length||actual.some((x,i)=>!Number.isFinite(x)||Math.abs(x-expected[i])>tolerance))throw new Error(`${label} mismatch`);
}

export function validateStageAsset(T,handle,asset) {
  const actual=inspectAsset(T,handle.object3D),expected=asset.expected;
  for(const k of ['nodes','meshes','triangles','materialCount'])if(actual[k]!==expected[k])throw new Error(`${asset.id}: ${k} mismatch`);
  if(JSON.stringify(actual.roots)!==JSON.stringify(expected.roots))throw new Error(`${asset.id}: roots mismatch`);
  close(actual.bounds.min,expected.bounds.min,`${asset.id}: minimum bounds`);
  close(actual.bounds.max,expected.bounds.max,`${asset.id}: maximum bounds`);
  for(const [field,predicate] of [['transmissionMaterials',m=>m.transmission>0],['alphaZeroMaterials',m=>m.opacity===0]]) {
    const names=actual.materials.filter(predicate).map(m=>m.name).sort();
    if(JSON.stringify(names)!==JSON.stringify([...expected[field]].sort()))throw new Error(`${asset.id}: ${field} mismatch`);
  }
  const contracts=nodeContracts(handle.object3D,expected.contractNames||[]);
  if(contracts.length!==(expected.contractNodes||[]).length)throw new Error(`${asset.id}: protected node count mismatch`);
  contracts.forEach((node,i)=>{
    const wanted=expected.contractNodes[i];
    if(node.path!==wanted.path||node.name!==wanted.name||node.isMesh!==wanted.isMesh)throw new Error(`${asset.id}: protected node identity mismatch`);
    close(node.localMatrix,wanted.localMatrix,`${asset.id}: ${node.name} local matrix`);
    close(node.worldMatrix,wanted.worldMatrix,`${asset.id}: ${node.name} world matrix`);
  });
  const clips=handle.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.map(t=>({name:t.name,type:t.ValueTypeName,keys:t.times.length}))}));
  if(JSON.stringify(clips)!==JSON.stringify(expected.animations||[]))throw new Error(`${asset.id}: animation clip contract mismatch`);
  return {...actual,contracts,animations:clips};
}

export function findUnique(root,name) {
  const found=[];root.traverse(node=>{if(rawName(node)===name)found.push(node);});
  if(found.length!==1)throw new Error(`Expected one ${name}; found ${found.length}`);
  return found[0];
}
