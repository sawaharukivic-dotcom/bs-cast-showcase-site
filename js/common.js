// CastShowcase 共通ヘルパー
// 表示は DOM 生成 + textContent で行い、innerHTML にユーザー由来文字列を渡さない（XSS対策）
(function () {
  "use strict";

  var RANKS = ["GOLD", "SILVER", "BRONZE"];
  var RANK_JA = { GOLD: "ゴールド", SILVER: "シルバー", BRONZE: "ブロンズ" };

  function casts() {
    return (window.SHOWCASE && window.SHOWCASE.casts) || [];
  }

  function findCast(id) {
    var list = casts();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].cast_id) === String(id)) return { cast: list[i], index: i };
    }
    return null;
  }

  // 属性値などどうしても文字列連結が必要な場面用（基本は textContent を使うこと）
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 外部リンクとして安全なURLだけを返す（javascript: 等の混入対策）
  function safeUrl(url) {
    var s = String(url == null ? "" : url).trim();
    return /^https:\/\//i.test(s) ? s : "";
  }

  // YouTube動画IDとして安全な文字列だけを返す（埋め込みiframeのsrc組み立て用）
  function safeYouTubeId(id) {
    var s = String(id == null ? "" : id).trim();
    return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : "";
  }

  // el("div", "cast-card__name", "名前") 的な小さなDOMヘルパー
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  window.Showcase = {
    RANKS: RANKS,
    RANK_JA: RANK_JA,
    casts: casts,
    findCast: findCast,
    escapeHtml: escapeHtml,
    safeUrl: safeUrl,
    safeYouTubeId: safeYouTubeId,
    el: el,
  };
})();
