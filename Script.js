/* =====================================================
   วิธีเพิ่มฟังก์ชันใหม่ (ต่อยอดง่าย)
   1) เอฟเฟกต์ปรับค่า: เพิ่มออบเจกต์ใน EFFECTS
      → แถบเลื่อนจะถูกสร้างอัตโนมัติ
   2) การแปลงภาพ (หมุน/พลิก/ครอป): เพิ่มใน TRANSFORMS
   3) ตัวเลือกขนาดอัตโนมัติ: เพิ่มใน SCALE_PRESETS
   4) สกิล/ปลั๊กอินของ AI: เพิ่มใน SKILLS / PLUGINS (ท้ายไฟล์)
   ===================================================== */

const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

// เอฟเฟกต์: apply(data, value, width, height) แก้ไข data (RGBA) โดยตรง
const EFFECTS = [
  { id:'brightness', group:'light', label:'ความสว่าง', min:-100, max:100, def:0,
    apply(d, v){ const a = v * 2.55;
      for (let i=0;i<d.length;i+=4){ d[i]=clamp(d[i]+a); d[i+1]=clamp(d[i+1]+a); d[i+2]=clamp(d[i+2]+a); } } },
  { id:'contrast', group:'light', label:'คอนทราสต์', min:-100, max:100, def:0,
    apply(d, v){ const c = v * 2.55, f = (259*(c+255))/(255*(259-c));
      for (let i=0;i<d.length;i+=4){ d[i]=clamp(f*(d[i]-128)+128); d[i+1]=clamp(f*(d[i+1]-128)+128); d[i+2]=clamp(f*(d[i+2]-128)+128); } } },
  { id:'saturation', group:'color', label:'ความสด', min:-100, max:100, def:0,
    apply(d, v){ const s = 1 + v/100;
      for (let i=0;i<d.length;i+=4){ const g = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]=clamp(g+(d[i]-g)*s); d[i+1]=clamp(g+(d[i+1]-g)*s); d[i+2]=clamp(g+(d[i+2]-g)*s); } } },
  { id:'warmth', group:'color', label:'อุณหภูมิสี', min:-100, max:100, def:0,
    apply(d, v){ const a = v * 0.5;
      for (let i=0;i<d.length;i+=4){ d[i]=clamp(d[i]+a); d[i+2]=clamp(d[i+2]-a); } } },
  { id:'grayscale', group:'color', label:'ขาว-ดำ', min:0, max:100, def:0,
    apply(d, v){ const t = v/100;
      for (let i=0;i<d.length;i+=4){ const g = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i]+= (g-d[i])*t; d[i+1]+= (g-d[i+1])*t; d[i+2]+= (g-d[i+2])*t; } } },
  { id:'sepia', group:'color', label:'ซีเปีย', min:0, max:100, def:0,
    apply(d, v){ const t = v/100;
      for (let i=0;i<d.length;i+=4){ const r=d[i],g=d[i+1],b=d[i+2];
        d[i]  = clamp(r+((0.393*r+0.769*g+0.189*b)-r)*t);
        d[i+1]= clamp(g+((0.349*r+0.686*g+0.168*b)-g)*t);
        d[i+2]= clamp(b+((0.272*r+0.534*g+0.131*b)-b)*t); } } },
  // ความคมชัด (Unsharp Mask): + = คมขึ้น, − = นุ่มลง/เบลอเบาๆ ไล่ระดับได้ −100..100
  { id:'sharpness', group:'detail', label:'ความคมชัด', min:-100, max:100, def:0,
    apply(d, v, w, h){
      const r = Math.max(1, Math.round(Math.max(w, h) / 900));   // รัศมีสัมพันธ์กับขนาดภาพ ตัวอย่างกับไฟล์จริงจึงดูเหมือนกัน
      const a = v > 0 ? v / 100 * 2.5 : v / 100;
      const tmp = new Uint8ClampedArray(d.length), blur = new Uint8ClampedArray(d.length);
      boxBlurH(d, tmp, w, h, r); boxBlurV(tmp, blur, w, h, r);
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = clamp(d[i]   + a * (d[i]   - blur[i]));
        d[i+1] = clamp(d[i+1] + a * (d[i+1] - blur[i+1]));
        d[i+2] = clamp(d[i+2] + a * (d[i+2] - blur[i+2]));
      } } },
];

// เบลอแบบกล่อง (ใช้ผลรวมเลื่อน เร็ว) แนวนอน / แนวตั้ง — ใช้กับ RGB ไม่แตะ alpha
function boxBlurH(src, dst, w, h, r){
  const div = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += src[row + (i < 0 ? 0 : i >= w ? w - 1 : i) * 4 + c];
      for (let x = 0; x < w; x++) {
        dst[row + x * 4 + c] = sum / div;
        const xo = x - r, xi = x + r + 1;
        sum += src[row + (xi >= w ? w - 1 : xi) * 4 + c] - src[row + (xo < 0 ? 0 : xo) * 4 + c];
      }
    }
  }
}
function boxBlurV(src, dst, w, h, r){
  const div = 2 * r + 1, st = w * 4;
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      const col = x * 4 + c;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += src[(i < 0 ? 0 : i >= h ? h - 1 : i) * st + col];
      for (let y = 0; y < h; y++) {
        dst[y * st + col] = sum / div;
        const yo = y - r, yi = y + r + 1;
        sum += src[(yi >= h ? h - 1 : yi) * st + col] - src[(yo < 0 ? 0 : yo) * st + col];
      }
    }
  }
}

// การแปลงรูปทรง: อัปเดต state แล้วระบบจะสร้างภาพฐานใหม่
const TRANSFORMS = [
  { id:'rotL', label:'⟲ หมุนซ้าย',  run:s => { s.rotation = (s.rotation+3)%4; } },
  { id:'rotR', label:'⟳ หมุนขวา',   run:s => { s.rotation = (s.rotation+1)%4; } },
  { id:'flipH', label:'⇋ พลิกแนวนอน', run:s => { s.flipH = !s.flipH; } },
  { id:'flipV', label:'⇅ พลิกแนวตั้ง', run:s => { s.flipV = !s.flipV; } },
];

/* ---------- สถานะ ---------- */
const PREVIEW_MAX = 1600;  // ด้านยาวสูงสุดของภาพตัวอย่าง (ตอนดาวน์โหลดใช้ขนาดจริง)
const EXPORT_MAX = 8000;   // ด้านยาวสูงสุดของผลลัพธ์ ป้องกันเบราว์เซอร์ค้าง

// ขนาดอัตโนมัติ: factor(w, h) คืนอัตราส่วนที่จะคูณกับขนาดภาพปัจจุบัน
const fit = n => (w, h) => n / Math.max(w, h);
const SCALE_PRESETS = [
  { id:'orig',    label:'ขนาดต้นฉบับ (100%)',          factor:() => 1 },
  { id:'half',    label:'50%',                         factor:() => 0.5 },
  { id:'quarter', label:'25%',                         factor:() => 0.25 },
  { id:'double',  label:'200%',                        factor:() => 2 },
  { id:'fit3840', label:'พอดี 3840 px (4K)',           factor:fit(3840) },
  { id:'fit1920', label:'พอดี 1920 px (Full HD)',      factor:fit(1920) },
  { id:'fit1080', label:'พอดี 1080 px (โซเชียล)',      factor:fit(1080) },
  { id:'fit720',  label:'พอดี 720 px',                 factor:fit(720) },
];

// หน่วยความยาว: perInch = จำนวนหน่วยต่อ 1 นิ้ว (px ไม่ต้องแปลง)
const UNITS = {
  px: { label:'px' },
  cm: { label:'cm', perInch:2.54 },
  mm: { label:'mm', perInch:25.4 },
  in: { label:'นิ้ว', perInch:1 },
};

const state = { img:null, rotation:0, flipH:false, flipV:false, values:{}, showOriginal:false,
  colorMode:'rgb', format:'png', quality:92, scaleMode:'auto', preset:'orig', manual:{ w:0, h:0, wCm:0, hCm:0, lock:false, unit:'px', dpi:300 } };
let baseCanvas = null;
let previewMax = PREVIEW_MAX;
const view = { z:1, x:0, y:0, dw:0, dh:0, bw:0, bh:0 };   // ซูม, ตำแหน่งเลื่อน, ขนาดภาพที่แสดง, ขนาดกรอบ

const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d', { willReadFrequently:true });

function resetState(){
  state.rotation = 0; state.flipH = false; state.flipV = false;
  state.scaleMode = 'auto'; state.preset = 'orig'; state.manual.lock = false;
  state.manual.unit = 'px'; state.manual.dpi = 300;
  EFFECTS.forEach(e => state.values[e.id] = e.def);
}

