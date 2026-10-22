// Required when this art study is integrated. This is not yet a published runtime.
// glTF extras survive the existing GLTFLoader as Object3D.userData.
// Transparent glass must not cast an opaque shadow-map silhouette. This is a
// bounded approximation, not simulated refractive shadow caustics.
export function applyAuthoredSurfaceSemantics(root) {
  root.traverse(object => {
    if (!object.isMesh) return;
    const background = object.userData.backgroundOnly === true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const transmissive = materials.some(material => material?.transmission > 0);
    object.castShadow = !background && !transmissive && object.userData.castShadow !== false;
    object.receiveShadow = !background;
    if (background) {
      object.frustumCulled = false;
      object.renderOrder = -1000;
      for (const material of materials) {
        if (!material) continue;
        material.depthWrite = false;
        material.toneMapped = false;
      }
    }
  });
}

// Printed public excerpts are data-bearing objects, not generic scenery.
// Call before the first frame and on every selection/load/error transition.
// The caller must only set verified=true AFTER the exact raw snapshot hash matches.
// Missing identity is fail-closed; no slug-only match and no stale result revival.
export function applyVerifiedResearchIdentity(root, selection = null) {
  const verified = selection?.verified === true;
  root.traverse(object => {
    const identity = object.userData || {};
    if (!identity.research_id && !identity.research_sha256) return;
    object.visible = Boolean(verified && identity.research_id && identity.research_sha256
      && identity.research_id === selection.slug
      && identity.research_sha256 === selection.sha256);
  });
}
