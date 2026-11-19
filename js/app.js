/* FLN SVG Studio — app logic (Draw, Review, Library, Guide). */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CATEGORIES = ["animals", "birds", "fruits", "vegetables", "food", "flowers-plants", "nature-environment", "stationery", "school",
    "household", "transport", "clothing", "sports", "toys", "shapes-colors", "numbers-counting", "body-parts"];
  const STORE = "fln-studio-drafts-v1", CUR = "fln-studio-current-v1";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const kebab = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "drawing";
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function flash(el, msg) { el.textContent = msg; clearTimeout(el._t); el._t = setTimeout(() => (el.textContent = ""), 2600); }
  function download(name, text, type = "image/svg+xml") {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; }
    catch (e) { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; }
  }
  /** Sanitise SVG before putting it in the page: drop scripts and event handlers. */
  function safeSvg(text) {
    try {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      if (doc.querySelector("parsererror")) return "";
      doc.querySelectorAll("script, foreignObject").forEach((n) => n.remove());
      doc.querySelectorAll("*").forEach((n) => [...n.attributes].forEach((a) => {
        if (/^on/i.test(a.name) || (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
      }));
      // unique clip/def ids so many drawings can share one page
      const p = "u" + uid();
      let s = new XMLSerializer().serializeToString(doc.documentElement);
      s = s.replace(/id="([^"]+)"/g, `id="${p}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}-$1)`);
      return s;
    } catch (e) { return ""; }
  }

  /* ---------------- tabs ---------------- */
  function show(view) {
    $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    if (view === "review") renderCards();
    if (view === "library" && !lib.loaded) loadLibrary();
  }
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));

  /* ---------------- DRAW ---------------- */
  const tplSel = $("#tpl"), modeSel = $("#mode"), code = $("#code"), fFile = $("#f-file"), fCat = $("#f-cat"), fTitle = $("#f-title"), fDesc = $("#f-desc");
  CATEGORIES.forEach((c) => fCat.add(new Option(c, c)));
  FLNExamples.forEach((t) => tplSel.add(new Option(t.name, t.id)));
  $("#docs").innerHTML = FLN.DOCS.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("");

  let editingId = null, lastSvg = "";
  const NAMES = Object.keys(FLN).filter((k) => k !== "DOCS");

  function build() {
    const mode = modeSel.value;
    if (mode === "raw") return code.value;
    const fn = new Function(...NAMES, '"use strict";\n' + code.value);
    const body = fn(...NAMES.map((k) => FLN[k]));
    if (typeof body !== "string") throw new Error("Your code must RETURN the drawing as a string, e.g. return `<circle .../>`;");
    return FLN.svg(fTitle.value || "Untitled", fDesc.value, body);
  }

  function drawOverlay() {
    let s = "";
    if ($("#grid-toggle").checked) {
      for (let i = 32; i < 512; i += 32) s += `<path d="M${i} 0 V512 M0 ${i} H512" stroke="${i % 128 ? "#cfd8e3" : "#93a8bf"}" stroke-width="1"/>`;
      s += `<path d="M256 0 V512 M0 256 H512" stroke="#5b7da3" stroke-width="1.5"/>`;
    }
    if ($("#pad-toggle").checked) s += `<rect x="24" y="24" width="464" height="464" fill="none" stroke="#e08b3a" stroke-width="1.5" stroke-dasharray="6 6"/>`;
    $("#overlay").innerHTML = s;
  }
  $("#grid-toggle").addEventListener("change", drawOverlay);
  $("#pad-toggle").addEventListener("change", drawOverlay);

  let timer = null, runId = 0;
  async function run() {
    const my = ++runId;
    let out;
    try { out = build(); $("#err").hidden = true; }
    catch (e) { $("#err").hidden = false; $("#err").textContent = "⚠ " + e.message; return; }
    lastSvg = out;
    const safe = safeSvg(out);
    $("#preview").innerHTML = safe || "";
    $("#thumb-s").innerHTML = safe ? safeSvg(out) : "";
    $("#thumb-m").innerHTML = safe ? safeSvg(out) : "";
    if (!safe) { $("#err").hidden = false; $("#err").textContent = "⚠ The SVG could not be read — check for unclosed tags or bad attributes."; }
    const res = await FLNLint.full(out);
    if (my !== runId) return;
    $("#checks").innerHTML = res.checks.map((c) => `<li class="${c.level}">${esc(c.msg)}</li>`).join("");
    saveCurrent();
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
  [code, fTitle, fDesc].forEach((el) => el.addEventListener("input", schedule));
  [fFile, fCat].forEach((el) => el.addEventListener("input", saveCurrent));
  code.addEventListener("keydown", (e) => {
    if (e.key === "Tab") { e.preventDefault(); const s = code.selectionStart; code.setRangeText("  ", s, code.selectionEnd, "end"); schedule(); }
  });

  function loadTemplate(id) {
    const t = FLNExamples.find((x) => x.id === id); if (!t) return;
    editingId = null; modeSel.value = "code";
    code.value = t.code; fFile.value = t.file; fCat.value = t.category; fTitle.value = t.title; fDesc.value = t.desc; run();
  }
  tplSel.addEventListener("change", () => loadTemplate(tplSel.value));
  modeSel.addEventListener("change", () => {
    if (modeSel.value === "raw" && lastSvg && !code.value.trim().startsWith("<svg")) {
      if (confirmSwap("Switch to raw SVG? Your code will be replaced by the SVG it produced.")) code.value = lastSvg; else { modeSel.value = "code"; return; }
    }
    run();
  });
  function confirmSwap(msg) { return window.confirm(msg); }

  function saveCurrent() {
    store.set(CUR, { mode: modeSel.value, code: code.value, file: fFile.value, cat: fCat.value, title: fTitle.value, desc: fDesc.value, editingId });
  }
  function openInEditor(d) {
    editingId = d.id || null; modeSel.value = d.mode || "raw"; code.value = d.code || d.svg; fFile.value = d.file || "";
    fCat.value = CATEGORIES.includes(d.category) ? d.category : "household"; fTitle.value = d.title || ""; fDesc.value = d.desc || "";
    show("draw"); run();
  }

  $("#btn-new").addEventListener("click", () => { tplSel.value = "blank"; loadTemplate("blank"); });
  $("#btn-download").addEventListener("click", () => { if (lastSvg) download(kebab(fFile.value || fTitle.value) + ".svg", lastSvg); });
  $("#btn-copy").addEventListener("click", async () => { if (lastSvg && await copyText(lastSvg)) flash($("#save-msg"), "SVG copied."); });
  $("#btn-save").addEventListener("click", () => {
    if (!lastSvg) return;
    const drafts = store.get(STORE, []);
    const rec = { id: editingId || uid(), file: kebab(fFile.value || fTitle.value), category: fCat.value, title: fTitle.value, desc: fDesc.value,
      mode: modeSel.value, code: code.value, svg: lastSvg, status: "draft", note: "", updated: Date.now() };
    const i = drafts.findIndex((d) => d.id === rec.id);
    if (i >= 0) { rec.status = drafts[i].status === "approved" ? "approved" : "draft"; rec.note = drafts[i].note; drafts[i] = rec; } else drafts.push(rec);
    editingId = rec.id; store.set(STORE, drafts); updateCount(); saveCurrent();
    flash($("#save-msg"), i >= 0 ? "Updated in Review." : "Saved to Review.");
  });

  /* ---------------- REVIEW ---------------- */
  function updateCount() { $("#review-count").textContent = store.get(STORE, []).filter((d) => d.status === "draft").length; }
  function renderCards() {
    const drafts = store.get(STORE, []), f = $("#filter").value;
    const list = drafts.filter((d) => f === "all" || d.status === f).sort((a, b) => (a.category + a.file).localeCompare(b.category + b.file));
    $("#review-empty").hidden = drafts.length > 0;
    $("#cards").innerHTML = list.map((d) => `
      <div class="card ${d.status}" data-id="${d.id}">
        <div class="art" data-act="zoom">${safeSvg(d.svg)}</div>
        <div><div class="name">${esc(d.title || d.file)}</div><div class="cat">${esc(d.category)}/${esc(d.file)}.svg</div></div>
        <div class="row">
          <button data-act="approve" class="${d.status === "approved" ? "on-ok" : ""}">Approve</button>
          <button data-act="redo" class="${d.status === "redo" ? "on-bad" : ""}">Redo</button>
          <button data-act="edit">Edit</button>
          <button data-act="del" title="Delete">Delete</button>
        </div>
        <textarea data-act="note" placeholder="Note (what to change)">${esc(d.note)}</textarea>
      </div>`).join("");
    updateCount();
  }
  $("#filter").addEventListener("change", renderCards);
  function mutate(id, fn) { const drafts = store.get(STORE, []); const d = drafts.find((x) => x.id === id); if (!d) return; fn(d, drafts); store.set(STORE, drafts.filter(Boolean)); }
  $("#cards").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]"); if (!btn) return;
    const id = btn.closest(".card").dataset.id, act = btn.dataset.act;
    if (act === "approve" || act === "redo") { mutate(id, (d) => { d.status = d.status === act + (act === "approve" ? "d" : "") ? "draft" : (act === "approve" ? "approved" : "redo"); }); renderCards(); }
    else if (act === "edit") { const d = store.get(STORE, []).find((x) => x.id === id); if (d) openInEditor(d); }
    else if (act === "del") { if (window.confirm("Delete this drawing from Review?")) { store.set(STORE, store.get(STORE, []).filter((x) => x.id !== id)); renderCards(); } }
    else if (act === "zoom") { const d = store.get(STORE, []).find((x) => x.id === id); if (d) openModal(d.title || d.file, d.svg); }
  });
  $("#cards").addEventListener("input", (e) => {
    if (e.target.dataset.act !== "note") return;
    const id = e.target.closest(".card").dataset.id; mutate(id, (d) => { d.note = e.target.value; });
  });

  $("#import").addEventListener("change", async (e) => {
    const drafts = store.get(STORE, []); let n = 0;
    for (const file of e.target.files) {
      const text = await file.text(); if (!/<svg[\s>]/i.test(text)) continue;
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const t = doc.querySelector("title"), ds = doc.querySelector("desc");
      const rel = (file.webkitRelativePath || "").split("/");
      const cat = rel.length > 2 ? rel[rel.length - 2] : "household";
      drafts.push({ id: uid(), file: kebab(file.name.replace(/\.svg$/i, "")), category: CATEGORIES.includes(cat) ? cat : "household",
        title: t ? t.textContent.trim() : file.name, desc: ds ? ds.textContent.trim() : "", mode: "raw", code: text, svg: text, status: "draft", note: "", updated: Date.now() });
      n++;
    }
    store.set(STORE, drafts); e.target.value = ""; renderCards(); flash($("#review-msg"), `Imported ${n} file(s).`);
  });

  $("#btn-verdict").addEventListener("click", async () => {
    const drafts = store.get(STORE, []);
    const ap = drafts.filter((d) => d.status === "approved"), rd = drafts.filter((d) => d.status === "redo");
    const t = (ap.length ? "Approved:\n" + ap.map((d) => `- ${d.title || d.file}`).join("\n") : "Approved: none") +
      (rd.length ? "\n\nRedo:\n" + rd.map((d) => `- ${d.title || d.file}${d.note ? " — " + d.note : ""}`).join("\n") : "");
    flash($("#review-msg"), (await copyText(t)) ? "Verdict copied." : "Could not copy.");
  });

  $("#btn-zip").addEventListener("click", async () => {
    const ap = store.get(STORE, []).filter((d) => d.status === "approved");
    if (!ap.length) return flash($("#review-msg"), "Approve some drawings first.");
    if (!window.JSZip) { ap.forEach((d, i) => setTimeout(() => download(`${d.category}__${d.file}.svg`, d.svg), i * 300)); return; }
    const zip = new JSZip(); ap.forEach((d) => zip.file(`${d.category}/${d.file}.svg`, d.svg));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "approved-svgs.zip"; a.click();
    flash($("#review-msg"), `Exported ${ap.length} SVG(s).`);
  });

  $("#btn-sheet").addEventListener("click", () => {
    const list = store.get(STORE, []).filter((d) => $("#filter").value === "all" || d.status === $("#filter").value);
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!doctype html><title>Contact sheet</title><style>body{font:13px system-ui;margin:16px}div.g{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}figure{margin:0;border:1px solid #ddd;padding:6px;text-align:center}figure svg{width:100%;height:auto;display:block}</style><div class="g">` +
      list.map((d) => `<figure>${safeSvg(d.svg)}<figcaption>${esc(d.category)}/${esc(d.file)}</figcaption></figure>`).join("") + `</div>`);
    w.document.close();
  });

  /* ---------------- LIBRARY ---------------- */
  const lib = { loaded: false, items: [], cat: "all" };
  async function loadLibrary() {
    const repo = $("#lib-repo").value.trim(), br = $("#lib-branch").value.trim() || "main", path = $("#lib-path").value.trim().replace(/^\/|\/$/g, "");
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return flash($("#lib-msg"), "Repo should look like owner/name.");
    $("#lib-msg").textContent = "Loading…";
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(br)}?recursive=1`);
      if (!r.ok) throw new Error(r.status === 403 ? "GitHub rate limit reached — try again later." : "Could not load the repo (" + r.status + ").");
      const j = await r.json();
      lib.items = j.tree.filter((t) => t.type === "blob" && t.path.endsWith(".svg") && (!path || t.path.startsWith(path + "/")))
        .map((t) => { const parts = t.path.split("/"); return { path: t.path, name: parts.pop().replace(/\.svg$/, ""), cat: parts.pop() || "", url: `https://raw.githubusercontent.com/${repo}/${br}/${t.path}` }; });
      lib.loaded = true; lib.cat = "all";
      $("#lib-msg").textContent = `${lib.items.length} drawings`;
      renderLibrary();
    } catch (e) { $("#lib-msg").textContent = e.message; }
  }
  function renderLibrary() {
    const cats = [...new Set(lib.items.map((i) => i.cat))].sort();
    $("#lib-cats").innerHTML = ["all", ...cats].map((c) => `<button data-cat="${esc(c)}" class="${c === lib.cat ? "active" : ""}">${esc(c)} ${c === "all" ? lib.items.length : lib.items.filter((i) => i.cat === c).length}</button>`).join("");
    const q = $("#lib-search").value.trim().toLowerCase();
    const list = lib.items.filter((i) => (lib.cat === "all" || i.cat === lib.cat) && (!q || i.name.includes(q) || i.cat.includes(q)));
    $("#lib-grid").innerHTML = list.map((i) => `<div class="card" data-path="${esc(i.path)}"><div class="art"><img loading="lazy" src="${esc(i.url)}" alt="${esc(i.name)}"></div><div class="name">${esc(i.name)}</div><div class="cat">${esc(i.cat)}</div></div>`).join("") || `<p class="empty">Nothing found.</p>`;
  }
  $("#lib-load").addEventListener("click", loadLibrary);
  $("#lib-search").addEventListener("input", renderLibrary);
  $("#lib-cats").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { lib.cat = b.dataset.cat; renderLibrary(); } });
  $("#lib-grid").addEventListener("click", async (e) => {
    const card = e.target.closest(".card"); if (!card) return;
    const it = lib.items.find((i) => i.path === card.dataset.path); if (!it) return;
    try {
      const text = await (await fetch(it.url)).text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const t = doc.querySelector("title"), ds = doc.querySelector("desc");
      openModal(it.name, text, [
        ["Open in editor", () => { closeModal(); openInEditor({ mode: "raw", code: text, file: it.name, category: it.cat, title: t ? t.textContent : it.name, desc: ds ? ds.textContent : "" }); }],
        ["Download", () => download(it.name + ".svg", text)]
      ], ds ? ds.textContent : "");
    } catch (err) { flash($("#lib-msg"), "Could not open that file."); }
  });

  /* ---------------- modal ---------------- */
  function openModal(title, svgText, actions = [], desc = "") {
    $("#modal-body").innerHTML = `<h3>${esc(title)}</h3><div class="big">${safeSvg(svgText)}</div>${desc ? `<p class="muted">${esc(desc)}</p>` : ""}<div class="actions" id="modal-actions"></div>`;
    actions.forEach(([label, fn]) => { const b = document.createElement("button"); b.textContent = label; b.onclick = fn; $("#modal-actions").appendChild(b); });
    $("#modal").hidden = false;
  }
  function closeModal() { $("#modal").hidden = true; }
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  /* ---------------- start ---------------- */
  drawOverlay(); updateCount();
  const cur = store.get(CUR, null);
  if (cur && cur.code) {
    modeSel.value = cur.mode || "code"; code.value = cur.code; fFile.value = cur.file || ""; fCat.value = cur.cat || "household";
    fTitle.value = cur.title || ""; fDesc.value = cur.desc || ""; editingId = cur.editingId || null; tplSel.value = ""; run();
  } else { tplSel.value = "bulb"; loadTemplate("bulb"); }
})();
