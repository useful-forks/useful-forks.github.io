import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";
import { throttling } from "https://cdn.skypack.dev/@octokit/plugin-throttling";

const SLOW_DOWN_MSG_THRESHOLD = 800;

/* Variables that should be cleared for every new query. */
let TOTAL_FORKS              = 0;
let RATE_LIMIT_EXCEEDED      = false;
let TOTAL_API_CALLS_COUNTER  = 0;
let ONGOING_REQUESTS_COUNTER = 0;


function extract_username_from_fork(combined_name) {
  return combined_name.split('/')[0];
}

function badge_width(number) {
  return 70 * number.toString().length; // magic number 70 extracted from analyzing 'shields.io'
}

/** Credits to https://shields.io/ */
function ahead_badge(amount) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="24" role="img"><title>How far ahead this fork\'s default branch is compared to its parent\'s default branch</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="88" height="18" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="43" height="18" fill="#555"/><rect x="43" width="45" height="18" fill="#007ec6"/><rect width="88" height="18" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="225" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="330">ahead</text><text x="225" y="130" transform="scale(.1)" fill="#fff" textLength="330">ahead</text><text x="645" y="130" transform="scale(.1)" fill="#fff" textLength="' + badge_width(amount) + '">' + amount + '</text></g></svg>';
}

/** Credits to https://shields.io/ */
function behind_badge(amount) {
  const color = amount === 0 ? '#4c1' : '#007ec6'; // green only when not behind, blue otherwise
  return '<svg xmlns="http://www.w3.org/2000/svg" width="92" height="24" role="img"><title>How far behind this fork\'s default branch is compared to its parent\'s default branch</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="92" height="18" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="47" height="18" fill="#555"/><rect x="47" width="45" height="18" fill="'+ color +'"/><rect width="92" height="18" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="245" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="370">behind</text><text x="245" y="130" transform="scale(.1)" fill="#fff" textLength="370">behind</text><text x="685" y="130" transform="scale(.1)" fill="#fff" textLength="' + badge_width(amount) + '">' + amount + '</text></g></svg>';
}

function getTdValue(rows, index, col) {
  return Number(rows.item(index).getElementsByTagName('td').item(col).getAttribute("value"));
}

function sortTable() {
  sortTableColumn(UF_ID_TABLE, 1);
}

/** 'sortColumn' index starts at 0.   https://stackoverflow.com/a/37814596/9768291 */
function sortTableColumn(table_id, sortColumn){
  let tableData = document.getElementById(table_id).getElementsByTagName('tbody').item(0);
  let rows = tableData.getElementsByTagName('tr');
  for(let i = 0; i < rows.length - 1; i++) {
    for(let j = 0; j < rows.length - (i + 1); j++) {
      if(getTdValue(rows, j, sortColumn) < getTdValue(rows, j+1, sortColumn)) {
        tableData.insertBefore(rows.item(j+1), rows.item(j));
      }
    }
  }
}

function isEmpty(aList) {
  return (!aList || aList.length === 0);
}

function displayConditionalErrorMsg() {
  if (!RATE_LIMIT_EXCEEDED)
    setMsg(UF_MSG_ERROR);
}

/** Used to reset the state for a brand new request. */
function clear_old_data() {
  clearHeader();
  clearMsg();
  clearTable();
  setApiCallsLabel(0);
  TOTAL_FORKS = 0;
  RATE_LIMIT_EXCEEDED = false;
  TOTAL_API_CALLS_COUNTER = 0;
  ONGOING_REQUESTS_COUNTER = 0;
}

function incrementCounters() {
  ONGOING_REQUESTS_COUNTER++;
  TOTAL_API_CALLS_COUNTER++;
  setApiCallsLabel(TOTAL_API_CALLS_COUNTER);

  if (TOTAL_API_CALLS_COUNTER === SLOW_DOWN_MSG_THRESHOLD) {
    setMsg(UF_MSG_SLOWER);
  }
}

function allRequestsAreDone() {
  return ONGOING_REQUESTS_COUNTER <= 0 && TOTAL_API_CALLS_COUNTER >= TOTAL_FORKS;
}

