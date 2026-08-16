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
let REPO_DATE;
let TOTAL_FORKS;
let RATE_LIMIT_EXCEEDED;
let TOTAL_API_CALLS_COUNTER;
let ONGOING_REQUESTS_COUNTER = 0;
let IS_USEFUL_FORK; // function that determines if a fork is useful or not
let SEEN_FORKS = new Set(); // dedup guard for detached/source scans


/** Used to reset the state for a brand new query. */
function clear_old_data() {
  clearHeader();
  clearMsg();
  removeProgressBar();
  TABLE_DATA = []; // clear the table data
  clearTable(); // clear the table DOM
  setApiCallsLabel(0);
  hideExportCsvBtn();
  REPO_DATE = new Date();
  TOTAL_FORKS = 0;
  RATE_LIMIT_EXCEEDED = false;
  TOTAL_API_CALLS_COUNTER = 0;
  ONGOING_REQUESTS_COUNTER = 0;
  shouldTriggerQueryOnTokenSave = false;
  if (typeof SEEN_FORKS !== 'undefined') SEEN_FORKS.clear();
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
  const lower = (name||'').toLowerCase();
  if (typeof SEEN_FORKS !== 'undefined' && SEEN_FORKS.has(lower)) return true;
  for (const fork of TABLE_DATA) {
    if (fork['name'].toLowerCase() === lower)
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

/**
 * Exploratory fallback for detached forks (Issue #76).
 *
 * GitHub now allows intentional detachment of a fork network:
 * - https://stackoverflow.com/questions/16052477/delete-fork-dependency-of-a-github-repository/79633266#79633266
 * - GH Support "detach fork" option at https://support.github.com/request/fork
 *
 * Once detached, a repository becomes standalone (fork:false, source:null, parent:null)
 * and is no longer returned by the listForks API nor by the forks insights page.
 * Example: dirk-thomas/vcstool (root, 104 forks) vs ros-infrastructure/vcs2l
 * (originally ros-infrastructure/vcstool, a fork of dirk-thomas/vcstool, renamed to vcs2l
 * and detached). It is now impossible to discover via:
 *   https://github.com/dirk-thomas/vcstool/forks?include=active,archived,inactive,network
 *   https://api.github.com/repos/dirk-thomas/vcstool/forks
 * resulting in segmentation of the fork tree.
 *
 * See GitHub Community discussion:
 *   https://github.com/orgs/community/discussions/173970
 *
 * This function attempts best-effort discovery via Search API:
 * - Searches for repositories with the same repo name (e.g., "vcstool in:name")
 * - Filters out the queried repo itself and already-known forks
 * - Tries to validate sharing history via compareCommits in update_table_data
 *
 * LIMITATIONS:
 * - Renamed detached forks (vcstool -> vcs2l) will NOT be found by name search.
 *   There is no GitHub API to find renamed detached forks without an external index
 *   (e.g., GH Archive, or maintaining a database of known forks).
 * - Search API has stricter rate limits (10 req/min unauth) and returns at most 1000 results.
 * - Forks that were detached and then heavily rewritten may no longer share commit history
 *   and will be filtered out as unrelated by compareCommits.
 *
 * Therefore this fallback is opportunistic and may still miss some detached forks.
 * For complete reliability, users would need to manually track parent links
 * or use an external fork-index service.
 */
let DETACHED_SEARCH_COUNT = 0;
let DETACHED_PAGE_COUNT = 0;
const DETACHED_MAX_SEARCHES = 10;
const DETACHED_MAX_PAGES = 5;

function request_detached_forks_via_search(user, repo, defaultBranch, parentLanguage) {
  // Opt-in guard – default off (high risk)
  if (typeof UF_SETTINGS_DETACHED !== 'undefined' && !UF_SETTINGS_DETACHED) return;
  if (typeof UF_SETTINGS_DETACHED === 'undefined') return; // safe default – do not run if settings not loaded
  if (RATE_LIMIT_EXCEEDED) return;
  if (DETACHED_SEARCH_COUNT >= DETACHED_MAX_SEARCHES) return;

  // Avoid excessive API usage for very common repo names
  const searchQuery = `${repo} in:name fork:true`;
  const requestPromise = () => {
    DETACHED_SEARCH_COUNT++;
    return octokit.search.repos({
      q: searchQuery,
      per_page: 10, // cap 10 results (was 30) to reduce noise & quota
      sort: "stars",
      order: "desc"
    });
  };

  const onSuccess = (responseHeaders, responseData) => {
    if (isEmpty(responseData.items)) return;

    // language/stars filter & double-count guard
    const candidates = responseData.items
      .filter(r => r.full_name.toLowerCase() !== `${user}/${repo}`.toLowerCase())
      .filter(r => !is_duplicate_repo(r.full_name))
      .filter(r => {
        if ((r.stargazers_count||0) < 3) return false;
        if (parentLanguage && r.language && parentLanguage !== r.language) {
          if ((r.stargazers_count||0) < 20) return false;
        }
        return true;
      })
      .slice(0,10) // cap 10
      .map(r => {
        const lower = (r.full_name||'').toLowerCase();
        if (typeof SEEN_FORKS !== 'undefined') SEEN_FORKS.add(lower);
        return {
          full_name: r.full_name,
          stargazers_count: r.stargazers_count,
          forks_count: r.forks_count,
          pushed_at: r.pushed_at || new Date().toISOString(),
          owner: { login: r.owner.login },
          name: r.name,
          default_branch: r.default_branch || defaultBranch,
          language: r.language
        };
      });

    if (candidates.length > 0) {
      update_table_data(candidates, user, repo, defaultBranch);
    }
  };

  const onFailure = () => { console.warn('[detached] search fallback failed (best-effort)', searchQuery); };
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

    // Fix #76 mitigation: detached forks segmentation – opt-in, capped, best-effort
    // High risk (API blow-up, double scan). Gated behind UF_SETTINGS_DETACHED default off.
    // Caps: max 5 extra pages for source/parent networks, depth 1 only (no recursive source-of-source).
    // Documented limitation: renamed detached forks (vcstool->vcs2l) cannot be found by name search.
    if (typeof UF_SETTINGS_DETACHED !== 'undefined' && UF_SETTINGS_DETACHED) {
      if (responseData.source) {
        const sourceParts = responseData.source.full_name.split('/');
        const lowerSource = responseData.source.full_name.toLowerCase();
        // double-count guard + depth 1 cap
        if (sourceParts.length === 2 && (sourceParts[0] !== user || sourceParts[1] !== repo)) {
          if (typeof SEEN_FORKS === 'undefined' || !SEEN_FORKS.has(lowerSource)) {
            if (DETACHED_PAGE_COUNT < 5) {
              DETACHED_PAGE_COUNT++;
              if (typeof SEEN_FORKS !== 'undefined') SEEN_FORKS.add(lowerSource);
              request_fork_page(1, sourceParts[0], sourceParts[1], responseData.source.default_branch || responseData.default_branch);
            }
          }
        }
        if (responseData.parent && responseData.parent.full_name !== responseData.source.full_name) {
          const parentParts = responseData.parent.full_name.split('/');
          const lowerParent = responseData.parent.full_name.toLowerCase();
          if (parentParts.length === 2) {
            if (typeof SEEN_FORKS === 'undefined' || !SEEN_FORKS.has(lowerParent)) {
              if (DETACHED_PAGE_COUNT < 5) {
                DETACHED_PAGE_COUNT++;
                if (typeof SEEN_FORKS !== 'undefined') SEEN_FORKS.add(lowerParent);
                request_fork_page(1, parentParts[0], parentParts[1], responseData.parent.default_branch || responseData.default_branch);
              }
            }
          }
        }
      }

      // Best-effort search for detached forks that kept the same repo name – cap 10 results, language+stars filter
      const parentLang = responseData.language || null;
      request_detached_forks_via_search(user, repo, responseData.default_branch, parentLang);
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

  let queryString = getQueryOrDefault("payne911/PieMenu");
  const queryValues = parse_query(queryString);

  if (!queryValues) {
    setMsg('Please enter a valid query: it should contain two strings separated by a "/", or the full URL to a GitHub repo');
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
