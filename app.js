/*!
 * 아린아빠 혜택노트 — app.js
 * 보기 탭(무료혜택·육아템·추천 쇼핑몰) · 실시간 검색 · 카테고리 필터 · 마감순 정렬 · 안내 모달
 * 외부 라이브러리 없이 동작합니다.
 */
(function (global) {
  "use strict";

  var DATA = global.HYENOTE_DATA;
  var WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  /* ── 날짜 계산 ───────────────────────────────────────────── */

  /** "2026-11-24" 또는 "2026-11-24T18:00" 을 로컬 시간 Date 로 바꿉니다. */
  function toDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(iso || "").trim());
    if (!m) { return null; }
    return new Date(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      m[4] ? Number(m[4]) : 23,
      m[5] ? Number(m[5]) : 59,
      0, 0
    );
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  /** 남은 날짜(오늘 = 0). 음수면 이미 마감. */
  function daysLeft(deadline, now) {
    var end = toDate(deadline);
    if (!end) { return null; }
    var today = now || new Date();
    return Math.round((startOfDay(end) - startOfDay(today)) / 86400000);
  }

  function isExpired(deadline, now) {
    var end = toDate(deadline);
    if (!end) { return false; }
    return (now || new Date()).getTime() > end.getTime();
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** "11/24(화) 18:00" 형태로 표시합니다. */
  function formatDeadline(iso, now) {
    var d = toDate(iso);
    if (!d) { return String(iso || ""); }
    var base = now || new Date();
    var text = "";
    if (d.getFullYear() !== base.getFullYear()) { text += d.getFullYear() + "/"; }
    text += (d.getMonth() + 1) + "/" + d.getDate() + "(" + WEEKDAYS[d.getDay()] + ")";
    if (/[T ]\d{2}:\d{2}/.test(String(iso))) {
      var h = d.getHours();
      var mi = d.getMinutes();
      text += " " + (h === 23 && mi === 59 ? "24:00" : pad2(h) + ":" + pad2(mi));
    }
    return text;
  }

  function ddayLabel(n) {
    if (n === null) { return ""; }
    if (n < 0) { return "마감"; }
    if (n === 0) { return "오늘 마감"; }
    return "D-" + n;
  }

  function ddayClass(n, expired) {
    if (expired || n === null) { return "is-over"; }
    if (n === 0) { return "is-today"; }
    if (n <= 2) { return "is-soon"; }
    return "is-normal";
  }

  /* ── 공통 ───────────────────────────────────────────────── */

  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, function (ch) {
      if (ch === "&") { return "&amp;"; }
      if (ch === "<") { return "&lt;"; }
      if (ch === ">") { return "&gt;"; }
      if (ch === '"') { return "&quot;"; }
      return "&#39;";
    });
  }

  function categoryLabel(id) {
    var list = (DATA && DATA.categories) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { return list[i].label; }
    }
    return id;
  }

  function searchText(item) {
    return [
      item.title, item.host, item.benefit, item.condition, item.target,
      item.tip, item.source, categoryLabel(item.cat)
    ].join(" ").toLowerCase();
  }

  /**
   * 목록을 필터링하고 정렬합니다.
   * options: { category, query, sort, showExpired, now }
   */
  function filterAndSort(items, options) {
    var opts = options || {};
    var now = opts.now || new Date();
    var category = opts.category || "all";
    var query = String(opts.query || "").trim().toLowerCase();
    var sort = opts.sort || "deadline";

    var list = items.filter(function (item) {
      if (!opts.showExpired && isExpired(item.deadline, now)) { return false; }
      if (category !== "all" && item.cat !== category) { return false; }
      if (query && searchText(item).indexOf(query) === -1) { return false; }
      return true;
    });

    list.sort(function (a, b) {
      if (sort === "latest") {
        var pa = toDate(a.posted || a.checked);
        var pb = toDate(b.posted || b.checked);
        var diff = (pb ? pb.getTime() : 0) - (pa ? pa.getTime() : 0);
        if (diff !== 0) { return diff; }
      }
      var ea = toDate(a.deadline);
      var eb = toDate(b.deadline);
      var ta = ea ? ea.getTime() : Number.MAX_SAFE_INTEGER;
      var tb = eb ? eb.getTime() : Number.MAX_SAFE_INTEGER;
      if (ta !== tb) { return ta - tb; }
      return a.id < b.id ? -1 : 1;
    });

    return list;
  }

  /** 육아템 13종 검색 필터 (이름·핵심 포인트·체크포인트·판매처). */
  function filterAffiliates(items, query) {
    var q = String(query || "").trim().toLowerCase();
    if (!q) { return items.slice(); }
    return items.filter(function (item) {
      return [item.name, item.product, item.point, item.check, item.store]
        .join(" ").toLowerCase().indexOf(q) !== -1;
    });
  }

  /* ── 카드 ───────────────────────────────────────────────── */

  function cardHtml(item, now) {
    var n = daysLeft(item.deadline, now);
    var expired = isExpired(item.deadline, now);
    var parts = [];
    parts.push('<article class="card card--' + esc(item.cat) + (expired ? " is-expired" : "") +
      '" data-id="' + esc(item.id) + '" data-cat="' + esc(item.cat) + '">');
    parts.push('<div class="card-top">');
    parts.push('<span class="badge badge--' + esc(item.cat) + '">' + esc(categoryLabel(item.cat)) + "</span>");
    parts.push('<span class="dday ' + ddayClass(n, expired) + '">' + esc(ddayLabel(n)) + "</span>");
    parts.push("</div>");
    parts.push('<h3 class="card-title">' + esc(item.title) + "</h3>");
    parts.push('<p class="card-host">' + esc(item.host) +
      (item.verified ? "" : ' <span class="flag">공유 정보</span>') + "</p>");
    parts.push('<p class="card-benefit">' + esc(item.benefit) + "</p>");
    if (item.target) {
      parts.push('<p class="card-target"><span class="target-key">대상</span>' + esc(item.target) + "</p>");
    }
    parts.push('<div class="card-foot">');
    parts.push('<span class="card-deadline">마감 <strong>' + esc(formatDeadline(item.deadline, now)) + "</strong></span>");
    parts.push('<a class="go" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' +
      esc(item.urlLabel || "신청하기") +
      ' <span aria-hidden="true">↗</span><span class="sr-only">(새 창)</span></a>');
    parts.push("</div>");
    parts.push('<details class="card-more"><summary>조건·팁</summary>');
    parts.push('<p><span class="k">조건</span>' + esc(item.condition) + "</p>");
    if (item.announce) {
      parts.push('<p><span class="k">발표</span>' + esc(item.announce) + "</p>");
    }
    parts.push('<p><span class="k">팁</span>' + esc(item.tip) + "</p>");
    parts.push('<p class="card-src">출처 ' + esc(item.source) + " · 확인 " + esc(item.checked) + "</p>");
    if (!item.verified) {
      parts.push('<p class="card-warn">공유 자료로 확인한 항목입니다. 참여 전 주최 페이지에서 마감일과 참여 조건을 다시 확인하세요.</p>');
    }
    parts.push("</details></article>");
    return parts.join("");
  }

  function affiliateCardHtml(item) {
    var links = [];
    if (item.url) {
      links.push('<a class="aff-btn" href="' + esc(item.url) +
        '" target="_blank" rel="sponsored noopener noreferrer">네이버 <span aria-hidden="true">↗</span>' +
        '<span class="sr-only">(새 창 · 제휴 링크)</span></a>');
    }
    if (item.coupangUrl) {
      links.push('<a class="aff-btn aff-btn--coupang" href="' + esc(item.coupangUrl) +
        '" target="_blank" rel="sponsored noopener noreferrer">쿠팡 <span aria-hidden="true">↗</span>' +
        '<span class="sr-only">(새 창 · 제휴 링크)</span></a>');
    }
    var meta = [];
    if (item.reviews) {
      meta.push('<span class="aff-reviews">리뷰 ' + esc(item.reviews.toLocaleString("en-US")) + "</span>");
    }
    if (item.store) {
      meta.push('<span class="aff-store">' + esc(item.store) + "</span>");
    }
    return '<article class="aff-card" data-key="' + esc(item.key) + '">' +
      '<div class="aff-media">' +
      '<img class="aff-thumb" src="' + esc(item.thumb) + '" alt="' + esc(item.name) +
      ' 상품 이미지" width="96" height="96" loading="lazy" decoding="async">' +
      "</div>" +
      '<div class="aff-body">' +
      '<h3 class="aff-name">' + esc(item.name) + "</h3>" +
      '<p class="aff-point">' + esc(item.point) + "</p>" +
      '<p class="aff-price">' + esc(item.price) + (meta.length ? " " + meta.join(" ") : "") + "</p>" +
      '<div class="aff-links">' + links.join("") + "</div>" +
      '<details class="aff-more"><summary>고를 때 체크</summary>' +
      "<p>" + esc(item.check) + "</p>" +
      (item.product && item.product !== item.name
        ? '<p class="aff-product">상품명 ' + esc(item.product) + "</p>" : "") +
      "</details>" +
      "</div></article>";
  }

  var api = {
    toDate: toDate,
    daysLeft: daysLeft,
    isExpired: isExpired,
    formatDeadline: formatDeadline,
    ddayLabel: ddayLabel,
    filterAndSort: filterAndSort,
    filterAffiliates: filterAffiliates,
    categoryLabel: categoryLabel,
    esc: esc,
    cardHtml: cardHtml,
    affiliateCardHtml: affiliateCardHtml
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.HYENOTE_API = api;
  if (typeof document === "undefined") { return; }

  /* ── 화면 상태 ──────────────────────────────────────────── */

  var state = { view: "events", category: "all", sort: "deadline", query: "", showExpired: false };
  var grid = document.getElementById("eventGrid");
  if (!DATA || !grid) { return; }

  var viewTabs = document.getElementById("viewTabs");
  var tabsEl = document.getElementById("tabs");
  var searchEl = document.getElementById("search");
  var sortEl = document.getElementById("sort");
  var countEl = document.getElementById("resultCount");
  var emptyEl = document.getElementById("emptyState");
  var toggleEl = document.getElementById("toggleExpired");
  var resetEl = document.getElementById("resetFilters");
  var affiliateBody = document.getElementById("affiliateBody");
  var staleEl = document.getElementById("staleNotice");
  var filtersEl = document.getElementById("eventsFilters");
  var sortField = document.getElementById("sortField");
  var listNote = document.getElementById("listNote");
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-view-panel]"));
  var searchWrap = searchEl ? searchEl.closest(".search-field") : null;

  var PLACEHOLDER = {
    events: "기프티콘, 가습기, 네이밍…",
    babyitems: "물티슈, 젖병, 체온계…",
    picks: "기프티콘, 가습기, 네이밍…"
  };

  function renderTabs(now) {
    var counts = {};
    var total = 0;
    var query = state.query.trim().toLowerCase();
    DATA.events.forEach(function (item) {
      if (!state.showExpired && isExpired(item.deadline, now)) { return; }
      if (query && searchText(item).indexOf(query) === -1) { return; }
      counts[item.cat] = (counts[item.cat] || 0) + 1;
      total += 1;
    });

    tabsEl.innerHTML = DATA.categories.map(function (cat) {
      var n = cat.id === "all" ? total : (counts[cat.id] || 0);
      var selected = state.category === cat.id;
      return '<button type="button" role="tab" class="tab' + (selected ? " is-active" : "") +
        '" data-cat="' + esc(cat.id) + '" aria-selected="' + (selected ? "true" : "false") + '">' +
        esc(cat.label) + '<span class="tab-count">' + n + "</span></button>";
    }).join("");
  }

  function renderStats(now) {
    var total = 0;
    var soon = 0;
    DATA.events.forEach(function (item) {
      if (isExpired(item.deadline, now)) { return; }
      total += 1;
      var n = daysLeft(item.deadline, now);
      if (n !== null && n <= 3) { soon += 1; }
    });
    var set = function (id, value) {
      var el = document.getElementById(id);
      if (el) { el.textContent = String(value); }
    };
    set("statTotal", total);
    set("statSoon", soon);
    set("statItems", (DATA.affiliates || []).length);
    set("vtEvents", total);
  }

  function renderStale(now) {
    if (!staleEl) { return; }
    var base = toDate(DATA.updatedAt);
    var age = base ? Math.floor((startOfDay(now) - startOfDay(base)) / 86400000) : 0;
    if (age > 14) {
      staleEl.hidden = false;
      staleEl.textContent = "이 목록은 " + DATA.updatedAt + " 기준입니다. 마감이 지난 항목은 자동으로 숨겨지지만, 그 뒤에 열린 새 이벤트는 아직 반영되지 않았을 수 있습니다.";
    } else {
      staleEl.hidden = true;
    }
  }

  function renderList(now) {
    var list = filterAndSort(DATA.events, {
      category: state.category,
      query: state.query,
      sort: state.sort,
      showExpired: state.showExpired,
      now: now
    });

    grid.innerHTML = list.map(function (item) { return cardHtml(item, now); }).join("");
    emptyEl.hidden = list.length !== 0;

    var hidden = 0;
    if (!state.showExpired) {
      DATA.events.forEach(function (item) {
        if (isExpired(item.deadline, now) && (state.category === "all" || item.cat === state.category)) {
          hidden += 1;
        }
      });
    }

    var label = state.sort === "latest" ? "최신순" : "마감 임박순";
    var text = list.length + "개 표시 중 · " + label;
    if (state.category !== "all") { text = categoryLabel(state.category) + " · " + text; }
    if (hidden > 0) { text += " · 마감 " + hidden + "개는 숨김"; }
    countEl.textContent = text;
  }

  function renderAffiliates() {
    if (!affiliateBody || !DATA.affiliates) { return; }
    var list = filterAffiliates(DATA.affiliates, state.query);
    affiliateBody.innerHTML = list.map(affiliateCardHtml).join("");
    if (state.view === "babyitems" && countEl) {
      countEl.textContent = list.length + "종 표시 중 · 가격은 2026년 11월 국내 판매가 기준";
    }
  }

  /* ── 보기 전환 ──────────────────────────────────────────── */

  function setView(view, silent) {
    if (["events", "babyitems", "picks"].indexOf(view) === -1) { view = "events"; }
    state.view = view;
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-view-panel") !== view;
    });
    if (viewTabs) {
      Array.prototype.forEach.call(viewTabs.querySelectorAll(".view-tab"), function (btn) {
        var on = btn.getAttribute("data-view") === view;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    if (filtersEl) { filtersEl.hidden = view !== "events"; }
    if (sortField) { sortField.hidden = view !== "events"; }
    if (toggleEl) { toggleEl.hidden = view !== "events"; }
    if (searchWrap) { searchWrap.hidden = view === "picks"; }
    if (listNote) { listNote.hidden = view !== "events"; }
    if (searchEl) { searchEl.placeholder = PLACEHOLDER[view]; }
    if (!silent && viewTabs) { /* 해시는 읽기만 하고 쓰지 않습니다. */ }
    if (view !== "events") { if (countEl) { countEl.textContent = ""; } }
  }

  function render() {
    var now = new Date();
    renderTabs(now);
    renderStats(now);
    renderStale(now);
    if (state.view === "babyitems") {
      renderAffiliates();
    } else {
      renderList(now);
    }
  }

  /* ── 안내 모달 ──────────────────────────────────────────── */

  var modal = document.getElementById("modal");
  var modalTitle = document.getElementById("modalTitle");
  var modalBody = document.getElementById("modalBody");
  var lastFocus = null;
  var MODAL_TITLES = {
    guide: "사이트 안내",
    about: "서비스 소개",
    sources: "데이터 출처·면책"
  };

  function openModal(key) {
    if (!modal || !MODAL_TITLES[key]) { return; }
    var tpl = document.getElementById("tpl-" + key);
    if (!tpl) { return; }
    modalTitle.textContent = MODAL_TITLES[key];
    modalBody.innerHTML = "";
    modalBody.appendChild(tpl.content.cloneNode(true));
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    var closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) { closeBtn.focus(); }
  }

  function closeModal() {
    if (!modal || modal.hidden) { return; }
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    modalBody.innerHTML = "";
    if (lastFocus && typeof lastFocus.focus === "function") { lastFocus.focus(); }
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest ? event.target.closest("[data-modal]") : null;
    if (trigger) {
      event.preventDefault();
      openModal(trigger.getAttribute("data-modal"));
      return;
    }
    var closer = event.target.closest ? event.target.closest("[data-close]") : null;
    if (closer) {
      event.preventDefault();
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (!modal || modal.hidden) { return; }
    if (event.key === "Escape") {
      closeModal();
      return;
    }
    if (event.key === "Tab") {
      var focusables = modal.querySelectorAll('a[href], button:not([disabled])');
      if (!focusables.length) { return; }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* ── 입력 이벤트 ────────────────────────────────────────── */

  if (viewTabs) {
    viewTabs.addEventListener("click", function (event) {
      var btn = event.target.closest ? event.target.closest(".view-tab") : null;
      if (!btn) { return; }
      setView(btn.getAttribute("data-view"));
      if (state.view === "babyitems") { renderAffiliates(); }
      else if (state.view === "events") { renderList(new Date()); }
    });
  }

  tabsEl.addEventListener("click", function (event) {
    var btn = event.target.closest ? event.target.closest(".tab") : null;
    if (!btn) { return; }
    state.category = btn.getAttribute("data-cat");
    render();
  });

  var searchTimer = null;
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      if (searchTimer) { global.clearTimeout(searchTimer); }
      searchTimer = global.setTimeout(function () {
        state.query = searchEl.value;
        if (state.view === "babyitems") { renderAffiliates(); }
        else { renderTabs(new Date()); renderList(new Date()); }
      }, 120);
    });
  }

  if (sortEl) {
    sortEl.addEventListener("change", function () {
      state.sort = sortEl.value;
      renderList(new Date());
    });
  }

  if (toggleEl) {
    toggleEl.addEventListener("click", function () {
      state.showExpired = !state.showExpired;
      toggleEl.setAttribute("aria-pressed", state.showExpired ? "true" : "false");
      toggleEl.textContent = state.showExpired ? "마감 지난 항목 숨기기" : "마감 지난 항목 보기";
      render();
    });
  }

  if (resetEl) {
    resetEl.addEventListener("click", function () {
      state.category = "all";
      state.sort = "deadline";
      state.query = "";
      state.showExpired = false;
      if (searchEl) { searchEl.value = ""; }
      if (sortEl) { sortEl.value = "deadline"; }
      if (toggleEl) {
        toggleEl.setAttribute("aria-pressed", "false");
        toggleEl.textContent = "마감 지난 항목 보기";
      }
      render();
    });
  }

  /* "/" 키로 검색창 이동 */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) { return; }
    var tag = (event.target && event.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") { return; }
    if (!searchEl || (searchWrap && searchWrap.hidden)) { return; }
    event.preventDefault();
    searchEl.focus();
  });

  /* 첫 화면: 해시(#babyitems, #picks)로 보기 지정 */
  var hash = String(global.location && global.location.hash || "").replace("#", "");
  if (hash === "babyitems" || hash === "items" || hash === "compare") { setView("babyitems", true); }
  else if (hash === "picks" || hash === "shop") { setView("picks", true); }
  else { setView("events", true); }

  renderAffiliates();
  render();
})(typeof globalThis !== "undefined" ? globalThis : this);
