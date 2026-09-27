# Design Trends 2026 — Patterns des meilleurs sites web

Patterns extraits de 40+ sites primes Awwwards, CSSDA, Webby Awards 2025-2026.
**Charger ce fichier en mode INIT et BUILD** pour produire des interfaces memorables et actuelles. S'applique a tout type de projet : landing pages, apps, dashboards, sites vitrines, e-commerce, portfolios.

---

## 1. Typographie — Le texte EST le hero

La tendance dominante 2026 : le texte remplace l'image hero. Headline massive avec animation ou gradient text.

### Fluid type avec clamp()

Remplace les breakpoints rigides pour les tailles de texte :

```css
h1 { font-size: clamp(2.5rem, 8vw + 1rem, 7.5rem); line-height: 0.95; letter-spacing: -0.02em; }
h2 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; }
h3 { font-size: clamp(1.5rem, 3vw, 2.25rem); }
body { font-size: clamp(1rem, 1.2vw, 1.125rem); }
```

### Serif revival

Les serifs avec twist moderne reviennent en force contre le "blanding" sans-serif. Pairings valides 2026 :

| Display (serif) | Body | Mood | Vu sur |
|---|---|---|---|
| DM Serif Display | Inter | Editorial-meets-tech | SaaS premium |
| Playfair Display | Lato | Luxe, lifestyle | Finance privee, consulting |
| Instrument Serif | Instrument Sans | Editorial contemporain | Portfolios, media |
| Young Serif | Plus Jakarta Sans | Warm modern | Retail, communaute |

### Gradient text (hero headlines)

```css
.gradient-text {
  background: linear-gradient(135deg, #6366F1, #A855F7, #22D3EE);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Variable fonts

Un seul fichier remplace des dizaines de variantes. Meilleur LCP.

```css
.heading {
  font-family: 'Inter', sans-serif;
  font-variation-settings: 'wght' 700, 'opsz' 48;
}
.heading:hover {
  font-variation-settings: 'wght' 900, 'opsz' 48;
  transition: font-variation-settings 0.3s ease;
}
```

---

## 2. Couleurs — Dark premium + jewel tones

### Palette Dark Premium (le standard SaaS 2026)

| Role | Hex | Note |
|------|-----|------|
| Background | `#0A0A0B` | Jamais `#000000` pur (trop agressif) |
| Surface | `#121214` | Cards, sections alternees |
| Surface elevated | `#1A1A1F` | Modals, dropdowns |
| Border | `#2A2A30` | Separateurs subtils |
| Text primary | `#FAFAFA` | Headlines |
| Text secondary | `#A1A1AA` | Body, descriptions |
| Accent primary | `#6366F1` | CTA, liens (indigo) |
| Accent hover | `#818CF8` | Plus clair en dark mode |
| Accent glow | `rgba(99, 102, 241, 0.15)` | Glow derriere boutons |

References : Linear, Vercel, Raycast.

### Palette Warm Premium (consulting, fintech)

| Role | Hex | Note |
|------|-----|------|
| Background | `#FDFBF7` | Surface claire chaude |
| Surface | `#F5F0EB` | Cards |
| Text primary | `#1A1A1A` | Headlines |
| Text secondary | `#6B6B6B` | Body |
| Accent | `#B87333` | Cuivre/copper — CTA |
| Accent dark | `#4E342E` | Chocolate brown |
| Subtle | `#4A635D` | Smokey jade — badges |

### Mesh Gradient (remplace les degrade lineaires plats)

```css
.mesh-gradient-bg {
  background-color: #0A0A0B;
  background-image:
    radial-gradient(at 20% 30%, rgba(99, 102, 241, 0.3) 0%, transparent 50%),
    radial-gradient(at 80% 20%, rgba(168, 85, 247, 0.25) 0%, transparent 50%),
    radial-gradient(at 50% 80%, rgba(34, 211, 238, 0.2) 0%, transparent 50%);
}
```

### Aurora Gradient (hero backgrounds)

```css
.aurora-bg {
  background-color: #0A0A0B;
  background-image:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 70% 20%, rgba(168, 85, 247, 0.3) 0%, transparent 70%),
    radial-gradient(ellipse 50% 60% at 50% 70%, rgba(34, 211, 238, 0.25) 0%, transparent 70%);
  filter: blur(40px);
  animation: aurora-shift 8s ease-in-out infinite alternate;
}
@keyframes aurora-shift {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-20px) scale(1.05); }
}
@media (prefers-reduced-motion: reduce) { .aurora-bg { animation: none; } }
```

