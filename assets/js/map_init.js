/**
 * map_init.js
 * 
 * Main initialization script for AustinUrbanNoise map
 * Orchestrates the initialization of all map features and components
 */

// Declare map as global variable for accessibility across scripts
var map;

/**
 * Initialize map and all features
 */
function initMapAndFeatures() {
    // 1. Initialize map
    map = initMap('map', [30.356635, -97.701180], 12, {
        preferCanvas: true,
        zoomControl: false,
        renderer: L.canvas()
    });

    // 2. Add base map layer
    addMapLayer(map);

    // 3. Initialize geocoding search
    // Esri ArcGIS API Key for geocoding
    var esriApiKey = 'AAPK88fbee9b41364fc28314cabcb5108702X4OOHT6TEoflnY2xPNIuDPA8zi_zSGHg0weTJJzjiOFWugapHwRA5DvZw7Uht0eR';
    initGeocodingSearch(map, esriApiKey);

    // 4. Build select bar (date picker setup)
    buildSelectBar(map);

    // 5. Build dropdown menu (includes event listeners)
    buildDropdownMenu(map);

    // 6. Setup map click handler for noise information
    setupMapClickHandler();

    // 7. Create custom control buttons
    var locationButton = createLocationButton(map);
    locationButton.addTo(map);

    var statsButton = createStatsButton(map);
    statsButton.addTo(map);

    var layersButton = createLayersButton(map);
    layersButton.addTo(map);

    // 8. Initialize default layers
    initDefaultLayers();

    // 9. Hide spinner
    hideSpinner();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMapAndFeatures);
} else {
    // DOM is already ready
    initMapAndFeatures();
}

