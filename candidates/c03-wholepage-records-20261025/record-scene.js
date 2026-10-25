/**
 * Wholepage paired source records, original evaluated Blender geometry.
 * C02's small WebGL / software depth-buffer approach adapted read-only.
 * Transparent canvas, axial orthographic projection, no external dependencies.
 * This is a research representation, not a model of the company's equipment.
 * Lighting is restrained illustrative shading, not a PBR/transmission solver.
 */
import { RECORD_MODEL } from './assets/record-model.js';
import { INPUT } from './data.js';

export const PRODUCT_IDS = Object.freeze(['dry-gas-seals', 'auxiliary-systems', 'repair']);
export const PERIODS = Object.freeze(['2025H1', '2026H1']);
export const NARROW_BREAKPOINT = 720;
const ORIGINAL_X = [-5.1, -.2, 4.7];
const SOURCE_PERIOD_Y = [1, -.9];
const PERIOD_Y = [1.1, -1.1];
const SHORT_NAMES = ['干气记录', '辅助记录', '修复记录'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const unit = a => { const n = Math.hypot(...a) || 1; return a.map(v => v / n); };
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const triangleNormal = (a, b, c) => unit(cross(sub(b, a), sub(c, a)));
const ROLES = ['backing', 'carrier', 'rim', 'revenue', 'cost', 'leaf'];
const KEY_POSITION = [-2.7, 3.4, 4.6];
const FILL_POSITION = [3.5, -3.3, 3.8];
const EYE = unit([0, -1, 1]);

export const RECORD_MATERIALS = Object.freeze({
  backing: { color: [.75, .733, .674], roughness: .84, specular: .025 },
  carrier: { color: [.26, .34, .286], roughness: .77, specular: .035 },
  rim: { color: [.77, .765, .70], active: [.40, .53, .436], roughness: .71, specular: .075 },
  revenue: { color: [.615, .66, .60], active: [.59, .70, .599], roughness: .83, specular: .035 },
  cost: { color: [.65, .65, .582], active: [.755, .683, .514], roughness: .84, specular: .028 },
  leaf: { color: [.88, .856, .788], active: [.764, .811, .742], roughness: .60, specular: .18 }
});

const rowFor = (product, period) => INPUT.rows.find(r => r.row_id === product && r.period === period);
export function recordBinding(product, period) {
  const r = rowFor(product, period);
  if (!r || !PRODUCT_IDS.includes(product) || !PERIODS.includes(period)) return null;
  return { product, period, sourceId: r.source_id, physicalPage: r.physical_page, label: r.label, revenue: r.revenue, cost: r.cost };
}

/** Finite selection animation, no clocks/RAF hidden inside the state model. */
export class RecordMotion {
  constructor({ reduced = false } = {}) {
    this.state = { product: 'repair', paused: false, mode: 'spatial', visible: true, reduced };
    this.values = [0, 0, 1];
    this.transition = null;
  }
  sample(now) {
    if (this.transition) {
      const t = clamp((now - this.transition.start) / this.transition.duration, 0, 1);
      const e = t * t * (3 - 2 * t);
      this.values = this.transition.from.map((v, i) => v + (this.transition.to[i] - v) * e);
      if (t >= 1) this.transition = null;
    }
    return [...this.values];
  }
  update(next = {}, now = 0) {
    this.sample(now);
    const previous = { ...this.state };
    if (Object.hasOwn(next, 'product')) this.state.product = PRODUCT_IDS.includes(next.product) ? next.product : null;
    for (const key of ['paused', 'visible', 'reduced']) if (typeof next[key] === 'boolean') this.state[key] = next[key];
    if (next.mode === 'spatial' || next.mode === 'flat') this.state.mode = next.mode;
    const target = PRODUCT_IDS.map(p => +(p === this.state.product));
    const allow = !this.state.paused && !this.state.reduced && this.state.visible && this.state.mode === 'spatial';
    if (!allow) { this.values = target; this.transition = null; }
    else if (previous.product !== this.state.product) this.transition = { from: [...this.values], to: target, start: now, duration: 420 };
    return Object.keys(this.state).some(k => previous[k] !== this.state[k]);
  }
}

/** Camera uses the source's axial x orientation. x never depends on period/z.
 * Fit depends on the live element's size, not the reference image's coordinates.
 */
export function recordCamera(width, height, product = 'repair') {
  const mobile = width < NARROW_BREAKPOINT;
  const xMin = mobile ? -2.05 : -7.05, xMax = mobile ? 1.7 : 6.7;
  const vMin = -1.28, vMax = 1.93;
  const scale = Math.max(.01, Math.min((width - 12) / (xMax - xMin), (height - 16) / (vMax - vMin)));
  return { width, height, mobile, product, scale, centerX: (xMin + xMax) / 2, centerV: (vMin + vMax) / 2, sin: Math.SQRT1_2, cos: Math.SQRT1_2 };
}
export function projectRecordPoint(world, camera) {
  return { x: camera.width / 2 + (world[0] - camera.centerX) * camera.scale,
    y: camera.height / 2 - (world[1] * camera.sin + world[2] * camera.cos - camera.centerV) * camera.scale,
    depth: 10 - (-world[1] * camera.cos + world[2] * camera.sin) };
}
export function transformRecordVertex(v, part, camera, openings) {
  const i = PRODUCT_IDS.indexOf(part.product);
  const period = PERIODS.indexOf(part.period);
  return [v[0] - (camera.mobile ? ORIGINAL_X[i] : 0), v[1] + PERIOD_Y[period] - SOURCE_PERIOD_Y[period], v[2] + (part.role === 'leaf' ? .6 * openings[i] : 0)];
}
export function projectionColumns(camera) {
  return Object.fromEntries(PRODUCT_IDS.map((id, i) => [id, projectRecordPoint([camera.mobile ? 0 : ORIGINAL_X[i], 0, 0], camera).x / camera.width]));
}
export function shadeRecordSurface(role, normal, position, chosen, local = position) {
  const m = RECORD_MATERIALS[role], base = chosen && m.active ? m.active : m.color;
  const n = unit(normal), light = unit(sub(KEY_POSITION, local)), fill = unit(sub(FILL_POSITION, local));
  const diffuse = Math.max(0, dot(n, light)), half = unit(add(light, EYE));
  const illumination = .50 + .10 * (n[2] * .5 + .5) + .37 * diffuse + .12 * Math.max(0, dot(n, fill));
  const highlight = m.specular * Math.pow(Math.max(0, dot(n, half)), 8 + (1 - m.roughness) ** 3 * 150) * diffuse;
  // Very broad deterministic tonal variation, not grain, not an image texture.
  const paperTone = role === 'leaf' || role === 'backing' ? 1 + .009 * local[1] / .6 - .006 * local[0] / 1.08 : 1;
  return base.map((v, i) => clamp(v * illumination * paperTone + highlight * [.96, .94, .83][i], 0, 1));
}

/** All visibility, hit testing and offline QA consume these actual mesh points. */
export function projectedRecordTriangles({ width, height, product = 'repair', openings = PRODUCT_IDS.map(p => +(p === product)), includeColors = true } = {}) {
  const camera = recordCamera(width, height, product), triangles = [];
  for (const part of RECORD_MODEL.parts) {
    if (camera.mobile && part.product !== product) continue;
    const world = part.vertices.map(v => transformRecordVertex(v, part, camera, openings));
    const screen = world.map(v => projectRecordPoint(v, camera));
    const colors = includeColors ? world.map((p, i) => shadeRecordSurface(part.role, part.normals[i], p, part.product === product, [p[0] - (camera.mobile ? 0 : ORIGINAL_X[PRODUCT_IDS.indexOf(part.product)]), p[1] - PERIOD_Y[PERIODS.indexOf(part.period)], p[2]])) : null;
    for (const indices of part.triangles) {
      const vertices = indices.map(i => world[i]);
      if (dot(triangleNormal(...vertices), EYE) <= 1e-8) continue;
      triangles.push({ p: indices.map(i => screen[i]), color: colors && indices.map(i => colors[i]), product: part.product, period: part.period, role: part.role, part: part.name });
    }
  }
  return { triangles, camera };
}
function barycentric(p, a, b, c) {
  const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(d) < 1e-9) return null;
  const wa = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / d;
  const wb = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / d;
  const wc = 1 - wa - wb;
  return wa < -1e-6 || wb < -1e-6 || wc < -1e-6 ? null : [wa, wb, wc];
}
export function pickRecord(triangles, point) {
  let hit = null, nearest = Infinity;
  for (const t of triangles) {
    const weights = barycentric(point, ...t.p);
    if (!weights) continue;
    const depth = weights.reduce((s, w, i) => s + w * t.p[i].depth, 0);
    if (depth < nearest) { nearest = depth; hit = { product: t.product, period: t.period, role: t.role, depth }; }
  }
  return hit;
}

