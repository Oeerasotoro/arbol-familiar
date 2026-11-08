/* =====================================================================
   LINES.JS — family-line colours ("ramas")
   ---------------------------------------------------------------------
   Gives every person a colour that says which branch of the focus
   person's family they belong to:

     • Close family (terracotta): the focus person, their partner, the
       other parent of their children, parents, siblings, children,
       nieces and nephews and their descendants.
     • One colour per grandparent: the paternal grandfather's branch,
       the paternal grandmother's, the maternal grandfather's and the
       maternal grandmother's. A relative goes into the branch of the
       grandparent they descend from; aunts, uncles and cousins who
       descend from both grandparents of a side go into the
       grandfather's branch (the one whose surname they carry first).
       Each branch also takes in the partners of its members.
     • Relatives by marriage and extended family (slate grey).
     • People with no recorded connection (light grey).

   The branch name is the grandparent's surname, worked out from the
   names (for example "Eraso" from José Ernesto Eraso Rosero, father of
   José Ernesto Eraso Hernández). Used by the tree (js/app.js) and the
   3D view (js/constellation.js). To change a colour, edit COLORS.
   ===================================================================== */

(function (root) {
  'use strict';

  const COLORS = {                                     // Colour of each branch
    direct: '#b4532a',                                 // terracotta: close family
    pgf: '#3a6ea8',                                    // blue: paternal grandfather's branch
    pgm: '#2e8b74',                                    // green-teal: paternal grandmother's branch
    mgf: '#7a8a2a',                                    // olive: maternal grandfather's branch
    mgm: '#b0477a',                                    // rose: maternal grandmother's branch
    marriage: '#7b8494',                               // slate: relatives by marriage, extended family
    none: '#b3aa9c',                                   // light grey: no recorded connection
  };
  const SPARE = ['#8c6d2c', '#5b5fb2', '#3a8ea6', '#8a4f9e', '#6f7f3a', '#a35a4a']; // more branch colours, for other surnames
  const ROLES = ['pgf', 'pgm', 'mgf', 'mgm'];          // order of the four grandparent branches
  // Each surname keeps the same colour whoever is the focus person: the
  // starting person's four branches get the four colours above, and any other
  // surname gets the next spare colour the first time it appears.
  const surnameColors = new Map();                     // normalised surname (or "gp:12") -> colour
  let spareNext = 0;
  const PARTICLES = /^(de|del|la|las|los|y)$/i;        // small words that are not surnames

  function norm(s) {                                   // "Hernández" -> "hernandez"
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function words(name) {                               // Name split into words, without "de", "del"…
    return String(name || '').split(/\s+/).filter(function (w) { return w && !PARTICLES.test(w); });
  }

  /* The four grandparents of a person (only those recorded). */
  function grandparents(fam, id) {
    const out = [];
    const parents = fam.parentLinks.get(id) || [];
    ['father', 'mother'].forEach(function (side) {
      const parent = parents.find(function (l) { return l.role === side; });
      if (!parent) return;
      const gps = fam.parentLinks.get(parent.id) || [];
      ['father', 'mother'].forEach(function (r) {
        const gp = gps.find(function (l) { return l.role === r; });
        if (gp) out.push({ role: (side === 'father' ? 'p' : 'm') + (r === 'father' ? 'gf' : 'gm'), id: gp.id, child: parent.id });
      });
    });
    out.sort(function (a, b) { return ROLES.indexOf(a.role) - ROLES.indexOf(b.role); });
    return out;
  }

  /* Surname that a grandparent passed to their child: the last word of
     the grandparent's name that also appears in the child's name. */
  function surnameOf(fam, gpId, childId) {
    const gp = fam.byId.get(gpId), child = fam.byId.get(childId);
    if (!gp || !gp.name) return null;
    const gw = words(gp.name);
    const cw = child && child.name ? words(child.name).map(norm) : [];
    for (let i = gw.length - 1; i >= 1; i--) {         // skip the first word: it is a given name
      if (cw.indexOf(norm(gw[i])) !== -1) return gw[i];
    }
    if (gw.length >= 4) return gw[gw.length - 2];      // "Nombre Nombre Apellido Apellido": first surname
    return gw.length > 1 ? gw[gw.length - 1] : null;
  }

  function componentOf(fam, id) {                      // everyone reachable from id through any family link
    const seen = new Set([id]);
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift();
      const next = (fam.parentLinks.get(cur) || []).map(function (l) { return l.id; })
        .concat(fam.children.get(cur) || [], Array.from(fam.partners.get(cur) || []), Array.from(fam.coparents.get(cur) || []));
      next.forEach(function (n) { if (!seen.has(n)) { seen.add(n); queue.push(n); } });
    }
    return seen;
  }

  /* ---------------------------------------------------------------
     compute(fam, focus, relOf)
     relOf(id) may return relations already worked out by the page
     (Kinship.relation(fam, focus, id)); otherwise they are computed.
     Returns:
       keyOf(id)   -> 'direct', 'pgf', 'pgm', 'mgf', 'mgm', 'marriage' or 'none'
       colorOf(id) -> the colour for that person
       lines       -> the grandparent branches that exist, in order,
                      each { key, gpId, surname, color, count }
       counts      -> number of people in each key
     --------------------------------------------------------------- */
  function compute(fam, focus, relOf) {
    const K = root.Kinship;
    const gps = grandparents(fam, focus).map(function (g) {
      return { role: g.role, id: g.id, child: g.child, anc: K.ancestorsOf(fam, g.id) };
    });
    const connected = componentOf(fam, focus);

    function branchOf(shared) {                        // first grandparent (in ROLES order) the shared ancestors go through
      for (let i = 0; i < gps.length; i++) {
        if (shared.some(function (s) { return gps[i].anc.has(s); })) return gps[i].role;
      }
      return 'direct';
    }
    function bloodKey(b) {
      if (b.dx <= 1) return 'direct';                  // parents, siblings and below, own descendants
      return branchOf(b.shared || []);
    }
    function classify(id) {
      const rel = relOf ? relOf(id) : K.relation(fam, focus, id);
      if (!rel) return 'none';
      switch (rel.type) {
        case 'self': case 'partner': case 'coparent': return 'direct';
        case 'blood': return bloodKey(rel);
        case 'affinity': return rel.side === 'relativePartner' ? bloodKey(rel.blood) : 'marriage'; // partner of a relative joins that relative's branch
        default: return connected.has(id) ? 'marriage' : 'none';
      }
    }

    const keyMap = new Map();
    const counts = { direct: 0, pgf: 0, pgm: 0, mgf: 0, mgm: 0, marriage: 0, none: 0 };
    fam.byId.forEach(function (p) {
      const k = classify(p.id);
      keyMap.set(p.id, k);
      counts[k] += 1;
    });
    const used = new Set();                            // colours already taken in this view
    const lines = gps.map(function (g) {
      const surname = surnameOf(fam, g.id, g.child);
      const name = surname ? norm(surname) : 'gp:' + g.id;
      let color = surnameColors.get(name);
      if (!color || used.has(color)) {                 // new surname (or two branches share one): next free colour
        color = surnameColors.size === 0 && !used.has(COLORS[g.role]) ? COLORS[g.role] : null;
        for (let i = 0; !color && i < SPARE.length * 2; i++) {
          const c = SPARE[(spareNext + i) % SPARE.length];
          if (!used.has(c)) { color = c; spareNext = (spareNext + i + 1) % SPARE.length; }
        }
        if (!surnameColors.has(name)) surnameColors.set(name, color);
      }
      used.add(color);
      return { key: g.role, gpId: g.id, surname: surname, color: color, count: counts[g.role] };
    });
    const colorOfKey = function (k) {
      const line = lines.find(function (l) { return l.key === k; });
      return line ? line.color : (COLORS[k] || COLORS.none);
    };
    return {
      focus: focus,
      keyOf: function (id) { return keyMap.get(id) || 'none'; },
      colorOf: function (id) { return colorOfKey(keyMap.get(id) || 'none'); },
      colorOfKey: colorOfKey,
      lines: lines,
      counts: counts,
      lineByKey: function (k) { return lines.find(function (l) { return l.key === k; }) || null; },
    };
  }

  /* The starting person's four branches take the four main colours, so the
     surnames of that family (for example Eraso, Hernández, Toro, Riascos)
     always appear in the same colours. Call once, before compute(). */
  function setBase(fam, focus) {
    surnameColors.clear();
    spareNext = 0;
    grandparents(fam, focus).forEach(function (g) {
      const surname = surnameOf(fam, g.id, g.child);
      const name = surname ? norm(surname) : 'gp:' + g.id;
      if (!surnameColors.has(name)) surnameColors.set(name, COLORS[g.role]);
    });
  }

  /* A colour mixed with white, for soft card backgrounds: tint('#b4532a', 0.08) */
  function tint(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = function (c) { return Math.round(255 - (255 - c) * amount); };
    return 'rgb(' + mix(r) + ',' + mix(g) + ',' + mix(b) + ')';
  }

  /* Name of a branch in the page language: "Rama Eraso", "Familia cercana",
     or "Rama de la abuela paterna" when that grandparent has no name yet. */
  function label(lang, key, info) {
    const I = root.I18N;
    if (key === 'direct' || key === 'marriage' || key === 'none') return I.t(lang, 'line_' + key);
    const line = info && info.lineByKey(key);
    if (line && line.surname) return I.t(lang, 'line_branch', { surname: line.surname });
    const male = key.slice(-2) === 'gf';
    const s = I.t(lang, male ? 'line_unnamed_m' : 'line_unnamed', { role: I.t(lang, 'line_' + key) });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function sublabel(lang, key, info) {                 // "abuelo paterno", or the list for close family
    const I = root.I18N;
    if (key === 'direct') return I.t(lang, 'line_directSub');
    const line = info && info.lineByKey(key);
    if (line && line.surname) return I.t(lang, 'line_' + key); // (unnamed branches already say which grandparent)
    return '';
  }

  const api = { COLORS: COLORS, ROLES: ROLES, compute: compute, setBase: setBase, grandparents: grandparents, surnameOf: surnameOf, tint: tint, label: label, sublabel: sublabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // for automated tests
  root.FamilyLines = api;                              // in the browser: window.FamilyLines
})(typeof window !== 'undefined' ? window : globalThis);
