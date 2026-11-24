# Dynamic Legal Policies & Compliance

WebNook ships with a built-in dynamic **Terms & Conditions** (`/terms`) and **Privacy Policy** (`/privacy`) engine tailored automatically for every self-hosted instance.

## Dynamic Document Generation

`GET /api/legal/documents` generates structured sections in real time from your instance configuration:
- **Branding & Canonical Identity:** Reflects `app_name`, `logo_url`, and `site_url`.
- **Operator Metadata:** Uses your configured **Operator / Organization Name**, **Privacy & Legal Contact Email** (`mailto:` link), **Governing Jurisdiction**, and **Minimum Age Requirement** (default `13`).
- **Active Integrations Disclosure:** Automatically documents only integrations currently enabled on your instance (e.g., SMTP email delivery, Spotify, TMDB, Steam, or local storage/backups).
- **Custom Addenda:** Optional **Custom Terms Addendum** and **Custom Privacy Addendum** fields let instance owners append community rules or hosting region notes.

## Mandatory Acceptance Gate & Versioning

- **Registration Requirement:** New users must confirm the instance minimum age and accept the active legal policy version (`accepted_terms: true`) before `POST /api/auth/register` creates an account. An inline preview modal lets users inspect both documents without losing form input.
- **Existing User Gate:** When an existing install upgrades to `v3.4.0+` or an administrator clicks **Publish New Policy Version & Re-Prompt Users** (`POST /api/admin/legal/bump-version`), all other accounts with an outdated `terms_accepted_version` are blocked in both:
  - **API Middleware:** Protected endpoints return `403 TERMS_ACCEPTANCE_REQUIRED` (exempting `/api/auth/me`, `/api/auth/accept-terms`, and `/api/auth/logout`).
  - **UI Gate:** A non-dismissible full-screen `TermsAcceptanceGate` modal displays both documents, requires explicit checkbox consent for **Accept & Continue**, or allows **Decline & Log Out** which clears authentication and returns the visitor cleanly to `/` as a guest.

## Admin Configuration

Manage all legal fields under **Admin → Config → Terms & Privacy Policy Generator**. Clicking **Publish New Policy Version & Re-Prompt Users** increments the active policy version (or accepts an explicit version string via API), stamps the current date, records the publishing admin's own acceptance so their dashboard remains uninterrupted, and re-prompts every other user on their next login or request.

