// ===== chat-helpers.js — Samodzielne funkcje pomocnicze dla czatu =====
// Ładowany przed app.js w chat.html jako zwykły script (nie moduł).
// Funkcje są deklarowane globalnie, więc są dostępne z app.js.

// ===== ZAMKNIJ BLOK MYŚLENIA (spinner → ✔️, zwraca null) =====
// Używane przy: zamknięciu </think>, przejściu do nowego modułu, końcu odpowiedzi
// Opcjonalnie: drugi argument to tekst do wyświetlenia zamiast ✔️
function completeThinkBlock(thinkDetails, doneText = '✔️') {
    if (!thinkDetails) return null;
    const spinner = thinkDetails.querySelector('.thinking-spinner');
    if (spinner) {
        spinner.className = '';
        spinner.style.color = '#10b981';
        spinner.textContent = doneText;
    }
    return null;
}

// ===== AUTOMATYCZNE GENEROWANIE TYTUŁU ROZMOWY =====
// Strategia hybrydowa "meet midway":
// 1. NAJPIERW: wyciągnij pierwsze słowa z odpowiedzi → zapisz od razu (draft, zawsze działa)
// 2. POTEM: spróbuj LLM jako ulepszacz → jeśli działa, nadpisz lepszym tytułem
//
// Dzięki temu:
// - Użytkownik NIGDY nie widzi "Rozmowa z 12:06" po pierwszej odpowiedzi
// - Jeśli LLM jest dostępny, tytuł zostaje ulepszony do lepszej jakości
// - Nie ma blokowania — draft jest natychmiast, LLM jest fire-and-forget
//
// Wymaga przekazania funkcji apiCall oraz obiektów titleElement i onTitleGenerated.
async function generateAutoTitle(threadId, prompt, rawReplyText, { apiCall, titleElement, onTitleGenerated } = {}) {
    if (!threadId || !rawReplyText || rawReplyText.trim().length === 0) return;
    if (!apiCall) return;
    if (!titleElement) return;

    // Jeśli tytuł został już zmieniony (nie zaczyna się od "Rozmowa"), pomiń
    if (!/^Rozmowa/i.test(titleElement.textContent)) return;

    // Wspólne czyszczenie tekstu (używane i w draft, i w LLM)
    const cleanBotText = rawReplyText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<search>[\s\S]*?<\/search>/gi, '')
        .replace(/<read_url>[\s\S]*?<\/read_url>/gi, '')
        .replace(/<write_file>[\s\S]*?<\/write_file>/gi, '')
        .replace(/\[AGENT:[^\]]+\]/gi, '')
        .trim();

    if (!cleanBotText) return;

    // ===== KROK 1: DRAFT — wyciągnij pierwsze 3-4 słowa z odpowiedzi =====
    // Zawsze działa, nie wymaga LLM. Zapisuje tytuł natychmiast.
    const draftTitle = extractFirstWords(cleanBotText, 4);
    if (draftTitle) {
        const formattedTitle = draftTitle.charAt(0).toUpperCase() + draftTitle.slice(1);
        try {
            await apiCall(`/api/chat/threads/${threadId}/title`, {
                method: 'PUT',
                body: JSON.stringify({ title: formattedTitle })
            });
            titleElement.textContent = formattedTitle;
            if (typeof onTitleGenerated === 'function') onTitleGenerated(formattedTitle);
        } catch (e) {
            console.warn('[DRAFT TITLE ERROR]:', e);
        }
    }

    // ===== KROK 2: LLM ENHANCEMENT — opcjonalne ulepszenie tytułu =====
    // Jeśli LLM jest dostępny, może wygenerować lepszy, bardziej naturalny tytuł.
    // Jeśli LLM nie działa — draft już jest zapisany, nic nie tracimy.
    // Krótkie opóźnienie, żeby serwer LLM zdążył ochłonąć po streamingu
    const LLM_DELAY_MS = 1500;
    await new Promise(resolve => setTimeout(resolve, LLM_DELAY_MS));
    
    try {
        const res = await apiCall('/api/chat/namesuggest', {
            method: 'POST',
            body: JSON.stringify({
                thread_id: threadId,
                user_prompt: prompt,
                bot_response: cleanBotText
            })
        });
        const data = await res.json();
        if (data.success && !data.skipped && data.title) {
            titleElement.textContent = data.title;
            if (typeof onTitleGenerated === 'function') onTitleGenerated(data.title);
        }
    } catch (e) {
        // Draft jest już zapisany — spokojnie, nic się nie stało
        console.warn('[LLM ENHANCEMENT FAILED]:', e);
    }
}

