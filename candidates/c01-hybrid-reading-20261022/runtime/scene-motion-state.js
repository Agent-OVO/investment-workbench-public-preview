/**
 * C01 isolated art study: adapter-free state / bounded motion, NOT a browser pass.
 * The caller verifies exact public snapshot bytes and owns all Three/DOM effects.
 * No globals, network, timers, scene mutation, DOM listeners or permanent RAF loop.
 */
export const MOTION_MS = Object.freeze({ camera: 280, reader: 180, emphasis: 240 });
const READER_OFFSET_PX = 8;

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function copyView(view) {
  if (!view || !['position', 'target'].every(key => Array.isArray(view[key])
    && view[key].length === 3 && view[key].every(Number.isFinite))) {
    throw new TypeError('A view needs finite position[3] and target[3].');
  }
  return { position: [...view.position], target: [...view.target] };
}
function identity(value) {
  if (!value || typeof value.id !== 'string' || !value.id.trim()
    || value.id !== value.id.trim() || !/^[a-fA-F0-9]{64}$/.test(value.sha256)) {
    throw new TypeError('Research identity needs an exact nonempty ID and full SHA-256.');
  }
  return { id: value.id, sha256: value.sha256.toLowerCase() };
}
function sameIdentity(a, b) {
  return Boolean(a && b && a.id === b.id && a.sha256 === b.sha256);
}
function publicUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new TypeError('Use an explicit HTTPS public source URL without credentials.');
  }
  return url.href;
}
function mix(a, b, amount) { return a + (b - a) * amount; }
function smooth(t) { return t * t * (3 - 2 * t); }
function lerpView(a, b, amount) {
  return {
    position: a.position.map((n, i) => mix(n, b.position[i], amount)),
    target: a.target.map((n, i) => mix(n, b.target[i], amount)),
  };
}
function sameView(a, b) {
  return ['position', 'target'].every(key => a[key].every((n, i) => n === b[key][i]));
}

/**
 * scheduler = { now(): monotonicMilliseconds, requestFrame(callback), cancelFrame(id) }
 * onChange receives immutable snapshots. It must not throw; it may dispatch events.
 * homeView / focusViews are authored, bounded positions, never live-data coordinates.
 */
