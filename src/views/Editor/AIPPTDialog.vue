<template>
    <div class="aippt-dialog">
        <div class="header">

            <span class="subtite" v-if="step === 'template'">从下方挑选合适的模板，开始生成PPT</span>
            <span class="subtite"
                  v-else-if="step === 'outline'">确认下方内容大纲（点击编辑内容，右键添加/删除大纲项），开始选择模板</span>
            <span class="subtite" v-else>
        <div class="card-container">
            <div :class="step == 'setup'?'card active' : 'card '" @click="keyword = '';outline = ''; step = 'setup'">
                <div class="card-icon"><svg stroke="currentColor" fill="currentColor" stroke-width="0"
                                            viewBox="0 0 24 24" height="30px" width="30px"
                                            xmlns="http://www.w3.org/2000/svg"><path fill="none"
                                                                                     d="M0 0h24v24H0z"></path><path
                        d="M18.41 5.8L17.2 4.59c-.78-.78-2.05-.78-2.83 0l-2.68 2.68L3 15.96V20h4.04l8.74-8.74 2.63-2.63c.79-.78.79-2.05 0-2.83zM6.21 18H5v-1.21l8.66-8.66 1.21 1.21L6.21 18zM11 20l4-4h6v4H11z"></path></svg></div>
                <span class="card-text">AI智能创作</span>
            </div>
            <div :class="step == 'paste'? 'card active':'card'" @click="keyword = '';outline = ''; step = 'paste'">
                <div class="card-icon"><svg stroke="currentColor" fill="currentColor" stroke-width="0"
                                            viewBox="0 0 512 512" height="30px" width="30px"
                                            xmlns="http://www.w3.org/2000/svg"><path
                        d="M408 64H96c-22.002 0-32 17.998-32 40v344l64-64h280c22.002 0 40-17.998 40-40V104c0-22.002-17.998-40-40-40zM198.4 242H160v-40h38.4v40zm76.8 0h-38.4v-40h38.4v40zm76.8 0h-38.4v-40H352v40z"></path></svg></div>
                <span class="card-text">粘贴大纲生成</span>
            </div>

        </div>

         </span>
        </div>

        <template v-if="step === 'setup'">
            <span style="    font-size: 12px;"> 在下方输入您的PPT主题</span>
            <Input class="input"
                   ref="inputRef"
                   v-model:value="keyword"
                   :maxlength="50"
                   placeholder="请输入PPT主题，如：AIGC在房地产领域的应用"
                   @enter="createOutline()"
            >
                <template #suffix>
                    <span class="count">{{ keyword.length }} / 50</span>
                    <span class="language" v-tooltip="'切换语言'" @click="language = language === 'zh' ? 'en' : 'zh'">{{
                        language === 'zh' ? '中' : '英'
                        }}</span>
                    <div class="submit" type="primary" @click="createOutline()">
                        <IconSend class="icon"/>
                        AI 生成
                    </div>
                </template>
            </Input>
            <div class="recommends">
                <div class="recommend" v-for="(item, index) in recommends" :key="index" @click="setKeyword(item)">
                    {{ item }}
                </div>
            </div>
            <div class="model-selector" style="display: none">
                <div class="label">选择AI模型：</div>
                <Select
                        style="width: 160px;"
                        v-model:value="model"
                        :options="[
            { label: 'Doubao-1.5-Pro', value: 'doubao-1.5-pro-32k' },
            { label: 'DeepSeek-v3', value: 'ark-deepseek-v3' },
            { label: 'GLM-4-Flash', value: 'GLM-4-flash' }
          ]"
                />
            </div>
        </template>
        <template v-if="step == 'paste'">
            <TextArea
                    class="paste-textarea"
                    ref="inputRef"
                    v-model:value="keyword"
                    :maxlength="5000"
                    placeholder="请将PPT大纲粘贴到此处"
                    @enter="createOutline()"
            >
         </TextArea>


            <div class="submit" style="    width: 77px;
    margin-left: 45%;
    height: 41px;
    padding: 8px;
    box-shadow: 0 4px 16px rgba(33, 150, 243, 0.3);" type="primary" @click="createOutline()">
                <IconSend class="icon"/>
                AI 生成
            </div>


        </template>


        <div class="preview" v-if="step === 'outline'">
            <pre ref="outlineRef" v-if="outlineCreating">{{ outline }}</pre>
            <div class="outline-view" v-else>
                <OutlineEditor v-model:value="outline"/>
            </div>
            <div class="btns" v-if="!outlineCreating">
                <Button class="btn" type="primary" @click="step = 'template'">选择模板</Button>
                <Button class="btn" @click="outline = ''; step = 'setup'">返回重新生成</Button>
            </div>
        </div>
        <div class="select-template" v-if="step === 'template'">
            <div class="templates">
                <div class="template"
                     :class="{ 'selected': selectedTemplate === template.id }"
                     v-for="template in templates"
                     :key="template.id"
                     @click="selectedTemplate = template.id"
                >
                    <img :src="template.cover" :alt="template.name">
                </div>
            </div>
            <div class="btns">
                <Button class="btn" type="primary" @click="createPPT()">生成</Button>
                <Button class="btn" @click="step = 'outline'">返回大纲</Button>
            </div>
        </div>

        <FullscreenSpin :loading="loading" tip="AI生成中，请耐心等待 ..."/>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import api from '@/services'
