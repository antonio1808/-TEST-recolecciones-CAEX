// Configuración del cliente. En producción la key no viviría en el navegador
// (se usaría un backend-for-frontend o autenticación de usuario).
const API_URL = '/api/recolecciones';
const API_KEY = 'caex-demo-key-2026';

const DEPARTAMENTOS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla',
  'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango',
  'Quiché', 'Retalhuleu', 'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá',
  'Suchitepéquez', 'Totonicapán', 'Zacapa',
];

// Flujo normal para dibujar los pasos que aún no ocurren
const FLUJO = ['Pendiente de Asignación', 'Recolector en Camino', 'Recolectado'];

const $ = sel => document.querySelector(sel);

async function api(path, options = {}) {
  const res = await fetch(API_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalle = data.detalles ? ' ' + data.detalles.join(' ') : '';
    throw new Error((data.mensaje || 'No se pudo completar la operación.') + detalle);
  }
  return data;
}

const fmtFecha = iso =>
  new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });

const fmtHora = iso =>
  new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

/* ---------- Formulario de solicitud ---------- */

function initFormulario() {
  const sel = $('#departamento');
  sel.innerHTML = '<option value="">Selecciona un departamento</option>' +
    DEPARTAMENTOS.map(d => `<option>${d}</option>`).join('');

  const hoy = new Date();
  const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const manana = new Date(hoy.getTime() + 86400000 - hoy.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('#fecha').min = local;
  $('#fecha').value = manana;
  $('#fecha').dataset.manana = manana;

  $('#form-solicitud').addEventListener('submit', enviarSolicitud);
}

function mostrarError(campo, texto) {
  const span = document.querySelector(`.err[data-for="${campo}"]`);
  if (span) span.textContent = texto || '';
  const input = document.querySelector(`[name="${campo}"]`);
  if (input) input.classList.toggle('invalid', Boolean(texto));
}

function validar(f) {
  let ok = true;
  ['nombreCliente', 'telefono', 'direccion', 'departamento', 'franja', 'pesoLb'].forEach(c => mostrarError(c, ''));

  if (!f.nombreCliente.trim()) { mostrarError('nombreCliente', 'Escribe el nombre de quien entrega.'); ok = false; }
  const tel = f.telefono.replace(/[\s-]/g, '');
  if (!/^\d{8}$/.test(tel)) { mostrarError('telefono', 'Ingresa un teléfono de 8 dígitos.'); ok = false; }

  if (!f.direccion.trim()) { mostrarError('direccion', 'Escribe la dirección donde recogeremos el paquete.'); ok = false; }
  if (!f.departamento) { mostrarError('departamento', 'Selecciona el departamento.'); ok = false; }

  const peso = Number(f.pesoLb);
  if (f.pesoLb === '' || !Number.isFinite(peso) || peso <= 0) {
    mostrarError('pesoLb', 'Ingresa un peso mayor a 0 lb.'); ok = false;
  }

  const inicio = new Date(`${f.fecha}T${f.horaInicio}`);
  const fin = new Date(`${f.fecha}T${f.horaFin}`);
  if (!f.fecha || isNaN(inicio) || isNaN(fin)) {
    mostrarError('franja', 'Completa la fecha y el rango de horas.'); ok = false;
  } else if (inicio <= new Date()) {
    mostrarError('franja', 'Esa franja ya pasó. Elige una fecha y hora futura.'); ok = false;
  } else if (fin <= inicio) {
    mostrarError('franja', 'La hora "Hasta" debe ser posterior a "Desde".'); ok = false;
  }

  return ok ? { peso, inicio, fin, tel } : null;
}

async function enviarSolicitud(e) {
  e.preventDefault();
  const form = e.target;
  const f = Object.fromEntries(new FormData(form));
  const msg = $('#msg-form');
  msg.textContent = '';
  msg.className = 'msg';

  const v = validar(f);
  if (!v) return;

  const btn = $('#btn-enviar');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const data = await api('', {
      method: 'POST',
      body: JSON.stringify({
        nombreCliente: f.nombreCliente,
        telefono: v.tel,
        email: f.email,
        direccion: f.direccion,
        departamento: f.departamento,
        franjaInicio: v.inicio.toISOString(),
        franjaFin: v.fin.toISOString(),
        pesoLb: v.peso,
      }),
    });

    $('#codigo-nuevo').textContent = data.codigo;
    $('#hub-nuevo').textContent = data.sucursal;
    $('#confirmacion').hidden = false;
    form.reset();
    initFechaTrasReset();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'msg error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Solicitar recolección';
  }
}

