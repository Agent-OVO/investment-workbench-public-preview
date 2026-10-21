// Deliberately small, immediate camera movements: no inertia, timers or auto-orbit.
// Compatible with the local Three.js r149 perspective and orthographic cameras.
const ZONES = new Set(['focus', 'support', 'limits', 'evidence', 'questions']);
const YAW_LIMIT = 4, PITCH_LIMIT = 2, MIN_ZOOM = .94, MAX_ZOOM = 1.06;
const FOCUS_SHIFT = .18, FOCUS_ZOOM = 1.04, DEG = Math.PI / 180;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const coordinates = value => {
  const result = Array.isArray(value) || ArrayBuffer.isView(value)
    ? Array.from(value) : value && [value.x, value.y, value.z];
  return result?.length === 3 && result.every(finite) ? result : null;
};

/** setView takes degrees; manipulate takes CSS-pixel deltas; zoom takes an
 * additive zoom-factor delta (positive = closer). get() returns detached data.
 * getFocusPoint(id) may return a world-space Vector3 or [x,y,z]. */
export function createBoundedController({THREE, camera, pose = {}, onChange = () => {}, getFocusPoint} = {}) {
  if (!THREE?.Vector3 || !camera?.position || !camera?.lookAt) throw new TypeError('A Three camera is required');
  const position = coordinates(pose.position ?? [0, 4.9, 16]);
  const target = coordinates(pose.target ?? [0, 2.3, -1]);
  const up = coordinates(pose.up ?? [0, 1, 0]);
  if (!position || !target || !up) throw new TypeError('Camera pose must contain finite 3D coordinates');
  const basePosition = new THREE.Vector3(...position), baseTarget = new THREE.Vector3(...target);
  const baseUp = new THREE.Vector3(...up), baseOffset = basePosition.clone().sub(baseTarget);
  if (baseUp.lengthSq() < 1e-12 || baseOffset.lengthSq() < 1e-12 ||
      baseUp.clone().cross(baseOffset).lengthSq() < 1e-12) throw new RangeError('Camera pose is degenerate');
  baseUp.normalize();
  const baseZoom = finite(camera.zoom) && camera.zoom > 0 ? camera.zoom : 1;
  const offset = new THREE.Vector3(), currentTarget = baseTarget.clone();
  let yaw = 0, pitch = 0, zoom = 1, selectedId = null, disposed = false;

  function get() {
    return {
      position: camera.position.toArray(), target: currentTarget.toArray(),
      presentation: {yawDegrees: yaw, pitchDegrees: pitch, zoom},
      selected: selectedId, selectedId, selectedZone: selectedId, zoom,
      bounds: {yawDegrees: [-YAW_LIMIT, YAW_LIMIT], pitchDegrees: [-PITCH_LIMIT, PITCH_LIMIT],
        zoom: [MIN_ZOOM, MAX_ZOOM], targetTranslation: FOCUS_SHIFT},
      fixed: false
    };
  }
  function apply() {
    currentTarget.copy(baseTarget).add(offset);
    const arm = baseOffset.clone().applyAxisAngle(baseUp, yaw * DEG);
    const right = baseUp.clone().cross(arm).normalize();
    arm.applyAxisAngle(right, -pitch * DEG);
    camera.position.copy(currentTarget).add(arm);
    camera.up.copy(baseUp);
    camera.zoom = baseZoom * zoom;
    camera.lookAt(currentTarget);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const state = get();
    onChange(state);
    return state;
  }
  function reset() {
    if (disposed) return get();
    yaw = pitch = 0; zoom = 1; selectedId = null; offset.set(0, 0, 0);
    return apply();
  }
  function setView(nextYaw = 0, nextPitch = 0) {
    if (disposed) return get();
    if (finite(nextYaw)) yaw = clamp(nextYaw, -YAW_LIMIT, YAW_LIMIT);
    if (finite(nextPitch)) pitch = clamp(nextPitch, -PITCH_LIMIT, PITCH_LIMIT);
    return apply();
  }
  function manipulate(dx = 0, dy = 0) {
    return setView(yaw - (finite(dx) ? dx : 0) * .0025 / DEG,
      pitch - (finite(dy) ? dy : 0) * .00175 / DEG);
  }
  function changeZoom(delta = 0) {
    if (disposed || !finite(delta)) return get();
    zoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM);
    return apply();
  }
  function focus(id) {
    if (disposed) return get();
    if (id == null || id === '') return reset();
    if (!ZONES.has(id)) return get();
    // Resolve first, so a failed world-space lookup cannot leave partial state.
    const point = coordinates(getFocusPoint?.(id));
    offset.set(0, 0, 0);
    if (point) {
      offset.fromArray(point).sub(baseTarget);
      const distance = offset.length();
      if (distance > FOCUS_SHIFT) offset.multiplyScalar(FOCUS_SHIFT / distance);
    }
    selectedId = id; zoom = FOCUS_ZOOM;
    return apply();
  }
  const api = {reset, manipulate, setView, zoom: changeZoom, focus, get,
    dispose() { disposed = true; }};
  apply();
  return api;
}