/* ---------- สร้าง UI จากรายการ ---------- */
const sliderEls = {};
// หมวดของแถบเลื่อน (กำหนด group ใน EFFECTS ให้ตรงกับ id ด้านล่าง)
const EFFECT_GROUPS = [{ id:'light', label:'แสง' }, { id:'color', label:'สี' }, { id:'detail', label:'รายละเอียด' }];
const groupEls = {};
EFFECT_GROUPS.forEach(g => {
  const box = document.createElement('div'); box.className = 'group';
  box.innerHTML = '<h3>' + g.label + '</h3>';
  $('sliders').appendChild(box); groupEls[g.id] = box;
});
EFFECTS.forEach(e => {
  const wrap = document.createElement('div'); wrap.className = 'slider';
  wrap.innerHTML = `<label for="s-${e.id}"><span>${e.label}</span><output>${e.def}</output></label>
    <div class="stepper"><button type="button" class="step" data-d="-1" aria-label="ลด ${e.label}">−</button><input type="range" id="s-${e.id}" min="${e.min}" max="${e.max}" value="${e.def}"><button type="button" class="step" data-d="1" aria-label="เพิ่ม ${e.label}">+</button></div>`;
  const input = wrap.querySelector('input'), out = wrap.querySelector('output');
  input.addEventListener('input', () => { state.values[e.id] = +input.value; out.textContent = input.value; schedule(); });
  input.addEventListener('dblclick', () => { input.value = e.def; input.dispatchEvent(new Event('input')); });
  // ปุ่ม + / − : กด 1 ครั้ง = 1 หน่วย, กดค้างเพื่อเพิ่ม/ลดต่อเนื่อง
  const nudge = d => {
    input.value = Math.min(+input.max, Math.max(+input.min, +input.value + d));
    input.dispatchEvent(new Event('input'));
  };
  wrap.querySelectorAll('.step').forEach(btn => {
    const d = +btn.dataset.d; let t, iv;
    const stop = () => { clearTimeout(t); clearInterval(iv); };
    btn.addEventListener('pointerdown', ev => { ev.preventDefault(); nudge(d); t = setTimeout(() => { iv = setInterval(() => nudge(d), 60); }, 350); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => btn.addEventListener(n, stop));
    btn.addEventListener('click', ev => { if (ev.detail === 0) nudge(d); });   // คีย์บอร์ด
  });
  sliderEls[e.id] = { input, out };
  (groupEls[e.group] || $('sliders')).appendChild(wrap);
});
TRANSFORMS.forEach(t => {
  const b = document.createElement('button'); b.textContent = t.label; b.disabled = true; b.dataset.needsImage = '1';
  b.addEventListener('click', () => {
    const before = state.rotation % 2;
    t.run(state);
    // หมุน 90° แล้วกว้าง/สูงสลับกัน
    if (state.rotation % 2 !== before) { const m = state.manual; [m.w, m.h] = [m.h, m.w]; [m.wCm, m.hCm] = [m.hCm, m.wCm]; }
    buildBase(); schedule(); syncScaleUI();
  });
  $('transforms').appendChild(b);
});

function syncSliders(){
  EFFECTS.forEach(e => { const s = sliderEls[e.id]; s.input.value = state.values[e.id]; s.out.textContent = state.values[e.id]; });
}

/* ---------- ขนาดผลลัพธ์ ---------- */
function rotatedSize(){   // ขนาดภาพหลังหมุน ก่อนปรับสเกล
  const i = state.img, swap = state.rotation % 2 === 1;
  return swap ? { w:i.height, h:i.width } : { w:i.width, h:i.height };
}
function outputSize(){
  const r = rotatedSize();
  if (state.scaleMode === 'manual') {
    return { w:Math.min(EXPORT_MAX, Math.max(1, state.manual.w)), h:Math.min(EXPORT_MAX, Math.max(1, state.manual.h)) };
  }
  const p = SCALE_PRESETS.find(p => p.id === state.preset) || SCALE_PRESETS[0];
  const k = Math.min(p.factor(r.w, r.h), EXPORT_MAX / Math.max(r.w, r.h));
  return { w:Math.max(1, Math.round(r.w*k)), h:Math.max(1, Math.round(r.h*k)) };
}

/* ---------- เรนเดอร์ ---------- */
// วาดภาพที่หมุน/พลิก/ปรับสเกลแล้ว k = ตัวคูณเพิ่มเติม (ตัวอย่างใช้ k<1, ส่งออกใช้ k=1)
function makeBase(k){
  const o = outputSize(), swap = state.rotation % 2 === 1;
  const cw = Math.max(1, Math.round(o.w*k)), ch = Math.max(1, Math.round(o.h*k));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.translate(cw/2, ch/2);
  g.rotate(state.rotation * Math.PI/2);
  g.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
  const dw = swap ? ch : cw, dh = swap ? cw : ch;
  g.drawImage(state.img, -dw/2, -dh/2, dw, dh);
  return c;
}
function buildBase(){
  if (!state.img) return;
  const o = outputSize();
  previewMax = previewMaxFor(view.z);
  baseCanvas = makeBase(Math.min(1, previewMax / Math.max(o.w, o.h)));
}
const hasEdits = () => EFFECTS.some(e => state.values[e.id] !== e.def);
function applyEffects(g, w, h, simulate){   // simulate = จำลองสีพิมพ์ CMYK (เฉพาะหน้าจอ)
  const frame = g.getImageData(0, 0, w, h);
  EFFECTS.forEach(e => { if (state.values[e.id] !== e.def) e.apply(frame.data, state.values[e.id], w, h); });
  if (simulate) simulateCmyk(frame.data);
  g.putImageData(frame, 0, 0);
}
function render(){
  if (!baseCanvas) return;
  canvas.width = baseCanvas.width; canvas.height = baseCanvas.height;
  layoutCanvas();
  ctx.drawImage(baseCanvas, 0, 0);
  const cmyk = state.colorMode === 'cmyk';
  if (!state.showOriginal && (hasEdits() || cmyk)) applyEffects(ctx, canvas.width, canvas.height, cmyk);
}

let pending = false;
function schedule(){ if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; render(); }); }

/* ---------- โหลดรูป ---------- */
function loadFile(file){
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    state.img = img; resetView(); resetState(); initManual(); syncSliders(); buildBase(); syncScaleUI();
    $('drop').classList.add('hidden'); canvas.style.display = 'block';
    document.querySelectorAll('[data-needs-image],#download,#reset,#compare').forEach(el => el.disabled = false);
    render(); URL.revokeObjectURL(url);
  };
  img.onerror = () => alert('ไม่สามารถเปิดไฟล์รูปนี้ได้');
  img.src = url;
}
$('file').addEventListener('change', e => loadFile(e.target.files[0]));
const stage = $('stage');
stage.addEventListener('dragover', e => e.preventDefault());
stage.addEventListener('drop', e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });

/* ---------- ปุ่มอื่นๆ ---------- */
$('reset').addEventListener('click', () => { resetState(); initManual(); syncSliders(); buildBase(); syncScaleUI(); render(); });
const cmp = $('compare');
const showOrig = v => () => { state.showOriginal = v; render(); };
cmp.addEventListener('pointerdown', showOrig(true));
['pointerup','pointerleave','pointercancel'].forEach(ev => cmp.addEventListener(ev, showOrig(false)));
function saveBlob(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// พื้นโปร่งใสจะกลายเป็นสีขาว (สำหรับ JPEG และ TIFF ที่ไม่รองรับความโปร่งใส)
function flatten(src){
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0);
  return c;
}
$('download').addEventListener('click', () => {
  const f = currentFormat(), cmyk = state.colorMode === 'cmyk';
  let c = makeBase(1);   // ส่งออกที่ขนาดจริงตามที่ตั้งค่า
  if (hasEdits()) applyEffects(c.getContext('2d'), c.width, c.height);
  if (f.flatten) c = flatten(c);
  const name = 'edited' + (cmyk ? '-cmyk' : '');
  if (f.id === 'tiff') {
    if (c.width * c.height > MAX_TIFF_PIXELS) { alert('ภาพใหญ่เกินไปสำหรับไฟล์ TIFF กรุณาลดขนาดภาพก่อน'); return; }
    const dpi = (state.scaleMode === 'manual' && state.manual.unit !== 'px') ? state.manual.dpi : 72;
    const rgba = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    saveBlob(encodeTiff(rgba, c.width, c.height, dpi, cmyk), name + '.tiff');
  } else {
    c.toBlob(blob => {
      if (!blob) { alert('ไม่สามารถสร้างไฟล์ได้'); return; }
      if (blob.type !== f.mime) {   // เบราว์เซอร์บางตัวไม่รองรับการเขียน WebP
        alert('เบราว์เซอร์นี้ไม่รองรับ ' + f.ext.toUpperCase() + ' จึงบันทึกเป็น PNG แทน');
        saveBlob(blob, name + '.png'); return;
      }
      saveBlob(blob, name + '.' + f.ext);
    }, f.mime, f.quality ? state.quality / 100 : undefined);
  }
});

/* ---------- UI ปรับขนาด ---------- */
const presetSel = $('preset'), wIn = $('scaleW'), hIn = $('scaleH'), lockEl = $('scaleLock');
const unitSel = $('scaleUnit'), dpiIn = $('scaleDpi');

// โหมดกำหนดเอง: เก็บ "ขนาดจริง (cm)" เป็นค่าหลัก ส่วนพิกเซลคำนวณจากขนาดจริง × DPI
// ค่าที่ตั้งจึงไม่เพี้ยนเวลาเปลี่ยน DPI/หน่วย (เดิมเก็บเป็นพิกเซลจำนวนเต็ม ทำให้ 10 cm กลายเป็น 10.01 cm)
const clampPx = v => Math.min(EXPORT_MAX, Math.max(1, Math.round(v)));
function setManualPx(w, h){ const m = state.manual; m.w = clampPx(w); m.h = clampPx(h); m.wCm = m.w / m.dpi * 2.54; m.hCm = m.h / m.dpi * 2.54; }
function setManualCm(wCm, hCm){ const m = state.manual; m.wCm = wCm; m.hCm = hCm; m.w = clampPx(wCm / 2.54 * m.dpi); m.h = clampPx(hCm / 2.54 * m.dpi); }
function cmToUnit(cm){ const u = UNITS[state.manual.unit]; return u.perInch ? cm / 2.54 * u.perInch : cm / 2.54 * state.manual.dpi; }
function unitToCm(v){ const u = UNITS[state.manual.unit]; return u.perInch ? v / u.perInch * 2.54 : v / state.manual.dpi * 2.54; }
function physCm(){   // ขนาดจริง (cm): โหมดกำหนดเองใช้ค่าที่ตั้งตรงๆ โหมดอัตโนมัติคำนวณจากพิกเซลที่ได้
  const m = state.manual;
  if (state.scaleMode === 'manual') return { w:m.wCm, h:m.hCm };
  const o = outputSize(); return { w:o.w / m.dpi * 2.54, h:o.h / m.dpi * 2.54 };
}
function fmt(v){ return state.manual.unit === 'px' ? String(Math.round(v)) : String(Math.round(v * 100) / 100); }
SCALE_PRESETS.forEach(p => presetSel.add(new Option(p.label, p.id)));

function initManual(){ const r = rotatedSize(); setManualPx(r.w, r.h); }

