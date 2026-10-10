# Redesign direction (notes from Rimbo, 2026-10-10)

Test page: Home Copy (/home-copy). Everything below is the brief in Rimbo's words plus
Claude's proposals, so the next Webflow session can start from it.

## What Rimbo said

- The home page should do more work. A visitor should not need the Service page, and we
  do not send people to the Work page either: the work is shown on the home page itself.
  No forced clicks, just leading them through the experience.
- A small, fresh, well-crafted About Me section, in the spirit of the "Your Instructor"
  block on digital-fengshui.com.
- Big fan of the grain effect; try it on the darker background too.
- The darker dark of the carousel section (#131313 felt too light next to it) might become
  the main colour of the site. Try the site with that darker dark.
- Works to show: Digital Feng Shui as the main piece (latest work), plus ECHO, built
  differently from the current static covers: interactive, recorded sections of the page,
  the logo moving, something more exciting inside the square panel.

## Done while Webflow was disconnected (v1.6.0)

- The glass carousel takes a **video panel**: an item whose picture is a muted, looping
  `<video data-glass-carousel-image>` becomes a live texture. In Webflow: put an HTML embed
  inside the item instead of the image:

  ```html
  <video data-glass-carousel-image class="glass-carousel__item-img"
         muted loop playsinline autoplay preload="auto"
         src="https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.6.0/media/dfs-home.mp4"></video>
  ```

  Keep the `data-glass-carousel-content` block (caption) and the link as in the other items.
  Square clips match the other covers (they are 1200 x 1176).
- `media/dfs-home.mp4`: 25 s, 900 x 882, 2.2 MB. A slow scroll through the DFS home on
  staging (Keeper logo ticking in the nav), down and back up so it loops without a jump.
  Made with `media/record-dfs-home.js` (playwright-core driving the installed Chrome,
  CDP screencast, ffmpeg). Re-run it when the DFS site changes.
- Prototype checked locally: DFS clip as the first panel, the seven covers after it, on
  #0c0c0c. MP4 first in the source list; a VP9 webm failed to decode in one Chrome build.

## Proposals

### Home page flow (one page that does the work)
1. Hero: name + one line, the carousel right under it (as now).
2. The carousel is the Work section. Caption under the centred panel, click opens the case
   study for those who want it; nothing pushes them there.
3. Three short "what I do" blocks (Branding, Design, Development) with one sentence each
   and a small proof per block, instead of the Service page.
4. About Me (below).
5. Testimonials (the ones from the Service page, fewer).
6. One call to action: book a call.

### About Me (modelled on "Your Instructor")
Same bones as the DFS block: a portrait with a ring, two social links, three short
paragraphs. Draft, in the same voice as the DFS one (English, written by Rimbo later):

> Rimbout is a UX designer. His job is obsessing over how a system should feel to use, so
> that what you ship comes out effortless.
>
> He has done that for brands, web shops, course platforms and his own tools, and he
> builds what he designs, in Webflow and in code.
>
> Based in the Netherlands, working with clients anywhere. One project at a time.

### The darker dark
- Carousel section: #0c0c0c (used in the prototype) instead of #131313.
- Site-wide: change the Color/Black variable and everything follows. Text on Black
  (#a4a4a4) may need to go a touch lighter on #0c0c0c. Grain on top of it: the existing
  GRAIN_EFFECT component, lower opacity.

### ECHO as a moving panel
Same recipe as DFS: record the ECHO hero with the tornado and the page transitions,
10 to 25 s, square, loop by scrolling back. If the ECHO site is on a Webflow staging domain,
point `record-dfs-home.js` at it.

### Open questions for Rimbo
- Which parts of the DFS page should the clip show? Now: hero, "Is this you", the outcomes,
  the testimonial, down to the chapters.
- Dark or light rendering of the DFS site in the clip (the site has a night mode)?
- Does the About Me get a photo, or the pixel style of the DFS icons?
