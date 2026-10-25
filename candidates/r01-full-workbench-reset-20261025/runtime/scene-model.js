/** Original procedural evidence structure. No amount, score or confidence drives geometry.
 * This module has no DOM/browser dependency. WebGL, CPU preview and picking use these
 * exact meshes and this same orthographic camera. Every selectable object keeps its
 * semantic ID; renderer UUIDs never become research identities. */
export const SCENE_SCHEMA = 'research-structure-v1';
export const DEFAULT_CAMERA = Object.freeze({yaw:-12,pitch:24,depthExtent:6000});
export const PALETTE = Object.freeze({
  ceramic:[183/255,195/255,189/255], ceramicLight:[0.88,0.89,0.82],
  mineral:[101/255,126/255,135/255], brass:[180/255,154/255,111/255],
  rib:[0.40,0.53,0.60], neutral:[0.58,0.65,0.67],
  selected:[110/255,196/255,174/255], limit:[215/255,173/255,115/255],shadow:[0.01,0.03,0.06]
});
const rad=x=>x*Math.PI/180;
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>mul(a,1/(Math.hypot(...a)||1));
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const finite=(n,fallback)=>Number.isFinite(Number(n))?Number(n):fallback;

export function cameraBasis(camera=DEFAULT_CAMERA){
  const yaw=rad(finite(camera.yaw,-12)),pitch=rad(finite(camera.pitch,24));
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  return {right:[cy,0,sy],down:[sp*sy,cp,-sp*cy],toward:[-sy*cp,sp,cy*cp],cy,sy,cp,sp};
}
export function projectPoint(point,camera=DEFAULT_CAMERA){
  const b=cameraBasis(camera);return {x:dot(point,b.right),y:dot(point,b.down),depth:dot(point,b.toward)};
}
/** Layout anchors are screen-space CSS units plus a real 3D depth. */
export function pointAt(x,y,z=0,camera=DEFAULT_CAMERA){
  const b=cameraBasis(camera),wx=(x-b.sy*z)/b.cy;
  return [wx,(y-b.sp*b.sy*wx+b.sp*b.cy*z)/b.cp,z];
}
export function cameraMatrix(width,height,camera=DEFAULT_CAMERA){
  const b=cameraBasis(camera),d=finite(camera.depthExtent,6000),sx=2/Math.max(1,width),sy=-2/Math.max(1,height);
  // Column-major: camera basis -> clip space. Greater toward-camera depth is nearer.
  return new Float32Array([
    sx*b.right[0],sy*b.down[0],-b.toward[0]/d,0,
    sx*b.right[1],sy*b.down[1],-b.toward[1]/d,0,
    sx*b.right[2],sy*b.down[2],-b.toward[2]/d,0,
    -1,1,0,1
  ]);
}
function finish(mesh){
  mesh.faceNormals=mesh.triangles.map(t=>unit(cross(sub(mesh.vertices[t[1]],mesh.vertices[t[0]]),sub(mesh.vertices[t[2]],mesh.vertices[t[0]]))));
  return mesh;
}
function makeMesh(props){return {...props,vertices:[],triangles:[]};}

/** Solid faceted mineral junction, not a text panel or a document-shaped surface. */
function compactNode(node,camera){
  const mesh=makeMesh({id:node.id,objectId:node.id,kind:'node',nodeType:node.type||'source',productId:node.productId||null,
    color:node.color||PALETTE.ceramic,pickable:node.pickable!==false,semantic:true});
  const x=node.x,y=node.y,z=finite(node.z,22),rx=finite(node.rx,9),ry=finite(node.ry,9),center=pointAt(x,y,z,camera);
  const sides=12,rings=[{s:.75,h:-6},{s:1,h:-4},{s:1,h:4},{s:.75,h:6}];
  for(const ring of rings)for(let i=0;i<sides;i++){
    const t=2*Math.PI*(i+.5)/sides;
    mesh.vertices.push(add(center,[Math.cos(t)*rx*ring.s,Math.sin(t)*ry*ring.s,ring.h]));
  }
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<sides;i++){
    const a=r*sides+i,b=r*sides+(i+1)%sides,c=(r+1)*sides+i,d=(r+1)*sides+(i+1)%sides;
    mesh.triangles.push([a,b,c],[b,d,c]);
  }
  mesh.vertices.push(add(center,[0,0,6]));const top=mesh.vertices.length-1;
  for(let i=0;i<sides;i++)mesh.triangles.push([(rings.length-1)*sides+i,(rings.length-1)*sides+(i+1)%sides,top]);
  return finish(mesh);
}

