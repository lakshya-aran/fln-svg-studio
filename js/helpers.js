/* FLN SVG Studio — drawing helpers.
 * These are the same building blocks used to draw the FLN SVG library:
 * every helper returns a piece of SVG markup (a string) or path data.
 * Canvas is 512 x 512. Default style: white fill, #1A1A1A stroke 8px, round caps/joins.
 */
(function (global) {
  "use strict";
  const K = "#1A1A1A", W = "#FFFFFF";
  const n1 = (v) => (Math.round(v * 10) / 10).toString();

  /** Point on a circle: centre (cx,cy), radius r, angle a in degrees. Returns [x, y]. */
  function P(cx, cy, r, a) { const t = a * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }
  /** Format a point as "x y". */
  function f2(p) { return n1(p[0]) + " " + n1(p[1]); }

  /** Wrap a drawing body into a complete, style-compliant SVG file. */
  function svg(title, desc, body) {
    const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<title>${esc(title)}</title>
<desc>${esc(desc)}</desc>
<g fill="#FFFFFF" stroke="${K}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
${String(body).trim()}
</g>
</svg>
`;
  }

  /** Detail line (no fill). d = path data, w = stroke width (5 inner details, 3.5 fine details). */
  function det(d, w = 5) { return `<path d="${d}" fill="none" stroke-width="${w}"/>`; }
  /** Solid black dot. */
  function dot(cx, cy, r) { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${K}" stroke-width="2"/>`; }
  /** Cartoon eye: black dot with a white glint. */
  function eye(cx, cy, r = 7) {
    return dot(cx, cy, r) + `<circle cx="${n1(cx + r * 0.35)}" cy="${n1(cy - r * 0.35)}" r="${n1(r * 0.35)}" fill="${W}" stroke="none"/>`;
  }
  /** Outlined tubes (necks, tentacles, wires, handles). ds = array of path data, w = inner width. */
  function tubes(ds, w) {
    const a = ds.map((d) => `<path d="${d}" fill="none" stroke-width="${w + 12}"/>`).join("");
    const b = ds.map((d) => `<path d="${d}" fill="none" stroke="${W}" stroke-width="${w}"/>`).join("");
    return a + b;
  }
  /** Tiny round specks (seeds, texture). pts = [[x,y], ...]. */
  function specks(pts, w = 6) { return det(pts.map(([x, y]) => `M${x} ${y} l1 1`).join(" "), w); }
  /** Row of scallops (feathers, wavy edges) from (x0,y0) to (x1,y1). */
  function scallops(x0, y0, x1, y1, n, depth = 8, w = 3.5) {
    const dx = (x1 - x0) / n, dy = (y1 - y0) / n, L = Math.hypot(dx, dy);
    const nx = -dy / L * depth, ny = dx / L * depth;
    let d = `M${n1(x0)} ${n1(y0)} `;
    for (let i = 0; i < n; i++) {
      const ax = x0 + dx * i, ay = y0 + dy * i;
      d += `Q${n1(ax + dx / 2 + nx)} ${n1(ay + dy / 2 + ny)} ${n1(ax + dx)} ${n1(ay + dy)} `;
    }
    return det(d, w);
  }
  /** Cloud / bumpy outline path data (clouds, wool, broccoli, popcorn, manes). */
  function bumpy(cx, cy, rx, ry, n, k = 0.6, start = -90) {
    const pts = [];
    for (let i = 0; i < n; i++) { const t = (start + 360 * i / n) * Math.PI / 180; pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
    let d = `M${f2(pts[0])} `;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], r = Math.hypot(b[0] - a[0], b[1] - a[1]) * k;
      d += `A${n1(r)} ${n1(r)} 0 0 1 ${f2(b)} `;
    }
    return d + "Z";
  }
  /** Water drop (tip up). */
  function drop(x, y, s = 1, w = 5) {
    const f = (v) => n1(v);
    return `<path d="M${x} ${f(y - 22 * s)} C${f(x + 14 * s)} ${f(y - 4 * s)} ${f(x + 16 * s)} ${f(y + 6 * s)} ${f(x + 16 * s)} ${f(y + 10 * s)} C${f(x + 16 * s)} ${f(y + 20 * s)} ${f(x + 8 * s)} ${f(y + 26 * s)} ${x} ${f(y + 26 * s)} C${f(x - 8 * s)} ${f(y + 26 * s)} ${f(x - 16 * s)} ${f(y + 20 * s)} ${f(x - 16 * s)} ${f(y + 10 * s)} C${f(x - 16 * s)} ${f(y + 6 * s)} ${f(x - 14 * s)} ${f(y - 4 * s)} ${x} ${f(y - 22 * s)} Z" stroke-width="${w}"/>`;
  }
  /** Seeded random generator so blobs look the same every time. */
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0 || 1;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** Irregular rounded patch path data (giraffe spots, stones, chocolate chips). */
  function blob(cx, cy, r, n = 6, seed = 0, squash = 1) {
    const R = rng(seed + 1), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i * 360 / n + (R() * 28 - 14)) * Math.PI / 180, rr = r * (0.78 + R() * 0.3);
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a) * squash]);
    }
    const mids = pts.map((p, i) => { const q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; });
    let d = `M${f2(mids[n - 1])} `;
    for (let i = 0; i < n; i++) d += `Q${f2(pts[i])} ${f2(mids[i])} `;
    return d + "Z";
  }
  /** Polygon path data from points. */
  function poly(pts, close = true) { return "M" + pts.map(f2).join(" L") + (close ? " Z" : ""); }
  /** Regular polygon path data (n sides). */
  function ngon(cx, cy, r, n, rot = -90) { const p = []; for (let i = 0; i < n; i++) p.push(P(cx, cy, r, rot + i * 360 / n)); return poly(p); }
  /** Star path data. */
  function star(cx, cy, ro, ri, n = 5, rot = -90) { const p = []; for (let i = 0; i < 2 * n; i++) p.push(P(cx, cy, i % 2 ? ri : ro, rot + i * 180 / n)); return poly(p); }
  /** Spiral path data (jalebi, snail shell, hose reel). */
  function spiral(cx, cy, r0, r1, turns, n = 160, ph = 0) {
    const p = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = ph + t * turns * 2 * Math.PI, r = r0 + (r1 - r0) * t; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return "M" + p.map(f2).join(" L");
  }
  /** 3D box (cube/blocks): front square at (x,y) size s, depth d, height h. */
  function box(x, y, s, d, h) {
    h = h || s;
    return `<path d="${poly([[x, y], [x + s, y], [x + s + d, y - d], [x + d, y - d]])}"/>` +
      `<path d="${poly([[x + s, y], [x + s + d, y - d], [x + s + d, y + h - d], [x + s, y + h]])}"/>` +
      `<rect x="${x}" y="${y}" width="${s}" height="${h}"/>`;
  }
  /** Tapered leg with a knobbly knee (camel, giraffe). */
  function leg(x, top, bot, w = 24, knee) {
    const k = knee || (top + bot) / 2, t = w * 0.45;
    return `<path d="M${n1(x - t)} ${top} C${n1(x - t + 2)} ${top + 30} ${x + 2} ${k - 30} ${x + 3} ${k - 12} C${x - 1} ${k - 6} ${x - 1} ${k + 6} ${x + 3} ${k + 12} L${x + 4} ${bot} H${x + w - 4} L${x + w - 3} ${k + 12} C${x + w + 1} ${k + 6} ${x + w + 1} ${k - 6} ${x + w - 3} ${k - 12} C${x + w - 2} ${k - 30} ${n1(x + w + t - 2)} ${top + 30} ${n1(x + w + t)} ${top} Z"/>`;
  }

  /* Hand-drawn digits and letters (stroke paths in a 28 x 40 box). */
  const DIG = {
    "0": "M14 0 C26 0 28 14 28 20 C28 26 26 40 14 40 C2 40 0 26 0 20 C0 14 2 0 14 0 Z",
    "1": "M4 8 L14 0 V40", "2": "M2 8 C4 -2 26 -2 26 10 C26 22 2 30 2 40 H28",
    "3": "M2 4 C12 -4 28 4 16 18 C32 20 28 44 2 36", "4": "M20 40 V0 L0 28 H28",
    "5": "M26 0 H4 L2 18 C14 12 28 18 26 28 C24 40 8 42 0 36",
    "6": "M24 2 C10 -2 0 10 0 24 C0 36 8 40 14 40 C22 40 28 34 28 26 C28 18 22 14 14 14 C8 14 2 18 0 24",
    "7": "M0 0 H28 L10 40", "8": "M14 0 C26 0 26 18 14 18 C2 18 2 0 14 0 Z M14 18 C28 18 28 40 14 40 C0 40 0 18 14 18 Z",
    "9": "M28 16 C26 22 20 26 14 26 C6 26 0 20 0 13 C0 6 6 0 14 0 C22 0 28 6 28 16 C28 30 22 40 6 40"
  };
  const LET = {
    A: "M0 40 L14 0 L28 40 M6 26 H22", B: "M0 0 V40 H17 C31 40 31 20 17 20 H0 M0 0 H15 C27 0 27 20 15 20",
    C: "M28 6 C20 -2 0 -2 0 20 C0 42 20 42 28 34", E: "M26 0 H0 V40 H26 M0 20 H20",
    G: "M28 6 C20 -2 0 -2 0 20 C0 42 20 42 28 34 V22 H16", H: "M0 0 V40 M28 0 V40 M0 20 H28",
    L: "M0 0 V40 H24", O: "M14 0 C28 0 28 40 14 40 C0 40 0 0 14 0 Z", P: "M0 40 V0 H16 C30 0 30 20 16 20 H0",
    R: "M0 40 V0 H18 C30 0 30 20 18 20 H0 M16 20 L28 40", S: "M27 6 C20 -1 2 -1 2 10 C2 22 26 18 26 30 C26 42 6 42 1 34",
    U: "M0 0 V26 C0 44 28 44 28 26 V0"
  };
  /** One digit centred at (cx,cy), scale s (1 = 28 x 40). */
  function digit(ch, cx, cy, s = 1, sw = 5) {
    return `<path d="${DIG[ch]}" transform="translate(${n1(cx - 14 * s)} ${n1(cy - 20 * s)}) scale(${s})" fill="none" stroke-width="${n1(sw / s)}"/>`;
  }
  /** A whole number centred at (cx,cy). */
  function num(n, cx, cy, s = 1, sw = 5) {
    const t = String(n), w = 34 * s;
    return [...t].map((ch, i) => digit(ch, cx - (t.length - 1) * w / 2 + i * w, cy, s, sw)).join("");
  }
  /** A word in capital letters starting at (x,y) (letters available: A B C E G H L O P R S U). */
  function word(w, x, y, s = 1, sw = 6, gap = 40) {
    return [...w].map((ch, i) => ch === " " || !LET[ch] ? "" :
      `<path d="${LET[ch]}" transform="translate(${n1(x + i * gap * s)} ${y}) scale(${s})" fill="none" stroke-width="${n1(sw / s)}"/>`).join("");
  }
  /** Rupee symbol centred at (cx,cy). */
  function rupee(cx, cy, s = 1, sw = 5) {
    return `<path d="M0 2 H28 M0 14 H28 M5 2 C30 2 30 27 5 27 H1 L25 48" transform="translate(${n1(cx - 14 * s)} ${n1(cy - 24 * s)}) scale(${s})" fill="none" stroke-width="${n1(sw / s)}"/>`;
  }
  /** Dashed line style for hidden edges of 3D shapes. */
  const DASH = 'stroke-dasharray="14 12"';

  const API = { K, W, P, f2, svg, det, dot, eye, tubes, specks, scallops, bumpy, drop, blob, poly, ngon, star, spiral, box, leg, digit, num, word, rupee, DASH, DIG, LET, rng };

  /** Reference shown in the app's Help panel. */
  API.DOCS = [
    ["det(d, w=5)", "Detail line with no fill. Use 5 for inner details, 3.5 for fine ones."],
    ["dot(cx, cy, r)", "Small solid black dot (nostrils, seeds, pupils)."],
    ["eye(cx, cy, r=7)", "Cartoon eye: black dot with a white glint."],
    ["tubes([d1, d2], w)", "Outlined tube along each path: necks, tentacles, wires, handles."],
    ["specks([[x,y], ...], w=6)", "Tiny round specks for texture and seeds."],
    ["scallops(x0, y0, x1, y1, n, depth=8)", "Row of bumps: feathers, wavy edges."],
    ["bumpy(cx, cy, rx, ry, n, k=0.6)", "Path data for a cloud-like outline (clouds, wool, broccoli). Use in <path d=\"${...}\"/>."],
    ["blob(cx, cy, r, n=6, seed=0)", "Path data for an irregular rounded patch (spots, stones, chips)."],
    ["drop(x, y, s=1)", "Water drop."],
    ["poly([[x,y], ...])", "Path data for a polygon."],
    ["ngon(cx, cy, r, n)", "Path data for a regular polygon (hexagon = 6, octagon = 8)."],
    ["star(cx, cy, ro, ri, n=5)", "Path data for a star."],
    ["spiral(cx, cy, r0, r1, turns)", "Path data for a spiral (use with tubes or det)."],
    ["box(x, y, size, depth)", "3D box / cube with top and side faces."],
    ["leg(x, top, bottom, w=24, knee)", "Tapered animal leg with a knee."],
    ["digit('7', cx, cy, s=1)", "Hand-drawn digit. num(25, cx, cy, s) draws a whole number."],
    ["word('GLUE', x, y, s=1)", "Capital letters A B C E G H L O P R S U."],
    ["rupee(cx, cy, s=1)", "₹ symbol."],
    ["P(cx, cy, r, angle)", "Point on a circle → [x, y]. f2(point) → \"x y\" for path data."],
    ["gen(family, params, seed)", "Build a whole drawing from a recipe, e.g. gen(\"fruit\", {shape: \"apple\", top: \"stem-leaf\"}) or gen(\"face\", {animal: \"cat\"}). Families: fruit, slice, face, vehicle, flower, tree, container, shape, sky, feeling, building, ball, counting."],
    ["DASH", "Attribute for dashed hidden edges: <path ... ${DASH}/>"],
    ["K / W", "The two allowed colours: black #1A1A1A and white #FFFFFF."]
  ];

  global.FLN = API;
})(window);
