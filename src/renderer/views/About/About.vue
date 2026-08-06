<!-- Modified 2026-08-06 for the AegisOS web edition. -->
<template>
  <div>
    <FtCard class="card">
      <h2>
        <FontAwesomeIcon
          :icon="['fas', 'info-circle']"
          class="headingIcon"
        />
        {{ $t("About.About") }}
      </h2>
      <section class="brand">
        <FtLogoFull class="logo" />
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
import FtLogoFull from '../../components/FtLogoFull/FtLogoFull.vue'
import { vSaferHtml } from '../../directives/vSaferHtml.js'

import packageDetails from '../../../../package.json'

const { t } = useI18n()

const versionNumber = `v${packageDetails.version}`
const editionLabel = '· AegisOS web edition'
const forkCommit = process.env.AEGISOS_FORK_COMMIT || 'development'
const forkRevision = forkCommit === 'development' ? forkCommit : forkCommit.slice(0, 7)
const forkBase = 'https://github.com/fairoosansar-coder/FreeTube'
const forkSourceUrl = `${forkBase}/tree/${forkCommit}`
const forkArchiveUrl = `${forkBase}/archive/${forkCommit}.tar.gz`
const deployedArchiveUrl = forkCommit === 'development'
  ? forkArchiveUrl
  : new URL(`source/aegisos-freetube-web-${forkCommit}.tar.gz`, window.location.href.split('#')[0]).toString()

const chunks = computed(() => [
  {
    icon: ['fas', 'info-circle'],
    title: 'AegisOS web edition',
    content: [
      'Unofficial FreeTube web build modified by fairoosansar-coder on 2026-08-06.',
      `<a href="${forkSourceUrl}">Exact corresponding source · ${forkRevision}</a>`,
      `<a href="${deployedArchiveUrl}">Download corresponding source archive</a>`,
      'This build uses Invidious only; the desktop Local API is not included.'
    ].join('<br>'),
  },
  {
    icon: ['fab', 'github'],
    title: t('About.Source code'),
    content: [
      '<a href="https://github.com/FreeTubeApp/FreeTube" lang="en" dir="ltr">Upstream: FreeTubeApp/FreeTube</a>',
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
      `<a href="https://github.com/FreeTubeApp/FreeTube/discussions/">${t('About.Discussions')}</a>`
    ].join(' / '),
  },
  {
    icon: ['fas', 'users'],
    title: t('About.Credits'),
    content: t('About.FreeTube is made possible by {creditsPageLink}', {
      creditsPageLink: `<a href="https://docs.freetubeapp.io/credits/">${t('About.these people and projects')}</a>`,
    }),
  }
])
</script>

<style scoped src="./About.css" />
