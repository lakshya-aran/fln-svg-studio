# FLN SVG Studio

A small browser app for making **black-and-white line-art SVGs** for FLN (Foundational Literacy and Numeracy)
worksheets: LKG, UKG and Classes 1–3.

It packages the whole workflow used to build the [FLN SVG library](https://github.com/lakshya-aran/fln-svg-library):
**draw → check → review → export**. It runs entirely in the browser: no install, no AI and no server.

**Open the app:** https://lakshya-aran.github.io/fln-svg-studio/

## What it does

| Tab | What you can do |
|---|---|
| **Draw** | Write a drawing as code using ready-made helpers (eyes, tubes, cloud outlines, digits, letters, ₹ symbol, 3D boxes…), or paste raw SVG. The preview updates live, with a grid, a safe-area guide and small "can a child recognise it?" thumbnails. |
| **Style check** | Every drawing is checked against the style guide: 512 × 512 canvas, title and description, black and white only, no banned elements, rounded lines, file size, **ink coverage %** and whether it touches the edge. |
| **Review** | Save drawings (or import SVG files from Inkscape/Illustrator), mark each **Approve** or **Redo** with a note, then copy the verdict, print a contact sheet, or **export approved SVGs as a ZIP** with one folder per category. |
| **Library** | Browse any GitHub repo of SVGs (the FLN library by default), filter by category, open a drawing in the editor or download it. |
| **Guide** | The workflow and style rules in plain language. |

## Drawing with code — example

```js
// Return the drawing body as a string. Shapes get a white fill and black 8px outline automatically.
return `
<circle cx="256" cy="256" r="180"/>
${eye(196, 210, 14)}
${eye(316, 210, 14)}
${det("M176 300 C210 340 302 340 336 300", 6)}
`;
```

Helpers (full list in the app under **Helper reference**):

`det` detail line · `dot` · `eye` · `tubes` outlined tubes · `specks` · `scallops` · `bumpy` cloud outline ·
`blob` irregular patch · `drop` · `poly` · `ngon` · `star` · `spiral` · `box` 3D box · `leg` ·
`digit` / `num` · `word` · `rupee` · `P` point on a circle · `DASH` dashed hidden edges.

## Style rules (short)

- Outline only: white fill, `#1A1A1A` lines; 8 px outline, 5 px details, 3.5 px fine texture; rounded ends.
- Solid black only where it helps recognition (pupils, nostrils, panda patches).
- Recognisable without colour: use real clues (seeds, cut halves, textures, labels).
- Realistic, textbook-like proportions; friendly cartoon faces are fine.
- `viewBox="0 0 512 512"`, `<title>` and `<desc>` required; no images, text elements, fonts, gradients, filters or scripts.

## Run locally

Download or clone the repo and open `index.html` in a browser. To serve it:

```bash
python -m http.server 8000   # then open http://localhost:8000
```

## Files

```
index.html        app layout
css/app.css       styles (light and dark)
js/helpers.js     drawing helpers (the same building blocks used for the FLN library)
js/lint.js        style checker and ink measurement
js/examples.js    starter templates
js/app.js         Draw / Review / Library logic
```

Drafts and review notes are saved in your browser (localStorage). Export a ZIP to keep them anywhere else.
