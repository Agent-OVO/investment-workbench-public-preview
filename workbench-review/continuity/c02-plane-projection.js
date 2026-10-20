// DOM/CSS pixels, never drawing-buffer pixels. Corner order is TL, TR, BR, BL.
// A projective transform keeps text, selection, links and keyboard focus in the DOM.
export const C02_PROJECTION_REVISION='c02-glass-front-homography-v1';
const finite=Number.isFinite;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a,b,c)=>(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
export function transformPoint(matrix,x,y){
 const w=matrix[3]*x+matrix[7]*y+matrix[15];
 return {x:(matrix[0]*x+matrix[4]*y+matrix[12])/w,y:(matrix[1]*x+matrix[5]*y+matrix[13])/w,w};
}
export function projectCardToGlass(anchor,stage,overlay){
 const fail=reason=>({ok:false,reason});
 if(!stage||!overlay||![stage.width,stage.height,stage.left,stage.top,overlay.left,overlay.top].every(finite)||stage.width<=0||stage.height<=0)return fail('empty-viewport');
 const {quad,surface}=anchor||{};
 if(!Array.isArray(quad)||quad.length!==4||!surface||![surface.width,surface.height].every(finite)||surface.width<=0||surface.height<=0)return fail('missing-surface');
 if(!anchor.inDepth||!Array.from(quad).every(p=>p&&[p.x,p.y,p.z,p.w].every(finite)&&p.w>1e-6&&p.z>=-1&&p.z<=1))return fail('clipped-depth');
 if(quad.some(p=>p.x<0||p.x>1||p.y<0||p.y>1))return fail('outside-viewport');
 const corners=quad.map(p=>({x:p.x*stage.width+stage.left-overlay.left,y:p.y*stage.height+stage.top-overlay.top}));
 const edges=corners.map((p,i)=>distance(p,corners[(i+1)%4]));
 const scale=Math.max(...edges);
 // Reject back faces, folded/concave quads, and near-collinear planes before division.
 if(Math.min(...edges)<12||corners.some((p,i)=>cross(p,corners[(i+1)%4],corners[(i+2)%4])<=scale*scale*1e-6))return fail('degenerate-surface');
 const width=(edges[0]+edges[2])/2,height=width*surface.height/surface.width;
 if(width<48||height<48||!finite(height)||height>stage.height*4)return fail('unreadable-surface');
 const left=corners[0].x,top=corners[0].y;
 const [p0,p1,p2,p3]=corners.map(p=>({x:p.x-left,y:p.y-top}));
 const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x;
 const dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
 const determinant=dx1*dy2-dx2*dy1;
 if(Math.abs(determinant)<=scale*scale*1e-8)return fail('singular-transform');
 const g=(dx3*dy2-dx2*dy3)/determinant,h=(dx1*dy3-dx3*dy1)/determinant;
 const denominators=[1,1+g,1+g+h,1+h];
 if(Math.min(...denominators)<.05||Math.max(...denominators)/Math.min(...denominators)>20)return fail('extreme-perspective');
 // CSS matrix3d is column-major. m14/m24 contain the projective denominator.
 const matrix=[(p1.x+g*p1.x)/width,(p1.y+g*p1.y)/width,0,g/width,(p3.x+h*p3.x)/height,(p3.y+h*p3.y)/height,0,h/height,0,0,1,0,0,0,0,1].map(n=>Number(n.toPrecision(15)));
 if(!matrix.every(finite))return fail('non-finite-transform');
 const source=[[0,0],[width,0],[width,height],[0,height]];
 const maxCornerError=Math.max(...source.map(([x,y],i)=>{const p=transformPoint(matrix,x,y);return Math.hypot(p.x+left-corners[i].x,p.y+top-corners[i].y);}));
 if(!finite(maxCornerError)||maxCornerError>.01)return fail('projection-error');
 return {ok:true,left,top,width,height,matrix,transform:'matrix3d('+matrix.join(',')+')',corners,maxCornerError};
}
