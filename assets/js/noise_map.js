/**
 * noise_map.js
 * 
 * AustinUrbanNoise project-specific map functionality
 * Contains noise-related features such as noise heatmap, construction sites, water pollution, watershed, etc.
 */

// ============================================
// Firebase Configuration
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBhcg-rUdd_GQ-jDVu3UNL0GQOa4uEqOAc",
    authDomain: "noise-3b89d.firebaseapp.com",
    projectId: "noise-3b89d",
    storageBucket: "noise-3b89d.appspot.com",
    messagingSenderId: "548295321778",
    appId: "1:548295321778:web:a39aae9f11383310bf41ab",
    measurementId: "G-DWW4GG4D07"
};

const app = firebase.initializeApp(firebaseConfig);

// ============================================
// Data Variable Declarations
// ============================================

let waterPollution = new L.FeatureGroup();
var poiMarkers = [];
let noisePoints2 = [];

// Variables for noise survey
var currentLon = -1;
var currentLat = -1;
var predictedNoise = -1;
var selectedNoise = 40;

// ============================================
// Marker Cluster Groups
// ============================================

var markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
        var childCount = cluster.getChildCount();
        var markers = cluster.getAllChildMarkers();
        var sum = 0;
        for (var i = 0; i < markers.length; i++) {
            sum += markers[i].options.title;
        }
        var avg = sum / markers.length;

        var c = ' marker-cluster-';
        if (avg < 10) {
            c += 'small';
        } else if (avg < 100) {
            c += 'medium';
        } else {
            c += 'large';
        }

        return new L.DivIcon({ 
            html: '<div><span><b>' + Math.round(avg) + '</b></span></div>', 
            className: 'marker-cluster' + c, 
            iconSize: new L.Point(40, 40) 
        });
    }
});

// ============================================
// 1. Water Pollution Functions
// ============================================

let current_waterpollution_map = null;

/**
 * Build water pollution map
 */
function buildWaterPollutionMap() {
    if(current_waterpollution_map != null) {
        map.removeLayer(current_waterpollution_map);
        current_waterpollution_map = null;
    }
    var waterCheckbox = document.querySelector(".water");
    if (!waterCheckbox || !waterCheckbox.checked) {
        return;
    }

    fetch('https://data.austintexas.gov/resource/5tye-7ray.json?$where=(date_extract_y(sample_date)%20%3E%202019)&$limit=100000&$select=lat_dd_wgs84,lon_dd_wgs84,sample_date,project,parameter,result,unit')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); 
        })
        .then(water_json => {
            scale = 1;
            for (var i = 0; i < water_json.length; i++) {
                water_data = water_json[i];

                const lat = parseFloat(water_data.lat_dd_wgs84);
                const lon = parseFloat(water_data.lon_dd_wgs84);

                if(isNaN(lat) || isNaN(lon)) {
                    continue;
                }
                
                var marker = L.circleMarker([lat, lon], {
                    color: 'dodgerblue',
                    radius: 5
                });

                let date = new Date(water_data.sample_date);

                marker.bindPopup(`<b style="color:#191970; font-size:16px">Water Information</b> <br> 
                    <b>Date:</b> ${date.getMonth()}/${date.getDay()}/${date.getFullYear()} <br> 
                    <b>Project:</b> ${water_data.project} <br>
                    <b>Parameter:</b> ${water_data.parameter} <br>
                    <b>Result:</b> ${water_data.result} ${water_data.unit} <br>`);

                waterPollution.addLayer(marker);
            }

            waterPollution.addTo(map);
            current_waterpollution_map = waterPollution;

            console.log("got all pollution");
        });
}

// ============================================
// 2. Points of Interest (Construction) Functions
// ============================================

/**
 * Build POI map (Construction sites)
 */
