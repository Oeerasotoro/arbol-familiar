/* =====================================================================
   I18N.JS — every word the website shows, in Spanish and English
   ---------------------------------------------------------------------
   To change a button label or message, edit the text in UI below.
   The relationship names (tío, prima segunda, half-brother...) are
   built by the functions further down from the numbers produced by
   js/kinship.js.
   ===================================================================== */

(function (root) {
  'use strict';

  /* ---------------------------------------------------------------
     UI — fixed texts. {name} or {n} are filled in by the program.
     --------------------------------------------------------------- */
  const UI = {
    es: {
      subtitle: 'Árbol familiar interactivo',
      searchPlaceholder: 'Buscar por nombre…',
      searchLabel: 'Buscar a una persona por su nombre',
      noResults: 'No encontramos a nadie con ese nombre',
      viewAs: 'Ver como',
      viewAsTitle: 'Centrar el árbol en esta persona y mostrar cómo se relacionan todos con ella',
      compare: 'Comparar',
      compareTitle: 'Comparar dos personas',
      compareIntro: 'Elige a dos personas para ver cómo están emparentadas.',
      viewingAs: 'Viendo el árbol como',
      backTo: 'Volver a {name}',
      nameUnknown: 'Nombre desconocido',
      personNumber: 'Persona n.º {n}',
      relationTo: 'Relación con {name}',
      born: 'Nacimiento',
      died: 'Fallecimiento',
      birthplace: 'Lugar de nacimiento',
      biography: 'Biografía',
      family: 'Familia',
      parents: 'Padres',
      partners: 'Pareja',
      siblings: 'Hermanos',
      children: 'Hijos',
      fatherUnknown: 'Padre aún no registrado',
      motherUnknown: 'Madre aún no registrada',
      viewTreeAs: 'Ver el árbol como esta persona',
      compareWith: 'Comparar con…',
      close: 'Cerrar',
      choosePerson: 'Busca a una persona…',
      change: 'Cambiar',
      swap: 'Intercambiar',
      degree: 'Grado de parentesco',
      civilNote: 'Cómputo civil, como en la ley colombiana.',
      sharedAncestors: 'Ancestros en común',
      dna: 'ADN compartido esperado',
      dnaNote: 'Es un promedio; la cantidad real varía entre parientes.',
      howConnect: 'Cómo se conectan',
      showOnTree: 'Ver en el árbol',
      clear: 'Quitar',
      keepFocus: 'El árbol sigue mostrando los parentescos desde {name}.',
      legend: 'Leyenda',
      legendConfirmed: 'Vínculo confirmado',
      legendUnconfirmed: 'Vínculo sin confirmar',
      legendLine: 'Línea directa de la persona central',
      legendPath: 'Camino entre las personas comparadas',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      fit: 'Ver todo el árbol',
      center: 'Centrar en la persona central',
      comparing: 'Comparando',
      open: 'Abrir',
      samePerson: 'Es la misma persona.',
      partnersNoDegree: 'Entre una pareja no hay grado de consanguinidad.',
      coparentsNoDegree: 'No tienen parentesco entre sí; tienen hijos en común.',
      legendCouple: 'Pareja',
      legendCoparents: 'Padres que no son pareja',
      withParent: 'con {name}',
      noDetails: 'Todavía no hay descripción ni biografía.',
      unconfirmed: 'sin confirmar',
      photoOf: 'Foto de {name}',
      language: 'Idioma',
      dataProblems: 'Hay que revisar family-data.js:',
      problem_noId: 'una persona sin número (bloque {index}, “{name}”).',
      problem_duplicateId: 'el número #{id} se usa dos veces.',
      problem_missingParent: 'la persona #{id} tiene como {role} el número #{parent}, que no existe.',
      problem_selfParent: 'la persona #{id} aparece como su propio padre o madre.',
      problem_genderRole: 'la persona #{id} tiene como {role} a #{parent}, cuyo género no coincide.',
      problem_missingPartner: 'la persona #{id} tiene como pareja a #{partner}, que no existe.',
      problem_loop: 'la persona #{id} aparece como su propio antepasado.',
      role_father: 'padre',
      role_mother: 'madre',
      none: 'Ninguno',
    },
    en: {
      subtitle: 'Interactive family tree',
      searchPlaceholder: 'Search by name…',
      searchLabel: 'Search for a person by name',
      noResults: 'No one found with that name',
      viewAs: 'View as',
      viewAsTitle: 'Center the tree on this person and show how everyone relates to them',
      compare: 'Compare',
      compareTitle: 'Compare two people',
      compareIntro: 'Choose two people to see how they are related.',
      viewingAs: 'Viewing the tree as',
      backTo: 'Back to {name}',
      nameUnknown: 'Name unknown',
      personNumber: 'Person #{n}',
      relationTo: 'Relationship to {name}',
      born: 'Born',
      died: 'Died',
      birthplace: 'Birthplace',
      biography: 'Biography',
      family: 'Family',
      parents: 'Parents',
      partners: 'Partner',
      siblings: 'Siblings',
      children: 'Children',
      fatherUnknown: 'Father not recorded yet',
      motherUnknown: 'Mother not recorded yet',
      viewTreeAs: 'View the tree as this person',
      compareWith: 'Compare with…',
      close: 'Close',
      choosePerson: 'Search for a person…',
      change: 'Change',
      swap: 'Swap',
      degree: 'Degree of kinship',
      civilNote: 'Civil-law count, as used in Colombian law.',
      sharedAncestors: 'Shared ancestors',
      dna: 'Expected shared DNA',
      dnaNote: 'This is an average; the real amount varies between relatives.',
      howConnect: 'How they connect',
      showOnTree: 'Show on tree',
      clear: 'Clear',
      keepFocus: 'The tree still shows relationships from {name}’s point of view.',
      legend: 'Legend',
      legendConfirmed: 'Confirmed link',
      legendUnconfirmed: 'Unconfirmed link',
      legendLine: 'Focus person’s direct line',
      legendPath: 'Path between compared people',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      fit: 'Show the whole tree',
      center: 'Center on the focus person',
      comparing: 'Comparing',
      open: 'Open',
      samePerson: 'That is the same person.',
      partnersNoDegree: 'Partners have no degree of blood kinship between them.',
      coparentsNoDegree: 'No kinship between them; they share children.',
      legendCouple: 'Couple',
      legendCoparents: 'Parents who are not a couple',
      withParent: 'with {name}',
      noDetails: 'No description or biography yet.',
      unconfirmed: 'unconfirmed',
      photoOf: 'Photo of {name}',
      language: 'Language',
      dataProblems: 'Please check family-data.js:',
      problem_noId: 'a person has no number (block {index}, “{name}”).',
      problem_duplicateId: 'number #{id} is used twice.',
      problem_missingParent: 'person #{id} lists #{parent} as {role}, but that number does not exist.',
      problem_selfParent: 'person #{id} is listed as their own parent.',
      problem_genderRole: 'person #{id} lists #{parent} as {role}, but the gender does not match.',
      problem_missingPartner: 'person #{id} lists #{partner} as partner, but that number does not exist.',
      problem_loop: 'person #{id} appears as their own ancestor.',
      role_father: 'father',
      role_mother: 'mother',
      none: 'None',
    },
  };

  function t(lang, key, vars) {                        // Look up a text and fill in {placeholders}
    let s = (UI[lang] && UI[lang][key]) || UI.en[key] || key;
    Object.keys(vars || {}).forEach(function (k) {
      s = s.split('{' + k + '}').join(vars[k]);
    });
    return s;
  }

  /* ---------------------------------------------------------------
     Small helpers for building relationship names
     --------------------------------------------------------------- */
  function g(gender) { return gender === 'male' ? 0 : gender === 'female' ? 1 : 2; } // position in [male, female, unknown]
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }             // "Tío" -> "tío"
  function upper(s) { return s.charAt(0).toUpperCase() + s.slice(1); }             // "tío" -> "Tío"
  function map3(t3, fn) { return [fn(t3[0]), fn(t3[1]), fn(t3[2])]; }               // apply a change to all three forms

  const EN_ORD_WORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
  function enOrdWord(n) { return EN_ORD_WORD[n] || (n + 'th'); }                    // 2 -> "Second"
  function enOrdNum(n) {                                                           // 3 -> "3rd"
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  const ES_ORD_M = ['', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];
  const ES_ORD_F = ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];
  const ES_DEGREE = ['', 'primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];

  function enGreats(n, t3) {                                                        // add "Great-" n times
    if (n <= 0) return t3;
    const prefix = n === 1 ? 'Great-' : n === 2 ? 'Great-great-' : enOrdNum(n) + ' great-';
    return map3(t3, function (s) { return prefix + lower(s); });
  }

  /* ---------------------------------------------------------------
     Blood relationship names. dx = generations from the viewer up to
     the shared ancestor, dy = from the other person up.
     Returns [male form, female form, unknown-gender form].
     --------------------------------------------------------------- */
  function enBlood(dx, dy, half) {
    let t3;
    let neutralFromPair = false;                       // build "Aunt or uncle" style when English has no neutral word
    if (dy === 0) {                                    // the other person is an ancestor
      t3 = dx === 1 ? ['Father', 'Mother', 'Parent'] : enGreats(dx - 2, ['Grandfather', 'Grandmother', 'Grandparent']);
    } else if (dx === 0) {                             // the other person is a descendant
      t3 = dy === 1 ? ['Son', 'Daughter', 'Child'] : enGreats(dy - 2, ['Grandson', 'Granddaughter', 'Grandchild']);
    } else if (dx === 1 && dy === 1) {                 // siblings
      t3 = ['Brother', 'Sister', 'Sibling'];
    } else if (dy === 1) {                             // a sibling of an ancestor: uncle, great-uncle...
      t3 = enGreats(dx - 2, ['Uncle', 'Aunt', '']);
      neutralFromPair = true;
    } else if (dx === 1) {                             // a descendant of a sibling: nephew, grandnephew...
      t3 = dy === 2 ? ['Nephew', 'Niece', ''] : enGreats(dy - 3, ['Grandnephew', 'Grandniece', '']);
      neutralFromPair = true;
    } else {                                           // cousins
      const n = Math.min(dx, dy) - 1;                  // first, second, third cousin...
      const removed = Math.abs(dx - dy);               // generations apart
      let s = enOrdWord(n) + ' cousin';
      if (removed === 1) s += ' once removed';
      else if (removed === 2) s += ' twice removed';
      else if (removed > 2) s += ' ' + removed + ' times removed';
      t3 = [s, s, s];
    }
    if (half) t3 = map3(t3, function (s) { return s ? 'Half-' + lower(s) : s; });
    if (neutralFromPair) t3[2] = t3[1] + ' or ' + lower(t3[0]);
    return t3;
  }

  function esBlood(dx, dy, half) {
    let pair;                                          // [masculine, feminine]
    const ASC = [null, ['Padre', 'Madre'], ['Abuelo', 'Abuela'], ['Bisabuelo', 'Bisabuela'], ['Tatarabuelo', 'Tatarabuela'], ['Trastatarabuelo', 'Trastatarabuela']];
    const DESC = [null, ['Hijo', 'Hija'], ['Nieto', 'Nieta'], ['Bisnieto', 'Bisnieta'], ['Tataranieto', 'Tataranieta'], ['Trastataranieto', 'Trastataranieta']];
    const TIO = [['Tío', 'Tía'], ['Tío abuelo', 'Tía abuela'], ['Tío bisabuelo', 'Tía bisabuela'], ['Tío tatarabuelo', 'Tía tatarabuela']];
    const SOB = [['Sobrino', 'Sobrina'], ['Sobrino nieto', 'Sobrina nieta'], ['Sobrino bisnieto', 'Sobrina bisnieta'], ['Sobrino tataranieto', 'Sobrina tataranieta']];
    if (dy === 0) {                                    // ancestor
      pair = ASC[dx] || ['Antepasado (' + dx + ' generaciones)', 'Antepasada (' + dx + ' generaciones)'];
    } else if (dx === 0) {                             // descendant
      pair = DESC[dy] || ['Descendiente (' + dy + ' generaciones)', 'Descendiente (' + dy + ' generaciones)'];
    } else if (dx === 1 && dy === 1) {                 // siblings
      return half ? ['Medio hermano', 'Media hermana'] : ['Hermano', 'Hermana'];
    } else if (dx > dy) {                              // tío line: older generation than the viewer
      const level = dx - dy - 1;                       // 0 tío, 1 tío abuelo, 2 tío bisabuelo...
      pair = (TIO[level] || ['Tío (' + (level + 1) + ' generaciones arriba)', 'Tía (' + (level + 1) + ' generaciones arriba)']).slice();
      if (dy >= 2) pair = [pair[0] + ' ' + ES_ORD_M[dy], pair[1] + ' ' + ES_ORD_F[dy]]; // tío segundo, tía segunda
    } else if (dy > dx) {                              // sobrino line: younger generation
      const level = dy - dx - 1;                       // 0 sobrino, 1 sobrino nieto...
      pair = (SOB[level] || ['Sobrino (' + (level + 1) + ' generaciones abajo)', 'Sobrina (' + (level + 1) + ' generaciones abajo)']).slice();
      if (dx >= 2) pair = [pair[0] + ' ' + ES_ORD_M[dx], pair[1] + ' ' + ES_ORD_F[dx]]; // sobrino segundo
    } else {                                           // same generation: cousins
      const n = dx;                                    // 2 = primo hermano, 3 = primo segundo...
      if (n === 2) pair = half ? ['Primo', 'Prima'] : ['Primo hermano', 'Prima hermana'];
      else pair = ['Primo ' + (ES_ORD_M[n - 1] || (n - 1) + '.º'), 'Prima ' + (ES_ORD_F[n - 1] || (n - 1) + '.ª')];
    }
    if (half && !(dy === 0 || dx === 0)) pair = ['Medio ' + lower(pair[0]), 'Media ' + lower(pair[1])];
    return pair;
  }

  function esTriple(pair) {                            // add the "unknown gender" form: "Tío o tía"
    return [pair[0], pair[1], pair[0] + ' o ' + lower(pair[1])];
  }

  /* ---------------------------------------------------------------
     relationTerm(lang, rel, gender)
     The short name used on the cards, e.g. "Tía" or "First cousin".
     rel comes from Kinship.relation(); gender is the other person's.
     --------------------------------------------------------------- */
  function relationTerm(lang, rel, gender) {
    const i = g(gender);
    if (rel.type === 'self') return lang === 'es' ? 'Viendo como' : 'Viewing as';
    if (rel.type === 'partner') return lang === 'es' ? 'Pareja' : 'Partner';
    if (rel.type === 'coparent') {                     // share a child but are not a couple: "Madre de Oscar"
      const kids = rel.childNames || [];
      if (lang === 'es') {
        const base = esTriple(['Padre', 'Madre'])[i];
        return kids.length === 1 ? base + ' de ' + kids[0] : base + ' de sus hijos';
      }
      const baseEn = ['Father', 'Mother', 'Parent'][i];
      return kids.length === 1 ? kids[0] + '’s ' + lower(baseEn) : baseEn + ' of their children';
    }
    if (rel.type === 'none') return rel.connected
      ? (lang === 'es' ? 'Familia extendida' : 'Extended family')
      : (lang === 'es' ? 'Sin conexión registrada' : 'Not connected');
    if (rel.type === 'blood') {
      const half = rel.kind === 'half';
      return lang === 'es' ? esTriple(esBlood(rel.dx, rel.dy, half))[i] : enBlood(rel.dx, rel.dy, half)[i];
    }
    // ---- related through a couple (in-laws, step-relatives) ----
    const b = rel.blood;                               // the blood link between the viewer side and the couple
    const lineDown = b.dx === 0;                       // the blood relative is a descendant
    const lineUp = b.dy === 0;                         // the blood relative is an ancestor
    if (lang === 'es') {
      if (b.dx === 1 && b.dy === 1) return esTriple(['Cuñado', 'Cuñada'])[i];
      if (rel.side === 'partnerRelative') {            // the other person is a relative of the viewer's partner
        if (b.dx === 1 && b.dy === 0) return esTriple(['Suegro', 'Suegra'])[i];
        if (b.dx === 0 && b.dy === 1) return esTriple(['Hijastro', 'Hijastra'])[i];
      } else {                                         // the other person is the partner of the viewer's relative
        if (b.dx === 0 && b.dy === 1) return esTriple(['Yerno', 'Nuera'])[i];
        if (b.dx === 1 && b.dy === 0) return esTriple(['Padrastro', 'Madrastra'])[i];
      }
      const base = esBlood(b.dx, b.dy, false);
      return esTriple([base[0] + ' político', base[1] + ' política'])[i];
    }
    if (b.dx === 1 && b.dy === 1) return ['Brother-in-law', 'Sister-in-law', 'Sibling-in-law'][i];
    const base = enBlood(b.dx, b.dy, false);
    if (rel.side === 'partnerRelative') {
      if (b.dx === 1 && b.dy === 0) return ['Father-in-law', 'Mother-in-law', 'Parent-in-law'][i];
      if (b.dx === 0 && b.dy === 1) return ['Stepson', 'Stepdaughter', 'Stepchild'][i];
      if (lineDown) return map3(base, function (s) { return 'Step-' + lower(s); })[i];
      return map3(base, function (s) { return s + '-in-law'; })[i];
    }
    if (b.dx === 0 && b.dy === 1) return ['Son-in-law', 'Daughter-in-law', 'Child-in-law'][i];
    if (b.dx === 1 && b.dy === 0) return ['Stepfather', 'Stepmother', 'Stepparent'][i];
    if (lineUp) return map3(base, function (s) { return 'Step-' + lower(s); })[i];
    if (lineDown) return map3(base, function (s) { return s + '-in-law'; })[i];
    return map3(base, function (s) { return s + ' by marriage'; })[i];
  }

  function cardLabel(lang, rel, gender) {              // the term plus "· unconfirmed" when needed
    const term = relationTerm(lang, rel, gender);
    return rel.confirmed === false ? term + ' · ' + t(lang, 'unconfirmed') : term;
  }

  /* ---------------------------------------------------------------
     relationSentence — "Edgar Eraso es tío de Oscar Eraso Toro."
     Returns pieces so the page can show names in bold.
     --------------------------------------------------------------- */
  function relationSentence(lang, rel, yName, xName, yGender) {
    if (rel.type === 'self') return [{ text: t(lang, 'samePerson') }];
    if (rel.type === 'coparent') {                     // "Gloria y José son los padres de Oscar; no son pareja."
      const list = (rel.childFullNames || []).join(lang === 'es' ? ' y ' : ' and ');
      return lang === 'es'
        ? [{ name: yName }, { text: ' y ' }, { name: xName }, { text: ' son los padres de ' + list + '; no son pareja.' }]
        : [{ name: yName }, { text: ' and ' }, { name: xName }, { text: ' are the parents of ' + list + '; they are not a couple.' }];
    }
    if (rel.type === 'none') {
      if (lang === 'es') return rel.connected
        ? [{ text: 'No hay parentesco de sangre ni político registrado entre ' }, { name: yName }, { text: ' y ' }, { name: xName }, { text: '. Abajo se ve cómo se conectan dentro de la familia.' }]
        : [{ text: 'Todavía no hay ninguna conexión registrada entre ' }, { name: yName }, { text: ' y ' }, { name: xName }, { text: '.' }];
      return rel.connected
        ? [{ text: 'No blood or marriage relationship is recorded between ' }, { name: yName }, { text: ' and ' }, { name: xName }, { text: '. The chain below shows how they connect within the family.' }]
        : [{ text: 'No connection between ' }, { name: yName }, { text: ' and ' }, { name: xName }, { text: ' is recorded yet.' }];
    }
    const term = lower(relationTerm(lang, rel, yGender));
    const tail = rel.confirmed === false ? ' (' + t(lang, 'unconfirmed') + ')' : '';
    if (lang === 'es') return [{ name: yName }, { text: ' es ' + term + ' de ' }, { name: xName }, { text: tail + '.' }];
    return [{ name: yName }, { text: ' is ' }, { name: xName, possessive: true }, { text: ' ' + term + tail + '.' }];
  }

  /* ---------------------------------------------------------------
     degreeText — "Tercer grado de consanguinidad"
     --------------------------------------------------------------- */
  function degreeText(lang, rel) {
    if (rel.type === 'partner') return t(lang, 'partnersNoDegree');
    if (rel.type === 'coparent') return t(lang, 'coparentsNoDegree');
    if (rel.type !== 'blood' && rel.type !== 'affinity') return t(lang, 'none');
    const d = rel.degree;
    if (lang === 'es') {
      const word = upper(ES_DEGREE[d] || (d + '.º'));
      return word + ' grado de ' + (rel.type === 'blood' ? 'consanguinidad' : 'afinidad');
    }
    return enOrdNum(d) + (rel.type === 'blood' ? ' degree of blood kinship' : ' degree by marriage (affinity)');
  }

  /* ---------------------------------------------------------------
     dnaText — "Alrededor del 25 %" / "Between 12.5% and 25%"
     --------------------------------------------------------------- */
  function pct(lang, r) {
    const v = r * 100;
    let s = (v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100).toString();
    if (lang === 'es') s = s.replace('.', ',');
    return lang === 'es' ? s + ' %' : s + '%';
  }
  function dnaText(lang, rel, r) {
    if (rel.type !== 'blood' || r <= 0) return lang === 'es' ? 'Ninguno, según los ancestros registrados' : 'None, based on the recorded ancestors';
    let s;
    if (rel.kind === 'unknown') {                      // full or half unknown: the true value is between r and 2r
      s = lang === 'es' ? 'Entre ' + pct(lang, r) + ' y ' + pct(lang, 2 * r) : 'Between ' + pct(lang, r) + ' and ' + pct(lang, 2 * r);
    } else {
      s = lang === 'es' ? 'Alrededor del ' + pct(lang, r) : 'About ' + pct(lang, r);
    }
    if (rel.confirmed === false) s += lang === 'es' ? ', si se confirman los vínculos pendientes' : ', if the unconfirmed links are correct';
    return s;
  }

  /* ---------------------------------------------------------------
     siblingText — used in profiles: "Media hermana · misma madre: Ana"
     --------------------------------------------------------------- */
  function siblingText(lang, info, gender, sharedParent) {
    const i = g(gender);
    const word = lang === 'es' ? esTriple(['Hermano', 'Hermana'])[i] : ['Brother', 'Sister', 'Sibling'][i];
    if (!info.confirmed) return word + ' · ' + t(lang, 'unconfirmed');
    if (info.kind === 'full') return lang === 'es' ? word + ' de padre y madre' : 'Full ' + lower(word);
    if (info.kind === 'half') {
      const halfWord = lang === 'es' ? esTriple(['Medio hermano', 'Media hermana'])[i] : ['Half-brother', 'Half-sister', 'Half-sibling'][i];
      if (!sharedParent) return halfWord;
      const viaFather = sharedParent.role === 'father';
      const via = lang === 'es' ? (viaFather ? 'mismo padre: ' : 'misma madre: ') : (viaFather ? 'same father: ' : 'same mother: ');
      return halfWord + ' · ' + via + sharedParent.name;
    }
    return word + ' · ' + (lang === 'es' ? 'no se sabe si de padre y madre' : 'full or half not known');
  }

  /* ---------------------------------------------------------------
     chainSentence — "A es hijo de B, quien es hermana de C."
     --------------------------------------------------------------- */
  function chainSentence(lang, chain, nameOf, genderOf) {
    const parts = [];
    chain.forEach(function (step, k) {
      const i = g(genderOf(step.from));
      let w;
      if (step.rel === 'child') w = lang === 'es' ? esTriple(['Hijo', 'Hija'])[i] : ['Son', 'Daughter', 'Child'][i];
      else if (step.rel === 'parent') w = lang === 'es' ? esTriple(['Padre', 'Madre'])[i] : ['Father', 'Mother', 'Parent'][i];
      else if (step.rel === 'partner') w = lang === 'es' ? 'Pareja' : 'Partner';
      else {                                           // sibling
        const half = step.info && step.info.kind === 'half';
        w = lang === 'es'
          ? esTriple(half ? ['Medio hermano', 'Media hermana'] : ['Hermano', 'Hermana'])[i]
          : (half ? ['Half-brother', 'Half-sister', 'Half-sibling'] : ['Brother', 'Sister', 'Sibling'])[i];
      }
      w = lower(w);
      if (step.info && step.info.confirmed === false) w += ' (' + t(lang, 'unconfirmed') + ')';
      if (k === 0) parts.push({ name: nameOf(step.from), id: step.from });
      if (lang === 'es') parts.push({ text: (k === 0 ? ' es ' : ', quien es ') + w + ' de ' });
      else parts.push({ text: (k === 0 ? ' is the ' : ', who is the ') + w + ' of ' });
      parts.push({ name: nameOf(step.to), id: step.to });
    });
    parts.push({ text: '.' });
    return parts;
  }

  root.I18N = {                                        // What other files can use
    UI: UI,
    t: t,
    relationTerm: relationTerm,
    cardLabel: cardLabel,
    relationSentence: relationSentence,
    degreeText: degreeText,
    dnaText: dnaText,
    siblingText: siblingText,
    chainSentence: chainSentence,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.I18N; // for automated tests
})(typeof window !== 'undefined' ? window : globalThis);
