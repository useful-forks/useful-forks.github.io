let GITHUB_ACCESS_TOKEN = ""

const UF_ID_WRAPPER = 'useful_forks_wrapper';
const UF_ID_HEADER  = 'useful_forks_header';
const UF_ID_MSG     = 'useful_forks_msg';
const UF_ID_DATA    = 'useful_forks_data';
const UF_ID_TABLE   = 'useful_forks_table';

const svg_literal_fork = '<svg class="octicon octicon-repo-forked v-align-text-bottom" viewBox="0 0 10 16" version="1.1" width="10" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8 1a1.993 1.993 0 00-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 002 1a1.993 1.993 0 00-1 3.72V6.5l3 3v1.78A1.993 1.993 0 005 15a1.993 1.993 0 001-3.72V9.5l3-3V4.72A1.993 1.993 0 008 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg>';
const svg_literal_star = '<svg aria-label="star" height="16" class="octicon octicon-star v-align-text-bottom" viewBox="0 0 14 16" version="1.1" width="14" role="img"><path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path></svg>';
const svg_literal_eye  = '<svg class="octicon octicon-eye v-align-text-bottom" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8.06 2C3 2 0 8 0 8s3 6 8.06 6C13 14 16 8 16 8s-3-6-7.94-6zM8 12c-2.2 0-4-1.78-4-4 0-2.2 1.8-4 4-4 2.22 0 4 1.8 4 4 0 2.22-1.78 4-4 4zm2-4c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z"></path></svg>';

const UF_MSG_NO_FORKS     = "No one forked this specific repository.";
const UF_MSG_SCANNING     = "Currently scanning all the forks.";
const UF_MSG_ERROR        = "There seems to have been an error. (Maybe you had a typo in the provided input?)";
const UF_MSG_EMPTY_FILTER = "All the forks have been filtered out: you can now rest easy!";
const UF_MSG_API_RATE     = "<b>GitHub API rate-limits exceeded.</b> Consider providing an <b>Access Token</b> if you haven't already (click the button at the top-right).<br/>The amount of API calls you are allowed to do will re-accumulate over time: you can try again later on.<br/>It's also possible that the queried repository has so many forks that it's impossible to scan it completely without running out of API calls. :(";
const UF_TABLE_SEPARATOR  = "&nbsp;|&nbsp;";

const FORKS_PER_PAGE = 100; // enforced by GitHub API

/* Variables that should be cleared for every new query. */
let TOTAL_FORKS                = 0;
let INITIAL_QUERY_USER         = "";
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

function getElementById_$(id) {
  return $('#' + id);
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

function getTableBody() {
  return getElementById_$(UF_ID_TABLE).find($("tbody"));
}

function setMsg(msg) {
  getElementById_$(UF_ID_MSG).html(msg);
}

function clearMsg() {
  setMsg("");
}

function clearHeader() {
  getElementById_$(UF_ID_HEADER).html("");
}

function clearTable() {
  getTableBody().empty();
}

/** Used to reset the state for a brand new request. */
function clear_old_data() {
  clearHeader();
  clearMsg();
  clearTable();
  setApiCallsLabel(0);
  TOTAL_FORKS = 0;
  INITIAL_QUERY_USER = "";
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
  if (GITHUB_ACCESS_TOKEN) {
    request.setRequestHeader("Authorization", "token " + GITHUB_ACCESS_TOKEN);
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
    if (!GITHUB_ACCESS_TOKEN) {
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

function getRepoCol(full_name, isInitialRepo) {
  return svg_literal_fork + ` <a href="https://github.com/${full_name}" target="_blank" rel="noopener noreferrer"
                                 onclick="gtag('event', 'query', {
                                   'event_category': 'Query-Results: isInitialRepo=${isInitialRepo}',
                                   'event_label': ${full_name}
                                 });">${full_name}</a>`;
}

function getStarCol(num_stars) {
  return svg_literal_star + ' x ' + num_stars;
}

function getForkCol(num_forks) {
  return svg_literal_fork + ' x ' + num_forks;
}

function getWatchCol(num_watchers) {
  return svg_literal_eye + ' x ' + num_watchers;
}

/** Dynamically fills the second part of the rows. */
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

/** Prepares, appends, and updates dynamically a table row. */
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

function initiateProcess(user, repo, token) {
  if (token) {
    GITHUB_ACCESS_TOKEN = token;
  }
  if (!INITIAL_QUERY_USER) {
    INITIAL_QUERY_USER = user;
  }

  disableQueryFields();

  setMsg(UF_MSG_SCANNING);
  initial_request(user, repo);
}

/** Updates header with Queried Repo info, and initiates recursive forks search. */
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
        getElementById_$(UF_ID_HEADER).html('<b>Queried repository</b>:&nbsp;&nbsp;&nbsp;' + html_txt);

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

/** Paginated request. Pages index start at 1. */
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