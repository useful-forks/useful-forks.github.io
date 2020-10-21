// Gather the saved Access Token
const GITHUB_ACCESS_TOKEN_STORAGE_KEY = "useful-forks-access-token";
let token = localStorage.getItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
drawAddTokenBtn(token);

// Initialize the structure used by the 'queries-logic.js'
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


function disable_btn() {
  const SEARCH_BTN = $('#searchBtn');
  if (SEARCH_BTN.hasClass('is-loading')) {
    return; // abort
  }
  SEARCH_BTN.addClass('is-loading');
}

/** Extracts 'user' and 'repo' values from potential URL inputs. */
function initiate_search() {
  let values = $('#repo').val().split('/').filter(Boolean);
  let len = values.length;

  if (len < 1) {
    $('#' + UF_ID_MSG).html('Please enter a valid query: it should contain two strings separated by a "/"');
    return; // abort
  }

  disable_btn();
  request_fork_page(1, values[len-2], values[len-1], token);
}

$('#searchBtn').click(event => {
  event.preventDefault();
  initiate_search();
});

$('#repo').keyup(event => {
  if (event.keyCode === 13) { // only when pressing 'ENTER'
    initiate_search();
  }
});

$('#addTokenBtn').click(event => {
  event.preventDefault();
  $('.modal').addClass('is-active');
});

$('#closeModalBtn').click(event => {
  event.preventDefault();
  $('.modal').removeClass('is-active');
});

$('#saveTokenBtn').click(event => {
  event.preventDefault();
  const INPUT_TOKEN = document.getElementById('tokenInput').value;
  localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, INPUT_TOKEN);
  $('.modal').removeClass('is-active');
  drawAddTokenBtn(INPUT_TOKEN);
});

function drawAddTokenBtn(accessToken) {
  let verb = 'Add';
  if (accessToken) {
    verb = 'Edit'
    $('#tokenInput').val(accessToken);
  }
  $('#addTokenBtn').html('<img src="assets/settings-icon.png" alt="settings" />'
      + '<strong>&nbsp;&nbsp;' + verb + ' Access Token</strong>');
  $('#modalCardTitle').html(verb + ' GitHub Access Token');
}