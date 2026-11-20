# FLN SVG Studio

A small browser app for making **black-and-white line-art SVGs** for FLN (Foundational Literacy and Numeracy)
worksheets: LKG, UKG and Classes 1–3.

It packages the whole workflow used to build the [FLN SVG library](https://github.com/lakshya-aran/fln-svg-library):
**make → draw → check → review → export**. It runs entirely in the browser: no install, no AI and no server.

**Open the app:** https://lakshya-aran.github.io/fln-svg-studio/

## What it does

| Tab | What you can do |
|---|---|
| **Make** | Type an object (“orange”, “cat”, “school bus”, “5 apples”, “clock 3:30”, “letter B”) and get ready drawings in the FLN style, built by recipes with no AI. It also shows matching hand-drawn drawings from the library. If an object is missing, **Request it**. |
| **Draw** | Write a drawing as code using ready-made helpers (eyes, tubes, cloud outlines, digits, letters, ₹ symbol, 3D boxes…), or paste raw SVG. The preview updates live, with a grid, a safe-area guide and small "can a child recognise it?" thumbnails. |
| **Style check** | Every drawing is checked against the style guide: 512 × 512 canvas, title and description, black and white only, no banned elements, rounded lines, file size, **ink coverage %** and whether it touches the edge. |
| **Review** | Save drawings (or import SVG files from Inkscape/Illustrator), mark each **Approve** or **Redo** with a note, then copy the verdict, print a contact sheet, or **export approved SVGs as a ZIP** with one folder per category. |
| **Library** | Browse any GitHub repo of SVGs (the FLN library by default), filter by category, open a drawing in the editor or download it. |
| **Guide** | The workflow and style rules in plain language. |

## The generator (no AI)

`js/generator.js` is a set of drawing **recipes**. A *family* is a small program with settings; the *catalog* maps object names (English and Hindi) to a family and its settings.

| Family | Examples |
|---|---|
| Round fruit / vegetable | apple, orange, lemon, tomato, watermelon, pumpkin, pomegranate, pear, onion, radish |
| Fruit cut in half | orange slice, kiwi slice, apple slice, tree rings |
| Animal face | cat, dog, rabbit, mouse, bear, panda, lion, tiger, pig, cow, monkey, fox, elephant, sheep, frog, owl |
| Vehicle | car, taxi, bus, school bus, van, truck, jeep |
| Flower / tree | flower, daisy, marigold, flower in a pot, tree, pine tree, fruit tree, bush, Christmas tree |
| Container | cup, mug, glass, bottle, jar, vase, flower pot, bowl, bucket, matka, bell, diya |
| Shape | circle … decagon, star, heart, arrow, cross, cube, cuboid, cylinder, cone, sphere, pyramid, prism, hemisphere |
| Weather / sky | sun, cloud, rain, snow, lightning, moon, rainbow |
| Feeling face | happy, sad, angry, surprised, sleepy, crying, laughing, scared |
| Building / ball | house, hut, flats, shop, tent, igloo · ball, cricket ball, tennis ball, volleyball, beach ball |
| Numbers & counting | `5 apples`, `clock 3:30`, `letter A`–`Z` and `number 0`–`99` for tracing, `dice 4`, `ten frame 6`, `tally 8`, `domino 3 4`, `number line 0 to 10` |

**Add an object:** add one line to the catalog, e.g.
`add("lime", "fruit", { shape: "round", texture: "dimples", top: "stem" }, "fruits", ["nimbu"], "a small round lime");`
**Add a new kind of object:** add a family with a `build(params, seed)` function that returns SVG shapes.

In the Draw editor you can call a recipe yourself: `return gen("face", { animal: "cat" });`

### Command line

```bash
node tools/make-svg.js "orange" "5 apples" "clock 3:30"   # → out/<category>/<name>.svg
node tools/make-svg.js --all --out generated             # every recipe
node tools/make-svg.js --list                            # what it can draw
```

`test/catalog.html` shows every recipe on one page and `test/lint.html` runs the style check on all of them.

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
js/generator.js   rule-based generator: recipes (families) + catalog of object names
tools/make-svg.js command-line generator (Node.js)
test/             catalog preview and style-check pages for the generator
js/lint.js        style checker and ink measurement
js/examples.js    starter templates
js/app.js         Make / Draw / Review / Library logic
```

Drafts and review notes are saved in your browser (localStorage). Export a ZIP to keep them anywhere else.
