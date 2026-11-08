// The Stargazer bot's status page (stargazer-bot.html).
//
// Reads two small JSON files from this same site, written by AWS Lambdas
// (cloud-homelab, terraform/prod/stargazer-history.tf):
//   data/stargazer/live.json   every 5 minutes while the bot plays
//   data/stargazer/stats.json  each night (Athena over the saved games)
//
// The files are treated as untrusted: opponents' names come from Lichess,
// and a file could be tampered with. Everything is put on the page as
// text (textContent, createElement), never as HTML, and only game ids
// that look like Lichess's become links.
"use strict";

(function () {
  const LIVE = "data/stargazer/live.json";
  const STATS = "data/stargazer/stats.json";
  const REFRESH_MS = 60 * 1000;
  // The monitor checks every 5 minutes; three missed checks means it's
  // outside the bot's hours (or the monitor has stopped).
  const STALE_MS = 15 * 60 * 1000;
  const GAME_ID = /^[A-Za-z0-9]{8}$/;
  const SPEEDS = ["bullet", "blitz", "rapid"];

  const $ = (id) => document.getElementById(id);

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function svg(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attrs || {})) node.setAttribute(name, String(value));
    return node;
  }

  function count(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function percent(share, digits) {
    return (count(share) * 100).toFixed(digits) + "%";
  }

  function word(value) {
    return typeof value === "string" ? value : "";
  }

  function when(iso) {
    const date = new Date(word(iso));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  async function load(path) {
    try {
      const response = await fetch(path, { cache: "no-cache" });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // ---------------------------------------------------------------- right now

  function showLive(live) {
    if (!live || typeof live !== "object") {
      $("now").textContent = "No live data yet.";
      return;
    }
    const checked = new Date(word(live.checked_at));
    const age = Date.now() - checked.getTime();
    const hours = live.hours || {};
    const playing = `It plays every day from ${word(hours.start) || "10:00"}, taking new games until ${word(hours.end) || "21:15"} Central time.`;
    const now = $("now");
    now.className = "now";
    if (Number.isNaN(age) || age > STALE_MS) {
      now.textContent = "Off for the night. " + playing;
      now.classList.add("now-off");
    } else if (live.online === true) {
      now.textContent = "Online: playing, or waiting for its next game.";
      now.classList.add("now-online");
    } else {
      now.textContent = "Not online at the last check. If that lasts, I get an email.";
      now.classList.add("now-offline");
    }
    $("checked").textContent = Number.isNaN(age) ? "" : "Last checked " + when(live.checked_at) + ".";

    const today = live.today || {};
    if (Number.isNaN(age) || age > STALE_MS * 8) {
      $("today").hidden = true;  // yesterday's counters would mislead
    } else {
      $("today-games").textContent = count(today.games);
      $("today-score").textContent = `${count(today.wins)} · ${count(today.draws)} · ${count(today.losses)}`;
      $("today-time").textContent = count(today.time_losses);
      $("today").hidden = false;
    }
    const ratings = today.ratings && typeof today.ratings === "object" ? today.ratings : {};
    const parts = SPEEDS.filter((s) => s in ratings).map((s) => `${s} ${count(ratings[s])}`);
    $("ratings").textContent = parts.length ? "Ratings after today's games: " + parts.join(", ") + "." : "";
  }

  // ---------------------------------------------------------------- SLOs

  function showSlos(slo) {
    const list = $("slos");
    list.replaceChildren();
    if (!slo) {
      list.append(el("li", "No data yet.", "evidence"));
      return;
    }
    const rows = [
      {
        name: "Online when it should be",
        share: slo.online && slo.online.share,
        target: slo.online && slo.online.target,
        good: (share, target) => share >= target,
        targetText: (t) => "target: at least " + percent(t, 0) + " of checks",
        detail: slo.online && `${count(slo.online.online)} of ${count(slo.online.checks)} checks`,
      },
      {
        name: "Games lost on time",
        share: slo.time_losses && slo.time_losses.share,
        target: slo.time_losses && slo.time_losses.target,
        good: (share, target) => share <= target,
        targetText: (t) => "target: at most " + percent(t, 0) + " of games",
        detail: slo.time_losses && `${count(slo.time_losses.lost_on_time)} of ${count(slo.time_losses.games)} games`,
      },
    ];
    for (const row of rows) {
      const item = el("li", null, "slo");
      item.append(el("span", row.name, "slo-name"));
      if (row.share === null || row.share === undefined) {
        item.append(el("span", "no data yet", "slo-value"));
      } else {
        const met = row.good(count(row.share), count(row.target));
        item.append(el("span", percent(row.share, 1), "slo-value " + (met ? "slo-met" : "slo-missed")));
        item.append(el("span", (met ? "met; " : "missed; ") + row.targetText(row.target) + ". " + row.detail + ".", "evidence"));
      }
      list.append(item);
    }
  }

  // ---------------------------------------------------------------- rating chart

  function showRatings(points) {
    const box = $("rating-chart");
    box.replaceChildren();
    const rows = (Array.isArray(points) ? points : [])
      .filter((p) => p && SPEEDS.includes(p.speed) && /^\d{4}-\d{2}-\d{2}$/.test(word(p.day)) && Number.isFinite(Number(p.rating)));
    if (rows.length < 2) {
      box.append(el("p", "Not enough days yet to draw a line.", "evidence"));
      return;
    }
    const days = [...new Set(rows.map((p) => p.day))].sort();
    const ratings = rows.map((p) => Number(p.rating));
    const lo = Math.floor((Math.min(...ratings) - 20) / 50) * 50;
    const hi = Math.ceil((Math.max(...ratings) + 20) / 50) * 50;
    const W = 640, H = 240, left = 48, right = 16, top = 12, bottom = 28;
    const x = (day) => left + (days.length === 1 ? 0 : (days.indexOf(day) / (days.length - 1)) * (W - left - right));
    const y = (r) => top + (1 - (r - lo) / (hi - lo)) * (H - top - bottom);

    const chart = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", class: "rating-svg" });
    const speedsShown = SPEEDS.filter((s) => rows.some((p) => p.speed === s));
    chart.setAttribute("aria-label", "Rating at the end of each day, " + speedsShown.join(", "));

    const step = (hi - lo) > 300 ? 100 : 50;
    for (let r = lo; r <= hi; r += step) {
      chart.append(svg("line", { x1: left, x2: W - right, y1: y(r), y2: y(r), class: "grid" }));
      const label = svg("text", { x: left - 6, y: y(r) + 4, "text-anchor": "end", class: "axis" });
      label.textContent = String(r);
      chart.append(label);
    }
    for (const [day, anchor] of [[days[0], "start"], [days[days.length - 1], "end"]]) {
      const label = svg("text", { x: x(day), y: H - 8, "text-anchor": anchor, class: "axis" });
      label.textContent = day;
      chart.append(label);
    }
    for (const speed of speedsShown) {
      const series = rows.filter((p) => p.speed === speed).sort((a, b) => (a.day < b.day ? -1 : 1));
      const path = series.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(Number(p.rating)).toFixed(1)}`).join("");
      chart.append(svg("path", { d: path, class: "series series-" + speed }));
      const last = series[series.length - 1];
      chart.append(svg("circle", { cx: x(last.day), cy: y(Number(last.rating)), r: 3.5, class: "dot series-" + speed }));
    }
    box.append(chart);

    const legend = el("ul", null, "legend");
    for (const speed of speedsShown) {
      const series = rows.filter((p) => p.speed === speed);
      const latest = series.reduce((a, b) => (a.day > b.day ? a : b));
      const item = el("li", null, "legend-" + speed);
      item.append(el("span", "", "swatch"));
      item.append(document.createTextNode(`${speed}: ${count(latest.rating)}`));
      legend.append(item);
    }
    box.append(legend);
  }

  // ---------------------------------------------------------------- tables and games

  function fillTable(id, rows, cells) {
    const body = $(id).querySelector("tbody");
    body.replaceChildren();
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      const tr = el("tr");
      const td = el("td", "No data yet.", "evidence");
      td.colSpan = $(id).querySelectorAll("th").length;
      tr.append(td);
      body.append(tr);
      return;
    }
    for (const row of list) {
      const tr = el("tr");
      for (const value of cells(row)) tr.append(el("td", value));
      body.append(tr);
    }
  }

  function showGames(games) {
    const list = $("recent");
    list.replaceChildren();
    const rows = Array.isArray(games) ? games : [];
    if (!rows.length) {
      list.append(el("li", "No games yet.", "evidence"));
      return;
    }
    for (const g of rows) {
      const item = el("li", null, "game result-" + (["win", "draw", "loss"].includes(g.result) ? g.result : "unknown"));
      const result = { win: "Won", draw: "Drew", loss: "Lost" }[g.result] || "Played";
      const opponent = `${word(g.opponent) || "?"}${g.opponent_rating ? " (" + count(g.opponent_rating) + ")" : ""}`;
      const text = `${result} with ${word(g.colour) || "?"} against ${opponent}, ${word(g.speed)}`;
      if (GAME_ID.test(word(g.id))) {
        const link = el("a", text);
        link.href = "https://lichess.org/" + g.id;
        link.rel = "noopener";
        item.append(link);
      } else {
        item.append(document.createTextNode(text));
      }
      const extra = [word(g.opening), word(g.status) && "by " + word(g.status), when(g.ended_at)].filter(Boolean);
      if (extra.length) item.append(el("span", " · " + extra.join(" · "), "evidence"));
      list.append(item);
    }
  }

  function showStats(stats) {
    if (!stats || typeof stats !== "object") {
      showSlos(null);
      showRatings([]);
      fillTable("by-speed", [], () => []);
      fillTable("openings", [], () => []);
      showGames([]);
      return;
    }
    showSlos(stats.slo);
    showRatings(stats.rating_by_day);
    const t = stats.totals || {};
    $("totals").textContent = count(t.games)
      ? `${count(t.games)} games since ${word(t.first_day) || "it started"}: ${count(t.wins)} won, ${count(t.draws)} drawn, ${count(t.losses)} lost.`
      : "";
    fillTable("by-speed", stats.by_speed, (r) => [word(r.speed), word(r.colour), count(r.games), count(r.wins), count(r.draws), count(r.losses)]);
    fillTable("openings", stats.top_openings, (r) => [word(r.opening), count(r.games), count(r.wins), count(r.draws), count(r.losses)]);
    showGames(stats.recent_games);
    $("generated").textContent = stats.generated_at ? "Stats last worked out " + when(stats.generated_at) + "." : "";
  }

  async function refreshLive() {
    showLive(await load(LIVE));
  }

  async function start() {
    const [live, stats] = await Promise.all([load(LIVE), load(STATS)]);
    showLive(live);
    showStats(stats);
    setInterval(() => {
      if (!document.hidden) refreshLive();
    }, REFRESH_MS);
  }

  start();
})();
