# Google Search setup

The public site is https://www.alabfireresponse.dev/. Website links on
`alab-fire-responses-bynr.vercel.app` permanently redirect to the same path and
query string on the public domain. The original `/api` endpoints remain available
for installed mobile apps. The apex domain redirects to `www` through Vercel's
existing domain settings.

The homepage has a canonical URL, search and sharing metadata, and WebSite
structured data. `/robots.txt` points to `/sitemap.xml`, which lists only the public
homepage. Account and dashboard pages inherit `noindex` metadata; access controls
remain responsible for protecting account data.

## Submit to Google

1. Open https://search.google.com/search-console and add the URL-prefix property
   `https://www.alabfireresponse.dev/`.
2. Choose **HTML file** and click **Verify**. The supplied verification file is
   served at `https://www.alabfireresponse.dev/google6b898f1ca2dcc6e5.html` from
   `public/google6b898f1ca2dcc6e5.html`. Keep this file deployed after verification
   succeeds so Google can continue to confirm ownership. If a verified Domain
   property for `alabfireresponse.dev` already exists, use that instead.
3. In **Sitemaps**, submit `https://www.alabfireresponse.dev/sitemap.xml`.
4. Inspect `https://www.alabfireresponse.dev/`, run **Test live URL**, and choose
   **Request indexing** when available.

HTML tag verification is also supported: set the tag's `content` value as the
production Vercel environment variable `GOOGLE_SITE_VERIFICATION`, then redeploy.

Google decides whether and when to index a page; submitting it does not guarantee
inclusion or a particular search position. Keep the old website redirect active
for at least a year, preferably indefinitely.

## Search wording

The search title is **ALAB Fire Response | Fire Reporting in Antique**. Visible
homepage text identifies ALAB Fire Response, Antique, Philippines, fire reporting,
and the Bureau of Fire Protection (BFP). These descriptions support relevant
searches such as **ALAB Antique**, **Antique fire reporting**, and **BFP Antique
fire response** while the full project title remains visible on the homepage.
Google can match related wording without a page listing every possible query.
Use Search Console's Performance report after indexing to review actual queries
and improve useful public information over time.

## Verification

Run `node --test tests/production-domain.test.mjs` and `npm run build` from the
application directory. After deployment, check the old homepage and nested links
for HTTP 308 and the expected Location, the new homepage for HTTP 200 and its
canonical tag, and `/robots.txt` and `/sitemap.xml` for HTTP 200.

Google references:

- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
