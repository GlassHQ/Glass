# REFERENCES review → `@glass/ui`

Static HTML prototypes in `REFERENCES/` share a coherent system:

| File | Role |
|------|------|
| `glass-app.html` | Product UI shell: nav, hero, **semantic CSS variables** (`--bg`, `--text`, `--ice`, …), **`.btn-cta`**, **`.nav-btn`**, **`.btn-text`**, proof/caption sizes. |
| `glass-waitlist.html` | Waitlist scenes: **DM Serif** wordmark + **DM Mono** UI, **`.btn`** (submit) and theme pairs **dark / light / holo / foil**; light inverse button (`#09090f` on `#f0eff8`). |
| `glass-explore.html` | Logo grid; reinforces **serif wordmark** sizing and **light/dark** quadrant backgrounds. |

**Fonts:** Google Fonts — `DM Serif Display` (italic wordmark / display), `DM Mono` (300/400/500) for UI and body.

**Mapped into this package**

- `src/styles/tokens.css` — core variables + `.glass-theme-light` for light surfaces.
- `Button` variants — `cta`, `submit`, `inverse`, `outline`, `text` (see `src/components/Button.tsx`).
