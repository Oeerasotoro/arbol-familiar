/* =====================================================================
   FAMILY-DATA.JS  —  THE ONLY FILE YOU NEED TO EDIT TO GROW THE TREE
   =====================================================================

   Everything the website shows comes from this file. The other files
   (index.html, css/, js/, lib/) draw the tree and never need changing
   just to add people, photos or stories.

   HOW A PERSON IS WRITTEN
   -----------------------
   Each person is one block between { and }, followed by a comma.
   The fields are:

     id          Permanent person number. Never change it, never reuse it.
                 A new person gets the next number after the highest one
                 in this file (the last one used is noted at the bottom).
     name        Full name as it should appear. Leave "" if unknown.
     gender      "male", "female" or "unknown". Used to choose words such
                 as uncle/aunt (tío/tía).
     father      The father's person number, or null if not known.
     mother      The mother's person number, or null if not known.
     unconfirmed A list of parent links that are NOT confirmed yet:
                 ["father"], ["mother"], ["father", "mother"] or [].
                 Unconfirmed links are drawn with dashed lines and every
                 relationship that depends on them is labelled
                 "unconfirmed".
     partners    Person numbers of partners or spouses, e.g. [3].
                 Two people who share a child are joined automatically,
                 so you only need this for couples without children
                 recorded in the tree. Writing it on one of the two
                 people is enough.
     born        Birth year or date as text, e.g. "1958" or "12 mar 1958".
     died        Death year or date as text. Leave "" for living people.
     birthplace  Place of birth as text, e.g. "Pasto, Nariño".
     photo       Path to the photo inside the photos folder,
                 e.g. "photos/12.jpg". Leave "" for no photo.
                 File names are case-sensitive online: "12.JPG" is not
                 the same file as "12.jpg".
     description One short line that introduces the person.
     bio         A few sentences about the person's life.

   description and bio can be plain text, or a pair of translations:
       description: { es: "Maestra en Pasto", en: "Teacher in Pasto" },

   Text goes between straight double quotes " ". If the text itself
   needs a double quote, write it as \" .
   ===================================================================== */


// ---------------------------------------------------------------------
// SITE SETTINGS — title, starting person and starting language
// ---------------------------------------------------------------------
window.SITE_SETTINGS = {                       // Settings read by js/app.js
  title: {                                     // Title shown at the top of the page
    es: "Familia Eraso Toro",                  // Spanish title
    en: "Eraso Toro Family",                   // English title
  },
  defaultFocus: 1,                             // Person number the tree centres on when it opens (1 = Oscar)
  defaultLanguage: "es",                       // Starting language: "es" for Spanish or "en" for English
};


