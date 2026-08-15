/* Dark theme toggle – Fix #34 */
const LOCAL_STORAGE_THEME = "useful-forks-theme";
let UF_THEME = null;

function applyTheme(theme) {
  UF_THEME = theme;
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else if (theme === 'light') {
    document.body.classList.remove('dark');
  } else {
    // auto: respect system
    document.body.classList.remove('dark');
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // CSS media query will handle auto; we don't need class unless user forced dark
    }
  }
  // update icon if button exists
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? '☀️ Light' : theme === 'light' ? '🌙 Dark' : '🌓 Auto';
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
  let next;
  if (curr === 'auto') next = 'dark';
  else if (curr === 'dark') next = 'light';
  else next = 'auto';
  setStoredTheme(next);
}

function initTheme() {
  let stored = getStoredTheme();
  applyTheme(stored);
  // watch system changes if auto
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (getStoredTheme() === 'auto') {
        // CSS will adapt automatically
        // force reflow if needed
        document.body.style.display='none';
        document.body.offsetHeight;
        document.body.style.display='';
      }
    });
  }
}

// init on load
document.addEventListener('DOMContentLoaded', initTheme);
if (document.readyState !== 'loading') initTheme();