function rotateLocal(p,tilt,roll,yaw=0){
  const tx=rad(tilt),rz=rad(roll),x=p[0],y=p[1]*Math.cos(tx)-p[2]*Math.sin(tx),z=p[1]*Math.sin(tx)+p[2]*Math.cos(tx);
  const ya=rad(yaw),xx=x*Math.cos(ya)+z*Math.sin(ya),zz=-x*Math.sin(ya)+z*Math.cos(ya);
  return [xx*Math.cos(rz)-y*Math.sin(rz),xx*Math.sin(rz)+y*Math.cos(rz),zz];
}
/** A substantial annular source solid with a ceramic bevel and narrow inner
 * metal edge. It has an actual aperture and side walls; never a flat source
 * card, paper sheet or graph ball. Type size is fixed, unrelated to money. */
function sourceRing(node,camera){
  const mesh=makeMesh({id:node.id,objectId:node.id,kind:'node',nodeType:'source',productId:null,
    color:node.color||PALETTE.mineral,pickable:node.pickable!==false,semantic:true,faceColors:[]});
  const center=pointAt(node.x,node.y,finite(node.z,30),camera),rx=finite(node.rx,34),ry=finite(node.ry,34),thickness=finite(node.thickness,7),depth=finite(node.depth,18);
  const profile=[[1,-.5],[1,.08],[.72,.58],[-.72,.58],[-1,.18],[-1,-.28],[-.72,-.5],[.72,-.5]];
  const segments=48,tilt=finite(node.tilt,22),roll=finite(node.roll,0),yaw=finite(node.yaw,-16);
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments;
    for(const [r,h] of profile){const local=[Math.cos(a)*(rx+r*thickness),Math.sin(a)*(ry+r*thickness),(h+.5)/1.08*depth-depth/2];mesh.vertices.push(add(center,rotateLocal(local,tilt,roll,yaw)));}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<profile.length;j++){
    const a=i*profile.length+j,b=((i+1)%segments)*profile.length+j,c=i*profile.length+(j+1)%profile.length,d=((i+1)%segments)*profile.length+(j+1)%profile.length;
    mesh.triangles.push([a,b,c],[b,d,c]);
    const metal=j===3;const color=metal?PALETTE.brass:mesh.color;mesh.faceColors.push(color,color);
  }
  finish(mesh);
  // Smooth around the continuous annulus, but not across the ceramic bevels.
  mesh.cornerNormals=mesh.triangles.map((triangle,ti)=>{
    const band=Math.floor(ti/2)%profile.length;
    return triangle.map(vi=>{const segment=Math.floor(vi/profile.length),previous=(segment+segments-1)%segments;
      const normals=[mesh.faceNormals[(previous*profile.length+band)*2],mesh.faceNormals[(previous*profile.length+band)*2+1],mesh.faceNormals[(segment*profile.length+band)*2],mesh.faceNormals[(segment*profile.length+band)*2+1]];
      return unit(normals.reduce((sum,n)=>add(sum,n),[0,0,0]));});
  });
  return mesh;
}

