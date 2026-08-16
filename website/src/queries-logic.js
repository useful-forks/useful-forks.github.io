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

/* Abort / Pause / Resume state (#79, #16, #53) */
let ABORTED = false;
let PAUSED = false;
let PENDING_REQUESTS = []; // queue of {user, repo, defaultBranch, page}
let LAST_QUERY = null; // {user, repo, defaultBranch}
let CURRENT_REPO_KEY = null; // for caching (#39)
let CURRENT_ABORT_CTRL = (typeof AbortController !== 'undefined') ? new AbortController() : null;
function resetAbortCtrl() {
  if (typeof AbortController !== 'undefined') {
    try { if (CURRENT_ABORT_CTRL) CURRENT_ABORT_CTRL.abort(); } catch(e) {}
    CURRENT_ABORT_CTRL = new AbortController();
    return CURRENT_ABORT_CTRL.signal;
  }
  return null;
}

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
  ABORTED = false;
  PAUSED = false;
  PENDING_REQUESTS = [];
  try { if (CURRENT_ABORT_CTRL) CURRENT_ABORT_CTRL.abort(); } catch(e) {}
  resetAbortCtrl();
  if (typeof hideAbortBtn === 'function') hideAbortBtn();
  if (typeof hideResumeBtn === 'function') hideResumeBtn();
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
    setMsg(UF_MSG_API_RATE + '<br><br>');
    // safe button creation without inline handler
    try {
      const msgEl = document.getElementById(UF_ID_MSG);
      if (msgEl) {
        const btn = document.createElement('button');
        btn.id = 'resumeBtnInline';
        btn.className = 'button is-warning is-small mt-2';
        btn.textContent = 'Resume scan';
        btn.addEventListener('click', resumeSearch);
        msgEl.appendChild(document.createElement('br'));
        msgEl.appendChild(document.createElement('br'));
        msgEl.appendChild(btn);
      }
    } catch(e) {}
    disableQueryFields();
    if (typeof hideAbortBtn === 'function') hideAbortBtn();
    if (typeof showResumeBtn === 'function') showResumeBtn();
    else {
      // fallback: try to make resumeBtn visible if exists
      const rb = document.getElementById('resumeBtn');
      if (rb) rb.style.display = 'inline-block';
    }
    saveCacheToStorage();
    if (!LOCAL_STORAGE_GITHUB_ACCESS_TOKEN) {
      proposeAddingToken();
    }
  }
}

function allRequestsAreDone() {
  if (ABORTED || PAUSED) return false; // don't trigger finalization when aborted/paused; explicit handling does it
  return ONGOING_REQUESTS_COUNTER <= 0 && TOTAL_API_CALLS_COUNTER >= TOTAL_FORKS;
}