import useAIPPT from '@/hooks/useAIPPT'
import type { AIPPTSlide } from '@/types/AIPPT'
import type { Slide, SlideTheme } from '@/types/slides'
import message from '@/utils/message'
import { useMainStore, useSlidesStore } from '@/store'
import Input from '@/components/Input.vue'
import TextArea from '@/components/TextArea.vue'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import OutlineEditor from '@/components/OutlineEditor.vue'
import useSlideHandler from "@/hooks/useSlideHandler";

const mainStore = useMainStore()
const slideStore = useSlidesStore()
const { resetSlides } = useSlideHandler()
const { templates } = storeToRefs(slideStore)
const { AIPPT, presetImgPool, getMdContent } = useAIPPT()

const language = ref('中文')
const style = ref('通用')
const img = ref('')
const keyword = ref('')
const outline = ref('')
const selectedTemplate = ref('template_5')
const loading = ref(false)
const outlineCreating = ref(false)
const outlineRef = ref<HTMLElement>()
const inputRef = ref<InstanceType<typeof Input>>()

const step = ref<'paste' |'setup' | 'outline' | 'template'>('setup')
const model = ref('GLM-4-Flash')


const recommends = ref([


])

const QueryString = (val: string): string | null => {
    const uri = window.location.href;
    const re = new RegExp(`${val}=([^\&\?]*)`, "ig");
    const match = uri.match(re);
    return match?.[0]?.substr(val.length + 1) || null; // 修正1：安全访问操作符
}

onMounted(() => {
    setTimeout(() => {
        const paramP = QueryString("p");
        if (paramP) {
            // 修正2：类型守卫确保paramP存在
            keyword.value = decodeURI(paramP);
            outline.value = '';
            step.value = 'paste';
            history.replaceState({}, '', location.pathname);
        }

        const paramT = QueryString("t");
        if (paramT) {
            // 修正2：类型守卫确保paramP存在
            keyword.value =  decodeURI(paramT);;
            outline.value =  decodeURI(paramT);;
            step.value = 'template';
            history.replaceState({}, '', location.pathname);
        }

        // 修正3：安全访问DOM元素
        inputRef.value?.focus?.();

    }, 300);
});

const setKeyword = (value: string) => {
    keyword.value = value
    inputRef.value!.focus()
}

const createOutline = async () => {

  if (!keyword.value) return message.error('请先输入PPT主题')

    loading.value = true
    outlineCreating.value = true

    const stream = await api.AIPPT_Outline({
        content: keyword.value,
        language: language.value,
        model: model.value,
    })

    loading.value = false
    step.value = 'outline'

    const reader: ReadableStreamDefaultReader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')

    const readStream = () => {
        reader.read().then(({ done, value }) => {
            if (done) {
                outline.value = getMdContent(outline.value)
                outline.value = outline.value.replace(/<!--[\s\S]*?-->/g, '').replace(/<think>[\s\S]*?<\/think>/g, '')
                outlineCreating.value = false
                return
            }

            const chunk = decoder.decode(value, { stream: true })
            outline.value += chunk

            if (outlineRef.value) {
                outlineRef.value.scrollTop = outlineRef.value.scrollHeight + 20
            }

            readStream()
        })
    }
    readStream()
}

