/* =====================================================================
   CONSTELLATION.JS — the 3D view (3d.html)
   ---------------------------------------------------------------------
   Shows the same family as the tree, as a constellation you can turn:
   every person is a star, each generation is a ring (oldest at the
   top), and stars take the colour of their family branch (js/lines.js).
   Uses the same data (family-data.js), the same relationship rules
   (js/kinship.js) and the same words (js/i18n.js) as the tree.
   Drawing is done with the three.js library (lib/three.min.js).
   You should not need to edit this file.
   ===================================================================== */

(function () {
  'use strict';

  /* ===================================================================
     1. SETTINGS YOU CAN TWEAK
     =================================================================== */
  const SPACING = 3.7;                                     // Space between neighbours in a ring (3D units)
  const ROW_H = 4.8;                                       // Height between generations
  const STAR_R = 0.34;                                     // Size of each star
  const BG = '#0c1120';                                    // Night-sky background colour
  const PATH_COLOR = '#ffcf6e';                            // Gold line from the focus person to the chosen star
  const SPIN_SPEED = 0.45;                                 // Speed of the slow automatic turn

  /* ===================================================================
     2. DATA AND STATE
     =================================================================== */
  const SETTINGS = window.SITE_SETTINGS || {};
  const fam = Kinship.buildFamily(window.FAMILY_DATA || []);
  const people = Array.from(fam.byId.values());
  const defaultFocus = fam.byId.has(SETTINGS.defaultFocus) ? SETTINGS.defaultFocus : (people[0] ? people[0].id : null);
  if (defaultFocus != null) FamilyLines.setBase(fam, defaultFocus); // same branch colours as the tree
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hashParams = new URLSearchParams(location.hash.slice(1));

  const state = {
    lang: pickLanguage(),
    focus: fam.byId.has(Number(hashParams.get('focus'))) ? Number(hashParams.get('focus')) : defaultFocus,
    relations: new Map(),                                  // person -> relation to the focus person
    lines: null,                                           // branch colours from the focus person's view
    selected: null,                                        // star whose card is open
    hovered: null,                                         // star under the mouse
    spinning: !reduceMotion,                               // slow automatic turn
  };

  /* ===================================================================
     3. SMALL HELPERS (the same as in js/app.js)
     =================================================================== */
  const $ = function (sel) { return document.querySelector(sel); };
  function tr(key, vars) { return I18N.t(state.lang, key, vars); }
  function person(id) { return fam.byId.get(id); }
  function givenName(full) {
    const w = full.split(/\s+/);
    let out = w[0], i = 1;
    while (i + 1 < w.length && /^(de|del|la|las|los)$/.test(w[i])) { out += ' ' + w[i] + ' ' + w[i + 1]; i += 2; }
    return out;
  }
  function nameOf(id) {                                    // Name; for someone without a name, "Madre de Andrea y Viviana"
    const p = person(id);
    if (!p) return '';
    if (p.name) return p.name;
    const kids = fam.children.get(id).filter(function (c) { return person(c).name; }).map(function (c) { return givenName(person(c).name); });
    if (!kids.length) return tr('nameUnknown');
    const list = kids.length === 1 ? kids[0] : kids.length === 2 ? kids[0] + tr('and') + kids[1] : kids[0] + ', ' + kids[1] + tr('andOthers');
    return tr(p.gender === 'male' ? 'fatherOf' : p.gender === 'female' ? 'motherOf' : 'parentOf', { names: list });
  }
  function genderOf(id) { const p = person(id); return p ? p.gender : 'unknown'; }
  function localized(v) { if (!v) return ''; if (typeof v === 'string') return v; return v[state.lang] || v.es || v.en || ''; }
  function initials(p) {
    if (!p.name) return '?';
    return p.name.split(/\s+/).filter(function (w) { return w && w[0] === w[0].toUpperCase(); }).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function lifespan(p) {
    if (p.born && p.died) return p.born + ' – ' + p.died;
    if (p.born) return (state.lang === 'es' ? 'n. ' : 'b. ') + p.born;
    if (p.died) return '† ' + p.died;
    return '';
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function isPhone() { return window.matchMedia('(max-width: 760px)').matches; }
  function pickLanguage() {
    const h = hashParams.get('lang');
    if (h === 'es' || h === 'en') return h;
    try { const saved = localStorage.getItem('tree-lang'); if (saved === 'es' || saved === 'en') return saved; } catch (e) { /* ignore */ }
    return SETTINGS.defaultLanguage === 'en' ? 'en' : 'es';
  }
  function componentOf(id) {                               // everyone linked to id by any chain of family links
    const seen = new Set([id]), queue = [id];
    while (queue.length) {
      const cur = queue.shift();
      fam.parentLinks.get(cur).map(function (l) { return l.id; }).concat(fam.children.get(cur), Array.from(fam.partners.get(cur)))
        .forEach(function (n) { if (!seen.has(n)) { seen.add(n); queue.push(n); } });
    }
    return seen;
  }
  function decorate(rel) {                                 // child names for "Madre de Oscar" style labels
    if (rel.type === 'coparent') rel.childNames = rel.children.map(function (c) { return person(c).name ? person(c).name.split(' ')[0] : tr('nameUnknown'); });
    return rel;
  }
  function lineName(key) { return FamilyLines.label(state.lang, key, state.lines); }
  function relTerm(id) {                                   // "Tía", or "Viendo como" for the focus person
    return I18N.relationTerm(state.lang, state.relations.get(id), genderOf(id));
  }
  function lighten(hex, amount) {                          // mix a colour with white
    const c = new THREE.Color(hex);
    return c.lerp(new THREE.Color('#ffffff'), amount);
  }

  /* ===================================================================
     4. ARRANGE EVERYONE: generations as rings around a cylinder
     The dagre library lays the family out flat (as in the tree); that
     flat picture is then wrapped around a cylinder.
     =================================================================== */
  const pos3 = new Map();                                  // person -> {x, y, z, angle}
  let RADIUS = 10, HEIGHT = 10, ROWS = [];

  function sideBySide(id) { const s = new Set(fam.partners.get(id)); fam.coparents.get(id).forEach(function (q) { s.add(q); }); return s; }
  function layoutFamily() {
    const groupOf = new Map(), groups = [];                // households: couples and parents of the same children together
    people.forEach(function (p) {
      if (groupOf.has(p.id)) return;
      const members = [], stack = [p.id];
      groupOf.set(p.id, groups.length);
      while (stack.length) {
        const cur = stack.pop();
        members.push(cur);
        sideBySide(cur).forEach(function (q) { if (!groupOf.has(q)) { groupOf.set(q, groups.length); stack.push(q); } });
      }
      if (members.length > 2) {                            // the person with most partners in the middle
        members.sort(function (a, b) { return sideBySide(b).size - sideBySide(a).size; });
        const hub = members.shift(), row = [hub];
        members.forEach(function (m, i) { if (i % 2) row.unshift(m); else row.push(m); });
        groups.push({ key: 'h' + groups.length, members: row });
      } else {
        groups.push({ key: 'h' + groups.length, members: members.sort(function (a, b) { return a - b; }) });
      }
    });
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 100, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(function () { return {}; });
    groups.forEach(function (grp) { g.setNode(grp.key, { width: grp.members.length * 100, height: 40 }); });
    const weights = new Map();
    people.forEach(function (p) {
      fam.parentLinks.get(p.id).forEach(function (l) {
        const from = groups[groupOf.get(l.id)].key, to = groups[groupOf.get(p.id)].key;
        if (from === to) return;
        weights.set(from + '>' + to, (weights.get(from + '>' + to) || 0) + 1);
      });
    });
    weights.forEach(function (w, k) { const ab = k.split('>'); g.setEdge(ab[0], ab[1], { weight: w, minlen: 1 }); });
    dagre.layout(g);

    const flat = new Map();                                // person -> {x, y} in the flat picture
    groups.forEach(function (grp) {
      const n = g.node(grp.key);
      grp.members.forEach(function (id, i) { flat.set(id, { x: n.x - n.width / 2 + i * 100 + 50, y: n.y }); });
    });
    ROWS = Array.from(new Set(Array.from(flat.values(), function (f) { return f.y; }))).sort(function (a, b) { return a - b; });
    let minX = Infinity, maxX = -Infinity;
    flat.forEach(function (f) { minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x); });
    const circumference = (maxX - minX + 100) * 1.1;       // a small gap where the two ends of the picture meet
    RADIUS = Math.max(7, circumference / 100 * SPACING / (2 * Math.PI));
    HEIGHT = (ROWS.length - 1) * ROW_H;
    flat.forEach(function (f, id) {
      const angle = (f.x - minX + 50) / circumference * Math.PI * 2;
      const y = HEIGHT / 2 - ROWS.indexOf(f.y) * ROW_H;   // oldest generation at the top
      pos3.set(id, { x: RADIUS * Math.sin(angle), y: y, z: RADIUS * Math.cos(angle), angle: angle });
    });
  }

  function arcPoints(a, b, steps, drop) {                  // a curve that follows the cylinder from a to b
    let da = b.angle - a.angle;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ang = a.angle + da * t;
      const r = RADIUS + Math.sin(Math.PI * t) * 0.35;    // bulge slightly outwards so lines don't cut through stars
      const y = a.y + (b.y - a.y) * t - (drop || 0) * Math.sin(Math.PI * t);
      pts.push(new THREE.Vector3(r * Math.sin(ang), y, r * Math.cos(ang)));
    }
    return pts;
  }
  function midPoint(a, b, down) {                          // where a couple's lines meet, a little below them
    let da = b.angle - a.angle;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    const ang = a.angle + da / 2;
    return { angle: ang, y: Math.min(a.y, b.y) - down, x: RADIUS * Math.sin(ang), z: RADIUS * Math.cos(ang) };
  }

  /* ===================================================================
     5. THE 3D SCENE
     =================================================================== */
  let renderer, scene, camera, controls, raycaster;
  const stars = new Map();                                 // person -> {core, halo, hit, label, phase}
  const links = [];                                        // {line, colorOf: () => person id}
  let focusRing, selectRing, pathGroup = null, spark = null, pathCurve = null, sky = null;
  const pointer = new THREE.Vector2(-9, -9);
  let needPick = false;

  function makeGlowTexture() {                             // soft round glow used behind every star
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.18)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function labelCanvas(id) {                               // name (up to two lines) and relationship, drawn on a canvas
    const S = 2;                                           // drawn at double size so text stays sharp
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const nameFont = '600 ' + (15 * S) + 'px "Source Sans 3", system-ui, sans-serif';
    const relFont = '700 ' + (10.5 * S) + 'px "Source Sans 3", system-ui, sans-serif';
    const maxW = 150 * S;
    g.font = nameFont;
    const words = nameOf(id).split(/\s+/), lines = [];
    let cur = '';
    words.forEach(function (w) {
      const test = cur ? cur + ' ' + w : w;
      if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    });
    if (cur) lines.push(cur);
    if (lines.length > 2) { lines[1] = lines.slice(1).join(' '); lines.length = 2; }
    while (lines.length === 2 && g.measureText(lines[1]).width > maxW && lines[1].length > 2) lines[1] = lines[1].slice(0, -2) + '…';
    const rel = id === state.focus ? '★ ' + relTerm(id) : relTerm(id);
    g.font = relFont;
    const relW = g.measureText(rel.toUpperCase()).width + rel.length * 1.2 * S;
    g.font = nameFont;
    const w = Math.ceil(Math.max(relW, Math.max.apply(null, lines.map(function (l) { return g.measureText(l).width; })))) + 16 * S;
    const h = (lines.length * 18 + 22) * S;
    c.width = w; c.height = h;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.shadowColor = 'rgba(0,0,0,0.85)';
    g.shadowBlur = 6 * S;
    g.font = relFont;
    g.fillStyle = '#' + lighten(state.lines.colorOf(id), 0.45).getHexString();
    if ('letterSpacing' in g) g.letterSpacing = (1.2 * S) + 'px';
    g.fillText(rel.toUpperCase(), w / 2, 3 * S);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.font = nameFont;
    g.fillStyle = person(id).name ? '#f3efe7' : '#a9b0c2';
    lines.forEach(function (l, i) { g.fillText(l, w / 2, (19 + i * 18) * S); });
    return { canvas: c, w: w / S, h: h / S };
  }
  function setLabel(id) {                                  // (re)draw one star's label
    const st = stars.get(id);
    const lc = labelCanvas(id);
    if (st.label.material.map) st.label.material.map.dispose();
    const tex = new THREE.CanvasTexture(lc.canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    st.label.material.map = tex;
    st.label.material.needsUpdate = true;
    const k = 0.025;                                       // 3D units per pixel of label
    st.labelW = lc.w * k; st.labelH = lc.h * k;            // full size; shrunk a little when the camera comes close
    st.label.scale.set(st.labelW, st.labelH, 1);
  }

  function buildScene() {
    const canvasHost = $('#c3-canvas');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
    canvasHost.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    camera = new THREE.PerspectiveCamera(50, canvasHost.clientWidth / canvasHost.clientHeight, 0.1, 2000);
    scene.fog = new THREE.Fog(BG, RADIUS + 18, RADIUS * 3.2 + 60); // far stars fade into the night
    raycaster = new THREE.Raycaster();

    // ---- Background stars ----
    const n = 1400, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 260 + Math.random() * 260, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th); arr[i * 3 + 1] = r * Math.cos(ph); arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    sky = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#c9d3ff', size: 1.3, sizeAttenuation: true, transparent: true, opacity: 0.75, fog: false }));
    scene.add(sky);

    // ---- One faint ring per generation ----
    ROWS.forEach(function (_, i) {
      const y = HEIGHT / 2 - i * ROW_H, pts = [];
      for (let k = 0; k <= 160; k++) { const a = k / 160 * Math.PI * 2; pts.push(new THREE.Vector3((RADIUS - 0.05) * Math.sin(a), y, (RADIUS - 0.05) * Math.cos(a))); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#8ea0d6', transparent: true, opacity: 0.07 })));
    });

    // ---- Lines between relatives ----
    fam.unions.forEach(function (u) {
      if (u.parents.length === 2) {
        const a = pos3.get(u.parents[0]), b = pos3.get(u.parents[1]);
        if (!u.children.length) {                          // couple without children: faint dashed arc between them
          addLink(arcPoints(a, b, 18, 0.25), function () { return u.parents[0]; }, true);
          return;
        }
        const m = midPoint(a, b, 0.9);
        u.parents.forEach(function (pid) { addLink(arcPoints(pos3.get(pid), m, 14, 0), function () { return pid; }, !fam.partners.get(u.parents[0]).has(u.parents[1])); });
        u.children.forEach(function (cid) { addLink(arcPoints(m, pos3.get(cid), 18, 0), function () { return cid; }); });
      } else {
        u.children.forEach(function (cid) { addLink(arcPoints(pos3.get(u.parents[0]), pos3.get(cid), 18, 0), function () { return cid; }); });
      }
    });

    // ---- Stars ----
    const glow = makeGlowTexture();
    const coreGeo = new THREE.SphereGeometry(STAR_R, 20, 14);
    const hitGeo = new THREE.SphereGeometry(STAR_R * 2.6, 8, 6);
    people.forEach(function (p) {
      const at = pos3.get(p.id);
      const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      core.position.set(at.x, at.y, at.z);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
      halo.position.copy(core.position);
      halo.scale.set(2.3, 2.3, 1);
      const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(core.position);
      hit.userData.id = p.id;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      label.center.set(0.5, 1);                            // hangs just below the star
      label.position.set(at.x * 1.02, at.y - STAR_R - 0.35, at.z * 1.02);
      scene.add(halo, core, hit, label);
      stars.set(p.id, { core: core, halo: halo, hit: hit, label: label, phase: Math.random() * Math.PI * 2 });
    });

    // ---- Rings marking the focus person and the chosen star ----
    focusRing = new THREE.Mesh(new THREE.RingGeometry(STAR_R * 1.9, STAR_R * 2.25, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    selectRing = new THREE.Mesh(new THREE.RingGeometry(STAR_R * 2.5, STAR_R * 2.75, 48), new THREE.MeshBasicMaterial({ color: PATH_COLOR, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    selectRing.visible = false;
    scene.add(focusRing, selectRing);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.55;
    controls.minDistance = 3;
    controls.maxDistance = RADIUS * 4 + 80;
    controls.autoRotateSpeed = SPIN_SPEED;
    controls.addEventListener('start', function () { $('#c3-hint').classList.add('faded'); });
  }

  function addLink(points, idFn, dashed) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    let length = 0;                                        // very long lines (relatives far apart) are drawn fainter
    for (let i = 1; i < points.length; i++) length += points[i].distanceTo(points[i - 1]);
    const opacity = length > SPACING * 8 ? 0.2 : length > SPACING * 4 ? 0.36 : 0.55;
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color: '#ffffff', transparent: true, opacity: opacity * 0.8, dashSize: 0.25, gapSize: 0.22 })
      : new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: opacity });
    const line = new THREE.Line(geo, mat);
    if (dashed) line.computeLineDistances();
    scene.add(line);
    links.push({ line: line, idFn: idFn });
  }

  /* ===================================================================
     6. COLOURS AND LABELS FROM THE FOCUS PERSON'S POINT OF VIEW
     =================================================================== */
  function computeRelations() {
    const comp = componentOf(state.focus);
    people.forEach(function (p) {
      const rel = decorate(Kinship.relation(fam, state.focus, p.id));
      if (rel.type === 'none') rel.connected = comp.has(p.id);
      state.relations.set(p.id, rel);
    });
    state.lines = FamilyLines.compute(fam, state.focus, function (pid) { return state.relations.get(pid); });
  }
  function paint() {                                       // colour every star and line, redraw labels
    stars.forEach(function (st, id) {
      const c = state.lines.colorOf(id);
      st.core.material.color.copy(lighten(c, 0.35));
      st.halo.material.color.set(c);
      const scale = id === state.focus ? 1.45 : 1;
      st.core.scale.setScalar(scale);
      st.baseHalo = 2.3 * scale;
      setLabel(id);
    });
    links.forEach(function (l) { l.line.material.color.copy(lighten(state.lines.colorOf(l.idFn()), 0.15)); });
    const f = pos3.get(state.focus);
    focusRing.position.set(f.x, f.y, f.z);
  }

  /* ===================================================================
     7. CAMERA: starting view, flying to a star
     =================================================================== */
  let flight = null;                                       // camera move in progress
  function viewFor(id, close) {                            // camera position and target to look at a person
    const at = pos3.get(id);
    const tanV = Math.tan(camera.fov * Math.PI / 360);     // half the vertical field of view
    const tanH = tanV * camera.aspect;                     // half the horizontal field of view
    const portrait = camera.aspect < 0.9;                  // phones held upright
    const fitH = (Math.min(HEIGHT, portrait ? ROW_H * 3.2 : HEIGHT) + ROW_H * 1.5) / 2 / tanV; // shows the generations
    const fitW = Math.min(RADIUS * 1.5, Math.max(14, Math.min(48, camera.aspect * 30))) / 2 / tanH; // and part of the ring
    const dist = close ? 19 : Math.max(fitH, fitW, 16);     // (measured from the front of the ring)
    let ty, lift;                                          // height the camera looks at, and how far above it sits
    if (close) {
      ty = at.y - (isPhone() ? 2 * dist * tanV * 0.27 : 0); // phones: keep the star above the card at the bottom
      lift = 1.5;
    } else if (portrait) {
      ty = at.y + ROW_H * 0.7; lift = ROW_H * 0.9;
    } else {
      ty = -ROW_H * 0.3; lift = HEIGHT * 0.18;
    }
    return {
      pos: new THREE.Vector3(Math.sin(at.angle) * (RADIUS + dist), ty + lift, Math.cos(at.angle) * (RADIUS + dist)),
      target: new THREE.Vector3(0, ty, 0),
    };
  }
  function flyTo(view, ms) {
    if (reduceMotion || !ms) {
      camera.position.copy(view.pos); controls.target.copy(view.target); controls.update(); flight = null;
      return;
    }
    flight = { p0: camera.position.clone(), t0: controls.target.clone(), p1: view.pos, t1: view.target, start: performance.now(), ms: ms };
  }
  function resetView() { flyTo(viewFor(state.focus, false), 1100); }

  /* ===================================================================
     8. POINTING AND CHOOSING STARS
     =================================================================== */
  const hitList = [];
  function pick() {                                        // the star under the pointer, or null
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitList, false)[0];
    return hit ? hit.object.userData.id : null;
  }
  function onPointerMove(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    lastPointer = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'mouse') needPick = true;
  }
  let lastPointer = null, downAt = null;
  function updateHover() {
    const id = pick();
    if (id === state.hovered) { placeTip(); return; }
    state.hovered = id;
    renderer.domElement.style.cursor = id != null ? 'pointer' : 'grab';
    const tip = $('#c3-tip');
    if (id == null) { tip.hidden = true; return; }
    tip.innerHTML = '<b>' + esc(nameOf(id)) + '</b><span>' + esc(id === state.focus ? tr('viewingAs') : I18N.cardLabel(state.lang, state.relations.get(id), genderOf(id))) + '</span>' +
      '<span class="c3-tip-line"><i style="background:' + state.lines.colorOf(id) + '"></i>' + esc(lineName(state.lines.keyOf(id))) + '</span>';
    tip.hidden = false;
    placeTip();
  }
  function placeTip() {
    const tip = $('#c3-tip');
    if (tip.hidden || !lastPointer) return;
    let x = lastPointer.x + 16, y = lastPointer.y + 16;
    if (x + tip.offsetWidth > window.innerWidth - 8) x = lastPointer.x - tip.offsetWidth - 16;
    if (y + tip.offsetHeight > window.innerHeight - 8) y = lastPointer.y - tip.offsetHeight - 16;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }

  function select(id, fly) {                               // open a star's card, draw its path to the focus person
    state.selected = id;
    if (id == null) {
      $('#c3-card').hidden = true;
      selectRing.visible = false;
      clearPath();
      return;
    }
    setSpin(false);
    const at = pos3.get(id);
    selectRing.position.set(at.x, at.y, at.z);
    selectRing.visible = id !== state.focus;
    drawPath(state.focus, id);
    renderCard();
    if (fly !== false) flyTo(viewFor(id, true), 1100);
  }

  function clearPath() {
    if (!pathGroup) return;
    scene.remove(pathGroup);
    pathGroup.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pathGroup = null; spark = null; pathCurve = null;
  }
  function drawPath(a, b) {                                // gold tube along the chain of relatives from a to b
    clearPath();
    if (a === b) return;
    const path = Kinship.connectionPath(fam, a, b);
    if (!path) return;
    let pts = [];
    for (let i = 1; i < path.nodes.length; i++) {
      const seg = arcPoints(pos3.get(path.nodes[i - 1]), pos3.get(path.nodes[i]), 16, 0);
      pts = pts.concat(i === 1 ? seg : seg.slice(1));
    }
    pathCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    pathGroup = new THREE.Group();
    pathGroup.add(new THREE.Mesh(new THREE.TubeGeometry(pathCurve, Math.max(24, pts.length * 2), 0.07, 6, false),
      new THREE.MeshBasicMaterial({ color: PATH_COLOR, transparent: true, opacity: 0.95, fog: false })));
    spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: stars.values().next().value.halo.material.map, color: PATH_COLOR, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    spark.scale.set(1.6, 1.6, 1);
    spark.position.copy(pathCurve.getPointAt(0));
    pathGroup.add(spark);
    path.nodes.forEach(function (n) { const at = pos3.get(n); const dot = new THREE.Mesh(new THREE.SphereGeometry(STAR_R * 0.55, 10, 8), new THREE.MeshBasicMaterial({ color: PATH_COLOR, fog: false })); dot.position.set(at.x, at.y, at.z); pathGroup.add(dot); });
    scene.add(pathGroup);
  }

  /* ===================================================================
     9. THE CARD, LEGEND, SEARCH AND BUTTONS (plain HTML around the 3D)
     =================================================================== */
  function treeLink(open) {                                // link back to the tree, same person and language
    const params = new URLSearchParams();
    if (state.focus !== defaultFocus) params.set('focus', state.focus);
    if (open != null) params.set('open', open);
    params.set('lang', state.lang);
    return 'index.html#' + params.toString();
  }
  function renderCard() {
    const id = state.selected;
    if (id == null) return;
    const p = person(id), rel = state.relations.get(id);
    const isFocus = id === state.focus;
    const color = state.lines.colorOf(id);
    const k = state.lines.keyOf(id), sub = FamilyLines.sublabel(state.lang, k, state.lines);
    const photo = p.photo ? '<img src="' + esc(p.photo) + '" alt="" onerror="this.remove()">' : '';
    let h = '<button type="button" class="c3-close" data-act="close" aria-label="' + esc(tr('close')) + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>' +
      '<div class="c3-card-head"><span class="c3-avatar" style="background:' + color + '">' + esc(initials(p)) + photo + '</span><div>' +
      '<p class="c3-num">' + esc(tr('personNumber', { n: id })) + '</p><h2 class="' + (p.name ? '' : 'unknown') + '">' + esc(nameOf(id)) + '</h2>' +
      (lifespan(p) ? '<p class="c3-life">' + esc(lifespan(p)) + '</p>' : '') + '</div></div>';
    h += isFocus
      ? '<p class="c3-rel"><span>' + esc(tr('viewingAs')) + '</span><strong>' + esc(nameOf(id)) + '</strong></p>'
      : '<p class="c3-rel"><span>' + esc(tr('relationTo', { name: nameOf(state.focus) })) + '</span><strong>' + esc(I18N.cardLabel(state.lang, rel, p.gender)) + '</strong></p>';
    h += '<p class="c3-line"><i style="background:' + color + '"></i>' + esc(lineName(k)) + (sub && k !== 'direct' ? ' <small>· ' + esc(sub) + '</small>' : '') + '</p>';
    const desc = localized(p.description);
    if (desc) h += '<p class="c3-desc">' + esc(desc) + '</p>';
    if (!isFocus && pathGroup) h += '<p class="c3-note">' + esc(tr('c3Path', { name: givenName(nameOf(state.focus)) })) + '</p>';
    h += '<div class="c3-actions">' +
      (isFocus ? '' : '<button type="button" class="c3-btn primary" data-act="focus">' + esc(tr('viewTreeAs')) + '</button>') +
      '<a class="c3-btn" href="' + esc(treeLink(id)) + '">' + esc(tr('c3OpenTree')) + '</a></div>';
    $('#c3-card').innerHTML = h;
    $('#c3-card').hidden = false;
  }
  $('#c3-card').addEventListener('click', function (e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'close') select(null);
    if (b.dataset.act === 'focus') setFocus(state.selected);
  });

  function renderLegend() {
    const shownKeys = ['direct'].concat(state.lines.lines.map(function (l) { return l.key; }), ['marriage', 'none'])
      .filter(function (k) { return k === 'direct' || state.lines.counts[k] > 0; });
    $('#c3-legend-title').textContent = tr('c3Legend', { name: givenName(nameOf(state.focus)) });
    $('#c3-legend-list').innerHTML = shownKeys.map(function (k) {
      const sub = FamilyLines.sublabel(state.lang, k, state.lines);
      return '<li><i style="background:' + state.lines.colorOfKey(k) + '"></i><span>' + esc(lineName(k)) +
        (sub ? ' <small>' + esc(sub) + '</small>' : '') + ' <em>' + state.lines.counts[k] + '</em></span></li>';
    }).join('');
  }
  function renderTop() {                                   // "Viendo como …" and the back link
    $('#c3-focus').innerHTML = esc(tr('viewingAs')) + ' <strong>' + esc(nameOf(state.focus)) + '</strong>';
    $('#c3-back').href = treeLink(null);
  }

  function setFocus(id) {                                  // look at the family from another person's point of view
    if (!fam.byId.has(id)) return;
    state.focus = id;
    computeRelations();
    paint();
    renderLegend();
    renderTop();
    writeHash();
    select(id, false);                                     // their card stays open, now as the focus person
  }
  function writeHash() {
    const params = new URLSearchParams();
    if (state.focus !== defaultFocus) params.set('focus', state.focus);
    if (state.lang !== (SETTINGS.defaultLanguage === 'en' ? 'en' : 'es')) params.set('lang', state.lang);
    const s = params.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
  }

  function setSpin(on) {
    state.spinning = on;
    if (controls) controls.autoRotate = on;
    const b = $('#c3-spin');
    b.setAttribute('aria-pressed', String(on));
    b.title = tr(on ? 'c3Pause' : 'c3Rotate');
    b.setAttribute('aria-label', b.title);
    b.querySelector('.ic-play').style.display = on ? 'none' : '';
    b.querySelector('.ic-pause').style.display = on ? '' : 'none';
  }

  // ---- Search ----
  const searchInput = $('#c3-search-input'), resultsEl = $('#c3-results');
  function renderResults() {
    const q = norm(searchInput.value).replace(/^#/, '');
    if (!q) { resultsEl.hidden = true; return; }
    let found;
    if (/^\d+$/.test(q)) found = person(Number(q)) ? [person(Number(q))] : [];
    else {
      const words = q.split(/\s+/);
      found = people.filter(function (p) { const n = norm(nameOf(p.id) + ' ' + localized(p.nickname)); return words.every(function (w) { return n.indexOf(w) !== -1; }); })
        .sort(function (a, b) {                            // names that start with the first word come first
          const sa = norm(nameOf(a.id)).indexOf(words[0]) === 0 ? 0 : 1, sb = norm(nameOf(b.id)).indexOf(words[0]) === 0 ? 0 : 1;
          return sa - sb || nameOf(a.id).localeCompare(nameOf(b.id));
        }).slice(0, 8);
    }
    resultsEl.innerHTML = found.length ? found.map(function (p) {
      return '<li><button type="button" data-id="' + p.id + '"><i style="background:' + state.lines.colorOf(p.id) + '"></i><span><b>' + esc(nameOf(p.id)) + '</b><small>#' + p.id + ' · ' +
        esc(I18N.cardLabel(state.lang, state.relations.get(p.id), p.gender)) + '</small></span></button></li>';
    }).join('') : '<li class="c3-empty">' + esc(tr('noResults')) + '</li>';
    resultsEl.hidden = false;
  }
  searchInput.addEventListener('input', renderResults);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { const first = resultsEl.querySelector('button'); if (first) first.click(); }
    if (e.key === 'Escape') { resultsEl.hidden = true; searchInput.blur(); }
  });
  resultsEl.addEventListener('mousedown', function (e) { e.preventDefault(); });
  resultsEl.addEventListener('click', function (e) {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    resultsEl.hidden = true; searchInput.value = ''; searchInput.blur();
    select(Number(b.dataset.id));
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.c3-search')) resultsEl.hidden = true; });

  // ---- Language ----
  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.title = tr('c3Title') + ' · ' + ((SETTINGS.title && (SETTINGS.title[state.lang] || SETTINGS.title.es)) || '');
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = tr(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.placeholder = tr(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = tr(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
    document.querySelectorAll('.lang-toggle button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)); });
  }
  document.querySelectorAll('.lang-toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.lang = b.dataset.lang;
      try { localStorage.setItem('tree-lang', state.lang); } catch (e) { /* ignore */ }
      applyLanguage();
      if (!scene) return;
      people.forEach(function (p) { decorate(state.relations.get(p.id)); });
      paint(); renderLegend(); renderTop(); writeHash(); setSpin(state.spinning);
      if (state.selected != null) renderCard();
    });
  });

  /* ===================================================================
     10. ANIMATION LOOP
     =================================================================== */
  const camXZ = new THREE.Vector2();
  function frame(now) {
    requestAnimationFrame(frame);
    const t = now / 1000;
    if (flight) {                                          // smooth camera move
      const k = Math.min(1, (now - flight.start) / flight.ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(flight.p0, flight.p1, e);
      controls.target.lerpVectors(flight.t0, flight.t1, e);
      if (k >= 1) flight = null;
    }
    controls.update();
    camXZ.set(camera.position.x, camera.position.z).normalize();
    stars.forEach(function (st, id) {                      // fade labels on the far side; gentle twinkle
      const at = pos3.get(id);
      const facing = (at.x * camXZ.x + at.z * camXZ.y) / RADIUS; // 1 = facing the camera, -1 = far side
      const dist = camera.position.distanceTo(st.core.position);
      let o = Math.max(0, Math.min(1, (facing + 0.15) / 0.5));
      o *= Math.max(0, Math.min(1, (RADIUS * 2.6 + 46 - dist) / 18));
      if (id === state.selected || id === state.hovered || id === state.focus) o = Math.max(o, 0.95);
      st.label.material.opacity = o;
      st.label.visible = o > 0.02;
      const shrink = Math.max(0.42, Math.min(1, dist / 30)); // close up, names stay a comfortable size
      st.label.scale.set(st.labelW * shrink, st.labelH * shrink, 1);
      const tw = reduceMotion ? 1 : 1 + 0.1 * Math.sin(t * 1.6 + st.phase);
      const hov = id === state.hovered ? 1.35 : 1;
      st.halo.scale.setScalar(st.baseHalo * tw * hov);
    });
    focusRing.quaternion.copy(camera.quaternion);
    selectRing.quaternion.copy(camera.quaternion);
    if (selectRing.visible && !reduceMotion) selectRing.scale.setScalar(1 + 0.08 * Math.sin(t * 3));
    if (spark && pathCurve && !reduceMotion) spark.position.copy(pathCurve.getPointAt((t * 0.22) % 1));
    if (sky && !reduceMotion) sky.rotation.y = t * 0.004;
    if (needPick) { needPick = false; updateHover(); }
    renderer.render(scene, camera);
  }

  /* ===================================================================
     11. START
     =================================================================== */
  function start() {
    applyLanguage();
    if (!people.length) return;
    try {
      layoutFamily();
      buildScene();
    } catch (err) {                                        // no WebGL (very old browser or graphics turned off)
      if (window.console) console.error(err);
      $('#c3-fallback').hidden = false;
      return;
    }
    stars.forEach(function (st) { hitList.push(st.hit); });
    computeRelations();
    paint();
    renderLegend();
    renderTop();
    setSpin(state.spinning);
    flyTo(viewFor(state.focus, false), 0);

    const el = renderer.domElement;
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerdown', function (e) { downAt = { x: e.clientX, y: e.clientY }; onPointerMove(e); });
    el.addEventListener('pointerup', function (e) {        // a tap or click (not a drag) chooses a star
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
      onPointerMove(e);
      const id = pick();
      if (id != null) select(id); else if (state.selected != null) select(null);
    });
    el.addEventListener('pointerleave', function () { pointer.set(-9, -9); needPick = true; });
    $('#c3-spin').addEventListener('click', function () { setSpin(!state.spinning); });
    $('#c3-reset').addEventListener('click', function () { select(null); resetView(); });
    window.addEventListener('resize', function () {
      const host = $('#c3-canvas');
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.selected != null && document.activeElement !== searchInput) select(null);
      if (e.key === '/' && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
    });
    if (window.innerWidth > 760) $('#c3-legend').open = true;
    requestAnimationFrame(frame);
  }
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('600 15px "Source Sans 3"'), document.fonts.load('700 11px "Source Sans 3"')])
    : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2000); })]).catch(function () {}).then(start);
})();