function buildPOIMap() {
    // Delete all markers
    for (var i = 0; i < poiMarkers.length; i++) {
        poiMarkers[i].remove();
    }
    poiMarkers = [];

    var fireDept = document.querySelector(".firedept").checked;

    if (!fireDept) {
        hideLoadingOverlay();
        return;
    }
    
    // Show loading overlay
    showLoadingOverlay('Loading construction data...');

    let scale = 1.278;
    
    // Try using API query parameters to filter MP type and Active status records
    var apiUrl = 'https://data.austintexas.gov/resource/3syk-w9eu.json?$where=permittype=\'MP\' AND status_current=\'Active\'&$limit=5000';
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); 
        })
        .then(construction_json => {
            for (var i = 0; i < construction_json.length; i++) {
                permit = construction_json[i];
                
                // filter permits
                if(permit.permittype == "MP" && permit.status_current == "Active") {
                    // Check if coordinates are valid
                    if (!permit.latitude || !permit.longitude) {
                        continue;
                    }

                    var marker = L.marker([permit.latitude, permit.longitude]).addTo(map);
                    marker.setIcon(L.icon({
                        iconUrl: "./assets/images/construction.png",
                        iconSize: [20 * scale, 20],
                        iconAnchor: [10, 10],
                        popupAnchor: [-5, 0]
                    }));

                    marker.bindPopup(`<b style="color:#191970; font-size:16px">Construction</b> <br> 
                        <b>Description:</b> ${permit.description} <br>`);
                    poiMarkers.push(marker);
                } 
            }
            
            // Hide loading overlay after data is loaded
            hideLoadingOverlay();
        })
        .catch(error => {
            // If filtered query fails, fallback to fetching all data
            return fetch('https://data.austintexas.gov/resource/3syk-w9eu.json?$limit=5000')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(construction_json => {
                    for (var i = 0; i < construction_json.length; i++) {
                        permit = construction_json[i];
                        
                        // filter permits
                        if(permit.permittype == "MP" && permit.status_current == "Active") {
                            // Check if coordinates are valid
                            if (!permit.latitude || !permit.longitude) {
                                continue;
                            }

                            var marker = L.marker([permit.latitude, permit.longitude]).addTo(map);
                            marker.setIcon(L.icon({
                                iconUrl: "./assets/images/construction.png",
                                iconSize: [20 * scale, 20],
                                iconAnchor: [10, 10],
                                popupAnchor: [-5, 0]
                            }));

                            marker.bindPopup(`<b style="color:#191970; font-size:16px">Construction</b> <br> 
                                <b>Description:</b> ${permit.description} <br>`);
                            poiMarkers.push(marker);
                        } 
                    }
                    
                    // Hide loading overlay after fallback data is loaded
                    hideLoadingOverlay();
                });
        })
        .catch(error => {
            console.error('[buildPOIMap] Error fetching data:', error);
            hideLoadingOverlay();
        });
}

// ============================================
// 3. Noise Heatmap Functions
// ============================================

let current_noise_shapefile = null;

/**
 * Build noise heatmap
 */
