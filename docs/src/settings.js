const JQ_SETTINGS_POPUP  = $('#uf_settings_popup');
const JQ_SETTINGS_FILTER = $('#uf_settings_filter');


function openSettingsDialog() {
  ga_openSettings();
  setAheadFilter();
  JQ_SETTINGS_POPUP.addClass('is-active');
}
function closeSettingsDialog() {
  JQ_SETTINGS_POPUP.removeClass('is-active');
}
function saveSettingsBtnClicked() {
  saveAheadFilter();
  closeSettingsDialog();
}


/* The "Ahead By Commit Filter" setting. */
const LOCAL_STORAGE_SETTINGS_AHEAD_FILTER = "useful-forks-ahead-filter";
let UF_SETTINGS_AHEAD_FILTER;
function saveAheadFilter() {
  const aheadSetting = JQ_SETTINGS_FILTER.val();
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_AHEAD_FILTER, aheadSetting);
  UF_SETTINGS_AHEAD_FILTER = aheadSetting;
}
function setAheadFilter() {
  UF_SETTINGS_AHEAD_FILTER = localStorage.getItem(LOCAL_STORAGE_SETTINGS_AHEAD_FILTER);
  if (!UF_SETTINGS_AHEAD_FILTER) {
    UF_SETTINGS_AHEAD_FILTER = 0; // default
  }
  JQ_SETTINGS_FILTER.val(UF_SETTINGS_AHEAD_FILTER);
}
setAheadFilter();