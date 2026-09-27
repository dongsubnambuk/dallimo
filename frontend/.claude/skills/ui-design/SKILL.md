---
name: ui-design
description: "Design system + UX intelligence. Direction artistique bold (anti-AI-slop) + regles UX structurees. 5 modes : INIT (genere design system), BUILD (implemente avec rigueur UX + micro-copy + preview responsive + MCP verification), REVIEW (audit UI avec score quantitatif), EXTEND (sous-tone), MIGRATE (refonte progressive). Catalogues externalises (~100 palettes, ~40 font pairings), 15 component patterns, 99 regles UX, contraste automatise WCAG. Tendances 2026 : patterns extraits de 40+ sites primes Awwwards/CSSDA (animations scroll-driven, bento grid, mesh gradients, fluid type, dark premium, CTA sticky, social proof)."
---

# UI Design — Direction artistique + UX Intelligence

Ce skill guide la creation d'interfaces web distinctives et production-grade. Il combine creativite (anti-AI-slop) et rigueur UX (accessibilite, performance, responsive).

## Architecture des fichiers

Le skill est decoupe en fichiers pour optimiser la consommation de tokens :

| Fichier | Contenu | Quand charger |
|---------|---------|---------------|
| `SKILL.md` | Modes, regles UX, contraste, micro-copy, template | Toujours (fichier principal) |
| `palettes.md` | ~100 palettes par industrie | Mode INIT uniquement |
| `font-pairings.md` | ~40 pairings Google Fonts | Mode INIT uniquement |
| `component-patterns.md` | 15 patterns de composants | Mode BUILD (quand un composant courant est demande) |
| `design-trends-2026.md` | Tendances design 2026 : animations, layouts, couleurs, typo, CTA (40+ sites primes) | Mode INIT (inspiration) + Mode BUILD (implementation) |

**Regle de chargement :** Ne lire les fichiers externes QUE quand le mode correspondant est actif. En mode BUILD courant (sans composant standard ni landing page), seul SKILL.md suffit.

## Routing — Detection automatique du mode

Determine le mode selon le contexte :

1. **L'user demande un audit/review UI** → Mode REVIEW
2. **L'user demande de migrer/refondre une UI existante incohérente** → Mode MIGRATE
3. **Aucun `design-system.md` a la racine du projet** → Mode INIT
4. **`design-system.md` existe + nouvelle page/section avec un tone different** → Mode EXTEND
5. **`design-system.md` existe** → Mode BUILD

Si le mode INIT vient de se terminer, enchainer directement en mode BUILD.

---

## Mode INIT — Generer le design system du projet

Declenche quand aucun `design-system.md` n'existe dans le projet.

### Etape 1 : Analyse du contexte

Lire le projet pour comprendre :
- **Domaine/industrie** : quel secteur ? quel public ?
- **Stack technique** : React, Next, Vue, HTML/CSS, WordPress ?
- **Code UI existant** : y a-t-il deja des composants, des couleurs, des fonts ?
- **Contraintes** : mobile-first ? accessibilite renforcee ? performances critiques ?

Sources a verifier : README, CLAUDE.md, package.json, fichiers CSS/SCSS existants, index.html.

### Etape 2 : Direction artistique

Choisir un tone et l'executer avec conviction. Le design doit etre MEMORABLE, pas generique.

**Tones disponibles (combinables) :**
- Minimal raffine — Espace, precision, retenue
- Brutalist — Brut, typographie forte, anti-polish
- Editorial / Magazine — Grilles sophistiquees, hierarchie typographique
- Organic / Natural — Formes douces, textures, couleurs terre
- Luxury / Refined — Elegance, details soignes, contraste subtil
- Playful / Toy-like — Couleurs vives, formes rondes, energie
- Retro-futuristic — Nostalgie + tech, neon, chrome
- Industrial / Utilitarian — Fonctionnel, monospace, acier
- Soft / Pastel — Doux, arrondi, apaisant
- Maximalist — Dense, riche, layers, textures, couleurs
- Art Deco / Geometric — Symetrie, motifs, or, lignes fortes

**Identifier le differenciateur :** Qu'est-ce qui rend cette interface inoubliable ? Un seul element fort vaut mieux que dix effets moyens.

**GARDE-FOUS ESTHETIQUES — "AI Tells" (patterns bannis) :**

**Typographie :**
- Fonts en display/heading : Interdire Inter, Roboto, Arial, system-ui, sans-serif generique. Ces fonts sont autorisees en body text UNIQUEMENT si le pairing avec un display font distinctif est convaincant. Preferer Geist, Outfit, Cabinet Grotesk, Satoshi pour le display.
- Serifs BANNIS sur les dashboards/software UI. Reserver aux contextes editorial/creatif.
- H1 oversized : un H1 ne doit pas hurler. Controler la hierarchie avec weight et couleur, pas juste la taille.

**Couleurs :**
- "AI Purple/Blue" BANNI : pas de purple gradient sur blanc, pas de glow violet/neon, pas de gradient text sur gros headers. Base neutre (Zinc/Slate) + 1 accent high-contrast desature (<80% saturation).
- Pas de `#000000` pur → utiliser Off-Black, Zinc-950, Charcoal.
- Bleu corporate #007bff generique → interdit.
- Cohérence palette : ne pas fluctuer entre gris chauds et froids dans un meme projet.

**Ombres & effets :**
- Pas de neon/outer glows par defaut. Preferer inner border 1px + shadow interne teintee au fond.
- Grain/noise : uniquement en pseudo-element fixe + `pointer-events-none`. JAMAIS sur un container qui scroll (repaint GPU continu).
- Custom cursors : BANNIS (accessibilite + perf).

**Layouts :**
- "3 equal cards horizontally" feature row → BANNI. Utiliser zig-zag 2-col, grille asymetrique, ou scroll horizontal.
- Hero centre texte sur image sombre → par defaut, preferer asymetrique (texte aligne gauche/droite, image avec fade subtil).
- Grille SaaS 3-colonnes previsible, hero + features + pricing cookie-cutter → interdits.

**Composants :**
- shadcn/ui : autorise MAIS JAMAIS en etat par defaut. Customiser radii, couleurs, shadows obligatoire.
- Cards partout : les cards ne servent que quand l'elevation (z-index) communique de la hierarchie. Sinon preferer `border-t`, `divide-y`, ou espacement pur.