function syncScaleUI(){
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.scaleMode));
  $('scaleAuto').hidden = state.scaleMode !== 'auto';
  $('scaleManual').hidden = state.scaleMode !== 'manual';
  presetSel.value = state.preset; lockEl.checked = state.manual.lock;
  const un = state.manual.unit, ul = UNITS[un].label;
  unitSel.value = un;
  $('dpiWrap').hidden = un === 'px';
  $('wLabel').textContent = 'กว้าง (' + ul + ')';
  $('hLabel').textContent = 'สูง (' + ul + ')';
  if (document.activeElement !== dpiIn) dpiIn.value = state.manual.dpi;
  const pc = state.img ? physCm() : null;
  if (document.activeElement !== wIn) wIn.value = pc ? fmt(cmToUnit(pc.w)) : '';
  if (document.activeElement !== hIn) hIn.value = pc ? fmt(cmToUnit(pc.h)) : '';
  if (state.img) {
    const o = outputSize();
    let t = 'ขนาดผลลัพธ์: ' + o.w + ' × ' + o.h + ' px';
    if (un !== 'px') t += ' = ' + fmt(cmToUnit(pc.w)) + ' × ' + fmt(cmToUnit(pc.h)) + ' ' + ul + ' ที่ ' + state.manual.dpi + ' DPI';
    $('sizeInfo').textContent = t;
  }
  updateInfoBar();
}
function applyScale(){ buildBase(); render(); syncScaleUI(); }

document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  if (!state.img) return;
  if (b.dataset.mode === 'manual' && state.scaleMode !== 'manual') {
    const o = outputSize(); setManualPx(o.w, o.h);   // เริ่มจากขนาดปัจจุบัน
  }
  state.scaleMode = b.dataset.mode; applyScale();
}));
presetSel.addEventListener('change', () => { state.preset = presetSel.value; applyScale(); });
lockEl.addEventListener('change', () => { state.manual.lock = lockEl.checked; });

function onSizeInput(axis){
  const raw = +(axis === 'w' ? wIn : hIn).value;
  if (!(raw > 0)) return;
  const cm = unitToCm(raw);
  if (cm / 2.54 * state.manual.dpi < 0.5) return;          // เล็กกว่า 1 พิกเซล
  const r = rotatedSize(), m = state.manual;
  let wCm = m.wCm, hCm = m.hCm;
  if (axis === 'w') { wCm = cm; if (m.lock) hCm = cm * r.h / r.w; }
  else              { hCm = cm; if (m.lock) wCm = cm * r.w / r.h; }
  setManualCm(wCm, hCm);
  applyScale();
}
wIn.addEventListener('input', () => onSizeInput('w'));
hIn.addEventListener('input', () => onSizeInput('h'));

unitSel.addEventListener('change', () => { state.manual.unit = unitSel.value; syncScaleUI(); });
dpiIn.addEventListener('input', () => {
  const v = Math.round(+dpiIn.value);
  if (!(v >= 1 && v <= 1200)) return;
  const m = state.manual;
  if (m.unit === 'px') { const w = m.w, h = m.h; m.dpi = v; setManualPx(w, h); }   // หน่วย px: คงจำนวนพิกเซล ขนาดจริงเปลี่ยนตาม DPI
  else { m.dpi = v; setManualCm(m.wCm, m.hCm); }                                    // หน่วยจริง: คงขนาดจริงไว้ พิกเซลเปลี่ยนตาม
  applyScale();
});

// ปุ่มรีเซ็ตขนาด (โหมดกำหนดเอง): หน่วย px, DPI 300, ปลดล็อกสัดส่วน, คืนขนาดเป็นขนาดภาพจริง (คงการหมุนไว้)
$('scaleReset').addEventListener('click', () => {
  if (!state.img) return;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // ให้ช่องที่โฟกัสอยู่ถูกอัปเดตด้วย
  const m = state.manual;
  m.unit = 'px'; m.dpi = 300; m.lock = false;
  initManual();
  unitSel.value = 'px'; dpiIn.value = 300; lockEl.checked = false;   // ตั้งค่าช่องหน่วย/DPI/ล็อกให้ตรงทันที
  applyScale();
});

/* ---------- ซูม / เลื่อนดู ---------- */
const MIN_Z = 1, MAX_Z = 8;
const zClamp = (v, a, b) => Math.min(b, Math.max(a, v));
// ซูมมากขึ้น → วาดภาพตัวอย่างละเอียดขึ้น เพื่อไม่ให้ภาพแตก
function previewMaxFor(z){ return z <= 1 ? PREVIEW_MAX : z <= 2 ? 2400 : z <= 3 ? 3200 : 4096; }

function layoutCanvas(){   // ขนาดภาพที่ซูม 100% = พอดีกรอบ
  if (!state.img) return;
  const o = outputSize();
  view.bw = Math.max(1, stage.clientWidth - 16); view.bh = Math.max(1, stage.clientHeight - 16);
  const f = Math.min(view.bw / o.w, view.bh / o.h, 1);
  view.dw = Math.max(1, Math.round(o.w * f)); view.dh = Math.max(1, Math.round(o.h * f));
  canvas.style.width = view.dw + 'px'; canvas.style.height = view.dh + 'px';
  clampPan(); applyView();
}
function clampPan(){   // ไม่ให้ลากภาพหลุดออกนอกกรอบ
  const mx = Math.max(0, (view.dw * view.z - view.bw) / 2), my = Math.max(0, (view.dh * view.z - view.bh) / 2);
  view.x = zClamp(view.x, -mx, mx); view.y = zClamp(view.y, -my, my);
}
let dragging = false;
function applyView(){
  canvas.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')';
  $('zoomLabel').textContent = Math.round(view.z * 100) + '%';
  $('panHint').hidden = view.z <= 1;
  stage.style.cursor = view.z > 1 ? (dragging ? 'grabbing' : 'grab') : '';
  stage.style.touchAction = view.z > 1 ? 'none' : 'pan-y';   // ซูม 100% ยังเลื่อนหน้าเว็บได้ตามปกติ
}
let detailTimer = 0;
function scheduleDetail(){
  clearTimeout(detailTimer);
  detailTimer = setTimeout(() => { if (state.img && previewMaxFor(view.z) !== previewMax) { buildBase(); render(); } }, 200);
}
// ซูมโดยให้จุด (px, py) (นับจากกลางกรอบ) อยู่ที่เดิม
function zoomAt(nz, px, py){
  nz = zClamp(nz, MIN_Z, MAX_Z);
  const u = (px - view.x) / view.z, v = (py - view.y) / view.z;
  view.x = px - u * nz; view.y = py - v * nz; view.z = nz;
  clampPan(); applyView(); scheduleDetail();
}
function resetView(){ view.z = 1; view.x = 0; view.y = 0; applyView(); scheduleDetail(); }
const relPos = (cx, cy) => { const r = stage.getBoundingClientRect(); return { x:cx - r.left - r.width/2, y:cy - r.top - r.height/2 }; };

$('zoomIn').addEventListener('click', () => zoomAt(view.z * 1.5, 0, 0));
$('zoomOut').addEventListener('click', () => zoomAt(view.z / 1.5, 0, 0));
$('zoomFit').addEventListener('click', resetView);
window.addEventListener('resize', () => { if (state.img) render(); });

stage.addEventListener('wheel', e => {
  if (!state.img) return;
  e.preventDefault();
  const q = relPos(e.clientX, e.clientY);
  zoomAt(view.z * Math.exp(-e.deltaY * 0.0015), q.x, q.y);
}, { passive:false });
stage.addEventListener('dblclick', e => {
  if (!state.img) return;
  if (view.z > 1) resetView(); else { const q = relPos(e.clientX, e.clientY); zoomAt(2.5, q.x, q.y); }
});

// ลาก 1 นิ้ว/เมาส์ = เลื่อนดู (เมื่อซูมอยู่), บีบ 2 นิ้ว = ซูม
const ptrs = new Map(); let pinch = null;
const pinchState = () => { const [a, b] = [...ptrs.values()];
  return { d:Math.hypot(a.x - b.x, a.y - b.y) || 1, mx:(a.x + b.x) / 2, my:(a.y + b.y) / 2 }; };
stage.addEventListener('pointerdown', e => {
  if (!state.img) return;
  ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if (view.z > 1 || ptrs.size === 2) { try { stage.setPointerCapture(e.pointerId); } catch (_) {} }
  dragging = ptrs.size === 1 && view.z > 1;
  if (ptrs.size === 2) pinch = pinchState();
  applyView();
});
stage.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    if (view.z > 1) { view.x += dx; view.y += dy; clampPan(); applyView(); }
  } else if (ptrs.size === 2 && pinch) {
    const n = pinchState(), q = relPos(n.mx, n.my);
    view.x += n.mx - pinch.mx; view.y += n.my - pinch.my;
    zoomAt(view.z * n.d / pinch.d, q.x, q.y);
    pinch = n;
  }
});
const endPtr = e => { ptrs.delete(e.pointerId); pinch = ptrs.size === 2 ? pinchState() : null; dragging = false; applyView(); };
['pointerup', 'pointercancel'].forEach(n => stage.addEventListener(n, endPtr));

/* ---------- ประเภทสี RGB / CMYK ---------- */
const MAX_TIFF_PIXELS = 40e6;
const COLOR_INFO = {
  rgb:  'RGB: สำหรับแสดงบนหน้าจอและเว็บ',
  cmyk: 'CMYK: สำหรับงานพิมพ์ ภาพบนจอเป็นการจำลองสีพิมพ์โดยประมาณ บันทึกได้เป็น TIFF เท่านั้น',
};
function syncColorUI(){
  document.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('active', b.dataset.color === state.colorMode));
  $('colorInfo').textContent = COLOR_INFO[state.colorMode];
  syncFormatUI();
}
document.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => {
  state.colorMode = b.dataset.color; syncColorUI(); render();
}));

