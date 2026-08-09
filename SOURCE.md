# Corresponding source

Every deployed AegisTube page exposes its exact Git revision in
the **Source & Legal** screen and in `/build-info.json`.

AegisTube is the AegisOS product surface for this unofficial modified FreeTube
web edition. FreeTube remains the upstream project name and the source of the
AGPL-licensed client code.

The complete preferred source for modification is available in three forms:

1. The public fork at <https://github.com/fairoosansar-coder/FreeTube>.
2. The immutable Git commit linked by the running application's legal screen.
3. The source archive deployed beside each build under `/source/`, including
   the lockfile, build scripts, notices, and all modified source files.

## Rebuild

Requirements: Node.js 24 and pnpm 10.

```sh
pnpm install --frozen-lockfile
AEGISOS_PUBLIC_PATH=/FreeTube/ pnpm run pack:web
```

The output is written to `dist/web`. No FreeTube desktop binary, Electron
runtime, credential, or private AegisOS source is required.

This software is provided without warranty under the GNU Affero General
Public License v3.0 or later. You may use, study, share, and modify it under
that license. The full license text is preserved in [LICENSE](LICENSE).
