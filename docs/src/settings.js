const JQ_SETTINGS_POPUP  = $('#uf_settings_popup');
const JQ_SETTINGS_FILTER = $('#uf_settings_filter');
const JQ_SETTINGS_CSV    = $('#uf_settings_csv');


function openSettingsDialog() {
  ga_openSettings();
  setAheadFilter();
  setCsvDisplay();
  JQ_SETTINGS_POPUP.addClass('is-active');
}
function closeSettingsDialog() {
  JQ_SETTINGS_POPUP.removeClass('is-active');
}
function saveSettingsBtnClicked() {
  saveAheadFilter();
  saveCsvDisplay();
  closeSettingsDialog();
}


/* The "Ahead By Commit Filter" setting. */
const LOCAL_STORAGE_SETTINGS_AHEAD_FILTER = "useful-forks-ahead-filter";
let UF_SETTINGS_AHEAD_FILTER;
function saveAheadFilter() {
  UF_SETTINGS_AHEAD_FILTER = JQ_SETTINGS_FILTER.val();
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_AHEAD_FILTER, UF_SETTINGS_AHEAD_FILTER);
}
function setAheadFilter() {
  UF_SETTINGS_AHEAD_FILTER = localStorage.getItem(LOCAL_STORAGE_SETTINGS_AHEAD_FILTER);
  if (!UF_SETTINGS_AHEAD_FILTER) {
    UF_SETTINGS_AHEAD_FILTER = 0; // default
  }
  JQ_SETTINGS_FILTER.val(UF_SETTINGS_AHEAD_FILTER);
}
setAheadFilter();


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