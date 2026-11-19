/* FLN SVG Studio — style checker.
 * Checks an SVG against the FLN style guide and measures how much ink it uses.
 */
(function (global) {
  "use strict";
  const OK_FILL = new Set(["#ffffff", "#fff", "white", "#1a1a1a", "none", "currentcolor", "inherit"]);
  const OK_STROKE = new Set(["#1a1a1a", "#ffffff", "#fff", "white", "none", "inherit"]);
  const BANNED = ["image", "text", "filter", "lineargradient", "radialgradient", "pattern", "script", "foreignobject", "style", "mask", "font"];

  function check(svgText) {
    const out = [];
    const add = (level, msg) => out.push({ level, msg });
    let doc;
    try { doc = new DOMParser().parseFromString(svgText, "image/svg+xml"); } catch (e) { add("error", "Could not read the SVG."); return out; }
    if (doc.querySelector("parsererror")) { add("error", "The SVG has a syntax error (unclosed tag or bad attribute)."); return out; }
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg") { add("error", "The file does not start with an <svg> element."); return out; }

    const vb = (root.getAttribute("viewBox") || "").trim().replace(/\s+/g, " ");
    vb === "0 0 512 512" ? add("ok", "Canvas is 512 × 512.") : add("error", `viewBox should be "0 0 512 512" (found "${vb || "none"}").`);
    if (root.hasAttribute("width") || root.hasAttribute("height")) add("warn", "Remove width/height so the drawing scales freely.");

    const title = root.querySelector("title"), desc = root.querySelector("desc");
    title && title.textContent.trim() ? add("ok", `Title: “${title.textContent.trim()}”.`) : add("error", "Add a <title> (the object's name).");
    desc && desc.textContent.trim().length > 15 ? add("ok", "Has a description.") : add("warn", "Add a <desc> describing the drawing (helps screen readers).");

    const all = [...root.querySelectorAll("*")];
    const banned = [...new Set(all.map((n) => n.nodeName.toLowerCase()).filter((n) => BANNED.includes(n)))];
    banned.length ? add("error", "Not allowed: <" + banned.join(">, <") + ">.") : add("ok", "Only plain shapes and paths.");

    const badFill = new Set(), badStroke = new Set();
    for (const n of [root, ...all]) {
      const f = (n.getAttribute("fill") || "").toLowerCase().trim();
      const s = (n.getAttribute("stroke") || "").toLowerCase().trim();
      if (f && !OK_FILL.has(f)) badFill.add(f);
      if (s && !OK_STROKE.has(s)) badStroke.add(s);
      const st = n.getAttribute("style");
      if (st && /fill|stroke|color/i.test(st)) badFill.add("style=" + st.slice(0, 30));
    }
    badFill.size ? add("error", "Colours not allowed in fill: " + [...badFill].join(", ") + ". Use #FFFFFF or #1A1A1A.") : add("ok", "Black and white only.");
    if (badStroke.size) add("error", "Stroke colours not allowed: " + [...badStroke].join(", ") + ".");

    const g = root.querySelector("g");
    if (g && g.getAttribute("stroke-linecap") === "round" && g.getAttribute("stroke-linejoin") === "round") add("ok", "Rounded line ends.");
    else add("warn", "Use stroke-linecap=\"round\" and stroke-linejoin=\"round\".");

    const kb = new Blob([svgText]).size / 1024;
    kb <= 15 ? add("ok", `File size ${kb.toFixed(1)} KB.`) : add("warn", `File is ${kb.toFixed(1)} KB (aim for under 15 KB).`);
    return out;
  }

  /** Rasterise the SVG and measure ink coverage and the drawing's bounding box. */
  function measure(svgText, size = 256) {
    return new Promise((resolve) => {
      const img = new Image();
      const sized = /<svg[^>]*\swidth=/.test(svgText) ? svgText : svgText.replace(/<svg\b/, `<svg width="${size}" height="${size}"`);
      const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = c.height = size;
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, size, size);
        x.drawImage(img, 0, 0, size, size); URL.revokeObjectURL(url);
        const d = x.getImageData(0, 0, size, size).data;
        let dark = 0, minX = size, minY = size, maxX = -1, maxY = -1;
        for (let i = 0; i < size * size; i++) {
          if (d[i * 4] < 128) {
            dark++; const px = i % size, py = (i / size) | 0;
            if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
          }
        }
        const s = 512 / size;
        resolve({ ink: dark / (size * size) * 100, bbox: maxX < 0 ? null : [minX * s, minY * s, (maxX + 1) * s, (maxY + 1) * s] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  async function full(svgText) {
    const res = check(svgText);
    if (res.some((r) => r.level === "error" && /syntax|start with/.test(r.msg))) return { checks: res, ink: null };
    const m = await measure(svgText);
    if (m) {
      const ink = m.ink;
      res.push(ink <= 14 ? { level: "ok", msg: `Ink coverage ${ink.toFixed(1)}% — light, good for printing.` }
        : ink <= 22 ? { level: "warn", msg: `Ink coverage ${ink.toFixed(1)}% — a bit heavy; thin some lines or remove solid black.` }
          : { level: "error", msg: `Ink coverage ${ink.toFixed(1)}% — too much ink for minimal-ink printing.` });
      if (m.bbox) {
        const [x0, y0, x1, y1] = m.bbox, pad = Math.min(x0, y0, 512 - x1, 512 - y1);
        const fill = Math.max(x1 - x0, y1 - y0) / 512 * 100;
        pad < 6 ? res.push({ level: "warn", msg: "Drawing touches the edge of the canvas — leave about 24 px padding." })
          : res.push({ level: "ok", msg: "Fits inside the canvas." });
        if (fill < 50) res.push({ level: "warn", msg: `Drawing only fills ${fill.toFixed(0)}% of the canvas — make it bigger (aim for at least 60%).` });
      } else res.push({ level: "error", msg: "Nothing is drawn yet." });
    }
    return { checks: res, ink: m ? m.ink : null };
  }

  global.FLNLint = { check, measure, full };
})(window);
