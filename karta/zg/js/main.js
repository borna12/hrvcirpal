let pointsURL =
"../dl.csv";
  //"karta.php?csv=dl.csv"
window.addEventListener("DOMContentLoaded", init);
let sidebar;
let panelID = "my-info-panel";
let releatedUsageMap;
let mcg;

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

////////////////////////////////////////////////
// Quick and dirty implementation of enableMCG
////////////////////////////////////////////////
function init() {
  L.Control.TagFilterButton.include({
    // Goal: read from MCG instead of from _map
    enableMCG: function (mcgInstance) {
      this.registerCustomSource({
        name: 'mcg',
        source: {
          mcg: mcgInstance,
          hide: function (layerSource) {
            var releatedLayers = [];

            for (
              var r = 0; r < this._releatedFilterButtons.length; r++
            ) {
              releatedLayers = releatedLayers.concat(
                this._releatedFilterButtons[r].getInvisibles()
              );
            }

            var toBeRemovedFromInvisibles = [],
              i,
              toAdd = [];

            for (var i = 0; i < this._invisibles.length; i++) {
              if (releatedLayers.indexOf(this._invisibles[i]) == -1) {
                for (
                  var j = 0; j < this._invisibles[i].options.tags.length; j++
                ) {
                  if (
                    this._selectedTags.length == 0 ||
                    this._selectedTags.indexOf(
                      this._invisibles[i].options.tags[j]
                    ) !== -1
                  ) {
                    //this._map.addLayer(this._invisibles[i]);
                    toAdd.push(this._invisibles[i]);
                    toBeRemovedFromInvisibles.push(i);
                    break;
                  }
                }
              }
            }

            // Batch add into MCG
            layerSource.mcg.addLayers(toAdd);

            while (toBeRemovedFromInvisibles.length > 0) {
              this._invisibles.splice(
                toBeRemovedFromInvisibles.pop(),
                1
              );
            }

            var removedMarkers = [];
            var totalCount = 0;

            if (this._selectedTags.length > 0) {
              //this._map.eachLayer(
              layerSource.mcg.eachLayer(
                function (layer) {
                  if (
                    layer &&
                    layer.options &&
                    layer.options.tags
                  ) {
                    totalCount++;
                    if (releatedLayers.indexOf(layer) == -1) {
                      var found = false;
                      for (
                        var i = 0; i < layer.options.tags.length; i++
                      ) {
                        found =
                          this._selectedTags.indexOf(
                            layer.options.tags[i]
                          ) !== -1;
                        if (found) {
                          break;
                        }
                      }
                      if (!found) {
                        removedMarkers.push(layer);
                      }
                    }
                  }
                }.bind(this)
              );

              for (i = 0; i < removedMarkers.length; i++) {
                //this._map.removeLayer(removedMarkers[i]);
                this._invisibles.push(removedMarkers[i]);
              }

              // Batch remove from MCG
              layerSource.mcg.removeLayers(removedMarkers);
            }

            return totalCount - removedMarkers.length;
          },
        },
      });

      this.layerSources.currentSource = this.layerSources.sources[
        'mcg'
      ];
    },
  });

  ////////////////////////////////////////////////
  // Fix for TagFilterButton
  ////////////////////////////////////////////////
  L.Control.TagFilterButton.include({
    _prepareLayerSources: function () {
      this.layerSources = new Object();
      this.layerSources['sources'] = new Object();

      this.registerCustomSource({
        name: 'default',
        source: {
          hide: function () {
            var releatedLayers = [];

            for (var r = 0; r < this._releatedFilterButtons.length; r++) {
              releatedLayers = releatedLayers.concat(
                this._releatedFilterButtons[r].getInvisibles()
              );
            }

            var toBeRemovedFromInvisibles = [],
              i;

            // "Fix": add var
            for (var i = 0; i < this._invisibles.length; i++) {
              if (releatedLayers.indexOf(this._invisibles[i]) == -1) {
                // "Fix": add var
                for (var j = 0; j < this._invisibles[i].options.tags.length; j++) {
                  if (
                    this._selectedTags.length == 0 ||
                    this._selectedTags.indexOf(
                      this._invisibles[i].options.tags[j]
                    ) !== -1
                  ) {
                    this._map.addLayer(this._invisibles[i]);
                    toBeRemovedFromInvisibles.push(i);
                    break;
                  }
                }
              }
            }

            while (toBeRemovedFromInvisibles.length > 0) {
              this._invisibles.splice(toBeRemovedFromInvisibles.pop(), 1);
            }

            var removedMarkers = [];
            var totalCount = 0;

            if (this._selectedTags.length > 0) {
              this._map.eachLayer(
                function (layer) {
                  if (layer && layer.options && layer.options.tags) {
                    totalCount++;
                    if (releatedLayers.indexOf(layer) == -1) {
                      var found = false;
                      for (var i = 0; i < layer.options.tags.length; i++) {
                        found =
                          this._selectedTags.indexOf(layer.options.tags[i]) !==
                          -1;
                        if (found) {
                          break;
                        }
                      }
                      if (!found) {
                        removedMarkers.push(layer);
                      }
                    }
                  }
                }.bind(this)
              );

              for (i = 0; i < removedMarkers.length; i++) {
                this._map.removeLayer(removedMarkers[i]);
                this._invisibles.push(removedMarkers[i]);
              }
            }

            return totalCount - removedMarkers.length;
          },
        },
      });
      this.layerSources.currentSource = this.layerSources.sources['default'];
    },
  });

  ////////////////////////////////////////////////
  // Adapted from TagFilterButton demo
  // https://github.com/maydemirx/leaflet-tag-filter-button/blob/0.0.4/docs/assets/js/main.js
  ////////////////////////////////////////////////
  const key = 'bAORSPxBPfSEAdo1hN6H';

  const osm = L.maptilerLayer({
    apiKey: key,
    style: "36dff64f-65d1-460d-a0a0-f7d3b48dc8a2", //optional
    attribution:"&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> &copy; <a href='https://www.lzmk.hr/'>LZMK</a>",
  })


  // initialize the map on the "map" div with a given center and zoom
  releatedUsageMap = L.map('releated-usage-map',{
    minZoom: 13,
    maxZoom: 19,
    fullscreenControl: true,
    // OR
    fullscreenControl: {
      pseudoFullscreen: false,
      title: {
        'false': 'prikaz preko punog zaslona',
        'true': 'izlaz preko punog zaslona'
      } // if true, fullscreen to page width and height
    }
  }
  ).setView([45.81, 15.98], 13).addLayer(osm);

  var southWest = L.latLng(45.70, 15.82),
    northEast = L.latLng(45.93, 16.16);
  var bounds = L.latLngBounds(southWest, northEast);

  releatedUsageMap.setMaxBounds(bounds);
  releatedUsageMap.on('drag', function () {
    releatedUsageMap.panInsideBounds(bounds, { animate: false });
  });

  sidebar = L.control
    .sidebar({
      container: "sidebar",
      closeButton: true,
      position: "right",
    })
    .addTo(releatedUsageMap);

  let panelContent = {
    id: panelID,
    tab: "<i class='fa fa-bars active'></i>",
    pane: "<p> <ul id='sidebar-content'></ul></p>",
    title: "<h2 id='sidebar-title'>Odaberi baštinu</h2> <button class='accordion'>Objekti</button><div class='panel'><ul id='linkovi-objekti'></ul></div><button class='accordion'>Muzeji</button><div class='panel'><ul id='linkovi-muzeji'></ul></div><button class='accordion'>Ustanove</button><div class='panel'><ul id='linkovi-ustanove'></ul></div><button class='accordion'>Poduzeća</button><div class='panel'><ul id='linkovi-poduzeca'></ul></div>",
  };
  sidebar.addPanel(panelContent);

  /* add an external link */
  /*sidebar.addPanel({
    id: 'ghlink',
    tab: '<i class="fa fa-filter"></i>',
    pane: "<h3>Tip baštine</h3><label for='hide'>○ prirodna baština</label><input id='prirodna' type='checkbox' checked/> <br><label for='hide'>◇ kulturna baština</label><input id='kulturna' type='checkbox' checked/> <br><label for='hide'><img src='img/kul-pri2.png' style='height:10px'> kulturna i prirodna baština</label><input id='kult-prirod' type='checkbox' checked/></p>",
    title: "<h2 id='sidebar-title'>Filteri</h2>",
  });*/

  /* add a button with click listener */
  sidebar.addPanel({
    id: 'click',
    tab: '<i class="fa fa-info"></i>',
    title: "<h2 id='sidebar-title'>Atlas hrvatske tehničke baštine</h2>",
    pane: "<p>ATLAS HRVATSKE TEHNIČKE BAŠTINE dio je širega projekta <em>Hrvatske tehničke enciklopedije</em> koji u četiri sveska i na Portalu hrvatske tehničke baštine donosi enciklopedijski prikaz povijesti i današnjeg stanja tehnike u Hrvatskoj.</p><p>Atlas je pokrenut 2023. godine u želji da se golemo prikupljeno znanje o hrvatskoj tehničkoj baštini poveže s prostorom i tako omogući korisnicima da upoznaju svoju okolicu te posjete mjesta važna za razvoj tehnike.</p><p>Atlas se svakodnevno dopunjuje, a za sada obuhvaća objekte u prostoru (arhitektonski, urbanistički i konstrukcijski vrijedne građevine i sklopovi), muzeje (specijalizirani tehnički muzeji ili muzeji s važnim tehničkim zbirkama), ustanove (sjedišta nastavnih, znanstvenih i istraživačkih institucija) i poduzeća (važni industrijski pogoni, skladišta, silosi).</p>",
  });

  releatedUsageMap.on("click", function () {
    //sidebar.close(panelID);
  });
  // Use PapaParse to load data from Google Sheets
  // And call the respective functions to add those to the map.

  Papa.parse(pointsURL, {
    download: true,
    header: true,
    complete: addPoints,
  });
  var s = document.getElementsByClassName('preloader')[0].style;
  s.opacity = 1;
  (function fade() { (s.opacity -= .1) < 0 ? s.display = "none" : setTimeout(fade, 40) })();

  mcg = L.markerClusterGroup().addTo(releatedUsageMap);

  /*var foodFilterButton = L.control
    .tagFilterButton({
      data: ['tomato', 'cherry', 'strawberry'],
      filterOnEveryClick: true,
      icon: '<i class="fa fa-pagelines"></i>',
    })
    .addTo(releatedUsageMap);
  
  foodFilterButton.addToReleated(statusFilterButton);*/
}
function addPoints(data) {
  data = data.data;
  // Choose marker type. Options are:
  // (these are case-sensitive, defaults to marker!)
  // marker: standard point with an icon
  // circleMarker: a circle with a radius set in pixels
  // circle: a circle with a radius set in meters
  let markerType = "marker";
  // Marker radius
  // Wil be in pixels for circleMarker, metres for circle
  // Ignore for point
  let markerRadius = 100;
  kategorije = []
  ukupno=data.length-2

  for (let row = 0; row < data.length - 1; row++) {
    kategorije.push(data[row].bastina);
    let marker;
    if (markerType == "circleMarker") {
      marker = L.circleMarker([data[row].lat, data[row].lon], {
        radius: markerRadius,
      });
    } else if (markerType == "circle") {
      marker = L.circle([data[row].lat, data[row].lon], {
        radius: markerRadius,
      });
    } else {
      marker = L.marker([data[row].lat, data[row].lon], { id: data[row].name, class: data[row].bastina, tags: [data[row].bastina] });
    }
    //marker.addTo(pointGroupLayer);


    /*naredba=Swal.fire({title:"<strong>"+data[row].name+"</strong>",html:'<img src="'+data[row].img+'"><p style="text-align:justify">'+data[row].description+'</p><p style="text-align:center;"><a href="'+data[row].link+'" target="_blank">doznaj vi\u0161e</a></p>',showCloseButton:!0})*/
    if (data[row].bastina.toLowerCase() == "muzeji") {
      document.getElementById("linkovi-muzeji").innerHTML += "<li class='" + data[row].bastina.split(' ').join('_').toLowerCase() + "'><a onclick='funkcija(this)' data-bastina='" + data[row].bastina.split(' ').join('_').toLowerCase() + "' data-img='" + data[row].img + "' data-opis='" + data[row].description + "' data-link='" + data[row].link + "' data-lat='" + data[row].lat + "' data-lon='" + data[row].lon + "'>" + data[row].name + "</a></li>"
    }
    else if (data[row].bastina.toLowerCase() == "objekti") {
      document.getElementById("linkovi-objekti").innerHTML += "<li class='" + data[row].bastina.split(' ').join('_').toLowerCase() + "'><a onclick='funkcija(this)' data-bastina='" + data[row].bastina.split(' ').join('_').toLowerCase() + "' data-img='" + data[row].img + "' data-opis='" + data[row].description + "' data-link='" + data[row].link + "' data-lat='" + data[row].lat + "' data-lon='" + data[row].lon + "'>" + data[row].name + "</a></li>"
    }
    else if (data[row].bastina.toLowerCase() == "ustanove") {
      document.getElementById("linkovi-ustanove").innerHTML += "<li class='" + data[row].bastina.split(' ').join('_').toLowerCase() + "'><a onclick='funkcija(this)' data-bastina='" + data[row].bastina.split(' ').join('_').toLowerCase() + "' data-img='" + data[row].img + "' data-opis='" + data[row].description + "' data-link='" + data[row].link + "' data-lat='" + data[row].lat + "' data-lon='" + data[row].lon + "'>" + data[row].name + "</a></li>"
    }
    else if (data[row].bastina.toLowerCase() == "poduzeća") {
      document.getElementById("linkovi-poduzeca").innerHTML += "<li class='" + data[row].bastina.split(' ').join('_').toLowerCase() + "'><a onclick='funkcija(this)' data-bastina='" + data[row].bastina.split(' ').join('_').toLowerCase() + "' data-img='" + data[row].img + "' data-opis='" + data[row].description + "' data-link='" + data[row].link + "' data-lat='" + data[row].lat + "' data-lon='" + data[row].lon + "'>" + data[row].name + "</a></li>"
    }

    // UNCOMMENT THIS LINE TO USE POPUPS
    //marker.bindPopup('<h2>' + data[row].name + '</h2>There's a ' + data[row].description + ' here');

    // COMMENT THE NEXT GROUP OF LINES TO DISABLE SIDEBAR FOR THE MARKERS
    marker.feature = {
      properties: {
        name: data[row].name,
        description: data[row].description,
        img: data[row].img,
        link: data[row].link,
        id: data[row].name,
      },
    };

    marker.on({
      click: function (e) {
        releatedUsageMap.setView(e.latlng);
        L.DomEvent.stopPropagation(e);
        /*document.getElementById("sidebar-title").innerHTML =
          e.target.feature.properties.name;
        document.getElementById("sidebar-content").innerHTML =
          e.target.feature.properties.description;
        sidebar.open(panelID);*/
        if (data[row].img.length > 3) {
          slika = '<img src="' + data[row].img + '"></img>'
        }
        
        else { slika = "" }

        releatedUsageMap._handlers.forEach(function(handler) {handler.disable();});
        if (data[row].link.length > 3) {
        
          Swal.fire({
            title: '<strong>' + data[row].name + '</strong>',
            html:
              slika + '<p style="text-align:justify">' + data[row].description + '</p><p style="text-align:center;"><a href="' + data[row].link + '" target="_blank">doznaj više</a></p>',
            showCloseButton: true,
            confirmButtonText: "zatvori",
            confirmButtonColor: "#0074d9", target: document.getElementById("releated-usage-map"),
          }).then(function () {
            releatedUsageMap._handlers.forEach(function(handler) {handler.enable();});
          });
        }
        else {
          Swal.fire({
            title: '<strong>' + data[row].name + '</strong>',
            html:
              slika + '<p style="text-align:justify">' + data[row].description + '</p><p style="text-align:center;"></p>',
            showCloseButton: true,
            confirmButtonText: "zatvori",
            confirmButtonColor: "#0074d9", target: document.getElementById("releated-usage-map"),
          }).then(function () {
            releatedUsageMap._handlers.forEach(function(handler) {handler.enable();});
          });
        }
       

      }
     
    });
    // COMMENT UNTIL HERE TO DISABLE SIDEBAR FOR THE MARKERS

    // AwesomeMarkers is used to create fancier icons
    let icon = L.divIcon({
      className: '',
      iconAnchor: [12, 25],
      labelAnchor: [-6, 0],
      popupAnchor: [0, -15],
      iconSize: [25, 41],
      html: '<div class="pin tooltip ' + data[row].bastina.split(' ').join('_') + " " + data[row].name.split(' ').join('_') + '"><span class="span-' + data[row].bastina.split(' ').join('_') + '"></span><span class="tooltiptext">' + data[row].name + '</span></div>'

    });

    /* let icon = L.AwesomeMarkers.icon({
       icon: "info-circle "+ data[row].bastina.split(' ').join('_')+" "+data[row].name.split(' ').join('_')+" "+data[row].zemlja.split(' ').join('_'),
       iconColor: "white",
       markerColor: data[row].color,
       prefix:  "fa",
       extraClasses:"fa-rotate-0",
     });*/
    if (!markerType.includes("circle")) {
      marker.setIcon(icon);
    }
    marker.addTo(mcg);


      if (parseInt(row)==parseInt(ukupno)){
        function sortList(ul) {
          var ul = document.getElementById(ul);
        
          Array.from(ul.getElementsByTagName("LI"))
            .sort((a, b) => a.textContent.localeCompare(b.textContent,'hr'))
            .forEach(li => ul.appendChild(li));
        }
      
      
        sortList("linkovi-objekti");
        sortList("linkovi-ustanove");
        sortList("linkovi-muzeji");
        sortList("linkovi-poduzeca");
      }
  }
  
  
  uniqueArray = kategorije.filter(function (item, pos, self) {
    return self.indexOf(item) == pos;
  }).sort()
  
  var statusFilterButton = L.control.tagFilterButton({
    data: uniqueArray,
    filterOnEveryClick: true,
    icon: '<i class="fa fa-filter"></i>',
    clearText: 'prikaži sve'
  })
    .addTo(releatedUsageMap);

  // Enable MCG integration
  statusFilterButton.enableMCG(mcg);


  var acc = document.getElementsByClassName("accordion");
  var i;

  for (i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function () {
      this.classList.toggle("active2");
      var panel = this.nextElementSibling;
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  }
  if (window.location.hash) {
    kordinate = window.location.hash.replace("#", "").split(",")
    releatedUsageMap.setView(kordinate, 15);
  }
}
function funkcija(e) {
  releatedUsageMap.setView([e.getAttribute("data-lat"), e.getAttribute("data-lon")], 15);
  if (e.getAttribute("data-img").length < 3) {
    slika = ""
  }
  else { slika = '<img src="' + e.getAttribute("data-img") + '">' }
  if (e.getAttribute("data-link").length > 3) {
    releatedUsageMap._handlers.forEach(function(handler) {handler.disable();});

    Swal.fire({
      title: '<strong>' + e.innerHTML + '</strong>',
      html:
        slika + '<p style="text-align:justify">' + e.getAttribute("data-opis") + '</p><p style="text-align:center;"></p><a href="' + e.getAttribute("data-link") + '" target="_blank">doznaj više</a>',
      showCloseButton: true,
      confirmButtonText: "zatvori",
      confirmButtonColor: "#0074d9", target: document.getElementById("releated-usage-map"),
    }).then(function () {
      releatedUsageMap._handlers.forEach(function(handler) {handler.enable();});
    });
  }
  else {
    Swal.fire({
      title: '<strong>' + e.innerHTML + '</strong>',
      html:
        slika + '<p style="text-align:justify">' + e.getAttribute("data-opis") + '</p><p style="text-align:center;"></p>',
      showCloseButton: true,
      confirmButtonText: "zatvori",
      confirmButtonColor: "#0074d9", target: document.getElementById("releated-usage-map"),
    }).then(function () {
      releatedUsageMap._handlers.forEach(function(handler) {handler.enable();});
    });
  }

  $(".easy-button-button").click();//e.getAttribute("data-bastina").toLowerCase()
  $(".header").find('li').each(function () {
    if (String($(this).text().toLowerCase() == "prikaži sve" )) {
      $(this).click() }
  })
}

$(document).ready(function () {
  $("#objekti").change(function () {
    $("div.objekti").parent().toggleClass("hidden");
  })
  $("#muzeji").change(function () {
    $("div.muzeji").parent().toggleClass("hidden");
  })
  $("#ustanove").change(function () {
    $("div.ustanove").parent().toggleClass("hidden");
  })
  $("#poduzeća").change(function () {
    $("div.poduzeća").parent().toggleClass("hidden");
  })

}

)

