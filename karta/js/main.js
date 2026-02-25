// ==========================================
// Atlas karta — My Maps style layers (century groups + list of points)
// ==========================================

let pointsURL = "https://hrvcirpal.stin.hr/wp-json/atlas/v1/rukopisi";
window.addEventListener("DOMContentLoaded", init);

let map;

// Data structures
let groups = {};        // centuryLabel -> { layer: L.LayerGroup, items: [{marker, title, iconUrl}] }
let groupOrder = [];    // sorted list of centuries for rendering

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

function centuryLabel(vrijeme) {
  const raw = (vrijeme || "").toString().trim();
  const s = raw.toLowerCase();

  // 1) Ako ima godinu (1000-2099 npr. 1404) -> st = ceil(year/100)
  const yearMatch = s.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    const c = Math.ceil(y / 100);
    return `${c}. st.`;
  }

  // 2) Ako je već upisano stoljeće kao broj 1-2 znamenke (npr. "15. st.")
  const cenMatch = s.match(/\b(\d{1,2})\b/);
  if (cenMatch) return `${Number(cenMatch[1])}. st.`;

  // 3) Fallback
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
        <div class="mymaps-title">Slojevi (stoljeća)</div>
      </div>
      <div class="mymaps-body" id="mymaps-body"></div>
    `;

    // Stop clicks from reaching the map
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
    if (!body) return;

    body.innerHTML = "";

    for (const century of this._order) {
      const g = this._groups[century];
      if (!g) continue;

      const isOn = this._map.hasLayer(g.layer);
      const groupEl = document.createElement("div");
      groupEl.className = "mymaps-group";

      // pick a representative icon for group (first item with icon)
      groupEl.innerHTML = `
  <div class="mymaps-group-header">
    <label class="mymaps-toggle">
      <input type="checkbox" ${isOn ? "checked" : ""} data-century="${century}">
      <span class="mymaps-group-title">
        ${century}
        <span class="mymaps-count">(${g.items.length})</span>
      </span>
    </label>
  </div>
  <ul class="mymaps-items" data-century-list="${century}">
    ${g.items
      .slice()
      .sort((a,b)=> (a.title||"").localeCompare(b.title||"", "hr"))
      .map((it, idx) => `
        <li class="mymaps-item">
          ${it.iconUrl ? `<img class="mymaps-mini-pin" src="${it.iconUrl}" alt="">` : ""}
        <a href="#" data-century="${century}" data-idx="${idx}" class="mymaps-link">
  <span class="mymaps-point-title">${it.title}</span>
  <span class="mymaps-point-time">(${it.timeRaw || "nepoznato"})</span>
</a>
        </li>
      `).join("")}
  </ul>
`;
      body.appendChild(groupEl);
    }

    // Toggle layer
    body.querySelectorAll('input[type="checkbox"][data-century]').forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const c = e.target.getAttribute("data-century");
        const g = this._groups[c];
        if (!g) return;
        if (e.target.checked) g.layer.addTo(this._map);
        else this._map.removeLayer(g.layer);
      });
    });

    // Click item -> zoom + open modal
    body.querySelectorAll("a.mymaps-link").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const c = a.getAttribute("data-century");
        const idx = Number(a.getAttribute("data-idx"));
        const g = this._groups[c];
        if (!g || !g.items[idx]) return;

        const it = g.items[idx];
        const latlng = it.marker.getLatLng();
        this._map.setView(latlng, 15);

        openInfoModal(it.title, it.opis);
      });
    });
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
      "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> &copy; <a href='https://www.lzmk.hr/'>LZMK</a>",
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

  // reset
  groups = {};
  groupOrder = [];

  // Add control (top right)
  const ctrl = new MyMapsLayersControl().addTo(map);

  fetch(pointsURL)
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((rows) => {
      if (!Array.isArray(rows)) throw new Error("JSON nije array");
      buildGroups(rows);
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
    const iconUrl = item.ikona_url || "";
    const century = centuryLabel(item.vrijeme_nastanka);
    const timeTag = slugify(item.vrijeme_nastanka || "nepoznato");

    if (!groups[century]) {
      groups[century] = {
        layer: (L.markerClusterGroup ? L.markerClusterGroup() : L.layerGroup()),
        items: [],
      };
      groups[century].layer.addTo(map); // default ON
    }

    const marker = L.marker([lat, lon], { id: item.id || title, tags: [timeTag] });

    const divIcon = makeDivIcon(iconUrl, title, timeTag);
    if (divIcon) marker.setIcon(divIcon);

    marker.on("click", (e) => {
      map.setView(e.latlng, 15);
      openInfoModal(title, opis);
    });

    groups[century].layer.addLayer(marker);
    groups[century].items.push({
  marker,
  title,
  opis,
  iconUrl,
  timeRaw: item.vrijeme_nastanka || "",
});
  }

  groupOrder = Object.keys(groups).sort(centurySort);
}