/** Detection of final request. */
function decrementCounters() {
  ONGOING_REQUESTS_COUNTER--;
  if (ONGOING_REQUESTS_COUNTER < 0) ONGOING_REQUESTS_COUNTER = 0;
  if (ABORTED) {
    // when aborted, don't run finalization; counters already cleared
    return;
  }
  if (PAUSED) {
    if (ONGOING_REQUESTS_COUNTER <= 0) {
      setMsg(`Paused. ${TABLE_DATA.length} useful forks found so far. `);
      try {
        const msgEl = document.getElementById(UF_ID_MSG);
        if (msgEl) {
          const btn = document.createElement('button');
          btn.className = 'button is-small is-info ml-2';
          btn.textContent = 'Resume';
          btn.addEventListener('click', resumeSearch);
          msgEl.appendChild(document.createTextNode(' '));
          msgEl.appendChild(btn);
        }
      } catch(e) {}
      enableQueryFields();
    }
    return;
  }
  if (allRequestsAreDone()) {
    clearNonErrorMsg();
    removeProgressBar();
    updateBasedOnTable();
    enableQueryFields();
    if (typeof hideAbortBtn === 'function') hideAbortBtn();
    if (typeof hideResumeBtn === 'function') hideResumeBtn();
    saveCacheToStorage();
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
  if (ABORTED) return false; // allow new search after abort (ABORTED cleared in clear_old_data)
  if (PAUSED) return true; // prevent new search while paused; use resume
  return ONGOING_REQUESTS_COUNTER !== 0 || JQ_SEARCH_BTN.hasClass('is-loading');
}

function send(requestPromise, successFn, failureFn) {
  if (RATE_LIMIT_EXCEEDED || ABORTED || PAUSED) {
    if (RATE_LIMIT_EXCEEDED || PAUSED) {
      // queue for resume later if it's a fork-page request; individual compareCommits can be dropped
      // caller will handle queuing for fork pages
    }
    failureFn();
    return;
  }
  if (CURRENT_ABORT_CTRL && CURRENT_ABORT_CTRL.signal && CURRENT_ABORT_CTRL.signal.aborted) {
    failureFn();
    return;
  }

  incrementCounters();
  // attempt to pass abort signal via Octokit if supported
  let promise;
  try {
    promise = requestPromise(CURRENT_ABORT_CTRL ? CURRENT_ABORT_CTRL.signal : undefined);
    if (!promise || typeof promise.then !== 'function') {
      // requestPromise ignored signal arg (original signature) – call without arg
      promise = requestPromise();
    }
  } catch(e) {
    promise = requestPromise();
  }
  promise
  .then(
      response => {
        if (ABORTED || (CURRENT_ABORT_CTRL && CURRENT_ABORT_CTRL.signal && CURRENT_ABORT_CTRL.signal.aborted)) return;
        successFn(response.headers, response.data);
      }) // wrapped in a { data, headers, status, url } object
  .catch(
      () => failureFn())
  .finally(
      () => decrementCounters());
}

/** Abort current search, preserve results (#79, #16) */
function abortSearch() {
  if (ONGOING_REQUESTS_COUNTER === 0 && !JQ_SEARCH_BTN.hasClass('is-loading')) return;
  ABORTED = true;
  PAUSED = false;
  console.warn('[useful-forks] Search aborted by user, preserving', TABLE_DATA.length, 'results');
  ONGOING_REQUESTS_COUNTER = 0;
  PENDING_REQUESTS = []; // clear queue on abort – prevents flood on later resume
  try { if (CURRENT_ABORT_CTRL) CURRENT_ABORT_CTRL.abort(); } catch(e) {}
  resetAbortCtrl();
  removeProgressBar();
  enableQueryFields();
  if (typeof hideAbortBtn === 'function') hideAbortBtn();
  if (typeof hideResumeBtn === 'function') hideResumeBtn();
  const inlineResume = document.getElementById('resumeBtnInline');
  if (inlineResume) inlineResume.remove();
  if (tableIsEmpty(getTableBody()) && TABLE_DATA.length === 0) {
    setMsg(typeof UF_MSG_ABORTED !== 'undefined' ? UF_MSG_ABORTED : 'Search aborted.');
  } else {
    setMsg((typeof UF_MSG_ABORTED !== 'undefined' ? UF_MSG_ABORTED : 'Search aborted.') + ` Preserved ${TABLE_DATA.length} results.`);
    displayCsvExportBtn();
  }
  saveCacheToStorage();
}

function pauseSearch() {
  if (PAUSED || ABORTED) return;
  PAUSED = true;
  console.warn('[useful-forks] Paused');
  if (typeof hideAbortBtn === 'function') hideAbortBtn();
  if (typeof showResumeBtn === 'function') showResumeBtn();
}

function resumeSearch() {
  if (!PAUSED && !RATE_LIMIT_EXCEEDED) {
    // if not paused nor rate-limited, check if we have pending queue to resume from abort
    if (PENDING_REQUESTS.length === 0 && !ABORTED) return;
  }
  const wasRateLimited = RATE_LIMIT_EXCEEDED;
  RATE_LIMIT_EXCEEDED = false;
  const wasAborted = ABORTED;
  ABORTED = false;
  PAUSED = false;
  const inlineBtn = document.getElementById('resumeBtnInline');
  if (inlineBtn) inlineBtn.remove();
  if (typeof hideResumeBtn === 'function') hideResumeBtn();
  setMsg(typeof UF_MSG_RESUMED !== 'undefined' ? UF_MSG_RESUMED : 'Resuming scan...');
  setQueryFieldsAsLoading();
  saveCacheToStorage();

  // Re-trigger queued fork pages – throttled p-limit 3 style to avoid secondary rate-limit
  if (PENDING_REQUESTS.length > 0) {
    const queueCopy = [...PENDING_REQUESTS];
    PENDING_REQUESTS = [];
    // simple throttling: 3 concurrent, staggered 350ms
    let idx = 0;
    function nextBatch() {
      const batch = queueCopy.slice(idx, idx+3);
      idx += 3;
      for (const req of batch) {
        request_fork_page(req.page, req.user, req.repo, req.defaultBranch);
      }
      if (idx < queueCopy.length) {
        setTimeout(nextBatch, 350);
      }
    }
    nextBatch();
  } else if (LAST_QUERY && wasAborted) {
    // Fallback: if aborted without explicit queue, resume remaining fork pages from last known state is hard;
    // we at least clear abort flag so a manual re-search can continue, and show message.
    if (wasAborted) {
      setMsg(`Resumed after abort. ${TABLE_DATA.length} results kept. Start a new scan to look for more, or reload cache.`);
      enableQueryFields();
    }
  } else if (LAST_QUERY && wasRateLimited) {
    // If rate-limited but no queued pages (e.g., initial request failed), retry initial request
    if (TOTAL_FORKS === 0) {
      initial_request(LAST_QUERY.user, LAST_QUERY.repo);
    }
  }
  // Also if we had a current repo tracked, resume its scan
  if (CURRENT_REPO_KEY && !wasAborted) {
    // caching already saved; attempting to continue doesn't need extra action because fork pages still pending via counters
  }
}

/** Cache helpers (localStorage) – #39 */
function getCacheKey(repo) {
  if (!repo) return null;
  return 'uf-cache-' + repo.toLowerCase();
}
function saveCacheToStorage() {
  try {
    if (!CURRENT_REPO_KEY) return;
    if (!TABLE_DATA || TABLE_DATA.length === 0) return;
    const key = getCacheKey(CURRENT_REPO_KEY);
    if (!key) return;
    const payload = {
      timestamp: Date.now(),
      repo: CURRENT_REPO_KEY,
      tableData: TABLE_DATA,
      header: '', // store raw data only, never HTML (prevents persisted XSS)
      totalCalls: TOTAL_API_CALLS_COUNTER,
      totalForks: TOTAL_FORKS
    };
    const serialized = JSON.stringify(payload);
    // size cap 2MB – skip cache if too large (prevents QuotaExceededError loop)
    if (serialized.length > 2*1024*1024) {
      console.warn('[useful-forks] cache too large (>2MB), skipping save for', CURRENT_REPO_KEY, serialized.length);
      return;
    }
    localStorage.setItem(key, serialized);
    localStorage.setItem('uf-cache-last-repo', CURRENT_REPO_KEY);
    // console.log('cache saved', key, payload.tableData.length);
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      console.warn('cache save failed – quota exceeded, clearing last-repo marker', e);
      try { localStorage.removeItem('uf-cache-last-repo'); } catch(e2) {}
    } else {
      console.warn('cache save failed', e);
    }
  }
}
function loadCacheFromStorage(repo) {
  try {
    const key = getCacheKey(repo);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > 3600000) return null; // 1h expiry
    return data;
  } catch (e) {
    return null;
  }
}
function restoreCacheFromStorage(repo) {
  const cached = loadCacheFromStorage(repo);
  if (!cached) return false;
  TABLE_DATA = cached.tableData || [];
  if (typeof setHeader === 'function' && cached.header) setHeader(cached.header);
  if (typeof setApiCallsLabel === 'function') setApiCallsLabel(cached.totalCalls || TABLE_DATA.length);
  if (typeof update_table_trying_use_filter === 'function') {
    update_table_trying_use_filter();
  } else if (typeof update_table === 'function') {
    update_table(TABLE_DATA);
  }
  if (TABLE_DATA.length > 1 && typeof showFilterContainer === 'function') showFilterContainer();
  if (typeof updateBasedOnTable === 'function') updateBasedOnTable();
  const ageMin = Math.round((Date.now()-cached.timestamp)/60000);
  setMsg((typeof UF_MSG_CACHED_RESTORED !== 'undefined' ? UF_MSG_CACHED_RESTORED : 'Restored cached results') + ` (${ageMin} min ago, ${TABLE_DATA.length} forks)`);
  if (typeof hideAbortBtn === 'function') hideAbortBtn();
  if (typeof hideResumeBtn === 'function') hideResumeBtn();
  return true;
}

