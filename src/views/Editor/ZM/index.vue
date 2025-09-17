<template>
  <div
    class="thumbnails"
    @mousedown="() => setThumbnailsFocus(true)"
    v-click-outside="() => setThumbnailsFocus(false)"
    v-contextmenu="contextmenusThumbnails"
  >
    <div class="add-slide">
        <div class="icon-text-container"  @click="toggleSelectAcousticPanel()">
            <IconAcoustic style="color: #009688" class="handler-item" :class="{ 'active': showAcousticPanel }" v-tooltip="'选择窗格'" />
            <span class="icon-label">选择音色</span>
        </div>

        <div  class="handler-item group-btn" style="margin-left: auto;">

            <Button @click="AIZMpageVisible=true;"  class="button default" style="
                  flex: 1 1 0%;
                  margin: 7px;
                  height: 24px;
                  line-height: 24px;
                  padding: 0px 18px;
                  border-radius: 6px;

">
                <span style="margin-left: 2px;    background: linear-gradient(270deg, #d897fd, #33bcfc);
                  background-clip: text;
                  color: transparent;
                  font-weight: 700;">AI生成脚本</span>
                </Button>

            <Button @click="setDialogForExport('mp4')"  class="button default" style="
    flex: 1 1 0%;
    margin: 7px;
    height: 24px;
    line-height: 24px;
    padding: 0px 18px;
    border-radius: 6px;">
                <IconDownload class="icon" style="color:#d14424"/>

                <span style="margin-left: 2px;">导出视频</span></Button>

            <Button @click="openZMPanel"  class="button default" style="
    flex: 1 1 0%;
    margin: 7px;
    height: 24px;
    line-height: 24px;
    padding: 0px 18px;
    border-radius: 6px;">
                <IconAlignTextBothOne class="icon"  style="color:#d14424" />
                <span style="margin-left: 2px;">返回PPT编辑模式</span></Button>
        </div>
    </div>

    <Draggable
      :key="`draggable-${slides.length}-${ttId}`"
      class="thumbnail-list"
      ref="thumbnailsRef"
      :modelValue="slides"
      :animation="200"
      :scroll="true"
      :scrollSensitivity="50"
      :disabled="editingSectionId"
      @end="handleDragEnd"
      itemKey="id"
    >
      <template #item="{ element, index }">
        <div class="thumbnail-container">
          <div class="section-title"
            :data-section-id="element?.sectionTag?.id || ''"
            v-if="element.sectionTag || (hasSection && index === 0)"
            v-contextmenu="contextmenusSection"
          >
            <input
              :id="`section-title-input-${element?.sectionTag?.id || 'default'}`"
              type="text"
              :value="element?.sectionTag?.title || ''"
              placeholder="输入节名称"
              @blur="$event => saveSection($event)"
              @keydown.enter.stop="$event => saveSection($event)"
              v-if="editingSectionId === element?.sectionTag?.id || (index === 0 && editingSectionId === 'default')"
            >
            <span class="text" v-else>
              <div class="text-content">{{ element?.sectionTag ? (element?.sectionTag?.title || '无标题节') : '默认节' }}</div>
            </span>
          </div>
          <div
            class="thumbnail-item"
            :class="{
              'active': slideIndex === index,
              'selected': selectedSlidesIndex.includes(index),
            }"
            @mousedown="$event => handleClickSlideThumbnail($event, index)"
            @dblclick="enterScreening()"
            v-contextmenu="contextmenusThumbnailItem"
          >
            <div class="label" :class="{ 'offset-left': index >= 99 }">{{ fillDigit(index + 1, 2) }}</div>
            <ThumbnailSlide class="thumbnail" :slide="element" :size="280" :visible="index < slidesLoadLimit" />

            <div class="remark">
                  <ZMEditor style="width: 90%"
                          :value="element.remark || ''"
                          ref="editorRef"

                  />
              </div>
            <div class="ppt-text-container">
                <span @click="openZMPanel" >编辑</span>
                <span @click="enterScreening" >放大</span>
            </div>


          </div>
        </div>
      </template>
    </Draggable>

    <div class="page-number"><span>幻灯片 {{slideIndex + 1}} / {{slides.length}}</span>
        <Button @click="setDialogForExport('mp4')"  class="button default" style="
    flex: 1 1 0%;
    margin: 7px;
    height: 24px;
    line-height: 24px;
    padding: 0px 18px;
    border-radius: 6px;">
            <IconDownload class="icon" style="color:#d14424"/>

            </Button>
        <Button @click="openZMPanel"  class="button default" style="
    flex: 1 1 0%;
    margin: 7px;
    height: 24px;
    line-height: 24px;
    padding: 0px 18px;
    border-radius: 6px;">
            <IconAlignTextBothOne class="icon"  style="color:#d14424" />
           </Button>

    </div>

      <FullscreenSpin :loading="aiLoading" tip="导出中，请耐心等待 ..."/>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch, reactive  } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore, useKeyboardStore, } from '@/store'
