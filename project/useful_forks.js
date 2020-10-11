const svg_literal_fork = '<svg class="octicon octicon-repo-forked v-align-text-bottom" viewBox="0 0 10 16" version="1.1" width="10" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8 1a1.993 1.993 0 00-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 002 1a1.993 1.993 0 00-1 3.72V6.5l3 3v1.78A1.993 1.993 0 005 15a1.993 1.993 0 001-3.72V9.5l3-3V4.72A1.993 1.993 0 008 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg>';

const svg_literal_star = '<svg aria-label="star" height="16" class="octicon octicon-star v-align-text-bottom" viewBox="0 0 14 16" version="1.1" width="14" role="img"><path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path></svg>';

const svg_literal_eye = '<svg class="octicon octicon-eye v-align-text-bottom" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8.06 2C3 2 0 8 0 8s3 6 8.06 6C13 14 16 8 16 8s-3-6-7.94-6zM8 12c-2.2 0-4-1.78-4-4 0-2.2 1.8-4 4-4 2.22 0 4 1.8 4 4 0 2.22-1.78 4-4 4zm2-4c0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 1.11 0 2 .89 2 2z"></path></svg>';

const additional_css_literal = '#useful_forks_wrapper .repo div {display: inline-block;color: #666;margin: 2px 15px;} #useful_forks_wrapper .repo {text-align: center;}';

function build_fork_element_html(combined_name, num_stars, num_watches, num_forks)
{
    return '<div class="repo"><div class="useful_forks_link">' + svg_literal_fork + '  <a href=' + combined_name + '"/">' + combined_name + '</a></div><div class="useful_forks_info">' + svg_literal_star + ' x ' + num_stars + ' | ' + svg_literal_eye + ' x ' + num_watches + ' | ' + svg_literal_fork + ' x ' + num_forks + '</div></div>';
}

function add_fork_elements(forkdata_array)
{
    if (!forkdata_array || forkdata_array.length == 0)
        return;

    let wrapper_html = '<h5>Starred Forks</h5>';
    for (let i = 0; i < Math.min(15, forkdata_array.length); ++i)
    {
        const elem_ref = forkdata_array[i];
        wrapper_html += build_fork_element_html(elem_ref.full_name, elem_ref.stargazers_count, elem_ref.watchers_count, elem_ref.forks_count);
    }

    wrapper_html += '<br><br>';
    
    let old_wrapper = document.getElementById('useful_forks_wrapper');
    if (old_wrapper)
    {
        old_wrapper.remove();
    }

    let new_wrapper = document.createElement('div');
    new_wrapper.setAttribute("id", "useful_forks_wrapper");
    new_wrapper.innerHTML = wrapper_html;
    document.getElementById('network').prepend(new_wrapper);
}

function onreadystatechangeFactory(xhr, successFn) {
    return function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                successFn();
            } else if (xhr.status === 403) {
                console.warn('Looks like the rate-limit was exceeded.');
            } else {
                console.warn('GitHub API returned status:', xhr.status);
            }
        } else {
            // Request is still in progress
        }
    };
}

function load_useful_forks(user, repo) {
    var styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = additional_css_literal;
    document.head.appendChild(styleSheet);

    var xhrFork = new XMLHttpRequest();
    xhrFork.onreadystatechange = onreadystatechangeFactory(
        xhrFork,
        function () {
            add_fork_elements(JSON.parse(xhrFork.responseText));
        }
    );

    xhrFork.open('GET', 'https://api.github.com/repos/' + user + '/' + repo + '/forks?sort=stargazers');
    xhrFork.send();
}

const pathComponents = window.location.pathname.split('/');
if (pathComponents.length >= 3) {
    const user = pathComponents[1], repo = pathComponents[2];
    load_useful_forks(user, repo);
}
