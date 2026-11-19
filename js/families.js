/* =====================================================================
   FAMILIES.JS — who belongs to each family, for the family filter
   ---------------------------------------------------------------------
   The filter at the top of the tree can show:
     • one side of the focus person's family: their father's side or
       their mother's side (everyone descended from that parent's
       ancestors), or
     • one family by surname, such as the Eraso or the Toro family.

   A surname family starts at the oldest recorded ancestor who carries
   that surname and includes everyone descended from them, whatever
   their surname now, plus the partners of those people. For example
   the Toro family is Amalia Toro and all her descendants (her son
   Gonzalo, his sons Andrés and Agustín Toro Pantoja, the Toro Riascos
   brothers and sisters, their children and grandchildren) and the
   people they married or had children with.

   The families offered are listed in family-data.js under
   SITE_SETTINGS.families, each with the number of one person of that
   family (usually a grandparent); the site climbs from that person to
   the oldest ancestor with the same surname. Without that list, the
   four grandparents of the person the tree opens on are used.
   Used by js/app.js (the tree) and js/constellation.js (3D view).
   ===================================================================== */

(function (root) {
  'use strict';

  const PARTICLES = /^(de|del|la|las|los|y)$/i;
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); } // "Hernández" -> "hernandez"
  function hasSurname(fam, id, surname) {                  // does this person's name contain the surname?
    const p = fam.byId.get(id);
    if (!p || !p.name) return false;
    const want = norm(surname);
    return p.name.split(/\s+/).slice(1).some(function (w) { return !PARTICLES.test(w) && norm(w) === want; });
  }

  /* Oldest recorded ancestors of `from` reached through parents who carry the surname. */
  function oldestWithSurname(fam, from, surname) {
    const tops = [], seen = new Set(), stack = [from];
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur)) continue;
      seen.add(cur);
      const up = (fam.parentLinks.get(cur) || []).map(function (l) { return l.id; })
        .filter(function (pid) { return hasSurname(fam, pid, surname); });
      if (up.length) up.forEach(function (pid) { stack.push(pid); }); else tops.push(cur);
    }
    return tops;
  }

  /* The given people, everyone descended from them, and the partners of all of those. */
  function membersFrom(fam, roots) {
    const set = new Set(), stack = roots.slice();
    while (stack.length) {
      const cur = stack.pop();
      if (set.has(cur) || !fam.byId.has(cur)) continue;
      set.add(cur);
      (fam.children.get(cur) || []).forEach(function (c) { stack.push(c); });
    }
    Array.from(set).forEach(function (id) {               // partners and other parents of their children
      (fam.partners.get(id) || new Set()).forEach(function (q) { set.add(q); });
      (fam.coparents.get(id) || new Set()).forEach(function (q) { set.add(q); });
    });
    return set;
  }

  /* The families offered in the filter: [{ key, name, from, founders }] */
  function list(fam, settings, defaultFocus) {
    let defs = settings && Array.isArray(settings.families) ? settings.families : null;
    if (!defs && root.FamilyLines && defaultFocus != null) {          // default: the four grandparents' surnames
      defs = root.FamilyLines.grandparents(fam, defaultFocus).map(function (g) {
        return { name: root.FamilyLines.surnameOf(fam, g.id, g.child), from: g.id };
      }).filter(function (d) { return d.name; });
    }
    const out = [];
    (defs || []).forEach(function (d) {
      if (!d || !d.name || !fam.byId.has(d.from)) return;
      const key = slug(d.name);
      if (key === 'paterno' || key === 'materno' || out.some(function (f) { return f.key === key; })) return;
      out.push({ key: key, name: d.name, from: d.from, founders: oldestWithSurname(fam, d.from, d.name) });
    });
    return out;
  }

  function familyMembers(fam, family) { return membersFrom(fam, family.founders); }

  /* One side of a person's family: 'father' or 'mother'. Null if that parent is not recorded. */
  function sideMembers(fam, focus, side) {
    const link = (fam.parentLinks.get(focus) || []).find(function (l) { return l.role === side; });
    if (!link) return null;
    const roots = [link.id];
    root.Kinship.ancestorsOf(fam, link.id).forEach(function (info, aid) { if (aid !== link.id) roots.push(aid); });
    return membersFrom(fam, roots);
  }

  const api = { list: list, familyMembers: familyMembers, sideMembers: sideMembers, slug: slug, hasSurname: hasSurname, oldestWithSurname: oldestWithSurname };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // for automated tests
  root.FamilyGroups = api;                                // in the browser: window.FamilyGroups
})(typeof window !== 'undefined' ? window : globalThis);