function buildNoiseHeatmap() {
    // Check if checkbox is still checked before starting async operation
    if (!document.querySelector(".choropleth_incident") || !document.querySelector(".choropleth_incident").checked) {
        hideLoadingOverlay();
        return;
    }
    
    // Show loading overlay
    showLoadingOverlay('Loading noise data...');

    const storage = app.storage();
    const noiseRef = storage.ref('noise_points.json');

    noisePoints2 = [];

    // Helper function: create heatmap from JSON data
    function createHeatmapFromData(data) {
        // Check checkbox state before adding layer
        if (!document.querySelector(".choropleth_incident") || !document.querySelector(".choropleth_incident").checked) {
            hideLoadingOverlay();
            return;
        }

        noisePoints2 = [];
        for(var i = 0; i < 10000000; i++) {
            const json_object = data[String(i)];
            if(json_object) {
                noisePoints2.push([json_object.latitude, json_object.longitude, Math.max(30, data[String(i)].noise_level)]);
            }
        }
        
        var heat = L.heatLayer(
            noisePoints2,
            {radius: 5, max: 80, maxZoom: 15, blur: 1}
        );
        
        // Final check before adding to map
        if (document.querySelector(".choropleth_incident") && document.querySelector(".choropleth_incident").checked) {
            heat.addTo(map);
            current_noise_shapefile = heat;
        }
        
        // Hide loading overlay after data is processed
        hideLoadingOverlay();
    }

    // Try to load from Firebase Storage using getDownloadURL
    noiseRef.getDownloadURL().then((url) => {
        // Check again before making request
        if (!document.querySelector(".choropleth_incident") || !document.querySelector(".choropleth_incident").checked) {
            hideLoadingOverlay();
            return;
        }

        // Use fetch with proper error handling
        fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            cache: 'default'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            // Check checkbox state again before adding layer
            if (!document.querySelector(".choropleth_incident") || !document.querySelector(".choropleth_incident").checked) {
                hideLoadingOverlay();
                return;
            }

            const data = JSON.parse(text);
            createHeatmapFromData(data);
        })
        .catch(error => {
            // If Firebase URL load fails, fallback to local file
            console.warn('[buildNoiseHeatmap] Firebase Storage fetch failed, falling back to local file:', error.message);
            loadLocalNoiseData();
        });
    
    }).catch(error => {
        // Fallback to local file when Firebase Storage getDownloadURL fails
        console.warn('[buildNoiseHeatmap] Firebase Storage getDownloadURL failed, falling back to local file:', error.message);
        loadLocalNoiseData();
    });

    // Load data from local cleaned_noise.zip
    function loadLocalNoiseData() {
        // Check checkbox state
        if (!document.querySelector(".choropleth_incident") || !document.querySelector(".choropleth_incident").checked) {
            hideLoadingOverlay();
            return;
        }

        // Use fetch to load zip file, then parse with JSZip
        fetch('data/cleaned_noise.zip')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load cleaned_noise.zip');
                }
                return response.blob();
            })
            .then(blob => {
                // Parse zip file with JSZip
                if (typeof JSZip !== 'undefined') {
                    return JSZip.loadAsync(blob);
                } else {
                    throw new Error('JSZip not loaded');
                }
            })
            .then(function(zip) {
                // Find JSON file (usually noise_points.json)
                var jsonFile = null;
                var jsonFileName = null;
                
                zip.forEach(function(relativePath, file) {
                    // Find .json file, prefer noise_points.json
                    if (relativePath.endsWith('.json')) {
                        if (relativePath.includes('noise_points') || !jsonFile) {
                            jsonFile = file;
                            jsonFileName = relativePath;
                        }
                    }
                });
                
                if (jsonFile) {
                    return jsonFile.async('string').then(function(jsonText) {
                        var data = JSON.parse(jsonText);
                        createHeatmapFromData(data);
                    });
                } else {
                    throw new Error('No JSON file found in cleaned_noise.zip');
                }
            })
            .catch(function(error) {
                console.error('[buildNoiseHeatmap] Failed to load cleaned_noise.zip:', error.message);
                hideLoadingOverlay();
            });
    }
}

/**
 * Build noise layer (wrapper function)
 */
function buildNoiseLayer() {
    if (current_noise_shapefile != null) {
        map.removeLayer(current_noise_shapefile);
        current_noise_shapefile = null;
    }
    if (!document.querySelector(".choropleth_incident") || !document.querySelector(".choropleth_incident").checked) {
        return;
    }

    buildNoiseHeatmap();
}

// ============================================
// 4. Watershed Functions
// ============================================

let current_watershed_shapefile = null;

/**
 * Build watershed shapefile map
 */
function buildWatershedShapefile() {
    if(current_watershed_shapefile != null) {
        map.removeLayer(current_watershed_shapefile);
        current_watershed_shapefile = null;
    }
    var watershedCheckbox = document.querySelector(".watershed");
    if (!watershedCheckbox || !watershedCheckbox.checked) {
        return;
    }

    let shpfile = new L.Shapefile('../data/Watershed_Reach_Integrity_Scores.zip', {
        onEachFeature: function(feature, layer) {
            console.log(feature);

            let props = feature.properties;
            console.log(props);

            let watershedInformationColor = (text) => {
                let trimmed_text = text.trim();
                if(trimmed_text == "BAD") {
                    return "crimson";
                } 
                if(trimmed_text == "POOR") {
                    return "lightred";
                } 
                if(trimmed_text == "MARGINAL") {
                    return "darkorange";
                }
                if(trimmed_text == "FAIR") {
                    return "gold";
                }
                if(trimmed_text == "GOOD") {
                    return "lightgreen";
                }
                if(trimmed_text == "VERY GOOD") {
                    return "mediumturquoise";
                } 
                if(trimmed_text == "EXCELLENT") {
                    return "fuchsia";
                }
                if(trimmed_text == "NO DATA") {
                    return "lightgray";
                }
                
                return "lightpurple";
            };

            console.log(watershedInformationColor(props.wqcd));
            
            let popup = `<b style="color:#191970; font-size:16px">${props.wshednm} Watershed</b> <br> 
                    <b>Overall Quality:</b> <span style="background-color:${watershedInformationColor(props.ovcd)}"> ${props.ovcd} </span> <br>
                    <b>Aquatic Life:</b> <span style="background-color:${watershedInformationColor(props.alcd)}">${props.alcd} </span>  <br>
                    <b>Eutrophication:</b> <span style="background-color:${watershedInformationColor(props.eucd)}">${props.eucd}  </span> <br>
                    <b>Habitat Quality:</b> <span style="background-color:${watershedInformationColor(props.habcd)}">${props.habcd}  </span> <br>
                    <b>Sediment Quality:</b> <span style="background-color:${watershedInformationColor(props.sedcd)}">${props.sedcd}  </span> <br>
                    <b>Vegetation:</b> <span style="background-color:${watershedInformationColor(props.vegcd)}">${props.vegcd} </span>  <br>
                    <b>Water Chemistry:</b> <span style="background-color:${watershedInformationColor(props.wqcd)}">${props.wqcd}  </span> <br>`;
            layer.options.color = watershedInformationColor(props.ovcd);
            layer.options.outline = 'black';
            layer.options.weight = 2;
            console.log(props);

            layer.bindPopup(popup);
        }
    });

    shpfile.addTo(map);
    current_watershed_shapefile = shpfile;
}

