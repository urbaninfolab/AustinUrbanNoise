var purpleAirMonitors = new L.FeatureGroup();
var microsoftAirMonitors = new L.FeatureGroup();
let waterPollution = new L.FeatureGroup();
var currentShapefile = null;


// firebase stuff

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



var markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    //zoomToBoundsOnClick: false,
    iconCreateFunction: function(cluster) {
        var childCount = cluster.getChildCount();
        var markers = cluster.getAllChildMarkers();
        var sum = 0;
        for (var i = 0; i < markers.length; i++) {
            //console.log(markers[i]);
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

    return new L.DivIcon({ html: '<div><span><b>' + Math.round(avg) + '</b></span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
        }
});

    function addMapLayer(map) {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        if(purple_air_diaplay_flag && microsoft_air_display_flag)
        map.addLayer(markers);
        else if(purple_air_diaplay_flag)
        map.addLayer(purpleAirMonitors)
        else
        map.addLayer(microsoftAirMonitors)
    }

    // placeholders for the L.marker and L.circle representing user's current position and accuracy
    var current_position, current_accuracy;

    function onLocationFound(e) {
    // if position defined, then remove the existing position marker and accuracy circle from the map
    console.log("location found");
    //console.log(e);

    if (current_position) {
        map.removeLayer(current_position);
        map.removeLayer(current_accuracy);
    }

    var radius = e.coords.accuracy / 10;

    const latlng = {
        lat: e.coords.latitude,
        lng: e.coords.longitude
    };

    /*const latlng = {          // Debug coordinates
        lat: 30.508119,
        lng: -97.811024
    };*/
    
    current_position = L.marker(latlng).addTo(map);
    current_accuracy = L.circle(latlng, radius).addTo(map);

    map.setView(latlng);
    map.fitBounds(current_accuracy.getBounds());


    }

    function foundLocationGeocoded(e) {
        
    if (current_position) {
        map.removeLayer(current_position);
        map.removeLayer(current_accuracy);
    }

    var radius = 10;

    const latlng = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };

    /*const latlng = {          // Debug coordinates
        lat: 30.508119,
        lng: -97.811024
    };*/
    
    current_position = L.marker(latlng).addTo(map);
    current_accuracy = L.circle(latlng, radius).addTo(map);

    map.setView(latlng);
    map.fitBounds(current_accuracy.getBounds());


    }


    function onLocationError(e) {
        console.error("Location found error");
        console.log(e);
    }

    function getUserLocation() {
        navigator.geolocation.getCurrentPosition(onLocationFound);

        /*navigator.geolocation.watchPosition(onLocationFound, onLocationError, {
        maximumAge: 60000,
        timeout: 2000
        });*/
    }

    function buildSelectBar(map) {
        var checkList = document.getElementById('filter-menu');
        checkList.getElementsByClassName('anchor')[0].onclick = function (evt) {
            if (checkList.classList.contains('visible'))
                checkList.classList.remove('visible');
            else
                checkList.classList.add('visible');
        }
        // set up value of date picker
        var dateControl = document.querySelector('input[type="date"]');
        if (dateControl) {
            dateControl.value = date;
            dateControl.max = date;
        }
        // hide date picker
        var datePicker = document.querySelector('.date-picker');
        if (datePicker) {
            datePicker.style.display = 'none';
        }
    }


    var cachedShapefile = null 

    function buildShapefile(map, shapefile_display_flag) {
        let shapefileName = "";
        let popupContent = ``;
        let shapefile = "";

        switch (shapefile_display_flag) {
            case 'fire-risk-radio':
                shapefileName = "../data/austin_wildfire_vulnerable_populations.zip";
                shpfile = new L.Shapefile(shapefileName, {
                    onEachFeature: function (feature, layer) {
                        popupContent = `
                            <div class="risk-estimate-info">
                                <span>Fire Category: ${feature.properties["FIRECAT"]}</span><BR>
                            </div>
                            <div class="basic-info">
                                <span>FIPS: ${feature.properties["FIPS"]}</span><BR>
                                <span>MAPTIP: ${feature.properties["MAPTIP"]}</span><BR>
                                <span>TRCTNAME: ${feature.properties["TRCTNAME"]}</span><BR>
                            </div>
                            <div class="stats-info">
                                <span>Families in Poverty: ${feature.properties["POPVAL"]} </span><BR>
                                <span>People Under 5: ${feature.properties["UND5VAL"]} </span><BR>
                                <span>People Over 65: ${feature.properties["OVR65VAL"]} </span><BR>
                                <span>People With Disability: ${feature.properties["DISABLVAL"]}</span><BR>
                                <span>ASTHMAVAL: ${feature.properties["ASTHMAVAL"]} </span>
                            </div>
                            
                        `;
                        // Instead of just displaying the number in the popup, make a gradient color scale

                        layer.bindPopup(popupContent);
                        let fireCat = feature.properties["FIRECAT"];
                        let words = fireCat.toLowerCase().split(' ');
                        if (words.includes("highest")) {
                            layer.options.color = "red";
                        } else if (words.includes("elevated")) {
                            layer.options.color = "orange";
                        } else {
                            layer.options.color = "yellow";

                        }

                        // make layer outline thicker
                        layer.options.weight = 0.8;

                        // makes lines thinner the further away they are depending on zoom level
                        // attach to zoom event
                        map.on('zoomend', function () {
                            //layer.options.weight = 0.5 * map.getZoom();
                        });
                        //layer.options.opacity = 1 / map.getZoom();


                    },
                    
                    
                })
                shpfile.addTo(map);
                currentShapefile = shpfile;
                break;
            case 'afd-radio':
                shapefileName = "../data/AFD Standard of Cover.zip";
                // var pasttern = new L.Pattern();
                shpfile = new L.Shapefile(shapefileName, {
                    onEachFeature: function (feature, layer) {
                        popupContent = `
                            <div class="basic-info">
                                <span>Number of Incidents: ${feature.properties["incidents"]}</span><BR>
                                <span>Responses in 8 mins: ${feature.properties["num_8min"]}</span><BR>
                                <span>Fire Station ID: ${feature.properties["battalio_1"]}</span><BR>
                                <span>Last Modified by: ${feature.properties["modified_b"]}</span><BR>

                            </div>
                            
                        `;
                        layer.bindPopup(popupContent);
                        layer.options.weight = 0.8;

                        let numIncidents = parseInt(feature.properties["incidents"]);
                        let numResponses = parseInt(feature.properties["num_8min"]);
                        let percent = numResponses / numIncidents;
                        if (percent >= 0.9) {
                            layer.options.color = "rgb(1, 106, 1)";
                        } else if (percent >= 0.8) {
                            layer.options.color = "#699d50";
                        } else if (percent >= 0.7) {
                            layer.options.color = "orange";
                        } else if (percent >= 0.6) {
                            layer.options.color = "#ff5500";
                        } else {
                            layer.options.color = "#704489";
                        }

                        // if(numIncidents <= 20) {
                        //     larer.options.fillColor = 'url(image.gif)';
                        // }
                    }
                })
                shpfile.addTo(map);
                currentShapefile = shpfile;
                break;
            case 'hvi-radio':
                shapefileName = "../data/HVI_Map.zip";
                shpfile = new L.Shapefile(shapefileName, {
                    onEachFeature: function (feature, layer) {
                        popupContent = `
                            <div class="basic-info">
                                <span>HVI Exposure: ${feature.properties["HVI_Exposu"]}</span><BR>
                                <span>HVI Sensitivity: ${feature.properties["HVI_Sens"]}</span><BR>
                                <span>HVI CAPA: ${feature.properties["HVI_CAPA"]}</span><BR>
                                <span>All: ${feature.properties["HVI_All"]}</span><BR>
                                <span>Geo ID: ${feature.properties["GEO_ID"]}</span><BR>
                            </div>
                            
                        `;
                        layer.bindPopup(popupContent);
                        let hvi_exposure = parseFloat(feature.properties["HVI_Exposu"]);
                        console.log(hvi_exposure)

                        if (hvi_exposure >= 0.9) {
                            layer.options.color = "rgb(1, 106, 1)";
                        } else if (hvi_exposure >= 0.8) {
                            layer.options.color = "#699d50";
                        } else if (hvi_exposure >= 0.6) {
                            layer.options.color = "orange";
                        } else if (hvi_exposure >= 0.4) {
                            layer.options.color = "#ff5500";
                        } else {
                            layer.options.color = "#704489";
                        }
                    }
                })
                // color by exposure, color map by 5 colors
                shpfile.addTo(map);
                currentShapefile = shpfile;
                break;
            /*
            case 'fireStations':
                // display CSV file of fire stations as points and add popups
                // use fetch to get the data
                fetch('../data/Fire_Stations.csv')
                    .then(response => response.text())
                    .then(text => {
                        // parse the CSV file
                        let stations = Papa.parse(text, {
                            header: true,
                            dynamicTyping: true,
                            skipEmptyLines: true
                        }).data;
                        //console.log(stations);
                        // loop through the stations and add them to the map
                        for (let station of stations) {
                            //console.log(station);
                            let marker = L.marker([station.LATITUDE, station.LONGITUDE]);
                            marker.bindPopup(`
                                <div class="basic-info
                                    <span>Station ID: ${station.STATION_ID}</span><BR>
                                    <span>Station Name: ${station.STATION_NAME}</span><BR>
                                    <span>Address: ${station.ADDRESS}</span><BR>
                                    <span>City: ${station.CITY}</span><BR>
                                    <span>Zip Code: ${station.ZIP_CODE}</span><BR>
                                    <span>Phone: ${station.PHONE}</span><BR>
                                    <span>Station Type: ${station.STATION_TYPE}</span><BR>
                                    <span>Station Status: ${station.STATION_STATUS}</span><BR>
                                    <span>Station Open Date: ${station.STATION_OPEN_DATE}</span><BR>
                                    <span>Station Close Date: ${station.STATION_CLOSE_DATE}</span><BR>
                                    <span>Station Area: ${station.STATION_AREA}</span><BR>
                                    <span>Station District: ${station.STATION_DISTRICT}</span><BR>
                                    <span>Station Division: ${station.STATION_DIVISION}</span><BR>

                                </div>
                            `);
                            marker.addTo(map);
                        }
                    })
                break; */

            case 'test-risk-radio':
                shapefileName = "../data/firerisk.shp.zip";
                var filePath = '../data/AverageFire.json';
                var result = window.AverageFire;
                cities = {
                    '48453' : '',  // Austin
                    '48113' : 'Dallas',
                    '48201' : 'Houston',
                    '48311' : 'SanAntonio',
                    '48405' : 'SanDiego',
                    '98101' : 'Seattle',
                    '48503' : 'ElPaso'
                }

                if(cachedShapefile == null) {
                shpfile = new L.Shapefile(shapefileName, {
                    onEachFeature: function (feature, layer) {

                        var averageNum = result[cities[feature.properties["ctid"].substring(0, 5)]];
                        //console.log(cities[feature.properties["ctid"].substring(0, 5)] + " average " + averageNum)

                        if (averageNum == undefined) {
                            console.log("undefined")
                            averageNum = 0;
                        }

                        let fireCat = "";
                        let randomGuess = feature.properties["numFires"];
                        if(randomGuess > 1.5 * averageNum) {
                            fireCat = "Highest Potential Zone"
                        } else if(randomGuess > 0.5 * averageNum) {
                            fireCat = "Elevated Potential Zone"
                        } else {
                            fireCat = "Potential Zone"
                        }

                        popupContent = `
                            <div class="risk-estimate-info">
                                <span>Fire Category: ${fireCat}</span><BR>
                                <span>Number of Fires: ${feature.properties["numFires"]}</span><BR>
                            </div>
                            <div class="basic-info">
                                <span>TRCTNAME: ${feature.properties["NAME"]}</span><BR>
                            </div>
                            
                        `;
                        layer.bindPopup(popupContent);
                        layer.options.weight = 0.8;

                        //let fireCat = feature.properties["FIRECAT"];
                        let words = fireCat.toLowerCase().split(' ');
                        if (words.includes("highest")) {
                            layer.options.color = "red";
                        } else if (words.includes("elevated")) {
                            layer.options.color = "orange";
                        } else if (words.includes("potential")) {
                            layer.options.color = "yellow";
                        } else {
                            layer.options.color = "transparent";
                        }

                    }
                })}
                else {
                    shpfile = cachedShapefile;
                }
           
                shpfile.addTo(map);
                cachedShapefile = shpfile;
                currentShapefile = shpfile;
                break;


            case 'none-radio':
                currentShapefile = null;
                break;

        }
    }

    var runGetPurpleAirOnce = false;
    var runGetMicrosoftAirOnce = false;

    async function mapPurpleAirData(map) {

        if (runGetPurpleAirOnce) {
            return;
        }
        runGetPurpleAirOnce = true;

        let sampleData = [
            {
                "link": "https://map.purpleair.com/1/mAQI/a10/p604800/cC0?key=4Z0L6SM6TMMYSTX0&select=27519#14/30.28559/-97.73693",
                "active_status": "yes"
            },
            {
                "link": "https://map.purpleair.com/1/mAQI/a10/p604800/cC0?key=4Z0L6SM6TMMYSTX0&select=27569#13.69/30.28233/-97.72709",
                "active_status": "yes"
            },
        ];


        if(airData.length == 0) {
            let cities = {
                // Cities with northwest latitude, southwest latitude, northwest longitude, southwest longitude
                "":[30.747879,29.978325,-98.056977,-97.357011],
                "Dallas":[33.277373,32.386557,-97.530442,-96.398095],
                "Houston":[29.760427,29.099097,-95.36327,-94.936891],
                "SanAntonio":[29.590767, 29.249684, -98.679199, -98.275590],
                "Seattle":[47.734375,47.30957,-122.453613,-122.148438],
                 "SanDiego":[33.277373,32.386557,-117.530442,-116.398095],
                 "ElPaso":[31.999512,31.332397,-106.699219,-106.000977],
                 "LosAngeles":[34.277373,33.386557,-118.530442,-117.398095],
                 "Riverside":[34.277373,33.386557,-117.530442,-116.398095],
            };

            rawwData = [];

            for(city in cities) {
                let latlng = cities[city];
                let jsonUrl = 'https://api.purpleair.com/v1/sensors?api_key=81D9ACDC-966F-11EC-B9BF-42010A800003&nwlat=' + 
                latlng[0] + '&selat=' + latlng[1] + '&nwlng=' + latlng[2] + '&selng=' + latlng[3] + '&fields=latitude,longitude,altitude,pm2.5_10minute';
                let response = await fetch(jsonUrl);
                let currentData = await response.json();

                rawwData = rawwData.concat(currentData.data);
            }
            airData = rawwData;

            console.log(airData);

        }



        for (let i = 0; i < airData.length; i++) {
            let data = airData[i];
            let sensorKey = data[0];
            let longNLatArray = [data[1], data[2]]; //fetched like [index,long,lat,alt,pm25]...
            var pm10Mins = data[4];
            let colorNDes = getPMDescription(pm10Mins)
            var color = colorNDes[0];
            var description = colorNDes[1];

            var c = ' marker-cluster-';
            if (color == "#00e400") {
                c += 'small';
            } else if (color == "#fdff01") {
                c += 'medium';
            } else {
                c += 'large';
            }
            
            var circleMarker = new L.marker([longNLatArray[0], longNLatArray[1]],
            { 
                icon: L.divIcon({
                    html: '<div><span><b>' + pm10Mins + '</b></span></div>',
                    className: 'marker-cluster' + c, 
                    iconSize: new L.Point(40, 40)
                }),
                title:pm10Mins,
             });

            circleMarker.bindPopup("<div id=" + sensorKey + " >", {
                maxWidth : 201,
                minWidth: 201
            });;

            markers.addLayer(circleMarker);
            purpleAirMonitors.addLayer(circleMarker);

            let airApiUrl = 'https://api.purpleair.com/v1/sensors/' + sensorKey + '?api_key=81D9ACDC-966F-11EC-B9BF-42010A800003';

            //console.log(airApiUrl);
            // Hit URL when user clicks on marker
            circleMarker.on('click', async function (e) {
                
                console.log("clicked on marker " + sensorKey)

                let response = await fetch(airApiUrl);
                let popupData = await response.json();
                popupData = popupData.sensor;

                buildAirDataPopup(circleMarker, popupData, description);
                // Check if marker has popup
                // if (circleMarker.getPopup()) {
                //     // If it does, close it
                //     circleMarker.closePopup();
                // } else {
                //     // If it doesn't, open it
                //     circleMarker.openPopup();
                // }
            });
        }
    }




    function addMore() {
        console.log("hey")
        var moreButton = document.getElementById("moreButton");
        
        if(moreButton.textContent == "More...") {
        document.getElementById("more").style.display = "block";
        document.getElementById("moreButton").textContent = "Less...";
        } else {
        document.getElementById("more").style.display = "none";
        document.getElementById("moreButton").textContent = "More...";
        }
        //airMarkerPopup += `<a href="#">More...</a>`
    }

    function buildAirDataPopup(marker, popupData, description) {
        // console.log(popupData);

        var sensorKey = popupData.sensor_index; //sensor index

        let unixTimestamp = popupData.last_modified;
        var a = new Date(unixTimestamp * 1000);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var time = month + ' ' + date + ', ' + year;

        var airMarkerPopup = `
        <span>
        <div style="
            font-size: xxx-large;
            font-family: sans-serif;
            text-align: center;
            border-color: green;
            border-radius: 20px;
            color: black;
        ">${popupData.stats["pm2.5_10minute"]}
        </div>
        <b>
        ${description} 
        `;

        // insert bold ending brace at end of colon
        //airMarkerPopup.replace(":", ":</b>");
        // Get length of Pm2.5_10minute
        var pmLength = popupData.stats["pm2.5_10minute"].toString().length;

        airMarkerPopup += `
        <span style="
            font-size: small;
            color: grey;
            position: absolute;
            top: 50px;
            right: 10px;
        "> μg/m <sup>3</sup>
        </span>`

        airMarkerPopup += `</div>`;

        airMarkerPopup += buildAirTable(popupData.stats);

        airMarkerPopup += `<a id="moreButton" href="#" onclick="addMore()">More...</a>`

        airMarkerPopup += `<div id="more" style="display:none">
        <div class="air-info">
        <span><b>Time:</b> ${time} </span><BR>
        <span><b>Latitude:</b> ${popupData.latitude} </span><BR>
        <span><b>Longitude:</b> ${popupData.longitude} </span><BR>
        <span><b>Altitude:</b> ${popupData.altitude} </span><BR>
        </div>
        `;

        console.log(airMarkerPopup);

        // Clear the current click event
        //marker.on('click', function (e) {});

        //marker.bindPopup(airMarkerPopup, {
        //    maxWidth : 201
        //});;
        document.getElementById(sensorKey).innerHTML = airMarkerPopup;
        console.log("got far")
        //marker.openPopup();
        //if (marker.getPopup())
        //    console.log("got popup")
        // No marker is popping up, fix this
        // marker.on('click', function (e) {
        //     console.log("clicked on marker " + sensorKey)
        //     // Check if marker has popup
        //     if (marker.getPopup()) {
        //         // If it does, close it
        //         marker.closePopup();

    }

    // build air table for next 5 hours
    function buildAirTable(pmData) {
        // console.log(pmData);
        var data = `
                <tr>
                    <td>${pmData["pm2.5"]}</td>
                    <td>${pmData["pm2.5_10minute"]}</td>
                    <td>${pmData["pm2.5_30minute"]}</td>
                    <td>${pmData["pm2.5_60minute"]}</td>
                    <td>${pmData["pm2.5_6hour"]}</td>
                    <td>${pmData["pm2.5_24hour"]}</td>
                    <td>${pmData["pm2.5_1week"]}</td>
                </tr>
                `;


        var table = `
        <table style="
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 0.9em;
        font-family: sans-serif;
        min-width: 210px;
        min-height: 30px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    ">
        <thead style="
        text-align: center;
        padding: 10px 40px;
        font-size: smaller;
        background-color: #009375;
        color: #ffffff;
        text-align: center;
    ">
            <tr>
                <th>Now</th>
                <th>10 Min</th>
                <th>30 Min</th>
                <th>1 hr</th>
                <th>6 hr</th>
                <th>1 Day</th>
                <th>1 Week</th>
            </tr>
        <thead>
        <tbody>
            ${data}
        </tbody>
        <table/>
        `;
        return table;
    }

    function getPMDescription(pm10Mins, AQI = false) {
        let description = "";
        let color = "";
        if ((AQI && pm10Mins <= 50) || pm10Mins <= 12) {
            color = '#00e400';
            description = '<span>0-12: Air quality is satisfactory, and air pollution poses little or no risk with 24 hours of exposure.</span><BR>';
        } else if ((AQI && pm10Mins <= 100) || pm10Mins <= 35) {
            color = '#fdff01';
            description = '<span>12.1-35.4: Air quality is acceptable. However, there may be a risk for some people with 24 hours of exposure, particularly those who are unusually sensitive to air pollution.</span><BR>';
        } else if ((AQI && pm10Mins <= 150) || pm10Mins <= 55) {
            color = '#ff7e01';
            description = '<span>35.5-55.4: Members of sensitive groups may experience health effects. The general public is less likely to be affected.</span><BR>';
        } else if ((AQI && pm10Mins <= 200) || pm10Mins <= 150) {
            color = '#ff0100';
            description = '<span>55.5-150.4: Some members of the general public may experience health effects: members of sensitive groups may experience more serious health effects.</span><BR>';
        } else if ((AQI && pm10Mins <= 300) || pm10Mins <= 250) {
            color = '#8f3f97';
            description = '<span>150.5-250.4: Health Alert: The risk of health effects is increased for everyone.</span><BR>';

        } else if ((AQI && pm10Mins <= 301) || pm10Mins <= 350) {
            color = '#7e0023';
            description = '<span>250.5-350.4: Health Warning: Health warning of emergency conditions: everyone is more likely to be affected.</span><BR>';

        } else {
            color = '#7e0023';
            description = '<span>>=350.5: Health Warning: Health warning of emergency conditions: everyone is more likely to be affected.</span><BR>';

        }
        return [color, description];
    }

    async function mapMicrosoftAirData(map) {

        if(runGetMicrosoftAirOnce) {
            return;
        }
        runGetMicrosoftAirOnce = true;

        let microsoftSerialNumber = [
            {
                serial_number: 2032,
                latitude: 30.389722,
                longtitude: -97.726278,
                owned: 'TACC',
            },
            {
                serial_number: 2028,
                latitude: 30.28463302,
                longtitude: -97.7409172,
                owned: 'UIL',
            },
            {
                serial_number: 2031,
                latitude: 30.35748,
                longtitude: -97.76211,
                owned: 'COA',
            },
            {
                serial_number: 2029,
                latitude: 30.357686,
                longtitude: -97.762113,
                owned: 'COA',
            },
        ];

        let addedSerialNumber = new Set();

        let airApiUrl = 'https://eclipseprowebapi.azurewebsites.net/EclipseData/GetEclipseData?CustomerName=Austin&RecentNHours=1';
        let response = await fetch(airApiUrl);
        let microData = await response.json();
        let selectedData = [];

        for (let i = 0; i < microData.length; i++) {
            let deviceNum = parseInt(microData[i].MSRDeviceNbr);
            for (let j = 0; j < microsoftSerialNumber.length; j++) {
                let dp = microsoftSerialNumber[j];
                let serial_number = dp.serial_number;
                if (serial_number === deviceNum && !addedSerialNumber.has(serial_number)) {
                    microData[i]['Longitude'] = dp.longtitude;
                    microData[i]['Latitude'] = dp.latitude;
                    selectedData.push(microData[i]);
                    addedSerialNumber.add(serial_number);
                }
            }

        }

        //map 
        for (let i = 0; i < selectedData.length; i++) {
            popupData = selectedData[i];

            var pm10Mins = popupData["PM10"];
            let colorNDes = getPMDescription(pm10Mins, true);
            var color = colorNDes[0];
            // var description = colorNDes[1];
            var description = "";



            /*var circleMarker = L.circleMarker([popupData.Latitude, popupData.Longitude], {
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                radius: 15,
            }).addTo(map);
            var circleMarker = L.marker([popupData.Latitude, popupData.Longitude], {
                icon: L.divIcon({
                    className: 'my-custom-icon',
                    html: (Math.round(pm10Mins * 100) / 100).toFixed(2),
                }),
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                radius: 15,
            }).addTo(map);  */


            var c = ' marker-cluster-';
            if (color == "#00e400") {
                c += 'small';
            } else if (color == "#fdff01") {
                c += 'medium';
            } else {
                c += 'large';
            }

            var circleMarker = new L.marker([popupData.Latitude, popupData.Longitude],
                { 
                    icon: L.divIcon({
                        html: '<div><span><b>' + (Math.round(pm10Mins * 100) / 100).toFixed(2) + '</b></span></div>',
                        className: 'marker-cluster' + c, 
                        iconSize: new L.Point(40, 40)
                    }),
                    title:pm10Mins,
                 });

            markers.addLayer(circleMarker);
            microsoftAirMonitors.addLayer(circleMarker);


            buildMicrosoftAirDataPopup(circleMarker, popupData, description);
        }
    }
    function buildMicrosoftAirDataPopup(marker, popupData, description) {
        // console.log(popupData);

        let datetime = popupData.ReadingDateTimeLocal;

        
        var airMarkerPopup = `
            <div class="air-info">
            <span>Time: ${datetime} </span><BR>
            <span>Latitude: ${popupData.Latitude} </span><BR>
            <span>Longitude: ${popupData.Longitude} </span><BR>
            <span>Temperture: ${(Math.round(popupData.TempC * 100) / 100).toFixed(2)} </span><BR>
            <span>Humidity: ${(Math.round(popupData.Humidity * 100) / 100).toFixed(2)} </span><BR>


        `;
        airMarkerPopup += `
                <span>AQI: ${(Math.round(popupData.PM10 * 100) / 100).toFixed(2)} </span><BR>
                <span>AQI Label: ${popupData.AQILabel} </span><BR>

                ${description}
        `;

        airMarkerPopup += `</div>`;

        airMarkerPopup += buildMicrosoftAirTable(popupData);
        marker.bindPopup(airMarkerPopup);
    }

    function buildMicrosoftAirTable(pmData) {
        // console.log((Math.round(pmData["PM10"] * 100) / 100).toFixed(2));
        var data = `
                <tr>
                    <td>${(Math.round(pmData["PM1"] * 100) / 100).toFixed(2)}</td>
                    <td>${(Math.round(pmData["PM10"] * 100) / 100).toFixed(2)}</td>
                    <td>${(Math.round(pmData["PM25"] * 100) / 100).toFixed(2)}</td>
                </tr>
                `;


        var table = `
        <table>
        <thead>
            <tr>
                <th>PM 1</th>
                <th>PM 2.5</th>
                <th>PM 10</th>
            </tr>
        <thead>
        <tbody>
            ${data}
        </tbody>
        <table/>
        `;
        return table;
    }

    var poiMarkers = [];
    let current_waterpollution_map = null;

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
                }).then(water_json => {
               
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
           
                        // marker.setIcon(L.icon({
                        //     iconUrl: "./assets/images/water_icon.png",
                        //     iconSize: [10 * scale, 10],
                        //     iconAnchor: [10, 10],
                        //     popupAnchor: [-5, 0]
                        // }));


                        let date = new Date(water_data.sample_date);
                      

                        marker.bindPopup(`<b style="color:#191970; font-size:16px">Water Information</b> <br> 
                        <b>Date:</b> ${date.getMonth()}/${date.getDay()}/${date.getFullYear()} <br> 
                        <b>Project:</b> ${water_data.project} <br>
                        <b>Parameter:</b> ${water_data.parameter} <br>
                        <b>Result:</b> ${water_data.result} ${water_data.unit} <br>` );

                        waterPollution.addLayer(marker)
                        

                    }

                });

                waterPollution.addTo(map);
                current_waterpollution_map = waterPollution;

                console.log("got all pollution")

                
            
    }

    function buildPOIMap() {
        // Delete all markers
        for (var i = 0; i < poiMarkers.length; i++) {
            poiMarkers[i].remove();
        }
        poiMarkers = []; // 清空数组

        var fireDept = document.querySelector(".firedept").checked;

        if (!fireDept) {
            // Hide loading overlay when checkbox is unchecked
            hideLoadingOverlay();
            return;
        }
        
        // Show loading overlay
        showLoadingOverlay('Loading construction data...');

        var mechanical_permits = [];

        let scale = 1.278
        // https://data.austintexas.gov/resource/3syk-w9eu.json

        // 尝试使用API查询参数直接筛选MP类型和Active状态的记录
        // Socrata API支持$where查询参数
        var apiUrl = 'https://data.austintexas.gov/resource/3syk-w9eu.json?$where=permittype=\'MP\' AND status_current=\'Active\'&$limit=5000';
        fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json(); 
                }).then(construction_json => {
                    for (var i = 0; i < construction_json.length; i++) {
                        permit = construction_json[i];
                        
                        // filter permits
                        if(permit.permittype == "MP" && permit.status_current == "Active") {
                            // 检查坐标是否有效
                            if (!permit.latitude || !permit.longitude) {
                                continue;
                            }

                            var marker = L.marker([permit.latitude, permit.longitude]).addTo(map);
                            // Change the icon to a custom icon
                      
                            marker.setIcon(L.icon({
                                iconUrl: "./assets/images/construction.png",
                                iconSize: [20 * scale, 20],
                                iconAnchor: [10, 10],
                                popupAnchor: [-5, 0]
                            }));

                            marker.bindPopup(`<b style="color:#191970; font-size:16px">Construction</b> <br> 
                            <b>Description:</b> ${permit.description} <br> ` );
                            poiMarkers.push(marker);
                        } 
                    }
                    
                    // Hide loading overlay after data is loaded
                    hideLoadingOverlay();
                  
                }).catch(error => {
                    // 如果筛选查询失败，回退到获取全部数据
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
                                    // 检查坐标是否有效
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
                                    <b>Description:</b> ${permit.description} <br> ` );
                                    poiMarkers.push(marker);
                                } 
                            }
                            
                            // Hide loading overlay after fallback data is loaded
                            hideLoadingOverlay();
                        });
                }).catch(error => {
                    console.error('[buildPOIMap] 获取数据时出错:', error);
                    // Hide loading overlay on error
                    hideLoadingOverlay();
                });
        
    }




        // Call the function to retrieve and process the GeoJSON file
    let noisePoints2 = [];
    let current_noise_shapefile = null;
    
    // Generic loading overlay functions
    function showLoadingOverlay(loadingText = 'Loading...') {
        const loadingOverlay = document.getElementById('data-loading-overlay');
        const progressBar = document.getElementById('loading-progress-bar');
        const percentageText = document.getElementById('loading-percentage');
        const textElement = document.getElementById('loading-text');
        
        if (loadingOverlay) {
            // Set loading text
            if (textElement) {
                textElement.textContent = loadingText;
            }
            
            loadingOverlay.style.display = 'flex';
            if (progressBar) {
                progressBar.style.width = '0%';
            }
            if (percentageText) {
                percentageText.textContent = '0%';
            }
            
            // Simulate progress animation
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90; // Don't complete until actual data loads
                if (progressBar) {
                    progressBar.style.width = progress + '%';
                }
                if (percentageText) {
                    percentageText.textContent = Math.floor(progress) + '%';
                }
            }, 200);
            
            // Store interval ID for cleanup
            loadingOverlay.dataset.progressInterval = progressInterval;
        }
    }
    
    function hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('data-loading-overlay');
        const progressBar = document.getElementById('loading-progress-bar');
        const percentageText = document.getElementById('loading-percentage');
        
        if (loadingOverlay) {
            // Complete the progress bar
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.style.animation = 'none';
            }
            if (percentageText) {
                percentageText.textContent = '100%';
            }
            
            // Clear progress interval if exists
            if (loadingOverlay.dataset.progressInterval) {
                clearInterval(parseInt(loadingOverlay.dataset.progressInterval));
            }
            
            // Hide after a short delay to show completion
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                if (progressBar) {
                    progressBar.style.width = '0%';
                    progressBar.style.animation = 'progress-animation 2s ease-in-out infinite';
                }
                if (percentageText) {
                    percentageText.textContent = '0%';
                }
            }, 300);
        }
    }

    function buildNoiseHeatmap() {
        // Check if checkbox is still checked before starting async operation
        if (!document.querySelector(".choropleth_incident").checked) {
            // Hide loading overlay when checkbox is unchecked
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
            if (!document.querySelector(".choropleth_incident").checked) {
                hideLoadingOverlay();
                return;
            }

            noisePoints2 = [];
            for(var i = 0; i < 10000000; i++) {
                const json_object = data[String(i)];
                if(json_object) {
                    noisePoints2.push([json_object.latitude, json_object.longitude, Math.max(30, data[String(i)].noise_level)])
                }
            }
            
            var heat = L.heatLayer(
                noisePoints2
            , {radius: 5, max: 80, maxZoom: 15, blur: 1});
            
            // Final check before adding to map
            if (document.querySelector(".choropleth_incident").checked) {
                heat.addTo(map);
                current_noise_shapefile = heat;
            }
            
            // Hide loading overlay after data is processed
            hideLoadingOverlay();
        }

        // Try to load from Firebase Storage using getDownloadURL
        // Note: CORS issues may occur if Firebase Storage bucket CORS is not configured
        noiseRef.getDownloadURL().then((url) => {
            // Check again before making request
            if (!document.querySelector(".choropleth_incident").checked) {
                hideLoadingOverlay();
                return;
            }

            // Use fetch with proper error handling
            // The download URL from Firebase should be a signed URL that works
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
                return response.text(); // Use text() instead of blob() for JSON
            })
            .then(text => {
                // Check checkbox state again before adding layer
                if (!document.querySelector(".choropleth_incident").checked) {
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
            // This includes CORS preflight failures
            console.warn('[buildNoiseHeatmap] Firebase Storage getDownloadURL failed, falling back to local file:', error.message);
            loadLocalNoiseData();
            // Note: hideLoadingOverlay will be called in loadLocalNoiseData or its catch block
        });

        // Load data from local cleaned_noise.zip
        function loadLocalNoiseData() {
            // Check checkbox state
            if (!document.querySelector(".choropleth_incident").checked) {
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
                    // Hide loading overlay on error
                    hideLoadingOverlay();
                });
        }
    }



    let current_watershed_shapefile = null;


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
            onEachFeature: function(feature,layer){
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
                        <b>Water Chemistry:</b> <span style="background-color:${watershedInformationColor(props.wqcd)}">${props.wqcd}  </span> <br>` 
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
    
    function buildNoiseLayer() {
        if (current_noise_shapefile != null){
            map.removeLayer(current_noise_shapefile)
            current_noise_shapefile = null
        }
        if (!document.querySelector(".choropleth_incident").checked) {
            return
        }

       
        buildNoiseHeatmap();
        
       
       
    }

    let current_road_incident = null
    function buildRoadIncident() {
        if (current_road_incident != null){
            map.removeLayer(current_road_incident)
            current_road_incident = null
        }
        if (!document.querySelector(".road_incident").checked) {
            return
        }
        let shapefile_path = "data/road_incident.zip";
        let popupContent = ``;
        function getColor(d) {
            return d > 1000 ? '#800026' :
                   d > 500  ? '#BD0026' :
                   d > 300  ? '#E31A1C' :
                   d > 100  ? '#FC4E2A' :
                   d > 50   ? '#FD8D3C' :
                   d > 10   ? '#FEB24C' :
                   d > 0   ? '#FED976' :
                              '#FFEDA0';
        }
        let shpfile = new L.Shapefile(shapefile_path, {
            onEachFeature: function(feature,layer){
                let count = Number(feature.properties["count"]);
                if(count >= 10) {
                    popupContent = `
                    <div class="basic-info">
                        <span>ID: ${feature.properties["LINEARID"]}</span><BR>
                        <span>Name: ${feature.properties["FULLNAME"]} </span><BR>
                    </div>
                    <div class="stats-info">
                        <span>Incident Count: ${feature.properties["count"]} </span><BR>
                    </div>
                    `;
                }
                else {
                    popupContent = `
                    <div class="stats-info">
                        <span>Incident Count: ${feature.properties["count"]} </span><BR>
                    </div>
                    `;
                }
                layer.bindPopup(popupContent);
                layer.options.color = getColor(count)
                layer.options.weight = 2
            }
        })
        shpfile.addTo(map);
        current_road_incident = shpfile;
    }

    let current_traffic_layer = null;
    function builtTrafficMap() {
        if (current_traffic_layer != null) {
            map.removeLayer(current_traffic_layer)
            current_traffic_layer = null
        }
        if (!document.querySelector(".traffic_condition").checked) {
            return
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
 
        // traffic_layer.bringToFront();
        current_traffic_layer = traffic_layer
    }

    // let current_bike_path_layer = null;
    // function builtBikePathMap() {
    //     if (current_bike_path_layer != null) {
    //         map.removeLayer(current_bike_path_layer)
    //         current_bike_path_layer = null
    //     }
    //     if (!document.querySelector(".bike_path").checked) {
    //         return
    //     }
    //     let bike_path_layer = L.gridLayer.googleMutant({
    //         type: "roadmap",
    //         styles: [
    //             { featureType: "all", stylers: [{ visibility: "off" }] },
    //         ],
    //     }).addTo(map);
    //     bike_path_layer.addGoogleLayer("BicyclingLayer");
    //     current_bike_path_layer = bike_path_layer;
    // }

    function buildDropdownMenu(map) {
        var checkList = document.getElementById('filter-menu');
        checkList.getElementsByClassName('anchor')[0].onclick = function (evt) {
            if (checkList.classList.contains('visible'))
                checkList.classList.remove('visible');
            else
                checkList.classList.add('visible');
        }

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



        /*var checkLocation = document.querySelector(".option2");
        checkLocation.addEventListener('click', function () {
            console.log("Checking location");
            getUserLocation();
        }); */

        var checkboxPurpleAir = document.querySelector(".purple-air");
        checkboxPurpleAir.addEventListener('click', function () {
            if (checkboxPurpleAir.checked) {
                purple_air_diaplay_flag = true
                if(microsoft_air_display_flag) {
                    map.removeLayer(purpleAirMonitors)
                    map.removeLayer(microsoftAirMonitors)
                    map.addLayer(markers)
                }
                else 
                    map.addLayer(purpleAirMonitors)
            } else {
                purple_air_diaplay_flag = false
                if(microsoft_air_display_flag) {
                    map.removeLayer(markers)
                    map.addLayer(microsoftAirMonitors)
                }
                else 
                    map.removeLayer(purpleAirMonitors)
            }
            // console.log(purple_air_diaplay_flag);

        });

        var checkboxMicrosoftAir = document.querySelector(".microsoft-air");
        checkboxMicrosoftAir.addEventListener('click', function () {
            if (checkboxMicrosoftAir.checked) {
                microsoft_air_display_flag = true
                if(purple_air_diaplay_flag) {
                    map.removeLayer(microsoftAirMonitors)
                    map.removeLayer(purpleAirMonitors)
                    map.addLayer(markers)
                }
                else
                    map.addLayer(microsoftAirMonitors)
            } else {
                microsoft_air_display_flag = false
                if(purple_air_diaplay_flag) {
                    map.removeLayer(markers)
                    map.addLayer(purpleAirMonitors)
                }
                else
                    map.removeLayer(microsoftAirMonitors)
            }

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

    function addShapefileRadioListener(map) {
        var radios = document.getElementsByName('shapefile-radio');
        for (var i = 0, max = radios.length; i < max; i++) {
            radios[i].onclick = function () {
                shapefile_display_flag = this.value;
                // console.log(shapefile_display_flag)
               if(currentShapefile != null) 
                    map.removeLayer(currentShapefile)
                buildShapefile(map, shapefile_display_flag)
            }
        }
    }


    var data = "<item><title>Traffic Injury Pri 4F</title>" +
        "<link>http://maps.google.com/maps?q=30.389258,-97.745772</link>" +
        "<description>9800-9832 RESEARCH BLVD SVRD SB | AFD | 16:12:50</description>" +
        "<pubDate>Mon, 06 Dec 2021 16:12:50 CDT</pubDate></item>";

    // initialize map and base layer
    var map = L.map('map',{ preferCanvas:true, zoomControl: false, renderer: L.canvas() }).setView([30.356635, -97.701180], 12);

    new L.Control.Zoom({ position: 'bottomright' }).addTo(map);

    var currentLon = -1;
    var currentLat = -1;
    var predictedNoise = -1;
    var selectedNoise = 40;

    function openNoiseMore() {
        console.log("hey")
        var moreButton = document.getElementById("openSurveyButton");
        
        if(moreButton.textContent != "Close") {
            document.getElementById("noiseSurvey").style.display = "block";
            document.getElementById("openSurveyButton").style.display = "none";
            document.getElementById("noiseDescrip").style.display = "none";
        }
        //airMarkerPopup += `<a href="#">More...</a>`
    }

    function slide(amount) {

        var comparison = "a whisper"
        selectedNoise = amount;
        if(amount < 40) {
            comparison = "a whisper (or quieter)"
        } else if(amount < 50) {
            comparison = "rain"
        } else if(amount < 60) {
            comparison = "an average indoor room"
        } else if(amount < 70) {
            comparison = "an average office room"
        } else if(amount < 80) {
            comparison = "landscaping equipment (from inside a home)"
        } else if(amount < 85) {
            comparison = "an electric vacuum"
        } else if(amount < 90) {
            comparison = "a noisy restaurant"
        } else if(amount < 95) {
            comparison = "a hairdryer"
        } else if(amount < 100) {
            comparison = "a professional sports game"
        } else if(amount < 110) {
            comparison = "a lawn mower"
        } else if(amount < 120) {
            comparison = "an ambulance"
        }  else if(amount < 130) {
            comparison = "a jackhammer"
        } else {
            comparison = "a gun firing (or louder)"
        }

    
        document.getElementById("noiseScaleLabel").innerText = comparison + " (" + amount + " db)";
    }

    
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
            document.getElementById("noiseDescrip").innerText = "Thank you for your input!"
        });
    }

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
           
            // calculate distance from noise point, if less than 20 meters (20 / 111139), use as noise level, if not consider noise level normal
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

        var extraInformation = "The noise levels around you are as loud as a whisper. These levels of noise are <i>safe!</i>"
        if(bestPointNoiseLevel < 40) {
            extraInformation = "The noise levels around you are as loud as a whisper. These levels of noise are <i>safe!</i>"
        } else if(bestPointNoiseLevel < 60) {
            extraInformation = "The noise levels around you are as loud as an average indoor room. These levels of noise are <i>safe!</i>"
        } else if(bestPointNoiseLevel < 70) {
            extraInformation = "The noise levels around you are as loud as an average office room. These levels of noise are <i>safe!</i>"
        } else if(bestPointNoiseLevel < 80) {
            extraInformation = "The noise levels around you are as loud as landscaping equipment (from inside a home). These levels of noise can be <i>dangerous</i> if you are exposed to them over time. "
        } else if(bestPointNoiseLevel < 85) {
            extraInformation = "The noise levels around you are as loud as an electric vacuum. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. "
        } else if(bestPointNoiseLevel < 85) {
            extraInformation = "The noise levels around you are as loud as an electric vacuum. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. "
        } else if(bestPointNoiseLevel < 90) {
            extraInformation = "The noise levels around you are as loud as a noisy restaurant. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. "
        } else if(bestPointNoiseLevel < 95) {
            extraInformation = "The noise levels around you are as loud as a hairdryer. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. "
        } else if(bestPointNoiseLevel < 100) {
            extraInformation = "The noise levels around you are as loud as a pro sports game. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. "
        } else if(bestPointNoiseLevel < 100) {
            extraInformation = "The noise levels around you are as loud as a pro sports game. These levels of noise can be <i>dangerous</i> if you are exposed to them over time. "
        } else if(bestPointNoiseLevel < 110) {
            extraInformation = "The noise levels around you are as loud as a lawn mower. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection."
        } else if(bestPointNoiseLevel < 120) {
            extraInformation = "The noise levels around you are as loud as an ambulance. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection."
        }  else if(bestPointNoiseLevel < 130) {
            extraInformation = "The noise levels around you are as loud as a jackhammer. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection."
        } else {
            extraInformation = "The noise levels around you are as loud or louder than a gun firing. These levels of noise are dangerous and can cause pain. If you are exposed to these levels, please wear sound protection."
        }
        
        const submitContent = 
                            `<div style="display:none" id="noiseSurvey">
    
                                <span style="font-size:12px">What does the noise around you (outside) sound like? </span><br>
                                As loud as <b id="noiseScaleLabel">rain (40 db)</b>
                                <div class="slidecontainer">
                                    <input type="range" min="25" max="130" value="40" class="slider" id="myRange" onChange="slide(this.value)">
                                </div>
                                <a id="" href="#" onclick="onSubmit()" ><b>Submit</b></a>

                            </div>`

        


        const normalLevelContent = `<b style="font-size:20px">Noise</b> <br> 
        <span style="font-size:16px"><b>Predicted Noise Level:</b> Normal.</span> <br>
        The noise levels at this location are normal!`;

        const noisePointFoundContent = `<b style="font-size:20px">Noise Level</b> <br> 
        <span style="font-size:16px"><b>Predicted Noise Level:</b> <i>${bestPointNoiseLevel} </i> db </span> <span id="noiseDescrip"> <br> ${extraInformation} </span>
        <br> <i><a id="openSurveyButton" href="#" onclick="openNoiseMore()" >Add Noise Information at this Location</a></i>` + submitContent
        
        const content = bestPointNoiseLevel == -1 ? normalLevelContent : noisePointFoundContent;
        
        
        var popup = L.popup()
            .setLatLng([e.latlng.lat, e.latlng.lng])
            .setContent(content)
            .openOn(map);


            

    });
    

    let inactive_flag = false;
    let purple_air_diaplay_flag = false;
    let microsoft_air_display_flag = false;

    addMapLayer(map);

    // map today's dp
    let dateArray = [];
    var airData = [];
    var today = new Date();
    var date = today.getFullYear() + '-' + ("0" + (today.getMonth() + 1)).slice(-2) + '-' + ("0" + today.getDate()).slice(-2);
    dateArray.push(date);
    let shapefile_display_flag = 'none-radio';
    // mapFireIncident(map, dateArray, inactive_flag, shapefile_display_flag, purple_air_diaplay_flag, microsoft_air_display_flag);
    // addShapefileRadioListener(map);
    buildSelectBar(map);
    buildDropdownMenu(map);




    map._layersMaxZoom = 19;




    // add zostera legend
    L.control.legend({
        position: 'bottomleft',
        items: [
            {color: 'white', label: '<b>Fire Risk</b>'},
            {color: 'red', label: 'Highest'},
            {color: 'orange', label: 'Elevated'},
            {color: 'yellow', label: 'Low'},
            {color: 'white', label: ''},
            {color: 'white', label: '<b>Smoke Levels</b>'},
            {color: '#9cd74e', label: 'Good'},
            {color: '#facf39', label: 'Moderate'},
            {color: '#f68f47', label: 'Unhealthy for Sensitive Groups'},
            {color: '#f55e5f', label: 'Unhealthy'},
            {color: '#a070b5', label: 'Very Unhealthy'},
            {color: '#a06a7b', label: 'Hazardous'},
        ],
        collapsed: true,
        // insert different label for the collapsed legend button.
        buttonHtml: 'Legend'
    }).addTo(map);

    document.getElementsByClassName("leaflet-left")[1].style.left = "5px"
    document.getElementsByClassName("leaflet-legend-list")[0].style = "text-align: left;"

    // add geolocator for address
    //const provider = new GeoSearch.OpenStreetMapProvider();

    //const search = new GeoSearch.GeoSearchControl({
    //    provider: new GeoSearch.OpenStreetMapProvider(),
    //});
    //map.addControl(search);

    // create the geocoding control and add it to the map
    var searchControl = L.esri.Geocoding.geosearch({
        position: 'topright',
        placeholder: 'Enter an address or place e.g. 1 York St',
        providers: [
        L.esri.Geocoding.arcgisOnlineProvider({
            // API Key to be passed to the ArcGIS Online Geocoding Service
            apikey: 'AAPK88fbee9b41364fc28314cabcb5108702X4OOHT6TEoflnY2xPNIuDPA8zi_zSGHg0weTJJzjiOFWugapHwRA5DvZw7Uht0eR'
        })
        ]
    }).addTo(map);


    //document.getElementsByClassName("geocoder-control")[0].children[0].style = "background-color: transparent; border-color: transparent; background-image:url(assets/images/search.png);"
    //document.getElementsByClassName("geocoder-control")[0].style = "position: fixed;top: 2.5px;right: -4.5px;"

    console.log(searchControl)

    // create an empty layer group to store the results and add it to the map
    var results = L.layerGroup().addTo(map);

    // listen for the results event and add every result to the map
    searchControl.on("results", function (data) {
        foundLocationGeocoded(data);
    });

    // Get user location and display on map


  L.Control.Watermark = L.Control.extend({
    onAdd: function (map) {
        var container = L.DomUtil.create('div');
        container.type="button";
        container.title="No cat";
        container.value = "42";
        container.classList = ["geocoder-control leaflet-control"]
    
        /*container.style.backgroundColor = 'white';     
        //container.style.backgroundImage = "url(https://t1.gstatic.com/images?q=tbn:ANd9GcR6FCUMW5bPn8C4PbKak2BJQQsmC-K9-mbYBeFZm1ZM2w2GRy40Ew)";
        container.style.backgroundSize = "30px 30px";
        container.style.width = '30px';
        container.style.height = '30px'; 
        
        container.onmouseover = function(){
          container.style.backgroundColor = 'pink'; 
        }
        container.onmouseout = function(){
          container.style.backgroundColor = 'white'; 
        } */
    
        container.onclick = function(){
          getUserLocation();
        }
    
        container.innerHTML = `
        <div class=\"geocoder-control-input leaflet-bar\" title=\"Check My Location\" style=\"position:absolute;top:0px; background-image: url(https://smartcity.tacc.utexas.edu/FireIncident/assets/images/location.png)\"></div><div class=\"geocoder-control-suggestions leaflet-bar\"><div class=\"\"></div></div>\r\n
        `;

        return container;
      },

    onRemove: function(map) {
        // Nothing to do here
    }
});

L.control.watermark = function(opts) {
    return new L.Control.Watermark(opts);
}

L.control.watermark({ position: 'bottomright' }).addTo(map);


L.Control.Watermark = L.Control.extend({
    onAdd: function (map) {
        var container = L.DomUtil.create('div');
        container.type="button";
        container.title="No cat";
        container.value = "42";
        container.classList = ["geocoder-control leaflet-control"]
    
        /*container.style.backgroundColor = 'white';     
        //container.style.backgroundImage = "url(https://t1.gstatic.com/images?q=tbn:ANd9GcR6FCUMW5bPn8C4PbKak2BJQQsmC-K9-mbYBeFZm1ZM2w2GRy40Ew)";
        container.style.backgroundSize = "30px 30px";
        container.style.width = '30px';
        container.style.height = '30px'; 
        
        container.onmouseover = function(){
          container.style.backgroundColor = 'pink'; 
        }
        container.onmouseout = function(){
          container.style.backgroundColor = 'white'; 
        } */
    
        container.onclick = function() {
            stats();
        };
    
        container.innerHTML = `
        <div class=\"geocoder-control-input leaflet-bar\" title=\"Stats\" style=\"    

        background-image: url(); width:35px; \"><img src="https://smartcity.tacc.utexas.edu/FireIncident/assets/images/stats1.png" style="width: 20px;height: 20px;position: absolute;left: 5px;"></div><div class=\"geocoder-control-suggestions leaflet-bar\"><div class=\"\"></div></div>\r\n
        `;

        return container;
      },

    onRemove: function(map) {
        // Nothing to do here
    }
});

/*
L.control.watermark = function(opts) {
    return new L.Control.Watermark(opts);
}


L.control.watermark({ position: 'bottomright' }).addTo(map);
*/
//document.getElementsByClassName("geocoder-control")[0].style = "position:fixed;width: 10px;top: 2.5px;right: 29.5px;"


L.Control.Watermark = L.Control.extend({
    onAdd: function (map) {
        var container = L.DomUtil.create('div');
        container.type="button";
        container.title="No cat";
        container.value = "42";
        container.classList = ["geocoder-control leaflet-control"]
    
        /*container.style.backgroundColor = 'white';     
        //container.style.backgroundImage = "url(https://t1.gstatic.com/images?q=tbn:ANd9GcR6FCUMW5bPn8C4PbKak2BJQQsmC-K9-mbYBeFZm1ZM2w2GRy40Ew)";
        container.style.backgroundSize = "30px 30px";
        container.style.width = '30px';
        container.style.height = '30px'; 
        
        container.onmouseover = function(){
          container.style.backgroundColor = 'pink'; 
        }
        container.onmouseout = function(){
          container.style.backgroundColor = 'white'; 
        } */
    
        //container.onclick = function() {
         //   stats();
        //};
    
        container.innerHTML = `
        <div class=\"dropdown-check-list geocoder-control-input leaflet-bar\" title=\"Layers\" style=\"    background-color: transparent;
        border-color: transparent; background-image: url(); width:35px; \"><img src="assets/images/layers.png" style="width: 20px;height: 20px;position: absolute;left: 5px;"></div><div class=\"geocoder-control-suggestions leaflet-bar\"><div class=\"\"></div></div>\r\n
        `;

        return container;
      },

    onRemove: function(map) {
        // Nothing to do here
    }
});

L.control.watermark = function(opts) {
    return new L.Control.Watermark(opts);
}

// default for noise map
let noiseCheckbox = document.querySelector(".choropleth_incident")
console.log(noiseCheckbox.checked)
if(noiseCheckbox.checked) {
    buildNoiseLayer()
}


L.control.watermark({ position: 'bottomright' }).addTo(map);

//document.getElementsByClassName("geocoder-control")[0].style = "position:fixed;width: 10px;top: 2.5px;right: 67.5px;"


    var spinner = document.getElementById('spinner');
    spinner.style.display = 'none';

    document.getElementsByClassName( 'leaflet-control-attribution' )[0].style.display = 'none';