// จำลองสีพิมพ์คร่าวๆ: หมึกดูดแสงไม่หมด (สีสดจัดจะหม่นลง ดำไม่ดำสนิท) กระดาษไม่ขาวจัด
const INK = { c:0.85, m:0.90, y:0.95, k:0.93, cG:0.30, mB:0.22 }, PAPER = [250, 247, 242];
function simulateCmyk(d){
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
    const k = 1 - Math.max(r, g, b), inv = 1 - k;
    const c = inv ? (1 - r - k)/inv : 0, m = inv ? (1 - g - k)/inv : 0, y = inv ? (1 - b - k)/inv : 0;
    const kk = 1 - INK.k * k;
    d[i]   = PAPER[0] * (1 - INK.c * c) * kk;
    d[i+1] = PAPER[1] * (1 - INK.m * m) * (1 - INK.cG * c) * kk;
    d[i+2] = PAPER[2] * (1 - INK.y * y) * (1 - INK.mB * m) * kk;
  }
}

// เขียนไฟล์ TIFF 8 บิต ไม่บีบอัด (cmyk=true → CMYK แปลงด้วยสูตรมาตรฐาน ไม่มี ICC profile)
function encodeTiff(rgba, w, h, dpi, cmyk){
  const spp = cmyk ? 4 : 3, n = w * h, count = cmyk ? 14 : 13;
  const bpsOff = 10 + count * 12 + 4, xOff = bpsOff + spp * 2, yOff = xOff + 8, DATA = yOff + 8;
  const buf = new ArrayBuffer(DATA + n * spp), dv = new DataView(buf), px = new Uint8Array(buf, DATA);
  dv.setUint8(0, 0x49); dv.setUint8(1, 0x49); dv.setUint16(2, 42, true); dv.setUint32(4, 8, true);
  // [tag, type(3=SHORT,4=LONG,5=RATIONAL), count, value/offset]
  const tags = [[256,4,1,w],[257,4,1,h],[258,3,spp,bpsOff],[259,3,1,1],[262,3,1,cmyk ? 5 : 2],[273,4,1,DATA],
    [277,3,1,spp],[278,4,1,h],[279,4,1,n*spp],[282,5,1,xOff],[283,5,1,yOff],[284,3,1,1],[296,3,1,2]];
  if (cmyk) tags.push([332,3,1,1]);   // InkSet = CMYK
  dv.setUint16(8, tags.length, true);
  tags.forEach(([tag, type, cnt, val], i) => {
    const o = 10 + i * 12;
    dv.setUint16(o, tag, true); dv.setUint16(o + 2, type, true); dv.setUint32(o + 4, cnt, true);
    if (type === 3 && cnt === 1) dv.setUint16(o + 8, val, true); else dv.setUint32(o + 8, val, true);
  });
  dv.setUint32(10 + tags.length * 12, 0, true);
  for (let i = 0; i < spp; i++) dv.setUint16(bpsOff + i * 2, 8, true);
  const res = Math.max(1, Math.round(dpi));
  dv.setUint32(xOff, res, true); dv.setUint32(xOff + 4, 1, true); dv.setUint32(yOff, res, true); dv.setUint32(yOff + 4, 1, true);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += spp) {
    const r = rgba[i], g = rgba[i+1], b = rgba[i+2];
    if (!cmyk) { px[o] = r; px[o+1] = g; px[o+2] = b; continue; }
    const mx = Math.max(r, g, b);
    if (mx === 0) { px[o+3] = 255; continue; }                 // ดำสนิท = K 100%
    px[o]   = Math.round((mx - r) / mx * 255);                 // C
    px[o+1] = Math.round((mx - g) / mx * 255);                 // M
    px[o+2] = Math.round((mx - b) / mx * 255);                 // Y
    px[o+3] = 255 - mx;                                        // K
  }
  return new Blob([buf], { type:'image/tiff' });
}

/* ---------- รูปแบบไฟล์ที่บันทึก ---------- */
// เพิ่มรูปแบบใหม่: เพิ่มออบเจกต์ที่นี่ (modes = โหมดสีที่รองรับ, flatten = ต้องแทนพื้นโปร่งใสด้วยสีขาว)
const FORMATS = [
  { id:'png',  ext:'png',  mime:'image/png',  modes:['rgb'], label:'PNG (.png)',
    note:'PNG: คมชัดไม่สูญเสียคุณภาพ รองรับพื้นโปร่งใส' },
  { id:'jpg',  ext:'jpg',  mime:'image/jpeg', modes:['rgb'], label:'JPEG (.jpg)', quality:true, flatten:true,
    note:'JPEG: ไฟล์เล็ก ใช้ทั่วไป ไม่รองรับพื้นโปร่งใส (จะกลายเป็นสีขาว)' },
  { id:'webp', ext:'webp', mime:'image/webp', modes:['rgb'], label:'WebP (.webp)', quality:true,
    note:'WebP: ไฟล์เล็กมาก เหมาะกับเว็บ' },
  { id:'tiff', ext:'tiff', mime:'image/tiff', modes:['rgb', 'cmyk'], label:'TIFF (.tiff)', flatten:true,
    note:'TIFF: ไม่บีบอัด คุณภาพสูง เหมาะกับงานพิมพ์ ไฟล์ใหญ่ ต้องเปิดด้วยโปรแกรมแต่งภาพ' },
];
const fmtSel = $('fileFormat'), qualityIn = $('quality');
const currentFormat = () => FORMATS.find(f => f.id === (state.colorMode === 'cmyk' ? 'tiff' : state.format)) || FORMATS[0];
function syncFormatUI(){
  const f = currentFormat();
  fmtSel.innerHTML = '';
  FORMATS.filter(x => x.modes.includes(state.colorMode)).forEach(x => fmtSel.add(new Option(x.label, x.id)));
  fmtSel.value = f.id;
  $('qualityWrap').hidden = !f.quality;
  qualityIn.value = state.quality; $('qualityOut').textContent = state.quality + '%';
  $('formatInfo').textContent = f.note;
  $('download').textContent = 'ดาวน์โหลด ' + f.ext.toUpperCase();
}
fmtSel.addEventListener('change', () => { state.format = fmtSel.value; syncFormatUI(); });
qualityIn.addEventListener('input', () => { state.quality = +qualityIn.value; $('qualityOut').textContent = state.quality + '%'; });

