/* global L */
const $ = (id) => document.getElementById(id);
const esc = (s) => (s ?? '').toString().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// nombre + dirección de envío completa → Google Maps lleva al punto exacto
const mapsUrl = (b) => {
  const q = [b.name, b.address, [b.postal, b.city].filter(Boolean).join(' ')]
    .map((s) => (s || '').toString().trim()).filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};
const telHref = (p) => `tel:${(p || '').replace(/\s+/g, '')}`;
const fmtPhone = (p) => { const d = (p || '').replace(/\D/g, ''); return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : p; };

const ositoIcon = L.divIcon({
  className: 'osito-icon',
  html: '<div class="osito-pin"><div class="badge"><img src="osito.png" alt=""></div></div>',
  iconSize: [38, 46], iconAnchor: [19, 43], popupAnchor: [0, -40],
});

const map = L.map('map', { scrollWheelZoom: true, zoomControl: true }).setView([40.2, -3.7], 6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd', maxZoom: 19,
}).addTo(map);

const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 45,
  iconCreateFunction: (c) => L.divIcon({
    html: `<div>${c.getChildCount()}</div>`,
    className: 'marker-cluster marker-cluster-pangasa',
    iconSize: L.point(40, 40),
  }),
}).addTo(map);

let boutiques = [];

function popupHtml(b) {
  return `<div class="bpop-name">${esc(b.name)}</div>
    <div class="bpop-place">${esc(b.city)}${b.province ? ' · ' + esc(b.province) : ''}</div>
    ${b.address ? `<div class="bpop-addr">${esc(b.address)}</div>` : ''}
    <div class="bpop-actions">
      ${b.phone ? `<a class="bpop-tel" href="${esc(telHref(b.phone))}">📞 ${esc(fmtPhone(b.phone))}</a>` : ''}
      <a class="bpop-map" href="${esc(mapsUrl(b))}" target="_blank" rel="noopener">Cómo llegar ↗</a>
    </div>`;
}

function render(province) {
  cluster.clearLayers();
  const shown = boutiques.filter((b) => !province || b.province === province);
  for (const b of shown) {
    L.marker([b.lat, b.lng], { icon: ositoIcon }).bindPopup(popupHtml(b)).addTo(cluster);
  }
  $('count').innerHTML = `<strong>${shown.length}</strong> ${shown.length === 1 ? 'boutique' : 'boutiques'}${province ? ' en ' + esc(province) : ' en España'}`;
  if (shown.length) {
    const b = L.latLngBounds(shown.map((x) => [x.lat, x.lng]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: province ? 12 : 7 });
  }
}

fetch('data.json')
  .then((r) => r.json())
  .then((data) => {
    boutiques = Object.values(data.boutiques).filter((b) => typeof b.lat === 'number' && typeof b.lng === 'number');
    const provinces = [...new Set(boutiques.map((b) => b.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const sel = $('prov');
    for (const p of provinces) { const o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o); }
    sel.addEventListener('change', (e) => render(e.target.value));
    render('');
  })
  .catch((e) => { $('count').textContent = 'No se pudo cargar el mapa.'; console.error(e); });
