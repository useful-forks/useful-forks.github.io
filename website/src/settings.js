const JQ_SETTINGS_POPUP  = $('#uf_settings_popup');
const JQ_SETTINGS_CSV    = $('#uf_settings_csv');


function openSettingsDialog() {
  ga_openSettings();
  setCsvDisplay();
  JQ_SETTINGS_POPUP.addClass('is-active');
}
function closeSettingsDialog() {
  JQ_SETTINGS_POPUP.removeClass('is-active');
}
function saveSettingsBtnClicked() {
  saveCsvDisplay();
  closeSettingsDialog();
  // Fix #60 – apply immediately instead of waiting for next query
  try {
    if (typeof updateCsvBtnVisibility === 'function') {
      updateCsvBtnVisibility();
    } else if (UF_SETTINGS_CSV_DISPLAY) {
      if (typeof tableIsEmpty === 'function' && !tableIsEmpty()) {
        displayCsvExportBtn();
      } else if (typeof getTableBody === 'function' && getTableBody().children().length > 0) {
        displayCsvExportBtn();
      }
    } else {
      // setting disabled → ensure button hidden right away
      // forceHideCsvBtn exists after fix, else fallback to jQuery remove
      if (typeof forceHideCsvBtn === 'function') forceHideCsvBtn();
      else $('#'+EXPORT_DIV_ID).remove();
    }
    // also consider calling updateBasedOnTable if available to sync msg
    if (typeof updateBasedOnTable === 'function') {
      try { updateBasedOnTable(); } catch(e) {}
    }
  } catch(e) {
    console.warn('CSV dynamic toggle failed', e);
  }
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