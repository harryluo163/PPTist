<template>
    <div class="export-img-dialog">
        <template v-if="step === 'first'">
            <div class="thumbnails-view">
                <div class="thumbnails" ref="imageThumbnailsRef">
                    <ThumbnailSlide
                        class="thumbnail"
                        v-for="slide in renderSlides"
                        :key="slide.id"
                        :slide="slide"
                        :size="1600"
                    />
                </div>
            </div>
            <div class="configs">
                <div class="row">
                    <div class="title">添加字幕：</div>
                    <div class="config-item">
                        <span>{{videoZMSTR}}</span>
                        <Button @click="handleAIZM"  class="button default" style="
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
                  font-weight: 700;">脚本总览</span>
                        </Button>
                    </div>
                </div>
                <div class="row">
                    <div class="title">音&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp色：</div>
                    <span class="config-item">{{ videoModel }}</span>
                    <div class="icon-text-container"  @click="toggleSelectAcousticPanel()">
                        <IconAcoustic style="color: #009688" class="handler-item"  v-tooltip="'选择音色'" />

                    </div>
                </div>
                <div class="row">
                    <div class="title">背景音乐：</div>
                    <Select
                        class="config-item"
                        v-model:value="MP4Store.bkmusic"
                        :options="[
                            { label: '企业青春励志', value: 'bgm3' },
                            { label: '钢琴曲', value: 'bgm' },
                            { label: '宏伟世界交响曲', value: 'bgm1' },
                            { label: '壮丽山河交响曲', value: 'bgm2' },
                            { label: '企业青春励志', value: 'bgm3' },
                            { label: '无', value: '' },
                          ]"
                    />
                </div>
                <div class="row">
                    <div class="title">分&nbsp辨&nbsp&nbsp率：</div>
                    <Select
                        class="config-item"
                        v-model:value="MP4Store.fbl"
                        :options="[
                            { label: '540P 流畅', value: 540 },
                            { label: '720P 高清', value: 720 },
                            { label: '1080p 高清', value: 1080 },
                            { label: '2k 超清', value: 2048 },
                            { label: '4k 超高清', value: 4096 },
                          ]"
                    />
                </div>
                <div class="row">
                    <div class="title">格&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp式：</div>
                    <Select
                        class="config-item"
                        v-model:value="MP4Store.videoFormat"
                        :options="[
                            { label: 'mp4', value: 'mp4' },
                            { label: 'mov', value: 'mov' },
                            { label: 'webm', value: 'webm' },
                              { label: 'mkv', value: 'mkv' },
                          ]"
                    />
                </div>

<!--                <div class="row">-->
<!--                    <div class="title">速率：</div>-->
<!--                    <Select-->
<!--                        class="config-item"-->
<!--                        v-model:value="MP4Store.videoFPS "-->
<!--                        :options="[-->
<!--                            { label: '1fps', value: '1' },-->
<!--                            { label: '24fps', value: '24' }-->
<!--                          ]"-->
<!--                    />-->
<!--                </div>-->
<!--                <div class="row">-->
<!--                    <div class="title">码率：</div>-->
<!--                    <Select-->
<!--                        class="config-item"-->
<!--                        v-model:value="videoMa"-->
<!--                        :options="[-->
<!--            { label: '推荐', value: '推荐' }-->
<!--          ]"-->
<!--                    />-->
<!--                </div>-->


                <div class="row">
                    <div class="title">水&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp印：</div>
                    <div class="config-item">
                        <Switch v-model:value="MP4Store.videoSy" v-tooltip="'默认无水印'" />
                    </div>

                </div>


                <div class="row" v-if="resultArray.length>0">
                    <div class="title">已上传幻灯片：</div>
                    <span class="config-item">{{ resultArray.length }}/{{slides.length}}页</span>
