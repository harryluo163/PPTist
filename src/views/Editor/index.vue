<template>
  <div class="pptist-editor">
    <EditorHeader class="layout-header" />
    <div class="layout-content"  v-if="!showZMPanel" >
      <Thumbnails class="layout-content-left" />
      <div class="layout-content-center">
        <CanvasTool class="center-top" />
        <Canvas class="center-body" :style="{ height: `calc(100% - ${remarkHeight + 40}px)` }" />
        <Remark
          class="center-bottom"
          v-model:height="remarkHeight"
          :style="{ height: `${remarkHeight}px` }"
        />
      </div>
      <Toolbar class="layout-content-right" />
    </div>
    <div class="layout-content"  v-if="showZMPanel" >
        <Thumbnails_ZM class="layout-content-left"  style="width: 100%"/>
    </div>
  </div>

  <SelectPanel v-if="showSelectPanel" />
  <SearchPanel v-if="showSearchPanel" />
  <NotesPanel v-if="showNotesPanel" />
  <MarkupPanel v-if="showMarkupPanel" />

  <Modal
    :visible="!!dialogForExport"
    :width="680"
    @closed="closeExportDialog()"
  >
    <ExportDialog />
  </Modal>

  <Modal
    :visible="showAIPPTDialog"
    :width="720"
    :closeOnClickMask="false"
    :closeOnEsc="false"
    closeButton
    @closed="closeAIPPTDialog()"
  >
    <AIPPTDialog />
  </Modal>
    <Modal
            :visible="showAcousticPanel"
            :width="800"
            :closeOnClickMask="false"
            :closeOnEsc="false"
            closeButton
            @closed="closeAcousticPanel()"
    >
        <AcousticDialog  />
    </Modal>


    <Modal
            :visible="AIZMpageVisible"
            :width="520"
            @closed="closAIZMpageVisible()"

    >
        <AIZMDialog />

    </Modal>
    <FullscreenSpin :loading="aiLoading" tip="导出中，请耐心等待 ..." :mask="false"/>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import useGlobalHotkey from '@/hooks/useGlobalHotkey'
import usePasteEvent from '@/hooks/usePasteEvent'

import EditorHeader from './EditorHeader/index.vue'
import Canvas from './Canvas/index.vue'
import CanvasTool from './CanvasTool/index.vue'
import Thumbnails from './Thumbnails/index.vue'
import Thumbnails_ZM from './ZM/index.vue'
import Toolbar from './Toolbar/index.vue'
import Remark from './Remark/index.vue'
import ExportDialog from './ExportDialog/index.vue'
import SelectPanel from './SelectPanel.vue'
import SearchPanel from './SearchPanel.vue'
import NotesPanel from './NotesPanel.vue'
import MarkupPanel from './MarkupPanel.vue'
import AIPPTDialog from './AIPPTDialog.vue'
import Modal from '@/components/Modal.vue'
import AcousticDialog from './AcousticDialog.vue'
import Button from "@/components/Button.vue";
import AIZMDialog from './ZM/AIZMDialog.vue'
import FullscreenSpin from "@/components/FullscreenSpin.vue";
import {useMP4Store} from "@/store/mp4";
const mainStore = useMainStore()
const mp4Store = useMP4Store();
const { dialogForExport, showSelectPanel, showSearchPanel, showNotesPanel, showMarkupPanel, showAIPPTDialog,showZMPanel,showAcousticPanel, AIZMpageVisible } = storeToRefs(mainStore)
const { ttId,aiLoading } = storeToRefs(mp4Store)
const closeExportDialog = () => mainStore.setDialogForExport('')
const closeAIPPTDialog = () => mainStore.setAIPPTDialogState(false)
const closeAcousticPanel = () => mainStore.setAcousticPanelState(false)
const closAIZMpageVisible = () => mainStore.setAIZMpageVisibleState(false)
const remarkHeight = ref(180)

useGlobalHotkey()
usePasteEvent()
const QueryString = (val: string): string | null => {
    const uri = window.location.href;
    const re = new RegExp(`${val}=([^\&\?]*)`, "ig");
    const match = uri.match(re);
    return match?.[0]?.substr(val.length + 1) || null; // 修正1：安全访问操作符
}
onMounted(() => {
    setTimeout(() => {
        //通过url参数p获取大纲
        if (QueryString("p")||QueryString("t")) {
            mainStore.setAIPPTDialogState(true)
        }
    }, 100)
})
</script>

<style lang="scss" scoped>
.pptist-editor {
  height: 100%;
}
.layout-header {
  height: 40px;
}
.layout-content {
  height: calc(100% - 40px);
  display: flex;
}
.layout-content-left {
  width: 160px;
  height: 100%;
  flex-shrink: 0;
}
.layout-content-center {
  width: calc(100% - 160px - 260px);

  .center-top {
    height: 40px;
  }
}
.layout-content-right {
  width: 260px;
  height: 100%;
}
</style>
