# Osmo Supply: Scroll Ruler

Saved as received (2026-11-04). Reference copy: do not edit. The site's version lives in `main.js`
(`rdScrollRuler`), with the theme overrides and the H2 naming kept apart from this code.

## HTML

```html
<nav data-scroll-ruler-init data-scroll-ruler-parts="[data-scroll-ruler-name]" aria-label="Page progress" class="scroll-ruler">
  <div data-scroll-ruler-list aria-hidden="true" class="scroll-ruler__list">
    <div data-scroll-ruler-tick class="scroll-ruler__tick"></div>
  </div>
  <div data-scroll-ruler-labels class="scroll-ruler__labels">
    <button data-scroll-ruler-label type="button" class="scroll-ruler__label">Label</button>
  </div>
</nav>
```

## CSS

```css
.scroll-ruler { --scroll-ruler-color: #f2f2f2; --scroll-ruler-accent: #ff5a36; z-index: 50; color: var(--scroll-ruler-color); padding-left: 1.25em; padding-right: 2.5em; position: fixed; top: 20svh; bottom: 20svh; left: 0; cursor: pointer; touch-action: manipulation; user-select: none; transition: opacity 0.6s ease; }
.scroll-ruler[data-scroll-ruler-status="idle"] { opacity: 0.4; }
.scroll-ruler__list { flex-direction: column; justify-content: space-between; align-items: flex-start; height: 100%; display: flex; }
.scroll-ruler__tick { opacity: 0.3; transform-origin: 0%; background-color: currentColor; width: 0.75em; height: 1px; }
.scroll-ruler__tick[data-scroll-ruler-size="mid"] { width: 1.125em; }
.scroll-ruler__tick[data-scroll-ruler-size="major"] { width: 1.5em; }
.scroll-ruler__tick[data-scroll-ruler-status="passed"] { opacity: 0.9; }
.scroll-ruler__tick[data-scroll-ruler-status="current"] { opacity: 1; background-color: var(--scroll-ruler-accent); }
.scroll-ruler__labels { pointer-events: none; position: absolute; inset: 0%; }
.scroll-ruler__label { pointer-events: auto; opacity: 0.45; color: inherit; white-space: nowrap; background-color: transparent; border-style: none; padding: 0.375em 0.5em; font-family: Haffer Mono; font-size: 0.6875em; line-height: 1; letter-spacing: 0.04em; text-transform: uppercase; position: absolute; top: 0; left: 4.25em; cursor: pointer; }
.scroll-ruler__label:hover { opacity: 1; }
.scroll-ruler__label:focus-visible { opacity: 1; outline: 1px solid currentColor; outline-offset: 0.125em; }
.scroll-ruler__label[data-scroll-ruler-status="active"] { opacity: 1; color: var(--scroll-ruler-accent); }
@media (max-width: 767px) { .scroll-ruler__labels { display: none; } }
```

## JS (dependency: gsap 3.x)

