// Camera-only presentation state. Research/version identity remains in the store.
// Overview matches art/c01-round1/metadata/preview_views.json (Y-up metres).
const freezePose = (position, target) => Object.freeze({
  position: Object.freeze(position), target: Object.freeze(target)
});
export const DEFAULT_CAMERA_PRESETS = Object.freeze({
  overview: freezePose(
    [0.15000000596046448, 5.300000190734863, 15.600000381469727],
    [0, 1.899999976158142, 0.10000000149011612]
  ),
  // Initial inspection poses derived from the new carrier world positions.
  // These are integration candidates; browser framing still needs visual review.
  focus: freezePose([0.1, 4.5, 11.5], [0, 2.6, 0.45]),
  evidence: freezePose([-3.2, 3.1, 10.3], [-3.87, 2.1, 0.03]),
  archive: freezePose([3.35, 3.2, 10.3], [3.94, 2.25, 0.1]),
  detail: freezePose([0.04, 3.62, 6.95], [0, 3.17, 0.45])
});
export const CAMERA_LIMITS = Object.freeze({
  yawDegrees: Object.freeze([-4, 4]),
  pitchDegrees: Object.freeze([-2, 2]),
  zoomEnabled: false,
  distanceRatio: Object.freeze([1, 1])
});

export function cameraPresetForTransition(previous, next) {
  if (!previous) return next.state.view === 'focus' ? 'focus' : 'overview';
  const modal = view => view === 'reading' || view === 'evidence';
  if (modal(next.state.view)) return null;
  if (modal(previous.state.view) && previous.state.researchId === next.state.researchId) return null;
  if (previous.state.researchId !== next.state.researchId) return next.state.view === 'focus' ? 'focus' : 'overview';
  if (previous.state.view === next.state.view) return null;
  return next.state.view === 'focus' ? 'focus' : next.state.view === 'overview' ? 'overview' : null;
}

/**
 * layout.camera supplies the overview position/target; layout.presets can override
 * any named pose with {position:[x,y,z],target:[x,y,z]}. Camera lens/aspect is owned
 * by the renderer. Both pointer and keyboard input must call manipulate(dx,dy).
 * Zoom is deliberately disabled until the bounded composition is accepted.
 */
