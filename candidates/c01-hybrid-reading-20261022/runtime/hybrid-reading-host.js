import { REPORTS } from '../research-history-data.js';
import { createSceneMotionState } from './scene-motion-state.js';

const HOME_VIEW = Object.freeze({ position: [0, 1.95, 4.95], target: [0, 1.43, 0] });
const REQUEST_TIMEOUT_MS = 20000;
let hostSequence = 0;

/**
 * Stable native-DOM adapter, not a scene renderer or a second snapshot loader.
 *
 * load MUST be the existing loadSnapshot integrity boundary in production. The
 * injected loader used by logic tests is not evidence that bytes were verified.
 * report MUST be an actual entry of this candidate's frozen REPORTS whitelist.
 * renderBody({report, loaded}, doc) returns one Node/DocumentFragment; it runs once
 * per accepted request, never in onState. The host retains no raw snapshot.
 *
 * The caller keeps body and ALL its ancestors untransformed. shell is a separate
 * decorative sibling, never an ancestor of body. The nonmodal panel must not use
 * aria-modal, a focus trap, or scrolling/selection/copy interception. All opener
 * and close controls are real buttons. The caller owns optional scene rendering;
 * sceneChanged accepts only {contextAvailable, assetsReady, fallback} booleans.
 * onState, onVerified, onClear, onStatus and onDispose are synchronous observers,
 * must not throw, and may re-enter the public API. Observer exceptions cannot
 * strand a request or bypass clearing; renderBody exceptions fail the selection.
 *
 * This host owns pagehide/pageshow: non-persisted pagehide disposes; bfcache entry
 * suspends motion, preserves ready DOM, and cancels a pending load. Restoration
 * refreshes visibility/motion preference and retries only an interrupted load.
 * The caller must not install a second unconditional pagehide disposer.
 * HTTP/file sources are not supported by the controller's HTTPS proof contract.
 */
