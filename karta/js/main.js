// ==========================================
// Atlas karta — My Maps style layers (century groups + list of points)
// ==========================================

let pointsURL = "https://hrvcirpal.stin.hr/wp-json/atlas/v1/rukopisi";
window.addEventListener("DOMContentLoaded", init);

let map;
let clusterGroup;
let visibleCenturies = new Set();
let selectedIconKey = "a";

// Data structures
let groups = {};        // centuryLabel -> { items: [{marker, title, opis, timeRaw, ikone}] }
let groupOrder = [];    // sorted list of centuries for rendering

const iconOptions = [
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "v", label: "V" },
  { key: "g", label: "G" },
  { key: "d", label: "D" },
  { key: "e", label: "E" },
  { key: "zh", label: "Ž" },
  { key: "z", label: "Z" },
  { key: "i", label: "I" },
  { key: "ji", label: "Ï" },
  { key: "jj", label: "Ĵ" },
  { key: "k", label: "K" },
  { key: "l", label: "L" },
  { key: "m", label: "M" },
  { key: "n", label: "N" },
  { key: "o", label: "O" },
  { key: "p", label: "P" },
  { key: "r", label: "R" },
  { key: "s", label: "S" },
  { key: "t", label: "T" },
  { key: "u", label: "U" },
  { key: "f", label: "F" },
  { key: "h", label: "H" },
  { key: "oh", label: "Ô" },
  { key: "ch1", label: "Ĉ" },
  { key: "c", label: "C" },
  { key: "ch", label: "Č" },
  { key: "sh", label: "Š" },
  { key: "softsign", label: "ь" },
  { key: "y", label: "Y" },
  { key: "eh", label: "Ȇ" },
  { key: "uh", label: "Ȗ" },
  { key: "ja", label: "JA" },
  { key: "je", label: "JE" }
];

// -------------------------------
// Helpers
// -------------------------------
function slugify(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "")
    .replace(/\_+/g, "_");
}

