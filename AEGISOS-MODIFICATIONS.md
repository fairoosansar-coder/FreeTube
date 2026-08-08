# AegisOS FreeTube Web modifications

This is an unofficial web edition of FreeTube for display inside AegisOS.
It is not an official FreeTube release or service.

- Upstream release: `v0.25.1-beta`
- Upstream commit: `d429de4feb35a177597f409c2c8d8ccd6037313e`
- Modified by: `fairoosansar-coder`
- First modification date: `2026-08-06`
- License: GNU Affero General Public License v3.0 or later

## Changes

- Build the upstream browser target at a repository-relative public path.
- Show the exact deployed fork revision and corresponding source in the UI.
- Remove the broken web manifest/service-worker registration from embed builds.
- Simplify navigation to Home, Subscriptions, Playlists, History, Settings,
  and Source & Legal.
- Remove duplicate channel navigation, the new-window action, the profile
  bubble, social/donation clutter, and settings that do not apply to this
  embedded web target.
- Default to a compact AegisOS-compatible dark theme, Popular as Home,
  SponsorBlock enabled, and a quieter watch page.
- Add a lightweight boot screen and a clear retry/fallback state when public
  Invidious capacity is unavailable.
- Resolve the live CORS-capable Invidious pool before mounting the first route,
  time out stalled requests, and retry once with a refreshed instance.
- When embedded by the installed AegisOS shell, use its versioned
  `postMessage` bridge for narrowly scoped `/api/v1/...` JSON requests and
  constrain instance selection to the origins advertised by that relay;
  retain ordinary browser fetching as the hosted web fallback.
- Authenticate each native frame with a short-lived bridge token kept in the
  URL fragment (and therefore out of server logs), tolerate WebKit's opaque
  custom-protocol parent origin, retry the startup handshake, and report a
  bridge failure instead of silently attempting a blocked fetch.
- Reconcile persisted/default Invidious settings against the relay-advertised
  origins at startup so an obsolete saved server cannot bypass the relay.
- Publish content-hashed JavaScript bundles so an upgraded AegisOS frame never
  reuses an older bridge client from the browser cache.
- Rewrite insecure internal Invidious thumbnail origins back to the selected
  instance's HTTPS public origin.

The browser build uses FreeTube's Invidious backend mode. It does not contain
the Electron desktop runtime or FreeTube's local extractor.

See [SOURCE.md](SOURCE.md) for reproducible build and source-access details.