function onRateLimitExceeded() {
  if (!RATE_LIMIT_EXCEEDED) {
    console.warn('[useful-forks] GitHub API rate-limit exceeded. (Since useful-forks sends many requests at once, you might have a lot of `Error Code 403` in your browser Console Logs.)');
    RATE_LIMIT_EXCEEDED = true;
    setMsg(UF_MSG_API_RATE);
    if (!LOCAL_STORAGE_GITHUB_ACCESS_TOKEN) {
      openTokenDialog();
    }
    disableQueryFields();
  }
}

/** Detection of final request. */
function decrementCounters() {
  ONGOING_REQUESTS_COUNTER--;
  if (allRequestsAreDone()) {
    clearMsg();
    sortTable();
    enableQueryFields();
  }
}

function send(requestPromise, successFn, failureFn) {
  incrementCounters();
  requestPromise()
  .then(
      response => successFn(response.headers, response.data)) // wrapped in a { data, headers, status, url } object
  .catch(
      () => failureFn())
  .finally(
      () => decrementCounters());
}

/** Dynamically fills the second part of a row. */
function build_fork_element_html(table_body, combined_name, num_stars, num_forks) {
  const NEW_ROW = $('<tr>', {id: extract_username_from_fork(combined_name), class: "useful_forks_repo"});
  table_body.append(
      NEW_ROW.append(
          $('<td>').html(getRepoCol(combined_name, false)),
          $('<td>').html(UF_TABLE_SEPARATOR + getStarCol(num_stars)).attr("value", num_stars),
          $('<td>').html(UF_TABLE_SEPARATOR + getForkCol(num_forks)).attr("value", num_forks)
      )
  );
  return NEW_ROW;
}

/** Prepares, appends, and updates a table row. */
function add_fork_elements(forkdata_array, user, repo, parentDefaultBranch) {
  if (isEmpty(forkdata_array))
    return;

  if (!RATE_LIMIT_EXCEEDED && TOTAL_API_CALLS_COUNTER < SLOW_DOWN_MSG_THRESHOLD) // because some times gets called after some other msgs are displayed
    clearMsg();

  let table_body = getTableBody();
  for (let i = 0; i < forkdata_array.length; i++) {
    const currFork = forkdata_array[i];

    /* Basic data (name/stars/forks). */
    const NEW_ROW = build_fork_element_html(table_body, currFork.full_name, currFork.stargazers_count, currFork.forks_count);

    if (RATE_LIMIT_EXCEEDED) // we can skip everything below because they are only requests
      continue;

    /* Commits diff data (ahead/behind). */
    const requestPromise = () => octokit.repos.compareCommits({
      owner: user,
      repo: repo,
      base: parentDefaultBranch,
      head: `${extract_username_from_fork(currFork.full_name)}:${currFork.default_branch}`
    });
    const onSuccess = (responseHeaders, responseData) => {
      if (responseData.total_commits === 0) {
        NEW_ROW.remove();
        if (table_body.children().length === 0) {
          setMsg(UF_MSG_EMPTY_FILTER);
        }
      } else {
        /* Appending the commit badges to the new row. */
        NEW_ROW.append(
            $('<td>').html(UF_TABLE_SEPARATOR),
            $('<td>', {class: "uf_badge"}).html(ahead_badge(responseData.ahead_by)),
            $('<td>').html(UF_TABLE_SEPARATOR),
            $('<td>', {class: "uf_badge"}).html(behind_badge(responseData.behind_by))
        );
      }
    };
    const onFailure = () => NEW_ROW.remove();
    send(requestPromise, onSuccess, onFailure);

    /* Forks of forks. */
    if (currFork.forks_count > 0) {
      request_fork_page(1, currFork.owner.login, currFork.name, currFork.default_branch);
    }
  }
}

