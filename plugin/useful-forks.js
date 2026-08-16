const UF_LI_ID  = "useful_forks_li";
const UF_BTN_ID = "useful_forks_btn";
const UF_TIP_ID = "useful_forks_tooltip";

function getRepoParts() {
  const pathComponents = window.location.pathname.split("/");
  const user = pathComponents[1];
  const repo = pathComponents[2];
  if (!user || !repo) return null;
  // Validate GitHub user/repo chars – prevents injection via crafted path
  if (!/^[A-Za-z0-9_.-]+$/.test(user) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { user, repo };
}

function getRepoUrl() {
  const parts = getRepoParts();
  if (!parts) return null;
  return `https://useful-forks.github.io/?repo=${encodeURIComponent(parts.user)}/${encodeURIComponent(parts.repo)}`;
}

function setBtnUrl() {
  const btn = document.getElementById(UF_BTN_ID);
  if (!btn) return;
  const url = getRepoUrl();
  if (!url) {
    // hide if we cannot parse a repo – avoids stale href on non-repo pages
    btn.setAttribute('href', 'https://useful-forks.github.io/');
    return;
  }
  btn.setAttribute('href', url);
}

function createUsefulBtn() {
  const li = document.createElement("li");
  li.id = UF_LI_ID;

  const div = document.createElement("div");
  div.className = "float-left";

  const a = document.createElement("a");
  a.id = UF_BTN_ID;
  a.className = "btn-sm btn";
  const repoUrl = getRepoUrl();
  // safe default if parsing fails – will be corrected by setBtnUrl after insert
  a.setAttribute('href', repoUrl || 'https://useful-forks.github.io/');
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
  a.setAttribute('aria-describedby', UF_TIP_ID);

  // SVG icon – created via DOM, not string interpolation
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("version", "1.1");
  svg.setAttribute("width", "16");
  svg.setAttribute("data-view-component", "true");
  svg.setAttribute("class", "octicon octicon-search");
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", "M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z");
  svg.appendChild(path);
  a.appendChild(svg);
  a.appendChild(document.createTextNode(" Useful"));

  // tooltip – custom element, safe creation
  const tooltip = document.createElement("tool-tip");
  tooltip.setAttribute("for", UF_BTN_ID);
  tooltip.id = UF_TIP_ID;
  tooltip.setAttribute("popover", "manual");
  tooltip.className = "position-absolute sr-only";
  tooltip.textContent = "Search for useful forks in a new tab";

  div.appendChild(a);
  div.appendChild(tooltip);
  li.appendChild(div);
  return li;
}

function init() {
  const oldLi = document.getElementById(UF_LI_ID);
  if (oldLi) {
    oldLi.remove();
  }

  const forkBtn = document.getElementById("repo-network-counter");
  if (forkBtn) {
    const forksAmount = forkBtn.textContent;
    if (forksAmount < 1) {
      return;
    }
    const parentLi = forkBtn.closest("li");
    if (!parentLi || !parentLi.parentNode) return;
    const newLi = createUsefulBtn();
    // Only insert if we could parse a valid repo
    if (!getRepoParts()) {
      return;
    }
    parentLi.parentNode.insertBefore(newLi, parentLi);
    setBtnUrl();
  }
}

init();

let timeout;
const observer = new MutationObserver(() => {
  clearTimeout(timeout);
  timeout = setTimeout(init, 10);
});
observer.observe(document.body, { childList: true, subtree: false });

// GitHub SPA – Turbo / PJAX soft-nav keeps DOM but changes URL
document.addEventListener('turbo:load', init);
document.addEventListener('pjax:end', init);
window.addEventListener('popstate', init);