### Glow CTA Button

```css
.cta-glow {
  background: var(--color-primary);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.4), 0 0 60px rgba(99, 102, 241, 0.2);
  transition: box-shadow 0.3s ease;
}
.cta-glow:hover {
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.6), 0 0 80px rgba(99, 102, 241, 0.3);
}
```

---

## 3. Animations — Techniques 2026

### 3a. CSS Scroll-Driven Animations (zero JS)

Le standard 2026 pour les reveals simples. GPU-only, performant.

```css
/* Progress bar liee au scroll */
.progress-bar {
  position: fixed; top: 0; left: 0; width: 100%; height: 4px;
  background: var(--color-primary);
  transform-origin: left;
  animation: grow-progress linear;
  animation-timeline: scroll(root block);
}
@keyframes grow-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* Reveal au scroll (viewport entry) */
.reveal-card {
  animation: fade-slide-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Support : Chrome 115+, Edge 115+. Safari/Firefox en cours. Fallback avec Intersection Observer.

### 3b. Stagger reveals (vanilla JS fallback)

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
```
```css
[data-reveal] { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
[data-reveal].is-visible { opacity: 1; transform: translateY(0); }
/* Stagger via CSS */
[data-reveal]:nth-child(2) { transition-delay: 0.1s; }
[data-reveal]:nth-child(3) { transition-delay: 0.2s; }
[data-reveal]:nth-child(4) { transition-delay: 0.3s; }
```

### 3c. Text reveal par clip-path

```css
.text-reveal {
  clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%);
  transition: clip-path 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.text-reveal.is-visible {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}
```

### 3d. Magnetic buttons (desktop only)

```js
document.querySelectorAll('.magnetic-btn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    btn.style.transform = 'translate(0, 0)';
    setTimeout(() => btn.style.transition = '', 500);
  });
});
```

A utiliser sur : CTA principaux, navigation. A eviter sur : mobile (pas de hover), petits boutons rapproches.

### 3e. Counter anime (stats/social proof)

```js
function animateCounter(el) {
  const target = +el.dataset.count;
  const duration = 2000;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(progress * target).toLocaleString('fr-FR');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
```

### Stack animation recommande par type de projet

| Projet | Stack recommande |
|---|---|
| SaaS landing (React/Next) | Motion (Framer) + CSS scroll-driven + View Transitions |
| Site vitrine creatif | GSAP + ScrollTrigger + Lenis + SplitText |
| Portfolio/agence (Awwwards) | Three.js/R3F + GSAP + Lenis + shaders custom |
| E-commerce product page | GSAP ScrollTrigger (pin/scrub) + micro-interactions CSS |
| Blog/contenu SEO | CSS scroll-driven animations uniquement (zero heavy JS) |
| WordPress | CSS @keyframes + Intersection Observer (zero dependance) |

---

## 4. Layouts — Patterns dominants

### 4a. Bento Grid (67% des top SaaS)

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  grid-auto-flow: dense;
}
.bento-card { background: var(--color-neutral-100); border-radius: var(--radius-lg, 16px); padding: 2rem; }
.bento-card--wide { grid-column: span 2; }
.bento-card--tall { grid-row: span 2; }