```js
function initScrollRuler() {
  document.querySelectorAll("[data-scroll-ruler-init]").forEach((root) => {
    const tickCount = 65;
    const waveSize = 0.6;
    const waveWidth = 0.035;
    const speedBoost = 1;
    const cursorSize = 1.2;
    const cursorWidth = 0.06;
    const idleDelay = 1.2;
    const list = root.querySelector("[data-scroll-ruler-list]");
    const tickBlueprint = list.querySelector("[data-scroll-ruler-tick]");
    const labelWrap = root.querySelector("[data-scroll-ruler-labels]");
    const labelBlueprint = labelWrap ? labelWrap.querySelector("[data-scroll-ruler-label]") : null;
    const partSelector = root.getAttribute("data-scroll-ruler-parts");
    const parts = partSelector ? [...document.querySelectorAll(partSelector)] : [];
    const usingParts = parts.length > 0;
    if (!usingParts) root.setAttribute("aria-hidden", "true");
    tickBlueprint.remove();
    if (labelBlueprint) labelBlueprint.remove();
    const ticks = [];
    for (let i = 0; i < tickCount; i++) { const tick = tickBlueprint.cloneNode(true); list.appendChild(tick); ticks.push(tick); }
    const tickSetters = ticks.map((tick) => gsap.quickSetter(tick, "scaleX"));
    const tickPositions = ticks.map((tick, index) => index / (tickCount - 1));
    const tickStatus = ticks.map(() => "");
    const values = ticks.map(() => 0);
    const labels = [];
    if (usingParts && labelBlueprint) {
      parts.forEach((part, partIndex) => {
        const label = labelBlueprint.cloneNode(true);
        label.textContent = part.getAttribute("data-scroll-ruler-name") || String(partIndex + 1).padStart(2, "0");
        label.addEventListener("click", (event) => { event.stopPropagation(); scrollToPart(partIndex); });
        labelWrap.appendChild(label);
        labels.push({ element: label, partIndex: partIndex, tickIndex: 0, tickWidth: 0, setX: gsap.quickSetter(label, "x", "px") });
      });
    }
    let rangeStart = 0; let rangeLength = 1; let partStarts = []; let lastScroll = window.scrollY; let speed = 0; let currentIndex = null; let activePart = null; let pointerPosition = 0.5; let cursorTarget = 0; let cursorStrength = 0; let lastActive = 0; let rootStatus = ""; let reduceMotion = false;
    function gaussian(distance, width) { return Math.exp(-(distance * distance) / (2 * width * width)); }
    function measure() {
      const scrollY = window.scrollY;
      if (usingParts) {
        const tops = parts.map((part) => part.getBoundingClientRect().top + scrollY);
        const end = parts[parts.length - 1].getBoundingClientRect().bottom + scrollY;
        rangeStart = Math.max(tops[0], window.innerHeight / 2);
        rangeLength = Math.max(Math.min(end, document.documentElement.scrollHeight - window.innerHeight / 2) - rangeStart, 1);
        partStarts = tops.map((top) => gsap.utils.clamp(0, 1, (top - rangeStart) / rangeLength));
      } else { rangeStart = 0; rangeLength = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1); }
      const partTicks = partStarts.map((start) => Math.round(start * (tickCount - 1)));
      ticks.forEach((tick, index) => { let size = index % 5 === 0 ? "mid" : "minor"; if (usingParts ? partTicks.includes(index) : index % 10 === 0) size = "major"; tick.setAttribute("data-scroll-ruler-size", size); });
      let lastLabelY = -Infinity;
      labels.forEach((label) => {
        const tick = ticks[partTicks[label.partIndex]];
        const y = tick.offsetTop + tick.offsetHeight / 2;
        label.element.hidden = false; label.tickIndex = partTicks[label.partIndex]; label.tickWidth = tick.offsetWidth;
        if (y - lastLabelY < label.element.offsetHeight * 1.1) { label.element.hidden = true; return; }
        lastLabelY = y;
        gsap.set(label.element, { y: y, yPercent: -50 });
      });
      currentIndex = null;
    }
    function scrollToPosition(top) { window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" }); }
    function scrollToPart(partIndex) { scrollToPosition(parts[partIndex].getBoundingClientRect().top + window.scrollY); }
    function findPart(position) { let partIndex = 0; partStarts.forEach((start, index) => { if (start <= position) partIndex = index; }); return partIndex; }
    function update(time) {
      const frame = Math.min(gsap.ticker.deltaRatio(60), 3);
      const scrollY = window.scrollY; const scrollDelta = scrollY - lastScroll; lastScroll = scrollY;
      const speedNow = reduceMotion ? 0 : Math.min(Math.abs(scrollDelta) / window.innerHeight / frame / 0.04, 1);
      const speedEase = speedNow > speed ? 0.3 : 0.05;
      speed += (speedNow - speed) * Math.min(speedEase * frame, 1);
      const rawMarker = usingParts ? (scrollY + window.innerHeight / 2 - rangeStart) / rangeLength : scrollY / rangeLength;
      const marker = gsap.utils.clamp(0, 1, rawMarker);
      const insideRange = rawMarker >= 0 && rawMarker <= 1;
      cursorStrength += (cursorTarget - cursorStrength) * Math.min(0.15 * frame, 1);
      const waveAmount = waveSize * (1 + speedBoost * speed);
      const waveSpread = waveWidth * (1 + speedBoost * 0.8 * speed);
      const follow = reduceMotion ? 1 : Math.min(0.2 * frame, 1);
      for (let i = 0; i < tickCount; i++) {
        let target = waveAmount * gaussian(tickPositions[i] - marker, waveSpread);
        if (cursorSize > 0) target += cursorSize * cursorStrength * gaussian(tickPositions[i] - pointerPosition, cursorWidth);
        values[i] += (target - values[i]) * follow;
        tickSetters[i](1 + values[i]);
      }
      const nextIndex = insideRange ? Math.round(marker * (tickCount - 1)) : -1;
      if (nextIndex !== currentIndex) {
        currentIndex = nextIndex;
        ticks.forEach((tick, index) => { let status = "upcoming"; if (index === currentIndex) status = "current"; else if (rawMarker > 0 && tickPositions[index] <= marker) status = "passed"; if (tickStatus[index] === status) return; tickStatus[index] = status; tick.setAttribute("data-scroll-ruler-status", status); });
      }
      const nextPart = usingParts && insideRange ? findPart(marker) : -1;
      if (nextPart !== activePart) { activePart = nextPart; labels.forEach((label) => { label.element.setAttribute("data-scroll-ruler-status", label.partIndex === activePart ? "active" : "inactive"); }); }
      labels.forEach((label) => label.setX(values[label.tickIndex] * label.tickWidth));
      if (speed > 0.02 || cursorStrength > 0.1 || root.matches(":focus-within")) lastActive = time;
      const nextStatus = time - lastActive < idleDelay ? "active" : "idle";
      if (nextStatus !== rootStatus) { rootStatus = nextStatus; root.setAttribute("data-scroll-ruler-status", rootStatus); }
    }
    window.addEventListener("pointermove", (event) => { if (event.pointerType !== "mouse") return; const rect = list.getBoundingClientRect(); const reach = rect.height * 0.25; const distance = Math.max(event.clientX - rect.left - root.offsetWidth * 0.5, 0); cursorTarget = gsap.utils.clamp(0, 1, 1 - distance / reach); pointerPosition = (event.clientY - rect.top) / rect.height; });
    document.documentElement.addEventListener("pointerleave", () => { cursorTarget = 0; });
    root.addEventListener("click", (event) => { const rect = list.getBoundingClientRect(); const position = gsap.utils.clamp(0, 1, (event.clientY - rect.top) / rect.height); if (usingParts) scrollToPart(findPart(position)); else scrollToPosition(position * rangeLength); });
    gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => { reduceMotion = true; return () => { reduceMotion = false; }; });
    let resizeTimer;
    const resizeObserver = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 100); });
    resizeObserver.observe(document.body); resizeObserver.observe(root);
    measure();
    gsap.ticker.add(update);
  });
}
document.addEventListener("DOMContentLoaded", () => { initScrollRuler(); });
```

## Osmo's notes

- The script doesn't run in the Designer, which shows one tick and one label.
- Labels only appear when parts are on.
- With parts on, the ruler runs from the first part to the last.
- Reduced motion is handled.
- Lenis works with it as is.