// ============================================
// 5. Traffic Layer Function
// ============================================

let current_traffic_layer = null;

/**
 * Build traffic map layer
 * Note: This is a project-specific implementation
 */
function builtTrafficMap() {
    if (current_traffic_layer != null) {
        map.removeLayer(current_traffic_layer);
        current_traffic_layer = null;
    }
    if (!document.querySelector(".traffic_condition") || !document.querySelector(".traffic_condition").checked) {
        return;
    }
    
    let traffic_layer = L.gridLayer.googleMutant({
        type: "roadmap",
        pane: 'popupPane',
        styles: [
            { featureType: "all", stylers: [{ visibility: "off" }]},
        ]
    }).addTo(map);
    traffic_layer.setOpacity(0.75);
    traffic_layer.addGoogleLayer("TrafficLayer");
    current_traffic_layer = traffic_layer;
}

// ============================================
// 6. Map Click Handler for Noise Information
// ============================================

/**
 * Setup map click handler for noise information popup
 */
function setupMapClickHandler() {
    map.on('click', function(e) {
        if(current_noise_shapefile == null) {
            return;
        }

        const degreePerMeter = 1 / 111139;
        const pointRadiusDetection = 30;

        var bestPointDistance = 0xFFFFFFFF;
        var bestPointNoiseLevel = -1;

        for (var i = 0; i < noisePoints2.length; i++) {
            const noisePoint = noisePoints2[i];
            const latitude = noisePoint[0];
            const longitude = noisePoint[1];
            const noise_level = noisePoint[2];
           
            // Calculate distance from noise point
            const dist = ((Math.abs(e.latlng.lat - latitude) + Math.abs(e.latlng.lng - longitude)) / 2);
            if(dist <= degreePerMeter * pointRadiusDetection) {
                if(dist <= bestPointDistance) {
                    bestPointDistance = dist;
                    bestPointNoiseLevel = noise_level;
                    currentLon = longitude;
                    currentLat = latitude;
                    predictedNoise = noise_level;
                }
            }
        }

        var extraInformation = "The noise levels around you are as loud as a whisper. These levels of noise are <i>safe!</i>";
        if(bestPointNoiseLevel < 40) {
            extraInformation = "The noise levels around you are as loud as a whisper. These levels of noise are <i>safe!</i>";
        } else if(bestPointNoiseLevel < 60) {
            extraInformation = "The noise levels around you are as loud as an average indoor room. These levels of noise are <i>safe!</i>";
        } else if(bestPointNoiseLevel < 70) {
            extraInformation = "The noise levels around you are as loud as an average office room. These levels of noise are <i>safe!</i>";
        } else if(bestPointNoiseLevel < 80) {
            extraInformation = "The noise levels around you are as loud as landscaping equipment (from inside a home). These levels of noise can be <i>dangerous</i> if you are exposed to them over time. ";
        } else if(bestPointNoiseLevel < 85) {
            extraInformation = "The noise levels around you are as loud as an electric vacuum. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. ";
        } else if(bestPointNoiseLevel < 90) {
            extraInformation = "The noise levels around you are as loud as a noisy restaurant. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. ";
        } else if(bestPointNoiseLevel < 95) {
            extraInformation = "The noise levels around you are as loud as a hairdryer. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. ";
        } else if(bestPointNoiseLevel < 100) {
            extraInformation = "The noise levels around you are as loud as a pro sports game. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. ";
        } else if(bestPointNoiseLevel < 110) {
            extraInformation = "The noise levels around you are as loud as a lawn mower. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection.";
        } else if(bestPointNoiseLevel < 120) {
            extraInformation = "The noise levels around you are as loud as an ambulance. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection.";
        } else if(bestPointNoiseLevel < 130) {
            extraInformation = "The noise levels around you are as loud as a jackhammer. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection.";
        } else {
            extraInformation = "The noise levels around you are as loud or louder than a gun firing. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection.";
        }
        
        const submitContent = 
            `<div style="display:none" id="noiseSurvey">
                <span style="font-size:12px">What does the noise around you (outside) sound like? </span><br>
                As loud as <b id="noiseScaleLabel">rain (40 db)</b>
                <div class="slidecontainer">
                    <input type="range" min="25" max="130" value="40" class="slider" id="myRange" onChange="slide(this.value)">
                </div>
                <a id="" href="#" onclick="onSubmit()" ><b>Submit</b></a>
            </div>`;

        const normalLevelContent = `<b style="font-size:20px">Noise</b> <br> 
            <span style="font-size:16px"><b>Predicted Noise Level:</b> Normal.</span> <br>
            The noise levels at this location are normal!`;

        const noisePointFoundContent = `<b style="font-size:20px">Noise Level</b> <br> 
            <span style="font-size:16px"><b>Predicted Noise Level:</b> <i>${bestPointNoiseLevel} </i> db </span> <span id="noiseDescrip"> <br> ${extraInformation} </span>
            <br> <i><a id="openSurveyButton" href="#" onclick="openNoiseMore()" >Add Noise Information at this Location</a></i>` + submitContent;
        
        const content = bestPointNoiseLevel == -1 ? normalLevelContent : noisePointFoundContent;
        
        var popup = L.popup()
            .setLatLng([e.latlng.lat, e.latlng.lng])
            .setContent(content)
            .openOn(map);
    });
}

