<template>
    <div >
        <div class="configs">
            是否为{{slides.length}}页幻灯片生成脚本？
        </div>
        <div class="btns">
            <Button class="btn export" type="primary" @click="aiZM()">确认</Button>
            <Button class="btn close" type="primary" @click="AIZMpageVisible = false">关闭</Button>
        </div>

    </div>
</template>

<script setup>
import Button from "@/components/Button.vue";
import { ref, onMounted } from "vue";

import {useKeyboardStore, useMainStore, useSlidesStore} from '@/store'
import {useMP4Store} from "@/store/mp4";
import {storeToRefs} from "pinia";
import Modal from "@/components/Modal.vue";
import FullscreenSpin from "@/components/FullscreenSpin.vue";
import useExport from "@/hooks/useExport";
import useImport from "@/hooks/useImport";
const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const keyboardStore = useKeyboardStore()
const mp4Store = useMP4Store();
const selectedAcoustic =ref('sambert-zhinan-v1');

const { showAcousticPanel,AIZMpageVisible,showZMPanel } = storeToRefs(mainStore)
const { slides, slideIndex, currentSlide } = storeToRefs(slidesStore)
const { model,ttId,aiLoading } = storeToRefs(mp4Store)
const {exportZMv2, convertAISlidesToText, convertSlidesToAISlides} = useExport()
import { defineEmits } from 'vue';


const aiZM=async () => {
    AIZMpageVisible.value = false
    showZMPanel.value = true
    ttId.value = Date.now(); // 触发 Draggable 重新渲染
    await exportZMv2(convertSlidesToAISlides(),ttId.value)

}
</script>

<style lang="scss" scoped>
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
</style>