export function createSceneMotionState({ homeView, focusViews = {}, scheduler,
  readerSide = 'right', reducedMotion = false, onChange = () => {} } = {}) {
  const homeViewCopy = copyView(homeView);
  const authoredViews = new Map(Object.entries(focusViews).map(([key, view]) => [key, copyView(view)]));
  if (authoredViews.has('home')) throw new TypeError('The focus key "home" is reserved.');
  if (!['left', 'right'].includes(readerSide)) throw new TypeError('Choose one reader side.');
  if (!scheduler || !['now', 'requestFrame', 'cancelFrame'].every(key => typeof scheduler[key] === 'function')) {
    throw new TypeError('Inject a clock and a cancellable frame scheduler.');
  }
  if (typeof onChange !== 'function') throw new TypeError('onChange must be a function.');
  let epoch = 0;
  let pendingToken = null;
  let frameId = null;
  let frameGeneration = 0;
  let cameraTween = null;
  let readerTween = null;
  let emphasisTween = null;
  let savedReaderView = null;
  let lastNow = -Infinity;
  let revision = 0;
  const state = {
    disposed: false,
    lifecycle: { visible: true, contextAvailable: true, assetsReady: false, fallback: false,
      reducedMotion: Boolean(reducedMotion) },
    research: { status: 'empty', requested: null, verified: null, error: null, focusKey: null },
    camera: { mode: 'home', focusKey: null, view: copyView(homeViewCopy) },
    reader: { open: false, side: readerSide, originId: null, shellProgress: 0 },
    hotspot: null,
    emphasis: null,
    restoreFocus: { sequence: 0, originId: null },
  };

  function now() {
    const time = scheduler.now();
    if (!Number.isFinite(time) || time < lastNow) throw new TypeError('Clock must be finite and monotonic.');
    lastNow = time;
    return time;
  }
  function sceneAvailable() {
    return !state.disposed && state.lifecycle.contextAvailable && state.lifecycle.assetsReady
      && !state.lifecycle.fallback;
  }
  function canAnimate() {
    return sceneAvailable() && state.lifecycle.visible && !state.lifecycle.reducedMotion;
  }
  function verified() { return state.research.status === 'ready' && state.research.verified; }
  function hasMotion() { return Boolean(cameraTween || readerTween || emphasisTween); }
  function stopFrame() {
    frameGeneration += 1;
    if (frameId !== null) scheduler.cancelFrame(frameId);
    frameId = null;
  }
  function restoreOrigin() {
    if (state.reader.originId) {
      state.restoreFocus = { sequence: state.restoreFocus.sequence + 1, originId: state.reader.originId };
    }
  }
  function settleReader() {
    readerTween = null;
    state.reader.shellProgress = state.reader.open ? 1 : 0;
  }
  function cancelAll({ settleCamera = false, preserveReader = false } = {}) {
    stopFrame();
    if (cameraTween) {
      if (settleCamera) state.camera.view = copyView(cameraTween.to);
      else { state.camera.mode = 'manual'; state.camera.focusKey = null; }
    }
    cameraTween = null;
    if (preserveReader) readerTween = null;
    else settleReader();
    emphasisTween = null;
    state.emphasis = null;
  }
  function snapshot() {
    const selected = verified();
    const modelEligible = Boolean(selected && sceneAvailable());
    return freeze({
      revision,
      disposed: state.disposed,
      mode: state.reader.open ? 'evidence' : 'overview',
      lifecycle: { ...state.lifecycle },
      research: {
        ...state.research,
        requested: state.research.requested && { ...state.research.requested },
        verified: selected ? { ...selected } : null,
      },
      camera: { ...state.camera, view: copyView(state.camera.view),
        transition: cameraTween ? { to: copyView(cameraTween.to), durationMs: MOTION_MS.camera } : null },
      reader: {
        open: state.reader.open, side: state.reader.side, originId: state.reader.originId,
        // Animate only a decorative backplate/accent, NEVER the native text subtree.
        shell: { visible: state.reader.open || state.reader.shellProgress > 0,
          opacity: state.reader.shellProgress,
          translateXPx: (1 - state.reader.shellProgress) * READER_OFFSET_PX * (readerSide === 'right' ? 1 : -1),
          durationMs: readerTween ? MOTION_MS.reader : 0 },
        body: { visible: Boolean(state.reader.open && selected), motion: 'none',
          identity: state.reader.open && selected ? { ...selected } : null },
      },
      highlight: modelEligible ? {
        selection: state.research.focusKey ? { key: state.research.focusKey, identity: { ...selected } } : null,
        hotspot: state.hotspot ? { ...state.hotspot, labelVisible: true } : null,
        emphasis: state.emphasis ? { ...state.emphasis } : null,
      } : { selection: null, hotspot: null, emphasis: null },
      // Directly compatible with applyVerifiedResearchIdentity(root, selection).
      // This is an eligibility signal, not proof of verification or of rendered output.
      printedResearchEligibility: modelEligible
        ? { verified: true, slug: selected.id, id: selected.id, sha256: selected.sha256 }
        : { verified: false, slug: null, id: null, sha256: null },
      restoreFocus: { ...state.restoreFocus },
      motion: { running: hasMotion(), framePending: frameId !== null,
        camera: Boolean(cameraTween), reader: Boolean(readerTween), emphasis: Boolean(emphasisTween) },
    });
  }
  function scheduleFrame() {
    if (frameId !== null || !hasMotion() || !canAnimate()) return;
    const generation = frameGeneration;
    frameId = scheduler.requestFrame(() => {
      // A canceled callback that the host still delivers must not revive motion.
      if (generation !== frameGeneration || state.disposed) return;
      frameId = null;
      sample(now());
      publish();
    });
  }
  function publish() {
    revision += 1;
    scheduleFrame();
    onChange(snapshot());
  }
  function fraction(track, time) { return Math.min(1, Math.max(0, (time - track.start) / track.duration)); }
  function sample(time) {
    if (cameraTween) {
      const t = fraction(cameraTween, time);
      state.camera.view = lerpView(cameraTween.from, cameraTween.to, smooth(t));
      if (t === 1) cameraTween = null;
    }
    if (readerTween) {
      const t = fraction(readerTween, time);
      state.reader.shellProgress = mix(readerTween.from, readerTween.to, smooth(t));
      if (t === 1) readerTween = null;
    }
    if (emphasisTween) {
      const t = fraction(emphasisTween, time);
      state.emphasis = t === 1 ? null : { key: emphasisTween.key, strength: Math.sin(Math.PI * t) };
      if (t === 1) emphasisTween = null;
    }
  }
  function moveCamera(to, mode, focusKey, time) {
    cameraTween = null;
    state.camera.mode = mode;
    state.camera.focusKey = focusKey;
    if (canAnimate() && !sameView(state.camera.view, to)) {
      cameraTween = { from: copyView(state.camera.view), to: copyView(to), start: time, duration: MOTION_MS.camera };
    } else state.camera.view = copyView(to);
  }
  function moveReader(open, time) {
    state.reader.open = open;
    readerTween = null;
    const to = open ? 1 : 0;
    if (canAnimate() && state.reader.shellProgress !== to) {
      readerTween = { from: state.reader.shellProgress, to, start: time, duration: MOTION_MS.reader };
    } else state.reader.shellProgress = to;
  }
  function pulse(key, time) {
    emphasisTween = null;
    state.emphasis = null;
    if (key && canAnimate()) {
      emphasisTween = { key, start: time, duration: MOTION_MS.emphasis };
      state.emphasis = { key, strength: 0 };
    }
  }
  function clearResearch(status, requested = null, error = null) {
    cancelAll();
    restoreOrigin();
    savedReaderView = null;
    state.reader = { open: false, side: readerSide, originId: null, shellProgress: 0 };
    state.research = { status, requested, verified: null, error, focusKey: null };
    state.camera = { mode: 'home', focusKey: null, view: copyView(homeViewCopy) };
    state.hotspot = null;
  }
  function result(accepted, reason, token) {
    return freeze({ accepted, ...(reason ? { reason } : {}), ...(token ? { token } : {}) });
  }
  function knownFocus(key) { return typeof key === 'string' && authoredViews.has(key); }

  /**
   * Event names and shapes are documented in tests/SCENE_MOTION_STATE.md.
   * Invalid shapes throw without granting evidence eligibility. Stale tokens no-op.
   */
  function dispatch(event) {
    if (state.disposed) return result(false, 'disposed');
    if (!event || typeof event.type !== 'string') throw new TypeError('An event type is required.');
    if (['research.resolve', 'research.fail'].includes(event.type)
      && (!pendingToken || event.token !== pendingToken || state.research.status !== 'loading')) {
      return result(false, 'stale-request');
    }
    const time = now();
    sample(time);
    let response = result(true);
    switch (event.type) {
      case 'research.start': {
        // Clear first, even when a new identity is malformed: never keep old proof.
        pendingToken = null;
        clearResearch('loading');
        let requested;
        try { requested = identity(event); }
        catch (error) {
          state.research.status = 'error'; state.research.error = 'invalid-identity';
          publish();
          throw error;
        }
        state.research.requested = requested;
        pendingToken = freeze({ epoch: ++epoch, ...requested });
        response = result(true, null, pendingToken);
        break;
      }
      case 'research.resolve': {
        if (!pendingToken || event.token !== pendingToken || state.research.status !== 'loading') {
          return result(false, 'stale-request');
        }
        let checked;
        try {
          checked = identity(event.verified);
          if (!sameIdentity(checked, state.research.requested) || event.verified?.verified !== true) {
            throw new TypeError('Verification must match the requested ID and SHA-256.');
          }
          checked.sourceUrl = publicUrl(event.verified.sourceUrl);
          if (event.focusKey != null && !knownFocus(event.focusKey)) throw new TypeError('Unknown authored focus key.');
        } catch (error) {
          pendingToken = null;
          clearResearch('error', state.research.requested, 'verification-rejected');
          publish();
          return result(false, 'verification-rejected');
        }
        pendingToken = null;
        state.research = { status: 'ready', requested: { id: checked.id, sha256: checked.sha256 },
          verified: checked, error: null, focusKey: event.focusKey ?? null };
        pulse(state.research.focusKey, time);
        break;
      }
      case 'research.fail':
        if (!pendingToken || event.token !== pendingToken) return result(false, 'stale-request');
        pendingToken = null;
        clearResearch('error', state.research.requested, 'load-failed');
        break;
      case 'research.clear':
        pendingToken = null;
        clearResearch('empty');
        break;
      case 'focus': {
        if (!verified()) return result(false, 'no-verified-research');
        if (event.key !== 'home' && !knownFocus(event.key)) return result(false, 'unknown-focus');
        if (!sceneAvailable()) return result(false, 'scene-unavailable');
        // The native long text stays stable; a deliberate new focus supersedes motion.
        cancelAll();
        moveCamera(event.key === 'home' ? homeViewCopy : authoredViews.get(event.key),
          event.key === 'home' ? 'home' : 'focus', event.key === 'home' ? null : event.key, time);
        pulse(event.key === 'home' ? null : event.key, time);
        break;
      }
      case 'evidence.open': {
        if (!verified()) return result(false, 'no-verified-research');
        if (event.focusKey != null && !knownFocus(event.focusKey)) return result(false, 'unknown-focus');
        if (event.originId != null && (typeof event.originId !== 'string' || !event.originId.trim())) {
          throw new TypeError('originId must identify a native originating control.');
        }
        if (state.reader.open) return result(false, 'already-open');
        // Preserve the viewpoint only on the first opening, not duplicate clicks.
        savedReaderView = { view: copyView(state.camera.view), mode: state.camera.mode, focusKey: state.camera.focusKey };
        cancelAll({ preserveReader: true });
        state.reader.originId = event.originId ?? null;
        moveReader(true, time);
        if (event.focusKey && sceneAvailable()) {
          moveCamera(authoredViews.get(event.focusKey), 'focus', event.focusKey, time);
        }
        break;
      }
      case 'evidence.close': {
        if (!state.reader.open) return result(false, 'already-closed');
        cancelAll({ preserveReader: true });
        restoreOrigin();
        moveReader(false, time);
        state.reader.originId = null;
        if (savedReaderView && sceneAvailable()) {
          moveCamera(savedReaderView.view, savedReaderView.mode, savedReaderView.focusKey, time);
        }
        savedReaderView = null;
        break;
      }
      case 'home':
      case 'escape':
        // Visible Home and Escape are immediate escape hatches, not another tween.
        cancelAll();
        restoreOrigin();
        state.reader = { open: false, side: readerSide, originId: null, shellProgress: 0 };
        savedReaderView = null;
        state.hotspot = null;
        state.camera = { mode: 'home', focusKey: null, view: copyView(homeViewCopy) };
        break;
      case 'camera.manual': {
        const actualView = event.view ? copyView(event.view) : copyView(state.camera.view);
        cancelAll();
        state.camera = { mode: 'manual', focusKey: null, view: actualView };
        break;
      }
      case 'hotspot.set': {
        if (event.key == null) { state.hotspot = null; pulse(null, time); break; }
        if (!verified() || !sceneAvailable()) return result(false, 'scene-unavailable');
        if (!knownFocus(event.key)) return result(false, 'unknown-focus');
        if (!['pointer', 'keyboard'].includes(event.modality)) throw new TypeError('Use pointer or keyboard modality.');
        const changed = state.hotspot?.key !== event.key;
        state.hotspot = { key: event.key, modality: event.modality };
        if (changed) pulse(event.key, time);
        break;
      }
      case 'lifecycle': {
        const keys = ['visible', 'contextAvailable', 'assetsReady', 'fallback', 'reducedMotion'];
        for (const key of keys) {
          if (key in event && typeof event[key] !== 'boolean') throw new TypeError(`${key} must be boolean.`);
        }
        for (const key of keys) if (key in event) state.lifecycle[key] = event[key];
        // Context restoration requires explicit asset revalidation; no automatic replay.
        if (!state.lifecycle.contextAvailable) state.lifecycle.assetsReady = false;
        if (!canAnimate()) cancelAll({ settleCamera: state.lifecycle.reducedMotion });
        if (!sceneAvailable()) state.hotspot = null;
        break;
      }
      default: throw new TypeError(`Unknown event type: ${event.type}`);
    }
    if (!hasMotion()) stopFrame();
    publish();
    return response;
  }

  function dispose() {
    if (state.disposed) return;
    pendingToken = null;
    clearResearch('empty');
    state.disposed = true;
    try { publish(); }
    finally {
      // No DOM/global listeners are owned here. The adapter owns listener disposal.
      onChange = () => {};
    }
  }
  return Object.freeze({ getState: snapshot, dispatch, dispose });
}
