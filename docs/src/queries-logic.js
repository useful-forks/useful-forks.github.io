let GITHUB_ACCESS_TOKEN = ""

const UF_ID_WRAPPER = 'useful_forks_wrapper';
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
const UF_MSG_API_RATE     = "<b>Exceeded GitHub API rate-limits.</b> Consider providing an <b>Access Token</b> if you haven't already (click the button at the top-right).<br/>The amount of API calls you are allowed to do will re-accumulate over time: you can try again later on.<br/>It's also possible that the queried repository has so many forks that it's impossible to scan it completely without running out of API calls. :(";

const FORKS_PER_PAGE = 100; // enforced by GitHub API

/* Variables that should be cleared for every new query. */
let INITIAL_QUERY_USER = ""
let REQUESTS_COUNTER   = 0


function allRequestsAreDone() {
  return REQUESTS_COUNTER <= 0;
}

function checkIfAllRequestsAreDone() {
  if (allRequestsAreDone()) {
    sortTable();
    getElementById_$("searchBtn").removeClass('is-loading');
  }
}

function extract_username_from_fork(combined_name) {
  return combined_name.split('/')[0];
}

function badge_width(number) {
  return 70 * number.toString().length; // magic number 70 extracted from analyzing 'shields.io'
}

/** Credits to https://shields.io/ */
function ahead_badge(amount) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="25" role="img" class="uf_badge"><title>How far ahead of the original repo\'s master branch this fork\'s master branch is</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="88" height="25" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="43" height="25" fill="#555"/><rect x="43" width="45" height="25" fill="#007ec6"/><rect width="88" height="25" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="225" y="170" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="330">ahead</text><text x="225" y="160" transform="scale(.1)" fill="#fff" textLength="330">ahead</text><text x="645" y="160" transform="scale(.1)" fill="#fff" textLength="${badge_width(amount)}">${amount}</text></g></svg>`;
}

/** Credits to https://shields.io/ */
function behind_badge(amount) {
  const color = amount === 0 ? '#4c1' : '#007ec6'; // green only when not behind, blue otherwise
  return `<svg xmlns="http://www.w3.org/2000/svg" width="92" height="25" role="img" class="uf_badge"><title>How far behind of the original repo\'s master branch this fork\'s master branch is</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="92" height="25" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="47" height="25" fill="#555"/><rect x="47" width="45" height="25" fill="${color}"/><rect width="92" height="25" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="245" y="170" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="370">behind</text><text x="245" y="160" transform="scale(.1)" fill="#fff" textLength="370">behind</text><text x="685" y="160" transform="scale(.1)" fill="#fff" textLength="${badge_width(amount)}">${amount}</text></g></svg>`;
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

/** The secondary request which appends the badges. */
function commits_count(request, table_body, table_row) {
  return () => {
    const response = JSON.parse(request.responseText);

    if (response.total_commits === 0) {
      table_row.remove();
      if (table_body.children().length === 0) {
        getElementById_$(UF_ID_MSG).html(UF_MSG_EMPTY_FILTER);
      }
    } else {
      table_row.append(
          $('<td>').html(ahead_badge(response.ahead_by)),
          $('<td>').html(behind_badge(response.behind_by))
      )
    }

    /* Detection of final request. */
    REQUESTS_COUNTER--;
    checkIfAllRequestsAreDone();
  }
}

/** To remove erroneous repos. */
function commits_count_failure(table_row) {
  return () => {
    table_row.remove();

    /* Detection of final request. */
    REQUESTS_COUNTER--;
    checkIfAllRequestsAreDone();
  }
}

function clearMsg() {
  getElementById_$(UF_ID_MSG).html("");
}

function getTableBody() {
  return getElementById_$(UF_ID_TABLE).find($("tbody"));
}

/** Used to reset the state for a brand new request. */
function clear_old_data() {
  getTableBody().empty();
  clearMsg();
  INITIAL_QUERY_USER = "";
  REQUESTS_COUNTER = 0;
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

function onreadystatechangeFactory(xhr, successFn, failureFn) {
  return () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        successFn();
      } else if (xhr.status === 403) {
        console.warn('Looks like the rate-limit was exceeded.');
        getElementById_$(UF_ID_MSG).html(UF_MSG_API_RATE);
        if (!GITHUB_ACCESS_TOKEN) {
          getElementById_$("useful_forks_token_popup").addClass('is-active'); // opens the Token dialog
        }
      } else {
        console.warn('GitHub API returned status:', xhr.status);
        failureFn();
      }
    } else {
      // Request is still in progress
    }
  };
}

