/** Sends a Google Analytics Events. */
function dispatch(action, category, label) {
  gtag('event', action, {
    'event_category': category,
    'event_label': label
  });
}


/* Landing page's introduction message. */
function ga_shortExampleLink() {
  dispatch('discovery', 'landing-intro', 'short-example-link');
}
function ga_fullExampleLink() {
  dispatch('discovery', 'landing-intro', 'full-example-link');
}
function ga_bodyRepoLink() {
  dispatch('discovery', 'landing-intro', 'body-repo-link');
}


/* Queries. */
function ga_faultyQuery(queryString) {
  dispatch('query', 'Raw-Search-Query-Fault', queryString);
}
function ga_searchQuery(user, repo) {
  dispatch('query', 'Search-Query', `${user}/${repo}`);
}
function ga_queryResultClick(fullName, isInitialRepo) {
  dispatch('query', `Query-Results: isInitialRepo=${isInitialRepo}`, fullName);
}


/* Functionalities. */
function ga_exportCSV(query) {
  dispatch('feature', 'Export-CSV', query);
}
function ga_openSettings() {
  dispatch('feature', 'Query-Settings', 'Open');
}


/* Header buttons. */
function ga_homeHeader() {
  dispatch('click', 'left-header-button', 'Home');
}
function ga_githubHeader() {
  dispatch('click', 'left-header-button', 'GitHub-Project');
}
function ga_chromeHeader() {
  dispatch('click', 'left-header-button', 'Chrome-Extension');
}


/* Access Token. */
function ga_openToken() {
  dispatch('click', 'access-token', 'Open-Dialog');
}
function ga_closeToken() {
  dispatch('click', 'access-token', 'Close-Dialog');
}
function ga_saveToken() {
  dispatch('click', 'access-token', 'Save-Token');
}
function ga_createToken() {
  dispatch('click', 'access-token', 'Create-Token');
}


/* Footer. */
function ga_footerStar() {
  dispatch('click', 'footer', 'repo-star-link');
}
function ga_footerEmail() {
  dispatch('click', 'footer', 'email-icon');
}