const JQ_SETTINGS_POPUP = $('#useful_forks_settings_popup');


function openSettingsDialog() {
  ga_openSettings();
  JQ_SETTINGS_POPUP.addClass('is-active');
}
function closeSettingsDialog() {
  JQ_SETTINGS_POPUP.removeClass('is-active');
}
function saveSettingsBtnClicked() {
  // const INPUT_TOKEN = JQ_TOKEN_FIELD.val();
  // localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, INPUT_TOKEN);
  // LOCAL_STORAGE_GITHUB_ACCESS_TOKEN = INPUT_TOKEN;
  // drawAddTokenBtn(INPUT_TOKEN);
  closeSettingsDialog();
}