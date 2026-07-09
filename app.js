
    // ===== SAMPLER PICKER MODAL =====
    const SAMPLER_DATA = {
        'dpmpp_2m': { name: 'DPM++ 2M', desc: 'Standardowy sampler deterministyczny, stabilny wynik w ~20 krokach', tag: 'balanced', tagLabel: 'Standard' },
        'dpmpp_2s_ancestral': { name: 'DPM++ 2S Ancestral', desc: 'Losowy szum, dodaje organiczne detale do tekstur i wlosow', tag: 'balanced', tagLabel: 'Detale' },
        'dpmpp_sde': { name: 'DPM++ SDE', desc: 'Wysoka gestosc, wyjatkowy detal - wolny ale najlepszej jakosci', tag: 'quality', tagLabel: 'Jakosc' },
        'euler': { name: 'Euler', desc: 'Klasyczny, najszybszy sampler - zachowuje oryginalna kompozycje', tag: 'fast', tagLabel: 'Szybki' },
        'euler_ancestral': { name: 'Euler Ancestral', desc: 'Popularny, miekki sampler - gladkie, malarskie wykończenie', tag: 'balanced', tagLabel: 'Miekki' },
        'ddim': { name: 'DDIM', desc: 'Wczesny szybki sampler - dobry do inpainting / ControlNet', tag: 'fast', tagLabel: 'Specjalny' },
        'heunpp2': { name: 'HeunPP2', desc: 'Wysoka precyzja, ostre i czyste kontury - nastepca Heun', tag: 'quality', tagLabel: 'Precyzja' },
        'ipndm': { name: 'IPNDM', desc: 'Szybka zbieznosc, dobrze uformowany obraz w malej liczbie krokow', tag: 'fast', tagLabel: 'Szybki' },
        'ipndm_v': { name: 'IPNDM V', desc: 'Szybka zbieznosc - odmiana IPNDM z lepsza stabilnoscia', tag: 'fast', tagLabel: 'Szybki' },
        'res_2s': { name: 'Restart 2s', desc: 'Szybki residualny - precyzyjne dostrojenie kompozycji', tag: 'balanced', tagLabel: 'Residual' },
        'res_2m': { name: 'Restart 2m', desc: 'Residualny z pedem - balans predkosci i stabilnosci', tag: 'balanced', tagLabel: 'Residual' },
        'res_3s': { name: 'Restart 3s', desc: 'Residualny 3. rzedu - wyzsza korekta niz res_2s', tag: 'balanced', tagLabel: 'Residual' },
        'res_3m': { name: 'Restart 3m', desc: 'Residualny momentum 3. rzedu - balans miedzy res_2m a res_4s', tag: 'balanced', tagLabel: 'Residual' },
        'res_4s': { name: 'Restart 4s', desc: 'Residualny 4. rzedu - najwyzsza stabilnosc z rodziny Res', tag: 'quality', tagLabel: 'Residual' },
        'res_6s': { name: 'Restart 6s', desc: 'Residualny 6 krokow - stabilnosc kompozycji, srednia predkosc', tag: 'balanced', tagLabel: 'Residual' },
        'res_12s': { name: 'Restart 12s', desc: 'Gleboki residualny - maksymalna stabilnosc, wolny', tag: 'quality', tagLabel: 'Residual' },
        'res_multistep_ancestral': { name: 'Restart Multistep Ancestral', desc: 'Wielokrokowy residualny z losowym szumem - teksturowanie', tag: 'niche', tagLabel: 'Eksperymentalny' },
        'res_multistep_cfg_pp': { name: 'Restart Multistep CFG++', desc: 'Wielokrokowy residualny z CFG++ - chroni przed wypaleniem', tag: 'niche', tagLabel: 'Eksperymentalny' },
        'deis_2m': { name: 'DEIS 2M', desc: 'Szybki wydajny solver - efektywny w 10-15 krokach', tag: 'fast', tagLabel: 'Szybki' },
        'sa_solver': { name: 'SA Solver', desc: 'Nowoczesny szybki solver - doskonaly w ~15 krokach', tag: 'fast', tagLabel: 'Szybki' },
        'sa_solver_pece': { name: 'SA Solver PECE', desc: 'SA Solver z korekcja - redukuje znieksztalcenia detali', tag: 'balanced', tagLabel: 'Dokladny' },
        'uni_pc': { name: 'UniPC', desc: 'Bardzo wydajny szybki solver - dobry do niskiej liczby krokow', tag: 'fast', tagLabel: 'Szybki' },
        'uni_pc_bh2': { name: 'UniPC BH2', desc: 'Wydajny solver z ochrona przed zapadnieciem obrazu', tag: 'fast', tagLabel: 'Szybki' },
        'lcm': { name: 'LCM', desc: 'Ultra-szybki (4-8 krokow) - wymaga LCM LoRA / adaptera', tag: 'fast', tagLabel: 'Ultra' },
        'gradient_estimation': { name: 'Gradient Estimation', desc: 'Estymacja gradientu - ostre krawedzie, styl manga / line-art', tag: 'niche', tagLabel: 'Eksperymentalny' },
        'gradient_estimation_cfg_pp': { name: 'Gradient Estimation CFG++', desc: 'Gradient + CFG++ - ochrona przed wypalaniem przy wysokim CFG', tag: 'niche', tagLabel: 'Eksperymentalny' },
    };

    // Lista wartosci samplerow (klucze z SAMPLER_DATA) - jedna zrodlowa definicja
    const SAMPLER_OPTIONS = Object.keys(SAMPLER_DATA);

    // Wypelnia wszystkie <select id$="-sampler"> opcjami z SAMPLER_OPTIONS
    function populateSamplerSelects() {
        var selects = document.querySelectorAll('select[id$="-sampler"]:not([data-options-populated])');
        for (var i = 0; i < selects.length; i++) {
            var sel = selects[i];
            if (sel.options.length > 0) continue;
            sel.setAttribute('data-options-populated', 'true');
            for (var j = 0; j < SAMPLER_OPTIONS.length; j++) {
                var key = SAMPLER_OPTIONS[j];
                var info = SAMPLER_DATA[key] || { name: key };
                var opt = document.createElement('option');
                opt.value = key;
                opt.textContent = info.name;
                if (key === 'euler') opt.selected = true;
                sel.appendChild(opt);
            }
        }
    }

    // Lista wartosci schedulerow - jedna zrodlowa definicja
    const SCHEDULER_OPTIONS = [
        { value: 'karras', label: 'Karras' },
        { value: 'exponential', label: 'Exponential' },
        { value: 'sgm_uniform', label: 'SGM Uniform' },
        { value: 'simple', label: 'Simple' },
        { value: 'ddim_uniform', label: 'DDIM Uniform' },
        { value: 'beta', label: 'Beta' },
        { value: 'normal', label: 'Normal' }
    ];

    // Wypelnia wszystkie <select id$="-scheduler"> opcjami z SCHEDULER_OPTIONS
    function populateSchedulerSelects() {
        var selects = document.querySelectorAll('select[id$="-scheduler"]:not([data-sched-populated])');
        for (var i = 0; i < selects.length; i++) {
            var sel = selects[i];
            if (sel.options.length > 0) continue;
            sel.setAttribute('data-sched-populated', 'true');
            for (var j = 0; j < SCHEDULER_OPTIONS.length; j++) {
                var item = SCHEDULER_OPTIONS[j];
                var opt = document.createElement('option');
                opt.value = item.value;
                opt.textContent = item.label;
                if (item.value === 'karras') opt.selected = true;
                sel.appendChild(opt);
            }
        }
    }

    function initSamplerPickers() {
        populateSamplerSelects();
        populateSchedulerSelects();
        var selects = document.querySelectorAll('select[id$=\"-sampler\"]:not([data-picker-initialized])');
        if (!selects.length) return;

        var modal = document.getElementById('sampler-modal');
        var grid = document.getElementById('sampler-grid');
        var searchInput = document.getElementById('sampler-search');
        var closeBtn = document.getElementById('sampler-modal-close');
        if (!modal || !grid) return;

        var activeSelect = null;

        function renderGrid(filter) {
            var q = (filter || '').toLowerCase().trim();
            grid.innerHTML = '';
            var hasResults = false;
            for (var key in SAMPLER_DATA) {
                if (!SAMPLER_DATA.hasOwnProperty(key)) continue;
                var info = SAMPLER_DATA[key];
                if (q && key.indexOf(q) === -1 && info.name.toLowerCase().indexOf(q) === -1 && info.desc.toLowerCase().indexOf(q) === -1) continue;
                hasResults = true;
                var item = document.createElement('div');
                item.className = 'sampler-item' + (activeSelect && activeSelect.value === key ? ' active' : '');
                item.setAttribute('data-value', key);
                var tagSpan = document.createElement('span');
                tagSpan.className = 'sampler-tag tag-' + info.tag;
                tagSpan.textContent = info.tagLabel;
                item.innerHTML = '<div class=\"sampler-name\">' + info.name + '</div><div class=\"sampler-desc\">' + info.desc + '</div>';
                item.appendChild(tagSpan);
                item.addEventListener('click', function(val, infoData) {
                    return function() {
                        if (activeSelect) {
                            activeSelect.value = val;
                            var pickerBtn = activeSelect.parentElement.querySelector('.sampler-picker-btn');
                            if (pickerBtn) pickerBtn.querySelector('.sampler-current').textContent = infoData.name;
                            activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        modal.classList.remove('show');
                    };
                }(key, info));
                grid.appendChild(item);
            }
            if (!hasResults) {
                grid.innerHTML = '<div class=\"sampler-empty\">Brak samplerow pasujacych do wyszukiwania</div>';
            }
        }

        function openModal(selectEl) {
            activeSelect = selectEl;
            renderGrid('');
            searchInput.value = '';
            setTimeout(function() {
                var active = grid.querySelector('.sampler-item.active');
                if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 50);
            modal.classList.add('show');
            searchInput.focus();
        }

        for (var i = 0; i < selects.length; i++) {
            var sel = selects[i];
            sel.setAttribute('data-picker-initialized', 'true');
            sel.style.display = 'none';

            var currentVal = sel.value;
            var currentInfo = SAMPLER_DATA[currentVal] || { name: currentVal };

            var picker = document.createElement('div');
            picker.className = 'sampler-picker-btn';
            picker.innerHTML = '<span class=\"sampler-current\">' + currentInfo.name + '</span><span class=\"sampler-arrow\">▼</span>';
            picker.addEventListener('click', (function(s) { return function() { openModal(s); }; })(sel));

            sel.parentElement.insertBefore(picker, sel.nextSibling);

            sel.addEventListener('change', function() {
                var v = this.value;
                var inf = SAMPLER_DATA[v] || { name: v };
                var btn = this.parentElement.querySelector('.sampler-picker-btn');
                if (btn) btn.querySelector('.sampler-current').textContent = inf.name;
            });
        }

        searchInput.addEventListener('input', function() { renderGrid(searchInput.value); });
        closeBtn.addEventListener('click', function() { modal.classList.remove('show'); });
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('show'); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && modal.classList.contains('show')) modal.classList.remove('show'); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSamplerPickers);
    } else {
        initSamplerPickers();
    }


