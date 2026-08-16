# AI usage

This file records how AI was used while building the Careflow SPA, and which decisions stayed human.
The assignment asks for it — the product was not generated unattended.

**Tool:** [Cursor](https://cursor.com) with Grok 4.6, in an agentic session against this repository and the companion API ([careflow-api](https://github.com/bhavesh149/careflow-api)).
**Human:** product intent, Stitch/Figma references, AWS account, S3 deploy, review of generated UI, and every override of a weaker suggestion.

---

## What AI was used for

- Scaffolding the Vite + React 19 + TypeScript SPA on top of the API contract.
- Auth session (access token in memory, refresh cookie locally), hold countdown, booking/confirm, recurring series, therapist diary and schedule editor.
- Visual system from the Stitch / Figma references (tokens, therapist cards, booking calendar).
- Responsive layout, dialogs, logout, and S3 deploy wiring.

AI did not hold AWS credentials. Deploys used the human’s `careflow` profile after review.

---

## Exact prompts (as typed)

Typos left as-is.

### 1. Start the SPA from the Vite scratch app

> cool, now lets check the frontend folder, we have react vite scratch setup. Lets update the theme with the above colors and start with required implementation for the careflow app. but before that lets check that stich mcp server are you able to access it or what steps needs to do for it.

**What followed:** Stitch MCP was not authenticated in that session, so tokens were taken from the screenshot / design reference instead of blocking on the plugin. Then the booking, auth, and therapist screens were implemented against the live API.

### 2. Therapist cards from a design screenshot

> check this figma design can you add a dummy metadata for the theraapist for the frotnend only, with randowm image as well.Also make this UI more cleaner for card as descirbed in image.

**What followed:** Frontend-only showcase metadata (photo, rating, tags, next available) mapped onto seeded therapists. Cards were restyled to match the reference; “View Availability” sits at the bottom of a consistent-height card.

### 3. Booking layout and heading rhythm

> still this page is not resposnive.
> CHeck the spacing for heading and sub heading for all the pages, it looks very tight.

**What followed:** Desktop booking (calendar + slots) was gated too high (`960px`), so a laptop with DevTools open looked like a phone. Breakpoints were lowered and heading/subheading spacing was opened up on every page.

### 4. Logout on a phone, and token lifetime

> check this logut pop up on small device, nothing is showing to logout.
> And check the abckend when user logout, does this token expiring or not, it should not have access when logout.

**What followed:** The confirm dialog was `position: fixed` inside a top bar with `backdrop-filter`, so buttons were clipped. It now portals to `document.body`. Logout already revoked the refresh family; the API was changed so the access JWT for that session is refused immediately as well.

---

## Technical decisions discussed with AI

### Hold timer source of truth

- **Recommended (easy default):** `setTimeout(60000)` in the browser.
- **Implemented:** persist the hold id, then countdown from `expiresAt` using `serverTime` so a refresh does not invent a new minute.
- **Trade-off:** one extra `GET /holds/active` on load. Correctness is worth it.

### Idempotent confirm

- **Recommended:** retry the POST and hope the server is smart.
- **Implemented:** a stable `Idempotency-Key` per booking intent in `localStorage`, reused until success or a new slot.
- **Trade-off:** keys must be cleared after success so a later booking is a new intent.

### Logout dialog

- **Recommended:** keep the modal as a sibling of the button.
- **Implemented:** `createPortal(..., document.body)` after the top-bar clip bug.
- **Trade-off:** none that matter; this is how overlays should work next to `backdrop-filter`.

### Cross-origin refresh cookie (S3 → ALB)

- **Recommended:** `SameSite=None; Secure` so refresh works on the live site.
- **Implemented:** left `SameSite=Lax`. Both sides are HTTP, so `Secure` cookies would not stick. Live demo uses the 15-minute access token; local Vite proxy keeps refresh.
- **Trade-off:** reviewers on the S3 URL sign in again after 15 minutes. HTTPS on both sides is the real fix.

---

## Incorrect or weak suggestions that were rejected

1. **Treating DevTools-narrow as “desktop anyway.”** A 960px desktop breakpoint made the booking page look broken on a normal laptop. The layout now switches at 768px / 1024px.
2. **Leaving the access JWT valid until expiry after logout.** Fine for a pure stateless JWT, not for “log out means no access.” Session liveness is checked on the API.
3. **Putting the production API URL in a committed `.env.production`.** Build-time config is copied from `.env.example` locally; populated env files stay gitignored.

---

## How output was validated

- Manual flows: hold → countdown → refresh → confirm; recurring conflict; cancel instance vs series; therapist status in-window.
- Network tab against the local three-replica API (`localhost:8080`) and the deployed ALB.
- Logout after the session-revoke change: `/v1/me` with the old Bearer token returns 401.