function cubic(p,t){const a=mix(p[0],p[1],t),b=mix(p[1],p[2],t),c=mix(p[2],p[3],t);return mix(mix(a,b,t),mix(b,c,t),t);}
function roundedPolyline(points,radius=18){
  const result=[points[0]];let last=points[0];
  const line=to=>{const distance=Math.hypot(...sub(to,last)),count=Math.max(1,Math.ceil(distance/16)),from=last;for(let i=1;i<=count;i++)result.push(mix(from,to,i/count));last=to;};
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],b=points[i],c=points[i+1],ab=Math.hypot(...sub(a,b)),bc=Math.hypot(...sub(c,b));
    const r=Math.min(radius,ab*.34,bc*.34),enter=add(b,mul(unit(sub(a,b)),r)),leave=add(b,mul(unit(sub(c,b)),r));
    line(enter);for(let j=1;j<=6;j++){const t=j/6;result.push(mix(mix(enter,b,t),mix(b,leave,t),t));}last=leave;
  }
  line(points.at(-1));return result;
}
/** Constant-width 3D relation rib. The edge's width never encodes financial data. */
function relationRib(edge,lookup,camera){
  const from=lookup.get(edge.from),to=lookup.get(edge.to);if(!from||!to)throw Error('SCENE_EDGE_UNKNOWN_ENDPOINT:'+edge.id);
  const raw=edge.points||[
    [from.x,from.y,finite(from.z,22)],
    [from.x+(to.x-from.x)*.36,from.y,finite(edge.arch,60)],
    [to.x-(to.x-from.x)*.30,to.y,finite(edge.arch,60)],
    [to.x,to.y,finite(to.z,22)]
  ];
  if(raw.length!==4||raw.some(p=>p.length!==3||p.some(n=>!Number.isFinite(n))))throw Error('SCENE_BAD_CURVE:'+edge.id);
  const control=raw.map(p=>pointAt(...p,camera));
  const mesh=makeMesh({id:edge.id,objectId:edge.id,kind:'relation',predicate:edge.predicate,from:edge.from,to:edge.to,
    productId:edge.productId||from.productId||to.productId||null,color:edge.color||PALETTE.rib,pickable:edge.pickable!==false,semantic:true,vertexNormals:[]});
  const sides=8,radius=finite(edge.radius,4.5),aspect=finite(edge.aspect,.72);
  let centers;
  if(edge.waypoints){
    if(!Array.isArray(edge.waypoints)||edge.waypoints.length<2||edge.waypoints.some(p=>p.length!==3||p.some(n=>!Number.isFinite(n))))throw Error('SCENE_BAD_WAYPOINTS:'+edge.id);
    centers=roundedPolyline(edge.waypoints.map(p=>pointAt(...p,camera)),finite(edge.cornerRadius,18));
  }else {const count=edge.segments||24;centers=Array.from({length:count+1},(_,i)=>cubic(control,i/count));}
  const segments=centers.length-1;
  for(let i=0;i<=segments;i++){
    const center=centers[i],tangent=unit(sub(centers[Math.min(segments,i+1)],centers[Math.max(0,i-1)]));
    let side=unit(cross(tangent,[0,0,1]));if(Math.hypot(...side)<.5)side=[1,0,0];const normal=unit(cross(side,tangent));
    for(let j=0;j<sides;j++){const a=j*Math.PI*2/sides;mesh.vertices.push(add(center,add(mul(side,Math.cos(a)*radius),mul(normal,Math.sin(a)*radius*aspect))));mesh.vertexNormals.push(unit(add(mul(side,Math.cos(a)),mul(normal,Math.sin(a)/aspect))));}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){
    const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;
    mesh.triangles.push([a,c,b],[b,c,d]);
  }
  return finish(mesh);
}

/** One calculation solid, visibly receiving two inputs. Its three short arms
 * are shape parts of this one semantic object, not additional evidence edges. */
function junctionNode(node,camera){
  const mesh=makeMesh({id:node.id,objectId:node.id,kind:'node',nodeType:node.type||'calculation',productId:node.productId||null,
    color:node.color||PALETTE.ceramic,pickable:node.pickable!==false,semantic:true,faceColors:[],vertexNormals:[]});
  const x=node.x,y=node.y,z=finite(node.z,30),scale=finite(node.scale,1);
  const paths=[
    [[x-23*scale,y-17*scale,z+9],[x-20*scale,y-7*scale,z+11],[x-7*scale,y-4*scale,z+4],[x,y,z]],
    [[x+23*scale,y-17*scale,z+9],[x+20*scale,y-7*scale,z+11],[x+7*scale,y-4*scale,z+4],[x,y,z]],
    [[x,y,z],[x,y+8*scale,z-2],[x,y+14*scale,z-4],[x,y+20*scale,z-4]]
  ];
  for(let i=0;i<paths.length;i++){
    const lookup=new Map([['a',{x:paths[i][0][0],y:paths[i][0][1]}],['b',{x:paths[i][3][0],y:paths[i][3][1]}]]);
    const part=relationRib({id:'internal-shape',from:'a',to:'b',predicate:'shape-only',points:paths[i],radius:5.5*scale,aspect:1,segments:10},lookup,camera);
    const offset=mesh.vertices.length;mesh.vertices.push(...part.vertices);mesh.triangles.push(...part.triangles.map(t=>t.map(v=>v+offset)));
    mesh.vertexNormals.push(...part.vertexNormals);
    mesh.faceColors.push(...part.triangles.map((_,j)=>j<16?PALETTE.brass:mesh.color));
  }
  return finish(mesh);
}

