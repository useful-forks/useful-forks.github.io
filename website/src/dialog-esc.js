/* Pressing ESC closes any open dialog (token, settings).
   Uses the existing close functions so analytics and focus behavior stay consistent. */
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' && event.key !== 'Esc') return;

  if (typeof JQ_TOKEN_POPUP !== 'undefined' && JQ_TOKEN_POPUP.hasClass('is-active')) {
    closeTokenDialog();
  }
  if (typeof JQ_SETTINGS_POPUP !== 'undefined' && JQ_SETTINGS_POPUP.hasClass('is-active')) {
    closeSettingsDialog();
  }
});
