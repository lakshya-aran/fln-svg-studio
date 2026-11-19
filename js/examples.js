/* FLN SVG Studio — starter templates.
 * Each template is JavaScript that RETURNS the drawing body as a string.
 * All helpers (det, eye, tubes, bumpy, ...) are available by name.
 */
(function (global) {
  "use strict";
  const T = [];

  T.push({
    id: "blank", name: "Blank starter", category: "household", file: "my-drawing",
    title: "My drawing", desc: "Line drawing of ...",
    code: `// Write your drawing here and RETURN it as a string.
// Canvas: 512 x 512. Main outline = 8 (default), details = 5, fine = 3.5.
// Shapes get a white fill and a black outline automatically.

return \`
<circle cx="256" cy="256" r="180"/>
\${det("M176 300 C210 340 302 340 336 300", 6)}
\${eye(196, 210, 14)}
\${eye(316, 210, 14)}
\`;`
  });

  T.push({
    id: "bulb", name: "Light bulb", category: "household", file: "light-bulb",
    title: "Light bulb", desc: "Line drawing of a glowing light bulb with a filament inside, a screw base and light rays around it.",
    code: `// Light rays: short lines placed around a circle with P(cx, cy, r, angle)
const rays = [-180, -150, -120, -90, -60, -30, 0]
  .map(a => "M" + f2(P(256, 190, 140, a)) + " L" + f2(P(256, 190, 166, a))).join(" ");

return \`
\${det(rays, 7)}
<path d="M200 316 C200 284 150 252 150 186 C150 124 198 78 256 78 C314 78 362 124 362 186 C362 252 312 284 312 316 Z"/>
\${det("M232 316 L238 214 M280 316 L274 214", 4)}
\${det("M238 214 l6 -12 l6 12 l6 -12 l6 12 l6 -12 l6 12", 4)}
\${det("M186 160 C192 132 212 112 236 106", 6)}
<rect x="196" y="316" width="120" height="26" rx="6"/>
<rect x="202" y="342" width="108" height="22" rx="8"/>
<rect x="206" y="364" width="100" height="22" rx="8"/>
<rect x="210" y="386" width="92" height="22" rx="8"/>
<path d="M226 408 H286 L272 438 H240 Z"/>
<rect x="244" y="436" width="24" height="14" rx="4"/>
\`;`
  });

  T.push({
    id: "lock", name: "Padlock", category: "household", file: "lock",
    title: "Lock", desc: "Line drawing of a padlock with a curved shackle and a keyhole.",
    code: `// tubes() draws an outlined tube along a path — perfect for the shackle.
return \`
\${tubes(["M186 236 V164 C186 80 326 80 326 164 V236"], 26)}
<rect x="126" y="226" width="260" height="220" rx="30"/>
<rect x="146" y="246" width="220" height="180" rx="20" stroke-width="5"/>
<circle cx="256" cy="316" r="24" fill="\${K}" stroke-width="2"/>
<path d="M244 326 H268 L276 382 H236 Z" fill="\${K}" stroke-width="2"/>
\${det("M168 280 V340", 6)}
\`;`
  });

  T.push({
    id: "cube", name: "Cube (3D shape)", category: "shapes-colors", file: "cube",
    title: "Cube", desc: "Line drawing of a cube with its hidden edges shown as dashed lines.",
    code: `// Visible faces first, then hidden edges as dashed lines using DASH.
return \`
<path d="M120 200 L330 200 L400 120 L190 120 Z"/>
<path d="M330 200 L400 120 V330 L330 410 Z"/>
<rect x="120" y="200" width="210" height="210"/>
<path d="M190 120 V330 L120 410 M190 330 H400" fill="none" stroke-width="4" \${DASH}/>
\`;`
  });

  T.push({
    id: "rain", name: "Rain cloud", category: "nature-environment", file: "rain-cloud",
    title: "Rain cloud", desc: "Line drawing of a fluffy cloud with raindrops falling from it.",
    code: `// bumpy() returns path data for a cloud outline; drop() draws a raindrop.
return \`
<path d="\${bumpy(256, 190, 180, 96, 11, 0.6)}"/>
\${det("M120 220 C180 240 330 240 392 220", 4)}
\${drop(170, 350)}\${drop(256, 390)}\${drop(342, 350)}
\${drop(214, 450, 0.8)}\${drop(300, 452, 0.8)}
\`;`
  });

  T.push({
    id: "coin", name: "₹5 coin", category: "numbers-counting", file: "coin-5",
    title: "Five rupee coin", desc: "Line drawing of a five rupee coin.",
    code: `// rupee() and digit() draw hand-lettered symbols and numbers.
const ticks = [];
for (let a = 0; a < 360; a += 10) ticks.push("M" + f2(P(256, 256, 196, a)) + " L" + f2(P(256, 256, 186, a)));
return \`
<circle cx="256" cy="256" r="200"/>
<circle cx="256" cy="256" r="176" stroke-width="5"/>
\${det(ticks.join(" "), 3)}
\${rupee(200, 256, 2.4, 9)}
\${digit("5", 300, 256, 2.6, 10)}
\`;`
  });

  T.push({
    id: "giraffe-spots", name: "Spots with clipPath", category: "animals", file: "spotty-ball",
    title: "Spotty ball", desc: "Line drawing of a ball covered with irregular spots.",
    code: `// blob() makes irregular patches; clipPath keeps them inside the ball.
let spots = "";
for (let i = 0; i < 14; i++) {
  const [x, y] = P(256, 256, 40 + (i * 37) % 140, i * 47);
  spots += \`<path d="\${blob(x, y, 26, 6, i)}" stroke-width="4"/>\`;
}
return \`
<defs><clipPath id="ball"><circle cx="256" cy="256" r="190"/></clipPath></defs>
<circle cx="256" cy="256" r="190"/>
<g clip-path="url(#ball)">\${spots}</g>
<circle cx="256" cy="256" r="190" fill="none"/>
\${det("M150 150 C170 124 200 106 232 100", 7)}
\`;`
  });

  global.FLNExamples = T;
})(window);
