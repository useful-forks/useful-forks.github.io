const SELF_URL = "https://useful-forks.github.io/";

const UF_ID_WRAPPER = 'useful_forks_wrapper';
const UF_ID_DATA    = 'useful_forks_data';
const UF_ID_HEADER  = 'useful_forks_header';
const UF_ID_MSG     = 'useful_forks_msg';
const UF_ID_TABLE   = 'useful_forks_table';

const JQ_REPO_FIELD  = $('#repo');
const JQ_SEARCH_BTN  = $('#searchBtn');
const JQ_TOTAL_CALLS = $('#totalApiCalls');
const JQ_POPUP_TITLE = $('#modalCardTitle');
const JQ_TOKEN_CLOSE = $('#closeModalBtn');
const JQ_TOKEN_FIELD = $('#tokenInput');
const JQ_TOKEN_SAVE  = $('#saveTokenBtn');
const JQ_TOKEN_BTN   = $('#addTokenBtn');
const JQ_POPUP       = $('#useful_forks_token_popup');

const UF_MSG_NO_FORKS     = "No one forked this specific repository.";
const UF_MSG_SCANNING     = "Currently scanning all the forks.";
const UF_MSG_ERROR        = "There seems to have been an error. (Maybe you had a typo in the provided input?)";
const UF_MSG_EMPTY_FILTER = "All the forks have been filtered out: you can now rest easy!";
const UF_TABLE_SEPARATOR  = "&nbsp;|&nbsp;";
const UF_MSG_SLOWER       = "The scan will be slowing down due to the high amount of requests.<br/>"
    + "(That is to prevent GitHub API from refusing to respond due to thinking those requests are malicious.)";
const UF_MSG_API_RATE     = "<b>GitHub API rate-limits exceeded.</b> Consider providing an <b>Access Token</b> if you haven't already (click the button at the top-right).<br/>"
    + "The amount of API calls you are allowed to do will re-accumulate over time: you can try again later on.<br/>"
    + "It's also possible that the queried repository has so many forks that it's impossible to scan it completely without running out of API calls.<br/>"
    + ":(";


const EXAMPLE_LINK_1 = `<a href="${buildAutoQueryURL('payne911/PieMenu')}"
                           onclick="ga_shortExampleLink();">payne911/PieMenu</a>`;
const EXAMPLE_LINK_2 = `<a href="${buildAutoQueryURL('https://github.com/payne911/PieMenu')}"
                           onclick="ga_fullExampleLink();">https://github.com/payne911/PieMenu</a>`;
const BODY_REPO_LINK = `<a href="${buildGithubRepoURL('useful-forks/useful-forks.github.io')}"
                           onclick="ga_bodyRepoLink();">the GitHub project</a>`;
const LANDING_PAGE_INIT_MSG = "<b>Introducing:</b><br/><br/>"
    + "<img src='assets/useful-forks-banner.png' alt='useful-forks banner' width='500'/><br/><br/>"
    + "It aims at increasing the discoverability of <b>useful</b> forks of open-source projects.<br/>"
    + "Simply type a repository's URL in the Text Field above. Both of those examples are valid entries: <br/>"
    + "<b>" + EXAMPLE_LINK_1 + "</b> and <b>" + EXAMPLE_LINK_2 + "</b><br/><br/>"
    + "The criteria is simple: <b>if a fork was created, but never received any other activity on its master branch, it is filtered out.</b><br/>"
    + "The results are sorted by the amount of stars.<br/><br/>"
    + "For more information, check out " + BODY_REPO_LINK + ".<br/>"
    + "And while you're there, if you like this project, feel free to ⭐ us."


const SVG_FORK = '<svg class="octicon octicon-repo-forked v-align-text-bottom" viewBox="0 0 10 16" version="1.1" width="10" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8 1a1.993 1.993 0 00-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 002 1a1.993 1.993 0 00-1 3.72V6.5l3 3v1.78A1.993 1.993 0 005 15a1.993 1.993 0 001-3.72V9.5l3-3V4.72A1.993 1.993 0 008 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg>';
const SVG_STAR = '<svg aria-label="star" height="16" class="octicon octicon-star v-align-text-bottom" viewBox="0 0 14 16" version="1.1" width="14" role="img"><path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path></svg>';
const SVG_EYE  = '<svg class="octicon octicon-eye v-align-text-bottom" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8.06 2C3 2 0 8 0 8s3 6 8.06 6C13 14 16 8 16 8s-3-6-7.94-6zM8 12c-2.2 0-4-1.78-4-4 0-2.2 1.8-4 4-4 2.22 0 4 1.8 4 4 0 2.22-1.78 4-4 4zm2-4c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z"></path></svg>';

function getRepoCol(full_name, isInitialRepo) {
  return SVG_FORK + ` <a href="${buildGithubRepoURL(full_name)}" target="_blank" rel="noopener noreferrer"
                         onclick="ga_queryResultClick('${full_name}', ${isInitialRepo});">${full_name}</a>`;
}
function getStarCol(num_stars) {
  return SVG_STAR + ' x ' + num_stars;
}
function getForkCol(num_forks) {
  return SVG_FORK + ' x ' + num_forks;
}
function getWatchCol(num_watchers) {
  return SVG_EYE + ' x ' + num_watchers;
}

function buildAutoQueryURL(repo) {
  return `${SELF_URL}?repo=${repo}`;
}
function buildGithubRepoURL(repo) {
  return `https://github.com/${repo}`;
}

