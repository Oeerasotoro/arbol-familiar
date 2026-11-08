/* =====================================================================
   APP.JS — draws the tree and makes every button work
   ---------------------------------------------------------------------
   Reads people from family-data.js, asks js/kinship.js how they are
   related, and takes its words from js/i18n.js.
   You should not need to edit this file to add people or photos.
   The settings you might want to tweak are in section 1.
   ===================================================================== */

(function () {                                             // Keep all variables private to this file
  'use strict';

  /* ===================================================================
     1. SETTINGS YOU CAN TWEAK
     =================================================================== */
  const CARD_W = 232;                                      // Card width in pixels
  const CARD_H = 88;                                       // Card height in pixels
  const AVATAR_R = 26;                                     // Radius of the round photo on each card
  const TEXT_X = 78;                                       // Where the text starts inside a card
  const TEXT_W = CARD_W - TEXT_X - 14;                     // How wide the text may get before wrapping
  const AVATAR_COLORS = ['#b4532a', '#6f8448', '#3f7891', '#8a5a7d', '#a1792c', '#59679a', '#9a5747', '#3f826a']; // Colours behind initials when there is no photo
  const ZOOM_MIN = 0.12;                                   // Furthest you can zoom out
  const ZOOM_MAX = 2.4;                                    // Closest you can zoom in

  /* ===================================================================
     2. READ THE DATA
     =================================================================== */
  const SETTINGS = window.SITE_SETTINGS || {};             // Title, starting person, language
  const fam = Kinship.buildFamily(window.FAMILY_DATA || []); // Lookup tables plus any data problems
  const people = Array.from(fam.byId.values());            // Everyone, as a simple list
  const defaultFocus = fam.byId.has(SETTINGS.defaultFocus) // Person the tree opens on
    ? SETTINGS.defaultFocus
    : (people[0] ? people[0].id : null);

  /* ===================================================================
     3. CURRENT STATE OF THE PAGE
     =================================================================== */
  const state = {
    lang: pickLanguage(),                                  // 'es' or 'en'
    focus: defaultFocus,                                   // Person whose point of view the labels use
    selected: null,                                        // Person whose profile is open
    panel: null,                                           // 'profile', 'compare' or null (closed)
    compareA: null,                                        // First person being compared
    compareB: null,                                        // Second person being compared
    picking: null,                                         // Which compare slot ('a' or 'b') is choosing a person
    relations: new Map(),                                  // person number -> relation to the focus person
    component: new Set(),                                  // everyone connected to the focus by any chain of links
    visible: new Set(),                                    // people currently drawn on the tree
    expanded: new Set(),                                   // relatives by marriage whose own family branch is open
    forced: new Set(),                                     // people shown because a visitor asked for them directly
  };

  /* ===================================================================
     4. SMALL HELPERS
     =================================================================== */
  const $ = function (sel) { return document.querySelector(sel); }; // Shortcut to find an element on the page
  function tr(key, vars) { return I18N.t(state.lang, key, vars); }  // Text in the current language
  function person(id) { return fam.byId.get(id); }                   // Person record by number
  function nameOf(id) {                                    // Name; for someone without a name, "Madre de Andrea y Viviana"
    const p = person(id);
    if (!p) return '';
    if (p.name) return p.name;
    const kids = fam.children.get(id).filter(function (c) { return person(c).name; }).map(function (c) { return givenName(person(c).name); });
    if (!kids.length) return tr('nameUnknown');            // no named children either: "Name unknown"
    const list = kids.length === 1 ? kids[0]
      : kids.length === 2 ? kids[0] + tr('and') + kids[1]
      : kids[0] + ', ' + kids[1] + tr('andOthers');
    return tr(p.gender === 'male' ? 'fatherOf' : p.gender === 'female' ? 'motherOf' : 'parentOf', { names: list });
  }
  function givenName(full) {                               // "María del Carmen Riascos" -> "María del Carmen"
    const w = full.split(/\s+/);
    let out = w[0], i = 1;
    while (i + 1 < w.length && /^(de|del|la|las|los)$/.test(w[i])) { out += ' ' + w[i] + ' ' + w[i + 1]; i += 2; }
    return out;
  }
  function genderOf(id) { const p = person(id); return p ? p.gender : 'unknown'; }
  function localized(v) {                                  // Text that may be a plain string or {es, en}
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v[state.lang] || v.es || v.en || '';
  }
  function initials(p) {                                   // "José Ernesto Eraso" -> "JE"
    if (!p.name) return '?';
    const words = p.name.split(/\s+/).filter(function (w) { return w && w[0] === w[0].toUpperCase(); }); // skip "del", "de"
    return words.slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function colorOf(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; } // Same colour for a person every time
  function lifespan(p) {                                   // "1950 – 2010", "n. 1950", "† 2005"
    if (p.born && p.died) return p.born + ' – ' + p.died;
    if (p.born) return (state.lang === 'es' ? 'n. ' : 'b. ') + p.born;
    if (p.died) return '† ' + p.died;
    return '';
  }
  function esc(s) {                                        // Make text safe to put inside HTML
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {                                       // "José Ríascos" -> "jose riascos" for searching
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
  function isPhone() { return window.matchMedia('(max-width: 760px)').matches; }
  function pickLanguage() {                                // Language from the link, the last visit, or the settings
    const fromHash = new URLSearchParams(location.hash.slice(1)).get('lang');
    if (fromHash === 'es' || fromHash === 'en') return fromHash;
    try {                                                  // Browser storage may be blocked; that is fine
      const saved = localStorage.getItem('tree-lang');
      if (saved === 'es' || saved === 'en') return saved;
    } catch (e) { /* ignore */ }
    return SETTINGS.defaultLanguage === 'en' ? 'en' : 'es';
  }
  function avatarHTML(p, cls) {                            // Small round photo or initials, as HTML
    const style = 'background:' + colorOf(p.id);
    const img = p.photo ? '<img src="' + esc(p.photo) + '" alt="" onerror="this.remove()">' : '';
    return '<span class="' + cls + '" style="' + style + '" aria-hidden="true">' + esc(initials(p)) + img + '</span>';
  }

  /* ===================================================================
     5. ARRANGE PEOPLE IN GENERATIONS (uses the dagre library)
     Partners are packed side by side into one "household" box so a
     couple always sits together. dagre then places the households in
     generations so that family lines cross as little as possible.
     =================================================================== */
  const COUPLE_GAP = 44;                                   // Space between two partners' cards
  const layout = { people: new Map(), unions: new Map(), drawn: new Map() };

  function sideBySide(id) {                                // Who sits next to whom: partners and parents of the same child
    const s = new Set(fam.partners.get(id));
    fam.coparents.get(id).forEach(function (q) { s.add(q); });
    return s;
  }

  function buildHouseholds(list) {                         // Group the drawn people who are partners (directly or in a chain)
    const groupOf = new Map();                             // person number -> household index
    const groups = [];
    list.forEach(function (p) {
      if (groupOf.has(p.id)) return;                       // Already placed in a household
      const members = [];
      const stack = [p.id];
      groupOf.set(p.id, groups.length);
      while (stack.length) {                               // Collect everyone joined by partner links
        const cur = stack.pop();
        members.push(cur);
        sideBySide(cur).forEach(function (q) {           // partners and co-parents share a household box
          if (!state.visible.has(q)) return;             // hidden people are not drawn
          if (!groupOf.has(q)) { groupOf.set(q, groups.length); stack.push(q); }
        });
      }
      groups.push({ key: 'h' + groups.length, members: orderHousehold(members) });
    });
    return { groups: groups, groupOf: groupOf };
  }
  function sharedKids(a, b) {                              // How many children two people have together
    return fam.children.get(a).filter(function (c) { return fam.children.get(b).indexOf(c) !== -1; }).length;
  }

  // Left-to-right order inside a household. Someone with several partners
  // (for example a father with children by different mothers) sits in the
  // middle: the longest chain of partners forms the row, and any extra
  // partners are added on the outer side nearest to the person they share
  // children with, those with more children first.
  function orderHousehold(ids) {
    if (ids.length <= 2) return ids.slice().sort(function (a, b) { return a - b; });
    const inGroup = new Set(ids);                          // (only drawn people are passed in)
    const nb = function (id) { return Array.from(sideBySide(id)).filter(function (q) { return inGroup.has(q); }); };
    let best = [], bestScore = -1;
    if (ids.length <= 12) {                                // Try every chain (households are small)
      ids.forEach(function (start) {
        (function grow(path) {
          let score = path.length * 1000;                  // longer chains win; ties go to chains with more shared children
          for (let i = 1; i < path.length; i++) score += sharedKids(path[i - 1], path[i]);
          if (score > bestScore) { bestScore = score; best = path.slice(); }
          nb(path[path.length - 1]).forEach(function (q) {
            if (path.indexOf(q) === -1) { path.push(q); grow(path); path.pop(); }
          });
        })([start]);
      });
    } else {
      best = [ids[0]];
    }
    const order = best.slice();
    const spineMid = (best.length - 1) / 2;                // centre of the original chain
    const sideOf = new Map();                              // each member's side of the row: -1 left, +1 right
    best.forEach(function (id, i) { sideOf.set(id, i < spineMid ? -1 : i > spineMid ? 1 : 0); });
    let rest = ids.filter(function (id) { return order.indexOf(id) === -1; });
    let placed = true;
    while (rest.length && placed) {                        // Add the remaining partners at the ends of the row
      placed = false;
      rest.sort(function (a, b) {                          // those with more children together go closer
        const sa = Math.max.apply(null, [0].concat(nb(a).map(function (q) { return sharedKids(a, q); })));
        const sb = Math.max.apply(null, [0].concat(nb(b).map(function (q) { return sharedKids(b, q); })));
        return sb - sa || a - b;
      });
      for (let k = 0; k < rest.length; k++) {
        const id = rest[k];
        const anchor = nb(id).find(function (q) { return order.indexOf(q) !== -1; });
        if (anchor == null) continue;
        let side = sideOf.get(anchor);                     // go on the same side as the person they share children with
        if (side === 0) side = order.indexOf(anchor) < (order.length - 1) / 2 ? -1 : 1; // middle person: the shorter side
        if (side < 0) order.unshift(id); else order.push(id);
        sideOf.set(id, side);
        rest.splice(k, 1); k--; placed = true;
      }
    }
    return order.concat(rest);
  }

  // Couples who are not next to each other in the row (a person's second or
  // third partner) are joined by a line just under the cards. Each such
  // line gets its own "level" so lines that overlap sideways don't merge.
  function underLevels(hh) {
    const levels = new Map();                              // union key -> level (1 = closest to the cards)
    let maxLevel = 0;
    hh.groups.forEach(function (grp) {
      const spans = [];
      layout.drawn.forEach(function (u) {
        if (u.parents.length !== 2 || hh.groupOf.get(u.parents[0]) !== hh.groups.indexOf(grp)) return;
        const i1 = grp.members.indexOf(u.parents[0]), i2 = grp.members.indexOf(u.parents[1]);
        if (i1 < 0 || i2 < 0 || Math.abs(i1 - i2) === 1) return; // next to each other: drawn side to side
        spans.push({ key: u.key, lo: Math.min(i1, i2), hi: Math.max(i1, i2) });
      });
      spans.sort(function (a, b) { return (a.hi - a.lo) - (b.hi - b.lo) || a.lo - b.lo; });
      const used = [];                                     // spans already placed on each level
      spans.forEach(function (s) {
        let L = 1;
        while ((used[L] || []).some(function (o) { return s.lo <= o.hi && o.lo <= s.hi; })) L++;
        (used[L] = used[L] || []).push(s);
        levels.set(s.key, L);
        maxLevel = Math.max(maxLevel, L);
      });
    });
    return { levels: levels, maxLevel: maxLevel };
  }
  const UNDER_FIRST = 12;                                  // Pixels from the card bottom to the first under-line
  const UNDER_STEP = 9;                                    // Pixels between under-line levels

  function computeLayout() {
    const vis = state.visible;
    const shown = people.filter(function (p) { return vis.has(p.id); }); // only the people drawn right now
    layout.people.clear();
    layout.unions.clear();
    layout.drawn = new Map();                              // families with at least one drawn parent, and their drawn members
    fam.unions.forEach(function (u) {
      const ps = u.parents.filter(function (id) { return vis.has(id); });
      const cs = u.children.filter(function (id) { return vis.has(id); });
      if (!ps.length) return;                              // no parent drawn: nothing to connect from
      if (!cs.length && ps.length < 2) return;             // a lone parent with no drawn children: no line needed
      layout.drawn.set(u.key, { key: u.key, parents: ps, children: cs });
    });
    const hh = buildHouseholds(shown);
    const under = underLevels(hh);
    const rowGap = 74 + Math.max(0, under.maxLevel - 3) * UNDER_STEP; // more room between rows if many under-lines
    const g = new dagre.graphlib.Graph();                  // An empty layout graph
    g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: rowGap, marginx: 60, marginy: 60 }); // Top to bottom; gaps in pixels
    g.setDefaultEdgeLabel(function () { return {}; });
    hh.groups.forEach(function (grp) {                     // One box per household, wide enough for every member
      const n = grp.members.length;
      g.setNode(grp.key, { width: n * CARD_W + (n - 1) * COUPLE_GAP, height: CARD_H });
    });
    const weights = new Map();                             // household -> household links, counted
    shown.forEach(function (p) {
      fam.parentLinks.get(p.id).forEach(function (l) {
        if (!vis.has(l.id)) return;                        // parent hidden in a closed branch
        const from = hh.groups[hh.groupOf.get(l.id)].key;
        const to = hh.groups[hh.groupOf.get(p.id)].key;
        if (from === to) return;                           // Ignore odd data where a parent shares the child's household
        const k = from + '>' + to;
        weights.set(k, (weights.get(k) || 0) + 1);
      });
    });
    weights.forEach(function (w, k) {                      // Parents' household must sit above the child's
      const parts = k.split('>');
      g.setEdge(parts[0], parts[1], { weight: w, minlen: 1 });
    });
    dagre.layout(g);                                       // dagre decides which generation (row) each household is in
    refineRows(g, hh);                                     // then we tidy the order and spacing inside each row

    hh.groups.forEach(function (grp) {                     // Final position of every person
      grp.members.forEach(function (id, i) {
        layout.people.set(id, { x: grp.x + memberOffset(grp, i), y: grp.y });
      });
    });

    layout.drawn.forEach(function (u) {                    // Where each family's lines meet
      const ps = u.parents.map(function (id) { return layout.people.get(id); });
      const bottom = Math.max.apply(null, ps.map(function (p) { return p.y; })) + CARD_H / 2; // lowest card edge
      if (ps.length === 2 && under.levels.has(u.key)) {    // Couple not side by side: meet on a line under the cards
        const y = bottom + UNDER_FIRST + (under.levels.get(u.key) - 1) * UNDER_STEP;
        layout.unions.set(u.key, { x: (ps[0].x + ps[1].x) / 2, y: y, couple: true, under: true, parentBottom: bottom });
      } else if (ps.length === 2) {                        // Couple side by side: midpoint of the line between them
        layout.unions.set(u.key, { x: (ps[0].x + ps[1].x) / 2, y: Math.max(ps[0].y, ps[1].y), couple: true, parentBottom: bottom });
      } else {                                             // Single known parent: bottom of their card
        layout.unions.set(u.key, { x: ps[0].x, y: bottom, couple: false, parentBottom: bottom });
      }
    });
  }

  const ROW_GAP = 30;                                      // Space between neighbouring households in a row
  function memberOffset(grp, i) {                          // Distance from a household's centre to member i's centre
    return -grp.width / 2 + i * (CARD_W + COUPLE_GAP) + CARD_W / 2;
  }

  // Tidies each generation row: puts households in an order that keeps
  // siblings together and couples between their two families, then
  // spaces them so parents sit above their children.
  function refineRows(g, hh) {
    const rowYs = Array.from(new Set(hh.groups.map(function (grp) { return g.node(grp.key).y; }))).sort(function (a, b) { return a - b; });
    const rows = rowYs.map(function () { return []; });    // households in each generation row
    hh.groups.forEach(function (grp) {
      const n = g.node(grp.key);
      grp.x = n.x; grp.y = n.y; grp.width = n.width;      // start from dagre's suggestion
      rows[rowYs.indexOf(n.y)].push(grp);
    });
    rows.forEach(function (row) { row.sort(function (a, b) { return a.x - b.x; }); });

    function xOf(id) {                                     // Current x of a person (null if not drawn)
      if (!hh.groupOf.has(id)) return null;
      const grp = hh.groups[hh.groupOf.get(id)];
      return grp.x + memberOffset(grp, grp.members.indexOf(id));
    }
    function shownKids(id) { return fam.children.get(id).filter(function (c) { return hh.groupOf.has(c); }); }
    function parentsX(id) {                                // Centre point of a person's drawn parents, or null
      const xs = fam.parentLinks.get(id).map(function (l) { return xOf(l.id); }).filter(function (x) { return x != null; });
      return xs.length ? xs.reduce(function (s, x) { return s + x; }, 0) / xs.length : null;
    }
    function orient(grp) {                                 // Flip a household so each member sits on the side of their own parents
      if (grp.members.length < 2) return;
      const pts = [];
      grp.members.forEach(function (id, i) { const px = parentsX(id); if (px != null) pts.push({ i: i, px: px }); });
      if (!pts.length) return;
      let score = 0;
      if (pts.length === 1) {
        score = (pts[0].i - (grp.members.length - 1) / 2) * (pts[0].px - grp.x);
      } else {
        const mi = pts.reduce(function (s, p) { return s + p.i; }, 0) / pts.length;
        const mp = pts.reduce(function (s, p) { return s + p.px; }, 0) / pts.length;
        pts.forEach(function (p) { score += (p.i - mi) * (p.px - mp); });
      }
      if (score < 0) grp.members.reverse();
    }
    function wantFromParents(grp) {                        // Where this household would like to be, judging by the row above
      orient(grp);
      const wants = [];
      grp.members.forEach(function (id, i) {
        const px = parentsX(id);
        if (px != null) wants.push(px - memberOffset(grp, i));
      });
      return wants.length ? wants.reduce(function (s, x) { return s + x; }, 0) / wants.length : null;
    }
    function wantFromChildren(grp) {                       // Where it would like to be, judging by the row below
      const kids = new Set();
      grp.members.forEach(function (id) { shownKids(id).forEach(function (c) { kids.add(c); }); });
      if (!kids.size) return null;
      let sum = 0;
      kids.forEach(function (c) { sum += xOf(c); });
      let mid = 0;                                         // the centre of the members who have these children
      const parentsWithKids = grp.members.map(function (id, i) { return shownKids(id).length ? memberOffset(grp, i) : null; }).filter(function (v) { return v != null; });
      mid = parentsWithKids.reduce(function (s, v) { return s + v; }, 0) / parentsWithKids.length;
      return sum / kids.size - mid;
    }
    function place(row, wants) {                           // Space a row out, staying as close as possible to the wanted spots
      // "Pool adjacent violators": keeps the order, never overlaps,
      // and minimises the total distance from each wanted position.
      const offsets = [0];
      for (let i = 1; i < row.length; i++) offsets.push(offsets[i - 1] + row[i - 1].width / 2 + ROW_GAP + row[i].width / 2);
      const blocks = [];
      row.forEach(function (grp, i) {
        const target = (wants[i] != null ? wants[i] : grp.x) - offsets[i];
        const weight = wants[i] != null ? 1 + grp.members.length : 0.3; // households with family above/below pull harder
        blocks.push({ sw: weight, swt: weight * target, n: 1 });
        while (blocks.length > 1 && blocks[blocks.length - 2].swt / blocks[blocks.length - 2].sw > blocks[blocks.length - 1].swt / blocks[blocks.length - 1].sw) {
          const last = blocks.pop(), prev = blocks[blocks.length - 1];
          prev.sw += last.sw; prev.swt += last.swt; prev.n += last.n;
        }
      });
      let i = 0;
      blocks.forEach(function (b) {
        const v = b.swt / b.sw;
        for (let k = 0; k < b.n; k++, i++) row[i].x = v + offsets[i];
      });
    }
    function sweep(direction, reorder) {                   // One pass down (use parents) or up (use children)
      const order = direction === 'down' ? rows.map(function (_, i) { return i; }).slice(1) : rows.map(function (_, i) { return i; }).reverse().slice(1);
      order.forEach(function (r) {
        const row = rows[r];
        const wants = new Map();
        row.forEach(function (grp) { wants.set(grp, direction === 'down' ? wantFromParents(grp) : wantFromChildren(grp)); });
        if (reorder) row.sort(function (a, b) {            // Sort by wanted position (unchanged order when equal)
          const wa = wants.get(a), wb = wants.get(b);
          return (wa != null ? wa : a.x) - (wb != null ? wb : b.x);
        });
        place(row, row.map(function (grp) { return wants.get(grp); }));
      });
    }
    for (let it = 0; it < 4; it++) { sweep('down', true); sweep('up', true); } // Improve order and spacing a few times
    sweep('down', false);                                  // Final tidy: children under parents…
    sweep('up', false);                                    // …and parents centred over children
  }

  /* ===================================================================
     6. DRAW THE LINES AND THE CARDS
     =================================================================== */
  const svg = d3.select('#tree');                          // The drawing surface
  const viewport = d3.select('#viewport');                 // Group that moves when you pan or zoom
  const linkLayer = d3.select('#links');
  const dotLayer = d3.select('#dots');                     // Couple markers, drawn above the lines
  const hitLayer = d3.select('#link-hits');                // Invisible wide lines that react to the mouse
  const unionLines = new Map();                            // family (union) key -> its visible lines and hit lines
  const unionDots = new Map();                             // family (union) key -> its couple dot
  const cardLayer = d3.select('#cards');
  const linkEls = new Map();                               // line id -> line element, to colour lines later
  const cardEls = new Map();                               // person number -> card element

  function roundedPath(points, r) {                        // Turn a list of corner points into a line with rounded corners
    const pts = points.filter(function (p, i) {            // Drop repeated points
      return i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1];
    });
    if (pts.length < 2) return '';
    let d = 'M' + pts[0][0] + ',' + pts[0][1];             // Start at the first point
    for (let i = 1; i < pts.length - 1; i++) {             // Round every corner in the middle
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const rr = Math.min(r, d1 / 2, d2 / 2);              // Corner radius, smaller on short segments
      if (rr < 0.5) { d += 'L' + b[0] + ',' + b[1]; continue; }
      const p1 = [b[0] - (b[0] - a[0]) / d1 * rr, b[1] - (b[1] - a[1]) / d1 * rr];
      const p2 = [b[0] + (c[0] - b[0]) / d2 * rr, b[1] + (c[1] - b[1]) / d2 * rr];
      d += 'L' + p1[0] + ',' + p1[1] + 'Q' + b[0] + ',' + b[1] + ' ' + p2[0] + ',' + p2[1];
    }
    const last = pts[pts.length - 1];
    return d + 'L' + last[0] + ',' + last[1];              // Finish at the last point
  }

  function linkConfirmed(childId, parentId) {              // Is this child -> parent link confirmed?
    const l = fam.parentLinks.get(childId).find(function (x) { return x.id === parentId; });
    return !l || l.confirmed;
  }

  function drawLinks() {
    layout.drawn.forEach(function (u) {                    // u.parents / u.children hold only drawn people
      const up = layout.unions.get(u.key);                 // Where this family's lines meet
      const parentBottom = up.parentBottom;                // Lowest edge of the parents' cards
      const kids = u.children.map(function (id) { return { id: id, pos: layout.people.get(id) }; });
      const childTop = kids.length ? Math.min.apply(null, kids.map(function (k) { return k.pos.y - CARD_H / 2; })) : null;
      const busY = childTop == null ? null : Math.max(parentBottom + (childTop - parentBottom) / 2, up.y + 14); // Height of the line the children hang from
      if (up.under) {                                      // Couple not side by side: down from each card, then across under the cards
        u.parents.forEach(function (pid) {
          const pp = layout.people.get(pid);
          const allUnconfirmed = kids.length > 0 && kids.every(function (k) { return !linkConfirmed(k.id, pid); });
          addLink('ps:' + pid + ':' + u.key, [[pp.x, pp.y + CARD_H / 2], [pp.x, up.y], [up.x, up.y]], allUnconfirmed, u.key);
        });
      } else if (up.couple) {                              // Couple side by side: a line from each partner's card to the meeting point
        u.parents.forEach(function (pid) {
          const pp = layout.people.get(pid);
          const edgeX = pp.x < up.x ? pp.x + CARD_W / 2 : pp.x - CARD_W / 2; // Side of the card that faces the partner
          const allUnconfirmed = kids.length > 0 && kids.every(function (k) { return !linkConfirmed(k.id, pid); });
          addLink('ps:' + pid + ':' + u.key, [[edgeX, pp.y], [up.x, pp.y], [up.x, up.y]], allUnconfirmed, u.key);
        });
      }
      kids.forEach(function (k) {                          // Meeting point down to each child's card
        const unconfirmed = u.parents.some(function (pid) { return !linkConfirmed(k.id, pid); });
        addLink('cs:' + u.key + ':' + k.id, [[up.x, up.y], [up.x, busY], [k.pos.x, busY], [k.pos.x, k.pos.y - CARD_H / 2]], unconfirmed, u.key);
      });
      if (up.couple) {                                     // Dot marking the couple: filled = together, hollow = not a couple
        const together = fam.partners.get(u.parents[0]).has(u.parents[1]);
        const dot = dotLayer.append('circle').attr('class', 'union-dot' + (together ? '' : ' apart')).attr('cx', up.x).attr('cy', up.y).attr('r', 4);
        unionDots.set(u.key, dot);                         // remembered so it can glow with its lines
      }
    });
  }
  function addLink(id, points, unconfirmed, unionKey) {
    const d = roundedPath(points, 10);
    const el = linkLayer.append('path')                    // The visible line
      .attr('class', 'link' + (unconfirmed ? ' unconfirmed' : ''))
      .attr('d', d);
    linkEls.set(id, el);
    const hit = hitLayer.append('path')                    // A wide invisible copy underneath that catches the mouse
      .attr('class', 'link-hit')                           // and shows the soft glow while highlighted
      .attr('d', d);
    if (!unionLines.has(unionKey)) unionLines.set(unionKey, { lines: [], hits: [] });
    unionLines.get(unionKey).lines.push(el);
    unionLines.get(unionKey).hits.push(hit);
    hit.on('mouseenter', function (e) { if (pinnedUnion == null) highlightUnion(unionKey, e); })
       .on('mousemove', function (e) { if (pinnedUnion == null) placeTip(e); })
       .on('mouseleave', function () { if (pinnedUnion == null) clearHighlight(); })
       .on('click', function (e) {                         // A click or tap keeps it lit (handy on phones)
         e.stopPropagation();
         if (pinnedUnion === unionKey) { clearHighlight(); return; }
         highlightUnion(unionKey, e);
         pinnedUnion = unionKey;
       });
  }

  /* ---------- Glow: light up one family (parents, their lines, their children) ---------- */
  let pinnedUnion = null;                                  // the family kept lit by a click or tap, if any
  let litUnion = null;                                     // the family lit right now
  const tipEl = document.getElementById('link-tip');       // the small label that names who is connected
  function highlightUnion(key, evt) {
    clearHighlight();
    const u = layout.drawn.get(key), parts = unionLines.get(key);
    if (!u || !parts) return;
    litUnion = key;
    svg.classed('lighting', true);                         // fades everything else a little
    parts.hits.forEach(function (h) { h.classed('hl', true); });
    parts.lines.forEach(function (l) { l.classed('hl', true).raise(); });
    if (unionDots.has(key)) unionDots.get(key).classed('hl', true);
    u.parents.concat(u.children).forEach(function (id) { cardEls.get(id).classed('hl', true); });
    tipEl.innerHTML = unionTip(u);
    tipEl.hidden = false;
    placeTip(evt);
  }
  function clearHighlight() {
    pinnedUnion = null;
    if (litUnion == null) return;
    const parts = unionLines.get(litUnion);
    parts.hits.forEach(function (h) { h.classed('hl', false); });
    parts.lines.forEach(function (l) { l.classed('hl', false); });
    if (unionDots.has(litUnion)) unionDots.get(litUnion).classed('hl', false);
    cardEls.forEach(function (g) { g.classed('hl', false); });
    svg.classed('lighting', false);
    tipEl.hidden = true;
    litUnion = null;
    linkEls.forEach(function (el) { if (el.classed('lineage')) el.raise(); }); // put the coloured lines back on top
    raisePath();
  }
  function unionTip(u) {                                   // "José y Magaly · no son pareja / Hijos: Andrea, Viviana"
    let h = '<b>' + esc(u.parents.map(nameOf).join(tr('and'))) + '</b>';
    if (u.parents.length === 2) {
      const together = fam.partners.get(u.parents[0]).has(u.parents[1]);
      h += '<span class="tip-sub">' + esc(tr(together ? 'tipCouple' : 'tipNotCouple')) + '</span>';
    }
    if (u.children.length) {
      const label = u.children.length > 1 ? tr('tipChildren')
        : tr(genderOf(u.children[0]) === 'female' ? 'tipDaughter' : genderOf(u.children[0]) === 'male' ? 'tipSon' : 'tipChild');
      h += '<span class="tip-kids">' + esc(label) + ' ' + esc(u.children.map(nameOf).join(', ')) + '</span>';
    }
    return h;
  }
  function placeTip(evt) {                                 // keep the label next to the pointer, inside the window
    if (!evt || tipEl.hidden) return;
    const pad = 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    tipEl.style.left = Math.max(8, x) + 'px';
    tipEl.style.top = Math.max(8, y) + 'px';
  }

  function drawCards() {
    people.forEach(function (p) {
      if (!state.visible.has(p.id)) return;               // hidden in a closed branch
      const pos = layout.people.get(p.id);
      const g = cardLayer.append('g')                      // One group per person
        .attr('class', 'card')
        .attr('transform', 'translate(' + (pos.x - CARD_W / 2) + ',' + (pos.y - CARD_H / 2) + ')')
        .attr('tabindex', 0)                               // Reachable with the Tab key
        .attr('role', 'button')
        .attr('data-id', p.id);
      g.append('title');                                   // Tooltip with the full name and relationship
      g.append('rect').attr('class', 'card-ring').attr('x', -5).attr('y', -5).attr('width', CARD_W + 10).attr('height', CARD_H + 10).attr('rx', 18); // Selection ring
      g.append('rect').attr('class', 'card-shadow').attr('y', 3).attr('width', CARD_W).attr('height', CARD_H).attr('rx', 14);
      g.append('rect').attr('class', 'card-bg').attr('width', CARD_W).attr('height', CARD_H).attr('rx', 14);
      const av = g.append('g').attr('transform', 'translate(' + (14 + AVATAR_R) + ',' + (CARD_H / 2) + ')'); // Round photo
      av.append('circle').attr('class', 'avatar-bg').attr('r', AVATAR_R).attr('fill', colorOf(p.id));
      av.append('text').attr('class', 'avatar-initials').text(initials(p));
      if (p.photo) {                                       // Photo on top of the initials; removed if it fails to load
        av.append('image')
          .attr('href', p.photo)
          .attr('x', -AVATAR_R).attr('y', -AVATAR_R).attr('width', AVATAR_R * 2).attr('height', AVATAR_R * 2)
          .attr('preserveAspectRatio', 'xMidYMid slice')
          .attr('clip-path', 'url(#avatar-clip)')
          .on('error', function () { d3.select(this).remove(); });
      }
      g.append('text').attr('class', 'card-rel').attr('x', TEXT_X).attr('y', 25); // Relationship label (filled later)
      g.append('text').attr('class', 'card-tag').attr('x', CARD_W - 12).attr('y', 25); // "unconfirmed" note on the right
      const nameEl = g.append('text').attr('class', 'card-name' + (p.name ? '' : ' unknown')).attr('x', TEXT_X).attr('y', 45);
      wrapText(nameEl, nameOf(p.id), TEXT_W, 2, 17);       // Name on up to two lines
      g.append('text').attr('class', 'card-meta').attr('x', TEXT_X).attr('y', CARD_H - 12); // "#12 · 1950 – 2010"
      g.on('click', function () { cardClicked(p.id); });
      g.on('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cardClicked(p.id); } });
      cardEls.set(p.id, g);
    });
    updateCardMeta();
  }

  function wrapText(textEl, text, maxWidth, maxLines, lineHeight) { // Split text into lines that fit
    textEl.selectAll('tspan').remove();
    const words = text.split(/\s+/);
    let line = [];
    let tspan = textEl.append('tspan').attr('x', textEl.attr('x')).attr('dy', 0);
    let lines = 1;
    for (let i = 0; i < words.length; i++) {
      line.push(words[i]);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) { // Too wide: start a new line
        if (lines === maxLines) {                          // No more lines allowed: shorten with "…"
          tspan.text(line.slice(0, -1).join(' '));
          truncate(tspan, words.slice(i).join(' '), maxWidth, true);
          return;
        }
        line.pop();
        tspan.text(line.join(' '));
        line = [words[i]];
        tspan = textEl.append('tspan').attr('x', textEl.attr('x')).attr('dy', lineHeight).text(words[i]);
        lines += 1;
      }
    }
    if (tspan.node().getComputedTextLength() > maxWidth) truncate(tspan, '', maxWidth, false);
    if (lines === 1) textEl.attr('transform', 'translate(0,7)'); // Centre a one-line name a little lower
    else textEl.attr('transform', null);
  }
  function truncate(el, extra, maxWidth, appendExtra) {    // Cut text until it fits, then add "…"
    let s = appendExtra ? (el.text() + ' ' + extra) : el.text();
    el.text(s);
    while (s.length > 1 && el.node().getComputedTextLength() > maxWidth) {
      s = s.slice(0, -1).trimEnd();
      el.text(s + '…');
    }
  }

  function updateCardMeta() {                              // Bottom line of each card: number and years
    cardEls.forEach(function (g, id) {
      const life = lifespan(person(id));
      g.select('.card-meta').text('#' + id + (life ? '  ·  ' + life : ''));
    });
  }

  /* ===================================================================
     7. ZOOM AND PAN
     =================================================================== */
  const zoom = d3.zoom()
    .scaleExtent([ZOOM_MIN, ZOOM_MAX])
    .clickDistance(6)                                      // A small drag still counts as a click
    .on('zoom', function (e) { viewport.attr('transform', e.transform); });
  svg.call(zoom).on('dblclick.zoom', null);                // Double-click does not zoom (avoids surprises)
  svg.on('click.glow', function (e) {                      // Clicking empty space turns off a family kept lit by a tap
    if (pinnedUnion != null && !e.target.closest('.link-hit')) clearHighlight();
  });
  svg.on('mouseleave.glow', function () { if (pinnedUnion == null) clearHighlight(); });

  function visibleBox() {                                  // Part of the screen not covered by the panel or chips
    const w = svg.node().clientWidth, h = svg.node().clientHeight;
    const box = { x0: 0, y0: 60, x1: w, y1: h };
    const panel = $('#panel');
    if (!panel.hidden) {
      if (isPhone()) box.y1 = h - panel.offsetHeight + 0;  // Bottom sheet covers the lower part
      else box.x1 = w - panel.offsetWidth - 24;            // Side panel covers the right part
    }
    return box;
  }
  function moveTo(x, y, k, duration) {                     // Put drawing point (x, y) in the middle of the free area
    const box = visibleBox();
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    const t = d3.zoomIdentity.translate(cx - x * k, cy - y * k).scale(k);
    svg.transition().duration(duration).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }
  function centerOn(id, duration) {                        // Bring one person's card to the middle
    const pos = layout.people.get(id);                     // (undefined if the person is not drawn)
    if (!pos) return;
    const k = Math.max(d3.zoomTransform(svg.node()).k, isPhone() ? 0.72 : 0.85);
    moveTo(pos.x, pos.y, Math.min(k, 1.2), duration == null ? 750 : duration);
  }
  function showNeighborhood(id, duration) {                // Frame a person with their parents (and grandparents on big screens)
    const anc = Kinship.ancestorsOf(fam, id);
    const ids = [];
    anc.forEach(function (info, aid) { if (info.depth <= (isPhone() ? 1 : 2)) ids.push(aid); });
    sideBySide(id).forEach(function (q) { if (!isPhone()) ids.push(q); });
    fitPeople(ids, duration, isPhone() ? 0.5 : 0.7, isPhone() ? 0.8 : 0.95, id); // Never zoom out so far that names get hard to read
  }
  function fitPeople(ids, duration, minK, maxK, anchorId) { // Zoom so that all these people are visible
    ids = ids.filter(function (id) { return layout.people.has(id); }); // only people drawn right now
    if (!ids.length) return;
    if (anchorId != null && !layout.people.has(anchorId)) anchorId = null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ids.forEach(function (id) {
      const p = layout.people.get(id);
      x0 = Math.min(x0, p.x - CARD_W / 2); x1 = Math.max(x1, p.x + CARD_W / 2);
      y0 = Math.min(y0, p.y - CARD_H / 2); y1 = Math.max(y1, p.y + CARD_H / 2);
    });
    const box = visibleBox();
    const fit = Math.min((box.x1 - box.x0 - 40) / (x1 - x0), (box.y1 - box.y0 - 40) / (y1 - y0)); // Scale that fits them all
    const k = Math.max(minK || ZOOM_MIN, Math.min(maxK || 1.1, fit));
    const cx = k > fit && anchorId != null ? layout.people.get(anchorId).x : (x0 + x1) / 2; // If they cannot all fit, keep the main person in the middle
    moveTo(cx, (y0 + y1) / 2, k, duration == null ? 750 : duration);
  }
  function ensureVisible(id) {                             // Move only if the card is hidden or off-screen
    const pos = layout.people.get(id);
    if (!pos) return;
    const t = d3.zoomTransform(svg.node());
    const sx = t.applyX(pos.x), sy = t.applyY(pos.y);
    const box = visibleBox();
    if (sx < box.x0 + 40 || sx > box.x1 - 40 || sy < box.y0 + 30 || sy > box.y1 - 30) centerOn(id);
  }

  /* ===================================================================
     8. FOCUS PERSON: whose point of view the labels use
     =================================================================== */
  function componentOf(id) {                               // Everyone reachable from id through any family link
    const seen = new Set([id]);
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift();
      const next = fam.parentLinks.get(cur).map(function (l) { return l.id; })
        .concat(fam.children.get(cur), Array.from(fam.partners.get(cur)));
      next.forEach(function (n) { if (!seen.has(n)) { seen.add(n); queue.push(n); } });
    }
    return seen;
  }

  function decorate(rel) {                                 // Add the child's name for "Madre de Oscar" style labels
    if (rel.type === 'coparent') {
      rel.childNames = rel.children.map(function (c) { return person(c).name ? person(c).name.split(' ')[0] : tr('nameUnknown'); });
      rel.childFullNames = rel.children.map(nameOf);
    }
    return rel;
  }

  function setFocus(id, opts) {
    if (typeof clearHighlight === 'function' && litUnion != null) clearHighlight(); // drop any glowing family
    opts = opts || {};
    if (!fam.byId.has(id)) return;
    state.focus = id;
    state.component = componentOf(id);
    people.forEach(function (p) {                          // Work out everyone's relationship to the new focus
      const rel = decorate(Kinship.relation(fam, id, p.id));
      if (rel.type === 'none') rel.connected = state.component.has(p.id);
      state.relations.set(p.id, rel);
    });
    state.expanded.clear();                                // every relative-by-marriage branch starts closed
    state.forced.clear();
    state.visible = computeVisible();
    renderTree(null);                                      // draw the new focus person's family
    updateChips();
    writeHash();
    if (state.panel === 'profile' && state.selected != null) renderProfile(state.selected); // profile shows the new relationship
    if (state.panel === 'compare') renderCompare();
    if (state.panel === 'summary') renderSummaryPanel();   // the summary follows the new focus person
    if (opts.recenter !== false) showNeighborhood(id, opts.duration); // Glide to the new focus person
  }

  function updateCardLabels() {
    cardEls.forEach(function (g, id) {
      const rel = state.relations.get(id);
      const isFocus = id === state.focus;
      const term = I18N.relationTerm(state.lang, rel, genderOf(id));
      const label = isFocus ? '★ ' + term : term;          // e.g. "Tía", or "★ Viendo como" on the focus card
      const unconfirmed = rel.confirmed === false;
      const tagEl = g.select('.card-tag').text(unconfirmed ? tr('unconfirmed') : ''); // small "unconfirmed" note
      const tagW = unconfirmed ? tagEl.node().getComputedTextLength() + 8 : 0;
      g.classed('is-focus', isFocus)
        .classed('is-unconfirmed', rel.confirmed === false)
        .classed('rel-self', rel.type === 'self')
        .classed('rel-blood', rel.type === 'blood')
        .classed('rel-affinity', rel.type === 'affinity')
        .classed('rel-partner', rel.type === 'partner')
        .classed('rel-coparent', rel.type === 'coparent')
        .classed('rel-none', rel.type === 'none');
      const relEl = g.select('.card-rel').text(label);     // Write the label, shortening it if too long
      truncate(relEl, '', TEXT_W - tagW, false);
      const full = isFocus ? label : I18N.cardLabel(state.lang, rel, genderOf(id)); // label with "· unconfirmed" for tooltips
      g.select('title').text(nameOf(id) + ' (#' + id + ') — ' + full);
      g.attr('aria-label', nameOf(id) + ', ' + full);
    });
  }

  function segmentsParentChild(parentId, childId) {        // Line ids between a parent and a child
    const key = fam.unionKeyOf(fam.parentLinks.get(childId).map(function (l) { return l.id; }));
    return ['ps:' + parentId + ':' + key, 'cs:' + key + ':' + childId];
  }
  function segmentsPartners(a, b) {                        // Line ids joining a couple
    const key = fam.unionKeyOf([a, b]);
    return ['ps:' + a + ':' + key, 'ps:' + b + ':' + key];
  }

  function updateLineage() {                               // Colour the focus person's direct line
    linkEls.forEach(function (el) { el.classed('lineage', false); });
    Kinship.lineage(fam, state.focus).forEach(function (pair) {
      segmentsParentChild(pair[0], pair[1]).forEach(function (sid) {
        const el = linkEls.get(sid);
        if (el) el.classed('lineage', true).raise();
      });
    });
    raisePath();                                           // Keep the blue comparison path on top
  }

  /* ===================================================================
     9. COMPARISON PATH ON THE TREE
     =================================================================== */
  let pathNodes = [];                                      // People on the highlighted path
  function updatePath() {
    linkEls.forEach(function (el) { el.classed('on-path', false); });
    cardEls.forEach(function (g) { g.classed('on-path', false); g.selectAll('.end-badge').remove(); });
    pathNodes = [];
    const a = state.compareA, b = state.compareB;
    if (a == null || b == null || a === b) return;
    const path = Kinship.connectionPath(fam, a, b);
    if (!path) return;
    const chain = Kinship.describeChain(fam, path);        // Same steps as the sentence in the panel
    const onPath = new Set([a]);                            // People to outline in blue
    chain.forEach(function (step) {
      let ids;
      if (step.rel === 'child') ids = segmentsParentChild(step.to, step.from);   // "from" is a child of "to"
      else if (step.rel === 'parent') ids = segmentsParentChild(step.from, step.to);
      else if (step.rel === 'partner') ids = segmentsPartners(step.from, step.to);
      else {                                               // siblings: light the line that joins them
        const ua = fam.unionKeyOf(fam.parentLinks.get(step.from).map(function (l) { return l.id; }));
        const ub = fam.unionKeyOf(fam.parentLinks.get(step.to).map(function (l) { return l.id; }));
        ids = ua === ub
          ? ['cs:' + ua + ':' + step.from, 'cs:' + ub + ':' + step.to]
          : ['cs:' + ua + ':' + step.from, 'ps:' + step.via + ':' + ua, 'ps:' + step.via + ':' + ub, 'cs:' + ub + ':' + step.to];
      }
      ids.forEach(function (sid) { const el = linkEls.get(sid); if (el) el.classed('on-path', true); });
      onPath.add(step.to);
    });
    pathNodes = Array.from(onPath);
    pathNodes.forEach(function (id) { if (cardEls.has(id)) cardEls.get(id).classed('on-path', true); });
    [[a, 'A'], [b, 'B']].forEach(function (pair) {        // Little "A" and "B" badges on the two cards
      if (!cardEls.has(pair[0])) return;
      const badge = cardEls.get(pair[0]).append('g').attr('class', 'end-badge').attr('transform', 'translate(' + (CARD_W - 4) + ',4)');
      badge.append('circle').attr('r', 11);
      badge.append('text').text(pair[1]);
    });
    raisePath();
  }
  function raisePath() {
    linkEls.forEach(function (el) { if (el.classed('on-path')) el.raise(); });
  }

  /* ===================================================================
     9b. FAMILY BRANCHES OF RELATIVES BY MARRIAGE
     The tree shows the focus person's blood family plus the partners
     who connect to it. A partner's own family (parents, siblings…) is a
     closed "branch" until a visitor clicks that partner.
     =================================================================== */
  function computeVisible() {                              // Who should be drawn right now
    const vis = new Set(Kinship.familyCore(fam, state.focus));
    state.forced.forEach(function (id) { vis.add(id); });
    let grew = true;
    while (grew) {                                         // open branches can contain further open branches
      grew = false;
      state.expanded.forEach(function (s) {
        if (!vis.has(s)) return;                           // its card is not shown, so its branch stays closed
        Kinship.familyCore(fam, s).forEach(function (q) { if (!vis.has(q)) { vis.add(q); grew = true; } });
      });
    }
    return vis;
  }
  function isByMarriage(id) {                              // Not a blood relative of the focus person
    const rel = state.relations.get(id);
    return id !== state.focus && !!rel && rel.type !== 'blood' && rel.type !== 'self';
  }
  function hiddenBranch(id) {                              // People that opening this person's branch would reveal
    if (!isByMarriage(id) || !state.visible.has(id)) return [];
    return Array.from(Kinship.familyCore(fam, id)).filter(function (q) { return !state.visible.has(q); });
  }
  function hasBranch(id) { return state.expanded.has(id) || hiddenBranch(id).length > 0; }

  function toggleBranch(id, open) {                        // Open or close a relative-by-marriage's family branch
    const isOpen = state.expanded.has(id);
    const want = open == null ? !isOpen : open;
    if (want === isOpen) return false;
    if (want) state.expanded.add(id); else state.expanded.delete(id);
    state.visible = computeVisible();
    renderTree(id);                                        // redraw, keeping this card where it was on screen
    if (state.panel === 'profile' && state.selected != null) renderProfile(state.selected);
    return true;
  }

  function reveal(id) {                                    // Make sure a person is drawn, opening the branches that lead to them
    if (state.visible.has(id)) return false;
    for (let guard = 0; guard < 25 && !state.visible.has(id); guard++) {
      const path = Kinship.connectionPath(fam, state.focus, id);
      let opened = false;
      if (path) {
        for (let i = 1; i < path.nodes.length; i++) {      // first hidden person on the way: open the branch of the one before
          if (!state.visible.has(path.nodes[i])) {
            const s = path.nodes[i - 1];
            if (!state.expanded.has(s)) { state.expanded.add(s); opened = true; }
            break;
          }
        }
      }
      if (!opened) {                                       // not connected to the focus person: show them with their own family
        Kinship.familyCore(fam, id).forEach(function (q) { state.forced.add(q); });
        state.forced.add(id);
      }
      state.visible = computeVisible();
    }
    return true;
  }
  function revealAll(ids) {                                // Reveal several people; redraw once if anything changed
    let changed = false;
    ids.forEach(function (id) { if (reveal(id)) changed = true; });
    if (changed) renderTree(null);
    return changed;
  }

  function cardClicked(id) {                               // A click on a card
    if (!state.expanded.has(id) && hiddenBranch(id).length) toggleBranch(id, true); // a spouse: show their family
    openProfile(id, { pan: false });
  }

  function drawExpanders() {                               // "Ver familia (2)" pill on spouses with a closed branch
    cardEls.forEach(function (g, id) {
      g.selectAll('.branch-badge').remove();
      const open = state.expanded.has(id);
      const hidden = open ? [] : hiddenBranch(id);
      if (!open && !hidden.length) return;
      const label = open ? tr('hideFamily') : tr('showFamily', { n: hidden.length });
      const full = open ? tr('hideFamilyOf', { name: nameOf(id) }) : tr('showFamilyOf', { name: nameOf(id), n: hidden.length });
      const b = g.append('g')
        .attr('class', 'branch-badge' + (open ? ' open' : ''))
        .attr('transform', 'translate(' + (CARD_W / 2) + ',0)') // centred on the top edge, where the family appears
        .attr('role', 'button').attr('tabindex', 0).attr('aria-label', full);
      b.append('title').text(full);
      const pill = b.append('rect').attr('y', -13).attr('height', 26).attr('rx', 13);
      const text = b.append('text').text(label);
      const w = text.node().getComputedTextLength() + 26;   // size the pill to its words
      pill.attr('x', -w / 2).attr('width', w);
      b.on('click', function (e) { e.stopPropagation(); toggleBranch(id); });
      b.on('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleBranch(id); } });
    });
  }

  function renderTree(anchorId) {                          // Draw (or redraw) the tree for the people in state.visible
    if (litUnion != null) clearHighlight();
    let anchorScreen = null;                               // keep this person's card fixed on screen across the redraw
    if (anchorId != null && layout.people.has(anchorId)) {
      const t0 = d3.zoomTransform(svg.node()), p0 = layout.people.get(anchorId);
      anchorScreen = { x: t0.applyX(p0.x), y: t0.applyY(p0.y) };
    }
    const before = new Set(layout.people.keys());          // who was drawn before, to fade in newcomers
    [linkLayer, hitLayer, dotLayer, cardLayer].forEach(function (l) { l.selectAll('*').remove(); });
    linkEls.clear(); cardEls.clear(); unionLines.clear(); unionDots.clear();
    computeLayout();
    drawLinks();
    drawCards();
    if (before.size) cardEls.forEach(function (g, id) { if (!before.has(id)) g.classed('revealed', true); });
    updateCardLabels();
    drawExpanders();
    updateLineage();
    updatePath();
    selectCard(state.selected);                            // keep the blue ring on the open profile
    if (anchorScreen && layout.people.has(anchorId)) {
      const t = d3.zoomTransform(svg.node()), p = layout.people.get(anchorId);
      svg.call(zoom.transform, d3.zoomIdentity.translate(anchorScreen.x - p.x * t.k, anchorScreen.y - p.y * t.k).scale(t.k));
    }
    updateSummaryChip();
  }

  /* ===================================================================
     10. SEARCH
     =================================================================== */
  function searchPeople(query) {                           // People whose name contains every word typed
    const q = norm(query).replace(/^#/, '');
    if (!q) return [];
    if (/^\d+$/.test(q)) {                                 // Typing a number finds that person number
      const p = person(Number(q));
      return p ? [p] : [];
    }
    const words = q.split(/\s+/);
    return people
      .filter(function (p) {                               // match the name or the nickname
        const n = norm(nameOf(p.id) + ' ' + localized(p.nickname));
        return words.every(function (w) { return n.indexOf(w) !== -1; });
      })
      .sort(function (a, b) {                              // Names that start with the first word come first
        const sa = norm(nameOf(a.id)).indexOf(words[0]) === 0 ? 0 : 1;
        const sb = norm(nameOf(b.id)).indexOf(words[0]) === 0 ? 0 : 1;
        return sa - sb || nameOf(a.id).localeCompare(nameOf(b.id));
      })
      .slice(0, 12);
  }

  const searchInput = $('#search-input');
  const resultsEl = $('#search-results');
  let activeIndex = -1;                                    // Which result is highlighted with the arrow keys

  function renderResults() {
    const q = searchInput.value;
    if (!q.trim()) { hideResults(); return; }
    const found = searchPeople(q);
    activeIndex = found.length ? 0 : -1;
    if (!found.length) {
      resultsEl.innerHTML = '<li class="results-empty">' + esc(tr('noResults')) + '</li>';
    } else {
      resultsEl.innerHTML = found.map(function (p, i) {
        const rel = state.relations.get(p.id);
        return '<li class="result' + (i === 0 ? ' active' : '') + '" role="option" data-id="' + p.id + '">' +
          avatarHTML(p, 'avatar-sm') +
          '<span class="result-main"><span class="result-name">' + esc(nameOf(p.id)) + '</span>' +
          '<span class="result-sub">#' + p.id + ' · ' + esc(I18N.cardLabel(state.lang, rel, p.gender)) + '</span></span>' +
          '<span class="result-actions">' +
            '<button type="button" class="mini" data-act="focus" title="' + esc(tr('viewAsTitle')) + '">' + esc(tr('viewAs')) + '</button>' +
            '<button type="button" class="mini blue" data-act="compare">' + esc(tr('compare')) + '</button>' +
          '</span></li>';
      }).join('');
    }
    resultsEl.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
  }
  function hideResults() {
    resultsEl.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
  }
  function setActive(i) {                                  // Move the highlighted result
    const items = resultsEl.querySelectorAll('.result');
    if (!items.length) return;
    activeIndex = (i + items.length) % items.length;
    items.forEach(function (el, k) { el.classList.toggle('active', k === activeIndex); });
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  searchInput.addEventListener('input', renderResults);   // Update the list while typing
  searchInput.addEventListener('focus', function () { if (searchInput.value.trim()) renderResults(); });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
    else if (e.key === 'Enter') {                          // Enter opens the highlighted person
      const item = resultsEl.querySelectorAll('.result')[activeIndex];
      if (item) { openProfile(Number(item.dataset.id), { pan: true }); hideResults(); searchInput.value = ''; searchInput.blur(); }
    } else if (e.key === 'Escape') { hideResults(); searchInput.blur(); }
  });
  resultsEl.addEventListener('mousedown', function (e) { e.preventDefault(); }); // Keep the list open while clicking
  resultsEl.addEventListener('click', function (e) {
    const item = e.target.closest('.result');
    if (!item) return;
    const id = Number(item.dataset.id);
    const act = e.target.closest('[data-act]');
    hideResults();
    searchInput.value = '';                                // Empty the box, ready for the next search
    searchInput.blur();
    if (act && act.dataset.act === 'focus') setFocus(id);                // "View as"
    else if (act && act.dataset.act === 'compare') openCompare(id, id === state.focus ? null : state.focus); // "Compare"
    else openProfile(id, { pan: true });                                // the row itself opens the profile
  });
  document.addEventListener('click', function (e) {        // Clicking elsewhere closes the list
    if (!e.target.closest('.search')) hideResults();
  });

  /* ===================================================================
     11. SIDE PANEL — open and close
     =================================================================== */
  const panel = $('#panel');
  const panelBody = $('#panel-body');

  function showPanel() { panel.hidden = false; document.body.classList.add('panel-open'); } // moves the zoom buttons beside the panel
  function closePanel() {
    panel.hidden = true;
    document.body.classList.remove('panel-open');
    state.panel = null;
    state.picking = null;
    selectCard(null);
    updateChips();
  }
  function selectCard(id) {                                // Draw the blue ring around the open person
    state.selected = id;
    cardEls.forEach(function (g, pid) { g.classed('is-selected', pid === id); });
  }

  /* ===================================================================
     12. PROFILE
     =================================================================== */
  function openProfile(id, opts) {
    if (revealAll([id])) opts = { pan: true };             // they were in a closed branch: open it and go to them
    state.panel = 'profile';
    selectCard(id);
    renderProfile(id);
    showPanel();
    panelBody.scrollTop = 0;
    updateChips();
    if (opts && opts.pan) centerOn(id); else ensureVisible(id);
  }

  function personChip(id, sub, extraClass) {               // A clickable row for a relative in the profile
    const p = person(id);
    return '<li><button type="button" class="person-chip ' + (extraClass || '') + '" data-action="open" data-id="' + id + '">' +
      avatarHTML(p, 'avatar-sm') +
      '<span class="pc-main"><span class="pc-name' + (p.name ? '' : ' unknown') + '">' + esc(nameOf(id)) + '</span>' +
      '<span class="pc-sub">#' + id + (sub ? ' · ' + esc(sub) : '') + '</span></span></button></li>';
  }

  function renderProfile(id) {
    const p = person(id);
    const rel = state.relations.get(id);
    const isFocus = id === state.focus;
    const desc = localized(p.description);
    const bio = localized(p.bio);
    let h = '';

    // ---- Photo, number, name, years ----
    const photo = p.photo
      ? '<img src="' + esc(p.photo) + '" alt="' + esc(tr('photoOf', { name: nameOf(id) })) + '" onerror="this.remove()">'
      : '';
    h += '<div class="profile-head">' +
      '<div class="profile-photo" style="background:' + colorOf(id) + '">' + esc(initials(p)) + photo + '</div>' + // initials stay underneath in case the photo fails

      '<div><p class="profile-number">' + esc(tr('personNumber', { n: id })) + '</p>' +
      '<h2 class="profile-name' + (p.name ? '' : ' unknown') + '">' + esc(nameOf(id)) + '</h2>' +
      (p.nickname ? '<p class="profile-nick">' + esc(tr('knownAs', { nick: localized(p.nickname) })) + '</p>' : '') + // "Le dicen Pajarita"
      (lifespan(p) ? '<p class="profile-life">' + esc(lifespan(p)) + '</p>' : '') + '</div></div>';

    // ---- Relationship to the focus person ----
    if (isFocus) {
      h += '<div class="profile-rel"><span class="label">' + esc(tr('viewingAs')) + '</span><strong>' + esc(nameOf(id)) + '</strong></div>';
    } else {
      h += '<div class="profile-rel rel-' + rel.type + '"><span class="label">' + esc(tr('relationTo', { name: nameOf(state.focus) })) + '</span>' +
        '<strong>' + esc(I18N.relationTerm(state.lang, rel, p.gender)) + '</strong>' +
        (rel.confirmed === false ? '<span class="tag tag-unconfirmed">' + esc(tr('unconfirmed')) + '</span>' : '') + '</div>';
    }

    // ---- Buttons ----
    let branchBtn = '';                                    // relatives by marriage: open or close their family branch
    if (hasBranch(id)) {
      const open = state.expanded.has(id);
      branchBtn = '<button type="button" class="btn btn-violet btn-small" data-action="branch" data-id="' + id + '">' +
        esc(open ? tr('hideFamilyOf', { name: givenName(nameOf(id)) }) : tr('showFamilyOf', { name: givenName(nameOf(id)), n: hiddenBranch(id).length })) + '</button>';
    }
    h += '<div class="profile-actions">' +
      (isFocus ? '' : '<button type="button" class="btn btn-primary btn-small" data-action="focus" data-id="' + id + '" title="' + esc(tr('viewAsTitle')) + '">' + esc(tr('viewTreeAs')) + '</button>') +
      branchBtn +
      '<button type="button" class="btn btn-ghost btn-small" data-action="compare" data-id="' + id + '">' + esc(tr('compareWith')) + '</button></div>';

    // ---- Short description and biography ----
    if (desc) h += '<p class="profile-desc">' + esc(desc) + '</p>';
    if (bio) h += '<h3>' + esc(tr('biography')) + '</h3><p class="profile-bio">' + esc(bio) + '</p>';
    if (!desc && !bio) h += '<p class="profile-empty">' + esc(tr('noDetails')) + '</p>';

    // ---- Dates and place ----
    const facts = [];
    if (p.born) facts.push([tr('born'), p.born]);
    if (p.died) facts.push([tr('died'), p.died]);
    if (p.birthplace) facts.push([tr('birthplace'), p.birthplace]);
    if (facts.length) h += '<dl class="facts">' + facts.map(function (f) { return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('') + '</dl>';

    // ---- Family at a glance, from this person's point of view ----
    const sumInfo = summaryFor(id);
    h += '<h3>' + esc(tr('summaryInProfile')) + '</h3>' + summaryRowsHTML(sumInfo.sum, sumInfo.rels);

    // ---- Family ----
    h += '<h3>' + esc(tr('family')) + '</h3>';
    const parentRows = ['father', 'mother'].map(function (role) {
      const link = fam.parentLinks.get(id).find(function (l) { return l.role === role; });
      if (!link && p.singleParent) return '';              // raised by one parent: no empty slot for the other
      if (!link) return '<li><div class="person-chip static"><span class="pc-main"><span class="pc-sub">' + esc(tr(role === 'father' ? 'fatherUnknown' : 'motherUnknown')) + '</span></span></div></li>';
      return personChip(link.id, link.confirmed ? '' : tr('unconfirmed'));
    });
    h += '<h4>' + esc(tr('parents')) + '</h4><ul class="people-list">' + parentRows.join('') + '</ul>';

    const partnerIds = Array.from(fam.partners.get(id));
    if (partnerIds.length) h += '<h4>' + esc(tr('partners')) + '</h4><ul class="people-list">' + partnerIds.map(function (q) { return personChip(q, ''); }).join('') + '</ul>';

    const siblings = siblingsOf(id);                       // Siblings with both parents shared first, then one parent, then unknown
    if (siblings.length) {
      h += '<h4>' + esc(tr('siblings')) + '</h4><ul class="people-list">' + siblings.map(function (s) {
        let shared = null;
        if (s.info.kind === 'half') {                      // Name the one parent these siblings share
          const link = fam.parentLinks.get(id).find(function (l) { return l.id === s.info.shared[0]; });
          shared = { role: link ? link.role : null, name: nameOf(s.info.shared[0]) };
        }
        return personChip(s.id, I18N.siblingText(state.lang, s.info, genderOf(s.id), shared));
      }).join('') + '</ul>';
    }

    const kids = fam.children.get(id);
    if (kids.length) h += '<h4>' + esc(tr('children')) + '</h4><ul class="people-list">' + kids.map(function (c) {
      const other = fam.parentLinks.get(c).find(function (l) { return l.id !== id; }); // the child's other parent, if known
      const notes = [];
      if (other) notes.push(tr('withParent', { name: nameOf(other.id) }));
      if (!linkConfirmed(c, id)) notes.push(tr('unconfirmed'));
      return personChip(c, notes.join(' · '));
    }).join('') + '</ul>';

    panelBody.innerHTML = '<div class="profile">' + h + '</div>';
  }

  function siblingsOf(id) {                                // Everyone who shares at least one parent
    const found = new Map();
    fam.parentLinks.get(id).forEach(function (l) {
      fam.children.get(l.id).forEach(function (c) {
        if (c !== id && !found.has(c)) found.set(c, Kinship.siblingInfo(fam, id, c));
      });
    });
    const order = { full: 0, half: 1, unknown: 2 };
    return Array.from(found, function (e) { return { id: e[0], info: e[1] }; })
      .sort(function (a, b) {
        const ca = a.info.confirmed ? 0 : 1, cb = b.info.confirmed ? 0 : 1;
        return ca - cb || order[a.info.kind] - order[b.info.kind] || a.id - b.id;
      });
  }

  /* ===================================================================
     12b. FAMILY AT A GLANCE (relationship summaries)
     Counts every recorded relative, including people in closed branches.
     =================================================================== */
  function relationsFrom(id) {                             // Everyone's relationship to this person
    if (id === state.focus) return state.relations;
    const m = new Map();
    people.forEach(function (p) { m.set(p.id, decorate(Kinship.relation(fam, id, p.id))); });
    return m;
  }
  function summaryFor(id) {
    const rels = relationsFrom(id);
    return { sum: Kinship.summaryOf(fam, id, function (pid) { return rels.get(pid); }), rels: rels };
  }
  function summaryRowsHTML(sum, rels) {                    // One row per group: name, count, and the people on tap
    if (!sum.total) return '<p class="profile-empty">' + esc(tr('summaryNone')) + '</p>';
    const totals = [];
    if (sum.blood) totals.push(tr('summaryBlood', { n: sum.blood }));
    if (sum.marriage) totals.push(tr('summaryMarriage', { n: sum.marriage }));
    return '<p class="sum-totals">' + esc(totals.join(' · ')) + '</p><div class="sum-list">' + sum.groups.map(function (g) {
      const items = g.ids.map(function (pid) {
        return personChip(pid, I18N.cardLabel(state.lang, rels.get(pid), genderOf(pid)));
      }).join('');
      return '<details class="sum-row"><summary><span class="sum-label">' + esc(tr('sum_' + g.key)) + '</span>' +
        (g.unconfirmed ? '<span class="sum-sub">' + esc(tr('summaryUnconfirmed', { n: g.unconfirmed })) + '</span>' : '') +
        '<span class="sum-count">' + g.ids.length + '</span></summary><ul class="people-list">' + items + '</ul></details>';
    }).join('') + '</div>';
  }
  function updateSummaryChip() {                           // The short summary under "Viendo el árbol como …"
    const el = $('#summary-chip');
    if (state.focus == null) { el.hidden = true; return; }
    const sum = Kinship.summaryOf(fam, state.focus, function (pid) { return state.relations.get(pid); });
    const preferred = ['auntsUncles', 'firstCousins', 'greatAuntsUncles']; // the groups asked for first
    let chosen = sum.groups.filter(function (g) { return preferred.indexOf(g.key) !== -1; });
    if (!chosen.length) chosen = sum.groups.slice(0, 3);   // nobody in those groups: show the first groups instead
    const inChosen = chosen.reduce(function (n, g) { return n + g.ids.length; }, 0);
    let h = '<span class="sum-title">' + esc(tr('summaryShort', { name: givenName(nameOf(state.focus)) })) + '</span>';
    chosen.forEach(function (g, i) {
      h += '<span class="sum-item' + (i > 0 ? ' extra' : '') + '">' + esc(tr('sum_' + g.key)) + ' <b>' + g.ids.length + '</b></span>';
    });
    if (sum.total - inChosen > 0) h += '<span class="sum-item extra">' + esc(tr('summaryOthers')) + ' <b>' + (sum.total - inChosen) + '</b></span>';
    if (!sum.total) h += '<span class="sum-item">' + esc(tr('summaryNone')) + '</span>';
    h += '<button type="button" class="mini" data-chip="summary">' + esc(tr('summarySeeAll')) + '</button>';
    el.innerHTML = h;
    el.hidden = false;
  }
  function openSummary() {                                 // The full summary of the focus person, in the side panel
    state.panel = 'summary';
    selectCard(null);
    renderSummaryPanel();
    showPanel();
    panelBody.scrollTop = 0;
    updateChips();
  }
  function renderSummaryPanel() {
    const id = state.focus;
    const info = summaryFor(id);
    panelBody.innerHTML = '<div class="summary">' +
      '<p class="profile-number">' + esc(tr('personNumber', { n: id })) + '</p>' +
      '<h2 class="profile-name">' + esc(tr('summaryTitle', { name: nameOf(id) })) + '</h2>' +
      '<p class="intro">' + esc(tr('summaryNote')) + '</p>' +
      summaryRowsHTML(info.sum, info.rels) +
      '<div class="profile-actions"><button type="button" class="btn btn-ghost btn-small" data-action="open" data-id="' + id + '">' + esc(tr('openProfileBtn')) + '</button></div>' +
      '</div>';
  }

  /* ===================================================================
     13. COMPARE TWO PEOPLE
     =================================================================== */
  function openCompare(a, b) {
    state.compareA = a == null ? null : a;
    state.compareB = b == null ? null : b;
    state.picking = state.compareA == null ? 'a' : (state.compareB == null ? 'b' : null);
    state.panel = 'compare';
    selectCard(null);
    revealCompared();
    renderCompare();
    showPanel();
    panelBody.scrollTop = 0;
    updatePath();
    updateChips();
    focusPicker();
  }

  function slotHTML(slot) {                                // One of the two "A" / "B" boxes
    const id = slot === 'a' ? state.compareA : state.compareB;
    const letter = '<span class="slot-letter">' + slot.toUpperCase() + '</span>';
    if (state.picking === slot || id == null) {            // Show a small search box
      return '<div class="slot">' + letter + '<div class="slot-picker">' +
        '<input type="search" autocomplete="off" data-picker="' + slot + '" placeholder="' + esc(tr('choosePerson')) + '" aria-label="' + esc(tr('choosePerson')) + '">' +
        '<ul data-picker-list="' + slot + '"></ul></div></div>';
    }
    const p = person(id);
    return '<div class="slot">' + letter + '<div class="person-chip static">' + avatarHTML(p, 'avatar-sm') +
      '<span class="pc-main"><span class="pc-name' + (p.name ? '' : ' unknown') + '">' + esc(nameOf(id)) + '</span><span class="pc-sub">#' + id + '</span></span>' +
      '<button type="button" class="mini blue" data-action="change" data-slot="' + slot + '">' + esc(tr('change')) + '</button></div></div>';
  }

  function sentenceHTML(parts) {                           // Turn sentence pieces into HTML with bold names
    return parts.map(function (part) {
      if (part.name != null) {
        const n = esc(part.name) + (part.possessive ? '’s' : '');
        return part.id != null ? '<button type="button" data-action="open" data-id="' + part.id + '">' + n + '</button>' : '<b>' + n + '</b>';
      }
      return esc(part.text);
    }).join('');
  }

  function renderCompare() {
    const a = state.compareA, b = state.compareB;
    let h = '<div class="compare"><h2>' + esc(tr('compareTitle')) + '</h2><p class="intro">' + esc(tr('compareIntro')) + '</p>';
    h += '<div class="slots">' + slotHTML('a') +
      '<div class="swap-row"><button type="button" class="swap-btn" data-action="swap"><svg viewBox="0 0 24 24"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"></path></svg>' + esc(tr('swap')) + '</button></div>' +
      slotHTML('b') + '</div>';

    if (a != null && b != null && state.picking == null) {
      h += '<div class="result-card">';
      if (a === b) {
        h += '<p class="result-sentence">' + esc(tr('samePerson')) + '</p>';
      } else {
        const relAtoB = decorate(Kinship.relation(fam, b, a)); // What A is to B
        const relBtoA = decorate(Kinship.relation(fam, a, b)); // What B is to A
        const path = Kinship.connectionPath(fam, a, b);
        if (relAtoB.type === 'none') relAtoB.connected = relBtoA.connected = !!path;
        h += '<p class="result-sentence">' + sentenceHTML(I18N.relationSentence(state.lang, relAtoB, nameOf(a), nameOf(b), genderOf(a))) + '</p>';
        if (['none', 'partner', 'coparent'].indexOf(relAtoB.type) === -1) { // the reverse adds nothing for couples or co-parents
          h += '<p class="result-reverse">' + sentenceHTML(I18N.relationSentence(state.lang, relBtoA, nameOf(b), nameOf(a), genderOf(b))) + '</p>';
        }
        // ---- Facts: degree, shared ancestors, DNA ----
        if (relAtoB.type !== 'none') {
          h += '<dl class="facts">';
          h += '<div><dt>' + esc(tr('degree')) + '</dt><dd>' + esc(I18N.degreeText(state.lang, relAtoB)) +
            (relAtoB.degree ? '<small>' + esc(tr('civilNote')) + '</small>' : '') + '</dd></div>';
          if (relAtoB.type === 'blood' && relAtoB.dx > 0 && relAtoB.dy > 0) {
            const siblingsPair = relAtoB.dx === 1 && relAtoB.dy === 1; // for siblings, say which parent(s) they share
            const label = !siblingsPair ? 'sharedAncestors' : relAtoB.shared.length === 2 ? 'sharedBothParents' : 'sharedParents';
            h += '<div><dt>' + esc(tr(label)) + '</dt><dd>' + relAtoB.shared.map(function (s) {
              return '<button type="button" class="mini" data-action="open" data-id="' + s + '">' + esc(nameOf(s)) + ' #' + s + '</button>';
            }).join(' ') + '</dd></div>';
          }
          const r = Kinship.sharedDNA(fam, a, b);
          h += '<div><dt>' + esc(tr('dna')) + '</dt><dd>' + esc(I18N.dnaText(state.lang, relAtoB, r)) +
            (r > 0 ? '<small>' + esc(tr('dnaNote')) + '</small>' : '') + '</dd></div>';
          h += '</dl>';
        }
        // ---- How they connect ----
        const chain = path ? Kinship.describeChain(fam, path) : [];
        if (chain.length > 1) {                            // a single step would only repeat the sentence above
          h += '<h3>' + esc(tr('howConnect')) + '</h3><p class="chain">' + sentenceHTML(I18N.chainSentence(state.lang, chain, nameOf, genderOf)) + '</p>';
        }
        if (path) {
          h += '<div class="result-actions-row"><button type="button" class="btn btn-blue btn-small" data-action="show-path">' + esc(tr('showOnTree')) + '</button>' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="clear-compare">' + esc(tr('clear')) + '</button></div>';
        }
      }
      h += '<p class="keep-focus">' + esc(tr('keepFocus', { name: nameOf(state.focus) })) + '</p></div>';
    }
    h += '</div>';
    panelBody.innerHTML = h;
    renderPickerList();
  }

  function renderPickerList() {                            // Results under the compare search box
    const input = panelBody.querySelector('[data-picker]');
    if (!input) return;
    const slot = input.dataset.picker;
    const list = panelBody.querySelector('[data-picker-list="' + slot + '"]');
    const found = input.value.trim() ? searchPeople(input.value) : [];
    list.innerHTML = found.map(function (p) {
      return '<li><button type="button" data-action="pick" data-slot="' + slot + '" data-id="' + p.id + '">' + avatarHTML(p, 'avatar-sm') +
        '<span class="pc-main"><span class="pc-name">' + esc(nameOf(p.id)) + '</span><span class="pc-sub">#' + p.id + '</span></span></button></li>';
    }).join('') || (input.value.trim() ? '<li class="results-empty">' + esc(tr('noResults')) + '</li>' : '');
  }
  function focusPicker() {                                 // Put the cursor in the compare search box (not on phones, to avoid the keyboard jumping up)
    const input = panelBody.querySelector('[data-picker]');
    if (input && !isPhone()) input.focus();
  }

  panelBody.addEventListener('input', function (e) {       // Typing in the compare search box
    if (e.target.matches('[data-picker]')) renderPickerList();
  });
  panelBody.addEventListener('keydown', function (e) {     // Enter picks the first match
    if (e.target.matches('[data-picker]') && e.key === 'Enter') {
      const first = panelBody.querySelector('[data-action="pick"]');
      if (first) first.click();
    }
  });

  /* ===================================================================
     14. CLICKS INSIDE THE PANEL (one listener for every button)
     =================================================================== */
  panel.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id != null ? Number(btn.dataset.id) : null;
    switch (btn.dataset.action) {
      case 'close': closePanel(); break;                   // The × button
      case 'open': openProfile(id, { pan: true }); break;  // Click on a relative
      case 'focus': setFocus(id); break;                   // "View the tree as this person"
      case 'branch': toggleBranch(id); break;              // "Ver / Ocultar la familia de …"
      case 'compare': openCompare(id, id === state.focus ? null : state.focus); break; // "Compare with…"
      case 'change':                                       // Pick a different person for A or B
        state.picking = btn.dataset.slot;
        renderCompare(); focusPicker(); break;
      case 'pick':                                         // A person was chosen in the compare search
        if (btn.dataset.slot === 'a') state.compareA = id; else state.compareB = id;
        state.picking = state.compareA == null ? 'a' : (state.compareB == null ? 'b' : null);
        revealCompared();
        renderCompare(); updatePath(); updateChips(); focusPicker(); break;
      case 'swap': {                                       // Swap A and B
        const t = state.compareA; state.compareA = state.compareB; state.compareB = t;
        if (state.picking) state.picking = state.picking === 'a' ? 'b' : 'a';
        renderCompare(); updatePath(); break;
      }
      case 'show-path':                                    // Zoom the tree to the highlighted path
        if (isPhone()) closePanel();
        fitPeople(pathNodes); break;
      case 'clear-compare': clearCompare(); break;
    }
  });

  function revealCompared() {                              // Show both compared people and everyone on the path between them
    const a = state.compareA, b = state.compareB;
    const ids = [a, b].filter(function (x) { return x != null; });
    if (a != null && b != null && a !== b) {
      const path = Kinship.connectionPath(fam, a, b);
      if (path) path.nodes.forEach(function (n) { if (ids.indexOf(n) === -1) ids.push(n); });
    }
    revealAll(ids);
  }

  function clearCompare() {
    state.compareA = state.compareB = null;
    state.picking = null;
    updatePath();
    if (state.panel === 'compare') closePanel();
    updateChips();
  }

  /* ===================================================================
     15. FLOATING CHIPS: "Viewing as…" and "Comparing…"
     =================================================================== */
  const closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  function updateChips() {
    const f = state.focus;
    let h = '<span class="dot"></span><span>' + esc(tr('viewingAs')) + ' <strong>' + esc(nameOf(f)) + '</strong> <span class="num">#' + f + '</span></span>';
    if (f !== defaultFocus) h += '<button type="button" class="mini" data-chip="back">' + esc(tr('backTo', { name: nameOf(defaultFocus).split(' ')[0] })) + '</button>';
    $('#focus-chip').innerHTML = h;

    const cc = $('#compare-chip');                         // Only when a comparison is active and its panel is closed
    const active = state.compareA != null && state.compareB != null && state.panel !== 'compare';
    cc.hidden = !active;
    if (active) {
      cc.innerHTML = '<span class="dot"></span><span>' + esc(tr('comparing')) + ' <strong>' + esc(nameOf(state.compareA)) + '</strong> ↔ <strong>' + esc(nameOf(state.compareB)) + '</strong></span>' +
        '<button type="button" class="mini blue" data-chip="open-compare">' + esc(tr('open')) + '</button>' +
        '<button type="button" class="chip-close" data-chip="clear-compare" aria-label="' + esc(tr('clear')) + '">' + closeIcon + '</button>';
    }
  }
  $('.chips').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-chip]');
    if (!btn) return;
    if (btn.dataset.chip === 'back') setFocus(defaultFocus);
    if (btn.dataset.chip === 'summary') openSummary();
    if (btn.dataset.chip === 'open-compare') openCompare(state.compareA, state.compareB);
    if (btn.dataset.chip === 'clear-compare') clearCompare();
  });

  /* ===================================================================
     16. LANGUAGE SWITCH
     =================================================================== */
  function applyLanguage() {
    document.documentElement.lang = state.lang;
    const title = SETTINGS.title ? (SETTINGS.title[state.lang] || SETTINGS.title.es || '') : '';
    $('#site-title').textContent = title || tr('subtitle');
    document.title = title || tr('subtitle');
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = tr(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.placeholder = tr(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = tr(el.dataset.i18nTitle); });
    document.querySelectorAll('.lang-toggle button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)); });
    if (cardEls.size) {                                    // Redraw everything that contains words
      cardEls.forEach(function (g, id) { if (!person(id).name) wrapText(g.select('.card-name'), nameOf(id), TEXT_W, 2, 17); });
      state.relations.forEach(decorate);                   // refresh names used inside labels
      updateCardMeta();
      updateCardLabels();
      drawExpanders();
      updateChips();
      updateSummaryChip();
      if (state.panel === 'profile') renderProfile(state.selected);
      if (state.panel === 'compare') renderCompare();
      if (state.panel === 'summary') renderSummaryPanel();
      if (!resultsEl.hidden) renderResults();
      renderProblems();
    }
  }
  document.querySelectorAll('.lang-toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.lang = b.dataset.lang;
      try { localStorage.setItem('tree-lang', state.lang); } catch (e) { /* storage blocked: ignore */ }
      applyLanguage();
      writeHash();
    });
  });

  /* ===================================================================
     17. LINKS THAT REMEMBER THE VIEW (#focus=12)
     So a relative can bookmark or share the tree centred on themselves.
     =================================================================== */
  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const f = Number(params.get('focus'));
    return fam.byId.has(f) ? f : null;
  }
  function writeHash() {
    const params = new URLSearchParams();
    if (state.focus !== defaultFocus) params.set('focus', state.focus);
    if (state.lang !== (SETTINGS.defaultLanguage === 'en' ? 'en' : 'es')) params.set('lang', state.lang);
    const s = params.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
  }

  /* ===================================================================
     18. DATA WARNINGS (only visible if family-data.js has a mistake)
     =================================================================== */
  function renderProblems() {
    const box = $('#problems');
    if (!fam.problems.length) { box.hidden = true; return; }
    box.innerHTML = '<strong>' + esc(tr('dataProblems')) + '</strong><ul>' + fam.problems.map(function (pr) {
      const vars = Object.assign({}, pr, { role: pr.role ? tr('role_' + pr.role) : '' });
      return '<li>' + esc(tr('problem_' + pr.code, vars)) + '</li>';
    }).join('') + '</ul>';
    box.hidden = false;
    if (window.console) console.warn('family-data.js problems:', fam.problems);
  }

  /* ===================================================================
     19. BUTTONS IN THE CORNER, KEYBOARD SHORTCUTS
     =================================================================== */
  $('#zoom-in').addEventListener('click', function () { svg.transition().duration(300).call(zoom.scaleBy, 1.3); });
  $('#zoom-out').addEventListener('click', function () { svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.3); });
  $('#zoom-fit').addEventListener('click', function () { fitPeople(Array.from(state.visible)); });
  $('#zoom-center').addEventListener('click', function () { showNeighborhood(state.focus); });
  $('#compare-open').addEventListener('click', function () {
    if (state.compareA != null && state.compareB != null) openCompare(state.compareA, state.compareB);
    else openCompare(state.focus, null);
  });
  document.addEventListener('keydown', function (e) {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === 'Escape' && !typing && !panel.hidden) closePanel(); // Esc closes the panel
    if (e.key === '/' && !typing) { e.preventDefault(); searchInput.focus(); } // "/" jumps to the search box
  });
  window.addEventListener('hashchange', function () {      // Browser back/forward with a #focus link
    const f = readHash();
    if (f != null && f !== state.focus) setFocus(f);
  });
  if (window.innerWidth > 760) $('#legend').open = true;   // Legend starts open on large screens

  /* ===================================================================
     20. START
     Wait briefly for the typefaces so names are measured correctly,
     then draw everything and centre on the focus person.
     =================================================================== */
  function start() {
    applyLanguage();
    renderProblems();
    if (!people.length) return;                            // Nothing to draw yet
    const startFocus = readHash() || defaultFocus;
    setFocus(startFocus, { duration: 0 });                 // Label everyone and jump (no animation) to the focus person
  }
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([
        document.fonts.load('600 14px "Source Sans 3"'),
        document.fonts.load('700 10.5px "Source Sans 3"'),
        document.fonts.load('400 11.5px "Source Sans 3"'),
      ])
    : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2500); })]) // Never wait more than 2.5 s
    .catch(function () { /* fonts failed: system fonts are fine */ })
    .then(start);
})();