const EDITABLE = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]';
const INTERACTIVE = 'a,button,input,textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[role="link"],[role="button"]';
const CONTROL = '[data-view-zoom],[data-view-reset],[data-focus-zone]';
const attr = (element, key) => element.getAttribute(key);
const restoreAttribute = (element, key, value) => value === null
  ? element.removeAttribute(key) : element.setAttribute(key, value);

/** Only the canvas and explicit view handles consume drag / wheel input.
 * Text, links, editable fields and page touch outside those surfaces stay native.
 * Call update() after external controller calls; dynamic controls are observed. */
export function bindC02Controls({host, canvas, controller, onChange = () => {}, env = globalThis} = {}) {
  if (!host?.addEventListener || !canvas?.addEventListener || !controller?.get) {
    throw new TypeError('A host, canvas and bounded controller are required');
  }
  const removers = [], surfaces = new Map(), focusButtons = new Map();
  const originalSelected = attr(host, 'data-selected-zone');
  const originalDragging = attr(host, 'data-view-dragging');
  const eventRoot = env.addEventListener ? env : host.ownerDocument?.defaultView || host;
  let drag = null, disposed = false;
  const listen = (node, type, fn, options) => {
    node.addEventListener(type, fn, options);
    removers.push(() => node.removeEventListener(type, fn, options));
  };
  const elementOf = event => event.target?.nodeType === 3 ? event.target.parentElement : event.target;
  const disabled = element => !!element?.disabled || !!element?.closest?.('[inert],[aria-disabled="true"]');
  function surfaceOf(event) {
    const target = elementOf(event);
    if (!target || !host.contains(target) || target.closest?.(EDITABLE)) return null;
    if (target === canvas && canvas.getAttribute('data-view-input') === 'handle-only') return null;
    const surface = target === canvas ? canvas : target.closest?.('[data-view-handle]');
    if (!surface || !host.contains(surface) || disabled(surface)) return null;
    const interactive = target.closest?.(INTERACTIVE);
    // A button can itself be an explicit handle, but nested links/buttons cannot.
    if (interactive && (interactive !== surface || interactive.matches('a,input,textarea,select,summary'))) return null;
    return surface;
  }
  function restoreSurface(surface, previous) {
    surface.style.touchAction = previous.touchAction;
    surface.style.userSelect = previous.userSelect;
    restoreAttribute(surface, 'tabindex', previous.tabindex);
  }
  function update() {
    if (disposed) return;
    const active = new Set([canvas, ...host.querySelectorAll('[data-view-handle]')]);
    for (const [surface, previous] of surfaces) {
      if (!active.has(surface)) { restoreSurface(surface, previous); surfaces.delete(surface); }
    }
    for (const surface of active) {
      if (!surfaces.has(surface)) surfaces.set(surface, {touchAction: surface.style.touchAction,
        userSelect: surface.style.userSelect, tabindex: attr(surface, 'tabindex')});
      surface.style.touchAction = 'none';
      surface.style.userSelect = 'none';
      if (!surface.hasAttribute('tabindex')) surface.setAttribute('tabindex', '0');
    }
    const selected = controller.get().selectedId;
    host.setAttribute('data-selected-zone', selected || '');
    for (const button of host.querySelectorAll('[data-focus-zone]')) {
      if (!focusButtons.has(button)) focusButtons.set(button, attr(button, 'aria-pressed'));
      button.setAttribute('aria-pressed', String(attr(button, 'data-focus-zone') === selected));
    }
  }
  function changed() { update(); onChange(controller.get()); }
  function finishDrag() {
    if (!drag) return;
    const previous = drag; drag = null;
    restoreAttribute(host, 'data-view-dragging', originalDragging);
    try {
      if (previous.surface.hasPointerCapture?.(previous.id)) previous.surface.releasePointerCapture(previous.id);
    } catch { /* Removed nodes and interrupted pointers can already lose capture. */ }
  }
  function pointerDown(event) {
    if (disposed || drag || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    const surface = surfaceOf(event);
    if (!surface || !finite(event.clientX) || !finite(event.clientY)) return;
    event.preventDefault();
    drag = {id: event.pointerId, surface, x: event.clientX, y: event.clientY};
    host.setAttribute('data-view-dragging', 'true');
    try { surface.focus({preventScroll: true}); } catch { /* A removed handle need not accept focus. */ }
    try { surface.setPointerCapture?.(event.pointerId); } catch { /* Window listeners provide the fallback. */ }
  }
  function pointerMove(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.surface.isConnected || (event.pointerType === 'mouse' && event.buttons === 0)) { finishDrag(); return; }
    if (!finite(event.clientX) || !finite(event.clientY)) return;
    event.preventDefault();
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag.x = event.clientX; drag.y = event.clientY;
    if (dx || dy) { controller.manipulate(dx, dy); changed(); }
  }
  function pointerEnd(event) { if (drag && event.pointerId === drag.id) finishDrag(); }
  function wheel(event) {
    if (!surfaceOf(event) || event.ctrlKey || !finite(event.deltaY)) return;
    event.preventDefault();
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(1, canvas.clientHeight || 600) : 1;
    // Cap an individual wheel event; large line/page deltas cannot jump wildly.
    controller.zoom(clamp(-event.deltaY * scale * .0002, -.02, .02));
    changed();
  }
  function click(event) {
    const target = elementOf(event), button = target?.closest?.(CONTROL);
    if (!button || !host.contains(button) || disabled(button)) return;
    // Do not turn content links or form fields nested inside a control into actions.
    const interactive = target.closest?.(INTERACTIVE);
    if (interactive && interactive !== button) return;
    let action;
    if (button.hasAttribute('data-view-reset')) action = () => controller.reset();
    else if (button.hasAttribute('data-view-zoom')) {
      const direction = attr(button, 'data-view-zoom');
      if (!['in', 'out'].includes(direction)) return;
      action = () => controller.zoom(direction === 'in' ? .01 : -.01);
    } else {
      const id = attr(button, 'data-focus-zone');
      if (!ZONES.has(id)) return;
      action = () => controller.focus(id);
    }
    event.preventDefault(); finishDrag(); action(); changed();
  }
  function keydown(event) {
    const target = elementOf(event);
    if (!target || target.closest?.(EDITABLE) || disabled(target) || event.altKey || event.ctrlKey || event.metaKey) return;
    const surface = surfaceOf(event), button = target.closest?.(CONTROL);
    const isControl = surface || (button && host.contains(button));
    // Escape can return from a focused reading zone; other keys never hijack text.
    if (!isControl && event.key !== 'Escape') return;
    const state = controller.get(), {yawDegrees: yaw, pitchDegrees: pitch} = state.presentation;
    let action;
    switch (event.key) {
      case 'ArrowLeft': action = () => controller.setView(yaw - .5, pitch); break;
      case 'ArrowRight': action = () => controller.setView(yaw + .5, pitch); break;
      case 'ArrowUp': action = () => controller.setView(yaw, pitch + .25); break;
      case 'ArrowDown': action = () => controller.setView(yaw, pitch - .25); break;
      case '+': case '=': action = () => controller.zoom(.01); break;
      case '-': case '_': action = () => controller.zoom(-.01); break;
      case 'Home': action = () => controller.reset(); break;
      case 'Escape':
        if (!drag && !state.selectedId && yaw === 0 && pitch === 0 && state.presentation.zoom === 1) return;
        action = () => controller.reset(); break;
      default: return;
    }
    event.preventDefault(); finishDrag(); action(); changed();
  }
  listen(host, 'pointerdown', pointerDown);
  listen(eventRoot, 'pointermove', pointerMove, {passive: false});
  listen(eventRoot, 'pointerup', pointerEnd);
  listen(eventRoot, 'pointercancel', pointerEnd);
  listen(host, 'lostpointercapture', pointerEnd, true);
  listen(eventRoot, 'blur', finishDrag);
  listen(host, 'wheel', wheel, {passive: false});
  listen(host, 'click', click);
  listen(host, 'keydown', keydown);
  const observer = env.MutationObserver ? new env.MutationObserver(update) : null;
  observer?.observe(host, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-view-handle', 'data-focus-zone']});
  update();
  return {update, dispose() {
    if (disposed) return;
    disposed = true; finishDrag(); observer?.disconnect();
    removers.splice(0).forEach(remove => remove());
    for (const [surface, previous] of surfaces) restoreSurface(surface, previous);
    for (const [button, previous] of focusButtons) restoreAttribute(button, 'aria-pressed', previous);
    restoreAttribute(host, 'data-selected-zone', originalSelected);
    restoreAttribute(host, 'data-view-dragging', originalDragging);
    surfaces.clear(); focusButtons.clear();
  }};
}
