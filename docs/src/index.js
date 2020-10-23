const JQ_REPO_FIELD  = $('#repo');
const JQ_SEARCH_BTN  = $('#searchBtn');
const JQ_POPUP_TITLE = $('#modalCardTitle');
const JQ_TOKEN_CLOSE = $('#closeModalBtn');
const JQ_TOKEN_FIELD = $('#tokenInput');
const JQ_TOKEN_SAVE  = $('#saveTokenBtn');
const JQ_TOKEN_BTN   = $('#addTokenBtn');
const JQ_POPUP       = $('#useful_forks_token_popup');


/* Gather the saved Access Token */
const GITHUB_ACCESS_TOKEN_STORAGE_KEY = "useful-forks-access-token";
let token = localStorage.getItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
drawAddTokenBtn(token);


/* Initialize the structure used by the 'queries-logic.js' */
$('#useful_forks_inject').append(
    $('<div>', {id: UF_ID_WRAPPER}).append(
        $('<br>'),
        $('<div>', {id: UF_ID_MSG}),
        $('<div>', {id: UF_ID_DATA}).append(
            $('<table>', {id: UF_ID_TABLE}).append(
                $('<tbody>')
            )
        )
    )
);



/** Extracts 'user' and 'repo' values from potential URL inputs. */
function initiate_search() {

  /* Checking if search is allowed. */
  if (REQUESTS_COUNTER !== 0 || JQ_SEARCH_BTN.hasClass('is-loading')) {
    return; // abort
  }

  let values = JQ_REPO_FIELD.val().split('/').filter(Boolean);
  let len = values.length;

  if (len < 1) {
    getElementById_$(UF_ID_MSG).html('Please enter a valid query: it should contain two strings separated by a "/"');
    return; // abort
  }

  JQ_SEARCH_BTN.addClass('is-loading');
  clear_old_data();
  request_fork_page(1, values[len-2], values[len-1], token);
}

JQ_SEARCH_BTN.click(event => {
  event.preventDefault();
  initiate_search();
});

JQ_REPO_FIELD.keyup(event => {
  if (event.keyCode === 13) { // only when pressing 'ENTER'
    initiate_search();
  }
});

JQ_TOKEN_BTN.click(event => {
  event.preventDefault();
  JQ_POPUP.addClass('is-active');
});

JQ_TOKEN_CLOSE.click(event => {
  event.preventDefault();
  JQ_POPUP.removeClass('is-active');
});

JQ_TOKEN_SAVE.click(event => {
  event.preventDefault();
  const INPUT_TOKEN = JQ_TOKEN_FIELD.val();
  localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, INPUT_TOKEN);
  JQ_POPUP.removeClass('is-active');
  drawAddTokenBtn(INPUT_TOKEN);
});

function drawAddTokenBtn(accessToken) {
  let verb = 'Add';
  if (accessToken) {
    verb = 'Edit'
    JQ_TOKEN_FIELD.val(accessToken);
  }
  JQ_TOKEN_BTN.html('<img src="assets/settings-icon.png" alt="settings" />'
      + '<strong>&nbsp;&nbsp;' + verb + ' Access Token</strong>');
  JQ_POPUP_TITLE.html(verb + ' GitHub Access Token');
}

/* Automatically queries when an URL parameter is present. */
const url = window.location.href.split('?repository=');
if (url.length === 2) {
  JQ_REPO_FIELD.val(url[1]);
  JQ_SEARCH_BTN.click();
}