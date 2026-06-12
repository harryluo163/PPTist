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
            <div class="input-container">
                <textarea
                        class="input-textarea"
                        ref="inputRef"
                        v-model="keyword"
                        :maxlength="50"
                        placeholder="请输入PPT主题，如：AIGC在房地产领域的应用"
                        @keydown.enter="createOutline()"
                />
                <div class="input-footer">
                    <div class="page-selector-inline">
                        <span class="label">页数：</span>
                        <Select
                                style="width: 100px;"
                                v-model:value="pageRange"
                                :options="pageRangeOptions"
                        />
                    </div>
                    <span class="count">{{ keyword.length }} / 50</span>

                    <div class="submit" type="primary" @click="createOutline()">
                        <i-icon-park-outline:send class="icon"/>
                        AI 生成
                    </div>
                </div>
            </div>
            <div class="recommends">
                <div class="recommend" v-for="(item, index) in recommends" :key="index" @click="setKeyword(item)">
                    {{ item }}
                </div>
            </div>
        </template>
        <template v-if="step == 'paste'">
            <div class="input-container paste-container">
                <textarea
                        class="input-textarea paste-textarea"
                        ref="inputRef"
                        v-model="keyword"
                        :maxlength="10000"
                        placeholder="请将PPT大纲粘贴到此处"
                        @keydown.enter="createOutline()"
                />
                <div class="input-footer">
                    <div class="page-selector-inline">
                        <span class="label">页数：</span>
                        <Select
                                style="width: 100px;"
                                v-model:value="pageRange"
                                :options="pageRangeOptions"
                        />
                    </div>
                    <span class="count" :class="{ 'visible': step === 'paste' }">{{ keyword.length }} / 10000</span>
                    <div class="submit" type="primary" @click="createOutline()">
                        <i-icon-park-outline:send class="icon"/>
                        AI 生成
                    </div>
                </div>
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
            <div class="region-selector">
                <RadioGroup v-model:value="region">
                    <RadioButton value="all">全部</RadioButton>
                    <RadioButton value="hk">香港</RadioButton>
                </RadioGroup>
            </div>
            <div class="templates">
                <div class="template"
                     :class="{ 'selected': selectedTemplate === template.id }"
                     v-for="template in filteredTemplates"
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
import { ref, onMounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { jsonrepair } from 'jsonrepair'
import api from '@/services'
import useAIPPT from '@/hooks/useAIPPT'
import useSlideHandler from '@/hooks/useSlideHandler'
import type { AIPPTSlide } from '@/types/AIPPT'
import type { Slide, SlideTheme } from '@/types/slides'
import message from '@/utils/message'
import { useMainStore, useSlidesStore } from '@/store'
import Input from '@/components/Input.vue'
import TextArea from '@/components/TextArea.vue'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import RadioButton from '@/components/RadioButton.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import OutlineEditor from '@/components/OutlineEditor.vue'

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
const region = ref<'all' | 'hk'>('all')
const loading = ref(false)
const outlineCreating = ref(false)
const outlineRef = ref<HTMLElement>()
const inputRef = ref<InstanceType<typeof Input>>()
const pageRange = ref('智能生成')

const pageRangeOptions = [
    { label: '智能生成', value: '智能生成' },
    { label: '1-10页', value: '1-10' },
    { label: '10-20页', value: '10-20' },
    { label: '20-30页', value: '20-30' },
    { label: '30-50页', value: '20-50' },
    { label: '50-100页', value: '50-100' },
]

const step = ref<'paste' |'setup' | 'outline' | 'template'>('setup')
const model = ref('GLM-4-Flash')

const isHKTemplate = (tpl: { id: string; name: string }) => {
    return /^HK_/i.test(tpl.name) || /^template_hk/i.test(tpl.id)
}

const filteredTemplates = computed(() => {
    if (region.value === 'hk') return templates.value.filter(isHKTemplate)
    return templates.value
})

watch([region, filteredTemplates], () => {
    const list = filteredTemplates.value
    if (!list.length) return
    if (!list.find(t => t.id === selectedTemplate.value)) {
        selectedTemplate.value = list[0].id
    }
})

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
        const paramTemplate = QueryString("template");
        if (paramT) {
            // 修正2：类型守卫确保paramP存在
            keyword.value =  decodeURI(paramT);;
            outline.value =  decodeURI(paramT);;
            step.value = 'template';
            history.replaceState({}, '', location.pathname);
        }

        // 当 URL 同时包含 template 和 t 参数时，默认使用香港模板
        if (paramTemplate && paramT) {
            region.value = 'hk'
            const hkList = templates.value.filter(isHKTemplate)
            if (hkList.length) selectedTemplate.value = hkList[0].id
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
        pageRange: pageRange.value,
    })
    if (typeof stream === 'object' && stream.state === -1) {
        loading.value = false
        return message.error('该模型API的并发数过高，请更换其他模型重试')
    }

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
    // resetSlides()
    // const templateData = await api.getFileData(selectedTemplate.value)
    // const templateSlides: Slide[] = templateData.slides
    // const templateTheme: SlideTheme = templateData.theme
    //
    // const slide =
    //     [
    //       {"type":"cover","data":{"title":"西瓜：起源、栽培与产业全景","text":"从非洲荒野到全球餐桌的深度解析"}}
    //       ,{"type":"contents","data":{"items":["历史渊源","植物学特征","营养价值","栽培技术","文化艺术","经济产业"]}}
    //       ,{"type":"transition","data":{"title":"历史渊源","text":"追溯西瓜从非洲起源到全球传播的千年历程"}}
    //       ,{"type":"content","data":{"title":"古代起源与早期传播","items":[{"type":"title","title":"非洲起源考证","text":"西瓜起源于非洲东北部，其野生祖先具有苦味，经过数千年的人工驯化才演变成如今甜美多汁的模样。古埃及墓葬壁画中发现了类似西瓜的果实图像，有力证明了早在四千年前人们就开始种植和食用西瓜，这是人类农业文明的重要见证。"},{"type":"title","title":"地中海与亚洲传播","text":"西瓜通过贸易路线从非洲传入地中海地区，希腊和罗马文献中均有记载，逐渐融入当地饮食文化。随后，西瓜经由丝绸之路传入中亚及中国西部地区，初期作为珍贵贡品，随后在民间广泛种植推广，完成了从奢侈品到大众水果的转变。"}]}}
    //       ,{"type":"content","data":{"title":"西瓜在中国的演变历程","items":[{"type":"title","title":"引入与普及","text":"据史料记载，西瓜在五代时期由胡峤从契丹带回中原，最初被称为“寒瓜”，主要在北方种植。到了南宋时期，西瓜种植技术成熟，范成大等诗人留下诸多咏西瓜诗篇，显示其已成为夏季常见水果，标志着西瓜在中国社会的全面普及。"},{"type":"title","title":"品种改良与现代发展","text":"明清时期农学家对西瓜进行选育，出现了红瓤、黄瓤等不同品种，种植范围扩展至全国大部分地区。当代中国采用大棚种植和嫁接技术，实现西瓜全年供应，产量居世界首位，满足了巨大的市场需求，体现了农业技术的巨大进步。"}]}}
    //       ,{"type":"transition","data":{"title":"植物学特征","text":"解析西瓜的形态结构、品种分类及生态适应性"}}
    //       ,{"type":"content","data":{"title":"形态结构与生长习性","items":[{"type":"title","title":"根系与茎叶特性","text":"西瓜根系发达且深扎土壤，吸水能力强但耐涝性差，种植时需选择排水良好的沙壤土以利生长。其茎蔓生且分枝多，叶片呈掌状深裂，表面覆盖茸毛，需通过整枝打杈来优化通风透光条件，确保植株健康生长。"},{"type":"title","title":"花果发育过程","text":"西瓜花为单性花，雌雄同株，雄花先开，雌花后现，依赖昆虫或人工辅助授粉才能顺利结出果实。从坐果到成熟约需三十天，经历细胞分裂、体积膨大和糖分积累三个阶段，最终形成多汁果肉，这一过程对温度和管理要求极高。"}]}}
    //       ,{"type":"content","data":{"title":"品种分类与生态适应","items":[{"type":"title","title":"主要品种类型","text":"常见的大果型西瓜单重可达五公斤以上，皮厚耐储运；无籽西瓜通过三倍体育种技术培育，食用方便；小果型礼品瓜单重在一至两公斤，皮薄肉脆，附加值高。此外，还有黄瓤、橙瓤等特殊颜色果肉品种，满足多样化口味需求。"},{"type":"title","title":"生理生态需求","text":"西瓜喜温耐热，生长适温为二十五至三十摄氏度，低于十五度生长停滞。它是喜光作物，需要充足阳光进行光合作用，光照不足会导致糖度降低。水分管理上，苗期需水少，果实膨大期需水量最大，成熟期需控水以提高糖度和防止裂果。"}]}}
    //       ,{"type":"transition","data":{"title":"营养价值","text":"深入剖析西瓜的营养成分、健康功效及食用禁忌"}}
    //       ,{"type":"content","data":{"title":"核心营养成分解析","items":[{"type":"title","title":"水分与抗氧化剂","text":"西瓜含水量超过百分之九十，能有效补充人体流失水分，是夏季防暑降温的理想食物。红瓤西瓜富含番茄红素，这是一种强效抗氧化剂，有助于清除自由基，保护心血管健康和皮肤。同时含有适量维生素C，能增强免疫力，促进胶原蛋白合成。"},{"type":"title","title":"氨基酸与健康益处","text":"西瓜含有瓜氨酸和精氨酸，有助于促进尿素循环，减轻肝脏负担，对运动后恢复和心血管健康有益。这些氨基酸成分使得西瓜不仅是一种解渴水果，更成为一种具有特定生理调节功能的健康食品，适合运动人群适量食用。"}]}}
    //       ,{"type":"content","data":{"title":"健康功效与食用注意","items":[{"type":"title","title":"多重健康功效","text":"西瓜具有良好的利尿效果，能帮助排出体内多余盐分和废物，缓解水肿。中医认为其性寒味甘，能清热解暑、除烦止渴。运动前饮用西瓜汁可减少肌肉酸痛，因其含有的瓜氨酸能促进一氧化氮生成，改善血液循环，辅助肌肉恢复。"},{"type":"title","title":"食用禁忌与安全","text":"西瓜升糖指数较高，糖尿病患者应严格控制摄入量。脾胃虚寒或容易腹泻的人群不宜多吃，以免加重肠胃负担。肾功能不全者排钾能力弱，需遵医嘱限制摄入。此外，切开的西瓜易滋生细菌，若冷藏不当或放置过久，食用后可能引发肠胃炎，建议现切现吃。"}]}}
    //       ,{"type":"transition","data":{"title":"栽培技术","text":"详解从育苗移栽到采收物流的全流程管理"}}
    //       ,{"type":"content","data":{"title":"育苗移栽与田间管理","items":[{"type":"title","title":"育苗与定植技术","text":"播种前需晒种、浸种和催芽，打破休眠期，提高发芽率。育苗期需保持适宜温度和湿度，防止高温徒长或低温冻害。为防治枯萎病，常采用葫芦或南瓜作砧木进行嫁接。当幼苗长出三片真叶时即可移栽，选择晴天上午进行，栽后浇足定根水。"},{"type":"title","title":"田间精细化管理","text":"采用双蔓或三蔓整枝，去除多余侧枝，定期压蔓固定植株。自然授粉不足时需人工辅助，上午采集雄花花粉涂抹雌花柱头，提高坐果率。伸蔓期追施氮肥促生长，坐果后增施磷钾肥促膨大，成熟期停止施肥，根据土壤湿度灵活灌溉，确保果实品质。"}]}}
    //       ,{"type":"content","data":{"title":"病虫害防治与采后处理","items":[{"type":"title","title":"绿色防控与采收","text":"重点防治蚜虫、红蜘蛛及炭疽病、病毒病，采用农业防治、物理诱杀和低毒农药相结合绿色防控。通过观察卷须干枯、果皮花纹清晰、敲击声音沉闷等特征判断成熟度。采收时保留一段果柄，轻拿轻放避免机械损伤，最好在清晨或傍晚气温较低时进行。"},{"type":"title","title":"分级包装与物流","text":"按单果重量、外观品质和糖度进行分级，使用泡沫网套和纸箱包装，标注产地和品牌，提升商品价值。短途运输可用常温车，长途运输需冷藏保鲜，控制温度在十至十五摄氏度，防止高温腐烂或低温冷害，确保西瓜以最佳状态到达消费者手中。"}]}}
    //       ,{"type":"transition","data":{"title":"文化艺术","text":"探索西瓜在文学、艺术及民俗活动中的文化意象"}}
    //       ,{"type":"content","data":{"title":"文学意象与艺术创作","items":[{"type":"title","title":"文学中的西瓜","text":"宋代诗人范成大写下“碧蔓凌霜卧软沙，年来处处食西瓜”，生动描绘了西瓜在江南地区的普及景象。现代作家常以西瓜象征夏日清凉与童年记忆。“夏天吃西瓜，药物不用抓”等谚语广泛流传，反映了民众对西瓜药用价值的认可，乡土文学中西瓜田常作为故事背景。"},{"type":"title","title":"艺术表现形式","text":"国画大师齐白石擅长画西瓜，笔墨简练而生动，红瓤黑籽绿叶色彩对比鲜明。西方画家常在静物画中描绘切开的西瓜，展现其鲜艳色彩和多汁质感。摄影师利用西瓜鲜艳的色彩和几何形状创作视觉艺术作品，民间艺人将西瓜图案融入剪纸，寓意多子多福和团圆美满。"}]}}
    //       ,{"type":"content","data":{"title":"节庆活动与民俗体验","items":[{"type":"title","title":"西瓜节庆文化","text":"中国多地举办西瓜节，包括吃瓜比赛、瓜王评选和文化表演，吸引游客参与，促进当地旅游经济发展。快速吃瓜比赛是常见娱乐项目，参与者在规定时间内比拼吃瓜速度，场面热闹滑稽，增添节日气氛，成为连接社区情感的重要纽带。"},{"type":"title","title":"创意与休闲体验","text":"能手将西瓜皮雕刻成花鸟鱼虫等精美图案，展现精湛技艺，既可作为观赏艺术品，也可用于餐饮装饰。城市居民周末前往瓜田体验采摘乐趣，亲近自然，了解种植知识，享受新鲜瓜果，这种乡村采摘体验已成为休闲农业的新时尚，深受家庭游客喜爱。"}]}}
    //       ,{"type":"transition","data":{"title":"经济产业","text":"分析全球贸易格局、产业链延伸及未来发展趋势"}}
    //       ,{"type":"content","data":{"title":"全球贸易与品牌建设","items":[{"type":"title","title":"贸易格局与价格","text":"中国西瓜主要出口至俄罗斯、东南亚及中亚国家，凭借价格优势和品质提升，国际市场份额逐年扩大。大多数国家自给自足，全球西瓜贸易量相对较小。天气状况、种植面积变化和物流成本是影响西瓜价格的主要因素，极端天气可能导致短期价格剧烈波动。"},{"type":"title","title":"品牌化发展趋势","text":"知名品牌如宁夏硒砂瓜、南汇8424等通过地理标志保护提升溢价能力，品牌化成为产业升级方向。电商平台和直播带货成为西瓜销售新渠道，打破地域限制，实现产地直发，让消费者吃到更新鲜瓜果，极大地拓展了销售半径和市场覆盖面。"}]}}
    //       ,{"type":"content","data":{"title":"产业链延伸与未来展望","items":[{"type":"title","title":"深加工与综合利用","text":"西瓜汁、西瓜酱、西瓜酒等深加工产品延长了产业链，提高了附加值，解决了鲜果滞销和损耗问题。西瓜皮可腌制做菜或提取果胶、色素，用于食品和化妆品行业，实现资源最大化利用。种业公司投入研发抗病、高产、特色新品种，拥有自主知识产权的种子成为核心竞争力。"},{"type":"title","title":"未来发展趋势","text":"物联网、大数据和人工智能技术应用于温室管理，实现精准水肥控制和环境监测。消费者对食品安全关注度高，有机西瓜和无公害认证产品市场需求增长。培育高番茄红素、高瓜氨酸等功能性品种，满足特定人群健康需求。西瓜种植与观光旅游深度融合，打造休闲农业综合体模式。"}]}}
    //       ,{"type":"end"}
    //     ]
    //
    //
    //
    //
    //  AIPPT(templateSlides, slide)

    resetSlides()
    loading.value = true

    const stream = await api.AIPPT({
        content: outline.value,
        language: language.value,
        style: style.value,
        model: model.value,
        pageRange: pageRange.value,
        ...(keyword.value ? { originalInput: keyword.value } : {}),
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
    let buffer = ''

    const readStream = () => {
        reader.read().then(({ done, value }) => {
            if (done) {
                if (buffer.trim()) {
                    processLine(buffer.trim())
                }
                loading.value = false
                mainStore.setAIPPTDialogState(false)
                slideStore.setTheme(templateTheme)
                return
            }

            buffer += decoder.decode(value, { stream: true })
            const parts = buffer.split('\n')
            buffer = parts.pop() || ''

            for (const part of parts) {
                processLine(part.trim())
            }

            readStream()
        })
    }

    const processLine = (line: string) => {
        const text = line.replace('```jsonl', '').replace('```json', '').replace('```', '').trim()
        if (!text) return
        try {
            const slide: AIPPTSlide = JSON.parse(text)
            AIPPT(templateSlides, [slide])
        }
        catch (err) {
            // eslint-disable-next-line
            console.error('Parse error:', text, err)
        }
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
    .region-selector {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        .label {
            font-size: 13px;
            color: #666;
            margin-right: 8px;
        }
    }
    .templates {
        display: flex;
        margin-bottom: 10px;
        max-height: 460px;
        overflow-y: auto;
        padding-right: 4px;
        @include flex-grid-layout();

        &::-webkit-scrollbar {
            width: 6px;
        }
        &::-webkit-scrollbar-thumb {
            background-color: #d9d9d9;
            border-radius: 3px;
        }
        &::-webkit-scrollbar-thumb:hover {
            background-color: #bfbfbf;
        }

        .template {
            border: 2px solid $borderColor;
            border-radius: $borderRadius;
            width: 230px;
            height: 122px;
            margin-bottom: 12px;

            &:not(:nth-child(2n)) {
                margin-right: 12px;
            }

            &.selected {
                border-color: $themeColor;
            }

            img {
                width: 100%;
                height: 100%;
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
.input-container {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 8px 12px;
    background-color: #fff;
    transition: border-color 0.3s;

    &:hover {
        border-color: #40a9ff;
    }

    &:focus-within {
        border-color: #1890ff;
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
}
.input-textarea {
    width: 100%;
    min-height: 30px;
    max-height: 60px;
    padding: 4px 0;
    border: none;
    outline: none;
    resize: none;
    font-size: 14px;
    color: #333;
    background: transparent;
    font-family: inherit;

    &::placeholder {
        color: #bfbfbf;
    }
}
.paste-textarea {
    min-height: 200px;
    max-height: 400px;
    resize: vertical;
}
.paste-container {
    padding: 12px 16px;
}
.input-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 4px;
    border-top: 1px solid #f0f0f0;
    margin-top: 4px;
}
.page-selector-inline {
    display: flex;
    align-items: center;
    gap: 4px;

    .label {
        font-size: 12px;
        color: #666;
    }
}
.count {
    display: none;
    font-size: 12px;
    color: #999;
    margin-right: 10px;

    &.visible {
        display: inline-block;
    }
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

@media screen and (width <= 380px) {
  .preview {
    pre {
      max-height: 400px;
    }
    .outline-view {
      max-height: 400px;
    }
  }
  .select-template {
    .templates {
      max-height: 400px;
    }
  }
}
</style>
