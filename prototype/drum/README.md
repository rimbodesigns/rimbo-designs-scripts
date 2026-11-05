# Drum lab

A local page that puts ten ideas for the home V4 drum side by side, so Rimbo can see which are worth building into the site. Built 5 November 2026 in the V4 session, after he asked to "brainstorm what's possible first" and then for "some type of lab where I can see these experiences next to each other". Open it with `node prototype/server.js` and go to `/drum` (or `/prototype/drum/`).

Files: `index.html` (the shell), `drum.css` (dark like the site, RM Mono like the other labs), `drum.js` (the drum and the ten ideas; GSAP 3.15 from the Webflow CDN is loaded but the lab only needs plain transforms).

## How it works

Every stage holds the same drum: sixteen cards on a cylinder 22.5° apart with the axis behind the front card, the same geometry Osmo's spatial slider uses on staging (there: 22°, seven cards plus clones). The back half is hidden (`backface-visibility`), so it reads as the five-card arc from the site and can turn without end. The cards carry the seven clips' posters; a click enlarges one stage and gives its cards the real clips (`/media/*.mp4`), a second click shrinks it again. Seventy videos at once would be too much for a browser, hence posters in the grid.

One scrubber at the bottom is the hero's scroll-away, p from 0 to 1, for every stage at once; Play runs it as a visitor would (down over 2.4 s, hold, back up). Each idea is an `update(stage, p, t, pointer)` that sets the drum's state: `turn` (cards turned, two per screen like the scroll turn on staging), `tipFront` (degrees about the front plane, the staging exit), `tipAxis` (degrees about the drum's own axis), `zoom`, `dx`/`dy`, per-card `selfTip` and fly offsets, and `gloss`. The scene moves up with p for the ideas that leave like the hero does; the pinned ones (roulette, fly-through, orbit) stay.

## The ten ideas

1. **Now: tips 60°**: what is on staging, for reference.
2. **Louvres**: each card tips on its own axis, middle first, like blind slats. Cheap.
3. **Deal**: the cards fly off in their own directions with a stagger. Cheap.
4. **Roulette**: Rimbo's idea. The camera rises until you look down on the drum, each card turning face-up, so it becomes a ring of tiles with the next section's title in the middle; the ring keeps turning. Big.
5. **Fly-through**: the camera pushes forward through the gap beside the middle card into the next section. Medium.
6. **Orbit**: the scroll turns the drum five cards while the camera comes in close. Medium.
7. **Gloss sweep**: a highlight where the light hits each card, sliding across as it turns. Cheap.
8. **The counter**: "03 / 07" under the drum, ticking with every step. Cheap.
9. **Pointer orbit**: the drum leans a few degrees toward the pointer. Cheap.
10. **Reflection**: a faint mirrored drum below, fading out. Medium.

## Decision

Rimbo picked the **roulette** (5 November 2026, evening): "I really like the roulette… it could be a scroll experience where from a certain point you can just scroll through the circle." V4 stays the home hero as it is; the roulette got its own page, /home-extreme (a copy of V4), built in main.js as `buildRing` on a slider root that carries `data-ring`. His first look at it: he loved the experience but not that the ring repeated the works three times to fill the circle, and asked whether it was too heavy. The second round became **the dial**: no copies, five works (the course and the in-use clip left off that page), the arc opening into a flat dial of five over a 1.5-screen hold, one round of names, then the dial closing into its middle. Still open: his verdict on the dial, and how the About section rises in its middle (that needs the About session's section to overlap the hold).
