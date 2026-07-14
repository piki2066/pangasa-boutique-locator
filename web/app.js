import { searchModels, resolveBoutiques, mapsUrl, telHref, formatPhone } from './search.js';

const state = { data: null, selectedRef: null, term: '', province: '', size: '' };
const $ = (id) => document.getElementById(id);

// Mes de entrega para reservas de básicos de continuidad sin stock (editable).
const RESERVA_ENTREGA = 'octubre';

function esc(s) { return (s ?? '').toString().replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
const chips = (items, cls) => items.map((x) => `<span class="${cls}">${esc(x)}</span>`).join('');
const esCmp = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });

async function load() {
  const r = await fetch('data.json');
  state.data = await r.json();
  $('loc-meta').textContent = `${state.data.meta.modelCount} prendas · ${state.data.meta.boutiqueCount} boutiques · ${state.data.meta.seasonLabel}`;
  const sel = $('prov');
  for (const p of state.data.provinces) { const o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o); }
  // Enlaces directos: ?ref=<referencia> o ?q=<búsqueda> (compartibles)
  const params = new URLSearchParams(location.search);
  state.term = params.get('q') || '';
  if (params.get('ref')) state.selectedRef = params.get('ref').trim();
  if (state.term) $('q').value = state.term;
  render();
}

function currentModels() {
  return searchModels(state.data.models, state.term);
}

// Rellena el desplegable de tallas con la unión de tallas de las prendas mostradas.
function syncSizeOptions(models) {
  const sizes = [...new Set(models.flatMap((m) => m.sizes || []))].sort(esCmp);
  if (state.size && !sizes.includes(state.size)) state.size = '';
  const sel = $('size');
  sel.innerHTML = '<option value="">Todas las tallas</option>' +
    sizes.map((s) => `<option value="${esc(s)}"${s === state.size ? ' selected' : ''}>${esc(s)}</option>`).join('');
  sel.disabled = sizes.length === 0;
}

function cardHtml(m) {
  const img = m.image
    ? `<img src="${esc(m.image)}" alt="${esc(m.title)}" loading="lazy">`
    : `<div class="loc-noimg"><img src="osito.png" alt=""></div>`;
  return `
    <div class="loc-card" data-ref="${esc(m.ref)}" role="button" tabindex="0" aria-label="${esc(m.title)}">
      ${m.continuity ? '<span class="loc-chiptag" title="Se puede reservar aunque no haya stock">Reservable</span>' : ''}
      ${img}
      <div class="cap">${esc(m.title)}<span class="ref">Ref. ${esc(m.ref)}</span></div>
    </div>`;
}

// Catálogo COMPLETO: todas las prendas, con foto, agrupadas por tipo (familia SIMSS).
function renderGrid(models) {
  const groups = new Map();
  for (const m of models) {
    const f = m.family || 'Otras prendas';
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f).push(m);
  }
  const fams = [...groups.keys()].sort(esCmp);
  $('catalog').innerHTML = fams.map((f) => `
    <section class="loc-fam">
      <h2 class="loc-famtitle">${esc(f)} <span class="n">${groups.get(f).length}</span></h2>
      <div class="loc-grid">${groups.get(f).map(cardHtml).join('')}</div>
    </section>`).join('');
  const select = (el) => { state.selectedRef = el.dataset.ref; render(); window.scrollTo({ top: 0 }); };
  $('catalog').querySelectorAll('.loc-card').forEach((el) => {
    el.addEventListener('click', () => select(el));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(el); } });
  });
}

function boutiqueCard(b) {
  const meta = [
    b.sizes && b.sizes.length ? `<span class="loc-blabel">Tallas</span> ${chips(b.sizes, 'loc-size')}` : '',
    b.colors && b.colors.length ? `<span class="loc-blabel">Colores</span> ${chips(b.colors, 'loc-color')}` : '',
  ].filter(Boolean).join('<span class="loc-bsep"></span>');
  return `
    <div class="loc-boutique">
      <div class="loc-brow"><span class="loc-bname">${esc(b.name)}</span><span class="loc-bplace">${esc(b.city)}${b.province ? ' · ' + esc(b.province) : ''}</span></div>
      ${b.address ? `<div class="loc-baddr">${esc(b.address)}</div>` : ''}
      ${meta ? `<div class="loc-bmeta">${meta}</div>` : ''}
      <div class="loc-bactions">
        ${b.phone ? `<a class="loc-btel" href="${esc(telHref(b.phone))}">📞 ${esc(formatPhone(b.phone))}</a>` : ''}
        <a class="loc-bmap" href="${esc(mapsUrl(b))}" target="_blank" rel="noopener">Cómo llegar ↗</a>
      </div>
    </div>`;
}

// Ficha de la prenda seleccionada: sus boutiques (con filtros de provincia y talla).
function renderDetail(m) {
  const bs = resolveBoutiques(m, state.data.boutiques, state.province, state.size);
  const summary = [
    m.sizes && m.sizes.length ? `<span class="loc-blabel">Tallas</span> ${chips(m.sizes, 'loc-size')}` : '',
    m.colors && m.colors.length ? `<span class="loc-blabel">Colores</span> ${chips(m.colors, 'loc-color')}` : '',
  ].filter(Boolean).join('<span class="loc-bsep"></span>');
  const cards = bs.length
    ? bs.map(boutiqueCard).join('')
    : `<p class="loc-empty">Sin boutiques con ese filtro. Prueba con "Todas las provincias" o "Todas las tallas".</p>`;
  $('results').innerHTML = `
    <button class="loc-back" id="backbtn">← Ver todas las prendas</button>
    <div class="loc-detail">
      ${m.image ? `<img class="loc-dimg" src="${esc(m.image)}" alt="${esc(m.title)}">` : ''}
      <div>
        <h2 class="loc-model">${esc(m.title)}</h2>
        <p class="loc-modelmeta">Ref. ${esc(m.ref)} · ${esc(m.family || '')} · disponible en ${bs.length} ${bs.length === 1 ? 'boutique' : 'boutiques'}</p>
        ${m.continuity ? `<p class="loc-reserva">🔁 Básico de continuidad — se puede <strong>reservar aunque no haya stock</strong> · entrega prevista en <strong>${esc(RESERVA_ENTREGA)}</strong></p>` : ''}
        ${summary ? `<div class="loc-bmeta loc-summary">${summary}</div>` : ''}
      </div>
    </div>${cards}`;
  $('backbtn').addEventListener('click', () => { state.selectedRef = null; render(); });
}

function render() {
  const models = currentModels();
  const selected = state.selectedRef ? state.data.models.find((m) => m.ref === state.selectedRef) : null;
  syncSizeOptions(selected ? [selected] : models);
  if (selected) {
    $('catalog').innerHTML = '';
    renderDetail(selected);
  } else {
    $('results').innerHTML = models.length ? '' : `<p class="loc-empty">No encontramos esa prenda. Prueba otro nombre o referencia.</p>`;
    renderGrid(models);
  }
}

$('q').addEventListener('input', (e) => { state.term = e.target.value; state.selectedRef = null; render(); });
$('prov').addEventListener('change', (e) => { state.province = e.target.value; render(); });
$('size').addEventListener('change', (e) => { state.size = e.target.value; render(); });
load().catch((e) => { $('loc-meta').textContent = 'No se pudo cargar la disponibilidad.'; console.error(e); });
