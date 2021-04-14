const JQ_TOKEN_TITLE = $('#modalTokenCardTitle');
const JQ_TOKEN_FIELD = $('#tokenInput');
const JQ_TOKEN_BTN   = $('#addTokenBtn');
const JQ_TOKEN_POPUP = $('#useful_forks_token_popup');

let shouldTriggerQueryOnTokenSave = false;
let shouldReconstructOctokit = true;


function openTokenDialog() {
  ga_openToken();
  JQ_TOKEN_POPUP.addClass('is-active');
  JQ_TOKEN_FIELD.focus();
}
function closeTokenDialog() {
  ga_closeToken();
  JQ_TOKEN_POPUP.removeClass('is-active');
  JQ_REPO_FIELD.focus();
}
function saveTokenBtnClicked() {
  ga_saveToken();
  const INPUT_TOKEN = JQ_TOKEN_FIELD.val();
  localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, INPUT_TOKEN);
  LOCAL_STORAGE_GITHUB_ACCESS_TOKEN = INPUT_TOKEN;
  drawAddTokenBtn(INPUT_TOKEN);
  closeTokenDialog();

  /* If the user was asked to enter a Token, his query should re-execute. */
  shouldReconstructOctokit = true;
  if (shouldTriggerQueryOnTokenSave && JQ_REPO_FIELD.val()) {
    enableQueryFields();
    JQ_SEARCH_BTN.click();
  }
}

function proposeAddingToken() {
  shouldTriggerQueryOnTokenSave = true;
  openTokenDialog();
}

function drawAddTokenBtn(accessToken) {
  let verb = 'Add';
  if (accessToken) {
    verb = 'Edit';
    JQ_TOKEN_FIELD.val(accessToken);
  }
  JQ_TOKEN_BTN.html('<img src="assets/settings-icon.png" alt="Settings" />'
      + verb + ' Access Token');
  JQ_TOKEN_TITLE.html(verb + ' GitHub Access Token');
}


JQ_TOKEN_FIELD.keyup(event => {
  if (event.keyCode === 13) { // 'ENTER'
    saveTokenBtnClicked();
  }
  if (event.keyCode === 27) { // 'ESC'
    closeTokenDialog();
  }
});

/* Get the locally saved Access Token. */
const GITHUB_ACCESS_TOKEN_STORAGE_KEY = "useful-forks-access-token";
let LOCAL_STORAGE_GITHUB_ACCESS_TOKEN = localStorage.getItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
drawAddTokenBtn(LOCAL_STORAGE_GITHUB_ACCESS_TOKEN);