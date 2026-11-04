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
5. **CTA.** One end-of-article block in place of two separate ones (newsletter + "Click to book a call"): a
   short line from Rimbo, the global `.btn` "Book a call", and the newsletter as a secondary line. The page
   then ends with a single clear next step.
6. **Small fixes seen while testing.** On phones the fixed logo sits on top of the text while you scroll. The
   old red progress bar along the top is now hidden by the ruler code, so it can be deleted from the template
   once the ruler goes live.

## Open questions for Rimbo

- Keep the dark newsletter card, or fold it into the single CTA block?
- Should the "On this page" list also show on desktop, or is the ruler enough there?