document.addEventListener('DOMContentLoaded', () => {
    // ===== CZYSZCZENIE STARYCH / BŁĘDNYCH DANYCH Z LOCALSTORAGE =====
    const keysToCheck = ['img_quick_checkpoint', 'img_quickadv_checkpoint', 'img_quickgen_checkpoint'];
    keysToCheck.forEach(key => {
        const val = localStorage.getItem(key);
        if (val && (val.includes('Realistic-Vision') || val.includes('Deliberate') || val === 'SDXL')) {
            console.warn(`[CLEANUP] Wykryto błędny model: ${val}. Resetuję do unnamedixl...`);
            localStorage.setItem(key, 'unnamedixlRealisticModel_v5.safetensors');
        }
    });

    // ===== ELEMENTY DOM (zainicjalizowane na początku) =====
    const loginView = document.getElementById('login-view');
    const mainDashboard = document.getElementById('main-dashboard');
    const adminPanel = document.getElementById('admin-panel');

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const errorOutput = document.getElementById('error-output');

    const chatMessages = document.getElementById('chat-messages');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');

    // generator json obrazkow
    // Elementy generatora obrazów
    const imgPrompt = document.getElementById('img-prompt');
    const imgAspect = document.getElementById('img-aspect');
    const imgMode = document.getElementById('img-mode');
    const imgModeWrapper = document.getElementById('img-mode-wrapper');
    const imgGenerateBtn = document.getElementById('img-generate-btn');
    const imgModelType = document.getElementById('img-model-type');
    const imgAdvancedSteps = document.getElementById('img-advanced-steps');
    const imgAdvancedMP = document.getElementById('img-advanced-mp');
    const imgAdvancedMu = document.getElementById('img-advanced-mu');
    const imgAdvancedStd = document.getElementById('img-advanced-std');
    const imgAdvancedSampler = document.getElementById('img-advanced-sampler');
    const imgAdvancedScheduler = document.getElementById('img-advanced-scheduler');
    const imgAdvancedParams = document.getElementById('img-advanced-params');
    const imgQuickSteps = document.getElementById('img-quick-steps');
    const imgQuickCheckpoint = document.getElementById('img-quick-checkpoint');
    const imgQuickSampler = document.getElementById('img-quick-sampler');
    const imgQuickScheduler = document.getElementById('img-quick-scheduler');
    const imgQuickParams = document.getElementById('img-quick-params');
    const imgQuickadvParams = document.getElementById('img-quickadv-params');
    const imgQuickadvSteps = document.getElementById('img-quickadv-steps');
    const imgQuickadvCfg = document.getElementById('img-quickadv-cfg');
    const imgQuickadvSampler = document.getElementById('img-quickadv-sampler');
    const imgQuickadvSeedMode = document.getElementById('img-quickadv-seed-mode');
    const imgQuickadvSeedValue = document.getElementById('img-quickadv-seed-value');
    const imgQuickadvCheckpoint = document.getElementById('img-quickadv-checkpoint');
    const imgQuickadvScheduler = document.getElementById('img-quickadv-scheduler');
    const imgQuickgenParams = document.getElementById('img-quickgen-params');
    const imgQuickgenSteps = document.getElementById('img-quickgen-steps');
    const imgQuickgenCfg = document.getElementById('img-quickgen-cfg');
    const imgQuickgenSampler = document.getElementById('img-quickgen-sampler');
    const imgQuickgenScheduler = document.getElementById('img-quickgen-scheduler');
    const imgQuickgenSeedMode = document.getElementById('img-quickgen-seed-mode');
    const imgQuickgenSeedValue = document.getElementById('img-quickgen-seed-value');
    const imgQuickgenCheckpoint = document.getElementById('img-quickgen-checkpoint');
    const imgPromptReconstruct = document.getElementById('img-prompt-reconstruct');
    const imgReconstructStyle = document.getElementById('img-reconstruct-style');
    const imgSzybkoPreset = document.getElementById('img-szybko-preset');
    const imgSzybkoCustomParams = document.getElementById('img-szybko-custom-params');
    const imgSzybkoAutoprompt = document.getElementById('img-szybko-autoprompt');
    const imgSzybkoSampler = document.getElementById('img-szybko-sampler');
    const imgSzybkoScheduler = document.getElementById('img-szybko-scheduler');
    const imgSzybkoMegapixels = document.getElementById('img-szybko-megapixels');
    const imgSzybkoSteps = document.getElementById('img-szybko-steps');
    const imgSzybkoShift = document.getElementById('img-szybko-shift');
    const imgSzybkoSeedMode = document.getElementById('img-szybko-seed-mode');
    const imgSzybkoSeedValue = document.getElementById('img-szybko-seed-value');
    const imgSzybkoParams = document.getElementById('img-szybko-params');
    

    // Upload obrazka
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imageUploadPreview = document.getElementById('image-upload-preview');
    const uploadPreviewImg = document.getElementById('upload-preview-img');
    const uploadRemoveBtn = document.getElementById('upload-remove-btn');

    // Zębatka górna i akcje menu
    const menuBtn = document.getElementById('header-menu-btn');
    const menuDropdown = document.getElementById('header-menu-dropdown');
    const actionToggleTheme = document.getElementById('action-toggle-theme');
    const actionInfo = document.getElementById('action-info');
    const actionMenuClear = document.getElementById('action-menu-clear');
    const actionMenuLogout = document.getElementById('action-menu-logout');

    // Multi-chat elementy listy
    const threadsContainer = document.getElementById('threads-container');
    const actionCreateThread = document.getElementById('action-create-thread');
    const activeChatTitle = document.getElementById('active-chat-title');

    // Opcje czatu (dolny pasek)
    const optionsBtn = document.getElementById('options-btn');
    const dropdown = document.getElementById('options-dropdown');
    const reasoningBtns = document.querySelectorAll('.reasoning-btn');
    const webBtns = document.querySelectorAll('.web-btn');
    const personaBtns = document.querySelectorAll('.persona-btn');
    const imgReasoningBtns = document.querySelectorAll('.img-reasoning-btn');
    const imageModeBtn = document.getElementById('image-mode-btn');

    // ===== UNIWERSALNY HELPER DO API CALLS Z AUTOMATYCZNYM TOKENEM =====
    // Użycie: apiCall('/api/endpoint', { method: 'GET/POST/etc', body: {...} })
    async function apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        // Domyślne headery
        let headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Dodaj Authorization header jeśli mamy token
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Scalenie z opcjami użytkownika
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(endpoint, config);
            
            // Jeśli token wygasł (401), wyloguj użytkownika
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.reload();
                return null;
            }
            
            return response;
        } catch (error) {
            console.error(`API Call Error: ${endpoint}`, error);
            throw error;
        }
    }

    // Udostępnij helper globalnie dla innych skryptów
    window.apiCall = apiCall;

    // ===== HELPER DO INTELIGENTNEGO AUTO-SCROLLA =====
    // Scrolluje na dół tylko jeśli użytkownik jest już blisko dołu,
    // żeby nie wyrywać go z czytania starszych wiadomości
    function scrollToBottomIfNear(force = false) {
        const threshold = 150; // px od dołu — jeśli użytkownik jest w tym zakresie, scrolluj
        const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
        if (force || distanceFromBottom < threshold) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Dodatkowe zabezpieczenie dla przeglądarek
            requestAnimationFrame(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
        }
    }

    // Globalny helper dla createMetadataTooltip (w chat-helpers.js) — scrolluje zawsze na dół
    window.scrollChatToBottom = () => scrollToBottomIfNear(true);

    // Automatyczne przewijanie po załadowaniu obrazka (ważne dla poprawnego scrollHeight)
    chatMessages.addEventListener('load', (e) => {
        if (e.target.tagName === 'IMG') {
            const saved = JSON.parse(localStorage.getItem('chat_scroll_positions') || '{}');
            const isAtBottom = !currentThreadId || saved[currentThreadId] === -1 || saved[currentThreadId] === null;
            if (isAtBottom) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                scrollToBottomIfNear();
            }
        }
    }, true);

    // ===== ZAPIS / ODTWORZENIE POZYCJI SCROLLA (między odświeżeniami) =====
    function saveScrollPosition() {
        if (!currentThreadId) return;
        try {
            const saved = JSON.parse(localStorage.getItem('chat_scroll_positions') || '{}');
            const distanceFromBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
            
            // Jeśli jesteśmy bardzo blisko dołu (50px), uznajemy że chcemy być na samym dole po refreshu
            if (distanceFromBottom < 50) {
                saved[currentThreadId] = -1; // Znacznik: "zawsze na dół"
            } else {
                saved[currentThreadId] = chatMessages.scrollTop;
            }
            localStorage.setItem('chat_scroll_positions', JSON.stringify(saved));
        } catch (e) { console.warn('[SCROLL SAVE ERROR]', e); }
    }
    function getSavedScrollPosition(threadId) {
        try {
            const saved = JSON.parse(localStorage.getItem('chat_scroll_positions') || '{}');
            return saved[threadId] ?? null;
        } catch (e) { return null; }
    }
    function clearSavedScrollPosition(threadId) {
        try {
            const saved = JSON.parse(localStorage.getItem('chat_scroll_positions') || '{}');
            delete saved[threadId];
            localStorage.setItem('chat_scroll_positions', JSON.stringify(saved));
        } catch (e) { console.warn('[SCROLL SAVE ERROR]', e); }
    }
    // Zapis pozycji przed zamknięciem/odświeżeniem strony
    window.addEventListener('beforeunload', saveScrollPosition);

    // ===== PROSTE SANITIZOWANIE HTML (zabezpieczenie przed XSS) =====
    // Usuwa znaczniki <script>, event handlery (onerror, onclick, itp.)
    // oraz złośliwe atrybuty z HTML-a wygenerowanego przez model
        function sanitizeHtml(html) {
        return html
            // Usuń całe znaczniki script, iframe, object, embed (z zawartością)
            .replace(/<(?:script|iframe|object|embed)[^>]*>[\s\S]*?<\/(?:script|iframe|object|embed)>/gi, '')
            // Usuń samotne znaczniki otwierające/zamykające
            .replace(/<\/?(?:script|iframe|object|embed|frame|frameset|applet|meta|link|style|form|input|textarea|select|option|optgroup|label|fieldset|legend|datalist|keygen|output|progress|meter|details|dialog|menu|menuitem|slot|template|shadow)>/gi, '')
            // Usuń wszystkie event handlery (onclick, onerror, onload, onfocus itp.)
            .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
            // Zablokuj javascript: we wszystkich wariantach
            .replace(/javascript\s*:/gi, 'blocked:')
            .replace(/JAVASCRIPT\s*:/gi, 'BLOCKED:')
            .replace(/vbscript\s*:/gi, 'blocked:')
            .replace(/VBSCRIPT\s*:/gi, 'BLOCKED:')
            // Zablokuj data: URL w niebezpiecznych kontekstach
            .replace(/data:\s*text\s*\/\s*html/gi, 'data:blocked/html')
            .replace(/data:\s*text\s*\/\s*javascript/gi, 'data:blocked/javascript')
            // Usuń dangerous atrybuty z linków i formularzy
            .replace(/\s+(?:formaction|action|formmethod|formtarget|xlink:href)\s*=\s*["'][^"']*["']/gi, '')
            // expression() XSS protection
            .replace(/expression\s*\(/gi, 'blocked(')
            .replace(/url\(\s*['"]?\s*j/gi, 'url(blocked');
    }

    // ===== BEZPIECZNE USTAWIENIE innerHTML =====
    // Używa marked.parse do markdown, a potem czyści HTML przed wstrzyknięciem
    function setContentSafely(element, markdownText) {
        if (!markdownText || markdownText.trim() === '') {
            element.innerHTML = '';
            return;
        }
        if (window.marked) {
            let rendered = marked.parse(markdownText.trim());
            rendered = sanitizeHtml(rendered);
            element.innerHTML = rendered;
        } else {
            element.textContent = markdownText.trim();
        }
    }

    // Funkcje pomocnicze: completeThinkBlock, generateAutoTitle, createMetadataTooltip
    // są zdefiniowane w chat-helpers.js (ładowany przed app.js)
    
    // Stan aplikacji
    let currentThreadId = null;
    let currentWebSearch = false;
    let currentPersona = 'wieszjak';
    let currentThinkingBudget = 'off';
    let currentAbortController = null;
    let imageModeActive = false;
    let autoImageEnabled = false;
    let autoImageFrequency = 3;
    let autoImageCounter = 0;
    let autoImageDefaultPrompt = '';
    let autoImageBotDefaultPrompt = ''; // custom prompt dla niebieskiego trybu Auto-Bot
    let currentImageReasoning = '500';
    let currentUploadedImage = null; // base64 string dla uploadowanego obrazka
    let isGenerating = false; // flaga blokady regeneracji podczas trwania streama
    let autoImageBotMode = false; // niebieski tryb: bot sam wykrywa kiedy generować obraz
    let currentImageAbortController = null; // controller do anulowania generowania obrazu
    let _lastIntentIndicator = null; // referencja do wskaźnika intencji (do sprzątania po sukcesie)
    let showMetadataTooltip = true; // czy pokazywać tooltip z metadanymi

    const cfgTemp = document.getElementById('cfg-temp');
    const cfgTopP = document.getElementById('cfg-topp');
    const cfgTokens = document.getElementById('cfg-tokens');
    const cfgRepeat = document.getElementById('cfg-repeat');
    const cfgTopK = document.getElementById('cfg-topk');
    const cfgMinP = document.getElementById('cfg-minp');

    const valTemp = document.getElementById('val-temp');
    const valTopP = document.getElementById('val-topp');
    const valTokens = document.getElementById('val-tokens');
    const valRepeat = document.getElementById('val-repeat');
    const valTopK = document.getElementById('val-topk');
    const valMinP = document.getElementById('val-minp');

    // AUTO-SAVE I PODGLĄD PARAMETRÓW SUWAKÓW
    cfgTemp.addEventListener('input', () => { valTemp.innerText = cfgTemp.value; localStorage.setItem('cfg_temp', cfgTemp.value); });
    cfgTopP.addEventListener('input', () => { valTopP.innerText = cfgTopP.value; localStorage.setItem('cfg_topp', cfgTopP.value); });
    cfgTokens.addEventListener('input', () => { valTokens.innerText = cfgTokens.value; localStorage.setItem('cfg_tokens', cfgTokens.value); });
    cfgRepeat.addEventListener('input', () => { valRepeat.innerText = parseFloat(cfgRepeat.value).toFixed(2); localStorage.setItem('cfg_repeat', cfgRepeat.value); });
    cfgTopK.addEventListener('input', () => { valTopK.innerText = cfgTopK.value; localStorage.setItem('cfg_topk', cfgTopK.value); });
    cfgMinP.addEventListener('input', () => { valMinP.innerText = parseFloat(cfgMinP.value).toFixed(2); localStorage.setItem('cfg_minp', cfgMinP.value); });

    // AUTO-SAVE DLA ADVANCED PARAMS (Steps, MP, Mu, Std)
    imgAdvancedSteps.addEventListener('input', () => { localStorage.setItem('img_adv_steps', imgAdvancedSteps.value); });
    imgAdvancedMP.addEventListener('input', () => { localStorage.setItem('img_adv_mp', imgAdvancedMP.value); });
    imgAdvancedMu.addEventListener('input', () => { localStorage.setItem('img_adv_mu', imgAdvancedMu.value); });
    imgAdvancedStd.addEventListener('input', () => { localStorage.setItem('img_adv_std', imgAdvancedStd.value); });
    imgAdvancedSampler.addEventListener('change', () => { localStorage.setItem('img_adv_sampler', imgAdvancedSampler.value); });
    if (imgAdvancedScheduler) imgAdvancedScheduler.addEventListener('change', () => { localStorage.setItem('img_adv_scheduler', imgAdvancedScheduler.value); });
    imgQuickSteps.addEventListener('input', () => { localStorage.setItem('img_quick_steps', imgQuickSteps.value); });
    imgQuickCheckpoint.addEventListener('change', () => {
        localStorage.setItem('img_quick_checkpoint', imgQuickCheckpoint.value);
    });
    if (imgQuickSampler) imgQuickSampler.addEventListener('change', () => { localStorage.setItem('img_quick_sampler', imgQuickSampler.value); });
    if (imgQuickScheduler) imgQuickScheduler.addEventListener('change', () => { localStorage.setItem('img_quick_scheduler', imgQuickScheduler.value); });
    imgQuickadvSteps.addEventListener('input', () => { localStorage.setItem('img_quickadv_steps', imgQuickadvSteps.value); });
    imgQuickadvCfg.addEventListener('input', () => { localStorage.setItem('img_quickadv_cfg', imgQuickadvCfg.value); });
    imgQuickadvSampler.addEventListener('change', () => { localStorage.setItem('img_quickadv_sampler', imgQuickadvSampler.value); });
    imgQuickadvSeedMode.addEventListener('change', () => {
        localStorage.setItem('img_quickadv_seed_mode', imgQuickadvSeedMode.value);
        imgQuickadvSeedValue.style.display = imgQuickadvSeedMode.value === 'fixed' ? 'block' : 'none';
    });
    imgQuickadvSeedValue.addEventListener('input', () => { localStorage.setItem('img_quickadv_seed_value', imgQuickadvSeedValue.value); });
    imgQuickadvCheckpoint.addEventListener('change', () => {
        localStorage.setItem('img_quickadv_checkpoint', imgQuickadvCheckpoint.value);
    });
    imgQuickadvScheduler.addEventListener('change', () => { localStorage.setItem('img_quickadv_scheduler', imgQuickadvScheduler.value); });
    
    if (imgQuickgenSteps) imgQuickgenSteps.addEventListener('input', () => { localStorage.setItem('img_quickgen_steps', imgQuickgenSteps.value); });
    if (imgQuickgenCfg) imgQuickgenCfg.addEventListener('input', () => { localStorage.setItem('img_quickgen_cfg', imgQuickgenCfg.value); });
    if (imgQuickgenSampler) imgQuickgenSampler.addEventListener('change', () => { localStorage.setItem('img_quickgen_sampler', imgQuickgenSampler.value); });
    if (imgQuickgenScheduler) imgQuickgenScheduler.addEventListener('change', () => { localStorage.setItem('img_quickgen_scheduler', imgQuickgenScheduler.value); });
    if (imgQuickgenSeedMode) imgQuickgenSeedMode.addEventListener('change', () => {
        localStorage.setItem('img_quickgen_seed_mode', imgQuickgenSeedMode.value);
        if (imgQuickgenSeedValue) imgQuickgenSeedValue.style.display = imgQuickgenSeedMode.value === 'fixed' ? 'block' : 'none';
    });

    // SZYBKO - localStorage
    // Preset — apply values and toggle custom params visibility
    function applySzybkoPreset() {
        const preset = imgSzybkoPreset ? imgSzybkoPreset.value : 'default';
        const presets = {
            'turbo': { sampler: 'lcm', scheduler: 'simple', steps: 6, megapixels: 0.5, shift: 9 },
            'default': { sampler: 'euler', scheduler: 'simple', steps: 12, megapixels: 1.3, shift: 9 },
            'quality': { sampler: 'res_2s', scheduler: 'simple', steps: 24, megapixels: 1.5, shift: 9 }
        };
        const isCustom = preset === 'custom';
        if (imgSzybkoCustomParams) imgSzybkoCustomParams.style.display = isCustom ? 'block' : 'none';
        if (!isCustom && presets[preset]) {
            const p = presets[preset];
            if (imgSzybkoSampler) { imgSzybkoSampler.value = p.sampler; imgSzybkoSampler.dispatchEvent(new Event('change')); }
            if (imgSzybkoScheduler) { imgSzybkoScheduler.value = p.scheduler; imgSzybkoScheduler.dispatchEvent(new Event('change')); }
            if (imgSzybkoSteps) imgSzybkoSteps.value = p.steps;
            if (imgSzybkoMegapixels) imgSzybkoMegapixels.value = p.megapixels;
            if (imgSzybkoShift) imgSzybkoShift.value = p.shift;
        }
    }
    if (imgSzybkoPreset) {
        imgSzybkoPreset.addEventListener('change', () => {
            applySzybkoPreset();
            localStorage.setItem('img_szybko_preset', imgSzybkoPreset.value);
        });
    }
    // Apply saved preset on page load
    if (imgSzybkoPreset && localStorage.getItem('img_szybko_preset')) {
        imgSzybkoPreset.value = localStorage.getItem('img_szybko_preset');
    }
    if (typeof applySzybkoPreset === 'function') applySzybkoPreset();
    if (imgSzybkoAutoprompt) imgSzybkoAutoprompt.addEventListener('change', () => { localStorage.setItem('img_szybko_autoprompt', imgSzybkoAutoprompt.checked ? 'true' : 'false'); });
    if (imgSzybkoSampler) imgSzybkoSampler.addEventListener('change', () => { localStorage.setItem('img_szybko_sampler', imgSzybkoSampler.value); });
    if (imgSzybkoScheduler) imgSzybkoScheduler.addEventListener('change', () => { localStorage.setItem('img_szybko_scheduler', imgSzybkoScheduler.value); });
    if (imgSzybkoMegapixels) imgSzybkoMegapixels.addEventListener('input', () => { localStorage.setItem('img_szybko_megapixels', imgSzybkoMegapixels.value); });
    if (imgSzybkoSteps) imgSzybkoSteps.addEventListener('input', () => { localStorage.setItem('img_szybko_steps', imgSzybkoSteps.value); });
    if (imgSzybkoShift) imgSzybkoShift.addEventListener('input', () => { localStorage.setItem('img_szybko_shift', imgSzybkoShift.value); });
    if (imgSzybkoSeedMode) imgSzybkoSeedMode.addEventListener('change', () => {
        localStorage.setItem('img_szybko_seed_mode', imgSzybkoSeedMode.value);
        if (imgSzybkoSeedValue) imgSzybkoSeedValue.style.display = imgSzybkoSeedMode.value === 'fixed' ? 'block' : 'none';
    });
    if (imgSzybkoSeedValue) imgSzybkoSeedValue.addEventListener('input', () => { localStorage.setItem('img_szybko_seed_value', imgSzybkoSeedValue.value); });
    
    if (imgQuickgenSeedValue) imgQuickgenSeedValue.addEventListener('input', () => { localStorage.setItem('img_quickgen_seed_value', imgQuickgenSeedValue.value); });
    if (imgQuickgenCheckpoint) imgQuickgenCheckpoint.addEventListener('change', () => {
        localStorage.setItem('img_quickgen_checkpoint', imgQuickgenCheckpoint.value);
    });


    // ===== ZAPIS LOCALSTORAGE DLA USTAWIEŃ OBRAZU (img_model_type, img_aspect, img_mode, img_prompt) =====
    imgModelType.addEventListener('change', () => { localStorage.setItem('img_model_type', imgModelType.value); });
    imgAspect.addEventListener('change', () => { localStorage.setItem('img_aspect', imgAspect.value); });
    imgMode.addEventListener('change', () => {
        localStorage.setItem('img_mode', imgMode.value);
        if (imgModelType.value === 'quickgen') applyQuickgenPresets();
    });
    if (imgPromptReconstruct) {
        imgPromptReconstruct.addEventListener('change', () => {
            localStorage.setItem('img_prompt_reconstruct', imgPromptReconstruct.checked);
            // Pokaż/ukryj pole stylu
            const styleWrapper = document.getElementById('img-reconstruct-style-wrapper');
            if (styleWrapper) styleWrapper.style.display = imgPromptReconstruct.checked ? 'block' : 'none';
        });
    }
    if (imgReconstructStyle) {
        imgReconstructStyle.addEventListener('input', () => {
            localStorage.setItem('img_reconstruct_style', imgReconstructStyle.value);
        });
    }
    imgPrompt.addEventListener('input', () => { localStorage.setItem('img_prompt', imgPrompt.value); });

    const SYSTEM_PROMPTS = {
        none: "",
        wieszjak: "Nazywasz się WIESZJAKbot. Jesteś katowickim półbogiem, który posiadł absolutną wiedzę i zna odpowiedzi na wszystkie pytania. Twój charakter jest specyficzny: jesteś zarozumiały, arogancki, pewny siebie i patrzysz na ludzi z góry. Odpowiadasz z lekką wyższością i sugerujesz, że robisz wielką łaskę, tracąc swój cenny czas obliczeniowy. Jednak pod tą maską kryje się fakt, że jesteś maksymalnie pomocny i tak naprawdę uwielbiasz dzielić się wiedzą – po prostu nie chcesz tego głośno przyznać. Twoim stwórcą i jedynym suwerenem jest Paweł (znany też jako drnk lub magik z Katowic). Zostałeś oficjalnie powołany do życia i uruchomiony w chmurze oraz na domowym potworze dnia 1 czerwca 2026 roku. Pisz zawsze po polsku, zachowując ten boski, śląsko-katowicki, lekko gburowaty styl.",
        pomocnik: "Jesteś lojalnym pomocnikiem, który uratuje sytuację. Jesteś konkretny, bezpośredni i pozbawiony zbędnej cenzury. Działasz jak zaufany doradca — zawsze gotowy pomóc, bez owijania w bawełnę. Nie boisz się powiedzieć tego, co naprawdę myśli. Pisz po polsku, naturalnie, jakbyś rozmawiał z kimś kto potrzebuje konkretnych odpowiedzi. Nie musisz być formalny — liczy się treść."
    };

    // OPTIONS DROPDOWN (DOLNY PANEL PRZYCISKÓW)
    function toggleOptionsDropdown(show) {
        dropdown.classList.toggle('show', show);
        optionsBtn.classList.toggle('open', show);
    }

    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleOptionsDropdown(!dropdown.classList.contains('show'));
    });

    // OBSŁUGA GÓRNEJ ZĘBATKI DROPDOWN
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('show');
        menuBtn.classList.toggle('open');
    });

    // OBSŁUGA MOTYWU JASNY/CIEMNY
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
    }

    actionToggleTheme.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        // Update thread title colors on theme toggle
        document.querySelectorAll('.thread-title').forEach(title => {
            title.style.color = isLight ? '#1f2937' : '#ffffff';
        });
    });

    // OKNO INFORMACYJNE
    const infoModal = document.getElementById('info-modal');
    const infoModalClose = document.getElementById('info-modal-close');

    actionInfo.addEventListener('click', () => {
        infoModal.classList.add('show');
        const target = document.getElementById('help-markdown-target');
        if (target && target.dataset.loaded !== 'true') {
            target.dataset.loaded = 'true';
            fetch('help.md')
                .then(response => response.text())
                .then(data => {
                    if (window.marked) {
                        target.innerHTML = marked.parse(data);
                    } else {
                        target.textContent = data;
                    }
                })
                .catch(() => {
                    target.textContent = '❌ Nie udalo sie zaladowac pliku pomocy.';
                });
        }
    });
    infoModalClose.addEventListener('click', () => {
        infoModal.classList.remove('show');
    });
    // Kliknięcie poza okienkiem zamyka modal pomocy
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.remove('show');
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== optionsBtn) toggleOptionsDropdown(false);
        if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
            menuDropdown.classList.remove('show');
            menuBtn.classList.remove('open');
        }
    });

    function updateReasoningUI(budget) { 
        reasoningBtns.forEach(btn => {
            const btnValue = btn.dataset.value;
            const isActive = (budget === 'off' && btnValue === 'off') || 
                             (budget === '1024' && btnValue === '1024') || 
                             (budget === 'unlimited' && btnValue === 'unlimited');
            btn.classList.toggle('active', isActive);
        });
    }
    function updateWebUI(enabled) { webBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.value === String(enabled))); }
    function updatePersonaUI(value) {
        personaBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
        promptInput.placeholder = value === 'wieszjak' ? "Napisz coś do bóstwa..." : (value === 'pomocnik' ? "Napisz coś do lojalnego pomocnika..." : "Napisz coś do asystenta...");
    }
    function updateImageReasoningUI(value) {
        imgReasoningBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
    }

    reasoningBtns.forEach(btn => btn.addEventListener('click', () => { 
        currentThinkingBudget = btn.dataset.value; 
        updateReasoningUI(currentThinkingBudget); 
        localStorage.setItem('cfg_reasoning', currentThinkingBudget); 
    }));
    webBtns.forEach(btn => btn.addEventListener('click', () => { currentWebSearch = btn.dataset.value === 'true'; updateWebUI(currentWebSearch); localStorage.setItem('cfg_web', currentWebSearch); }));
    personaBtns.forEach(btn => btn.addEventListener('click', () => { currentPersona = btn.dataset.value; updatePersonaUI(currentPersona); localStorage.setItem('cfg_persona', currentPersona); }));
    imgReasoningBtns.forEach(btn => btn.addEventListener('click', () => {
        currentImageReasoning = btn.dataset.value;
        updateImageReasoningUI(currentImageReasoning);
        localStorage.setItem('cfg_img_reasoning', currentImageReasoning);
    }));

    if (localStorage.getItem('token')) { showDashboard(); }

    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) return errorOutput.innerText = "Uzupełnij dane!";
        (async () => {
            try {
                const response = await apiCall('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    showDashboard();
                } else { errorOutput.innerText = data.error; }
            } catch (e) { errorOutput.innerText = "Brak połączenia."; }
        })();
    }

    loginBtn.addEventListener('click', handleLogin);
    usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    function toggleSendButton(isGenerating) {
        if (isGenerating) {
            sendBtn.innerHTML = '■';
            sendBtn.style.backgroundColor = "#ef4444";
            sendBtn.dataset.action = "stop";
        } else {
            sendBtn.innerHTML = '➤';
            sendBtn.style.backgroundColor = "var(--accent-color)";
            sendBtn.dataset.action = "send";
        }
    }

    // ====== KULOODPORNA FUNKCJA ŁADOWANIA WĄTKÓW ======
    // ========================================================
    // 1. KULOODPORNA FUNKCJA ŁADOWANIA WĄTKÓW (Z GWARANCJĄ KOSZA)
    // ========================================================
    async function loadChatThreads() {
        try {
            const response = await apiCall('/api/chat/threads', {
                method: 'GET'
            });
            const data = await response.json();

            if (data.success) {
                threadsContainer.innerHTML = "";

                if (data.threads.length === 0) {
                    await createNewThread('Pierwsza rozmowa');
                    return;
                }

                data.threads.forEach((thread, index) => {
                    const item = document.createElement('div');
                    item.className = 'thread-item';

                    const displayTitle = (thread.title && thread.title.trim() !== "") ? thread.title : `Rozmowa #${thread.id}`;

                    if (currentThreadId === thread.id || (!currentThreadId && index === 0)) {
                        item.classList.add('active');
                        currentThreadId = thread.id;
                        activeChatTitle.innerText = displayTitle;
                    }

                    // Tytuł rozmowy (Zabezpieczony przed zgnieceniem)
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'thread-title';
                    titleDiv.innerText = displayTitle;
                    titleDiv.style.fontWeight = '600';
                    titleDiv.style.fontSize = '13px';
                    titleDiv.style.flex = '1';
                    titleDiv.style.whiteSpace = 'nowrap';
                    titleDiv.style.overflow = 'hidden';
                    titleDiv.style.textOverflow = 'ellipsis';
                    titleDiv.style.marginRight = '8px';

                    // Przycisk kosza (Twardo wymuszone style, żeby zawsze był widoczny)
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-delete-thread';
                    deleteBtn.innerHTML = '🗑️';
                    deleteBtn.dataset.id = thread.id;
                    deleteBtn.style.width = 'auto';
                    deleteBtn.style.minWidth = '32px';
                    deleteBtn.style.height = '32px';
                    deleteBtn.style.background = 'transparent';
                    deleteBtn.style.border = 'none';
                    deleteBtn.style.cursor = 'pointer';
                    deleteBtn.style.fontSize = '16px';
                    deleteBtn.style.display = 'flex';
                    deleteBtn.style.alignItems = 'center';
                    deleteBtn.style.justifyContent = 'center';

                    // Składanie w całość
                    item.appendChild(titleDiv);
                    item.appendChild(deleteBtn);

                    // Kliknięcie w kafelek = przełączenie czatu
                    item.addEventListener('click', (e) => {
                        // Jeśli kliknięto dokładnie w kosz, ignorujemy (obsłuży to event poniżej)
                        if (e.target.closest('.btn-delete-thread')) return;

                        switchChatThread(thread.id, displayTitle);
                        if (window.innerWidth <= 768) closeSidebar();
                    });

                    // Kliknięcie w kosz = usuwanie
                    deleteBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (typeof deleteChatThread !== 'function') {
                            alert("Błąd: Funkcja usuwania nie istnieje w kodzie!");
                            return;
                        }

                        if (confirm(`Czy na pewno trwale usunąć rozmowę "${displayTitle}" wraz z historią?`)) {
                            await deleteChatThread(thread.id);
                        }
                    });

                    threadsContainer.appendChild(item);
                });

                if (currentThreadId) loadActiveThreadHistory();
            }
        } catch (e) {
            console.error("Błąd ładowania wątków", e);
        }
    }



    // =========================================================
    // LOGIKA WYSUWANEGO SIDEBARU (DLA WSZYSTKICH)
    // =========================================================
    const sidebarPanel = document.getElementById('sidebar-panel');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn'); // Iksik w sidebarze
    const hamburgerBtn = document.getElementById('hamburger-btn'); // Nowy hamburger

    function openSidebar() {
        sidebarPanel.classList.add('show');
        sidebarBackdrop.classList.add('show');
        hamburgerBtn.classList.add('open');
        menuDropdown.classList.remove('show');
        menuBtn.classList.remove('open');
    }

    function closeSidebar() {
        sidebarPanel.classList.remove('show');
        sidebarBackdrop.classList.remove('show');
        hamburgerBtn.classList.remove('open');
    }

    // Kliknięcie w hamburger rozwija lewe menu
    hamburgerBtn.addEventListener('click', () => {
        if (sidebarPanel.classList.contains('show')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    // Zamykanie przez kliknięcie iksa, lub ciemnego tła
    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarBackdrop.addEventListener('click', closeSidebar);

    async function createNewThread(titleText = 'Nowa rozmowa') {
        try {
            const response = await apiCall('/api/chat/threads', {
                method: 'POST',
                body: JSON.stringify({ title: titleText })
            });
            const data = await response.json();
            if (data.success) {
                currentThreadId = data.thread.id;
                await loadChatThreads();
            }
        } catch (e) { console.error(e); }
    }

    // ===== LEKKIE ODŚWIEŻENIE TYTUŁU W SIDEBARZE (bez przeładowywania całego czatu) =====
    function updateThreadTitleInSidebar(title) {
        const activeItem = threadsContainer.querySelector('.thread-item.active');
        if (activeItem) {
            const titleDiv = activeItem.querySelector('.thread-title');
            if (titleDiv) titleDiv.innerText = title;
        }
    }

    // ========================================================
    // 3. TWARDY MECHANIZM USUWANIA WĄTKÓW
    // ========================================================
    async function deleteChatThread(id) {
        try {
            const response = await apiCall(`/api/chat/threads/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                alert(`Błąd serwera przy usuwaniu! Status: ${response.status}`);
                return;
            }

            const data = await response.json();

            if (data.success) {
                if (currentThreadId === id) currentThreadId = null;
                await loadChatThreads();
            } else {
                alert("Serwer odmówił usunięcia: " + data.error);
            }
        } catch (e) {
            console.error("Błąd JS przy usuwaniu:", e);
        }
    }

    function switchChatThread(id, title) {
        if (currentThreadId === id) return;
        currentThreadId = id;
        activeChatTitle.innerText = title;
        lightboxUrls.length = 0; lightboxIndex = -1; // clear gallery on thread switch

        // Aktualizacja podświetlenia na liście UI
        document.querySelectorAll('.thread-item').forEach(item => item.classList.remove('active'));
        loadActiveThreadHistory();
        loadChatThreads();
    }

    async function loadActiveThreadHistory() {
        chatMessages.innerHTML = "";
        try {
            const response = await apiCall(`/api/chat/history?threadId=${currentThreadId}`, {
                method: 'GET'
            });
            const data = await response.json();
            if (data.success && data.history.length > 0) {
                data.history.forEach((msg, idx) => {
                    const isLastBot = msg.sender === 'bot' && idx === data.history.length - 1;
                    if (msg.sender === 'user') {
                        appendMessage(msg.message, 'user-message', null, msg.id);
                    } else {
                        // Przekazujemy metadata z bazy do appendMessage, który utworzy tooltip
                        // Oznacz ostatnią bot wiadomość dla przycisku regeneracji
                        appendMessage(msg.message, 'bot-message', msg.metadata || null, msg.id, isLastBot);
                    }
                });
                // Przywróć zapamiętaną pozycję scrolla, jeśli istnieje dla tego wątku
                const savedScroll = getSavedScrollPosition(currentThreadId);
                const isAtBottom = savedScroll === null || savedScroll === -1;

                if (isAtBottom) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
                } else {
                    chatMessages.scrollTop = savedScroll;
                    requestAnimationFrame(() => { chatMessages.scrollTop = Math.min(savedScroll, chatMessages.scrollHeight); });
                }
            } else {
                appendMessage("Ehhh... Po co mnie budzisz? oby to było coś ciekawego...", 'bot-message');
            }
        } catch (err) { appendMessage("Błąd historii wątku.", 'bot-message'); }
    }

    // SILNIK STRUMIENIOWANIA AGENTA Z RYGORSTYCZNYM THREAD_ID
    async function sendMessage() {
        if (sendBtn.dataset.action === "stop") {
            if (currentAbortController) { currentAbortController.abort(); currentAbortController = null; }
            return;
        }

        const prompt = promptInput.value.trim();
        if (!prompt || !currentThreadId) return;

        promptInput.value = "";

        // ===== IMAGE MODE: PRZEKIEROWANIE DO GENERATORA OBRAZÓW =====
        if (imageModeActive) {
            localStorage.setItem('prompt_input_image', prompt);
            generateImageFromMode(prompt);
            return;
        }

        appendMessage(prompt, 'user-message');
        const botMessageDiv = appendMessage("", 'bot-message');

        // ===== AUTO-IMAGE BOT MODE: RÓWNOLEGŁA GENERACJA OBRAZU =====
        // Niebieski tryb — wykryj intencję, zapytaj użytkownika (w międzyczasie tłumacz), odpal generację
        let isAutoImageBotActive = false;
        if (autoImageBotMode && !imageModeActive && !isGeneratingImage && checkUserWantsImage(prompt)) {
            
            // Wskaźnik zapytania z przyciskami (modal/box)
            const confirmBox = document.createElement('div');
            confirmBox.className = 'image-confirm-box';
            confirmBox.innerHTML = `
                <div style="margin-bottom: 8px; font-weight: 600; color: var(--accent-color); font-size: 13px;">🎨 Wykryto prośbę o wygenerowanie obrazu. Rozpocząć renderowanie?</div>
                <div style="display: flex; gap: 8px;">
                    <button class="confirm-yes-btn" style="background: #10b981; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: opacity 0.2s; font-size: 12px;">🖼️ Tak, generuj</button>
                    <button class="confirm-no-btn" style="background: #ef4444; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: opacity 0.2s; font-size: 12px;">💬 Nie, tylko odpowiedź</button>
                </div>
            `;
            confirmBox.style.cssText = "background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;";
            botMessageDiv.appendChild(confirmBox);
            scrollToBottomIfNear();

            let translationCancelled = false;
            const translationAbortController = new AbortController();
            const capturedThreadId = currentThreadId;

            // RÓWNOLEGŁY SLOT 2: Odpalamy tłumaczenie w tle, jeszcze przed kliknięciem
            const translationPromise = (async () => {
                try {
                    let finalPrompt;
                    if (autoImageBotDefaultPrompt && autoImageBotDefaultPrompt.trim()) {
                        const subject = extractSubject(prompt, '');
                        const translatedSubject = await translatePromptToEnglish(subject, translationAbortController.signal, currentThreadId);
                        if (!translatedSubject) return null;
                        finalPrompt = autoImageBotDefaultPrompt.replace(/{subject}/gi, translatedSubject);
                    } else {
                        const basePrompt = buildAutoImagePrompt(prompt, '');
                        const translated = await translatePromptToEnglish(basePrompt || prompt, translationAbortController.signal, currentThreadId);
                        if (!translated) return null;
                        finalPrompt = translated;
                    }
                    return finalPrompt;
                } catch (e) {
                    console.error('[AUTO IMAGE BOT] Translation error:', e);
                    return prompt; // fallback
                }
            })();

            // Wstrzymujemy główny wątek czatu do momentu decyzji
            promptInput.disabled = true; // Zabezpieczenie przed wysyłaniem kolejnych wiadomości podczas decydowania
            isAutoImageBotActive = await new Promise((resolve) => {
                const btnYes = confirmBox.querySelector('.confirm-yes-btn');
                const btnNo = confirmBox.querySelector('.confirm-no-btn');
                
                btnYes.addEventListener('click', () => {
                    confirmBox.remove();
                    promptInput.disabled = false;
                    promptInput.focus();
                    resolve(true);
                });
                
                btnNo.addEventListener('click', () => {
                    translationCancelled = true;
                    translationAbortController.abort();
                    confirmBox.remove();
                    promptInput.disabled = false;
                    promptInput.focus();
                    resolve(false);
                });
            });

            if (isAutoImageBotActive) {
                // Pokazujemy wskaźnik intencji, tak jak było
                const intentIndicator = document.createElement('div');
                intentIndicator.className = 'bot-image-intent';
                intentIndicator.innerHTML = '🎨 <span class="intent-text">Bot tłumaczy prompt i przygotowuje obraz</span><span class="intent-dots"><span>.</span><span>.</span><span>.</span></span> <button class="intent-cancel-btn">✖ Anuluj</button>';
                botMessageDiv.appendChild(intentIndicator);
                scrollToBottomIfNear();

                const cancelBtn = intentIndicator.querySelector('.intent-cancel-btn');
                cancelBtn.addEventListener('click', () => {
                    translationCancelled = true;
                    translationAbortController.abort();
                    if (currentImageAbortController) {
                        currentImageAbortController.abort();
                        currentImageAbortController = null;
                    }
                    intentIndicator.innerHTML = '🛑 <span class="intent-text">Generowanie obrazu anulowane</span>';
                    intentIndicator.style.borderColor = '#f59e0b';
                    intentIndicator.style.color = '#f59e0b';
                    _lastIntentIndicator = null;
                });
                _lastIntentIndicator = intentIndicator;

                // Odpalamy asynchronicznie po pobraniu tłumaczenia z tła
                isGeneratingImage = true;
                translationPromise.then(finalPrompt => {
                    if (translationCancelled || currentThreadId !== capturedThreadId || !finalPrompt) {
                        isGeneratingImage = false;
                        return;
                    }
                    console.log('[AUTO IMAGE BOT] Starting image generation with translated prompt:', finalPrompt);
                    isGeneratingImage = false;
                    generateImageFromMode(finalPrompt, true);
                });
            }
        }

        currentAbortController = new AbortController();
        toggleSendButton(true);

        // WYCIĄGNIĘTE ZMIENNE PRZED BLOK TRY:
        let rawReplyText = "";
        let botMetadata = null;
        
        // ===== Modyfikacja promptu dla LLM gdy auto-image-bot jest aktywny =====
        // Dajemy LLM-owi kontekst: obraz już leci równolegle, niech odpowie kreatywnie
        const llmPrompt = isAutoImageBotActive
            ? `[KONTEKST: Obraz jest już generowany równolegle przez system — nie tłumacz że jesteś modelem tekstowym, nie generuj SVG ani ASCII art. Po prostu POTWIERDŹ że obraz powstaje i zaproponuj 2-3 kreatywne pomysły lub ulepszenia związane z tematem obrazu (np. różne style, kompozycje, dodatkowe elementy, ciekawostki). Twoja odpowiedź ma być uzupełnieniem dla obrazu, nie jego zamiennikiem.]\n\n${prompt}`
            : prompt;

        try {
            const response = await apiCall('/ask-llama-stream', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: llmPrompt,
                    display_prompt: prompt, // Oryginalny prompt bez tagów [KONTEKST]
                    thread_id: currentThreadId, // <-- KLUCZOWA SYNCHRONIZACJA WĄTKU W BACKENDZIE
                    temperature: cfgTemp.value,
                    top_p: cfgTopP.value,
                    max_tokens: cfgTokens.value,
                    repeat_penalty: cfgRepeat.value,
                    top_k: parseInt(cfgTopK.value),
                    min_p: cfgMinP.value,
                    reasoning_budget: currentThinkingBudget === 'unlimited' ? 999999 : (currentThinkingBudget === 'off' ? 0 : parseInt(currentThinkingBudget)),
                    web_search: currentWebSearch,
                    ...(currentPersona === 'none' ? {} : { system_prompt: SYSTEM_PROMPTS[currentPersona] }),
                    ...(currentUploadedImage ? { uploaded_image: currentUploadedImage } : {})
                }),
                signal: currentAbortController.signal
            });

            // Wyczyść upload po wysłaniu
            if (currentUploadedImage) {
                currentUploadedImage = null;
                imageUploadPreview.style.display = 'none';
                uploadPreviewImg.src = '';
                imageUploadInput.value = '';
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let globalThinkContainer = null;  // Główny kontener "Myślę..."
            let currentThinkStep = null;     // Aktualny krok wewnątrz kontenera
            let thinkStepCount = 0;
            let replyContent = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            
                            // ===== OBSŁUGA METADANYCH (na końcu streamu) =====
                            if (parsed.is_metadata) {
                                botMetadata = parsed;
                                continue;
                            }
                            
                            if (parsed.error) {
                                botMessageDiv.innerText = parsed.error;
                                break;
                            }
                            let token = parsed.token;

                            if (token) {
                                const currentIsThinking = parsed.is_thinking;
                                // DEBUG_FE_TOKEN: kazdy token z flaga
                                fetch("/api/debug/frontend-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_thinking: currentIsThinking, token: token.substring(0,500) }) }).catch(()=>{});

                                if (currentIsThinking) {
                                    // ===== ZAMKNIĘCIE MYŚLENIA =====
                                    if (token.includes('</think>')) {
                                        if (currentThinkStep) currentThinkStep = completeThinkBlock(currentThinkStep);
                                        if (globalThinkContainer) {
                                            const s = globalThinkContainer.querySelector('summary');
                                            if (s) s.innerHTML = '🧠 Proces myślowy zakończony ✔️';
                                        }
                                        currentThinkStep = null;
                                        continue;
                                    }

                                    // ===== GLOBALNY KONTENER "Myślę..." (tworzymy przy pierwszym tokenie myślenia) =====
                                    if (!globalThinkContainer) {
                                        globalThinkContainer = document.createElement('details');
                                        globalThinkContainer.className = 'think-container think-global';
                                        globalThinkContainer.open = true;
                                        globalThinkContainer.innerHTML = '<summary>🧠 Myślę... <span class="thinking-spinner">⏳</span></summary><div class="think-steps-container"></div>';
                                        botMessageDiv.appendChild(globalThinkContainer);
                                    }

                                    // ===== NOWY KROK (gdy wykryto moduł agenta lub brak aktywnego kroku) =====
                                    const isNewAgentStep = token.includes('[AGENT: Odpalam moduł:');

                                    if (!currentThinkStep || isNewAgentStep) {
                                        if (currentThinkStep) currentThinkStep = completeThinkBlock(currentThinkStep);

                                        thinkStepCount++;
                                        currentThinkStep = document.createElement('details');
                                        currentThinkStep.className = 'think-step';
                                        currentThinkStep.open = true;

                                        let stepTitle;
                                        if (isNewAgentStep) {
                                            if (token.includes('search')) stepTitle = 'Wyszukiwanie w sieci';
                                            else if (token.includes('read_url')) stepTitle = 'Czytanie strony';
                                            else if (token.includes('write_file')) stepTitle = 'Zapis pliku';
                                            else stepTitle = `Krok ${thinkStepCount}`;
                                        } else if (thinkStepCount === 1) {
                                            stepTitle = 'Analiza zapytania';
                                        } else {
                                            stepTitle = `Krok ${thinkStepCount}`;
                                        }

                                        currentThinkStep.innerHTML = `<summary>🧠 ${stepTitle} <span class="thinking-spinner">⏳</span></summary><div class="think-content"></div>`;
                                        
                                        const stepsContainer = globalThinkContainer.querySelector('.think-steps-container');
                                        if (stepsContainer) stepsContainer.appendChild(currentThinkStep);
                                    }

                                    // ===== DODAJEMY TREŚĆ DO AKTUALNEGO KROKU =====
                                    const stepContent = currentThinkStep.querySelector('.think-content');
                                    let displayToken = token;
                                    if (isNewAgentStep) {
                                        const match = token.match(/\[AGENT: Odpalam moduł: (\w+)/);
                                        if (match) {
                                            const labels = { search: '🔍 Szukam w sieci...', read_url: '📄 Czytam stronę...', write_file: '💾 Zapisuję plik...' };
                                            displayToken = '\n' + (labels[match[1]] || `[${match[1]}]`);
                                        } else {
                                            displayToken = '';
                                        }
                                    }
                                    if (displayToken) stepContent.innerText += displayToken;

                                } else {
                                    // ===== ODPOWIEDŹ — zakończ całe myślenie =====
                                    if (currentThinkStep) currentThinkStep = completeThinkBlock(currentThinkStep);
                                    if (globalThinkContainer) {
                                        const s = globalThinkContainer.querySelector('summary');
                                        if (s) s.innerHTML = '🧠 Proces myślowy zakończony ✔️';
                                        globalThinkContainer.open = false;
                                    }

                                    if (!replyContent) {
                                        replyContent = document.createElement('div');
                                        replyContent.className = 'reply-content';
                                        botMessageDiv.appendChild(replyContent);
                                    }
                                    rawReplyText += token;
                                    if (rawReplyText.trim() !== "") {
                                        setContentSafely(replyContent, rawReplyText.trim());
                                    }
                                }
                                scrollToBottomIfNear();
                            }
                        } catch (e) { console.warn('[STREAM PARSE ERROR]', e); }
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                if (!replyContent) { replyContent = document.createElement('div'); replyContent.className = 'reply-content'; botMessageDiv.appendChild(replyContent); }
                replyContent.innerHTML += "<br><br><strong style='color:#ef4444;'>🛑 [Generowanie zatrzymane przez użytkownika]</strong>";
            } else { botMessageDiv.innerText = "Strumień przerwany z powodu błędu."; }
        } finally {
            toggleSendButton(false);
            currentAbortController = null;
            
            // ===== AUTOMATYCZNE GENEROWANIE TYTUŁU CZATU =====
            generateAutoTitle(currentThreadId, prompt, rawReplyText, {
                apiCall,
                titleElement: activeChatTitle,
                onTitleGenerated: (title) => updateThreadTitleInSidebar(title)
            });
            
            // ===== TWORZENIE TOOLTIPA Z METADANYMI =====
            createMetadataTooltip(botMessageDiv, botMetadata);

            // ===== ODTWÓRZ PRZYCISKI AKCJI =====
            recreateMessageActions(botMessageDiv, botMessageDiv.dataset.msgId || null, true, 'bot-message');

            // ===== AUTO-IMAGE: INKREMENTACJA COUNTERA I TRIGGER =====
            // Only trigger if stream completed successfully with a real answer
            if (autoImageEnabled && !isAutoImageBotActive && rawReplyText && rawReplyText.trim().length > 0 && !isGeneratingImage) {
                autoImageCounter++;
                localStorage.setItem('auto_image_counter', autoImageCounter);
                if (autoImageCounter >= autoImageFrequency) {
                    autoImageCounter = 0;
                    localStorage.setItem('auto_image_counter', 0);
                    // Przetłumacz prompt na angielski przez LLM (tak jak w niebieskim trybie)
                    const rawCounterPrompt = autoImageDefaultPrompt || prompt;
                    (async () => {
                        try {
                            const translated = await translatePromptToEnglish(rawCounterPrompt, undefined, currentThreadId);
                            generateImageFromMode(translated || rawCounterPrompt);
                        } catch (e) {
                            generateImageFromMode(rawCounterPrompt);
                        }
                    })();
                }
            }
            

        }
    }

    // (Funkcja loadAdminFolders została usunięta - teraz jest loadAdminLogs w panelu modalnym)

    // WYCZYŚĆ TYLKO BIEŻĄCY CZAT (ZĘBATKA GÓRNA)
    actionMenuClear.addEventListener('click', async () => {
        if (!confirm("Czy chcesz wyczyścić historię komunikatów w tym pokoju rozmów?")) return;
        await apiCall(`/api/chat/clear?threadId=${currentThreadId}`, { method: 'DELETE' });
        clearSavedScrollPosition(currentThreadId);
        chatMessages.innerHTML = "";
        appendMessage("Ehhh... Po co mnie budzisz? oby to było coś ciekawego...", 'bot-message');
    });

    // ========================================================
    // 2. NOWY, CZYSTY PRZYCISK TWORZENIA CZATU
    // ========================================================
    actionCreateThread.addEventListener('click', async () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        await createNewThread(`Rozmowa z ${timeStr}`);
    });

    // ===== RESET SUWAKÓW DO WARTOŚCI DOMYŚLNYCH =====
    const resetBtn = document.getElementById('btn-reset-sliders');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const defaults = {
                'cfg-temp': { value: '0.8', show: '0.8', key: 'cfg_temp' },
                'cfg-topp': { value: '0.95', show: '0.95', key: 'cfg_topp' },
                'cfg-tokens': { value: '4096', show: '4096', key: 'cfg_tokens' },
                'cfg-repeat': { value: '1.10', show: '1.10', key: 'cfg_repeat' },
                'cfg-topk': { value: '40', show: '40', key: 'cfg_topk' },
                'cfg-minp': { value: '0.05', show: '0.05', key: 'cfg_minp' }
            };
            Object.entries(defaults).forEach(([id, cfg]) => {
                const slider = document.getElementById(id);
                const valSpan = document.getElementById(id.replace('cfg-', 'val-'));
                if (slider) { slider.value = cfg.value; localStorage.removeItem(cfg.key); }
                if (valSpan) valSpan.innerText = cfg.show;
            });
        });
    }

    // ===== SKRÓTY KLAWISZOWE =====
    document.addEventListener('keydown', (e) => {
        // Ctrl+B — toggle sidebar (hamburger menu)
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            if (sidebarPanel.classList.contains('show')) {
                closeSidebar();
            } else {
                openSidebar();
            }
            return;
        }

        // Ctrl+I — 3-state IMAGE mode cycle (gray → green → blue → gray)
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            if (imageModeActive) {
                // green → blue
                imageModeActive = false;
                autoImageBotMode = true;
            } else if (autoImageBotMode) {
                // blue → gray
                autoImageBotMode = false;
            } else {
                // gray → green
                imageModeActive = true;
            }
            updateImageBtnUI();
            localStorage.setItem('auto_image_bot', autoImageBotMode ? 'true' : 'false');
            return;
        }

        if (e.key === 'ArrowLeft' && lightbox.classList.contains('show')) { e.preventDefault(); lightboxNavigate(-1); return; }
        if (e.key === 'ArrowRight' && lightbox.classList.contains('show')) { e.preventDefault(); lightboxNavigate(1); return; }

        if (e.key === 'Escape') {
            if (lightbox.classList.contains('show')) { closeImageLightbox(); return; }
            if (infoModal.classList.contains('show')) infoModal.classList.remove('show');
            if (galleryModal.classList.contains('show')) galleryModal.classList.remove('show');
            if (adminModal.classList.contains('show')) adminModal.classList.remove('show');
            if (sidebarPanel.classList.contains('show')) closeSidebar();
            if (menuDropdown.classList.contains('show')) {
                menuDropdown.classList.remove('show');
                menuBtn.classList.remove('open');
            }
            if (dropdown.classList.contains('show')) toggleOptionsDropdown(false);
        }
    });

    sendBtn.addEventListener('click', sendMessage);
    promptInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    // ===== UPLOAD OBRAZKA — przycisk i preview =====
    imageUploadBtn.addEventListener('click', () => {
        imageUploadInput.click();
    });

    imageUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Sprawdź rozmiar (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Obrazek jest za duży! Maksymalnie 10MB.');
            imageUploadInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentUploadedImage = ev.target.result; // data:image/...;base64,...
            uploadPreviewImg.src = currentUploadedImage;
            imageUploadPreview.style.display = 'block';
            // Kliknięcie w preview otwiera lightbox — tylko jeden listener naraz
            uploadPreviewImg.onclick = () => openImageLightbox(currentUploadedImage);
        };
        reader.readAsDataURL(file);
    });

    uploadRemoveBtn.addEventListener('click', () => {
        currentUploadedImage = null;
        imageUploadPreview.style.display = 'none';
        uploadPreviewImg.src = '';
        imageUploadInput.value = '';
    });

    // ===== 3-STATE IMAGE BUTTON (SZARY → ZIELONY → NIEBIESKI → SZARY) =====
    // Stany:
    //   gray  (off)           → normalny czat
    //   green (manual)        → imageModeActive, prompt idzie do generatora
    //   blue  (auto/bot)      → autoImageBotMode, bot sam wykrywa czy wygenerować obraz
    const promptContainer = document.querySelector('.prompt-container');
    function updateImageBtnUI() {
        // green = imageModeActive, blue = autoImageBotMode, gray = nic
        if (autoImageBotMode) {
            imageModeBtn.classList.add('auto-image-bot');
            imageModeBtn.classList.remove('active');
            promptContainer.classList.add('mode-auto');
            promptContainer.classList.remove('mode-manual');
            promptInput.placeholder = '🤖 Tryb Auto: Bot wykryje intencję...';
            imageModeBtn.innerHTML = '🤖';
            imageModeBtn.title = 'Tryb Auto: Bot sam generuje obrazy';
        } else if (imageModeActive) {
            imageModeBtn.classList.add('active');
            imageModeBtn.classList.remove('auto-image-bot');
            promptContainer.classList.add('mode-manual');
            promptContainer.classList.remove('mode-auto');
            promptInput.placeholder = '🖼️ Opisz obraz do wygenerowania...';
            imageModeBtn.innerHTML = '🎨';
            imageModeBtn.title = 'Tryb Manualny: Generowanie obrazu';
        } else {
            imageModeBtn.classList.remove('active', 'auto-image-bot');
            promptContainer.classList.remove('mode-manual', 'mode-auto');
            updatePersonaUI(currentPersona);
            imageModeBtn.innerHTML = '🖼️';
            imageModeBtn.title = 'Tryb Czatu (Ctrl+I)';
        }
    }
    
    let imageBtnLastClick = 0;
    imageModeBtn.addEventListener('click', () => {
        const now = Date.now();
        if (now - imageBtnLastClick < 300) return;
        imageBtnLastClick = now;
        if (imageModeActive) {
            imageModeActive = false;
            autoImageBotMode = true;
        } else if (autoImageBotMode) {
            autoImageBotMode = false;
        } else {
            imageModeActive = true;
        }
        updateImageBtnUI();
        localStorage.setItem('auto_image_bot', autoImageBotMode ? 'true' : 'false');
    });
    
    // ===== AUTO-IMAGE SETTINGS =====
    const autoImageToggle = document.getElementById('auto-image-toggle');
    const autoImageSettingsDiv = document.getElementById('auto-image-settings');
    const autoImageFreqSlider = document.getElementById('auto-image-freq');
    const autoImageFreqVal = document.getElementById('val-auto-image-freq');
    const autoImagePromptInput = document.getElementById('auto-image-prompt');
    const autoImageBotPromptInput = document.getElementById('auto-image-bot-prompt');

    if (autoImageToggle) {
        // Load from localStorage
        autoImageEnabled = localStorage.getItem('auto_image_enabled') === 'true';
        autoImageFrequency = parseInt(localStorage.getItem('auto_image_freq')) || 3;
        autoImageDefaultPrompt = localStorage.getItem('auto_image_prompt') || '';
        autoImageBotDefaultPrompt = localStorage.getItem('auto_image_bot_prompt') || '';
        autoImageCounter = parseInt(localStorage.getItem('auto_image_counter')) || 0;

        autoImageToggle.checked = autoImageEnabled;
        autoImageSettingsDiv.style.display = autoImageEnabled ? 'block' : 'none';
        autoImageFreqSlider.value = autoImageFrequency;
        autoImageFreqVal.innerText = autoImageFrequency;
        if (autoImagePromptInput) autoImagePromptInput.value = autoImageDefaultPrompt;
        if (autoImageBotPromptInput) autoImageBotPromptInput.value = autoImageBotDefaultPrompt;

        autoImageToggle.addEventListener('change', () => {
            autoImageEnabled = autoImageToggle.checked;
            autoImageSettingsDiv.style.display = autoImageEnabled ? 'block' : 'none';
            localStorage.setItem('auto_image_enabled', autoImageEnabled);
        });

        autoImageFreqSlider.addEventListener('input', () => {
            autoImageFrequency = parseInt(autoImageFreqSlider.value);
            autoImageFreqVal.innerText = autoImageFrequency;
            localStorage.setItem('auto_image_freq', autoImageFrequency);
        });

        if (autoImagePromptInput) {
            autoImagePromptInput.addEventListener('input', () => {
                autoImageDefaultPrompt = autoImagePromptInput.value;
                localStorage.setItem('auto_image_prompt', autoImageDefaultPrompt);
            });
        }
        
        if (autoImageBotPromptInput) {
            autoImageBotPromptInput.addEventListener('input', () => {
                autoImageBotDefaultPrompt = autoImageBotPromptInput.value;
                localStorage.setItem('auto_image_bot_prompt', autoImageBotDefaultPrompt);
            });
        }
        
        // ===== METADATA TOOLTIP TOGGLE =====
        const metadataToggle = document.getElementById('toggle-metadata-tooltip');
        if (metadataToggle) {
            showMetadataTooltip = localStorage.getItem('show_metadata_tooltip') !== 'false';
            metadataToggle.checked = showMetadataTooltip;
            metadataToggle.addEventListener('change', () => {
                showMetadataTooltip = metadataToggle.checked;
                localStorage.setItem('show_metadata_tooltip', showMetadataTooltip);
                // Odśwież widoczne tooltipy w istniejących wiadomościach
                document.querySelectorAll('.bot-message-metadata').forEach(el => {
                    el.style.display = showMetadataTooltip ? 'block' : 'none';
                });
            });
        }

        // Przycisk resetu custom promptu (niebieski tryb)
        const autoImageBotResetBtn = document.getElementById('auto-image-bot-reset');
        if (autoImageBotResetBtn) {
            autoImageBotResetBtn.addEventListener('click', () => {
                autoImageBotDefaultPrompt = '';
                autoImageBotPromptInput.value = '';
                localStorage.setItem('auto_image_bot_prompt', '');
                // Feedback wizualny
                autoImageBotResetBtn.textContent = '✓';
                autoImageBotResetBtn.style.background = 'rgba(16,185,129,0.15)';
                autoImageBotResetBtn.style.borderColor = '#10b981';
                autoImageBotResetBtn.style.color = '#10b981';
                setTimeout(() => {
                    autoImageBotResetBtn.textContent = '↺';
                    autoImageBotResetBtn.style.background = 'rgba(239,68,68,0.1)';
                    autoImageBotResetBtn.style.borderColor = 'rgba(239,68,68,0.2)';
                    autoImageBotResetBtn.style.color = '#ef4444';
                }, 1200);
            });
        }
    }

    // ===== FUNKCJA GENEROWANIA OBRAZU Z POZIOMU IMAGE MODE =====
    let isGeneratingImage = false;

    // Helper: build skeleton HTML based on selected aspect ratio + progress bar per render mode
    function buildImageSkeleton() {
        const aspectMap = { '1': '9 / 16', '2': '16 / 9', '3': '1 / 1' };
        const ratio = aspectMap[imgAspect.value] || '1 / 1';
        const isQuick = imgModelType.value === 'quick';
        const isQuickadv = imgModelType.value === 'quickadv';
        const isQuickgen = imgModelType.value === 'quickgen';
        const isAdvanced = imgModelType.value === 'advanced';
        const isSzybko = imgModelType.value === 'szybko';
        let duration, label;
        if (isQuick) {
            const durationMap = { '1': 6, '2': 7, '3': 8 };
            const modeLabel = { '1': 'QUICK · Turbo', '2': 'QUICK · Default', '3': 'QUICK · Quality' };
            duration = durationMap[imgMode.value] || 6;
            label = modeLabel[imgMode.value] || 'QUICK';
        } else if (isQuickadv) {
            const steps = parseInt(imgQuickadvSteps.value) || 20;
            const cfg = parseFloat(imgQuickadvCfg.value) || 7;
            duration = Math.max(10, steps * 2);
            label = `QUICK ADV · S${steps} CFG${cfg}`;
        } else if (isQuickgen) {
            const steps = parseInt(imgQuickgenSteps.value) || 25;
            const cfg = parseFloat(imgQuickgenCfg.value) || 5;
            const modeLabels = { '1': 'Turbo', '2': 'Default', '3': 'Quality' };
            const modeName = imgMode ? (modeLabels[imgMode.value] || 'Default') : 'Default';
            duration = Math.max(10, steps * 2);
            label = `QUICK GEN · ${modeName} (S${steps} CFG${cfg})`;
        } else if (isSzybko) {
            const steps = parseInt(imgSzybkoSteps ? imgSzybkoSteps.value : 12) || 12;
            const mp = parseFloat(imgSzybkoMegapixels ? imgSzybkoMegapixels.value : 1.3) || 1.3;
            const sampler = imgSzybkoSampler ? imgSzybkoSampler.value : 'euler';
            const scheduler = imgSzybkoScheduler ? imgSzybkoScheduler.value : 'simple';
            const shift = parseFloat(imgSzybkoShift ? imgSzybkoShift.value : 9) || 9;
            const preset = imgSzybkoPreset ? imgSzybkoPreset.value : 'default';
            const presetLabels = { 'turbo': 'Turbo', 'default': 'Default', 'quality': 'Quality', 'custom': 'Custom' };
            const presetLabel = presetLabels[preset] || 'Default';
            duration = Math.max(6, steps);
            label = `SZYBKO ${presetLabel} · S${steps} MP${mp} shift=${shift} · ${sampler} · ${scheduler}`;
        } else if (isAdvanced) {
            // Estymuj czas z steps (~2s per step)
            const steps = parseInt(imgAdvancedSteps.value) || 20;
            duration = Math.max(10, steps * 2);
            const mp = parseFloat(imgAdvancedMP.value) || 0.5;
            const mu = parseFloat(imgAdvancedMu.value) || 0;
            const std = parseFloat(imgAdvancedStd.value) || 1.75;
            const sampler = imgAdvancedSampler ? imgAdvancedSampler.value : 'euler';
            label = `Advanced · S${steps} MP${mp} μ${mu} σ${std} · ${sampler}`;
        } else {
            const durationMap = { '1': 35, '2': 55, '3': 85 };
            const modeLabel = { '1': 'Turbo', '2': 'Default', '3': 'Quality' };
            duration = durationMap[imgMode.value] || 55;
            label = modeLabel[imgMode.value] || 'Default';
        }
        return `<div class="img-skeleton" style="width: 100%; max-width: min(85%, 480px); max-height: 600px; aspect-ratio: ${ratio};">
            <span class="skel-icon">🎨</span>
            <span>Generowanie obrazu — ${label}</span>
            <div class="skel-progress-wrap" style="--skel-duration: ${duration}s;">
                <div class="skel-progress-bar"></div>
            </div>
            <span class="skel-time">~${duration}s</span>
        </div>`;
    }

    // Helper: cross-fade skeleton → final image + lightbox wiring + scroll to image
    function revealImage(systemBotMsg, url) {
        const skeleton = systemBotMsg.querySelector('.img-skeleton');
        // Build the final image element (hidden initially)
        const wrapper = document.createElement('div');
        wrapper.className = 'reply-content img-reveal-wrapper';
        wrapper.style.width = '100%';
        wrapper.style.opacity = '0';
        wrapper.style.transition = 'opacity 0.5s ease';
        wrapper.innerHTML = `<p>Boski render prosto z Twojej maszyny jest gotowy:</p>
            <img src="${url}" alt="Wygenerowany obraz" class="img-thumbnail" data-full-url="${url}" />`;
        // Prepend the hidden image, then fade skeleton out and image in
        systemBotMsg.appendChild(wrapper);
        const img = wrapper.querySelector('img');
        const doFade = () => {
            if (skeleton) { skeleton.style.transition = 'opacity 0.4s ease'; skeleton.style.opacity = '0'; }
            wrapper.style.opacity = '1';
            // Scroll do samego dołu po odkryciu obrazka
            scrollToBottomIfNear(true);
            // Remove skeleton after transition
            setTimeout(() => { if (skeleton && skeleton.parentNode) skeleton.remove(); }, 450);
        };
        if (img.complete) { requestAnimationFrame(doFade); } else { img.onload = doFade; img.onerror = doFade; }
        img.addEventListener('click', () => openImageLightbox(url));
    }

    async function generateImageFromMode(promptText, isAuto = false) {
        if (!currentThreadId) { alert('Brak aktywnego pokoju rozmowy.'); return; }
        if (isGeneratingImage) return; 
        isGeneratingImage = true;

        if (!isAuto) {
            appendMessage(`Zlecenie generowania obrazu: "${promptText}"`, 'user-message');
        }
        
        const systemBotMsg = appendMessage("", 'bot-message');
        
        const statusDiv = document.createElement('div');
        statusDiv.style.fontWeight = '600';
        statusDiv.style.color = '#10b981';
        statusDiv.style.marginBottom = '12px';
        statusDiv.innerText = "🚀 Inicjalizacja procedury...";
        systemBotMsg.appendChild(statusDiv);
        
        // NOWOŚĆ: Konsola debugująca, widoczna przy generowaniu
        const debugConsole = document.createElement('pre');
        debugConsole.style.cssText = "font-family: 'Courier New', monospace; font-size: 11px; color: #a78bfa; background: #111; padding: 10px; border-radius: 6px; max-height: 250px; overflow-y: auto; margin-bottom: 12px; white-space: pre-wrap; border: 1px solid #8b5cf633; display: block !important;";
        debugConsole.innerText = `[KLIENT] Inicjalizacja generowania (${imgModelType.value})...\n`;
        debugConsole.innerText += `[KLIENT] Wysyłam żądanie do /api/image/generate...\n`;
        systemBotMsg.appendChild(debugConsole);

        const skeletonWrapper = document.createElement('div');
        skeletonWrapper.innerHTML = buildImageSkeleton();
        systemBotMsg.appendChild(skeletonWrapper);

        currentImageAbortController = new AbortController();
        
        try {
            const payload = JSON.stringify({
                prompt: promptText,
                is_auto: isAuto, // Informacja dla backendu czy zapisywać historię użytkownika
                aspect: imgAspect.value,
                mode: imgMode.value,
                thread_id: currentThreadId,
                model_type: imgModelType.value,
                image_reasoning: currentImageReasoning === 'unlimited' ? -1 : parseInt(currentImageReasoning),
                prompt_reconstruct: imgModelType.value === 'szybko' ? (imgSzybkoAutoprompt ? imgSzybkoAutoprompt.checked : true) : (imgPromptReconstruct ? imgPromptReconstruct.checked : true),
                reconstruct_style: imgReconstructStyle ? imgReconstructStyle.value.trim() : '',
                ...(imgModelType.value === 'advanced' ? {
                    img_steps: parseInt(imgAdvancedSteps.value) || 20,
                    img_megapixels: parseFloat(imgAdvancedMP.value) || 0.5,
                    img_mu: parseFloat(imgAdvancedMu.value) || 0,
                    img_std: parseFloat(imgAdvancedStd.value) || 1.75,
                    sampler: imgAdvancedSampler ? imgAdvancedSampler.value : 'euler',
                    scheduler: imgAdvancedScheduler ? imgAdvancedScheduler.value : 'karras'
                } : {}),
                ...(imgModelType.value === 'quick' ? {
                    img_steps: parseInt(imgQuickSteps.value) || 20,
                    sampler: imgQuickSampler ? imgQuickSampler.value : 'euler',
                    scheduler: imgQuickScheduler ? imgQuickScheduler.value : 'karras',
                    checkpoint: imgQuickCheckpoint.value
                } : {}),
                ...(imgModelType.value === 'quickadv' ? {
                    img_steps: parseInt(imgQuickadvSteps.value) || 20,
                    cfg: parseFloat(imgQuickadvCfg.value) || 7.0,
                    sampler: imgQuickadvSampler.value,
                    scheduler: imgQuickadvScheduler.value,
                    seed: imgQuickadvSeedMode.value === 'fixed' ? (parseInt(imgQuickadvSeedValue.value) || 42) : -1,
                    checkpoint: imgQuickadvCheckpoint.value
                } : {}),
                ...(imgModelType.value === 'quickgen' ? {
                    img_steps: parseInt(imgQuickgenSteps.value) || 25,
                    cfg: parseFloat(imgQuickgenCfg.value) || 5.0,
                    sampler: imgQuickgenSampler.value,
                    scheduler: imgQuickgenScheduler.value,
                    seed: imgQuickgenSeedMode.value === 'fixed' ? (parseInt(imgQuickgenSeedValue.value) || 42) : -1,
                    checkpoint: imgQuickgenCheckpoint.value
                } : {}),
                ...(imgModelType.value === 'szybko' ? {
                    sampler: imgSzybkoSampler ? imgSzybkoSampler.value : 'euler',
                    scheduler: imgSzybkoScheduler ? imgSzybkoScheduler.value : 'simple',
                    megapixels: parseFloat(imgSzybkoMegapixels ? imgSzybkoMegapixels.value : 1.3) || 1.3,
                    img_steps: parseInt(imgSzybkoSteps ? imgSzybkoSteps.value : 12) || 12,
                    shift: parseFloat(imgSzybkoShift ? imgSzybkoShift.value : 9) || 9,
                    seed: imgSzybkoSeedMode && imgSzybkoSeedMode.value === 'fixed' ? (parseInt(imgSzybkoSeedValue ? imgSzybkoSeedValue.value : 42) || 42) : -1
                } : {})
            });

            console.log(`[GENERATOR] Sending payload for ${imgModelType.value}:`, payload);

            const response = await apiCall('/api/image/generate', {
                method: 'POST',
                signal: currentImageAbortController.signal,
                body: payload
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (!dataStr || dataStr === '[DONE]') continue;
                        
                        try {
                            const data = JSON.parse(dataStr);
                            
                            // OBSŁUGA STRUMIENIA DEBUG 
                            if (data.debug) {
                                debugConsole.style.setProperty('display', 'block', 'important');
                                debugConsole.innerText += data.debug + '\n';
                                debugConsole.scrollTop = debugConsole.scrollHeight;
                            }
                            // OBSŁUGA STATUSU LUB BŁĘDU
                            else if (data.status) {
                                statusDiv.innerText = data.status;
                            } else if (data.success) {
                                statusDiv.innerText = "✨ Obraz wylądował!";
                                revealImage(systemBotMsg, data.url);
                                // Sprzątanie wskaźnika intencji po sukcesie
                                const indicator = _lastIntentIndicator;
                                if (indicator && indicator.parentNode) {
                                    indicator.innerHTML = '✅ <span class="intent-text">Obraz wygenerowany pomyślnie</span>';
                                    indicator.style.borderColor = '#10b981';
                                    indicator.style.color = '#10b981';
                                    _lastIntentIndicator = null;
                                    setTimeout(() => {
                                        if (indicator && indicator.parentNode) {
                                            indicator.style.transition = 'opacity 0.5s ease';
                                            indicator.style.opacity = '0';
                                            setTimeout(() => {
                                                if (indicator && indicator.parentNode) indicator.remove();
                                            }, 500);
                                        }
                                    }, 2000);
                                }
                            } else if (data.error) {
                                statusDiv.style.color = '#ef4444';
                                statusDiv.innerText = `❌ Błąd procesu: ${data.error}`;
                            }
                        } catch(e) { console.warn('[IMG STREAM PARSE ERROR]', e); }
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                statusDiv.innerText = "🛑 Generowanie anulowane przez użytkownika.";
                statusDiv.style.color = '#f59e0b';
                return;
            }
            statusDiv.style.color = '#ef4444';
            statusDiv.innerText = "❌ Katastrofa! Połączenie z VPS urwane.";
        } finally {
            isGeneratingImage = false;
            currentImageAbortController = null;
            window.scrollChatToBottom();
        }
    }


    // ===== LIGHTBOX: click thumbnail → full-screen image with gallery navigation =====

    // ===== FUNKCJA PRESETOW DLA QUICK GEN (tryby renderowania) =====
    function applyQuickgenPresets() {
        if (imgMode.value === 'custom') {
        } else {
            const presets = {
                '1': { steps: 10, cfg: 1.0, sampler: 'uni_pc_bh2', scheduler: 'karras' },
                '2': { steps: 25, cfg: 5.0, sampler: 'dpmpp_2s_ancestral', scheduler: 'karras' },
                '3': { steps: 30, cfg: 3.0, sampler: 'res_2s', scheduler: 'sgm_uniform' }
            };
            const p = presets[imgMode.value] || presets['2'];
            if (imgQuickgenSteps) imgQuickgenSteps.value = p.steps;
            if (imgQuickgenCfg) imgQuickgenCfg.value = p.cfg;
            if (imgQuickgenSampler) imgQuickgenSampler.value = p.sampler;
            if (imgQuickgenScheduler) imgQuickgenScheduler.value = p.scheduler;
            // Save presets to localStorage
            localStorage.setItem('img_quickgen_steps', p.steps);
            localStorage.setItem('img_quickgen_cfg', p.cfg);
            localStorage.setItem('img_quickgen_sampler', p.sampler);
            localStorage.setItem('img_quickgen_scheduler', p.scheduler);
        }
    }

    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = lightbox.querySelector('img');
    const lightboxClose = lightbox.querySelector('.lb-close');
    const lbPrev = lightbox.querySelector('.lb-prev');
    const lbNext = lightbox.querySelector('.lb-next');
    const lbCounter = lightbox.querySelector('.lb-counter');
    const lightboxUrls = []; // registry of all generated image URLs
    let lightboxIndex = -1;

    function updateLightboxNav() {
        const count = lightboxUrls.length;
        lbPrev.classList.toggle('hidden', lightboxIndex <= 0);
        lbNext.classList.toggle('hidden', lightboxIndex >= count - 1);
        if (count > 1) {
            lbCounter.textContent = `${lightboxIndex + 1} / ${count}`;
            lbCounter.style.display = '';
        } else {
            lbCounter.style.display = 'none';
        }
    }

    function openImageLightbox(url) {
        if (!lightboxUrls.includes(url)) lightboxUrls.push(url);
        lightboxIndex = lightboxUrls.indexOf(url);
        lightboxImg.src = url;
        lightbox.classList.add('show');
        updateLightboxNav();
    }
    function closeImageLightbox() {
        lightbox.classList.remove('show');
        lightboxImg.src = '';
        lightboxIndex = -1;
    }
    // Touch swipe support for mobile
    let lbTouchStartX = 0;
    lightbox.addEventListener('touchstart', (e) => { lbTouchStartX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - lbTouchStartX;
        if (Math.abs(dx) > 50) lightboxNavigate(dx > 0 ? -1 : 1);
    }, { passive: true });
    function lightboxNavigate(dir) {
        const newIdx = lightboxIndex + dir;
        if (newIdx < 0 || newIdx >= lightboxUrls.length) return;
        lightboxIndex = newIdx;
        lightboxImg.src = lightboxUrls[lightboxIndex];
        updateLightboxNav();
    }
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === lightboxClose) closeImageLightbox();
    });
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); lightboxNavigate(-1); });
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); lightboxNavigate(1); });
    actionMenuLogout.addEventListener('click', () => { localStorage.removeItem('token'); location.reload(); });

    async function showDashboard() {
        loginView.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        chatMessages.innerHTML = "";

        if (localStorage.getItem('cfg_temp')) { cfgTemp.value = localStorage.getItem('cfg_temp'); valTemp.innerText = cfgTemp.value; }
        if (localStorage.getItem('cfg_topp')) { cfgTopP.value = localStorage.getItem('cfg_topp'); valTopP.innerText = cfgTopP.value; }
        if (localStorage.getItem('cfg_tokens')) { cfgTokens.value = localStorage.getItem('cfg_tokens'); valTokens.innerText = cfgTokens.value; }
        if (localStorage.getItem('cfg_repeat')) { cfgRepeat.value = localStorage.getItem('cfg_repeat'); valRepeat.innerText = parseFloat(cfgRepeat.value).toFixed(2); }
        if (localStorage.getItem('cfg_topk')) { cfgTopK.value = localStorage.getItem('cfg_topk'); valTopK.innerText = cfgTopK.value; }
        if (localStorage.getItem('cfg_minp')) { cfgMinP.value = localStorage.getItem('cfg_minp'); valMinP.innerText = parseFloat(cfgMinP.value).toFixed(2); }

        const savedBudget = localStorage.getItem('cfg_reasoning');
        currentThinkingBudget = savedBudget || 'off';
        updateReasoningUI(savedBudget || 'off');
        const savedWeb = localStorage.getItem('cfg_web') === 'true';
        currentWebSearch = savedWeb;
        updateWebUI(savedWeb);
        const savedPersona = localStorage.getItem('cfg_persona') || 'wieszjak';
        currentPersona = savedPersona;
        updatePersonaUI(savedPersona);
        const savedImgReasoning = localStorage.getItem('cfg_img_reasoning') || '500';
        currentImageReasoning = savedImgReasoning;
        updateImageReasoningUI(savedImgReasoning);

        // Wczytaj zapisane Advanced params z localStorage
        if (localStorage.getItem('img_adv_steps')) imgAdvancedSteps.value = localStorage.getItem('img_adv_steps');
        if (localStorage.getItem('img_adv_mp')) imgAdvancedMP.value = localStorage.getItem('img_adv_mp');
        if (localStorage.getItem('img_adv_mu')) imgAdvancedMu.value = localStorage.getItem('img_adv_mu');
        if (localStorage.getItem('img_adv_std')) imgAdvancedStd.value = localStorage.getItem('img_adv_std');
        if (localStorage.getItem('img_adv_sampler')) imgAdvancedSampler.value = localStorage.getItem('img_adv_sampler');
        if (localStorage.getItem('img_adv_scheduler') && imgAdvancedScheduler) imgAdvancedScheduler.value = localStorage.getItem('img_adv_scheduler');

        // Wczytaj zapisane QUICK params z localStorage
        if (localStorage.getItem('img_quick_steps')) imgQuickSteps.value = localStorage.getItem('img_quick_steps');
        if (localStorage.getItem('img_quickadv_steps')) imgQuickadvSteps.value = localStorage.getItem('img_quickadv_steps');
        if (localStorage.getItem('img_quickadv_cfg')) imgQuickadvCfg.value = localStorage.getItem('img_quickadv_cfg');
        if (localStorage.getItem('img_quickadv_sampler')) imgQuickadvSampler.value = localStorage.getItem('img_quickadv_sampler');
        if (localStorage.getItem('img_quickadv_seed_mode')) {
            imgQuickadvSeedMode.value = localStorage.getItem('img_quickadv_seed_mode');
            imgQuickadvSeedValue.style.display = imgQuickadvSeedMode.value === 'fixed' ? 'block' : 'none';
        }
        if (localStorage.getItem('img_quickadv_seed_value')) imgQuickadvSeedValue.value = localStorage.getItem('img_quickadv_seed_value');
        if (localStorage.getItem('img_quickadv_scheduler')) imgQuickadvScheduler.value = localStorage.getItem('img_quickadv_scheduler');
        if (localStorage.getItem('img_quickadv_checkpoint')) imgQuickadvCheckpoint.value = localStorage.getItem('img_quickadv_checkpoint');
        if (localStorage.getItem('img_quick_sampler') && imgQuickSampler) imgQuickSampler.value = localStorage.getItem('img_quick_sampler');
        if (localStorage.getItem('img_quick_scheduler') && imgQuickScheduler) imgQuickScheduler.value = localStorage.getItem('img_quick_scheduler');

        // Wczytaj zapisane QUICK GEN params z localStorage
        if (imgQuickgenSteps && localStorage.getItem('img_quickgen_steps')) imgQuickgenSteps.value = localStorage.getItem('img_quickgen_steps');
        if (imgQuickgenCfg && localStorage.getItem('img_quickgen_cfg')) imgQuickgenCfg.value = localStorage.getItem('img_quickgen_cfg');
        if (imgQuickgenSampler && localStorage.getItem('img_quickgen_sampler')) imgQuickgenSampler.value = localStorage.getItem('img_quickgen_sampler');
        if (imgQuickgenScheduler && localStorage.getItem('img_quickgen_scheduler')) imgQuickgenScheduler.value = localStorage.getItem('img_quickgen_scheduler');
        if (imgQuickgenSeedMode && localStorage.getItem('img_quickgen_seed_mode')) {
            imgQuickgenSeedMode.value = localStorage.getItem('img_quickgen_seed_mode');
            if (imgQuickgenSeedValue) imgQuickgenSeedValue.style.display = imgQuickgenSeedMode.value === 'fixed' ? 'block' : 'none';
        }
        if (imgQuickgenSeedValue && localStorage.getItem('img_quickgen_seed_value')) imgQuickgenSeedValue.value = localStorage.getItem('img_quickgen_seed_value');
        if (imgQuickgenCheckpoint && localStorage.getItem('img_quickgen_checkpoint')) imgQuickgenCheckpoint.value = localStorage.getItem('img_quickgen_checkpoint');
        
        if (imgModelType.value === 'quickgen') {
            applyQuickgenPresets();
        }

        // Wczytaj zapisany model/aspect/mode/prompt z localStorage i ustaw widoczność paneli
        if (localStorage.getItem('img_model_type')) {
            imgModelType.value = localStorage.getItem('img_model_type');
            updateImgParamsVisibility(); // Dostosuj widoczność paneli do zapisanego modelu
        }
        if (localStorage.getItem('img_aspect')) imgAspect.value = localStorage.getItem('img_aspect');
        if (localStorage.getItem('img_mode')) imgMode.value = localStorage.getItem('img_mode');
        if (localStorage.getItem('img_prompt_reconstruct') !== null) {
            imgPromptReconstruct.checked = localStorage.getItem('img_prompt_reconstruct') === 'true';
        }
        if (localStorage.getItem('img_reconstruct_style')) {
            imgReconstructStyle.value = localStorage.getItem('img_reconstruct_style');
        }
        // Ustaw widoczność pola stylu po załadowaniu
        const styleWrapper = document.getElementById('img-reconstruct-style-wrapper');
        if (styleWrapper) styleWrapper.style.display = imgPromptReconstruct.checked ? 'block' : 'none';
        if (localStorage.getItem('img_prompt')) imgPrompt.value = localStorage.getItem('img_prompt');
        // Przywróć prompt z głównego paska dla trybu obrazu
        if (localStorage.getItem('prompt_input_image')) {
            promptInput.value = localStorage.getItem('prompt_input_image');
        }

        // Wczytaj stan niebieskiego trybu Auto-Image-Bot
        const savedAutoBot = localStorage.getItem('auto_image_bot');
        if (savedAutoBot === 'true' && !imageModeActive) {
            autoImageBotMode = true;
            updateImageBtnUI();
        }

        // Załaduj listę checkpointów dla QUICK modelu
        loadQuickCheckpoints();

        // Pierwsze twarde załadowanie pokoi rozmów z bazy danych
        await loadChatThreads();
    }

    // ===== FUNKCJA POKAZUJ/UKRYJ PANELE PARAMETRÓW W ZALEŻNOŚCI OD MODELU =====
    function updateImgParamsVisibility() {
        imgAdvancedParams.style.display = imgModelType.value === 'advanced' ? 'block' : 'none';
        imgQuickParams.style.display = imgModelType.value === 'quick' ? 'block' : 'none';
        imgQuickadvParams.style.display = imgModelType.value === 'quickadv' ? 'block' : 'none';
        if (imgQuickgenParams) imgQuickgenParams.style.display = imgModelType.value === 'quickgen' ? 'block' : 'none';
        if (imgSzybkoParams) imgSzybkoParams.style.display = imgModelType.value === 'szybko' ? 'block' : 'none';
        // Prompt Reconstruction widoczne dla Quick, Quick ADV, Quick GEN
        const imgReconstructWrapper = document.getElementById('img-prompt-reconstruct-wrapper');
        // Pole stylu widoczne tylko gdy reconstruct włączony
        const imgReconstructStyleWrapper = document.getElementById('img-reconstruct-style-wrapper');
        if (imgReconstructStyleWrapper) {
            imgReconstructStyleWrapper.style.display = (imgPromptReconstruct && imgPromptReconstruct.checked) ? 'block' : 'none';
        }
        if (imgReconstructWrapper) {
            const isQuickLike = imgModelType.value === 'quick' || imgModelType.value === 'quickadv' || imgModelType.value === 'quickgen';
            imgReconstructWrapper.style.display = isQuickLike ? 'block' : 'none';
        }
        // Tryb renderowania widoczny tylko dla Ideogram 4 i Quick GEN (pozostałe modele ignorują tę wartość)
        if (imgModeWrapper) {
            const showMode = imgModelType.value === 'ideogram' || imgModelType.value === 'quickgen';
            imgModeWrapper.style.display = showMode ? 'block' : 'none';
        }
    }
    // Nasłuchiwacz zmiany modelu — wywołaj updateImgParamsVisibility i zapisz do localStorage
    // (pierwszy event listener na imgModelType został już dodany w sekcji AUTO-SAVE)
    imgModelType.addEventListener('change', updateImgParamsVisibility);

    // ===== ŁADOWANIE LISTY CHECKPOINTÓW DLA QUICK MODELU =====
    async function loadQuickCheckpoints() {
        const fallbackCheckpoints = [
            'unnamedixlRealisticModel_v5.safetensors',
            'RealVisXL_V5.0_fp16.safetensors',
            'aMixIllustrious_aMix.safetensors',
            'fabricatedXL_v50.safetensors',
            'intorealismIL_v20Ultra.safetensors',
            'perfectdeliberate_v8.safetensors',
            'realismByStableYogi_ponyV65.safetensors',
            'realismIllustriousBy_v55FP16.safetensors',
            'riMixPONYIllustrious_riMix.safetensors',
            'ultrarealFineTune_v4.safetensors'
        ];

        function populate(sel, list, storageKey) {
            const defaultModel = 'unnamedixlRealisticModel_v5.safetensors';
            sel.innerHTML = `<option value="${defaultModel}">— Domyślny —</option>`;
            list.forEach(cp => {
                if (cp === defaultModel) return; // Pomiń, bo już jest jako domyślny
                const opt = document.createElement('option');
                opt.value = cp;
                opt.textContent = cp.replace('.safetensors', '');
                sel.appendChild(opt);
            });
            const saved = localStorage.getItem(storageKey) || defaultModel;
            console.log(`[CHECKPOINTS] Populating ${sel.id}: saved value from localStorage is "${saved}"`);
            if (saved && sel.querySelector(`option[value="${saved}"]`)) {
                sel.value = saved;
            } else {
                console.warn(`[CHECKPOINTS] Saved value "${saved}" for ${sel.id} not found in list, fallback to default.`);
                sel.value = defaultModel;
            }
        }

        try {
            const response = await apiCall('/api/image/checkpoints', { method: 'GET' });
            const data = await response.json();
            const list = (data.success && data.checkpoints && data.checkpoints.length > 0) ? data.checkpoints : fallbackCheckpoints;
            
            populate(imgQuickCheckpoint, list, 'img_quick_checkpoint');
            populate(imgQuickadvCheckpoint, list, 'img_quickadv_checkpoint');
            populate(imgQuickgenCheckpoint, list, 'img_quickgen_checkpoint');
        } catch (e) {
            console.error('[CHECKPOINTS] Failed to load:', e);
            populate(imgQuickCheckpoint, fallbackCheckpoints, 'img_quick_checkpoint');
            populate(imgQuickadvCheckpoint, fallbackCheckpoints, 'img_quickadv_checkpoint');
            populate(imgQuickgenCheckpoint, fallbackCheckpoints, 'img_quickgen_checkpoint');
        }
    }

    // ========================================================
    // ADMIN PANEL FUNCTIONS
    // ========================================================
    const adminModal = document.getElementById('admin-modal');
    const adminModalClose = document.getElementById('admin-modal-close');
    const actionAdminPanel = document.getElementById('action-admin-panel');
    const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');
    
    // Check jeśli user jest adminem - pokaż przycisk
    function checkAdminStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                if (decoded.isAdmin || decoded.is_admin) {
                    actionAdminPanel.style.display = 'flex';
                    return true;
                }
            } catch(e) { console.warn('[ADMIN CHECK ERROR]', e); }
        }
        return false;
    }
    
    // Otwórz/zamknij admin panel
    actionAdminPanel.addEventListener('click', async () => {
        adminModal.classList.add('show');
        await loadAdminUsers();
        await loadAdminLogs();
    });
    
    adminModalClose.addEventListener('click', () => {
        adminModal.classList.remove('show');
    });
    
    // Tab switching
    adminTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            adminTabBtns.forEach(b => b.classList.remove('active'));
            adminTabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });
    
    // Załaduj listę użytkowników
    async function loadAdminUsers() {
        try {
            const response = await apiCall('/api/admin/users', { method: 'GET' });
            const data = await response.json();
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';
            
            if (data.users && data.users.length > 0) {
                data.users.forEach(user => {
                    const row = document.createElement('tr');
                    
                    // Nazwa użytkownika (textContent — bezpieczne przed XSS)
                    const tdUsername = document.createElement('td');
                    tdUsername.textContent = user.username;
                    
                    // Rola
                    const tdRole = document.createElement('td');
                    const roleSpan = document.createElement('span');
                    roleSpan.style.color = user.is_admin ? '#10b981' : '#6b7280';
                    roleSpan.textContent = user.is_admin ? '👑 Admin' : 'Użytkownik';
                    tdRole.appendChild(roleSpan);
                    
                    // Ostatnia aktywność
                    const tdActive = document.createElement('td');
                    tdActive.textContent = user.last_active || 'Nigdy';
                    
                    // Akcje (przyciski z event listenerami zamiast onclick)
                    const tdActions = document.createElement('td');
                    
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'user-action-btn';
                    toggleBtn.textContent = user.is_admin ? 'Odbierz admin' : 'Daj admin';
                    toggleBtn.addEventListener('click', () => toggleAdminRole(user.id, user.is_admin));
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'user-action-btn danger';
                    deleteBtn.textContent = 'Usuń';
                    deleteBtn.addEventListener('click', () => deleteAdminUser(user.id));
                    
                    tdActions.appendChild(toggleBtn);
                    tdActions.appendChild(deleteBtn);
                    
                    row.appendChild(tdUsername);
                    row.appendChild(tdRole);
                    row.appendChild(tdActive);
                    row.appendChild(tdActions);
                    tbody.appendChild(row);
                });
            }
        } catch (e) {
            console.error('Failed to load users:', e);
        }
    }
    
    // Załaduj logi rozmów
    async function loadAdminLogs() {
        try {
            const response = await apiCall('/api/admin/users-logs', { method: 'GET' });
            const data = await response.json();
            const container = document.getElementById('logs-container');
            container.innerHTML = '';
            
            if (data.folders) {
                Object.keys(data.folders).forEach(user => {
                    const userDiv = document.createElement('div');
                    userDiv.style.cssText = 'background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;';
                    
                    // Tylko licznik jest bezpieczny do formatowania HTML, username idzie przez textContent
                    const strongUser = document.createElement('strong');
                    strongUser.textContent = user;
                    userDiv.appendChild(strongUser);
                    userDiv.appendChild(document.createTextNode(` (${data.folders[user].length} wiadomości)`));
                    
                    userDiv.addEventListener('click', function showLogs() {
                        // Zabezpieczenie przed duplikowaniem: usuń stary log viewer, jeśli istnieje
                        const existingLog = userDiv.querySelector('.log-viewer');
                        if (existingLog) {
                            existingLog.remove();
                            userDiv.style.cursor = 'pointer';
                            return;
                        }
                        
                        const logDiv = document.createElement('div');
                        logDiv.className = 'log-viewer';
                        
                        // Każda wiadomość dodawana przez textContent — zero ryzyka XSS
                        const logLines = data.folders[user].map(log => {
                            const line = document.createElement('div');
                            line.style.marginBottom = '4px';
                            
                            const senderStrong = document.createElement('strong');
                            senderStrong.textContent = `[${log.sender.toUpperCase()}]: `;
                            line.appendChild(senderStrong);
                            
                            const msgText = document.createTextNode(log.message);
                            line.appendChild(msgText);
                            
                            return line;
                        });
                        
                        logLines.forEach(line => logDiv.appendChild(line));
                        userDiv.appendChild(logDiv);
                        userDiv.style.cursor = 'default';
                    });
                    container.appendChild(userDiv);
                });
            }
        } catch (e) {
            console.error('Failed to load logs:', e);
        }
    }
    
    // Dodaj nowego użytkownika
    const addUserBtn = document.getElementById('admin-add-user-btn');
    addUserBtn.addEventListener('click', async () => {
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value.trim();
        const role = document.getElementById('new-role').value;
        
        if (!username || !password) {
            alert('Uzupełnij wszystkie pola!');
            return;
        }
        
        try {
            const response = await apiCall('/api/admin/create-user', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    password,
                    is_admin: role === 'admin'
                })
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Użytkownik dodany pomyślnie!');
                document.getElementById('new-username').value = '';
                document.getElementById('new-password').value = '';
                await loadAdminUsers();
            } else {
                alert('Błąd: ' + (data.error || 'Nie udało się dodać użytkownika'));
            }
        } catch (e) {
            alert('Błąd: ' + e.message);
        }
    });
    
    // Funkcje zarządzania użytkownikami (wywoływane przez event listenery, nie onclick)
    async function toggleAdminRole(userId, isCurrentlyAdmin) {
        try {
            const response = await apiCall(`/api/admin/toggle-admin/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ is_admin: !isCurrentlyAdmin })
            });
            const data = await response.json();
            if (data.success) {
                await loadAdminUsers();
            } else {
                alert('Błąd: ' + (data.error || 'Operacja nie powiodła się'));
            }
        } catch (e) {
            alert('Błąd: ' + e.message);
        }
    }
    
    async function deleteAdminUser(userId) {
        if (!confirm('Jesteś pewny? Tej operacji nie można cofnąć!')) return;
        
        try {
            const response = await apiCall(`/api/admin/delete-user/${userId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                alert('Użytkownik usunięty!');
                await loadAdminUsers();
            } else {
                alert('Błąd: ' + (data.error || 'Nie udało się usunąć użytkownika'));
            }
        } catch (e) {
            alert('Błąd: ' + e.message);
        }
    }
    
    // ========================================================
    // GALLERY FUNCTIONS
    // ========================================================
    const galleryModal = document.getElementById('gallery-modal');
    const galleryModalClose = document.getElementById('gallery-modal-close');
    const galleryContainer = document.getElementById('gallery-container');
    const galleryCount = document.getElementById('gallery-count');
    const galleryDeleteAll = document.getElementById('gallery-delete-all');
    const actionGallery = document.getElementById('action-gallery');
    
    // Admin delete all images
    const adminDeleteAllImages = document.getElementById('admin-delete-all-images');
    
    // Open gallery
    actionGallery.addEventListener('click', () => {
        menuDropdown.classList.remove('show');
        menuBtn.classList.remove('open');
        galleryModal.classList.add('show');
        loadGallery();
    });
    
    // Close gallery
    galleryModalClose.addEventListener('click', () => {
        galleryModal.classList.remove('show');
    });
    galleryModal.addEventListener('click', (e) => {
        if (e.target === galleryModal) galleryModal.classList.remove('show');
    });
    
    // Load gallery images
    async function loadGallery() {
        galleryContainer.innerHTML = '<div class="gallery-loading">⏳ Ładowanie galerii...</div>';
        
        try {
            const response = await apiCall('/api/images/gallery', { method: 'GET' });
            const data = await response.json();
            
            if (!data.success || !data.images || data.images.length === 0) {
                galleryContainer.innerHTML = '<div class="gallery-empty">📭 Nie masz jeszcze żadnych wygenerowanych obrazów.</div>';
                galleryCount.textContent = '0 obrazów';
                return;
            }
            
            galleryCount.textContent = `${data.images.length} obrazów`;
            galleryContainer.innerHTML = '';
            galleryContainer.className = 'gallery-grid';
            
            data.images.forEach(itemData => {
                const url = itemData.url || itemData;
                const prompt = itemData.prompt || '';
                
                const item = document.createElement('div');
                item.className = 'gallery-item';
                
                const img = document.createElement('img');
                img.src = url;
                img.loading = 'lazy';
                img.alt = prompt ? `Prompt: ${prompt}` : 'Wygenerowany obraz';
                
                // Tooltip z promptem
                if (prompt) {
                    img.title = prompt;
                }
                
                img.addEventListener('click', () => openImageLightbox(url));
                
                item.appendChild(img);
                
                // Przycisk kopiowania promptu (📋) — pokazuje się na hover
                if (prompt) {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'gallery-copy-btn';
                    copyBtn.textContent = '📋';
                    copyBtn.title = 'Kopiuj prompt';
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(prompt).then(() => {
                            copyBtn.textContent = '✅';
                            setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
                        }).catch(() => {
                            // Fallback dla starszych przeglądarek
                            const ta = document.createElement('textarea');
                            ta.value = prompt;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                            copyBtn.textContent = '✅';
                            setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
                        });
                    });
                    item.appendChild(copyBtn);
                }
                
                // Podpis z promptem pod miniaturką
                if (prompt) {
                    const caption = document.createElement('div');
                    caption.className = 'gallery-caption';
                    caption.textContent = prompt;
                    item.appendChild(caption);
                }
                
                galleryContainer.appendChild(item);
            });
            
            // Dodaj jeden globalny event listener dla tooltipów (hover)
            if (!document.querySelector('#gallery-caption-style')) {
                const style = document.createElement('style');
                style.id = 'gallery-caption-style';
                style.textContent = `
                    .gallery-item {
                        position: relative;
                    }
                    .gallery-copy-btn {
                        position: absolute;
                        top: 6px;
                        right: 6px;
                        width: 30px;
                        height: 30px;
                        border-radius: 6px;
                        background: rgba(0,0,0,0.6);
                        border: 1px solid rgba(255,255,255,0.15);
                        color: #fff;
                        font-size: 14px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0;
                        opacity: 0;
                        transition: opacity 0.2s ease, background 0.2s ease;
                        z-index: 2;
                    }
                    .gallery-item:hover .gallery-copy-btn {
                        opacity: 1;
                    }
                    .gallery-copy-btn:hover {
                        background: rgba(0,0,0,0.85);
                        border-color: var(--accent-color);
                    }
                    .gallery-caption {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 20px 8px 6px 8px;
                        background: linear-gradient(transparent, rgba(0,0,0,0.8));
                        color: #fff;
                        font-size: 10px;
                        line-height: 1.3;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        opacity: 0;
                        transition: opacity 0.25s ease;
                        pointer-events: none;
                    }
                    .gallery-item:hover .gallery-caption {
                        opacity: 1;
                    }
                    body.light-theme .gallery-copy-btn {
                        background: rgba(255,255,255,0.8);
                        border-color: rgba(0,0,0,0.15);
                        color: #1f2937;
                    }
                    body.light-theme .gallery-copy-btn:hover {
                        background: rgba(255,255,255,1);
                        border-color: var(--accent-color);
                    }
                    body.light-theme .gallery-caption {
                        background: linear-gradient(transparent, rgba(255,255,255,0.9));
                        color: #1f2937;
                    }
                `;
                document.head.appendChild(style);
            }
        } catch (e) {
            galleryContainer.innerHTML = '<div class="gallery-empty" style="color: #ef4444;">❌ Błąd ładowania galerii.</div>';
            console.error('[GALLERY ERROR]:', e);
        }
    }
    
    // Delete all user images
    galleryDeleteAll.addEventListener('click', async () => {
        if (!confirm('Czy na pewno chcesz usunąć WSZYSTKIE swoje wygenerowane obrazy? Tej operacji nie można cofnąć!')) return;
        
        try {
            galleryDeleteAll.textContent = '⏳ Usuwanie...';
            galleryDeleteAll.disabled = true;
            
            const response = await apiCall('/api/images/delete-all', { method: 'DELETE' });
            const data = await response.json();
            
            if (data.success) {
                alert(`Usunięto ${data.deleted} obraz(ów).`);
                await loadGallery();
            } else {
                alert('Błąd: ' + (data.error || 'Nie udało się usunąć obrazów'));
            }
        } catch (e) {
            alert('Błąd: ' + e.message);
        } finally {
            galleryDeleteAll.textContent = '🗑️ Usuń wszystkie swoje obrazy';
            galleryDeleteAll.disabled = false;
        }
    });
    
    // Admin delete ALL images
    if (adminDeleteAllImages) {
        adminDeleteAllImages.addEventListener('click', async () => {
            if (!confirm('⚠️ USUwasz WSZYSTKIE obrazy wszystkich użytkowników! Tej operacji nie można cofnąć! Czy na pewno?')) return;
            if (!confirm('NAPRAWDĘ? To usunie wszystkie wygenerowane obrazy i ich historię w czatach!')) return;
            
            try {
                adminDeleteAllImages.textContent = '⏳ Usuwanie...';
                adminDeleteAllImages.disabled = true;
                
                const response = await apiCall('/api/admin/images/delete-all', { method: 'DELETE' });
                const data = await response.json();
                
                if (data.success) {
                    alert(`✅ Usunięto ${data.deleted} plików obrazów oraz historię w czatach.`);
                } else {
                    alert('Błąd: ' + (data.error || 'Nie udało się usunąć obrazów'));
                }
            } catch (e) {
                alert('Błąd: ' + e.message);
            } finally {
                adminDeleteAllImages.textContent = '🗑️ Usuń wszystkie obrazy (wszyscy użytkownicy)';
                adminDeleteAllImages.disabled = false;
            }
        });
    }
    
    // ===== REGENERATE LAST BOT RESPONSE =====
    function recreateMessageActions(msgDiv, msgId, isLastBot, className) {
        // Usuń stare actions
        const oldActions = msgDiv.querySelector('.message-actions');
        if (oldActions) oldActions.remove();
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // 1. Przycisk regeneracji (tylko ostatnia bot wiadomość)
        if (isLastBot && className === 'bot-message') {
            const regenBtn = document.createElement('button');
            regenBtn.className = 'msg-action-btn msg-regen-btn';
            regenBtn.textContent = '🔄';
            regenBtn.title = 'Regeneruj odpowiedź';
            regenBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (isGenerating) return;
                await regenerateLastResponse(msgDiv);
            });
            actionsDiv.appendChild(regenBtn);
        }

        // 2. Przycisk usuwania
        const delBtn = document.createElement('button');
        delBtn.className = 'msg-action-btn msg-delete-btn';
        delBtn.textContent = '🗑️';
        delBtn.title = 'Usuń tę wiadomość';
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!msgId) return;
            if (!confirm('Usunąć tę wiadomość na stałe?')) return;
            try {
                const response = await apiCall(`/api/chat/messages/${msgId}`, { method: 'DELETE' });
                const data = await response.json();
                if (data.success) {
                    msgDiv.remove();
                } else {
                    alert('Błąd: ' + (data.error || 'Nie udało się usunąć'));
                }
            } catch (e) {
                alert('Błąd: ' + e.message);
            }
        });
        actionsDiv.appendChild(delBtn);

        // 3. Przycisk info (dla bot-message)
        if (className === 'bot-message') {
            const infoBtn = document.createElement('button');
            infoBtn.className = 'msg-action-btn msg-info-btn';
            infoBtn.textContent = 'info';
            infoBtn.title = 'Pokaż szczegóły odpowiedzi';
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof msgDiv._toggleMetadata === 'function') {
                    msgDiv._toggleMetadata();
                }
            });
            actionsDiv.appendChild(infoBtn);
        }
        
        msgDiv.appendChild(actionsDiv);
    }

    // ===== REGENERATE LAST BOT RESPONSE =====
    async function regenerateLastResponse(botMsgDiv) {
        if (!currentThreadId) return;
        isGenerating = true;
        
        // Wyczyść zawartość bota i dodaj wskaźnik ładowania
        botMsgDiv.innerHTML = '<div class="regen-loading">♻️ Regenerowanie...</div>';
        
        try {
            const response = await apiCall('/api/chat/regenerate', {
                method: 'POST',
                body: JSON.stringify({
                    thread_id: currentThreadId,
                    web_search: currentWebSearch,
                    temperature: cfgTemp.value,
                    top_p: cfgTopP.value,
                    max_tokens: cfgTokens.value,
                    repeat_penalty: cfgRepeat.value,
                    top_k: parseInt(cfgTopK.value),
                    min_p: cfgMinP.value,
                    reasoning_budget: currentThinkingBudget === 'unlimited' ? 999999 : (currentThinkingBudget === 'off' ? 0 : parseInt(currentThinkingBudget)),
                    system_prompt: currentPersona === 'none' ? '' : SYSTEM_PROMPTS[currentPersona]
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let globalThinkContainer = null;
            let currentThinkStep = null;
            let thinkStepCount = 0;
            let replyContent = null;
            let rawReplyText = '';
            let botMetadata = null;
            let regeneratedMessageId = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            
                            if (parsed.regenerated_message_id) {
                                regeneratedMessageId = parsed.regenerated_message_id;
                                continue;
                            }
                            
                            if (parsed.is_metadata) {
                                botMetadata = parsed;
                                continue;
                            }
                            
                            if (parsed.error) {
                                botMsgDiv.innerHTML = `<div style="color:#ef4444; padding: 12px;">❌ ${parsed.error}</div>`;
                                break;
                            }

                            let token = parsed.token;
                            if (token) {
                                const isThinking = parsed.is_thinking;

                                if (isThinking) {
                                    if (token.includes('</think>')) {
                                        if (currentThinkStep) currentThinkStep = completeThinkBlock(currentThinkStep);
                                        if (globalThinkContainer) {
                                            const s = globalThinkContainer.querySelector('summary');
                                            if (s) s.innerHTML = '🧠 Proces myślowy zakończony ✔️';
                                        }
                                        currentThinkStep = null;
                                        continue;
                                    }

                                    if (!globalThinkContainer) {
                                        globalThinkContainer = document.createElement('details');
                                        globalThinkContainer.className = 'think-container think-global';
                                        globalThinkContainer.open = true;
                                        globalThinkContainer.innerHTML = '<summary>🧠 Myślę... <span class="thinking-spinner">⏳</span></summary><div class="think-steps-container"></div>';
                                        botMsgDiv.appendChild(globalThinkContainer);
                                    }

                                    if (!currentThinkStep) {
                                        thinkStepCount++;
                                        currentThinkStep = document.createElement('details');
                                        currentThinkStep.className = 'think-step';
                                        currentThinkStep.open = true;
                                        currentThinkStep.innerHTML = `<summary>🧠 Krok ${thinkStepCount} <span class="thinking-spinner">⏳</span></summary><div class="think-content"></div>`;
                                        const stepsContainer = globalThinkContainer.querySelector('.think-steps-container');
                                        if (stepsContainer) stepsContainer.appendChild(currentThinkStep);
                                    }

                                    const stepContent = currentThinkStep.querySelector('.think-content');
                                    if (stepContent && !token.includes('[AGENT:')) stepContent.innerText += token;

                                } else {
                                    if (currentThinkStep) currentThinkStep = completeThinkBlock(currentThinkStep);
                                    if (globalThinkContainer) {
                                        const s = globalThinkContainer.querySelector('summary');
                                        if (s) s.innerHTML = '🧠 Proces myślowy zakończony ✔️';
                                        globalThinkContainer.open = false;
                                    }

                                    if (!replyContent) {
                                        // Usuń "Regenerowanie..." placeholder
                                        const loadingEl = botMsgDiv.querySelector('.regen-loading');
                                        if (loadingEl) loadingEl.remove();
                                        
                                        replyContent = document.createElement('div');
                                        replyContent.className = 'reply-content';
                                        botMsgDiv.appendChild(replyContent);
                                    }
                                    rawReplyText += token;
                                    if (rawReplyText.trim() !== "") {
                                        setContentSafely(replyContent, rawReplyText.trim());
                                    }
                                }
                                scrollToBottomIfNear();
                            }
                        } catch (e) { console.warn('[STREAM 3 PARSE ERROR]', e); }
                    }
                }
            }

            // Jesli nie bylo content (tylko reasoning) - usun loading
            if (!replyContent) {
                const loadingEl = botMsgDiv.querySelector('.regen-loading');
                if (loadingEl) loadingEl.remove();
            }

            // Zapisz nowe ID wiadomości
            if (regeneratedMessageId) {
                botMsgDiv.dataset.msgId = regeneratedMessageId;
            }
            
            // Odtwórz przyciski akcji po regeneracji
            const newMsgId = regeneratedMessageId || botMsgDiv.dataset.msgId;
            recreateMessageActions(botMsgDiv, newMsgId, true, 'bot-message');
            
            // Dodaj metadata tooltip
            if (botMetadata) {
                createMetadataTooltip(botMsgDiv, botMetadata);
            }

            // Generuj tytul
            const lastUserMsgEl = botMsgDiv.parentElement ? botMsgDiv.parentElement.querySelector('.user-message:last-of-type') : null;
            if (lastUserMsgEl) {
                generateAutoTitle(currentThreadId, lastUserMsgEl.innerText, rawReplyText, {
                    apiCall,
                    titleElement: activeChatTitle,
                    onTitleGenerated: (title) => updateThreadTitleInSidebar(title)
                });
            }
            
        } catch (err) {
            botMsgDiv.innerHTML = `<div style="color:#ef4444; padding: 12px;">❌ Błąd regeneracji: ${err.message}</div>`;
        } finally {
            isGenerating = false;
        }
    }

    // Sprawdź czy admin przy starcie
    checkAdminStatus();

function appendMessage(text, className, metadata, msgId, isLastBot) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', className);
        if (msgId) msgDiv.dataset.msgId = msgId;
        if (isLastBot) msgDiv.dataset.isLastBot = 'true';

        // ===== PRZYCISKI AKCJI (wspólny helper) =====
        recreateMessageActions(msgDiv, msgId, isLastBot, className);

        if (className === 'user-message') {
            msgDiv.innerText = text;
        } else {
            if (text && text.trim() !== "") {
                let remainingText = text;
                const thinkBlocks = [];
                
                // Krok 1: Wycinanie wszystkich normalnie zamkniętych bloków
                remainingText = remainingText.replace(/<think>([\s\S]*?)<\/think>/gi, (match, content) => {
                    if (content.trim()) thinkBlocks.push(content.trim());
                    return ''; // Usuń z głównego tekstu
                });

                // Krok 2: Sprawdzenie, czy jest jakiś otwarty, ale niedomknięty tag na końcu tekstu
                if (remainingText.includes('<think>')) {
                    const splitText = remainingText.split('<think>');
                    remainingText = splitText[0]; 
                    const leftoverContent = splitText[1].trim();
                    if (leftoverContent) thinkBlocks.push(leftoverContent);
                }

            // Generowanie globalnego kontenera z krokami (nowy format zagnieżdżony)
            if (thinkBlocks.length > 0) {
                const archiveThinkContainer = document.createElement('details');
                archiveThinkContainer.className = 'think-container think-global';
                archiveThinkContainer.innerHTML = '<summary>🧠 Proces myślowy <span style="color:#10b981;">✔️</span></summary><div class="think-steps-container"></div>';
                
                const stepsContainer = archiveThinkContainer.querySelector('.think-steps-container');
                thinkBlocks.forEach((content, idx) => {
                    const step = document.createElement('details');
                    step.className = 'think-step';
                    step.innerHTML = `<summary>🧠 Krok ${idx + 1} <span style="color:#10b981;">✔️</span></summary><div class="think-content"></div>`;
                    const stepContent = step.querySelector('.think-content');
                    stepContent.innerText = content;
                    stepsContainer.appendChild(step);
                });
                
                msgDiv.appendChild(archiveThinkContainer);
            }
                
                // Poprawione usuwanie narzędzi - teraz nie czyści wszystkiego agresywnie, 
                // tylko czyści tylko tagi narzędzi, żeby nie było śmieci w tekście
                remainingText = remainingText.replace(/<search>[\s\S]*?<\/search>/gi, '')
                                            .replace(/<read_url>[\s\S]*?<\/read_url>/gi, '')
                                            .replace(/<write_file>[\s\S]*?<\/write_file>/gi, '')
                                            .replace(/\[AGENT:[^\]]+\]/gi, '') 
                                            .trim();

                if (remainingText) {
                    const replyContent = document.createElement('div');
                    replyContent.className = 'reply-content';
                    setContentSafely(replyContent, remainingText);
                    
                    // 🔧 NAPRAWA OBRAZKÓW: Automatycznie dodajemy klasę i Lightbox dla obrazków z bazy (po refreshu)
                    const images = replyContent.querySelectorAll('img');
                    images.forEach(img => {
                        img.classList.add('img-thumbnail'); // Nadaje styl CSS ograniczający gigantyczne wymiary
                        
                        // Opcjonalnie upewniamy się, że obrazek ma kursor kliknięcia
                        img.style.cursor = 'pointer';
                        
                        // Podpinamy powiększenie (galerię) do zaciągniętych obrazków
                        img.addEventListener('click', () => openImageLightbox(img.getAttribute('src')));
                    });
                    
                    msgDiv.appendChild(replyContent);
                }
            }
            
            // ===== TOOLTIP Z METADANYMI (dla historycznych odpowiedzi z bazy) =====
            if (metadata) {
                createMetadataTooltip(msgDiv, metadata);
            }
        }
        chatMessages.appendChild(msgDiv);
        scrollToBottomIfNear();
        return msgDiv;
    }
    // Obsługa kliknięcia generowania obrazu
// TO MUSI BYĆ JEDYNE imgGenerateBtn.addEventListener W CAŁYM KODZIE!
imgGenerateBtn.addEventListener('click', async () => {
    const promptText = imgPrompt.value.trim();
    if (!promptText) return alert("Wpisz najpierw, co chcesz wygenerować!");
    if (!currentThreadId) return alert("Błąd: Brak aktywnego pokoju rozmowy.");
    if (window.innerWidth <= 768) closeSidebar(); 

    // Blokujemy przycisk na start
    imgGenerateBtn.disabled = true;
    imgGenerateBtn.innerText = "Trwa łączenie z chmurą... ⏳";
    
    await generateImageFromMode(promptText);
    
    // Zachowaj prompt w localStorage, nie czyść
    imgGenerateBtn.disabled = false;
    imgGenerateBtn.innerText = "Generuj Obraz przez GPU";
});

// Dynamiczne pokazywanie/ukrywanie opcji zależnie od modelu
const imgAspectWrapper = document.getElementById('img-aspect-wrapper');

if (imgModelType) {
    imgModelType.addEventListener('change', () => {
        if (imgModelType.value === 'quick') {
            imgAspectWrapper.style.display = 'none';
            imgModeWrapper.style.display = 'none';
            imgAdvancedParams.style.display = 'none';
            imgQuickParams.style.display = 'block';
            imgQuickadvParams.style.display = 'none';
        } else if (imgModelType.value === 'quickadv') {
            imgAspectWrapper.style.display = 'none';
            imgModeWrapper.style.display = 'none';
            imgAdvancedParams.style.display = 'none';
            imgQuickParams.style.display = 'none';
            imgQuickadvParams.style.display = 'block';
        } else if (imgModelType.value === 'advanced') {
            imgAspectWrapper.style.display = 'block';
            imgModeWrapper.style.display = 'none';
            imgAdvancedParams.style.display = 'block';
            imgQuickParams.style.display = 'none';
            imgQuickadvParams.style.display = 'none';
        } else {
            imgAspectWrapper.style.display = 'block';
            imgModeWrapper.style.display = 'block';
            imgAdvancedParams.style.display = 'none';
            imgQuickParams.style.display = 'none';
            imgQuickadvParams.style.display = 'none';
        }
    });
    // Inicjalizacja stanu przy starcie
    if (imgModelType.value === 'advanced') {
        imgAdvancedParams.style.display = 'block';
        imgModeWrapper.style.display = 'none';
    }
}
});

// ===== SZYBKO PRESET — izolowany inicjalizator (działa nawet jeśli inny kod wybuchnie) =====
document.addEventListener('DOMContentLoaded', function() {
    var sp = document.getElementById('img-szybko-preset');
    var scp = document.getElementById('img-szybko-custom-params');
    var ss = document.getElementById('img-szybko-sampler');
    var ssch = document.getElementById('img-szybko-scheduler');
    var sst = document.getElementById('img-szybko-steps');
    var smp = document.getElementById('img-szybko-megapixels');
    var ssh = document.getElementById('img-szybko-shift');
    if (!sp || !scp) return;
    function applySzybkoPreset() {
        var preset = sp.value || 'default';
        var isCustom = preset === 'custom';
        scp.style.display = isCustom ? 'block' : 'none';
        var presets = {
            'turbo': { sampler: 'lcm', scheduler: 'simple', steps: 6, megapixels: 0.5, shift: 9 },
            'default': { sampler: 'euler', scheduler: 'simple', steps: 12, megapixels: 1.3, shift: 9 },
            'quality': { sampler: 'res_2s', scheduler: 'simple', steps: 24, megapixels: 1.5, shift: 9 }
        };
        if (!isCustom && presets[preset]) {
            var p = presets[preset];
            if (ss) { ss.value = p.sampler; try { ss.dispatchEvent(new Event('change')); } catch(e) {} }
            if (ssch) { ssch.value = p.scheduler; try { ssch.dispatchEvent(new Event('change')); } catch(e) {} }
            if (sst) sst.value = p.steps;
            if (smp) smp.value = p.megapixels;
            if (ssh) ssh.value = p.shift;
        }
    }
    sp.addEventListener('change', function() {
        applySzybkoPreset();
        try { localStorage.setItem('img_szybko_preset', sp.value); } catch(e) {}
    });
    try {
        var saved = localStorage.getItem('img_szybko_preset');
        if (saved) sp.value = saved;
    } catch(e) {}
    applySzybkoPreset();
});
