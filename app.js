'use strict';
/* Novedades Sueldos — agenda para liquidar sueldos. Todo se guarda en el dispositivo (localStorage). */
const KEY = 'novedades-sueldos-v1';
const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const CHIPS = ['Vacaciones', 'Lic. enfermedad', 'Lic. maternidad', 'Horas extra', 'Feriado trabajado', 'Adelanto', 'Faltas',
  'Pierde presentismo', 'Alta', 'Baja / despido', 'Renuncia', 'Aumento', 'SAC', 'Embargo', 'Cambio categoría', 'Sin novedad'];

let db = load();
let tab = localStorage.getItem(KEY + ':tab') || 'control';
let periodo = localStorage.getItem(KEY + ':periodo') || hoyPeriodo();
let fichaSel = { cli: '', emp: '', anio: periodo.slice(0, 4) };
let filtro = '';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function hoyPeriodo() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function vacio() { return { version: 1, clientes: [], empleados: [], novedades: {}, control: {}, notas: '', notasMes: {} }; }
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.version) return d; } catch { } return null; }
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { db.guardado = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { toast('No se pudo guardar: ' + e.message); }
  }, 250);
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200); }
function nombrePeriodo(p) { const [y, m] = p.split('-'); return `${MESES[+m - 1]} ${y}`; }
function sumarMes(p, n) { let [y, m] = p.split('-').map(Number); m += n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${String(m).padStart(2, '0')}`; }
function fechaAR(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
function antiguedad(iso, p) {
  if (!iso) return null; const [y, m] = iso.split('-').map(Number); const [py, pm] = p.split('-').map(Number);
  let a = py - y; if (pm < m) a--; return a;
}
// Avisos del mes para un empleado: aniversario de antigüedad y cumpleaños
function eventos(e, p) {
  const out = []; const m = p.slice(5, 7);
  if (e.ingreso && e.ingreso.slice(5, 7) === m) {
    const a = antiguedad(e.ingreso, p);
    if (a > 0) out.push({ tipo: 'antig', txt: `🎉 Cumple ${a} año${a > 1 ? 's' : ''} de antigüedad el ${fechaAR(e.ingreso).slice(0, 5)}` });
  }
  if (e.nacimiento && e.nacimiento.slice(5, 7) === m) {
    const edad = antiguedad(e.nacimiento, p);
    out.push({ tipo: 'cumple', txt: `🎂 Cumple ${edad} años el ${fechaAR(e.nacimiento).slice(0, 5)}` });
  }
  return out;
}
const avisosHTML = (e, p) => eventos(e, p).map(v => `<span class="aviso ${v.tipo}">${esc(v.txt)}</span>`).join('');
function atajos() { return db.atajos?.length ? db.atajos : CHIPS; }
function clientesOrd() { return db.clientes; }
function empsDe(cid, soloActivos = true) { return db.empleados.filter(e => e.clienteId === cid && (!soloActivos || e.activo)); }
function activoEn(e, p) {
  if (e.ingreso && e.ingreso.slice(0, 7) > p) return false;
  if (e.baja && e.baja.slice(0, 7) < p) return false;
  return true;
}
function nov(eid, p, crear) {
  if (!db.novedades[eid]) { if (!crear) return { hecho: false, texto: '' }; db.novedades[eid] = {}; }
  if (!db.novedades[eid][p]) { if (!crear) return { hecho: false, texto: '' }; db.novedades[eid][p] = { hecho: false, texto: '' }; }
  return db.novedades[eid][p];
}
function ctl(cid, p, crear) {
  const base = { recibos: false, confirmado: false, f931: false, nota: '' };
  if (!db.control[p]) { if (!crear) return base; db.control[p] = {}; }
  if (!db.control[p][cid]) { if (!crear) return base; db.control[p][cid] = { ...base }; }
  return db.control[p][cid];
}

/* ---------- Render ---------- */
function render() {
  $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#periodo').value = periodo;
  const v = $('#view');
  if (!db) { v.innerHTML = vistaBienvenida(); return; }
  v.innerHTML = ({ control: vistaControl, novedades: vistaNovedades, fichas: vistaFichas, empleados: vistaEmpleados, notas: vistaNotas })[tab]();
}

function vistaBienvenida() {
  return `<div class="card"><div class="card-h"><h2>Bienvenido</h2></div><div class="card-b">
    <p>Esta app guarda todo en este dispositivo. Para empezar podés cargar los empleados leídos de los recibos de <b>agosto 2026</b>
    (piden la contraseña que te pasaron), importar un respaldo, o arrancar vacío.</p>
    <div class="row">
      <button class="btn primary" data-act="cargar-semilla">Cargar datos agosto 2026</button>
      <button class="btn" data-act="importar">Importar respaldo (.json)</button>
      <button class="btn" data-act="vacio">Empezar vacío</button>
    </div></div></div>`;
}

function vistaControl() {
  const cs = clientesOrd();
  let tot = 0, ok = 0;
  const filas = cs.map(c => {
    const k = ctl(c.id, periodo);
    const n = [k.recibos, k.confirmado, k.f931].filter(Boolean).length; tot += 3; ok += n;
    const nEmp = empsDe(c.id).filter(e => activoEn(e, periodo)).length;
    const conNov = empsDe(c.id).filter(e => nov(e.id, periodo).texto).length;
    const nAv = empsDe(c.id).reduce((t, e) => t + eventos(e, periodo).length, 0);
    return `<tr class="${n === 3 ? 'done' : ''}">
      <td><div class="emp-name link" data-act="edit-cli" data-id="${c.id}" title="Editar empleador">${esc(c.nombre)} <span class="pen">✎</span></div>
        <div class="small muted">${esc(c.convenio)} · ${nEmp} emp.${nAv ? ` · <span class="tag warn">🎉 ${nAv}</span>` : ''}${conNov ? ` · <span class="tag warn">${conNov} novedad${conNov > 1 ? 'es' : ''}</span>` : ''}</div>
        <div class="nota-mini" data-act="nota-ctl" data-id="${c.id}">${esc(k.nota)}</div></td>
      <td class="chk"><input type="checkbox" class="tick" data-ctl="recibos" data-id="${c.id}" ${k.recibos ? 'checked' : ''} aria-label="Recibos"></td>
      <td class="chk"><input type="checkbox" class="tick" data-ctl="confirmado" data-id="${c.id}" ${k.confirmado ? 'checked' : ''} aria-label="Confirmado"></td>
      <td class="chk"><input type="checkbox" class="tick" data-ctl="f931" data-id="${c.id}" ${k.f931 ? 'checked' : ''} aria-label="F931 y comprobantes"></td></tr>`;
  }).join('');
  const listos = cs.filter(c => { const k = ctl(c.id, periodo); return k.recibos && k.confirmado && k.f931; }).length;
  const pct = tot ? Math.round(ok / tot * 100) : 0;
  return `<h2>Control ${esc(nombrePeriodo(periodo))}</h2>
    <div class="stats">
      <div class="stat"><b>${listos}/${cs.length}</b><span>empleadores listos</span></div>
      <div class="stat"><b>${pct}%</b><span>avance del mes</span></div>
      <div class="stat"><b>${db.empleados.filter(e => e.activo && activoEn(e, periodo)).length}</b><span>empleados activos</span></div>
    </div>
    <div class="progress" style="margin-bottom:12px"><div style="width:${pct}%"></div></div>
    <div class="card"><div class="card-b" style="padding-top:4px">
    ${cs.length ? `<table class="ctl-table"><thead><tr><th>Empleador</th><th>Recibos</th><th>Confirm.</th><th>F931 y comp.</th></tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="empty">No hay empleadores todavía.</div>`}
    <div class="row" style="margin-top:10px"><button class="btn sm" data-act="nuevo-cli">+ Agregar empleador</button></div>
    </div></div>`;
}

function alertasMes() {
  const out = []; const [, m] = periodo.split('-').map(Number);
  if (m === 6 || m === 12) out.push(`<b>SAC:</b> este mes corresponde liquidar el aguinaldo (${m === 6 ? '1ra' : '2da'} cuota).`);
  if (m === 10) out.push('<b>Vacaciones:</b> antes del 30/9 se debía comunicar el período de vacaciones (temporada 1/10 al 30/4).');
  for (const e of db.empleados) {
    if (!e.activo || !e.ingreso) continue;
    const cli = db.clientes.find(c => c.id === e.clienteId)?.nombre || '';
    if (e.ingreso.slice(0, 7) === periodo) out.push(`<b>Alta:</b> ${esc(e.nombre)} (${esc(cli)}) ingresó el ${fechaAR(e.ingreso)}.`);
    else if (+e.ingreso.slice(5, 7) === m) {
      const a = antiguedad(e.ingreso, periodo);
      if (a > 0) out.push(`<b>Antigüedad:</b> ${esc(e.nombre)} (${esc(cli)}) cumple ${a} año${a > 1 ? 's' : ''} el ${fechaAR(e.ingreso).slice(0, 5)}.`);
    }
    if (e.nacimiento && e.nacimiento.slice(5, 7) === periodo.slice(5, 7)) out.push(`<b>Cumpleaños:</b> ${esc(e.nombre)} (${esc(cli)}) cumple ${antiguedad(e.nacimiento, periodo)} años el ${fechaAR(e.nacimiento).slice(0, 5)}.`);
    if (e.baja && e.baja.slice(0, 7) === periodo) out.push(`<b>Baja:</b> ${esc(e.nombre)} (${esc(cli)}) el ${fechaAR(e.baja)} — liquidación final.`);
  }
  return out;
}

function vistaNovedades() {
  const al = alertasMes();
  const q = filtro.toLowerCase();
  const bloques = clientesOrd().map(c => {
    let emps = empsDe(c.id).filter(e => activoEn(e, periodo) || nov(e.id, periodo).texto);
    if (q) emps = emps.filter(e => (e.nombre + ' ' + e.empleador + ' ' + c.nombre).toLowerCase().includes(q));
    if (!emps.length && q) return '';
    const hechos = emps.filter(e => nov(e.id, periodo).hecho).length;
    const conTxt = emps.filter(e => nov(e.id, periodo).texto).length;
    const items = emps.map(e => {
      const n = nov(e.id, periodo);
      const a = antiguedad(e.ingreso, periodo);
      return `<div class="nov-emp">
        <input type="checkbox" class="tick" data-nov-hecho="${e.id}" ${n.hecho ? 'checked' : ''} title="Liquidado" aria-label="Liquidado">
        <div class="grow">
          <div class="row"><div class="who grow">${esc(e.nombre)}</div>
            <button type="button" class="mini" data-act="edit-emp" data-id="${e.id}" title="Editar empleado">✎</button>
            ${n.texto || n.hecho ? `<button type="button" class="mini" data-act="clr-nov" data-id="${e.id}" title="Borrar novedad del mes">🗑</button>` : ''}</div>
          <div class="meta">${c.convenio === 'DOMESTICOS' || e.empleador !== c.razon ? esc(e.empleador) + ' · ' : ''}${esc(e.tarea)}${a !== null ? ` · ${a} año${a === 1 ? '' : 's'} antig.` : ''}</div>
          ${avisosHTML(e, periodo)}
          <textarea rows="1" data-nov-txt="${e.id}" placeholder="Novedad del mes…">${esc(n.texto)}</textarea>
          <div class="chips">${atajos().map(ch => `<button type="button" class="chip" data-chip="${esc(ch)}" data-emp="${e.id}">${esc(ch)}</button>`).join('')}</div>
        </div></div>`;
    }).join('');
    const nAv = emps.reduce((t, e) => t + eventos(e, periodo).length, 0);
    return `<details class="card cli" ${q || conTxt || nAv ? 'open' : ''}><summary class="card-h">
        <span class="chev">▶</span><h3 class="grow">${esc(c.nombre)}</h3>
        ${nAv ? `<span class="tag warn">🎉 ${nAv}</span>` : ''}${conTxt ? `<span class="tag warn">${conTxt}</span>` : ''}
        <span class="tag ${hechos === emps.length && emps.length ? 'ok' : ''}">${hechos}/${emps.length}</span></summary>
      <div class="card-b">${items || '<div class="muted small">Sin empleados activos.</div>'}
        <div class="row" style="margin-top:8px;border-top:1px solid var(--line);padding-top:8px">
          <button type="button" class="btn sm" data-act="nuevo-emp" data-id="${c.id}">+ Agregar empleado</button>
          <button type="button" class="btn sm" data-act="edit-cli" data-id="${c.id}">✎ Editar empleador</button></div></div></details>`;
  }).join('');
  return `<h2>Novedades ${esc(nombrePeriodo(periodo))}</h2>
    ${al.length ? `<div class="alerts">${al.map(a => `<div class="alert">${a}</div>`).join('')}</div>` : ''}
    <div class="card"><div class="card-h"><h3>Notas generales del mes</h3></div><div class="card-b">
      <textarea rows="2" data-nota-mes placeholder="Ej: aumento paritaria comercio, suma fija, feriados…">${esc(db.notasMes[periodo] || '')}</textarea></div></div>
    <input class="search" type="search" placeholder="Buscar empleado o empleador…" value="${esc(filtro)}" data-filtro style="width:100%;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:9px 12px">
    ${bloques || '<div class="empty">Sin resultados.</div>'}
    <div class="row"><button class="btn sm" data-act="nuevo-cli">+ Agregar empleador</button></div>
    <p class="small muted">✓ = liquidado. ✎ edita el empleado, 🗑 borra la novedad del mes. Todo se guarda solo en este dispositivo.</p>`;
}

function vistaFichas() {
  const cs = clientesOrd();
  if (!fichaSel.cli || !cs.find(c => c.id === fichaSel.cli)) fichaSel.cli = cs[0]?.id || '';
  const emps = db.empleados.filter(e => e.clienteId === fichaSel.cli);
  if (!emps.find(e => e.id === fichaSel.emp)) fichaSel.emp = emps[0]?.id || '';
  const e = db.empleados.find(x => x.id === fichaSel.emp);
  const c = cs.find(x => x.id === fichaSel.cli);
  const anio = +fichaSel.anio;
  const tabla = (y) => MESES.map((mn, i) => {
    const p = `${y}-${String(i + 1).padStart(2, '0')}`; const n = nov(e.id, p);
    return `<tr><td class="mes">${mn}</td><td class="x"><input type="checkbox" class="tick" data-nov-hecho="${e.id}" data-p="${p}" ${n.hecho ? 'checked' : ''} aria-label="Liquidado ${mn}"></td>
      <td>${avisosHTML(e, p)}<input class="cell" data-nov-txt="${e.id}" data-p="${p}" value="${esc(n.texto)}" aria-label="Novedad ${mn}"></td>
      <td class="x no-print">${n.texto || n.hecho ? `<button type="button" class="mini" data-act="clr-nov" data-id="${e.id}" data-p="${p}" title="Borrar ${mn}">🗑</button>` : ''}</td></tr>`;
  }).join('');
  return `<h2>Ficha anual</h2>
    <div class="card no-print"><div class="card-b" style="padding-top:12px">
      <div class="grid2">
        <div><label class="f">Empleador</label><select data-ficha="cli">${cs.map(x => `<option value="${x.id}" ${x.id === fichaSel.cli ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></div>
        <div><label class="f">Empleado</label><select data-ficha="emp">${emps.map(x => `<option value="${x.id}" ${x.id === fichaSel.emp ? 'selected' : ''}>${esc(x.nombre)}${x.activo ? '' : ' (baja)'}</option>`).join('')}</select></div>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn sm" data-act="anio" data-d="-1">‹ ${anio - 1}</button><b>${anio}</b><button class="btn sm" data-act="anio" data-d="1">${anio + 1} ›</button>
        <span class="grow"></span>${e ? `<button class="btn sm" data-act="edit-emp" data-id="${e.id}">✎ Editar empleado</button>` : ''}
        <button class="btn sm" data-act="nuevo-emp" data-id="${fichaSel.cli}">+ Empleado</button>
        <button class="btn sm" data-act="imprimir">Imprimir</button>
      </div></div></div>
    ${e ? `<div class="card"><div class="card-b" style="padding-top:14px">
      <h2 style="text-align:center;margin-bottom:6px">${esc(c.razon || c.nombre)}</h2>
      <div class="ficha-head">
        <div><b>Empleado:</b> ${esc(e.nombre)}</div><div><b>CUIL:</b> ${esc(e.cuil)}</div>
        <div><b>Empleador:</b> ${esc(e.empleador)} ${esc(e.cuitEmpleador)}</div><div><b>Jornada:</b> ${esc(e.jornada)}</div>
        <div><b>Fecha ingreso:</b> ${fechaAR(e.ingreso)} ${e.ingreso ? `(${antiguedad(e.ingreso, `${anio}-12`)} años a dic.)` : ''}</div><div><b>Tarea:</b> ${esc(e.tarea)}</div>
        <div><b>Convenio:</b> ${esc(e.convenio)}</div>${e.nacimiento ? `<div><b>Nacimiento:</b> ${fechaAR(e.nacimiento)}</div>` : ''}${e.legajo ? `<div><b>Legajo:</b> ${esc(e.legajo)}</div>` : ''}
        ${e.obs ? `<div style="grid-column:1/-1"><b>Obs.:</b> ${esc(e.obs)}</div>` : ''}
      </div>
      <table class="ficha"><thead><tr><th>Meses</th><th class="x">Liq.</th><th>Novedad</th><th class="x no-print"></th></tr></thead>
        <tbody><tr><td colspan="4" class="year">${anio}</td></tr>${tabla(anio)}</tbody></table>
    </div></div>` : '<div class="empty">No hay empleados para este empleador.</div>'}`;
}

function vistaEmpleados() {
  const cs = clientesOrd();
  return `<div class="row" style="margin-bottom:12px"><h2 class="grow" style="margin:0">Empleadores y empleados</h2>
      <button class="btn primary" data-act="nuevo-cli">+ Empleador</button></div>
    ${cs.map((c, i) => {
      const emps = db.empleados.filter(e => e.clienteId === c.id);
      return `<details class="card cli"><summary class="card-h"><span class="chev">▶</span>
        <div class="grow"><h3>${esc(c.nombre)}</h3><div class="small muted">${esc(c.convenio)}${c.cuit ? ' · ' + esc(c.cuit) : ''}</div></div>
        <span class="tag">${emps.filter(e => e.activo).length}</span></summary>
        <div class="card-b">
          <div class="row" style="margin-bottom:6px">
            <button class="btn sm" data-act="edit-cli" data-id="${c.id}">Editar</button>
            <button class="btn sm" data-act="nuevo-emp" data-id="${c.id}">+ Empleado</button>
            <button class="btn sm" data-act="subir-cli" data-id="${c.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn sm" data-act="bajar-cli" data-id="${c.id}" ${i === cs.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
          ${c.notas ? `<div class="small muted" style="margin-bottom:6px">${esc(c.notas)}</div>` : ''}
          <div class="emp-list">${emps.map(e => `<div class="emp-item ${e.activo ? '' : 'inactivo'}">
            <div class="grow"><div class="emp-name">${esc(e.nombre)}</div>
            <div class="small muted">${esc(e.cuil)} · ${esc(e.tarea)} · ingreso ${fechaAR(e.ingreso)}${e.activo ? '' : ' · BAJA ' + fechaAR(e.baja)}</div></div>
            <button class="btn sm" data-act="edit-emp" data-id="${e.id}">Editar</button></div>`).join('') || '<div class="muted small">Sin empleados.</div>'}</div>
        </div></details>`;
    }).join('')}
    <div class="card"><div class="card-h"><h3>Datos y respaldo</h3></div><div class="card-b">
      <p class="small muted">Los datos quedan guardados sólo en este dispositivo${db.guardado ? ` (último guardado ${new Date(db.guardado).toLocaleString('es-AR')})` : ''}.
      Exportá un respaldo seguido y usalo para pasar la info entre la compu y el celu.</p>
      <div class="row">
        <button class="btn primary" data-act="exportar">Exportar respaldo</button>
        <button class="btn" data-act="importar">Importar respaldo</button>
        <button class="btn" data-act="cargar-semilla">Recargar datos agosto 2026</button>
        <button class="btn danger" data-act="borrar-todo">Borrar todo</button>
      </div></div></div>`;
}

function vistaNotas() {
  return `<h2>Notas</h2><div class="card"><div class="card-b" style="padding-top:12px">
    <textarea data-notas rows="18" style="min-height:360px">${esc(db.notas)}</textarea>
    <p class="small muted">Conceptos, códigos de VEP, vencimientos, recordatorios… Se guarda automáticamente.</p></div></div>
    <div class="card"><div class="card-h"><h3 class="grow">Atajos de novedades</h3><button class="btn sm" data-act="edit-atajos">✎ Editar</button></div>
      <div class="card-b"><div class="chips" style="display:flex">${atajos().map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div></div></div>`;
}

/* ---------- Diálogos ---------- */
function dialogo(titulo, cuerpo, { ok = 'Guardar', extra = '' } = {}) {
  const dlg = $('#dlg'), f = $('#dlgForm');
  // Botón oculto primero: Enter siempre equivale a "Guardar", nunca a Eliminar/Cancelar
  f.innerHTML = `<button value="ok" hidden aria-hidden="true" tabindex="-1"></button><h2>${esc(titulo)}</h2>${cuerpo}<div class="dlg-actions">${extra}<span class="grow"></span>
    <button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="ok">${esc(ok)}</button></div>`;
  dlg.showModal();
  return new Promise(res => {
    dlg.onclose = () => {
      const v = dlg.returnValue; if (v === 'cancel' || !v) return res(null);
      res({ accion: v, datos: Object.fromEntries(new FormData(f)) });
    };
  });
}
const campo = (name, label, val = '', type = 'text', attrs = '') => `<div><label class="f" for="f_${name}">${label}</label><input id="f_${name}" name="${name}" type="${type}" value="${esc(val)}" ${attrs}></div>`;

async function editarCliente(c) {
  const nuevo = !c; c = c || { id: uid('c'), nombre: '', convenio: '', cuit: '', razon: '', notas: '' };
  const r = await dialogo(nuevo ? 'Nuevo empleador' : 'Editar empleador', `<div class="grid2">
    ${campo('nombre', 'Nombre (como en la planilla)', c.nombre, 'text', 'required')}${campo('convenio', 'Convenio', c.convenio)}
    ${campo('razon', 'Razón social', c.razon)}${campo('cuit', 'CUIT', c.cuit)}</div>
    <label class="f" for="f_notas">Notas del empleador</label><textarea id="f_notas" name="notas" rows="3">${esc(c.notas)}</textarea>`,
    { extra: nuevo ? '' : '<button class="btn danger" value="del" formnovalidate>Eliminar</button>' });
  if (!r) return;
  if (r.accion === 'del') {
    if (db.empleados.some(e => e.clienteId === c.id)) return toast('Primero mové o eliminá sus empleados');
    if (!confirm(`¿Eliminar ${c.nombre}?`)) return;
    db.clientes = db.clientes.filter(x => x.id !== c.id);
  } else {
    Object.assign(c, r.datos); c.nombre = c.nombre.trim().toUpperCase();
    if (nuevo) db.clientes.push(c);
  }
  save(); render();
}

async function editarEmpleado(e, clienteId) {
  const nuevo = !e;
  const cli = db.clientes.find(c => c.id === (e?.clienteId || clienteId));
  e = e || { id: uid('e'), clienteId, nombre: '', cuil: '', empleador: cli?.razon || cli?.nombre || '', cuitEmpleador: cli?.cuit || '', legajo: '',
    ingreso: '', tarea: '', convenio: cli?.convenio || '', jornada: 'MENSUAL', activo: true, baja: '', obs: '' };
  const r = await dialogo(nuevo ? 'Nuevo empleado' : 'Editar empleado', `<div class="grid2">
    ${campo('nombre', 'Apellido y nombre', e.nombre, 'text', 'required')}${campo('cuil', 'CUIL', e.cuil)}
    ${campo('ingreso', 'Fecha de ingreso', e.ingreso, 'date')}${campo('nacimiento', 'Fecha de nacimiento', e.nacimiento || '', 'date')}${campo('tarea', 'Tarea / categoría', e.tarea)}
    ${campo('convenio', 'Convenio', e.convenio)}${campo('jornada', 'Jornada / modalidad', e.jornada)}
    ${campo('empleador', 'Empleador (razón social)', e.empleador)}${campo('cuitEmpleador', 'CUIT empleador', e.cuitEmpleador)}
    ${campo('legajo', 'Legajo', e.legajo)}
    <div><label class="f" for="f_cli">Grupo / planilla</label><select id="f_cli" name="clienteId">${db.clientes.map(c => `<option value="${c.id}" ${c.id === e.clienteId ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div>
    ${campo('baja', 'Fecha de baja (si corresponde)', e.baja, 'date')}</div>
    <label class="f" for="f_obs">Observaciones</label><textarea id="f_obs" name="obs" rows="2">${esc(e.obs)}</textarea>`,
    { extra: nuevo ? '' : '<button class="btn danger" value="del" formnovalidate>Eliminar</button>' });
  if (!r) return;
  if (r.accion === 'del') {
    if (!confirm(`¿Eliminar a ${e.nombre} y todo su historial? (Si dejó de trabajar, mejor cargá la fecha de baja)`)) return;
    db.empleados = db.empleados.filter(x => x.id !== e.id); delete db.novedades[e.id];
  } else {
    Object.assign(e, r.datos); e.nombre = e.nombre.trim().toUpperCase(); e.activo = !e.baja;
    if (nuevo) db.empleados.push(e);
  }
  save(); render();
}

async function cargarSemilla() {
  if (db && !confirm('Esto reemplaza los datos actuales de este dispositivo por los de agosto 2026. ¿Seguir?')) return;
  const r = await dialogo('Cargar datos agosto 2026', `<p class="small muted">Los datos de los recibos están cifrados. Ingresá la contraseña.</p>
    ${campo('pass', 'Contraseña', '', 'password', 'required autocomplete="off"')}`, { ok: 'Cargar' });
  if (!r) return;
  try {
    const enc = await (await fetch('data/seed.enc.json', { cache: 'no-cache' })).json();
    const b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(r.datos.pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(enc.iv) }, key, b(enc.data));
    db = JSON.parse(new TextDecoder().decode(plano)); save(); render(); toast('Datos cargados');
  } catch (e) { toast('Contraseña incorrecta o sin conexión'); }
}

function exportar() {
  const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `novedades-sueldos-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importar() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    try {
      const d = JSON.parse(await i.files[0].text());
      if (!d.version || !Array.isArray(d.empleados)) throw 0;
      if (db && !confirm('¿Reemplazar los datos actuales por el respaldo?')) return;
      db = d; save(); render(); toast('Respaldo importado');
    } catch { toast('Archivo no válido'); }
  };
  i.click();
}

/* ---------- Eventos ---------- */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-act],[data-chip],.tabs button'); if (!t) return;
  if (t.matches('.tabs button')) { tab = t.dataset.tab; localStorage.setItem(KEY + ':tab', tab); render(); scrollTo(0, 0); return; }
  if (t.dataset.chip) {
    const n = nov(t.dataset.emp, periodo, true); const ch = t.dataset.chip;
    n.texto = n.texto ? n.texto.replace(/\s+$/, '') + ' · ' + ch : ch; save();
    const ta = $(`textarea[data-nov-txt="${t.dataset.emp}"]`); ta.value = n.texto; ta.focus(); autosize(ta); return;
  }
  const act = t.dataset.act, id = t.dataset.id;
  if (act === 'cargar-semilla') cargarSemilla();
  else if (act === 'importar') importar();
  else if (act === 'exportar') exportar();
  else if (act === 'vacio') { db = vacio(); save(); tab = 'empleados'; render(); }
  else if (act === 'borrar-todo') { if (confirm('¿Borrar TODOS los datos de este dispositivo? Exportá un respaldo antes.')) { localStorage.removeItem(KEY); db = null; render(); } }
  else if (act === 'nuevo-cli') editarCliente();
  else if (act === 'edit-cli') editarCliente(db.clientes.find(c => c.id === id));
  else if (act === 'nuevo-emp') editarEmpleado(null, id);
  else if (act === 'edit-emp') editarEmpleado(db.empleados.find(e => e.id === id));
  else if (act === 'subir-cli' || act === 'bajar-cli') {
    const i = db.clientes.findIndex(c => c.id === id), j = i + (act === 'subir-cli' ? -1 : 1);
    [db.clientes[i], db.clientes[j]] = [db.clientes[j], db.clientes[i]]; save(); render();
    $$('details.cli')[j]?.setAttribute('open', '');
  }
  else if (act === 'nota-ctl') {
    const k = ctl(id, periodo, true); const c = db.clientes.find(x => x.id === id);
    const r = await dialogo(`Nota · ${c.nombre}`, `<textarea name="nota" rows="4" style="margin-top:8px">${esc(k.nota)}</textarea>`,
      { extra: k.nota ? '<button class="btn danger" value="del" formnovalidate>Borrar</button>' : '' });
    if (r) { k.nota = r.accion === 'del' ? '' : r.datos.nota.trim(); save(); render(); }
  }
  else if (act === 'clr-nov') {
    const p = t.dataset.p || periodo; const e = db.empleados.find(x => x.id === id);
    if (!confirm(`¿Borrar la novedad de ${e.nombre} (${nombrePeriodo(p)})?`)) return;
    delete db.novedades[id]?.[p]; save(); render(); toast('Novedad borrada');
  }
  else if (act === 'edit-atajos') {
    const r = await dialogo('Atajos de novedades', `<p class="small muted">Uno por renglón. Aparecen como botones al escribir una novedad.</p>
      <textarea name="atajos" rows="12">${esc(atajos().join('\n'))}</textarea>`, { extra: '<button class="btn" value="reset" formnovalidate>Restaurar</button>' });
    if (!r) return;
    db.atajos = r.accion === 'reset' ? null : r.datos.atajos.split('\n').map(x => x.trim()).filter(Boolean); save(); render();
  }
  else if (act === 'anio') { fichaSel.anio = String(+fichaSel.anio + +t.dataset.d); render(); }
  else if (act === 'imprimir') print();
});

// Evita que el textarea pierda el foco (y se oculten los atajos) al tocar un atajo
document.addEventListener('pointerdown', ev => { if (ev.target.closest('.chip')) ev.preventDefault(); });

document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.ctl) { ctl(t.dataset.id, periodo, true)[t.dataset.ctl] = t.checked; save(); render(); }
  else if (t.dataset.novHecho) {
    nov(t.dataset.novHecho, t.dataset.p || periodo, true).hecho = t.checked; save();
    if (tab === 'novedades') render();
  }
  else if (t.dataset.ficha) { fichaSel[t.dataset.ficha] = t.value; render(); }
});

