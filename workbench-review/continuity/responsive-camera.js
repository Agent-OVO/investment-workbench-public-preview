// Retain the authored position/target and landscape lens. Portrait viewports
// widen the vertical field to retain the reference frame's horizontal coverage.
export const REFERENCE_ASPECT = 1672 / 941;
export function responsiveFrustum({width,height,fov,orthoScale,referenceAspect=REFERENCE_ASPECT}) {
  if (![width,height,referenceAspect].every(n=>Number.isFinite(n)&&n>0)) throw Error('INVALID_VIEWPORT');
  const aspect=width/height, scale=Math.max(1,referenceAspect/aspect);
  return {aspect,scale,fov:Number.isFinite(fov)?2*Math.atan(Math.tan(fov*Math.PI/360)*scale)*180/Math.PI:undefined,
    halfHeight:Number.isFinite(orthoScale)?orthoScale*scale/2:undefined};
}
