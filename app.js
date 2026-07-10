import { searchModels, resolveBoutiques, mapsUrl, telHref, formatPhone } from './search.js';

const state = { data: null, selectedRef: null, term: '', province: '' };
const $ = (id) => document.getElementById(id);

function esc(s) { return (s ?? '').toString().replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

async function load() {
  const r = await fetch('data.json');
  state.data = await r.json();
  $('loc-meta').textContent = `${state.data.meta.modelCount} prendas · ${state.data.meta.boutiqueCount} boutiques · ${state.data.meta.seasonLabel}`;
  const sel = $('prov');
  for (const p of state.data.provinces) { const o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o); }
  renderCatalog();
  renderResults();
}

function renderCatalog() {
  const models = searchModels(state.data.models, state.term).filter((m) => m.image).slice(0, 40);
  $('catalog').innerHTML = models.map((m) => `
    <div class="loc-chip${m.ref === state.selectedRef ? ' active' : ''}" data-ref="${esc(m.ref)}" role="button" tabindex="0" aria-pressed="${m.ref === state.selectedRef}">
      <img src="${esc(m.image)}" alt="${esc(m.title)}" loading="lazy">
      <div class="cap">${esc(m.title)}</div>
    </div>`).join('');
  const selectChip = (el) => { state.selectedRef = el.dataset.ref; renderCatalog(); renderResults(); };
  $('catalog').querySelectorAll('.loc-chip').forEach((el) => {
    el.addEventListener('click', () => selectChip(el));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectChip(el); } });
  });
}

function renderResults() {
  const box = $('results');
  let models = searchModels(state.data.models, state.term);
  if (state.selectedRef) models = models.filter((m) => m.ref === state.selectedRef);
  else if (!state.term) { box.innerHTML = `<p class="loc-empty">Elige una prenda del catálogo o busca por nombre / referencia.</p>`; return; }
  if (!models.length) { box.innerHTML = `<p class="loc-empty">No encontramos esa prenda. Prueba otro nombre o referencia.</p>`; return; }

  box.innerHTML = models.slice(0, 12).map((m) => {
    const bs = resolveBoutiques(m, state.data.boutiques, state.province);
    const colors = m.colors.map((c) => `<span class="loc-color">${esc(c)}</span>`).join('');
    const cards = bs.length ? bs.map((b) => `
      <div class="loc-boutique">
        <div class="loc-brow"><span class="loc-bname">${esc(b.name)}</span><span class="loc-bplace">${esc(b.city)}${b.province ? ' · ' + esc(b.province) : ''}</span></div>
        ${b.address ? `<div class="loc-baddr">${esc(b.address)}</div>` : ''}
        <div class="loc-bactions">
          ${b.phone ? `<a class="loc-btel" href="${esc(telHref(b.phone))}">📞 ${esc(formatPhone(b.phone))}</a>` : ''}
          <a class="loc-bmap" href="${mapsUrl(b.name, b.city)}" target="_blank" rel="noopener">Cómo llegar ↗</a>
        </div>
      </div>`).join('') : `<p class="loc-empty">Sin boutiques en esta provincia. Prueba con "Todas las provincias".</p>`;
    return `<h2 class="loc-model">${esc(m.title)}</h2>
      <p class="loc-modelmeta">Ref. ${esc(m.ref)} · disponible en ${bs.length} ${bs.length === 1 ? 'boutique' : 'boutiques'}</p>
      <div>${colors}</div>${cards}`;
  }).join('');
}

$('q').addEventListener('input', (e) => { state.term = e.target.value; state.selectedRef = null; renderCatalog(); renderResults(); });
$('prov').addEventListener('change', (e) => { state.province = e.target.value; renderResults(); });
load().catch((e) => { $('loc-meta').textContent = 'No se pudo cargar la disponibilidad.'; console.error(e); });