**Contenu & placeholders (l'effet "Jane Doe") :**
- Noms bannis : "John Doe", "Sarah Chan", "Jack Su" → utiliser des noms realistes et varies.
- Avatars : pas de SVG "egg" ou icones user Lucide generiques → photos credibles ou styling specifique.
- Chiffres bannis : `99.99%`, `50%`, `1234567` → utiliser des valeurs organiques (`47.2%`, `+33 6 42 18 73 09`).
- Noms de startup slop : "Acme", "Nexus", "SmartFlow" → inventer des noms de marque contextuels.
- Copywriting AI-slop : "Elevate", "Seamless", "Unleash", "Next-Gen" → verbes concrets.
- Placeholders images : pas d'Unsplash (liens cassent) → `https://picsum.photos/seed/{x}/800/600` ou SVG UI Avatars.

**Convergence :** ne JAMAIS converger vers les memes choix entre projets. Si un font/palette a deja ete utilise recemment, en choisir un autre.

### Etape 2b : S'inspirer des tendances actuelles

**Charger le fichier `design-trends-2026.md`** pour s'inspirer des patterns des meilleurs sites actuels (Awwwards, CSSDA 2025-2026). Utiliser les tendances pertinentes pour le projet : fluid type, mesh gradients, dark premium, scroll animations, bento grid, etc. Ne pas tout appliquer — selectionner ce qui sert le tone choisi.

### Etape 3 : Selection palette

**Charger le fichier `palettes.md`** pour consulter le catalogue.

**Approche :**
1. Identifier l'industrie et le mood du projet
2. Proposer 2-3 palettes du catalogue comme point de depart
3. L'user peut aussi fournir : une couleur existante, un logo, une photo d'ambiance, une reference visuelle
4. Possibilite de : mixer des palettes, deriver (ajuster teinte/saturation), creer de zero

**Le catalogue est un raccourci, pas une limite.** Si aucune palette ne convient, en creer une originale alignee avec la direction artistique.

**Contrainte obligatoire :** Verifier le contraste AA (4.5:1) sur chaque paire texte/fond avec la methode decrite dans la section "Contraste automatise" ci-dessous.

**Generer les variantes :**
- Dark mode : desaturer de 10-20%, ajuster la luminosite
- Semantic : success (vert), warning (ambre), error (rouge), info (bleu) — coherents avec la palette principale

### Etape 4 : Selection typographie

**Charger le fichier `font-pairings.md`** pour consulter le catalogue.

**Approche :**
1. Proposer 2-3 pairings alignes avec le mood
2. Liberte totale de proposer d'autres combinaisons Google Fonts hors catalogue
3. Verifier la disponibilite des weights necessaires (400, 500, 600, 700 minimum)

**Generer le type scale :**

| Token | Taille | Weight | Line-height | Usage |
|-------|--------|--------|-------------|-------|
| xs | 12px | 400 | 1.5 | Captions, fine print |
| sm | 14px | 400 | 1.5 | Labels, meta, secondary |
| base | 16px | 400 | 1.6 | Body text |
| lg | 18px | 500 | 1.5 | Lead paragraphs |
| xl | 24px | 600 | 1.3 | H3, section titles |
| 2xl | 32px | 700 | 1.2 | H2, major sections |
| 3xl | 48px | 700 | 1.1 | H1, hero titles |

Ajustable selon le projet. Le scale ci-dessus est un defaut sain.

### Etape 5 : Spacing & Layout

Definir :
- **Base unit :** 4px (precis) ou 8px (aere) selon le tone
- **Spacing scale :** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96
- **Max-width contenu :** typiquement 1080-1280px selon la densite
- **Breakpoints :** 375 (mobile) / 768 (tablet) / 1024 (desktop) / 1440 (wide)
- **Z-index scale :** base 0 / dropdown 10 / sticky 20 / modal 40 / toast 100 / overlay 1000

### Etape 6 : Sauvegarder le design system

Ecrire `design-system.md` a la racine du projet avec le template defini dans la section "Template — design-system.md" ci-dessous.

### Etape 7 : Transition

Annoncer : "Design system genere et sauvegarde dans `design-system.md`. On passe en mode BUILD."
Enchainer directement en mode BUILD.

---

## Mode BUILD — Implementer avec le design system

Declenche quand `design-system.md` existe et que l'user demande de construire ou modifier de l'UI.

### Etape 1 : Charger le design system

Lire `design-system.md` a la racine du projet. Toute decision de couleur, typo, spacing DOIT respecter ce fichier.

Si des incoherences sont detectees entre le code existant et le design system, les signaler avant de continuer.

**Si un composant standard est demande** (bouton, card, modal, form, table, nav, toast, tabs, accordion, badge, breadcrumbs, avatar, stepper, skeleton, empty state), **charger `component-patterns.md`** et adapter le pattern au design system du projet.

**Pour tout projet UI**, **charger `design-trends-2026.md`** pour s'inspirer des tendances actuelles (animations scroll-driven, bento grid, mesh gradients, fluid type, dark premium, glow effects, magnetic buttons). Ce fichier contient des snippets CSS/JS directement implementables, extraits de 40+ sites primes Awwwards/CSSDA 2025-2026. Piocher les patterns pertinents selon le tone et le contexte du projet — ne pas tout appliquer systematiquement.

### Etape 2 : Direction artistique en action

Reprendre le tone et le style definis dans le design system. Le design system CADRE, il ne BRIDE PAS.

**Executer avec creativite :**
- **Typography** : Pairings distinctifs, hierarchie forte. Le display font porte la personnalite.
- **Color & Theme** : Couleur dominante avec accents tranches. Les palettes timides et uniformement reparties sont interdites.
- **Motion** : Animations pour les micro-interactions et les transitions. CSS-only en priorite. Focus sur les moments a fort impact : un page load orchestre avec staggered reveals (animation-delay) > des micro-interactions dispersees. Scroll-triggering et hover states qui surprennent.
- **Spatial Composition** : Layouts inattendus. Asymetrie. Overlap. Flow diagonal. Elements qui cassent la grille. Espace negatif genereux OU densite controlee.
- **Backgrounds & Visual Details** : Atmosphere et profondeur. Gradient meshes, textures noise, patterns geometriques, transparences layees, ombres dramatiques, bordures decoratives, grain overlays.

**Adapter la complexite au tone :**
- Tone maximalist → code elabore, animations extensives, effets multiples
- Tone minimal → retenue, precision, attention aux details subtils (spacing, typo, transitions delicates)

### Etape 3 : Checklist UX passive

Pendant la generation de code, verifier AUTOMATIQUEMENT contre les regles UX embarquees (section "Regles UX" ci-dessous). Ne pas lister les regles a l'user sauf si une violation est detectee.

**Verifications prioritaires :**
- Contraste texte/fond >= 4.5:1 (AA) — utiliser la section "Contraste automatise" pour calculer
- Cibles tactiles >= 44x44px avec espacement >= 8px
- Images : format optimise, lazy load sur les images below-the-fold
- Mobile-first : le code part du mobile et ajoute des media queries vers le desktop
- Labels de formulaire : toujours visibles (pas de placeholder-only)
- Animations : duree 150-300ms, proprietes transform/opacity uniquement, respect prefers-reduced-motion

### Etape 4 : Generer du code production-grade

- **Stack** : adapter au projet detecte. React/Next.js → JSX + CSS Modules ou Tailwind. Vue → SFC. HTML/CSS → vanilla. WordPress → respect strict des regles wp-stack.md.
- **CSS Variables** : utiliser celles definies dans le design system. Jamais de hex en dur dans les composants.
- **Dark mode** : si defini dans le design system, implementer via CSS variables + prefers-color-scheme ou class toggle.
- **Responsive** : breakpoints du design system. Mobile-first systematiquement.

### Etape 5 : Contrainte WordPress

Si le projet est WordPress (detecte via wp-content, functions.php, ou indication user) :
- **Uniquement** les classes CSS du template existant
- **Pas** de CSS inline custom (sauf display:none pour FAQ)
- **Pas** d'invention de classes — si une classe n'existe pas dans le template, elle n'existe pas
- Wrapper `<!-- wp:html -->...<!-- /wp:html -->` obligatoire
- Collapser les `\n\n` dans les `<style>` blocks (wpautop les corrompt)
- Zero JS inline (WP Rocket defer tous les scripts)
- Utiliser `<details>/<summary>` pour les toggles, CSS `@keyframes` pour les animations

### Etape 6 : Micro-copy guidelines

Tout texte d'interface doit suivre ces principes. Le micro-copy est aussi important que le design visuel. **Adapter les exemples a la langue du projet** (detectee via l'attribut `lang` du HTML, le contenu existant, ou l'indication de l'user).