/** CPU fallback uses a real per-pixel depth buffer, not painter-sorted panels. */
export function rasterizeRecords(triangles, width, height, dpr = 1, initialPixels = null) {
  const rw = Math.max(1, Math.round(width * dpr)), rh = Math.max(1, Math.round(height * dpr));
  const pixels = initialPixels || new Uint8ClampedArray(rw * rh * 4);
  const depths = new Float32Array(rw * rh); depths.fill(Infinity);
  for (const t of triangles) {
    const [a, b, c] = t.p.map(p => ({ x: p.x * dpr, y: p.y * dpr, depth: p.depth }));
    const den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(den) < 1e-8) continue;
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), maxX = Math.min(rw - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), maxY = Math.min(rh - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
    const dax = (b.y - c.y) / den, day = (c.x - b.x) / den, dbx = (c.y - a.y) / den, dby = (a.x - c.x) / den;
    const colors = t.color || [[.7, .75, .68], [.7, .75, .68], [.7, .75, .68]];
    for (let y = minY; y <= maxY; y++) {
      let wa = dax * (minX + .5 - c.x) + day * (y + .5 - c.y), wb = dbx * (minX + .5 - c.x) + dby * (y + .5 - c.y);
      for (let x = minX; x <= maxX; x++, wa += dax, wb += dbx) {
        const wc = 1 - wa - wb;
        if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) continue;
        const depth = wa * a.depth + wb * b.depth + wc * c.depth, index = y * rw + x;
        if (depth > depths[index] + 1e-6) continue;
        depths[index] = depth;
        for (let k = 0; k < 3; k++) pixels[index * 4 + k] = Math.round(255 * (wa * colors[0][k] + wb * colors[1][k] + wc * colors[2][k]));
        pixels[index * 4 + 3] = 255;
      }
    }
  }
  return { pixels, width: rw, height: rh, depths };
}

