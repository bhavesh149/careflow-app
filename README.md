# Careflow

React SPA for booking therapy appointments: browse therapists, hold a slot for 60 seconds, confirm a one-time or recurring series, and manage bookings. Therapists run a diary and weekly schedule.

Companion API: [careflow-api](https://github.com/bhavesh149/careflow-api)

| | |
| --- | --- |
| **Live demo** | [http://careflow-web-853184314326.s3-website.ap-south-1.amazonaws.com](http://careflow-web-853184314326.s3-website.ap-south-1.amazonaws.com) |
| **API** | [http://carefl-alb16-n1msowftsytk-1345249308.ap-south-1.elb.amazonaws.com](http://carefl-alb16-n1msowftsytk-1345249308.ap-south-1.elb.amazonaws.com) |
| **Swagger** | […/docs](http://carefl-alb16-n1msowftsytk-1345249308.ap-south-1.elb.amazonaws.com/docs) |
| **AI usage** | [`AI_USAGE.md`](AI_USAGE.md) |

Password for every seeded account: `Careflow!2026`

| Email | Role |
| --- | --- |
| `patient@careflow.test` | Patient |
| `patient2@careflow.test` | Patient |
| `dr.mehta@careflow.test` | Therapist |
| `dr.rao@careflow.test` | Therapist |

The live site talks to the API over HTTP (S3 website + ALB). After about 15 minutes you sign in again: the refresh cookie is `SameSite=Lax` and is not sent cross-site. Local `npm run dev` keeps the full cookie refresh flow.

---

## What the app does

**Patient** — find a therapist, pick a derived slot, hold it (countdown against server time, survives refresh), confirm as one-time or daily / weekly / bi-weekly / monthly. Cancel a visit, one occurrence, or a whole series.

**Therapist** — agenda for a day, mark completed / no-show in the session window, cancel future visits, edit weekly hours without touching existing bookings.

Slots are never pre-seeded. The API expands the therapist’s schedule and subtracts booked, held, and recurring time.

---

## Challenges and approach

| Challenge | Approach |
| --- | --- |
| Hold must stay exclusive across three API tasks | Hold is a Postgres row with a GiST exclusion, not React state. The SPA only displays `expiresAt` vs `serverTime`. |
| Client clocks lie | Remaining time is `expiresAt - serverTime`, not `Date.now()` alone. |
| Confirm retries on a flaky network | `Idempotency-Key` is stored per intent (`localStorage`) and reused until the server completes. |
| Recurring clashes | Series create is all-or-nothing. The UI surfaces `RECURRING_CONFLICT` dates instead of booking a partial series. |
| Logout on a phone | Confirm dialogs portal to `document.body`. A `fixed` overlay inside the blurred top bar was clipped. |
| Logout must kill access immediately | API revokes the refresh family **and** refuses the access JWT for that session id. The SPA clears memory and the query cache. |

Backend concurrency, idempotency, and the three-task topology are documented in the [API README](https://github.com/bhavesh149/careflow-api#readme).

---

## Run locally

Needs Node 22+ and the API on `http://localhost:8080` (`make up` in [careflow-api](https://github.com/bhavesh149/careflow-api)).

```bash
cp .env.example .env.development   # empty VITE_API_BASE_URL → Vite proxies /v1
npm ci
npm run dev                        # http://localhost:5173
```

`.env`, `.env.development`, and `.env.production` are gitignored. Only `.env.example` is committed.

---

## Deploy

Vite bakes `VITE_API_BASE_URL` in at **build** time. For S3:

```bash
cp .env.example .env.production
# set VITE_API_BASE_URL to the ALB origin (no trailing slash)
export AWS_PROFILE=careflow
npm run deploy:s3
```

Steps: [`docs/01-s3-deploy.md`](docs/01-s3-deploy.md).
