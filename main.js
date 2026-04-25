// ========== MAIN.JS – Smart-rate Interactive Features ==========

document.addEventListener('DOMContentLoaded', function() {
    // ----- Kebab Menu (mobile) -----
    const kebabToggle = document.getElementById('kebabToggle');
    const dropdown = document.getElementById('kebabDropdown');

    if (kebabToggle && dropdown) {
        kebabToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        window.addEventListener('click', function() {
            dropdown.classList.remove('show');
        });
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // ----- Dark / Light Mode Toggle -----
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }

        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        });
    }

    // ----- Footer Copyright Year -----
    const footerYear = document.querySelector('.footer-content p');
    if (footerYear) {
        const currentYear = new Date().getFullYear();
        footerYear.innerHTML = footerYear.innerHTML.replace('2025', currentYear);
    }
});