<!--                    <span class="config-item" @click="setDialogForExport('image')"> <a href="javascript:void(0)" >导出图片</a></span>-->
                </div>

                <div class="row" v-if="audio">
                    <div class="title">语音下载：</div>
                    <span class="config-item"><a :href="audio" target="_blank">音频下载</a></span>
                </div>
                <div class="row" v-if="MP4Store.isGenerating_video||video!=''">
                    <div class="title" v-if="video">视&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp频：</div>
                    <!-- 修改后的进度条容器 -->
                    <div v-if="video==''" class="progress-container video-progress-container">
                        <div class="title">视频：</div>
                        <div class="config-item progress-wrapper">
                            <div class="custom-progress"
                                 :class="{ 'completed': isCompleted, 'error': hasError }">
                                <div class="progress-bar"
                                     :style="{ width: `${MP4Store.progress}%` }">
                                    <div class="percentage-tooltip">
                                        {{ MP4Store.progress }}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <span class="config-item" v-if="video"> <a :href="video" target="_blank">视频下载</a></span>

                </div>

                <div class="row">
                    <div v-if="video==''" class="log-line">
                        {{ MP4Store.logs }}
                    </div>
                </div>
                <div class="btns">
                    <Button class="btn export" type="primary" @click="expImage()" v-if="!zm">导出视频</Button>
                    <Button class="btn close" @click="handleClose">关闭</Button>
                </div>
            </div>





        </template>



        <FullscreenSpin :loading="exporting" tip="导出中，请耐心等待 ..."/>
    </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {useMainStore, useSlidesStore} from '@/store'
import useExport from '@/hooks/useExport'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import Switch from '@/components/Switch.vue'
import Slider from '@/components/Slider.vue'
import Button from '@/components/Button.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import Input from "@/components/Input.vue";
import {useMP4Store} from "@/store/mp4";
import OutlineEditor from "@/components/OutlineEditor.vue";
import alibb_audio from '@/assets/alibb_audio.json';
import Select from "@/components/Select.vue";
import {ACOUSTICS} from "@/configs/Acoustic";

const subtitle = ref('')
const subtitleCreating = ref(false)

const step = ref<'first' | 'subtitle' | 'audio'>('first')

const emit = defineEmits<{
    (event: 'close'): void
}>()
const slidesStore = useSlidesStore()
const {slides, currentSlide} = storeToRefs(slidesStore)

const imageThumbnailsRef = ref<HTMLElement>()
const rangeType = ref<'all' | 'current' | 'custom'>('all')
const range = ref<[number, number]>([1, slides.value.length])
const format = ref<'jpeg' | 'png'>('jpeg')




const videoModel = ref('')
const videoZMSTR = ref('无')
const quality = ref(1)
const ignoreWebfont = ref(true)
const email = ref<string>();
const emailError = ref<string>();
const previewImages = ref<Array<{ url: string; size: number }>>([])
const MP4Store = useMP4Store()
// 状态计算属性
const isCompleted = computed(() => MP4Store.progress >= 100)
const hasError = computed(() => MP4Store.error)
const {resultArray, zm, audio, video,getZM} = storeToRefs(MP4Store)
const showPercentage = ref(false)
const mainStore = useMainStore()
const mp4Store = useMP4Store();
const { model } = storeToRefs(mp4Store)

import { ACOUSTICS } from "@/configs/Acoustic";
import {DialogForExportTypes} from "@/types/export";
const renderSlides = computed(() => {
    if (rangeType.value === 'all') return slides.value
    if (rangeType.value === 'current') return [currentSlide.value]
    return slides.value.filter((item, index) => {
        const [min, max] = range.value
        return index >= min - 1 && index <= max - 1
    })
})

const {exportMP4, exporting} = useExport()

onMounted(() => {

    updateVideoZM()
})

watch(() => model.value, (newVal) => {
    updateVideoModel();
});
watch(() => slides.value, (newVal) => {
    updateVideoZM()
});
const updateVideoZM = () =>{
    let zmlength=0
    slides.value.forEach(slide => {
        if (slide.remark) {
            zmlength++
            videoZMSTR.value+=slide.remark
        }
    })
    if(videoZMSTR.value!=""&&zmlength==slides.value.length){
        videoZMSTR.value=`字幕加载成功`
    }else if(videoZMSTR.value!=""&&zmlength!=slides.value.length)
    {
        videoZMSTR.value=`${zmlength}/${slides.value.length}页字幕缺失`
    }

}

