// Stable world anchors are authored once at the base camera pose. Input frames
// only project them; no transformed DOM rectangle is fed back into the scene.
export function projectReadingAnchor(T,camera,anchor,{width,height}) {
 const center=anchor.worldCenter.clone().project(camera);
 const eye=anchor.worldCenter.clone().applyMatrix4(camera.matrixWorldInverse);
 const depth=-eye.z,scale=anchor.baseDepth/depth*camera.zoom;
 const x=(center.x+1)*width/2,y=(1-center.y)*height/2;
 const b=anchor.baseRect,dx=x-(b.x+b.width/2),dy=y-(b.y+b.height/2);
 return {x,y,scale,dx,dy,visible:Number.isFinite(scale)&&depth>camera.near&&center.z>=-1&&center.z<=1};
}
