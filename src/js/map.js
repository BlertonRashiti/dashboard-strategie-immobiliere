const WMTS =  (layer, ext = 'jpeg') =>
  `https://wmts.geo.admin.ch/1.0.0/${layer}/default/current/3857/{z}/{x}/{y}.${ext}`;
const ATTR = '© swisstopo';

let map;
let markersLayer;
let coords = new Map();

function initMap(el) {
  map = L.map(el, { center: GEO.center, zoom: 11 });
  const plan = L.tileLayer(WMTS('ch.swisstopo.pixelkarte-farbe'), { attribution: ATTR, maxZoom: 19 });
  const gris = L.tileLayer(WMTS('ch.swisstopo.pixelkarte-grau'), { attribution: ATTR, maxZoom: 19 });
  const ortho = L.tileLayer(WMTS('ch.swisstopo.swissimage'), { attribution: ATTR, maxZoom: 19 });
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  });
  const cadastre = L.tileLayer(WMTS('ch.kantone.cadastralwebmap-farbe', 'png'), {
    attribution: ATTR + ' / cantons',
    maxZoom: 19,
    opacity: 0.8,
  });
  plan.addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  L.control
    .layers(
      { 'Plan swisstopo': plan, 'Plan gris': gris, Orthophoto: ortho, OpenStreetMap: osm },
      { 'Cadastre (parcelles)': cadastre, 'Sites de l’État': markersLayer },
      { collapsed: false }
    )
    .addTo(map);
  return map;
}

const setCoords = (c) => {
  coords = c;
};

function renderMarkers(sites, onSelect) {
  markersLayer.clearLayers();
  const pts = [];
  for (const s of sites) {
    const c = coords.get(s.id);
    if (!c) continue;
    const color = STATUTS[s.statut].color;
    const m = L.circleMarker([c.lat, c.lon], {
      radius: Math.max(5, Math.min(16, 4 + Math.sqrt(s.surfReelle) / 12)),
      color: '#fff',
      weight: 1,
      fillColor: color,
      fillOpacity: 0.85,
    });
    m.bindPopup(
      `<strong>${esc(s.nom)}</strong><br>${esc(s.adresse ?? '')}<br>` +
        `<span class="badge" style="background:${color}">${STATUTS[s.statut].label}</span><br>` +
        `${esc(s.dept ?? '')}<br>${fmtM2(s.surfReelle)} · ${fmtCHF(s.valeur)}`
    );
    m.on('click', () => onSelect?.(s));
    m.addTo(markersLayer);
    pts.push([c.lat, c.lon]);
  }
  return pts.length;
}

const fitToMarkers = () => {
  const b = L.featureGroup(markersLayer.getLayers()).getBounds();
  if (b.isValid()) map.fitBounds(b.pad(0.1));
};
const invalidate = () => map?.invalidateSize();
const focusSite = (s) => {
  const c = coords.get(s.id);
  if (c) map.setView([c.lat, c.lon], 17);
};