/** Paginated (index starts at 1) recursive forks scan. */
function request_fork_page(page_number, user, repo, defaultBranch) {
  if (RATE_LIMIT_EXCEEDED)
    return;

  const requestPromise = () => octokit.repos.listForks({
    owner: user,
    repo: repo,
    sort: "stargazers",
    per_page: 100, // maximum allowed by GitHub
    page: page_number
  });
  const onSuccess = (responseHeaders, responseData) => {
    if (isEmpty(responseData)) // repo has not been forked
      return;

    sortTable();

    /* Pagination (beyond 100 forks). */
    const link_header = responseHeaders["link"];
    if (link_header) {
      let contains_next_page = link_header.indexOf('>; rel="next"');
      if (contains_next_page !== -1) {
        request_fork_page(++page_number, user, repo, defaultBranch);
      }
    }

    /* Populate the table. */
    add_fork_elements(responseData, user, repo, defaultBranch);
  };
  const onFailure = () => displayConditionalErrorMsg();
  send(requestPromise, onSuccess, onFailure);
}

/** Updates header with Queried Repo info, and initiates forks scan. */
function initial_request(user, repo) {
  const requestPromise = () => octokit.repos.get({
    owner: user,
    repo: repo
  });
  const onSuccess = (responseHeaders, responseData) => {
    if (isEmpty(responseData))
      return;

    TOTAL_FORKS = responseData.forks_count;

    let html_txt = getRepoCol(responseData.full_name, true);
    html_txt += UF_TABLE_SEPARATOR + getStarCol(responseData.stargazers_count);
    html_txt += UF_TABLE_SEPARATOR + getWatchCol(responseData.subscribers_count);
    html_txt += UF_TABLE_SEPARATOR + getForkCol(TOTAL_FORKS);
    setHeader('<b>Queried repository</b>:&nbsp;&nbsp;&nbsp;' + html_txt);

    if (TOTAL_FORKS > 0) {
      request_fork_page(1, user, repo, responseData.default_branch);
    } else {
      setMsg(UF_MSG_NO_FORKS);
      enableQueryFields();
    }
  };
  const onFailure = () => displayConditionalErrorMsg();
  send(requestPromise, onSuccess, onFailure);
}

/** Extracts and sanitizes 'user' and 'repo' values from potential inputs. */
function initiate_search() {

  /* Checking if search is allowed. */
  if (ONGOING_REQUESTS_COUNTER !== 0 || JQ_SEARCH_BTN.hasClass('is-loading')) {
    return; // abort
  }

  clear_old_data();

  let queryString = getQueryOrDefault("payne911/PieMenu");
  let queryValues = queryString.split('/').filter(Boolean);

  let len = queryValues.length;
  if (len < 2) {
    setMsg('Please enter a valid query: it should contain two strings separated by a "/"');
    ga_faultyQuery(queryString);
    return; // abort
  }

  setQueryFieldsAsLoading();
  setMsg(UF_MSG_SCANNING);

  const user = queryValues[len - 2];
  const repo = queryValues[len - 1];
  ga_searchQuery(user, repo);
  initial_request(user, repo);
}

/* Object used for REST calls. */
const MyOctokit = Octokit.plugin(throttling);
const octokit = new MyOctokit({
  auth: LOCAL_STORAGE_GITHUB_ACCESS_TOKEN,
  userAgent: 'useful-forks',
  throttle: {
    onRateLimit: (retryAfter, options) => {
      onRateLimitExceeded();
      if (options.request.retryCount === 0) { // only retries once
        return true; // true = retry
      }
    },
    onAbuseLimit: (retryAfter, options) => {
      return true; // true = automatically retry after given amount of seconds
    }
  }
});


/* Setting up query triggers. */
JQ_SEARCH_BTN.click(event => {
  event.preventDefault();
  initiate_search();
});
JQ_REPO_FIELD.keyup(event => {
  if (event.keyCode === 13) { // 'ENTER'
    initiate_search();
  }
});

function automaticSearch(searchValue) {
  JQ_REPO_FIELD.val(searchValue);
  JQ_SEARCH_BTN.click();
}

function getRepoNameFromUrl() {
  let repo = new URLSearchParams(location.search).get('repo');
  if (!repo) {
    repo = new URLSearchParams(location.search).get('repository');
  }
  return repo;
}

/* Automatically queries when an URL parameter is present. */
const query = getRepoNameFromUrl();
if (query) {
  automaticSearch(query);
}