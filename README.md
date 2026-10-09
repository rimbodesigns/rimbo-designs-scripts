# rimbo-designs-scripts

Site-wide JavaScript for [rimbodesigns.com](https://www.rimbodesigns.com) (Webflow), migrated from Slater (project 13857).

- `main.js` — everything in one file. One section per page or feature
  (`rdGlobal`, `rdHome`, `rdService`, …); the router at the bottom decides
  what runs where. Dutch pages (`/nl/…`) run the same code as their English twins.
- `slater/` — the original Slater files, as they were on 2026-10-09. Reference only, not loaded on the site.
- Served via jsDelivr, pinned to a git tag, as one tag in Webflow
  Site settings → Custom code → Footer (no `defer`), below GSAP and Lenis:
  `<script src="https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.1.0/main.min.js"></script>`
  (jsDelivr builds `main.min.js` from `main.js` automatically)

| Section | Runs on | Came from |
| --- | --- | --- |
| `rdGlobal` | every page | 35206 GLOBAL.js |
| `rdFormValidation` | every page | 39499 FORM CODE.js |
| `rdLenis` | every page | the inline Lenis block in the Webflow footer |
| `rdHome` | `/` | 35211 HOME.js |
| `rdService` | `/service`, `/locations/…` | 35312 SERVICE.js |
| `rdWork` | `/work` | 35413 WORK.js |
| `rdWorkItem` | `/work/…` | 35499 PortFolioContent.js |
| `rdNewsletter` | `/branding-brilliance-newsletter`, `/call-is-booked` | 35515 BOOKED CALL / NEWSL..js |
| `rdResources` | `/resources` | 37087 RESOURCES.js |
| `rdQuiz` | `/rimbo-quiz` | 35662 QUIZ .js |
| `rdLetterReveal` | `/audit`, `/my-story` | the anime.js page code on those pages |

Still inline in Webflow: Google Tag Manager (site head), the Lenis CSS (site head),
the Finsweet attributes, Cal.com on /contact, and the SEO/JSON-LD blocks on the
Locations and Blog post templates.

## Release flow
1. Edit `main.js`, commit, push.
2. `git tag vX.Y.Z` and push the tag.
3. Update the version in the Webflow footer tag.
4. Publish to staging (webflow.io), test, then publish live.

This repository is public (jsDelivr needs that): no passwords, API keys or client data in here.
