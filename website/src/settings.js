const JQ_SETTINGS_POPUP  = $('#uf_settings_popup');
const JQ_SETTINGS_CSV    = $('#uf_settings_csv');


const JQ_SETTINGS_DETACHED = $('#uf_settings_detached');

function openSettingsDialog() {
  ga_openSettings();
  setCsvDisplay();
  setDetachedDisplay();
  JQ_SETTINGS_POPUP.addClass('is-active');
}
function closeSettingsDialog() {
  JQ_SETTINGS_POPUP.removeClass('is-active');
}
function saveSettingsBtnClicked() {
  saveCsvDisplay();
  saveDetachedDisplay();
  closeSettingsDialog();
}


/* The "Export CSV Display" setting. */
const LOCAL_STORAGE_SETTINGS_CSV_DISPLAY = "useful-forks-csv-display";
let UF_SETTINGS_CSV_DISPLAY; // a boolean
function saveCsvDisplay() {
  UF_SETTINGS_CSV_DISPLAY = JQ_SETTINGS_CSV.prop('checked');
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_CSV_DISPLAY, JSON.stringify(UF_SETTINGS_CSV_DISPLAY));
}
function setCsvDisplay() {
  UF_SETTINGS_CSV_DISPLAY = localStorage.getItem(LOCAL_STORAGE_SETTINGS_CSV_DISPLAY);
  if (UF_SETTINGS_CSV_DISPLAY == null) {
    UF_SETTINGS_CSV_DISPLAY = true; // default
  } else {
    UF_SETTINGS_CSV_DISPLAY = JSON.parse(UF_SETTINGS_CSV_DISPLAY);
  }
  JQ_SETTINGS_CSV.prop('checked', UF_SETTINGS_CSV_DISPLAY);
}
setCsvDisplay();

/* Detached forks (Issue #76) opt-in – default off, high risk */
const LOCAL_STORAGE_SETTINGS_DETACHED = "useful-forks-detached-display";
let UF_SETTINGS_DETACHED; // boolean, default false
function saveDetachedDisplay() {
  if (typeof JQ_SETTINGS_DETACHED !== 'undefined' && JQ_SETTINGS_DETACHED.length) {
    UF_SETTINGS_DETACHED = JQ_SETTINGS_DETACHED.prop('checked');
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_DETACHED, JSON.stringify(UF_SETTINGS_DETACHED));
  } else {
    UF_SETTINGS_DETACHED = false;
  }
}
function setDetachedDisplay() {
  let val = localStorage.getItem(LOCAL_STORAGE_SETTINGS_DETACHED);
  if (val == null) {
    UF_SETTINGS_DETACHED = false; // default off – high risk, opt-in
  } else {
    try { UF_SETTINGS_DETACHED = JSON.parse(val); } catch(e){ UF_SETTINGS_DETACHED = false; }
  }
  if (typeof JQ_SETTINGS_DETACHED !== 'undefined' && JQ_SETTINGS_DETACHED.length) {
    JQ_SETTINGS_DETACHED.prop('checked', UF_SETTINGS_DETACHED);
  }
}
setDetachedDisplay();
