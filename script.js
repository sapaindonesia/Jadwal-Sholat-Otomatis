// Jadwal Sholat Auto - Complete Version for All Indonesian Regions
let prayerTimes = {};
let currentCity = localStorage.getItem('prayerCity') || 'Jakarta';
let currentCountry = 'Indonesia';
let currentLocation = `${currentCity}, ${currentCountry}`;
let countdownInterval;
let prayerCheckInterval;
let audioContext;

// Indonesian cities list for all regions
const indonesianCities = {
    'Jakarta': 'Jakarta',
    'Surabaya': 'Surabaya',
    'Bandung': 'Bandung',
    'Medan': 'Medan',
    'Semarang': 'Semarang',
    'Makassar': 'Makassar',
    'Yogyakarta': 'Yogyakarta',
    'Malang': 'Malang',
    'Depok': 'Depok',
    'Bekasi': 'Bekasi',
    'Batam': 'Batam',
    'Palembang': 'Palembang',
    'Pekanbaru': 'Pekanbaru',
    'Bandar Lampung': 'Bandar Lampung',
    'Padang': 'Padang',
    'Denpasar': 'Denpasar',
    'Samarinda': 'Samarinda',
    'Balikpapan': 'Balikpapan',
    'Banjarbaru': 'Banjarbaru',
    'Manado': 'Manado'
};

// Prayer names
const prayers = ['Imsak', 'Subuh', 'Terbit', 'Dhuhr', 'Ashar', 'Maghrib', 'Isya'];

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Setup notification
    if ('Notification' in window && Notification.permission === 'default') {
        document.getElementById('notifyBtn').onclick = requestNotificationPermission;
    }

    // Setup city dropdown
    setupCityDropdown();

    // Set current city
    const citySelect = document.getElementById('citySelect');
    citySelect.value = currentCity;

    // Initial fetch
    await fetchPrayerTimes(currentCity);
    
    // Form listeners
    document.getElementById('locationForm').onsubmit = handleLocationChange;
    
    // Start intervals
    startCountdown();
    startPrayerAlerts();
    
    document.getElementById('location').textContent = currentLocation;
}

function setupCityDropdown() {
    const select = document.getElementById('citySelect');
    Object.keys(indonesianCities).forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = indonesianCities[city];
        select.appendChild(option);
    });
}

async function handleLocationChange(e) {
    e.preventDefault();
    const citySelect = document.getElementById('citySelect');
    const city = citySelect.value;
    if (city) {
        document.getElementById('runningText').textContent = 'Memuat jadwal ' + indonesianCities[city] + '...';
        await fetchPrayerTimes(city);
        updateDisplay();
    }
}