/** Soft contact shadows are part of both runtime paths and the offline raster.
 * Analytic research-sheet contact shading, not ray-traced cast shadows or PBR.
 */
export function fillRecordContactShadows(pixels, camera, dpr = 1) {
  const rw = Math.round(camera.width * dpr), rh = Math.round(camera.height * dpr);
  const color = [45, 57, 43];
  for (const [i, product] of PRODUCT_IDS.entries()) {
    if (camera.mobile && product !== camera.product) continue;
    for (const y of PERIOD_Y) {
      const q = projectRecordPoint([camera.mobile ? 0 : ORIGINAL_X[i], y, .035], camera);
      const cx = q.x * dpr, cy = (q.y + .04 * camera.scale) * dpr;
      const rx = 1.27 * camera.scale * dpr, ry = .51 * camera.scale * dpr;
      const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(rw - 1, Math.ceil(cx + rx));
      const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(rh - 1, Math.ceil(cy + ry));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const r2 = ((px + .5 - cx) / rx) ** 2 + ((py + .5 - cy) / ry) ** 2;
        if (r2 >= 1) continue;
        const alpha = .18 * (1 - r2) ** 2, off = (py * rw + px) * 4;
        const prior = pixels[off + 3] / 255, combined = alpha + prior * (1 - alpha);
        for (let c = 0; c < 3; c++) pixels[off + c] = (color[c] * alpha + pixels[off + c] * prior * (1 - alpha)) / combined;
        pixels[off + 3] = Math.round(combined * 255);
      }
    }
  }
  return pixels;
}
export function renderRecordPixels({ width, height, product = 'repair', openings, dpr = 2 } = {}) {
  const frame = projectedRecordTriangles({ width, height, product, openings });
  const pixels = new Uint8ClampedArray(Math.round(width * dpr) * Math.round(height * dpr) * 4);
  fillRecordContactShadows(pixels, frame.camera, dpr);
  return { ...rasterizeRecords(frame.triangles, width, height, dpr, pixels), camera: frame.camera, triangles: frame.triangles };
}

