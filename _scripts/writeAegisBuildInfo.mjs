// Added 2026-08-06 for the AegisOS web edition.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const revision = process.env.GITHUB_SHA
if (!revision || !/^[a-f0-9]{40}$/.test(revision)) {
  throw new Error('GITHUB_SHA must be the exact 40-character deployment revision')
}

const outputDir = path.resolve('dist/web')
const archiveName = `aegisos-freetube-web-${revision}.tar.gz`
const archivePath = path.join(outputDir, 'source', archiveName)
const archive = fs.readFileSync(archivePath)
const sha256 = crypto.createHash('sha256').update(archive).digest('hex')
const repository = 'https://github.com/fairoosansar-coder/FreeTube'

const buildInfo = {
  name: 'AegisOS FreeTube Web',
  upstreamRelease: 'v0.25.1-beta',
  upstreamRevision: 'd429de4feb35a177597f409c2c8d8ccd6037313e',
  revision,
  builtAt: new Date().toISOString(),
  license: 'AGPL-3.0-or-later',
  source: `${repository}/tree/${revision}`,
  sourceArchive: `source/${archiveName}`,
  sourceArchiveSha256: sha256,
}

fs.writeFileSync(path.join(outputDir, 'build-info.json'), `${JSON.stringify(buildInfo, null, 2)}\n`)
