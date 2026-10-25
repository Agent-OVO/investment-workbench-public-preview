import {graph,getNode,sceneProducts,sourceIdentity,recordIdentity,comparisonId,claimIdentity,provenanceBundle} from './domain.js';
// Shared immutable layout input. Geometry and DOM share these screen-space
// anchors; z remains real geometry depth and never encodes an amount.
const edgeById=Object.fromEntries(graph.edges.map(e=>[e.id,e]));
const edgeBetween=(from,to,predicate)=>graph.edges.find(e=>e.from===from&&e.to===to&&e.predicate===predicate);
const node=(id,x,y,z,extra={})=>{const real=getNode(id);if(!real)throw Error('UNKNOWN_LAYOUT_OBJECT:'+id);return {id,type:real.type,productId:real.productId||null,x,y,z,...extra};};
export function layoutFor({kind='research',width=1200,height=560,selectedProduct='repair',source='H126'}={}){
 const W=Math.max(280,width),H=Math.max(1,height),narrow=W<=700,nodes=[],edges=[],readingZones=[];
 const includeNode=n=>{if(!nodes.find(x=>x.id===n.id))nodes.push(n);return n;};
 const includeEdge=(id,points,extra={})=>{const e=edgeById[id];if(!e)throw Error('UNKNOWN_LAYOUT_EDGE:'+id);edges.push({...e,points,radius:narrow?3.2:4.5,...extra});};
 const ring=(alias,x,y,z)=>includeNode(node(sourceIdentity(alias),x,y,z,{shape:'source-ring',rx:narrow?27:34,ry:narrow?27:34,thickness:narrow?5:7,depth:narrow?14:18}));
 function branch(product,cx,cy,s1,s2,g1,g2,{scale=1}={}){
  const comparison=includeNode(node(comparisonId(product),cx,cy,35,{shape:'junction',scale}));
  for(const [i,period,s,gutter] of [[0,'2025H1',s1,g1],[1,'2026H1',s2,g2]]){
   const b=provenanceBundle(product,period),side=i?1:-1;
   const record=includeNode(node(b.recordId,cx+side*36*scale,cy-10*scale,25,{shape:'port',rx:8*scale,ry:8*scale}));
   const gross=includeNode(node(b.grossId,cx+side*20*scale,cy-4*scale,31,{shape:'port',rx:4*scale,ry:4*scale}));
   if(kind!=='research'||product===selectedProduct){
    if(narrow&&kind==='research')includeEdge(b.originalRowEdgeId,[[s.x,s.y+23,s.z],[gutter,110,-5],[gutter,cy-15,35],[record.x,record.y,record.z]],{productId:product,waypoints:[[s.x,s.y+23,s.z],[gutter,110,-5],[gutter,cy-18,35],[record.x,record.y,record.z]],cornerRadius:22});
    else {const target=sceneProducts.indexOf(product);if(kind==='research'){const lane=W*(i?[.35,.62,.855][target]:[.10,.35,.62][target]),low=[395,325,350][target];includeEdge(b.originalRowEdgeId,[[s.x,s.y+23,s.z],[lane,125,-5],[lane,low,35],[record.x,record.y,record.z]],{productId:product,waypoints:[[s.x,s.y+23,s.z],[lane,i?135:125,-5],[lane,low,35],[record.x,record.y,record.z]],cornerRadius:70});}else includeEdge(b.originalRowEdgeId,[[s.x,s.y+23,s.z],[gutter,s.y+85,-5],[gutter,cy+25,40],[record.x,record.y,record.z]],{productId:product});}
   }
   includeEdge(b.calculationBundleEdgeId,[[record.x,record.y,25],[record.x+side*2,cy-5,32],[gross.x,cy-3,34],[gross.x,gross.y,31]],{radius:3*scale,productId:product});
   includeEdge(b.comparisonInputEdgeId,[[gross.x,gross.y,31],[gross.x,cy+2,35],[cx+side*10,cy+3,35],[cx,cy,35]],{radius:3*scale,productId:product});
  }
  return comparison;
 }
 if(kind==='research'){
  const a=ring('H125',W*(narrow?.22:.20),narrow?62:72,narrow?-40:-55),b=ring('H126',W*(narrow?.78:.73),narrow?62:72,narrow?-40:-55);
  const ir=ring('IR0908',W*(narrow?.78:.91),narrow?480:175,narrow?-5:-10);
  if(narrow){
   const id=sceneProducts.includes(selectedProduct)?selectedProduct:null;
   if(id)branch(id,W*.5,345,a,b,18,W-18,{scale:.85});
   readingZones.push({x:24,y:135,width:W-48,height:178},{x:30,y:375,width:W-60,height:22},{x:24,y:399,width:W-48,height:45},{x:20,y:455,width:W*.55,height:65});
  }else{
   sceneProducts.forEach((id,i)=>{const cx=W*[.22,.49,.76][i];branch(id,cx,420,a,b,W*[.10,.35,.62][i],W*[.35,.62,.86][i]);const bar=[135.7256,52.2795,19.433][i];readingZones.push(i===2?{x:cx-85,y:149,width:170,height:62}:{x:cx-85,y:209,width:170,height:bar+40});});
   readingZones.push({x:W*.875,y:88,width:W*.12,height:47},{x:W*.08,y:444,width:W*.84,height:39},{x:W*.08,y:495,width:W*.84,height:53});
  }
  // IR applies to the repair claim only, even when another product is selected.
  const claim=includeNode(node(claimIdentity('repair-growth-context'),W*(narrow?.70:.855),narrow?530:434,18,{shape:'port',rx:7,ry:7}));
  const e=edgeBetween(ir.id,claim.id,'explains-with-limits');includeEdge(e.id,[[ir.x,ir.y+24,ir.z],[W*(narrow?.88:.96),narrow?500:275,15],[W*(narrow?.78:.96),narrow?532:422,22],[claim.x,claim.y,18]],{color:[.71,.60,.43],productId:'repair',waypoints:[[ir.x,ir.y+24,ir.z],[W*(narrow?.92:.985),ir.y+25,0],[W*(narrow?.92:.985),claim.y+8,25],[claim.x,claim.y,18]],cornerRadius:16});
 }else if(kind==='home'){
  const a=ring('H125',W*(narrow?.43:.58),narrow?416:125,-45),b=ring('H126',W*(narrow?.83:.86),narrow?416:125,-45);
  const ir=ring('IR0908',W*(narrow?.73:.84),narrow?558:330,-10);
  branch('repair',W*(narrow?.47:.64),narrow?595:415,a,b,W*(narrow?.19:.49),W*(narrow?.95:.96),{scale:narrow?.8:1.1});
  const claim=includeNode(node(claimIdentity('repair-growth-context'),W*(narrow?.72:.84),narrow?630:445,18,{shape:'port',rx:8,ry:8}));const e=edgeBetween(ir.id,claim.id,'explains-with-limits');includeEdge(e.id,[[ir.x,ir.y+20,-10],[ir.x+30,ir.y+50,20],[claim.x+40,claim.y-10,28],[claim.x,claim.y,18]],{color:[.71,.60,.43],productId:'repair'});
  readingZones.push(narrow?{x:0,y:0,width:W,height:340}:{x:15,y:15,width:W*.44,height:365});
  // Home has no caption block over the source solids; labels sit above them.
 }else if(kind==='sources'){
  const positions=narrow?[[.88,128],[.88,338],[.88,548]]:[[.83,100],[.83,290],[.83,480]];
  ['H125','H126','IR0908'].forEach((alias,i)=>ring(alias,W*positions[i][0],positions[i][1],-20));
  // No decorative source-to-source edge: these documents do not support each other.
  readingZones.push({x:0,y:0,width:W*(narrow?.78:.72),height:H});
 }else if(kind==='source'){
  const alias=['H125','H126','IR0908'].includes(source)?source:'H126';
  const s=ring(alias,W*(narrow?.82:.79),narrow?490:132,-30);
  if(alias==='IR0908'){
   const c=includeNode(node(claimIdentity('repair-growth-context'),W*(narrow?.73:.74),narrow?610:340,20,{shape:'port',rx:9,ry:9}));const e=edgeBetween(s.id,c.id,'explains-with-limits');includeEdge(e.id,[[s.x,s.y,-30],[W*.96,s.y+70,5],[W*.96,c.y,20],[c.x,c.y,20]],{color:[.71,.60,.43],productId:'repair'});
  }else for(const [i,id] of sceneProducts.entries()){
   const period=alias==='H125'?'2025H1':'2026H1',bundle=provenanceBundle(id,period),r=includeNode(node(bundle.recordId,W*.77,330+i*85,22,{shape:'port',rx:9,ry:9}));includeEdge(bundle.originalRowEdgeId,[[s.x,s.y+20,-30],[W*.94,230,0],[W*.94,r.y,30],[r.x,r.y,22]],{productId:id});
  }
  readingZones.push({x:0,y:0,width:W*(narrow?.78:.59),height:H});
 }
 const ids=new Set(nodes.map(n=>n.id));if(edges.some(e=>!ids.has(e.from)||!ids.has(e.to)))throw Error('LAYOUT_EDGE_ENDPOINT_MISSING');
 return {kind,width:W,height:H,narrow,nodes,edges,readingZones,camera:{yaw:-12,pitch:24,depthExtent:6000},css:{},semanticGraph:graph.schema,clipReadingZones:true};
}