// ============================================
// 7. Noise Survey Functions
// ============================================

/**
 * Open noise survey form
 */
function openNoiseMore() {
    console.log("hey");
    var moreButton = document.getElementById("openSurveyButton");
    
    if(moreButton && moreButton.textContent != "Close") {
        document.getElementById("noiseSurvey").style.display = "block";
        document.getElementById("openSurveyButton").style.display = "none";
        document.getElementById("noiseDescrip").style.display = "none";
    }
}

/**
 * Update noise scale label
 * @param {number} amount - Noise level value
 */
function slide(amount) {
    var comparison = "a whisper";
    selectedNoise = amount;
    if(amount < 40) {
        comparison = "a whisper (or quieter)";
    } else if(amount < 50) {
        comparison = "rain";
    } else if(amount < 60) {
        comparison = "an average indoor room";
    } else if(amount < 70) {
        comparison = "an average office room";
    } else if(amount < 80) {
        comparison = "landscaping equipment (from inside a home)";
    } else if(amount < 85) {
        comparison = "an electric vacuum";
    } else if(amount < 90) {
        comparison = "a noisy restaurant";
    } else if(amount < 95) {
        comparison = "a hairdryer";
    } else if(amount < 100) {
        comparison = "a professional sports game";
    } else if(amount < 110) {
        comparison = "a lawn mower";
    } else if(amount < 120) {
        comparison = "an ambulance";
    } else if(amount < 130) {
        comparison = "a jackhammer";
    } else {
        comparison = "a gun firing (or louder)";
    }

    document.getElementById("noiseScaleLabel").innerText = comparison + " (" + amount + " db)";
}

/**
 * Submit noise survey data to Firebase
 */
function onSubmit() {
    const db = app.database();

    // A post entry.
    const postData = {
        date: new Date(),
        longitude: currentLon,
        latitude: currentLat,
        predictedNoiseLevel: predictedNoise,
        userSubmittedNoiseLevel: parseInt(selectedNoise)
    };

    // Get a key for a new Post.
    db.ref("user_noise_submission/").push(postData).then(() => {
        document.getElementById("noiseSurvey").style.display = "none";
        document.getElementById("noiseDescrip").style.display = "block";
        document.getElementById("noiseDescrip").style.fontSize = "16px";
        document.getElementById("noiseDescrip").innerText = "Thank you for your input!";
    });
}

// ============================================
// 8. Dropdown Menu Event Binding (Project-Specific)
// ============================================

/**
 * Build dropdown menu (includes project-specific event listeners)
 * This function combines the generic menu framework with project-specific event bindings
 */
