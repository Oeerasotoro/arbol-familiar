# Familia Eraso Toro — interactive family tree

A view-only family tree website. Visitors can search for anyone, open their profile, view the whole tree from any person's point of view, and compare two people to see how they are related. Only you edit it.

## What is in this folder

| File or folder | What it is | Do you edit it? |
|---|---|---|
| `family-data.js` | Everyone in the tree: names, parents, photos, descriptions, biographies, site title | **Yes, this is the main file** |
| `photos/` | Photo files | Yes, add photos here |
| `index.html` | Page skeleton | No |
| `css/styles.css` | Colours and layout | Only to change the look |
| `js/i18n.js` | All words in Spanish and English | Only to reword labels |
| `js/kinship.js` | Relationship calculations | No |
| `js/app.js` | Drawing and buttons | No |
| `lib/` | Two open-source libraries (d3 and dagre) | No |

## Preview on your computer

Double-click `index.html`. It opens in your browser and works offline. Refresh the page after each edit to `family-data.js`.

## Put it online with GitHub Pages (free, about 10 minutes)

1. Create a free account at github.com and sign in.
2. Click **+** (top right) → **New repository**. Name it, for example, `arbol-familiar`. Choose **Public** (required for free GitHub Pages). Click **Create repository**.
3. On the new repository's page, click the link **uploading an existing file**.
4. Open this folder on your computer, select **everything inside it** (not the folder itself), and drag it into the browser window. Wait until every file is listed, then click **Commit changes**.
5. Go to **Settings** → **Pages** (left sidebar). Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose the branch **main** and the folder **/(root)**, and click **Save**.
6. After a minute or two, refresh the Pages settings page. It shows your address, which looks like `https://YOUR-USERNAME.github.io/arbol-familiar/`. Share that link with your family.

**Privacy:** anyone with the link can see the site, and the repository itself is public on a free account. The site asks search engines not to list it, but that is a request, not a lock. Leave out anything a relative would not want online, such as exact birth dates of living people.

## Updating the site later

Edit files directly on GitHub: open the repository, click `family-data.js`, click the pencil icon (**Edit**), make your change, then click **Commit changes**. The live site updates within a minute or two. If you still see the old version, do a hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac).

To add photos: open the `photos` folder on GitHub → **Add file** → **Upload files** → drag the photo in → **Commit changes**.

## Common edits

### Add a relative using an existing person's number

Example: *add a daughter of Marta Eraso (#12) named Laura Gómez Eraso.*

1. Look at the note at the bottom of `family-data.js` for the highest number used (19 at the start). The new person gets the next one: **20**.
2. Copy the template at the bottom of the people list (just above `];`), remove the `//` at the start of each line, and fill it in:

```js
  {
    id: 20,
    name: "Laura Gómez Eraso",
    gender: "female",
    father: null,          // put the father's number here once he is in the tree
    mother: 12,            // Marta Eraso
    unconfirmed: [],
    partners: [],
    born: "",
    died: "",
    birthplace: "",
    photo: "",
    description: "",
    bio: "",
  },
```

3. Update the note at the very bottom to `Highest person number used so far: 20`.

Other cases follow the same idea:

- **Parent of someone already in the tree:** add the new person, then put their number in the child's `father` or `mother` field.
- **Partner or spouse:** add the person, then write `partners: [their number]` on either of the two. Couples who share a child are joined automatically.
- **Parents who are not a couple:** if two people share a child but were never together or separated, write `notPartners: [their number]` on either of the two. Their relatives are then not counted as in-laws (for example, your father's brother is not your mother's brother-in-law), and the dot between them is drawn hollow.
- **Sibling:** give the new person the same `father` and `mother` numbers. The site works out by itself whether siblings share one parent or both, and shows it on their profiles.
- **Raised by one parent:** add `singleParent: true` to the child. The profile then shows only that parent, with no empty slot for the other, and siblings through that parent are still shown as sharing one parent.
- **Confirming a link:** change `unconfirmed: ["father", "mother"]` to `unconfirmed: []`. Dashed lines become solid and "unconfirmed" labels disappear.

Never change or reuse a number once it is given, even if a person is removed.

### Update a photo

1. Save the photo as the person's number, for example `12.jpg`, and put it in `photos/`.
2. In that person's block, set `photo: "photos/12.jpg",`

### Update a description or biography

Find the person's block by searching for `id: 12,` and fill in the fields:

```js
    description: "Profesora de matemáticas en Pasto",
    bio: "Nació en 1960 en Pasto. Estudió en la Universidad de Nariño...",
```

To show different text in each language, use a pair:

```js
    description: { es: "Profesora en Pasto", en: "Teacher in Pasto" },
```

Text goes between straight double quotes. If the text itself contains a double quote, write it as `\"`.

## If something looks wrong

- **A red box appears on the site:** it names the problem in `family-data.js` (for example a number used twice, or a parent number that does not exist). Fix that line and refresh.
- **The page is blank:** usually a missing comma or quote in `family-data.js`. Check the block you edited last; every block ends with `},`.
- **A photo does not show:** check that the file name in `photo:` matches the file exactly, including capital letters and the extension.

## What visitors see

- **Family view.** The tree shows the blood family of the person it is centred on, plus the partners who connect to that family. A partner's own relatives (parents, siblings…) stay hidden behind a purple **Ver familia** pill on the partner's card; clicking the card or the pill shows them, and **Ocultar familia** hides them again. Making anyone the focus starts again from that person's family, with every branch closed.
- **Family at a glance.** Under "Viendo el árbol como …" a short summary counts the focus person's aunts and uncles, first cousins, great-aunts and great-uncles and other relatives; **Ver resumen** opens the full list. Every profile has the same summary from that person's point of view. Counts include everyone recorded, also people in closed branches.

Nothing needs to be set up for this: it is worked out from `father`, `mother`, `partners` and `notPartners` in `family-data.js`.

## How relationships are calculated

- Labels on the cards always describe each person's relationship to the person the tree is centred on ("Viewing the tree as …").
- Degree of kinship is counted the civil-law way used in Colombian law: count generations up to the shared ancestor and back down (parent 1, sibling 2, uncle 3, first cousin 4). Relatives by marriage show the degree of affinity.
- Expected shared DNA is the average for that relationship (50 % for siblings, 12.5 % for first cousins); real values vary.
- Anything that depends on an unconfirmed link is marked "unconfirmed".
