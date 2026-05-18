(function () {
  'use strict';

  var WIDGET_ID     = 'cc-float-widget';
  var HIDDEN_KEY    = 'cc_widget_hidden';
  var COLLAPSED_KEY = 'cc_widget_collapsed';

  var isCalcPage = window.location.pathname.includes('calculator');

  var ITEMS = [
    { id: 'reGA',     icon: '🧮', label: '재가급여 계산', badge: '',    type: 'calc', target: '재가급여' },
    { id: 'siSeol',   icon: '🏥', label: '시설급여 계산', badge: '',    type: 'calc', target: '시설급여' },
    { id: 'grade',    icon: '⭐', label: '등급예상 계산', badge: '인기', type: 'calc', target: '등급예상' },
    { id: 'homecare', icon: '💰', label: '방문요양 비용', badge: '',    type: 'link', target: '/homecare-cost.html' },
    { id: 'facility', icon: '🏠', label: '요양원 비용',   badge: '',    type: 'link', target: '/facility-cost.html' },
  ];

  /* ── 저장소 ─────────────────────────────────────── */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ── 상태 ───────────────────────────────────────── */
  var hidden    = load(HIDDEN_KEY, []);
  var collapsed = load(COLLAPSED_KEY, false);
  var activeId  = isCalcPage ? 'reGA' : null;

  /* ── top 위치 자동 계산 ─────────────────────────── */
  // header.js가 먼저 DOMContentLoaded 등록 → tab-bar 먼저 삽입
  // 위젯 init 시점에 .tab-bar 존재 여부 확인 가능
  function getTopOffset() {
    var hasTabBar = !!document.querySelector('.tab-bar');
    return (44 + (hasTabBar ? 44 : 0) + 8) + 'px';
  }

  /* ── 현재 페이지 여부 ───────────────────────────── */
  function isCurrentPage(target) {
    return window.location.pathname === target;
  }

  /* ── 렌더 ───────────────────────────────────────── */
  function render() {
    var el = document.getElementById(WIDGET_ID);
    if (!el) return;

    el.style.top = getTopOffset();

    var visible = ITEMS.filter(function (item) {
      return hidden.indexOf(item.id) === -1;
    });

    var itemsHTML = visible.map(function (item) {
      var isActive =
        (item.type === 'calc' && item.id === activeId) ||
        (item.type === 'link' && isCurrentPage(item.target));

      var badgeHTML = item.badge
        ? ' <span class="ccw-badge">' + item.badge + '</span>'
        : '';

      return (
        '<div class="ccw-item' + (isActive ? ' ccw-item--active' : '') + '"' +
        ' data-id="' + item.id + '"' +
        ' data-type="' + item.type + '"' +
        ' data-target="' + item.target + '">' +
          '<span class="ccw-icon">' + item.icon + '</span>' +
          '<span class="ccw-label">' + item.label + badgeHTML + '</span>' +
          '<button class="ccw-close" data-id="' + item.id + '" aria-label="숨기기">×</button>' +
        '</div>'
      );
    }).join('');

    var resetHTML = hidden.length > 0
      ? '<button class="ccw-reset" id="ccw-reset">메뉴 복원</button>'
      : '';

    el.innerHTML =
      '<div class="ccw-header" id="ccw-header">' +
        '<span class="ccw-title">🧭 계산기</span>' +
        '<button class="ccw-toggle" id="ccw-toggle">' + (collapsed ? '▼' : '▲') + '</button>' +
      '</div>' +
      '<div class="ccw-body" id="ccw-body"' + (collapsed ? ' style="display:none"' : '') + '>' +
        itemsHTML +
        resetHTML +
      '</div>';

    bindEvents(el);
  }

  /* ── 이벤트 ─────────────────────────────────────── */
  function bindEvents(el) {
    el.querySelector('#ccw-header').addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON' || e.target === this) {
        collapsed = !collapsed;
        save(COLLAPSED_KEY, collapsed);
        render();
      }
    });

    el.querySelectorAll('.ccw-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.classList.contains('ccw-close')) return;

        var type   = this.getAttribute('data-type');
        var target = this.getAttribute('data-target');
        var id     = this.getAttribute('data-id');

        if (type === 'calc') {
          if (isCalcPage) {
            activeId = id;
            if (window.switchCalc) window.switchCalc(target);
            render();
          } else {
            window.location.href = '/calculator.html?tab=' + encodeURIComponent(target);
          }
        } else {
          if (!isCurrentPage(target)) {
            window.location.href = target;
          }
        }
      });
    });

    el.querySelectorAll('.ccw-close').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = this.getAttribute('data-id');
        if (hidden.indexOf(id) === -1) hidden.push(id);
        save(HIDDEN_KEY, hidden);
        render();
      });
    });

    var resetBtn = el.querySelector('#ccw-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        hidden = [];
        save(HIDDEN_KEY, hidden);
        render();
      });
    }
  }

  /* ── 외부 API: 탭 클릭 → 위젯 동기화 ───────────── */
  window.__widgetSetActive = function (target) {
    for (var i = 0; i < ITEMS.length; i++) {
      if (ITEMS[i].target === target && ITEMS[i].type === 'calc') {
        activeId = ITEMS[i].id;
        render();
        break;
      }
    }
  };

  /* ── 초기화 ─────────────────────────────────────── */
  function init() {
    var el = document.createElement('div');
    el.id = WIDGET_ID;
    document.body.appendChild(el);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
