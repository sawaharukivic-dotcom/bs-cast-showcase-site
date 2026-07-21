// 一覧⇔個別をページ遷移なしで切り替えるSPA
// STUDIOのsandbox iframe内では再読み込みが目立つため、DOM切り替えで瞬時に遷移し
// 一覧のスクロール位置も保持する。?id=NN 付きで開かれたら最初から個別を表示する。
// 切り替え時は .view-leave（退場160ms）→ .view-enter（要素ごとの時差fade-up）で
// アニメーションする（定義は css/cast.css。reduced-motion時は即切り替え）。
// 個別ビューは 9-nine風（立ち絵主役＋罫線・明朝タイポ）。上部に全キャスト切替ナビ常設。
(function () {
  "use strict";
  var S = window.Showcase;
  var listView = document.getElementById("listView");
  var detailView = document.getElementById("detailView");
  var castNav = document.getElementById("castNav");
  var castNavScroll = document.getElementById("castNavScroll");
  var tiers = document.getElementById("tiers");
  if (!listView || !detailView || !tiers || !S) return;

  var listScrollY = 0;      // 一覧に戻ったとき復元するスクロール位置
  var canHistory = true;    // sandbox等でhistory操作が失敗したらfalseにして以後使わない
  var LEAVE_MS = 160;       // .view-leave のアニメ時間と合わせる

  function push(id) {
    if (!canHistory) return;
    try {
      history.pushState({ id: id }, "", id != null ? "./?id=" + encodeURIComponent(id) : "./");
    } catch (e) {
      canHistory = false;
    }
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 【スクロール方式の経緯】かつて「中身の高さを親に通知してiframeごと伸ばし、
  // スクロールを親ページに返す」自動リサイズ方式を試したが、STUDIOのsandbox
  // 環境（特にiOS）ではクロスオリジン制限により切替時の親スクロール復帰が
  // 一切効かないことが実機で確定したため、iframe内部スクロール方式に戻した。
  // （内部スクロールなら window.scrollTo で位置制御が完全に効く。
  //   代償としてSTUDIO側のスクロール連動ヘッダーはこのページでは動かない）

  // fromEl を退場させてから apply()（描画・表示切替・スクロール）を実行し、toEl を登場させる
  function swapViews(fromEl, toEl, apply) {
    var run = function () {
      if (fromEl) {
        fromEl.classList.remove("view-leave");
        fromEl.hidden = true;
      }
      apply();
      toEl.hidden = false;
      toEl.classList.remove("view-enter");
      void toEl.offsetWidth; // 同じビューに再入場してもアニメが再生されるようreflow
      toEl.classList.add("view-enter");
    };
    if (!fromEl || fromEl.hidden || reducedMotion()) {
      run();
      return;
    }
    fromEl.classList.add("view-leave");
    window.setTimeout(run, LEAVE_MS);
  }

  // ---------- 画像ヘルパー ----------
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

  // observer=省略時は即読み込み。指定時はそのIntersectionObserverで遅延読み込み
  function avatar(cast, className, observer) {
    var wrap = S.el("span", className);
    if (cast.icon) {
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.addEventListener("error", function () {
        img.remove();
        wrap.dataset.fallback = (cast.name || "?").charAt(0);
      });
      if (observer) {
        img.dataset.src = cast.icon;
        observer.observe(img);
      } else {
        img.src = cast.icon;
      }
      wrap.appendChild(img);
    } else {
      wrap.dataset.fallback = (cast.name || "?").charAt(0);
    }
    return wrap;
  }

  function spaLink(el, handler) {
    el.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // 新規タブ系はブラウザに任せる
      e.preventDefault();
      handler();
    });
  }

  // ---------- 一覧 ----------
  function renderList() {
    var monthEl = document.getElementById("rankMonth");
    var month = (window.SHOWCASE && window.SHOWCASE.rank_month) || "";
    if (monthEl && month) monthEl.textContent = month.replace("-", ".") + " RANKING";

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
        card.href = "./?id=" + encodeURIComponent(cast.cast_id);
        spaLink(card, function () { showDetail(cast.cast_id, true); });
        card.appendChild(avatar(cast, "cast-card__avatar", lazy));
        card.appendChild(S.el("span", "cast-card__rank", cast.rank));
        card.appendChild(S.el("h3", "cast-card__name", cast.name));
        if (cast.name_reading) card.appendChild(S.el("p", "cast-card__reading", cast.name_reading));
        if (cast.catch) card.appendChild(S.el("p", "cast-card__catch", cast.catch));
        grid.appendChild(card);
      });
      tier.appendChild(grid);
      tiers.appendChild(tier);
    });

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
  }

  // ---------- キャスト切替ナビ（CloverDays風・起動時に1回だけ生成） ----------
  var navItems = {}; // cast_id → a要素
  function buildCastNav() {
    if (!castNav || !castNavScroll) return;
    var navLazy = "IntersectionObserver" in window
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var img = entry.target;
            img.src = img.dataset.src;
            navLazy.unobserve(img);
          });
        }, { root: castNavScroll, rootMargin: "0px 400px" })
      : null;

    S.casts().forEach(function (cast) {
      var item = document.createElement("a");
      item.className = "cast-nav__item rank-" + cast.rank;
      item.href = "./?id=" + encodeURIComponent(cast.cast_id);
      item.title = cast.name;
      spaLink(item, function () { showDetail(cast.cast_id, true); });
      item.appendChild(avatar(cast, "cast-nav__avatar", navLazy));
      item.appendChild(S.el("span", "cast-nav__name", cast.name));
      castNavScroll.appendChild(item);
      navItems[cast.cast_id] = item;
    });
  }

  function updateCastNav(currentId) {
    Object.keys(navItems).forEach(function (id) {
      var on = String(id) === String(currentId);
      navItems[id].classList.toggle("is-current", on);
      if (on) {
        navItems[id].setAttribute("aria-current", "page");
        // scrollIntoViewは親ページ(STUDIO)までスクロールが伝播してしまうため、
        // バーのコンテナだけを手動で横スクロールして中央に寄せる
        var item = navItems[id];
        var left = item.offsetLeft - (castNavScroll.clientWidth - item.offsetWidth) / 2;
        castNavScroll.scrollTo({
          left: Math.max(0, left),
          behavior: reducedMotion() ? "auto" : "smooth",
        });
      } else {
        navItems[id].removeAttribute("aria-current");
      }
    });
  }

  // ---------- 個別（9-nine風: 立ち絵主役＋罫線・明朝タイポ） ----------
  function storeBadges() {
    var wrap = S.el("div", "cta__badges");
    [
      { href: "https://apps.apple.com/jp/app/id6443913743", img: "./assets/badge-app-store.svg", alt: "App Storeでダウンロード" },
      { href: "https://play.google.com/store/apps/details?id=jp.vic_inc.app.back_stage", img: "./assets/badge-google-play.png", alt: "Google Playで手に入れよう" },
    ].forEach(function (b) {
      var a = document.createElement("a");
      a.href = b.href;
      a.target = "_blank";
      a.rel = "noopener";
      var img = document.createElement("img");
      img.src = b.img;
      img.alt = b.alt;
      img.height = 48;
      a.appendChild(img);
      wrap.appendChild(a);
    });
    return wrap;
  }

  // スペック表: autoの固定行（誕生月・タイプ）＋manualのspecs行。空値の行は出さない
  function buildSpecs(cast) {
    var rows = [];
    if (cast.birth_month) {
      var bm = String(cast.birth_month);
      rows.push({ label: "誕生月", value: /月$/.test(bm) ? bm : bm + "月" });
    }
    if (cast.call_category) rows.push({ label: "タイプ", value: cast.call_category });
    (cast.specs || []).forEach(function (row) {
      if (row && row.label && row.value) rows.push({ label: row.label, value: row.value });
    });
    if (!rows.length) return null;
    var dl = S.el("dl", "chara__specs");
    rows.forEach(function (row) {
      var div = document.createElement("div");
      div.appendChild(S.el("dt", null, row.label));
      div.appendChild(S.el("dd", null, row.value));
      dl.appendChild(div);
    });
    return dl;
  }

  // 紹介動画: サムネのファサードを置き、クリック時にiframeへ差し替え（初期表示を軽く保つ）
  function buildMovie(cast) {
    var id = S.safeYouTubeId(cast.youtube_id);
    if (!id) return null;
    var section = S.el("section", "chara-movie");
    var head = S.el("h2", "section-head");
    head.appendChild(S.el("span", "section-head__en", "MOVIE"));
    head.appendChild(S.el("span", "section-head__stripes"));
    section.appendChild(head);

    var frame = S.el("div", "movie-frame");
    var facade = document.createElement("button");
    facade.type = "button";
    facade.className = "movie-facade";
    facade.setAttribute("aria-label", cast.name + " の紹介動画を再生");
    facade.style.backgroundImage = 'url("https://i.ytimg.com/vi/' + id + '/hqdefault.jpg")';
    facade.appendChild(S.el("span", "movie-facade__play"));
    facade.addEventListener("click", function () {
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1";
      iframe.title = cast.name + " 紹介動画";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      frame.textContent = "";
      frame.appendChild(iframe);
    });
    frame.appendChild(facade);
    section.appendChild(frame);
    return section;
  }

  function renderDetail(cast, index) {
    detailView.textContent = "";

    // 戻る
    var topbar = S.el("nav", "topbar");
    var back = document.createElement("a");
    back.className = "topbar__back";
    back.href = "./";
    back.textContent = "← 一覧にもどる";
    spaLink(back, function () { showList(true); });
    topbar.appendChild(back);
    detailView.appendChild(topbar);

    // キャラセクション
    var chara = S.el("section", "chara rank-" + cast.rank);

    // 罫線フレーム（castrank.jpegの金二重罫線＋菱形装飾のダーク翻訳）
    var frame = S.el("span", "chara__frame");
    frame.setAttribute("aria-hidden", "true");
    frame.appendChild(S.el("i", "chara__diamond chara__diamond--b"));
    chara.appendChild(frame);

    // 背景ウォーターマーク（ランク英字）
    var watermark = S.el("span", "chara__watermark", cast.rank);
    watermark.setAttribute("aria-hidden", "true");
    chara.appendChild(watermark);

    // ビジュアル（立ち絵（複数なら衣装切替タブ付き） > アイコン > 頭文字）
    // 9-nine方式: 全立ち絵を重ねて置き、縦グラデーションマスクのスライドでクロスワイプ切替
    var visual = S.el("div", "chara__visual");
    var portraits = (cast.portraits && cast.portraits.length)
      ? cast.portraits
      : (cast.portrait ? [cast.portrait] : []);
    if (portraits.length) {
      var stack = S.el("div", "chara__portraits");
      var imgs = portraits.map(function (src, i) {
        var img = document.createElement("img");
        img.className = "portrait" + (i === 0 ? " is-current" : "");
        img.src = src;
        img.alt = i === 0 ? cast.name : "";
        stack.appendChild(img);
        return img;
      });
      // 1枚目（レイアウト基準）が壊れていたらアイコン大円へフォールバック
      imgs[0].addEventListener("error", function () {
        stack.remove();
        var brokenTabs = visual.querySelector(".chara__costumes");
        if (brokenTabs) brokenTabs.remove();
        visual.appendChild(avatar(cast, "avatar-lg"));
      });
      visual.appendChild(stack);
      if (imgs.length > 1) {
        var tabs = S.el("div", "chara__costumes");
        imgs.forEach(function (img, i) {
          var tab = document.createElement("button");
          tab.type = "button";
          tab.className = "chara__costume" + (i === 0 ? " is-active" : "");
          tab.textContent = String(i + 1);
          tab.setAttribute("aria-label", "立ち絵 " + (i + 1) + " に切り替え");
          tab.addEventListener("click", function () {
            if (tab.classList.contains("is-active")) return;
            tabs.querySelectorAll(".chara__costume").forEach(function (n) { n.classList.remove("is-active"); });
            tab.classList.add("is-active");
            // 前の立ち絵は表示したまま(.is-prev)、新しい立ち絵が上にリビールで重なる。
            // リビール完了後に前の立ち絵をフェードアウトさせる
            imgs.forEach(function (other, j) {
              if (i === j) return;
              if (other.classList.contains("is-current")) {
                other.classList.remove("is-current");
                other.classList.add("is-prev");
                window.setTimeout(function () { other.classList.remove("is-prev"); }, 950);
              } else {
                other.classList.remove("is-prev");
              }
            });
            imgs[i].classList.add("is-current");
          });
          tabs.appendChild(tab);
        });
        visual.appendChild(tabs);
      }
    } else {
      visual.appendChild(avatar(cast, "avatar-lg"));
    }
    chara.appendChild(visual);

    // キャッチの縦書きデコ（キャッチ未設定なら出さない）
    if (cast.catch) {
      var vertical = S.el("p", "chara__vertical", cast.catch);
      vertical.setAttribute("aria-hidden", "true"); // 本文の .chara__catch と重複するため装飾扱い
      chara.appendChild(vertical);
    }

    // データ面
    var data = S.el("div", "chara__data");

    var classLine = S.el("p", "chara__class");
    classLine.appendChild(S.el("span", "chara__class-text", cast.rank + " CLASS"));
    data.appendChild(classLine);

    var name = S.el("p", "chara__name");
    if (cast.name_reading) name.appendChild(S.el("span", "kana", cast.name_reading));
    name.appendChild(S.el("span", "kanji", cast.name));
    data.appendChild(name);

    if (cast.catch) data.appendChild(S.el("p", "chara__catch", cast.catch));

    var specs = buildSpecs(cast);
    if (specs) data.appendChild(specs);

    if (cast.tags && cast.tags.length) {
      var tags = S.el("ul", "chara__tags");
      cast.tags.forEach(function (tag) {
        if (tag) tags.appendChild(S.el("li", null, tag));
      });
      data.appendChild(tags);
    }

    if (cast.intro) data.appendChild(S.el("div", "chara__detail", cast.intro));

    var links = S.el("div", "chara__links");
    var xUrl = S.safeUrl(cast.x_url);
    if (xUrl) {
      var xBtn = document.createElement("a");
      xBtn.className = "btn-x";
      xBtn.href = xUrl;
      xBtn.target = "_blank";
      xBtn.rel = "noopener";
      xBtn.textContent = "𝕏 フォローする";
      links.appendChild(xBtn);
    }
    var otherUrl = S.safeUrl(cast.other_url);
    if (otherUrl) {
      var otherBtn = document.createElement("a");
      otherBtn.className = "btn-x";
      otherBtn.href = otherUrl;
      otherBtn.target = "_blank";
      otherBtn.rel = "noopener";
      otherBtn.textContent = "🔗 " + (cast.other_label || "LINK");
      links.appendChild(otherBtn);
    }
    if (links.childNodes.length) data.appendChild(links);

    chara.appendChild(data);
    detailView.appendChild(chara);

    // 紹介動画
    var movie = buildMovie(cast);
    if (movie) detailView.appendChild(movie);

    // アプリ導線: プロフィールURL（ディープリンク）があれば1ボタン、無ければストアバッジ
    var cta = S.el("section", "cta");
    var profileUrl = S.safeUrl(cast.profile_url);
    if (profileUrl) {
      var meet = document.createElement("a");
      meet.className = "btn-meet";
      meet.href = profileUrl;
      meet.target = "_blank";
      meet.rel = "noopener";
      meet.textContent = cast.name + " にアプリで会いに行く";
      cta.appendChild(meet);
      cta.appendChild(S.el("p", "cta__note", "アプリが起動します（未インストールの場合はストアが開きます）"));
    } else {
      cta.appendChild(S.el("p", "cta__text", cast.name + " にアプリで会いに行こう"));
      cta.appendChild(storeBadges());
    }
    detailView.appendChild(cta);
  }

  // ---------- ビュー切り替え ----------
  function showDetail(id, pushHistory) {
    var found = S.findCast(id);
    if (!found) { showList(false); return; }
    var from = !listView.hidden ? listView : (!detailView.hidden ? detailView : null);
    if (from === listView) listScrollY = window.scrollY || 0; // 一覧から来たときだけ記録
    swapViews(from, detailView, function () {
      renderDetail(found.cast, found.index);
      if (castNav) castNav.hidden = false;
      updateCastNav(found.cast.cast_id);
      document.body.classList.add("cast-page");
      document.title = found.cast.name + " | BackStage ランク入りキャスト";
      window.scrollTo(0, 0);
    });
    if (pushHistory) push(id);
  }

  function showList(pushHistory) {
    var from = !detailView.hidden ? detailView : null;
    swapViews(from, listView, function () {
      detailView.textContent = "";
      if (castNav) castNav.hidden = true;
      document.body.classList.remove("cast-page");
      document.title = "ランク入りキャスト | BackStage";
      window.scrollTo(0, listScrollY);
    });
    if (pushHistory) push(null);
  }

  // ブラウザ・端末の「戻る/進む」にも追従（history操作が使える環境のみ）
  window.addEventListener("popstate", function () {
    var id = new URLSearchParams(location.search).get("id");
    if (id != null) showDetail(id, false);
    else showList(false);
  });

  // 起動: 一覧とナビを描画し、?id= 付きなら最初から個別を表示
  // （直開き時は一覧の退場アニメを挟まず即時に個別へ切り替える）
  renderList();
  buildCastNav();
  var initialId = new URLSearchParams(location.search).get("id");
  if (initialId != null && S.findCast(initialId)) {
    listView.hidden = true;
    showDetail(initialId, false);
  }
})();