const createPPT = async () => {
    // 在生成前清空PPT
    resetSlides()
    //
    // const templateData = await api.getFileData(selectedTemplate.value)
    // const templateSlides: Slide[] = templateData.slides
    // const templateTheme: SlideTheme = templateData.theme
    //
    // const slide =
    //     [
    //     {
    //     "type": "cover",
    //     "data": {
    //         "title": "深圳2025年5月房地产市场分析报告",
    //         "text": "新房降温，二手房活跃，市场分化加剧"
    //     }
    // },{
    //     "type": "contents",
    //     "data": {
    //         "items": [
    //             "市场概况",
    //             "新房市场分析",
    //             "二手房市场分析",
    //             "市场趋势分析",
    //             "建议与展望"
    //         ]
    //     }
    // },{
    //     "type": "transition",
    //     "data": {
    //         "title": "市场概况",
    //         "text": "新房降温，二手房活跃，市场呈现分化趋势"
    //     }
    // },{
    //     "type": "content",
    //     "data": {
    //         "title": "市场概况",
    //         "items": [
    //             {
    //                 "type": "title",
    //                 "title": "新房市场降温",
    //                 "text": "2025年5月，深圳新房住宅成交量环比下降7.99%，同比下降26.12%，显示出市场短期降温趋势。"
    //             },
    //             {
    //                 "type": "title",
    //                 "title": "二手房市场活跃",
    //                 "text": "二手住宅成交量虽环比下降18.2%，但同比仍增长18.3%，市场韧性较强，成交活跃。"
    //             },
    //             {
    //                 "type": "title",
    //                 "title": "区域分化明显",
    //                 "text": "龙华区新房成交面积领先，龙岗区二手房过户量最高，核心区（福田、南山、罗湖）合计占比达45%。"
    //             },
    //             {
    //                 "type": "itemFigure",
    //                 "src": "https://gpt-vis-ssr.centanet.com/images/e621c0b2-8239-4af3-a6b2-347b51fb838d.png"
    //             }
    //         ]
    //     }
    // }]
    //
    //
    //
    //
    // AIPPT(templateSlides, slide)

    loading.value = true

    const stream = await api.AIPPT({
        content: outline.value,
        language: language.value,
        style: style.value,
        model: model.value,
    })

    if (img.value === 'test') {
        const imgs = await api.getMockData('imgs')
        presetImgPool(imgs)
    }

    const templateData = await api.getFileData(selectedTemplate.value)
    const templateSlides: Slide[] = templateData.slides
    const templateTheme: SlideTheme = templateData.theme

    const reader: ReadableStreamDefaultReader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')

    const readStream = () => {
        reader.read().then(({ done, value }) => {
            if (done) {
                loading.value = false
                mainStore.setAIPPTDialogState(false)
                slideStore.setTheme(templateTheme)
                return
            }

            const chunk = decoder.decode(value, { stream: true })
            try {
                const slide: AIPPTSlide = JSON.parse(chunk)
                AIPPT(templateSlides, [slide])
            }
            catch (err) {
                // eslint-disable-next-line
                console.error(err)
            }

            readStream()
        })
    }
    readStream()
}
</script>

<style lang="scss" scoped>
.aippt-dialog {
    margin: -20px;
    padding: 30px;
}
.header {
    margin-bottom: 12px;

    .title {
        font-weight: 700;
        font-size: 20px;
        margin-right: 8px;
        background: linear-gradient(270deg, #d897fd, #33bcfc);
        background-clip: text;
        color: transparent;
        vertical-align: text-bottom;
        line-height: 1.1;
    }
    .subtite {
        color: #888;
        font-size: 12px;
    }
}
.preview {
    pre {
        max-height: 450px;
        padding: 10px;
        margin-bottom: 15px;
        background-color: #f1f1f1;
        overflow: auto;
    }
    .outline-view {
        max-height: 450px;
        padding: 10px;
        margin-bottom: 15px;
        background-color: #f1f1f1;
        overflow: auto;
    }
    .btns {
        display: flex;
        justify-content: center;
        align-items: center;

        .btn {
            width: 120px;
            margin: 0 5px;
        }
    }
}
.select-template {
    .templates {
        display: flex;
        margin-bottom: 10px;
        @include flex-grid-layout();

        .template {
            border: 2px solid $borderColor;
            border-radius: $borderRadius;
            width: 324px;
            height: 184px;
            margin-bottom: 12px;

            &:not(:nth-child(2n)) {
                margin-right: 12px;
            }

            &.selected {
                border-color: $themeColor;
            }

            img {
                width: 100%;
            }
        }
    }
    .btns {
        display: flex;
        justify-content: center;
        align-items: center;

        .btn {
            width: 120px;
            margin: 0 5px;
        }
    }
}
.recommends {
    display: flex;
    flex-wrap: wrap;
    margin-top: 10px;

    .recommend {
        font-size: 12px;
        background-color: #f1f1f1;
        border-radius: $borderRadius;
        padding: 3px 5px;
        margin-right: 5px;
        margin-top: 5px;
        cursor: pointer;

        &:hover {
            color: $themeColor;
        }
    }
}
.configs {
    margin-top: 15px;
    display: flex;
    justify-content: space-between;

    .config-item {
        font-size: 13px;
        display: flex;
        align-items: center;
    }
}
.count {
    font-size: 12px;
    color: #999;
    margin-right: 10px;
}
.submit {
    height: 20px;
    font-size: 12px;
    background-color: $themeColor;
    color: #fff;
    display: flex;
    align-items: center;
    padding: 0 8px 0 6px;
    border-radius: $borderRadius;
    cursor: pointer;

    &:hover {
        background-color: $themeHoverColor;
    }

    .icon {
        font-size: 15px;
        margin-right: 3px;
    }
}
</style>
<style>
.card-container {
    display: flex;
    gap: 16px;
    height: 60px;
    width: 100px;

    .card {
        flex: 1;
        min-width: 80px;
        padding: 2px;
        background: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card.active {
        background: #d14424;
        transform: translateY(0);
        box-shadow: 0 4px 16px rgba(33, 150, 243, 0.3);
    }

    .card-icon {
        width: 48px;
        height: 48px;

        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
    }

    .card.active .card-icon {
        color: white;
    }

    .card-text {
        font-family: 'Segoe UI', sans-serif;
        font-size: 12px;
        color: #333;
        text-align: center;
    }

    .card.active .card-text {
        color: white;
        font-weight: 500;
    }
}


</style>
