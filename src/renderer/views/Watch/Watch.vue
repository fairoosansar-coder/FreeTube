<template>
  <div
    class="videoLayout"
    :class="{
      isLoading,
      useTheatreMode: useTheatreMode && !isLoading,
      noSidebar: !theatrePossible || isAegisWebPlayback,
      aegisWebTheatreMode: isAegisWebPlayback && aegisWebTheatreMode,
      aegisWebDarkMode: isAegisWebPlayback && aegisWebDarkMode,
    }"
  >
    <ft-loader
      v-if="isLoading"
      :fullscreen="true"
    />
    <div
      v-if="(isFamilyFriendly || !showFamilyFriendlyOnly)"
      class="videoArea"
    >
      <div class="videoAreaMargin">
        <div v-if="!isLoading && isAegisWebPlayback" ref="aegisWebPlayerShell" class="aegisWebPlayerShell">
          <div class="aegisWebControlBar" role="toolbar" aria-label="AegisTube player controls">
            <button type="button" :title="aegisWebAssumedPlaying ? 'Pause (K or Space)' : 'Play (K or Space)'" @click="toggleAegisWebPlayback">{{ aegisWebAssumedPlaying ? 'Pause' : 'Play' }}</button>
            <button type="button" :title="aegisWebMuted ? 'Unmute (M)' : 'Mute (M)'" @click="toggleAegisWebMute">{{ aegisWebMuted ? 'Unmute' : 'Mute' }}</button>
            <button type="button" title="Decrease volume (Arrow Down)" @click="changeAegisWebVolume(-5)">−</button>
            <span aria-live="polite">{{ aegisWebVolume }}%</span>
            <button type="button" title="Increase volume (Arrow Up)" @click="changeAegisWebVolume(5)">+</button>
            <button type="button" :aria-pressed="aegisWebFavorite" :title="aegisWebFavorite ? 'Remove from favorites' : 'Save to favorites'" @click="toggleAegisWebFavorite">Favorite</button>
            <button type="button" title="Copy AegisTube link at current time" @click="shareAegisWebTimestamp">Share</button>
            <button type="button" title="Continue in mini player" @click="moveAegisWebPlayerToMini">Mini player</button>
            <span class="aegisWebControlSpacer" />
            <button type="button" :aria-pressed="aegisWebTheatreMode" title="Toggle theater mode (T)" @click="toggleAegisWebTheatre">Theater</button>
            <button type="button" :aria-pressed="aegisWebDarkMode" title="Toggle dark mode (D)" @click="toggleAegisWebDarkMode">Dark</button>
            <button type="button" title="Fullscreen (F)" @click="toggleAegisWebFullscreen">Fullscreen</button>
          </div>
          <iframe
            ref="aegisWebPlayer"
            class="videoPlayer aegisWebEmbedPlayer"
            :src="aegisWebPlaybackUrl"
            :title="videoTitle || 'AegisTube web player'"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
          <button
            v-if="aegisWebDuration > 0"
            type="button"
            class="aegisWebSeekBar"
            :aria-label="`Seek video. Current position ${aegisWebSeekPreview?.timestamp ?? 'unknown'}.`"
            title="Hover for a timestamp preview. Click to seek; use Left or Right Arrow for five seconds."
            @mousemove="updateAegisWebSeekPreview"
            @mouseleave="clearAegisWebSeekPreview"
            @focus="clearAegisWebSeekPreview"
            @blur="clearAegisWebSeekPreview"
            @click="seekAegisWebPlayback"
            @keydown.left.prevent="seekAegisWebPlaybackRelative(-5)"
            @keydown.right.prevent="seekAegisWebPlaybackRelative(5)"
          >
            <span class="aegisWebSeekFill" :style="{ width: `${aegisWebPlayerPosition}%` }" />
            <span v-if="aegisWebSeekPreview" class="aegisWebSeekPreview" :style="{ left: `${aegisWebSeekPreview.ratio * 100}%` }">
              <img :src="aegisWebSeekPreview.thumbnail" :alt="`Preview at ${aegisWebSeekPreview.timestamp}`">
              <strong>{{ aegisWebSeekPreview.timestamp }}</strong>
            </span>
          </button>
        </div>
        <ft-shaka-video-player
          v-else-if="!isLoading && (!isUpcoming || playabilityStatus === 'OK') && !errorMessage"
          ref="player"
          :manifest-src="manifestSrc"
          :manifest-mime-type="manifestMimeType"
          :sabr-data="sabrData"
          :legacy-formats="legacyFormats"
          :start-time="startTimeSeconds"
          :captions="captions"
          :storyboard-src="videoStoryboardSrc"
          :format="activeFormat"
          :thumbnail="thumbnail"
          :video-id="videoId"
          :chapters="videoChapters"
          :current-chapter-index="videoCurrentChapterIndex"
          :chapters-src="chaptersSrc"
          :title="videoTitle"
          :theatre-possible="theatrePossible"
          :use-theatre-mode="useTheatreMode"
          :autoplay-possible="autoplayPossible"
          :autoplay-enabled="autoplayEnabled"
          :watching-playlist="watchingPlaylist"
          :vr-projection="vrProjection"
          :start-in-fullscreen="startNextVideoInFullscreen"
          :start-in-fullwindow="startNextVideoInFullwindow"
          :start-in-pip="startNextVideoInPip"
          :current-playback-rate="currentPlaybackRate"
          :delay-load-until-unix="adEndTimeUnixMs"
          class="videoPlayer"
          @error="handlePlayerError"
          @loaded="handleVideoLoaded"
          @timeupdate="updateCurrentChapter"
          @ended="handleVideoEnded"
          @toggle-theatre-mode="useTheatreMode = !useTheatreMode"
          @toggle-autoplay="toggleAutoplay"
          @playback-rate-updated="updatePlaybackRate"
          @skip-to-next="handleSkipToNext"
          @skip-to-prev="handleSkipToPrev"
          @player-reload-requested="onPlayerReloadRequested"
        />
        <div
          v-if="!isLoading && (isUpcoming || errorMessage)"
          class="videoPlayer"
        >
          <img
            v-if="!isUpcoming || playabilityStatus !== 'OK'"
            :src="thumbnail"
            class="videoThumbnail"
            alt=""
          >
          <div
            v-if="isUpcoming"
            class="premiereDate"
            :class="{trailer: isUpcoming && playabilityStatus === 'OK'}"
          >
            <font-awesome-icon
              :icon="['fas', 'satellite-dish']"
              class="premiereIcon"
            />
            <p
              v-if="upcomingTimestamp !== null"
              class="premiereText"
            >
              <span
                class="premiereTextTimeLeft"
              >
                {{ $t("Video.Premieres") }} {{ upcomingTimeLeft }}
              </span>
              <br>
              <span
                class="premiereTextTimestamp"
              >
                {{ upcomingTimestamp }}
              </span>
            </p>
            <p
              v-else
              class="premiereText"
            >
              {{ $t("Video.Starting soon, please refresh the page to check again") }}
            </p>
          </div>
          <div
            v-else-if="errorMessage"
            class="errorContainer"
          >
            <div
              class="errorWrapper"
            >
              <font-awesome-icon
                :icon="customErrorIcon || ['fas', 'exclamation-circle']"
                aria-hidden="true"
                class="errorIcon"
              />
              <p
                class="errorMessage"
              >
                {{ errorMessage }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ft-age-restricted
      v-if="(!isLoading && !isFamilyFriendly && showFamilyFriendlyOnly)"
      class="ageRestricted"
    />
    <div
      v-if="(isFamilyFriendly || !showFamilyFriendlyOnly) && !isAegisWebPlayback"
      class="infoArea"
    >
      <watch-video-info
        v-if="!isLoading"
        :id="videoId"
        :title="videoTitle"
        :channel-id="channelId"
        :channel-name="channelName"
        :channel-thumbnail="channelThumbnail"
        :published="videoPublished"
        :premiere-date="premiereDate"
        :subscription-count-text="channelSubscriptionCountText"
        :like-count="videoLikeCount"
        :dislike-count="videoDislikeCount"
        :view-count="videoViewCount"
        :get-timestamp="getTimestamp"
        :is-live-content="isLiveContent"
        :is-live="isLive"
        :is-upcoming="isUpcoming"
        :playlist-id="playlistId"
        :get-playlist-state="getPlaylistState"
        :length-seconds="videoLengthSeconds"
        :video-thumbnail="thumbnail"
        :in-user-playlist="!!selectedUserPlaylist"
        :is-unlisted="isUnlisted"
        :can-save-watched-progress="canSaveWatchProgress"
        class="watchVideo"
        :class="{ theatreWatchVideo: useTheatreMode }"
        @change-format="handleFormatChange"
        @pause-player="pausePlayer"
        @save-watched-progress="handleWatchProgressManualSave"
      />
      <watch-video-chapters
        v-if="!hideChapters && !isLoading && videoChapters.length > 0"
        :chapters="videoChapters"
        :current-chapter-index="videoCurrentChapterIndex"
        :kind="videoChaptersKind"
        class="watchVideo"
        :class="{ theatreWatchVideo: useTheatreMode }"
        @timestamp-event="changeTimestamp"
      />
      <watch-video-description
        v-if="!isLoading && !hideVideoDescription"
        :description="videoDescription"
        :description-html="videoDescriptionHtml"
        :license="license"
        class="watchVideo"
        :class="{ theatreWatchVideo: useTheatreMode }"
        @timestamp-event="changeTimestamp"
      />
      <CommentSection
        v-if="!isLoading && !isLive && !hideComments"
        :id="videoId"
        class="watchVideo"
        :class="{ theatreWatchVideo: useTheatreMode }"
        :channel-thumbnail="channelThumbnail"
        :channel-name="channelName"
        :video-player-ready="videoPlayerLoaded"
        @timestamp-event="changeTimestamp"
      />
    </div>
    <div
      v-if="(isFamilyFriendly || !showFamilyFriendlyOnly) && !isAegisWebPlayback"
      class="sidebarArea"
    >
      <watch-video-live-chat
        v-if="!isLoading && !hideLiveChat && (isLive || isUpcoming)"
        :live-chat="liveChat"
        :video-id="videoId"
        :channel-id="channelId"
        class="watchVideoSideBar watchVideoPlaylist"
        :class="{ theatrePlaylist: useTheatreMode }"
      />
      <watch-video-playlist
        v-if="watchingPlaylist"
        v-show="!isLoading"
        ref="watchVideoPlaylist"
        :watch-view-loading="isLoading"
        :playlist-id="playlistId"
        :playlist-type="playlistType"
        :video-id="videoId"
        :playlist-item-id="playlistItemId"
        class="watchVideoSideBar watchVideoPlaylist"
        :class="{ theatrePlaylist: useTheatreMode }"
        @pause-player="pausePlayer"
      />
      <watch-video-recommendations
        v-if="!isLoading && !hideRecommendedVideos"
        :data="recommendedVideos"
        class="watchVideoSideBar watchVideoRecommendations"
        :class="{
          theatreRecommendations: useTheatreMode,
          watchVideoRecommendationsLowerCard: watchingPlaylist || isLive,
          watchVideoRecommendationsNoCard: !watchingPlaylist || !isLive
        }"
        @pause-player="pausePlayer"
      />
    </div>
  </div>
</template>

<script src="./Watch.js" />
<style scoped src="./Watch.scss" lang="scss" />