async function fetchPrayerTimes(city = currentCity) {
    try {
        const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Indonesia&method=5`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            const timings = data.data.timings;
            prayerTimes = {
                Imsak: timings.Imsak,
                Fajr: timings.Fajr,
                Sunrise: timings.Sunrise,
                Dhuhr: timings.Dhuhr,
                Asr: timings.Asr,
                Maghrib: timings.Maghrib,
                Isha: timings.Isha
            };
            currentCity = city;
            currentLocation = `${indonesianCities[city] || city}, Indonesia`;
            localStorage.setItem('prayerCity', city);
            document.getElementById('location').textContent = currentLocation;
            updateDisplay();
        } else {
            document.getElementById('runningText').textContent = 'Kota tidak ditemukan, coba lagi.';
        }
    } catch (error) {
        console.error('API Error:', error);
        document.getElementById('runningText').textContent = 'Error koneksi. Periksa internet.';
    }
}

function updateDisplay() {
    updatePrayerTable();
    updateRunningText();
    updateNextPrayer();
}

function updatePrayerTable() {
    const table = document.getElementById('timesTable');
    table.innerHTML = '';
    
    Object.entries(prayerTimes).forEach(([engName, time]) => {
        const row = document.createElement('div');
        row.className = 'time-row';
        row.innerHTML = `
            <span class="time-label">${getPrayerName(engName)}</span>
            <span class="time-value">${time}</span>
        `;
        table.appendChild(row);
    });
}

function getPrayerName(engName) {
    const names = {
        'Imsak': 'Imsak',
        'Fajr': 'Subuh',
        'Sunrise': 'Terbit',
        'Dhuhr': 'Dzuhur',
        'Asr': 'Ashar',
        'Maghrib': 'Maghrib',
        'Isha': 'Isya'
    };
    return names[engName] || engName;
}

function getCurrentPrayerIndex() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    for (let i = 0; i < prayerOrder.length; i++) {
        const prayerTime = new Date(todayStr + 'T' + prayerTimes[prayerOrder[i]]);
        if (now < prayerTime) return i;
    }
    return 0; // Loop back
}

function updateRunningText() {
    const nextIndex = getCurrentPrayerIndex();
    const nextPrayer = prayers[nextIndex + 1] || prayers[1]; // Skip Imsak/Terbit
    const countdown = getCountdownToPrayer(nextIndex);
    document.getElementById('runningText').textContent = `🕌 ${currentLocation} | Selanjutnya: ${nextPrayer} dalam ${countdown} 🕌`;
}

function updateNextPrayer() {
    const nextIndex = getCurrentPrayerIndex();
    const nextPrayerName = prayers[nextIndex + 1] || prayers[1];
    document.getElementById('nextPrayerTitle').textContent = `Selanjutnya: ${nextPrayerName}`;
    document.getElementById('countdownTimer').textContent = getCountdownToPrayer(nextIndex);
}

function getCountdownToPrayer(prayerIndex) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const prayerTime = new Date(todayStr + 'T' + prayerTimes[prayerOrder[prayerIndex]]);
    
    let diff = prayerTime - now;
    if (diff < 0) {
        // Tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        diff = new Date(tomorrowStr + 'T' + prayerTimes[prayerOrder[prayerIndex]]) - now;
    }
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startCountdown() {
    countdownInterval = setInterval(() => {
        updateRunningText();
        updateNextPrayer();
    }, 1000);
}

function startPrayerAlerts() {
    prayerCheckInterval = setInterval(async () => {
        await checkUpcomingPrayers();
    }, 30000); // Check every 30 sec for alerts
}

async function checkUpcomingPrayers() {
    const now = new Date().getTime();
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    for (let prayer of prayerOrder) {
        const todayStr = new Date().toISOString().split('T')[0];
        const prayerTimeStr = todayStr + 'T' + prayerTimes[prayer];
        let prayerTime = new Date(prayerTimeStr).getTime();
        
        if (prayerTime < now) {
            // Tomorrow
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            prayerTime = new Date(tomorrowStr + 'T' + prayerTimes[prayer]).getTime();
        }
        
        const diffMinutes = (prayerTime - now) / 60000;
        
        if (diffMinutes <= 2 && diffMinutes > 1) {
            showPrayerAlert(`${getPrayerName(prayer)} ADZAN sebentar lagi!`);
        }
        if (diffMinutes <= 4 && diffMinutes > 3) {
            showPrayerAlert(`${getPrayerName(prayer)} IQOMAH sebentar lagi!`);
        }
    }
}

function showPrayerAlert(message) {
    if (Notification.permission === 'granted') {
        new Notification('🕌 Waktu Sholat', { 
            body: message,
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjUiIGZpbGw9IiMwMGQ0YWEiLz4KPHRleHQgeD0iNTAlIiB5PSI1NSUiIGR0PSJtaWRkbGVjZW50ZXIiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIj7wpI88PC90ZXh0Pgo8L3N2Zz4='
        });
    }
    playBeep();
}

function playBeep() {
    audioContext = audioContext || new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            document.getElementById('notifyBtn').innerHTML = '✅ Notifikasi ON';
            document.getElementById('notifyBtn').classList.add('enabled');
        }
    });
}

// Initial load
setTimeout(updateDisplay, 500);
