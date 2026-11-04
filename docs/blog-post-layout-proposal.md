# Blog post detail page: layout refresh (proposal, 2026-11-04)

Step 2 after the scroll ruler. Nothing here is built yet. It waits for Rimbo's go.
Template: Webflow CMS "Blog posts" (`/post/[slug]`). Today: a centred intro (category, H1, author, date and read time,
share icons, summary), then the cover, the rich text (`.richtextbox > .richtextstyling`), the newsletter, the
"Book a call" card and three related posts.

## What I'd change

1. **Reading width and rhythm.** The text column is 40rem with 20px body text at 172% line height. That's a
   comfortable measure, but the line height reads loose and H2s get 5.25rem above them, so sections drift apart.
   Proposal: body 1.125–1.1875rem at about 160%, a 38–40rem measure, and H2 spacing closer to 4rem. Figures
   stay wider than the text (as now), with captions in RM Mono, small and uppercase like the ruler labels.
2. **Header.** One left-aligned block on the text column instead of a centred stack: category and read time as a
   mono eyebrow (`UI/UX DESIGN · 14 MIN READ`), the H1, then author and date in one line. The cover goes below it at
   figure width, in 3:2 like the covers. The summary H2 (`.sumary`) becomes a lead paragraph, because a second
   H2 above the article confuses the heading outline.
3. **"On this page" (from Osmo's Table of Contents).** The ruler already works as the table of contents on wide
   screens. On phones and tablets it has no labels, so a short collapsible "On this page" list under the header
   would cover them, using the same rich-text H2s and the same `{skip}` marker (the ruler already sets
   `data-toc-ignore` on skipped headings). The TOC's id-per-heading idea also gives shareable links like
   `/post/wordpress-vs-webflow#what-is-webflow`.
4. **Related posts.** Three cards from the same category, without the current post (the list now shows the post
   you're reading as the first card). Same card as the blog overview, so both pages share one component.
5. **CTA: one project call, no newsletter.** Branding Brilliance hasn't had an issue in a year and you don't plan
   to restart it, so the newsletter sign-up comes off the post template. In its place goes one block at the end of
   the article, about starting a project: a short line from you, your photo, and the global `.btn` "Start a
   project" (it opens the Cal.com booking, like "Click to book a call" does now). The `/branding-brilliance-newsletter`
   page and its form can be dealt with separately (keep the page for old links, or redirect it).
6. **Small fixes seen while testing.** On phones the fixed logo sits on top of the text while you scroll. The
   old red progress bar along the top is now hidden by the ruler code, so it can be deleted from the template
   once the ruler goes live.
7. **Grain.** The same `GRAIN_EFFECT` component as on the new home, but subtler on posts (about half the home's
   opacity, around 0.03), so it adds texture without hurting the text. To check on the beige page and on the
   dark CTA block before it goes in.
8. **Related-post cards: the white bar.** Nothing broke recently; it's how the card is built. The dark text block
   always starts 16rem (256px) from the top of the card, while the image's height follows the card width (3:2).
   On screens of about 1440px and wider the image is taller than that, so they overlap and nothing shows.
   Narrower than that, the image stops short and the card's light background shows through: about 12px at
   1280px and about 64px at 1024px. Fix in Webflow: give `.image-318` a 16rem height, 100% width and
   `object-fit: cover` (12.125rem from 767px down, where the text block starts there). Then the image always
   meets the text block. Two style changes, no code.

## Open questions for Rimbo

- The project CTA: "Start a project" or keep "Book a call" as the button text?
- Should the "On this page" list also show on desktop, or is the ruler enough there?