const updateVideoModel = () =>{
    const defaultAcoustic = ACOUSTICS.find(item => item.value === model.value);
    if (defaultAcoustic) {
        videoModel.value = defaultAcoustic.特色+ " "+defaultAcoustic.音色 +" "+defaultAcoustic.适用场景 ;
    } else if (ACOUSTICS.length > 0) {
        videoModel.value =  ACOUSTICS[0].特色+ " "+ACOUSTICS[0].音色 +" "+ ACOUSTICS[0].适用场景 ;
    }
}

onMounted(() => {
    updateVideoModel()
});

const validateEmail = () => {
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        emailError.value = '请输入有效的邮箱地址';
        return false;
    }
    emailError.value = undefined;
    return true;
};


const expImage = async () => {
    if (!imageThumbnailsRef.value) return
    if (email.value && !validateEmail()) return

    exporting.value = true
    try {
        await exportMP4(imageThumbnailsRef.value, format.value, quality.value, ignoreWebfont.value, email.value)
        // 导出成功后可以清空预览或显示成功消息
    } catch (error) {
        console.error('导出失败:', error)
    } finally {
        exporting.value = false
    }
}

// 修改关闭按钮逻辑
const handleClose = () => {
    clearStoreData() // 先清理数据
    emit('close')    // 再触发关闭事件
}
const clearStoreData = () => {
    MP4Store.clearAudio()
    MP4Store.clearSubtitle()
    MP4Store.clearResultArray()
    MP4Store.clearVideo()
    MP4Store.isGenerating_video = false
}
onUnmounted(() => {
    clearStoreData()
})
const handleAIZM = () => {
    emit('close')    // 再触发关闭事件
    mainStore.setZMPanelState(true)
}

const toggleSelectAcousticPanel = () => {
    mainStore.setAcousticPanelState(true)
}
const setDialogForExport = (type: DialogForExportTypes) => {
    mainStore.setDialogForExport(type)
}
</script>

<style lang="scss" scoped>
.video-progress-container {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 10px;

  .video-label {
    white-space: nowrap;
    font-size: 14px;
  }

  .progress-wrapper {
    flex: 1;
  }
}

.export-img-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.thumbnails-view {
  @include absolute-0();

  &::after {
    content: '';
    background-color: #fff;
    @include absolute-0();
  }
}

.configs {
    width: 350px;
    height: calc(100% - 100px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 1;

    .row {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 18px;
    }

    .title {
        width: 100px;
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
    width: 300px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;

    .export {
        flex: 1;
    }
    .close {
        width: 100px;
        margin-left: 10px;
    }
}
</style>
<style scoped>
/* 修改后的样式 */
.progress-container {
    width: 100%;
    margin: 10px 0;
}

.custom-progress {
    height: 32px; /* 增加高度 */
    background: #f5f5f5;
    border-radius: 16px; /* 更大的圆角 */
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 260px; /* 固定宽度 */
}

.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #2196F3, #1976D2); /* 更醒目的蓝色渐变 */
    border-radius: 16px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 2px 0 12px rgba(33, 150, 243, 0.3);
}

/* 状态样式增强 */
.custom-progress.completed {
    border: 2px solid #4CAF50;
    background: #e8f5e9;
}

.custom-progress.error {
    border: 2px solid #f44336;
    background: #ffebee;
}

/* 百分比提示优化 */
.percentage-tooltip {
    right: 12px;
    top: 50%;
    background: rgb(231 225 225 / 0%);
    color: white;
    padding: 0px 15px;
    border-radius: 2px;
    font-size: 14px;
    font-weight: 500;
    line-height: 34px;
    margin-top: 0px;
}

/* 状态图标优化 */
.status-icon {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 16px; /* 增大字体 */
    font-weight: 500;
    gap: 12px;
}

/* 加载动画放大 */
.loading-spinner {
    width: 20px;
    height: 20px;
    border-width: 2.5px;
    border-top-color: #2196F3;
}

/* 响应式调整 */
@media (max-width: 768px) {
    .custom-progress {
        height: 28px;
    }

    .status-icon {
        font-size: 14px;
    }
}


</style>


<style>

</style>