/* ---------- แถบขนาด + ราคา + หน้าตั้งค่า ---------- */
const AREA_UNITS = { cm2:{ label:'ตร.ซม.', cm2:1 }, in2:{ label:'ตร.นิ้ว', cm2:6.4516 }, ft2:{ label:'ตร.ฟุต', cm2:929.0304 }, m2:{ label:'ตร.ม.', cm2:10000 } };   // cm2 = พื้นที่ 1 หน่วย เป็นตร.ซม.
// ประเภทงานเริ่มต้น (ราคาเป็นตัวเลขสมมติ ผู้ใช้แก้ไข/เพิ่ม/ลบได้ในหน้าตั้งค่า)
const DEFAULT_JOBS = [
  { id:'vinyl',          name:'ไวนิล',                       rate:120, unit:'m2', min:0 },
  { id:'vinyl-frame',    name:'ไวนิลโครงไม้',                rate:350, unit:'m2', min:0 },
  { id:'sticker',        name:'สติ๊กเกอร์',                  rate:300, unit:'m2', min:0 },
  { id:'sticker-foam',   name:'สติ๊กเกอร์โฟมบอร์ด',          rate:600, unit:'m2', min:0 },
  { id:'sticker-pass',   name:'สติ๊กเกอร์ลงแผ่นพาสวูด',      rate:750, unit:'m2', min:0 },
  { id:'sticker-label',  name:'สติ๊กเกอร์สลากสินค้า',        rate:450, unit:'m2', min:0 },
  { id:'sticker-future', name:'สติ๊กเกอร์ติดฟิวเจอร์บอร์ด',  rate:550, unit:'m2', min:0 },
];
const JOBS_KEY = 'photoEditor.jobs';
const cleanJob = x => ({
  id: String(x.id || 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
  name: String(x.name == null ? 'ไม่ระบุชื่อ' : x.name).slice(0, 60),
  rate: x.rate >= 0 ? +x.rate : 0, per: x.per > 0 ? +x.per : 1, unit: AREA_UNITS[x.unit] ? x.unit : 'm2', min: x.min >= 0 ? +x.min : 0,
});
state.jobs = DEFAULT_JOBS.map(cleanJob); state.job = state.jobs[0].id;
try {
  const j = JSON.parse(localStorage.getItem(JOBS_KEY) || 'null');
  if (j && Array.isArray(j.jobs) && j.jobs.length) { state.jobs = j.jobs.map(cleanJob); state.job = j.job; }
} catch (_) {}
if (!state.jobs.some(j => j.id === state.job)) state.job = state.jobs[0].id;
const saveJobs = () => { try { localStorage.setItem(JOBS_KEY, JSON.stringify({ jobs:state.jobs, job:state.job })); } catch (_) {} };
const currentJob = () => state.jobs.find(j => j.id === state.job) || state.jobs[0];

const jobSel = $('jobSelect'), dlg = $('settingsDlg'), jobList = $('jobList');
const dUnit = $('dUnit'), dW = $('dW'), dH = $('dH'), dLock = $('dLock'), dDpi = $('dDpi');
const money = v => '฿' + v.toLocaleString('th-TH', { minimumFractionDigits:2, maximumFractionDigits:2 });
const n2 = v => String(Math.round(v * 100) / 100);
const nArea = v => v >= 100 ? n2(v) : String(+v.toPrecision(3));   // พื้นที่เล็กๆ แสดงทศนิยมให้พอ

function renderJobSelect(){
  jobSel.innerHTML = '';
  state.jobs.forEach(j => jobSel.add(new Option(j.name || 'ไม่ระบุชื่อ', j.id)));
  jobSel.value = state.job;
}
function updateInfoBar(){
  const has = !!state.img, u0 = state.manual.unit;
  // ช่องในหน้าตั้งค่า (สะท้อนค่าเดียวกับหมวดปรับขนาดภาพ)
  [dUnit, dW, dH, dLock, dDpi].forEach(el => { el.disabled = !has; });
  $('dlgNoImg').hidden = has;
  dUnit.value = u0; dLock.checked = state.manual.lock;
  $('dwL').textContent = 'กว้าง (' + UNITS[u0].label + ')'; $('dhL').textContent = 'สูง (' + UNITS[u0].label + ')';
  if (document.activeElement !== dDpi) dDpi.value = state.manual.dpi;
  if (!has) {
    $('ibSize').textContent = 'ยังไม่ได้เปิดรูปภาพ'; $('ibPrice').textContent = ''; $('ibSub').textContent = 'เปิดรูปเพื่อดูขนาดและราคา'; $('ibSub2').textContent = '';
    return;
  }
  const o = outputSize(), dpi = state.manual.dpi, pc = physCm();
  if (document.activeElement !== dW) dW.value = fmt(cmToUnit(pc.w));
  if (document.activeElement !== dH) dH.value = fmt(cmToUnit(pc.h));
  const wInch = pc.w / 2.54, hInch = pc.h / 2.54;
  const un = u0 === 'px' ? 'cm' : u0, u = UNITS[un];                       // หน่วยหลัก = หน่วยที่เลือก (px แสดงเป็น cm)
  const au = UNITS[un === 'in' ? 'cm' : 'in'];                              // หน่วยรอง
  const job = currentJob(), au2 = AREA_UNITS[job.unit], areaCm2 = (wInch * 2.54) * (hInch * 2.54);
  const areaJob = areaCm2 / au2.cm2;                                        // พื้นที่ในหน่วยที่ร้านคิดราคา
  const calc = areaJob / job.per * job.rate;                                // ราคา = พื้นที่ ÷ จำนวนที่ร้านคิด × ราคา
  const price = Math.max(job.min, calc), usedMin = job.min > calc;         // ต่ำกว่าขั้นต่ำ → คิดราคาขั้นต่ำ
  $('ibSize').textContent = 'ขนาด ' + n2(wInch * u.perInch) + ' × ' + n2(hInch * u.perInch) + ' ' + u.label;
  $('ibPrice').textContent = 'ราคา ' + money(price) + (usedMin ? ' (ขั้นต่ำ)' : '');
  $('ibSub').textContent = n2(wInch * au.perInch) + ' × ' + n2(hInch * au.perInch) + ' ' + au.label + ' · ' + o.w + ' × ' + o.h + ' px · ' + dpi + ' DPI';
  $('ibSub2').textContent = (job.name || 'ไม่ระบุชื่อ') + ' · พื้นที่ ' + nArea(areaJob) + ' ' + au2.label +
    ' · ' + n2(job.rate) + ' ฿ ต่อ ' + n2(job.per) + ' ' + au2.label +
    (usedMin ? ' · คิดตามพื้นที่ ' + money(calc) + ' ต่ำกว่าขั้นต่ำ ' + money(job.min) : '');
}

// เลือกประเภทงาน
jobSel.addEventListener('change', () => { state.job = jobSel.value; saveJobs(); updateInfoBar(); });

// เปิด/ปิดหน้าตั้งค่า
$('openSettings').addEventListener('click', () => {
  renderJobList(); updateInfoBar();
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
});
const closeDlg = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
$('dlgClose').addEventListener('click', closeDlg);
dlg.addEventListener('click', e => { if (e.target === dlg) closeDlg(); });

// ตั้งขนาด (ส่งต่อให้ตัวจัดการเดิมของหมวดปรับขนาดภาพ จึงทำงานตรงกัน)
function ensureManual(){ if (state.scaleMode !== 'manual') document.querySelector('[data-mode="manual"]').click(); }
const forward = (from, to, evt) => () => {
  if (!state.img) return;
  const v = from.value;   // เก็บค่าก่อน เพราะการสลับเป็นโหมดกำหนดเองจะรีเฟรชช่องในหน้าตั้งค่า
  ensureManual(); to.value = v; to.dispatchEvent(new Event(evt));
};
dW.addEventListener('input', forward(dW, wIn, 'input'));
dH.addEventListener('input', forward(dH, hIn, 'input'));
dUnit.addEventListener('change', forward(dUnit, unitSel, 'change'));
dDpi.addEventListener('input', forward(dDpi, dpiIn, 'input'));
dLock.addEventListener('change', () => { lockEl.checked = dLock.checked; lockEl.dispatchEvent(new Event('change')); });

// รายการประเภทงานและราคา
function renderJobList(){
  jobList.innerHTML = '';
  state.jobs.forEach(j => {
    const el = document.createElement('div'); el.className = 'job'; el.dataset.id = j.id;
    el.innerHTML = '<input class="j-name" type="text" maxlength="60" aria-label="ชื่อประเภทงาน">' +
      '<div class="grid3"><label>ราคา (฿)<input class="j-rate" type="number" min="0" step="any"></label>' +
      '<label>ต่อ (จำนวน)<input class="j-per" type="number" min="0" step="any"></label>' +
      '<label>หน่วยพื้นที่<select class="j-unit">' + Object.keys(AREA_UNITS).map(k => '<option value="' + k + '">' + AREA_UNITS[k].label + '</option>').join('') + '</select></label></div>' +
      '<div class="row2"><label>ราคาขั้นต่ำ (฿)<input class="j-min" type="number" min="0" step="any"></label>' +
      '<button type="button" class="j-del">ลบประเภทงานนี้</button></div>';
    el.querySelector('.j-name').value = j.name;
    el.querySelector('.j-rate').value = j.rate;
    el.querySelector('.j-per').value = j.per;
    el.querySelector('.j-unit').value = j.unit;
    el.querySelector('.j-min').value = j.min;
    jobList.appendChild(el);
  });
}
function onJobEdit(e){
  const card = e.target.closest('.job'); if (!card) return;
  const j = state.jobs.find(x => x.id === card.dataset.id); if (!j) return;
  j.name = card.querySelector('.j-name').value;
  j.rate = Math.max(0, +card.querySelector('.j-rate').value || 0);
  const pv = +card.querySelector('.j-per').value; j.per = pv > 0 ? pv : 1;
  j.unit = card.querySelector('.j-unit').value;
  j.min = Math.max(0, +card.querySelector('.j-min').value || 0);
  saveJobs(); renderJobSelect(); updateInfoBar();
}
jobList.addEventListener('input', onJobEdit);
jobList.addEventListener('change', onJobEdit);
jobList.addEventListener('click', e => {
  if (!e.target.classList.contains('j-del')) return;
  if (state.jobs.length <= 1) { alert('ต้องมีประเภทงานอย่างน้อย 1 รายการ'); return; }
  const id = e.target.closest('.job').dataset.id;
  state.jobs = state.jobs.filter(j => j.id !== id);
  if (state.job === id) state.job = state.jobs[0].id;
  saveJobs(); renderJobList(); renderJobSelect(); updateInfoBar();
});
$('jobAdd').addEventListener('click', () => {
  state.jobs.push(cleanJob({ name:'ประเภทงานใหม่', rate:100, unit:'m2', min:0 }));
  saveJobs(); renderJobList(); renderJobSelect(); updateInfoBar();
  const last = jobList.lastElementChild; last.scrollIntoView({ block:'nearest' });
  const nm = last.querySelector('.j-name'); nm.focus(); nm.select();
});
$('jobReset').addEventListener('click', () => {
  if (!confirm('คืนค่าประเภทงานและราคาเริ่มต้นทั้งหมด? (รายการที่เพิ่มหรือแก้ไขไว้จะหายไป)')) return;
  state.jobs = DEFAULT_JOBS.map(cleanJob); state.job = state.jobs[0].id;
  saveJobs(); renderJobList(); renderJobSelect(); updateInfoBar();
});
renderJobSelect();

resetState();
syncScaleUI();
syncColorUI();

/* ---------- เมนูเลือกแบบกระจกฝ้า (แทนเมนูเลื่อนลงของระบบ) ---------- */
// แปลง <select> ทุกตัวเป็นปุ่ม + รายการลอยแบบโปร่งใส โดยยังเก็บ <select> เดิมไว้ ค่าจึงทำงานร่วมกับโค้ดเดิมทั้งหมด
// ถ้าเบราว์เซอร์ไม่รองรับ Popover API จะใช้เมนูเดิมของระบบ
(function(){
  if (!('popover' in HTMLElement.prototype)) return;
  const valDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  let current = null;   // เมนูที่เปิดอยู่

  function enhance(sel){
    if (sel.dataset.ds) return;
    sel.dataset.ds = '1';
    const wrap = document.createElement('div'); wrap.className = 'ds';
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel); sel.classList.add('ds-native');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ds-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    const al = sel.getAttribute('aria-label'); if (al) btn.setAttribute('aria-label', al);
    btn.innerHTML = '<span class="ds-label"></span><svg class="ds-chev" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const pop = document.createElement('div'); pop.className = 'ds-pop'; pop.setAttribute('popover', 'manual'); pop.setAttribute('role', 'listbox');
    wrap.append(btn, pop);
    const label = btn.querySelector('.ds-label');

    const refresh = () => {
      const o = sel.options[sel.selectedIndex];
      label.textContent = o ? o.text : '';
      btn.disabled = sel.disabled;
    };
    // ให้ select.value = ... จากโค้ดเดิม อัปเดตป้ายบนปุ่มด้วย
    Object.defineProperty(sel, 'value', { configurable:true, get(){ return valDesc.get.call(this); }, set(v){ valDesc.set.call(this, v); refresh(); } });
    new MutationObserver(refresh).observe(sel, { childList:true, subtree:true, attributes:true, attributeFilter:['disabled'] });
    sel.addEventListener('change', refresh);
    refresh();

    const api = { wrap, pop, close(){
      if (pop.matches(':popover-open')) pop.hidePopover();
      btn.setAttribute('aria-expanded', 'false');
      if (current === api) current = null;
    } };
    const items = () => [...pop.querySelectorAll('.ds-opt:not(:disabled)')];

    function open(){
      if (current && current !== api) current.close();
      pop.innerHTML = '';
      [...sel.options].forEach((o, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ds-opt'; b.setAttribute('role', 'option');
        b.dataset.i = i; b.disabled = o.disabled;
        const t = document.createElement('span'); t.textContent = o.text;
        const ck = document.createElement('i'); ck.className = 'ds-ck'; ck.textContent = '✓';
        b.append(t, ck);
        if (i === sel.selectedIndex) { b.classList.add('sel'); b.setAttribute('aria-selected', 'true'); }
        pop.appendChild(b);
      });
      const r = btn.getBoundingClientRect();
      pop.style.minWidth = r.width + 'px'; pop.style.maxHeight = '';
      pop.showPopover();
      const vw = innerWidth, vh = innerHeight, h = pop.scrollHeight;
      const below = vh - r.bottom - 12, above = r.top - 12;
      pop.style.left = Math.max(8, Math.min(r.left, vw - pop.offsetWidth - 8)) + 'px';
      if (h <= below || below >= above) {
        pop.style.maxHeight = Math.max(120, below - 6) + 'px';
        pop.style.top = (r.bottom + 6) + 'px'; pop.style.transformOrigin = 'top';
      } else {
        pop.style.maxHeight = Math.max(120, above - 6) + 'px';
        pop.style.top = (r.top - 6 - pop.offsetHeight) + 'px'; pop.style.transformOrigin = 'bottom';
      }
      btn.setAttribute('aria-expanded', 'true'); current = api;
      const s = pop.querySelector('.sel') || items()[0];
      if (s) { s.focus({ preventScroll:true }); s.scrollIntoView({ block:'nearest' }); }
    }
    function choose(i){
      const changed = sel.selectedIndex !== i;
      sel.selectedIndex = i; refresh();
      if (changed) { sel.dispatchEvent(new Event('input', { bubbles:true })); sel.dispatchEvent(new Event('change', { bubbles:true })); }
      api.close(); btn.focus();
    }
    btn.addEventListener('click', () => { if (current === api) api.close(); else open(); });
    btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (current !== api) open(); } });
    pop.addEventListener('click', e => { const b = e.target.closest('.ds-opt'); if (b && !b.disabled) choose(+b.dataset.i); });
    pop.addEventListener('keydown', e => {
      const list = items(), i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (list[i + 1] || list[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (list[i - 1] || list[list.length - 1]).focus(); }
      else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
      else if (e.key === 'Tab') api.close();
    });
  }

  const run = root => root.querySelectorAll('select').forEach(enhance);
  run(document);
  // select ที่สร้างทีหลัง (เช่น รายการประเภทงาน) ก็แปลงให้อัตโนมัติ
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'SELECT') enhance(n); else run(n);
  }))).observe(document.body, { childList:true, subtree:true });

  document.addEventListener('pointerdown', e => { if (current && !current.wrap.contains(e.target)) current.close(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) current.close(); });
  addEventListener('scroll', e => { if (current && !current.pop.contains(e.target)) current.close(); }, true);
  addEventListener('resize', () => { if (current) current.close(); });
})();