function escapeHtml(str) {
  return (str || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function listLabel(title, timeRaw) {
  const t = (title || "").toString().trim();
  const y = (timeRaw || "").toString().trim();

  if (!y) return escapeHtml(t);

  // ako je godina/oznaka već u naslovu, nemoj je dodavati opet
  if (t.toLowerCase().includes(y.toLowerCase())) {
    return escapeHtml(t);
  }

  return `${escapeHtml(t)} <span class="mymaps-point-time">(${escapeHtml(y)})</span>`;
}

function centuryLabel(vrijeme) {
  const raw = (vrijeme || "").toString().trim();
  const s = raw.toLowerCase();

  const yearMatch = s.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    const c = Math.ceil(y / 100);
    return `${c}. st.`;
  }

  const cenMatch = s.match(/\b(\d{1,2})\b/);
  if (cenMatch) return `${Number(cenMatch[1])}. st.`;

  return raw.length ? raw : "nepoznato";
}

// Sort centuries naturally (1..30, then "nepoznato")
function centurySort(a, b) {
  const ax = a.match(/^(\d{1,2})\.\s*st\./);
  const bx = b.match(/^(\d{1,2})\.\s*st\./);
  if (ax && bx) return Number(ax[1]) - Number(bx[1]);
  if (ax) return -1;
  if (bx) return 1;
  if (a === "nepoznato") return 1;
  if (b === "nepoznato") return -1;
  return a.localeCompare(b, "hr");
}

function hidePreloader() {
  const el = document.getElementsByClassName("preloader")[0];
  if (!el) return;

  var st = el.style;
  st.opacity = 1;
  (function fade() {
    (st.opacity -= 0.1) < 0 ? (st.display = "none") : setTimeout(fade, 40);
  })();
}

// SweetAlert opener (WordPress HTML)
function openInfoModal(title, opis) {
  if (window.Swal && Swal.fire) {
    if (map && map._handlers) map._handlers.forEach((h) => h.disable());

    Swal.fire({
      title: "<strong>" + (title || "") + "</strong>",
      html: '<div class="swal-wp-content">' + (opis || "") + "</div>",
      showCloseButton: true,
      confirmButtonText: "zatvori",
      confirmButtonColor: "#0074d9",
      target: document.getElementById("releated-usage-map"),
    }).then(() => {
      if (map && map._handlers) map._handlers.forEach((h) => h.enable());
    });
  } else {
    alert(title || "");
  }
}

// Build marker icon (PNG/SVG URL)
function makeDivIcon(iconUrl, title, extraClass) {
  if (!iconUrl) return null;
  return L.divIcon({
    className: "",
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    iconSize: [30, 30],
    html:
      '<div class="marker-img tooltip ' +
      (extraClass || "") +
      '">' +
      '<img src="' +
      iconUrl +
      '" alt=""/>' +
      '<span class="tooltiptext">' +
      (title || "") +
      "</span>" +
      "</div>",
  });
}

// -------------------------------
// MyMaps Control (topright)
// -------------------------------
const MyMapsLayersControl = L.Control.extend({
  options: { position: "topright" },

  onAdd: function () {
    const container = L.DomUtil.create("div", "mymaps-control leaflet-bar");
    container.innerHTML = `
      <div class="mymaps-header">
        <div class="mymaps-title">Filteri</div>
      </div>
      <div class="mymaps-body" id="mymaps-body">
        <div class="mymaps-icon-filter">
          <div class="mymaps-subtitle">Slovo</div>
          <select id="icon-filter-select" class="mymaps-select">
            ${iconOptions.map(opt => `
              <option value="${opt.key}" ${opt.key === selectedIconKey ? "selected" : ""}>
                ${opt.label}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="mymaps-separator"></div>

        <div class="mymaps-subtitle">Stoljeća</div>
        <div id="mymaps-centuries"></div>
      </div>
    `;

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    this._container = container;
    return container;
  },

  setData: function (groupsObj, orderArr, mapInstance) {
    this._groups = groupsObj;
    this._order = orderArr;
    this._map = mapInstance;
    this.render();
  },

  render: function () {
    const body = this._container.querySelector("#mymaps-body");
    const centuriesWrap = this._container.querySelector("#mymaps-centuries");
    if (!body || !centuriesWrap) return;

    centuriesWrap.innerHTML = "";

    for (const century of this._order) {
      const g = this._groups[century];
      if (!g) continue;

      const visibleItems = g.items.filter(it => it.ikone && it.ikone[selectedIconKey]);
      const isOn = visibleCenturies.has(century);

      const groupEl = document.createElement("div");
      groupEl.className = "mymaps-group";

      groupEl.innerHTML = `
        <div class="mymaps-group-header">
          <label class="mymaps-toggle">
            <input type="checkbox" ${isOn ? "checked" : ""} data-century="${century}">
            <span class="mymaps-group-title">
              ${century}
              <span class="mymaps-count">(${visibleItems.length})</span>
            </span>
          </label>
        </div>
        <ul class="mymaps-items" data-century-list="${century}">
          ${visibleItems
            .slice()
            .sort((a, b) => (a.title || "").localeCompare(b.title || "", "hr"))
            .map((it) => `
              <li class="mymaps-item">
                <img class="mymaps-mini-pin" src="${it.ikone[selectedIconKey]}" alt="">
                <a href="#" data-century="${century}" data-title="${encodeURIComponent(it.title)}" class="mymaps-link">
  <span class="mymaps-point-label">${listLabel(it.title, it.timeRaw)}</span>
</a>
              </li>
            `).join("")}
        </ul>
      `;

      centuriesWrap.appendChild(groupEl);
    }

    body.querySelectorAll('input[type="checkbox"][data-century]').forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const c = e.target.getAttribute("data-century");

        if (e.target.checked) visibleCenturies.add(c);
        else visibleCenturies.delete(c);

        refreshCluster();
        this.render();
      });
    });

    body.querySelectorAll("a.mymaps-link").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const c = a.getAttribute("data-century");
        const title = decodeURIComponent(a.getAttribute("data-title") || "");
        const g = this._groups[c];
        if (!g) return;

        const it = g.items.find(x => x.title === title);
        if (!it) return;

        const latlng = it.marker.getLatLng();
        this._map.setView(latlng, 15);
        openInfoModal(it.title, it.opis);
      });
    });

    const select = this._container.querySelector("#icon-filter-select");
    if (select) {
      select.value = selectedIconKey;
      select.onchange = (e) => {
        selectedIconKey = e.target.value;
        refreshCluster();
        this.render();
      };
    }
  },
});

// -------------------------------
// Init
// -------------------------------
function init() {
  if (!window.L) {
    alert("Leaflet (L) nije učitan.");
    return;
  }

  const osmUrl =
    "https://api.maptiler.com/maps/osm-standard/256/{z}/{x}/{y}@2x.jpg?key=bAORSPxBPfSEAdo1hN6H";

  const osm = L.tileLayer(osmUrl, {
    maxZoom: 19,
    attribution:
      "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
  });

  map = L.map("releated-usage-map", {
    minZoom: 8,
    fullscreenControl: true,
  })
    .setView([45.1470039817354, 15.693330115076954], 8)
    .addLayer(osm);

  const southWest = L.latLng(42.17, 13.1459);
  const northEast = L.latLng(46.64, 19.8);
  const bounds = L.latLngBounds(southWest, northEast);

  map.setMaxBounds(bounds);
  map.on("drag", function () {
    map.panInsideBounds(bounds, { animate: false });
  });

  groups = {};
  groupOrder = [];
  visibleCenturies = new Set();

  clusterGroup = L.markerClusterGroup();
  map.addLayer(clusterGroup);

  const ctrl = new MyMapsLayersControl().addTo(map);

  fetch(pointsURL)
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((rows) => {
      if (!Array.isArray(rows)) throw new Error("JSON nije array");

      buildGroups(rows);
      refreshCluster();
      ctrl.setData(groups, groupOrder, map);
      hidePreloader();
    })
    .catch((err) => {
      console.error(err);
      alert("Ne mogu dohvatiti JSON.\n" + err.message);
      hidePreloader();
    });
}

// -------------------------------
// Build groups + markers
// -------------------------------
function buildGroups(rows) {
  for (const item of rows) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const title = item.ime_dokumenta || "(bez imena)";
    const opis = item.opis || "";
    const century = centuryLabel(item.vrijeme_nastanka);
    const timeTag = slugify(item.vrijeme_nastanka || "nepoznato");
    const ikone = item.ikone || {};

    if (!groups[century]) {
      groups[century] = {
        items: [],
      };
      visibleCenturies.add(century);
    }

    const marker = L.marker([lat, lon], { id: item.id || title, tags: [timeTag] });

    const selectedIconUrl = ikone[selectedIconKey] || "";
    const divIcon = makeDivIcon(selectedIconUrl, title, timeTag);
    if (divIcon) marker.setIcon(divIcon);

    marker.on("click", (e) => {
      map.setView(e.latlng, 15);
      openInfoModal(title, opis);
    });

    groups[century].items.push({
      marker,
      title,
      opis,
      timeRaw: item.vrijeme_nastanka || "",
      ikone,
    });
  }

  groupOrder = Object.keys(groups).sort(centurySort);
}

function refreshCluster() {
  clusterGroup.clearLayers();

  for (const century of Object.keys(groups)) {
    if (!visibleCenturies.has(century)) continue;

    for (const item of groups[century].items) {
      const iconUrl = item.ikone && item.ikone[selectedIconKey] ? item.ikone[selectedIconKey] : "";
      if (!iconUrl) continue;

      const marker = item.marker;
      const timeTag = slugify(item.timeRaw || "nepoznato");
      const divIcon = makeDivIcon(iconUrl, item.title, timeTag);

      if (divIcon) {
        marker.setIcon(divIcon);
      }

      clusterGroup.addLayer(marker);
    }
  }
}