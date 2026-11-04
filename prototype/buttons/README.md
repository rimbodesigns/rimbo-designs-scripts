# Button lab

A local page that put six button concepts side by side on the site's dark (#0c0c0c) so Rimbo could pick the global button for the redesign. Built 4 November 2026, in the BUTTONS session. Open it with `node prototype/server.js` and go to `/buttons` (or `/prototype/buttons/`).

Files: `index.html` (the six cells), `buttons.css` (the look, type and colours follow `prototype/v2/prototype.css`), `buttons.js` (all motion, GSAP 3.15 from the Webflow CDN). Hover states are classes (`.is-hover`) set from pointer events, not CSS `:hover`, so a script can enter them for screenshots.

## The decision

Winner: **06 "All three"**: magnetic + label swap + the boil, RM Mono caps, solid cream primary and ghost secondary, no coral. Ported as the global button: `rdButtons` in `main.js` for `.btn` (classes `btn`, `btn.is-secondary`, `btn_in`, `btn_swap`, `btn_line`, `btn_t`, `btn_arrow`, `btn_group`; the second line comes from `data-btn-alt`), on the Webflow staging home-copy page, commit 3625a37.

What Rimbo said (round 1, 4 Nov 2026): likes the jiggle's playful vibe but it felt "shaky, awkward"; the stop-motion one "jiggles nicer"; prefers RM Mono all caps over Grifter ("cleaner"); magnetic "feels lively"; label swap is smart ("you can get more text into a button"); underline and frame wipe cut. Round 2 made the jiggle a warm boil, put the mono label on the stop-motion button and added the two combinations; he picked 06.

## The six concepts (round 2)

1. **Jiggle**: every letter has three hand-placed poses (x ±.6 px, y ±.7 px, rotation ±3°) and cycles through them at 9 fps while hovered, like a line traced three times; plus the old button's lift (scale 1.04, −1°, back.out). Round 1 re-rolled random offsets every frame, which read as shaking.
2. **Stop motion**: the Osmo `.btn-stop-motion` from the old home, re-coloured for the dark site: the hand-drawn back (3 drawings in one 678×82 SVG) flickers on hover, the bolts (4 frames in a 160×40 SVG) flicker always, both at 9 fps, the mono label boils. Dark fill #1f1f1f with a cream hairline, "● 2 spots left" under it.
3. **Magnetic**: within 56 px the nearest button takes the pointer, scale 1.05, follows at .25 of the offset capped at ±9 px, the label at .1, elastic.out(1, .4) back.
4. **Label swap**: the label rolls up letter by letter (yPercent −120, expo.out .55 s, stagger .012) while "45 min · free" rolls in from below; both lines share one overflow-hidden mask so the button keeps its width. Secondary: "See the work" → "Live sites".
5. **Magnetic + swap**: the lean rolls the second line in.
6. **All three**: lean in, the line rolls, the new line starts boiling .4 s later. Off under `prefers-reduced-motion`.

Round 1 also had a **frame wipe** (fill clipped in five stepped frames, label inverting over it with `mix-blend-mode: difference`) and an **underline** (hairline drawing in from the left, out to the right); both cut. Their code is in the git history before commit 723b6cc.

## Checking it

Headless check used during the build (playwright-core on the installed Chrome): load the page, wait for the fonts, screenshot each cell at rest and hovered, measure that the letters move between two frames, that the magnet offsets, the swap lands and every press springs back. The script lived in the session's scratchpad; the contact sheets were sent in chat.
