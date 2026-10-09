# rimbodesigns.com — site audit, 2026-10-09

Measured on the published site (182 pages crawled: 176 sitemap URLs + quiz, call-is-booked,
401, 404, search), the Webflow asset library (399 assets) and Lighthouse 12 run locally
(the PageSpeed API's free quota was exhausted; Lighthouse is the same engine).
Staging (main.js v1.1.0) and live (Slater) were compared on the home page.

## 1. Speed

Lighthouse, mobile (simulated slow 4G, 4× CPU slowdown), median of clean runs:

| Page | Perf | FCP | LCP | TBT | CLS | Weight |
| --- | --- | --- | --- | --- | --- | --- |
| Home, staging (main.js) | 68–69 | 2.0 s | 7.5–9 s | 150 ms | 0.01 | 5.7 MB |
| Home, live (Slater) | 69–70 | 1.9 s | 8.7 s | 130 ms | 0.04 | 5.7 MB |
| Home, desktop | 76 | 1.0 s | 3.9 s | 10 ms | 0 | 5.8 MB |
| Service | 64 | 3.6 s | 7.0 s | 220 ms | 0.00 | 5.9 MB |
| Case study (Anapana) | 96 | 2.0 s | 2.1 s | 100 ms | 0.03 | 2.8 MB |

Accessibility 100 (Service 93), Best practices 100, SEO 100 on live (69 on staging only
because staging is `noindex`). Outlier runs with LCP of 17–24 s happened on both staging
and live: the LCP image is lazy-loaded and competes with 4 MB of GIFs on a slow connection.
**The new main.js performs the same as Slater; the page weight is what's slow.**

What costs the most, in order:

1. **Two GIFs, 4.1 MB.** `Animation by Julia Schimautz (2).gif` (1.7 MB, 400×400) sits in
   the hero marquee on 110 pages; `Pin page image.gif` (2.4 MB) is loaded on the home page
   (not as an `<img>`; it comes from the CSS/an interaction). Lighthouse estimates 3.4 MB saved
   by replacing them with a short MP4/WebM (`<video autoplay muted loop playsinline>`) or an
   animated AVIF. Biggest single win on the site.
2. **The hero marquee images are `loading="lazy"`**, and on mobile one of them is the LCP
   element, so the browser fetches it late (Load Delay 6–9 s). Set the first set of marquee
   images to eager loading (Webflow image settings → Load: eager). On desktop the LCP is the
   H1, whose letters animate in; its paint is delayed by ~3.7 s by design.
3. **Marquee images are served too large**: `sizes="100vw"` on 300 px-wide images, so the
   800–1080 px variants load (373–605 KB wasted per page). Upload those covers at ~700 px
   wide, or give the image a fixed max-width so Webflow picks a smaller variant.
4. **Background videos.** Case-study heroes autoplay 3.6–13.5 MB MP4s (Charlies Angels 13.5,
   Digital Feng Shui 9.7, Henry Byrne 9.2, Dieronesie 8.8); `lookatcam` (2.9 MB) autoplays on
   Service and all 74 Locations pages. Re-export at 1080p/720p, 6–10 s loops, CRF ~28, aim
   for ≤ 2 MB each; or swap to a custom `<video preload="none" poster>` that starts when visible.
5. **Google Tag Manager + gtag**: 300 KB of JavaScript, 100–250 ms main-thread blocking.
   `gtm.js` and `gtag/js` (G-3F7ZVQBKK3, twice) both load — check that GA isn't configured
   twice; consider loading GTM after the first interaction.
6. **DOM size**: Service 1,797 elements, Locations 1,220 (Lighthouse warns above ~800).
   The testimonial marquee duplicates ~26 cards × 5 star icons per page; fewer duplicates
   (`data-marquee-duplicate`) or fewer cards would cut it.
7. **Fonts**: `grifterbold.otf` is served as OTF (61 KB; WOFF2 would be ~30 KB).
   `RM Mono Regular Trial.woff2` is a *trial* font in production — licence check needed.
8. Smaller: 34 KB of unused CSS per page (Style Manager → Clean up removes unused classes),
   images without `width`/`height` attributes (CLS is already fine), Finsweet loaded from a
   floating `@1` version (short cache).

## 2. Images

292 unique images on the published pages, 29 MB of originals (Webflow serves resized
variants, so visitors download less). 203 AVIF, 22 PNG, 18 WebP, 37 SVG, 1 GIF, 1 JPEG.

PNG/JPEG shown on pages (candidates for AVIF, in place via Webflow's compressor):

| File | Size | Pixels | Pages | Where |
| --- | --- | --- | --- | --- |
| Exp_2.png | 3,133 KB | 1531×2110 | 2 | Henry Byrne case study |
| HENRY BYRNE.png | 1,535 KB | 1433×776 | 2 | Henry Byrne case study |
| Favorieten.png | 561 KB | 1440×900 | 2 | theFactor.e case study |
| TEST^%6.png | 463 KB | 1887×1269 | 6 | — |
| HenriTEST.png | 449 KB | 468×689 | 2 | Henry Byrne |
| DFS_2.png | 447 KB | 590×654 | 2 | Digital Feng Shui |
| select 1.png | 406 KB | 1440×900 | 2 | theFactor.e |
| Diero_preview.png | 376 KB | 600×437 | 2 | Dieronesie |
| InnerGYM_small.png | 314 KB | 584×464 | 2 | Digital Feng Shui |
| tfe pick.png | 255 KB | 823×551 | 2 | theFactor.e |
| mijn voortgang.png, MT_LiveChat.png, Glenn_headshot.jpeg, SEO before after.png, daan_96x96.png, Henry_profile2.png | < 150 KB each | | | |

Together ~8 MB → expect < 1 MB as AVIF. The other 21 PNGs are Open Graph images (only
social networks fetch them); keep those PNG/JPG, but `OPEN3.png` (991 KB), `opengraph.png`
(873 KB) and `open_graph_diero.png` (777 KB) could be exported as JPG at ~200 KB.

Dimensions: 40+ images are wider than 2,600 px, but as AVIF they are 16–160 KB, and Webflow
makes variants, so pixels are not the problem — bytes are. Oversized delivery is the marquee
issue above plus `RIM.avif` on Service (674 px served for a 202 px slot).

Asset library: 320 images (74.5 MB) and 21 videos (311 MB). **165 images (47 MB) and 11 videos
(151 MB) are not referenced on any published page** — review the Assets panel's "unused"
filter and delete. 393 of 399 assets sit in the root folder. Scratch names worth renaming
(display names don't change URLs): `TEST^%6.png`, `HenriTEST.png`, `test2.webp`,
`Screenshot 2025-06-04 at 19.28.19.avif`, `Animation by Julia Schimautz (2).gif`,
`PNG to WEBP conversion result (2).avif`, `TinyPNG Big (2).avif`, `image 313.avif`.

## 3. Alt text

1,764 of 5,823 `<img>` tags have no alt text; 110 unique images. Grouped by source:

| Images | Element class | Source | Fix |
| --- | --- | --- | --- |
| 25 blog covers (×2 places) | `image-318`, `cover_image` | CMS: Blog posts → cover image field | fill the image field's alt per post (25 posts) |
| 4 hero marquee covers | `marquee_image` | static (hero component) | asset alt text |
| 8 service tab images | `tab-image`, `tab-image-mobile` | static (Service + Locations template) | asset alt text |
| numbers, sparkles, icons | `servicenumbering`, `fwa_sparkle`, … | decorative | keep `alt=""` (correct) |
| 23 misc (logos, quiz image, work images) | various | static / CMS | asset alt text |

Asset level: 52 of the 122 raster assets in use have no alt text (many are OG images, which
don't need it). Lighthouse accessibility is 100 because an empty `alt=""` counts as
decorative; the missing alts matter for SEO and for real descriptions.

## 4. Class names (Client-First)

817 custom classes in the CSS, 718 in use on the published pages, 140 unused
(Style Manager → Clean up). The 718 in use:

- 634 already follow the Client-First shape (`component_element`, `text-size-small`, `is-…`).
- 35 Osmo component classes use BEM (`btn-animate-chars__text`, `tab-content__item`,
  `marquee-advanced__scroll`…) plus 5 `is--error`-style states. These come from the Osmo
  library and `main.js` relies on `btn-animate-chars__text`; recommendation: leave them.
- 12 Relume `rl_…` classes: fine (Relume is Client-First compatible).
- **26 Webflow auto-names** (the clutter): `_2` (999 uses, a combo class meaning something
  different on every base class), `locales-list-2`, `collection-list-3`, `form-2`, `_2-0`,
  `email_2-0`, `code-embed-2`, `slide-nav-2`, `text-block-5`, `_50`, `div-block-6`, `_1`,
  `service_copy`, `heading-style-h6-2`, `_4`, `is-dfs_2`, `_3`, `show_9`, `number-4`,
  `columns-2`, `_1200`, `socials-2`, `code-embed-3`, `_5`, `text-block-9`.
- **6 classes named after a number**: `_2rem_left`, `_1remtop`, `_0top-bot`, `_100-_work`,
  `_4rem_top_mobile`, `_80vh`.
- **Typos**: `testiimonial_name`, `progession-bar`, `service_item_containter`, `tesxtslide`;
  unused: `auduit_info`, `resourse`, `is-cutomw`, `rimob_textfield`.
- Generic utilities outside the Client-First vocabulary: `greytext`, `white`, `hidden`,
  `noselect`, `text-block-98`, `before__100`.

Proposed renames (the Webflow API renames a class everywhere it's used, elements and CSS;
none of these are referenced in `main.js`):

| Now | Proposed | Note |
| --- | --- | --- |
| `testiimonial_name` | `testimonial_name` | typo |
| `progession-bar` | `progress_bar` | typo |
| `service_item_containter` | `service_item-container` | typo |
| `tesxtslide` | `text_slide` | typo |
| `greytext` | `text-color-grey` | 1,106 uses, also carries font-size .875rem |
| `white` | `is-white` | combo state |
| `hidden` | `hide` | Client-First utility name |
| `noselect` | `is-noselect` | combo state |
| `locales-list-2` | `locale_list` | |
| `collection-list-3` | `blog_list` | check which collection it wraps |
| `form-2` / `form-2 cta _2-0` | `form_wrapper` / `is-cta` | |
| `email_2-0` | `newsletter_wrapper` | |
| `slide-nav-2` | `slider_nav` | |
| `text-block-5` | `text-style-tag` | the GRIFTER label style |
| `_50` | `split_half` | |
| `service_copy` | `service_content` | |
| `heading-style-h6-2` | `heading-style-h6` | merge with the unused original |
| `_2rem_left` | `is-padding-right-2rem` | it sets padding-right 2rem |
| `_1remtop` | `is-margin-top-1-5rem` | it sets margin-top 1.5rem |
| `_0top-bot` | `is-padding-0` | |
| `_100-_work` | `is-full-width` | |
| `_4rem_top_mobile` | `spacer_mobile` | |
| `_80vh` | `spacer_hero` | |
| `show_9` | `is-collapsed` | the Work page's height-limited grid |
| `_1200` | `is-max-1200` | |

`_2`, `_1`, `_3`, `_4`, `_5`, `code-embed-2/3`, `div-block-6`, `columns-2`, `socials-2`,
`number-4`, `text-block-9`, `text-block-98`, `before__100` need a look at each element before
renaming (same name, different meaning per place).

## 5. SEO and accessibility

- `aria-label="staggering button"` is on all 2,192 Osmo buttons, so screen readers announce
  "staggering button" instead of the button text (Lighthouse: label-content-name-mismatch on
  every page). Remove the attribute from the button component once.
- `/seo-pricing`: 18 H1s (every price is an H1). theFactor.e case study: 4 H1s. All 74
  Locations pages: 2 H1s ("Top Web Design Agency in …" and "4 Levels Of Transformation").
  Quiz, Newsletter, NL Contact, 401, 404: no H1.
- The Muzammil Hussain case study has Pooh Balance's meta description (copy-paste).
- 49 page titles are longer than 60 characters (Locations: 68–78), so Google truncates them.
- Service page: a colour-contrast failure and an `aria-*` attribute on an element that
  doesn't allow it (Lighthouse accessibility 93; everywhere else 100).
- Canonical and viewport on all pages, hreflang on all 176 localised pages: good.

## 6. Housekeeping

- Slater: project 13857 is no longer loaded by staging; after the live publish it can be
  cancelled.
- The site footer is now three lines; the Lenis CSS and GTM stay in the head.
- Site settings → the Lenis `smoothTouch: false` and the 992px nav breakpoint live in `main.js`.

## 7. Suggested order

1. GIF → video (biggest win), hero marquee images eager + smaller upload. *(you, in Webflow)*
2. PNG → AVIF for the 17 page images via Webflow's compressor. *(API, in place — needs a go)*
3. Alt text: 25 blog covers (CMS) + ~15 static assets. *(API — needs the texts or a go to write them)*
4. Remove `aria-label="staggering button"` from the button component; fix H1s on
   /seo-pricing, Locations template, theFactor.e; Muzammil description. *(Designer / API)*
5. Class renames from the table + Style Manager "Clean up". *(API + one click)*
6. Case-study videos re-exported ≤ 2 MB; the Service/Locations background video too. *(you)*
7. Assets panel: delete unused (≈ 200 MB), rename scratch files, folders. *(you)*
8. GTM: one GA tag, load later. Fonts: Grifter as WOFF2, RM Mono licence. *(you)*