const SHADING = `
vec3 shadeRecord(vec3 base,vec3 normal,vec3 local,float roughness,float specular,float role){
 vec3 n=normalize(normal),light=normalize(vec3(-2.7,3.4,4.6)-local),fill=normalize(vec3(3.5,-3.3,3.8)-local);
 float diff=max(0.0,dot(n,light));
 float illum=.50+.10*(n.z*.5+.5)+.37*diff+.12*max(0.0,dot(n,fill));
 float spec=specular*pow(max(0.0,dot(n,normalize(light+normalize(vec3(0.,-1.,1.))))),8.+pow(1.-roughness,3.)*150.)*diff;
 float tone=(role<.5||role>4.5)?1.+.009*local.y/.6-.006*local.x/1.08:1.;
 return clamp(base*illum*tone+spec*vec3(.96,.94,.83),0.,1.);
}`;
function makeGLRenderer(doc, onLoss) {
  const surface = doc.createElement('canvas');
  let gl;
  try { gl = surface.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }); } catch { return null; }
  if (!gl) return null;
  const materialBranches = ROLES.map((role, i) => {
    const m = RECORD_MATERIALS[role];
    return `${i ? 'else ' : ''}if(aRole<${i + .5}){base=mix(vec3(${m.color.join(',')}),vec3(${(m.active || m.color).join(',')}),chosen);rough=${m.roughness};spec=${m.specular};}`;
  }).join('\n');
  const vs = `attribute vec3 aPosition,aNormal;attribute float aOwner,aRole,aPeriod;
 uniform float uWidth,uHeight,uScale,uCenterX,uCenterV,uSelected,uMobile;uniform vec3 uOpen;
 varying vec3 vColor;${SHADING}
 void main(){
  float chosen=1.-step(.1,abs(aOwner-uSelected));
  vec3 p=aPosition;float opening=0.;float originalX=0.;
  if(aOwner<.5){opening=uOpen.x;originalX=-5.1;}else if(aOwner<1.5){opening=uOpen.y;originalX=-.2;}else{opening=uOpen.z;originalX=4.7;}
  p.x-=uMobile*originalX;p.y+=aPeriod<.5?.1:-.2;if(aRole>4.5)p.z+=.6*opening;
  vec3 q=vec3(p.x-uCenterX,(p.y+p.z)*.70710678118-uCenterV,(-p.y+p.z)*.70710678118);
  gl_Position=vec4(q.x*uScale*2./uWidth,q.y*uScale*2./uHeight,-q.z/10.,1.);
  if(uMobile>.5&&chosen<.5)gl_Position=vec4(3.,3.,3.,1.);
  vec3 base=vec3(.7);float rough=.8,spec=.03;${materialBranches}
  vec3 local=vec3(p.x-(uMobile>.5?0.:originalX),p.y-(aPeriod<.5?1.1:-1.1),p.z);
  vColor=shadeRecord(base,aNormal,local,rough,spec,aRole);
 }`;
  const fs = 'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.);}';
  let program, buffer;
  const shaders = [];
  const compile = (type, src) => { const s = gl.createShader(type); shaders.push(s); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error('Record shader compile failed'); return s; };
  try {
    program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Record shader link failed');
    const values = [];
    for (const p of RECORD_MODEL.parts) for (const tri of p.triangles) for (const i of tri) values.push(...p.vertices[i], ...p.normals[i], PRODUCT_IDS.indexOf(p.product), ROLES.indexOf(p.role), PERIODS.indexOf(p.period));
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
    gl.useProgram(program);
    for (const [name, count, offset] of [['aPosition', 3, 0], ['aNormal', 3, 3], ['aOwner', 1, 6], ['aRole', 1, 7], ['aPeriod', 1, 8]]) {
      const loc = gl.getAttribLocation(program, name); if (loc < 0) continue; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, count, gl.FLOAT, false, 36, offset * 4);
    }
    const uniforms = Object.fromEntries(['Width', 'Height', 'Scale', 'CenterX', 'CenterV', 'Selected', 'Mobile', 'Open'].map(k => [k, gl.getUniformLocation(program, `u${k}`)]));
    let lost = false;
    const lose = e => { e.preventDefault(); lost = true; onLoss(); }; surface.addEventListener('webglcontextlost', lose);
    return {
      draw(ctx, camera, dpr, openings) {
        if (lost || gl.isContextLost()) return false;
        const w = Math.round(camera.width * dpr), h = Math.round(camera.height * dpr);
        if (surface.width !== w || surface.height !== h) { surface.width = w; surface.height = h; }
        gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND); gl.useProgram(program);
        const v = { Width: camera.width, Height: camera.height, Scale: camera.scale, CenterX: camera.centerX, CenterV: camera.centerV, Selected: PRODUCT_IDS.indexOf(camera.product), Mobile: +camera.mobile };
        for (const [k, val] of Object.entries(v)) gl.uniform1f(uniforms[k], val);
        gl.uniform3fv(uniforms.Open, new Float32Array(openings)); gl.drawArrays(gl.TRIANGLES, 0, values.length / 9);
        ctx.drawImage(surface, 0, 0, camera.width, camera.height); return true;
      },
      destroy() { surface.removeEventListener('webglcontextlost', lose); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); surface.width = surface.height = 1; },
      info() { return { api: 'WebGL 1', hardwareAccelerationVerified: false }; }
    };
  } catch {
    if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); return null;
  }
}

