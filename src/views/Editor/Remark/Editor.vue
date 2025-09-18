<template>

    <div class="editor" v-click-outside="hideMenuInstance">
        <div data-v-a3544495="" class="editor-button-panel" style="
    position: relative;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
">
            <div data-v-a3544495="" class="handler-item group-btn" style="margin-left: auto;">

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
                <Button @click="openZMPanel" class="button default" style="
    flex: 1 1 0%;
    margin: 7px;
    height: 24px;
    line-height: 24px;
    padding: 0px 18px;
    border-radius: 6px;">
                    <IconAlignTextBothOne class="icon"  style="color:#d14424" />
                    <span style="margin-left: 2px;">脚本总览模式</span></Button>
            </div>
        </div>
        <div
                class="prosemirror-editor"
                ref="editorViewRef"
        ></div>

        <div class="menu" ref="menuRef">
            <button :class="{ 'active': attr?.bold }" @click="execCommand('bold')">
                <IconTextBold/>
            </button>
            <button :class="{ 'active': attr?.em }" @click="execCommand('em')">
                <IconTextItalic/>
            </button>
            <button :class="{ 'active': attr?.underline }" @click="execCommand('underline')">
                <IconTextUnderline/>
            </button>
            <button :class="{ 'active': attr?.strikethrough }" @click="execCommand('strikethrough')">
                <IconStrikethrough/>
            </button>
            <Popover trigger="click" style="width: 30%;">
                <template #content>
                    <ColorPicker :modelValue="attr?.color" @update:modelValue="value => execCommand('color', value)"/>
                </template>
                <button>
                    <IconText/>
                </button>
            </Popover>
            <Popover trigger="click" style="width: 30%;">
                <template #content>
                    <ColorPicker :modelValue="attr?.backcolor"
                                 @update:modelValue="value => execCommand('backcolor', value)"/>
                </template>
                <button>
                    <IconHighLight/>
                </button>
            </Popover>
            <button :class="{ 'active': attr?.bulletList }" @click="execCommand('bulletList')">
                <IconList/>
            </button>
            <button :class="{ 'active': attr?.orderedList }" @click="execCommand('orderedList')">
                <IconOrderedList/>
            </button>
            <button @click="execCommand('clear')">
                <IconFormat/>
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>

import { onMounted, onUnmounted, ref, useTemplateRef,watch } from 'vue'
import { debounce } from 'lodash'
import { useMainStore, useSlidesStore } from '@/store'
import type { EditorView } from 'prosemirror-view'
import { initProsemirrorEditor, createDocument } from '@/utils/prosemirror'
import { addMark, autoSelectAll, getTextAttrs, type TextAttrs } from '@/utils/prosemirror/utils'
import { toggleList } from '@/utils/prosemirror/commands/toggleList'
import tippy, { type Instance } from 'tippy.js'


import ColorPicker from '@/components/ColorPicker/index.vue'
import Popover from '@/components/Popover.vue'
import {toggleMark} from 'prosemirror-commands'
import PopoverMenuItem from "@/components/PopoverMenuItem.vue";
import Button from "@/components/Button.vue";
import {storeToRefs} from "pinia";
const slidesStore = useSlidesStore()
const { slides, slideIndex, currentSlide } = storeToRefs(slidesStore)
const props = defineProps<{
    value: string
}>()

const emit = defineEmits<{
    (event: 'update', payload: string): void
}>()

const mainStore = useMainStore()
const { AIZMpageVisible } = storeToRefs(mainStore)

const editorViewRef = useTemplateRef<HTMLElement>('editorViewRef')
let editorView: EditorView

const attr = ref<TextAttrs>()

const menuInstance = ref<Instance>()
const menuRef = useTemplateRef<HTMLElement>('menuRef')

watch(() => props.value, (newVal) => {
    if (newVal !== editorView.dom.innerHTML) {
        updateTextContent()
    }
})
const hideMenuInstance = () => {
    if (menuInstance.value) menuInstance.value.hide()
}
const handleInput = () => {
    emit('update', editorView.dom.innerHTML) // 实时触发
}
// const handleInput = debounce(function () {
//     emit('update', editorView.dom.innerHTML)
// }, 30, {trailing: true})

const handleFocus = () => {
    mainStore.setDisableHotkeysState(true)
}

const handleBlur = () => {
    mainStore.setDisableHotkeysState(false)
}
const openZMPanel = () => {
    mainStore.setZMPanelState(true)
}
const updateTextContent = () => {
    if (!editorView) return
    const {doc, tr} = editorView.state
    editorView.dispatch(tr.replaceRangeWith(0, doc.content.size, createDocument(props.value)))
    emit('update', editorView.dom.innerHTML)
}

