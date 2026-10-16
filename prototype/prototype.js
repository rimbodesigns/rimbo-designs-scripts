// Prototype changes on top of the synced staging page. Runs before main.js, so the site
// script animates whatever this leaves in the DOM. Keep every change small and reversible.
(function () {
  'use strict';

  // ---- HERO: the title smaller, the services line back, no button, everything higher.
  // (all of it in prototype.css; nothing to add to the DOM)

  // ---- ARCHITECTURE: placeholder blocks after the work carousel. Each one says what the
  // section should do; nothing here is the design yet.
  var plan = [
    {
      n: '03', name: 'Services', title: 'What working with me looks like',
      does: 'Replaces the Service page. In one strip: the three disciplines, how a project runs, and what it costs to start. Nobody has to leave the home page to find out.',
      inside: ['Branding · Design · Development, one line each', 'The four steps: Discover, Brand, Design, Build', 'Starting price or packages, said plainly', 'One button: Start a project'],
      layout: 'steps'
    },
    {
      n: '04', name: 'Proof', title: 'Numbers and names',
      does: 'A short strip that answers "can I trust this person" before the testimonials do.',
      inside: ['20+ success stories', 'Google rating with the review count', 'A row of client marks, small and quiet'],
      layout: 'strip'
    },
    {
      n: '05', name: 'Kind words', title: 'Three voices, the rest on Google',
      does: 'The testimonials from the Service page, three at a time, with the verified Google link.',
      inside: ['Three quotes, name and company', 'Link: all verified Google reviews', 'Later: the ones that match the project someone just looked at'],
      layout: 'cards'
    },
    {
      n: '06', name: 'About', title: 'Your designer',
      does: 'In the spirit of "Your Instructor" on Digital Feng Shui: a portrait, three lines, and the side projects as credibility.',
      inside: ['Portrait in a ring', 'Three short paragraphs: what you do, how you work, where you are', 'Digital Feng Shui and Rhythms as proof you build your own things'],
      layout: 'split'
    },
    {
      n: '07', name: 'Resources', title: 'Notes worth reading',
      does: 'The latest three pieces from the Resources page, so that page is reachable from home without a menu.',
      inside: ['Three cards from the CMS: title, one line, reading time', 'One line for the newsletter', 'Link: all resources'],
      layout: 'cards'
    },
    {
      n: '08', name: 'Start', title: 'Start a project',
      does: 'The contact page, folded in: pick a time right here. This is where "2 spots left" lives now.',
      inside: ['Cal.com calendar, inline', 'Email for people who do not do calendars', 'Spots left this quarter'],
      layout: 'calendar'
    }
  ];

  var skeletons = {
    steps: '<div class="proto-skel is-steps"><i></i><i></i><i></i><i></i></div>',
    strip: '<div class="proto-skel is-strip"><b>20+</b><b>4.9 ★</b><i></i><i></i><i></i><i></i></div>',
    cards: '<div class="proto-skel is-cards"><i></i><i></i><i></i></div>',
    split: '<div class="proto-skel is-split"><u></u><div><i></i><i></i><i></i></div></div>',
    calendar: '<div class="proto-skel is-calendar"><div><i></i><i></i></div><u></u></div>'
  };

  var work = document.querySelector('[data-glass-carousel]');
  if (work && !document.querySelector('.proto-plan')) {
    var tag = document.createElement('div');
    tag.className = 'proto-tag';
    tag.innerHTML = '<span>02 · Work</span> The carousel stays. The way the work is presented gets its own round later.';
    work.insertAdjacentElement('afterend', tag);

    var outer = document.createElement('div');
    outer.className = 'proto-plan-wrap';
    var wrap = document.createElement('div');
    wrap.className = 'proto-plan';
    var html = '<div class="proto-plan_intro"><span class="proto-label">Plan</span><h2>The home page does the work of Service, Work, Resources and Contact.</h2><p>Each block below is a placeholder: what the section should do, not yet how it looks. We go through them one by one.</p></div>';
    plan.forEach(function (b) {
      html += '<section class="proto-block" data-layout="' + b.layout + '">' +
        '<div class="proto-block_head"><span class="proto-label">' + b.n + ' · ' + b.name + '</span><h3>' + b.title + '</h3><p>' + b.does + '</p></div>' +
        '<ul class="proto-block_list">' + b.inside.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        skeletons[b.layout] +
        '</section>';
    });
    wrap.innerHTML = html;
    outer.appendChild(wrap);
    tag.insertAdjacentElement('afterend', outer);
  }
})();