import {useMP4Store} from "@/store/mp4";

import { fillDigit } from '@/utils/common'
import { isElementInViewport } from '@/utils/element'
import type { ContextmenuItem } from '@/components/Contextmenu/types'
import useSlideHandler from '@/hooks/useSlideHandler'
import useSectionHandler from '@/hooks/useSectionHandler'
import useScreening from '@/hooks/useScreening'
import useLoadSlides from '@/hooks/useLoadSlides'
import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'
import type { Slide } from '@/types/slides'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Templates from './Templates.vue'
import Popover from '@/components/Popover.vue'
import Draggable from 'vuedraggable'
import Button from "@/components/Button.vue";
import {EditorView} from "prosemirror-view";
import ZMEditor from "@/views/Editor/Remark/ZMEditor.vue";
import useExport from "@/hooks/useExport";
import FullscreenSpin from "@/components/FullscreenSpin.vue";
import Modal from "@/components/Modal.vue";
import ThemeStylesExtract from "@/views/Editor/Toolbar/SlideDesignPanel/ThemeStylesExtract.vue";
import useImport from "@/hooks/useImport";
import {DialogForExportTypes} from "@/types/export";
import AIZMDialog from "@/views/Editor/ZM/AIZMDialog.vue";


const loading = ref(false)
const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const keyboardStore = useKeyboardStore()
const mp4Store = useMP4Store();
const { selectedSlidesIndex: _selectedSlidesIndex, thumbnailsFocus,showAcousticPanel,AIZMpageVisible } = storeToRefs(mainStore)
const { slides, slideIndex, currentSlide } = storeToRefs(slidesStore)
const { ctrlKeyState, shiftKeyState } = storeToRefs(keyboardStore)
const { ttId,aiLoading } = storeToRefs(mp4Store)
const { slidesLoadLimit } = useLoadSlides()

const selectedSlidesIndex = computed(() => [..._selectedSlidesIndex.value, slideIndex.value])

const presetLayoutPopoverVisible = ref(false)

const hasSection = computed(() => {
  return slides.value.some(item => item.sectionTag)
})




const {exportZMv2, convertAISlidesToText, convertSlidesToAISlides} = useExport()




const toggleSelectAcousticPanel = () => {
    mainStore.setAcousticPanelState(true)
}
const { addSlidesFromData } = useAddSlidesOrElements()

const {
  copySlide,
  pasteSlide,
  createSlide,
  createSlideByTemplate,
  copyAndPasteSlide,
  deleteSlide,
  cutSlide,
  selectAllSlide,
  sortSlides,
  isEmptySlide,
} = useSlideHandler()

const {
  createSection,
  removeSection,
  removeAllSection,
  removeSectionSlides,
  updateSectionTitle,
} = useSectionHandler()



const handleInput = (content: string) => {
    slidesStore.updateSlide({ remark: content })
}
const setDialogForExport = (type: DialogForExportTypes) => {
    mainStore.setDialogForExport(type)

}



const showRemarkEditor = reactive([]); // 改为数组

const toggleRemarkEditor = (index) => {
    hideALLRemarkEditor(); // 先关闭所有
    showRemarkEditor[index] = !showRemarkEditor[index]; // 再打开当前
};
// 隐藏单个备注编辑器（更准确的方法名）
const hideRemarkEditor = (index) => {
    showRemarkEditor[index] = false;
}
const hideALLRemarkEditor = () => {
    showRemarkEditor.fill(true); // 数组可用 .fill()
};

