# Echo Creative Agency — case study draft for rimbodesigns.com

Status 2026-11-04: DRAFT, nothing in Webflow yet (the connector could not reach site 5b9ab5ab7d8a747bcc7b3216).
Every fact below comes from the live site echocreativeagency.nl, the echo-scripts repo or the Echo session notes.
⚠️ marks what Rimbo has to confirm, fill in or decide. No dates, results or numbers were invented.

## CMS item (Work collection)

| Field (as seen on the live template) | Value |
|---|---|
| Name | Echo Creative Agency |
| Slug | echo-creative-agency |
| Title on the page (h1, two lines) | Echo<br>Creative Agency |
| Live site | https://echocreativeagency.nl/ |
| Service (three lines) | Web design,<br>Webflow development,<br>Creative development ⚠️ pick the three lines; "Branding" is deliberately NOT listed, see below |
| Client (two lines) | Echo Creative Agency<br>Groningen |
| Year | 2026 |
| Category / extra info (grid card `.extra_info_work`) | Creative agency in Groningen ⚠️ or "Social media, branding & content agency" |
| Meta description | In this project, I designed and built the Webflow website for Echo Creative Agency, a creative agency in Groningen. Launched in 2026. |
| Hero visual | the other cases use a looping background video (`.work_video`, Webflow-hosted mp4 + webm). ⚠️ I can record a 25 s scroll clip with media/record-site.js, but a Webflow background video has to be uploaded in the Designer, not via the API. Until then: the 1200x1176 hero screenshot. |
| Style image | ⚠️ none yet (the others show a brand board: logo, palette, type). Echo's identity is their own, so maybe a "site style" board instead. |
| Testimonial (quote, name, role, headshot) | ⚠️ none yet. Ask Lieke or Lune for two or three sentences. |
| Draft | yes |
| NL locale | ⚠️ the site has an /nl locale; the item is created in the primary locale only unless you want the NL copy too. |

### Why "Branding" is not in the service line
Echo is a branding agency; the logo, serif + mono type and cream palette on the site are their identity. Rimbo's part was design and build of the site. ⚠️ If Rimbo did more on the identity, add it.

## Home marquee item (section#Target1 .marquee_group, #M1)

```html
<div class="marquee-advanced__item-width">
  <a aria-label="See project Echo Creative Agency" data-cursor="Echo Creative Agency" href="/work/echo-creative-agency" class="marquee_link w-inline-block">
    <img class="marquee_image" src="ECHO_ASSET_URL" alt="Echo Creative Agency, project visual preview." sizes="100vw" loading="lazy">
  </a>
</div>
```

## /work grid card (#WORK_GRID, after Digital Feng Shui)

```html
<a href="/work/echo-creative-agency" class="work_item w-inline-block">
  <div class="work-image">
    <div class="grain in-work"></div>
    <div class="external-link"><img loading="lazy" src="https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/63442a1fdd8ea3e421bf021c_link%20imag2.svg" alt="Link icon" class="linkimg"></div>
    <img width="562.5" src="ECHO_ASSET_URL" alt="Echo Creative Agency website preview" class="workimg">
  </div>
  <div class="workov_title">Echo Creative Agency</div>
  <div class="extra_info_work">Creative agency in Groningen</div>
</a>
```
(The existing cards carry a per-project combo class on `.work-image` / `.workimg`, e.g. `dfs`, `charlies`; check in the Designer whether Echo needs one.)

---

## Case copy (first person, same section order as Charlie's Angels and Digital Feng Shui)

### Introduction

**Echo Creative Agency** is a creative agency in Groningen, run by Lieke and Lune. They do social media management, branding, content creation and art direction for brands that want to be remembered, not just seen. A lot of their clients are hospitality brands from the north: Hotel Miss Blanche, Café De Sigaar, Bar Barrie, Herberg Onder de Linden, the NEXT gyms, Club Caddie, and plenty more.

Their line says it all: *Create for conversation.* Everything they make has to add up to one story that keeps resonating. That is also what the website had to do.

⚠️ How the collaboration started (who introduced whom, when the project began): add one or two sentences.

### The Mission

Echo needed a site that does what they do for their clients: show the work, tell the story behind it and make people want to talk. Not a brochure. A place where every client gets its own case with real photography, where the team and the Echo Collective (their network of photographers, videographers and content creators) get a face, and where getting in touch feels like the start of a conversation rather than a form.

Just as important: Echo had to be able to keep it alive themselves. New clients, new photos, new cases, without waiting for a developer.

### Discovery & Style Exploration

⚠️ Workshops, moodboards and references: fill in what actually happened.

The direction was set by Echo's own identity: a warm cream background, a serif for the copy, a mono accent for labels, and photography doing the talking. The site's job was to stay out of the way of that photography and add motion that feels like Echo: calm, a bit playful, never loud.

### Working with an existing identity

