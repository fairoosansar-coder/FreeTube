<!-- Modified 2026-08-06 for the AegisOS web edition. -->
<template>
  <div>
    <FtCard class="card">
      <h2>
        <FontAwesomeIcon
          :icon="['fas', 'info-circle']"
          class="headingIcon"
        />
        {{ aboutTitle }}
      </h2>
      <section class="brand">
        <AegisTubeBrand
          v-if="isAegisTube"
          hero
          show-attribution
        />
        <FtLogoFull
          v-else
          class="logo"
        />
        <div class="version">
          {{ versionNumber }} {{ editionLabel }}
        </div>
      </section>
      <section class="about-chunks">
        <figure
          v-for="chunk in chunks"
          :key="chunk.title"
          class="chunk"
        >
          <FontAwesomeIcon
            class="icon"
            :icon="chunk.icon"
          />
          <h3 class="title">
            {{ chunk.title }}
          </h3>
          <div
            v-safer-html="chunk.content"
            class="content"
          />
        </figure>
      </section>
    </FtCard>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import FtCard from '../../components/ft-card/ft-card.vue'
import AegisTubeBrand from '../../components/AegisTubeBrand/AegisTubeBrand.vue'
import FtLogoFull from '../../components/FtLogoFull/FtLogoFull.vue'
import { vSaferHtml } from '../../directives/vSaferHtml.js'

import packageDetails from '../../../../package.json'

const { t } = useI18n()

const isAegisTube = process.env.AEGISTUBE_EDITION === true
const isAegisWeb = process.env.AEGISOS_WEB_EDITION === true
const aboutTitle = isAegisTube ? 'About AegisTube' : t('About.About')
const versionNumber = `v${packageDetails.version}`
const editionLabel = isAegisWeb ? '· AegisOS shell app' : ''
const forkCommit = process.env.AEGISOS_FORK_COMMIT || 'development'
const forkRevision = forkCommit === 'development'
  ? 'development branch'
  : forkCommit.slice(0, 7)
const forkBase = 'https://github.com/fairoosansar-coder/FreeTube'
const forkSourceUrl = forkCommit === 'development'
  ? `${forkBase}/tree/aegisos-web-v0.25.1`
  : `${forkBase}/tree/${forkCommit}`
const deployedArchiveUrl = !isAegisWeb || forkCommit === 'development'
  ? null
  : new URL(
      `source/aegistube-web-${forkCommit}.tar.gz`,
      window.location.href.split('#')[0]
    ).toString()

const aegisTubeChunks = [
  {
    icon: ['fas', 'info-circle'],
    title: 'Private video, local library',
    content: [
      'AegisTube is the self-contained private video experience built into AegisOS.',
      'Subscriptions, playlists, settings, and watch history stay on this device.',
      'No Google account is required for ordinary browsing and playback.',
    ].join('<br>'),
  },
  {
    icon: ['fab', 'github'],
    title: 'Open source & legal',
    content: [
      '<strong>Powered by FreeTube</strong>',
      'AegisTube is an independent modified distribution and is not an official FreeTube release or service.',
      'Based on FreeTube v0.25.1-beta.',
      '<a href="https://github.com/FreeTubeApp/FreeTube">FreeTube upstream source and credits</a>',
      `<a href="${forkSourceUrl}">AegisTube corresponding source · ${forkRevision}</a>`,
      ...(deployedArchiveUrl
        ? [`<a href="${deployedArchiveUrl}">Download corresponding source archive</a>`]
        : []),
      '<a href="https://www.gnu.org/licenses/agpl-3.0.en.html">GNU AGPL-3.0-or-later · no warranty</a>',
    ].join('<br>'),
  },
  {
    icon: ['fas', 'question-circle'],
    title: 'AegisTube support',
    content: [
      '<a href="https://github.com/fairoosansar-coder/FreeTube/issues">Report an AegisTube problem</a>',
      '<a href="https://github.com/fairoosansar-coder/FreeTube">View the AegisTube project</a>',
      'Import remains compatible with existing FreeTube database exports.',
    ].join('<br>'),
  }
]

const freeTubeChunks = [
  {
    icon: ['fab', 'github'],
    title: t('About.Source code'),
    content: [
      '<a href="https://github.com/FreeTubeApp/FreeTube" lang="en" dir="ltr">GitHub</a>',
      t('About.Licensed under the {licenseLink}', {
        licenseLink: `<a href="https://www.gnu.org/licenses/agpl-3.0.en.html">${t('About.AGPLv3')}</a>`,
      }),
    ].join('<br>'),
  },
  {
    icon: ['fas', 'question-circle'],
    title: t('About.Help'),
    content: [
      `<a href="https://docs.freetubeapp.io/">${t('About.FreeTube Wiki')}</a>`,
      `<a href="https://docs.freetubeapp.io/faq/">${t('About.FAQ')}</a>`,
      `<a href="https://github.com/FreeTubeApp/FreeTube/discussions/">${t('About.Discussions')}</a>`,
    ].join(' / '),
  },
  {
    icon: ['fas', 'users'],
    title: t('About.Credits'),
    content: t('About.FreeTube is made possible by {creditsPageLink}', {
      creditsPageLink: `<a href="https://docs.freetubeapp.io/credits/">${t('About.these people and projects')}</a>`,
    }),
  },
]

const chunks = computed(() => isAegisTube ? aegisTubeChunks : freeTubeChunks)
</script>

<style scoped src="./About.css" />
