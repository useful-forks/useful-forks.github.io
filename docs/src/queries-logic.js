const FORKS_PER_PAGE = 100; // enforced by GitHub API

/* Variables that should be cleared for every new query. */
let TOTAL_FORKS                = 0;
let RATE_LIMIT_EXCEEDED        = false;
let TOTAL_API_CALLS_COUNTER    = 0;
let ONGOING_REQUESTS_COUNTER   = 0;


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

function send(request) {
  ONGOING_REQUESTS_COUNTER++;
  TOTAL_API_CALLS_COUNTER++;
  setApiCallsLabel(TOTAL_API_CALLS_COUNTER);
  request.send();
}

/** To use the Access Token with a request. */
function authenticatedRequestHeaderFactory(url) {
  let request = new XMLHttpRequest();
  request.open('GET', url);
  request.setRequestHeader("Accept", "application/vnd.github.v3+json");
  if (LOCAL_STORAGE_GITHUB_ACCESS_TOKEN) {
    request.setRequestHeader("Authorization", "token " + LOCAL_STORAGE_GITHUB_ACCESS_TOKEN);
  }
  return request;
}

function allRequestsAreDone() {
  return ONGOING_REQUESTS_COUNTER <= 0 && TOTAL_API_CALLS_COUNTER >= TOTAL_FORKS;
}

function onRateLimitExceeded() {
  if (!RATE_LIMIT_EXCEEDED) {
    console.warn('[useful-forks] GitHub API rate-limit exceeded. (Since useful-forks sends many requests at once, you might have a lot of `Code 403` error logs from the browser.)');
    RATE_LIMIT_EXCEEDED = true;
    setMsg(UF_MSG_API_RATE);
    if (!LOCAL_STORAGE_GITHUB_ACCESS_TOKEN) {
      openTokenDialog();
    }
    disableQueryBtn();
  }
}

function onreadystatechangeFactory(xhr, successFn, failureFn) {
  return () => {
    if (xhr.readyState === 4) {

      /* Managing the different Status Codes. */
      if (xhr.status === 200) {
        successFn();
      } else if (xhr.status === 403) {
        onRateLimitExceeded();
      } else {
        console.warn('[useful-forks] GitHub API returned status:', xhr.status);
        failureFn();
      }

      /* Detection of final request. */
      ONGOING_REQUESTS_COUNTER--;
      if (allRequestsAreDone()) {
        sortTable();
        enableQueryFields();
      }

    } else {
      // Request is still in progress
    }
  };
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

  if (!RATE_LIMIT_EXCEEDED) // because this some times gets called after 403 is received
    clearMsg();

  let table_body = getTableBody();
  for (let i = 0; i < forkdata_array.length; i++) {
    const currFork = forkdata_array[i];

    /* Basic data (name/stars/forks). */
    const NEW_ROW = build_fork_element_html(table_body, currFork.full_name, currFork.stargazers_count, currFork.forks_count);

    if (RATE_LIMIT_EXCEEDED) // we can skip everything below because they are only requests
      continue;

    /* Commits diff data (ahead/behind). */
    const API_REQUEST_URL = `https://api.github.com/repos/${user}/${repo}/compare/${parentDefaultBranch}...${extract_username_from_fork(currFork.full_name)}:${currFork.default_branch}`;
    let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
    request.onreadystatechange = onreadystatechangeFactory(request,
        () => {
          const response = JSON.parse(request.responseText);

          if (response.total_commits === 0) {
            NEW_ROW.remove();
            if (table_body.children().length === 0) {
              setMsg(UF_MSG_EMPTY_FILTER);
            }
          } else {
            /* Appending the commit badges to the new row. */
            NEW_ROW.append(
                $('<td>').html(UF_TABLE_SEPARATOR),
                $('<td>', {class: "uf_badge"}).html(ahead_badge(response.ahead_by)),
                $('<td>').html(UF_TABLE_SEPARATOR),
                $('<td>', {class: "uf_badge"}).html(behind_badge(response.behind_by))
            )
          }
        },
        () => NEW_ROW.remove()
    );
    send(request);

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

  const API_REQUEST_URL = `https://api.github.com/repos/${user}/${repo}/forks?sort=stargazers&per_page=${FORKS_PER_PAGE}&page=${page_number}`;
  let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
  request.onreadystatechange = onreadystatechangeFactory(request,
      () => {
        const response = JSON.parse(request.responseText);

        if (isEmpty(response)) // repo has not been forked
          return;

        /* Pagination (beyond 100 forks). */
        const link_header = request.getResponseHeader("link");
        if (link_header) {
          let contains_next_page = link_header.indexOf('>; rel="next"');
          if (contains_next_page !== -1) {
            request_fork_page(++page_number, user, repo, defaultBranch);
          }
        }

        sortTable();

        /* Populate the table. */
        add_fork_elements(response, user, repo, defaultBranch);
      },
      () => setMsg(UF_MSG_ERROR)
  );
  send(request);
}

/** Updates header with Queried Repo info, and initiates forks scan. */
function initial_request(user, repo) {
  const API_REQUEST_URL = `https://api.github.com/repos/${user}/${repo}`;
  let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
  request.onreadystatechange = onreadystatechangeFactory(request,
      () => {
        const response = JSON.parse(request.responseText);

        if (isEmpty(response))
          return;

        TOTAL_FORKS = response.forks_count;

        let html_txt = getRepoCol(response.full_name, true);
        html_txt += UF_TABLE_SEPARATOR + getStarCol(response.stargazers_count);
        html_txt += UF_TABLE_SEPARATOR + getWatchCol(response.subscribers_count);
        html_txt += UF_TABLE_SEPARATOR + getForkCol(TOTAL_FORKS);
        setHeader('<b>Queried repository</b>:&nbsp;&nbsp;&nbsp;' + html_txt);

        if (TOTAL_FORKS > 0) {
          request_fork_page(1, user, repo, response.default_branch);
        } else {
          setMsg(UF_MSG_NO_FORKS);
          enableQueryFields();
        }
      },
      () => setMsg(UF_MSG_ERROR)
  );
  send(request);
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

  disableQueryFields();
  setMsg(UF_MSG_SCANNING);

  const user = queryValues[len - 2];
  const repo = queryValues[len - 1];
  ga_searchQuery(user, repo);
  initial_request(user, repo);
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