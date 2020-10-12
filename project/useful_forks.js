let GITHUB_USERNAME = ""
let GITHUB_ACCESS_TOKEN = ""

const svg_literal_fork = '<svg class="octicon octicon-repo-forked v-align-text-bottom" viewBox="0 0 10 16" version="1.1" width="10" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8 1a1.993 1.993 0 00-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 002 1a1.993 1.993 0 00-1 3.72V6.5l3 3v1.78A1.993 1.993 0 005 15a1.993 1.993 0 001-3.72V9.5l3-3V4.72A1.993 1.993 0 008 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg>';
const svg_literal_star = '<svg aria-label="star" height="16" class="octicon octicon-star v-align-text-bottom" viewBox="0 0 14 16" version="1.1" width="14" role="img"><path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path></svg>';
const svg_literal_eye = '<svg class="octicon octicon-eye v-align-text-bottom" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8.06 2C3 2 0 8 0 8s3 6 8.06 6C13 14 16 8 16 8s-3-6-7.94-6zM8 12c-2.2 0-4-1.78-4-4 0-2.2 1.8-4 4-4 2.22 0 4 1.8 4 4 0 2.22-1.78 4-4 4zm2-4c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z"></path></svg>';

const additional_css_literal = '#useful_forks_wrapper {padding-bottom: 50px;} #useful_forks_wrapper .repo div {display: inline-block;color: #666;margin: 2px 15px;}';

function extract_username_from_fork(combined_name) {
  return combined_name.split('/')[0];
}

function badget_width(number) {
  return 70 * number.toString().length; // magic number 70 extracted from querying 'shields.io'
}

function ahead_badge(amount) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="18" role="img"><title>ahead</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="88" height="18" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="43" height="18" fill="#555"/><rect x="43" width="45" height="18" fill="#007ec6"/><rect width="88" height="18" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="225" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="330">ahead</text><text x="225" y="130" transform="scale(.1)" fill="#fff" textLength="330">ahead</text><text x="645" y="130" transform="scale(.1)" fill="#fff" textLength="' + badget_width(amount) + '">' + amount + '</text></g></svg>';
}

function behind_badge(amount) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="92" height="18" role="img"><title>behind</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient><clipPath id="r"><rect width="92" height="18" rx="4" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="47" height="18" fill="#555"/><rect x="47" width="45" height="18" fill="#007ec6"/><rect width="92" height="18" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="245" y="140" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="370">behind</text><text x="245" y="130" transform="scale(.1)" fill="#fff" textLength="370">behind</text><text x="685" y="130" transform="scale(.1)" fill="#fff" textLength="' + badget_width(amount) + '">' + amount + '</text></g></svg>';
}

function build_fork_element_html(combined_name, num_stars, num_watches, num_forks) {
  return '<tr id="' + extract_username_from_fork(combined_name) + '"><div class="repo">'
      + '<td><div class="useful_forks_link">' + svg_literal_fork + ' <a href=https://github.com/' + combined_name + '>' + combined_name + '</a></div></td>'
      + '<td><div class="useful_forks_info">' + svg_literal_star + ' x ' + num_stars + ' | ' + svg_literal_eye + ' x ' + num_watches + ' | ' + svg_literal_fork + ' x ' + num_forks + '</div></td>'
      + '</div></tr>';
}

function update_data_innerHTML(innerHTML) {
  document.getElementById('useful_forks_data').innerHTML = innerHTML;
}

function commits_count(request, fork_username) {
  return () => {
    const response = JSON.parse(request.responseText);
    let old_data = document.getElementById(fork_username);

    if (response.total_commits === 0) {
      old_data.remove();
      if (document.getElementById('useful_forks_table').rows.length === 0) {
        update_data_innerHTML("All the forks have been filtered out: apparently the maintainers are doing a great job!");
      }
    }

    let appendedData = old_data.insertCell();
    appendedData.innerHTML = '<div class="useful_forks_commits">'
        + '&nbsp;| ' + ahead_badge(response.ahead_by)
        + '&nbsp;| ' + behind_badge(response.behind_by)
        + '</div>';
  }
}

