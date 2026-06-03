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
                        <IconSend class="icon"/>
                        AI 生成
                    </div>
                </div>
            </div>
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
                        <IconSend class="icon"/>
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
import RadioGroup from '@/components/RadioGroup.vue'
import RadioButton from '@/components/RadioButton.vue'
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

// 判断模板是否为香港模板（通过 name 以 HK_ 开头或 id 以 template_hk 开头）
const isHKTemplate = (tpl: { id: string; name: string }) => {
    return /^HK_/i.test(tpl.name) || /^template_hk/i.test(tpl.id)
}

// 根据所选地区过滤模板列表
const filteredTemplates = computed(() => {
    if (region.value === 'hk') return templates.value.filter(isHKTemplate)
    return templates.value
})

// 当切换地区后，若当前选中的模板已不在过滤结果中，则自动选中第一个
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

    // // 在生成前清空PPT
    // resetSlides()
    // const templateData = await api.getFileData(selectedTemplate.value)
    // const templateSlides: Slide[] = templateData.slides
    // const templateTheme: SlideTheme = templateData.theme
    //
    // const slide =
    //     [
    //         {"type":"cover","data":{"title":"北京建工嘉境里营销代理全案","text":"破局六环边·重塑西沙屯·定义科学城新居住范式"}}
    //       ,{"type":"contents","data":{"items":["项目使命","中原实力介绍","宏观市场分析","客户分析","价值梳理","难点思考","营销核心策略","营销节点铺排","推广策略","活动策略","拓客策略","现场策略","营销费用建议","报告结论回顾"]}}
    //       ,{"type":"transition","data":{"title":"项目使命","text":"明确项目的核心目标、战略定位与关键突破点"}}
    //       ,{"type":"content","data":{"title":"核心目标","items":[{"type": "title","title":"签约与去化目标","text":"助力北京建工嘉境里实现2024年签约25亿元，月均去化55-60套，成为昌平西区年度现象级热销盘。"},{"type": "title","title":"精准定位与差异化策略","text":"通过精准定位和差异化策略，提升项目在市场中的竞争力。"}]}}
    //       ,{"type":"content","data":{"title":"战略定位","items":[{"type": "title","title":"非临铁·高兑现·强产品·真品质","text":"以“非临铁·高兑现·强产品·真品质”重构客户认知，打造北京科学城西区首个滨水人文改善标杆。"},{"type": "title","title":"高品质的产品和服务","text":"通过高品质的产品和服务，树立项目在区域内的领导地位。"}]}}
    //       ,{"type":"content","data":{"title":"关键突破","items":[{"type": "title","title":"打破刻板印象","text":"打破“六环边=远郊盘”的刻板印象，锚定海淀外溢+昌平换新双核客群。"},{"type": "title","title":"转化劣势为优势","text":"将“非地铁”劣势转化为“低密静界+滨水生态+高教智识圈层”的稀缺价值支点。"},{"type": "title","title":"建立产品护城河","text":"以81–87%得房率+1800元/㎡精装标准+完整园林系统，建立同体量高层中无可复制的产品护城河。"},{"type": "title","title":"首开即爆","text":"首开均价4.4万/㎡（较限价折让12%），以价格诚意撬动市场信任，实现“开门红→口碑裂变→持续领跑”三级跳。"}]}}
    //       ,{"type":"transition","data":{"title":"中原实力介绍","text":"展示中原集团的品牌力、资源力和团队力"}}
    //       ,{"type":"content","data":{"title":"品牌力","items":[{"type": "title","title":"旗舰代理与市场领导者","text":"42年旗舰代理，北京市场绝对领导者。中原集团2023年全国代理销售金额超9200亿元，连续17年稳居行业第一。"},{"type": "title","title":"深耕首都市场","text":"北京中原深耕首都市场26年，累计代理新盘超380个，覆盖全市92%以上TOP30房企。"}]}}
    //       ,{"type":"content","data":{"title":"资源力","items":[{"type": "title","title":"精准客库与渠道网络","text":"30万+精准客库 × 全链路转介体系 × 深度政企协同。北京中原CCES数据库沉淀32.7万条有效客户档案，涵盖海淀外溢客户、昌平本地改善客户等。"},{"type": "title","title":"渠道网络","text":"北京全域217家分行，其中昌平片区43家，实现“1公里内客户触达无盲区”。"}]}}
    //       ,{"type":"content","data":{"title":"团队力","items":[{"type": "title","title":"定制战队与全周期保障","text":"TOP级定制战队 × 全周期操盘保障。项目专属团队由北京中原二级市场董事总经理李明龙总挂帅，配置王牌销经、策略总监、数字营销专家等。"},{"type": "title","title":"保障机制","text":"保障机制包括“28集团军”前置部署、“三重成交率保障”等。"}]}}
    //       ,{"type":"transition","data":{"title":"宏观市场分析","text":"深入分析宏观政策、新房成交、竞品及市场总结"}}
    //       ,{"type":"content","data":{"title":"宏观政策分析","items":[{"type": "title","title":"政策基调","text":"政策基调：“托而不举”转向“稳中促优”，2024年Q1北京二手房挂牌量下降19%，刚需置换意愿回升。"},{"type": "title","title":"信贷支持","text":"北京首套房贷利率降至3.55%，二套房降至4.25%，公积金贷款额度提升至120万元，显著降低改善门槛。"}]}}
    //       ,{"type":"content","data":{"title":"新房成交分析","items":[{"type": "title","title":"昌平全区新房成交","text":"2024年1–4月昌平全区新房成交3287套，同比+23%，但结构性分化加剧。"},{"type": "title","title":"地铁盘与非地铁盘对比","text":"地铁盘占比41%，均价5.1万/㎡，去化周期6.2个月；非地铁盘占比59%，均价4.3–4.6万/㎡，去化周期14.7个月。"}]}}
    //       ,{"type":"content","data":{"title":"新房去化周期分析","items":[{"type": "title","title":"昌平西区平均去化周期","text":"昌平西区在售项目平均去化周期13.8个月，存在明显断层。"},{"type": "title","title":"各梯队去化周期","text":"第一梯队≤8个月：梧桐星宸（临铁+低密）、保利玫瑰园（品牌+低密）；第二梯队9–12个月：国誉燕园（低价走量）、住总百善（国企背书）；第三梯队≥13个月：全部为纯高层、无差异化、价格无优势项目。"}]}}
    //       ,{"type":"content","data":{"title":"新房成交结构分析","items":[{"type": "title","title":"主力成交面积段","text":"70–90㎡（刚需）占比37%，总价320–420万；90–120㎡（刚改）占比45%，总价420–620万；120–155㎡（改善）占比18%，总价620–820万。"}]}}
    //       ,{"type":"content","data":{"title":"待售竞品分析","items":[{"type": "title","title":"梧桐星宸","text":"强于地铁，弱于产品。样板间客户满意度仅63%，精装粗糙、园林空洞、得房率低。"},{"type": "title","title":"国誉燕园","text":"强于价格，弱于价值。以“低价”吸引客户，但成交客户中68%为投资客，自住客户复购意愿低于20%。"},{"type": "title","title":"住总百善","text":"交通极度不便，配套空白。"},{"type": "title","title":"保利玫瑰园","text":"体量小，无滨水资源，交付力存疑。"}]}}
    //       ,{"type":"content","data":{"title":"市场总结","items":[{"type": "title","title":"产品力决胜时代","text":"昌平西区已进入“产品力决胜时代”：地铁红利见顶，客户从“买地段”转向“买品质、买生活、买确定性”。"},{"type": "title","title":"非地铁盘突围公式","text":"非地铁盘突围公式 = （高产品力 × 强圈层认同 × 精准渠道力）÷（价格敏感度）。"},{"type": "title","title":"嘉境里唯一破局路径","text":"嘉境里唯一破局路径：不做“六环边的替代品”，而做“科学城西区的生活标准制定者”。"}]}}
    //       ,{"type":"transition","data":{"title":"客户分析","text":"深入剖析客户决策逻辑、心态变化及区域特征"}}
    //       ,{"type":"content","data":{"title":"竞争格局之变","items":[{"type": "title","title":"客户决策逻辑升级","text":"客户决策逻辑升级：从“交通便利性优先” → “生活确定性优先”。信息获取方式变革：72%客户通过“小红书/抖音KOC测评+朋友真实推荐”决策，传统广告诉求失效。"},{"type": "title","title":"客户心态之变","text":"海淀外溢客愿为品质溢价15%，拒绝为“伪地铁盘”买单；昌平本地客要求居住体验跃升一个层级；高教园客看重邻里关系、文化活动、孩子成长环境。"}]}}
    //       ,{"type":"content","data":{"title":"区域客户特征分析","items":[{"type": "title","title":"核心客群画像","text":"海淀外溢客28–35岁，互联网/芯片工程师，关注通勤时间、孩子教育、社区安全；昌平本地客35–45岁，教师/公务员/中小企业主，关注房子品质、物业服务、生活便利；高教园客32–42岁，高校教师/科研人员，关注社区文化、邻里素质、孩子成长。"},{"type": "title","title":"价格敏感度","text":"海淀外溢客中等敏感（接受4.4–4.6万/㎡）；昌平本地客高敏感（聚焦400–550万总价）；高教园客低敏感（愿为品质支付溢价）。"}]}}
    //       ,{"type":"content","data":{"title":"外来客户导入分析","items":[{"type": "title","title":"海淀外溢主通道","text":"通过“海淀人才安居服务站”定向邀约，提供免费看房专车+子女入学咨询。联合网易、百度等企业开展“程序员安居专场”，定制“码农友好户型”说辞。"},{"type": "title","title":"高教园客群激活","text":"与北航共建“嘉境里青年学者公寓”，提供科研启动基金对接、学术沙龙场地支持。发起“我的科学城生活”影像征集，优秀作品植入项目所有传播物料。"}]}}
    //       ,{"type":"content","data":{"title":"客户来源预判","items":[{"type": "title","title":"首开蓄客结构","text":"海淀外溢客45%（主攻上地、西北旺、中关村）；昌平本地客35%（聚焦回龙观、天通苑、沙河）；高教园客20%（北航、北师大、中财教师及家属）。"},{"type": "title","title":"全年客户结构","text":"海淀外溢客占比提升至52%，成为绝对主力。"}]}}
    //       ,{"type":"content","data":{"title":"目标客户画像","items":[{"type": "title","title":"S级种子客户","text":"上地某芯片公司总监（34岁，夫妻+1孩，现住西二旗，预算550万）；北航副教授（38岁，夫妻+2孩，现租住沙河，追求高品质社区）；回龙观小学教师（41岁，置换改善，重视物业与孩子成长环境）。"}]}}
    //       ,{"type":"content","data":{"title":"客户形象定位","items":[{"type": "title","title":"嘉境里生活家","text":"不是“住在六环边的人”，而是“选择科学城未来的人”；不是“买一套房”，而是“加入一个高知生活共同体”；不是“被动接受配套”，而是“共同定义西沙屯生活方式”。"}]}}
    //       ,{"type":"transition","data":{"title":"价值梳理","text":"梳理城市、区域、本体的价值体系及项目定位"}}
    //       ,{"type":"content","data":{"title":"城市价值","items":[{"type": "title","title":"北京科学城战略腹地","text":"纳入《北京国际科技创新中心建设条例》，定位“全球前沿科技策源地”，2025年GDP目标突破3000亿元。"}]}}
    //       ,{"type":"content","data":{"title":"区域价值","items":[{"type": "title","title":"西沙屯组团唯一滨水界面","text":"项目紧邻南沙河生态廊道，拥有1.2公里滨水岸线，是昌平西区唯一可兑现的滨水居住资源。"},{"type": "title","title":"高教智识圈层高地","text":"3公里内汇聚北航、北师大、中财、矿大等8所高校，常驻师生超8万人，形成北京密度最高的高知人群聚落。"}]}}
    //       ,{"type":"content","data":{"title":"区域形象定位","items":[{"type": "title","title":"北京科学城西区·高知生活主场","text":"提出区域新Slogan：“离海淀很近，离喧嚣很远；在科学城，过理想生活”。"}]}}
    //       ,{"type":"content","data":{"title":"区域价值体系","items":[{"type": "title","title":"三维价值金字塔","text":"基座（确定性）：六环内、海淀近、高速通达、政府重点发展板块；中层（稀缺性）：西沙屯唯一滨水社区、高教园唯一全龄人文社区；塔尖（引领性）：北京首个“科学家社区共建计划”实践地。"}]}}
    //       ,{"type":"content","data":{"title":"本体形象定位","items":[{"type": "title","title":"嘉境里·科学城高知生活范本","text":"不是“又一个高层住宅”，而是“为高知人群定制的滨水生活容器”；不是“卖房子”，而是“交付一种被尊重、被理解、被成全的生活方式”。"}]}}
    //       ,{"type":"content","data":{"title":"本体小结SWOT分析","items":[{"type": "title","title":"优势（S）","text":"得房率81–87%（区域最高），1800元/㎡精装（同价位最优），完整园林+滨水界面（唯一性），建工国企品质背书。"},{"type": "title","title":"劣势（W）","text":"非地铁盘，高速旁噪音隐患，当前配套空白。"},{"type": "title","title":"机会（O）","text":"海淀外溢+高教园双重人口红利，昌平西区改善需求爆发期，竞品产品力普遍薄弱。"},{"type": "title","title":"威胁（T）","text":"梧桐星宸地铁虹吸，国誉燕园低价冲击，政策传导存在时滞。"}]}}
    //       ,{"type":"content","data":{"title":"价值体系梳理","items":[{"type": "title","title":"3C价值模型","text":"Comfort（舒适）：81–87%得房率 + 高速隔音系统 + 滨水声景设计；Community（社群）：科学家社区共建计划 + 嘉境里生活学院 + 邻里共享空间；Certainty（确定）：建工国企交付力 + 昌平区域最强物业（绿城服务协议已签署）。"}]}}
    //       ,{"type":"content","data":{"title":"项目定位","items":[{"type": "title","title":"北京科学城西区·首个高知人文滨水社区","text":"价值主张：“在海淀的效率里生活，在嘉境里的静界中生长”。"}]}}
    //       ,{"type":"transition","data":{"title":"难点思考","text":"探讨认知扭转难、非地铁信任难、首开蓄客难等问题及解决方案"}}
    //       ,{"type":"content","data":{"title":"认知扭转难","items":[{"type": "title","title":"问题","text":"如何让客户接受“六环边≠远郊”？"},{"type": "title","title":"解法","text":"用“海淀30分钟生活圈地图”可视化通勤，联合滴滴发布《科学城通勤白皮书》。"}]}}
    //       ,{"type":"content","data":{"title":"非地铁信任难","items":[{"type": "title","title":"问题","text":"如何消除客户对“无地铁=贬值”的担忧？"},{"type": "title","title":"解法","text":"推出“地铁开通保障计划”：若2026年前沙河站未开通，购房享5年物业费全免+车位优先认购权。"}]}}
    //       ,{"type":"content","data":{"title":"首开蓄客难","items":[{"type": "title","title":"问题","text":"如何在无地铁、无配套下快速聚集人气？"},{"type": "title","title":"解法","text":"“嘉境里生活提案官”计划：首批50名客户提前入住体验，产出真实Vlog，引爆小红书/抖音。"}]}}
    //       ,{"type":"transition","data":{"title":"营销核心策略","text":"阐述“三破三立”策略及首开核心动作"}}
    //       ,{"type":"content","data":{"title":"三破三立策略","items":[{"type": "title","title":"破“六环边”认知","text":"立“科学城主场”身份。"},{"type": "title","title":"破“非地铁焦虑","text":"立“静界生活价值”。"},{"type": "title","title":"破“配套空白”质疑","text":"立“共建生活主权”。"}]}}
    //       ,{"type":"content","data":{"title":"首开核心动作","items":[{"type": "title","title":"嘉境里·科学城生活发布会","text":"邀请北航校长、中关村企业家、海淀教委代表共同启动。"},{"type": "title","title":"300组种子客户抢先体验营","text":"提供免费周末住宿+家庭活动，产出首批真实口碑。"}]}}
    //       ,{"type":"transition","data":{"title":"营销节点铺排","text":"详细规划营销节点及关键动作"}}
    //       ,{"type":"content","data":{"title":"营销节点铺排","items":[{"type": "title","title":"T-60天","text":"海淀外溢客户精准触达（企业宣讲+地铁专车），建立500组高意向客户池。"},{"type": "title","title":"T-30天","text":"“嘉境里生活提案官”招募启动，锁定50名KOC，产出首批内容。"},{"type": "title","title":"T-15天","text":"科学城生活发布会，实现媒体曝光1000万+，预约客户破2000组。"},{"type": "title","title":"首开日","text":"“300组种子客户集中签约”，实现首开去化率85%+，签约额超4亿元。"},{"type": "title","title":"首开后","text":"“嘉境里生活节”系列社群活动，月均到访量稳定在1200组+，转化率提升至35%。"}]}}
    //       ,{"type":"transition","data":{"title":"推广策略","text":"线上与线下推广的具体策略及执行方案"}}
    //       ,{"type":"content","data":{"title":"线上推广","items":[{"type": "title","title":"小红书/抖音IP","text":"“科学家的一天”IP：真实记录北航教授、中关村工程师在嘉境里的24小时生活。话题#我在嘉境里过科学城生活#，目标曝光5000万+。"},{"type": "title","title":"微信私域","text":"“嘉境里生活学院”：每周推送《科学城生活指南》（通勤、教育、医疗、育儿），开设“嘉境里家长课堂”，联合海淀名校名师直播。"}]}}
    //       ,{"type":"content","data":{"title":"线下推广","items":[{"type": "title","title":"海淀主战场","text":"上地地铁站、中关村e世界、西北旺永丰产业园设“嘉境里生活快闪站”，在海淀人才服务中心设立“嘉境里安居服务专窗”。"},{"type": "title","title":"昌平本地","text":"在回龙观、天通苑、沙河大型社区举办“嘉境里生活分享会”，现场签约享“教育基金补贴”。"}]}}
    //       ,{"type":"transition","data":{"title":"活动策略","text":"核心策略、品牌形象及话题炒作的具体方案"}}
    //       ,{"type":"content","data":{"title":"核心策略","items":[{"type": "title","title":"生活即营销","text":"所有活动围绕“高知人群真实生活需求”展开，拒绝表演式营销。"}]}}
    //       ,{"type":"content","data":{"title":"品牌形象","items":[{"type": "title","title":"视觉系统","text":"采用“青灰+暖木”主色调，传递“理性科技感×人文温度感”双重气质。"},{"type": "title","title":"文案风格","text":"摒弃“尊贵”“奢华”等浮夸词汇，使用“值得信赖的邻居”“可以安心托付的社区”等具象表达。"}]}}
    //       ,{"type":"content","data":{"title":"话题炒作","items":[{"type": "title","title":"制造三大行业话题","text":"#北京首个科学家社区长啥样#（联合中科院、北航发起）；#六环边的房子凭什么卖4.4万#（用产品力数据硬刚）；#没有地铁的社区如何活得更好#（发布《科学城静界生活白皮书》）。"}]}}
    //       ,{"type":"transition","data":{"title":"拓客策略","text":"核心策略及锁客动作的具体方案"}}
    //       ,{"type":"content","data":{"title":"核心策略","items":[{"type": "title","title":"三圈层穿透法","text":"内圈（高知圈）：高校教师、科研人员、科技企业高管 → 用专业赢得尊重；中圈（海淀外溢）：互联网从业者、金融从业者 → 用效率证明价值；外圈（昌平本地）：教师、公务员、中小企业主 → 用品质建立信任。"}]}}
    //       ,{"type":"content","data":{"title":"锁客动作","items":[{"type": "title","title":"嘉境里生活承诺书","text":"签约即赠《嘉境里生活权益包》：含海淀名校入学咨询、中关村企业内推资格、沙河高教园活动优先参与权。"},{"type": "title","title":"老带新科学家计划","text":"推荐成功即赠“嘉境里科学家实验室”冠名权（可为孩子命名一间共享空间）。"}]}}
    //       ,{"type":"transition","data":{"title":"现场策略","text":"展示包装、阵地包装及IP包装的具体方案"}}
    //       ,{"type":"content","data":{"title":"展示包装","items":[{"type": "title","title":"三重沉浸式体验","text":"声景沉浸：高速旁设置“静界体验舱”，对比展示隔音效果；滨水沉浸：1:1还原南沙河滨水界面，设置亲水平台、垂钓角；社群沉浸：实景呈现“嘉境里生活学院”、“邻里共享厨房”、“儿童科创角”。"}]}}
    //       ,{"type":"content","data":{"title":"阵地包装","items":[{"type": "title","title":"嘉境里生活提案馆","text":"不叫“售楼处”，而称“生活提案馆”，设置“我的科学城生活”共创墙，客户可粘贴生活愿景便签。"}]}}
    //       ,{"type":"content","data":{"title":"IP包装","items":[{"type": "title","title":"嘉境里生活家IP矩阵","text":"主IP：嘉嘉（科学家形象吉祥物）；子IP：境境（自然守护者）、里里（社区营造师）；全渠道统一应用，强化品牌记忆。"}]}}
    //       ,{"type":"transition","data":{"title":"营销费用建议","text":"总费用占比、费用分配及ROI保障的具体方案"}}
    //       ,{"type":"content","data":{"title":"营销费用建议","items":[{"type": "title","title":"总费用占比","text":"控制在销售额1.8%以内（行业平均2.5%）。"},{"type": "title","title":"费用分配","text":"线上精准投放（小红书/抖音/朋友圈）：45%；线下阵地建设（生活提案馆+快闪站）：30%；社群运营与活动（生活节+科学家计划）：25%。"},{"type": "title","title":"ROI保障","text":"所有费用投入均绑定客户到访、留资、转化三重数据指标，实行“费用-效果”动态挂钩机制。"}]}}
    //       ,{"type":"transition","data":{"title":"报告结论回顾","text":"总结项目的核心价值及承诺"}}
    //       ,{"type":"content","data":{"title":"报告结论回顾","items":[{"type": "title","title":"嘉境里不是“六环边的备选”","text":"而是“科学城时代的首选”。"},{"type": "title","title":"中原方案不是“常规代理”","text":"而是“定义区域生活标准的共建行动”。"},{"type": "title","title":"我们承诺","text":"首开即爆：确保首开去化率≥85%，签约额≥4亿元；月均领跑：2024年月均去化稳定在55–60套，稳居昌平第一梯队；全程护航：从首开到清盘，提供全周期策略支持、资源保障、团队执行。"},{"type": "title","title":"最终交付","text":"一个被海淀外溢客主动选择、被高教园客真心热爱、被昌平市场公认的科学城生活新范本。"}]}}
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


</style>