function buildDropdownMenu(map) {
    // Use generic menu framework
    var menuBase = buildDropdownMenuBase(map, 'filter-menu', 'filter-menu-overlay');
    
    if (!menuBase) {
        console.error('Failed to initialize dropdown menu');
        return;
    }

    // ============================================
    // Project-specific: Bind checkbox event listeners
    // ============================================
    
    document.querySelector(".firedept").addEventListener('click', function () {
        buildPOIMap();
    });

    var waterCheckbox = document.querySelector(".water");
    if (waterCheckbox) {
        waterCheckbox.addEventListener('click', function () {
            buildWaterPollutionMap();
        });
    }

    var watershedCheckbox = document.querySelector(".watershed");
    if (watershedCheckbox) {
        watershedCheckbox.addEventListener('click', function () {
            buildWatershedShapefile();
        });
    }

    document.querySelector(".choropleth_incident").addEventListener('click', function () {
        buildNoiseLayer();
    });

    document.querySelector(".traffic_condition").addEventListener('click', function () {
        builtTrafficMap();
    });

    // Initialize default checked checkboxes on page load
    // Mapping of checkbox class names to their corresponding build functions
    const checkboxBuildMap = {
        'firedept': buildPOIMap,
        'water': buildWaterPollutionMap,
        'watershed': buildWatershedShapefile,
        'choropleth_incident': buildNoiseLayer,
        'traffic_condition': builtTrafficMap
    };

    // Automatically trigger build functions for all checked checkboxes
    Object.keys(checkboxBuildMap).forEach(function(className) {
        const checkbox = document.querySelector('.' + className);
        if (checkbox && checkbox.checked) {
            checkboxBuildMap[className]();
        }
    });
}

// ============================================
// 9. Select Bar Function (Date Picker Setup)
// ============================================

/**
 * Build select bar (date picker setup)
 * @param {L.Map} map - Leaflet map object
 */
function buildSelectBar(map) {
    var checkList = document.getElementById('filter-menu');
    if (checkList && checkList.getElementsByClassName('anchor')[0]) {
        checkList.getElementsByClassName('anchor')[0].onclick = function (evt) {
            if (checkList.classList.contains('visible'))
                checkList.classList.remove('visible');
            else
                checkList.classList.add('visible');
        };
    }
    
    // Set up value of date picker
    var dateControl = document.querySelector('input[type="date"]');
    if (dateControl) {
        var today = new Date();
        var date = today.getFullYear() + '-' + ("0" + (today.getMonth() + 1)).slice(-2) + '-' + ("0" + today.getDate()).slice(-2);
        dateControl.value = date;
        dateControl.max = date;
    }
    
    // Hide date picker
    var datePicker = document.querySelector('.date-picker');
    if (datePicker) {
        datePicker.style.display = 'none';
    }
}

// ============================================
// 10. Custom Control Creation (Project-Specific)
// ============================================

/**
 * Create location button control
 */
function createLocationButton(map) {
    return createCustomControl({
        title: "Check My Location",
        position: 'bottomright',
        html: `<div class="geocoder-control-input leaflet-bar" title="Check My Location" style="position:absolute;top:0px; background-image: url(assets/images/location.png)"></div><div class="geocoder-control-suggestions leaflet-bar"><div class=""></div></div>`,
        onClick: function() {
            getUserLocation();
        }
    });
}

/**
 * Create layers button control
 */
function createLayersButton(map) {
    return createCustomControl({
        title: "Layers",
        position: 'bottomright',
        html: `<div class="dropdown-check-list geocoder-control-input leaflet-bar" title="Layers" style="background-color: transparent; border-color: transparent; background-image: url(); width:35px;"><img src="assets/images/layers.png" style="width: 20px;height: 20px;position: absolute;left: 5px;"></div><div class="geocoder-control-suggestions leaflet-bar"><div class=""></div></div>`,
        onClick: null  // Layer button is triggered by dropdown menu anchor, no click event needed here
    });
}

// ============================================
// 11. Default Layer Initialization
// ============================================

/**
 * Initialize default layers on page load
 */
function initDefaultLayers() {
    // Default for noise map
    let noiseCheckbox = document.querySelector(".choropleth_incident");
    if (noiseCheckbox && noiseCheckbox.checked) {
        console.log("Noise checkbox is checked, initializing noise layer");
        buildNoiseLayer();
    }
}

