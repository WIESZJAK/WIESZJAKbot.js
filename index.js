require('dotenv').config();

const express = require('express');
const app = express();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
app.set('trust proxy', 'loopback, linklocal');
// Debug middleware — wyłączony dla czystości logów
// app.use((req, res, next) => {
//   console.log(`[DEBUG_RUCHU] Metoda: ${req.method} | Ścieżka: ${req.path} | IP: ${req.ip}`);
//   console.log(`[DEBUG_HEADERS] Auth: ${req.headers['authorization'] ? 'JEST_TOKEN' : 'BRAK_TOKENU'}`);
//   next();
// });
// ===== WALIDACJA ZMIENNYCH ŚRODOWISKOWYCH PRZY STARCIE =====
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'LLAMA_SERVER_URL'
];
const OPTIONAL_ENV_VARS = [
  { name: 'BRAVE_API_KEY', desc: 'Wyszukiwanie internetowe (web search) nie będzie działać' },
  { name: 'CORS_ORIGIN', desc: 'Domyślnie otwarte na wszystkie pochodzenia (tylko dev)' },
  { name: 'HOME_GPU_URL', desc: 'Generowanie obrazów przez domową maszynę będzie wyłączone' }
];

const missingRequired = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
if (missingRequired.length > 0) {
  console.error('=======================================================');
  console.error('  FATAL: Brakujące wymagane zmienne środowiskowe:');
  missingRequired.forEach(key => console.error(`  - ${key}`));
  console.error('=======================================================');
  console.error('  Utwórz plik .env w katalogu głównym projektu lub');
  console.error('  ustaw zmienne w systemie. Przykład:');
  console.error('  DATABASE_URL=postgresql://user:pass@localhost:5432/db');
  console.error('  JWT_SECRET=twoj-tajny-klucz-o-minimum-32-znakach');
  console.error('  LLAMA_SERVER_URL=http://localhost:8080');
  console.error('=======================================================');
  process.exit(1);
}

// Dodatkowa walidacja: JWT_SECRET powinien mieć min. 32 znaki
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('=======================================================');
  console.error('  FATAL: JWT_SECRET jest za krótki (' + process.env.JWT_SECRET.length + ' znaków).');
  console.error('  Wymagane minimum: 32 znaki. Wygeneruj bezpieczny klucz:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('=======================================================');
  process.exit(1);
}

OPTIONAL_ENV_VARS.forEach(v => {
  if (!process.env[v.name]) {
    console.warn(`[OSTRZEŻENIE] Brak zmiennej ${v.name} — ${v.desc}`);
  }
});



// Utwórz katalog public/outputs przy starcie (dla wygenerowanych obrazów)
fs.mkdir(path.join(__dirname, 'public', 'outputs'), { recursive: true }).catch(() => {});

// ===== KONFIGURACJA CORS (Kontrola dostępu między domenami) =====
// W produkcji ustaw zmienną CORS_ORIGIN w .env
// Przykład:  CORS_ORIGIN=https://wieszjak.net,https://www.wieszjak.net
// Dla wielu domen oddziel je przecinkiem (bez spacji)
const NODE_ENV = process.env.NODE_ENV || 'development';
let corsOrigins = process.env.CORS_ORIGIN;
let corsOriginConfig;

if (corsOrigins) {
  const origins = corsOrigins.split(',').map(s => s.trim()).filter(Boolean);
  if (origins.length === 1) {
    corsOriginConfig = origins[0];
  } else {
    corsOriginConfig = origins;
  }
  console.log(`[CORS] Ograniczono do: ${origins.join(', ')}`);
} else if (NODE_ENV === 'production') {
  console.error('=======================================================');
  console.error('  FATAL: NODE_ENV=production ale brak CORS_ORIGIN!');
  console.error('  Ustaw zmienną CORS_ORIGIN w .env np.:');
  console.error('  CORS_ORIGIN=https://twojadomena.pl');
  console.error('=======================================================');
  process.exit(1);
} else {
  corsOriginConfig = '*';
  console.warn('[CORS] ⚠️  Ustawione na "*" (wszystkie pochodzenia). Na produkcji ustaw zmienną CORS_ORIGIN w .env!');
}

const corsOptions = {
  origin: corsOriginConfig,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));


app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '..'))); // portfolio z katalogu nadrzędnego

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

// ===== HEALTH CHECK (bez rate limiting) =====
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ===== SETUP ENDPOINT (jednorazowo ustawia pierwszego admina) =====
app.post('/api/setup/make-admin', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: "Brakuje username" });
    }

    const result = await pool.query(
      'UPDATE users SET is_admin = true WHERE username = $1 RETURNING id, username, is_admin',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Użytkownik nie znaleziony" });
    }

    res.json({ success: true, message: `${username} jest teraz adminem!`, user: result.rows[0] });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1. INICJALIZACJA BAZY (ROZBUDOWANA O TRYB MULTI-CHAT)
async function initDb() {
  try {
    // Tworzenie tabeli użytkowników
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // NOWOŚĆ: Tworzenie tabeli wątków/pokoi rozmów
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_threads (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL DEFAULT 'Nowa rozmowa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tworzenie tabeli wiadomości (z dodaniem lub aktualizacją powiązania)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        sender VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // BEZPIECZNA MIGRACJA: Dodajemy kolumnę thread_id, jeśli jeszcze nie istnieje w chat_history
    await pool.query(`
      ALTER TABLE chat_history 
      ADD COLUMN IF NOT EXISTS thread_id INT REFERENCES chat_threads(id) ON DELETE CASCADE;
    `);

    // MIGRACJA: Dodajemy is_admin kolumnę jeśli nie istnieje
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    `);

    // MIGRACJA: Dodajemy kolumnę metadata (JSONB) do chat_history
    await pool.query(`
      ALTER TABLE chat_history
      ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);

    console.log("=== BAZA DANYCH: Tabele 'users', 'chat_threads' i 'chat_history' działają poprawnie. ===");
  } catch (err) {
    console.error("=== BAZA DANYCH: Katastrofa przy inicjalizacji tabel! ===", err.message);
  }
}
initDb();

// MIDDLEWARE AUTORYZACJI JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: "Brak tokenu. Zaloguj się." });

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(401).json({ success: false, error: "Token wygasł lub jest nieprawidłowy." });
    req.user = decodedUser;
    next();
  });
}