export function createCameraController({THREE: T, camera, canvas, layout = {}, onChange}) {
  const radians = Math.PI / 180, degrees = 180 / Math.PI;
  const yawLimit = 4 * radians, pitchLimit = 2 * radians;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const target = new T.Vector3();
  let preset = 'overview', baseYaw = 0, basePitch = 0, radius = 1;
  let yaw = 0, pitch = 0, drag = null, lastDrag = false, disposed = false;
  const oldTouchAction = canvas.style?.touchAction;
  const touchQuery=matchMedia('(max-width:1100px), (max-height:800px), (max-aspect-ratio:3/2)');
  const updateTouchAction=()=>{if(canvas.style)canvas.style.touchAction=touchQuery.matches?'pan-y':'none';};
  touchQuery.addEventListener('change',updateTouchAction);updateTouchAction();

  function copyPose(name) {
    const fallback = DEFAULT_CAMERA_PRESETS[name] || DEFAULT_CAMERA_PRESETS.overview;
    const overrides = name === 'overview'
      ? {...(layout.camera || {}), ...(layout.presets?.overview || {})}
      : layout.presets?.[name] || {};
    return {
      position: [...(overrides.position || fallback.position)],
      target: [...(overrides.target || fallback.target)]
    };
  }

  function update() {
    const a = baseYaw + yaw, b = basePitch + pitch;
    camera.position.set(
      target.x + radius * Math.cos(b) * Math.sin(a),
      target.y + radius * Math.sin(b),
      target.z + radius * Math.cos(b) * Math.cos(a)
    );
    camera.lookAt(target);
    camera.updateMatrixWorld?.(true);
    onChange?.();
  }

  function setPreset(name = 'overview', point) {
    if (disposed) return;
    preset = Object.hasOwn(DEFAULT_CAMERA_PRESETS, name) || layout.presets?.[name] ? name : 'overview';
    const pose = copyPose(preset);
    if (point) {
      // Translate the configured detail pose rather than reusing old asset coordinates.
      const detail = copyPose('detail');
      const offset = new T.Vector3().fromArray(detail.position).sub(new T.Vector3().fromArray(detail.target));
      pose.target = [...point];
      pose.position = new T.Vector3().fromArray(point).add(offset).toArray();
      preset = 'detail';
    }
    if (![...pose.position, ...pose.target].every(Number.isFinite)) throw new Error('INVALID_CAMERA_POSE');
    target.fromArray(pose.target);
    const offset = new T.Vector3().fromArray(pose.position).sub(target);
    radius = offset.length();
    if (radius < 0.001) throw new Error('INVALID_CAMERA_DISTANCE');
    baseYaw = Math.atan2(offset.x, offset.z);
    basePitch = Math.asin(clamp(offset.y / radius, -1, 1));
    yaw = 0;
    pitch = 0;
    update();
  }

  function manipulate(dx = 0, dy = 0, _zoom = 0) {
    if (disposed || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    // Clamp the stored state, not only the rendered pose: reversing at a boundary
    // responds immediately, with no accumulated out-of-range drag to unwind.
    yaw = clamp(yaw - dx * 0.0025, -yawLimit, yawLimit);
    pitch = clamp(pitch - dy * 0.00175,
      Math.max(-pitchLimit, -Math.PI / 2 + 0.001 - basePitch),
      Math.min(pitchLimit, Math.PI / 2 - 0.001 - basePitch));
    update();
  }

  const down = event => {
    if(event.pointerType==='touch'&&touchQuery.matches)return;
    if (disposed || drag || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    lastDrag = false;
    drag = {id: event.pointerId, originX: event.clientX, originY: event.clientY,
      x: event.clientX, y: event.clientY, moved: false};
    canvas.setPointerCapture?.(event.pointerId);
  };
  const move = event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) < 4) return;
    drag.moved = true;
    manipulate(event.clientX - drag.x, event.clientY - drag.y);
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const up = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const pointerId = drag.id;
    lastDrag = drag.moved || event.type === 'pointercancel';
    drag = null;
    if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture?.(pointerId);
  };
  const lost = event => {
    if (drag && event.pointerId === drag.id) {
      lastDrag = drag.moved;
      drag = null;
    }
  };
  const handlers = {pointerdown: down, pointermove: move, pointerup: up,
    pointercancel: up, lostpointercapture: lost};
  for (const [name, handler] of Object.entries(handlers)) canvas.addEventListener(name, handler);
  // No wheel listener: disabled camera zoom must not swallow document scrolling.
  setPreset('overview');

  return {
    setPreset,
    reset: () => setPreset('overview'),
    manipulate,
    wasDrag: () => lastDrag,
    get() {
      const offset = camera.position.clone().sub(target), distance = offset.length();
      const actualYaw = Math.atan2(Math.sin(Math.atan2(offset.x, offset.z) - baseYaw),
        Math.cos(Math.atan2(offset.x, offset.z) - baseYaw));
      const actualPitch = Math.asin(clamp(offset.y / distance, -1, 1)) - basePitch;
      return {cameraPreset: preset, position: camera.position.toArray(), target: target.toArray(),
        presentation: {azimuth: actualYaw, elevation: actualPitch, distance: distance / radius,
          yawDegrees: actualYaw * degrees, pitchDegrees: actualPitch * degrees},
        limits: {yawDegrees: [...CAMERA_LIMITS.yawDegrees], pitchDegrees: [...CAMERA_LIMITS.pitchDegrees],
          zoomEnabled: false, distanceRatio: [1, 1]},
        cameraDistance: distance};
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      touchQuery.removeEventListener('change',updateTouchAction);
      const pointerId = drag?.id;
      drag = null;
      for (const [name, handler] of Object.entries(handlers)) canvas.removeEventListener(name, handler);
      if (pointerId !== undefined && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture?.(pointerId);
      if (canvas.style) canvas.style.touchAction = oldTouchAction || '';
    }
  };
}
