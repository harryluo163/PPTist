<template>
    <div class="latex-editor">
        <div class="header">
            <div class="title">选择音色（随机切换）</div>
        </div>
        <div class="theme-list">
            <div
                class="theme-item"
                v-for="(item, index) in ACOUSTICS"
                :key="index"
                :class="{ 'selected': selectedAcoustic === item.value }"
                @click="selectAcoustic(item.value)"
            >
                <div class="theme-item-content">
                    <div class="theme-info">
                        <div class="text">
                            <img class="theme-icon" src="/img/p (1).jpg">
                            <span class="theme-feature">{{ item.特色 }}</span>
                        </div>
                        <div class="theme-description">{{ item.音色 }}{{ item.适用场景 }}</div>
                    </div>
                    <audio :src="item.音频试听" controls class="audio-player"></audio>
                </div>
            </div>
        </div>
        <div class="footer">
            <Button class="btn cancel-btn" @click="closePanel()">取消</Button>
            <Button class="btn confirm-btn" type="primary" @click="update()">设置并应用</Button>
        </div>
    </div>
</template>

<script setup>
import Button from "@/components/Button.vue";
import { ACOUSTICS } from "@/configs/Acoustic";
import { ref, onMounted } from "vue";

import {useMainStore, useSlidesStore} from '@/store'
import {useMP4Store} from "@/store/mp4";
import {storeToRefs} from "pinia";
const mainStore = useMainStore()
const slideStore = useSlidesStore()
const mp4Store = useMP4Store();
const selectedAcoustic =ref('sambert-zhinan-v1');

const { showAcousticPanel } = storeToRefs(mainStore)
const { model } = storeToRefs(mp4Store)

onMounted(() => {
    mp4Store.init();
});


const selectAcoustic = (value) => {
    selectedAcoustic.value = value;
};

const closePanel = () => {
    mainStore.setAcousticPanelState(false)
};
const update = () => {
    mp4Store.updatemodel(selectedAcoustic.value);
    closePanel();
};

// 默认选中model参数为acoustic的项
onMounted(() => {
    const defaultAcoustic = ACOUSTICS.find(item => item.value === model.value);
    if (defaultAcoustic) {
        selectedAcoustic.value = defaultAcoustic.value;
    } else if (ACOUSTICS.length > 0) {
        selectedAcoustic.value = ACOUSTICS[0].value;
    }
});
</script>

<style lang="scss" scoped>
.latex-editor {
    .header {
        height: 35px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 1px;
        cursor: move;

        .title {
            flex: 1;
            font-size: 13px;
            padding-left: 10px;
        }
    }

    .theme-list {
        display: flex;
        flex-wrap: wrap;
        height: 500px;
        overflow-y: auto;
        padding: 10px 0;
    }

    .theme-item {
        width: calc(25% - 10px);
        margin: 0 10px 10px 0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;

        &:nth-child(4n) {
            margin-right: 0;
        }

        &.selected {
            .theme-item-content {
                border-color: #1890ff;
                box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
            }
        }

        .theme-item-content {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
            padding: 12px;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            background-color: #fff;

            &:hover {
                border-color: #1890ff;
            }
        }

        .theme-info {
            margin-bottom: 10px;

            .text {
                display: flex;
                align-items: center;
                margin-bottom: 8px;

                .theme-icon {
                    border-radius: 999px;
                    width: 20px;
                    height: 20px;
                }

                .theme-feature {
                    color: #121926;
                    font-size: 14px;
                    font-weight: 500;
                    line-height: 22px;
                    margin-left: 8px;
                }
            }

            .theme-description {
                max-width: 204px;
                line-height: 20px;
                font-size: 12px;
                max-height: 40px;
                text-overflow: ellipsis;
                overflow: hidden;
                color: rgba(18, 25, 38, 0.6);
            }
        }

        .audio-player {
            transform: scale(0.7);
            transform-origin: left;
            width: 145%;
        }
    }

    .footer {
        display: flex;
        justify-content: flex-end;
        padding: 16px 20px;
        border-top: 1px solid #f0f0f0;

        .btn {
            margin-right: 10px;

            &:last-child {
                margin-right: 0;
            }
        }

        .cancel-btn {
            margin-right: 10px;
        }

        .confirm-btn {
            margin-right: 20px;
        }
    }
}
</style>
