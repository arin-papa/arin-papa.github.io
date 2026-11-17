/*!
 * 아린아빠 혜택노트 — app.js
 * 목록 렌더링 · 필터 · 검색 · 정렬 · 안내 모달
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

  /* ── 카테고리 · 검색 · 정렬 ───────────────────────────────── */

  function categoryLabel(id) {
    var list = (DATA && DATA.categories) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { return list[i].label; }
    }
    return id;
  }

  function searchText(item) {
    return [
      item.title, item.host, item.benefit, item.condition,
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

  /* 카테고리별 썸네일 — 직접 만든 AI 일러스트(타 사이트 사진 사용 없음). */
  var CAT_MEDIA = {
    baby: {
      src: "assets/cat-baby.webp",
      alt: "육아·6개월 혜택 일러스트 — 아기 용품이 담긴 바구니"
    },
    survey: {
      src: "assets/cat-survey.webp",
      alt: "설문·기프티콘 혜택 일러스트 — 설문 화면과 기프티콘 카드"
    },
    delivery: {
      src: "assets/cat-delivery.webp",
      alt: "배송형 체험단 일러스트 — 문 앞에 놓인 택배 상자"
    },
    contest: {
      src: "assets/cat-contest.webp",
      alt: "공모전 일러스트 — 트로피와 연필, 아이디어 전구"
    }
  };

  function mediaHtml(item) {
    var media = CAT_MEDIA[item.cat];
    if (!media) { return ""; }
    return '<figure class="card-media"><img src="' + esc(media.src) + '" alt="' +
      esc(media.alt) + '" width="800" height="450" loading="lazy" decoding="async"></figure>';
  }

  var api = {
    toDate: toDate,
    daysLeft: daysLeft,
    isExpired: isExpired,
    formatDeadline: formatDeadline,
    ddayLabel: ddayLabel,
    filterAndSort: filterAndSort,
    categoryLabel: categoryLabel,
    CAT_MEDIA: CAT_MEDIA,
    /* 아래 세 함수는 정적 미리렌더·검증용으로도 쓸 수 있게 함께 내보냅니다. */
    esc: esc,
    mediaHtml: mediaHtml,
    cardHtml: cardHtml,
    affiliateRowHtml: affiliateRowHtml
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.HYENOTE_API = api;
  if (typeof document === "undefined") { return; }

  /* ── 렌더링 ─────────────────────────────────────────────── */

  var state = { category: "all", sort: "deadline", query: "", showExpired: false };
  var grid = document.getElementById("eventGrid");
  if (!DATA || !grid) { return; }

  var tabsEl = document.getElementById("tabs");
  var searchEl = document.getElementById("search");
  var sortEl = document.getElementById("sort");
  var countEl = document.getElementById("resultCount");
  var emptyEl = document.getElementById("emptyState");
  var toggleEl = document.getElementById("toggleExpired");
  var resetEl = document.getElementById("resetFilters");
  var affiliateBody = document.getElementById("affiliateBody");
  var staleEl = document.getElementById("staleNotice");

  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, function (ch) {
      if (ch === "&") { return "&amp;"; }
      if (ch === "<") { return "&lt;"; }
      if (ch === ">") { return "&gt;"; }
      if (ch === '"') { return "&quot;"; }
      return "&#39;";
    });
  }

  function cardHtml(item, now) {
    var n = daysLeft(item.deadline, now);
    var expired = isExpired(item.deadline, now);
    var parts = [];
    parts.push('<article class="card' + (expired ? " is-expired" : "") + '" data-id="' + esc(item.id) + '">');
    parts.push(mediaHtml(item));
    parts.push('<div class="card-top">');
    parts.push('<span class="badge badge--' + esc(item.cat) + '">' + esc(categoryLabel(item.cat)) + "</span>");
    parts.push('<span class="dday ' + ddayClass(n, expired) + '">' + esc(ddayLabel(n)) + "</span>");
    parts.push("</div>");
    parts.push('<h3 class="card-title">' + esc(item.title) + "</h3>");
    parts.push('<p class="card-host">' + esc(item.host) +
      (item.verified ? "" : ' <span class="flag">공유 정보·재확인</span>') + "</p>");
    parts.push('<dl class="facts">');
    parts.push('<div class="fact"><dt>혜택</dt><dd>' + esc(item.benefit) + "</dd></div>");
    parts.push('<div class="fact"><dt>조건</dt><dd>' + esc(item.condition) + "</dd></div>");
    parts.push('<div class="fact"><dt>마감</dt><dd><strong>' + esc(formatDeadline(item.deadline, now)) + "</strong>" +
      (item.announce ? ' <span class="muted">· ' + esc(item.announce) + "</span>" : "") + "</dd></div>");
    parts.push("</dl>");
    parts.push('<p class="tip"><span class="tip-label">한 줄 팁</span>' + esc(item.tip) + "</p>");
    parts.push('<div class="card-foot">');
    parts.push('<span class="src">출처 ' + esc(item.source) + "<br>확인 " + esc(item.checked) + "</span>");
    parts.push('<a class="go" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' +
      esc(item.urlLabel || "원본에서 신청하기") +
      ' <span aria-hidden="true">↗</span><span class="sr-only">(새 창)</span></a>');
    parts.push("</div></article>");
    return parts.join("");
  }

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

    var html = DATA.categories.map(function (cat) {
      var n = cat.id === "all" ? total : (counts[cat.id] || 0);
      var selected = state.category === cat.id;
      return '<button type="button" role="tab" class="tab' + (selected ? " is-active" : "") +
        '" data-cat="' + esc(cat.id) + '" aria-selected="' + (selected ? "true" : "false") + '">' +
        esc(cat.label) + '<span class="tab-count">' + n + "</span></button>";
    }).join("");

    tabsEl.innerHTML = html;
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
    document.getElementById("statTotal").textContent = String(total);
    document.getElementById("statSoon").textContent = String(soon);
    document.getElementById("statFree").textContent = "0원";
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

  function affiliateRowHtml(item) {
    var links = [];
    if (item.url) {
      links.push('<a class="aff-btn" href="' + esc(item.url) +
        '" target="_blank" rel="sponsored noopener noreferrer">네이버 최저가 <span aria-hidden="true">↗</span></a>');
    }
    if (item.coupangUrl) {
      links.push('<a class="aff-btn aff-btn--coupang" href="' + esc(item.coupangUrl) +
        '" target="_blank" rel="sponsored noopener noreferrer">쿠팡 최저가 <span aria-hidden="true">↗</span></a>');
    }
    var buy = links.length
      ? '<span class="aff-links">' + links.join("") + "</span>"
      : '<span class="aff-empty">링크 준비 중</span>';
    var thumb = item.thumb
      ? '<img class="aff-thumb" src="' + esc(item.thumb) +
        '" alt="' + esc(item.name) + ' 상품 이미지" width="96" height="96"' +
        ' loading="lazy" decoding="async">'
      : "";
    return "<tr>" +
      "<th scope=\"row\"><span class=\"aff-item\">" + thumb +
      "<span class=\"aff-name\">" + esc(item.name) + "</span></span></th>" +
      "<td data-label=\"필요한 이유\">" + esc(item.why) + "</td>" +
      "<td data-label=\"체크포인트\">" + esc(item.check) + "</td>" +
      "<td data-label=\"대략 시세\" class=\"price\">" + esc(item.price) + "</td>" +
      "<td data-label=\"구매\" class=\"buy\">" + buy + "</td>" +
      "</tr>";
  }

  function renderAffiliates() {
    if (!affiliateBody || !DATA.affiliates) { return; }
    affiliateBody.innerHTML = DATA.affiliates.map(affiliateRowHtml).join("");
  }

  function render() {
    var now = new Date();
    renderTabs(now);
    renderStats(now);
    renderStale(now);
    renderList(now);
  }

  /* ── 안내 모달 ───────────────────────────────────────────── */

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

  /* ── 입력 이벤트 ─────────────────────────────────────────── */

  tabsEl.addEventListener("click", function (event) {
    var btn = event.target.closest ? event.target.closest(".tab") : null;
    if (!btn) { return; }
    state.category = btn.getAttribute("data-cat");
    render();
  });

  var searchTimer = null;
  searchEl.addEventListener("input", function () {
    if (searchTimer) { global.clearTimeout(searchTimer); }
    searchTimer = global.setTimeout(function () {
      state.query = searchEl.value;
      render();
    }, 120);
  });

  sortEl.addEventListener("change", function () {
    state.sort = sortEl.value;
    render();
  });

  toggleEl.addEventListener("click", function () {
    state.showExpired = !state.showExpired;
    toggleEl.setAttribute("aria-pressed", state.showExpired ? "true" : "false");
    toggleEl.textContent = state.showExpired ? "마감 지난 항목 숨기기" : "마감 지난 항목 보기";
    render();
  });

  resetEl.addEventListener("click", function () {
    state = { category: "all", sort: "deadline", query: "", showExpired: false };
    searchEl.value = "";
    sortEl.value = "deadline";
    toggleEl.setAttribute("aria-pressed", "false");
    toggleEl.textContent = "마감 지난 항목 보기";
    render();
  });

  renderAffiliates();
  render();
})(typeof globalThis !== "undefined" ? globalThis : this);
