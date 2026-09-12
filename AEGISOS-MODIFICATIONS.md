# AegisTube modifications

AegisTube is an unofficial, independently maintained derivative of FreeTube.
It is a self-contained video application that runs inside the AegisOS shell;
it is not a separate desktop program. It is not an official FreeTube release
or service and is not endorsed by the FreeTube project.

- Upstream release: `v0.25.1-beta`
- Upstream commit: `d429de4feb35a177597f409c2c8d8ccd6037313e`
- Modified by: `fairoosansar-coder`
- First modification date: `2026-08-06`
- License: GNU Affero General Public License v3.0 or later

## Product and shell changes

- Present the derivative as AegisTube throughout its normal product surface,
  including its navigation, settings, library, exports, and diagnostics.
- Keep the required FreeTube attribution, upstream credits, source links,
  license, and no-warranty notice together in **About / Source & Legal** so the
  ordinary interface remains focused while the legal information stays easy
  to find.
- Preserve FreeTube-compatible local data formats where practical while the
  AegisOS shell owns the application window, local origin, bridge, and data
  isolation.
- Package the complete browser payload with AegisOS and serve it from the
  shell's loopback origin. No separately installed FreeTube or Electron app is
  required.

## Web and AegisOS changes

- Build the browser target at a repository-relative public path. The deployed
  Pages path remains `/FreeTube/` for compatibility with installed AegisOS
  clients and existing links.
- Show the exact deployed fork revision and corresponding source in the legal
  screen; release artifacts and the hosted edition also publish
  `/build-info.json`.
- Remove the broken web manifest/service-worker registration from embed builds.
- Recreate the AegisTube Shell v2 design as a real Vue application shell while
  preserving FreeTube's routes, player, local library, profiles, search,
  import/export tools, settings database, SponsorBlock, and DeArrow behavior.
- Present Home, Following, Playlists, History, Settings, and Source & Legal in
  a 208/64-pixel responsive rail, with a compact bottom navigation on phones.
  "Following" is a product label for FreeTube's existing local subscriptions
  route and does not change the underlying interoperable data model.
- Add a single responsive toolbar with real navigation history, real YouTube
  search and URL handling, filters, the active local profile switcher, a private-local
  status, and a Power Stats control connected to the player's actual Shaka
  statistics.
- Add Home feed modes backed by real public-feed, local-following, and local-
  history data, plus a real persisted grid/list switch. The Following import
  action opens the existing subscription import tools in Privacy & Data.
- Add five persistent "Souls" accents (Ember, Wraith, Moss, Ashen Gold, and
  Wisp) and apply the chosen accent across the complete AegisTube surface.
- Reorganize the real settings into the v2 two-pane taxonomy, keep deep links
  and mobile navigation, and connect the keyboard-shortcuts control to the
  existing FreeTube shortcuts prompt.
- Keep the standard FreeTube renderer separate: AegisTube shell markup and
  styles are compiled only for the AegisTube web edition.
- Default to a compact AegisOS-compatible dark theme, Home as the landing page,
  SponsorBlock enabled, and a quieter watch page without subscriber counts or
  subscription controls. Downloads remain disabled until AegisOS provides a
  permissioned native download manager.
- Add a staged boot screen driven by actual bridge, preference, profile,
  playback-configuration, and local-library initialization. Public Invidious
  discovery failures do not block the local shell or native playback path.
- Resolve the live CORS-capable Invidious pool before mounting the first route,
  time out stalled requests, and retry once with a refreshed instance.
- Ship multiple independently checked CORS-capable public fallback instances in
  the web artifact. The hosted build advances to another instance after a
  failed request; these public services are a best-effort browser path, not a
  substitute for AegisOS's authenticated native relay.
- When embedded by the installed AegisOS shell, use its versioned
  `postMessage` bridge for narrowly scoped `/api/v1/...` JSON requests and
  constrain instance selection to the origins advertised by that relay;
  retain ordinary browser fetching as the hosted web fallback.
- In the authenticated AegisOS frame, use the bundled `youtubei.js` extractor
  for video metadata and playback instead of relying on a public Invidious
  `/videos/...` response. Route only the extractor's tightly scoped,
  unauthenticated YouTube JSON requests through the native shell.
- Accept only a validated combined MP4 from the extractor for the first native
  playback release. Play it through WebKit's native media path without a CORS
  attribute, and suppress screenshots because no-CORS media correctly taints
  browser canvases.
- Authenticate each native frame with a short-lived bridge token kept in the
  URL fragment (and therefore out of server logs), tolerate WebKit's opaque
  custom-protocol parent origin, retry the startup handshake, and report a
  bridge failure instead of silently attempting a blocked fetch.
- Keep the v2 Invidious bridge compatible with older installed shells while
  gating the local extractor on bridge v3, so a hosted-page deployment cannot
  silently break users who have not updated AegisOS yet.
- Reconcile persisted/default Invidious settings against the relay-advertised
  origins at startup so an obsolete saved server cannot bypass the relay.
- Publish content-hashed JavaScript bundles so an upgraded AegisOS frame never
  reuses an older bridge client from the browser cache.
- Rewrite Invidious video-thumbnail paths to YouTube's canonical HTTPS image
  host instead of an instance's internal or intermittently broken proxy.
- Track provider discovery, video-detail, format, stream-probe, latency, and
  cooldown state independently. A successful public feed is not playback-health
  evidence, and deterministic provider selection skips an active cooldown.
- Normalize provider-returned thumbnails once at data ingestion. Relative `/vi/`
  paths and canonical YouTube thumbnail URLs use the approved HTTPS canonical
  host; malformed, credential-bearing, loopback, private-address, non-HTTP(S),
  and unsupported asset URLs resolve to the controlled card fallback.
- When bridge-v3 native extraction is available, retain it as the installed
  AegisOS video-detail and format path. Invidious remains discovery-only; raw
  provider errors are reduced to classified diagnostic identifiers.

The locally bundled AegisOS payload is the installed product. The optional
hosted browser/phone build defaults to the Invidious backend and remains
available for browsers that are not running inside AegisOS. An authenticated
AegisOS frame can use the local extractor through its native bridge.

See [SOURCE.md](SOURCE.md) for reproducible build and source-access details.
