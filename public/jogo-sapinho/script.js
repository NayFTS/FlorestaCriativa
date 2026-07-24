(function () {
    const sky = document.getElementById('sky');
    const frog = document.getElementById('frog');
    const tongue = document.getElementById('tongue');
    const scoreEl = document.getElementById('score');
    const frogBody = document.getElementById('frogBody');
    const hudFlyIcon = document.getElementById('hudFlyIcon');
    const timerEl = document.getElementById('hudTimer');
    const startOverlay = document.getElementById('startOverlay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const finalScoreEl = document.getElementById('finalScore');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    const MAX_FLIES = 4;
    const SPAWN_MARGIN = 30;
    const GAME_DURATION = 30;
    const FROG_AVOID_PADDING = 16; // margem extra ao redor do sapo onde mosca não pode nascer
    const SPAWN_MAX_ATTEMPTS = 20;
    const FROG_IDLE_SRC = 'assets/sapo-idle.png';
    const FROG_OPEN_SRC = 'assets/sapo-boca-aberta.png';
    const MOUTH_TOP_RATIO = 0.36; // posição da boca na arte (mesmo valor do "top" da .tongue no style.css)

    // Intervalo entre moscas e tempo de vida delas no ar: começam no valor "START" e
    // encolhem até o valor "END" conforme o tempo do round passa (ver getDifficultyProgress).
    const SPAWN_INTERVAL_MIN_START = 900;
    const SPAWN_INTERVAL_MAX_START = 1600;
    const SPAWN_INTERVAL_MIN_END = 350;
    const SPAWN_INTERVAL_MAX_END = 700;

    const FLY_LIFETIME_MIN_START = 3500;
    const FLY_LIFETIME_MAX_START = 5500;
    const FLY_LIFETIME_MIN_END = 1200;
    const FLY_LIFETIME_MAX_END = 2200;

    const THEME_STORAGE_KEY = 'sapinho-theme';

    let score = 0;
    let timeLeft = GAME_DURATION;
    let isPlaying = false;
    let mouthTimeoutId = null;
    let spawnTimeoutId = null;
    let countdownIntervalId = null;
    const flies = new Set();

    function randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // 0 no início do round, 1 quando o tempo acaba — usado pra ir apertando o jogo aos poucos.
    function getDifficultyProgress() {
        const progress = 1 - timeLeft / GAME_DURATION;
        return Math.min(1, Math.max(0, progress));
    }

    // Troca o <img> por um <span> com o emoji equivalente se o arquivo de sprite
    // ainda não existir em assets/ — assim o jogo continua jogável enquanto a arte
    // definitiva não chega, sem precisar mexer em mais nada depois.
    function attachSpriteFallback(imgEl, emoji) {
        imgEl.addEventListener('error', () => {
            const span = document.createElement('span');
            span.className = imgEl.className;
            span.textContent = emoji;
            span.setAttribute('role', 'img');
            span.setAttribute('aria-label', imgEl.alt || '');
            imgEl.replaceWith(span);
        }, { once: true });
    }

    attachSpriteFallback(frogBody, '🐸');
    attachSpriteFallback(hudFlyIcon, '🪰');

    // Área do sapo (em coordenadas relativas ao .sky), com uma margem extra ao redor,
    // pra sortear posição de mosca fora dela.
    function getFrogExclusionZone() {
        const skyRect = sky.getBoundingClientRect();
        const frogRect = frog.getBoundingClientRect();
        return {
            left: frogRect.left - skyRect.left - FROG_AVOID_PADDING,
            top: frogRect.top - skyRect.top - FROG_AVOID_PADDING,
            right: frogRect.right - skyRect.left + FROG_AVOID_PADDING,
            bottom: frogRect.bottom - skyRect.top + FROG_AVOID_PADDING,
        };
    }

    function isInsideZone(x, y, zone) {
        return x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom;
    }

    function spawnFly() {
        const rect = sky.getBoundingClientRect();
        const frogZone = getFrogExclusionZone();

        let x, y, attempts = 0;
        do {
            x = randRange(SPAWN_MARGIN, Math.max(SPAWN_MARGIN, rect.width - SPAWN_MARGIN));
            y = randRange(SPAWN_MARGIN, Math.max(SPAWN_MARGIN, rect.height - SPAWN_MARGIN));
            attempts += 1;
        } while (isInsideZone(x, y, frogZone) && attempts < SPAWN_MAX_ATTEMPTS);

        const fly = document.createElement('button');
        fly.type = 'button';
        fly.className = 'fly';
        fly.setAttribute('aria-label', 'Mosca');
        fly.style.left = x + 'px';
        fly.style.top = y + 'px';

        const flySprite = document.createElement('img');
        flySprite.className = 'fly-sprite';
        flySprite.src = 'assets/mosca.png';
        flySprite.alt = '';
        attachSpriteFallback(flySprite, '🪰');
        fly.appendChild(flySprite);

        const progress = getDifficultyProgress();
        const lifetimeMin = lerp(FLY_LIFETIME_MIN_START, FLY_LIFETIME_MIN_END, progress);
        const lifetimeMax = lerp(FLY_LIFETIME_MAX_START, FLY_LIFETIME_MAX_END, progress);
        const timeoutId = setTimeout(() => removeFly(fly), randRange(lifetimeMin, lifetimeMax));
        fly.addEventListener('click', () => catchFly(fly, timeoutId));

        sky.appendChild(fly);
        flies.add(fly);
    }

    function removeFly(fly) {
        if (!flies.has(fly)) return;
        flies.delete(fly);
        fly.remove();
    }

    function clearAllFlies() {
        flies.forEach(fly => fly.remove());
        flies.clear();
    }

    function catchFly(fly, timeoutId) {
        if (!isPlaying || fly.classList.contains('caught')) return;
        clearTimeout(timeoutId);
        fly.classList.add('caught');

        shootTongue(fly);
        bounceFrogMouth();

        score += 1;
        scoreEl.textContent = score;

        setTimeout(() => removeFly(fly), 150);
    }

    // Abre a boca (assets/sapo-boca-aberta.png) durante a mordida e volta pro idle
    // depois — só troca se o sprite estiver carregado (não faz nada no fallback em emoji).
    function bounceFrogMouth() {
        if (frogBody.tagName !== 'IMG') return;
        frogBody.src = FROG_OPEN_SRC;
        clearTimeout(mouthTimeoutId);
        mouthTimeoutId = setTimeout(() => {
            frogBody.src = FROG_IDLE_SRC;
        }, 220);
    }

    // Língua aponta pra baixo por padrão (rotate 0deg); a fórmula converte o vetor
    // até a mosca pro ângulo de rotação equivalente nesse sistema (CSS rotate() é
    // horário em coordenadas de tela, por isso o sinal invertido em dx).
    function shootTongue(fly) {
        const flyRect = fly.getBoundingClientRect();
        const frogRect = frog.getBoundingClientRect();

        const originX = frogRect.left + frogRect.width / 2;
        const originY = frogRect.top + frogRect.height * MOUTH_TOP_RATIO;

        const targetX = flyRect.left + flyRect.width / 2;
        const targetY = flyRect.top + flyRect.height / 2;

        const dx = targetX - originX;
        const dy = targetY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(-dx, dy) * (180 / Math.PI);

        tongue.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        tongue.style.height = distance + 'px';

        setTimeout(() => {
            tongue.style.height = '0px';
        }, 140);
    }

    function spawnLoop() {
        if (!isPlaying) return;
        if (flies.size < MAX_FLIES) spawnFly();
        const progress = getDifficultyProgress();
        const intervalMin = lerp(SPAWN_INTERVAL_MIN_START, SPAWN_INTERVAL_MIN_END, progress);
        const intervalMax = lerp(SPAWN_INTERVAL_MAX_START, SPAWN_INTERVAL_MAX_END, progress);
        spawnTimeoutId = setTimeout(spawnLoop, randRange(intervalMin, intervalMax));
    }

    function tickTimer() {
        timeLeft -= 1;
        timerEl.textContent = `⏱ ${timeLeft}`;
        if (timeLeft <= 0) endGame();
    }

    function startGame() {
        score = 0;
        timeLeft = GAME_DURATION;
        scoreEl.textContent = score;
        timerEl.textContent = `⏱ ${timeLeft}`;
        clearAllFlies();
        clearTimeout(spawnTimeoutId);
        clearInterval(countdownIntervalId);

        startOverlay.hidden = true;
        gameOverOverlay.hidden = true;
        isPlaying = true;

        spawnLoop();
        countdownIntervalId = setInterval(tickTimer, 1000);
    }

    function endGame() {
        isPlaying = false;
        clearTimeout(spawnTimeoutId);
        clearInterval(countdownIntervalId);
        clearAllFlies();

        finalScoreEl.textContent = score;
        gameOverOverlay.hidden = false;
    }

    // Modo dia/noite: por padrão segue a preferência do sistema (prefers-color-scheme,
    // ver style.css), mas o botão permite forçar um dos dois e guarda a escolha.
    function getSystemTheme() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'night'
            : 'day';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggleBtn.textContent = theme === 'night' ? '☀️' : '🌙';
        themeToggleBtn.setAttribute(
            'aria-label',
            theme === 'night' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'
        );
    }

    let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || getSystemTheme();
    applyTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'night' ? 'day' : 'night';
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
        applyTheme(currentTheme);
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
})();