defineExpose({updateTextContent})

const handleMouseup = () => {
    const selection = window.getSelection()

    if (
        !selection ||
        !selection.anchorNode ||
        !selection.focusNode ||
        selection.isCollapsed ||
        selection.type === 'Caret' ||
        selection.type === 'None'
    ) return

    const range = selection.getRangeAt(0)

    if (menuInstance.value) {
        attr.value = getTextAttrs(editorView)

        const {x, y, left, top} = range.getBoundingClientRect()

        menuInstance.value.setProps({
            getReferenceClientRect: () => ({
                x, y, left, top,
                height: 0,
                width: 0,
                right: left,
                bottom: top,
            } as DOMRect),
        })
        menuInstance.value.show()
    }
}

const execCommand = (command: string, value?: string) => {
    if (command === 'color' && value) {
        const mark = editorView.state.schema.marks.forecolor.create({color: value})
        autoSelectAll(editorView)
        addMark(editorView, mark)
    } else if (command === 'backcolor' && value) {
        const mark = editorView.state.schema.marks.backcolor.create({backcolor: value})
        autoSelectAll(editorView)
        addMark(editorView, mark)
    } else if (command === 'bold') {
        autoSelectAll(editorView)
        toggleMark(editorView.state.schema.marks.strong)(editorView.state, editorView.dispatch)
    } else if (command === 'em') {
        autoSelectAll(editorView)
        toggleMark(editorView.state.schema.marks.em)(editorView.state, editorView.dispatch)
    } else if (command === 'underline') {
        autoSelectAll(editorView)
        toggleMark(editorView.state.schema.marks.underline)(editorView.state, editorView.dispatch)
    } else if (command === 'strikethrough') {
        autoSelectAll(editorView)
        toggleMark(editorView.state.schema.marks.strikethrough)(editorView.state, editorView.dispatch)
    } else if (command === 'bulletList') {
        const {bullet_list: bulletList, list_item: listItem} = editorView.state.schema.nodes
        toggleList(bulletList, listItem, '')(editorView.state, editorView.dispatch)
    } else if (command === 'orderedList') {
        const {ordered_list: orderedList, list_item: listItem} = editorView.state.schema.nodes
        toggleList(orderedList, listItem, '')(editorView.state, editorView.dispatch)
    } else if (command === 'clear') {
        autoSelectAll(editorView)
        const {$from, $to} = editorView.state.selection
        editorView.dispatch(editorView.state.tr.removeMark($from.pos, $to.pos))
    }

    editorView.focus()
    handleInput()
    attr.value = getTextAttrs(editorView)
}

onMounted(() => {
    editorView = initProsemirrorEditor((editorViewRef.value as Element), props.value, {
        handleDOMEvents: {
            focus: handleFocus,
            blur: handleBlur,
            mouseup: handleMouseup,
            mousedown: () => {
                window.getSelection()?.removeAllRanges()
                hideMenuInstance()
            },
            keydown:hideMenuInstance,

        },
        dispatchTransaction(transaction) {
            // 1. 应用事务到当前状态
            const newState = editorView.state.apply(transaction);

            // 2. 检查文档是否实际变化（避免选区变化等无关更新）
            if (transaction.docChanged) {
                console.log('Updating remark:', newState.doc.textContent) // 调试用
                slidesStore.updateSlide({ remark: newState.doc.textContent })
            }

            // 3. 更新视图
            editorView.updateState(newState);
        }
    }, {
        placeholder: '在此处输入视频脚本/演讲字幕。如果没有灵感？试试直接点击上方的“Ai生成脚本”，可以获得更丰富更有表现力的视频效果哦，快来试试吧！',
    })

    menuInstance.value = tippy(editorViewRef.value!, {
        duration: 0,
        content: menuRef.value!,
        interactive: true,
        trigger: 'manual',
        placement: 'top-start',
        hideOnClick: 'toggle',
        offset: [0, 6],
    })
})

onUnmounted(() => {
    editorView && editorView.destroy()
})
</script>

<style lang="scss" scoped>
.editor {
  height: 100%;
  overflow: auto;
}

.prosemirror-editor {
  height: 100%;
  cursor: text;

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

.menu {
  display: flex;
  background-color: #fff;
  padding: 6px 4px;
  border: 1px solid $borderColor;
  box-shadow: $boxShadow;
  border-radius: $borderRadius;

  button {
    outline: 0;
    border: 0;
    background-color: #fff;
    padding: 3px;
    border-radius: $borderRadius;
    font-size: 16px;
    margin: 0 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover, &.active {
      background-color: $themeColor;
      color: #fff;
    }
  }
}
</style>