/** Declarative nodes + registered edges only. Missing evidence is not invented. */
export function buildScene(layout={}){
  const width=Math.max(1,finite(layout.width,1000)),height=Math.max(1,finite(layout.height,620));
  const camera={...DEFAULT_CAMERA,...layout.camera};
  const nodes=layout.nodes||layout.anchors||[],edges=layout.edges||[];
  if(!Array.isArray(nodes)||!Array.isArray(edges))throw Error('SCENE_ARRAYS_REQUIRED');
  if((layout.readingZones||[]).length>8)throw Error('SCENE_READING_MASK_LIMIT');
  const lookup=new Map();
  for(const node of nodes){
    if(typeof node.id!=='string'||!node.id||lookup.has(node.id)||!Number.isFinite(node.x)||!Number.isFinite(node.y))throw Error('SCENE_BAD_NODE');
    lookup.set(node.id,node);
  }
  const edgeIds=new Set();for(const edge of edges){if(typeof edge.id!=='string'||!edge.id||lookup.has(edge.id)||edgeIds.has(edge.id)||typeof edge.predicate!=='string'||!edge.predicate)throw Error('SCENE_BAD_EDGE');edgeIds.add(edge.id);}
  const shape=n=>n.shape==='source-ring'?sourceRing:n.shape==='junction'?junctionNode:n.shape==='port'?compactNode:n.type==='source'?sourceRing:['calculation','comparison'].includes(n.type)?junctionNode:compactNode;
  const meshes=[...edges.map(e=>relationRib(e,lookup,camera)),...nodes.map(n=>shape(n)(n,camera))];
  const projectedNodes=Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y,z:finite(n.z,22)}]));
  return {schema:SCENE_SCHEMA,kind:layout.kind||'research',width,height,camera,meshes,nodes,edges,projectedNodes,
    readingZones:layout.readingZones||[],clipReadingZones:layout.clipReadingZones===true,triangles:meshes.reduce((n,m)=>n+m.triangles.length,0)};
}

export function pointInTriangle(x,y,a,b,c){
  const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-10)return null;
  const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,w=1-u-v;
  return u>=-1e-7&&v>=-1e-7&&w>=-1e-7?[u,v,w]:null;
}
/** Same projected triangles used for keyboard-equivalent pointer hit selection. */
export function pickScene(scene,x,y){
  if(scene.readingZones.some(r=>x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height))return null;
  let chosen=null,depth=-Infinity;
  for(const mesh of scene.meshes){if(!mesh.pickable)continue;const points=mesh.vertices.map(p=>projectPoint(p,scene.camera));
    for(const t of mesh.triangles){const p=t.map(i=>points[i]),bary=pointInTriangle(x,y,...p);if(!bary)continue;const d=bary.reduce((s,v,i)=>s+v*p[i].depth,0);if(d>depth){depth=d;chosen={id:mesh.objectId,kind:mesh.kind,productId:mesh.productId,predicate:mesh.predicate||null};}}
  }
  return chosen;
}

const LIGHT=unit([-.4,-.7,.8]);
const FILL=unit([.65,.2,-.25]);
export function cornerNormal(mesh,triangleIndex,corner){return mesh.cornerNormals?.[triangleIndex]?.[corner]||mesh.vertexNormals?.[mesh.triangles[triangleIndex][corner]]||mesh.faceNormals[triangleIndex];}
export function faceColor(mesh,normal,selectedId=null,highlight=1,faceIndex=0){
  const selected=selectedId&&(mesh.objectId===selectedId||mesh.productId===selectedId||mesh.from===selectedId||mesh.to===selectedId);
  const material=mesh.faceColors?.[faceIndex]||mesh.color;
  const base=selected?mix(material,PALETTE.selected,highlight*.48):material;
  const n=unit(normal),diffuse=Math.max(0,dot(n,LIGHT)),fill=Math.max(0,dot(n,FILL));
  // Shared restrained matte/ceramic shader; CPU does not claim physical PBR.
  const lighting=.32+.62*diffuse+.10*fill;
  return base.map(c=>Math.max(0,Math.min(1,c*lighting)));
}