Echo is a branding agency, so the identity was theirs. My job was to translate it into something that moves. The scribbled Echo mark became a spinning sticker, the brand colours became variables, and the photo-first look became the rule for every page: big images, lots of air, type that steps back.

⚠️ If any identity work was done together (type choices, the olive accent, logo cropping for the client logos), say so here.

### UX Design & Content Strategy

The site has six places to be: Home, Projects, Services, Ons Verhaal, Collective and Contact.

- **Home** opens on a tornado of client photos that spirals in on load. Then two titles stick while you scroll ("Create for conversation." / "Omdat storytelling blijft."), the services, a logo-and-quote testimonial strip, the Creations slider with every client, and a FAQ.
- **Projects** has a case page per client. Every case has the same bones: a title, "Echo voor / Focus / Samen sinds", a drag-to-browse photo gallery and a link on to the next cases. Nineteen cases at the moment.
- **Services** lists what each service covers, plus "Hoe we samenwerken": six steps as a horizontal card row you drag or click through, with the current step always in the middle.
- **Collective** shows the makers as polaroids on an arc, with the six-step process and its own FAQ.
- **Contact** gives you two buttons, "Bel Lieke" and "Bel Lune", shown in a random order so neither always comes first, and a form that asks what you are looking for and whether you'd rather be called back.

### Webflow Development

As with most of my projects the site is built in Webflow ⚠️ (Client-First? the Osmo-style BEM classes suggest the Osmo boilerplate; say which framework). Everything that moves is written by hand:

- **Page transitions** with Barba: a panel lifts and the next page's first screen starts under it, so a click never feels like a reload.
- **Smooth scroll** with Lenis, and GSAP (ScrollTrigger, SplitText, Draggable with InertiaPlugin, Flip, Observer, CustomEase) for the rest.
- **The hero tornado**: a 3D ring of photo cards that spirals in on load, shrinks away again on the first scroll (a shutter of rows closes over it on desktop, the cards shrink back on phones) and reverses when you scroll back up. Lighter on phones, off for people who prefer reduced motion.
- **Drag galleries** on every case, built from a "Gallery photo" component: Echo adds a photo with Cmd+D in the Designer, picks the image, drags to reorder. Landscape or portrait is detected by the script.
- **Case slides** in the Creations slider and **Case details** on every case page are components too, so a new client is a few props, not a rebuild.
- **The random call button**: "Bel ons" rings Lieke or Lune, 50/50 per page view, and logs who got the call.
- **Forms straight into Airtable**: the contact form and the newsletter field post to an Airtable base through a Webflow webhook and an Airtable automation, no code in between, so Echo sees every lead in one table. ⚠️ The brief said "Make + Airtable"; the notes say Webflow webhook → Airtable automation (no Make). Confirm which one is live.
- **Code outside Webflow**: all JavaScript lives in a GitHub repo and loads from jsDelivr pinned to a version tag, so every change has a history and a rollback.

Smaller things that add up: reveal groups that open images first and then slide the text in, the scroll indicator with its looping dot, the sticky titles, a wavy client marquee, odometer numbers, the spinning Echo sticker, a menu that slides the page away instead of covering it, and a footer that parallaxes in.

### Handing it over

From the end of October Echo places their own images and copy, guided by a tutorial I wrote. Cases, photos, slider, details: all editable without me. I only tweak.

⚠️ Add a line about what launch looked like (date, reception) if you want it. The custom domain went live in the first days of November 2026.

### Conclusion

⚠️ Write this one yourself or tell me the feeling: what you are proud of, what Echo said, what is next (video in the galleries, a CMS for the cases).

I'm also part of Echo Collective as their "digital wizard", so this is not the last thing we make together.

---

## Facts used (verified)

- Live site: echocreativeagency.nl, pages /, /projects (19 case pages), /services, /ons-verhaal, /collective, /contact. Footer credit "Website created by Rimbo Designs". Custom domain last published 2026-11-03.
- Team on the site: Lieke and Lune (co-founders), Ylene (Content Manager), Sophie; office at the Heresingel, Groningen (earlier the Nassaulaan).
- Services on the site: Social Media Management, Branding, Content Creation, Website Design, Art Direction.
- Collective page lists Rimbo as "Rimbo (digital wizard)".
- Scripts: github.com/rimbodesigns/echo-scripts, main.js v1.0.68 live via jsDelivr, 70 commits since 2026-10-06, ~5,200 lines. Libraries on the live site: GSAP 3.15 (CustomEase, Draggable, Flip, InertiaPlugin, Observer, ScrollTrigger, SplitText), Barba 2.10.3, Lenis 1.0.23.
- Session notes: 22 case pages created 2026-10-17 as static pages from a template, merged to 19 on 2026-10-27; "Gallery photo", "Case slide" and "Case details" components; contact form "Contact" → Airtable base "Web Leads" via a Webflow form_submission webhook and an Airtable automation (newsletter form → "Nieuwsbrief" table, automation still off at that time); random call button added 2026-10-22; Echo self-editing from 2026-10-27.
