const { Octokit } = require("@octokit/rest");
const { throttling } = require("@octokit/plugin-throttling");


/* Filtering constants. */
const attributeRgx = '([a-z]+)';
const operatorRgx = '(<=|>=|[<=>])';
const dateRgx = '[0-9]{4}(?:(?<!-|-[0-9])-[0-9]{0,2}){0,2}';
const valueRgx = `(${dateRgx}|[0-9]+)`;
const regex = new RegExp(attributeRgx + operatorRgx + valueRgx);
const mapTable = {
  'ahead': 'ahead_by',
  'behind': 'behind_by',
  'pushed': 'pushed_at',
  'date': 'pushed_at',
  'd': 'pushed_at',
  'a': 'ahead_by',
  'b': 'behind_by',
  'p': 'pushed_at',
  's': 'stars',
  'f': 'forks',
};

/* Variables that should be cleared for every new query (defaults are set in "clear_old_data"). */
let TABLE_DATA = [];
let TABLE_DATA_GIST = [];
let REPO_DATE;
let TOTAL_FORKS;
let RATE_LIMIT_EXCEEDED;
let TOTAL_API_CALLS_COUNTER;
let ONGOING_REQUESTS_COUNTER = 0;
let IS_USEFUL_FORK; // function that determines if a fork is useful or not
let GIST_DONE = false;
let SEEN_GISTS = new Set();
const GIST_ID_REGEX = /^[a-f0-9]{5,32}$/i;


/** Used to reset the state for a brand new query. */
function clear_old_data() {
  clearHeader();
  clearMsg();
  removeProgressBar();
  TABLE_DATA = []; // clear the table data
  TABLE_DATA_GIST = [];
  SEEN_GISTS = new Set();
  GIST_DONE = false;
  clearTable(); // clear the table DOM
  setApiCallsLabel(0);
  hideExportCsvBtn();
  REPO_DATE = new Date();
  TOTAL_FORKS = 0;
  RATE_LIMIT_EXCEEDED = false;
  TOTAL_API_CALLS_COUNTER = 0;
  ONGOING_REQUESTS_COUNTER = 0;
  shouldTriggerQueryOnTokenSave = false;
}

function getOnlyDate(full) {
  return full.split('T')[0];
}

function extract_username_from_fork(combined_name) {
  return combined_name.split('/')[0];
}

function badge_width(number) {
  return 70 * number.toString().length; // magic number 70 extracted from analyzing 'shields.io'
}

/** Credits to https://shields.io/ */
function ahead_badge(amount, url) {
  return `
  <a href="${url}" target="_blank" rel="noopener noreferrer">
    <svg xmlns="http://www.w3.org/2000/svg" width="88" height="24" role="img">
      <title>How far ahead this fork's default branch is compared to its parent's default branch</title>
      <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="88" height="18" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="43" height="18" fill="#555"/><rect x="43" width="45" height="18" fill="#007ec6"/><rect width="88" height="18" fill="url(#s)"/></g>
      <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
        <text aria-hidden="true" x="225" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="330">ahead</text>
        <text x="225" y="130" transform="scale(.1)" fill="#fff" textLength="330">ahead</text>
        <text x="645" y="130" transform="scale(.1)" fill="#fff" textLength="${badge_width(amount)}">${amount}</text>
      </g>
    </svg>
  </a>`;
}

/** Credits to https://shields.io/ */
function behind_badge(amount, url) {
  const color = amount === 0 ? '#4c1' : '#007ec6'; // green only when not behind, blue otherwise
  return `
  <a href="${url}" target="_blank" rel="noopener noreferrer">
    <svg xmlns="http://www.w3.org/2000/svg" width="92" height="24" role="img">
      <title>How far behind this fork's default branch is compared to its parent's default branch</title>
      <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="92" height="18" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="47" height="18" fill="#555"/>
      <rect x="47" width="45" height="18" fill="${color}"/><rect width="92" height="18" fill="url(#s)"/></g>
      <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
        <text aria-hidden="true" x="245" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="370">behind</text>
        <text x="245" y="130" transform="scale(.1)" fill="#fff" textLength="370">behind</text>
        <text x="685" y="130" transform="scale(.1)" fill="#fff" textLength="${badge_width(amount)}">${amount}</text>
      </g>
    </svg>
  </a>`;
}

