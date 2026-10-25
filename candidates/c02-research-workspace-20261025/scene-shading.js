/** Original, restrained stylized lighting, not physically based rendering.
 * The software and WebGL paths consume the same roughness/specular controls.
 * No environment map, cast-shadow solver, transmission or metal BSDF is implied.
 */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const unit=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n)};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const LIGHT=unit([-.45,.78,1]),RIM=unit([.6,.5,-.5]);
export function cameraEye(camera){
  const d=6.2/(camera.zoom||1),y=camera.mode==='flat'?0:camera.yaw,p=camera.mode==='flat'?0:camera.pitch;
  return [-Math.sin(y)*Math.cos(p)*d,Math.sin(p)*d+.18,Math.cos(y)*Math.cos(p)*d];
}
export function shadeSurface(material,normal,position,eye,selected=false){
  const n=unit(normal),view=unit(eye.map((v,i)=>v-position[i])),half=unit(LIGHT.map((v,i)=>v+view[i]));
  const roughness=clamp(material.roughness??.7,.05,1),specular=material.specular??.04;
  const diffuse=Math.max(0,dot(n,LIGHT));
  const illumination=.40+.12*(n[1]*.5+.5)+.44*diffuse+.10*Math.max(0,dot(n,RIM));
  const highlight=specular*Math.pow(Math.max(0,dot(n,half)),8+Math.pow(1-roughness,3)*150)*diffuse;
  let c=material.color.map((v,i)=>clamp(v*illumination+highlight*[.86,.93,.90][i],0,1));
  if(selected)c=c.map((v,i)=>v*.88+[.72,.89,.81][i]*.12);
  return c.map(v=>clamp(v,0,1));
}
// Same constants and arithmetic as shadeSurface. Each triangle supplies its
// shared world-space centroid so both paths use one consistent facet color.
export const SHADING_GLSL=`
vec3 shadeSurface(vec3 base,vec3 normal,vec3 position,vec3 eye,float roughness,float specular){
  vec3 n=normalize(normal),lightDirection=normalize(vec3(-0.45,0.78,1.0));
  vec3 view=normalize(eye-position),halfway=normalize(lightDirection+view);
  float diffuse=max(dot(n,lightDirection),0.0);
  float illumination=0.40+0.12*(n.y*0.5+0.5)+0.44*diffuse+0.10*max(dot(n,normalize(vec3(0.6,0.5,-0.5))),0.0);
  float exponent=8.0+pow(1.0-clamp(roughness,0.05,1.0),3.0)*150.0;
  float highlight=specular*pow(max(dot(n,halfway),0.0),exponent)*diffuse;
  return clamp(base*illumination+highlight*vec3(0.86,0.93,0.90),0.0,1.0);
}`;
