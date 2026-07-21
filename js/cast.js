// 個別ページ: ?id=cast_id のキャストを casts-data.js から表示
(function () {
  "use strict";
  window.scrollTo(0, 0); // iframe内でbfcache復元されてもページ先頭から見せる

  var S = window.Showcase;
  var main = document.getElementById("profile");
  if (!main || !S) return;

  var id = new URLSearchParams(location.search).get("id");
  var found = S.findCast(id);

  if (!found) {
    var nf = S.el("div", "not-found");
    nf.appendChild(S.el("p", null, "キャストが見つかりませんでした。"));
    var back = document.createElement("a");
    back.href = "./index.html";
    back.textContent = "一覧にもどる";
    nf.appendChild(back);
    main.appendChild(nf);
    return;
  }

  var cast = found.cast;
  document.title = cast.name + " | BackStage ランク入りキャスト";

  var card = S.el("article", "profile__card rank-" + cast.rank);

  // ビジュアル面: 立ち絵 > アイコン > 頭文字 の順でフォールバック
  var visual = S.el("div", "profile__visual");
  if (cast.portrait) {
    var portrait = document.createElement("img");
    portrait.className = "portrait";
    portrait.src = cast.portrait;
    portrait.alt = cast.name;
    portrait.addEventListener("error", function () {
      portrait.remove();
      visual.appendChild(avatarLg());
    });
    visual.appendChild(portrait);
  } else {
    visual.appendChild(avatarLg());
  }
  function avatarLg() {
    var wrap = S.el("span", "avatar-lg");
    if (cast.icon) {
      var img = document.createElement("img");
      img.src = cast.icon;
      img.alt = cast.name;
      img.addEventListener("error", function () {
        img.remove();
        wrap.dataset.fallback = (cast.name || "?").charAt(0);
      });
      wrap.appendChild(img);
    } else {
      wrap.dataset.fallback = (cast.name || "?").charAt(0);
    }
    return wrap;
  }
  card.appendChild(visual);

  // テキスト面
  var info = S.el("div", "profile__info");
  info.appendChild(S.el("span", "profile__rank", cast.rank));
  info.appendChild(S.el("h1", "profile__name", cast.name));
  if (cast.name_reading) info.appendChild(S.el("p", "profile__reading", cast.name_reading));
  if (cast.catch) info.appendChild(S.el("p", "profile__catch", cast.catch));
  if (cast.intro) info.appendChild(S.el("p", "profile__intro", cast.intro));

  var xUrl = S.safeUrl(cast.x_url);
  if (xUrl) {
    var links = S.el("div", "profile__links");
    var xBtn = document.createElement("a");
    xBtn.className = "btn-x";
    xBtn.href = xUrl;
    xBtn.target = "_blank";
    xBtn.rel = "noopener";
    xBtn.textContent = "𝕏 フォローする";
    links.appendChild(xBtn);
    info.appendChild(links);
  }
  card.appendChild(info);
  main.appendChild(card);

  // CTA文言をキャスト名入りに
  var ctaText = document.getElementById("ctaText");
  if (ctaText) ctaText.textContent = cast.name + " にアプリで会いに行こう";

  // 前後ナビ（公開キャスト一覧の並び順で前後）
  var pager = document.getElementById("pager");
  var list = S.casts();
  if (pager && list.length > 1) {
    var prev = list[(found.index - 1 + list.length) % list.length];
    var next = list[(found.index + 1) % list.length];
    var a1 = document.createElement("a");
    a1.className = "prev";
    a1.href = "./cast.html?id=" + encodeURIComponent(prev.cast_id);
    a1.textContent = "← " + prev.name;
    var a2 = document.createElement("a");
    a2.className = "next";
    a2.href = "./cast.html?id=" + encodeURIComponent(next.cast_id);
    a2.textContent = next.name + " →";
    pager.appendChild(a1);
    pager.appendChild(a2);
  }

  // 「一覧にもどる」: 履歴があれば戻る（一覧のスクロール位置を保つ）、なければ通常遷移
  var backLink = document.getElementById("backLink");
  if (backLink) {
    backLink.addEventListener("click", function (e) {
      if (document.referrer && document.referrer.indexOf("cast.html") === -1 && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
  }
})();
