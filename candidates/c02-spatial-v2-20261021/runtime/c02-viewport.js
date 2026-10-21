// Fit the authored world composition to the AVAILABLE STAGE, not a hard viewport
// aspect gate. A wider lens on taller desktops protects the permitted edge poses.
export function fitC02Viewport({width,height,fovDegrees}){
 const aspect=Math.max(1,width)/Math.max(1,height);
 const fitScale=Math.max(1,1.88/aspect);
 const half=Math.tan(fovDegrees*Math.PI/360)*fitScale;
 return {aspect,fitScale,fovDegrees:Math.atan(half)*360/Math.PI};
}