/** Reverses the last part of the "ahead" URL. */
function getBehindUrl(aheadUrl) {
  var split = aheadUrl.split('/');
  const behind_suffix = split[split.length - 1].split('...').reverse().join('...');
  split[split.length - 1] = behind_suffix;
  return split.join('/');
}

/* --- Feature #69: Useful gists support --- */
function validateGistId(gist_id) {
  if (!gist_id) return false;
  return GIST_ID_REGEX.test(gist_id);
}
function parse_gist_query(queryString) {
  // Detect gist URLs via gist.github.com host, and also support direct gist id via ?gist=
  // If queryString is just a gist id (hex), support that as well when called via ?gist= param outside
  if (validateGistId(queryString.trim())) {
    return { gist_id: queryString.trim(), user: null };
  }
  let url;
  try {
    url = new URL(queryString);
  } catch {
    return null;
  }
  if (!url.hostname.includes('gist.github.com')) {
    return null;
  }
  const values = url.pathname.split('/').filter(s => s.length > 0);
  if (values.length === 0) return null;
  // Patterns: /<gist_id> or /<user>/<gist_id> or /<user>/<gist_id>/revisions
  let gist_id;
  let user = null;
  if (values.length === 1) {
    gist_id = values[0];
  } else {
    // First segment is username, second is gist_id
    user = values[0];
    gist_id = values[1];
  }
  // Validate gist_id strictly hex 5-32 chars
  if (!validateGistId(gist_id)) return null;
  return { gist_id, user };
}

function buildGistUrl(gist_id_or_full) {
  // gist_id may be full id; url is https://gist.github.com/<id>
  // If passed owner/id format, extract id part
  const id = gist_id_or_full.includes('/') ? gist_id_or_full.split('/')[1] : gist_id_or_full;
  return `https://gist.github.com/${id}`;
}

function getGistCol(gist_id, owner_login) {
  const display = owner_login ? `${owner_login}/${gist_id}` : gist_id;
  return `${SVG_FORK} <a href="${buildGistUrl(gist_id)}" target="_blank" rel="noopener noreferrer">${display}</a>`;
}

function update_table_gist(data) {
  clearTable();
  let table_body = getTableBody();
  for (const curr of data) {
    const { gist_id, owner_login, files_count, updated_at, html_url } = curr;
    const date_txt = compareDates(updated_at, getDateCol(updated_at));
    const NEW_ROW = $('<tr>', { id: owner_login || gist_id, class: "useful_forks_gist" });
    NEW_ROW.append(
      $('<td>').html(getGistCol(gist_id, owner_login)).attr("value", gist_id),
      $('<td>').html(UF_TABLE_SEPARATOR + SVG_FORK + ' × ' + files_count).attr("value", files_count),
      $('<td>').html(UF_TABLE_SEPARATOR + date_txt).attr("value", updated_at)
    );
    table_body.append(NEW_ROW);
  }
  sortTable();
}

function update_table_data_gist(responseData, original_gist_id) {
  if (isEmpty(responseData)) return;
  if (!RATE_LIMIT_EXCEEDED) {
    clearNonErrorMsg();
    removeProgressBar();
  }
  for (const currFork of responseData) {
    if (RATE_LIMIT_EXCEEDED) continue;
    // Isolate gists dedup via SEEN_GISTS, lower-case normalized if hex is case-insensitive
    const gid = (currFork.id || '').toLowerCase();
    if (SEEN_GISTS.has(gid)) continue;
    SEEN_GISTS.add(gid);

    let datum = {
      'name': currFork.id, // for duplicate detection
      'gist_id': currFork.id,
      'owner_login': currFork.owner ? currFork.owner.login : 'anonymous',
      'files_count': currFork.files ? Object.keys(currFork.files).length : 0,
      'updated_at': getOnlyDate(currFork.updated_at || currFork.created_at),
      'html_url': currFork.html_url || buildGistUrl(currFork.id),
      'is_gist': true
    };
    TABLE_DATA_GIST.push(datum);
    // Keep legacy TABLE_DATA for compatibility but also separate
    TABLE_DATA.push(datum);
    if (TABLE_DATA_GIST.length > 1) showFilterContainer();
    // Reuse filter attempt but gist table is separate
    if (typeof IS_USEFUL_FORK === 'function') {
      // For gists, filter may not apply; we still render via gist table
      update_table_gist(TABLE_DATA_GIST.filter(IS_USEFUL_FORK));
    } else {
      update_table_gist(TABLE_DATA_GIST);
    }
  }
}

