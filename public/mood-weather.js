(function () {
    const weatherMoodMap = {
        clear: {
            pt: { weather: 'Ensolarado', mood: 'Energizada', text: 'banho de sol' },
            en: { weather: 'Sunny', mood: 'Energized', text: 'sunshine boost' },
            icon: 'sunny-frog.png'
        },
        partlyCloudy: {
            pt: { weather: 'Parcialmente nublado', mood: 'Tranquila', text: 'nuvens lentinhas' },
            en: { weather: 'Partly cloudy', mood: 'Calm', text: 'slow clouds' },
            icon: 'cloud-frog.png'
        },
        cloudy: {
            pt: { weather: 'Nublado', mood: 'Aconchegada', text: 'cinza cozy' },
            en: { weather: 'Cloudy', mood: 'Cozy', text: 'cozy grey' },
            icon: 'cozy-frog.png'
        },
        overcast: {
            pt: { weather: 'Muito nublado', mood: 'Preguiçosa', text: 'dia de ficar quietinha' },
            en: { weather: 'Overcast', mood: 'Sleepy', text: 'quiet grey' },
            icon: 'sleepy-cloud-frog.png'
        },
        fog: {
            pt: { weather: 'Neblina', mood: 'Misteriosa', text: 'sonhos com névoa' },
            en: { weather: 'Foggy', mood: 'Mysterious', text: 'foggy dreams' },
            icon: 'fog-frog.png'
        },
        drizzle: {
            pt: { weather: 'Chuvisco', mood: 'Delicada', text: 'gotinhas no vidro' },
            en: { weather: 'Drizzle', mood: 'Gentle', text: 'tiny raindrops' },
            icon: 'drizzle-frog.png'
        },
        lightRain: {
            pt: { weather: 'Chuva leve', mood: 'Chuvinha calma', text: 'chuva macia' },
            en: { weather: 'Light rain', mood: 'Soft rain', text: 'soft rain' },
            icon: 'rain-frog.png'
        },
        moderateRain: {
            pt: { weather: 'Chuva moderada', mood: 'Reflexiva', text: 'chá e pensamentos' },
            en: { weather: 'Moderate rain', mood: 'Reflective', text: 'tea and thoughts' },
            icon: 'tea-rain-frog.png'
        },
        heavyRain: {
            pt: { weather: 'Chuva forte', mood: 'Dramática', text: 'chá de tempestade' },
            en: { weather: 'Heavy rain', mood: 'Dramatic', text: 'stormy tea' },
            icon: 'storm-tea-frog.png'
        },
        thunderstorm: {
            pt: { weather: 'Trovoada', mood: 'Intensa', text: 'trovões no brejo' },
            en: { weather: 'Thunderstorm', mood: 'Intense', text: 'thunder pond' },
            icon: 'thunder-frog.png'
        },
        storm: {
            pt: { weather: 'Tempestade', mood: 'Caótica cozy', text: 'caos com cobertor' },
            en: { weather: 'Storm', mood: 'Cozy chaos', text: 'blanket chaos' },
            icon: 'storm-frog.png'
        },
        windy: {
            pt: { weather: 'Vento', mood: 'Agitada', text: 'pensamentos ao vento' },
            en: { weather: 'Windy', mood: 'Restless', text: 'windy thoughts' },
            icon: 'wind-frog.png'
        },
        breeze: {
            pt: { weather: 'Brisa leve', mood: 'Inspirada', text: 'folhas dançando' },
            en: { weather: 'Light breeze', mood: 'Inspired', text: 'dancing leaves' },
            icon: 'breeze-frog.png'
        },
        cold: {
            pt: { weather: 'Frio', mood: 'Modo mantinha', text: 'sapinho enrolado' },
            en: { weather: 'Cold', mood: 'Blanket mode', text: 'blanket time' },
            icon: 'blanket-frog.png'
        },
        veryCold: {
            pt: { weather: 'Muito frio', mood: 'Hibernando', text: 'toca quentinha' },
            en: { weather: 'Very cold', mood: 'Hibernating', text: 'warm burrow' },
            icon: 'hibernating-frog.png'
        },
        hot: {
            pt: { weather: 'Calor', mood: 'Derretendo', text: 'sapinho derretido' },
            en: { weather: 'Hot', mood: 'Melting', text: 'melting frog' },
            icon: 'hot-frog.png'
        },
        veryHot: {
            pt: { weather: 'Muito calor', mood: 'Sapinho assado', text: 'sombra urgente' },
            en: { weather: 'Very hot', mood: 'Roasted frog', text: 'urgent shade' },
            icon: 'shade-frog.png'
        },
        snow: {
            pt: { weather: 'Neve', mood: 'Encantada', text: 'feitiço de neve' },
            en: { weather: 'Snow', mood: 'Enchanted', text: 'snow spell' },
            icon: 'snow-frog.png'
        },
        hail: {
            pt: { weather: 'Granizo', mood: 'Protegida', text: 'abrigo de folhas' },
            en: { weather: 'Hail', mood: 'Sheltered', text: 'leaf shelter' },
            icon: 'hail-frog.png'
        },
        rainbow: {
            pt: { weather: 'Arco-íris', mood: 'Esperançosa', text: 'magia pequenina' },
            en: { weather: 'Rainbow', mood: 'Hopeful', text: 'tiny magic' },
            icon: 'rainbow-frog.png'
        },
        sunset: {
            pt: { weather: 'Pôr do sol', mood: 'Nostálgica', text: 'fim de tarde dourado' },
            en: { weather: 'Sunset', mood: 'Nostalgic', text: 'golden evening' },
            icon: 'sunset-frog.png'
        },
        nightClear: {
            pt: { weather: 'Noite limpa', mood: 'Sonhadora', text: 'lago sob a lua' },
            en: { weather: 'Clear night', mood: 'Dreamy', text: 'moon pond' },
            icon: 'moon-frog.png'
        },
        nightRain: {
            pt: { weather: 'Noite chuvosa', mood: 'Melancólica cozy', text: 'janela molhada e chá' },
            en: { weather: 'Rainy night', mood: 'Cozy melancholy', text: 'rainy window tea' },
            icon: 'night-rain-frog.png'
        },
        unknown: {
            pt: { weather: 'Clima incerto', mood: 'Cozy', text: 'cantinho tranquilo' },
            en: { weather: 'Unknown weather', mood: 'Cozy', text: 'a quiet corner' },
            icon: 'cozy-frog.png'
        }
    };

    const SNOW_CODES = [71, 73, 75, 77, 85, 86];
    const DRIZZLE_CODES = [51, 53, 55, 56, 57];

    function normalizeWeather(apiWeatherData, isNight, temperature, windSpeed) {
        const code = (apiWeatherData && typeof apiWeatherData === 'object') ? apiWeatherData.code : apiWeatherData;
        const cloudCover = (apiWeatherData && typeof apiWeatherData === 'object' && typeof apiWeatherData.cloudCover === 'number')
            ? apiWeatherData.cloudCover : null;

        if (code === null || code === undefined) return 'unknown';

        if (code === 95) return 'thunderstorm';
        if (code === 96 || code === 99) return 'storm';
        if (SNOW_CODES.indexOf(code) !== -1) return 'snow';
        if (code === 66 || code === 67) return 'hail';

        if (code === 61 || code === 80) return isNight ? 'nightRain' : 'lightRain';
        if (code === 63 || code === 81) return isNight ? 'nightRain' : 'moderateRain';
        if (code === 65 || code === 82) return isNight ? 'nightRain' : 'heavyRain';

        if (DRIZZLE_CODES.indexOf(code) !== -1) return 'drizzle';
        if (code === 45 || code === 48) return 'fog';

        if (typeof temperature === 'number') {
            if (temperature <= -2) return 'veryCold';
            if (temperature <= 8) return 'cold';
            if (temperature >= 36) return 'veryHot';
            if (temperature >= 30) return 'hot';
        }

        if (typeof windSpeed === 'number') {
            if (windSpeed >= 40) return 'windy';
            if (windSpeed >= 22) return 'breeze';
        }

        if (cloudCover !== null) {
            if (cloudCover <= 20) return isNight ? 'nightClear' : 'clear';
            if (cloudCover <= 50) return 'partlyCloudy';
            if (cloudCover <= 85) return 'cloudy';
            return 'overcast';
        }

        if (code === 0 || code === 1) return isNight ? 'nightClear' : 'clear';
        if (code === 2) return 'partlyCloudy';
        if (code === 3) return 'overcast';

        return 'unknown';
    }

    let lastWeatherKey = null;

    function renderMood(weatherKey, lang) {
        const moodData = weatherMoodMap[weatherKey] || weatherMoodMap.unknown;
        const resolvedKey = weatherMoodMap[weatherKey] ? weatherKey : 'unknown';
        const translated = moodData[lang] || moodData.pt;
        lastWeatherKey = resolvedKey;

        document.querySelectorAll('.mood-card').forEach(card => {
            const img = card.querySelector('.mood-image');
            const value = card.querySelector('.mood-value');
            const weather = card.querySelector('.mood-weather');
            const text = card.querySelector('.mood-text');

            if (value) value.textContent = translated.mood;
            if (weather) weather.textContent = translated.weather;
            if (text) text.textContent = translated.text;
            if (img) {
                img.src = `imagens/decor/mood/${moodData.icon}`;
                img.alt = translated.mood;
            }
        });
    }

    function isNearSunset(sunsetIso, isDay) {
        if (!sunsetIso || !isDay) return false;
        const diffMinutes = Math.abs(new Date(sunsetIso).getTime() - Date.now()) / 60000;
        return diffMinutes <= 40;
    }

    async function fetchWeatherAndRender() {
        const lang = window.i18n ? window.i18n.getLang() : 'pt';

        if (!navigator.geolocation) {
            renderMood('unknown', lang);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
                        `&current=temperature_2m,weather_code,wind_speed_10m,is_day,cloud_cover&daily=sunset&timezone=auto`;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('weather request failed');
                    const data = await res.json();
                    const current = data.current || {};
                    const isNight = current.is_day === 0;
                    const temperature = current.temperature_2m;
                    const windSpeed = current.wind_speed_10m;
                    const sunsetIso = data.daily && data.daily.sunset && data.daily.sunset[0];

                    let key;
                    if (isNearSunset(sunsetIso, current.is_day) && current.weather_code <= 2) {
                        key = 'sunset';
                    } else {
                        key = normalizeWeather(
                            { code: current.weather_code, cloudCover: current.cloud_cover },
                            isNight,
                            temperature,
                            windSpeed
                        );
                    }

                    renderMood(key, window.i18n ? window.i18n.getLang() : lang);
                } catch (err) {
                    renderMood('unknown', window.i18n ? window.i18n.getLang() : lang);
                }
            },
            () => renderMood('unknown', lang),
            { timeout: 8000, maximumAge: 10 * 60 * 1000 }
        );
    }

    document.addEventListener('langchange', (e) => {
        if (lastWeatherKey) renderMood(lastWeatherKey, e.detail.lang);
    });

    window.moodWeather = { weatherMoodMap, normalizeWeather, renderMood, fetchWeatherAndRender };

    document.addEventListener('DOMContentLoaded', () => {
        renderMood('unknown', window.i18n ? window.i18n.getLang() : 'pt');
        fetchWeatherAndRender();
    });
})();
