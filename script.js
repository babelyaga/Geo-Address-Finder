// Дефиниране на географски граници за картата
var southWest = L.latLng(-90, -180),
    northEast = L.latLng(90, 180),
    bounds = L.latLngBounds(southWest, northEast);

// Създаване на карта с Leaflet с определени настройки и задаване на начален изглед
var map = L.map('mapid', {
    maxBounds: bounds,
    maxZoom: 18,
    minZoom: 3
}).setView([43.0757, 25.6172], 1);

// Добавяне на слой с тайлове от OpenStreetMap към картата
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {}).addTo(map);

var marker;

// Обработка на събитие keyup на полето за въвеждане на адрес, за да се предложат местоположения
$('#address').on('keyup', function () {
    var value = $(this).val();
    if (value.length < 1) {
        $('#suggestions').empty();
        return;
    }
    // Използване на услугата за геокодиране на ArcGIS, за да се получат предложения за местоположения
    axios.get('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest', {
        params: {
            f: 'json',
            text: value
        }
    })
    .then(function (response) {
        // Показване на предложенията за местоположения в списък
        var suggestions = '<div class="list-group">';
        $.each(response.data.suggestions, function (i, suggestion) {
            if (suggestion.isCollection === false) {
                suggestions += '<button class="list-group-item list-group-item-action" onclick="panToLocation(\'' + suggestion.text + '\')">' + suggestion.text + '</button>';
            }
        });
        suggestions += '</div>';
        $('#suggestions').html(suggestions);
    })
});

// Проверка дали устройството е мобилно
var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Добавяне на слушател на събитие в зависимост от типа устройство, за да се обработват събитията на картата
if (isMobile) {
    map.on('touchstart', function (e) {
        handleMapEvent(e);
    });
} else {
    map.on('contextmenu', function (e) {
        handleMapEvent(e);
    });
}

// Функция за обработка на събитията на картата, като щракване или докосване
function handleMapEvent(e) {
    // Премахване на съществуващия маркер от картата
    if (marker) {
        map.removeLayer(marker);
    }
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;

    // Добавяне на нов маркер на мястото на щракване/докосване
    marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup("Loading...").openPopup(); 

    // Настройка на събитие за щракване върху маркера, за да се премахне
    marker.on('click', function () {
        map.removeLayer(marker);
    });

    // Предотвратяване на стандартното контекстно меню или поведение на докосване
    e.originalEvent.preventDefault();

    // Използване на услугата за обратно геокодиране на ArcGIS, за да се получи информация за адреса
    axios.get('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode', {
        params: {
            f: 'json',
            location: lng + ',' + lat
        }
    })
        .then(function (response) {
            // Показване на информацията за адреса във всплыващия прозорец на маркера
            if (response.data.address) {
                var content = "Address: " + response.data.address.Match_addr + "<br>Coordinates: [" + lat + ", " + lng + "]";
                marker.bindPopup(content).openPopup(); 
            }
        })
    return false;
}

// Премахване на слушателя на събитието click от картата
map.off('click');

// Добавяне на нов слушател на събитието contextmenu за обработка на събитията на картата
map.on('contextmenu', function (e) {
    // Премахване на съществуващия маркер от картата
    if (marker) {
        map.removeLayer(marker);
    }
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;

    // Добавяне на нов маркер на мястото на десния щрак
    marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup("Loading...").openPopup(); 

    // Настройка на събитие за щракване върху маркера, за да се премахне
    marker.on('click', function () {
        map.removeLayer(marker);
    });

    // Предотвратяване на стандартното контекстно меню
    e.originalEvent.preventDefault();

    // Използване на услугата за обратно геокодиране на ArcGIS, за да се получи информация за адреса
    axios.get('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode', {
        params: {
            f: 'json',
            location: lng + ',' + lat
        }
    })
        .then(function (response) {
            // Показване на информацията за адреса във всплыващия прозорец на маркера
            if (response.data.address) {
                var content = "Address: " + response.data.address.Match_addr;
                marker.bindPopup(content).openPopup(); 
            }
        });
    return false;
});

// Функция за панорамиране до местоположението на базата на предоставения адрес
function panToLocation(address) {
    // Използване на услугата за геокодиране на ArcGIS, за да се получи местоположението на адреса
    axios.get('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates', {
        params: {
            f: 'json',
            SingleLine: address,
            outFields: 'Match_addr,Addr_type'
        }
    })
    .then(function (response) {
        // Ако има съвпадащи кандидати, настройте изгледа на картата към местоположението
        if (response.data.candidates.length > 0) {
            var location = response.data.candidates[0].location;
            var latlng = [location.y, location.x];
            // Премахване на съществуващия маркер от картата
            if (marker) {
                map.removeLayer(marker);
            }
            // Добавяне на нов маркер на местоположението и показване на адреса
            marker = L.marker(latlng).addTo(map);

            marker.bindPopup("Address: " + address).openPopup(); 
            // Настройка на събитие за щракване върху маркера, за да се премахне
            marker.on('click', function () {
                map.removeLayer(marker);
            });
            // Полетете до местоположението на картата с определено ниво на увеличение
            map.flyTo(latlng, 16);
        }
    })
}
