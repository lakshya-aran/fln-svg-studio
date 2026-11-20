/* FLN SVG Studio — rule-based drawing generator (no AI, no server).
 *
 * How it works
 *   FAMILIES  are small drawing programs with parameters (a round fruit, an animal face, a vehicle ...).
 *   CATALOG   maps object names (and aliases, Hindi names) to a family + parameters.
 *   make(q)   reads what the user typed ("orange", "5 apples", "clock 3:30", "letter B"),
 *             finds the recipe and returns ready SVGs in the FLN style.
 *
 * Every drawing uses the same helpers as the hand-made library (window.FLN), so the
 * output follows the same rules: white fill, #1A1A1A lines, 8 / 5 / 3.5 widths, rounded ends.
 * To teach the generator a new object, add one line to CATALOG (or a new family below).
 */
(function (global) {
  "use strict";
  const F = global.FLN;
  const { K, W, P, f2, det, dot, eye, tubes, bumpy, blob, poly, ngon, star, num, DASH, rng } = F;
  const n1 = (v) => (Math.round(v * 10) / 10).toString();
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- extra glyphs so every capital letter works ---------- */
  Object.assign(F.LET, {
    D: "M0 0 V40 H12 C34 40 34 0 12 0 Z", F: "M26 0 H0 V40 M0 20 H20", I: "M14 0 V40 M4 0 H24 M4 40 H24",
    J: "M6 0 H26 M20 0 V30 C20 44 2 44 0 32", K: "M0 0 V40 M26 0 L0 24 M8 18 L28 40", M: "M0 40 V0 L14 24 L28 0 V40",
    N: "M0 40 V0 L28 40 V0", Q: "M14 0 C28 0 28 40 14 40 C0 40 0 0 14 0 Z M18 30 L30 44", T: "M0 0 H28 M14 0 V40",
    V: "M0 0 L14 40 L28 0", W: "M0 0 L7 40 L14 14 L21 40 L28 0", X: "M0 0 L28 40 M28 0 L0 40",
    Y: "M0 0 L14 20 L28 0 M14 20 V40", Z: "M0 0 H28 L0 40 H28"
  });

  /* ---------- small geometry helpers ---------- */
  /** Smooth closed/open curve through points (Catmull-Rom → Bézier). */
  function smooth(pts, closed = true, t = 0.5) {
    const n = pts.length, g = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f2(pts[0])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3];
      const c2 = [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
      d += ` C${f2(c1)} ${f2(c2)} ${f2(p2)}`;
    }
    return d + (closed ? " Z" : "");
  }
  /** Narrow pointed leaf from (x,y) towards angle a (degrees). */
  function leafAt(x, y, a, len, wd = 0.34, sw = 5) {
    const tip = P(x, y, len, a), off = Math.atan(wd) * 180 / Math.PI;
    const c1 = P(x, y, len * 0.55, a - off), c2 = P(x, y, len * 0.55, a + off);
    return `<path d="M${n1(x)} ${n1(y)} Q${f2(c1)} ${f2(tip)} Q${f2(c2)} ${n1(x)} ${n1(y)} Z" stroke-width="${sw}"/>` +
      det(`M${n1(x)} ${n1(y)} L${f2(P(x, y, len * 0.72, a))}`, 3.5);
  }
  /** Texture dots scattered inside an ellipse. */
  function dimples(cx, cy, rx, ry, n, seed) {
    const r = rng(seed); let d = "";
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, k = Math.sqrt(r()) * 0.82;
      d += `M${n1(cx + Math.cos(a) * rx * k)} ${n1(cy + Math.sin(a) * ry * k)} l1 1 `;
    }
    return det(d, 5);
  }
  /** Scale stroke widths so a drawing stays bold when shrunk (used for "5 apples"). */
  function shrink(body, s) {
    const fix = (w) => n1(Math.max(2.5, parseFloat(w) * 0.8 / s));
    return `<g transform="scale(${s})" stroke-width="${fix(8)}">` + body.replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${fix(w)}"`) + `</g>`;
  }

  /* =====================================================================
     FAMILIES — each returns the drawing body (shapes only).
     ===================================================================== */
  const FAM = {};

  /* ---------- round fruits & vegetables ---------- */
  FAM.fruit = {
    name: "Round fruit / vegetable",
    params: { shape: ["round", "apple", "wide", "tall", "lemon", "pear", "drop", "root"], texture: ["none", "dimples", "stripes", "ridges", "speckles", "cleft"],
      top: ["stem-leaf", "stem", "calyx", "crown", "leafy", "sprout", "none"], cut: [false, true] },
    build(p, seed) {
      const r = rng(seed), cx = 256, cy = 290;
      const S = {
        round: [176, 170, 8], apple: [176, 164, 26], wide: [200, 150, 16], tall: [150, 186, 10], lemon: [196, 136, 0], pear: [0, 0, 0], drop: [0, 0, 0]
      }[p.shape] || [176, 170, 8];
      let [rx, ry, dip] = S, body, topY;
      if (p.shape === "pear") {
        body = smooth([[256, 92], [300, 112], [318, 190], [380, 280], [400, 370], [340, 452], [256, 466], [172, 452], [112, 370], [132, 280], [194, 190], [212, 112]]);
        topY = 92; rx = 140; ry = 180;
      } else if (p.shape === "root") {
        body = `M256 118 C340 118 410 180 410 270 C410 350 330 400 290 430 C276 442 264 462 256 490 C248 462 236 442 222 430 C182 400 102 350 102 270 C102 180 172 118 256 118 Z`;
        topY = 118; rx = 154; ry = 160;
      } else if (p.shape === "drop") {
        body = `M256 70 C290 150 420 210 420 320 C420 410 340 462 256 462 C172 462 92 410 92 320 C92 210 222 150 256 70 Z`;
        topY = 70; rx = 160; ry = 190;
      } else if (p.shape === "lemon") {
        body = `M${cx - rx - 26} ${cy} C${cx - rx} ${cy - 12} ${cx - rx + 20} ${cy - ry} ${cx} ${cy - ry} C${cx + rx - 20} ${cy - ry} ${cx + rx} ${cy - 12} ${cx + rx + 26} ${cy} ` +
          `C${cx + rx} ${cy + 12} ${cx + rx - 20} ${cy + ry} ${cx} ${cy + ry} C${cx - rx + 20} ${cy + ry} ${cx - rx} ${cy + 12} ${cx - rx - 26} ${cy} Z`;
        topY = cy - ry;
      } else {
        const t = cy - ry;
        body = `M${cx} ${t + dip} C${cx + rx * 0.3} ${t - dip * 0.4} ${cx + rx} ${t + ry * 0.12} ${cx + rx} ${cy} ` +
          `C${cx + rx} ${cy + ry * 0.72} ${cx + rx * 0.52} ${cy + ry} ${cx + rx * 0.14} ${cy + ry - dip * 0.25} C${cx + rx * 0.05} ${cy + ry - dip * 0.35} ${cx - rx * 0.05} ${cy + ry - dip * 0.35} ${cx - rx * 0.14} ${cy + ry - dip * 0.25} ` +
          `C${cx - rx * 0.52} ${cy + ry} ${cx - rx} ${cy + ry * 0.72} ${cx - rx} ${cy} C${cx - rx} ${cy + -ry * 0.88} ${cx - rx * 0.3} ${t - dip * 0.4} ${cx} ${t + dip} Z`;
        topY = t + dip;
      }
      const out = [];
      // top parts that sit behind the body
      if (p.top === "leafy") {
        for (const a of [-120, -100, -80, -60]) out.push(leafAt(256, topY + 20, a + (r() - 0.5) * 10, 120, 0.3));
      }
      if (p.top === "stem" || p.top === "stem-leaf") out.push(tubes([`M256 ${topY + 6} C258 ${topY - 20} 264 ${topY - 40} 276 ${topY - 56}`], 12));
      if (p.top === "sprout") out.push(tubes([`M256 ${topY + 10} C252 ${topY - 20} 244 ${topY - 40} 230 ${topY - 56}`, `M258 ${topY + 10} C264 ${topY - 24} 274 ${topY - 44} 290 ${topY - 52}`], 8));
      if (p.shape === "drop" || p.shape === "root") out.push(det(p.shape === "drop" ? "M236 468 L222 492 M250 470 L246 496 M262 470 L268 496 M276 468 L290 492" : "M256 488 L254 504", 4));
      out.push(`<path d="${body}"/>`);
      // texture
      if (p.texture === "dimples") out.push(dimples(cx, cy, rx * 0.9, ry * 0.9, 26, seed));
      if (p.texture === "speckles") out.push(dimples(cx, cy + 20, rx * 0.85, ry * 0.85, 18, seed + 3));
      if (p.texture === "stripes" || p.texture === "ridges") {
        const lines = [];
        for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) {
          const x = cx + k * rx;
          if (p.texture === "stripes") {
            const pts = [];
            for (let i = 0; i <= 10; i++) { const y = cy - ry * 0.92 + i * ry * 1.84 / 10, yy = (y - cy) / ry; pts.push([x * 1 + k * rx * 0.25 * (1 - yy * yy) * 0 + (i % 2 ? 9 : -9) + k * (Math.sqrt(Math.max(0, 1 - yy * yy)) - 1) * rx * 0.35, y]); }
            lines.push(smooth(pts, false, 0.7));
          } else lines.push(`M${cx + k * 20} ${topY + 10} C${n1(cx + k * rx * 1.35)} ${cy - ry * 0.5} ${n1(cx + k * rx * 1.35)} ${cy + ry * 0.6} ${cx + k * 20} ${cy + ry - 8}`);
        }
        out.push(det(lines.join(" "), p.texture === "stripes" ? 6 : 5));
      }
      if (p.texture === "cleft") out.push(det(`M${cx + 6} ${topY + 6} C${cx + rx * 0.5} ${cy - ry * 0.3} ${cx + rx * 0.45} ${cy + ry * 0.5} ${cx + rx * 0.1} ${cy + ry * 0.9}`, 5));
      // top parts in front
      if (p.top === "stem-leaf") out.push(`<path d="M270 ${topY - 30} C300 ${topY - 80} 360 ${topY - 84} 392 ${topY - 62} C360 ${topY - 20} 300 ${topY - 14} 270 ${topY - 30} Z"/>` + det(`M276 ${topY - 32} C310 ${topY - 50} 346 ${topY - 60} 380 ${topY - 62}`, 4));
      if (p.top === "calyx") out.push(`<path d="${star(256, topY + 4, 64, 20, 6, -90)}" stroke-width="5"/>` + tubes([`M256 ${topY} V${topY - 30}`], 8));
      if (p.top === "crown") {
        const xs = [214, 228, 242, 256, 270, 284, 298]; let d = `M206 ${topY + 18} L206 ${topY - 10}`;
        xs.forEach((x, i) => { d += ` L${x + 7} ${topY - (i % 2 ? 10 : 34)}`; });
        out.push(`<path d="${d} L306 ${topY - 10} L306 ${topY + 18} Z"/>`);
      }
      // shine
      if (p.texture !== "stripes") out.push(det(`M${n1(cx - rx * 0.62)} ${n1(cy - ry * 0.18)} C${n1(cx - rx * 0.58)} ${n1(cy - ry * 0.5)} ${n1(cx - rx * 0.36)} ${n1(cy - ry * 0.7)} ${n1(cx - rx * 0.12)} ${n1(cy - ry * 0.76)}`, 6));
      return out.join("\n");
    }
  };

  /* ---------- fruit cut in half ---------- */
  FAM.slice = {
    name: "Fruit cut in half",
    params: { inside: ["segments", "seeds-ring", "seeds-star", "pit", "rings"] },
    build(p, seed) {
      const cx = 256, cy = 260, R = 196, out = [`<circle cx="${cx}" cy="${cy}" r="${R}"/>`, `<circle cx="${cx}" cy="${cy}" r="${R - 20}" stroke-width="5"/>`];
      if (p.inside === "segments") {
        for (let i = 0; i < 10; i++) {
          const a = i * 36 - 90, a1 = a + 3, a2 = a + 33;
          out.push(`<path d="M${f2(P(cx, cy, 22, a + 18))} L${f2(P(cx, cy, R - 34, a1))} A${R - 34} ${R - 34} 0 0 1 ${f2(P(cx, cy, R - 34, a2))} Z" stroke-width="5"/>`);
        }
        out.push(`<circle cx="${cx}" cy="${cy}" r="16" stroke-width="5"/>`);
      } else if (p.inside === "seeds-ring") {
        out.push(`<circle cx="${cx}" cy="${cy}" r="62" stroke-width="5"/>`);
        for (let i = 0; i < 18; i++) { const [x, y] = P(cx, cy, 88, i * 20); out.push(`<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="9" ry="5" transform="rotate(${i * 20} ${n1(x)} ${n1(y)})" fill="${K}" stroke-width="2"/>`); }
        out.push(det(Array.from({ length: 24 }, (_, i) => `M${f2(P(cx, cy, 66, i * 15))} L${f2(P(cx, cy, R - 30, i * 15))}`).join(" "), 3));
      } else if (p.inside === "seeds-star") {
        out.push(`<path d="${star(cx, cy, 96, 34, 5)}" stroke-width="5"/>`);
        for (let i = 0; i < 5; i++) { const [x, y] = P(cx, cy, 52, -90 + i * 72); out.push(`<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="8" ry="14" transform="rotate(${i * 72} ${n1(x)} ${n1(y)})" fill="${K}" stroke-width="2"/>`); }
      } else if (p.inside === "pit") {
        out.push(`<ellipse cx="${cx}" cy="${cy}" rx="78" ry="98"/>` + det(`M${cx} ${cy - 80} C${cx - 20} ${cy - 30} ${cx + 20} ${cy + 30} ${cx} ${cy + 80}`, 4));
      } else {
        for (const k of [0.75, 0.5, 0.25]) out.push(`<circle cx="${cx}" cy="${cy}" r="${n1(R * k)}" stroke-width="5"/>`);
      }
      return out.join("\n");
    }
  };

  /* ---------- animal faces (front view) ---------- */
  FAM.face = {
    name: "Animal face",
    params: { animal: ["cat", "dog", "rabbit", "mouse", "bear", "panda", "lion", "tiger", "pig", "cow", "monkey", "fox", "elephant", "sheep", "frog", "owl"] },
    build(p) {
      const a = p.animal, cx = 256, cy = 290, out = [];
      const R = { frog: 170, owl: 160, sheep: 130, cow: 140, elephant: 128, mouse: 130, rabbit: 140 }[a] || 150;
      const headTop = cy - R;
      const earTri = (side, len = 1.6, inner = true) => {
        const ang = side < 0 ? -128 : -52, b1 = P(cx, cy, R - 6, ang - 20), b2 = P(cx, cy, R - 6, ang + 20), tip = P(cx, cy, R * len, ang);
        let s = `<path d="${poly([b1, tip, b2])}"/>`;
        if (inner) s += `<path d="${poly([P(cx, cy, R, ang - 11), P(cx, cy, R * (len - 0.18), ang), P(cx, cy, R, ang + 11)])}" stroke-width="5"/>`;
        return s;
      };
      const earRound = (side, r, ang = side < 0 ? -130 : -50, fill = W, d = 0.98) => {
        const [x, y] = P(cx, cy, R * d, ang);
        return `<circle cx="${n1(x)}" cy="${n1(y)}" r="${r}" fill="${fill}"/>` + (fill === W ? `<circle cx="${n1(x)}" cy="${n1(y)}" r="${r * 0.55}" stroke-width="5"/>` : "");
      };
      const whiskers = (y) => det(`M${cx - 60} ${y} L${cx - 150} ${y - 16} M${cx - 60} ${y + 12} L${cx - 152} ${y + 14} M${cx - 58} ${y + 24} L${cx - 140} ${y + 44} ` +
        `M${cx + 60} ${y} L${cx + 150} ${y - 16} M${cx + 60} ${y + 12} L${cx + 152} ${y + 14} M${cx + 58} ${y + 24} L${cx + 140} ${y + 44}`, 4);
      const eyes = (dx = 56, y = cy - 26, r = 14) => eye(cx - dx, y, r) + eye(cx + dx, y, r);
      const smile = (y, w = 26) => det(`M${cx} ${y - 8} V${y} M${cx - w} ${y} C${cx - w} ${y + 22} ${cx} ${y + 22} ${cx} ${y} C${cx} ${y + 22} ${cx + w} ${y + 22} ${cx + w} ${y}`, 5);
      const noseTri = (y, s = 16) => `<path d="M${cx - s} ${y - 8} H${cx + s} L${cx} ${y + 10} Z" fill="${K}" stroke-width="4"/>`;
      const head = (d) => `<path d="${d || `M${cx} ${headTop} C${cx + R * 0.58} ${headTop} ${cx + R} ${cy - R * 0.5} ${cx + R} ${cy} C${cx + R} ${cy + R * 0.6} ${cx + R * 0.55} ${cy + R} ${cx} ${cy + R} C${cx - R * 0.55} ${cy + R} ${cx - R} ${cy + R * 0.6} ${cx - R} ${cy} C${cx - R} ${cy - R * 0.5} ${cx - R * 0.58} ${headTop} ${cx} ${headTop} Z`}"/>`;

      switch (a) {
        case "cat": out.push(earTri(-1, 1.55), earTri(1, 1.55), head(), eyes(58, cy - 20, 15), noseTri(cy + 40, 14), smile(cy + 52), whiskers(cy + 40)); break;
        case "fox": out.push(earTri(-1, 1.7), earTri(1, 1.7),
          `<path d="M${cx} ${cy + R} L${cx - 60} ${cy + 70} C${cx - 120} ${cy + 60} ${cx - R - 20} ${cy + 40} ${cx - R - 30} ${cy + 20} C${cx - R} ${cy - 20} ${cx - R + 10} ${cy - 100} ${cx} ${headTop} C${cx + R - 10} ${cy - 100} ${cx + R} ${cy - 20} ${cx + R + 30} ${cy + 20} C${cx + R + 20} ${cy + 40} ${cx + 120} ${cy + 60} ${cx + 60} ${cy + 70} Z"/>`,
          det(`M${cx - R - 20} ${cy + 22} C${cx - 90} ${cy + 20} ${cx - 50} ${cy - 10} ${cx - 20} ${cy - 60} M${cx + R + 20} ${cy + 22} C${cx + 90} ${cy + 20} ${cx + 50} ${cy - 10} ${cx + 20} ${cy - 60}`, 5),
          eyes(56, cy - 16, 13), `<ellipse cx="${cx}" cy="${cy + R - 18}" rx="20" ry="14" fill="${K}" stroke-width="2"/>`); break;
        case "dog": out.push(head(), `<ellipse cx="${cx}" cy="${cy + 62}" rx="86" ry="64"/>`,
          `<path d="M${cx - R + 20} ${cy - 110} C${cx - R - 60} ${cy - 110} ${cx - R - 60} ${cy + 60} ${cx - R - 10} ${cy + 90} C${cx - R + 20} ${cy + 60} ${cx - R + 30} ${cy - 30} ${cx - R + 60} ${cy - 120} Z"/>`,
          `<path d="M${cx + R - 20} ${cy - 110} C${cx + R + 60} ${cy - 110} ${cx + R + 60} ${cy + 60} ${cx + R + 10} ${cy + 90} C${cx + R - 20} ${cy + 60} ${cx + R - 30} ${cy - 30} ${cx + R - 60} ${cy - 120} Z"/>`,
          eyes(56, cy - 34, 14), `<ellipse cx="${cx}" cy="${cy + 34}" rx="30" ry="20" fill="${K}" stroke-width="2"/>`, smile(cy + 74, 30),
          `<path d="M${cx - 14} ${cy + 92} C${cx - 14} ${cy + 124} ${cx + 14} ${cy + 124} ${cx + 14} ${cy + 92} Z" stroke-width="5"/>`); break;
        case "rabbit": out.push(
          `<ellipse cx="${cx - 52}" cy="${headTop - 60}" rx="38" ry="104" transform="rotate(-10 ${cx - 52} ${headTop - 60})"/><ellipse cx="${cx - 52}" cy="${headTop - 56}" rx="18" ry="76" transform="rotate(-10 ${cx - 52} ${headTop - 60})" stroke-width="5"/>`,
          `<ellipse cx="${cx + 52}" cy="${headTop - 60}" rx="38" ry="104" transform="rotate(10 ${cx + 52} ${headTop - 60})"/><ellipse cx="${cx + 52}" cy="${headTop - 56}" rx="18" ry="76" transform="rotate(10 ${cx + 52} ${headTop - 60})" stroke-width="5"/>`,
          head(), eyes(50, cy - 10, 13), noseTri(cy + 40, 12), smile(cy + 50, 22),
          `<path d="M${cx - 18} ${cy + 66} V${cy + 96} H${cx + 18} V${cy + 66}" stroke-width="5"/>`, det(`M${cx} ${cy + 66} V${cy + 96}`, 4), whiskers(cy + 44)); break;
        case "mouse": out.push(earRound(-1, 82, -135, W, 1.05), earRound(1, 82, -45, W, 1.05), head(), eyes(46, cy - 6, 12),
          `<circle cx="${cx}" cy="${cy + 56}" r="16" fill="${K}" stroke-width="2"/>`, det(`M${cx - 20} ${cy + 86} C${cx - 8} ${cy + 96} ${cx + 8} ${cy + 96} ${cx + 20} ${cy + 86}`, 5), whiskers(cy + 56)); break;
        case "bear": out.push(earRound(-1, 48), earRound(1, 48), head(), `<ellipse cx="${cx}" cy="${cy + 60}" rx="70" ry="54"/>`, eyes(58, cy - 30, 13),
          `<ellipse cx="${cx}" cy="${cy + 38}" rx="26" ry="18" fill="${K}" stroke-width="2"/>`, smile(cy + 70, 24)); break;
        case "panda": out.push(earRound(-1, 50, -130, K), earRound(1, 50, -50, K), head(),
          `<ellipse cx="${cx - 60}" cy="${cy - 16}" rx="38" ry="52" transform="rotate(35 ${cx - 60} ${cy - 16})" fill="${K}" stroke-width="2"/>`,
          `<ellipse cx="${cx + 60}" cy="${cy - 16}" rx="38" ry="52" transform="rotate(-35 ${cx + 60} ${cy - 16})" fill="${K}" stroke-width="2"/>`,
          `<circle cx="${cx - 56}" cy="${cy - 22}" r="13" fill="${W}" stroke="none"/><circle cx="${cx + 56}" cy="${cy - 22}" r="13" fill="${W}" stroke="none"/>`,
          dot(cx - 54, cy - 20, 7), dot(cx + 58, cy - 20, 7),
          `<ellipse cx="${cx}" cy="${cy + 44}" rx="22" ry="15" fill="${K}" stroke-width="2"/>`, smile(cy + 66, 22)); break;
        case "lion": out.push(`<path d="${bumpy(cx, cy, R + 70, R + 64, 16, 0.62)}"/>`, det(Array.from({ length: 16 }, (_, i) => `M${f2(P(cx, cy, R + 8, i * 22.5 + 11))} L${f2(P(cx, cy, R + 44, i * 22.5 + 11))}`).join(" "), 4),
          earRound(-1, 34, -122), earRound(1, 34, -58), head(), `<ellipse cx="${cx}" cy="${cy + 58}" rx="74" ry="56"/>`, eyes(56, cy - 30, 13), noseTri(cy + 36, 20), smile(cy + 52, 28),
          dot(cx - 40, cy + 72, 4), dot(cx - 56, cy + 62, 4), dot(cx + 40, cy + 72, 4), dot(cx + 56, cy + 62, 4)); break;
        case "tiger": out.push(earRound(-1, 40, -125), earRound(1, 40, -55), head(), `<ellipse cx="${cx}" cy="${cy + 62}" rx="80" ry="56"/>`,
          `<path d="M${cx - 30} ${headTop + 4} L${cx} ${headTop + 60} L${cx + 30} ${headTop + 4} Z M${cx - 70} ${headTop + 18} L${cx - 40} ${headTop + 70} L${cx - 40} ${headTop + 10} Z M${cx + 70} ${headTop + 18} L${cx + 40} ${headTop + 70} L${cx + 40} ${headTop + 10} Z" fill="${K}" stroke-width="2"/>`,
          `<path d="M${cx - R} ${cy - 10} L${cx - R + 60} ${cy + 4} L${cx - R + 4} ${cy + 24} Z M${cx - R + 8} ${cy + 50} L${cx - R + 60} ${cy + 50} L${cx - R + 20} ${cy + 76} Z M${cx + R} ${cy - 10} L${cx + R - 60} ${cy + 4} L${cx + R - 4} ${cy + 24} Z M${cx + R - 8} ${cy + 50} L${cx + R - 60} ${cy + 50} L${cx + R - 20} ${cy + 76} Z" fill="${K}" stroke-width="2"/>`,
          eyes(56, cy - 22, 13), noseTri(cy + 40, 18), smile(cy + 56, 26), whiskers(cy + 64)); break;
        case "pig": out.push(earTri(-1, 1.45), earTri(1, 1.45), head(), eyes(60, cy - 40, 13),
          `<ellipse cx="${cx}" cy="${cy + 40}" rx="62" ry="44"/><ellipse cx="${cx - 22}" cy="${cy + 40}" rx="9" ry="15" fill="${K}" stroke-width="2"/><ellipse cx="${cx + 22}" cy="${cy + 40}" rx="9" ry="15" fill="${K}" stroke-width="2"/>`,
          det(`M${cx - 40} ${cy + 106} C${cx - 14} ${cy + 120} ${cx + 14} ${cy + 120} ${cx + 40} ${cy + 106}`, 5)); break;
        case "cow": out.push(tubes([`M${cx - 70} ${headTop + 20} C${cx - 90} ${headTop - 20} ${cx - 120} ${headTop - 30} ${cx - 130} ${headTop - 60}`, `M${cx + 70} ${headTop + 20} C${cx + 90} ${headTop - 20} ${cx + 120} ${headTop - 30} ${cx + 130} ${headTop - 60}`], 18),
          `<path d="M${cx - R + 16} ${cy - 70} C${cx - R - 60} ${cy - 90} ${cx - R - 90} ${cy - 50} ${cx - R - 96} ${cy - 30} C${cx - R - 50} ${cy - 10} ${cx - R - 10} ${cy - 20} ${cx - R + 20} ${cy - 40} Z"/>`,
          `<path d="M${cx + R - 16} ${cy - 70} C${cx + R + 60} ${cy - 90} ${cx + R + 90} ${cy - 50} ${cx + R + 96} ${cy - 30} C${cx + R + 50} ${cy - 10} ${cx + R + 10} ${cy - 20} ${cx + R - 20} ${cy - 40} Z"/>`,
          `<path d="M${cx} ${headTop} C${cx + 110} ${headTop} ${cx + R} ${cy - 60} ${cx + R - 16} ${cy + 40} C${cx + R - 30} ${cy + 120} ${cx + 90} ${cy + 170} ${cx} ${cy + 170} C${cx - 90} ${cy + 170} ${cx - R + 30} ${cy + 120} ${cx - R + 16} ${cy + 40} C${cx - R} ${cy - 60} ${cx - 110} ${headTop} ${cx} ${headTop} Z"/>`,
          `<path d="${blob(cx + 62, cy - 70, 44, 7, 3, 0.8)}" stroke-width="5"/>`,
          `<ellipse cx="${cx}" cy="${cy + 112}" rx="100" ry="60"/>`, `<ellipse cx="${cx - 40}" cy="${cy + 106}" rx="12" ry="18" fill="${K}" stroke-width="2"/><ellipse cx="${cx + 40}" cy="${cy + 106}" rx="12" ry="18" fill="${K}" stroke-width="2"/>`,
          eyes(56, cy - 20, 13)); break;
        case "monkey": out.push(earRound(-1, 52, 180, W, 1.0), earRound(1, 52, 0, W, 1.0), head(),
          `<path d="M${cx} ${cy - 50} C${cx - 20} ${cy - 90} ${cx - 110} ${cy - 90} ${cx - 110} ${cy - 20} C${cx - 110} ${cy + 20} ${cx - 90} ${cy + 40} ${cx - 90} ${cy + 70} C${cx - 90} ${cy + 130} ${cx + 90} ${cy + 130} ${cx + 90} ${cy + 70} C${cx + 90} ${cy + 40} ${cx + 110} ${cy + 20} ${cx + 110} ${cy - 20} C${cx + 110} ${cy - 90} ${cx + 20} ${cy - 90} ${cx} ${cy - 50} Z" stroke-width="6"/>`,
          eyes(46, cy - 22, 13), dot(cx - 10, cy + 36, 5), dot(cx + 10, cy + 36, 5), det(`M${cx - 40} ${cy + 70} C${cx - 14} ${cy + 96} ${cx + 14} ${cy + 96} ${cx + 40} ${cy + 70}`, 5)); break;
        case "elephant": out.push(
          `<path d="M${cx - 80} ${cy - 90} C${cx - 240} ${cy - 150} ${cx - 270} ${cy + 60} ${cx - 160} ${cy + 110} C${cx - 120} ${cy + 120} ${cx - 100} ${cy + 60} ${cx - 90} ${cy + 20} Z"/>`,
          `<path d="M${cx + 80} ${cy - 90} C${cx + 240} ${cy - 150} ${cx + 270} ${cy + 60} ${cx + 160} ${cy + 110} C${cx + 120} ${cy + 120} ${cx + 100} ${cy + 60} ${cx + 90} ${cy + 20} Z"/>`,
          head(), `<path d="M${cx - 34} ${cy + 60} C${cx - 40} ${cy + 130} ${cx - 30} ${cy + 170} ${cx + 10} ${cy + 182} C${cx + 30} ${cy + 186} ${cx + 44} ${cy + 170} ${cx + 30} ${cy + 160} C${cx + 6} ${cy + 156} ${cx + 30} ${cy + 120} ${cx + 34} ${cy + 60} Z"/>`,
          det(`M${cx - 30} ${cy + 100} H${cx + 30} M${cx - 30} ${cy + 124} H${cx + 26} M${cx - 22} ${cy + 148} H${cx + 16}`, 3.5),
          `<path d="M${cx - 60} ${cy + 70} C${cx - 70} ${cy + 100} ${cx - 86} ${cy + 110} ${cx - 100} ${cy + 108} C${cx - 86} ${cy + 96} ${cx - 80} ${cy + 80} ${cx - 80} ${cy + 64} Z" stroke-width="5"/>`,
          `<path d="M${cx + 60} ${cy + 70} C${cx + 70} ${cy + 100} ${cx + 86} ${cy + 110} ${cx + 100} ${cy + 108} C${cx + 86} ${cy + 96} ${cx + 80} ${cy + 80} ${cx + 80} ${cy + 64} Z" stroke-width="5"/>`,
          eyes(52, cy - 16, 12)); break;
        case "sheep": out.push(
          `<path d="M${cx - R + 6} ${cy - 40} C${cx - R - 70} ${cy - 50} ${cx - R - 80} ${cy - 10} ${cx - R - 76} ${cy} C${cx - R - 40} ${cy + 10} ${cx - R - 10} ${cy} ${cx - R + 10} ${cy - 10} Z"/>`,
          `<path d="M${cx + R - 6} ${cy - 40} C${cx + R + 70} ${cy - 50} ${cx + R + 80} ${cy - 10} ${cx + R + 76} ${cy} C${cx + R + 40} ${cy + 10} ${cx + R + 10} ${cy} ${cx + R - 10} ${cy - 10} Z"/>`,
          `<path d="M${cx} ${cy - 90} C${cx + 120} ${cy - 90} ${cx + 110} ${cy + 90} ${cx + 60} ${cy + 150} C${cx + 30} ${cy + 180} ${cx - 30} ${cy + 180} ${cx - 60} ${cy + 150} C${cx - 110} ${cy + 90} ${cx - 120} ${cy - 90} ${cx} ${cy - 90} Z"/>`,
          `<path d="${bumpy(cx, cy - 104, 140, 70, 11, 0.62)}"/>`, eyes(44, cy - 4, 12),
          `<ellipse cx="${cx - 16}" cy="${cy + 108}" rx="7" ry="11" fill="${K}" stroke-width="2"/><ellipse cx="${cx + 16}" cy="${cy + 108}" rx="7" ry="11" fill="${K}" stroke-width="2"/>`,
          det(`M${cx - 22} ${cy + 140} C${cx - 8} ${cy + 150} ${cx + 8} ${cy + 150} ${cx + 22} ${cy + 140}`, 5)); break;
        case "frog": out.push(`<circle cx="${cx - 82}" cy="${cy - 120}" r="56"/><circle cx="${cx + 82}" cy="${cy - 120}" r="56"/>`,
          `<ellipse cx="${cx}" cy="${cy}" rx="${R + 20}" ry="${R - 30}"/>`,
          `<path d="M${cx - 134} ${cy - 92} A56 56 0 0 1 ${cx - 30} ${cy - 92} M${cx + 30} ${cy - 92} A56 56 0 0 1 ${cx + 134} ${cy - 92}" fill="${W}" stroke="none"/>`,
          `<circle cx="${cx - 82}" cy="${cy - 124}" r="30" stroke-width="5"/><circle cx="${cx + 82}" cy="${cy - 124}" r="30" stroke-width="5"/>`, dot(cx - 78, cy - 122, 15), dot(cx + 86, cy - 122, 15),
          det(`M${cx - 130} ${cy + 20} C${cx - 60} ${cy + 90} ${cx + 60} ${cy + 90} ${cx + 130} ${cy + 20}`, 7), dot(cx - 20, cy - 34, 5), dot(cx + 20, cy - 34, 5),
          det(`M${cx - 120} ${cy + 40} C${cx - 110} ${cy + 50} ${cx - 104} ${cy + 46} ${cx - 100} ${cy + 36} M${cx + 120} ${cy + 40} C${cx + 110} ${cy + 50} ${cx + 104} ${cy + 46} ${cx + 100} ${cy + 36}`, 4)); break;
        case "owl": out.push(
          `<path d="M${cx - 140} ${cy - 120} L${cx - 120} ${cy - 210} L${cx - 70} ${cy - 150} C${cx - 30} ${cy - 170} ${cx + 30} ${cy - 170} ${cx + 70} ${cy - 150} L${cx + 120} ${cy - 210} L${cx + 140} ${cy - 120} C${cx + 190} ${cy - 30} ${cx + 170} ${cy + 150} ${cx} ${cy + 180} C${cx - 170} ${cy + 150} ${cx - 190} ${cy - 30} ${cx - 140} ${cy - 120} Z"/>`,
          `<circle cx="${cx - 66}" cy="${cy - 60}" r="58" stroke-width="6"/><circle cx="${cx + 66}" cy="${cy - 60}" r="58" stroke-width="6"/>`,
          eye(cx - 62, cy - 58, 24), eye(cx + 70, cy - 58, 24),
          `<path d="M${cx - 18} ${cy - 10} L${cx + 18} ${cy - 10} L${cx} ${cy + 30} Z"/>`,
          det(Array.from({ length: 3 }, (_, r) => Array.from({ length: 5 - r }, (_, i) => { const x = cx - 80 + r * 20 + i * 40, y = cy + 56 + r * 32; return `M${x - 14} ${y} C${x - 10} ${y + 14} ${x + 10} ${y + 14} ${x + 14} ${y}`; }).join(" ")).join(" "), 4)); break;
      }
      return out.join("\n");
    }
  };

  /* ---------- vehicles (side view, facing right) ---------- */
  FAM.vehicle = {
    name: "Vehicle",
    params: { kind: ["car", "bus", "school-bus", "van", "truck", "jeep", "taxi"] },
    build(p) {
      const k = p.kind, out = [], wheel = (x, y = 382, r = 44) => `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" stroke-width="5"/>`;
      const road = det("M24 430 H488", 5);
      if (k === "car" || k === "taxi") {
        if (k === "taxi") out.push(`<rect x="216" y="128" width="84" height="34" rx="8"/>`, F.word("TAXI".replace("I", "I"), 222, 136, 0.5, 4, 40));
        out.push(`<path d="M150 254 L196 168 C202 160 210 158 220 158 H322 C334 158 344 164 352 172 L410 254 Z"/>`,
          `<path d="M44 270 C44 258 54 254 70 254 H420 C450 254 470 266 474 290 L476 352 C476 362 470 368 460 368 H54 C46 368 42 362 42 352 Z"/>`,
          `<path d="M178 246 L208 182 C210 178 214 176 218 176 H262 V246 Z" stroke-width="5"/><path d="M280 246 V176 H318 C326 176 332 180 336 186 L376 246 Z" stroke-width="5"/>`,
          det("M270 260 V350 M196 286 H218 M300 286 H322", 5), `<rect x="446" y="276" width="26" height="22" rx="6" stroke-width="5"/>`, `<rect x="40" y="276" width="20" height="24" rx="6" stroke-width="5"/>`,
          wheel(136), wheel(382), road);
      } else if (k === "bus" || k === "school-bus") {
        out.push(`<rect x="34" y="118" width="444" height="258" rx="30"/>`, det("M34 300 H478", 5));
        for (let i = 0; i < 5; i++) out.push(`<rect x="${58 + i * 66}" y="146" width="52" height="${k === "school-bus" ? 62 : 82}" rx="8" stroke-width="5"/>`);
        out.push(`<path d="M400 146 H446 C458 146 464 152 464 164 V230 H400 Z" stroke-width="5"/>`, `<rect x="400" y="240" width="46" height="120" rx="6" stroke-width="5"/>`, det("M423 240 V360", 4));
        if (k === "school-bus") out.push(F.word("SCHOOL BUS", 70, 232, 0.72, 5, 42));
        out.push(`<rect x="456" y="318" width="22" height="20" rx="5" stroke-width="5"/>`, wheel(116), wheel(360), road);
      } else if (k === "van") {
        out.push(`<path d="M40 150 C40 136 50 128 64 128 H330 C350 128 362 134 372 148 L440 234 C462 240 474 254 476 280 V354 C476 364 470 370 460 370 H56 C46 370 40 364 40 354 Z"/>`,
          `<path d="M346 150 L410 234 H340 Z" stroke-width="5"/>`, `<rect x="72" y="154" width="100" height="74" rx="8" stroke-width="5"/><rect x="190" y="154" width="120" height="74" rx="8" stroke-width="5"/>`,
          det("M330 150 V350 M40 300 H476", 5), wheel(126), wheel(380), road);
      } else if (k === "truck") {
        out.push(`<rect x="30" y="120" width="300" height="214" rx="10"/>`, det("M80 120 V334 M130 120 V334 M180 120 V334 M230 120 V334 M280 120 V334", 4),
          `<path d="M330 186 H410 C424 186 432 192 438 204 L474 270 V350 C474 360 468 366 458 366 H330 Z"/>`, `<path d="M356 206 H404 L436 262 H356 Z" stroke-width="5"/>`,
          `<rect x="30" y="334" width="300" height="32" rx="6"/>`, wheel(100), wheel(250), wheel(412), road);
      } else if (k === "jeep") {
        out.push(`<circle cx="44" cy="300" r="40"/><circle cx="44" cy="300" r="16" stroke-width="5"/>`,
          `<path d="M70 224 H300 L320 160 H340 L330 224 H448 C462 224 470 232 472 246 L476 350 C476 360 470 366 460 366 H70 C62 366 58 360 58 350 V236 C58 228 62 224 70 224 Z"/>`,
          det("M240 224 V352 M70 280 H470", 5), tubes(["M90 224 V170 H300"], 8), `<rect x="440" y="250" width="30" height="24" rx="6" stroke-width="5"/>`,
          `<path d="M96 380 C96 330 176 330 176 380 M332 380 C332 330 412 330 412 380" fill="none" stroke-width="8"/>`, wheel(136), wheel(372), road);
      }
      return out.join("\n");
    }
  };

  /* ---------- flowers ---------- */
  FAM.flower = {
    name: "Flower",
    params: { petals: [5, 6, 8, 10, 12, 16], petal: ["round", "pointed", "long", "frilly"], pot: [false, true] },
    build(p, seed) {
      const r = rng(seed), cx = 256, cy = p.pot ? 150 : 180, n = +p.petals, out = [];
      const stemBot = p.pot ? 330 : 470;
      out.push(tubes([`M${cx} ${cy + 40} C${cx - 10} ${cy + 120} ${cx + 12} ${cy + 200} ${cx} ${stemBot}`], 10));
      out.push(leafAt(cx - 2, (cy + stemBot) / 2 + 20, 200 + r() * 15, 110, 0.36), leafAt(cx + 2, (cy + stemBot) / 2 + 60, -20 - r() * 15, 100, 0.36));
      const len = p.petal === "long" ? 120 : 96, wd = p.petal === "long" ? 22 : Math.min(48, 300 / n);
      const petalPath = (a) => {
        const tip = P(cx, cy, len + 34, a), b = P(cx, cy, 30, a), l = P(cx, cy, 30 + len * 0.6, a - wd * 0.9), rr = P(cx, cy, 30 + len * 0.6, a + wd * 0.9);
        if (p.petal === "pointed") return `M${f2(b)} Q${f2(l)} ${f2(tip)} Q${f2(rr)} ${f2(b)} Z`;
        return `M${f2(b)} C${f2(l)} ${f2(P(cx, cy, len + 40, a - wd * 0.6))} ${f2(tip)} C${f2(P(cx, cy, len + 40, a + wd * 0.6))} ${f2(rr)} ${f2(b)} Z`;
      };
      if (p.petal === "frilly") {
        out.push(`<path d="${bumpy(cx, cy, 150, 140, 22, 0.62)}"/>`, `<path d="${bumpy(cx, cy, 112, 104, 18, 0.62)}" stroke-width="5"/>`, `<path d="${bumpy(cx, cy, 76, 70, 14, 0.62)}" stroke-width="5"/>`);
        out.push(dimples(cx, cy, 40, 36, 8, seed));
      } else {
        for (let i = 0; i < n; i++) { const a = -90 + i * 360 / n; out.push(`<path d="${petalPath(a)}"/>` + det(`M${f2(P(cx, cy, 40, a))} L${f2(P(cx, cy, 40 + len * 0.5, a))}`, 3.5)); }
        out.push(`<circle cx="${cx}" cy="${cy}" r="42"/>`, dimples(cx, cy, 32, 32, 9, seed));
      }
      if (p.pot) out.push(`<path d="M150 360 H362 L336 476 H176 Z"/>`, `<rect x="132" y="330" width="248" height="40" rx="8"/>`);
      return out.join("\n");
    }
  };

  /* ---------- trees ---------- */
  FAM.tree = {
    name: "Tree",
    params: { kind: ["round", "pine", "fruit", "bush", "christmas"] },
    build(p, seed) {
      const k = p.kind, out = [], r = rng(seed);
      if (k === "bush") return [`<path d="${bumpy(256, 330, 220, 120, 15, 0.6)}"/>`, det(`M120 350 C150 330 180 330 200 350 M300 320 C320 300 350 300 370 320 M220 270 C240 254 260 254 280 270`, 4), det("M24 452 H488", 6)].join("\n");
      out.push(det("M90 480 H422", 6));
      if (k === "pine" || k === "christmas") {
        out.push(`<rect x="232" y="400" width="48" height="80" rx="4"/>`);
        const tiers = [[256, 70, 110, 200], [256, 150, 150, 300], [256, 230, 200, 410]];
        for (const [x, top, hw, bot] of tiers.reverse()) {
          let d = `M${x} ${top} L${x + hw} ${bot}`;
          for (let i = 0; i < 6; i++) { const x1 = x + hw - (i + 1) * hw / 3; d += ` Q${n1(x + hw - (i + 0.5) * hw / 3)} ${bot + 18} ${n1(x1)} ${bot}`; }
          out.push(`<path d="${d} Z"/>`);
        }
        if (k === "christmas") {
          out.push(`<path d="${star(256, 66, 40, 17)}"/>`);
          [[200, 280], [310, 260], [256, 200], [170, 390], [340, 380], [256, 340]].forEach(([x, y]) => out.push(`<circle cx="${x}" cy="${y}" r="14"/>`));
        }
        return out.join("\n");
      }
      out.push(`<path d="M230 480 C238 420 236 360 226 300 L200 250 L222 246 L242 286 L250 220 H270 L276 286 L300 240 L320 252 L290 306 C282 360 280 420 288 480 Z"/>`);
      out.push(`<path d="${bumpy(256, 200, 200, 160, 14, 0.62)}"/>`, det("M150 200 C170 180 196 176 216 186 M290 150 C310 136 336 140 350 156 M300 260 C320 246 346 250 360 266", 4));
      if (k === "fruit") [[170, 170], [250, 120], [330, 190], [200, 260], [300, 250], [380, 230], [130, 230]].forEach(([x, y]) => out.push(`<circle cx="${x}" cy="${y}" r="18"/>` + det(`M${x} ${y - 18} l4 -8`, 4)));
      return out.join("\n");
    }
  };

  /* ---------- containers (drawn from a side profile) ---------- */
  const PROFILES = {
    cup:      { prof: [[86, 150], [84, 220], [72, 300], [56, 350]], handle: "cup", saucer: true },
    mug:      { prof: [[96, 120], [98, 200], [98, 300], [94, 400]], handle: "mug" },
    glass:    { prof: [[100, 90], [94, 200], [86, 330], [76, 440]], water: 180 },
    bottle:   { prof: [[30, 80], [30, 130], [36, 160], [90, 230], [96, 300], [96, 400], [90, 460]], cap: true, label: [270, 370] },
    jar:      { prof: [[90, 120], [110, 160], [118, 260], [116, 380], [100, 450]], lid: true, label: [230, 360] },
    vase:     { prof: [[64, 60], [44, 110], [56, 170], [120, 280], [118, 360], [80, 440]], bands: [140, 400] },
    "flower-pot": { prof: [[130, 220], [122, 300], [110, 400], [100, 470]], rim: true, plant: true },
    bowl:     { prof: [[200, 220], [190, 280], [150, 350], [80, 390]], foot: true },
    bucket:   { prof: [[150, 170], [140, 300], [124, 440]], handle: "bucket", bands: [200, 410] },
    matka:    { prof: [[60, 90], [56, 120], [76, 150], [170, 250], [180, 320], [150, 420], [80, 470]], bands: [170, 190] },
    bell:     { prof: [[22, 110], [80, 150], [110, 260], [128, 360], [180, 410]], bell: true },
    diya:     { prof: [[180, 330], [160, 380], [100, 420], [60, 430]], diya: true }
  };
  FAM.container = {
    name: "Container (cup, bottle, pot …)",
    params: { kind: Object.keys(PROFILES) },
    build(p) {
      const spec = PROFILES[p.kind], cx = 256, pr = spec.prof, out = [];
      const right = pr.map(([w, y]) => [cx + w, y]), left = pr.map(([w, y]) => [cx - w, y]).reverse();
      const top = pr[0], bot = pr[pr.length - 1];
      const outline = smooth(right, false, 0.6) + ` L${f2(left[0])} ` + smooth(left, false, 0.6).replace(/^M[^C]+/, "") + " Z";
      if (spec.handle === "cup") out.push(tubes([`M${cx + 82} 190 C${cx + 160} 180 ${cx + 160} 290 ${cx + 70} 300`], 16));
      if (spec.handle === "mug") out.push(tubes([`M${cx + 98} 170 C${cx + 190} 170 ${cx + 190} 330 ${cx + 98} 330`], 22));
      if (spec.handle === "bucket") out.push(tubes([`M${cx - 146} 190 C${cx - 140} 30 ${cx + 140} 30 ${cx + 146} 190`], 8));
      if (spec.saucer) out.push(`<ellipse cx="${cx}" cy="360" rx="170" ry="40"/>`, `<ellipse cx="${cx}" cy="354" rx="100" ry="20" stroke-width="5"/>`);
      if (spec.plant) { out.push(leafAt(256, 230, -100, 170, 0.32), leafAt(250, 232, -140, 150, 0.32), leafAt(262, 232, -50, 150, 0.32), leafAt(240, 234, -170, 120, 0.3), leafAt(272, 234, -10, 120, 0.3)); }
      if (spec.diya) out.push(`<path d="M256 300 C226 260 236 200 256 150 C276 200 286 260 256 300 Z"/>` + `<path d="M256 290 C244 270 246 240 256 216 C266 240 268 270 256 290 Z" stroke-width="4"/>`);
      out.push(`<path d="${outline}"/>`);
      if (spec.diya) out.push(`<path d="M${cx + 150} 340 L${cx + 236} 316 L${cx + 166} 372 Z"/>`, det(`M${cx - 120} 380 C${cx - 40} 400 ${cx + 40} 400 ${cx + 120} 380`, 4), tubes([`M256 330 V300`], 6));
      if (!spec.bell && !spec.diya) out.push(`<ellipse cx="${cx}" cy="${top[1]}" rx="${top[0]}" ry="${n1(Math.max(8, top[0] * 0.2))}"/>`);
      if (spec.diya) out.push(`<ellipse cx="${cx}" cy="${top[1]}" rx="${top[0]}" ry="26"/>`, `<ellipse cx="${cx}" cy="${top[1]}" rx="${top[0] - 20}" ry="16" stroke-width="5"/>`);
      if (spec.water) out.push(det(`M${cx - 96} ${spec.water} C${cx - 40} ${spec.water + 14} ${cx + 40} ${spec.water + 14} ${cx + 96} ${spec.water}`, 5));
      if (spec.cap) out.push(`<rect x="${cx - 38}" y="${top[1] - 34}" width="76" height="44" rx="8"/>`, det(`M${cx - 22} ${top[1] - 30} V${top[1] + 4} M${cx} ${top[1] - 30} V${top[1] + 4} M${cx + 22} ${top[1] - 30} V${top[1] + 4}`, 3.5));
      if (spec.lid) out.push(`<rect x="${cx - 104}" y="${top[1] - 50}" width="208" height="54" rx="14"/>`, det(`M${cx - 84} ${top[1] - 22} H${cx + 84}`, 4));
      if (spec.label) out.push(`<rect x="${cx - 80}" y="${spec.label[0]}" width="160" height="${spec.label[1] - spec.label[0]}" rx="12" stroke-width="5"/>`);
      if (spec.rim) out.push(`<rect x="${cx - 148}" y="196" width="296" height="54" rx="10"/>`);
      if (spec.foot) out.push(`<path d="M${cx - 60} 386 H${cx + 60} L${cx + 70} 410 H${cx - 70} Z"/>`);
      if (spec.bands) for (const y of spec.bands) {
        const w = (() => { for (let i = 1; i < pr.length; i++) if (y <= pr[i][1]) { const [w0, y0] = pr[i - 1], [w1, y1] = pr[i]; return w0 + (w1 - w0) * (y - y0) / (y1 - y0); } return bot[0]; })();
        out.push(det(`M${n1(cx - w + 4)} ${y} C${n1(cx - w * 0.5)} ${y + w * 0.16} ${n1(cx + w * 0.5)} ${y + w * 0.16} ${n1(cx + w - 4)} ${y}`, 5));
      }
      if (spec.bell) out.push(`<circle cx="${cx}" cy="96" r="20"/>`, `<ellipse cx="${cx}" cy="414" rx="180" ry="26"/>`, `<circle cx="${cx}" cy="446" r="22"/>`);
      if (!spec.diya && !spec.bell) out.push(det(`M${n1(cx - pr[1][0] * 0.7)} ${pr[1][1] + 20} C${n1(cx - pr[1][0] * 0.8)} ${pr[1][1] + 70} ${n1(cx - pr[1][0] * 0.75)} ${pr[1][1] + 110} ${n1(cx - pr[1][0] * 0.66)} ${pr[1][1] + 140}`, 6));
      return out.join("\n");
    }
  };

  /* ---------- shapes (2D and 3D) ---------- */
  FAM.shape = {
    name: "Shape",
    params: { kind: ["circle", "oval", "square", "rectangle", "triangle", "rhombus", "kite", "polygon", "star", "heart", "arrow", "cross", "semicircle",
      "cube", "cuboid", "cylinder", "cone", "sphere", "pyramid", "prism", "hemisphere"], sides: [3, 4, 5, 6, 7, 8, 9, 10], points: [4, 5, 6, 8] },
    build(p) {
      const s = (d) => `<path d="${d}"/>`, dash = (d) => `<path d="${d}" fill="none" stroke-width="4" ${DASH}/>`;
      switch (p.kind) {
        case "circle": return `<circle cx="256" cy="256" r="200"/>`;
        case "oval": return `<ellipse cx="256" cy="256" rx="216" ry="140"/>`;
        case "square": return `<rect x="66" y="66" width="380" height="380"/>`;
        case "rectangle": return `<rect x="36" y="126" width="440" height="260"/>`;
        case "triangle": return s(poly([[256, 56], [466, 430], [46, 430]]));
        case "rhombus": return s(poly([[256, 40], [430, 256], [256, 472], [82, 256]]));
        case "kite": return s(poly([[256, 40], [400, 190], [256, 472], [112, 190]]));
        case "polygon": return s(ngon(256, 262, 210, +p.sides, -90));
        case "star": return s(star(256, 270, 220, +p.points <= 4 ? 80 : 92, +p.points));
        case "heart": return s("M256 440 C120 340 40 260 50 170 C60 90 170 60 256 150 C342 60 452 90 462 170 C472 260 392 340 256 440 Z");
        case "arrow": return s(poly([[50, 194], [290, 194], [290, 100], [462, 256], [290, 412], [290, 318], [50, 318]]));
        case "cross": return s(poly([[196, 56], [316, 56], [316, 196], [456, 196], [456, 316], [316, 316], [316, 456], [196, 456], [196, 316], [56, 316], [56, 196], [196, 196]]));
        case "semicircle": return s("M60 350 A196 196 0 0 1 452 350 Z");
        case "cube": return F.box(80, 180, 250, 100) + dash("M180 80 V330 L80 430 M180 330 H430");
        case "cuboid": return F.box(40, 200, 330, 100, 200) + dash("M140 100 V300 L40 400 M140 300 H470");
        case "cylinder": return `<path d="M100 120 V400 A156 46 0 0 0 412 400 V120"/><ellipse cx="256" cy="120" rx="156" ry="46"/>` + dash("M100 400 A156 46 0 0 1 412 400");
        case "cone": return `<path d="M256 50 L420 400 A164 48 0 0 1 92 400 Z"/>` + dash("M92 400 A164 48 0 0 1 420 400");
        case "sphere": return `<circle cx="256" cy="256" r="200"/><path d="M56 256 A200 60 0 0 0 456 256" fill="none" stroke-width="5"/>` + dash("M56 256 A200 60 0 0 1 456 256");
        case "pyramid": return s(poly([[256, 50], [60, 380], [300, 450]])) + s(poly([[256, 50], [300, 450], [460, 360]])) + dash("M60 380 L230 320 L460 360 M230 320 L256 50");
        case "prism": { const A = [70, 420], B = [250, 420], C = [160, 264], o = [190, -84], A2 = [A[0] + o[0], A[1] + o[1]], B2 = [B[0] + o[0], B[1] + o[1]], C2 = [C[0] + o[0], C[1] + o[1]];
          return s(poly([B, B2, C2, C])) + s(poly([A, B, C])) + dash(`M${f2(A)} L${f2(A2)} M${f2(A2)} L${f2(B2)} M${f2(A2)} L${f2(C2)}`); }
        case "hemisphere": return `<path d="M60 340 A196 196 0 0 1 452 340 A196 56 0 0 1 60 340 Z"/>` + dash("M60 340 A196 56 0 0 1 452 340");
      }
      return "";
    }
  };

  /* ---------- weather & sky ---------- */
  FAM.sky = {
    name: "Weather / sky",
    params: { kind: ["sun", "cloud", "rain", "snow", "lightning", "moon", "star", "rainbow"], face: [false, true] },
    build(p) {
      const out = [], face = (x, y, s = 1) => eye(x - 34 * s, y - 10 * s, 10 * s) + eye(x + 34 * s, y - 10 * s, 10 * s) + det(`M${x - 34 * s} ${y + 22 * s} C${x - 14 * s} ${y + 44 * s} ${x + 14 * s} ${y + 44 * s} ${x + 34 * s} ${y + 22 * s}`, 5);
      const cloud = (cy = 210) => `<path d="${bumpy(256, cy, 200, 110, 11, 0.6)}"/>`;
      switch (p.kind) {
        case "sun": for (let i = 0; i < 12; i++) { const a = i * 30; out.push(`<path d="${poly([P(256, 256, 150, a - 9), P(256, 256, 226, a), P(256, 256, 150, a + 9)])}"/>`); }
          out.push(`<circle cx="256" cy="256" r="130"/>`); if (p.face) out.push(face(256, 256, 1.3)); break;
        case "cloud": out.push(`<path d="${bumpy(256, 256, 220, 130, 12, 0.6)}"/>`); if (p.face) out.push(face(256, 266, 1.1)); break;
        case "rain": out.push(cloud(), F.drop(170, 360), F.drop(256, 400), F.drop(342, 360), F.drop(212, 460, 0.8), F.drop(300, 462, 0.8)); if (p.face) out.push(face(256, 220)); break;
        case "snow": out.push(cloud()); for (const [x, y] of [[160, 380], [256, 420], [352, 380], [210, 470], [306, 470]]) out.push(det([0, 60, 120].map((a) => `M${f2(P(x, y, 18, a))} L${f2(P(x, y, 18, a + 180))}`).join(" "), 5)); if (p.face) out.push(face(256, 220)); break;
        case "lightning": out.push(cloud(190), `<path d="M270 290 L200 400 H250 L222 486 L322 360 H270 L300 290 Z"/>`); if (p.face) out.push(face(256, 200)); break;
        case "moon": out.push(`<path d="M330 70 A200 200 0 1 0 440 380 A160 160 0 0 1 330 70 Z"/>`); if (p.face) out.push(eye(200, 220, 10), det("M170 300 C190 320 214 324 236 316", 5)); break;
        case "star": out.push(`<path d="${star(256, 270, 220, 92, 5)}"/>`); if (p.face) out.push(face(256, 280, 0.9)); break;
        case "rainbow": for (let i = 0; i < 5; i++) out.push(`<path d="M${46 + i * 30} 380 A${210 - i * 30} ${210 - i * 30} 0 0 1 ${466 - i * 30} 380" fill="none" stroke-width="${i === 0 ? 8 : 5}"/>`);
          out.push(`<path d="M${46 + 150} 380 H${466 - 150}" fill="none" stroke-width="0"/>`, `<path d="${bumpy(90, 386, 76, 46, 7, 0.6)}"/>`, `<path d="${bumpy(422, 386, 76, 46, 7, 0.6)}"/>`); break;
      }
      return out.join("\n");
    }
  };

  /* ---------- feelings (emotion faces) ---------- */
  FAM.feeling = {
    name: "Feeling face",
    params: { mood: ["happy", "sad", "angry", "surprised", "sleepy", "crying", "laughing", "scared"] },
    build(p) {
      const m = p.mood, out = [`<circle cx="256" cy="256" r="210"/>`];
      const E = (x, y) => eye(x, y, 18);
      if (m === "happy") out.push(E(180, 210), E(332, 210), det("M160 300 C200 380 312 380 352 300", 8));
      if (m === "sad" || m === "crying") out.push(E(180, 220), E(332, 220), det("M150 170 C170 160 196 158 216 166 M362 170 C342 160 316 158 296 166", 6), det("M170 370 C210 320 302 320 342 370", 8));
      if (m === "crying") out.push(F.drop(176, 280, 0.9), F.drop(340, 290, 0.7));
      if (m === "angry") out.push(E(184, 236), E(328, 236), det("M140 176 L222 210 M372 176 L290 210", 9), det("M180 370 C220 336 292 336 332 370", 8));
      if (m === "surprised" || m === "scared") out.push(`<circle cx="180" cy="210" r="34"/><circle cx="332" cy="210" r="34"/>`, dot(180, 214, 14), dot(332, 214, 14),
        det("M146 150 C166 128 196 126 214 136 M366 150 C346 128 316 126 298 136", 6), `<ellipse cx="256" cy="350" rx="${m === "scared" ? 70 : 44}" ry="${m === "scared" ? 36 : 54}"/>`);
      if (m === "scared") out.push(det("M90 120 C100 100 110 90 120 86 M422 120 C412 100 402 90 392 86", 5), F.drop(110, 220, 0.6));
      if (m === "sleepy") out.push(det("M150 226 C170 246 200 246 220 226 M292 226 C312 246 342 246 362 226", 7), `<ellipse cx="256" cy="350" rx="30" ry="22"/>`,
        F.word("Z", 380, 70, 1.1, 6), F.word("Z", 430, 30, 0.7, 5));
      if (m === "laughing") out.push(det("M150 220 C170 190 200 190 220 220 M292 220 C312 190 342 190 362 220", 8),
        `<path d="M150 290 H362 C362 380 300 420 256 420 C212 420 150 380 150 290 Z"/>`, `<path d="M200 380 C220 360 292 360 312 380 C296 404 276 414 256 414 C236 414 216 404 200 380 Z" stroke-width="5"/>`);
      return out.join("\n");
    }
  };

  /* ---------- buildings ---------- */
  FAM.building = {
    name: "Building",
    params: { kind: ["house", "hut", "flats", "shop", "tent", "igloo"] },
    build(p) {
      const k = p.kind, ground = det("M24 470 H488", 6);
      if (k === "house") return [`<rect x="320" y="90" width="44" height="90"/>`, `<path d="M40 250 L256 70 L472 250 Z"/>`, `<rect x="80" y="246" width="352" height="224"/>`,
        `<rect x="216" y="340" width="80" height="130" rx="4"/>`, dot(280, 410, 6), `<rect x="110" y="300" width="76" height="70" stroke-width="5"/>`, det("M148 300 V370 M110 335 H186", 4),
        `<rect x="326" y="300" width="76" height="70" stroke-width="5"/>`, det("M364 300 V370 M326 335 H402", 4), `<circle cx="256" cy="186" r="28" stroke-width="5"/>`, ground].join("\n");
      if (k === "hut") return [`<rect x="100" y="270" width="312" height="200"/>`, `<path d="M256 60 L470 290 C400 300 112 300 42 290 Z"/>`,
        det("M256 70 L120 288 M256 70 L190 294 M256 70 L256 296 M256 70 L322 294 M256 70 L392 288", 4), `<path d="M216 470 V380 C216 340 296 340 296 380 V470"/>`, ground].join("\n");
      if (k === "flats") { const w = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) w.push(`<rect x="${144 + c * 60}" y="${92 + r * 64}" width="40" height="40" stroke-width="5"/>`);
        return [`<rect x="120" y="60" width="272" height="410"/>`, `<rect x="110" y="44" width="292" height="24" rx="4"/>`, ...w, `<rect x="226" y="410" width="60" height="60"/>`, ground].join("\n"); }
      if (k === "shop") { let aw = "M60 200"; for (let i = 0; i < 8; i++) aw += ` A24 24 0 0 0 ${108 + i * 49} 200`;
        return [`<rect x="80" y="196" width="352" height="274"/>`, `<path d="M70 120 H442 L462 200 ${aw.replace("M60 200", "")} L50 200 Z"/>`, det("M130 120 L110 200 M190 120 L180 200 M256 120 V200 M322 120 L332 200 M382 120 L402 200", 4),
          `<rect x="110" y="260" width="160" height="120" stroke-width="5"/>`, `<rect x="306" y="250" width="96" height="220"/>`, dot(320, 360, 6), `<rect x="70" y="60" width="372" height="60" rx="8"/>`, F.word("SHOP", 184, 70, 0.9, 6, 42), ground].join("\n"); }
      if (k === "tent") return [`<path d="M256 70 L470 460 H42 Z"/>`, `<path d="M256 70 L196 460 H316 Z" stroke-width="5"/>`, tubes(["M256 70 L240 40"], 6), det("M42 460 L20 480 M470 460 L492 480", 5), ground].join("\n");
      if (k === "igloo") { const rows = [400, 340, 280, 220]; let d = rows.map((y) => { const w = Math.sqrt(200 * 200 - (440 - y) ** 2); return `M${n1(256 - w)} ${y} H${n1(256 + w)}`; }).join(" ");
        return [`<path d="M56 440 A200 200 0 0 1 456 440 Z"/>`, det(d, 4), `<path d="M190 440 V380 C190 320 322 320 322 380 V440 Z"/>`, det("M180 470 H332", 6)].join("\n"); }
      return "";
    }
  };

  /* ---------- balls ---------- */
  FAM.ball = {
    name: "Ball",
    params: { kind: ["plain", "cricket", "tennis", "volleyball", "beach"] },
    build(p) {
      const out = [`<defs><clipPath id="ball"><circle cx="256" cy="256" r="200"/></clipPath></defs>`, `<circle cx="256" cy="256" r="200"/>`];
      const inner = [];
      if (p.kind === "cricket") { inner.push(det("M226 56 C190 190 190 322 226 456 M286 56 C250 190 250 322 286 456", 5));
        for (let y = 80; y < 440; y += 24) { const x = 256 - 36 * Math.sin(Math.PI * (y - 56) / 400); inner.push(det(`M${n1(x - 26)} ${y} l-12 -6 M${n1(x + 26)} ${y} l12 -6`, 3.5)); } }
      if (p.kind === "tennis") inner.push(det("M70 140 C170 200 170 312 70 372 M442 140 C342 200 342 312 442 372", 6));
      if (p.kind === "volleyball") inner.push(det("M256 256 C260 160 220 90 150 70 M256 256 C340 210 380 140 380 90 M256 256 C190 300 160 380 170 450 M256 256 C330 300 420 300 456 260", 6));
      if (p.kind === "beach") inner.push(det(Array.from({ length: 6 }, (_, k) => { const a = k * 60 + 10; return `M${f2(P(226, 196, 30, a))} Q${f2(P(226, 196, 150, a - 12))} ${f2(P(256, 256, 204, a + 28))}`; }).join(" "), 6));
      out.push(`<g clip-path="url(#ball)">${inner.join("")}</g>`, `<circle cx="256" cy="256" r="200" fill="none"/>`);
      if (p.kind === "beach") out.push(`<circle cx="226" cy="196" r="30"/>`);
      out.push(det("M120 170 C136 130 162 104 192 90", 7));
      return out.join("\n");
    }
  };

  /* ---------- numbers & counting ---------- */
  FAM.counting = {
    name: "Numbers & counting",
    params: { kind: ["number", "letter", "clock", "dice", "ten-frame", "tally", "domino", "number-line"] },
    build(p) {
      const k = p.kind, out = [];
      if (k === "number" || k === "letter") {
        const t = String(p.value ?? (k === "number" ? 5 : "A")).toUpperCase().slice(0, 2);
        const s = t.length === 1 ? 8.4 : 5.2, w = 34 * s;
        [...t].forEach((ch, i) => {
          const d = k === "number" ? F.DIG[ch] : F.LET[ch]; if (!d) return;
          const x = 256 - (t.length - 1) * w / 2 + i * w - 14 * s, y = 256 - 20 * s;
          out.push(`<g transform="translate(${n1(x)} ${n1(y)}) scale(${s})"><path d="${d}" fill="none" stroke-width="${n1(62 / s)}"/><path d="${d}" fill="none" stroke="${W}" stroke-width="${n1(46 / s)}"/></g>`);
          out.push(`<g transform="translate(${n1(x)} ${n1(y)}) scale(${s})"><path d="${d}" fill="none" stroke-width="${n1(3 / s)}" stroke-dasharray="${n1(10 / s)} ${n1(12 / s)}"/></g>`);
        });
        return out.join("\n");
      }
      if (k === "clock") {
        const h = +(p.h ?? 3), m = +(p.m ?? 0);
        out.push(`<circle cx="256" cy="256" r="210"/><circle cx="256" cy="256" r="186" stroke-width="5"/>`);
        for (let i = 1; i <= 12; i++) { const [x, y] = P(256, 256, 150, i * 30 - 90); out.push(num(i, x, y, 0.62, 5)); }
        out.push(det(Array.from({ length: 60 }, (_, i) => i % 5 ? `M${f2(P(256, 256, 176, i * 6))} L${f2(P(256, 256, 184, i * 6))}` : "").join(" "), 3.5));
        out.push(det(`M256 256 L${f2(P(256, 256, 90, (h % 12) * 30 + m * 0.5 - 90))}`, 12), det(`M256 256 L${f2(P(256, 256, 140, m * 6 - 90))}`, 7), `<circle cx="256" cy="256" r="12" fill="${K}" stroke-width="2"/>`);
        return out.join("\n");
      }
      if (k === "dice") {
        const n = Math.max(1, Math.min(6, +(p.value ?? 5)));
        const L = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
        out.push(`<rect x="66" y="66" width="380" height="380" rx="56"/>`, ...L.map(([a, b]) => `<circle cx="${256 + a * 100}" cy="${256 + b * 100}" r="34" fill="${K}" stroke-width="2"/>`));
        return out.join("\n");
      }
      if (k === "ten-frame") {
        const n = Math.max(0, Math.min(10, +(p.value ?? 7)));
        out.push(`<rect x="36" y="146" width="440" height="220"/>`, det("M124 146 V366 M212 146 V366 M300 146 V366 M388 146 V366 M36 256 H476", 6));
        for (let i = 0; i < n; i++) out.push(`<circle cx="${80 + (i % 5) * 88}" cy="${201 + Math.floor(i / 5) * 110}" r="32"/>`);
        return out.join("\n");
      }
      if (k === "tally") {
        const n = Math.max(1, Math.min(20, +(p.value ?? 7))), groups = Math.ceil(n / 5); let d = "";
        for (let g = 0; g < groups; g++) {
          const cnt = Math.min(5, n - g * 5), gx = 256 - (groups * 150 - 30) / 2 + g * 150;
          for (let i = 0; i < Math.min(4, cnt); i++) d += `M${gx + i * 30} 100 V412 `;
          if (cnt === 5) d += `M${gx - 22} 370 L${gx + 112} 142 `;
        }
        return det(d, 12);
      }
      if (k === "domino") {
        const a = +(p.value ?? 3), b = +(p.value2 ?? 4);
        const L = { 0: [], 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
        out.push(`<rect x="146" y="30" width="220" height="452" rx="30"/>`, det("M166 256 H346", 6));
        [[a, 143], [b, 369]].forEach(([v, cy]) => (L[v] || []).forEach(([x, y]) => out.push(`<circle cx="${256 + x * 58}" cy="${cy + y * 64}" r="22" fill="${K}" stroke-width="2"/>`)));
        return out.join("\n");
      }
      if (k === "number-line") {
        const a = +(p.value ?? 0), b = Math.min(a + 10, +(p.value2 ?? a + 10)), n = b - a, step = 400 / n;
        out.push(det("M40 256 H472", 7), `<path d="M30 256 L56 240 V272 Z M482 256 L456 240 V272 Z" fill="${K}" stroke-width="3"/>`);
        for (let i = 0; i <= n; i++) { const x = 56 + i * step; out.push(det(`M${n1(x)} 230 V282`, 6), num(a + i, x, 324, a + i >= 10 ? 0.5 : 0.62, 5)); }
        return out.join("\n");
      }
      return "";
    }
  };

  /* ---------- people (front view, standing) ---------- */
  FAM.person = {
    name: "Person",
    params: { who: ["boy", "girl", "school-boy", "school-girl", "man", "woman", "teacher", "family"], pose: ["stand", "wave"] },
    build(p) {
      if (p.who === "family") {
        const fig = (who, cx, s) => { const b = FAM.person.build({ who, pose: "stand" }); return `<g transform="translate(${n1(cx - 256 * s)} ${n1(470 - 470 * s)})">${shrink(b, s)}</g>`; };
        return [fig("man", 110, 0.56), fig("woman", 214, 0.54), fig("girl", 318, 0.44), fig("boy", 412, 0.42)].join("\n");
      }
      const adult = ["man", "woman", "teacher"].includes(p.who);
      const girl = ["girl", "school-girl", "woman", "teacher"].includes(p.who);
      const G = adult ? { hy: 86, hr: 44, sh: 150, wa: 292, ft: 456, sw: 56, aw: 24, lw: 26 } : { hy: 120, hr: 54, sh: 196, wa: 320, ft: 456, sw: 50, aw: 22, lw: 22 };
      const { hy, hr, sh, wa, ft, sw, aw, lw } = G, cx = 256, out = [];
      const dress = p.who === "girl" || p.who === "school-girl";      // frock / pinafore
      const kurta = p.who === "woman" || p.who === "teacher";        // long top over trousers
      const shorts = p.who === "boy" || p.who === "school-boy";
      const hem = dress ? wa + 66 : kurta ? wa + 70 : wa;
      // hair that sits behind the head
      if (p.who === "woman" || p.who === "teacher") out.push(`<circle cx="${cx}" cy="${hy - hr - 6}" r="${n1(hr * 0.42)}"/>`);
      if (p.who === "school-girl") out.push(tubes([`M${cx - hr + 6} ${hy + 4} C${cx - hr - 6} ${hy + 50} ${cx - hr - 4} ${hy + 80} ${cx - hr - 10} ${sh + 40}`, `M${cx + hr - 6} ${hy + 4} C${cx + hr + 6} ${hy + 50} ${cx + hr + 4} ${hy + 80} ${cx + hr + 10} ${sh + 40}`], 16));
      if (p.who === "girl") out.push(`<path d="${bumpy(cx - hr - 16, hy - 20, 26, 34, 7, 0.6)}"/><path d="${bumpy(cx + hr + 16, hy - 20, 26, 34, 7, 0.6)}"/>`);
      // legs and shoes
      const legTop = dress ? hem - 10 : kurta ? hem - 10 : wa + 40;
      out.push(tubes([`M${cx - 24} ${legTop} V${ft - 10}`, `M${cx + 24} ${legTop} V${ft - 10}`], lw));
      if (dress || shorts) out.push(det(`M${cx - 36} ${ft - 40} H${cx - 12} M${cx + 12} ${ft - 40} H${cx + 36}`, 4)); // socks
      out.push(`<path d="M${cx - 50} ${ft + 4} C${cx - 52} ${ft - 18} ${cx - 10} ${ft - 22} ${cx - 8} ${ft - 2} V${ft + 6} H${cx - 46} Z"/>`,
               `<path d="M${cx + 50} ${ft + 4} C${cx + 52} ${ft - 18} ${cx + 10} ${ft - 22} ${cx + 8} ${ft - 2} V${ft + 6} H${cx + 46} Z"/>`);
      // trousers / shorts
      if (!dress) {
        const bot = shorts ? wa + 62 : ft - 16;
        out.push(`<path d="M${cx - sw + 6} ${wa - 4} H${cx + sw - 6} L${cx + sw - 2} ${bot} H${cx + 6} L${cx} ${wa + 30} L${cx - 6} ${bot} H${cx - sw + 2} Z"/>`);
      }
      // arms (behind the body), hands
      const lh = [cx - sw - 18, wa - 6], rh = p.pose === "wave" ? [cx + sw + 60, sh - 60] : [cx + sw + 18, wa - 6];
      out.push(tubes([`M${cx - sw + 8} ${sh + 14} L${lh[0]} ${lh[1]}`, `M${cx + sw - 8} ${sh + 14} L ${rh[0]} ${rh[1]}`], aw));
      out.push(`<circle cx="${lh[0]}" cy="${lh[1] + 10}" r="${aw * 0.62}"/><circle cx="${rh[0]}" cy="${rh[1] + (p.pose === "wave" ? -10 : 10)}" r="${aw * 0.62}"/>`);
      // body: top (shirt / frock / kurta)
      const top = (bottom, flare) => `M${cx - sw} ${sh + 8} Q${cx - sw + 4} ${sh - 4} ${cx - 22} ${sh - 6} H${cx + 22} Q${cx + sw - 4} ${sh - 4} ${cx + sw} ${sh + 8} ` +
        `L${cx + sw - 6} ${wa - 30} L${cx + sw - 6 + flare} ${bottom} H${cx - sw + 6 - flare} L${cx - sw + 6} ${wa - 30} Z`;
      out.push(`<path d="${top(hem, dress ? 46 : kurta ? 14 : 0)}"/>`);
      if (!adult) out.push(`<path d="M${cx - sw} ${sh + 8} L${cx - sw - 22} ${sh + 56} L${cx - sw + 4} ${sh + 66} Z"/>`,
        p.pose === "wave" ? `<path d="M${cx + sw} ${sh + 8} L${cx + sw + 30} ${sh + 30} L${cx + sw + 10} ${sh + 56} Z"/>` : `<path d="M${cx + sw} ${sh + 8} L${cx + sw + 22} ${sh + 56} L${cx + sw - 4} ${sh + 66} Z"/>`);
      if (adult) out.push(det(`M${lh[0] - 12} ${lh[1] - 12} L${lh[0] + 12} ${lh[1] - 6} M${rh[0] - 12} ${rh[1] + (p.pose === "wave" ? 6 : -12)} L${rh[0] + 12} ${rh[1] + (p.pose === "wave" ? 16 : -6)}`, 4));
      // collar, buttons, tie, belt, dress details
      out.push(det(`M${cx - 22} ${sh - 4} L${cx} ${sh + 22} L${cx + 22} ${sh - 4}`, 5));
      if (p.who === "school-boy" || p.who === "school-girl") out.push(`<path d="M${cx - 8} ${sh + 18} H${cx + 8} L${cx + 12} ${sh + 30} L${cx + 6} ${wa - 40} L${cx} ${wa - 28} L${cx - 6} ${wa - 40} L${cx - 12} ${sh + 30} Z" stroke-width="5"/>`);
      else if (!dress) out.push(dot(cx, sh + 40, 4), dot(cx, sh + 70, 4), dot(cx, sh + 100, 4));
      if (p.who === "man" || shorts) out.push(det(`M${cx - sw + 6} ${wa - 4} H${cx + sw - 6}`, 5));
      if (dress) out.push(det(`M${cx - sw + 6} ${wa - 30} H${cx + sw - 6}`, 5), det(Array.from({ length: 7 }, (_, i) => { const x = cx - sw - 40 + i * (2 * sw + 80) / 7; return `M${n1(x)} ${hem} Q${n1(x + (sw + 40) / 7)} ${hem - 14} ${n1(x + (2 * sw + 80) / 7)} ${hem}`; }).join(" "), 4));
      if (p.who === "school-girl") out.push(det(`M${cx - sw + 14} ${sh + 4} V${wa - 30} M${cx + sw - 14} ${sh + 4} V${wa - 30}`, 5));
      if (kurta) out.push(det(`M${cx - sw + 6} ${hem - 24} H${cx + sw - 6}`, 4), `<path d="M${cx - sw - 4} ${sh + 6} C${cx - 20} ${sh + 70} ${cx + 30} ${sh + 90} ${cx + sw + 4} ${sh + 120}" fill="none" stroke-width="10"/>`);
      if (p.who === "teacher") out.push(`<g transform="rotate(-12 ${lh[0] + 10} ${lh[1] - 30})"><rect x="${lh[0] - 30}" y="${lh[1] - 70}" width="66" height="84" rx="4"/>${det(`M${lh[0] + 3} ${lh[1] - 70} V${lh[1] + 14}`, 4)}</g>`);
      // head
      out.push(`<rect x="${cx - 12}" y="${hy + hr - 6}" width="24" height="${sh - hy - hr + 4}" rx="4"/>`);
      out.push(`<circle cx="${cx - hr}" cy="${hy + 4}" r="${n1(hr * 0.22)}"/><circle cx="${cx + hr}" cy="${hy + 4}" r="${n1(hr * 0.22)}"/>`);
      out.push(`<circle cx="${cx}" cy="${hy}" r="${hr}"/>`);
      // hair on top
      const capLong = girl ? hr * 0.18 : 0;
      out.push(`<path d="M${n1(cx - hr - 2)} ${n1(hy + 6 + capLong)} C${n1(cx - hr - 6)} ${n1(hy - hr * 1.45)} ${n1(cx + hr + 6)} ${n1(hy - hr * 1.45)} ${n1(cx + hr + 2)} ${n1(hy + 6 + capLong)} ` +
        `C${n1(cx + hr * 0.8)} ${n1(hy - hr * 0.3)} ${n1(cx + hr * 0.3)} ${n1(hy - hr * 0.5)} ${cx} ${n1(hy - hr * 0.42)} C${n1(cx - hr * 0.4)} ${n1(hy - hr * 0.5)} ${n1(cx - hr * 0.7)} ${n1(hy - hr * 0.2)} ${n1(cx - hr - 2)} ${n1(hy + 6 + capLong)} Z"/>`);
      if (p.who === "girl") out.push(`<path d="M${cx + hr * 0.5} ${hy - hr * 0.9} l18 -14 v28 Z M${cx + hr * 0.5} ${hy - hr * 0.9} l-18 -14 v28 Z" stroke-width="5"/>`);
      if (p.who === "school-girl") out.push(`<path d="M${cx - hr - 10} ${sh + 40} l-14 10 l14 10 l14 -10 Z M${cx + hr + 10} ${sh + 40} l-14 10 l14 10 l14 -10 Z" stroke-width="4"/>`);
      // face
      const k = hr / 54;
      out.push(eye(n1(cx - 20 * k), n1(hy + 4 * k), n1(7 * k)), eye(n1(cx + 20 * k), n1(hy + 4 * k), n1(7 * k)));
      out.push(det(`M${n1(cx - 2 * k)} ${n1(hy + 14 * k)} l${n1(4 * k)} ${n1(8 * k)}`, 4), det(`M${n1(cx - 16 * k)} ${n1(hy + 28 * k)} C${n1(cx - 8 * k)} ${n1(hy + 38 * k)} ${n1(cx + 8 * k)} ${n1(hy + 38 * k)} ${n1(cx + 16 * k)} ${n1(hy + 28 * k)}`, 5));
      return out.join("\n");
    }
  };

  /* =====================================================================
     CATALOG — object name → recipe.  [family, params, category, aliases, description]
     ===================================================================== */
  const C = {};
  const add = (name, fam, params, cat, aliases = [], desc = "") => { C[name] = { name, fam, params, cat, aliases, desc }; };

  // fruits & vegetables
  add("apple", "fruit", { shape: "apple", texture: "speckles", top: "stem-leaf" }, "fruits", ["seb", "सेब"], "an apple with a stem and a leaf");
  add("orange", "fruit", { shape: "round", texture: "dimples", top: "stem-leaf" }, "fruits", ["santra", "narangi", "संतरा"], "an orange with a dimpled peel and a small leaf");
  add("lemon", "fruit", { shape: "lemon", texture: "dimples", top: "none" }, "fruits", ["nimbu", "नींबू", "lime"], "a lemon with pointed ends and a dimpled peel");
  add("tomato", "fruit", { shape: "wide", texture: "none", top: "calyx" }, "vegetables", ["tamatar", "टमाटर"], "a tomato with its green star-shaped top");
  add("watermelon", "fruit", { shape: "wide", texture: "stripes", top: "stem" }, "fruits", ["tarbooz", "तरबूज"], "a whole watermelon with wavy stripes");
  add("pumpkin", "fruit", { shape: "wide", texture: "ridges", top: "stem" }, "vegetables", ["kaddu", "कद्दू"], "a pumpkin with deep ridges and a thick stem");
  add("pomegranate", "fruit", { shape: "round", texture: "none", top: "crown" }, "fruits", ["anar", "अनार"], "a pomegranate with its little crown on top");
  add("peach", "fruit", { shape: "round", texture: "cleft", top: "stem-leaf" }, "fruits", ["aadu"], "a peach with a soft groove down one side");
  add("plum", "fruit", { shape: "round", texture: "cleft", top: "stem" }, "fruits", ["aloo bukhara"], "a plum with a groove and a short stem");
  add("guava", "fruit", { shape: "round", texture: "speckles", top: "calyx" }, "fruits", ["amrood", "अमरूद"], "a guava with a speckled skin");
  add("pear", "fruit", { shape: "pear", texture: "speckles", top: "stem-leaf" }, "fruits", ["nashpati", "नाशपाती"], "a pear with a stem and a leaf");
  add("onion", "fruit", { shape: "drop", texture: "ridges", top: "sprout" }, "vegetables", ["pyaaz", "pyaz", "प्याज"], "an onion with lines running down its layers");
  add("radish", "fruit", { shape: "root", texture: "none", top: "leafy" }, "vegetables", ["mooli", "मूली"], "a round radish with leaves on top");
  add("beetroot", "fruit", { shape: "root", texture: "speckles", top: "leafy" }, "vegetables", ["chukandar"], "a beetroot with leaves");
  add("orange slice", "slice", { inside: "segments" }, "fruits", ["orange half", "cut orange", "lemon slice"], "an orange cut in half showing its segments");
  add("kiwi slice", "slice", { inside: "seeds-ring" }, "fruits", ["cut kiwi", "kiwi half"], "a kiwi cut in half with a ring of seeds");
  add("apple slice", "slice", { inside: "seeds-star" }, "fruits", ["cut apple", "apple half"], "an apple cut across showing the seed star");
  add("tree rings", "slice", { inside: "rings" }, "nature-environment", ["log", "tree stump"], "a cut log showing tree rings");

  // animal faces
  ["cat", "dog", "rabbit", "mouse", "bear", "panda", "lion", "tiger", "pig", "cow", "monkey", "fox", "elephant", "sheep", "frog", "owl"].forEach((a) =>
    add(a + " face", "face", { animal: a }, a === "owl" ? "birds" : "animals",
      [a, { cat: ["billi", "बिल्ली", "kitten"], dog: ["kutta", "कुत्ता", "puppy"], rabbit: ["khargosh", "bunny"], mouse: ["chuha", "rat"], bear: ["bhalu", "भालू"],
        lion: ["sher", "शेर"], tiger: ["bagh", "बाघ"], pig: ["suar"], cow: ["gaay", "gai", "गाय"], monkey: ["bandar", "बंदर"], fox: ["lomdi"], elephant: ["hathi", "haathi", "हाथी"],
        sheep: ["bhed", "lamb"], frog: ["medhak", "मेंढक"], owl: ["ullu", "उल्लू"], panda: [] }[a]].flat(), `the friendly face of a ${a}`));

  // vehicles
  add("car", "vehicle", { kind: "car" }, "transport", ["gaadi", "गाड़ी", "motor car"], "a car seen from the side");
  add("taxi", "vehicle", { kind: "taxi" }, "transport", ["cab"], "a taxi with a sign on its roof");
  add("bus", "vehicle", { kind: "bus" }, "transport", ["बस"], "a bus with a row of windows");
  add("school bus", "vehicle", { kind: "school-bus" }, "transport", [], "a school bus with SCHOOL BUS written on its side");
  add("van", "vehicle", { kind: "van" }, "transport", ["minivan"], "a van seen from the side");
  add("truck", "vehicle", { kind: "truck" }, "transport", ["lorry", "ट्रक"], "a truck with a cargo box");
  add("jeep", "vehicle", { kind: "jeep" }, "transport", ["suv"], "a jeep with a spare wheel at the back");

  // flowers & trees
  add("flower", "flower", { petals: 6, petal: "round", pot: false }, "flowers-plants", ["phool", "फूल"], "a flower with round petals, a stem and two leaves");
  add("daisy", "flower", { petals: 16, petal: "long", pot: false }, "flowers-plants", [], "a daisy with many long petals");
  add("marigold", "flower", { petals: 6, petal: "frilly", pot: false }, "flowers-plants", ["genda", "गेंदा"], "a frilly marigold flower");
  add("star flower", "flower", { petals: 5, petal: "pointed", pot: false }, "flowers-plants", ["periwinkle", "sadabahar"], "a flower with five pointed petals");
  add("flower in a pot", "flower", { petals: 8, petal: "round", pot: true }, "flowers-plants", ["potted flower", "plant pot flower"], "a flower growing in a pot");
  add("tree", "tree", { kind: "round" }, "flowers-plants", ["ped", "पेड़"], "a tree with a round leafy top");
  add("pine tree", "tree", { kind: "pine" }, "flowers-plants", ["fir tree", "deodar"], "a tall pine tree");
  add("fruit tree", "tree", { kind: "fruit" }, "flowers-plants", ["apple tree", "mango tree"], "a tree with fruits");
  add("bush", "tree", { kind: "bush" }, "flowers-plants", ["jhadi", "shrub"], "a round bush");
  add("christmas tree", "tree", { kind: "christmas" }, "flowers-plants", ["xmas tree"], "a Christmas tree with a star and baubles");

  // containers
  const CONT = { cup: ["teacup", "cup and saucer", "kap"], mug: [], glass: ["glass of water", "gilas"], bottle: ["botal"], jar: [], vase: ["flower vase"], "flower-pot": ["gamla", "pot"],
    bowl: ["katori"], bucket: ["balti", "बाल्टी"], matka: ["clay pot", "ghada", "pitcher", "surahi"], bell: ["ghanti", "घंटी"], diya: ["lamp", "deepak", "दीया", "oil lamp"] };
  Object.entries(CONT).forEach(([k, al]) => add(k.replace("-", " "), "container", { kind: k }, ["diya", "matka", "bell"].includes(k) ? "household" : "household", al, `a ${k.replace("-", " ")}`));

  // shapes
  ["circle", "oval", "square", "rectangle", "triangle", "rhombus", "kite shape", "heart", "arrow", "cross", "semicircle"].forEach((s) => add(s, "shape", { kind: s.replace(" shape", "") }, "shapes-colors", s === "rhombus" ? ["diamond shape"] : s === "cross" ? ["plus shape"] : [], `a ${s}`));
  const PN = { 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon" };
  Object.entries(PN).forEach(([n, nm]) => add(nm, "shape", { kind: "polygon", sides: +n }, "shapes-colors", [`${n} sides`], `a ${nm} with ${n} equal sides`));
  add("star", "shape", { kind: "star", points: 5 }, "shapes-colors", ["tara", "तारा"], "a five-pointed star");
  ["cube", "cuboid", "cylinder", "cone", "sphere", "pyramid", "hemisphere"].forEach((s) => add(s, "shape", { kind: s }, "shapes-colors", [], `a ${s} with hidden edges dashed`));
  add("triangular prism", "shape", { kind: "prism" }, "shapes-colors", ["prism"], "a triangular prism with hidden edges dashed");

  // sky & weather
  [["sun", ["suraj", "सूरज"]], ["cloud", ["badal", "बादल"]], ["rain", ["baarish", "rain cloud", "बारिश"]], ["snow", ["snow cloud", "barf"]], ["lightning", ["thunder", "bijli"]],
   ["moon", ["chand", "चाँद", "crescent moon"]], ["rainbow", ["indradhanush"]]].forEach(([k, al]) => add(k, "sky", { kind: k, face: false }, "nature-environment", al, `a ${k}`));
  add("smiling sun", "sky", { kind: "sun", face: true }, "nature-environment", ["happy sun"], "a smiling sun");

  // feelings
  ["happy", "sad", "angry", "surprised", "sleepy", "crying", "laughing", "scared"].forEach((m) => add(m + " face", "feeling", { mood: m }, "body-parts", [m, m === "happy" ? "smiley" : ""].filter(Boolean), `a ${m} face`));

  // buildings
  [["house", ["ghar", "घर", "home"]], ["hut", ["jhopdi", "झोपड़ी"]], ["flats", ["building", "apartment"]], ["shop", ["dukaan", "दुकान", "store"]], ["tent", ["camp"]], ["igloo", []]]
    .forEach(([k, al]) => add(k, "building", { kind: k }, "household", al, `a ${k}`));

  // people
  [["boy", "boy", ["ladka", "लड़का", "child", "kid"], "a boy in a T-shirt and shorts"],
   ["girl", "girl", ["ladki", "लड़की"], "a girl in a frock with two bunches of hair"],
   ["school boy", "school-boy", ["student", "schoolboy", "boy in uniform"], "a schoolboy in uniform with a tie"],
   ["school girl", "school-girl", ["schoolgirl", "girl in uniform"], "a schoolgirl in uniform with two braids and a tie"],
   ["man", "man", ["aadmi", "father", "papa", "आदमी"], "a man in a shirt and trousers"],
   ["woman", "woman", ["aurat", "mother", "mummy", "lady", "औरत"], "a woman in a kurta with a dupatta"],
   ["teacher", "teacher", ["shikshak", "madam", "teacher with book", "शिक्षक"], "a teacher holding a book"],
   ["family", "family", ["parivar", "परिवार"], "a family: father, mother, girl and boy"]]
    .forEach(([nm, who, al, d]) => add(nm, "person", { who, pose: "stand" }, "body-parts", al, d));

  // balls
  [["ball", "plain", ["gend", "गेंद"]], ["cricket ball", "cricket", []], ["tennis ball", "tennis", []], ["volleyball", "volleyball", []], ["beach ball", "beach", []]]
    .forEach(([nm, k, al]) => add(nm, "ball", { kind: k }, "sports", al, `a ${nm}`));

  /* =====================================================================
     make(query) — understand what was typed and build drawings.
     ===================================================================== */
  const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f:\s-]/g, " ").replace(/\s+/g, " ").trim();
  function lev(a, b) {
    const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  const singular = (w) => w.replace(/ies$/, "y").replace(/(ch|sh|x|o)es$/, "$1").replace(/s$/, "");

  /** Find catalog entries for a name. Returns [{entry, score}] best first. */
  function lookup(q) {
    q = norm(q); const qs = q.split(" ").map(singular).join(" ");
    const res = [];
    for (const e of Object.values(C)) {
      const names = [e.name, ...e.aliases].map(norm);
      let best = 99;
      for (const n of names) {
        if (n === q || n === qs) best = 0;
        else if (n.replace(/ face$/, "") === qs) best = Math.min(best, 0.5);
        else if (n.includes(qs) && qs.length >= 3) best = Math.min(best, 1);
        else { const dd = lev(n, qs); if (dd <= Math.max(1, Math.floor(n.length / 4))) best = Math.min(best, 1 + dd); }
      }
      if (best < 99) res.push({ entry: e, score: best });
    }
    return res.sort((a, b) => a.score - b.score);
  }

  function wrap(title, desc, body, cat, file, code) { return { title, desc, category: cat, file, body, svg: F.svg(title, desc, body), code }; }
  const codeFor = (fam, params, seed) => `// Made by the FLN generator. Change the settings and the drawing updates.\nreturn gen("${fam}", ${JSON.stringify(params)}, ${seed});`;

  /** A few recipes reach the canvas edge: shrink them a little around the centre. */
  const FIT = { onion: 0.9, radish: 0.94, beetroot: 0.94, "rabbit face": 0.88, "lion face": 0.9, jeep: 0.94, daisy: 0.9, marigold: 0.92 };
  function fromEntry(e, seed = 1, over = {}) {
    const params = Object.assign({}, e.params, over);
    let body = FAM[e.fam].build(params, seed);
    if (FIT[e.name]) body = `<g transform="translate(256 256) scale(${FIT[e.name]}) translate(-256 -256)">${body}</g>`;
    const title = cap(e.name);
    return wrap(title, `Line drawing of ${e.desc || "a " + e.name}.`, body, e.cat, e.name.replace(/\s+/g, "-"), codeFor(e.fam, params, seed));
  }

  /** Read the query and return { results: [...drawings], note, suggestions }. */
  function make(query) {
    const q = norm(query);
    if (!q) return { results: [], note: "Type the name of an object." };
    let m;
    // clock 3:30 / clock showing 7 o'clock
    if ((m = q.match(/clock.*?(\d{1,2})(?::(\d{2}))?/)) || (m = q.match(/(\d{1,2}):(\d{2})/))) {
      const h = +m[1], mi = +(m[2] || 0), p = { kind: "clock", h, m: mi };
      const t = `Clock showing ${h}:${String(mi).padStart(2, "0")}`;
      return { results: [wrap(t, `Line drawing of a clock face with numbers 1 to 12 showing ${h}:${String(mi).padStart(2, "0")}.`, FAM.counting.build(p), "numbers-counting", `clock-${h}-${String(mi).padStart(2, "0")}`, codeFor("counting", p, 1))] };
    }
    if ((m = q.match(/^(?:number|digit|trace|tracing)\s+(\d{1,2})$/)) || (m = q.match(/^(\d{1,2})$/))) {
      const p = { kind: "number", value: m[1] };
      return { results: [wrap(`Number ${m[1]}`, `Outline of the number ${m[1]} for tracing, with a dashed guide line.`, FAM.counting.build(p), "numbers-counting", `number-${m[1]}`, codeFor("counting", p, 1))] };
    }
    if ((m = q.match(/^(?:letter|alphabet|trace|tracing)\s+([a-z])$/)) || (m = q.match(/^([a-z])$/))) {
      const L = m[1].toUpperCase(), p = { kind: "letter", value: L };
      return { results: [wrap(`Letter ${L}`, `Outline of the capital letter ${L} for tracing, with a dashed guide line.`, FAM.counting.build(p), "numbers-counting", `letter-${L.toLowerCase()}`, codeFor("counting", p, 1))] };
    }
    if ((m = q.match(/^(dice|die|ten frame|tally|tally marks)\s*(?:of|showing|with)?\s*(\d{1,2})$/)) || (m = q.match(/^(\d{1,2})\s*(?:on a|on|in a)?\s*(dice|die|ten frame|tally|tally marks)$/))) {
      const word = isNaN(m[1]) ? m[1] : m[2], n = isNaN(m[1]) ? +m[2] : +m[1];
      const kind = /dic|die/.test(word) ? "dice" : /frame/.test(word) ? "ten-frame" : "tally", p = { kind, value: n };
      const nm = { dice: "Dice", "ten-frame": "Ten frame", tally: "Tally marks" }[kind];
      return { results: [wrap(`${nm} ${n}`, `Line drawing of ${nm.toLowerCase()} showing ${n}.`, FAM.counting.build(p), "numbers-counting", `${kind}-${n}`, codeFor("counting", p, 1))] };
    }
    if ((m = q.match(/^domino\s*(\d)\s*(?:and|\||-|,)?\s*(\d)$/))) {
      const p = { kind: "domino", value: +m[1], value2: +m[2] };
      return { results: [wrap(`Domino ${m[1]} and ${m[2]}`, `Line drawing of a domino with ${m[1]} dots and ${m[2]} dots.`, FAM.counting.build(p), "numbers-counting", `domino-${m[1]}-${m[2]}`, codeFor("counting", p, 1))] };
    }
    if ((m = q.match(/^number line\s*(\d{1,2})?\s*(?:to|-)?\s*(\d{1,2})?$/))) {
      const a = +(m[1] || 0), b = +(m[2] || a + 10), p = { kind: "number-line", value: a, value2: b };
      return { results: [wrap(`Number line ${a} to ${Math.min(b, a + 10)}`, `Line drawing of a number line from ${a} to ${Math.min(b, a + 10)}.`, FAM.counting.build(p), "numbers-counting", `number-line-${a}-${Math.min(b, a + 10)}`, codeFor("counting", p, 1))] };
    }
    // "5 apples", "three cats"
    if ((m = q.match(/^(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+)$/))) {
      const n = Math.max(1, Math.min(12, isNaN(m[1]) ? WORDNUM[m[1]] : +m[1]));
      const hit = lookup(m[2])[0];
      if (hit && hit.score <= 1.5) {
        const e = hit.entry, one = FAM[e.fam].build(e.params, 1);
        const cols = n <= 3 ? n : n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols);
        const cell = Math.min(470 / cols, 470 / rows), s = cell / 512 * 0.96;
        let body = "";
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
          const x = 256 - inRow * cell / 2 + c * cell, y = 256 - rows * cell / 2 + r * cell;
          body += `<g transform="translate(${n1(x + cell * 0.03)} ${n1(y + cell * 0.03)})">${shrink(one.replace(/id="ball"/g, `id="b${i}"`).replace(/url\(#ball\)/g, `url(#b${i})`), s)}</g>`;
        }
        const plural = n === 1 ? e.name : e.name.replace(/ face$/, "") + (/(s|sh|ch|x)$/.test(e.name) ? "es" : "s");
        return { results: [wrap(`${n} ${plural}`, `Line drawing of ${n} ${plural} for counting.`, body, "numbers-counting", `${n}-${plural.replace(/\s+/g, "-")}`, null)] };
      }
    }
    const hits = lookup(q);
    if (!hits.length || hits[0].score > 2) {
      return { results: [], note: `There is no recipe for “${query}” yet.`, suggestions: hits.slice(0, 4).map((h) => h.entry.name) };
    }
    const e = hits[0].entry;
    const results = [fromEntry(e, 1), fromEntry(e, 2), fromEntry(e, 3)];
    // vary something visible for families that have options
    if (e.fam === "sky") results[1] = fromEntry(e, 2, { face: true });
    if (e.fam === "fruit" && e.params.top !== "none") results[2] = fromEntry(e, 3, { top: e.params.top === "stem-leaf" ? "stem" : "stem-leaf" });
    if (e.fam === "person" && e.params.who !== "family") results[1] = fromEntry(e, 2, { pose: "wave" });
    if (e.fam === "flower") { results[1] = fromEntry(e, 2, { pot: !e.params.pot }); results[2] = fromEntry(e, 3, { petals: e.params.petals === 6 ? 8 : 6 }); }
    const unique = [], seen = new Set();
    for (const r of results) if (!seen.has(r.svg)) { seen.add(r.svg); unique.push(r); }
    return { results: unique, note: hits[0].score > 0.5 ? `Showing “${e.name}”.` : "", suggestions: hits.slice(1, 5).map((h) => h.entry.name) };
  }

  /** gen(family, params, seed) → drawing body. Available inside the Draw editor. */
  function gen(fam, params, seed = 1) {
    if (!FAM[fam]) throw new Error(`Unknown family "${fam}". Try: ${Object.keys(FAM).join(", ")}`);
    return FAM[fam].build(params || {}, seed);
  }

  F.gen = gen;
  global.FLNGen = { make, lookup, gen, families: FAM, catalog: C, examples: ["orange", "cat", "school bus", "5 apples", "clock 3:30", "letter B", "number 7", "dice 4", "ten frame 6", "marigold", "matka", "happy face", "hut", "cricket ball", "hexagon", "rainbow", "kiwi slice"] };
})(window);