function build_single_button(svg_lhs, text_rhs) {
  return `<div class="uf_value_badge uf_value_left">${svg_lhs}</div><div class="uf_value_badge uf_value_right">${text_rhs}</div>`;
}

/** Dynamically fills the second part of the rows. */
function build_fork_element_html(table_body, combined_name, num_stars, num_watches, num_forks) {
  const NEW_ROW = $('<tr>', {id: extract_username_from_fork(combined_name), class: "useful_forks_repo"});
  table_body.append(
      NEW_ROW.append(
          $('<td>', {class: "useful_forks_link"}).html(svg_literal_fork + ` <a href=https://github.com/${combined_name} target="_blank" rel="noopener noreferrer">${combined_name}</a>`),
          $('<td>').attr("value", num_stars).html(build_single_button(svg_literal_star, num_stars)),
          $('<td>').attr("value", num_watches).html(build_single_button(svg_literal_eye, num_watches)),
          $('<td>').attr("value", num_forks).html(build_single_button(svg_literal_fork, num_forks))
      )
  );
  return NEW_ROW;
}

/** Prepares, appends, and updates dynamically a table row. */
function add_fork_elements(forkdata_array, user, repo) {
  if (!forkdata_array || forkdata_array.length === 0)
    return;

  clearMsg();

  let table_body = getTableBody();
  for (let i = 0; i < forkdata_array.length; i++) {
    const elem_ref = forkdata_array[i];

    /* Basic data (stars, watchers, forks). */
    const NEW_ROW = build_fork_element_html(table_body, elem_ref.full_name, elem_ref.stargazers_count, elem_ref.watchers_count, elem_ref.forks_count);

    /* Commits diff data (ahead/behind). */
    const API_REQUEST_URL = 'https://api.github.com/repos/' + user + '/' + repo + '/compare/master...' + extract_username_from_fork(elem_ref.full_name) + ':master';
    let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
    request.onreadystatechange = onreadystatechangeFactory(request, commits_count(request, table_body, NEW_ROW), commits_count_failure(NEW_ROW));
    request.send();

    /* Forks of forks. */
    if (elem_ref.forks_count > 0) {
      request_fork_page(1, elem_ref.owner.login, elem_ref.name);
    }
  }
}

/** Paginated request. Pages index start at 1. */
function request_fork_page(page_number, user, repo, token) {
  if (token) {
    GITHUB_ACCESS_TOKEN = token;
  }
  if (!INITIAL_QUERY_USER) {
    INITIAL_QUERY_USER = user;
  }

  if (page_number === 1 && INITIAL_QUERY_USER === user) {
    getElementById_$(UF_ID_MSG).html(UF_MSG_SCANNING);
  }

  const API_REQUEST_URL = 'https://api.github.com/repos/' + user + '/' + repo + '/forks?sort=stargazers&per_page=' + FORKS_PER_PAGE + '&page=' + page_number;
  let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
  request.onreadystatechange = onreadystatechangeFactory(request,
      () => {
        const response = JSON.parse(request.responseText);

        /* On empty response (repo has not been forked). */
        if (!response || response.length === 0) {
          if (page_number === 1) {
            getElementById_$(UF_ID_MSG).html(UF_MSG_NO_FORKS);
          }
          return;
        }

        REQUESTS_COUNTER += response.length; // to keep track of when the query ends

        /* Pagination (beyond 100 forks). */
        const link_header = request.getResponseHeader("link");
        if (link_header) {
          let contains_next_page = link_header.indexOf('>; rel="next"');
          if (contains_next_page !== -1) {
            request_fork_page(++page_number, user, repo);
          }
        }

        sortTable();

        /* Populate the table. */
        add_fork_elements(response, user, repo);
      },
      () => {
        getElementById_$(UF_ID_MSG).html(UF_MSG_ERROR);
        checkIfAllRequestsAreDone();
      });
  request.send();
}