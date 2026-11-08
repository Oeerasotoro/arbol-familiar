/* =====================================================================
   KINSHIP.JS — the relationship engine
   ---------------------------------------------------------------------
   Works out how any two people are related, using only the father,
   mother, unconfirmed and partners fields from family-data.js.
   It does not draw anything and has no words in it; the words for each
   relationship live in js/i18n.js. You should not need to edit this file.

   Vocabulary used in the comments:
     dx   = generations from person X up to the shared ancestor
     dy   = generations from person Y up to the shared ancestor
            (father: dx=1, dy=0 · brother: 1,1 · uncle: 2,1 ·
             first cousin: 2,2)
     degree of kinship = dx + dy, counted the civil-law way used in
            Colombian law (parent 1, sibling 2, uncle 3, cousin 4).
   ===================================================================== */

(function (root) {                                     // Wrap everything so nothing leaks into the page by accident
  'use strict';                                        // Ask the browser to flag sloppy code

  /* ---------------------------------------------------------------
     buildFamily(people)
     Turns the raw list into lookup tables and checks it for mistakes.
     --------------------------------------------------------------- */
  function buildFamily(people) {
    const byId = new Map();                            // person number -> person record
    const problems = [];                               // data mistakes found while reading the list

    people.forEach(function (raw, index) {             // Go through every block in family-data.js
      if (typeof raw.id !== 'number') {                // Each person must have a numeric id
        problems.push({ code: 'noId', index: index, name: raw.name || '' });
        return;                                        // Skip a record without a number
      }
      if (byId.has(raw.id)) {                          // Two people may not share a number
        problems.push({ code: 'duplicateId', id: raw.id });
        return;                                        // Keep the first one, ignore the duplicate
      }
      byId.set(raw.id, {                               // Store a cleaned-up copy of the person
        id: raw.id,
        name: (raw.name || '').trim(),                 // Remove stray spaces around the name
        gender: raw.gender === 'male' || raw.gender === 'female' ? raw.gender : 'unknown',
        father: raw.father == null ? null : raw.father,
        mother: raw.mother == null ? null : raw.mother,
        unconfirmed: Array.isArray(raw.unconfirmed) ? raw.unconfirmed : [],
        partners: Array.isArray(raw.partners) ? raw.partners : [],
        notPartners: Array.isArray(raw.notPartners) ? raw.notPartners : [], // co-parents who are not a couple
        born: raw.born || '',
        died: raw.died || '',
        birthplace: raw.birthplace || '',
        photo: raw.photo || '',
        description: raw.description || '',
        bio: raw.bio || '',
      });
    });

    const parentLinks = new Map();                     // child number -> list of {id, role, confirmed}
    const children = new Map();                        // parent number -> list of child numbers
    const partners = new Map();                        // person number -> set of partner numbers (couples)
    const coparents = new Map();                       // person number -> set of people they share a child with
    byId.forEach(function (p) {                        // Make empty slots for every person first
      parentLinks.set(p.id, []);
      children.set(p.id, []);
      partners.set(p.id, new Set());
      coparents.set(p.id, new Set());
    });

    function notACouple(a, b) {                        // Did either person list the other in "notPartners"?
      return (byId.has(a) && byId.get(a).notPartners.indexOf(b) !== -1) ||
             (byId.has(b) && byId.get(b).notPartners.indexOf(a) !== -1);
    }
    function addPartners(a, b) {                       // Record a couple in both directions
      if (a === b || !byId.has(a) || !byId.has(b) || notACouple(a, b)) return;
      partners.get(a).add(b);
      partners.get(b).add(a);
    }

    byId.forEach(function (p) {                        // Now connect every person to their parents
      ['father', 'mother'].forEach(function (role) {   // Handle the father field, then the mother field
        const pid = p[role];                           // The parent's number (or null)
        if (pid == null) return;                       // Nothing recorded for this parent
        if (!byId.has(pid)) {                          // Points to a number that does not exist
          problems.push({ code: 'missingParent', id: p.id, role: role, parent: pid });
          return;
        }
        if (pid === p.id) {                            // Someone listed as their own parent
          problems.push({ code: 'selfParent', id: p.id });
          return;
        }
        const parent = byId.get(pid);                  // The parent's record
        if (role === 'father' && parent.gender === 'female') problems.push({ code: 'genderRole', id: p.id, role: role, parent: pid });
        if (role === 'mother' && parent.gender === 'male') problems.push({ code: 'genderRole', id: p.id, role: role, parent: pid });
        parentLinks.get(p.id).push({                   // Save the link from child to parent
          id: pid,
          role: role,
          confirmed: p.unconfirmed.indexOf(role) === -1, // Confirmed unless listed in "unconfirmed"
        });
        children.get(pid).push(p.id);                  // Save the link from parent to child
      });
      if (byId.has(p.father) && byId.has(p.mother) && p.father !== p.mother) {
        coparents.get(p.father).add(p.mother);         // They share a child…
        coparents.get(p.mother).add(p.father);
        addPartners(p.father, p.mother);               // …and count as a couple unless "notPartners" says otherwise
      }
      p.partners.forEach(function (q) {                // Couples written explicitly in "partners"
        if (!byId.has(q)) problems.push({ code: 'missingPartner', id: p.id, partner: q });
        else addPartners(p.id, q);
      });
    });

    // A "union" is one couple (or a single known parent) plus their children.
    // The drawing code uses unions to draw the lines between generations.
    const unions = new Map();                          // union key -> {key, parents, children}
    function unionKeyOf(ids) {                         // Same couple always gets the same key, e.g. "u:2,3"
      return 'u:' + ids.slice().sort(function (a, b) { return a - b; }).join(',');
    }
    function getUnion(ids) {                           // Fetch a union, creating it the first time
      const key = unionKeyOf(ids);
      if (!unions.has(key)) unions.set(key, { key: key, parents: ids.slice(), children: [] });
      return unions.get(key);
    }
    byId.forEach(function (p) {                        // Every child belongs to the union of its parents
      const ids = parentLinks.get(p.id).map(function (l) { return l.id; });
      if (ids.length) getUnion(ids).children.push(p.id);
    });
    partners.forEach(function (set, a) {               // Couples without children still get a union
      set.forEach(function (b) { if (a < b) getUnion([a, b]); });
    });

    const fam = {                                      // Everything other files need
      byId: byId,
      parentLinks: parentLinks,
      children: children,
      partners: partners,                              // couples (married or together)
      coparents: coparents,                            // people who share a child, couple or not
      unions: unions,
      unionKeyOf: unionKeyOf,
      problems: problems,
      _ancestorCache: new Map(),                       // Remembers ancestor lists so they are computed once
    };

    byId.forEach(function (p) {                        // Look for loops: someone being their own ancestor
      if (ancestorsOf(fam, p.id).get(p.id).loop) problems.push({ code: 'loop', id: p.id });
    });
    return fam;
  }

  /* ---------------------------------------------------------------
     ancestorsOf(fam, id)
     Every ancestor of a person (including the person at depth 0),
     with the number of generations up, whether a fully confirmed
     path exists, and which child of that ancestor the path came
     through ("branches").
     --------------------------------------------------------------- */
  function ancestorsOf(fam, id) {
    if (fam._ancestorCache.has(id)) return fam._ancestorCache.get(id); // Already worked out
    const result = new Map();                          // ancestor number -> {depth, confirmed, branches}
    result.set(id, { depth: 0, confirmed: true, branches: new Set() }); // The person is their own depth-0 "ancestor"
    let frontier = [id];                               // People whose parents we still have to look at
    let depth = 0;                                     // Current number of generations up
    let loopFound = false;                             // Set when the data loops back on itself
    while (frontier.length && depth < 60) {            // Stop after 60 generations as a safety net
      depth += 1;                                      // Move one generation up
      const next = [];                                 // Parents found at this level
      frontier.forEach(function (nodeId) {
        const info = result.get(nodeId);               // How we reached this person
        (fam.parentLinks.get(nodeId) || []).forEach(function (link) {
          const confirmed = info.confirmed && link.confirmed; // A path is confirmed only if every link is
          const existing = result.get(link.id);
          if (link.id === id) loopFound = true;        // Reached the starting person again: a loop
          if (!existing) {                             // First time this ancestor is reached
            result.set(link.id, { depth: depth, confirmed: confirmed, branches: new Set([nodeId]) });
            next.push(link.id);
          } else if (existing.depth === depth) {       // Reached again at the same distance by another route
            existing.confirmed = existing.confirmed || confirmed;
            existing.branches.add(nodeId);
          }                                            // Longer routes are ignored: the shortest one counts
        });
      });
      frontier = next;
    }
    if (loopFound) result.get(id).loop = true;         // Mark it so buildFamily can report the problem
    fam._ancestorCache.set(id, result);                // Save for next time
    return result;
  }

  /* ---------------------------------------------------------------
     siblingInfo(fam, a, b)
     Are a and b siblings, and if so full, half or not yet known?
     --------------------------------------------------------------- */
  function siblingInfo(fam, a, b) {
    if (a === b) return null;                          // Nobody is their own sibling
    const la = fam.parentLinks.get(a) || [];           // a's parents
    const lb = fam.parentLinks.get(b) || [];           // b's parents
    const shared = [];                                 // parents they have in common
    let confirmed = true;                              // stays true only if every shared link is confirmed
    la.forEach(function (x) {
      const y = lb.find(function (l) { return l.id === x.id; });
      if (y) {                                         // Same parent on both sides
        shared.push(x.id);
        if (!x.confirmed || !y.confirmed) confirmed = false;
      }
    });
    if (!shared.length) return null;                   // No parent in common: not siblings
    let kind;                                          // 'full', 'half' or 'unknown'
    if (shared.length === 2) kind = 'full';            // Both parents shared
    else if (la.length === 2 && lb.length === 2) kind = 'half'; // One shared, the other parents known and different
    else kind = 'unknown';                             // One shared, the other parent missing on at least one side
    return { kind: kind, shared: shared, confirmed: confirmed };
  }

  /* ---------------------------------------------------------------
     bloodRelation(fam, x, y)
     Finds the closest shared ancestor of x and y.
     Returns null when they share no recorded ancestor.
     --------------------------------------------------------------- */
  function bloodRelation(fam, x, y) {
    const ax = ancestorsOf(fam, x);                    // x and all x's ancestors
    const ay = ancestorsOf(fam, y);                    // y and all y's ancestors
    let best = null;                                   // closest shared ancestor found so far
    ax.forEach(function (ix, cid) {
      const iy = ay.get(cid);
      if (!iy) return;                                 // Not shared
      const sum = ix.depth + iy.depth;                 // Total generations through this ancestor
      const gap = Math.abs(ix.depth - iy.depth);
      if (!best || sum < best.sum || (sum === best.sum && gap < best.gap)) {
        best = { sum: sum, gap: gap, dx: ix.depth, dy: iy.depth };
      }
    });
    if (!best) return null;                            // No shared ancestor recorded

    const shared = [];                                 // every ancestor at that same closest position
    ax.forEach(function (ix, cid) {
      const iy = ay.get(cid);
      if (iy && ix.depth === best.dx && iy.depth === best.dy) shared.push(cid);
    });
    const confirmed = shared.some(function (cid) {     // Confirmed if one shared ancestor is reached by confirmed paths on both sides
      return ax.get(cid).confirmed && ay.get(cid).confirmed;
    });

    let kind = null;                                   // full/half/unknown, only for side branches (siblings, uncles, cousins)
    let sibling = null;                                // the two siblings where the family branches apart
    if (best.dx > 0 && best.dy > 0) {                  // Not a direct line, so there is a branching point
      const order = { full: 0, unknown: 1, half: 2 };  // Prefer the closest kind of link if several exist
      shared.forEach(function (cid) {
        ax.get(cid).branches.forEach(function (bx) {   // the shared ancestor's child on x's side
          ay.get(cid).branches.forEach(function (by) { // the shared ancestor's child on y's side
            const info = siblingInfo(fam, bx, by);
            if (info && (!sibling || order[info.kind] < order[sibling.kind])) {
              sibling = { a: bx, b: by, kind: info.kind, shared: info.shared, confirmed: info.confirmed };
            }
          });
        });
      });
      kind = sibling ? sibling.kind : 'unknown';
    }

    return {
      dx: best.dx,                                     // generations from x up to the shared ancestor
      dy: best.dy,                                     // generations from y up to the shared ancestor
      degree: best.dx + best.dy,                       // civil-law degree of kinship
      shared: shared,                                  // shared ancestor numbers at the branching point
      confirmed: confirmed,
      kind: kind,                                      // full, half or unknown (null for direct lines)
      sibling: sibling,
    };
  }

  /* ---------------------------------------------------------------
     relation(fam, x, y)
     The main question: what is Y to X? Checks, in order:
       same person -> partner -> parents of the same child (not a
       couple) -> blood -> by marriage -> none.
     Relatives "by marriage" only count through real couples, so a
     parent's siblings are not in-laws of a co-parent who was never
     (or is no longer) their partner.
     --------------------------------------------------------------- */
  function relation(fam, x, y) {
    if (x === y) return { type: 'self', confirmed: true };
    if (fam.partners.get(x) && fam.partners.get(x).has(y)) return { type: 'partner', confirmed: true, degree: null };
    if (fam.coparents.get(x) && fam.coparents.get(x).has(y)) {   // share a child but are not a couple
      const shared = fam.children.get(x).filter(function (c) { return fam.children.get(y).indexOf(c) !== -1; });
      return { type: 'coparent', confirmed: true, degree: null, children: shared };
    }

    const blood = bloodRelation(fam, x, y);            // Shared ancestry?
    if (blood) return Object.assign({ type: 'blood' }, blood);

    const options = [];                                // Ways they may be related through a couple
    fam.partners.get(x).forEach(function (p) {         // Y is a blood relative of X's partner
      const b = bloodRelation(fam, p, y);
      if (b) options.push({ type: 'affinity', side: 'partnerRelative', via: p, blood: b });
    });
    fam.partners.get(y).forEach(function (q) {         // Y is the partner of X's blood relative
      const b = bloodRelation(fam, x, q);
      if (b) options.push({ type: 'affinity', side: 'relativePartner', via: q, blood: b });
    });
    if (options.length) {
      options.sort(function (a, b) { return a.blood.degree - b.blood.degree; }); // Closest one wins
      const o = options[0];
      o.degree = o.blood.degree;                       // Degree of affinity equals the degree of the blood link
      o.confirmed = o.blood.confirmed;
      return o;
    }
    return { type: 'none', confirmed: true, degree: null };
  }

  /* ---------------------------------------------------------------
     sharedDNA(fam, x, y)
     Expected share of DNA (the "coefficient of relationship"):
     adds up (1/2)^(steps) for every separate route through a shared
     ancestor. Full siblings: 1/4 + 1/4 = 50 %. First cousins: 12.5 %.
     --------------------------------------------------------------- */
  function upwardPaths(fam, id, maxDepth) {            // Every route from a person up to each ancestor
    const paths = [];                                  // list of {top, length, nodes}
    const MAX_PATHS = 20000;                           // Safety limit for very large trees
    (function walk(node, nodes, len) {
      if (paths.length > MAX_PATHS) return;
      paths.push({ top: node, length: len, nodes: nodes });
      if (len >= maxDepth) return;
      (fam.parentLinks.get(node) || []).forEach(function (l) {
        if (nodes.indexOf(l.id) !== -1) return;        // Ignore loops in bad data
        walk(l.id, nodes.concat([l.id]), len + 1);
      });
    })(id, [id], 0);
    return paths;
  }
  function sharedDNA(fam, x, y) {
    if (x === y) return 1;                             // Identical with oneself
    const px = upwardPaths(fam, x, 14);                // Routes up from x
    const py = upwardPaths(fam, y, 14);                // Routes up from y
    const byTop = new Map();                           // group y's routes by the ancestor they end at
    py.forEach(function (p) {
      if (!byTop.has(p.top)) byTop.set(p.top, []);
      byTop.get(p.top).push(p);
    });
    let r = 0;
    px.forEach(function (a) {
      (byTop.get(a.top) || []).forEach(function (b) {
        const overlap = a.nodes.some(function (n) {    // The two routes may only meet at the top
          return n !== a.top && b.nodes.indexOf(n) !== -1;
        });
        if (!overlap) r += Math.pow(0.5, a.length + b.length);
      });
    });
    return r;
  }

  /* ---------------------------------------------------------------
     connectionPath(fam, a, b)
     Shortest chain of family links from a to b, used to explain
     "how they connect" and to light up the lines on the tree.
     Steps are 'parent' (next person is a parent), 'child', 'partner'.
     --------------------------------------------------------------- */
  function connectionPath(fam, a, b) {
    if (a === b) return { nodes: [a], steps: [] };
    const dist = new Map([[a, 0]]);                    // best known cost to reach each person
    const prev = new Map();                            // how each person was reached
    const queue = [a];                                 // people still to explore
    while (queue.length) {
      queue.sort(function (p, q) { return dist.get(p) - dist.get(q); }); // cheapest first
      const cur = queue.shift();
      if (cur === b) break;                            // Reached the target
      const edges = [];                                // neighbours of the current person
      (fam.parentLinks.get(cur) || []).forEach(function (l) { edges.push({ to: l.id, step: 'parent', cost: 1 }); });
      (fam.children.get(cur) || []).forEach(function (c) { edges.push({ to: c, step: 'child', cost: 1 }); });
      fam.partners.get(cur).forEach(function (p) { edges.push({ to: p, step: 'partner', cost: 1.05 }); }); // blood routes win ties
      edges.forEach(function (e) {
        const d = dist.get(cur) + e.cost;
        if (!dist.has(e.to) || d < dist.get(e.to)) {
          if (!dist.has(e.to)) queue.push(e.to);
          dist.set(e.to, d);
          prev.set(e.to, { from: cur, step: e.step });
        }
      });
    }
    if (!prev.has(b)) return null;                     // No chain of links joins them
    const nodes = [b];                                 // Walk back from b to a
    const steps = [];
    let cur = b;
    while (cur !== a) {
      const p = prev.get(cur);
      steps.unshift(p.step);
      nodes.unshift(p.from);
      cur = p.from;
    }
    return { nodes: nodes, steps: steps };
  }

  /* ---------------------------------------------------------------
     describeChain(fam, path)
     Merges "child of P, then P's child" into one sibling step so the
     sentence reads "brother of" instead of "son of … father of".
     --------------------------------------------------------------- */
  function describeChain(fam, path) {
    const out = [];                                    // list of {from, to, rel, info}
    let i = 0;
    while (i < path.steps.length) {
      const s = path.steps[i];
      const from = path.nodes[i];
      if (s === 'parent' && path.steps[i + 1] === 'child') { // up then down = sibling
        const to = path.nodes[i + 2];
        out.push({ from: from, to: to, rel: 'sibling', via: path.nodes[i + 1], info: siblingInfo(fam, from, to) }); // via = the shared parent
        i += 2;
        continue;
      }
      const to = path.nodes[i + 1];
      if (s === 'parent') {                            // "from" is the child of "to"
        const link = fam.parentLinks.get(from).find(function (l) { return l.id === to; });
        out.push({ from: from, to: to, rel: 'child', info: { confirmed: link.confirmed } });
      } else if (s === 'child') {                      // "from" is the parent of "to"
        const link = fam.parentLinks.get(to).find(function (l) { return l.id === from; });
        out.push({ from: from, to: to, rel: 'parent', info: { confirmed: link.confirmed } });
      } else {                                         // partners
        out.push({ from: from, to: to, rel: 'partner', info: { confirmed: true } });
      }
      i += 1;
    }
    return out;
  }

  /* ---------------------------------------------------------------
     lineage(fam, id)
     The focus person's direct line (ancestors and descendants) as
     parent->child pairs, used to colour those lines on the tree.
     --------------------------------------------------------------- */
  function lineage(fam, id) {
    const pairs = [];                                  // list of [parent, child]
    const anc = ancestorsOf(fam, id);
    anc.forEach(function (info, aid) {
      info.branches.forEach(function (childId) { pairs.push([aid, childId]); });
    });
    const seen = new Set([id]);                        // walk down through descendants
    (function down(p) {
      (fam.children.get(p) || []).forEach(function (c) {
        pairs.push([p, c]);
        if (!seen.has(c)) { seen.add(c); down(c); }
      });
    })(id);
    return pairs;
  }

  const api = {                                        // What other files can use
    buildFamily: buildFamily,
    ancestorsOf: ancestorsOf,
    siblingInfo: siblingInfo,
    bloodRelation: bloodRelation,
    relation: relation,
    sharedDNA: sharedDNA,
    connectionPath: connectionPath,
    describeChain: describeChain,
    lineage: lineage,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // for automated tests
  else root.Kinship = api;                             // in the browser: available as window.Kinship
})(typeof window !== 'undefined' ? window : this);
