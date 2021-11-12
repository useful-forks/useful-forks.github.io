const SELF_URL = "https://useful-forks.github.io/";

const JQ_REPO_FIELD  = $('#repo');
const JQ_SEARCH_BTN  = $('#searchBtn');
const JQ_TOTAL_CALLS = $('#totalApiCalls');

const UF_MSG_NO_FORKS     = "No one forked this specific repository.";
const UF_MSG_SCANNING     = "Currently scanning all the forks.";
const UF_MSG_EMPTY_FILTER = "All the forks have been filtered out: you can now rest easy!";
const UF_TABLE_SEPARATOR  = "｜";
const UF_MSG_ERROR        = "There seems to have been an error.<br>"
    + "Maybe you had a typo in the provided input? Or the Access Token credentials are invalid?<br>"
    + "If the scan is continuing, ignore this: the GitHub API some times returns erroneous data.";
const UF_MSG_SLOWER       = "The scan is slowing down (and will stall for a little while) due to the high amount of requests.<br>"
    + "(This is to prevent GitHub API from refusing to respond due to thinking those requests are malicious.)";
const UF_MSG_API_RATE     = "<b>GitHub API rate-limits exceeded.</b> Consider providing an <b>Access Token</b> if you haven't already (click the button at the top-right).<br>"
    + "The amount of API calls you are allowed to do will re-accumulate over time: you can try again later on.<br>"
    + "It's also possible that the queried repository has so many forks that it's impossible to scan it completely without running out of API calls.<br>"
    + ":(";


const EXAMPLE_LINK_1 = `<a href="${buildAutoQueryURL('payne911/PieMenu')}"
                           onclick="ga_shortExampleLink();">payne911/PieMenu</a>`;
const EXAMPLE_LINK_2 = `<a href="${buildAutoQueryURL('https://github.com/payne911/PieMenu')}"
                           onclick="ga_fullExampleLink();">https://github.com/payne911/PieMenu</a>`;
const BODY_REPO_LINK = `<a href="${buildGithubRepoURL('useful-forks/useful-forks.github.io')}"
                           onclick="ga_bodyRepoLink();">the GitHub project</a>`;
const LANDING_PAGE_INIT_MSG = "<h1 class='title'>Introducing:</h1>"
    + "<img src='assets/useful-forks-banner.png' alt='useful-forks banner' width='500'/><br/><br/>"
    + "It aims at increasing the discoverability of <strong>useful</strong> forks of open-source projects.<br/>"
    + "Simply type a repository's URL in the Text Field above. Both of those examples are valid entries: <br/>"
    + "<strong>" + EXAMPLE_LINK_1 + "</strong> and <strong>" + EXAMPLE_LINK_2 + "</strong>.<br/><br/>"
    + "The criteria is simple: <strong>if a fork was created, but never received any other activity on its <span class='is-family-monospace'>master</span> branch, it is filtered out.</strong><br/>"
    + "The results are sorted by the amount of stars.<br/><br/>"
    + "For more information, check out " + BODY_REPO_LINK + ".";


const SVG_FORK = '<svg class="octicon octicon-repo-forked v-align-text-bottom" viewBox="0 0 10 16" width="10" height="16" aria-hidden="true" role="img"><title>Amount of forks, or name of the repository</title><path fill-rule="evenodd" d="M8 1a1.993 1.993 0 00-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 002 1a1.993 1.993 0 00-1 3.72V6.5l3 3v1.78A1.993 1.993 0 005 15a1.993 1.993 0 001-3.72V9.5l3-3V4.72A1.993 1.993 0 008 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg>';
const SVG_STAR = '<svg class="octicon octicon-star v-align-text-bottom" viewBox="0 0 14 16" width="14" height="16" aria-label="star" role="img"><title>Amount of stars</title><path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path></svg>';
const SVG_EYE  = '<svg class="octicon octicon-eye v-align-text-bottom" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" role="img"><title>Amount of watchers</title><path fill-rule="evenodd" d="M8.06 2C3 2 0 8 0 8s3 6 8.06 6C13 14 16 8 16 8s-3-6-7.94-6zM8 12c-2.2 0-4-1.78-4-4 0-2.2 1.8-4 4-4 2.22 0 4 1.8 4 4 0 2.22-1.78 4-4 4zm2-4c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z"></path></svg>';
const SVG_DATE = '<svg class="octicon octicon-history text-gray" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" role="img"><title>Date of the most recent push in ANY branch of the repository</title><path fill-rule="evenodd" d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"></path></svg>';

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
function getDateCol(date) {
  return SVG_DATE + ' ' + date;
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
function tableIsEmpty(table) {
  if (table === undefined) { // faking overloaded function
    table = getTableBody();
  }
  return table.children().length === 0;
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
  const errorMsg = JQ_ID_MSG.html();
  if (errorMsg !== UF_MSG_ERROR && errorMsg !== UF_MSG_SLOWER)
    clearMsg();
}
function setHeader(msg) {
  JQ_ID_HEADER.html(msg);
}
function clearHeader() {
  JQ_ID_HEADER.empty();
}

/* Search Query Fields */
function enableQueryFields() {
  JQ_REPO_FIELD.prop('disabled', false);
  JQ_SEARCH_BTN.prop('disabled', false);
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
const UF_ID_WRAPPER = 'useful_forks_wrapper';
const UF_ID_HEADER  = 'useful_forks_header';
const UF_ID_MSG     = 'useful_forks_msg';
const UF_ID_DATA    = 'useful_forks_data';
const UF_ID_TABLE   = 'useful_forks_table';
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
function getJqId_$(id) {
  return $('#' + id);
}
const JQ_ID_HEADER  = getJqId_$(UF_ID_HEADER);
const JQ_ID_MSG     = getJqId_$(UF_ID_MSG);
const JQ_ID_TABLE   = getJqId_$(UF_ID_TABLE);