// ---------------------------------------------------------------------
// PEOPLE — one block per person
// ---------------------------------------------------------------------
window.FAMILY_DATA = [                         // The list of everyone in the tree starts here

  // ===================== OSCAR =====================
  {
    id: 1,                                     // Permanent number for Oscar
    name: "Oscar Eraso Toro",                  // Full name (second surname assumed from his parents; edit if needed)
    gender: "male",
    father: 2,                                 // Father = person #2
    mother: 3,                                 // Mother = person #3
    unconfirmed: [],                           // Both parent links are confirmed
    partners: [],
    born: "",
    died: "",
    birthplace: "Pasto, Nariño",
    photo: "",                                 // Example once uploaded: "photos/1.jpg"
    description: "",
    bio: "",
  },

  // ===================== PARENTS =====================
  {
    id: 2,
    name: "José Ernesto Eraso Hernández",      // Oscar's father
    gender: "male",
    father: 4,                                 // José Ernesto Eraso Rosero
    mother: 5,                                 // Clara Hernández
    unconfirmed: [],
    partners: [3],                             // Partner of Gloria (#3)
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 3,
    name: "Gloria Faney Toro Riascos",         // Oscar's mother — the only record for her in the whole tree
    gender: "female",
    father: 6,                                 // Andrés Toro Pantoja
    mother: 7,                                 // María del Carmen Riascos
    unconfirmed: [],
    partners: [2],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },

  // ===================== PATERNAL GRANDPARENTS =====================
  {
    id: 4,
    name: "José Ernesto Eraso Rosero",         // Paternal grandfather
    gender: "male",
    father: null,                              // Not known yet
    mother: null,                              // Not known yet
    unconfirmed: [],
    partners: [5],                             // Partner of Clara Hernández (#5)
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 5,
    name: "Clara Hernández",                   // Paternal grandmother
    gender: "female",
    father: null,
    mother: null,
    unconfirmed: [],
    partners: [4],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },

  // ===================== MATERNAL GRANDPARENTS =====================
  {
    id: 6,
    name: "Andrés Toro Pantoja",               // Maternal grandfather
    gender: "male",
    father: null,
    mother: null,
    unconfirmed: [],
    partners: [7],                             // Partner of María del Carmen (#7)
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 7,
    name: "María del Carmen Riascos",          // Maternal grandmother (spelled like her children's surname; change to "Ríascos" if that is correct)
    gender: "female",
    father: null,
    mother: null,
    unconfirmed: [],
    partners: [6],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },

  // ===================== FATHER'S SIBLINGS =====================
  // These were given as "my father's siblings" without saying whether
  // they share both of his parents, so both parent links are marked
  // unconfirmed. When you confirm them, change
  //     unconfirmed: ["father", "mother"]
  // to  unconfirmed: []
  // If one of them is a half-sibling, change the father or mother
  // number to the right person (or to null if unknown).
  {
    id: 8,
    name: "Edgar Eraso",
    gender: "male",
    father: 4,
    mother: 5,
    unconfirmed: ["father", "mother"],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 9,
    name: "Jorge Eraso",
    gender: "male",
    father: 4,
    mother: 5,
    unconfirmed: ["father", "mother"],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 10,
    name: "Miriam Eraso",
    gender: "female",
    father: 4,
    mother: 5,
    unconfirmed: ["father", "mother"],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 11,
    name: "Magaly Eraso",
    gender: "female",
    father: 4,
    mother: 5,
    unconfirmed: ["father", "mother"],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 12,
    name: "Marta Eraso",
    gender: "female",
    father: 4,
    mother: 5,
    unconfirmed: ["father", "mother"],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 13,
    name: "",                                  // Name still to be confirmed — the site shows "Name unknown"
    gender: "unknown",                         // Change to "male" or "female" once known
    father: 4,
    mother: 5,
    unconfirmed: ["father", "mother"],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: {
      es: "Hermano o hermana de José Ernesto; falta confirmar el nombre.",
      en: "A sibling of José Ernesto; name still to be confirmed.",
    },
    bio: "",
  },

  // ===================== MATERNAL GRANDPARENTS' CHILDREN =====================
  // Gloria Faney (#3) is also their daughter; she is not repeated here.
  {
    id: 14,
    name: "Luz Marina Toro Riascos",
    gender: "female",
    father: 6,
    mother: 7,
    unconfirmed: [],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 15,
    name: "Magola Toro Riascos",
    gender: "female",
    father: 6,
    mother: 7,
    unconfirmed: [],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 16,
    name: "Flavio Toro Riascos",
    gender: "male",
    father: 6,
    mother: 7,
    unconfirmed: [],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 17,
    name: "Alfonso Toro Riascos",
    gender: "male",
    father: 6,
    mother: 7,
    unconfirmed: [],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 18,
    name: "Lili Toro Riascos",
    gender: "female",
    father: 6,
    mother: 7,
    unconfirmed: [],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
  {
    id: 19,
    name: "José Toro Riascos",
    gender: "male",
    father: 6,
    mother: 7,
    unconfirmed: [],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },

  // ===================== ADD NEW PEOPLE BELOW THIS LINE =====================
  // Copy this template, remove the // at the start of each line,
  // and give it the next free number.
  //
  // {
  //   id: 20,
  //   name: "",
  //   gender: "unknown",
  //   father: null,
  //   mother: null,
  //   unconfirmed: [],
  //   partners: [],
  //   born: "",
  //   died: "",
  //   birthplace: "",
  //   photo: "",
  //   description: "",
  //   bio: "",
  // },

];                                             // The list of people ends here — keep this line

// Highest person number used so far: 19   ← update this note when you add someone