function getForkButtonLink(qualifier, full_name) {
  return `<a href="${buildAutoQueryURL(full_name)}" 
             title="This will launch a (more extensive) scan for the specified repository. The 'Source' is the root project of the whole fork tree, whereas the 'Parent' is the immediate parent. (Therefore, the Source can be the Parent.)" 
             class="button is-small is-dark is-outlined">
             <b>${qualifier}:&nbsp;&nbsp;</b>
             <span class="is-family-monospace">${full_name}</span>
          </a>`;
}

function getTableBody() {
  return JQ_ID_TABLE.find($("tbody"));
}
function clearTable() {
  getTableBody().empty();
}
function setMsg(msg) {
  JQ_ID_MSG.html(msg);
}
function clearMsg() {
  JQ_ID_MSG.empty();
}
function clearNonErrorMsg() {
  if (JQ_ID_MSG.html() !== UF_MSG_ERROR)
    clearMsg();
}
function setHeader(msg) {
  JQ_ID_HEADER.html(msg);
}
function clearHeader() {
  JQ_ID_HEADER.empty();
}

function closeTokenDialog() {
  JQ_POPUP.removeClass('is-active');
  JQ_REPO_FIELD.focus();
}
function openTokenDialog() {
  JQ_POPUP.addClass('is-active');
  JQ_TOKEN_FIELD.focus();
}
function enableQueryFields() {
  JQ_REPO_FIELD.prop('disabled', false);
  JQ_SEARCH_BTN.removeClass('is-loading');
}
function setQueryFieldsAsLoading() {
  JQ_REPO_FIELD.prop('disabled', true);
  JQ_SEARCH_BTN.addClass('is-loading');
}
function disableQueryFields() {
  JQ_REPO_FIELD.prop('disabled', true);
  JQ_SEARCH_BTN.prop('disabled', true);
  JQ_SEARCH_BTN.removeClass('is-loading');
}

function getQueryOrDefault(defaultVal) {
  if (!JQ_REPO_FIELD.val()) {
    JQ_REPO_FIELD.val(defaultVal);
  }
  return JQ_REPO_FIELD.val();
}

function setApiCallsLabel(total) {
  JQ_TOTAL_CALLS.html(total + " calls");
}

function drawAddTokenBtn(accessToken) {
  let verb = 'Add';
  if (accessToken) {
    verb = 'Edit';
    JQ_TOKEN_FIELD.val(accessToken);
  }
  JQ_TOKEN_BTN.html('<img src="assets/settings-icon.png" alt="settings" />'
      + '<strong>&nbsp;&nbsp;' + verb + ' Access Token</strong>');
  JQ_POPUP_TITLE.html(verb + ' GitHub Access Token');
}

function getJqId_$(id) {
  return $('#' + id);
}


/* Initializing callbacks. */
JQ_TOKEN_BTN.click(event => {
  event.preventDefault();
  openTokenDialog();
});
JQ_TOKEN_CLOSE.click(event => {
  event.preventDefault();
  closeTokenDialog();
});
JQ_TOKEN_SAVE.click(event => {
  event.preventDefault();
  const INPUT_TOKEN = JQ_TOKEN_FIELD.val();
  localStorage.setItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY, INPUT_TOKEN);
  LOCAL_STORAGE_GITHUB_ACCESS_TOKEN = INPUT_TOKEN;
  drawAddTokenBtn(INPUT_TOKEN);
  closeTokenDialog();
});
JQ_TOKEN_FIELD.keyup(event => {
  if (event.keyCode === 13) { // 'ENTER'
    JQ_TOKEN_SAVE.click();
  }
  if (event.keyCode === 27) { // 'ESC'
    closeTokenDialog();
  }
});


/* Gather the saved Access Token. */
const GITHUB_ACCESS_TOKEN_STORAGE_KEY = "useful-forks-access-token";
let LOCAL_STORAGE_GITHUB_ACCESS_TOKEN = localStorage.getItem(GITHUB_ACCESS_TOKEN_STORAGE_KEY);
drawAddTokenBtn(LOCAL_STORAGE_GITHUB_ACCESS_TOKEN);

/** Grabs the URL Param used for automatic queries. */
function getRepoNameFromUrl() {
  let repo = new URLSearchParams(location.search).get('repo');
  if (!repo) {
    repo = new URLSearchParams(location.search).get('repository');
  }
  return repo;
}

/** Only displays the landing page message if no automatic-query param is found in the URL. */
function landingPageTrigger() {
  const query = getRepoNameFromUrl();
  if (query) {
    JQ_REPO_FIELD.val(query);
    return "";
  } else {
    return LANDING_PAGE_INIT_MSG;
  }
}

/* Initialize the structure used by the 'queries-logic.js' */
$('#useful_forks_inject').append(
    $('<div>', {id: UF_ID_WRAPPER}).append(
        $('<div>', {id: UF_ID_HEADER}),
        $('<div>', {id: UF_ID_MSG}).html(landingPageTrigger()),
        $('<div>', {id: UF_ID_DATA}).append(
            $('<table>', {id: UF_ID_TABLE}).append(
                $('<tbody>')
            )
        )
    )
);
const JQ_ID_HEADER  = getJqId_$(UF_ID_HEADER);
const JQ_ID_MSG     = getJqId_$(UF_ID_MSG);
const JQ_ID_TABLE   = getJqId_$(UF_ID_TABLE);