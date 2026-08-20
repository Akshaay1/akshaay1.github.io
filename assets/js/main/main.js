// Toggle dark/light mode
function toggleMode() {
    const body = document.body;
    const modeToggle = document.querySelector('.mode-toggle');
    body.classList.toggle('dark-mode');

    if (body.classList.contains('dark-mode')) {
        modeToggle.setAttribute('aria-label', 'Switch to light mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        modeToggle.setAttribute('aria-label', 'Switch to dark mode');
        localStorage.setItem('darkMode', 'false');
    }
}

// Toggle search box
function toggleSearch() {
    const searchBox = document.querySelector('.search-box');
    const open = searchBox.style.display !== 'flex';
    searchBox.style.display = open ? 'flex' : 'none';
    if (open) {
        const inp = document.getElementById('search-input');
        if (inp) setTimeout(() => inp.focus(), 30);
    } else {
        const box = document.getElementById('search-results');
        if (box) { box.classList.remove('show'); box.innerHTML = ''; }
    }
}

// ── Site-wide search ─────────────────────────────────────────────
// Fetch each page once, index its text, and jump to wherever a word appears.
// (Resume is an external Google Drive link, so it's not indexed.)
const SEARCH_PAGES = [
    { url: 'about.html',                       label: 'About' },
    { url: 'blog.html',                        label: 'Blog' },
    { url: 'papercut/index.html',              label: 'Papercut' },
    { url: 'metal-defect-detector/index.html', label: 'Metal Defect Detector' }
];
let SEARCH_INDEX = [];

function stripText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Drop chrome (nav/header/footer) so words only match real page content.
    doc.querySelectorAll('script,style,noscript,svg,nav,header,footer,.top-nav,.nav-links,.links,.top-right-container,.mode-toggle')
        .forEach(n => n.remove());
    return (doc.body ? doc.body.textContent : '').replace(/\s+/g, ' ').trim();
}

async function buildSearchIndex() {
    SEARCH_INDEX = await Promise.all(SEARCH_PAGES.map(async p => {
        try {
            const res = await fetch(p.url);
            const text = stripText(await res.text());
            return Object.assign({}, p, { text, low: text.toLowerCase() });
        } catch (e) {
            return Object.assign({}, p, { text: '', low: '' });
        }
    }));
}

function escapeHTML(s) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function findSearchMatches(raw) {
    const q = raw.toLowerCase().trim();
    if (q.length < 2) return [];
    const out = [];
    for (const p of SEARCH_INDEX) {
        let idx = p.low.indexOf(q), count = 0, first = -1;
        while (idx >= 0) { if (first < 0) first = idx; count++; idx = p.low.indexOf(q, idx + q.length); }
        if (count > 0) {
            const s = Math.max(0, first - 32), e = Math.min(p.text.length, first + q.length + 48);
            const snip = (s > 0 ? '…' : '') + p.text.slice(s, e) + (e < p.text.length ? '…' : '');
            // A title match (e.g. "papercut" → the Papercut page) always wins;
            // otherwise the page that uses the word most is most relevant.
            const score = count + (p.label.toLowerCase().includes(q) ? 1000 : 0);
            out.push(Object.assign({}, p, { count, snip, score }));
        }
    }
    out.sort((a, b) => b.score - a.score);
    return out;
}

function highlightSnippet(snip, raw) {
    const esc = escapeHTML(snip);
    const q = raw.trim();
    if (!q) return esc;
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    return esc.replace(re, '<mark>$1</mark>');
}

function renderSearchResults(raw) {
    const box = document.getElementById('search-results');
    if (!box) return;
    const q = raw.trim();
    if (q.length < 2) { box.classList.remove('show'); box.innerHTML = ''; return; }
    const matches = findSearchMatches(q);
    if (!matches.length) {
        box.innerHTML = '<div class="sr-empty">No matches for &ldquo;' + escapeHTML(q) + '&rdquo;</div>';
        box.classList.add('show'); return;
    }
    box.innerHTML = matches.map(m =>
        '<a class="sr-item" href="' + m.url + '#:~:text=' + encodeURIComponent(q) + '">' +
            '<div class="sr-label">' + escapeHTML(m.label) + '</div>' +
            '<div class="sr-snip">' + highlightSnippet(m.snip, q) + '</div>' +
        '</a>'
    ).join('');
    box.classList.add('show');
}

// Search button / Enter → jump straight to the best match. Browsers scroll to
// and highlight the word via the text fragment (#:~:text=).
function searchContent() {
    const raw = document.getElementById('search-input').value;
    renderSearchResults(raw);
    const matches = findSearchMatches(raw);
    if (matches.length) {
        window.location.href = matches[0].url + '#:~:text=' + encodeURIComponent(raw.trim());
    }
}

// Check for saved dark mode preference + wire everything up
document.addEventListener('DOMContentLoaded', function() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        document.body.classList.add('dark-mode');
    }

    document.querySelector('.mode-toggle').addEventListener('click', toggleMode);
    document.querySelector('.search-icon').addEventListener('click', toggleSearch);

    const searchForm = document.querySelector('.search-box form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            searchContent();
        });
    }

    // Live results as you type
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
    }

    // Close the dropdown when clicking away
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-box') && !e.target.closest('.search-icon')) {
            const box = document.getElementById('search-results');
            if (box) box.classList.remove('show');
        }
    });

    buildSearchIndex();
});
