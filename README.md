# rimbo-designs-scripts

Site-wide JavaScript for [rimbodesigns.com](https://www.rimbodesigns.com) (Webflow), migrated from Slater (project 13857).

- `main.js` — everything in one file. One section per page or feature
  (`rdGlobal`, `rdHome`, `rdService`, …); the router at the bottom decides
  what runs where. Dutch pages (`/nl/…`) run the same code as their English twins.
- `slater/` — the original Slater files, as they were on 2026-10-09. Reference only, not loaded on the site.
- `media/` — clips the carousel plays as video panels (served by jsDelivr like the script), with the recorder script that made them.
- `docs/` — the site audit and the redesign direction notes.
- `prototype/` — local prototypes on top of the Webflow staging page (/home-copy), to design on while Webflow is disconnected. `node prototype/server.js` serves them (http://localhost:8777 when free): `/` and `/v2` = the version being worked on, `/v1` = the frozen glass-carousel opening (tag `prototype-v1`, with its own copies of main.js, css and js). `node prototype/sync-from-staging.js v2` rebuilds `v2/index.html` from staging; all changes go in `v2/prototype.css` and `v2/prototype.js`. `_new/` holds parked experiments.
- Served via jsDelivr, pinned to a git tag, as one tag in Webflow
  Site settings → Custom code → Footer (no `defer`), below GSAP and Lenis:
  `<script src="https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.5.0/main.min.js"></script>`
  (jsDelivr builds `main.min.js` from `main.js` automatically)

| Section | Runs on | What it is |
| --- | --- | --- |
| page scope + Barba boilerplate | every page (Barba itself: staging and local only) | Osmo's page transition boilerplate: the 3D cube, the fade for Back and anchors, the ticket tear. Everything a page starts is noted and stopped when it leaves: use `rdOn`, `rdTick`, `rdHead`, `rdDrag`, `rdGl`, `rdPlugins` for new page code |
| `rdNavFull` | every page with the Nav_full component | the full-screen menu; stays for the whole visit |
| `rdGlobal` | every page | scroll reveals, marquees, cursor (was Slater 35206 GLOBAL.js) |
| `rdFormValidation` | every page | form checks (was 39499 FORM CODE.js) |
| `rdButtons` | every page | the global button (`.btn`): magnetic, label swap from `data-btn-alt`, the boil |
| `rdLenis` | every page | smooth scroll |
| `rdBand` | a page with `[data-band]` | the home's hero: the dial (`[data-ring]`), or home V4's drum (Osmo's Spatial Cards Slider) |
| `rdFooter`, `rdLogoSwap` | pages with the Footer_rdf component | the animated footer and the F Brush logo |
| `rdWall` | pages with the Wall of love | the testimonial slider with the shader balls |
| `rdFaq` | pages with `[data-faq]` | the accordion + FAQPage structured data |
| `rdLocShow`, `rdLocBalls`, `rdLocFaqBtn`, `rdLocBtnAlt` | city pages | the showcase drum, the three balls, small button helpers |
| `rdPostRefresh`, `rdScrollRuler`, `rdPostCards`, `rdCoverHueDrift` | `/post/…` (English) | the rebuilt post page, Osmo's Scroll Ruler (`docs/osmo/scroll-ruler.md`), the article cards |
| `rdResources` (+ `rdChipBoil`, `rdLangToggle`, `rdQueuedReveal`, `rdMultiFilter`) | `/resources` | the filter, the chips, the language pill |
| `rdStagingLinks` | webflow.io only | old Service/Work links open the V2 pages |
| `rdHome`, `rdService`, `rdWork`, `rdWorkItem`, `rdNewsletter`, `rdQuiz`, `rdLetterReveal` | the old site's pages (`/`, `/service`, `/locations/…`, `/work`, `/work/…`, newsletter, quiz, audit, my-story) | the Slater ports, kept until the redesign replaces those pages |

Removed in v1.7.156 (10 Nov 2026), in the git history up to tag `v1.7.155`: the single band of /home-copy (V2), the radial
wheel of /home-v3 (`initRadialCardsSlider`) and the glass carousel of /home-v5 (`rdGlassCarousel`, three.js).

Still inline in Webflow: Google Tag Manager (site head), the Lenis CSS (site head),
the Finsweet attributes, Cal.com on /contact, and the SEO/JSON-LD blocks on the
Locations and Blog post templates.

## Release flow
1. Edit `main.js`, commit, push.
2. `git tag vX.Y.Z` and push the tag.
3. Update the version in the Webflow footer tag.
4. Publish to staging (webflow.io), test, then publish live.

This repository is public (jsDelivr needs that): no passwords, API keys or client data in here.