/* ---------- ปุ่มลอยกลม + หน้าต่างลอย + ปรับตามขนาดหน้าจอ ---------- */
(function(){
  const fab = $('fab'), main = $('fabMain');
  const wins = [...document.querySelectorAll('.win')];
  let cur = null;
  const setMenu = o => { fab.classList.toggle('open', o); main.setAttribute('aria-expanded', o); if (o) fab.classList.add('used'); };
  function hideWin(w, instant){
    if (!w || w.hidden) return;
    if (cur === w) cur = null;
    if (instant) { w.hidden = true; w.classList.remove('out'); return; }
    w.classList.add('out');
    setTimeout(() => { if (w.classList.contains('out')) { w.hidden = true; w.classList.remove('out'); } }, 220);
  }
  function showWin(w){
    if (cur === w) { hideWin(w); return; }   // กดซ้ำ = ปิด
    if (cur) hideWin(cur, true);
    w.classList.remove('out'); w.hidden = false; cur = w;
  }
  main.addEventListener('click', () => setMenu(!fab.classList.contains('open')));
  $('fabScrim').addEventListener('click', () => setMenu(false));
  fab.querySelectorAll('.fab-item').forEach(b => b.addEventListener('click', () => { setMenu(false); showWin($(b.dataset.win)); }));
  wins.forEach(w => w.querySelector('.win-close').addEventListener('click', () => hideWin(w)));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (fab.classList.contains('open')) setMenu(false); else if (cur) hideWin(cur);
  });

  // ลากหน้าต่างได้บนจอใหญ่ (ลากที่แถบหัว)
  wins.forEach(w => {
    const head = w.querySelector('.win-head'); let d = null;
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || innerWidth <= 700) return;
      const r = w.getBoundingClientRect();
      d = { dx:e.clientX - r.left, dy:e.clientY - r.top };
      w.style.left = r.left + 'px'; w.style.top = r.top + 'px'; w.style.right = 'auto'; w.style.bottom = 'auto';
      head.classList.add('drag'); head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', e => {
      if (!d) return;
      const x = Math.min(innerWidth - 60, Math.max(-w.offsetWidth + 60, e.clientX - d.dx));
      const y = Math.min(innerHeight - 50, Math.max(0, e.clientY - d.dy));
      w.style.left = x + 'px'; w.style.top = y + 'px';
    });
    const end = () => { d = null; head.classList.remove('drag'); };
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  });
  // ปรับขนาดหน้าจอ/หมุนจอ: คืนตำแหน่งหน้าต่างเป็นค่าเริ่มต้นให้พอดีจอใหม่
  addEventListener('resize', () => wins.forEach(w => { w.style.left = w.style.top = w.style.right = w.style.bottom = ''; }));

  // กล่องภาพเปลี่ยนขนาดตามจอ → จัดภาพให้พอดีใหม่
  if (window.ResizeObserver) new ResizeObserver(() => { if (state.img) layoutCanvas(); }).observe(stage);
  // กดค้างปุ่มดูต้นฉบับ ไม่ให้เมนูค้างของระบบเด้ง
  $('compare').addEventListener('contextmenu', e => e.preventDefault());
})();

