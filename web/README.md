# Zemen PayLink — Next.js frontend

A pixel-exact port of the `index.html` prototype (a self-extracting bundle of a
declarative-component prototype) to Next.js 16 + TypeScript.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Layout

```
src/
  app/
    layout.tsx          root document + metadata
    page.tsx            top-level view switch (auth / dashboard / pay)
    globals.css         global rules, ported verbatim from the prototype
    fonts.css           generated @font-face for the self-hosted families
    interactions.css    generated :hover / :focus rules
  components/
    Shell.tsx           sidebar + top-nav chrome, page header, mobile scrim
    Screens.tsx         picks the dashboard screen for the current view
    Switcher.tsx        floating prototype-controls panel
    screens/*.tsx       21 screens, one file each
  lib/css.ts            parses the prototype's CSS declaration strings
  store/
    AppProvider.tsx     all UI state + derived values
    data.ts             demo dataset (merchants, links, transactions, …)
public/
  fonts/                IBM Plex Sans, IBM Plex Mono, Space Grotesk (woff2)
  zemen-logo-dark.png   full mark, dark type — for light surfaces
  zemen-logo-light.png  full mark, light type — for dark surfaces
  qr-code.png
```

## How the port keeps fidelity

The prototype styles every element with an inline CSS declaration string. Those
strings are carried over **verbatim** and parsed at render time by `s()` in
`lib/css.ts`, so no value was retyped and nothing can drift:

```tsx
<div style={s("padding:26px 30px;max-width:1260px;margin:0 auto")}>
```

`:hover` and `:focus` can't live in an inline style. The prototype compiled them
into real CSS classes, and so does this port — `interactions.css` holds one rule
per distinct declaration set, each marked `!important` so it beats the inline
base style. This is also why they cost nothing at runtime: no state, no re-render.

Fonts are self-hosted from the files the prototype bundled, registered under
their real family names (`IBM Plex Sans`, `IBM Plex Mono`, `Space Grotesk`) so
every inline `font-family` keeps resolving.

## State

`AppProvider` holds the whole prototype state machine — current view, role
(admin / merchant / sales), dashboard layout (sidebar / top nav), create-link
flow (wizard / quick form), wizard step, pay-page variant, filters and every
form field — and exposes the derived values each screen reads through `useApp()`.

Navigation is client-side view state rather than routes, matching the prototype.
Splitting the views into real routes is the natural next step and is independent
of the visual work.

In development only, `window.__pay` exposes `{ state, setState }` so any screen
can be jumped to from the console. It is stripped from production builds.

## Talking to the Go API

`lib/api.ts` is the typed client, `store/SessionProvider.tsx` holds the signed-in
session (token in `localStorage`, restored on reload), and `store/live.ts` adapts
API records into the shapes the screens already render — which is why the
generated screens needed almost no edits to go live.

`AppProvider` decides per value whether to serve demo data or the API: when a
sales operator is signed in, `links`, `linksList`, `txns`, `activeLink` and the
create/share actions come from the server. Other roles still read
`store/data.ts`.

Routes added on top of the ported prototype:

| Route | Purpose |
|---|---|
| `/` | the portal (auth, dashboards, create/share) |
| `/l/[slug]` | public pay page; launches MPGS Hosted Checkout |
| `/l/[slug]/return` | where the gateway sends the payer; shows the reconciled result |

The browser calls `/api/v1/*` on its **own origin**; `next.config.ts` rewrites
that to the Go API. So the portal works unchanged on localhost, a LAN address or
a tunnel, only port 3000 needs exposing, and there is no CORS to configure.

| Variable | Where | Purpose |
|---|---|---|
| `PAYLINK_API_UPSTREAM` | web (server) | where to proxy the API, default `http://localhost:8080` |
| `PAYLINK_DEV_ORIGINS` | web (server) | extra hosts allowed by `next dev`; local IPs are added automatically |
| `NEXT_PUBLIC_API_BASE_URL` | web (browser) | bypass the proxy and call the API directly |
| `PAYLINK_PUBLIC_BASE_URL` | api | the externally reachable portal URL; forms shareable links and the gateway return URL |

See *Testing from another machine* in the root README.