**Boutons & CTA :**
- Verbe d'action (infinitif en FR, imperatif en EN) : FR "Creer un compte" / EN "Create account" (pas "Submission", pas "OK")
- CTA principal = action specifique (FR "Commencer l'essai gratuit" / EN "Start free trial" > "Get started" > "Click here")
- Bouton destructif = consequence explicite (FR "Supprimer ce compte" / EN "Delete this account" > "Delete" > "OK")
- Maximum 3-4 mots pour un bouton, 6-8 pour un CTA hero

**Messages d'erreur :**
- Structure : [Ce qui s'est passe] + [Comment corriger]. FR: "L'email est invalide. Verifiez qu'il contient un @." / EN: "Invalid email. Make sure it includes an @."
- Pas de jargon technique (pas "Error 422", pas "Validation failed")
- Pas de culpabilisation (FR "L'adresse semble incomplete" / EN "The address seems incomplete" — pas "You made an error")
- Ton neutre et utile, jamais alarmiste

**Empty states :**
- Structure : [Titre empathique] + [Explication courte] + [CTA pour agir]
- FR: "Pas encore d'employes inscrits. Ajoutez le premier pour demarrer le parcours d'onboarding."
- EN: "No employees yet. Add your first one to get started with onboarding."
- Jamais un ecran vide sans explication

**Tooltips & labels :**
- Tooltip = complement, pas doublon du label. Repond a "pourquoi" ou "comment", pas "quoi"
- Max 1-2 phrases. Si plus long → lien contextuel
- Placeholder = exemple de format (FR "jean.dupont@email.com" / EN "john.doe@email.com"), jamais le label

**Confirmations & succes :**
- Confirmer l'action accomplie avec specificite : FR "Employe ajoute avec succes" / EN "Employee added successfully" > "Operation successful" > "OK"
- Disparition auto apres 3-5s (toast), sauf si action annulable (alors garder visible avec bouton d'annulation)

**Chargement & attente :**
- Si < 3s : skeleton ou spinner sans texte
- Si 3-10s : FR "Chargement en cours..." / EN "Loading..."
- Si > 10s : barre de progression ou estimation du temps restant
- Jamais de formulation passive anxiogene (FR "Veuillez patienter" / EN "Please wait")

### Etape 7 : Verification MCP (Lighthouse + Screenshots)

Apres chaque BUILD significatif (page complete ou composant majeur), lancer une verification automatique via les outils MCP disponibles :

#### 7a. Lighthouse Audit (si chrome-devtools disponible)

```
mcp__chrome-devtools__lighthouse_audit → sur l'URL du projet
```

**Seuils Core Web Vitals obligatoires :**
| Metrique | Seuil | Action si depasse |
|----------|-------|-------------------|
| LCP | < 2.5s | Optimiser images LCP, preload font critique |
| CLS | < 0.1 | Ajouter width/height aux images, reserver l'espace des elements dynamiques |
| INP | < 200ms | Reduire le JS bloquant, optimiser les event handlers |
| Performance score | >= 90 | Investiguer les bottlenecks |
| Accessibility score | >= 95 | Corriger les violations WCAG |

Si les seuils ne sont pas atteints, lister les problemes et proposer des fixes avant de continuer.

#### 7b. Screenshots responsive (Playwright ou chrome-devtools)

**Option 1 — Playwright (prefere si disponible) :**
```
mcp__plugin_playwright_playwright__browser_navigate → URL du projet
mcp__plugin_playwright_playwright__browser_resize → 1440x900
mcp__plugin_playwright_playwright__browser_take_screenshot → desktop
mcp__plugin_playwright_playwright__browser_resize → 375x812
mcp__plugin_playwright_playwright__browser_take_screenshot → mobile
```

**Option 2 — chrome-devtools :**
```
mcp__chrome-devtools__navigate_page → URL du projet
mcp__chrome-devtools__resize_page → 1440x900
mcp__chrome-devtools__take_screenshot → desktop
mcp__chrome-devtools__emulate → iPhone 12 Pro
mcp__chrome-devtools__take_screenshot → mobile
```

**Verifications automatiques apres screenshot :**
- Pas de scroll horizontal (overflow-x)
- Conteneurs respectent le max-width du design system
- Texte lisible (pas de chevauchement, pas tronque)
- Images visibles (pas de broken images)

Presenter les screenshots a l'user pour validation visuelle.

#### 7c. Quand ne PAS lancer la verification MCP

- Modification CSS mineure (couleur, spacing)
- Ajout de contenu texte sans changement de layout
- Le projet n'a pas de serveur de dev ni d'URL accessible

### Etape 7d : Pre-flight checklist (AVANT d'annoncer "done")

Derniere passe obligatoire avant de presenter le resultat. Cocher mentalement chaque item — tout KO declenche un fix immediat.

**Layout & viewport**
- [ ] Mobile : `w-full`, `px-4` ou equivalent, pas de scroll horizontal (verifie via screenshot 375px)
- [ ] Hero full-height : `min-h-[100dvh]`, pas `h-screen`
- [ ] Container contenu : `max-w-7xl mx-auto` ou equivalent du design system
- [ ] Layouts asymetriques : fallback single-column sous 768px

**Etats UI**
- [ ] Loading : skeleton matche la layout (pas de spinner generique sur le contenu)
- [ ] Empty : titre + explication + CTA, jamais un ecran blanc
- [ ] Error : message inline sous le champ, jargon zero

**Performance & stack (si React/Next)**
- [ ] Animations continues/hover magnetique → `useMotionValue`, pas `useState`
- [ ] Perpetual motion isole dans un Client Component memoise
- [ ] `useEffect` avec animations → cleanup explicite
- [ ] Anime que `transform` et `opacity`
- [ ] Grain/noise sur pseudo-element fixe, pas sur un scroller

**Anti-slop (AI Tells)**
- [ ] Pas de #000 pur, pas de glow violet par defaut
- [ ] Pas de "3 equal cards row" generique
- [ ] Noms/chiffres/marques realistes (pas "John Doe" / "99.99%" / "Acme")
- [ ] shadcn customise (pas en etat default)
- [ ] Cards uniquement quand l'elevation sert la hierarchie

**Si un item echoue → corriger avant Etape 8.**

### Etape 8 : Enrichir le design system

Si de nouveaux composants reutilisables sont crees (bouton, card, nav, form...), les documenter dans la section "Composants cles" de `design-system.md` :

```markdown
### [Nom du composant]
- **Usage :** [quand l'utiliser]
- **Variantes :** [primary, secondary, ghost...]
- **Classes/tokens :** [les CSS variables ou classes utilisees]
```

Mettre a jour la date "Derniere mise a jour" du design system.

---

## Mode REVIEW — Auditer l'UI existante

Declenche quand l'user demande un audit, une review UI, ou une verification de conformite design.

### Etape 1 : Charger le design system

Lire `design-system.md` a la racine du projet.

- Si present : verifier la conformite du code au design system + regles UX
- Si absent : signaler qu'un passage en mode INIT serait benefique, mais continuer avec les regles UX generiques

### Etape 2 : Scanner le code UI

Identifier les fichiers contenant de l'UI : HTML, CSS, SCSS, JSX, TSX, Vue SFC, Svelte.

Analyser composant par composant, page par page.

### Etape 3 : Verifier contre 4 axes

**Axe 1 — Coherence design system** (si design-system.md existe)
- Couleurs utilisees hors de la palette definie ?
- Fonts non declarees dans le design system ?
- Spacing hors de la scale definie (valeurs arbitraires en px) ?
- Breakpoints custom non prevus ?
- CSS variables non utilisees (hex en dur a la place) ?

**Axe 2 — Regles UX critiques**
- Contraste insuffisant (< 4.5:1 pour le texte, < 3:1 pour les grands textes) ? Utiliser la section "Contraste automatise" pour calculer.
- Cibles tactiles < 44x44px ?
- Labels de formulaire manquants ou placeholder-only ?
- Focus non visible sur les elements interactifs ?
- Alt text manquant sur les images ?
- Pas de support clavier sur les elements interactifs ?
- prefers-reduced-motion non respecte sur les animations ?

**Axe 3 — Performance**
- Images non optimisees (PNG/JPG au lieu de WebP/AVIF) ?
- Pas de lazy load sur les images below-the-fold ?
- Animations sur des proprietes couteuses (width, height, top, left) ?
- Layout shift potentiel (images sans dimensions, fonts sans font-display) ?
- Listes longues (>50 items) sans virtualisation ?

**Axe 4 — Anti-patterns esthetiques**
- Fonts generiques utilisees en display/heading (Inter, Roboto, Arial, system-ui) ? (Autorisees en body si pairing distinctif)
- Purple gradient sur blanc ?
- Layout SaaS cookie-cutter (hero + 3 features cards + pricing) ?
- CSS inline (si projet WordPress) ?
- Classes CSS inventees (si projet WordPress) ?

### Etape 3b : Lighthouse Audit MCP (si disponible)

Si chrome-devtools est disponible et que le projet a une URL accessible :

```
mcp__chrome-devtools__lighthouse_audit → sur l'URL du projet
```

Integrer les resultats Lighthouse dans l'axe Performance. Comparer les Core Web Vitals aux seuils definis dans le mode BUILD (LCP < 2.5s, CLS < 0.1, INP < 200ms).

### Etape 4 : Rapport structure

Pour chaque probleme trouve :

```
#### [Gravite] — [Nom de la regle violee]
- **Fichier :** `path/to/file.ext:ligne`
- **Probleme :** [description concise]
- **Fix :** [code correctif concret]
```

Gravites avec poids de scoring :
- **Critique** (-10 pts) : accessibilite, contraste, labels manquants (bloque des users)
- **Important** (-5 pts) : performance, coherence design system, responsive casse
- **Nice-to-have** (-2 pts) : anti-patterns esthetiques, optimisations mineures

### Etape 5 : Score quantitatif

Calculer un score sur 100 :

```
Score = 100 - (N_critique × 10) - (N_important × 5) - (N_nice_to_have × 2)
Score minimum = 0
```

**Grille d'interpretation :**
| Score | Verdict | Action |
|-------|---------|--------|
| 90-100 | Excellent | Pas d'action requise |
| 75-89 | Bon | Corriger les critiques, les importants en optionnel |
| 50-74 | A ameliorer | Plan de correction prioritaire |
| 0-49 | Problematique | Refonte recommandee (envisager mode MIGRATE) |

**Rapport final :**

```
## Resume audit UI

**Score : XX/100** [Excellent / Bon / A ameliorer / Problematique]

| Gravite | Nombre | Impact |
|---------|--------|--------|
| Critique | N | -N×10 pts |
| Important | N | -N×5 pts |
| Nice-to-have | N | -N×2 pts |

### Priorite de fix
1. [liste des critiques a corriger en premier]
2. [liste des importants]

### Comparaison (si audit precedent disponible)
Score precedent : XX/100 → Score actuel : XX/100 (evolution +/-XX pts)
```

---

## Mode MIGRATE — Refondre progressivement une UI existante

Declenche quand l'user veut harmoniser/refondre une UI incohérente sans tout casser. Contrairement a INIT (qui part de zero) ou BUILD (qui suppose un design system respecte), MIGRATE extrait les patterns existants et planifie une transition progressive.

### Quand utiliser MIGRATE

- Le projet a une UI fonctionnelle mais incohérente (plusieurs styles melanges, pas de design system)
- Une refonte totale n'est pas envisageable (trop de pages, trop de risque)
- L'objectif est d'harmoniser progressivement sans casser l'existant

### Etape 1 : Audit de l'existant

Lancer un audit equivalent au mode REVIEW (4 axes) pour etablir un etat des lieux.

Capturer le score initial — il servira de baseline pour mesurer la progression.

### Etape 2 : Extraction des patterns dominants

Scanner le code UI pour identifier les patterns les plus frequents :

**Couleurs :**
```
Grep tous les hex codes, rgb(), hsl() dans les CSS/SCSS → frequence de chaque couleur
Identifier : couleur primaire de facto, secondaire, neutrals
```

**Fonts :**
```
Grep font-family dans les CSS → quelles fonts sont utilisees, combien de fois
Identifier : font dominante body, font dominante headings
```

**Spacing :**
```
Grep padding, margin, gap → quelles valeurs reviennent le plus
Identifier : base unit de facto (4px? 8px? aleatoire?)
```

**Composants :**
```
Identifier les patterns recurents : quel type de bouton, de card, de navigation
Combien de variantes de chaque composant existent
```

### Etape 3 : Design system d'harmonisation

Generer un `design-system.md` qui :
1. **Prend les patterns dominants comme base** (pas un ideal theorique)
2. **Choisit un camp** quand il y a des incoherences (ex: si 3 border-radius differents existent, en garder 1)
3. **Documente les exceptions temporaires** (patterns minoritaires qui seront migres plus tard)

```markdown
## Migration tracking

| Pattern actuel | Pattern cible | Fichiers concernes | Priorite | Statut |
|---------------|---------------|-------------------|----------|--------|
| border-radius: 4px | border-radius: 8px | header.css, card.css | P1 | A faire |
| #007bff (bleu brut) | var(--color-primary) | 12 fichiers | P1 | A faire |
| Arial body text | var(--font-body) | global.css | P2 | A faire |
```

### Etape 4 : Plan de migration par composant

Ordonner la migration par impact et risque :

**Phase 1 — CSS Variables (risque faible, impact fort)**
- Remplacer tous les hex en dur par des CSS variables
- Centraliser les fonts dans des variables
- Unifier les spacing vers la scale choisie

**Phase 2 — Composants atomiques (risque moyen)**
- Harmoniser les boutons (un seul style)
- Harmoniser les inputs/forms
- Harmoniser les cards

**Phase 3 — Layouts (risque eleve)**
- Uniformiser les breakpoints
- Passer en mobile-first si pas deja le cas
- Harmoniser les navigations

### Etape 5 : Execution iterative

Apres chaque phase :
1. Lancer un audit REVIEW pour mesurer le score
2. Comparer au score baseline
3. Documenter la progression dans `design-system.md` (section "Migration tracking")

La migration est terminee quand le score atteint >= 75/100 et que tous les items P1 sont resolus.

---

## Mode EXTEND — Nouvelle page avec sous-tone different

Declenche quand `design-system.md` existe mais que l'user veut creer une page/section avec une ambiance differente du tone principal (ex: page pricing vs page blog, page onboarding vs dashboard admin).

### Quand utiliser EXTEND vs BUILD

- **BUILD** : la page suit le meme tone que le reste du projet
- **EXTEND** : la page a besoin d'une variation (plus serieuse, plus playful, plus dense, plus aeree)

### Flow EXTEND

1. **Charger le design system** — lire `design-system.md` du projet

2. **Identifier le sous-tone** — Quelle variation par rapport au tone principal ?
   - Meme palette, tone different (ex: principal = playful, page pricing = serieux)
   - Meme tone, densite differente (ex: landing = aere, dashboard = dense)
   - Meme tone, accent different (ex: page standard = accent primaire, page promo = accent chaud)

3. **Definir les overrides** — Ce qui change par rapport au design system principal :
   - **Typographie** : taille de base differente ? heading scale ajuste ?
   - **Spacing** : densite differente ? base unit differente ?
   - **Accent** : couleur d'accent specifique a cette page ?
   - **Layout** : max-width different ? grille differente ?
   - Le reste (palette principale, fonts, breakpoints) reste IDENTIQUE au design system

4. **Documenter les overrides** — Ajouter une sous-section dans `design-system.md` :

```markdown
## Page overrides

### [Nom de la page]
- **Sous-tone :** [variation par rapport au tone principal]
- **Overrides :**
  - Accent : #XXXX (au lieu de #YYYY)
  - Densite : base unit 4px (au lieu de 8px)
  - Type scale : base 14px (au lieu de 16px)
- **Raison :** [pourquoi cette page diverge]
```

5. **Passer en BUILD** avec les overrides actifs pour cette page uniquement

### Regles EXTEND

- Les overrides sont des EXCEPTIONS documentees, pas un nouveau design system
- Maximum 3-4 overrides par page. Si plus → c'est un nouveau projet, pas un extend
- La palette principale, les fonts et les breakpoints ne changent JAMAIS en extend
- Chaque override a une raison explicite (pas "j'aime mieux comme ca")

---

## Regles techniques — Stack React/Next/Framer Motion

Regles activees uniquement si le projet utilise React, Next.js, ou Framer Motion. A verifier passivement en mode BUILD, activement en mode REVIEW (axe performance + anti-patterns).

### Dependency verification (OBLIGATOIRE)

Avant d'importer une librairie tierce (`framer-motion`, `lucide-react`, `zustand`, `@phosphor-icons/react`) : verifier `package.json`. Si absente, sortir la commande d'installation AVANT le code. Ne jamais supposer qu'une lib existe.

### Next.js — RSC safety

- Default : Server Components (RSC).
- Global state (context, zustand, jotai) → fonctionne UNIQUEMENT en Client Component. Wrapper les providers dans un composant `"use client"` dedie.
- **Isolation interactivite :** tout composant avec Framer Motion, hover magnetique, liquid glass, ou etat local DOIT etre un leaf component `"use client"`. Les Server Components rendent les layouts statiques uniquement.

### Framer Motion — performance critique

- **JAMAIS `useState` pour du hover continu ou des animations par frame** (magnetic hover, mouse follow, scroll progress). Utiliser EXCLUSIVEMENT `useMotionValue` + `useTransform` — ces valeurs vivent hors du cycle de render React.
- **Spring physics par defaut :** `type: "spring", stiffness: 100, damping: 20`. Pas de `linear` sur des interactions.
- **Stagger enfants :** le parent avec `variants` et les enfants DOIVENT etre dans le meme Client Component tree. Si data async, passer les data en props a un Parent Motion wrapper centralise.
- **Perpetual motion (pulse, float, shimmer, typewriter) :** isoler dans un micro Client Component memoise (React.memo). Ne JAMAIS trigger un re-render du parent.
- **Listes dynamiques :** wrapper dans `<AnimatePresence>`.
- **GSAP/ThreeJS :** ne JAMAIS les mixer avec Framer Motion dans le meme tree. Framer = UI/Bento. GSAP/ThreeJS = scrolltelling isole ou canvas full-page, dans un `useEffect` avec cleanup strict.

### Viewport & layout

- **Hero full-height :** `min-h-[100dvh]` OBLIGATOIRE. `h-screen` casse sur iOS Safari (jump au scroll de la barre d'URL).
- **Grid > Flexbox math :** pour toute structure multi-colonnes, CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`). Interdit : `w-[calc(33%-1rem)]` ou flexbox pourcentages.
- **Container :** `max-w-7xl mx-auto` ou `max-w-[1400px] mx-auto`. Pas de layouts qui s'etendent edge-to-edge sans raison.
- **Mobile override (densite forte) :** toute grille asymetrique au-dessus de `md:` DOIT fallback en single-column (`w-full px-4 py-8`) sous 768px. Eviter tout scroll horizontal.

### Hardware acceleration (deja couvert par regles 3.6 / 7.3, rappel ici pour les reviewers)

- Animer EXCLUSIVEMENT `transform` et `opacity`. Jamais `top`, `left`, `width`, `height`, `margin`.
- `will-change: transform` avec parcimonie (retirer apres animation).

### Z-index discipline

- Scale predefinie (cf regle 5.8) : `dropdown 10 / sticky 20 / modal 40 / toast 100 / overlay 1000`.
- Interdit : `z-50` ou `z-10` arbitraires en inline. Les z-index servent uniquement a des contextes systemiques (sticky navbars, modals, overlays).

### Tailwind version lock

- Verifier `package.json` : v3 ou v4 ?
- Ne pas utiliser la syntaxe v4 dans un projet v3.
- En v4 : NE PAS utiliser le plugin `tailwindcss` dans `postcss.config.js`. Utiliser `@tailwindcss/postcss` ou le plugin Vite.

### Icones

- Une seule librairie par projet : `@phosphor-icons/react` OU `@radix-ui/react-icons` OU `lucide-react`. Verifier la version installee.
- `strokeWidth` standardise globalement (1.5 ou 2.0).
- Emojis BANNIS dans le code (markup, alt text, content). Remplacer par icones vectorielles ou SVG primitives.

---

## Contraste automatise — Verification WCAG

Methode de calcul pour verifier le contraste AA/AAA sur les paires de couleurs.

### Formule de luminance relative (WCAG 2.1)

Pour un hex `#RRGGBB` :

```
1. Convertir en sRGB : R = RR/255, G = GG/255, B = BB/255
2. Lineariser chaque canal :
   - Si canal <= 0.03928 : canal_lin = canal / 12.92
   - Sinon : canal_lin = ((canal + 0.055) / 1.055) ^ 2.4
3. Luminance L = 0.2126 × R_lin + 0.7152 × G_lin + 0.0722 × B_lin
```

### Ratio de contraste

```
Ratio = (L_clair + 0.05) / (L_sombre + 0.05)
```

Ou `L_clair` est la luminance la plus elevee et `L_sombre` la plus basse.

### Seuils WCAG

| Niveau | Texte normal | Grand texte (>=18px bold ou >=24px) |
|--------|-------------|-------------------------------------|
| AA | >= 4.5:1 | >= 3:1 |
| AAA | >= 7:1 | >= 4.5:1 |

### Snippet de verification rapide

Utiliser ce snippet dans la console du navigateur (via chrome-devtools si disponible) pour verifier une paire :

```javascript
function contrastRatio(hex1, hex2) {
  const lum = (hex) => {
    const [r,g,b] = hex.match(/\w{2}/g).map(c => {
      const s = parseInt(c,16)/255;
      return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4);
    });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const L1 = lum(hex1.replace('#','')), L2 = lum(hex2.replace('#',''));
  const [light, dark] = L1 > L2 ? [L1,L2] : [L2,L1];
  const ratio = (light+0.05)/(dark+0.05);
  const aa = ratio >= 4.5 ? 'PASS' : 'FAIL';
  const aaa = ratio >= 7 ? 'PASS' : 'FAIL';
  console.log(`${hex1} sur ${hex2} → ${ratio.toFixed(2)}:1 | AA: ${aa} | AAA: ${aaa}`);
  return ratio;
}
// Usage : contrastRatio('#1A1A2E', '#FAFAFA')
```

**En mode INIT :** Executer ce snippet via `mcp__chrome-devtools__evaluate_script` pour valider chaque paire texte/fond de la palette choisie avant de finaliser le design system.

**En mode BUILD :** Verifier les nouvelles combinaisons de couleurs introduites.

**En mode REVIEW :** Scanner les paires texte/fond dans le code et signaler celles en echec.

---

## Regles UX — Reference complete

99 regles organisees par priorite. Utilisees passivement en mode BUILD, activement en mode REVIEW.

### Priorite 1 — Accessibilite (CRITIQUE)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 1.1 | Contraste texte | Ratio >= 4.5:1 (AA) pour le texte normal, >= 3:1 pour le grand texte (>=18px bold ou >=24px) | Texte gris clair sur fond blanc, texte sur image sans overlay |
| 1.2 | Contraste AAA | Viser 7:1 pour le contenu critique (navigation, CTA, formulaires) | Se contenter de 4.5:1 partout |
| 1.3 | Alt text images | Alt descriptif sur chaque image informative, alt="" sur les decoratives | Alt manquant, alt="image", alt redondant avec le texte adjacent |
| 1.4 | Labels formulaire | Label visible associe via for/id ou wrapping, toujours visible | Placeholder comme seul label, label masque visuellement |
| 1.5 | Focus visible | Outline personnalise visible (>=2px, contraste >=3:1), ne jamais supprimer | outline: none sans remplacement, focus invisible |
| 1.6 | Navigation clavier | Tous les elements interactifs accessibles via Tab, ordre logique (tabindex=0) | tabindex > 0, elements interactifs non focusables, piege clavier |
| 1.7 | ARIA basique | role, aria-label, aria-expanded, aria-hidden sur les elements custom | ARIA inutile sur les elements natifs (button, a, input), aria-label vide |
| 1.8 | Landmarks | header, nav, main, footer, aside pour structurer la page | Tout en div sans semantique |
| 1.9 | Skip link | Lien "Skip to content" en premier element focusable, visible au focus | Pas de skip link sur les pages avec navigation |
| 1.10 | Couleur non-seule | Toujours coupler la couleur avec icone, texte, ou pattern pour transmettre l'info | Erreur signalee uniquement par rouge, statut uniquement par couleur |
| 1.11 | Reduced motion | @media (prefers-reduced-motion: reduce) { animation: none; transition: none; } | Ignorer la preference, animations imposees |
| 1.12 | Texte redimensionnable | Layout fonctionne a 200% zoom, pas de overflow hidden sur le texte | Taille fixe en px sur les conteneurs de texte, texte tronque au zoom |
| 1.13 | Liens descriptifs | Texte de lien decrivant la destination ("Voir les tarifs") | "Cliquez ici", "En savoir plus" sans contexte |
| 1.14 | Langue page | Attribut lang sur html, lang sur les passages en langue differente | Pas de lang, mauvaise valeur lang |

### Priorite 2 — Touch & Interaction (CRITIQUE)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 2.1 | Taille cible | Minimum 44x44px pour tous les elements tactiles (boutons, liens, inputs) | Cibles < 44px, icones cliquables sans padding |
| 2.2 | Espacement cibles | Minimum 8px entre les cibles tactiles adjacentes | Boutons colles, liens trop proches dans le texte |
| 2.3 | Zone de tap etendue | padding pour agrandir la zone tactile au-dela du contenu visible | Zone de tap = taille visuelle uniquement |
| 2.4 | Feedback tactile | Changement visuel immediat au tap (active state, scale, opacite) | Aucun feedback, delai perceptible avant reaction |
| 2.5 | Gestes simples | Actions principales par tap. Swipe/pinch en complement, jamais en exclusivite | Action critique uniquement accessible par geste complexe |
| 2.6 | Annulation geste | Activation sur pointerup (pas pointerdown), possibilite d'annuler en glissant hors | Action irreversible au pointerdown |
| 2.7 | Scroll naturel | Scroll natif du navigateur, momentum conserve | Scroll hijacking, scroll snapping agressif sans alternative |
| 2.8 | Input type | type="email", "tel", "number", "url" pour declencher le bon clavier mobile | type="text" pour tout, input numerique sans inputmode |
| 2.9 | Taille input | Inputs >= 16px font-size sur iOS (empeche le zoom auto) | font-size < 16px sur les inputs mobiles |
| 2.10 | Safe areas | padding env(safe-area-inset-*) pour les notches et barres systeme | Contenu masque par notch ou barre home |
| 2.11 | Hover non-requis | Tout ce qui est en hover doit etre accessible autrement sur mobile (tap, toggle) | Info critique uniquement en hover tooltip |
| 2.12 | Double-tap zoom | Eviter les layouts qui declenchent le double-tap zoom non desire (spacing boutons) | Boutons trop proches provoquant un zoom au lieu d'un tap |

### Priorite 3 — Performance (HIGH)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 3.1 | Format images | WebP (fallback JPG), AVIF si supporte. Compression 80-85% qualite | PNG pour les photos, images non compressees |
| 3.2 | Lazy loading | loading="lazy" sur les images below-the-fold, eager sur le hero/LCP | Tout eager, ou lazy sur l'image LCP |
| 3.3 | Dimensions images | width et height explicites sur chaque img (ou aspect-ratio CSS) | Images sans dimensions (cause CLS) |
| 3.4 | CLS < 0.1 | Reserver l'espace pour les elements dynamiques (ads, embeds, images, fonts) | Contenu qui pousse le layout apres chargement |
| 3.5 | Font display | font-display: swap (ou optional pour les fonts non critiques) | font-display: block, FOIT longue, flash of invisible text |
| 3.6 | Animation GPU | Animer uniquement transform et opacity (GPU-accelerated). will-change avec parcimonie | Animer width, height, top, left, margin, padding |
| 3.7 | Frame budget | Animations a 60fps (16ms budget par frame). Eviter les reflows dans les boucles | Animations qui provoquent des reflows a chaque frame |
| 3.8 | Virtualisation | Listes > 50 items : virtualiser (react-window, virtuoso, ou intersection observer) | Render de centaines de DOM nodes visibles |
| 3.9 | Code splitting | Composants lourds en lazy import (React.lazy, dynamic import) | Bundle monolithique, tout charge au premier render |
| 3.10 | Prefetch | Prefetch des routes probables (link rel="prefetch"), preload des assets critiques | Prefetch de tout, pas de preload du CSS/font critique |

### Priorite 4 — Style Selection (HIGH)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 4.1 | Match industrie | Palette et tone coherents avec le secteur et l'audience cible | Palette tech/startup pour un commerce alimentaire local |
| 4.2 | Dark mode coherent | Desaturer les couleurs de 10-20%, ajuster la luminosite, pas juste inverser | background: black + text: white brut, couleurs saturees en dark |
| 4.3 | Iconographie coherente | Un seul set d'icones (style, stroke width, taille). Lucide, Phosphor, ou Heroicons | Mix de sets d'icones, tailles/styles incoherents, emojis comme icones |
| 4.4 | Consistance composants | Meme border-radius, meme shadow, meme padding sur les composants similaires | radius 4px ici, 12px la, shadows aleatoires |
| 4.5 | Densite adaptee | Dashboard → dense. Marketing → aere. App mobile → moyen | Meme densite partout, landing page dense comme un dashboard |
| 4.6 | Platform awareness | Respecter les conventions de la plateforme cible (web != iOS != Android) | Composants iOS sur une web app, bottom sheet sur desktop |

### Priorite 5 — Layout & Responsive (HIGH)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 5.1 | Mobile-first | Ecrire le CSS mobile d'abord, ajouter min-width media queries vers desktop | Desktop-first avec max-width media queries, layout mobile en afterthought |
| 5.2 | Breakpoints coherents | 375 / 768 / 1024 / 1440 (ou ceux du design system). Utiliser les memes partout | Breakpoints ad-hoc par composant, 15 breakpoints differents |
| 5.3 | Viewport meta | `<meta name="viewport" content="width=device-width, initial-scale=1">` | Viewport manquant, width fixe, user-scalable=no |
| 5.4 | Flexbox/Grid | CSS Grid pour les layouts 2D, Flexbox pour le 1D. gap au lieu de margin entre items | Float, position absolute pour les layouts, margin entre flex items |
| 5.5 | Max-width contenu | max-width sur le contenu texte (1080-1280px), margin auto centre | Texte qui s'etire sur 1920px, lignes de 200 caracteres |
| 5.6 | Ligne de lecture | 65-75 caracteres par ligne de texte (ch unit ou max-width adapte) | Lignes trop longues (>90ch) ou trop courtes (<45ch) |
| 5.7 | Overflow | overflow-x: hidden sur body UNIQUEMENT. Gerer l'overflow par composant | overflow: hidden partout, contenu tronque silencieusement |
| 5.8 | Z-index scale | Scale predefinie (0/10/20/40/100/1000). Documenter dans le design system | z-index: 9999, z-index aleatoires, guerre de z-index |
| 5.9 | Container queries | Preferer @container aux media queries quand le composant est reutilise dans des contextes de taille differents | Media queries dans un composant qui depend de son parent |
| 5.10 | Aspect ratio | aspect-ratio CSS pour les images, videos, embeds au lieu du padding-bottom hack | padding-bottom: 56.25% pour le 16:9 |
| 5.11 | Sticky safe | position: sticky avec top calcule (header height). Tester avec contenu long | Sticky qui se superpose, sticky qui ne fonctionne pas (overflow parent) |
| 5.12 | Print stylesheet | @media print basique pour les pages de contenu (masquer nav, fond blanc, liens visibles) | Ignorer print, page imprimable illisible |

### Priorite 6 — Typography & Color (MEDIUM)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 6.1 | Base 16px | font-size: 16px minimum sur le body (lisibilite + evite zoom iOS) | 14px body text, 12px sur mobile |
| 6.2 | Line-height | 1.5 a 1.6 pour le body, 1.1 a 1.3 pour les headings, 1.4 pour les interfaces | Line-height 1.0, line-height identique partout |
| 6.3 | Scale coherent | Type scale predefinie (xs/sm/base/lg/xl/2xl/3xl). Max 7-8 tailles | Tailles ad-hoc (13px, 17px, 22px), 15 tailles differentes |
| 6.4 | Weight hierarchy | 700 headings, 400 body, 500-600 labels/emphasis. Max 3-4 weights | 9 weights differents, bold partout, pas de hierarchie |
| 6.5 | Semantic tokens | CSS variables pour les couleurs (--color-primary, --text-primary). Jamais de hex en dur | Hex codes dans les composants, couleurs dupliquees |
| 6.6 | Tabular figures | font-variant-numeric: tabular-nums sur les donnees chiffrees (prix, stats, tableaux) | Chiffres proportionnels dans les colonnes de donnees |
| 6.7 | Underline links | Texte lien souligne ou clairement differencie du texte normal (pas juste la couleur) | Liens indiscernables du texte, couleur seule comme indicateur |
| 6.8 | Heading hierarchy | h1 → h2 → h3 dans l'ordre. Un seul h1 par page. Pas de saut de niveau | h1 h1 h3 h1, headings utilises pour le style au lieu de la semantique |
| 6.9 | Font loading | Preload la font critique. Google Fonts avec display=swap. Limiter a 2-3 fonts max | 5+ fonts chargees, pas de preload, FOIT long |
| 6.10 | Letter spacing | Headings : -0.01 a -0.03em (resserrer). Uppercase : +0.05 a +0.1em (aerer) | Letter-spacing par defaut partout, uppercase sans espacement |

### Priorite 7 — Animation (MEDIUM)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 7.1 | Duree | 150-300ms pour les micro-interactions. 300-500ms pour les transitions de page/layout | < 100ms (imperceptible) ou > 500ms (lent) pour les interactions |
| 7.2 | Easing | ease-out pour les entrees (decelere). ease-in pour les sorties (accelere). ease-in-out pour les boucles | linear pour tout, ease-in sur les entrees (sensation de lenteur) |
| 7.3 | GPU only | Animer transform (translate, scale, rotate) et opacity uniquement | Animer width, height, margin, padding, top, left, color |
| 7.4 | Reduced motion | @media (prefers-reduced-motion: reduce) → durees a 0ms ou transition: none | Ignorer cette media query, animations imposees |
| 7.5 | Entree > Sortie | Duree entree >= duree sortie. L'apparition est un evenement, la disparition est un nettoyage | Sortie plus lente que l'entree (frustration) |
| 7.6 | Stagger reveals | animation-delay incremental (0.05-0.1s) sur les listes/grilles pour un page load orchestre | Tout apparait d'un coup, ou stagger trop lent (>0.2s par item) |
| 7.7 | Interruptible | Les animations de transition doivent etre interruptibles (pas d'attente forcee) | Animation bloquante, user coince pendant 800ms |
| 7.8 | Spring physics | cubic-bezier(0.34, 1.56, 0.64, 1) pour les bounces subtils. Parcimonie | Spring sur tout, bounce excessif, overshoot violent |

### Priorite 8 — Forms & Feedback (MEDIUM)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 8.1 | Labels visibles | Label au-dessus du champ, toujours visible, meme quand le champ est rempli | Placeholder-only, label qui disparait au focus |
| 8.2 | Validation inline | Valider on blur (pas on change). Message d'erreur sous le champ, en rouge + icone | Validation uniquement au submit, erreur en haut de page |
| 8.3 | Erreur descriptive | "L'email doit contenir un @" au lieu de "Format invalide" | "Erreur", "Invalide", "Champ requis" sans explication |
| 8.4 | Progressive disclosure | Afficher les champs au fur et a mesure. Masquer la complexite derriere "Options avancees" | Formulaire de 20 champs d'un coup, tout visible |
| 8.5 | Auto-save | Sauvegarder le brouillon automatiquement (localStorage ou API). Feedback "Sauvegarde" | Perte du formulaire au refresh/navigation |
| 8.6 | Submit feedback | Etat loading sur le bouton (spinner + disabled). Confirmation claire apres succes | Pas de feedback, double submit possible, page blanche apres submit |
| 8.7 | Autocomplete | Attributs autocomplete (name, email, tel, address) pour l'autofill navigateur | autocomplete="off" partout, pas d'attribut autocomplete |
| 8.8 | Champs optionnels | Marquer les champs optionnels "(optionnel)" plutot que les requis avec "*" | Asterisque rouge sans legende, tout semble requis |
| 8.9 | Groupement logique | fieldset/legend pour grouper les champs lies. Espacement visuel entre groupes | Tous les champs en vrac, pas de structure visuelle |
| 8.10 | Confirmation destructive | Dialog de confirmation pour les actions irreversibles (supprimer, annuler). Bouton danger en rouge | Suppression en un clic, pas de confirmation, bouton danger en bleu |

### Priorite 9 — Navigation (HIGH)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 9.1 | Bottom nav max 5 | Navigation mobile en bas : 3-5 items maximum. Icone + label | Plus de 5 items, icones seules sans label, nav en haut sur mobile app |
| 9.2 | Back previsible | Le bouton retour ramene a l'ecran precedent. Toujours | Retour qui ramene au home, navigation imprevisible |
| 9.3 | Etat actif | Item de nav actif clairement distingue (couleur, weight, indicateur) | Pas d'indication de page courante, tous les items identiques |
| 9.4 | Breadcrumbs | Sur les sites > 2 niveaux de profondeur. Chemin cliquable | Breadcrumbs sur un site a 1 niveau, breadcrumbs non cliquables |
| 9.5 | Deep linking | Chaque vue/etat a une URL unique et partageable | Etat de l'app qui se perd au refresh, pas de routing |
| 9.6 | Sidebar responsive | Sidebar desktop → drawer ou bottom sheet mobile. Hamburger si > 5 items | Sidebar qui reste ouverte sur mobile, menu qui pousse le contenu |
| 9.7 | Search accessible | Champ de recherche visible ou accessible en 1 clic. Resultats avec highlight | Recherche cachee dans un menu, resultats sans mise en valeur |
| 9.8 | Loading states | Skeleton screens > spinners pour le contenu. Spinner pour les actions ponctuelles | Page blanche pendant le chargement, spinner sur tout |
| 9.9 | Empty states | Message + illustration + CTA quand une liste est vide ("Pas encore de X. Creer le premier ?") | Liste vide sans explication, juste du blanc |

### Priorite 10 — Charts & Data (LOW)

| # | Regle | Do | Don't |
|---|-------|-----|-------|
| 10.1 | Couleurs accessibles | Palette de graphique avec contraste suffisant entre les series. Pas plus de 6-7 couleurs | Couleurs trop proches, daltonisme non pris en compte |
| 10.2 | Legendes | Legende visible, cliquable pour toggle. Proche du graphique | Legende cachee, couleurs sans legende, legende loin du chart |
| 10.3 | Tooltips | Tooltip au hover/tap avec valeur exacte, unite, et label | Pas de tooltip, valeur sans unite, tooltip qui deborde de l'ecran |
| 10.4 | Responsive charts | Graphique qui s'adapte au container. Axes lisibles sur mobile | Graphique taille fixe, axes illisibles en petit, scroll horizontal |
| 10.5 | Screen reader | Summary textuel alternatif pour les graphiques (aria-label ou texte cache) | Graphique sans alternative textuelle, donnees visuelles uniquement |
| 10.6 | Axes clairs | Labels d'axes, unites, grille legere. Commencer a 0 sauf justification | Pas de labels, echelle trompeuse, grille envahissante |
| 10.7 | Type de chart adapte | Bar pour comparaison, line pour tendance, pie UNIQUEMENT si < 5 categories | Pie chart avec 12 segments, 3D charts, area chart pour des categories |
| 10.8 | Data density | Agreger les donnees si trop de points. Zoom pour le detail | 10 000 points visibles, graphique illisible par densite |

---

## Template — design-system.md

Ce template est utilise par le mode INIT pour generer le fichier `design-system.md` a la racine du projet. Le mode BUILD le lit et le respecte. Le mode REVIEW le compare au code.

```markdown
# Design System — [Nom du projet]
> Genere le YYYY-MM-DD | Derniere mise a jour YYYY-MM-DD

## Direction artistique
- **Tone :** [tone choisi, combinable]
- **Style :** [description courte du style visuel]
- **Differenciateur :** [l'element memorable unique]
- **Anti-patterns :** [ce qu'on evite specifiquement sur ce projet]

## Palette
| Role | Hex | Usage |
|------|-----|-------|
| Primary | #XXXX | CTA, liens, elements d'action |
| Secondary | #XXXX | Fonds, sections alternees, elements secondaires |
| Accent | #XXXX | Highlights, badges, notifications, elements de surprise |
| Neutral-900 | #XXXX | Texte principal |
| Neutral-700 | #XXXX | Texte secondaire |
| Neutral-500 | #XXXX | Texte tertiaire, placeholders |
| Neutral-200 | #XXXX | Bordures, separateurs |
| Neutral-100 | #XXXX | Fonds clairs, surfaces |
| Neutral-50 | #XXXX | Fond de page |
| Success | #XXXX | Validations, positif |
| Warning | #XXXX | Alertes, attention |
| Error | #XXXX | Erreurs, destructif |
| Info | #XXXX | Informations, neutre |

### Contraste verifie
| Paire | Ratio | Niveau |
|-------|-------|--------|
| Primary sur Secondary | X.XX:1 | AA/AAA |
| Neutral-900 sur Neutral-50 | X.XX:1 | AA/AAA |
| [autres paires critiques] | X.XX:1 | AA/AAA |

### Dark mode (si applicable)
| Role | Light | Dark |
|------|-------|------|
| Primary | #XXXX | #XXXX |
| Background | #XXXX | #XXXX |
| Surface | #XXXX | #XXXX |
| Text | #XXXX | #XXXX |

### CSS Variables
\`\`\`css
:root {
  --color-primary: #XXXX;
  --color-secondary: #XXXX;
  --color-accent: #XXXX;
  --color-neutral-900: #XXXX;
  --color-neutral-700: #XXXX;
  --color-neutral-500: #XXXX;
  --color-neutral-200: #XXXX;
  --color-neutral-100: #XXXX;
  --color-neutral-50: #XXXX;
  --color-success: #XXXX;
  --color-warning: #XXXX;
  --color-error: #XXXX;
  --color-info: #XXXX;
}
\`\`\`

## Typographie
- **Display :** [font] — titres, heros, elements de personnalite
- **Body :** [font] — texte courant, interfaces
- **Mono :** [font] — code, donnees tabulaires (si applicable)

### Type scale
| Token | Taille | Weight | Line-height | Usage |
|-------|--------|--------|-------------|-------|
| xs | 12px | 400 | 1.5 | Captions, fine print |
| sm | 14px | 400 | 1.5 | Labels, meta, texte secondaire |
| base | 16px | 400 | 1.6 | Body text |
| lg | 18px | 500 | 1.5 | Lead paragraphs |
| xl | 24px | 600 | 1.3 | H3, section titles |
| 2xl | 32px | 700 | 1.2 | H2, sections majeures |
| 3xl | 48px | 700 | 1.1 | H1, hero titles |

### CSS Variables
\`\`\`css
:root {
  --font-display: '[Display font]', serif;
  --font-body: '[Body font]', sans-serif;
  --font-mono: '[Mono font]', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 3rem;
}
\`\`\`

## Spacing & Layout
- **Base unit :** [4 ou 8]px
- **Scale :** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96
- **Max-width contenu :** [valeur]px
- **Breakpoints :** 375 / 768 / 1024 / 1440
- **Z-index :** base 0 / dropdown 10 / sticky 20 / modal 40 / toast 100 / overlay 1000

## Composants cles
[Section enrichie au fur et a mesure par le mode BUILD]
```
