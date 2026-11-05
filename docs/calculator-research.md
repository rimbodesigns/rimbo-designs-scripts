# Project calculator: research (2026-11-04)

Question: how do designers and agencies build neat "what will my project cost" tools, and
what should Rimbo's look like given: three separate tracks (Branding, Digital Base, Rimbo
Magic), value pricing, no hours shown, no "simple page" option.

Most of what the web turns up is vendor marketing (form builders selling templates), so
treat claims as directional, not proven. I found no independent conversion data.

## What others do

| Example | Inputs | Result | Hand-off |
|---|---|---|---|
| [Brix Templates, Framer calculator](https://apps.brixtemplates.com/framer-website-pricing-calculator) | Page-count slider (1-200), "agency level" (1x to 7x multiplier) | A range **and** one headline number ($9k-$18k, headline $18k) | None (a template demo) |
| [Sayenko Design](https://www.sayenkodesign.com/?p=20402) | Page count, features, complexity | "Ballpark", claims 15-20% accuracy | "Schedule a discovery call for a precise quote" |
| [One Little Web](https://onelittleweb.com/?p=65509) | Site type, design preference, page count, who builds it, extras | Estimate, notes a personalised quote needs exact specs | Quote request |
| [Unique Web Designer](https://uniquewebdesigner.com/?p=245643) | Site type, pages, features, complexity | Free estimate | Optional follow-up meeting to review the selections |
| [involve.me agency template](https://involve.me/templates/website-cost-calculator-for-agencies), [Paperform](https://paperform.co/templates/squarespace-website-design-quote-calculator), [AidaForm](https://aidaform.com/templates/website-design-cost-calculator.html) | Form-builder templates: design, functionality, timeline | Priced estimate, captures the lead | Quote form |
| [LeadQuizzes](https://www.leadquizzes.com/interactive-pricing-estimator/), [Calconic](https://www.calconic.com/blog/make-your-pricing-page-efective-with-web-calculators) | A few tailored questions | Instant range | Sales gets the answers before the first call |

Pricing logic behind them ([Contra](https://contra.com/blog/freelance-website-designer-how-much-to-charge-for-a-website),
[AAMAX](https://www.aamax.co/blog/web-design-pricing-calculator)): base fee + per page + per
feature, multiplied by a complexity factor. That is all a calculator is.

## Patterns worth copying

1. **Few inputs.** Pages, complexity, features. Past about six questions it turns into a
   form and people stop.
2. **A range, not a point.** A hard number reads as a quote you can be held to. A range
   reads as a starting point and keeps the call useful. Vendors that mention it suggest a
   range until the visitor commits to something specific.
3. **The result is the pitch for the call**, not a replacement for it: "this is where
   projects like yours start; the call is where we scope yours." Sayenko and Unique Web
   Designer do exactly this.
4. **Send the selections along.** The best hand-offs carry the visitor's answers into the
   booking or quote step, so the call starts informed.
5. **Plain live update**, no "calculate" button and no email gate before the number.

## Patterns to skip for Rimbo

- Agency-tier multipliers (Brix): they sell the studio's level, but Rimbo's level is fixed.
- A site-type picker with a "simple/brochure" entry: contradicts "everything is Magic".
- An email gate before the result: adds friction; the booking button is the gate.
- Showing hours or a per-hour rate anywhere.

## Recommendation (updated: one configurable build, no tiers)

Everything is delivered at the Magic standard, so there are no tier choices. One page,
toggle on, toggle off, result updating live:

1. **Pages**, counted by complexity: simple, medium, complex, each with its own price.
2. **Branding**: a toggle, with a light or full choice when on.
3. **Add what you need**: plain toggles, each with a price: SEO/AEO, blog/CMS, design
   system, members area, webshop, multi-language, chatbot, lead automation, light/dark
   mode, content migration.
4. **Result**: a starting range, the list of what is switched on with prices, and **Book a
   call** with that list carried into the booking notes.

Rules that keep it honest:
- The result is a **starting range**, rounded to EUR 500, and says it is not a quote.
- No hours, no hourly rate, nothing that lets a lead divide price by time.
- Every price lives in one `CONFIG` object at the top of `calculator.js`.
- All prices in the prototype are **placeholders** until `docs/offer.md` is decided.

## Open choices for Rimbo

- Show the range as `from EUR X` only, or `X to Y`? Prototype shows the range.
- Include branding in the same total, or only beside it? Prototype shows it beside it,
  and adds a combined line only if both are chosen.
- Should the page live on rimbodesigns.com (Webflow embed, `calculator.js` from jsDelivr)
  or on its own? The prototype is a plain page so it can be either.