export function createHybridReadingHost({ doc, win, root, panel, body, shell, title,
  load, renderBody, onVerified = () => {}, onClear = () => {},
  onStatus = () => {}, onState = () => {}, onDispose = () => {} } = {}) {
  if (!doc || !win || !root || !panel || !body || !shell || !title
    || typeof load !== 'function' || typeof renderBody !== 'function') {
    throw new TypeError('A complete native reading host and the existing loader/renderer are required.');
  }
  if (!root.contains(panel) || !panel.contains(body) || !panel.contains(title)
    || !root.contains(shell) || shell === body || shell.contains(body)
    || body.contains(shell) || shell.contains(title)) {
    throw new TypeError('The decorative shell must be separate from the native reading subtree.');
  }
  const instance = ++hostSequence;
  if (!panel.id) panel.id = `hybrid-reading-${instance}`;
  if (!title.id) title.id = `${panel.id}-title`;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', title.id);
  panel.removeAttribute('aria-modal');
  title.setAttribute('tabindex', '-1');
  shell.setAttribute('aria-hidden', 'true');
  shell.style.pointerEvents = 'none';

  let disposed = false;
  let suspended = false;
  let generation = 0;
  let request = null;
  let selection = null; // Whitelist metadata and base URL only; never loaded/raw.
  let resumeSelection = null;
  let origin = null;
  let originSequence = 0;
  let consumedFocusSequence = 0;
  let lastNow = 0;
  const listeners = [];
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const notify = (callback, ...args) => { try { callback(...args); } catch { /* Observer contract. */ } };
  const status = (message, level = 'status') => notify(onStatus, message, level);
  const now = () => {
    const value = win.performance?.now?.() ?? Date.now();
    lastNow = Math.max(lastNow, Number.isFinite(value) ? value : lastNow);
    return lastNow;
  };
  const scheduler = {
    now,
    requestFrame: callback => win.requestAnimationFrame
      ? win.requestAnimationFrame(callback) : win.setTimeout(() => callback(now()), 16),
    cancelFrame: id => win.cancelAnimationFrame ? win.cancelAnimationFrame(id) : win.clearTimeout(id),
  };
  const controls = selector => [...root.querySelectorAll(selector)]
    .filter(element => element.tagName === 'BUTTON');

  function consumeFocus(snapshot) {
    const restore = snapshot.restoreFocus;
    if (restore.sequence <= consumedFocusSequence) return;
    consumedFocusSequence = restore.sequence;
    const saved = origin;
    origin = null; // Consume before focus, including disconnected/stale origins.
    if (disposed || suspended || !saved || saved.generation !== generation
      || restore.originId !== saved.id || snapshot.reader.open) return;
    const element = saved.element;
    if (element.isConnected !== false && root.contains(element) && !element.disabled) {
      element.focus?.();
    }
  }
  function paintState(snapshot) {
    // No native reading node is reconstructed or transformed in this function.
    panel.hidden = !snapshot.reader.open && !snapshot.reader.shell.visible;
    panel.inert = !snapshot.reader.open;
    panel.setAttribute('aria-hidden', String(!snapshot.reader.open));
    panel.setAttribute('aria-busy', String(snapshot.research.status === 'loading'));
    panel.dataset.researchState = snapshot.research.status;
    body.hidden = !snapshot.reader.body.visible;
    shell.hidden = !snapshot.reader.shell.visible;
    shell.style.opacity = String(snapshot.reader.shell.opacity);
    shell.style.transform = `translateX(${snapshot.reader.shell.translateXPx}px)`;
    for (const button of controls('[data-open-reading]')) {
      button.type = 'button';
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-expanded', String(snapshot.reader.open));
      button.disabled = snapshot.disposed || snapshot.research.status !== 'ready';
    }
    for (const button of controls('[data-hybrid-close]')) {
      button.type = 'button';
      button.setAttribute('aria-controls', panel.id);
      button.disabled = !snapshot.reader.open;
    }
    notify(onState, snapshot);
    if (motion.getState().revision === snapshot.revision) consumeFocus(snapshot);
  }
  const motion = createSceneMotionState({ homeView: HOME_VIEW, scheduler,
    reducedMotion: Boolean(media?.matches), onChange: paintState });

  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  }
  function cancelRequest() {
    const old = request;
    request = null;
    if (!old) return;
    win.clearTimeout(old.timer);
    old.controller.abort();
  }
  function eraseContent() {
    body.replaceChildren();
    delete body.dataset.researchId;
    delete body.dataset.snapshotSha256;
    delete panel.dataset.researchId;
    delete panel.dataset.snapshotSha256;
    title.textContent = '未选择研究';
    notify(onClear);
  }
  function invalidate() {
    const version = ++generation;
    origin = null; // research.start/clear also emit restoration; never use it here.
    cancelRequest();
    return version;
  }
  function isCurrent(current) {
    return !disposed && request === current && current.generation === generation;
  }

  async function select(report, { baseURL = win.location?.href } = {}) {
    if (disposed) return false;
    const version = invalidate();
    if (disposed || version !== generation) return false;
    resumeSelection = null;
    selection = null;
    eraseContent();
    if (disposed || version !== generation) return false;
    if (!REPORTS.includes(report)) {
      // Invalid identity clears the controller's previous proof and enters error.
      try { motion.dispatch({ type: 'research.start', id: '', sha256: '' }); } catch { /* Expected rejection. */ }
      if (disposed || version !== generation) return false;
      title.textContent = '研究选择无效';
      status('未选定白名单中的有效研究，不显示替代内容。', 'error');
      return false;
    }
    selection = { report, baseURL };
    const started = motion.dispatch({ type: 'research.start', id: report.slug, sha256: report.sha256 });
    if (disposed || version !== generation) return false;
    title.textContent = `${report.company} · 正在读取并校验`;
    status('正在读取并校验对应公开原稿…');
    if (disposed || version !== generation) return false;
    let current;
    let removeAbortListener = () => {};
    try {
      const sourceUrl = new URL(report.source, baseURL).href;
      const parsed = new URL(sourceUrl);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw Error('PUBLIC_HTTPS_REQUIRED');
      const Abort = win.AbortController ?? globalThis.AbortController;
      const controller = new Abort();
      current = { generation: version, controller, token: started.token, timer: null, timedOut: false };
      request = current;
      const aborted = new Promise((_, reject) => {
        const rejectAbort = () => reject(Error(current.timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_ABORTED'));
        controller.signal.addEventListener('abort', rejectAbort, { once: true });
        removeAbortListener = () => controller.signal.removeEventListener('abort', rejectAbort);
      });
      current.timer = win.setTimeout(() => {
        if (isCurrent(current)) { current.timedOut = true; controller.abort(); }
      }, REQUEST_TIMEOUT_MS);
      const loaded = await Promise.race([
        Promise.resolve().then(() => {
          if (controller.signal.aborted) throw Error('REQUEST_ABORTED');
          return load({ report, archive: false, baseURL, signal: controller.signal });
        }),
        aborted,
      ]);
      if (!isCurrent(current) || controller.signal.aborted) return false;
      if (!loaded || loaded.sha256 !== report.sha256) throw Error('INTEGRITY_MISMATCH');
      const rendered = renderBody({ report, loaded }, doc);
      if (!rendered || typeof rendered.nodeType !== 'number') throw Error('NATIVE_BODY_REQUIRED');
      if (!isCurrent(current) || controller.signal.aborted) return false;
      const resolved = motion.dispatch({ type: 'research.resolve', token: started.token,
        verified: { verified: true, id: report.slug, sha256: loaded.sha256, sourceUrl } });
      if (!resolved.accepted || !isCurrent(current)) return false;
      body.replaceChildren(rendered);
      body.dataset.researchId = report.slug;
      body.dataset.snapshotSha256 = loaded.sha256;
      panel.dataset.researchId = report.slug;
      panel.dataset.snapshotSha256 = loaded.sha256;
      title.textContent = `${report.company} · 原生阅读`;
      notify(onVerified, { report, loaded });
      if (!isCurrent(current)) return false;
      // onVerified may have added compact entry buttons. Wire semantics only.
      paintState(motion.getState());
      if (!isCurrent(current)) return false;
      status(`当前公开原稿校验通过 · SHA-256 ${loaded.sha256}。未重新核验原研究事实。`);
      return isCurrent(current);
    } catch {
      if (disposed || version !== generation) return false;
      origin = null;
      eraseContent();
      if (disposed || version !== generation) return false;
      // renderBody may throw before resolve. Unexpected DOM failures after resolve
      // must revoke ready proof too, not leave stale printed eligibility behind.
      if (motion.getState().research.status === 'loading') {
        motion.dispatch({ type: 'research.fail', token: started.token });
      } else motion.dispatch({ type: 'research.clear' });
      if (disposed || version !== generation) return false;
      title.textContent = `${report.company} · 读取未完成`;
      status(current?.timedOut
        ? '对应原稿读取超时，未显示替代内容。可重新选择此研究重试。'
        : '对应原稿载入或校验失败，未显示替代内容。可重新选择此研究重试。', 'error');
      return false;
    } finally {
      removeAbortListener();
      if (current) win.clearTimeout(current.timer);
      if (request === current) request = null;
    }
  }

  function clear() {
    if (disposed) return false;
    const version = invalidate();
    if (disposed || version !== generation) return false;
    selection = null;
    resumeSelection = null;
    eraseContent();
    if (disposed || version !== generation) return false;
    motion.dispatch({ type: 'research.clear' });
    if (disposed || version !== generation) return false;
    status('未选择研究，不显示替代内容。');
    return true;
  }
  function open(originElement = doc.activeElement) {
    if (disposed || suspended || motion.getState().research.status !== 'ready'
      || motion.getState().reader.open) return false;
    const version = generation;
    if (originElement?.tagName === 'BUTTON' && root.contains(originElement) && !originElement.disabled) {
      if (!originElement.id) originElement.id = `${panel.id}-origin-${++originSequence}`;
      origin = { element: originElement, id: originElement.id, generation };
    } else origin = null;
    const opened = motion.dispatch({ type: 'evidence.open', originId: origin?.id ?? null });
    if (!opened.accepted) { origin = null; return false; }
    if (!disposed && version === generation && motion.getState().reader.open) title.focus?.();
    return !disposed && version === generation && motion.getState().reader.open;
  }
  function close() {
    if (disposed) return false;
    return motion.dispatch({ type: 'evidence.close' }).accepted;
  }
  function sceneChanged(lifecycle = {}) {
    if (disposed) return false;
    const event = { type: 'lifecycle' };
    for (const key of ['contextAvailable', 'assetsReady', 'fallback']) {
      if (key in lifecycle) event[key] = lifecycle[key];
    }
    return motion.dispatch(event).accepted;
  }
  function editable(target) {
    if (target?.isContentEditable || target?.closest?.('input, textarea, select')) return true;
    for (let element = target; element && panel.contains(element); element = element.parentElement) {
      const value = element.getAttribute?.('contenteditable');
      if (value != null) return value.toLowerCase() !== 'false';
    }
    return false;
  }
  function handleClick(event) {
    if (event.defaultPrevented) return;
    const target = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
    const button = target?.closest?.('[data-open-reading], [data-hybrid-close]');
    if (button?.tagName !== 'BUTTON' || !root.contains(button) || button.disabled) return;
    event.preventDefault();
    if (button.hasAttribute('data-hybrid-close')) close();
    else open(button);
  }
  function handleKey(event) {
    const target = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
    if (event.key !== 'Escape' || event.defaultPrevented || event.ctrlKey || event.metaKey
      || event.altKey || event.isComposing || event.keyCode === 229 || !panel.contains(target)
      || editable(target) || !motion.getState().reader.open) return;
    if (motion.dispatch({ type: 'escape' }).accepted) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  function refreshLifecycle() {
    if (!disposed) motion.dispatch({ type: 'lifecycle', visible: !suspended && doc.visibilityState !== 'hidden',
      reducedMotion: Boolean(media?.matches) });
  }
  function pagehide(event) {
    if (!event.persisted) { dispose(); return; }
    suspended = true;
    refreshLifecycle();
    if (request && motion.getState().research.status === 'loading') {
      const pausedSelection = selection;
      const token = request.token;
      resumeSelection = pausedSelection;
      const version = invalidate();
      if (disposed || version !== generation) return;
      motion.dispatch({ type: 'research.fail', token });
      // Observers may synchronously clear/select. Never read mutable selection or
      // overwrite the newer request's title/status after that notification.
      if (disposed || version !== generation) return;
      title.textContent = `${pausedSelection.report.company} · 读取已暂停`;
      status('页面暂时离开，已暂停尚未完成的读取。返回后重新校验。');
    }
  }
  function pageshow() {
    if (disposed) return;
    suspended = false;
    refreshLifecycle();
    const resume = resumeSelection;
    resumeSelection = null;
    if (resume) void select(resume.report, { baseURL: resume.baseURL });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    invalidate();
    selection = null;
    resumeSelection = null;
    listeners.splice(0).forEach(remove => remove());
    eraseContent();
    motion.dispose();
    notify(onDispose);
  }

  listen(root, 'click', handleClick);
  listen(panel, 'keydown', handleKey);
  listen(doc, 'visibilitychange', refreshLifecycle);
  listen(win, 'pagehide', pagehide);
  listen(win, 'pageshow', pageshow);
  if (media?.addEventListener) listen(media, 'change', refreshLifecycle);
  else if (media?.addListener) {
    media.addListener(refreshLifecycle);
    listeners.push(() => media.removeListener(refreshLifecycle));
  }
  eraseContent();
  motion.dispatch({ type: 'lifecycle', contextAvailable: false, assetsReady: false, fallback: true,
    visible: doc.visibilityState !== 'hidden' });
  return Object.freeze({ select, clear, open, close, sceneChanged,
    getState: () => motion.getState(), dispose });
}
