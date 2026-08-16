/* Dark theme toggle – Fix #34 – CSS vars + 3-state auto/light/dark */
const LOCAL_STORAGE_THEME = "useful-forks-theme";
let UF_THEME = null;

function applyTheme(theme) {
  UF_THEME = theme;
  const html = document.documentElement;
  const body = document.body;
  // normalize
  const t = ['dark','light','auto'].includes(theme) ? theme : 'auto';
  // set data-theme for CSS vars
  if (t === 'auto') {
    html.removeAttribute('data-theme');
    if (body) body.removeAttribute('data-theme');
    html.dataset.theme = 'auto'; // keep for JS but CSS falls back to @media
  } else {
    html.setAttribute('data-theme', t);
    if (body) body.setAttribute('data-theme', t);
  }
  // legacy body.dark class for compat but now vars driven
  if (body) {
    if (t === 'dark') body.classList.add('dark');
    else if (t === 'light') body.classList.remove('dark');
    else {
      // auto: no class, rely on media query
      body.classList.remove('dark');
    }
  }
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    const label = t === 'dark' ? '☀️ Light' : t === 'light' ? '🌙 Dark' : '🌓 Auto';
    btn.textContent = label;
    btn.setAttribute('aria-label', `Theme: ${t}, click to toggle auto→dark→light`);
  }
}

function getStoredTheme() {
  let t = localStorage.getItem(LOCAL_STORAGE_THEME);
  if (!t) return 'auto';
  try { t = JSON.parse(t); } catch(e) {}
  if (['dark','light','auto'].includes(t)) return t;
  return 'auto';
}

function setStoredTheme(t) {
  localStorage.setItem(LOCAL_STORAGE_THEME, JSON.stringify(t));
  applyTheme(t);
}

function toggleTheme() {
  let curr = getStoredTheme();
  let next = curr === 'auto' ? 'dark' : curr === 'dark' ? 'light' : 'auto';
  setStoredTheme(next);
}

function initTheme() {
  let stored = getStoredTheme();
  applyTheme(stored);
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    // modern addEventListener, fallback addListener
    const handler = () => {
      if (getStoredTheme() === 'auto') {
        // force var recompute – no DOM hack needed, just re-apply to trigger
        applyTheme('auto');
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }
}

// init on load
document.addEventListener('DOMContentLoaded', initTheme);
if (document.readyState !== 'loading') initTheme();
