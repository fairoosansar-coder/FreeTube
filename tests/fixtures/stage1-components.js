import { createApp, h, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import FtListVideo from '../../src/renderer/components/FtListVideo/FtListVideo.vue'
import FtListPlaylist from '../../src/renderer/components/FtListPlaylist/FtListPlaylist.vue'
import store from '../../src/renderer/store/index'

const video = {
  type: 'video',
  videoId: 'abcdefghijk',
  title: 'Fixture video',
  author: 'Fixture',
  authorId: 'fixture',
  authorUrl: '/channel/fixture',
  videoThumbnails: [{ url: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg', quality: 'medium', width: 320, height: 180 }],
  lengthSeconds: 1,
  published: 0,
}
const playlist = {
  type: 'playlist',
  title: 'Fixture playlist',
  playlistId: 'PLfixture',
  author: 'Fixture',
  authorId: 'fixture',
  authorUrl: '/channel/fixture',
  videoCount: 1,
  videos: [video],
  playlistThumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
}
const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missing: (_, key) => key })
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }] })

const app = createApp({
  render: () => h('section', { class: 'fixture' }, [
    h('h1', 'Stage 1 real component fixture'),
    h(FtListVideo, { data: video, appearance: 'result' }),
    h(FtListPlaylist, { data: playlist, appearance: 'grid' }),
    h('pre', { id: 'result' }, 'mounting…'),
  ]),
})
app.use(store).use(i18n).use(router)
app.mount('#app')
await nextTick()
const srcs = [...document.querySelectorAll('img')].map(image => image.getAttribute('src')).filter(Boolean)
const expected = 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg'
const pass = srcs.includes(expected) && srcs.every(src => !src.includes('inv.'))
document.querySelector('#result').textContent = JSON.stringify({ pass, expected, srcs }, null, 2)
document.body.dataset.fixtureResult = pass ? 'PASS' : 'FAIL'
