const JQ_SETTINGS_POPUP  = $('#uf_settings_popup');
const JQ_SETTINGS_CSV    = $('#uf_settings_csv');
const JQ_SETTINGS_BRANCHES_CHECK = $('#uf_settings_branches_check');
const JQ_SETTINGS_BRANCHES_FILTER = $('#uf_settings_branches_filter');


function openSettingsDialog() {
  ga_openSettings();
  setCsvDisplay();
  setCheckAllBranchesDisplay();
  setBranchesFilterDisplay();
  JQ_SETTINGS_POPUP.addClass('is-active');
}
function closeSettingsDialog() {
  JQ_SETTINGS_POPUP.removeClass('is-active');
}
function saveSettingsBtnClicked() {
  saveCsvDisplay();
  saveCheckAllBranchesDisplay();
  saveBranchesFilterDisplay();
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

/* The "Check all branches" setting – Fix #33. */
const LOCAL_STORAGE_SETTINGS_CHECK_ALL_BRANCHES = "useful-forks-check-all-branches";
let UF_SETTINGS_CHECK_ALL_BRANCHES; // boolean, default false to avoid doubling API calls
function saveCheckAllBranchesDisplay() {
  UF_SETTINGS_CHECK_ALL_BRANCHES = JQ_SETTINGS_BRANCHES_CHECK.prop('checked');
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_CHECK_ALL_BRANCHES, JSON.stringify(UF_SETTINGS_CHECK_ALL_BRANCHES));
}
function setCheckAllBranchesDisplay() {
  let val = localStorage.getItem(LOCAL_STORAGE_SETTINGS_CHECK_ALL_BRANCHES);
  if (val == null) {
    UF_SETTINGS_CHECK_ALL_BRANCHES = false; // default false
  } else {
    try { UF_SETTINGS_CHECK_ALL_BRANCHES = JSON.parse(val); } catch { UF_SETTINGS_CHECK_ALL_BRANCHES = false; }
  }
  JQ_SETTINGS_BRANCHES_CHECK.prop('checked', UF_SETTINGS_CHECK_ALL_BRANCHES);
  // enable/disable filter text based on checkbox
  if (JQ_SETTINGS_BRANCHES_FILTER && JQ_SETTINGS_BRANCHES_FILTER.prop) {
    JQ_SETTINGS_BRANCHES_FILTER.prop('disabled', !UF_SETTINGS_CHECK_ALL_BRANCHES);
  }
}
setCheckAllBranchesDisplay();
// live toggle of filter input disabled state
if (typeof $ !== 'undefined') {
  $(document).on('change', '#uf_settings_branches_check', function() {
    JQ_SETTINGS_BRANCHES_FILTER.prop('disabled', !$(this).prop('checked'));
  });
}

/* The "Branches filter" setting – Fix #38. */
const LOCAL_STORAGE_SETTINGS_BRANCHES_FILTER = "useful-forks-branches-filter";
let UF_SETTINGS_BRANCHES_FILTER = ""; // comma-separated list, empty = all
function saveBranchesFilterDisplay() {
  UF_SETTINGS_BRANCHES_FILTER = (JQ_SETTINGS_BRANCHES_FILTER.val() || "").trim();
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_BRANCHES_FILTER, UF_SETTINGS_BRANCHES_FILTER);
}
function setBranchesFilterDisplay() {
  UF_SETTINGS_BRANCHES_FILTER = localStorage.getItem(LOCAL_STORAGE_SETTINGS_BRANCHES_FILTER);
  if (UF_SETTINGS_BRANCHES_FILTER == null) UF_SETTINGS_BRANCHES_FILTER = "";
  JQ_SETTINGS_BRANCHES_FILTER.val(UF_SETTINGS_BRANCHES_FILTER);
  if (JQ_SETTINGS_BRANCHES_FILTER && JQ_SETTINGS_BRANCHES_FILTER.prop) {
    JQ_SETTINGS_BRANCHES_FILTER.prop('disabled', !UF_SETTINGS_CHECK_ALL_BRANCHES);
  }
}
setBranchesFilterDisplay();

function getAllowedBranchesList() {
  // returns null = allow all, or array of lowercased trimmed names
  let raw = UF_SETTINGS_BRANCHES_FILTER || "";
  if (typeof raw !== 'string') raw = String(raw);
  raw = raw.trim();
  if (!raw) return null;
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length>0);
}
