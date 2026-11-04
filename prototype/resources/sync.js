// Builds prototype/resources/index.html: the live /resources page from the Webflow staging site with the
// old Finsweet filter swapped for the new header (title left, filters + count + language on the right)
// and the Osmo multi filter in /main.js (rdMultiFilter). The CSS in resources.css is what to rebuild in the Designer.
// Run: node prototype/resources/sync.js      Then open http://localhost:8777/prototype/resources/  (node prototype/server.js)
const fs = require('fs');
const path = require('path');
const SOURCE = 'https://rimbodesigns.webflow.io/resources';

const slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const res = await fetch(SOURCE + '?sync=' + Date.now(), { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error('staging answered ' + res.status);
  let html = await res.text();

  // site script from this repo, no Finsweet filter/count, no tag manager
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/rimbodesigns\/rimbo-designs-scripts@[^"]+\/main\.min\.js"><\/script>/, '<script src="/main.js"></script>');
  html = html.replace(/<script[^>]+finsweet\/attributes-(cmsfilter|countitems)[^>]*><\/script>/g, '');
  html = html.replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/g, '');
  html = html.replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/g, '');
  html = html.replace(/<script[^>]+googletagmanager[^>]*><\/script>/g, '');
  html = html.replace(/<script async="" src="\/[^"]*"><\/script>/g, '');

  // each card: its tag becomes the filter name, the old Finsweet fields go
  html = html.replace(/<div class="post w-dyn-item"/g, '<div class="post w-dyn-item"'); // (kept as is)
  html = html.replace(/<div data-w-id="([^"]+)" role="listitem" class="post w-dyn-item">/g,
    '<div data-w-id="$1" role="listitem" data-filter-name="" data-filter-status="active" class="post w-dyn-item">');
  html = html.replace(/<div fs-cmsfilter-field="Filter" class="tag">([^<]*)<\/div>/g,
    (m, t) => `<div data-filter-name-collect="${slug(t)}" class="tag">${t}</div>`);
  html = html.replace(/<div fs-cmsfilter-field="Filter" class="hide">All<\/div>/g, '');
  html = html.replace(/ fs-cmsfilter-field="BlogType"/g, '');
  html = html.replace(/ fs-cmsfilter-element="list" fs-countitems-element="list"/, '');
  html = html.replace('id="bloglist"', 'id="bloglist" data-queued-reveal-group=""'); // Osmo queued reveal, on each card's link
  html = html.replace(/(role="listitem" data-filter-name="")/g, 'data-queued-reveal-item="" $1'); // on the shadowed card itself
  html = html.replace('<div class="main-wrapper">', '<div data-filter-group="" data-filter-target-match="multi" data-filter-name-match="multi" role="group" class="main-wrapper">');

  // the tags that exist, in the order of the old filter
  const tags = [...html.matchAll(/data-filter-name-collect="([^"]+)" class="tag">([^<]*)</g)].map((m) => [m[1], m[2]]);
  const names = new Map(tags);
  const order = ['online-marketing', 'branding', 'ui-ux-design'].filter((s) => names.has(s)).concat([...names.keys()].filter((s) => !['online-marketing', 'branding', 'ui-ux-design'].includes(s)));
  const chips = order.map((s) => `<button data-filter-target="${s}" data-filter-status="not-active" aria-pressed="false" aria-controls="bloglist" class="rs-chip">${names.get(s)}</button>`).join('');

  const header = `<div class="rs-head">
  <h1 id="HeroTitle" class="rs-title">Resources</h1>
  <div id="First_content" class="rs-tools">
    <div class="rs-meta">
      <button data-filter-target="reset" data-filter-status="not-active" aria-pressed="false" aria-controls="bloglist" class="rs-reset">Reset</button>
      <p class="rs-count" aria-live="polite"><span data-filter-count="shown">10</span> of <span data-filter-count="total">10</span> articles</p>
      <div class="rs-lang" role="group" aria-label="Language"><a hreflang="en" href="/resources" aria-current="page" class="rs-lang__a w--current">EN</a><a hreflang="nl" href="/nl/resources" class="rs-lang__a">NL</a></div>
    </div>
    <div class="rs-chips" role="group" aria-label="Filter by topic">
      <button data-filter-target="all" data-filter-status="active" aria-pressed="true" aria-controls="bloglist" class="rs-chip">All</button>
      ${chips}
    </div>
  </div>
</div>`;

  const a = html.indexOf('<div class="intro_text is_resources">');
  const b = html.indexOf('<div id="original"');
  if (a < 0 || b < 0) throw new Error('could not find the old header on the staging page');
  html = html.slice(0, a) + header + html.slice(b);

  html = html.replace('</head>', '<link rel="stylesheet" href="/prototype/resources/resources.css">\n</head>');
  html = html.replace('id="bloglist" role="list"', 'id="bloglist" aria-live="polite" role="list"');
  html = html.replace(/href="\/(?!\/|prototype\/)/g, 'href="https://rimbodesigns.webflow.io/');
  html = html.replace('href="https://rimbodesigns.webflow.io/resources"', 'href="/resources"');
  html = `<!-- Prototype of the new /resources header + Osmo multi filter, built from ${SOURCE} on ${new Date().toISOString().slice(0, 10)} with /main.js from this repo. A sync overwrites it; edit resources.css or sync.js. -->\n` + html;
  fs.writeFileSync(path.join(__dirname, 'index.html'), html);
  console.log('prototype/resources/index.html:', order.length, 'filters (' + order.join(', ') + '),', (html.match(/data-filter-status="active" class="post/g) || []).length, 'cards');
})().catch((e) => { console.error(e); process.exit(1); });