function request_gist_fork_page(page_number, gist_id) {
  if (RATE_LIMIT_EXCEEDED) return;

  const requestPromise = () => octokit.gists.listForks({
    gist_id: gist_id,
    per_page: 100,
    page: page_number
  });
  const onSuccess = (responseHeaders, responseData) => {
    removeProgressBar();
    if (isEmpty(responseData)) {
      if (TABLE_DATA_GIST.length === 0) {
        setMsg(UF_MSG_NO_FORKS);
        enableQueryFields();
      } else {
        GIST_DONE = true;
        if (allRequestsAreDone()) {
          clearNonErrorMsg();
          removeProgressBar();
          updateBasedOnTable();
          enableQueryFields();
        }
      }
      return;
    }
    sortTable();
    const link_header = responseHeaders["link"] || responseHeaders["Link"] || responseHeaders.link;
    if (link_header) {
      let contains_next_page = link_header.indexOf('>; rel="next"') !== -1 || link_header.includes('rel="next"');
      if (contains_next_page) {
        request_gist_fork_page(page_number + 1, gist_id);
      } else {
        GIST_DONE = true;
      }
    } else {
      // no link header → single page
      GIST_DONE = true;
    }
    update_table_data_gist(responseData, gist_id);
    if (allRequestsAreDone() && GIST_DONE) {
      // For gists, we handle completion separately
      clearNonErrorMsg();
      removeProgressBar();
      updateBasedOnTable();
      enableQueryFields();
    }
  };
  const onFailure = () => displayConditionalErrorMsg();
  send(requestPromise, onSuccess, onFailure);
}

