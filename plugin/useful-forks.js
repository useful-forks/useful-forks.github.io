function getRepoUrl() {
  const pathComponents = window.location.pathname.split("/");
  const user = pathComponents[1], repo = pathComponents[2];
  return `https://useful-forks.github.io/?repo=${user}/${repo}`;
}

function setBtnUrl() {
  const button = document.getElementById(UF_BTN_ID);
  button.addEventListener("click", () => {
    window.open(getRepoUrl(), "_blank");
  });
}

function createUsefulBtn() {
  const li = document.createElement("li");
  const content = `
  <div class="float-left">
    <button id="${UF_BTN_ID}" class="btn-sm btn" aria-describedby="${UF_TIP_ID}">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-search">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
      </svg>
      Useful
    </button>
    <tool-tip for="${UF_BTN_ID}" id="${UF_TIP_ID}" popover="manual" class="position-absolute sr-only">
      Search for useful forks in a new tab
    </tool-tip>
  </div>
  `;
  li.innerHTML = content;
  li.id = UF_LI_ID;
  return li;
}

function init() {
  // This is required for some cases like on Back/Forward navigation
  const oldLi = document.getElementById(UF_LI_ID);
  if (oldLi) {
    oldLi.remove();
  }

  const forkBtn = document.getElementById("repo-network-counter");
  if (forkBtn) { // sufficient to know the user is looking at a repository
    const forksAmount = forkBtn.textContent;
    if (forksAmount < 1) {
      return;
    }
    const parentLi = forkBtn.closest("li");
    const newLi = createUsefulBtn();
    parentLi.parentNode.insertBefore(newLi, parentLi);
    setBtnUrl(); // this needs to happen after the btn is inserted in the DOM
  }
}

const UF_LI_ID  = "useful_forks_li";
const UF_BTN_ID = "useful_forks_btn";
const UF_TIP_ID = "useful_forks_tooltip";
init(); // entry point of the script

/*
Without a timeout, the Back/Forward browser navigation ends up messing up
the JavaScript onClick event assigned to the button.
The trade-off here is that the button appears a bit after the page loads.

Moreover, it's worth pointing out that a MutationObserver is required here
because GitHub does some optimizations that do not require reloading an
entire page.
PJax is one of those tricks used, but it does not seem to be exclusive,
hence why `document.addEventListener("pjax:end", init);` is not sufficient.
*/
let timeout;
const observer = new MutationObserver(() => {
  clearTimeout(timeout);
  timeout = setTimeout(init, 10);
});
/*
`subtree: false` is used to reduce the amount of callbacks triggered.
`document.body` may be of narrower scope, but I couldn't figure it out.
*/
observer.observe(document.body, { childList: true, subtree: false });
