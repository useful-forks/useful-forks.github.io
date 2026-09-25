/* Theme toggle – Fix #34 – light/dark toggle, default light, choice kept in localStorage */
const LOCAL_STORAGE_THEME = "useful-forks-theme";

function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  const html = document.documentElement;
  const body = document.body;
  html.setAttribute('data-theme', t);
  if (body) {
    body.setAttribute('data-theme', t);
    body.classList.toggle('dark', t === 'dark');
  }
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    const other = t === 'dark' ? 'light' : 'dark';
    btn.textContent = t === 'dark' ? '☀️ Light' : '🌙 Dark';
    btn.setAttribute('aria-label', `Switch to ${other} theme`);
    btn.setAttribute('title', `Switch to ${other} theme`);
  }
}

function getStoredTheme() {
  try {
    return localStorage.getItem(LOCAL_STORAGE_THEME) === 'dark' ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

function setStoredTheme(t) {
  try { localStorage.setItem(LOCAL_STORAGE_THEME, t); } catch (e) {}
  applyTheme(t);
}

function toggleTheme() {
  setStoredTheme(getStoredTheme() === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  applyTheme(getStoredTheme());
}

// init on load
document.addEventListener('DOMContentLoaded', initTheme);
if (document.readyState !== 'loading') initTheme();
