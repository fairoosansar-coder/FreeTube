# Corresponding source

AegisTube is an unofficial, independently maintained derivative powered by
FreeTube. FreeTube remains the upstream project and the source of the
AGPL-licensed client code.

Every release AegisTube web build exposes its exact Git revision in
**About / Source & Legal**. AegisOS bundles the web payload, `SOURCE.md`, the
license, the modification record, and the third-party notices. The build
artifact and optional hosted edition also publish `/build-info.json` and a
corresponding-source archive. No external desktop application is part of the
AegisTube runtime.

The complete preferred source for modification is available in three forms:

1. The public fork at <https://github.com/fairoosansar-coder/FreeTube>.
2. The immutable Git commit linked by the running application's legal screen.
3. The source archive published with each AegisTube web build artifact and
   optional hosted edition under `/source/`, including the lockfile, build
   scripts, notices, and all modified source files.

The unmodified upstream source and history are available from
<https://github.com/FreeTubeApp/FreeTube>.

## Rebuild the AegisOS payload

Requirements: Node.js 24 and pnpm 10.

```sh
pnpm install --frozen-lockfile
AEGISOS_PUBLIC_PATH=./ pnpm run pack:web
```

The self-contained payload is written to `dist/web`. AegisOS packages this
directory and serves it from its local loopback origin inside the AegisOS app
window. The relative public path makes every script, style, locale file, and
image resolve beneath AegisOS's private per-launch access path.

## Rebuild the optional hosted browser/phone build

Use the same source and requirements with the GitHub Pages path:

```sh
AEGISOS_PUBLIC_PATH=/FreeTube/ pnpm run pack:web
```

The output is still `dist/web`; `/FreeTube/` is the existing Pages deployment
path. This hosted build is an optional browser and phone surface, not the
installed AegisOS runtime. Neither build requires a FreeTube desktop binary,
an Electron runtime, credentials, or access to official FreeTube release
infrastructure.

## License

This software is provided without warranty under the GNU Affero General
Public License v3.0 or later. You may use, study, share, and modify it under
that license. The full license text is preserved in [LICENSE](LICENSE).