/* ---------- AI สร้างภาพ ---------- */
(function(){
  // สกิล = ข้อความสไตล์ที่ต่อท้ายคำสั่ง
  const SKILLS = [
    { id:'photo',  label:'📷 ภาพถ่ายสมจริง',       prompt:'photorealistic, natural lighting, high detail' },
    { id:'flat',   label:'🎨 ภาพประกอบแบนสะอาด',   prompt:'clean flat vector illustration, bold shapes' },
    { id:'banner', label:'🪧 ป้ายโฆษณา/ไวนิล',      prompt:'advertising banner layout, balanced composition, safe margins, clear space for text' },
    { id:'logo',   label:'🔖 โลโก้เรียบง่าย',        prompt:'minimal logo design, simple shapes, white background' },
  ];
  // ปลั๊กอิน = ฟังก์ชันที่แก้คำขอก่อนส่งไป API
  const PLUGINS = [
    { id:'print', label:'🖨 เหมาะกับงานพิมพ์', apply(req){ req.prompt += ', high resolution, print-ready, sharp details'; } },
    { id:'size',  label:'📐 ใช้สัดส่วนตามขนาดงานปัจจุบัน', apply(req){
        if (!state.img) return; const o = outputSize(); req.width = o.w; req.height = o.h; req.aspect = +(o.w / o.h).toFixed(4); } },
  ];

  const CFG_KEY = 'photoEditor.ai';
  let cfg = {}; try { cfg = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (_) {}
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (_) {} };
  const att = { images:[], skills:new Set(), plugins:new Set() };
  const log = $('aiLog'), promptEl = $('aiPrompt'), sendBtn = $('aiSend'), menu = $('aiMenu'),
        plus = $('aiPlus'), chips = $('aiChips'), fileIn = $('aiFile'), epIn = $('aiEndpoint'), keyIn = $('aiKey'),
        provSel = $('aiProvider'), modelIn = $('aiModel'), hintEl = $('aiHint');
  let busy = false;

  /* ผู้ให้บริการ AI: เรียก API ตรงจากเบราว์เซอร์ ไม่ต้องมีเซิร์ฟเวอร์ (เพิ่มเจ้าใหม่ได้ที่นี่) */
  const PROVIDERS = {
    openai:     { label:'OpenAI (gpt-image-1)', url:'https://api.openai.com/v1', model:'gpt-image-1',
                  hint:'ใช้ API key จาก platform.openai.com ถ้าแนบรูปจะใช้โหมดแก้ไขภาพ (images/edits)' },
    gemini:     { label:'Google Gemini', url:'https://generativelanguage.googleapis.com/v1beta', model:'gemini-2.5-flash-image',
                  hint:'ขอ API key ฟรีได้ที่ aistudio.google.com รองรับแนบรูปให้แก้ไข' },
    openrouter: { label:'OpenRouter (รวมหลายค่าย)', url:'https://openrouter.ai/api/v1', model:'google/gemini-2.5-flash-image',
                  hint:'key เดียวใช้ได้หลายโมเดลที่ส่งภาพออกได้ ดูชื่อโมเดลที่ openrouter.ai/models' },
    compat:     { label:'OpenAI-compatible อื่นๆ', url:'', model:'',
                  hint:'ค่ายที่ใช้รูปแบบเดียวกับ OpenAI เช่น Together, Fireworks ใส่ URL ฐาน (ลงท้าย /v1) และชื่อโมเดล' },
    custom:     { label:'เซิร์ฟเวอร์ของฉัน (POST JSON)', url:'', model:'',
                  hint:'ส่ง JSON {prompt, images, skills, plugins, width, height} ไปที่ URL นี้ ตอบกลับเป็นไฟล์ภาพ หรือ {image}/{url}/{data:[{b64_json}]}' },
  };
  // ย้ายค่าจากเวอร์ชันก่อน (ที่มีแค่ URL + key)
  if (!cfg.provider) {
    cfg.provider = cfg.endpoint ? 'custom' : 'openai'; cfg.p = cfg.p || {};
    if (cfg.endpoint) cfg.p.custom = { url:cfg.endpoint, model:'', key:cfg.key || '' };
  }
  if (!PROVIDERS[cfg.provider]) cfg.provider = 'openai';
  const P = () => { cfg.p = cfg.p || {}; const d = PROVIDERS[cfg.provider];
    return cfg.p[cfg.provider] || (cfg.p[cfg.provider] = { url:d.url, model:d.model, key:'' }); };
  Object.keys(PROVIDERS).forEach(k => provSel.add(new Option(PROVIDERS[k].label, k)));
  function fillSettings(){
    const p = P();
    provSel.value = cfg.provider; modelIn.value = p.model; epIn.value = p.url; keyIn.value = p.key;
    modelIn.hidden = cfg.provider === 'custom';
    hintEl.textContent = PROVIDERS[cfg.provider].hint + ' · key เก็บไว้ในเครื่องนี้เท่านั้น';
  }
  provSel.addEventListener('change', () => { cfg.provider = provSel.value; saveCfg(); fillSettings(); });
  modelIn.addEventListener('input', () => { P().model = modelIn.value.trim(); saveCfg(); });
  epIn.addEventListener('input', () => { P().url = epIn.value.trim(); saveCfg(); });
  keyIn.addEventListener('input', () => { P().key = keyIn.value.trim(); saveCfg(); });
  fillSettings();

  /* เมนู + */
  const setMenu = o => { menu.hidden = !o; plus.setAttribute('aria-expanded', o); };
  plus.setAttribute('aria-expanded', 'false');
  plus.addEventListener('click', () => setMenu(menu.hidden));
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !plus.contains(e.target)) setMenu(false); }, true);
  function buildToggles(box, list, set){
    box.innerHTML = '';
    list.forEach(it => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ai-mi' + (set.has(it.id) ? ' on' : '');
      b.textContent = it.label;
      b.addEventListener('click', () => { set.has(it.id) ? set.delete(it.id) : set.add(it.id); buildToggles(box, list, set); renderChips(); });
      box.appendChild(b);
    });
  }
  buildToggles($('aiSkills'), SKILLS, att.skills);
  buildToggles($('aiPlugins'), PLUGINS, att.plugins);

  /* รูปที่แนบ (ย่อให้ด้านยาวไม่เกิน 1024 px เพื่อไม่ให้คำขอใหญ่เกิน) */
  const shrink = (src, w, h) => { const k = Math.min(1, 1024 / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .9); };
  $('aiPickImg').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => {
    [...fileIn.files].forEach(f => {
      const url = URL.createObjectURL(f), im = new Image();
      im.onload = () => { att.images.push({ data:shrink(im, im.naturalWidth, im.naturalHeight), name:f.name }); URL.revokeObjectURL(url); renderChips(); };
      im.src = url;
    });
    fileIn.value = ''; setMenu(false);
  });
  $('aiUseCur').addEventListener('click', () => {
    if (!state.img) { alert('เปิดรูปภาพก่อน'); return; }
    const o = outputSize(), c = makeBase(Math.min(1, 1024 / Math.max(o.w, o.h)));
    att.images.push({ data:c.toDataURL('image/jpeg', .9), name:'ภาพปัจจุบัน' }); renderChips(); setMenu(false);
  });

  /* ป้ายที่แนบอยู่ */
  function renderChips(){
    chips.innerHTML = '';
    const add = (html, remove) => { const s = document.createElement('span'); s.className = 'ai-chip'; s.innerHTML = html;
      const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'เอาออก');
      x.addEventListener('click', () => { remove(); renderChips(); }); s.appendChild(x); chips.appendChild(s); };
    att.images.forEach((im, i) => add('<img alt=""><span></span>', () => att.images.splice(i, 1)));
    [...chips.querySelectorAll('.ai-chip')].forEach((s, i) => { s.querySelector('img').src = att.images[i].data; s.querySelector('span').textContent = att.images[i].name.slice(0, 14); });
    SKILLS.filter(s => att.skills.has(s.id)).forEach(s => add('<span></span>', () => { att.skills.delete(s.id); buildToggles($('aiSkills'), SKILLS, att.skills); }));
    PLUGINS.filter(p => att.plugins.has(p.id)).forEach(p => add('<span></span>', () => { att.plugins.delete(p.id); buildToggles($('aiPlugins'), PLUGINS, att.plugins); }));
    // ใส่ข้อความป้ายสกิล/ปลั๊กอิน (ป้ายพวกนี้อยู่หลังรูป)
    const labels = [...SKILLS.filter(s => att.skills.has(s.id)), ...PLUGINS.filter(p => att.plugins.has(p.id))];
    [...chips.querySelectorAll('.ai-chip')].slice(att.images.length).forEach((s, i) => { s.querySelector('span').textContent = labels[i].label; });
  }

  /* ข้อความในแชต */
  function addMsg(kind, text, imgs){
    $('aiEmpty') && $('aiEmpty').remove();
    const m = document.createElement('div'); m.className = 'ai-msg ' + kind;
    if (text) m.append(text);
    (imgs || []).forEach(src => { const im = new Image(); im.src = src; m.appendChild(im); });
    log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }

  /* เรียก API: POST JSON → รับกลับเป็นไฟล์ภาพ หรือ JSON ที่มี image / url / data[0].b64_json */
  const toBlob = async src => (await fetch(src)).blob();
  async function errText(res){
    let t = '';
    try { const j = await res.json(); t = (j.error && (j.error.message || j.error)) || j.message || JSON.stringify(j); }
    catch (_) { try { t = await res.text(); } catch (_) {} }
    return 'HTTP ' + res.status + (t ? ' · ' + String(t).slice(0, 220) : '');
  }
  async function post(url, headers, body){
    let res;
    try { res = await fetch(url, { method:'POST', headers, body }); }
    catch (_) { throw new Error('เชื่อมต่อไม่ได้ — เช็กอินเทอร์เน็ตและ URL หรือผู้ให้บริการนี้ไม่อนุญาตให้เรียกจากเบราว์เซอร์ (CORS) ให้ใช้ผ่านเซิร์ฟเวอร์ของคุณหรือเลือก OpenRouter'); }
    if (!res.ok) throw new Error(await errText(res));
    return res;
  }
  const baseUrl = p => (p.url || '').replace(/\/+$/, '');
  const aspectNote = req => req.aspect ? ' (aspect ratio ' + req.aspect + ':1)' : '';

  // OpenAI และค่ายที่เข้ากันได้: /images/generations (ไม่มีรูปแนบ) หรือ /images/edits (มีรูปแนบ)
  async function genOpenAI(req, p){
    const base = baseUrl(p), auth = { Authorization:'Bearer ' + p.key }, gpt = /gpt-image/i.test(p.model);
    const size = gpt && req.aspect ? (req.aspect > 1.2 ? '1536x1024' : req.aspect < 0.83 ? '1024x1536' : '1024x1024') : '';
    let res;
    if (req.images.length) {
      const fd = new FormData(); fd.append('model', p.model); fd.append('prompt', req.prompt);
      if (size) fd.append('size', size);
      for (let i = 0; i < req.images.length; i++) fd.append('image[]', await toBlob(req.images[i]), 'ref' + i + '.jpg');
      res = await post(base + '/images/edits', auth, fd);
    } else {
      const b = { model:p.model, prompt:req.prompt, n:1 };
      if (size) b.size = size;
      if (!gpt) b.response_format = 'b64_json';
      res = await post(base + '/images/generations', Object.assign({ 'Content-Type':'application/json' }, auth), JSON.stringify(b));
    }
    const j = await res.json(), d = j.data && j.data[0];
    if (!d) throw new Error('API ไม่ได้ส่งภาพกลับมา');
    return toBlob(d.b64_json ? 'data:image/png;base64,' + d.b64_json : d.url);
  }
  // Google Gemini: generateContent ขอผลลัพธ์เป็นภาพ
  async function genGemini(req, p){
    const parts = [{ text:req.prompt + aspectNote(req) }];
    req.images.forEach(u => parts.push({ inline_data:{ mime_type:'image/jpeg', data:u.split(',')[1] } }));
    const res = await post(baseUrl(p) + '/models/' + encodeURIComponent(p.model) + ':generateContent',
      { 'Content-Type':'application/json', 'x-goog-api-key':p.key },
      JSON.stringify({ contents:[{ parts }], generationConfig:{ responseModalities:['TEXT', 'IMAGE'] } }));
    const j = await res.json(), c = j.candidates && j.candidates[0], ps = (c && c.content && c.content.parts) || [];
    const hit = ps.find(x => x.inlineData || x.inline_data);
    if (!hit) {
      const t = ps.map(x => x.text).filter(Boolean).join(' ') || (j.promptFeedback && j.promptFeedback.blockReason) || (c && c.finishReason) || '';
      throw new Error('โมเดลไม่ได้ส่งภาพกลับมา' + (t ? ' · ' + String(t).slice(0, 220) : ''));
    }
    const d = hit.inlineData || hit.inline_data;
    return toBlob('data:' + (d.mimeType || d.mime_type || 'image/png') + ';base64,' + d.data);
  }
  // OpenRouter: chat/completions + modalities ภาพ
  async function genOpenRouter(req, p){
    const content = [{ type:'text', text:req.prompt + aspectNote(req) }];
    req.images.forEach(u => content.push({ type:'image_url', image_url:{ url:u } }));
    const res = await post(baseUrl(p) + '/chat/completions',
      { 'Content-Type':'application/json', Authorization:'Bearer ' + p.key },
      JSON.stringify({ model:p.model, messages:[{ role:'user', content }], modalities:['image', 'text'] }));
    const j = await res.json(), m = j.choices && j.choices[0] && j.choices[0].message;
    const im = m && m.images && m.images[0], src = im && (im.image_url ? im.image_url.url : im.url);
    if (!src) throw new Error('โมเดลนี้ไม่ได้ส่งภาพกลับมา (ต้องเลือกโมเดลที่สร้างภาพได้)' + (m && m.content ? ' · ' + String(m.content).slice(0, 160) : ''));
    return toBlob(src);
  }
  // เซิร์ฟเวอร์ของคุณเอง: ส่ง JSON ตรงๆ
  async function genCustom(req, p){
    const res = await post(p.url, Object.assign({ 'Content-Type':'application/json' }, p.key ? { Authorization:'Bearer ' + p.key } : {}), JSON.stringify(req));
    if ((res.headers.get('content-type') || '').startsWith('image/')) return res.blob();
    const j = await res.json(), d = j.data && j.data[0];
    const src = j.image || j.url || (d && (d.b64_json ? 'data:image/png;base64,' + d.b64_json : d.url));
    if (!src) throw new Error('รูปแบบผลลัพธ์จาก API ไม่ถูกต้อง');
    return toBlob(src);
  }
  async function generate(req){
    const p = P(), custom = cfg.provider === 'custom';
    if (!p.url || (!custom && (!p.key || !p.model))) throw new Error('NO_SETUP');
    const run = { openai:genOpenAI, compat:genOpenAI, gemini:genGemini, openrouter:genOpenRouter, custom:genCustom }[cfg.provider];
    return run(req, p);
  }

  async function submit(){
    const text = promptEl.value.trim(); if (!text || busy) return;
    const req = { prompt:[text, ...SKILLS.filter(s => att.skills.has(s.id)).map(s => s.prompt)].join(', '),
      images:att.images.map(i => i.data), skills:[...att.skills], plugins:[...att.plugins] };
    PLUGINS.filter(p => att.plugins.has(p.id)).forEach(p => p.apply(req));
    addMsg('user', text, att.images.map(i => i.data));
    promptEl.value = ''; promptEl.style.height = ''; att.images = []; renderChips();
    busy = true; sendBtn.disabled = true;
    const wait = addMsg('bot', 'กำลังสร้างภาพ…');
    try {
      let blob = await generate(req);
      if (!blob.type.startsWith('image/')) blob = new Blob([blob], { type:'image/png' });
      wait.textContent = '';
      const im = new Image(); im.src = URL.createObjectURL(blob); wait.appendChild(im);
      const acts = document.createElement('div'); acts.className = 'ai-acts';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '✏️ แก้ไขต่อ';
      edit.addEventListener('click', () => loadFile(new File([blob], 'ai.png', { type:blob.type })));
      const save = document.createElement('button'); save.type = 'button'; save.textContent = '💾 บันทึก';
      save.addEventListener('click', () => saveBlob(blob, 'ai-image.png'));
      acts.append(edit, save); wait.appendChild(acts);
    } catch (err) {
      wait.classList.add('err');
      if (err.message === 'NO_SETUP') { wait.textContent = 'ยังตั้งค่า AI ไม่ครบ — เลือกผู้ให้บริการ ใส่ชื่อโมเดลและ API key ในเมนู +'; setMenu(true); }
      else wait.textContent = 'สร้างภาพไม่สำเร็จ: ' + err.message;
    } finally { busy = false; sendBtn.disabled = false; log.scrollTop = log.scrollHeight; }
  }
  sendBtn.addEventListener('click', submit);
  promptEl.addEventListener('input', () => { promptEl.style.height = 'auto'; promptEl.style.height = Math.min(promptEl.scrollHeight, 112) + 'px'; });
  // คอมพิวเตอร์: Enter = ส่ง, Shift+Enter = ขึ้นบรรทัดใหม่ (มือถือ Enter = ขึ้นบรรทัดใหม่)
  promptEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && matchMedia('(hover:hover)').matches) { e.preventDefault(); submit(); }
  });
})();
/* ai-chat.js — วางต่อจาก <script src="script.js"> (ไม่ต้องแก้ script.js)
   1) ปุ่ม AI แยกที่หัวเว็บ (ออกจากเมนูวงกลม) + หน้าต่างแชทกลางจอ ~60%
   2) เมนูข้างซ่อนแบบ Google (☰): สร้างแชทใหม่ / สร้างโปรเจกต์ / รายการแชท
   3) ปุ่มบันทึกหลังกรอก API (ไม่บันทึกอัตโนมัติอีกต่อไป) */
