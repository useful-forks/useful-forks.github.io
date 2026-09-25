// ==UserScript==
// @name        Useful Forks
// @namespace   https://github.com/useful-forks
// @match       *://github.com/*/*
// @exclude     *://github.com/settings/*
// @exclude     *://github.com/notifications/*
// @exclude     *://github.com/marketplace/*
// @exclude     *://github.com/orgs/*
// @exclude     *://github.com/explore/*
// @exclude     *://github.com/sponsors/*
// @grant       none
// @version     2.2.3
// @icon        https://useful-forks.github.io/assets/useful-forks-logo.png
// @author      Useful Forks
// @description Displays GitHub forks ordered by stars, with additional information and automatic filtering of irrelevant ones.
// @run-at      document-idle
// ==/UserScript==

(function() {
  'use strict';

  const UF_LI_ID  = "useful_forks_li";
  const UF_BTN_ID = "useful_forks_btn";
  const UF_TIP_ID = "useful_forks_tooltip";

  // Runtime filter – tighten over-broad @match
  const REPO_RE = /^\/[^\/]+\/[^\/]+\/?(?:.*)?$/;
  const EXCLUDE_RE = /^\/(settings|notifications|marketplace|orgs|explore|sponsors)\b/;
  function isRepoPage() {
    const p = window.location.pathname;
    if (EXCLUDE_RE.test(p)) return false;
    // need at least user/repo
    const parts = p.split('/').filter(Boolean);
    if (parts.length < 2) return false;
    return true;
  }

  function getRepoParts() {
    const pathComponents = window.location.pathname.split("/");
    const user = pathComponents[1];
    const repo = pathComponents[2];
    if (!user || !repo) return null;
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
      btn.setAttribute('href', 'https://useful-forks.github.io/');
      return;
    }
    btn.setAttribute('href', url);
  }

  function createUsefulBtn() {
    // avoid duplicate if both extension + userscript present
    if (document.getElementById(UF_BTN_ID)) {
      const existingLi = document.getElementById(UF_LI_ID);
      if (existingLi) return existingLi;
    }
    const li = document.createElement("li");
    li.id = UF_LI_ID;

    const div = document.createElement("div");
    div.className = "float-left";

    const a = document.createElement("a");
    a.id = UF_BTN_ID;
    a.className = "btn-sm btn";
    const repoUrl = getRepoUrl();
    a.setAttribute('href', repoUrl || 'https://useful-forks.github.io/');
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.setAttribute('aria-describedby', UF_TIP_ID);

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
    if (!isRepoPage()) return;
    // guard duplicate injection
    if (document.getElementById(UF_BTN_ID) && document.getElementById(UF_LI_ID)) {
      setBtnUrl();
      return;
    }
    const oldLi = document.getElementById(UF_LI_ID);
    if (oldLi) {
      oldLi.remove();
    }

    const forkBtn = document.getElementById("repo-network-counter");
    if (!forkBtn) return;
    const forksText = (forkBtn.textContent || '').trim();
    const forksAmount = parseInt(forksText.replace(/,/g,''),10);
    if (isNaN(forksAmount) || forksAmount < 1) {
      // keep original text-based check fallback
      if (forksText === "0") return;
    }
    const parentLi = forkBtn.closest("li");
    if (!parentLi || !parentLi.parentNode) return;
    if (!getRepoParts()) return;
    const newLi = createUsefulBtn();
    parentLi.parentNode.insertBefore(newLi, parentLi);
    setBtnUrl();
  }

  // initial
  if (isRepoPage()) init();

  let timeoutId;
  const observer = new MutationObserver(() => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (isRepoPage()) init();
    }, 50);
  });
  // subtree:true needed for #repo-content-turbo-frame updates (GitHub Turbo)
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('turbo:load', () => { if (isRepoPage()) init(); });
  document.addEventListener('pjax:end', () => { if (isRepoPage()) init(); });
  window.addEventListener('popstate', () => { if (isRepoPage()) init(); });
})();
