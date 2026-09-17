# AegisTube Browser Playback Contract

## Objective

The AegisOS browser edition provides a full web-first discovery and playback
experience without exposing the desktop extractor, direct media-format URLs,
download endpoints, user credentials, or a generic server-side media proxy.

## Architecture

| Capability | Browser path | Trust boundary |
| --- | --- | --- |
| Home, search, suggestions, titles, thumbnails | Fixed AegisOS managed metadata edge | Browser → `os.aegisos.me/api/aegistube/v1/*` → authenticated dedicated metadata origin |
| Selected-video playback | Official privacy-enhanced YouTube iframe | Browser → `youtube-nocookie.com/embed/<validated-video-id>` |
| Native details, formats, and desktop playback | Existing bridge-v3/native extractor | Installed AegisOS only; unchanged by browser playback mode |

The browser Watch view selects the official player only when the AegisOS web
edition is active and the native bridge extractor is absent. Native behavior
continues through the existing native route.

## Browser Player Contract

The browser player accepts only a canonical 11-character YouTube video ID. It
constructs exactly one URL shape:

```text
https://www.youtube-nocookie.com/embed/<video-id>
```

The fixed parameters are `autoplay=0`, `controls=1`, `enablejsapi=1`,
`iv_load_policy=3`, `origin=<AegisOS-origin>`, `playsinline=1`, and `rel=0`.
Only `https://os.aegisos.me`, `https://app.aegisos.me`, and scoped AegisOS
Pages preview origins are accepted as the `origin` value.

The player is loaded only after a user selects a known video in the AegisTube
interface. It is not a stream relay and never receives video-format JSON,
playback URLs, cookies, authentication headers, or extractor output from
AegisOS.

## Explicitly Excluded

- Direct media-format extraction in the browser.
- Stream relaying, downloading, caching, or arbitrary URL fetching.
- Passing end-user cookies, credentials, or headers to an upstream provider.
- Public Invidious instance selection or fallback for web playback.
- Broadening the managed metadata origin beyond popular, search, and
  suggestions.

## Operational Considerations

The official embedded player is subject to YouTube's own availability,
embedding, regional, and age-restriction policies. When a video cannot be
embedded, AegisTube must show an honest fallback directing the user to the
canonical YouTube page rather than attempting an extractor or proxy bypass.

Google documents privacy-enhanced embeds through `youtube-nocookie.com` and
recommends an explicit `origin` parameter when controlling iframe players:

- <https://support.google.com/youtube/answer/171780>
- <https://developers.google.com/youtube/iframe_api_reference>

## Acceptance Requirements

1. Deterministic tests reject malformed IDs, arbitrary origins, and injected
   embed parameters.
2. The browser bundle compiles with the web player mode.
3. A deployed AegisOS web session visibly completes Home, suggestions, search,
   selection of a result, and user-initiated official embedded playback.
4. Direct media URLs, arbitrary proxy routes, download routes, and the
   dedicated metadata origin's non-discovery paths remain unavailable.
