(function () {
    const weatherMoodMap = {
        clear: {
            pt: { weather: 'Ensolarado', mood: 'Energizada', text: 'banho de sol' },
            en: { weather: 'Sunny', mood: 'Energized', text: 'sunshine boost' },
            icon: 'sunny-frog.webp'
        },
        partlyCloudy: {
            pt: { weather: 'Parcialmente nublado', mood: 'Tranquila', text: 'nuvens lentinhas' },
            en: { weather: 'Partly cloudy', mood: 'Calm', text: 'slow clouds' },
            icon: 'cloud-frog.webp'
        },
        cloudy: {
            pt: { weather: 'Nublado', mood: 'Aconchegada', text: 'Dia lento' },
            en: { weather: 'Cloudy', mood: 'Cozy', text: 'Slow Day' },
            icon: 'cozy-frog.webp'
        },
        overcast: {
            pt: { weather: 'Muito nublado', mood: 'Preguiçosa', text: 'dia de ficar quietinha' },
            en: { weather: 'Overcast', mood: 'Sleepy', text: 'quiet day' },
            icon: 'sleepy-cloud-frog.webp'
        },
        fog: {
            pt: { weather: 'Neblina', mood: 'Misteriosa', text: 'sonhos enevoados' },
            en: { weather: 'Foggy', mood: 'Mysterious', text: 'foggy dreams' },
            icon: 'fog-frog.webp'
        },
        drizzle: {
            pt: { weather: 'Chuvisco', mood: 'Delicada', text: 'gotinhas no vidro' },
            en: { weather: 'Drizzle', mood: 'Gentle', text: 'tiny raindrops' },
            icon: 'drizzle-frog.webp'
        },
        lightRain: {
            pt: { weather: 'Chuva leve', mood: 'Agitada', text: 'chuva miúda para lavar a alma' },
            en: { weather: 'Light rain', mood: 'Restless', text: 'fine rain to wash the soul' },
            icon: 'rain-frog.webp'
        },
        moderateRain: {
            pt: { weather: 'Chuva moderada', mood: 'Reflexiva', text: 'chá e pensamentos' },
            en: { weather: 'Moderate rain', mood: 'Reflective', text: 'tea and thoughts' },
            icon: 'tea-rain-frog.webp'
        },
        heavyRain: {
            pt: { weather: 'Chuva forte', mood: 'Dramática', text: 'dançar na chuva ou chorar copiosamente' },
            en: { weather: 'Heavy rain', mood: 'Dramatic', text: 'dance in the rain or cry it out' },
            icon: 'storm-tea-frog.webp'
        },
        thunderstorm: {
            pt: { weather: 'Trovoada', mood: 'Intensa', text: 'ver um filme embaixo dos lençóis' },
            en: { weather: 'Thunderstorm', mood: 'Intense', text: 'watching a movie under the covers' },
            icon: 'thunder-frog.webp'
        },
        storm: {
            pt: { weather: 'Tempestade', mood: 'Caótica', text: 'Hora de jogar The Sims' },
            en: { weather: 'Storm', mood: 'Chaotic', text: 'Time to play The Sims' },
            icon: 'storm-frog.webp'
        },
        windy: {
            pt: { weather: 'Vento', mood: 'Agitada', text: 'pensamentos ao vento' },
            en: { weather: 'Windy', mood: 'Restless', text: 'windy thoughts' },
            icon: 'wind-frog.webp'
        },
        breeze: {
            pt: { weather: 'Brisa leve', mood: 'Inspirada', text: 'folhas dançando' },
            en: { weather: 'Light breeze', mood: 'Inspired', text: 'dancing leaves' },
            icon: 'breeze-frog.webp'
        },
        cold: {
            pt: { weather: 'Frio', mood: 'Lenta', text: 'modo mantinha' },
            en: { weather: 'Cold', mood: 'Slow', text: 'blanket mode' },
            icon: 'blanket-frog.webp'
        },
        veryCold: {
            pt: { weather: 'Muito frio', mood: 'Hibernando', text: 'toca quentinha' },
            en: { weather: 'Very cold', mood: 'Hibernating', text: 'warm burrow' },
            icon: 'hibernating-frog.webp'
        },
        hot: {
            pt: { weather: 'Calor', mood: 'Derretendo', text: 'sapinho derretido' },
            en: { weather: 'Hot', mood: 'Melting', text: 'melting frog' },
            icon: 'hot-frog.webp'
        },
        veryHot: {
            pt: { weather: 'Muito calor', mood: 'Cabeça quente', text: 'alguém traz um ventilador' },
            en: { weather: 'Very hot', mood: 'Hot-headed', text: 'someone bring a fan' },
            icon: 'shade-frog.webp'
        },
        snow: {
            pt: { weather: 'Neve', mood: 'Encantada', text: 'christmas time!' },
            en: { weather: 'Snow', mood: 'Enchanted', text: 'christmas time!' },
            icon: 'snow-frog.webp'
        },
        hail: {
            pt: { weather: 'Granizo', mood: 'Protegida', text: 'abrigo de folhas' },
            en: { weather: 'Hail', mood: 'Sheltered', text: 'leaf shelter' },
            icon: 'hail-frog.webp'
        },
        rainbow: {
            pt: { weather: 'Arco-íris', mood: 'Esperançosa', text: 'magia pequenina' },
            en: { weather: 'Rainbow', mood: 'Hopeful', text: 'tiny magic' },
            icon: 'rainbow-frog.webp'
        },
        sunset: {
            pt: { weather: 'Pôr do sol', mood: 'Nostálgica', text: 'fim de tarde dourado' },
            en: { weather: 'Sunset', mood: 'Nostalgic', text: 'golden evening' },
            icon: 'sunset-frog.webp'
        },
        nightClear: {
            pt: { weather: 'Noite limpa', mood: 'Sonhadora', text: 'lago sob a lua' },
            en: { weather: 'Clear night', mood: 'Dreamy', text: 'moon pond' },
            icon: 'moon-frog.webp'
        },
        nightRain: {
            pt: { weather: 'Noite chuvosa', mood: 'Melancólica', text: 'Músicas e chá junto com um bom livro' },
            en: { weather: 'Rainy night', mood: 'Melancholic', text: 'Music and tea with a good book' },
            icon: 'night-rain-frog.webp'
        },
        unknown: {
            pt: { weather: 'Clima incerto', mood: 'Cozy', text: 'cantinho tranquilo' },
            en: { weather: 'Unknown weather', mood: 'Cozy', text: 'a quiet corner' },
            icon: 'cozy-frog.webp'
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
