# Component Patterns — Reference library

Patterns de composants courants, adaptables au design system du projet. Chaque pattern utilise les CSS variables du `design-system.md`. Adapter les classes/tokens selon la stack (Tailwind, CSS Modules, vanilla CSS).

**Usage :** Lire ce fichier en mode BUILD quand un composant courant est demande. Ne pas copier-coller tel quel — adapter au design system et au tone du projet.

---

## 1. Button

```html
<button class="btn btn--primary" type="button">
  <span class="btn__label">Action</span>
</button>
```

**Variantes :** primary, secondary, ghost, danger, disabled
**Structure CSS :**
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: transform 200ms ease-out, opacity 200ms ease-out;
  min-height: 44px; /* touch target */
  min-width: 44px;
}
.btn:active { transform: scale(0.97); }
.btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.btn--primary { background: var(--color-primary); color: #fff; }
.btn--secondary { background: var(--color-neutral-100); color: var(--color-neutral-900); }
.btn--ghost { background: transparent; color: var(--color-primary); border: 1px solid var(--color-neutral-200); }
.btn--danger { background: var(--color-error); color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
```

---

## 2. Card

```html
<article class="card">
  <img class="card__image" src="..." alt="..." loading="lazy" width="400" height="250">
  <div class="card__body">
    <h3 class="card__title">Titre</h3>
    <p class="card__text">Description courte</p>
    <a class="card__link" href="#">En savoir plus</a>
  </div>
</article>
```

**Structure CSS :**
```css
.card {
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
.card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.card__image { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
.card__body { padding: 24px; }
.card__title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; margin: 0 0 8px; }
.card__text { font-size: var(--text-base); color: var(--color-neutral-700); margin: 0 0 16px; }
```

---

## 3. Modal / Dialog

```html
<dialog class="modal" aria-labelledby="modal-title">
  <div class="modal__header">
    <h2 id="modal-title" class="modal__title">Titre</h2>
    <button class="modal__close" aria-label="Fermer" type="button">&times;</button>
  </div>
  <div class="modal__body">
    <!-- contenu -->
  </div>
  <div class="modal__footer">
    <button class="btn btn--ghost" type="button">Annuler</button>
    <button class="btn btn--primary" type="button">Confirmer</button>
  </div>
</dialog>
```

**Structure CSS :**
```css
.modal {
  border: none;
  border-radius: var(--radius-lg, 12px);
  padding: 0;
  max-width: 560px;
  width: calc(100% - 32px);
  box-shadow: 0 24px 48px rgba(0,0,0,0.16);
}
.modal::backdrop { background: rgba(0,0,0,0.5); }
.modal__header { display: flex; justify-content: space-between; align-items: center; padding: 24px 24px 0; }
.modal__close { background: none; border: none; font-size: 24px; cursor: pointer; min-height: 44px; min-width: 44px; }
.modal__body { padding: 16px 24px 24px; }
.modal__footer { display: flex; justify-content: flex-end; gap: 12px; padding: 0 24px 24px; }
```

**Regles :**
- Utiliser l'element `<dialog>` natif (showModal/close)
- Focus trap automatique avec dialog natif
- Fermeture sur Escape (natif) et clic sur backdrop
- z-index: var(--z-modal, 40)

---

## 4. Toast / Notification

```html
<div class="toast toast--success" role="alert" aria-live="polite">
  <span class="toast__icon" aria-hidden="true">&#10003;</span>
  <span class="toast__message">Action realisee avec succes</span>
  <button class="toast__dismiss" aria-label="Fermer">&times;</button>
</div>
```

**Structure CSS :**
```css
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  animation: toast-in 300ms ease-out;
  min-height: 44px;
}
.toast--success { background: var(--color-success); color: #fff; }
.toast--error { background: var(--color-error); color: #fff; }
.toast--warning { background: var(--color-warning); color: var(--color-neutral-900); }
.toast--info { background: var(--color-info); color: #fff; }
@keyframes toast-in { from { transform: translateY(16px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
```

**Regles :**
- Auto-dismiss apres 3-5s (sauf action annulable)
- Position fixe : bottom-right desktop, bottom-center mobile
- z-index: var(--z-toast, 100)
- role="alert" + aria-live="polite"

---

## 5. Navigation Bar

```html
<header class="navbar">
  <a class="navbar__brand" href="/" aria-label="Accueil">Logo</a>
  <nav class="navbar__nav" aria-label="Navigation principale">
    <ul class="navbar__list">
      <li><a class="navbar__link navbar__link--active" href="/" aria-current="page">Accueil</a></li>
      <li><a class="navbar__link" href="/about">A propos</a></li>
      <li><a class="navbar__link" href="/contact">Contact</a></li>
    </ul>
  </nav>
  <button class="navbar__toggle" aria-label="Menu" aria-expanded="false" type="button">
    <span class="navbar__hamburger"></span>
  </button>
</header>
```

**Regles :**
- Desktop : horizontal, liens visibles
- Mobile (< 768px) : hamburger → drawer/overlay
- aria-current="page" sur le lien actif
- aria-expanded sur le bouton hamburger
- Skip link AVANT la navbar

---

## 6. Form Field

```html
<div class="field">
  <label class="field__label" for="email">Adresse email</label>
  <input class="field__input" type="email" id="email" name="email"
         autocomplete="email" placeholder="jean.dupont@email.com"
         aria-describedby="email-error" aria-invalid="false">
  <span class="field__error" id="email-error" role="alert"></span>
  <span class="field__hint">Nous ne partagerons jamais votre email</span>
</div>
```

**Structure CSS :**
```css
.field { display: flex; flex-direction: column; gap: 4px; }
.field__label { font-size: var(--text-sm); font-weight: 500; color: var(--color-neutral-900); }
.field__input {
  padding: 12px 16px;
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md, 8px);
  font-size: var(--text-base); /* >= 16px pour eviter zoom iOS */
  font-family: var(--font-body);
  transition: border-color 150ms ease-out;
  min-height: 44px;
}
.field__input:focus { border-color: var(--color-primary); outline: 2px solid var(--color-primary); outline-offset: -2px; }
.field__input[aria-invalid="true"] { border-color: var(--color-error); }
.field__error { font-size: var(--text-sm); color: var(--color-error); min-height: 20px; }
.field__hint { font-size: var(--text-xs); color: var(--color-neutral-500); }
```

**Regles :**
- Label TOUJOURS visible (pas placeholder-only)
- Validation on blur, pas on change
- Erreur : [probleme] + [comment corriger]
- autocomplete sur chaque champ pertinent
- font-size >= 16px (anti-zoom iOS)

---

## 7. Table / Data Grid

```html
<div class="table-wrapper" role="region" aria-label="Donnees employes" tabindex="0">
  <table class="table">
    <thead>
      <tr>
        <th scope="col">Nom</th>
        <th scope="col">Email</th>
        <th scope="col" class="table__num">Score</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Jean Dupont</td>
        <td>jean@example.com</td>
        <td class="table__num">95</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Structure CSS :**
```css
.table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.table th { text-align: left; font-weight: 600; padding: 12px 16px; border-bottom: 2px solid var(--color-neutral-200); }
.table td { padding: 12px 16px; border-bottom: 1px solid var(--color-neutral-100); }
.table tbody tr:hover { background: var(--color-neutral-50); }
.table__num { text-align: right; font-variant-numeric: tabular-nums; }
```

**Regles :**
- scope="col" sur les th
- Wrapper scrollable horizontalement sur mobile
- tabular-nums sur les colonnes numeriques
- Virtualiser si > 50 lignes

---

## 8. Empty State

```html
<div class="empty-state">
  <div class="empty-state__icon" aria-hidden="true"><!-- SVG ou icone --></div>
  <h3 class="empty-state__title">Pas encore d'employes inscrits</h3>
  <p class="empty-state__text">Ajoutez le premier pour demarrer le parcours d'onboarding.</p>
  <button class="btn btn--primary empty-state__cta" type="button">Ajouter un employe</button>
</div>
```

**Structure CSS :**
```css
.empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; gap: 16px; }
.empty-state__icon { font-size: 48px; color: var(--color-neutral-500); }
.empty-state__title { font-family: var(--font-display); font-size: var(--text-xl); }
.empty-state__text { font-size: var(--text-base); color: var(--color-neutral-700); max-width: 40ch; }
```

**Regles :**
- TOUJOURS : titre + explication + CTA
- Jamais un ecran vide sans explication

---

## 9. Skeleton Loader

```html
<div class="skeleton" aria-busy="true" aria-label="Chargement en cours">
  <div class="skeleton__line skeleton__line--title"></div>
  <div class="skeleton__line"></div>
  <div class="skeleton__line"></div>
  <div class="skeleton__line skeleton__line--short"></div>
</div>
```

**Structure CSS :**
```css
.skeleton__line {
  height: 16px;
  background: linear-gradient(90deg, var(--color-neutral-100) 25%, var(--color-neutral-50) 50%, var(--color-neutral-100) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}
.skeleton__line--title { height: 24px; width: 60%; }
.skeleton__line--short { width: 40%; }
@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton__line { animation: none; } }
```

---

## 10. Tabs

```html
<div class="tabs">
  <div class="tabs__list" role="tablist" aria-label="Sections">
    <button class="tabs__tab tabs__tab--active" role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">Onglet 1</button>
    <button class="tabs__tab" role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" tabindex="-1">Onglet 2</button>
  </div>
  <div class="tabs__panel" role="tabpanel" id="panel-1" aria-labelledby="tab-1">
    Contenu onglet 1
  </div>
  <div class="tabs__panel" role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
    Contenu onglet 2
  </div>
</div>
```

**Regles :**
- Navigation clavier : fleches gauche/droite entre tabs
- tabindex="-1" sur les tabs inactifs
- aria-selected + aria-controls
- Un seul panel visible a la fois

---

## 11. Accordion / FAQ

```html
<div class="accordion">
  <details class="accordion__item">
    <summary class="accordion__trigger">Question frequente ?</summary>
    <div class="accordion__content">
      <p>Reponse detaillee ici.</p>
    </div>
  </details>
</div>
```

**Structure CSS :**
```css
.accordion__trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
  min-height: 44px;
  border-bottom: 1px solid var(--color-neutral-200);
}
.accordion__trigger::-webkit-details-marker { display: none; }
.accordion__content { padding: 0 0 16px; color: var(--color-neutral-700); }
```

**Regles :**
- Utiliser `<details>/<summary>` natif (zero JS)
- Ideal pour WordPress (pas de JS inline)
- Accessible nativement (clavier + screen reader)

---

## 12. Badge / Tag

```html
<span class="badge badge--success">Actif</span>
<span class="badge badge--warning">En attente</span>
<span class="badge badge--error">Expire</span>
```

**Structure CSS :**
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1.5;
}
.badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
.badge--warning { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
.badge--error { background: color-mix(in srgb, var(--color-error) 15%, transparent); color: var(--color-error); }
```

**Regles :**
- Couleur + texte (jamais couleur seule pour le sens)
- Verifier contraste du texte sur le fond teinte

---

## 13. Breadcrumbs

```html
<nav aria-label="Fil d'ariane">
  <ol class="breadcrumbs">
    <li class="breadcrumbs__item"><a href="/">Accueil</a></li>
    <li class="breadcrumbs__item"><a href="/products">Produits</a></li>
    <li class="breadcrumbs__item" aria-current="page">Detail produit</li>
  </ol>
</nav>
```

**Structure CSS :**
```css
.breadcrumbs { display: flex; flex-wrap: wrap; gap: 4px; list-style: none; padding: 0; font-size: var(--text-sm); }
.breadcrumbs__item + .breadcrumbs__item::before { content: "/"; margin-right: 4px; color: var(--color-neutral-500); }
.breadcrumbs__item a { color: var(--color-primary); text-decoration: underline; }
.breadcrumbs__item[aria-current="page"] { color: var(--color-neutral-700); }
```

---

## 14. Avatar

```html
<div class="avatar avatar--md">
  <img src="..." alt="Jean Dupont" width="40" height="40">
</div>
<!-- Fallback sans image -->
<div class="avatar avatar--md avatar--fallback" aria-label="Jean Dupont">JD</div>
```

**Structure CSS :**
```css
.avatar { border-radius: 50%; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar--sm { width: 32px; height: 32px; font-size: var(--text-xs); }
.avatar--md { width: 40px; height: 40px; font-size: var(--text-sm); }
.avatar--lg { width: 56px; height: 56px; font-size: var(--text-base); }
.avatar--fallback { background: var(--color-primary); color: #fff; font-weight: 600; }
```

---

## 15. Progress / Stepper

```html
<div class="stepper" role="group" aria-label="Progression : etape 2 sur 4">
  <div class="stepper__step stepper__step--done">
    <span class="stepper__indicator">&#10003;</span>
    <span class="stepper__label">Informations</span>
  </div>
  <div class="stepper__step stepper__step--active" aria-current="step">
    <span class="stepper__indicator">2</span>
    <span class="stepper__label">Verification</span>
  </div>
  <div class="stepper__step">
    <span class="stepper__indicator">3</span>
    <span class="stepper__label">Confirmation</span>
  </div>
</div>
```

**Structure CSS :**
```css
.stepper { display: flex; align-items: center; gap: 0; }
.stepper__step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
.stepper__indicator {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: var(--text-sm);
  background: var(--color-neutral-100); color: var(--color-neutral-500);
}
.stepper__step--done .stepper__indicator { background: var(--color-success); color: #fff; }
.stepper__step--active .stepper__indicator { background: var(--color-primary); color: #fff; }
.stepper__label { font-size: var(--text-xs); margin-top: 4px; }
```