// Expose for inline onclick handlers and for tryOfferCache in queries-init
if (typeof window !== 'undefined') {
  window.abortSearch = abortSearch;
  window.pauseSearch = pauseSearch;
  window.resumeSearch = resumeSearch;
  window.restoreCache = restoreCacheFromStorage;
  window.saveCacheToStorage = saveCacheToStorage;
  window.TABLE_DATA = TABLE_DATA; // initially, but TABLE_DATA will be mutated later; keep reference sync via function
}

// Auto-save before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try { saveCacheToStorage(); } catch(e) {}
  });
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
  if (ABORTED) return;
  if (isEmpty(responseData)) {
    return;
  }

  if (!RATE_LIMIT_EXCEEDED) { // because some times gets called after some other msgs are displayed
    clearNonErrorMsg();
    removeProgressBar();
  }

  for (const currFork of responseData) {
    if (RATE_LIMIT_EXCEEDED || ABORTED || PAUSED) // we can skip everything below because they are only requests
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
      if (ABORTED) return;
      if (responseData.total_commits > 0) {
        datum['ahead_by'] = responseData.ahead_by;
        datum['ahead_url'] = responseData.html_url;
        datum['behind_by'] = responseData.behind_by;
        datum['behind_url'] = getBehindUrl(responseData.html_url);
        datum['pushed_at'] = getOnlyDate(currFork.pushed_at);
        TABLE_DATA.push(datum);
        if (TABLE_DATA.length > 1) showFilterContainer();
        
        update_table_trying_use_filter();
        // incremental cache save
        if (TABLE_DATA.length % 5 === 0) saveCacheToStorage();
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
  if (RATE_LIMIT_EXCEEDED || ABORTED || PAUSED) {
    if (RATE_LIMIT_EXCEEDED || PAUSED) {
      // queue for later resume (#53)
      const exists = PENDING_REQUESTS.some(r=> r.user===user && r.repo===repo && r.page===page_number);
      if (!exists) PENDING_REQUESTS.push({user, repo, defaultBranch, page: page_number});
    }
    return;
  }

  const requestPromise = () => octokit.repos.listForks({
    owner: user,
    repo: repo,
    sort: "stargazers",
    per_page: 100, // maximum allowed by GitHub
    page: page_number
  });
  const onSuccess = (responseHeaders, responseData) => {
    if (ABORTED || PAUSED) {
      if (PAUSED) {
        const exists = PENDING_REQUESTS.some(r=> r.user===user && r.repo===repo && r.page===page_number+1);
        // pagination continuation already handled below; queuing is done if rate-limit/pause
      }
      return;
    }
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
  const onFailure = () => {
    if (RATE_LIMIT_EXCEEDED || PAUSED) {
      const exists = PENDING_REQUESTS.some(r=> r.user===user && r.repo===repo && r.page===page_number);
      if (!exists) PENDING_REQUESTS.push({user, repo, defaultBranch, page: page_number});
    }
    displayConditionalErrorMsg();
  };
  send(requestPromise, onSuccess, onFailure);
}

/** Updates header with Queried Repo info, and initiates forks scan. */
function initial_request(user, repo) {
  if (ABORTED) return;
  CURRENT_REPO_KEY = `${user}/${repo}`;
  LAST_QUERY = {user, repo, defaultBranch: null};
  const requestPromise = () => octokit.repos.get({
    owner: user,
    repo: repo
  });
  const onSuccess = (responseHeaders, responseData) => {
    if (ABORTED) return;
    if (isEmpty(responseData))
      return;

    const onlyDate = getOnlyDate(responseData.pushed_at);
    REPO_DATE = new Date(onlyDate);
    TOTAL_FORKS = responseData.forks_count;
    LAST_QUERY.defaultBranch = responseData.default_branch;

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
      if (typeof hideAbortBtn === 'function') hideAbortBtn();
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
  ABORTED = false;
  PAUSED = false;

  setUpOctokitWithLatestToken();

  setQuery(`${user}/${repo}`);
  CURRENT_REPO_KEY = `${user}/${repo}`;
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
  // If already loading, clicking acts as abort (bonus for #16: turn red and abort on click)
  if (JQ_SEARCH_BTN.hasClass('is-loading')) {
    abortSearch();
    return;
  }
  initiate_search();
});
if (typeof JQ_ABORT_BTN !== 'undefined' && JQ_ABORT_BTN && JQ_ABORT_BTN.length) {
  JQ_ABORT_BTN.click(event => {
    event.preventDefault();
    abortSearch();
  });
}
if (typeof JQ_RESUME_BTN !== 'undefined' && JQ_RESUME_BTN && JQ_RESUME_BTN.length) {
  JQ_RESUME_BTN.click(event => {
    event.preventDefault();
    resumeSearch();
  });
}
JQ_REPO_FIELD.keyup(event => {
  if (event.keyCode === 13) { // 'ENTER'
    initiate_search();
  }
});

/* Trigger an automatic query is a value was extracted from the URL Param. */
if (JQ_REPO_FIELD.val()) {
  // Before auto-starting, check cache offer (#39)
  const repoVal = JQ_REPO_FIELD.val();
  const cached = loadCacheFromStorage(repoVal);
  if (cached && TABLE_DATA.length === 0) {
    // Show banner offering cache, but still auto-start? Prefer not to double-start if cached.
    // If user would normally auto-scan, we restore cache and offer re-scan
    const autoRestore = false; // change to true to auto-restore without prompt
    if (autoRestore) {
      restoreCacheFromStorage(repoVal);
    } else {
      // Show offer then proceed with normal scan after short delay if not restored
      if (typeof setMsg === 'function') {
        const ageMin = Math.round((Date.now()-cached.timestamp)/60000);
        // safe construction – avoid inline onclick + HTML injection via repoVal
        setMsg('');
        try {
          const msgEl = document.getElementById(UF_ID_MSG);
          if (msgEl) {
            // container
            const frag = document.createDocumentFragment();
            const b = document.createElement('b');
            b.textContent = repoVal;
            frag.appendChild(document.createTextNode('Found cached results for '));
            frag.appendChild(b);
            frag.appendChild(document.createTextNode(` from ${ageMin} min ago (${cached.tableData.length} forks). `));
            const btn = document.createElement('button');
            btn.className = 'button is-small is-info ml-2';
            btn.textContent = 'Restore cache';
            // closure captures repoVal safely
            btn.addEventListener('click', () => restoreCacheFromStorage(repoVal));
            frag.appendChild(btn);
            const span = document.createElement('span');
            span.className = 'ml-2';
            span.textContent = 'or wait for fresh scan...';
            frag.appendChild(span);
            // use jQuery html already cleared by setMsg(''), append via DOM
            msgEl.appendChild(frag);
            // re-apply box styling that setMsg normally adds
            msgEl.classList.add('box','has-background-info-light');
            msgEl.style.borderWidth = 'thin';
            msgEl.style.borderColor = 'rgba(0,0,0,0.25)';
            msgEl.style.borderStyle = 'solid';
          } else {
            setMsg(`Found cached results for ${repoVal} from ${ageMin} min ago.`);
          }
        } catch(e) {
          setMsg(`Found cached results for ${repoVal} from ${ageMin} min ago.`);
        }
        setTimeout(()=>{ if (ONGOING_REQUESTS_COUNTER===0 && TABLE_DATA.length===0) JQ_SEARCH_BTN.click(); }, 1500);
      } else {
        JQ_SEARCH_BTN.click();
      }
    }
  } else {
    JQ_SEARCH_BTN.click();
  }
} else {
  // No repo in URL – try to offer last cached repo
  try {
    const last = localStorage.getItem('uf-cache-last-repo');
    if (last) {
      const cached = loadCacheFromStorage(last);
      if (cached) {
        // Show unobtrusive cache banner
        if (typeof tryOfferCache === 'function') {
          setTimeout(tryOfferCache, 400);
        }
      }
    }
  } catch(e) {}
}

/* User updated the filters, so we refresh the table. */
JQ_FILTER_FIELD.on('input', update_filter);

/* Pause button handling – optional keyboard shortcut (Space to pause) */
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e)=>{
    if (e.target && (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA' || e.target.isContentEditable)) return;
    if (e.code==='Escape' && JQ_SEARCH_BTN.hasClass('is-loading')) {
      abortSearch();
    }
  });
}