// 更新幻灯片备注
const updateSlideRemark = (index, content) => {
    const slide = slides.value[index]
    slidesStore.updateSlide({ remark: content }, slide.id)
}

// 获取备注预览文本
const getRemarkPreview = (remark) => {
    if (!remark) return ''
    const doc = new DOMParser().parseFromString(remark, 'text/html')
    return doc.body.textContent?.slice(0, 999)  || ''
}
// 页面被切换时
const thumbnailsRef = ref<InstanceType<typeof Draggable>>()
watch(() => slideIndex.value, () => {

  // 清除多选状态的幻灯片
  if (selectedSlidesIndex.value.length) {
    mainStore.updateSelectedSlidesIndex([])
  }

  // 检查当前页缩略图是否在可视范围，不在的话需要滚动到对应的位置
  nextTick(() => {
    const activeThumbnailRef: HTMLElement = thumbnailsRef.value?.$el?.querySelector('.thumbnail-item.active')
    if (thumbnailsRef.value && activeThumbnailRef && !isElementInViewport(activeThumbnailRef, thumbnailsRef.value.$el)) {
      setTimeout(() => {
        activeThumbnailRef.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  })
}, { immediate: true })

const openZMPanel = () => {
    mainStore.setZMPanelState(false)
}

// 切换页面
const changeSlideIndex = (index: number) => {
  mainStore.setActiveElementIdList([])

  if (slideIndex.value === index) return
  slidesStore.updateSlideIndex(index)

}
const closAIZMpageVisible = () => mainStore.setAIZMpageVisibleState(false)
// 点击缩略图
const handleClickSlideThumbnail = (e: MouseEvent, index: number) => {
  if (editingSectionId.value) return

  const isMultiSelected = selectedSlidesIndex.value.length > 1

  if (isMultiSelected && selectedSlidesIndex.value.includes(index) && e.button !== 0) return

  // 按住Ctrl键，点选幻灯片，再次点击已选中的页面则取消选中
  // 如果被取消选中的页面刚好是当前激活页面，则需要从其他被选中的页面中选择第一个作为当前激活页面
  if (ctrlKeyState.value) {
    if (slideIndex.value === index) {
      if (!isMultiSelected) return

      const newSelectedSlidesIndex = selectedSlidesIndex.value.filter(item => item !== index)
      mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      changeSlideIndex(selectedSlidesIndex.value[0])
    }
    else {
      if (selectedSlidesIndex.value.includes(index)) {
        const newSelectedSlidesIndex = selectedSlidesIndex.value.filter(item => item !== index)
        mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      }
      else {
        const newSelectedSlidesIndex = [...selectedSlidesIndex.value, index]
        mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
      }
    }
  }
  // 按住Shift键，选择范围内的全部幻灯片
  else if (shiftKeyState.value) {
    if (slideIndex.value === index && !isMultiSelected) return

    let minIndex = Math.min(...selectedSlidesIndex.value)
    let maxIndex = index

    if (index < minIndex) {
      maxIndex = Math.max(...selectedSlidesIndex.value)
      minIndex = index
    }

    const newSelectedSlidesIndex = []
    for (let i = minIndex; i <= maxIndex; i++) newSelectedSlidesIndex.push(i)
    mainStore.updateSelectedSlidesIndex(newSelectedSlidesIndex)
  }
  // 正常切换页面
  else {
    mainStore.updateSelectedSlidesIndex([])
    changeSlideIndex(index)
  }
    toggleRemarkEditor( index)
}

// 设置缩略图工具栏聚焦状态（只有聚焦状态下，该部分的快捷键才能生效）
const setThumbnailsFocus = (focus: boolean) => {
  if (thumbnailsFocus.value === focus) return
  mainStore.setThumbnailsFocus(focus)

  if (!focus) mainStore.updateSelectedSlidesIndex([])
}

// 拖拽调整顺序后进行数据的同步
const handleDragEnd = (eventData: { newIndex: number; oldIndex: number }) => {
  const { newIndex, oldIndex } = eventData
  if (newIndex === undefined || oldIndex === undefined || newIndex === oldIndex) return
  sortSlides(newIndex, oldIndex)
}

// 打开批注面板
const openNotesPanel = () => {
  mainStore.setNotesPanelState(true)
}

const editingSectionId = ref('')

const editSection = (id: string) => {
  mainStore.setDisableHotkeysState(true)
  editingSectionId.value = id || 'default'

  nextTick(() => {
    const inputRef = document.querySelector(`#section-title-input-${id || 'default'}`) as HTMLInputElement
    inputRef.focus()
  })
}

const saveSection = (e: FocusEvent | KeyboardEvent) => {
  const title = (e.target as HTMLInputElement).value
  updateSectionTitle(editingSectionId.value, title)

  editingSectionId.value = ''
  mainStore.setDisableHotkeysState(false)
}

const insertAllTemplates = (slides: Slide[]) => {
  if (isEmptySlide.value) slidesStore.setSlides(slides)
  else addSlidesFromData(slides)
}

const contextmenusSection = (el: HTMLElement): ContextmenuItem[] => {
  const sectionId = el.dataset.sectionId!

  return [
    {
      text: '删除节',
      handler: () => removeSection(sectionId),
    },
    {
      text: '删除节和幻灯片',
      handler: () => {
        mainStore.setActiveElementIdList([])
        removeSectionSlides(sectionId)
      },
    },
    {
      text: '删除所有节',
      handler: removeAllSection,
    },
    {
      text: '重命名节',
      handler: () => editSection(sectionId),
    },
  ]
}

const { enterScreening, enterScreeningFromStart } = useScreening()

const contextmenusThumbnails = (): ContextmenuItem[] => {
  return [
    {
      text: '粘贴',
      subText: 'Ctrl + V',
      handler: pasteSlide,
    },
    {
      text: '全选',
      subText: 'Ctrl + A',
      handler: selectAllSlide,
    },
    {
      text: '新建页面',
      subText: 'Enter',
      handler: createSlide,
    },
    {
      text: '幻灯片放映',
      subText: 'F5',
      handler: enterScreeningFromStart,
    },
  ]
}

const contextmenusThumbnailItem = (): ContextmenuItem[] => {
  return [
    {
      text: '剪切',
      subText: 'Ctrl + X',
      handler: cutSlide,
    },
    {
      text: '复制',
      subText: 'Ctrl + C',
      handler: copySlide,
    },
    {
      text: '粘贴',
      subText: 'Ctrl + V',
      handler: pasteSlide,
    },
    {
      text: '全选',
      subText: 'Ctrl + A',
      handler: selectAllSlide,
    },
    { divider: true },
    {
      text: '新建页面',
      subText: 'Enter',
      handler: createSlide,
    },
    {
      text: '复制页面',
      subText: 'Ctrl + D',
      handler: copyAndPasteSlide,
    },
    {
      text: '删除页面',
      subText: 'Delete',
      handler: () => deleteSlide(),
    },
    {
      text: '增加节',
      handler: createSection,
      disable: !!currentSlide.value.sectionTag,
    },
    { divider: true },
    {
      text: '从当前放映',
      subText: 'Shift + F5',
      handler: enterScreening,
    },
  ]
}
</script>

<style lang="scss" scoped>
.thumbnails {
  border-right: solid 1px $borderColor;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  user-select: none;
}
.add-slide {
  height: 40px;
  font-size: 12px;
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid $borderColor;
  cursor: pointer;

  .btn {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
      background-color: $lightGray;
    }
  }
  .select-btn {
    width: 30px;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-left: 1px solid $borderColor;

    &:hover {
      background-color: $lightGray;
    }
  }

  .icon {
    margin-right: 3px;
    font-size: 14px;
  }
}
.thumbnail-list {
  padding: 5px 0;
  flex: 1;
  overflow: auto;
}
.thumbnail-item.active.selected{
  .remark{
    background: #f2f3f3;
  }
}
.thumbnail-item {
  display: flex;
  justify-content: flex-start; /* 水平居左 */
  align-items: center;     /* 垂直居上（如果需要垂直居中则保持 center） */
  padding: 5px 0;
  position: relative;

  .remark {
    width: 80%;
    height: 90px;

    margin: 0px 12px 0px 10px;
    transition: border-color .2s linear;
    word-wrap: break-word;
    overflow-y: auto;
    outline: none;
    padding: 10px 16px 10px 20px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 24px;
    letter-spacing: 1px;
    word-break: normal;
    box-sizing: border-box;
    border: 1px solid transparent;
    ::v-deep(.ProseMirror) {
      height: 100%;
      font-size: 12px;
      overflow: auto;
      padding: 8px;
      line-height: 1.5;

      & > p[data-placeholder]::before {
        content: attr(data-placeholder);
        pointer-events: none;
        position: absolute;
        font-size: 12px;
        color: rgba(#666, 0.5);
      }
    }
  }

  .thumbnail {
    border-radius: $borderRadius;
    outline: 2px solid rgba($color: $themeColor, $alpha: .15);
  }

  &.active {
    .label {
      color: $themeColor;
    }
    .thumbnail {
      outline-color: $themeColor;
    }
  }
  &.selected {
    .thumbnail {
      outline-color: $themeColor;
    }
    .note-flag {
      background-color: $themeColor;

      &::after {
        border-top-color: $themeColor;
      }
    }
  }

  .note-flag {
    width: 16px;
    height: 12px;
    border-radius: 1px;
    position: absolute;
    left: 8px;
    top: 13px;
    font-size: 8px;
    background-color: rgba($color: $themeColor, $alpha: .75);
    color: #fff;
    text-align: center;
    line-height: 12px;
    cursor: pointer;

    &::after {
      content: '';
      width: 0;
      height: 0;
      position: absolute;
      top: 10px;
      left: 4px;
      border: 4px solid transparent;
      border-top-color: rgba($color: $themeColor, $alpha: .75);
    }
  }
}
.label {
  font-size: 12px;
  color: #999;
  width: 20px;
  cursor: grab;
  margin: 0px 10px 0px 17px;
  &.offset-left {
    position: relative;
    left: -4px;
  }

  &:active {
    cursor: grabbing;
  }
}
.page-number {
  height: 40px;
  font-size: 12px;
  border-top: 1px solid $borderColor;
  line-height: 40px;
  text-align: end;
  color: #666;
}
.section-title {
  height: 26px;
  font-size: 12px;
  padding: 6px 8px 2px 18px;
  color: #555;

  &.contextmenu-active {
    color: $themeColor;

    .text::before {
      border-bottom-color: $themeColor;
      border-right-color: $themeColor;
    }
  }

  .text {
    display: flex;
    align-items: center;
    position: relative;

    &::before {
      content: '';
      width: 0;
      height: 0;
      border-top: 3px solid transparent;
      border-left: 3px solid transparent;
      border-bottom: 3px solid #555;
      border-right: 3px solid #555;
      margin-right: 5px;
    }

    .text-content {
      display: inline-block;
      @include ellipsis-oneline();
    }
  }

  input {
    width: 100%;
    border: 0;
    outline: 0;
    padding: 0;
    font-size: 12px;
  }

}
.icon-text-container {
  display: flex;
  flex-direction: column;  /* 图标和文字垂直排列 */
  align-items: center;     /* 水平居中 */
  justify-content: center; /* 垂直居中 */
  height: 100%;            /* 确保容器有高度（如果父容器没有固定高度，可以用 min-height） */
  margin-left: auto;       /* 保持原有的右对齐 */
}

.icon-label {
  margin-top: 4px;         /* 图标和文字之间的间距 */
  font-size: 12px;
}
.configs {

  height: calc(100% - 100px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;
  text-align: center;
  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {

  }
  .config-item {
    flex: 1;
  }

  .tip {
    font-size: 12px;
    color: #aaa;
    line-height: 1.8;
    margin-top: 25px;
  }
}
.btns {

  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;

  .export {

  }
  .close {

    margin-left: 10px;
  }
}

.ppt-text-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 100%;
  margin-left: auto;
  position: absolute;
  left: 47px;
  align-content: flex-end;
  bottom: 5px;
  flex-direction: row;

  span {
    width: 140px;
    display: inline-block;
    padding: 3px;
    background-color: rgba(128, 128, 128, 0.5);
    color: rgb(250 253 244);
    border: 1px solid rgba(128, 128, 128, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    font-size: 12px;
  }

  /* 悬停效果 */
  span:hover {
    background-color: rgba(128, 128, 128, 0.7); /* 悬停时加深背景 */
    color: rgb(209 68 36); /* 悬停时加深字体 */
  }

}
</style>
