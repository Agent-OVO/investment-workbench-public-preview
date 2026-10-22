// A full plane-to-screen homography. Geometry defines the plane; DOM defines only a reading canvas.
// Unlike centre projection + scale, all four corners retain the same camera perspective.
export function solveLinear(matrix, values) {
  const a=matrix.map((row,i)=>[...row,values[i]]), n=values.length;
  for(let i=0;i<n;i++){
    let p=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;
    if(Math.abs(a[p][i])<1e-11)throw Error('DEGENERATE_PLANE');
    [a[i],a[p]]=[a[p],a[i]];const k=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=k;
    for(let r=0;r<n;r++)if(r!==i){const f=a[r][i];for(let j=i;j<=n;j++)a[r][j]-=f*a[i][j];}
  }return a.map(row=>row[n]);
}
export function homography(width,height,corners){
  if(!(width>0&&height>0)||corners.length!==4)throw Error('INVALID_PLANE');
  const rows=[],values=[];
  [[0,0],[width,0],[width,height],[0,height]].forEach(([x,y],i)=>{
    const [u,v]=corners[i];if(!Number.isFinite(u)||!Number.isFinite(v))throw Error('INVALID_PROJECTION');
    rows.push([x,y,1,0,0,0,-u*x,-u*y]);values.push(u);
    rows.push([0,0,0,x,y,1,-v*x,-v*y]);values.push(v);
  });return solveLinear(rows,values);
}
export function applyHomography(h,x,y){const d=h[6]*x+h[7]*y+1;return [(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d];}
export function matrix3d(h){return `matrix3d(${[h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,1].map(v=>Math.abs(v)<1e-12?0:v).join(',')})`;}
export function projectPlane(T,camera,panel,width,height){
  const a=panel.yaw,c=Math.cos(a),s=Math.sin(a),p=panel.contentPosition;
  const corners=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([sx,sy])=>{
    const x=sx*panel.width/2,y=sy*panel.height/2;
    const v=new T.Vector3(p[0]+x*c,p[1]+y,p[2]-x*s).project(camera);
    if(v.z<=-1||v.z>=1)throw Error('PLANE_OUTSIDE_FRUSTUM');
    return [(v.x+1)*width/2,(1-v.y)*height/2];
  });
  const h=homography(...panel.pixels,corners);
  return {corners,homography:h,transform:matrix3d(h)};
}
export function polygonsOverlap(a,b){
  // Convex polygon separating-axis test. This is not pixel occlusion.
  for(const shape of [a,b])for(let i=0;i<shape.length;i++){
    const p=shape[i],q=shape[(i+1)%shape.length],axis=[p[1]-q[1],q[0]-p[0]];
    const aa=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),bb=b.map(p=>p[0]*axis[0]+p[1]*axis[1]);
    if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;
  }return true;
}