// FUNKCJA ZAPISU DO PLIKU .MD
async function writeResearchFile(filename, content) {
  try {
    // Basic sanitization
    const safeFilename = filename.replace(/[^a-z0-9_\-\.]/gi, '_').toLowerCase();
    if (!safeFilename.endsWith('.md')) return "Error: Only .md files are allowed.";
    const notesDir = path.join(__dirname, 'research_notes');
    const filePath = path.join(notesDir, safeFilename);
    // Automatycznie utwórz katalog research_notes, jeśli nie istnieje
    await fs.mkdir(notesDir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return `Zapisano notatki pomyślnie w pliku: ${safeFilename}`;
  } catch (err) {
    console.error("[WRITE FILE ERROR]:", err.message);
    return `Błąd zapisu pliku: ${err.message}`;
  }
}

// FUNKCJA WYSZUKIWANIA W BRAVE SEARCH API
async function searchInternet(query) {
  try {
    // === POPRAWKA: usuń bieżący rok z zapytania ===
    // System prompt zmusza LLM do dodawania "2026" do każdego zapytania,
    // ale realne API wyszukiwarki nie ma danych z przyszłości!
    const currentYear = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', year: 'numeric' });
    let cleanQuery = query.replace(new RegExp(currentYear, 'g'), '').trim();
    // Jeśli po usunięciu roku zapytanie jest puste, użyj oryginału
    if (!cleanQuery) cleanQuery = query;
    
    // Spróbuj też bez dat jeśli pierwsze zapytanie zawierało miesiąc
    // (np. "24 czerwca 2026" → zostaje "kurs euro do PLN")
    cleanQuery = cleanQuery.replace(/\d{1,2}\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s*/gi, '').trim();
    if (!cleanQuery) cleanQuery = query;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(cleanQuery)}`, {
      headers: {
        'X-Subscription-Token': BRAVE_API_KEY,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.error(`[BRAVE SEARCH] HTTP ${res.status}: ${res.statusText}`);
      const errText = await res.text().catch(() => '');
      console.error(`[BRAVE SEARCH] Body: ${errText.substring(0, 300)}`);
      return `Wyszukiwarka zwróciła błąd HTTP ${res.status}. Spróbuj ponownie później.`;
    }
    
    const data = await res.json();
    
    // === DEBUG: loguj odpowiedź API gdy nie ma wyników ===
    if (!data || !data.web || !data.web.results || data.web.results.length === 0) {
      console.error(`[BRAVE SEARCH] Brak wyników dla: "${cleanQuery.substring(0, 100)}"`);
      console.error(`[BRAVE SEARCH] Response keys: ${Object.keys(data || {}).join(', ')}`);
      if (data && data.web) {
        console.error(`[BRAVE SEARCH] web keys: ${Object.keys(data.web).join(', ')}`);
      }
      if (data && data.query) {
        console.error(`[BRAVE SEARCH] query info: ${JSON.stringify(data.query)}`);
      }
      return "Brak wyników wyszukiwania w sieci.";
    }
    
    // Wyciągamy 6 najlepszych wyników
    return data.web.results.slice(0, 6).map(r => `• TYTUŁ: ${r.title}\n  INFO: ${r.description}\n  ŹRÓDŁO: ${r.url}`).join('\n\n');
  } catch (err) {
    console.error("[BRAVE SEARCH ERROR]:", err.message);
    if (err.name === 'AbortError') return "Wyszukiwanie internetowe przekroczyło limit czasu (10s). Spróbuj zawęzić zapytanie.";
    return "Nie udało się pobrać aktualnych danych z wyszukiwarki.";
  }
}

// FUNKCJA POBIERANIA PEŁNEJ TREŚCI STRONY (JINA READER API)
async function readUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return `Błąd odczytu strony: HTTP ${res.status}`;
    const data = await res.text();
    // Przytnij do ~15000 znaków, żeby nie przepełnić kontekstu
    return data.substring(0, 15000) + (data.length > 15000 ? "\n\n... (tekst ucięty z powodu długości)" : "");
  } catch (err) {
    console.error("[READ URL ERROR]:", err.message);
    if (err.name === 'AbortError') return "Odczyt strony przekroczył limit czasu (15s). URL może być zbyt wolny lub duży.";
    return `Nie udało się pobrać treści strony: ${err.message}`;
  }
}

// ENDPOINT REJESTRACJI i LOGOWANIA
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, error: "Brak danych." });
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, passwordHash]);
    res.json({ success: true, message: "Konto utworzone pomyślnie!" });
  } catch (err) { res.status(500).json({ success: false, error: "Użytkownik już istnieje." }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, error: "Błędny login lub hasło." });
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, error: "Błędny login lub hasło." });
    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } catch (err) { res.status(500).json({ success: false, error: "Błąd logowania." }); }
});

// ====== NOWE ENDPOINTY DO OBSŁUGI MULTI-CHAT ======

// 1. Pobieranie wszystkich wątków zalogowanego użytkownika
app.get('/api/chat/threads', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, created_at FROM chat_threads WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ success: true, threads: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Nie udało się pobrać listy rozmów." });
  }
});

// 2. Tworzenie nowego wątku
app.post('/api/chat/threads', authenticateToken, async (req, res) => {
  const { title } = req.body;
  const threadTitle = title ? title.trim().slice(0, 255) : 'Nowa rozmowa';
  try {
    const result = await pool.query(
      'INSERT INTO chat_threads (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
      [req.user.userId, threadTitle]
    );
    res.json({ success: true, thread: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Nie udało się utworzyć nowej rozmowy." });
  }
});

// 3. Usuwanie konkretnego wątku (razem z całą jego historią dzięki ON DELETE CASCADE)
app.delete('/api/chat/threads/:id', authenticateToken, async (req, res) => {
  const threadId = parseInt(req.params.id);
  try {
    // Weryfikacja czy wątek należy do tego użytkownika
    const check = await pool.query('SELECT id FROM chat_threads WHERE id = $1 AND user_id = $2', [threadId, req.user.userId]);
    if (check.rows.length === 0) return res.status(403).json({ success: false, error: "Brak uprawnień do usunięcia tej rozmowy." });

    await pool.query('DELETE FROM chat_threads WHERE id = $1', [threadId]);
    res.json({ success: true, message: "Rozmowa została trwale usunięta." });
  } catch (err) {
    res.status(500).json({ success: false, error: "Błąd podczas usuwania rozmowy." });
  }
});

app.get('/api/chat/history', authenticateToken, async (req, res) => {
  const threadId = req.query.threadId;
  if (!threadId) return res.status(400).json({ success: false, error: "Brak podanego identyfikatora rozmowy (threadId)." });

  try {
    const result = await pool.query(
      'SELECT id, sender, message, metadata FROM chat_history WHERE user_id = $1 AND thread_id = $2 ORDER BY created_at ASC',
      [req.user.userId, threadId]
    );
    res.json({ success: true, history: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Błąd pobierania historii dla tego wątku." });
  }
});

// =========================================================================
// POPRAWIONY ENDPOINT CZYSZCZENIA CZATU (Z DYNAMICZNYM ROUTINGIEM SLOTÓW)
// =========================================================================
app.delete('/api/chat/clear', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const threadId = req.query.threadId;
  const llamaUrl = process.env.LLAMA_SERVER_URL;
  
  if (!threadId) return res.status(400).json({ success: false, error: "Nie wskazano wątku do wyczyszczenia." });
  const targetSlot = (userId === 1) ? 0 : Math.max(0, ((userId - 2) % 3 + 1));
  
  try {
    // Czyścimy wiadomości przypisane tylko do tego wątku!
    await pool.query('DELETE FROM chat_history WHERE user_id = $1 AND thread_id = $2', [userId, threadId]);
    // Wygaszono czyszczenie slotu by zlikwidować błąd 501 Not Implemented
    // try {
    //   await fetch(`${llamaUrl}/slots/${targetSlot}?action=clear`, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } });
    // } catch (e) {}
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: "Błąd czyszczenia wątku." }); }
});
// ENDPOINT AUTONOMICZNEGO GENEROWANIA OBRAZU (STREAMING STATUSU)
// ENDPOINT AUTONOMICZNEGO GENEROWANIA OBRAZU
app.post('/api/image/generate', authenticateToken, async (req, res) => {    const { prompt, is_auto, aspect, mode, thread_id, model_type, image_reasoning, img_steps, img_megapixels, img_mu, img_std, checkpoint, cfg, sampler, scheduler, seed } = req.body;
  const userId = req.user.userId;
  const llamaUrl = process.env.LLAMA_SERVER_URL;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  req.setTimeout(0); // Zapobiega zamykaniu żądania przez Node.js (domyślnie 2 min)
  res.setTimeout(0);

  const sendStatus = (msg) => res.write(`data: ${JSON.stringify({ status: msg })}\n\n`);
    const sendDebug = (msg) => res.write(`data: ${JSON.stringify({ debug: msg })}\n\n`);

    // Zapobiegaj zamykaniu połączenia (timeoutom) przez ngrok/cloudflare (ping co 10 sekund)
    const keepAliveInterval = setInterval(() => {
      try {
        res.write('data: {"ping": true}\n\n');
      } catch (e) {
        clearInterval(keepAliveInterval);
      }
    }, 10000);
    res.on('finish', () => clearInterval(keepAliveInterval));
    req.on('close', () => clearInterval(keepAliveInterval));

  if (!prompt || !thread_id) {
    res.write(`data: ${JSON.stringify({ error: "Brak promptu lub pokoju rozmowy." })}\n\n`);
    return res.end();
  }

  const ngrokBaseUrl = process.env.HOME_GPU_URL ? process.env.HOME_GPU_URL.replace(/\/$/, "") : "";

  try {
    let finalPromptToSend = prompt;
    sendDebug(`[KROK 1] Start. Prompt: "${prompt}"`);

    if (model_type === 'advanced') {
      sendStatus("🧠 Łączę się z chmurą LLM (VPS 2)...");

      const target_ratio_str = {"1": "9:16", "2": "16:9", "3": "1:1"}[aspect] || "9:16";

      // System prompt dla Ideogram Advanced (z promptadv.json formatem — style_description + compositional_deconstruction)
      const system_instruction_advanced = `You are a master prompt engineer for Ideogram 4 Advanced. Convert the user's idea into a single minified JSON object.

CONTRACT:
{"high_level_description":"...no logo, no watermark.","style_description":{"aesthetics":"cinematic, high quality, dynamic camera angles","lighting":"cinematic, ring light, professional, cinema","medium":"cinema, movie","art_style":"cinematic movie"},"compositional_deconstruction":{"background":"...","elements":[{"type":"obj","bbox":[x1,y1,x2,y2],"desc":"..."},{"type":"text","bbox":[x1,y1,x2,y2],"text":"...","desc":"..."}]}}

CRITICAL: The "style_description" fields (aesthetics, lighting, medium, art_style) MUST remain EXACTLY as shown above. Do NOT change them. Only modify high_level_description, background, and element descriptions to match the user's idea.

REFERENCE EXAMPLE (formatted for readability — your output MUST be minified to one line):
{"high_level_description":"Cinematic medium-close shot of a majestic lion resting in golden sunlight, highly detailed realistic photography, no logo, no watermark.","style_description":{"aesthetics":"cinematic, high quality, dynamic camera angles","lighting":"cinematic, ring light, professional, cinema","medium":"cinema, movie","art_style":"cinematic movie"},"compositional_deconstruction":{"background":"Vibrant African savanna at golden hour with tall grass and warm dramatic sunlight casting long shadows.","elements":[{"type":"obj","bbox":[150,280,850,800],"desc":"Powerful male lion with full mane, lying regally on a rock, looking directly at camera with piercing amber eyes, highly detailed fur catching the sunlight."}]}}

QUALITY RULES:
- high_level_description MUST read like a professional photography brief: cinematic, evocative, explicit about lighting, mood, composition, texture
- Use phrases like "cinematic", "soft lighting", "dramatic", "highly detailed realistic photography", "intricate details"
- Background must include lighting conditions, colors, atmosphere
- Each element's desc must be rich and specific — describe pose, expression, textures, clothing details
- Include at least 2-4 diverse elements
- bbox in [x1,y1,x2,y2] format, scale 0-1500 proportional to the aspect ratio

STRUCTURAL RULES:
1. Text/typography/letters/words → use "type":"text" with exact text in the "text" field
2. Physical objects (person, animal, tree, furniture) → use "type":"obj"
3. NEVER add or remove fields from style_description
4. OUTPUT STRICTLY VALID JSON MINIFIED ON ONE LINE. NO EXPLANATIONS. NO MARKDOWN.`;

      const llmPayload = {
        model: "Gemma4-26B-A4B-Uncensored-HauhauCS-Balanced-Q4_K_P.gguf",
        messages: [
          { role: "system", content: system_instruction_advanced },
          { role: "user", content: `Convert this idea to the strict JSON layout: ${prompt}` }
        ],
        temperature: 0.1,
        max_tokens: image_reasoning && image_reasoning > 0 ? image_reasoning : (image_reasoning === -1 ? 999999 : 1500),
        response_format: { type: "json_object" },
        stream: false
      };

      const imgReasoningTokens = image_reasoning && image_reasoning > 0 ? image_reasoning : (image_reasoning === -1 ? 'Unlimited' : 1500);
      sendDebug(`[KROK 2] ADVANCED - Pytam LLM (wymuszam max ${imgReasoningTokens} tokenów)...`);

      const llmController = new AbortController();
      const llmTimeoutId = setTimeout(() => llmController.abort(), 30000); // 30s timeout dla LLM
      const llmResponse = await fetch(`${llamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(llmPayload),
        signal: llmController.signal
      });
      clearTimeout(llmTimeoutId);

      if (!llmResponse.ok) throw new Error(`Błąd LLM HTTP: ${llmResponse.status}`);

      const llmData = await llmResponse.json();

      // === FIX: Zabezpieczenie przed pustą odpowiedzią LLM ===
      if (!llmData.choices || llmData.choices.length === 0) {
        sendDebug(`[BŁĄD] LLM nie zwrócił choices! Body: ${JSON.stringify(llmData).substring(0, 300)}`);
        throw new Error("LLM nie zwrócił danych. Sprawdź czy model Gemma4 jest załadowany na serwerze.");
      }

      // === FIX: Read from BOTH content AND reasoning_content ===
      // Niektóre modele myślące (Gemma4 z thinking) zwracają JSON w reasoning_content
      // zamiast w content. Sprawdzamy oba.
      const msg = llmData.choices[0].message || {};
      let rawLlmText = (msg.content || msg.reasoning_content || '').trim();

      // Debug: pokaż surową strukturę odpowiedzi (tylko pierwsze 200 znaków)
      const rawPreview = rawLlmText.substring(0, 200);
      sendDebug(`[KROK 2->3] RAW od LLM (${rawLlmText.length} znaków): ${rawPreview}...`);

      if (!rawLlmText) {
        sendDebug(`[BŁĄD] LLM zwrócił pustą odpowiedź! Structure: has_content=${!!msg.content}, has_reasoning=${!!msg.reasoning_content}`);
        throw new Error("LLM zwrócił pustą treść. Spróbuj zwiększyć Image Reasoning budget (HD/Ultra).");
      }

      rawLlmText = rawLlmText.replace(/<think>[\s\S]*?<\/think>/gi, '')
                             .replace(/```json/gi, '')
                             .replace(/```/g, '')
                             .trim();

      // === FIX: Walidacja — nie wysyłaj pustego promptu do GPU ===
      if (!rawLlmText) {
        sendDebug(`[BŁĄD] Po oczyszczeniu JSON jest pusty!`);
        throw new Error("LLM nie wygenerował poprawnego JSON. Spróbuj zwiększyć Image Reasoning budget (HD/Ultra) lub zmień prompt.");
      }

      finalPromptToSend = rawLlmText;
      sendDebug(`[KROK 3] ADVANCED - Oczyszczony JSON od LLM:\n${finalPromptToSend}`);
      sendStatus("✅ JSON Advanced wygenerowany! Ślę do domu...");

    } else if (model_type === 'ideogram' || !model_type) {
      sendStatus("🧠 Łączę się z chmurą LLM (VPS 2)...");

      const target_ratio_str = {"1": "9:16", "2": "16:9", "3": "1:1"}[aspect] || "9:16";

      // System prompt dla standardowego Ideogram 4 (realism format — compositional_deconstruction bez style_description)
      const system_instruction = `You are a master prompt engineer for Ideogram 4 AI. Convert the user's idea into a single minified JSON object.

CONTRACT:
{"aspect_ratio":"${target_ratio_str}","high_level_description":"...no logo, no watermark.","compositional_deconstruction":{"background":"...","elements":[{"type":"obj","bbox":[x1,y1,x2,y2],"desc":"..."},{"type":"text","bbox":[x1,y1,x2,y2],"text":"...","desc":"..."}]}}

REFERENCE EXAMPLE (formatted for readability — your output MUST be minified to one line):
{"aspect_ratio":"9:16","high_level_description":"Cinematic intimate portrait of a stunning brunette woman on all fours on a modern bed looking back at the viewer, wearing only white thigh-high stockings, soft lighting over her curves, highly detailed realistic photography, intricate skin texture, no logo, no watermark.","compositional_deconstruction":{"background":"Bright modern bedroom with white walls, light floor tiles, large bed, clean minimalist design, warm natural daylight streaming through a window.","elements":[{"type":"obj","bbox":[250,140,1280,1050],"desc":"Beautiful brunette with long dark hair falling over one shoulder, looking back over shoulder with seductive eye contact, curvaceous hourglass figure, arched back pose, soft natural makeup, wearing only white thigh-high stockings with lace trim."},{"type":"obj","bbox":[280,850,1250,1370],"desc":"Modern platform bed with crisp white sheets and soft grey duvet, slightly rumpled."},{"type":"obj","bbox":[50,200,240,500],"desc":"Large floor-to-ceiling window with natural daylight streaming in, white frame."}]}}

QUALITY RULES:
- high_level_description MUST read like a professional photography brief: cinematic, evocative, explicit about lighting, mood, composition, texture
- Use phrases like "cinematic", "soft lighting", "intimate", "dramatic", "highly detailed realistic photography", "intricate details", "skin texture"
- Background must include lighting conditions, colors, atmosphere — lighting info goes INSIDE background, NOT as a separate field
- Each element's desc must be rich and specific — describe pose, expression, textures, clothing details, interactions with environment
- Include at least 3-4 diverse elements covering main subject, environment, and details
- bbox in [x1,y1,x2,y2] format, scale 0-1500 proportional to the aspect ratio

STRUCTURAL RULES:
1. Text/typography/letters/words → use "type":"text" with exact text in the "text" field
2. Physical objects (person, animal, tree, furniture) → use "type":"obj"
3. NEVER include a separate "lighting" field — lighting belongs inside the background description
4. OUTPUT STRICTLY VALID JSON MINIFIED ON ONE LINE. NO EXPLANATIONS. NO MARKDOWN.`;

      const llmPayload = {
        // TUTAJ WJEŻDŻA DOKŁADNA NAZWA TWOJEJ GEMMY:
        model: "Gemma4-26B-A4B-Uncensored-HauhauCS-Balanced-Q4_K_P.gguf",
        messages: [
          { role: "system", content: system_instruction },
          { role: "user", content: `Convert this idea to the strict JSON layout: ${prompt}` }
        ],
        temperature: 0.1,
        max_tokens: image_reasoning && image_reasoning > 0 ? image_reasoning : (image_reasoning === -1 ? 999999 : 1500),
        response_format: { type: "json_object" }, // 🪄 Twardy kaganiec na JSON dla Gemmy
        stream: false
      };

      const imgReasoningTokens = image_reasoning && image_reasoning > 0 ? image_reasoning : (image_reasoning === -1 ? 'Unlimited' : 1500);
      sendDebug(`[KROK 2] Pytam LLM (wymuszam max ${imgReasoningTokens} tokenów)...`);

      const llmController = new AbortController();
      const llmTimeoutId = setTimeout(() => llmController.abort(), 30000); // 30s timeout dla LLM
      const llmResponse = await fetch(`${llamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(llmPayload),
        signal: llmController.signal
      });
      clearTimeout(llmTimeoutId);

      if (!llmResponse.ok) throw new Error(`Błąd LLM HTTP: ${llmResponse.status}`);

      const llmData = await llmResponse.json();

      // === FIX: Read from BOTH content AND reasoning_content ===
      const msg = llmData.choices[0].message || {};
      let rawLlmText = (msg.content || msg.reasoning_content || '').trim();

      // Debug: pokaż surową strukturę odpowiedzi
      const rawPreview = rawLlmText.substring(0, 200);
      sendDebug(`[KROK 2->3] RAW od LLM (${rawLlmText.length} znaków): ${rawPreview}...`);

      if (!rawLlmText) {
        sendDebug(`[BŁĄD] LLM zwrócił pustą odpowiedź! Structure: has_content=${!!msg.content}, has_reasoning=${!!msg.reasoning_content}`);
        throw new Error("LLM zwrócił pustą treść. Spróbuj zwiększyć Image Reasoning budget (HD/Ultra).");
      }

      // Sprzątanie po uncensored LLM
      rawLlmText = rawLlmText.replace(/<think>[\s\S]*?<\/think>/gi, '')
                             .replace(/```json/gi, '')
                             .replace(/```/g, '')
                             .trim();

      // === FIX: Walidacja — nie wysyłaj pustego promptu do GPU ===
      if (!rawLlmText) {
        sendDebug(`[BŁĄD] Po oczyszczeniu JSON jest pusty!`);
        throw new Error("LLM nie wygenerował poprawnego JSON. Spróbuj zwiększyć Image Reasoning budget (HD/Ultra) lub zmień prompt.");
      }

      finalPromptToSend = rawLlmText;
      sendDebug(`[KROK 3] Oczyszczony JSON od LLM:\n${finalPromptToSend}`);
      sendStatus("✅ JSON wygenerowany! Ślę do domu...");
    } else {
      // Prompt Reconstruction: zawsze rozszerz prompt przez LLM przed wysłaniem
      // Wykrywa język polski → tłumaczy na angielski i rozszerza, angielski → tylko rozszerza
      if (req.body.prompt_reconstruct !== false) {
        sendStatus("🧠 Rozszerzam prompt przez LLM...");
        sendDebug(`[KROK 2] Prompt Reconstruction - rozszerzam prompt przez LLM...`);

        const userStyle = (req.body.reconstruct_style || '').trim();
        const styleInstruction = userStyle
          ? `Apply this specific style to the prompt: "${userStyle}". Incorporate the style terms naturally into the description.`
          : `Add descriptive terms like: cinematic lighting, highly detailed realistic photography, intricate textures, dramatic atmosphere, professional composition.`;

        const imgReasonTokens = image_reasoning && image_reasoning > 0 ? image_reasoning : (image_reasoning === -1 ? 999999 : 1500);
        sendDebug(`[KROK 2] Image Reasoning budget: ${imgReasonTokens === 999999 ? 'Unlimited' : imgReasonTokens} tokenów`);

        const reconstructSystemPrompt = `You are a professional prompt engineer for image generation.

${styleInstruction}

INSTRUCTIONS:
1. DETECT LANGUAGE on your own. If the prompt is in Polish, FIRST translate it to English, THEN expand it with rich descriptive details.
2. If the prompt is already in English, expand it with rich descriptive details.
3. ALWAYS output in English. ALWAYS keep the original subject, composition, and key details intact.
4. NEVER shorten, summarize, or pick only one detail. Preserve the full concept.
5. Output ONLY the expanded prompt text. No labels, no bullet points, no markdown, no section headers, no analysis, no notes.

Now process this prompt:`;

        const reconstructPayload = {
          model: "Gemma4-26B-A4B-Uncensored-HauhauCS-Balanced-Q4_K_P.gguf",
          messages: [
            { role: "system", content: reconstructSystemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: imgReasonTokens,
          stream: false
        };

        try {
          const llmController = new AbortController();
          const llmTimeoutId = setTimeout(() => llmController.abort(), 30000);
          const llmResponse = await fetch(`${llamaUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify(reconstructPayload),
            signal: llmController.signal
          });
          clearTimeout(llmTimeoutId);

          if (llmResponse.ok) {
            const llmData = await llmResponse.json();
            if (llmData.choices && llmData.choices[0] && llmData.choices[0].message) {
              const msg = llmData.choices[0].message;
              let expandedPrompt = (msg.content || msg.reasoning_content || '').trim();
              if (expandedPrompt) {
                // Post-processing: usuń markdown, think bloki, bullet pointy, sekcje
                let cleaned = expandedPrompt
                  .replace(/<think>[\s\S]*?<\/think>/gi, '')
                  .replace(/```[\s\S]*?```/g, '')
                  .replace(/^[\s]*[*\-]\s*/gm, '')
                  .replace(/^(?:Original idea|Subject details|Style requirements|Subject|Setting|Lighting|Style|Action|Key Detail|Goal|Requirements|Constraints|Translation|Rules|QUALITY RULES|STRUCTURAL RULES|CRITICAL|Subject\/Pose|Scene|Background|Foreground|Composition|Atmosphere|Mood|Details):\s*/gim, '')
                  .replace(/^[\s*]*[A-Z][A-Za-z]+(?:\/[A-Z][A-Za-z]+)*\s*:\s*/gm, '')
                  .replace(/^[\s]*[*\-][\s]*$/gm, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();
                const paragraphs = cleaned.split(/\n+/).filter(p => p.trim().length > 15);
                if (paragraphs.length > 0) {
                  cleaned = paragraphs[paragraphs.length - 1].trim();
                }
                cleaned = cleaned.replace(/^["'\u201E\u201C\u2018\u2019]+|["'\u201E\u201C\u2018\u2019]+$/g, '').trim();
                if (cleaned) {
                  finalPromptToSend = cleaned;
                }
                sendDebug(`[KROK 2->3] Prompt rozszerzony: "${finalPromptToSend.substring(0, 200)}..."`);
              }
            }
          }
        } catch (e) {
          sendDebug(`[KROK 2->3] LLM reconstruction failed: ${e.message}, używam oryginalnego promptu`);
        }
      }
      // ZAWSZE używamy wyjścia z LLM (lub oryginału jeśli LLM failed) — nigdy nie wysyłamy surowego polskiego do GPU
      sendDebug(`[KROK 3] QUICK - wysyłam tekst:\n${finalPromptToSend}`);
    }

    sendStatus("🎨 Mielenie na RTX w domu...");
    sendDebug(`[KROK 4] Wysyłam żądanie do serwera generującego obrazy...`);

    // Dla modelu Advanced dołóż parametry — teraz z frontendu (ręczne ustawienia użytkownika)
    const advancedParams = (model_type === 'advanced') ? {
      steps: parseInt(img_steps) || 20,
      mu: parseFloat(img_mu) || 0,
      std: parseFloat(img_std) || 1.75,
      megapixels: parseFloat(img_megapixels) || 0.5,
      sampler: sampler || 'euler',
      scheduler: scheduler || 'karras'
    } : {};

    // Dla QUICK modelu dołóż params (checkpoint + steps)
    const quickParams = (model_type === 'quick') ? {
      steps: parseInt(img_steps) || 20,
      sampler: sampler || 'euler',
      scheduler: scheduler || 'karras',
      checkpoint: checkpoint || ''
    } : {};

    // Dla QUICKADV modelu dołóż pełne parametry (steps, cfg, sampler, seed, checkpoint)
    const quickadvParams = (model_type === 'quickadv') ? {
      steps: parseInt(img_steps) || 20,
      cfg: parseFloat(cfg) || 7.0,
      sampler: sampler || 'euler',
      scheduler: scheduler || 'karras',
      seed: (seed === -1 || seed === '-1') ? -1 : parseInt(seed) || 42,
      checkpoint: checkpoint || ''
    } : {};

    const quickgenParams = (model_type === 'quickgen') ? {
      steps: parseInt(img_steps) || 25,
      cfg: parseFloat(cfg) || 5.0,
      sampler: sampler || 'euler',
      scheduler: scheduler || 'karras',
      seed: (seed === -1 || seed === '-1') ? -1 : parseInt(seed) || 42,
      checkpoint: checkpoint || ''
    } : {};

    const szybkoParams = (model_type === 'szybko') ? {
      sampler: sampler || 'euler',
      scheduler: scheduler || 'simple',
      megapixels: parseFloat(img_megapixels) || 1.3,
      steps: parseInt(img_steps) || 12,
      seed: (seed === -1 || seed === '-1') ? -1 : parseInt(seed) || 42,
      shift: parseFloat(req.body.shift) || 9
    } : {};

    // Wydłużony timeout dla renderowania na GPU (5 minut)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    let pcResponse;
    try {
      pcResponse = await fetch(`${ngrokBaseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ prompt: finalPromptToSend, aspect, mode, model_type: model_type || 'ideogram', image_reasoning, ...advancedParams, ...quickParams, ...quickadvParams, ...quickgenParams, ...szybkoParams }),
        signal: controller.signal
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        throw new Error("Timeout: Agent domowy generował obraz zbyt długo (>5 min).");
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!pcResponse.ok) {
      const errText = await pcResponse.text();
      sendDebug(`[BŁĄD PC] HTTP ${pcResponse.status}: ${errText}`);
      throw new Error(`Agent domowy odrzucił żądanie.`);
    }

    // POTĘŻNE ZABEZPIECZENIE: Sprawdzamy, czy ngrok na pewno zwrócił obraz, a nie stronę z błędem HTML!
    const contentType = pcResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('image')) {
      const badText = await pcResponse.text();
      sendDebug(`[BŁĄD NGROK] Otrzymano tekst zamiast obrazka! Treść: ${badText.substring(0, 200)}`);
      throw new Error("Ngrok lub agent zwrócił tekst/błąd zamiast pliku PNG!");
    }

    sendStatus("💾 Zapisuję plik na serwerze...");
    const arrayBuffer = await pcResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `render_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
    const outputsDir = path.join(__dirname, 'public', 'outputs');
    await fs.mkdir(outputsDir, { recursive: true }).catch(()=>{});
    await fs.writeFile(path.join(outputsDir, filename), buffer);

    const publicUrl = `/outputs/${filename}`;

    if (!is_auto) {
      await pool.query('INSERT INTO chat_history (user_id, thread_id, sender, message) VALUES ($1, $2, $3, $4)', [userId, thread_id, 'user', prompt]);
    }

    const botMarkdownNotice = `Boski render prosto z Twojej maszyny jest gotowy:\n\n![Wygenerowany obraz](${publicUrl})`;
    await pool.query('INSERT INTO chat_history (user_id, thread_id, sender, message) VALUES ($1, $2, $3, $4)', [userId, thread_id, 'bot', botMarkdownNotice]);

    sendDebug(`[SUKCES] Zapisano w: ${publicUrl}`);
    res.write(`data: ${JSON.stringify({ success: true, url: publicUrl })}\n\n`);
    res.end();

  } catch (error) {
    sendDebug(`[KATASTROFA] ${error.message}`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.get('/api/admin/users-logs', authenticateToken, async (req, res) => {
  try {
    const userCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    if (!userCheck.rows[0]?.is_admin) return res.status(403).json({ success: false, error: "Brak uprawnień." });

    const result = await pool.query(`SELECT u.username, ch.sender, ch.message FROM users u LEFT JOIN chat_history ch ON u.id = ch.user_id ORDER BY u.id, ch.created_at ASC`);
    const logsByFolder = {};
    result.rows.forEach(row => {
      if (!logsByFolder[row.username]) logsByFolder[row.username] = [];
      if (row.sender) logsByFolder[row.username].push({ sender: row.sender, message: row.message });
    });
    res.json({ success: true, folders: logsByFolder });
  } catch (err) { res.status(500).json({ success: false, error: "Błąd logów." }); }
});

// STREAMING + AGENT INTERNETOWY (Z POPRAWIONYM SYGNAŁEM ROUTERA I FILTREM HISTORII)
// 1. FUNKCJA STABILIZUJĄCA: Usuwa polskie znaki diakrytyczne do rygorystycznej filtracji
function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase()
    .replace(/ł/g, "l")
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z");
}

// =========================================================================
// ZOPTYMALIZOWANY ENDPOINT STREAMINGOWY – PEŁNA WIELOWĄTKOWOŚĆ DLA -np 4
// =========================================================================
app.post('/ask-llama-stream', authenticateToken, async (req, res) => {
  // POPRAWKA: Jednorazowe, czyste wyciągnięcie parametrów z żądania
  const { prompt, display_prompt, no_history, temperature, top_p, max_tokens, repeat_penalty, top_k, min_p, reasoning_budget, web_search, system_prompt, thread_id, uploaded_image } = req.body;
  const llamaUrl = process.env.LLAMA_SERVER_URL;
  const userId = req.user.userId;

  if (!prompt) return res.status(400).json({ success: false, error: "Prompt jest pusty." });

  // DYNAMICZNY ROUTER: Zapobiega konfliktom między użytkownikami na karcie graficznej
  const targetSlot = (userId === 1) ? 0 : Math.max(0, ((userId - 2) % 3 + 1));

  // Natychmiastowe otwarcie tunelu strumieniowego do frontendu
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // ===== METADANE ODPOWIEDZI (do tooltipa) =====
  const startTime = Date.now();
  let totalTokensGenerated = 0;
  let agentToolCalls = 0;
  let agentSteps = 0;

  try {
    const wymagaInternetu = (web_search === true || web_search === 'true');

    // Szybki komunikat startowy w dymku myślenia (pomiń jeśli no_history, np. przy cichym tłumaczeniu promptu)
    if (!no_history) {
      res.write(`data: ${JSON.stringify({ token: "🧠 Moduł decyzyjny: Analizuję intencję zapytania...\n", is_thinking: true })}\n\n`);

      if (wymagaInternetu) {
        res.write(`data: ${JSON.stringify({ token: "🌐 Tryb Agenta aktywowany. Włączam autonomiczne planowanie...\n\n", is_thinking: true })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ token: "⚡ Surfowanie wyłączone. Korzystam z własnej absolutnej wiedzy.\n\n", is_thinking: true })}\n\n`);
      }
    }

    if (!thread_id) {
      res.write(`data: ${JSON.stringify({ error: "Błąd krytyczny backendu: Nie wybrano pokoju rozmowy." })}\n\n`);
      return res.end();
    }

    // Pobranie historii TYLKO dla tego konkretnego wątku
    const historyResult = await pool.query(
      'SELECT sender, message FROM chat_history WHERE user_id = $1 AND thread_id = $2 ORDER BY created_at ASC LIMIT 15',
      [userId, thread_id]
    );

    // Zapis promptu użytkownika w powiązaniu z wątkiem (używamy display_prompt jeśli istnieje, by ukryć tagi [KONTEKST])
    // Pomiń zapis jeśli no_history=true
    if (!no_history) {
      await pool.query(
        'INSERT INTO chat_history (user_id, thread_id, sender, message) VALUES ($1, $2, $3, $4)',
        [userId, thread_id, 'user', display_prompt || prompt]
      );
    }

    // DYNAMICZNA MODYFIKACJA PROMPTU NA BAZIE PRZYCISKU REASONING BUDGET
    let budgetInstruction = "";
    const currentBudget = typeof reasoning_budget !== 'undefined' ? parseInt(reasoning_budget) : 512;

    if (currentBudget === 0) {
      budgetInstruction = "\n\n[CRITICAL DIRECTIVE: DO NOT USE ANY THINKING BLOCKS or <|think|> tags. Generate the final text response immediately. However, if you need to use tools like <search>, just output the tool tag directly without thinking.]";
    } else if (currentBudget < 256) {
      budgetInstruction = `\n\n[SYSTEM GUIDELINE: Keep your inner reasoning phase extremely concise and brief, under ${currentBudget} words.]`;
    }

    let activeSystemPrompt = system_prompt ?? "";

    if (wymagaInternetu) {
      // Niezawodny format daty z wymuszonym czasem w Polsce
      const now = new Date();
      const currentYear = now.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', year: 'numeric' });
      // Rozwiązanie problemu ISO dla polskiej strefy
      const dynamicDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); 
      const dynamicTime = now.toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      activeSystemPrompt += `\n\n[PROTOKÓŁ AUTONOMICZNEGO DEEP RESEARCH]:
AKTUALNY CZAS SYSTEMOWY: ${dynamicDate} (JEST ROK ${currentYear}), godzina ${dynamicTime} CET/CEST (Czas Warszawski).
Zawsze uwzględniaj tę strefę czasową (Polska) w swoich raportach.
Masz absolutny dostęp do narzędzi wyszukiwania sieciowego oraz zapisu plików. 

JEŚLI URUCHOMIONO TRYB INTERNETOWY, MASZ PRAWO WYKONAĆ DO 5 KROKÓW WYSZUKIWANIA POD RZĄD.

BEZWZGLĘDNA ZASADA WYSZUKIWANIA (CRITICAL DIRECTIVE): 
Twoja wiedza urywa się w przeszłości. Dlatego w swoich zapytaniach do narzędzia <search> ZAWSZE, BEZWYJĄTKOWO musisz wpisywać aktualny rok (${currentYear}) i aktualny miesiąc, chyba że użytkownik wyraźnie pyta o historię. 
Kategorycznie ZABRANIA SIĘ wpisywania w tag <search> lat ubiegłych (np. 2024, 2025), gdy szukasz "najnowszych" lub "ostatnich" wydarzeń!

Zasady pętli badawczej (ReAct):
1. W warstwie myślenia (thinking) PRZEPROWADŹ ANALIZĘ i zdecyduj czego szukać.
2. Po zamknięciu myślenia </think> umieść tag narzędzia w CZYSTEJ linii - bez żadnych innych słów.
3. Tag narzędzia MUSI być w warstwie odpowiedzi (content), NIGDY w myśleniu.
4. Wzór: <think>...analiza...</think>\n<search>zapytanie</search>

Dozwolone narzędzia:
<search>fraza_do_znalezienia</search>
<read_url>http://link.com</read_url>
<write_file>nazwa.md|tekst</write_file>

⚠️⚠️⚠️ KLUCZOWA ZASADA ⚠️⚠️⚠️:
Tagi narzędzi MUSZĄ być w "content", NIGDY w "reasoning_content".
Jeśli umieścisz <search> w myśleniu, system go NIE wykryje.

Przykład:
<think>Muszę sprawdzić kurs euro.</think>
<search>kurs euro PLN 2026</search>
<think>Mam wyniki, analizuję.</think>
Aktualny kurs euro to...`;
    }

    activeSystemPrompt += budgetInstruction;

    // ===== KONTEKST OBRAZU: Skanujemy historię po ostatni wygenerowany obraz =====
    // Dzięki temu model wie jaki obraz został wygenerowany i może się do niego odnieść
    // zamiast wymyślać nieistniejące opisy.
    let lastImageUrl = null;
    let lastImagePrompt = null;
    let sendImageMultimodal = false;
    let lastImageBase64 = null;
    for (let i = historyResult.rows.length - 1; i >= 0; i--) {
      const row = historyResult.rows[i];
      if (row.sender === 'bot' && row.message && row.message.includes('/outputs/')) {
        // Wyciągamy URL obrazu z markdown: ![...](/outputs/render_xxx.png)
        const imgMatch = row.message.match(/!\[.*?\]\((\/outputs\/[^)]+)\)/);
        if (imgMatch) {
          lastImageUrl = imgMatch[1];
          // Szukamy promptu użytkownika tuż przed tą wiadomością
          if (i > 0 && historyResult.rows[i - 1].sender === 'user') {
            lastImagePrompt = historyResult.rows[i - 1].message;
          }
          break;
        }
      }
    }

    // ===== MULTIMODAL: Jeśli użytkownik pyta o obraz, wyślij go faktycznie do modelu =====
    if (lastImageUrl) {
      const normalizedPrompt = normalizeText(prompt);
      const imageKeywords = ['obraz', 'obrazek', 'zdjecie', 'foto', 'widziec', 'zobaczyc', 'popatrzec', 'zobacz', 'co jest na', 'co to za', 'opis', 'see', 'image', 'picture', 'photo', 'describe', 'look at', 'tell me about'];
      const isImageQuery = imageKeywords.some(k => normalizedPrompt.includes(k));

      if (isImageQuery) {
        try {
          const imagePath = path.join(__dirname, 'public', lastImageUrl.replace(/^\//, ''));
          const imageBuffer = await fs.readFile(imagePath);
          lastImageBase64 = imageBuffer.toString('base64');
          sendImageMultimodal = true;
        } catch (err) {
          console.error('[MULTIMODAL ERROR] Nie mogę odczytać obrazka:', err.message);
        }
      }
    }

    if (lastImageUrl) {
      if (sendImageMultimodal) {
        activeSystemPrompt += `\n\n[KONTEKST OBRAZU W CZACIE]:\nW historii tego czatu znajduje się wygenerowany obraz (który widzisz poniżej jako dane wizualne).\n- Adres URL obrazu: ${lastImageUrl}\n- Prompt który go wygenerował: ${lastImagePrompt ? `"${lastImagePrompt}"` : '(nieznany)'}\n\nINSTRUKCJA: Użytkownik pyta o ten obraz. Widzisz go w danych wizualnych poniżej. Opisz szczegółowo co widzisz na obrazie — kolory, kompozycję, obiekty, nastrój, oświetlenie, tekstury. Odpowiadaj jakbyś faktycznie go widział.`;
      } else {
        activeSystemPrompt += `\n\n[KONTEKST OBRAZU W CZACIE]:\nW historii tego czatu znajduje się wygenerowany obraz. Oto szczegóły:\n- Adres URL obrazu: ${lastImageUrl}\n- Prompt który go wygenerował: ${lastImagePrompt ? `"${lastImagePrompt}"` : '(nieznany)'}\n\nINSTRUKCJA: Gdy użytkownik pyta o obraz, odwołuj się do tego konkretnego URL-a. Możesz opisać obraz na podstawie promptu, który go wygenerował. NIE wymyślaj obrazów, których nie ma w historii. Jeśli użytkownik prosi o wygenerowanie obrazu, użyj komendy obrazkowej zamiast opisywania. Jeśli użytkownik pyta \"co jest na obrazie\" lub \"opisz obraz\", opisz go na podstawie promptu generującego (powyższy prompt), ale zaznacz, że to na podstawie promptu generującego, a nie analizy wizualnej.`;
      }
    }

    // INICJALIZUJEMY PUSTĄ TABLICĘ DLA MODELU
    let messagesForModel = [];

    // 1. Jeśli system prompt nie jest pusty, wrzucamy go na sam początek
    if (activeSystemPrompt.trim() !== "") {
      messagesForModel.push({ role: "system", content: activeSystemPrompt });
    }

    // 2. ZAWSZE wstrzykujemy całą dotychczasową historię rozmowy z bazy danych
    historyResult.rows.forEach(row => {
      messagesForModel.push({
        role: row.sender === 'user' ? 'user' : 'assistant',
        content: row.message
      });
    });

    // 3. Na samym końcu dopisujemy BIEŻĄCE zapytanie użytkownika, na które model ma odpowiedzieć
    if (sendImageMultimodal && lastImageBase64) {
      const mimeType = lastImageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
      messagesForModel.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${lastImageBase64}` } },
          { type: 'text', text: prompt }
        ]
      });
    } else if (uploaded_image) {
      // Użytkownik wgrał własny obrazek — użyj multimodalnego formatu
      // uploaded_image to data URL: data:image/png;base64,... lub data:image/jpeg;base64,...
      const mimeMatch = uploaded_image.match(/^data:(image\/[a-z]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      messagesForModel.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: uploaded_image } },
          { type: 'text', text: prompt }
        ]
      });
      // Dodaj info do system promptu że obrazek pochodzi od użytkownika
      if (activeSystemPrompt.trim() !== "") {
        // System prompt już istnieje, dodajemy kontekst do pierwszej wiadomości systemowej
        activeSystemPrompt += `\n\n[UPLOAD OBRAZKA]: Użytkownik wgrał własny obrazek. Opisz szczegółowo co widzisz na obrazie — kolory, kompozycję, obiekty, nastrój, oświetlenie, tekstury. Odpowiadaj jakbyś faktycznie go widział.`;
        messagesForModel[0].content = activeSystemPrompt;
      } else {
        activeSystemPrompt = `[UPLOAD OBRAZKA]: Użytkownik wgrał własny obrazek. Opisz szczegółowo co widzisz na obrazie — kolory, kompozycję, obiekty, nastrój, oświetlenie, tekstury. Odpowiadaj jakbyś faktycznie go widział.`;
        messagesForModel.unshift({ role: 'system', content: activeSystemPrompt });
      }
    } else {
      messagesForModel.push({ role: 'user', content: prompt });
    }


    let fullBotReply = "";
    let finalAnswerReached = false;
    let toolCallCount = 0; // limit tool calls to prevent infinite loops
    let forceFinalAnswer = false;

    while (!finalAnswerReached && toolCallCount < 6) {
      const llmStreamController = new AbortController();
      const llmStreamTimeoutId = setTimeout(() => llmStreamController.abort(), 120000); // 2min timeout na połączenie
      const response = await fetch(`${llamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          model: "Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-IQ4_XS.gguf",
          messages: messagesForModel,
          temperature: parseFloat(temperature) || 0.4,
          top_p: parseFloat(top_p) || 0.95,
          max_tokens: parseInt(max_tokens) || 2048,
          repeat_penalty: parseFloat(repeat_penalty) || 1.1,
          top_k: parseInt(top_k) || 40,
          min_p: parseFloat(min_p) || 0.05,
          reasoning_budget: currentBudget,
          slot_id: targetSlot,
          stream: true
        }),
        signal: llmStreamController.signal
      });
      clearTimeout(llmStreamTimeoutId);

      let currentReply = "";
      let startedThinkingInDb = false;
      let budgetReached = false;
      let toolDetected = false;
      let toolType = null;
      let toolBuffer = "";
      let toolDetectionBuffer = ""; // Uniwersalny bufor wykrywania tagów (dla reasoning_content i content)
      let toolTagStartInBuffer = -1; // Pozycja w toolDetectionBuffer gdzie zaczyna się tag narzędzia
      let watchBuffer = ""; // Bufor stróżujący: wstrzymuje tokeny które mogą być początkiem tagu narzędzia
      let inWatchMode = false; // Czy jesteśmy w trybie stróżowania (potencjalny tag narzędzia)
                      toolDetectionBuffer = "";

      const decoder = new TextDecoder();
      const llmDebugBuffer = { reasoning: "", content: "", mode: null };

      let leftoverLine = "";
      for await (const chunk of response.body) {
        const textChunk = decoder.decode(chunk);
        const fullText = leftoverLine + textChunk;
        const lines = fullText.split('\n');
        leftoverLine = textChunk.endsWith('\n') ? "" : (lines.pop() || "");

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices[0].delta;
              // DEBUG: akumulowane logowanie surowych chunkow z API
              if (delta.reasoning_content) {
                if (llmDebugBuffer.mode === "content" && llmDebugBuffer.content) { console.log("[LLM_CONTENT]", llmDebugBuffer.content); ; try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_CONTENT] " + llmDebugBuffer.content + String.fromCharCode(10));}catch(e){} llmDebugBuffer.content = ""; }
                llmDebugBuffer.reasoning += delta.reasoning_content;
                llmDebugBuffer.mode = "reasoning";
              } else if (delta.content) {
                if (llmDebugBuffer.mode === "reasoning" && llmDebugBuffer.reasoning) { console.log("[LLM_REASONING]", llmDebugBuffer.reasoning); ; try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_REASONING] " + llmDebugBuffer.reasoning + String.fromCharCode(10));}catch(e){} llmDebugBuffer.reasoning = ""; }
                llmDebugBuffer.content += delta.content;
                llmDebugBuffer.mode = "content";
              }
              let tokenText = delta.reasoning_content || delta.content || "";

              if (tokenText) {
                if (tokenText.includes("Budget reached") || tokenText.includes("Reasoning summarized")) {
                  budgetReached = true;
                  continue;
                }

                let cleanToken = tokenText.replace(/\[Budget reached:.*?\]/gi, '')
                  .replace(/Reasoning summarized.*/gi, '');

                if (!cleanToken) continue;

                // ===== UNIWERSALNE WYKRYWANIE TAGÓW NARZĘDZIOWYCH =====
                // Działa na WSZYSTKICH tokenach (zarówno reasoning_content jak i content)
                if (!toolType) {
                  // Najpierw dodaj token do bufora wykrywania
                  toolDetectionBuffer += cleanToken;

                  // Sprawdź czy bufor zawiera tag otwierający narzędzie
                  const searchIdx = toolDetectionBuffer.indexOf("<search>");
                  const writeIdx = toolDetectionBuffer.indexOf("<write_file>");
                  const readIdx = toolDetectionBuffer.indexOf("<read_url>");

                  if (searchIdx !== -1 || writeIdx !== -1 || readIdx !== -1) {
                    // TAG NARZĘDZIA WYKRYTY!
                    // Określ który tag i gdzie
                    if (searchIdx !== -1 && (writeIdx === -1 || searchIdx < writeIdx) && (readIdx === -1 || searchIdx < readIdx)) {
                      toolTagStartInBuffer = searchIdx;
                      toolType = "search";
                    } else if (writeIdx !== -1 && (searchIdx === -1 || writeIdx < searchIdx) && (readIdx === -1 || writeIdx < readIdx)) {
                      toolTagStartInBuffer = writeIdx;
                      toolType = "write_file";
                    } else if (readIdx !== -1 && (searchIdx === -1 || readIdx < searchIdx) && (writeIdx === -1 || readIdx < writeIdx)) {
                      toolTagStartInBuffer = readIdx;
                      toolType = "read_url";
                    }

                    // Wyślij zawartość WATCH BUFFERA (który wstrzymywał te tokeny) jako myślenie
                    // zanim przejdziemy w tryb narzędzia
                    if (watchBuffer.length > 0) {
                      res.write(`data: ${JSON.stringify({ token: watchBuffer, is_thinking: true })}\n\n`);
                      // Dodaj watchBuffer do currentReply jako myślenie
                      if (!startedThinkingInDb) { currentReply += "<think>"; startedThinkingInDb = true; }
                      currentReply += watchBuffer;
                      watchBuffer = "";
                    }
                    inWatchMode = false;

                    // Zamknij blok myślenia jeśli był otwarty
                    if (startedThinkingInDb) {
                      currentReply += "</think>";
                      startedThinkingInDb = false;
                    }

                    // Agent notification
                    res.write(`data: ${JSON.stringify({ token: `\n\n[AGENT: Odpalam moduł: ${toolType}...]\n\n`, is_thinking: true })}\n\n`);

                    // Dodaj do currentReply TYLKO od pozycji tagu narzędzia (pomijając prefix)
                    // Prefix został już dodany do currentReply token po tokenie w ścieżce "no tag"
                    const toolPortion = toolDetectionBuffer.substring(toolTagStartInBuffer);
                    currentReply += toolPortion;
                    toolDetectionBuffer = "";
                    toolTagStartInBuffer = -1;

                    // === SPRAWDŹ CZY TAG ZAMYKAJĄCY JEST JUŻ W currentReply (przypadek jednego tokena) ===
                    // Jeśli całe <search>query</search> przyszło w jednym strumieniu, musimy
                    // wykryć zamknięcie NATYCHMIAST, bo inaczej kod nie wejdzie do bloku else
                    if (currentReply.includes(`</${toolType}>`)) {
                      toolDetected = true;
                      const tagOpen = `<${toolType}>`;
                      const tagClose = `</${toolType}>`;
                      const openIdx = currentReply.indexOf(tagOpen);
                      const closeIdx = currentReply.indexOf(tagClose);
                      if (openIdx !== -1 && closeIdx > openIdx) {
                        toolBuffer = currentReply.substring(openIdx + tagOpen.length, closeIdx);
                      }
                      break;
                    }
                  } else {
                    // === WATCH BUFFER: Sprawdź czy token może być początkiem tagu narzędzia ===
                    // Patrzymy na koniec toolDetectionBuffer - czy jest tam '<' z prefixem tagu?
                    const bufEnd = toolDetectionBuffer.length > 25 
                      ? toolDetectionBuffer.slice(-25).toLowerCase() 
                      : toolDetectionBuffer.toLowerCase();
                    
                    // Sprawdź czy końcówka bufora pasuje do wzorca początku tagu narzędzia
                    // np. "<s", "<se", "<sea", ..., "<search", "<w", "<wr", ...
                    const isPotentialToolStart = /(?:<\/?[swr])$/.test(bufEnd) ||
                      /<(?:searc?h?|writ?e?_?f?i?l?e?_?|read?_?u?r?l?)$/.test(bufEnd) ||
                      /^<[swr]/.test(cleanToken);

                    if (isPotentialToolStart) {
                      // === WATCH MODE: potencjalny tag narzędzia ===
                      // Buforuj token, nie wysyłaj do frontendu, ale śledź stan myślenia
                      inWatchMode = true;
                      watchBuffer += cleanToken;
                      
                      // NIE dodajemy do currentReply tutaj - zrobimy to przy flushu
                      // Tylko śledzimy stan startedThinkingInDb
                      if (delta.reasoning_content && !budgetReached) {
                        if (!startedThinkingInDb) { startedThinkingInDb = true; }
                      } else {
                        if (startedThinkingInDb) { startedThinkingInDb = false; }
                      }
                    } else if (inWatchMode) {
                      // Nadal w watch mode - buforuj dalej
                      watchBuffer += cleanToken;
                      
                      // Śledź stan myślenia
                      if (delta.reasoning_content && !budgetReached) {
                        if (!startedThinkingInDb) { startedThinkingInDb = true; }
                      } else {
                        if (startedThinkingInDb) { startedThinkingInDb = false; }
                      }
                      
                      // Jeśli watch buffer urósł > 40 znaków, to nie był tagiem - flush do frontendu
                      if (watchBuffer.length > 40) {
                        const wbThinking = delta.reasoning_content && !budgetReached;
                        if (wbThinking && !currentReply.includes("<think>")) {
                          currentReply += "<think>";
                        } else if (!wbThinking && !currentReply.includes("</think>")) {
                          // kontynuuj
                        }
                        currentReply += watchBuffer;
                        res.write(`data: ${JSON.stringify({ token: watchBuffer, is_thinking: wbThinking })}\n\n`);
                        watchBuffer = "";
                        inWatchMode = false;
                      }
                    } else {
                      // BRAK TAGU NARZĘDZIOWEGO - normalny przepływ
                      const currentIsThinking = delta.reasoning_content && !budgetReached;

                      if (currentIsThinking) {
                        if (!startedThinkingInDb) { currentReply += "<think>"; startedThinkingInDb = true; }
                        currentReply += cleanToken;
                        res.write(`data: ${JSON.stringify({ token: cleanToken, is_thinking: true })}\n\n`);
                      } else {
                        if (startedThinkingInDb) {
                          currentReply += "</think>";
                          startedThinkingInDb = false;
                          res.write(`data: ${JSON.stringify({ token: "</think>", is_thinking: true })}\n\n`);
                        }
                        currentReply += cleanToken;
                        res.write(`data: ${JSON.stringify({ token: cleanToken, is_thinking: false })}\n\n`);
                      }
                    toolDetectionBuffer = ""; // Token already sent to frontend
                    }
                  }
                } else {
                  // TRYB NARZĘDZIA: Akumuluj token i szukaj domknięcia
                  currentReply += cleanToken;

                  if (currentReply.includes(`</${toolType}>`)) {
                    toolDetected = true;
                    // Wyciągnij zawartość między tagami
                    const tagOpen = `<${toolType}>`;
                    const tagClose = `</${toolType}>`;
                    const openIdx = currentReply.indexOf(tagOpen);
                    const closeIdx = currentReply.indexOf(tagClose);
                    if (openIdx !== -1 && closeIdx > openIdx) {
                      toolBuffer = currentReply.substring(openIdx + tagOpen.length, closeIdx);
                    }
                    break;
                  }
                }
              }
            } catch (e) { console.warn('[STREAM PARSE ERROR]', e); }
          }
        }
        if (toolDetected) break;
      }


      // Flush llmDebugBuffer na koniec streamingu
      if (llmDebugBuffer.mode === "reasoning" && llmDebugBuffer.reasoning) {
        console.log("[LLM_REASONING]", llmDebugBuffer.reasoning);
        try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_REASONING] " + llmDebugBuffer.reasoning + String.fromCharCode(10));}catch(e){}
        llmDebugBuffer.reasoning = "";
      }
      if (llmDebugBuffer.mode === "content" && llmDebugBuffer.content) {
        console.log("[LLM_CONTENT]", llmDebugBuffer.content);
        try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_CONTENT] " + llmDebugBuffer.content + String.fromCharCode(10));}catch(e){}
        llmDebugBuffer.content = "";
      }

      // =========================================================================
      // POPRAWKA ANTY-ZAMRAŻANIA + CZYSZCZENIE PO WYJŚCIU Z CHUNKÓW
      // =========================================================================
      if (startedThinkingInDb && !currentReply.includes("</think>")) currentReply += "</think>";

      // Flush pozostałości bufora wykrywania (jeśli nie było tagu narzędzia)
      if (!toolType && toolDetectionBuffer.length > 0) {
        res.write(`data: ${JSON.stringify({ token: toolDetectionBuffer, is_thinking: false })}\n\n`);
        currentReply += toolDetectionBuffer;
        toolDetectionBuffer = "";
      }

      if (toolType && !toolDetected) {
        // AWARYJNA SYTUACJA: Model zaczął pisać narzędzie, ale strumień dobiegł końca (np. EOF / max_tokens).
        // Wyciągamy to co napisał i natychmiast fluszujemy do użytkownika jako finalną treść!
        // Najpierw wyślij tekst przed tagiem narzędzia
        const parts = currentReply.split(`<${toolType}>`);
        if (parts[0] && parts[0].trim()) {
          res.write(`data: ${JSON.stringify({ token: parts[0], is_thinking: false })}\n\n`);
        }
        const remainingText = parts[1] || "";
        if (remainingText.trim() !== "") {
          res.write(`data: ${JSON.stringify({ token: remainingText, is_thinking: false })}\n\n`);
        }
        toolType = null; // Unieważniamy zablokowane narzędzie, bo proces generowania dobiegł końca
      }

      // Czyścimy odpowiedź asystenta: zastępujemy surowe tagi narzędzi czytelnym opisem,
      // żeby model nie próbował ponownie wykonać tego samego narzędzia w następnej iteracji
      let cleanAssistantReply = currentReply
        .replace(/<search>[\s\S]*?<\/search>/gi, `[Wykonano wyszukiwanie: "${toolBuffer ? toolBuffer.trim() : ''}"]`)
        .replace(/<read_url>[\s\S]*?<\/read_url>/gi, '[Odczytano stronę]')
        .replace(/<write_file>[\s\S]*?<\/write_file>/gi, '[Zapisano plik]');
      messagesForModel.push({ role: 'assistant', content: cleanAssistantReply });
      fullBotReply += currentReply;

      if (toolDetected) {
        toolCallCount++;
        agentToolCalls++;
        agentSteps++;
        let toolResult = "";
        let agentLog = "";

        if (toolType === "search") {
          const query = toolBuffer.trim();
          agentLog = `[AGENT: Odpalam moduł: search...]\n[AGENT: Głębokie wyszukiwanie frazy: '${query}'...]`;
          res.write(`data: ${JSON.stringify({ token: `\n[AGENT: Głębokie wyszukiwanie frazy: '${query}'...]\n`, is_thinking: true })}\n\n`);
          toolResult = await searchInternet(query);
        } else if (toolType === "read_url") {
          const url = toolBuffer.trim();
          agentLog = `[AGENT: Odpalam moduł: read_url...]\n[AGENT: Skanowanie treści strony: '${url}'...]`;
          res.write(`data: ${JSON.stringify({ token: `\n[AGENT: Skanowanie treści strony: '${url}'...]\n`, is_thinking: true })}\n\n`);
          toolResult = await readUrl(url);
        } else if (toolType === "write_file") {
          const parts = toolBuffer.split("|");
          if (parts.length >= 2) {
            const filename = parts[0].trim();
            const content = parts.slice(1).join("|").trim();
            agentLog = `[AGENT: Odpalam moduł: write_file...]\n[AGENT: Archiwizacja notatek w ${filename}...]`;
            res.write(`data: ${JSON.stringify({ token: `\n[AGENT: Archiwizacja notatek w ${filename}...]\n`, is_thinking: true })}\n\n`);
            toolResult = await writeResearchFile(filename, content);
          } else {
            toolResult = "Błąd formatu zapisu pliku.";
          }
        }

        // Zapisujemy logi agenta jako proces myślowy, aby nie znikały po odświeżeniu strony!
        if (agentLog) {
          fullBotReply += `\n<think>${agentLog}</think>\n`;
        }

        messagesForModel.push({
          role: 'user',
          content: `[SYSTEM NOTIFICATION - TOOL RESULT]:\n${toolResult}\n\nPrzeanalizuj te dane. Jeśli potrzebujesz więcej szczegółów, wykonaj kolejny krok wyszukiwania. Jeśli masz komplet danych, sformułuj ostateczną odpowiedź.`
        });

        // Wygaszono clear slota by zapobiec 501 Not Implemented
        // try { await fetch(`${llamaUrl}/slots/${targetSlot}?action=clear`, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } }); } catch (e) { }

      } else {
        finalAnswerReached = true;
      }

      // Jeśli osiągnęliśmy limit narzędzi, wymuszamy ostateczną odpowiedź bez używania kolejnych narzędzi
      if (!finalAnswerReached && toolCallCount >= 5 && !forceFinalAnswer) {
        messagesForModel.push({
          role: 'user',
          content: '[SYSTEM: Osiągnięto maksymalny limit wyszukiwań. Podsumuj to, co już wiesz i udziel ostatecznej odpowiedzi. ZABRANIA SIĘ UŻYWANIA KOLEJNYCH NARZĘDZI.]'
        });
        forceFinalAnswer = true;
      } else if (!finalAnswerReached && toolCallCount >= 6) {
        // Zabezpieczenie awaryjne, wymuszone wyjście
        finalAnswerReached = true;
      }
    } // koniec while petli

    // Koniec pętli - czyścimy tylko usterki interfejsu (nie usuwamy myśli z bazy, to pozwala frontowi archiwizować)
    fullBotReply = fullBotReply.replace(/\[Budget reached:.*?\]/gi, '')
      .replace(/Reasoning summarized.*/gi, '');

    // ===== METADANE ODPOWIEDZI (do tooltipa na froncie) =====
    const totalTimeMs = Date.now() - startTime;
    const thinkingBlocks = (fullBotReply.match(/<think>/g) || []).length;
    const botTextOnly = fullBotReply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Estymacja tokenów: usuń wrapper tagów <think> ale zachowaj treść myślenia
    const llmContent = fullBotReply.replace(/<\/?think>/g, '').trim();
    totalTokensGenerated = Math.round(llmContent.length / 4);
    
    const metadataObj = {
      total_time_sec: (totalTimeMs / 1000).toFixed(1),
      tokens_per_second: totalTimeMs > 0 ? Math.round((totalTokensGenerated / totalTimeMs) * 1000) : 0,
      tokens_generated: totalTokensGenerated,
      agent_steps: agentSteps,
      agent_tool_calls: agentToolCalls,
      web_search_enabled: web_search === true || web_search === 'true',
      bot_text_length: botTextOnly.length,
      thinking_blocks: thinkingBlocks
    };
    
    if (fullBotReply.trim().length > 0 && !no_history) {
      await pool.query(
        'INSERT INTO chat_history (user_id, thread_id, sender, message, metadata) VALUES ($1, $2, $3, $4, $5)',
        [userId, thread_id, 'bot', fullBotReply.trim(), JSON.stringify(metadataObj)]
      );
    }
    
    res.write(`data: ${JSON.stringify({
      is_metadata: true,
      ...metadataObj
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("[STREAM ERROR]:", error.message);
    res.write(`data: ${JSON.stringify({ error: "Błąd komunikacji z modelem." })}\n\n`);
    res.end();
  }
});

// ========================================================
// ADMIN ENDPOINTS
// ========================================================

// GET /api/admin/users - Pobranie listy wszystkich użytkowników
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Sprawdź czy user jest adminem
    const userCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    if (!userCheck.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, error: "Brak uprawnień" });
    }

    const result = await pool.query(
      'SELECT id, username, is_admin, created_at, (SELECT MAX(created_at) FROM chat_history WHERE user_id = users.id) as last_active FROM users ORDER BY created_at DESC'
    );
    
    res.json({ 
      success: true, 
      users: result.rows.map(u => ({
        id: u.id,
        username: u.username,
        is_admin: u.is_admin,
        created_at: u.created_at,
        last_active: u.last_active ? new Date(u.last_active).toLocaleString('pl-PL') : 'Nigdy'
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/create-user - Dodaj nowego użytkownika
app.post('/api/admin/create-user', authenticateToken, async (req, res) => {
  try {
    // Sprawdź czy user jest adminem
    const userCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    if (!userCheck.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, error: "Brak uprawnień" });
    }

    const { username, password, is_admin } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Brakuje danych" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, hashedPassword, is_admin || false]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: "Użytkownik już istnieje" });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// PUT /api/admin/toggle-admin/:userId - Zmień status admina
app.put('/api/admin/toggle-admin/:userId', authenticateToken, async (req, res) => {
  try {
    // Sprawdź czy user jest adminem
    const userCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    if (!userCheck.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, error: "Brak uprawnień" });
    }

    const { userId } = req.params;
    const { is_admin } = req.body;
    
    const result = await pool.query(
      'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, username, is_admin',
      [is_admin, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Użytkownik nie znaleziony" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error toggling admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/delete-user/:userId - Usuń użytkownika
app.delete('/api/admin/delete-user/:userId', authenticateToken, async (req, res) => {
  try {
    // Sprawdź czy user jest adminem
    const userCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    if (!userCheck.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, error: "Brak uprawnień" });
    }

    const { userId } = req.params;
    
    // Usuń wszystkie rozmowy i historię
    await pool.query('DELETE FROM chat_history WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM chat_threads WHERE user_id = $1', [userId]);
    
    // Usuń użytkownika
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Użytkownik nie znaleziony" });
    }

    res.json({ success: true, message: "Użytkownik usunięty" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================
// DELETE /api/chat/messages/:id - Usuwa pojedynczą wiadomość (weryfikacja właściciela)
// ========================================================
app.delete('/api/chat/messages/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    // Sprawdź czy wiadomość należy do tego użytkownika
    const check = await pool.query(
      'SELECT id FROM chat_history WHERE id = $1 AND user_id = $2',
      [messageId, req.user.userId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: "Nie znaleziono wiadomości lub brak uprawnień." });
    }
    await pool.query('DELETE FROM chat_history WHERE id = $1', [messageId]);
    res.json({ success: true, message: "Wiadomość usunięta." });
  } catch (err) {
    console.error('[DELETE MESSAGE ERROR]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// POST /api/chat/regenerate - Regeneruje ostatnią odpowiedź bota
// 1. Usuwa ostatnią wiadomość bota
// 2. Streamuje nową odpowiedź (bez ponownego zapisywania promptu użytkownika)
// ========================================================
app.post('/api/chat/regenerate', authenticateToken, async (req, res) => {
  const { thread_id, temperature, top_p, max_tokens, repeat_penalty, top_k, min_p, reasoning_budget, web_search, system_prompt } = req.body;
  const userId = req.user.userId;
  const llamaUrl = process.env.LLAMA_SERVER_URL;

  if (!thread_id) {
    return res.status(400).json({ success: false, error: "Brak thread_id." });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const startTime = Date.now();
  let totalTokensGenerated = 0;
  let agentToolCalls = 0;
  let agentSteps = 0;

  try {
    // KROK 1: Znajdź i usuń ostatnią wiadomość bota
    const lastBotResult = await pool.query(
      'SELECT id FROM chat_history WHERE user_id = $1 AND thread_id = $2 AND sender = $3 ORDER BY created_at DESC LIMIT 1',
      [userId, thread_id, 'bot']
    );

    if (lastBotResult.rows.length > 0) {
      await pool.query('DELETE FROM chat_history WHERE id = $1', [lastBotResult.rows[0].id]);
    }

    // KROK 2: Pobierz historię (bez usuniętej odpowiedzi bota)
    const historyResult = await pool.query(
      'SELECT sender, message FROM chat_history WHERE user_id = $1 AND thread_id = $2 ORDER BY created_at ASC LIMIT 15',
      [userId, thread_id]
    );

    // KROK 3: Znajdź ostatni prompt użytkownika
    let lastUserPrompt = null;
    for (let i = historyResult.rows.length - 1; i >= 0; i--) {
      if (historyResult.rows[i].sender === 'user') {
        lastUserPrompt = historyResult.rows[i].message;
        break;
      }
    }

    if (!lastUserPrompt) {
      res.write(`data: ${JSON.stringify({ error: "Brak promptu użytkownika do regeneracji." })}\n\n`);
      return res.end();
    }

    res.write(`data: ${JSON.stringify({ token: "♻️ Regeneruję odpowiedź...\n", is_thinking: true })}\n\n`);

    // KROK 4: Zbuduj messagesForModel
    const currentBudget = typeof reasoning_budget !== 'undefined' ? parseInt(reasoning_budget) : 512;
    let budgetInstruction = "";
    if (currentBudget === 0) {
      budgetInstruction = "\n\n[CRITICAL DIRECTIVE: DO NOT USE ANY THINKING BLOCKS or <|think|> tags. Generate the final text response immediately. If you need to use tools like <search>, just output the tool tag directly without thinking.]";
    } else if (currentBudget < 256) {
      budgetInstruction = `\n\n[SYSTEM GUIDELINE: Keep your inner reasoning phase extremely concise and brief, under ${currentBudget} words.]`;
    }

    const wymagaInternetu = (web_search === true || web_search === 'true');

    let activeSystemPrompt = (system_prompt || "") + budgetInstruction;

    if (wymagaInternetu) {
      const now = new Date();
      const currentYear = now.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', year: 'numeric' });
      const dynamicDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      const dynamicTime = now.toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      activeSystemPrompt += `\n\n[PROTOKÓŁ AUTONOMICZNEGO DEEP RESEARCH]:\nAKTUALNY CZAS SYSTEMOWY: ${dynamicDate} (JEST ROK ${currentYear}), godzina ${dynamicTime} CET/CEST (Czas Warszawski).\nZawsze uwzględniaj tę strefę czasową (Polska) w swoich raportach.\nMasz absolutny dostęp do narzędzi wyszukiwania sieciowego oraz zapisu plików. \n\nJEŚLI URUCHOMIONO TRYB INTERNETOWY, MASZ PRAWO WYKONAĆ DO 5 KROKÓW WYSZUKIWANIA POD RZĄD.\n\nBEZWZGLĘDNA ZASADA WYSZUKIWANIA (CRITICAL DIRECTIVE): \nTwoja wiedza urywa się w przeszłości. Dlatego w swoich zapytaniach do narzędzia <search> ZAWSZE, BEZWYJĄTKOWO musisz wpisywać aktualny rok (${currentYear}) i aktualny miesiąc, chyba że użytkownik wyraźnie pyta o historię. \nKategorycznie ZABRANIA SIĘ wpisywania w tag <search> lat ubiegłych (np. 2024, 2025), gdy szukasz \"najnowszych\" lub \"ostatnich\" wydarzeń!\n\nZasady pętli badawczej (ReAct):\n1. W warstwie myślenia (thinking) PRZEPROWADŹ ANALIZĘ i zdecyduj czego szukać.\n2. Po zamknięciu myślenia </think> umieść tag narzędzia w CZYSTEJ linii - bez żadnych innych słów.\n3. Tag narzędzia MUSI być w warstwie odpowiedzi (content), NIGDY w myśleniu.\n4. Wzór: <think>...analiza...</think>\\n<search>zapytanie</search>\n\nDozwolone narzędzia:\n<search>fraza_do_znalezienia</search>\n<read_url>http://link.com</read_url>\n<write_file>nazwa.md|tekst</write_file>\n\n⚠️⚠️⚠️ KLUCZOWA ZASADA ⚠️⚠️⚠️:\nTagi narzędzi MUSZĄ być w \"content\", NIGDY w \"reasoning_content\".\nJeśli umieścisz <search> w myśleniu, system go NIE wykryje.\n\nPrzykład:\n<think>Muszę sprawdzić kurs euro.</think>\n<search>kurs euro PLN 2026</search>\n<think>Mam wyniki, analizuję.</think>\nAktualny kurs euro to...`;
    }

    const messagesForModel = [];
    if (activeSystemPrompt.trim() !== "") {
      messagesForModel.push({ role: "system", content: activeSystemPrompt });
    }

    historyResult.rows.forEach(row => {
      messagesForModel.push({
        role: row.sender === 'user' ? 'user' : 'assistant',
        content: row.message
      });
    });

    // KROK 5: Streamuj z LLM
    const targetSlot = (userId === 1) ? 0 : Math.max(0, ((userId - 2) % 3 + 1));

    let finalAnswerReached = false;
    let toolCallCount = 0;
    let forceFinalAnswer = false;
    
    let fullBotReply = "";

    while (!finalAnswerReached && toolCallCount < 6) {
      const llmStreamController = new AbortController();
      const llmStreamTimeoutId = setTimeout(() => llmStreamController.abort(), 120000);
      const response = await fetch(`${llamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          model: "Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-IQ4_XS.gguf",
          messages: messagesForModel,
          temperature: parseFloat(temperature) || 0.4,
          top_p: parseFloat(top_p) || 0.95,
          max_tokens: parseInt(max_tokens) || 2048,
          repeat_penalty: parseFloat(repeat_penalty) || 1.1,
          top_k: parseInt(top_k) || 40,
          min_p: parseFloat(min_p) || 0.05,
          reasoning_budget: currentBudget,
          slot_id: targetSlot,
          stream: true
        }),
        signal: llmStreamController.signal
      });
      clearTimeout(llmStreamTimeoutId);
    
      let currentReply = "";
      let startedThinkingInDb = false;
      let budgetReached = false;
      let toolDetected = false;
      let toolType = null;
      let toolBuffer = "";
      let toolDetectionBuffer = "";
      let toolTagStartInBuffer = -1;
      let watchBuffer = "";
      let inWatchMode = false;
                          toolDetectionBuffer = "";
    
      const decoder = new TextDecoder();
      const llmDebugBuffer = { reasoning: "", content: "", mode: null };
    
      let leftoverLine = "";
      for await (const chunk of response.body) {
        const textChunk = decoder.decode(chunk);
        const fullText = leftoverLine + textChunk;
        const chunkLines = fullText.split('\n');
        leftoverLine = textChunk.endsWith('\n') ? "" : (chunkLines.pop() || "");
    
        for (const chunkLine of chunkLines) {
          if (chunkLine.startsWith('data: ')) {
            const dataStr = chunkLine.slice(6).trim();
            if (dataStr === '[DONE]') break;
    
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices[0].delta;
              // DEBUG: logowanie do pliku
              if (delta.reasoning_content) {
                if (llmDebugBuffer.mode === "content" && llmDebugBuffer.content) { try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_CONTENT] " + llmDebugBuffer.content + String.fromCharCode(10));}catch(e){} llmDebugBuffer.content = ""; }
                llmDebugBuffer.reasoning += delta.reasoning_content;
                llmDebugBuffer.mode = "reasoning";
              } else if (delta.content) {
                if (llmDebugBuffer.mode === "reasoning" && llmDebugBuffer.reasoning) { try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_REASONING] " + llmDebugBuffer.reasoning + String.fromCharCode(10));}catch(e){} llmDebugBuffer.reasoning = ""; }
                llmDebugBuffer.content += delta.content;
                llmDebugBuffer.mode = "content";
              }
              let tokenText = delta.reasoning_content || delta.content || "";
    
              if (tokenText) {
                if (tokenText.includes("Budget reached") || tokenText.includes("Reasoning summarized")) {
                  budgetReached = true;
                  continue;
                }
    
                let cleanToken = tokenText.replace(/\[Budget reached:.*?\]/gi, '')
                  .replace(/Reasoning summarized.*/gi, '');
    
                if (!cleanToken) continue;
    
                // === UNIWERSALNE WYKRYWANIE TAGÓW NARZĘDZIOWYCH ===
                if (!toolType) {
                  toolDetectionBuffer += cleanToken;
    
                  const searchIdx = toolDetectionBuffer.indexOf("<search>");
                  const writeIdx = toolDetectionBuffer.indexOf("<write_file>");
                  const readIdx = toolDetectionBuffer.indexOf("<read_url>");
    
                  if (searchIdx !== -1 || writeIdx !== -1 || readIdx !== -1) {
                    if (searchIdx !== -1 && (writeIdx === -1 || searchIdx < writeIdx) && (readIdx === -1 || searchIdx < readIdx)) {
                      toolTagStartInBuffer = searchIdx;
                      toolType = "search";
                    } else if (writeIdx !== -1 && (searchIdx === -1 || writeIdx < searchIdx) && (readIdx === -1 || writeIdx < readIdx)) {
                      toolTagStartInBuffer = writeIdx;
                      toolType = "write_file";
                    } else if (readIdx !== -1 && (searchIdx === -1 || readIdx < searchIdx) && (writeIdx === -1 || readIdx < writeIdx)) {
                      toolTagStartInBuffer = readIdx;
                      toolType = "read_url";
                    }
    
                    if (watchBuffer.length > 0) {
                      res.write(`data: ${JSON.stringify({ token: watchBuffer, is_thinking: true })}\n\n`);
                      if (!startedThinkingInDb) { currentReply += "<think>"; startedThinkingInDb = true; }
                      currentReply += watchBuffer;
                      watchBuffer = "";
                    }
                    inWatchMode = false;
    
                    if (startedThinkingInDb) {
                      currentReply += "</think>";
                      startedThinkingInDb = false;
                    }
    
                    res.write(`data: ${JSON.stringify({ token: `\n\n[AGENT: Odpalam moduł: ${toolType}...]\n\n`, is_thinking: true })}\n\n`);
    
                    const toolPortion = toolDetectionBuffer.substring(toolTagStartInBuffer);
                    currentReply += toolPortion;
                    toolDetectionBuffer = "";
                    toolTagStartInBuffer = -1;
    
                    if (currentReply.includes(`</${toolType}>`)) {
                      toolDetected = true;
                      const tagOpen = `<${toolType}>`;
                      const tagClose = `</${toolType}>`;
                      const openIdx = currentReply.indexOf(tagOpen);
                      const closeIdx = currentReply.indexOf(tagClose);
                      if (openIdx !== -1 && closeIdx > openIdx) {
                        toolBuffer = currentReply.substring(openIdx + tagOpen.length, closeIdx);
                      }
                      break;
                    }
                  } else {
                    // === WATCH BUFFER ===
                    const bufEnd = toolDetectionBuffer.length > 25
                      ? toolDetectionBuffer.slice(-25).toLowerCase()
                      : toolDetectionBuffer.toLowerCase();
    
                    const isPotentialToolStart = /(?:<\/?[swr])$/.test(bufEnd) ||
                      /<(?:searc?h?|writ?e?_?f?i?l?e?_?|read?_?u?r?l?)$/.test(bufEnd) ||
                      /^<[swr]/.test(cleanToken);
    
                    if (isPotentialToolStart) {
                      inWatchMode = true;
                      watchBuffer += cleanToken;
    
                      if (delta.reasoning_content && !budgetReached) {
                        if (!startedThinkingInDb) { startedThinkingInDb = true; }
                      } else {
                        if (startedThinkingInDb) { startedThinkingInDb = false; }
                      }
                    } else if (inWatchMode) {
                      watchBuffer += cleanToken;
    
                      if (delta.reasoning_content && !budgetReached) {
                        if (!startedThinkingInDb) { startedThinkingInDb = true; }
                      } else {
                        if (startedThinkingInDb) { startedThinkingInDb = false; }
                      }
    
                      if (watchBuffer.length > 40) {
                        const wbThinking = delta.reasoning_content && !budgetReached;
                        if (wbThinking && !currentReply.includes("<think>")) {
                          currentReply += "<think>";
                        }
                        currentReply += watchBuffer;
                        res.write(`data: ${JSON.stringify({ token: watchBuffer, is_thinking: wbThinking })}\n\n`);
                        watchBuffer = "";
                        inWatchMode = false;
                        toolDetectionBuffer = "";
                      }
                    } else {
                      // === NORMALNY PRZEPŁYW ===
                      const currentIsThinking = delta.reasoning_content && !budgetReached;
    
                      if (currentIsThinking) {
                        if (!startedThinkingInDb) { currentReply += "<think>"; startedThinkingInDb = true; }
                        currentReply += cleanToken;
                        res.write(`data: ${JSON.stringify({ token: cleanToken, is_thinking: true })}\n\n`);
                      } else {
                        if (startedThinkingInDb) {
                          currentReply += "</think>";
                          startedThinkingInDb = false;
                          res.write(`data: ${JSON.stringify({ token: "</think>", is_thinking: true })}\n\n`);
                        }
                        currentReply += cleanToken;
                        res.write(`data: ${JSON.stringify({ token: cleanToken, is_thinking: false })}\n\n`);
                      }
                      toolDetectionBuffer = "";
                    }
                  }
                } else {
                  // === TRYB NARZĘDZIA ===
                  currentReply += cleanToken;
    
                  if (currentReply.includes(`</${toolType}>`)) {
                    toolDetected = true;
                    const tagOpen = `<${toolType}>`;
                    const tagClose = `</${toolType}>`;
                    const openIdx = currentReply.indexOf(tagOpen);
                    const closeIdx = currentReply.indexOf(tagClose);
                    if (openIdx !== -1 && closeIdx > openIdx) {
                      toolBuffer = currentReply.substring(openIdx + tagOpen.length, closeIdx);
                    }
                    break;
                  }
                }
              }
            } catch (e) { console.warn('[STREAM PARSE ERROR]', e); }
          }
        }
        if (toolDetected) break;
      }
    
      // Flush llmDebugBuffer
      if (llmDebugBuffer.mode === "reasoning" && llmDebugBuffer.reasoning) {
        try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_REASONING] " + llmDebugBuffer.reasoning + String.fromCharCode(10));}catch(e){}
        llmDebugBuffer.reasoning = "";
      }
      if (llmDebugBuffer.mode === "content" && llmDebugBuffer.content) {
        try{require("fs").appendFileSync(path.join(__dirname, "logs", "debug_llm.log"), "[LLM_CONTENT] " + llmDebugBuffer.content + String.fromCharCode(10));}catch(e){}
        llmDebugBuffer.content = "";
      }
    
      // POPRAWKA ANTY-ZAMRAŻANIA
      if (startedThinkingInDb && !currentReply.includes("</think>")) currentReply += "</think>";
    
      // Flush toolDetectionBuffer jesli nie bylo tagu
      if (!toolType && toolDetectionBuffer.length > 0) {
        res.write(`data: ${JSON.stringify({ token: toolDetectionBuffer, is_thinking: false })}\n\n`);
        currentReply += toolDetectionBuffer;
        toolDetectionBuffer = "";
      }
    
      // AWARYJNA SYTUACJA: tool tag bez domkniecia
      if (toolType && !toolDetected) {
        const parts = currentReply.split(`<${toolType}>`);
        if (parts[0] && parts[0].trim()) {
          res.write(`data: ${JSON.stringify({ token: parts[0], is_thinking: false })}\n\n`);
        }
        const remainingText = parts[1] || "";
        if (remainingText.trim() !== "") {
          res.write(`data: ${JSON.stringify({ token: remainingText, is_thinking: false })}\n\n`);
        }
        toolType = null;
      }
    
      // Czyscimy odpowiedz asystenta do petli
      let cleanAssistantReply = currentReply
        .replace(/<search>[\s\S]*?<\/search>/gi, `[Wykonano wyszukiwanie: "${toolBuffer ? toolBuffer.trim() : ''}"]`)
        .replace(/<read_url>[\s\S]*?<\/read_url>/gi, '[Odczytano stronę]')
        .replace(/<write_file>[\s\S]*?<\/write_file>/gi, '[Zapisano plik]');
      messagesForModel.push({ role: 'assistant', content: cleanAssistantReply });
      fullBotReply += currentReply;
    
      if (toolDetected) {
        toolCallCount++;
        agentToolCalls++;
        agentSteps++;
        let toolResult = "";
        let agentLog = "";
    
        if (toolType === "search") {
          const query = toolBuffer.trim();
          agentLog = `[AGENT: Odpalam moduł: search...]\n[AGENT: Głębokie wyszukiwanie frazy: '${query}'...]`;
          res.write(`data: ${JSON.stringify({ token: `\n[AGENT: Głębokie wyszukiwanie frazy: '${query}'...]\n`, is_thinking: true })}\n\n`);
          toolResult = await searchInternet(query);
        } else if (toolType === "read_url") {
          const url = toolBuffer.trim();
          agentLog = `[AGENT: Odpalam moduł: read_url...]\n[AGENT: Skanowanie treści strony: '${url}'...]`;
          res.write(`data: ${JSON.stringify({ token: `\n[AGENT: Skanowanie treści strony: '${url}'...]\n`, is_thinking: true })}\n\n`);
          toolResult = await readUrl(url);
        } else if (toolType === "write_file") {
          const parts = toolBuffer.split("|");
          if (parts.length >= 2) {
            const filename = parts[0].trim();
            const content = parts.slice(1).join("|").trim();
            agentLog = `[AGENT: Odpalam moduł: write_file...]\n[AGENT: Archiwizacja notatek w ${filename}...]`;
            res.write(`data: ${JSON.stringify({ token: `\n[AGENT: Archiwizacja notatek w ${filename}...]\n`, is_thinking: true })}\n\n`);
            toolResult = await writeResearchFile(filename, content);
          } else {
            toolResult = "Błąd formatu zapisu pliku.";
          }
        }
    
        if (agentLog) {
          fullBotReply += `\n<think>${agentLog}</think>\n`;
        }
    
        messagesForModel.push({
          role: 'user',
          content: `[SYSTEM NOTIFICATION - TOOL RESULT]:\n${toolResult}\n\nPrzeanalizuj te dane. Jeśli potrzebujesz więcej szczegółów, wykonaj kolejny krok wyszukiwania. Jeśli masz komplet danych, sformułuj ostateczną odpowiedź.`
        });
    
      } else {
        finalAnswerReached = true;
      }
    
      if (!finalAnswerReached && toolCallCount >= 5 && !forceFinalAnswer) {
        messagesForModel.push({
          role: 'user',
          content: '[SYSTEM: Osiągnięto maksymalny limit wyszukiwań. Podsumuj to, co już wiesz i udziel ostatecznej odpowiedzi. ZABRANIA SIĘ UŻYWANIA KOLEJNYCH NARZĘDZI.]'
        });
        forceFinalAnswer = true;
      } else if (!finalAnswerReached && toolCallCount >= 6) {
        finalAnswerReached = true;
      }
    } // koniec while petli
    
    // Koniec petli
    fullBotReply = fullBotReply.replace(/\[Budget reached:.*?\]/gi, '')
      .replace(/Reasoning summarized.*/gi, '')
      .replace(/<search>[\s\S]*?<\/search>/gi, '')
      .replace(/<read_url>[\s\S]*?<\/read_url>/gi, '')
      .replace(/<write_file>[\s\S]*?<\/write_file>/gi, '')
      .replace(/\[AGENT:[^\]]+\]/gi, '')
      .trim();
    fullBotReply = fullBotReply.replace(/\[Budget reached:.*?\]/gi, '')
      .replace(/Reasoning summarized.*/gi, '')
      // Usuń tagi narzędzi agenta — regeneracja nie obsługuje tool execution
      .replace(/<search>[\s\S]*?<\/search>/gi, '')
      .replace(/<read_url>[\s\S]*?<\/read_url>/gi, '')
      .replace(/<write_file>[\s\S]*?<\/write_file>/gi, '')
      .replace(/\[AGENT:[^\]]+\]/gi, '')
      .trim();

    // KROK 6: Zapisz nową odpowiedź bota
    const totalTimeMs = Date.now() - startTime;
    const thinkingBlocks = (fullBotReply.match(/<think>/g) || []).length;
    const botTextOnly = fullBotReply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const llmContent = fullBotReply.replace(/<\/?think>/g, '').trim();
    totalTokensGenerated = Math.round(llmContent.length / 4);

    const metadataObj = {
      total_time_sec: (totalTimeMs / 1000).toFixed(1),
      tokens_per_second: totalTimeMs > 0 ? Math.round((totalTokensGenerated / totalTimeMs) * 1000) : 0,
      tokens_generated: totalTokensGenerated,
      agent_steps: agentSteps,
      agent_tool_calls: agentToolCalls,
      bot_text_length: botTextOnly.length,
      thinking_blocks: thinkingBlocks
    };

    if (fullBotReply.trim().length > 0) {
      const insertResult = await pool.query(
        'INSERT INTO chat_history (user_id, thread_id, sender, message, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [userId, thread_id, 'bot', fullBotReply.trim(), JSON.stringify(metadataObj)]
      );
      // Wyślij ID nowej wiadomości, żeby frontend mógł je zapamiętać
      res.write(`data: ${JSON.stringify({ regenerated_message_id: insertResult.rows[0].id })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({
      is_metadata: true,
      ...metadataObj
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("[REGENERATE ERROR]:", error.message);
    res.write(`data: ${JSON.stringify({ error: "Błąd regeneracji odpowiedzi." })}\n\n`);
    res.end();
  }
});

// FUNKCJA GENEROWANIA TYTUŁU CZATU (3-4 SŁOWA)
// Przyjmuje opcjonalny slotId, żeby nie kolidować z zajętymi slotami LLM
async function generateChatTitle(userPrompt, botResponse, slotId) {
  try {
    const llamaUrl = process.env.LLAMA_SERVER_URL;
    const body = {
      model: "Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-IQ4_XS.gguf",
      messages: [
        {
          role: "system",
          content: "Jesteś asystentem do generowania tytułów. Na podstawie pytania użytkownika i odpowiedzi bota, wygeneruj krótki tytuł czatu w języku polskim. Tytuł musi mieć dokładnie 3-4 słowa. Odpowiedz TYLKO tytułem, bez żadnych dodatkowych tekstów, cudzysłowów czy wyjaśnień. Nie używaj wielkich liter na początku każdego słowa, tylko pierwsze słowo z wielkiej litery."
        },
        {
          role: "user",
          content: `Pytanie użytkownika: "${userPrompt}"\n\nOdpowiedź bota: "${botResponse.substring(0, 500)}"\n\nWygeneruj tytuł czatu (3-4 słowa):`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
      chat_template_kwargs: { enable_thinking: false },
      stream: false
    };
    
    // Użyj innego slotu niż streaming, żeby uniknąć konfliktu
    if (typeof slotId === 'number') {
      // Dla tytułu użyj slotu o 1 wyższego (zawijając do 0-3)
      body.slot_id = Math.max(0, (slotId + 1) % 4);
    }
    
    const titleController = new AbortController();
    const titleTimeoutId = setTimeout(() => titleController.abort(), 15000); // 15s timeout
    const response = await fetch(`${llamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify(body),
      signal: titleController.signal
    });
    clearTimeout(titleTimeoutId);
    
    if (!response.ok) {
      console.error("[GENERATE TITLE] HTTP error:", response.status);
      return null;
    }
    
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const msg = data.choices[0].message;
      // Z chat_template_kwargs: { enable_thinking: false }, odpowiedź powinna być
      // czystym tytułem bez myślenia. Bierzemy content (lub reasoning_content na wszelki wypadek).
      let raw = (msg.content || msg.reasoning_content || '').trim();
      
      // Usuń bloki <think> gdyby jednak model pomyślał
      raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      
      // Wyciągnij pierwszą linię która nie jest pusta — to powinien być tytuł
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      
      // Sprawdź czy jest linia "Title:" lub "Tytuł:"
      for (const line of lines) {
        const titleMatch = line.match(/^(?:title|tytuł)\s*[:\-]?\s*(.+)/i);
        if (titleMatch) return cleanTitle(titleMatch[1]);
      }
      
      // Weź pierwszą niepustą linię (z myśleniem wyłączonym, to powinien być tytuł)
      if (lines.length > 0) {
        let title = lines[0];
        title = title.replace(/^["'„"']|["'„"']$/g, '').trim();
        if (title.length > 40) title = title.substring(0, 40);
        if (title) return title;
      }
    }
    return null;
  } catch (error) {
    console.error("[GENERATE TITLE ERROR]:", error.message);
    return null;
  }
}

function cleanTitle(str) {
  if (!str) return null;
  let t = str.replace(/^["'„"']|["'„"']$/g, '').trim();
  if (t.length > 40) t = t.substring(0, 40);
  return t || null;
}

// ===== GALLERY ENDPOINTS =====

// GET /api/images/gallery - Pobiera listę obrazków z promptami dla bieżącego użytkownika
app.get('/api/images/gallery', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ch1.message, ch1.created_at, ch1.thread_id,
        (SELECT ch2.message FROM chat_history ch2
         WHERE ch2.user_id = $1 AND ch2.thread_id = ch1.thread_id
           AND ch2.sender = 'user' AND ch2.created_at < ch1.created_at
         ORDER BY ch2.created_at DESC LIMIT 1) as user_prompt
       FROM chat_history ch1
       WHERE ch1.user_id = $1 AND ch1.sender = 'bot' AND ch1.message LIKE '%/outputs/%'
       ORDER BY ch1.created_at DESC`,
      [req.user.userId]
    );
    
    const images = [];
    const seen = new Set();
    
    result.rows.forEach(row => {
      const imgRegex = /!\[.*?\]\((\/outputs\/[^)]+)\)/g;
      let match;
      while ((match = imgRegex.exec(row.message)) !== null) {
        const url = match[1];
        if (!seen.has(url)) {
          seen.add(url);
          let prompt = (row.user_prompt || '').trim();
          images.push({ url, prompt });
        }
      }
    });
    
    res.json({ success: true, images });
  } catch (err) {
    console.error('[GALLERY ERROR]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/images/delete-all - Usuwa wszystkie obrazki bieżącego użytkownika
app.delete('/api/images/delete-all', authenticateToken, async (req, res) => {
  try {
    // Pobierz wszystkie obrazki usera
    const result = await pool.query(
      `SELECT message FROM chat_history WHERE user_id = $1 AND sender = 'bot' AND message LIKE '%/outputs/%'`,
      [req.user.userId]
    );
    
    const deletedFiles = [];
    const outputsDir = path.join(__dirname, 'public', 'outputs');
    
    result.rows.forEach(row => {
      const imgRegex = /!\[.*?\]\((\/outputs\/([^)]+))\)/g;
      let match;
      while ((match = imgRegex.exec(row.message)) !== null) {
        const filename = match[2];
        const filePath = path.join(outputsDir, filename);
        deletedFiles.push(filePath);
      }
    });
    
    // Usuń pliki
    for (const filePath of deletedFiles) {
      try { await fs.unlink(filePath); } catch (e) { /* plik już nie istnieje */ }
    }
    
    // Usuń wiadomości bot zawierające obrazki (tylko dla tego usera)
    await pool.query(
      `DELETE FROM chat_history WHERE user_id = $1 AND sender = 'bot' AND message LIKE '%/outputs/%'`,
      [req.user.userId]
    );
    
    res.json({ success: true, deleted: deletedFiles.length });
  } catch (err) {
    console.error('[DELETE USER IMAGES ERROR]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/images/delete-all - Admin: usuwa WSZYSTKIE obrazki z outputs
app.delete('/api/admin/images/delete-all', authenticateToken, async (req, res) => {
  try {
    const userCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
    if (!userCheck.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, error: 'Brak uprawnień admina' });
    }
    
    const outputsDir = path.join(__dirname, 'public', 'outputs');
    let deletedCount = 0;
    
    try {
      const files = await fs.readdir(outputsDir);
      for (const file of files) {
        try {
          await fs.unlink(path.join(outputsDir, file));
          deletedCount++;
        } catch (e) { /* skip */ }
      }
    } catch (e) { /* katalog nie istnieje */ }
    
    // Usuń WSZYSTKIE wiadomości bot z obrazkami (dla wszystkich userów)
    await pool.query(`DELETE FROM chat_history WHERE sender = 'bot' AND message LIKE '%/outputs/%'`);
    
    res.json({ success: true, deleted: deletedCount });
  } catch (err) {
    console.error('[ADMIN DELETE ALL IMAGES ERROR]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ENDPOINT GENEROWANIA TYTUŁU CZATU
app.post('/api/chat/namesuggest', authenticateToken, async (req, res) => {
  const { thread_id, user_prompt, bot_response } = req.body;
  
  if (!thread_id || !user_prompt || !bot_response) {
    return res.status(400).json({ success: false, error: "Brak wymaganych danych." });
  }
  
  try {
    // Oblicz slot tak samo jak w streamingu, żeby uniknąć kolizji
    const userId = req.user.userId;
    const targetSlot = (userId === 1) ? 0 : Math.max(0, ((userId - 2) % 3 + 1));
    
    const title = await generateChatTitle(user_prompt, bot_response, targetSlot);
    
    if (title) {
      // Aktualizuj tytuł w bazie danych
      await pool.query(
        'UPDATE chat_threads SET title = $1 WHERE id = $2 AND user_id = $3',
        [title, thread_id, userId]
      );
      res.json({ success: true, title });
    } else {
      res.json({ success: false, error: "Nie udało się wygenerować tytułu." });
    }
  } catch (error) {
    console.error("[NAME SUGGEST ERROR]:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PROSTY ENDPOINT DO ZAPISU TYTUŁU CZATU (używany przez fallback tytułu) =====
// Nie wymaga LLM — po prostu zapisuje podany tytuł do bazy
app.put('/api/chat/threads/:id/title', authenticateToken, async (req, res) => {
  const { title } = req.body;
  const threadId = parseInt(req.params.id);
  
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: "Tytuł nie może być pusty." });
  }
  
  try {
    // Weryfikacja czy wątek należy do tego użytkownika
    const check = await pool.query('SELECT id FROM chat_threads WHERE id = $1 AND user_id = $2', [threadId, req.user.userId]);
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: "Brak uprawnień do modyfikacji tej rozmowy." });
    }
    
    await pool.query('UPDATE chat_threads SET title = $1 WHERE id = $2', [title.trim().slice(0, 255), threadId]);
    res.json({ success: true, title: title.trim().slice(0, 255) });
  } catch (error) {
    console.error("[TITLE UPDATE ERROR]:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT LISTY CHECKPOINTÓW DLA QUICK =====
app.get('/api/image/checkpoints', authenticateToken, async (req, res) => {
  const ngrokBaseUrl = process.env.HOME_GPU_URL ? process.env.HOME_GPU_URL.replace(/\/$/, "") : "";
  
  try {
    if (ngrokBaseUrl) {
      // Spróbuj pobrać listę checkpointów z domowego GPU
      const response = await fetch(`${ngrokBaseUrl}/checkpoints`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.checkpoints && Array.isArray(data.checkpoints)) {
          return res.json({ success: true, checkpoints: data.checkpoints });
        }
      }
    }
  } catch (e) {
    console.warn('[CHECKPOINTS] Nie udało się pobrać z GPU:', e.message);
  }
  
  // Fallback: zwróć domyślną listę checkpointów (Twoje faktyczne pliki na RTX)
  res.json({
    success: true,
    checkpoints: [
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
    ]
  });
});

// URUCHOMIENIE SERWERA NA PORCIE 3000
// ===== DEBUG ENDPOINT DLA LOGOW FRONTENDU =====
app.post("/api/debug/frontend-log", async (req, res) => {
  try {
    const body = req.body;
  console.log("[FE_LOG]", JSON.stringify(body));
  
    const logLine = "[DEBUG_FE_TOKEN] " + new Date().toISOString() + " " + JSON.stringify(body) + "\n";
    fs.appendFile(path.join(__dirname, "logs", "debug_frontend.log"), logLine).catch(e => {});
    res.json({ ok: true });
  } catch(e) {
    res.json({ ok: false, error: e.message });
  }
});

app.listen(3000, () => {
  console.log("=====================================================");
  console.log(" PAN Pancerny Serwer API nasłuchuje na porcie 3000   ");
  console.log("=====================================================");
});