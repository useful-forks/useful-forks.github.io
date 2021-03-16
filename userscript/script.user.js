// ==UserScript==
// @name        Useful Forks
// @author      useful-forks
// @version     1.5
// @namespace   https://github.com/useful-forks
// @description Displays GitHub forks ordered by stars, and with additional information and automatic filters.
// @match       *://github.com/*/*
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_openInTab
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @icon        https://useful-forks.github.io/assets/useful-forks-logo.png
// @homepageURL https://github.com/useful-forks/useful-forks.github.io
// @supportURL  https://github.com/useful-forks/useful-forks.github.io/issues
// ==/UserScript==
(function() {

let GITHUB_ACCESS_TOKEN = GM_getValue('GITHUB_ACCESS_TOKEN')

GM_registerMenuCommand("Set Github Access Token", setPersonalToken)
GM_registerMenuCommand("Generate New Access Token", newPersonalToken);

function setPersonalToken(){
    var mess = "Personal Access Token";
    var caseShow = GITHUB_ACCESS_TOKEN;
    var getpersonalToken = prompt(mess, caseShow);
    GITHUB_ACCESS_TOKEN = (getpersonalToken===null? GITHUB_ACCESS_TOKEN : getpersonalToken)
    GM_setValue("GITHUB_ACCESS_TOKEN", GITHUB_ACCESS_TOKEN)
}

function newPersonalToken(){
  let tabControl = GM_openInTab("https://github.com/settings/tokens/new?scopes=repo&description=UsefulFork")
  tabControl.onclose = () => setPersonalToken();
}

function valid(string) {
  return string && string.length > 0;
}

const UF_ID_WRAPPER = 'useful_forks_wrapper';
const UF_ID_TITLE   = 'useful_forks_title';
const UF_ID_MSG     = 'useful_forks_msg';
const UF_ID_DATA    = 'useful_forks_data';
const UF_ID_TABLE   = 'useful_forks_table';

const svg_literal_fork = '<svg class="octicon octicon-repo-forked v-align-text-bottom" viewBox="0 0 10 16" version="1.1" width="10" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8 1a1.993 1.993 0 00-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 002 1a1.993 1.993 0 00-1 3.72V6.5l3 3v1.78A1.993 1.993 0 005 15a1.993 1.993 0 001-3.72V9.5l3-3V4.72A1.993 1.993 0 008 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg>';
const svg_literal_star = '<svg aria-label="star" height="16" class="octicon octicon-star v-align-text-bottom" viewBox="0 0 14 16" version="1.1" width="14" role="img"><path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path></svg>';

function getSyntaxTheme() {
  switch (document.querySelector('[data-color-mode]')?.dataset.colorMode) {
    case 'dark': {
      return "dark"
      break
    }

    case 'auto': {
      if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return "dark"
        break
      }
    }

    case 'light':
    default: {
      return "light"
    }
  }
}

let SyntaxTheme = getSyntaxTheme();

const hovercolor = SyntaxTheme == "dark" ? '#424242' : '#e2e2e2';

const tr_bgcolor = SyntaxTheme == "dark" ? '#333' : '#f5f5f5';

const additional_css_literal = `
.uf_badge svg {
  display: table-cell;
  padding-top: 3px;
}
tr:hover {background-color: ${hovercolor} !important;}
tr:nth-child(even) {background-color: ${tr_bgcolor};}
#${UF_ID_MSG} {color: red}
`;

const UF_MSG_HEADER       = "<b>Useful forks</b>";
const UF_MSG_NO_FORKS     = "No one forked this specific repository.";
const UF_MSG_SCANNING     = "Currently scanning all the forks.";
const UF_MSG_ERROR        = "There seems to have been an error while scanning forks.";
const UF_MSG_EMPTY_FILTER = "All the forks have been filtered out: you can now rest easy!";
const UF_MSG_API_RATE     = "<b>Exceeded GitHub API rate-limits.</b>";
const UF_TABLE_SEPARATOR  = "&nbsp;|&nbsp;";
const UF_MSG_ACCESS_TOKEN = 'You need to provide a personal Access Token.<br> If you don\'t already have one, you can create one now by clicking <a href="https://github.com/settings/tokens/new?scopes=repo&description=UsefulFork" target="_blank">here</a>';

const FORKS_PER_PAGE = 100; // enforced by GitHub API

let REQUESTS_COUNTER = 0; // to know when it's over

function allRequestsAreDone() {
  return REQUESTS_COUNTER <= 0;
}

function checkIfAllRequestsAreDone() {
  if (allRequestsAreDone()) {
    sortTable();
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

function isEmpty(aList) {
  return (!aList || aList.length === 0);
}

function setMsg(msg) {
  getElementById_$(UF_ID_MSG).html(msg);
}

function clearMsg() {
  setMsg("");
}

function getTableBody() {
  return getElementById_$(UF_ID_TABLE).find($("tbody"));
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
        setMsg(UF_MSG_EMPTY_FILTER);
      }
    } else {
      table_row.append(
          $('<td>').html(UF_TABLE_SEPARATOR),
          $('<td>', {class: "uf_badge"}).html(ahead_badge(response.ahead_by)),
          $('<td>').html(UF_TABLE_SEPARATOR),
          $('<td>', {class: "uf_badge"}).html(behind_badge(response.behind_by))
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

/** To use the Access Token with a request. */
function authenticatedRequestHeaderFactory(url) {
  let request = new XMLHttpRequest();
  request.open('GET', url);
  request.setRequestHeader("Accept", "application/vnd.github.v3+json");
  request.setRequestHeader("Authorization", "token " + GITHUB_ACCESS_TOKEN);
  return request;
}

/** Defines the default behavior of a request. */
function onreadystatechangeFactory(xhr, successFn, failureFn) {
  return () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        successFn();
      } else if (xhr.status === 403) {
        console.warn('Looks like the rate-limit was exceeded.');
        setMsg(UF_MSG_API_RATE);
      } else {
        console.warn('GitHub API returned status:', xhr.status);
        failureFn();
      }
    } else {
      // Request is still in progress
    }
  };
}

/** Dynamically fills the second part of the rows. */
function build_fork_element_html(table_body, combined_name, num_stars, num_forks) {
  const NEW_ROW = $('<tr>', {id: extract_username_from_fork(combined_name), class: "useful_forks_repo"});
  table_body.append(
      NEW_ROW.append(
          $('<td>').html(svg_literal_fork + ` <a href="https://github.com/${combined_name}" target="_blank" rel="noopener noreferrer">${combined_name}</a>`),
          $('<td>').html(UF_TABLE_SEPARATOR + svg_literal_star + ' x ' + num_stars).attr("value", num_stars),
          $('<td>').html(UF_TABLE_SEPARATOR + svg_literal_fork + ' x ' + num_forks).attr("value", num_forks)
      )
  );
  return NEW_ROW;
}

/** Prepares, appends, and updates dynamically a table row. */
function add_fork_elements(forkdata_array, user, repo, parentDefaultBranch) {
  if (isEmpty(forkdata_array))
    return;

  clearMsg();

  let table_body = getTableBody();
  for (let i = 0; i < forkdata_array.length; ++i) {
    const currFork = forkdata_array[i];

    /* Basic data (stars, watchers, forks). */
    const NEW_ROW = build_fork_element_html(table_body, currFork.full_name, currFork.stargazers_count, currFork.forks_count);

    /* Commits diff data (ahead/behind). */
    const API_REQUEST_URL = `https://api.github.com/repos/${user}/${repo}/compare/${parentDefaultBranch}...${extract_username_from_fork(currFork.full_name)}:${currFork.default_branch}`;
    let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
    request.onreadystatechange = onreadystatechangeFactory(request, commits_count(request, table_body, NEW_ROW), commits_count_failure(NEW_ROW));
    request.send();

    /* Forks of forks. */
    if (currFork.forks_count > 0) {
      request_fork_page(1, currFork.owner.login, currFork.name, currFork.default_branch);
    }
  }
}

/** Paginated request. Pages index start at 1. */
function request_fork_page(page_number, user, repo, defaultBranch) {
  const API_REQUEST_URL = `https://api.github.com/repos/${user}/${repo}/forks?sort=stargazers&per_page=${FORKS_PER_PAGE}&page=${page_number}`;
  let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
  request.onreadystatechange = onreadystatechangeFactory(request,
      () => {
        const response = JSON.parse(request.responseText);

        /* On empty response (repo has not been forked). */
        if (isEmpty(response))
          return;

        REQUESTS_COUNTER += response.length; // to keep track of when the query ends

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
      () => {
        setMsg(UF_MSG_ERROR);
        checkIfAllRequestsAreDone();
      });
  request.send();
}

/** Updates header with Queried Repo info, and initiates recursive forks search */
function initial_request(user, repo) {
  const API_REQUEST_URL = `https://api.github.com/repos/${user}/${repo}`;
  let request = authenticatedRequestHeaderFactory(API_REQUEST_URL);
  request.onreadystatechange = onreadystatechangeFactory(request,
      () => {
        const response = JSON.parse(request.responseText);

        if (isEmpty(response))
          return;

        if (response.forks_count > 0) {
          request_fork_page(1, user, repo, response.default_branch);
        } else {
          setMsg(UF_MSG_NO_FORKS);
          enableQueryFields();
        }
      },
      () => setMsg(UF_MSG_ERROR)
  );
  request.send();
}

function prepare_display() {
  $('#network').prepend(
      $('<div>', {id: UF_ID_WRAPPER, class: "float-right"}).append(
          $('<h4>',  {id: UF_ID_TITLE, html: UF_MSG_HEADER}),
          $('<div>', {id: UF_ID_MSG, html: UF_MSG_SCANNING}),
          $('<div>', {id: UF_ID_DATA}).append(
              $('<table>', {id: UF_ID_TABLE}).append(
                  $('<tbody>')
              )
          )
      )
  );
}

function add_css() {
  let styleSheet = document.createElement('style');
  styleSheet.type = "text/css";
  styleSheet.innerText = additional_css_literal;
  document.head.appendChild(styleSheet);
}

/** Entry point. */
function init() {
  const pathComponents = window.location.pathname.split('/');
  if (pathComponents.length >= 3) {
    if (pathComponents[4] == "members"){
      const user = pathComponents[1], repo = pathComponents[2];
      add_css();
      prepare_display();
      // only call if GITHUB_ACCESS_TOKEN has been set up
      if (valid(GITHUB_ACCESS_TOKEN)) {
        initial_request(user, repo);
      } else {
        setMsg(UF_MSG_ACCESS_TOKEN);
      }
    }
  }
}

init();

document.addEventListener('pjax:end', init);

})();
