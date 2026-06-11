<template>
  <div 
    class="base-element-image"
    :style="{
      top: elementInfo.top + 'px',
      left: elementInfo.left + 'px',
      width: elementInfo.width + 'px',
      height: elementInfo.height + 'px',
    }"
  >
    <div
      class="rotate-wrapper"
      :style="{ transform: `rotate(${elementInfo.rotate}deg)` }"
    >
      <div 
        class="element-content"
        :style="{
          filter: shadowStyle ? `drop-shadow(${shadowStyle})` : '',
          transform: flipStyle,
        }"
      >
        <ImageOutline :elementInfo="elementInfo" />

        <div class="image-content" :style="{ clipPath: clipShape.style }">
          <img
            :src="processedImageSrc"
            :draggable="false"
            :crossorigin="isLocalImage ? 'anonymous' : null"
            :style="{
              top: imgPosition.top,
              left: imgPosition.left,
              width: imgPosition.width,
              height: imgPosition.height,
              filter: filter,
            }"
            alt=""
            @error="handleImageError"
          />
          <div class="color-mask"
            v-if="elementInfo.colorMask"
            :style="{
              backgroundColor: elementInfo.colorMask,
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { PPTImageElement } from '@/types/slides'
import useElementShadow from '@/views/components/element/hooks/useElementShadow'
import useElementFlip from '@/views/components/element/hooks/useElementFlip'
import useClipImage from './useClipImage'
import useFilter from './useFilter'

import ImageOutline from './ImageOutline/index.vue'

const props = defineProps<{
  elementInfo: PPTImageElement
  target?: string // 'thumbnail' or 'editor'
}>()

const shadow = computed(() => props.elementInfo.shadow)
const { shadowStyle } = useElementShadow(shadow)

const flipH = computed(() => props.elementInfo.flipH)
const flipV = computed(() => props.elementInfo.flipV)
const { flipStyle } = useElementFlip(flipH, flipV)

const imageElement = computed(() => props.elementInfo)
const { clipShape, imgPosition } = useClipImage(imageElement)

const filters = computed(() => props.elementInfo.filters)
const { filter } = useFilter(filters)

// Handle local images for export compatibility
const isLocalImage = computed(() => {
  const src = props.elementInfo.src
  return src.includes('127.0.0.1') ||
         src.includes('localhost') ||
         src.startsWith(window.location.origin) ||
         (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:'))
})

const processedImageSrc = computed(() => {
  const src = props.elementInfo.src

  // For thumbnail/export target, try to handle local images better
  if (props.target === 'thumbnail' && isLocalImage.value) {
    // Add cache buster for local images to ensure fresh load
    const baseSrc = src.split('?')[0]
    return baseSrc + (baseSrc.includes('?') ? '&' : '?') + 't=' + Date.now()
  }

  return src
})

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.warn('Image failed to load, using fallback:', img.src)

  // Use transparent placeholder as fallback
  img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}
</script>

<style lang="scss" scoped>
.base-element-image {
  position: absolute;
}
.rotate-wrapper {
  width: 100%;
  height: 100%;
}
.element-content {
  width: 100%;
  height: 100%;
  position: relative;

  .image-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  img {
    position: absolute;
  }
}
.color-mask {
  @include absolute-0();
}
</style>
