// The dashboard frame: sidebar, top bar and the page area, plus a tiny hash router.
// Both roles use this SAME frame; what differs is the menu and the pages each role passes in.

import { $, esc, watch } from "./shared.js";

const THEME_KEY = "lk-theme";

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // private mode: the choice just is not remembered
  }
}

export async function startShell({ role, roleLabel, scope, person, menu, pages, signOut }) {
  const root = $("#app");
  const defaultPath = menu[0].items[0].path;
  const abort = new AbortController();
  let navId = 0; // so a slow page cannot appear after the admin already moved on
  let shownHash = null;
  let page = null; // { refresh?, stop? } of the page on screen

  const nav = menu
    .map(
      (section) =>
        `<div class="nav-title">${esc(section.title)}</div>` +
        section.items
          .map(
            (i) =>
              `<a class="nav-item" href="#/${i.path}" data-path="${i.path}"><span class="ico">${i.icon}</span>${esc(i.label)}</a>`,
          )
          .join(""),
    )
    .join("");

  root.innerHTML = `
    <div class="shell" data-role="${role}">
      <aside class="side">
        <div class="brand">
          <span class="logo">LK</span>
          <div><b>Ligtas Kababayan</b><small>Flood emergency system</small></div>
        </div>
        <div class="role-chip"><span>${esc(roleLabel)}</span><b>${esc(scope)}</b></div>
        <nav class="nav">${nav}</nav>
        <div class="side-foot"><b>${esc(person)}</b>Signed in</div>
      </aside>
      <div class="scrim"></div>
      <div class="content">
        <header class="top">
          <button class="icon-btn" id="menu-btn" aria-label="Menu">☰</button>
          <div class="crumb"><h1 id="page-title"></h1><span>${esc(roleLabel)} · ${esc(scope)}</span></div>
          <div class="top-actions">
            <span class="live"><i></i>Live</span>
            <button class="icon-btn" id="theme-btn" aria-label="Light or dark">◐</button>
            <button class="btn sm" id="out-btn">Sign out</button>
          </div>
        </header>
        <main class="page" id="page"></main>
      </div>
    </div>`;

  const shell = root.querySelector(".shell");
  const isPhone = () => matchMedia("(max-width: 900px)").matches;
  $("#menu-btn").onclick = () => shell.classList.toggle(isPhone() ? "side-open" : "side-closed");
  root.querySelector(".scrim").onclick = () => shell.classList.remove("side-open");
  $("#theme-btn").onclick = toggleTheme;
  $("#out-btn").onclick = signOut;

  async function go() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, query = ""] = raw.split("?");
    const known = Boolean(pages[path]);
    const key = known ? path : defaultPath;

    if (!known) history.replaceState(null, "", `#/${key}`);
    const hash = known ? raw : key;
    if (hash === shownHash) return;
    shownHash = hash;

    const mine = ++navId;
    await page?.stop?.();
    page = null;
    if (mine !== navId) return;

    for (const a of root.querySelectorAll(".nav-item")) a.classList.toggle("on", a.dataset.path === key);
    $("#page-title").textContent = pages[key].title;
    shell.classList.remove("side-open");
    window.scrollTo(0, 0);

    // every page gets a fresh element, so a stale page can never draw into the new one
    const el = document.createElement("div");
    $("#page").replaceChildren(el);
    const mounted = await pages[key].mount(el, new URLSearchParams(known ? query : ""));
    if (mine !== navId) {
      await mounted?.stop?.();
      return;
    }
    page = mounted || {};
  }

  window.addEventListener("hashchange", go, { signal: abort.signal });
  const stopLive = watch(() => page?.refresh?.()); // one live connection for whichever page is open

  await go();

  return {
    async stop() {
      abort.abort();
      navId++;
      stopLive();
      await page?.stop?.();
      page = null;
      root.innerHTML = "";
    },
  };
}
