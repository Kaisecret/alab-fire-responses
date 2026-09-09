const TAB_KEY = "alab_municipal_tab";
let tabReady: Promise<string> | undefined;

function clearMunicipalCache() {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && (/municipal/i.test(key) || key.startsWith("alab_incident_feed_cache")) && key !== TAB_KEY) sessionStorage.removeItem(key);
  }
}

async function selectTab(): Promise<string> {
  window.addEventListener("pageshow", (event) => {
    if ((event as PageTransitionEvent).persisted) window.location.reload();
  });
  let id = sessionStorage.getItem(TAB_KEY);
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) id = crypto.randomUUID();
  // Chrome can copy sessionStorage when duplicating a tab. A browser lock
  // distinguishes that copy from reloads without exposing the session token.
  if (navigator.locks) {
    const claim = (candidate: string) => new Promise<boolean>((resolve, reject) => {
      void navigator.locks.request(`alab-municipal:${candidate}`, { ifAvailable: true }, (lock) => {
        resolve(Boolean(lock));
        if (!lock) return;
        return new Promise<void>((release) => window.addEventListener("pagehide", () => release(), { once: true }));
      }).catch(reject);
    });
    if (!await claim(id)) {
      id = crypto.randomUUID();
      await claim(id);
      clearMunicipalCache();
    }
  }
  sessionStorage.setItem(TAB_KEY, id);
  return id;
}

/** Attach a non-secret tab selector; authentication stays in HttpOnly cookies. */
export async function municipalTabFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") return globalThis.fetch(input, init);
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
  const municipalPage = /^\/municipal-bfp(?:\/|$)/.test(window.location.pathname);
  const scoped = url.origin === window.location.origin && (
    url.pathname.startsWith("/api/municipal-bfp/") ||
    (municipalPage && url.pathname.startsWith("/api/auth/bfp/"))
  );
  if (!scoped) return globalThis.fetch(input, init);
  tabReady ??= selectTab();
  const id = await tabReady;
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set("x-alab-municipal-tab", id);
  if (url.pathname.endsWith("/login")) clearMunicipalCache();
  const response = await globalThis.fetch(input, { ...init, headers, cache: "no-store" });
  if (url.pathname.endsWith("/logout") && response.ok) clearMunicipalCache();
  return response;
}