// ===== FALLBACK TYTUŁU: Wyciąga pierwsze 3-4 słowa z odpowiedzi bota =====
// Używane, gdy LLM-based generateAutoTitle nie zadziała.
// Nie wymaga LLM — po prostu bierze pierwsze słowa z odpowiedzi.
function extractFirstWords(text, maxWords = 4) {
    if (!text || !text.trim()) return '';
    const words = text.trim().split(/\s+/);
    const selected = [];
    for (const word of words) {
        // Pomiń bardzo krótkie słowa (1-2 znaki), ale zawsze weź pierwsze
        if (selected.length > 0 && selected.length < maxWords && word.length <= 2) continue;
        selected.push(word);
        if (selected.length >= maxWords) break;
    }
    if (selected.length === 0) return text.trim().split(/\s+/).slice(0, maxWords).join(' ');
    return selected.join(' ');
}

// ===== TWORZENIE TOOLTIPA Z METADANYMI (kliknij odpowiedź bota) =====
function createMetadataTooltip(botMessageDiv, botMetadata) {
    if (!botMetadata) return;

    const timeStr = botMetadata.total_time_sec + 's';
    const speedStr = botMetadata.tokens_per_second + ' t/s';
    const tokenStr = botMetadata.tokens_generated + ' tokenów';
    const stepsStr = botMetadata.agent_steps + ' kroków';
    const agentStr = botMetadata.agent_tool_calls > 0 ? `${botMetadata.agent_tool_calls} narzędzi` : '';
    const searchStr = botMetadata.web_search_enabled ? '🌐 Wyszukiwanie' : '';

    // Tooltip — wyświetlany zawsze, widoczny od razu
    // Kolory przez CSS variables (var(--tip-...)), żeby reagowały na zmianę theme
    const tooltip = document.createElement('div');
    tooltip.className = 'bot-message-metadata';

    tooltip.style.cssText = `
        margin-top: 10px;
        padding: 10px 14px;
        background: var(--tip-bg, rgba(0,0,0,0.35));
        border-radius: 8px;
        font-size: 11px;
        color: var(--tip-color, #aaa);
        border: var(--tip-border, 1px solid rgba(255,255,255,0.08));
        border-top: 2px solid var(--tip-accent, rgba(139,92,246,0.3));
        position: relative;
    `;

    tooltip.innerHTML = `
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <span>⏱️ <strong>${timeStr}</strong></span>
            <span>🚀 <strong>${speedStr}</strong></span>
            <span>📊 <strong>${tokenStr}</strong></span>
            <span>🔄 <strong>${stepsStr}</strong></span>
            ${agentStr ? `<span>🔧 <strong>${agentStr}</strong></span>` : ''}
            ${searchStr ? `<span>${searchStr}</span>` : ''}
        </div>
        <div style="margin-top: 4px; font-size: 10px; color: var(--tip-sub, #666);">
            Tekst: ${botMetadata.bot_text_length} znaków | Myślenie: ${botMetadata.thinking_blocks} bloków
        </div>
    `;

    botMessageDiv.appendChild(tooltip);

    // Sprawdź ustawienie — jeśli wyłączone, ukryj tooltip
    const isEnabled = localStorage.getItem('show_metadata_tooltip') !== 'false';
    if (!isEnabled) {
        tooltip.style.display = 'none';
    }

    // Funkcja toggle dla przycisku "info" — chowa/pokazuje
    botMessageDiv._toggleMetadata = () => {
        const isHidden = tooltip.style.display === 'none';
        tooltip.style.display = isHidden ? 'block' : 'none';
    };

    // Auto-scroll na dół (tooltip dodał wysokość)
    if (typeof window.scrollChatToBottom === 'function') {
        setTimeout(() => window.scrollChatToBottom(), 50);
    }
}

// Eksport dla testów (w Node.js/Jest). W przeglądarce funkcje są globalne.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { completeThinkBlock, generateAutoTitle, createMetadataTooltip, extractFirstWords };
}
