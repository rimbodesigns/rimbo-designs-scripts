# Rimbo Designs brand

The brand rules for rimbodesigns.com. Read this before using colour, the balls or new visual effects on a page.

- Visual guide (private): https://claude.ai/artifact/FqbWWJmSH7xZh9bCTqq2ZK
- Guide source, with the working ball shader: `prototype/brand/src.html` (`python3 build.py` in that folder makes `brand-guide.html`)
- Lab for trying colours: `prototype/color/index.html`

Version 1, 5 November 2026. The orange is on staging (v1.7.96), not on live yet.

## Colour

Deep Orange is the brand. Dark and beige carry the pages, and the orange marks what matters. Keep it subtle.

| Name | Hex | Webflow variable | Use |
|---|---|---|---|
| Deep Orange | `#E4441C` | `Color/Brand` | The primary. Dots, bullets, underlines, numbers, accents |
| Orange Text | `#CC3C18` | `Color/Brand_hover` | Hover states, small orange text on beige |
| Orange Dark | `#B43414` | `Color/darker_red` | Link hover inside articles |
| Ink | `#131313` | `Color/Black` | Text on beige, dark sections |
| Night | `#0C0C0C` | none | Darkest ground: footer and menu |
| Beige | `#F8F5EE` | `Color/Rimbobage` | Page background, text on dark |
| Deep Beige | `#ECE5D6` | none | The balls and beige blocks only. The page background stays Beige |
| Steel | `#5B8D9F` | none | Counter colour. Balls and blocks only, never text or buttons |
| Hot Edge | `#E4566A` | none | Only where orange meets steel inside a ball |

- Use `var(--color--brand)` on the site. Never type the hex, so the next change is one edit.
- Not in the palette: the old lobster `#FF7373`, the old orange `#F3562E`, and Webflow blue `#146EF5`.
- Left as they are on purpose: form error reds, and the red Reset on `/resources` (`#C90F0F`).

### What reads on what

Contrast ratio, 4.5 or more is fine for all text.

| Pair | Ratio | Use |
|---|---|---|
| Ink on Beige, Beige on Ink | 17.1 | All text |
| Deep Orange on Ink | 4.6 | All text |
| Ink on Deep Orange | 4.6 | All text. Prefer this over beige on orange |
| Orange Text on Beige | 4.6 | All text |
| Ink on Steel | 5.1 | All text |
| Deep Orange on Beige | 3.8 | Big text and shapes only |
| Beige on Deep Orange | 3.8 | Big text only |

## The balls

The brand pattern: grainy circles where the orange fades through steel into beige.

**The fade, always in this order:**

| Stop | Hex | Fades in over |
|---|---|---|
| Deep Orange | `#E4441C` | start |
| Hot Edge | `#E4566A` | .12 to .28 |
| Steel, in the ball | `#4B7888` | .26 to .46 |
| Beige, in the ball | `#DACCAE` | .50 to .84 |

Mix the stops in OKLab, not RGB. RGB is what turns the middle grey. The in-ball steel and beige sit a step darker than Steel and Deep Beige on purpose.

**Rules**

- No grey. Nothing grey between the colours. If a fade turns muddy, it's wrong.
- Keep the edge. The beige inside a ball sits a step below the page, so the circle never melts into a beige ground.
- Always grain. A fine stipple over everything, like a riso print. Flat balls aren't ours.
- They react. On hover the orange floods the ball and fades back. Slow, one ball at a time.

They work on Beige, Deep Beige, Ink, Steel and Deep Orange grounds. On an orange ground, push the ball towards steel and beige (`bias` .22 to .3 in the shader).

## Blocks

Blocks break up articles: a short line and a ball. Text sits left, clear of the ball, and the ball runs off the edge.

| Ground | Text |
|---|---|
| Deep Beige | Ink |
| Steel | Ink |
| Ink | Beige |
| Deep Orange | Ink |

Rows of small balls with RM Mono labels and a full pattern on Ink work as blocks too.

## Using the balls on a page

Nothing on the site uses this version yet. To build it:

1. Copy `FRAG`, `RECIPES.now` and `draw()` from `prototype/brand/src.html`. Layouts are `grid`, `row`, `big` (one cropped ball) and `ramp`.
2. Use one shared WebGL2 context and copy its result to a 2D canvas per ball. That avoids the browser's limit on contexts.
3. Animate only what is on screen, and only while it needs to move. Static tiles draw once.
4. With `prefers-reduced-motion`, draw once and don't animate.
5. For covers and images, render still WebP files instead. `docs/drafts/covers/webflow-cluster.html` is the older cover source and still has the grey and the Webflow blue, so give it this fade first.

Show Rimbo a new visual before it goes on a page, and try effects in a lab first.

## Type

| Face | CSS name | Job |
|---|---|---|
| Integral | `IntegralNEW` | Headings, in capitals. Keep them short, long titles wrap badly |
| Akkurat | `Akkuratllsub` | Reading text |
| RM Mono | `RM MONO` | Labels, buttons, numbers, in capitals |

## Logo

F Brush on every page: `media/logo-f-brush.svg`. Beige on dark, ink on beige and on orange.

## Interface

Orange stays small here.

- Buttons never go orange. `.btn` is solid beige on dark and solid ink on beige, `.btn.is-secondary` is the ghost. RM Mono capitals, radius .3em. No blue hover.
- Links in articles: text colour with an orange underline.
- Bullets and eyebrow dots: 6px Deep Orange dots.
- Numbers: Orange Text on beige, Deep Orange on dark.

## Voice

Short, plain, first person. Say it the way you'd say it across a table. Rimbo in English, Rimbout in Dutch.

- "I'd rather tell you now than after the build."
- "No plugins. No updates. No patches."
- "You don't need me for that, and you shouldn't."

## Open

- Two darks: Ink and the blacker Night. Rimbo wondered if the footer needs to be that much darker. Not decided, nothing changed.
- Blog covers and other images still have the old colours until they're re-rendered.