function initFechaTrasReset() {
  $('#fecha').value = $('#fecha').dataset.manana;
}

/* ---------- Consulta ---------- */

async function consultar(codigo) {
  const msg = $('#msg-consulta');
  msg.textContent = '';
  msg.className = 'msg';
  $('#resultado').hidden = true;

  codigo = codigo.trim().toUpperCase();
  if (!codigo) {
    msg.textContent = 'Escribe un código de solicitud para consultar.';
    msg.className = 'msg error';
    return;
  }

  try {
    const data = await api('/' + encodeURIComponent(codigo));
    pintarResultado(data);
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'msg error';
  }
}

function pintarResultado(s) {
  $('#r-codigo').textContent = s.codigo;
  $('#r-sucursal').textContent = s.sucursal;
  $('#r-direccion').textContent = `${s.direccion} (${s.departamento})`;
  $('#r-franja').textContent = `${fmtFecha(s.franjaInicio)} a ${fmtHora(s.franjaFin)}`;
  $('#r-peso').textContent = `${s.pesoLb} lb`;

  const badge = $('#r-estado');
  badge.textContent = s.estadoActual;
  badge.className = 'badge' +
    (s.estadoActual === 'Recolectado' ? ' done' : s.estadoActual === 'Cancelada' ? ' cancel' : '');

  pintarTimeline(s);
  $('#resultado').hidden = false;
}

function pintarTimeline(s) {
  const pasos = s.historial.map((h, i) => ({
    ...h,
    tipo: i === s.historial.length - 1 ? 'current' : 'done',
  }));

  // Si el proceso sigue abierto, se muestran los pasos que faltan
  const esFinal = ['Recolectado', 'Cancelada'].includes(s.estadoActual);
  if (!esFinal) {
    const idx = FLUJO.indexOf(s.estadoActual);
    FLUJO.slice(idx + 1).forEach(estado => pasos.push({ estado, tipo: 'pending' }));
  }

  $('#timeline').innerHTML = pasos.map(p => {
    const extra = p.tipo === 'current'
      ? (p.estado === 'Cancelada' ? ' cancel' : p.estado === 'Recolectado' ? ' final' : '')
      : '';
    return `
      <li class="step ${p.tipo}${extra}" ${p.tipo === 'current' ? 'aria-current="step"' : ''}>
        <span class="dot" aria-hidden="true"></span>
        <p class="step-name">${p.estado}</p>
        <p class="step-date">${p.fecha ? fmtFecha(p.fecha) : 'Por completar'}</p>
        ${p.comentario ? `<p class="step-note">${p.comentario}</p>` : ''}
        ${p.tipo === 'current' ? '<span class="now-tag">Estado actual</span>' : ''}
      </li>`;
  }).join('');
}

function initConsulta() {
  $('#form-consulta').addEventListener('submit', e => {
    e.preventDefault();
    consultar($('#codigo').value);
  });

  document.querySelectorAll('.chip').forEach(chip =>
    chip.addEventListener('click', () => {
      $('#codigo').value = chip.dataset.code;
      consultar(chip.dataset.code);
    })
  );

  $('#btn-copiar').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#codigo-nuevo').textContent);
      $('#btn-copiar').textContent = 'Código copiado';
      setTimeout(() => ($('#btn-copiar').textContent = 'Copiar código'), 2000);
    } catch { /* el portapapeles puede no estar disponible */ }
  });

  $('#btn-ver-nuevo').addEventListener('click', () => {
    const codigo = $('#codigo-nuevo').textContent;
    $('#codigo').value = codigo;
    consultar(codigo);
    $('#t-consultar').scrollIntoView({ behavior: 'smooth' });
  });
}

initFormulario();
initConsulta();