function commits_count_failure(fork_username) {
  return () => {
    let old_data = document.getElementById(fork_username);
    let appendedData = old_data.insertCell();
    appendedData.innerHTML = '<div class="useful_forks_commits">&nbsp;| Something is wrong with this repository</div>';
  }
}

function authenticatedRequestFactory(url) {
  let request = new XMLHttpRequest();
  request.open('GET', url);
  request.setRequestHeader("Accept", "application/vnd.github.v3+json");
  request.setRequestHeader("Authorization", "Basic " + btoa(GITHUB_USERNAME + ":" + GITHUB_ACCESS_TOKEN));
  return request;
}

function add_fork_elements(forkdata_array, user, repo) {
  if (!forkdata_array || forkdata_array.length === 0)
    return;

  console.log(forkdata_array);

  let wrapper_html = '<table id="useful_forks_table">';

  for (let i = 0; i < Math.min(100, forkdata_array.length); ++i) {
    const elem_ref = forkdata_array[i];

    wrapper_html += build_fork_element_html(elem_ref.full_name, elem_ref.stargazers_count, elem_ref.watchers_count, elem_ref.forks_count);

    const fork_username = extract_username_from_fork(elem_ref.full_name);
    let request = authenticatedRequestFactory('https://api.github.com/repos/' + user + '/' + repo + '/compare/master...' + fork_username + ':master');
    request.onreadystatechange = onreadystatechangeFactory(request, commits_count(request, fork_username), commits_count_failure(fork_username));
    request.send();
  }

  wrapper_html += '</table>';

  update_data_innerHTML(wrapper_html);
}

function onreadystatechangeFactory(xhr, successFn, failureFn) {
  return () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        successFn();
      } else if (xhr.status === 403) {
        console.warn('Looks like the rate-limit was exceeded.');
      } else {
        console.warn('GitHub API returned status:', xhr.status);
        failureFn();
      }
    } else {
      // Request is still in progress
    }
  };
}

function add_css() {
  let styleSheet = document.createElement('style');
  styleSheet.type = "text/css";
  styleSheet.innerText = additional_css_literal;
  document.head.appendChild(styleSheet);
}

function prepend_title() {
  let new_wrapper = document.createElement('div');
  new_wrapper.setAttribute('id', 'useful_forks_wrapper');
  new_wrapper.innerHTML = "<h4>Useful forks</h4>";
  document.getElementById('network').prepend(new_wrapper);
}

function prepare_display() {
  let wrapper = document.getElementById('useful_forks_wrapper');
  let data_display = document.createElement('div');
  data_display.setAttribute('id', 'useful_forks_data');
  data_display.innerHTML = 'Currently scanning all the forks.';
  wrapper.append(data_display);
}

function check_all_forks(request, user, repo) {
  const response = JSON.parse(request.responseText);
  console.log(response);
  add_fork_elements(response, user, repo);
}

function request_fork_page(page_number, user, repo) {
  let request = authenticatedRequestFactory('https://api.github.com/repos/' + user + '/' + repo + '/forks?sort=stargazers&per_page=100&page=' + page_number)
  request.onreadystatechange = onreadystatechangeFactory(request,
      () => {
        const response = JSON.parse(request.responseText);

        if (!response || response.length === 0) {
          if (page_number === 0) {
            update_data_innerHTML("No forks found.")
          }
          return;
        }
        // todo: >100 forks
        // else if (response.length > 100) {
        //   request_fork_page(page_number++, user, repo);
        // }

        check_all_forks(request, user, repo);
      });
  request.send();
}

/* Entry point. */
const pathComponents = window.location.pathname.split('/');
if (pathComponents.length >= 3) {
  const user = pathComponents[1], repo = pathComponents[2];
  add_css();
  prepend_title();
  prepare_display();
  request_fork_page(0, user, repo);
}
