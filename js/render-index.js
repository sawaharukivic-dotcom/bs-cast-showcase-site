// 一覧ページ: casts-data.js（window.SHOWCASE）からランク帯別セクションを生成
(function () {
  "use strict";
  var S = window.Showcase;
  var root = document.getElementById("tiers");
  if (!root || !S) return;

  // ランク対象月の表示（例: 2026-07 → "2026.07 RANKING"）
  var monthEl = document.getElementById("rankMonth");
  var month = (window.SHOWCASE && window.SHOWCASE.rank_month) || "";
  if (monthEl && month) monthEl.textContent = month.replace("-", ".") + " RANKING";

  // 画像の遅延読み込み（画面に入る300px手前から）
  var lazy = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target;
          img.src = img.dataset.src;
          lazy.unobserve(img);
        });
      }, { rootMargin: "300px 0px" })
    : null;

  function avatar(cast, className) {
    var wrap = S.el("span", className);
    if (cast.icon) {
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.addEventListener("error", function () {
        img.remove();
        wrap.dataset.fallback = (cast.name || "?").charAt(0);
      });
      if (lazy) {
        img.dataset.src = cast.icon;
        lazy.observe(img);
      } else {
        img.src = cast.icon;
      }
      wrap.appendChild(img);
    } else {
      wrap.dataset.fallback = (cast.name || "?").charAt(0);
    }
    return wrap;
  }

  S.RANKS.forEach(function (rank) {
    var members = S.casts().filter(function (c) { return c.rank === rank; });
    if (!members.length) return;

    var tier = S.el("section", "tier tier--" + rank + " reveal");

    var head = S.el("div", "tier__head");
    var label = S.el("h2", "tier__label");
    label.appendChild(S.el("span", "tier__en", rank));
    label.appendChild(S.el("span", "tier__count", S.RANK_JA[rank] + " / " + members.length + "名"));
    head.appendChild(label);
    head.appendChild(S.el("span", "tier__stripes"));
    tier.appendChild(head);

    var grid = S.el("div", "tier__grid");
    members.forEach(function (cast) {
      var card = document.createElement("a");
      card.className = "cast-card reveal";
      card.href = "./cast.html?id=" + encodeURIComponent(cast.cast_id);

      card.appendChild(avatar(cast, "cast-card__avatar"));
      card.appendChild(S.el("span", "cast-card__rank", cast.rank));
      card.appendChild(S.el("h3", "cast-card__name", cast.name));
      if (cast.name_reading) card.appendChild(S.el("p", "cast-card__reading", cast.name_reading));
      if (cast.catch) card.appendChild(S.el("p", "cast-card__catch", cast.catch));

      grid.appendChild(card);
    });
    tier.appendChild(grid);
    root.appendChild(tier);
  });

  // スクロール登場
  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06 });
    document.querySelectorAll(".reveal").forEach(function (n) { reveal.observe(n); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("is-in"); });
  }
})();