function initial_request_gist(gist_id) {
  const requestPromise = () => octokit.gists.get({
    gist_id: gist_id
  });
  const onSuccess = (responseHeaders, responseData) => {
    if (isEmpty(responseData)) return;

    const onlyDate = getOnlyDate(responseData.updated_at || responseData.created_at);
    REPO_DATE = new Date(onlyDate);
    // Gist forks count not directly given; we will discover via listForks
    // Do not touch TOTAL_FORKS – keep separate GIST_DONE flag

    let html_txt = '<b>Queried gist</b>:&nbsp;&nbsp;&nbsp;';
    const owner = responseData.owner ? responseData.owner.login : 'anonymous';
    html_txt += `${SVG_FORK} <a href="${responseData.html_url}" target="_blank" rel="noopener noreferrer">${owner}/${gist_id}</a>`;
    html_txt += UF_TABLE_SEPARATOR + getDateCol(onlyDate);
    if (responseData.files) {
      html_txt += UF_TABLE_SEPARATOR + `Files: ${Object.keys(responseData.files).length}`;
    }

    setHeader(html_txt);

    // Gist forks
    GIST_DONE = false;
    request_gist_fork_page(1, gist_id);
  };
  const onFailure = () => displayConditionalErrorMsg();
  send(requestPromise, onSuccess, onFailure);
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

function incrementCounters() {
  ONGOING_REQUESTS_COUNTER++;
  TOTAL_API_CALLS_COUNTER++;
  setApiCallsLabel(TOTAL_API_CALLS_COUNTER);
}

function onRateLimitExceeded() {
  if (!RATE_LIMIT_EXCEEDED) {
    console.warn('[useful-forks] GitHub API rate-limit exceeded. (Since useful-forks sends many requests at once, you might have a lot of `Error Code 403` in your browser Console Logs.)');
    RATE_LIMIT_EXCEEDED = true;
    setMsg(UF_MSG_API_RATE);
    disableQueryFields();
    if (!LOCAL_STORAGE_GITHUB_ACCESS_TOKEN) {
      proposeAddingToken();
    }
  }
}

function allRequestsAreDone() {
  return ONGOING_REQUESTS_COUNTER <= 0 && TOTAL_API_CALLS_COUNTER >= TOTAL_FORKS;
}

/** Detection of final request. */
function decrementCounters() {
  ONGOING_REQUESTS_COUNTER--;
  if (allRequestsAreDone()) {
    clearNonErrorMsg();
    removeProgressBar();
    updateBasedOnTable();
    enableQueryFields();
  }
}

function updateBasedOnTable() {
  clearNonScanStateMsg();
  if (tableIsEmpty(getTableBody())) {
    if (isMsgEmpty()) {
      setMsg(UF_MSG_EMPTY_FILTER);
    }
    hideExportCsvBtn();
  } else {
    displayCsvExportBtn();
  }
}

function searchNotAllowed() {
  if (shouldTriggerQueryOnTokenSave)
    return false;
  return ONGOING_REQUESTS_COUNTER !== 0 || JQ_SEARCH_BTN.hasClass('is-loading');
}

function send(requestPromise, successFn, failureFn) {
  if (RATE_LIMIT_EXCEEDED) {
    failureFn();
    return;
  }

  incrementCounters();
  requestPromise()
  .then(
      response => successFn(response.headers, response.data)) // wrapped in a { data, headers, status, url } object
  .catch(
      () => failureFn())
  .finally(
      () => decrementCounters());
}

/** Add bold to the date text if the date is earlier than the queried repo. */
function compareDates(date, html) {
  return REPO_DATE <= new Date(date) ? `<strong>${html}</strong>` : html;
}

function update_table_trying_use_filter() {
  if (typeof IS_USEFUL_FORK === 'function') {
    update_table(TABLE_DATA.filter(IS_USEFUL_FORK));
  } else {
    update_table(TABLE_DATA);
  }
}

function is_duplicate_repo(name) {
  for (const fork of TABLE_DATA) {
    if (fork['name'] === name)
      return true;
  }
  return false;
}

/** Updates table data, then calls function to update the table. */
function update_table_data(responseData, user, repo, parentDefaultBranch) {
  if (isEmpty(responseData)) {
    return;
  }

  if (!RATE_LIMIT_EXCEEDED) { // because some times gets called after some other msgs are displayed
    clearNonErrorMsg();
    removeProgressBar();
  }

  for (const currFork of responseData) {
    if (RATE_LIMIT_EXCEEDED) // we can skip everything below because they are only requests
      continue;

    if (is_duplicate_repo(currFork.full_name))
      continue; // abort because repo is already listed

    let datum = {
      'name': currFork.full_name,
      'stars': currFork.stargazers_count,
      'forks': currFork.forks_count,
    };

    /* Commits diff data (ahead/behind). */
    const requestPromise = () => octokit.repos.compareCommits({
      owner: user,
      repo: repo,
      base: parentDefaultBranch,
      head: `${extract_username_from_fork(currFork.full_name)}:${currFork.default_branch}`
    });
    const onSuccess = (responseHeaders, responseData) => {
      if (responseData.total_commits > 0) {
        datum['ahead_by'] = responseData.ahead_by;
        datum['ahead_url'] = responseData.html_url;
        datum['behind_by'] = responseData.behind_by;
        datum['behind_url'] = getBehindUrl(responseData.html_url);
        datum['pushed_at'] = getOnlyDate(currFork.pushed_at);
        TABLE_DATA.push(datum);
        if (TABLE_DATA.length > 1) showFilterContainer();
        
        update_table_trying_use_filter();
      }
    };
    const onFailure = () => { }; // do nothing
    send(requestPromise, onSuccess, onFailure);

    /* Forks of forks. */
    if (currFork.forks_count > 0) {
      request_fork_page(1, currFork.owner.login, currFork.name, currFork.default_branch);
    }
  }
}

function update_filter_appearance() {
  const filter = getFilterOrDefault();
  if (filter === '') {
    JQ_FILTER_FIELD.removeClass('is-dark');
  } else {
    JQ_FILTER_FIELD.addClass('is-dark');
  }
}

function update_filter() {
  update_filter_appearance();
  updateFilterFunction();
  update_table_trying_use_filter();

  updateBasedOnTable();
}

/**
 * Rewrites the table with the specified data.
 * @param {Array} data - Array of objects with the following keys: name, stars, forks, ahead_by, ahead_url, behind_by, behind_url, pushed_at
 */
function update_table(data) {
  clearTable();
  let table_body = getTableBody();
  for (const currFork of data) {
    const { name, stars, forks, ahead_by, ahead_url, behind_by, behind_url, pushed_at } = currFork;
    const date_txt = compareDates(pushed_at, getDateCol(pushed_at));

    const NEW_ROW = $('<tr>', { id: extract_username_from_fork(name), class: "useful_forks_repo" });
    NEW_ROW.append(
      $('<td>').html(getRepoCol(name, false)).attr("value", name),
      $('<td>').html(UF_TABLE_SEPARATOR + getStarCol(stars)).attr("value", stars),
      $('<td>').html(UF_TABLE_SEPARATOR + getForkCol(forks)).attr("value", forks),
      $('<td>').html(UF_TABLE_SEPARATOR),
      $('<td>', { class: "uf_badge" }).html(ahead_badge(ahead_by, ahead_url)).attr("value", ahead_by),
      $('<td>').html(UF_TABLE_SEPARATOR),
      $('<td>', { class: "uf_badge" }).html(behind_badge(behind_by, behind_url)).attr("value", behind_by),
      $('<td>').html(UF_TABLE_SEPARATOR + date_txt).attr("value", pushed_at)
    );
    table_body.append(NEW_ROW);
  }
  sortTable();
}

/**
 * 1. Empty filter means no filter.
 * 2. Filter string is a list of conditions separated by spaces.
 * 3. If a condition is invalid, it is ignored, and the rest of the conditions are applied.
 */
function updateFilterFunction() {
  const filter = getFilterOrDefault();
  if (filter === '') {
    IS_USEFUL_FORK = () => true; // no filter
    return;
  }

  // parse filter string into condition object
  const conditionStrList = filter.split(' ');
  let conditionObj = {};
  for (const condition of conditionStrList) {
    const matchResult = condition.match(regex);
    let [attribute, operator, value] = matchResult ? matchResult.slice(1) : [];
    if (!attribute || !operator || !value) {
      continue; // invalid condition
    }
    if (attribute in mapTable) {
      attribute = mapTable[attribute];
    }
    conditionObj[attribute] = { operator, value };
  }
  
  IS_USEFUL_FORK = (datum) => {
    for (const [attribute, { operator, value }] of Object.entries(conditionObj)) {
      const attrValue = datum[attribute];
      switch (operator) {
        case '>':
          if (attrValue <= value)
            return false;
          break;
        case '>=':
          if (attrValue < value)
            return false;
          break;
        case '<':
          if (attrValue >= value)
            return false;
          break;
        case '<=':
          if (attrValue > value)
            return false;
          break;
        case '=':
          if (attrValue != value)
            return false;
          break;
      }
    }
    return true;
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
    removeProgressBar();

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

    update_table_data(responseData, user, repo, defaultBranch);
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

    const onlyDate = getOnlyDate(responseData.pushed_at);
    REPO_DATE = new Date(onlyDate);
    TOTAL_FORKS = responseData.forks_count;

    let html_txt = '<b>Queried repository</b>:&nbsp;&nbsp;&nbsp;';
    html_txt += getRepoCol(responseData.full_name, true);
    html_txt += UF_TABLE_SEPARATOR + getStarCol(responseData.stargazers_count);
    html_txt += UF_TABLE_SEPARATOR + getForkCol(TOTAL_FORKS);
    html_txt += UF_TABLE_SEPARATOR + getWatchCol(responseData.subscribers_count);
    html_txt += UF_TABLE_SEPARATOR + getDateCol(onlyDate);

    /* Warning the user if he's not scanning from the root. */
    if (responseData.source) { // guarantees both 'source' and 'parent' are present
      html_txt += `<p class="mt-2">`;

      const source = responseData.source.full_name;
      html_txt += getForkButtonLink("Source", source);

      /* If at least 2nd level fork from source. */
      const parent = responseData.parent.full_name;
      if (parent !== source) {
        html_txt += UF_TABLE_SEPARATOR;
        html_txt += getForkButtonLink("Parent", parent);
      }

      html_txt += "</p>"
    }

    setHeader(html_txt);

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
function parse_query(queryString) {
  const shorthand = /^(?<user>[\w.-]+)\/(?<repo>[\w.-]+)$/;
  const shorthandMatch = shorthand.exec(queryString);

  if (shorthandMatch) { // we are dealing with "user/repo" input format
    const {user, repo} = shorthandMatch.groups;
    return {user, repo};
  }

  let pathname;
  try {
    pathname = new URL(queryString).pathname;
  } catch {
    return null;
  }

  const values = pathname.split('/').filter(s => s.length > 0);
  if (values.length < 2)
    return null;

  const [user, repo] = values;
  return {user, repo};
}


function initiate_search() {
  /* Checking if search is allowed. */
  if (searchNotAllowed())
    return; // abort

  clear_old_data();

  // Support explicit ?gist= param for separate table type
  let gistParam = null;
  try {
    const sp = new URLSearchParams(location.search);
    gistParam = sp.get('gist');
  } catch {}
  if (gistParam && validateGistId(gistParam)) {
    const gist_id = gistParam.trim();
    setUpOctokitWithLatestToken();
    setQuery(`https://gist.github.com/${gist_id}`);
    setQueryFieldsAsLoading();
    hideFilterContainer();
    setMsg(UF_MSG_SCANNING);
    if (history.replaceState) {
      history.replaceState({}, document.title, `?gist=${gist_id}`);
    }
    try { ga_searchQuery('gist', gist_id); } catch {}
    initial_request_gist(gist_id);
    return;
  }

  let queryString = getQueryOrDefault("payne911/PieMenu");

  // Feature #69: detect gist URLs first
  const gistQuery = parse_gist_query(queryString);
  if (gistQuery) {
    const { gist_id } = gistQuery;
    setUpOctokitWithLatestToken();
    setQuery(queryString); // keep original gist URL in field for clarity
    setQueryFieldsAsLoading();
    hideFilterContainer();
    setMsg(UF_MSG_SCANNING);

    if (history.replaceState) {
      history.replaceState({}, document.title, `?gist=${gist_id}`);
    }
    ga_searchQuery('gist', gist_id);
    initial_request_gist(gist_id);
    return;
  }

  const queryValues = parse_query(queryString);

  if (!queryValues) {
    setMsg('Please enter a valid query: it should contain two strings separated by a "/", or the full URL to a GitHub repo or gist');
    ga_faultyQuery(queryString);
    return; // abort
  }

  const {user, repo} = queryValues;

  setUpOctokitWithLatestToken();

  setQuery(`${user}/${repo}`);
  setQueryFieldsAsLoading();
  hideFilterContainer();
  setMsg(UF_MSG_SCANNING);

  if (history.replaceState) {
    history.replaceState({}, document.title, `?repo=${user}/${repo}`); // replace current URL param
  }
  ga_searchQuery(user, repo);
  initial_request(user, repo);
}

/* Object used for REST calls. */
const MyOctokit = Octokit.plugin(throttling);
let octokit;
setUpOctokitWithLatestToken();
function setUpOctokitWithLatestToken() {
  if (!shouldReconstructOctokit)
    return;

  octokit = new MyOctokit({
    auth: LOCAL_STORAGE_GITHUB_ACCESS_TOKEN,
    userAgent: 'useful-forks',
    // https://github.com/octokit/plugin-throttling.js#usage
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        onRateLimitExceeded();
        if (retryCount < 1) { // only retries once
          return true; // true = retry
        }
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => { // slow down
        setMsg(UF_MSG_SLOWER);

        // setup the progress bar
        if (!getJq_ProgressBar()[0]) { // only if it isn't displayed yet
          JQ_ID_MSG.after(`<progress class="progress is-small" value="${retryAfter}" max="${retryAfter}">some%</progress>`);
          getJq_ProgressBar().animate(
            {value: "0"}, // target for the "value" attribute
            {
                duration: 1000 * retryAfter, // in ms
                easing: 'linear',
                done: function() {
                    getJq_ProgressBar().removeAttr('value'); // for moving bar
                }
            }
          );
        }

        return true; // true = automatically retry after given amount of seconds (usually 1 min)
      }
    }
  });

  shouldReconstructOctokit = false;
}


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

/* Trigger an automatic query is a value was extracted from the URL Param. */
if (JQ_REPO_FIELD.val()) {
  JQ_SEARCH_BTN.click();
}

/* User updated the filters, so we refresh the table. */
JQ_FILTER_FIELD.on('input', update_filter);
