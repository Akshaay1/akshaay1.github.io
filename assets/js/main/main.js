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
    searchBox.style.display = searchBox.style.display === 'none' || searchBox.style.display === '' ? 'flex' : 'none';
}

// Search function
function searchContent() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const content = document.querySelectorAll('p, h1, a');
    
    // Reset previous highlights
    document.querySelectorAll('.highlight').forEach(el => {
        const text = el.textContent;
        el.replaceWith(text);
    });
    
    if (query.length < 2) return;
    
    content.forEach(element => {
        const text = element.innerText;
        const regex = new RegExp(query, 'gi');
        
        if (regex.test(text)) {
            element.innerHTML = element.innerHTML.replace(regex, match => `<span class="highlight">${match}</span>`);
        }
    });
}

// Check for saved dark mode preference
document.addEventListener('DOMContentLoaded', function() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // Set up event listeners
    document.querySelector('.mode-toggle').addEventListener('click', toggleMode);
    document.querySelector('.search-icon').addEventListener('click', toggleSearch);
    
    const searchForm = document.querySelector('.search-box form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            searchContent();
        });
    }
}); 