# Navigation: suggestion (2026-11-04)

Only a suggestion. Nothing is built, and nothing changes on live. Next step if you like it: a local prototype on
top of the staging page (like `prototype/v2`), so you can try both states before anything goes into Webflow.

## How it works now

- **Top of the page** (`#Top_Nav`, desktop only): four outlined buttons, 7.5rem wide (Service, Work, Resources,
  Contact), with the logo in the middle, 36px from the top. They drop in with a blur on load.
- **After scrolling** (`#FIXED_NAV`, from 992px): a second header slides down over 300px of scroll. Its logo sits
  32px from the top and 5% in from the left (72px at 1440), and the burger sits 4% in from the right. Both use
  `mix-blend-mode: difference`.
- So the logo changes size and position between the two states, and on the left it doesn't line up with
  anything. The new scroll ruler starts at 20px, the text column at 400px.

## What I'd change

1. **One line, close to the top.** The logo and burger sit on a single line 1.5rem (24px) from the top. Each
   sits 1.5rem from its side of the screen, so the logo lines up with the scroll ruler below it. On phones that
   becomes 1rem. That's the "more to the top, more to the left" you mentioned.
2. **The logo stays put.** Same size and place in both states (around 5.5rem wide), so nothing jumps when you
   scroll. Only the right side changes.
3. **Keep the switch to the burger, make it one movement.** At the top, the right side shows the links as plain
   text (Service, Work, Resources, Contact) with the letter-roll hover you already have, plus one button,
   "Start a project" (the global `.btn`). After a short scroll, the links fade and blur out to the right and the
   burger fades in where they were, with no second header sliding down. Scrolling back up brings the links back.
4. **Drop the outlined boxes.** Four equal outlined buttons make the nav feel heavy and a bit 2022, and they
   compete with the real call to action. Plain text links with one filled button make the order clear: look
   around, or start a project.
5. **Keep `mix-blend-mode: difference`.** It's what keeps the logo and burger readable over the dark sections,
   the band and the covers. The scroll ruler already uses it too.
6. **Phones:** unchanged apart from the spacing: the logo and burger 1rem from the edges and the top. While
   testing the ruler I saw the fixed logo sit on top of the text while you scroll. A small blurred backdrop
   behind the logo and burger, only on phones, would fix that.

## What it touches

- Webflow: the `topnav`, `new_nav`, `rimbodesign_logo` and `burgermenu` styles, plus the nav component. It
  appears on every page, so it gets tested on every template (home band, service, work, case study, posts).
- `main.js`: `initNav()` (the drop-in on load and the slide-down) becomes the fade between links and burger.
  `rdBand()` hides and shows the nav on the home band, so it is tested there too.