document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.novTxt) { nov(t.dataset.novTxt, t.dataset.p || periodo, true).texto = t.value; save(); if (t.tagName === 'TEXTAREA') autosize(t); }
  else if (t.hasAttribute('data-nota-mes')) { db.notasMes[periodo] = t.value; save(); }
  else if (t.hasAttribute('data-notas')) { db.notas = t.value; save(); }
  else if (t.hasAttribute('data-filtro')) {
    filtro = t.value; render(); const s = $('[data-filtro]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
  }
});

function autosize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }
new MutationObserver(() => $$('textarea[data-nov-txt]').forEach(autosize)).observe($('#view'), { childList: true });

function setPeriodo(p) { if (!p) return; periodo = p; localStorage.setItem(KEY + ':periodo', p); fichaSel.anio = p.slice(0, 4); render(); }
$('#periodo').addEventListener('change', e => setPeriodo(e.target.value));
$('#prevMes').onclick = () => setPeriodo(sumarMes(periodo, -1));
$('#nextMes').onclick = () => setPeriodo(sumarMes(periodo, 1));

/* ---------- Instalación (PWA) ---------- */
let promptInstalar;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptInstalar = e; $('#btnInstalar').hidden = false; });
$('#btnInstalar').onclick = async () => { if (!promptInstalar) return; promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; $('#btnInstalar').hidden = true; };
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
if (navigator.storage?.persist) navigator.storage.persist();

render();