(function(){
  const $ = id => document.getElementById(id);
  const win = $('winAI'); if (!win) return;

  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'ai-chat.css';
  document.head.appendChild(css);

  /* ---------- ปุ่ม AI แยก + เอา AI ออกจากเมนูวงกลม ---------- */
  const fabAI = document.querySelector('.fab-item[data-win="winAI"]'); if (fabAI) fabAI.remove();
  const aiBtn = document.createElement('button'); aiBtn.type = 'button'; aiBtn.id = 'aiOpen'; aiBtn.textContent = '🤖 AI';
  document.querySelector('header .row').prepend(aiBtn);
  const closeBtn = w => w.querySelector('.win-close');
  aiBtn.addEventListener('click', () => {
    if (!win.hidden) { closeBtn(win).click(); return; }
    document.querySelectorAll('.win').forEach(w => { if (w !== win && !w.hidden) closeBtn(w).click(); });
    win.classList.remove('out'); win.hidden = false;
  });
  // เปิดหน้าต่างอื่นจากเมนูวงกลม → ปิดแชทก่อน
  document.querySelector('.fab').addEventListener('click', e => {
    if (e.target.closest('.fab-item') && !win.hidden) closeBtn(win).click();
  }, true);

  /* ---------- เมนูข้าง (drawer) ---------- */
  const burger = document.createElement('button'); burger.type = 'button'; burger.className = 'ai-burger';
  burger.setAttribute('aria-label', 'เมนูแชท'); burger.textContent = '☰';
  win.querySelector('.win-head').prepend(burger);
  const scrim = document.createElement('div'); scrim.className = 'ai-scrim'; scrim.hidden = true;
  const drawer = document.createElement('nav'); drawer.className = 'ai-drawer'; drawer.setAttribute('aria-label', 'เมนูแชท');
  drawer.innerHTML = '<button type="button" class="ai-mi" id="aiNewChat">✏️ สร้างแชทใหม่</button>' +
    '<button type="button" class="ai-mi" id="aiNewProj">📁 สร้างโปรเจกต์</button><div id="aiChatList"></div>';
  win.append(scrim, drawer);
  const setDrawer = o => { drawer.classList.toggle('open', o); scrim.hidden = !o; };
  burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  scrim.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || win.hidden) return;
    if (drawer.classList.contains('open')) setDrawer(false); else closeBtn(win).click();
  });

  /* ---------- หลายแชท + โปรเจกต์ (เก็บไว้ระหว่างเปิดหน้านี้อยู่) ---------- */
  const log = $('aiLog'), list = $('aiChatList');
  const chats = [], projects = []; let cur = null, curProj = null, seq = 0;
  const empty = () => { const p = document.createElement('p'); p.className = 'size-info'; p.id = 'aiEmpty';
    p.textContent = 'พิมพ์สิ่งที่อยากให้สร้าง แล้วกดส่ง'; return p; };
  const stash = () => { if (cur) cur.nodes = [...log.childNodes]; };
  const show = nodes => { log.replaceChildren(...(nodes.length ? nodes : [empty()])); log.scrollTop = log.scrollHeight; };
  function fresh(){ stash(); cur = null; show([]); setDrawer(false); render(); }
  function open(c){ stash(); cur = c; curProj = c.proj; show(c.nodes); setDrawer(false); render(); }
  const mk = (txt, fn, on, sub) => { const b = document.createElement('button'); b.type = 'button';
    b.className = 'ai-mi' + (on ? ' on' : '') + (sub ? ' sub' : ''); b.textContent = txt; b.addEventListener('click', fn); return b; };
  function render(){
    list.replaceChildren();
    projects.forEach(p => {
      list.append(mk('📁 ' + p.name, () => { curProj = p.id; fresh(); }, curProj === p.id && !cur));
      chats.filter(c => c.proj === p.id).forEach(c => list.append(mk('💬 ' + c.title, () => open(c), c === cur, true)));
    });
    const loose = chats.filter(c => !c.proj);
    if (loose.length) { const h = document.createElement('h4'); h.textContent = 'แชท'; list.append(h);
      loose.forEach(c => list.append(mk('💬 ' + c.title, () => open(c), c === cur))); }
    if (!projects.length && !chats.length) { const p = document.createElement('p'); p.className = 'size-info'; p.textContent = 'ยังไม่มีแชท'; list.append(p); }
  }
  $('aiNewChat').addEventListener('click', () => { curProj = null; fresh(); });
  $('aiNewProj').addEventListener('click', () => {
    const n = (prompt('ชื่อโปรเจกต์') || '').trim(); if (!n) return;
    const p = { id:'p' + (++seq), name:n.slice(0, 40) }; projects.push(p); curProj = p.id; fresh();
  });
  // ข้อความแรกของแชทใหม่ → สร้างรายการแชท (ตั้งชื่อจากข้อความนั้น)
  new MutationObserver(() => {
    if (cur) return;
    const u = log.querySelector('.ai-msg.user'); if (!u) return;
    const t = (u.firstChild ? u.firstChild.textContent : '').trim().slice(0, 28) || 'แชท';
    cur = { id:++seq, title:t, proj:curProj, nodes:[] }; chats.push(cur); render();
  }).observe(log, { childList:true });
  render();

  /* ---------- ปุ่มบันทึก API ---------- */
  const save = document.createElement('button'); save.type = 'button'; save.className = 'primary ai-save'; save.textContent = '💾 บันทึก';
  $('aiHint').after(save);
  const fields = ['aiModel', 'aiEndpoint', 'aiKey']; let saving = false;
  // กันไม่ให้ช่องกรอกบันทึกเองทุกตัวอักษร (ให้บันทึกเฉพาะตอนกดปุ่ม)
  $('aiMenu').addEventListener('input', e => { if (!saving && fields.includes(e.target.id)) e.stopPropagation(); }, true);
  save.addEventListener('click', () => {
    saving = true; fields.forEach(id => $(id).dispatchEvent(new Event('input', { bubbles:true }))); saving = false;
    save.textContent = '✓ บันทึกแล้ว';
    setTimeout(() => { save.textContent = '💾 บันทึก'; if (!$('aiMenu').hidden) $('aiPlus').click(); }, 900);
  });
})();