@media (max-width: 768px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-card--wide, .bento-card--tall { grid-column: span 1; grid-row: span 1; }
}
```

Ideal pour : pages features, dashboards, "comment ca marche".
A eviter sur : landing pages a action unique, audiences agees.

### 4b. Hero Split Asymetrique

```css
.hero {
  display: grid;
  grid-template-columns: 55fr 45fr;
  align-items: center;
  min-height: 80vh;
  gap: 2rem;
  padding: 4rem 5%;
}
@media (max-width: 768px) {
  .hero { grid-template-columns: 1fr; min-height: auto; text-align: center; }
  .hero__visual { order: -1; }
}
```

Headline < 8 mots (44 caracteres max) pour meilleures performances.

### 4c. Scroll Storytelling (sticky + steps)

```css
.story-section { display: grid; grid-template-columns: 1fr 1fr; }
.story-section__sticky {
  position: sticky; top: 0; height: 100vh;
  display: flex; align-items: center;
}
.step { min-height: 80vh; display: flex; align-items: center; opacity: 0.3; transition: opacity 0.5s; }
.step.is-active { opacity: 1; }
```

Ideal pour : produits complexes, case studies, storytelling de marque.
A eviter sur : pages a conversion rapide, e-commerce impulse.

---

## 5. Social Proof — Patterns en couches

### 5a. Logo Bar defilante

```css
.logo-bar__track {
  display: flex; gap: 3rem;
  animation: scroll-logos 30s linear infinite;
}
.logo-bar__track img {
  height: 32px;
  filter: grayscale(1) opacity(0.6);
  transition: filter 0.3s;
}
.logo-bar__track img:hover { filter: none; }
@keyframes scroll-logos { to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .logo-bar__track { animation: none; } }
```

Placement : juste sous le hero.

### 5b. Temoignage Card

```html
<div class="testimonial-card">
  <blockquote>"Citation courte et specifique."</blockquote>
  <div class="testimonial-author">
    <img src="photo.jpg" alt="" class="avatar" width="40" height="40" />
    <div><strong>Nom</strong><span>Poste, Entreprise</span></div>
  </div>
  <div class="testimonial-metric">+47% de conversions</div>
</div>
```

Toujours inclure : photo reelle, nom complet, poste, entreprise, resultat mesurable.

### 5c. Stats animees

```html
<section class="social-stats">
  <div class="stat">
    <span class="stat__number" data-count="12847">0</span>
    <span>Utilisateurs actifs</span>
  </div>
</section>
```

Utiliser le counter anime (section 3e) declenche par Intersection Observer.

---

## 6. CTA — Patterns de conversion

### 6a. CTA Sticky Mobile (quasi obligatoire 2026)

```css
.sticky-cta {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  z-index: 100;
  display: none;
}
@media (max-width: 768px) { .sticky-cta { display: block; } }
```

### 6b. CTA avec micro-preuve sociale

```html
<div class="cta-block">
  <button class="btn btn--primary">Demarrer gratuitement</button>
  <div class="cta-proof">
    <div class="avatar-stack"><!-- 4-5 photos reelles --></div>
    <span>Rejoint par 847 entreprises ce mois</span>
  </div>
</div>
```

### 6c. Couleurs CTA par secteur

| Couleur | CTR moyen | Meilleur secteur |
|---------|-----------|-----------------|
| Orange | 6.8% | General, SaaS |
| Vert | 5.2% | Tech, electronics |
| Noir | 4.9% | Mode, luxe |
| Bleu | 4.1% | Finance, sante |

---

## 7. Structure type — Landing page 2026

Ordre optimal des sections :

```
1. Hero (split asymetrique + CTA + micro social proof)
2. Logo bar (confiance immediate)
3. Probleme/Solution (scrollytelling ou bento)
4. Features (bento grid 3-4 blocs)
5. Social proof (temoignages cards)
6. How it works (3 etapes + visuel)
7. Pricing (3 tiers + toggle mensuel/annuel)
8. FAQ (accordeon natif details/summary)
9. CTA final (repete le hero CTA)
10. Footer minimal
```

**Principes transversaux :**
- Une action par ecran visible
- F-pattern pour le texte, Z-pattern pour le visuel
- Mobile : CTA sticky permanent en bas
- LCP < 2.5s, pas d'animation bloquante
- Headline hero < 8 mots

---

## 8. Dark Mode — Regles 2026

82.7% des utilisateurs ont le dark mode active. C'est le defaut de fait pour le SaaS.

```css
:root {
  --bg-primary: #FDFBF7;
  --bg-surface: #F5F0EB;
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --accent: #6366F1;
  --border: #E5E4E2;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0A0A0B;
    --bg-surface: #121214;
    --text-primary: #FAFAFA;
    --text-secondary: #A1A1AA;
    --accent: #818CF8; /* plus clair pour conserver le contraste */
    --border: #2A2A30;
  }
}
```

**Regles :**
- Jamais `#000000` pur → utiliser `#0A0A0B` ou `#121212`
- 3 niveaux de surface : bg, surface, elevated
- L'accent DOIT etre plus clair en dark mode
- `prefers-color-scheme` comme standard, toggle manuel en complement