export function createRecordScene({ canvas, labels, onSelect = () => {}, onStatus = () => {}, onProjection = () => {} } = {}) {
  if (!canvas || !labels) throw new TypeError('createRecordScene requires a canvas and an HTML labels container.');
  const doc = canvas.ownerDocument, win = doc.defaultView || globalThis;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    onStatus('绘图不可用 · 请使用同产品原数和平面视图');
    return { setState() {}, resize() {}, destroy() {}, stats: () => ({ renderer: 'unavailable', browserVerified: false }) };
  }
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motion = new RecordMotion({ reduced: media?.matches || false });
  let width = 0, height = 0, dpr = 1, frame = 0, destroyed = false, drawCount = 0, drawMs = 0, projected = null, pointer = null;
  let glRenderer = null, software = true, lastProjection = '', camera = recordCamera(1, 270);
  const nodes = [], sourceButtons = [], inputLabels = [], periodLabels = [];
  const original = { role: canvas.getAttribute('role'), aria: canvas.getAttribute('aria-label'), labelPosition: labels.style.position, labelPointer: labels.style.pointerEvents };
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '两期披露记录。产品横向对应下方精确比较，选中同一产品展开两期收入与成本来源。可用旁侧 HTML 按钮操作。');
  labels.style.position = 'absolute'; labels.style.pointerEvents = 'none';
  function addLabel(tag, className) {
    const n = doc.createElement(tag); n.className = className;
    Object.assign(n.style, { position: 'absolute', transform: 'translate(-50%, -50%)', margin: '0', whiteSpace: 'nowrap' });
    if (tag === 'button') { n.type = 'button'; n.style.pointerEvents = 'auto'; }
    labels.append(n); nodes.push(n); return n;
  }
  for (const product of PRODUCT_IDS) for (const period of PERIODS) {
    const binding = recordBinding(product, period), n = addLabel('button', 'record-source-label');
    n.id = `record-source-${product}-${period}`; n.dataset.product = product; n.dataset.period = period;
    n.setAttribute('aria-label', `${binding.label}，${period}，来源 ${binding.sourceId}，物理页 ${binding.physicalPage}`);
    n.addEventListener('click', () => { if (!destroyed) onSelect(product, period); });
    sourceButtons.push({ n, product, period, binding });
    for (const metric of ['revenue', 'cost']) { const input = addLabel('span', 'record-input-label'); input.textContent = metric === 'revenue' ? '收入' : '成本'; input.setAttribute('aria-hidden', 'true'); inputLabels.push({ n: input, product, period, metric }); }
  }
  for (const period of PERIODS) { const n = addLabel('span', 'record-period-label'); n.textContent = period; periodLabels.push({ n, period }); }
  const now = () => win.performance?.now() ?? Date.now();
  function status() {
    onStatus(motion.state.mode === 'flat' ? '平面模式 · 同产品、同两期来源' : software ? '软件网格回退 · 非 GPU 渲染' : 'WebGL 网格渲染 · 硬件加速未验证');
  }
  function requestDraw() { if (!destroyed && width > 0 && height > 0 && !frame && motion.state.visible && motion.state.mode === 'spatial') frame = win.requestAnimationFrame(render); }
  function cancelFrame() { if (frame) win.cancelAnimationFrame(frame); frame = 0; }
  glRenderer = makeGLRenderer(doc, () => { software = true; status(); requestDraw(); });
  software = !glRenderer;
  function sourceAnchor(product, period, z, dy = 0, dx = 0) {
    const i = PRODUCT_IDS.indexOf(product), j = PERIODS.indexOf(period);
    return [camera.mobile ? dx : ORIGINAL_X[i] + dx, PERIOD_Y[j] + dy, z];
  }
  function place(n, p) { const q = projectRecordPoint(p, camera); n.style.left = `${q.x.toFixed(3)}px`; n.style.top = `${q.y.toFixed(3)}px`; }
  function updateLabels(openings) {
    const shown = width > 0 && height > 0 && motion.state.visible && motion.state.mode === 'spatial';
    for (const item of sourceButtons) {
      const i = PRODUCT_IDS.indexOf(item.product), active = item.product === motion.state.product;
      item.n.hidden = !shown || (camera.mobile && !active); item.n.disabled = item.n.hidden;
      item.n.textContent = active ? `${item.binding.sourceId} · ${SHORT_NAMES[i]} ↗` : SHORT_NAMES[i];
      item.n.setAttribute('aria-pressed', String(active)); item.n.classList.toggle('is-selected', active);
      place(item.n, sourceAnchor(item.product, item.period, .255 + .6 * openings[i], .06));
    }
    for (const item of inputLabels) {
      const i = PRODUCT_IDS.indexOf(item.product);
      item.n.hidden = !shown || item.product !== motion.state.product || openings[i] < .62;
      place(item.n, sourceAnchor(item.product, item.period, .211, -.11, item.metric === 'revenue' ? -.47 : .47));
    }
    for (const item of periodLabels) {
      item.n.hidden = !shown;
      const j = PERIODS.indexOf(item.period);
      item.n.textContent = !camera.mobile && width < 900 ? item.period.replace('H', '\nH') : item.period;
      item.n.style.whiteSpace = 'pre';
      place(item.n, [camera.mobile ? -1.65 : -6.85, PERIOD_Y[j], .34]);
    }
  }
  function publishProjection() {
    if (!(width > 0 && height > 0)) return;
    const payload = { columns: projectionColumns(camera), mobile: camera.mobile };
    const signature = JSON.stringify(payload);
    if (signature !== lastProjection) { lastProjection = signature; onProjection(payload); }
  }
  function render(timestamp) {
    frame = 0;
    if (destroyed || !motion.state.visible || motion.state.mode !== 'spatial') return;
    const begin = now(), openings = motion.sample(timestamp);
    const desiredDpr = software ? (motion.transition ? 1 : 2) : Math.min(2, Math.max(1, win.devicePixelRatio || 1));
    if (dpr !== desiredDpr) { dpr = desiredDpr; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    camera = recordCamera(width, height, motion.state.product); projected = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
    fillRecordContactShadows(initial.data, camera, dpr); ctx.putImageData(initial, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let usedGL = false;
    if (glRenderer && !software) { try { usedGL = glRenderer.draw(ctx, camera, dpr, openings); } catch { usedGL = false; } }
    if (!usedGL) {
      if (!software) { software = true; status(); }
      projected = projectedRecordTriangles({ width, height, product: motion.state.product, openings });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      rasterizeRecords(projected.triangles, width, height, dpr, initial.data); ctx.putImageData(initial, 0, 0);
    }
    updateLabels(openings); publishProjection(); drawCount++; drawMs = now() - begin;
    if (motion.transition) requestDraw();
  }
  function resize() {
    if (destroyed) return;
    let r = canvas.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) r = canvas.parentElement?.getBoundingClientRect?.() || r;
    if (!(r.width > 0 && r.height > 0)) return;
    const nextDpr = software ? (motion.transition ? 1 : 2) : Math.min(2, Math.max(1, win.devicePixelRatio || 1));
    if (width === r.width && height === r.height && dpr === nextDpr) return;
    width = r.width; height = r.height; dpr = nextDpr; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    camera = recordCamera(width, height, motion.state.product); projected = null; updateLabels(motion.sample(now())); publishProjection(); requestDraw();
  }
  function pointerDown(e) { if (e.button !== 0) return; pointer = { id: e.pointerId, x: e.clientX, y: e.clientY }; }
  function pointerUp(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    const start = pointer; pointer = null;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 7 || !motion.state.visible || motion.state.mode !== 'spatial') return;
    const r = canvas.getBoundingClientRect();
    if (!projected) projected = projectedRecordTriangles({ width, height, product: motion.state.product, openings: motion.values, includeColors: false });
    const hit = pickRecord(projected.triangles, { x: e.clientX - r.left, y: e.clientY - r.top });
    if (hit) onSelect(hit.product, hit.period);
  }
  const cancelPointer = () => { pointer = null; };
  const listeners = [['pointerdown', pointerDown], ['pointerup', pointerUp], ['pointercancel', cancelPointer]];
  listeners.forEach(([type, fn]) => canvas.addEventListener(type, fn));
  const mediaChange = e => { motion.update({ reduced: !!e.matches }, now()); cancelFrame(); requestDraw(); };
  media?.addEventListener?.('change', mediaChange);
  const RO = win.ResizeObserver || globalThis.ResizeObserver, observer = RO ? new RO(resize) : null;
  observer?.observe(canvas); if (!observer) win.addEventListener?.('resize', resize);
  resize(); status();
  return {
    setState(next = {}) {
      if (destroyed) return;
      const changed = motion.update(next, now()); if (!changed) return;
      projected = null; if (width > 0 && height > 0) camera = recordCamera(width, height, motion.state.product); cancelFrame();
      updateLabels(motion.values); publishProjection(); status();
      if (motion.state.visible && motion.state.mode === 'spatial') requestDraw();
      else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    },
    resize,
    destroy() {
      if (destroyed) return; destroyed = true; cancelFrame(); observer?.disconnect(); win.removeEventListener?.('resize', resize); media?.removeEventListener?.('change', mediaChange);
      listeners.forEach(([type, fn]) => canvas.removeEventListener(type, fn)); glRenderer?.destroy(); nodes.forEach(n => n.remove());
      labels.style.position = original.labelPosition; labels.style.pointerEvents = original.labelPointer;
      for (const [key, val] of [['role', original.role], ['aria-label', original.aria]]) if (val === null) canvas.removeAttribute(key); else canvas.setAttribute(key, val);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); projected = null;
    },
    stats() {
      return { version: RECORD_MODEL.version, renderer: software ? 'software-depth-buffer' : 'webgl', backend: software ? { api: 'Canvas2D / CPU triangle depth buffer', hardwareAccelerationVerified: false } : glRenderer.info(),
        viewport: { width, height, dpr }, ...motion.state, mappedProduct: PRODUCT_IDS.includes(motion.state.product), openings: [...motion.values], transitionActive: !!motion.transition, scheduledFrame: !!frame,
        drawCount, lastDrawMs: Number(drawMs.toFixed(2)), geometry: { parts: RECORD_MODEL.parts.length, triangles: RECORD_MODEL.parts.reduce((n, p) => n + p.triangles.length, 0), records: camera.mobile ? (PRODUCT_IDS.includes(motion.state.product) ? 2 : 0) : 6 },
        projection: 'axial orthographic; exact shared product x', transparentBackground: true, automaticMotion: false, textures: 0, externalRuntimeDependencies: 0, browserVerified: false,
        shading: 'warm paper / sage laminate / restrained satin edges; illustrative, not PBR', provenance: RECORD_MODEL.provenance };
    }
  };
}
