const JQ_SETTINGS_POPUP  = $('#uf_settings_popup');
const JQ_SETTINGS_CSV    = $('#uf_settings_csv');
const JQ_SETTINGS_COPIES = $('#uf_settings_copies');


function openSettingsDialog() {
  ga_openSettings();
  setCsvDisplay();
  setCopiesDisplay();
  JQ_SETTINGS_POPUP.addClass('is-active');
}
function closeSettingsDialog() {
  JQ_SETTINGS_POPUP.removeClass('is-active');
}
function saveSettingsBtnClicked() {
  saveCsvDisplay();
  saveCopiesDisplay();
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

/* The "Search non-fork copies" opt-in setting – default OFF (per PR89 fix) */
const LOCAL_STORAGE_SETTINGS_COPIES = "useful-forks-search-copies";
let UF_SETTINGS_SEARCH_COPIES = false;
function saveCopiesDisplay() {
  if (JQ_SETTINGS_COPIES && JQ_SETTINGS_COPIES.length) {
    UF_SETTINGS_SEARCH_COPIES = JQ_SETTINGS_COPIES.prop('checked');
  }
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_COPIES, JSON.stringify(!!UF_SETTINGS_SEARCH_COPIES));
}
function setCopiesDisplay() {
  let raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_COPIES);
  if (raw == null) {
    UF_SETTINGS_SEARCH_COPIES = false; // default off – opt-in
  } else {
    try { UF_SETTINGS_SEARCH_COPIES = JSON.parse(raw); } catch(e) { UF_SETTINGS_SEARCH_COPIES = false; }
  }
  if (JQ_SETTINGS_COPIES && JQ_SETTINGS_COPIES.length) {
    JQ_SETTINGS_COPIES.prop('checked', !!UF_SETTINGS_SEARCH_COPIES);
  }
}
setCopiesDisplay();
// expose for queries-logic opt-in check
if (typeof window !== 'undefined') {
  window.UF_SETTINGS_SEARCH_COPIES = UF_SETTINGS_SEARCH_COPIES;
  window.getCopiesSetting = () => {
    try {
      let v = localStorage.getItem(LOCAL_STORAGE_SETTINGS_COPIES);
      if (v==null) return false;
      return JSON.parse(v);
    } catch(e){ return false; }
  };
}
