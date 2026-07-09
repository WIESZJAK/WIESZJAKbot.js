// ===== image-helpers.js — Funkcje pomocnicze dla generatora obrazów =====
// Ładowany przed app.js w chat.html jako zwykły script (nie moduł).
// Funkcje są deklarowane globalnie, więc są dostępne z app.js.

// ===== AUTO-DETEKCJA INTENCJI OBRAZU =====
// Sprawdza czy prompt użytkownika zawiera słowa sugerujące chęć wygenerowania obrazu
function checkUserWantsImage(userPrompt) {
    const lower = userPrompt.toLowerCase().trim();
    
    // 1. Silna negacja na początku lub przed kluczowym słowem
    const negations = ['nie ', 'przestań', 'przestan', 'stop', 'nie chcę', 'nie chce', 'bez ', 'żadnych', 'zadnych'];
    if (negations.some(n => lower.startsWith(n))) return false;
    // Specyficzny przypadek "nie generuj", "nie rób" w środku zdania
    if (/\bnie\s+(generuj|wygeneruj|stwórz|stworz|zrób|zrob|rysuj|narysuj|pokaż|pokaz)\b/.test(lower)) return false;

    // 2. Grupy słów kluczowych
    const directCommands = ['wygeneruj', 'generuj', 'stwórz', 'stworz', 'utwórz', 'utworz', 'renderuj', 'stwarz', 'narysuj', 'namaluj'];
    const softCommands = ['zrób', 'zrob', 'daj', 'pokaż', 'pokaz', 'narysuj', 'strzel'];
    const nouns = [
        'obrazek', 'obraz', 'obrazka', 'obrazki', 'obrazy',
        'zdjęcie', 'zdjecie', 'foto', 'fotkę', 'fotke', 'fotografia',
        'grafikę', 'grafike',
        'render', 'rendera',
        'rysunek', 'ilustrację', 'ilustracje', 'ilustracja',
        'portret', 'pejzaż', 'widok'
    ];

    // Szybki test: Jeśli jest bezpośredni rozkaz (wygeneruj, stwórz), to prawie na pewno chcemy obraz
    if (directCommands.some(kw => lower.includes(kw))) return true;

    // Test rzeczowników i miękkich poleceń (z użyciem \b dla precyzji)
    const hasNoun = nouns.some(kw => new RegExp(`\\b${kw}`, 'i').test(lower));
    const hasSoftCommand = softCommands.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower));

    if (hasNoun) {
        // "zrób zdjęcie", "pokaż obrazek" -> TAK
        if (hasSoftCommand) return true;
        // Krótki prompt zaczynający się od rzeczownika, np. "zdjęcie kota" -> TAK
        if (lower.length < 40 && nouns.some(kw => lower.startsWith(kw))) return true;
    }

    // Jeśli użytkownik używa samego "zrób" / "zrob" bez rzeczownika obrazkowego,
    // to może to być prośba o coś innego (np. "zrób to lepiej"), więc ignorujemy
    // CHYBA że prompt jest bardzo krótki i sugeruje akcję, np. "zrób kota"
    if (hasSoftCommand && lower.length < 15) return true;

    return false;
}

// ===== TŁUMACZENIE PROMPTU PRZEZ LLM (LEKKIE ZAPYTANIE) =====
// Używa osobnego, szybkiego zapytania do LLM bez reasoningu
// żeby przetłumaczyć polski prompt na angielski + rozbudować kreatywnie.
// Wymaga window.apiCall (ustawianego w app.js) oraz threadId.
async function translatePromptToEnglish(polishPrompt, signal, threadId) {
    try {
        const response = await window.apiCall('/ask-llama-stream', {
            method: 'POST',
            signal, // przekaż sygnał abort dla możliwości anulowania
            body: JSON.stringify({
                prompt: `[SYSTEM: You are an expert AI image prompt engineer. Look at our conversation history. The user wants to generate a new image or modify the previous one. Their new instruction is: "${polishPrompt}".\nTask: Create a highly detailed, professional English prompt for an AI image generator. If the user refers to a previous idea (e.g. "with a brighter background", "generate this again"), combine the previous context with their new instruction to make a complete, standalone prompt.\nReturn ONLY the final English prompt. No explanations, no quotes.]\n\nEnglish Prompt:`,
                thread_id: threadId,
                temperature: 0.8,
                max_tokens: 300,
                reasoning_budget: 0,
                web_search: false,
                no_history: true // Nie zapisuj tego do historii czatu
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

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
                        // Pobieraj tylko faktyczne tokeny odpowiedzi, pomijaj proces myślowy/statusy
                        if (parsed.token && !parsed.is_thinking) {
                            result += parsed.token;
                        }
                    } catch(e) {}
                }
            }
        }

        const cleaned = result.replace(/<[^>]*>/g, '').trim();
        return cleaned || polishPrompt; // fallback do oryginału
    } catch (e) {
        if (e.name === 'AbortError') {
            console.log('[TRANSLATE] Aborted by user');
            return null; // anulowano
        }
        console.error('[TRANSLATE ERROR]', e);
        return polishPrompt; // fallback
    }
}

// ===== WYCIĄGNIĘCIE TEMATU Z PROMPTU UŻYTKOWNIKA =====
// Usuwa słowa triggerujące (wygeneruj, stwórz, obrazek itp.)
// i zwraca samą treść. Jeśli wynik jest za krótki, próbuje
// wyciągnąć opisowy fragment z odpowiedzi bota.
function extractSubject(userPrompt, botResponse) {
    let subject = userPrompt
        .replace(/^(wygeneruj|generuj|stwórz|stworz|zrób|zrob|utwórz|utworz|stwarz)\s*(mi|dla mnie)?\s*(obrazek|obraz|zdjęcie|grafikę|render|rysunek|ilustrację|ilustracje)?\s*/i, '')
        .replace(/^(daj|pokaż|pokaz|zrob|zrób)\s*(mi)?\s*/i, '')
        .trim();
    
    if (!subject || subject.length < 3 || /^(to|tego|taki|takie|to samo|ten|ta)$/i.test(subject)) {
        const sentences = (botResponse || '').match(/[^.!?]*[.!?]/g) || [];
        const descriptive = sentences.find(s => s.length > 20 && s.length < 200);
        if (descriptive) {
            subject = descriptive.replace(/<[^>]*>/g, '').trim();
        } else {
            subject = userPrompt;
        }
    }
    
    if (subject.length > 300) subject = subject.substring(0, 297) + '...';
    return subject;
}

// ===== ZBUDOWANIE PROMPTU DLA AUTO-IMAGE-BOT =====
// Wyciąga temat z promptu użytkownika (usuwa słowa triggerujące).
// Zwraca goły temat — dalsze opakowanie (tłumaczenie, template)
// odbywa się w app.js przez translatePromptToEnglish i custom prompt.
function buildAutoImagePrompt(userPrompt, botResponse) {
    const subject = extractSubject(userPrompt, botResponse);
    return subject;
}

// Eksport dla testów (w Node.js/Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkUserWantsImage, translatePromptToEnglish, extractSubject, buildAutoImagePrompt };
}
