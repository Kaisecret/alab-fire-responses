# Municipal sessions in separate browser tabs

Each municipal tab selects a separate HttpOnly signed session cookie using a random identifier stored in sessionStorage. Login, logout, profile updates, password changes, notifications, and municipal operations use the same selector. No authentication token is stored in JavaScript storage. A missing or malformed selector never falls back to the former shared municipal session.

Municipal client API calls use `municipalTabFetch`. Keep new municipal requests on this helper. Pass request headers to `bfpSessionCookieName` in every municipal authentication reader and writer, including shared BFP endpoints.

Top-level browser navigation cannot carry the tab header. Municipal pages therefore render a public loading shell, and the municipal layout checks `/api/municipal-bfp/me` before mounting account content. Keep protected data in authenticated APIs; do not add private server-rendered data to these page shells. Provincial and resident page authentication remains unchanged.

Chrome Web Locks detect copied sessionStorage in duplicated tabs and allocate a separate identifier. Reloads preserve the identifier. Restoring a page from the back-forward cache reloads it to recheck authentication. Municipal caches use sessionStorage and are cleared when signing in or signing out.

Existing users must sign in again after this update. Open the municipal login page in each Chrome tab and sign into the desired account. No database migration is required.

Regression checks: `node --test tests/municipal-tab-session.test.mjs` tests signed cookie isolation, logout isolation, request header preservation, duplicated tab handling, reload persistence, malformed selectors, and unrelated origins/portals. These tests simulate browser storage and lock behavior; live account testing still requires valid BFP credentials.
