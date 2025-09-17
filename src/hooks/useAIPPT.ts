import { ref } from 'vue'
import { nanoid } from 'nanoid'
import type { ImageClipDataRange, PPTElement, PPTImageElement, PPTShapeElement, PPTTextElement, Slide, TextType, ImageType } from '@/types/slides'
import type { AIPPTSlide } from '@/types/AIPPT'
import { useSlidesStore } from '@/store'
import useAddSlidesOrElements from './useAddSlidesOrElements'
import useSlideHandler from './useSlideHandler'

interface ImgPoolItem {
  id: string
  src: string
  width: number
  height: number
}

export default () => {
  const slidesStore = useSlidesStore()
  const { addSlidesFromData } = useAddSlidesOrElements()
  const { isEmptySlide } = useSlideHandler()

  const imgPool = ref<ImgPoolItem[]>([])
  const transitionIndex = ref(0)
  const transitionTemplate = ref<Slide | null>(null)

  const checkTextType = (el: PPTElement, type: TextType) => {
    return (el.type === 'text' && el.textType === type) || (el.type === 'shape' && el.text && el.text.type === type)
  }
// 添加图片元素检查函数
  const checkImageType = (el: PPTElement, type: ImageType) => {
    return el.type === 'image' && el.imageType === type
  }

  const getUseableTemplates_new = (
      templates: Slide[],
      itemCount: number,
      type: TextType,
      imageCount?: number,
      imageType?: ImageType
  ) => {
    // 如果没有指定图片参数，使用原有逻辑
    if (imageCount === undefined || imageType === undefined) {
      // 原有的文本匹配逻辑...
      return getUseableTemplates(templates, itemCount, type)
    }
    // 新的混合匹配逻辑
    const list = templates.filter(slide => {
      const textElements = slide.elements.filter(el => checkTextType(el, type)).length
      const imageElements = slide.elements.filter(el => checkImageType(el, imageType)).length
      return textElements == itemCount && imageElements == imageCount
    })
    if (list.length > 0) {
      return list
    }
    if (list.length === 0) {
      return getUseableTemplates(templates, itemCount, type)
    }
  }
    const getUseableTemplates = (templates: Slide[], n: number, type: TextType) => {
      //剔除itemFigure
      templates= templates.filter(slide => {
        const itemFigures = slide.elements.filter(el => checkImageType(el, 'itemFigure'))
        return itemFigures.length === 0
      })
    if (n === 1) {
      const list = templates.filter(slide => {
        const items = slide.elements.filter(el => checkTextType(el, type))
        const titles = slide.elements.filter(el => checkTextType(el, 'title'))
        const texts = slide.elements.filter(el => checkTextType(el, 'content'))

        return !items.length && titles.length === 1 && texts.length === 1
      })

      if (list.length) return list
    }

    let target: Slide | null = null

    const list = templates.filter(slide => {
      const len = slide.elements.filter(el => checkTextType(el, type)).length
      return len >= n
    })
    if (list.length === 0) {
      const sorted = templates.sort((a, b) => {
        const aLen = a.elements.filter(el => checkTextType(el, type)).length
        const bLen = b.elements.filter(el => checkTextType(el, type)).length
        return aLen - bLen
      })
      target = sorted[sorted.length - 1]
    }
    else {
      target = list.reduce((closest, current) => {
        const currentLen = current.elements.filter(el => checkTextType(el, type)).length
        const closestLen = closest.elements.filter(el => checkTextType(el, type)).length
        return (currentLen - n) <= (closestLen - n) ? current : closest
      })
    }

    return templates.filter(slide => {
      const len = slide.elements.filter(el => checkTextType(el, type)).length
      const targetLen = target!.elements.filter(el => checkTextType(el, type)).length
      return len === targetLen
    })
  }

  const getAdaptedFontsize = ({
    text,
    fontSize,
    fontFamily,
    width,
    maxLine,
  }: {
    text: string
    fontSize: number
    fontFamily: string
    width: number
    maxLine: number
  }) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    let newFontSize = fontSize
    const minFontSize = 10

    while (newFontSize >= minFontSize) {
      context.font = `${newFontSize}px ${fontFamily}`
      const textWidth = context.measureText(text).width
      const line = Math.ceil(textWidth / width)

      if (line <= maxLine) return newFontSize

      const step = newFontSize <= 22 ? 1 : 2
      newFontSize = newFontSize - step
    }

    return minFontSize
  }

  const getFontInfo = (htmlString: string) => {
    const fontSizeRegex = /font-size:\s*(\d+(?:\.\d+)?)\s*px/i
    const fontFamilyRegex = /font-family:\s*['"]?([^'";]+)['"]?\s*(?=;|>|$)/i

    const defaultInfo = {
      fontSize: 16,
      fontFamily: 'Microsoft Yahei',
    }

    const fontSizeMatch = htmlString.match(fontSizeRegex)
    const fontFamilyMatch = htmlString.match(fontFamilyRegex)

    return {
      fontSize: fontSizeMatch ? (+fontSizeMatch[1].trim()) : defaultInfo.fontSize,
      fontFamily: fontFamilyMatch ? fontFamilyMatch[1].trim() : defaultInfo.fontFamily,
    }
  }

  const getNewTextElement = ({
    el,
    text,
    maxLine,
    longestText,
    digitPadding,
  }: {
    el: PPTTextElement | PPTShapeElement
    text: string
    maxLine: number
    longestText?: string
    digitPadding?: boolean
  }): PPTTextElement | PPTShapeElement => {
    const padding = 10
    const width = el.width - padding * 2 - 2

    let content = el.type === 'text' ? el.content : el.text!.content

    const fontInfo = getFontInfo(content)
    const size = getAdaptedFontsize({
      text: longestText || text,
      fontSize: fontInfo.fontSize,
      fontFamily: fontInfo.fontFamily,
      width,
      maxLine,
    })

    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')

    const treeWalker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)

    const firstTextNode = treeWalker.nextNode()
    if (firstTextNode) {
      if (digitPadding && firstTextNode.textContent && firstTextNode.textContent.length === 2 && text.length === 1) {
        firstTextNode.textContent = '0' + text
      }
      else firstTextNode.textContent = text
    }

    if (doc.body.innerHTML.indexOf('font-size') === -1) {
      const p = doc.querySelector('p')
      if (p) p.style.fontSize = '16px'
    }

    content = doc.body.innerHTML.replace(/font-size:(.+?)px/g, `font-size: ${size}px`)

    return el.type === 'text' ? { ...el, content, lineHeight: size < 15 ? 1.2 : el.lineHeight } : { ...el, text: { ...el.text!, content } }
  }

  const getUseableImage = (el: PPTImageElement): ImgPoolItem | null => {
    let img: ImgPoolItem | null = null

    let imgs = []

    if (el.width === el.height) imgs = imgPool.value.filter(img => img.width === img.height)
    else if (el.width > el.height) imgs = imgPool.value.filter(img => img.width > img.height)
    else imgs = imgPool.value.filter(img => img.width <= img.height)
    if (!imgs.length) imgs = imgPool.value

    img = imgs[Math.floor(Math.random() * imgs.length)]
    imgPool.value = imgPool.value.filter(item => item.id !== img!.id)

    return img
  }

  const getNewImgElement = (el: PPTImageElement, imgSrc?: string): PPTImageElement => {
    if (imgSrc) {
      // 直接使用提供的图片URL
      return { ...el, src: imgSrc }
    }
    const img = getUseableImage(el)
    if (!img) return el

    let scale = 1
    let w = el.width
    let h = el.height
    let range: ImageClipDataRange = [[0, 0], [0, 0]]
    const radio = el.width / el.height
    if (img.width / img.height >= radio) {
      scale = img.height / el.height
      w = img.width / scale
      const diff = (w - el.width) / 2 / w * 100
      range = [[diff, 0], [100 - diff, 100]]
    }
    else {
      scale = img.width / el.width
      h = img.height / scale
      const diff = (h - el.height) / 2 / h * 100
      range = [[0, diff], [100, 100 - diff]]
    }
    const clipShape = (el.clip && el.clip.shape) ? el.clip.shape : 'rect'
    const clip = { range, shape: clipShape }
    const src = img.src

    return { ...el, src, clip }
  }

  const getMdContent = (content: string) => {
    const regex = /```markdown([^```]*)```/
    const match = content.match(regex)
    if (match) return match[1].trim()
    return content.replace('```markdown', '').replace('```', '')
  }

  const getJSONContent = (content: string) => {
    const regex = /```json([^```]*)```/
    const match = content.match(regex)
    if (match) return match[1].trim()
    return content.replace('```json', '').replace('```', '')
  }

  const presetImgPool = (imgs: ImgPoolItem[]) => {
    imgPool.value = imgs
  }

  const AIPPT = (templateSlides: Slide[], _AISlides: AIPPTSlide[], imgs?: ImgPoolItem[]) => {
    slidesStore.updateSlideIndex(slidesStore.slides.length - 1)

    if (imgs) imgPool.value = imgs

    const AISlides: AIPPTSlide[] = []
    for (const template of _AISlides) {
      if (template.type === 'content') {
        //剔除itemFigure
        const items = template.data.items.filter(item => {
          return item.type === 'title'
        })
        if (items.length === 5 || items.length === 6) {
          const items1 = items.slice(0, 3)
          const items2 = items.slice(3)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 3 })
        }
        else if (items.length === 7 || items.length === 8) {
          const items1 = items.slice(0, 4)
          const items2 = items.slice(4)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 4 })
        }
        else if (items.length === 9 || items.length === 10) {
          const items1 = items.slice(0, 3)
          const items2 = items.slice(3, 6)
          const items3 = items.slice(6)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 3 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 6 })
        }
        else if (items.length > 10) {
          const items1 = items.slice(0, 4)
          const items2 = items.slice(4, 8)
          const items3 = items.slice(8)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 4 })
          AISlides.push({ ...template, data: { ...template.data, items: items3 }, offset: 8 })
        }
        else {
          AISlides.push(template)
        }
      }
      else if (template.type === 'contents') {
        const items = template.data.items
        if (items.length === 11) {
          const items1 = items.slice(0, 6)
          const items2 = items.slice(6)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 6 })
        }
        else if (items.length > 11) {
          const items1 = items.slice(0, 10)
          const items2 = items.slice(10)
          AISlides.push({ ...template, data: { ...template.data, items: items1 } })
          AISlides.push({ ...template, data: { ...template.data, items: items2 }, offset: 10 })
        }
        else {
          AISlides.push(template)
        }
      }
      else AISlides.push(template)
    }

    const coverTemplates = templateSlides.filter(slide => slide.type === 'cover')
    const contentsTemplates = templateSlides.filter(slide => slide.type === 'contents')
    const transitionTemplates = templateSlides.filter(slide => slide.type === 'transition')
    const contentTemplates = templateSlides.filter(slide => slide.type === 'content')
    const endTemplates = templateSlides.filter(slide => slide.type === 'end')

    if (!transitionTemplate.value) {
      const _transitionTemplate = transitionTemplates[Math.floor(Math.random() * transitionTemplates.length)]
      transitionTemplate.value = _transitionTemplate
    }

    const slides = []

    for (const item of AISlides) {
      if (item.type === 'cover') {
        const coverTemplate = coverTemplates[Math.floor(Math.random() * coverTemplates.length)]
        const elements = coverTemplate.elements.map(el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el, text: item.data.title, maxLine: 1 })
          }
          if (checkTextType(el, 'content') && item.data.text) {
            return getNewTextElement({ el, text: item.data.text, maxLine: 3 })
          }
          return el
        })
        slides.push({
          ...coverTemplate,
          id: nanoid(10),
          elements,
        })
      }
      else if (item.type === 'contents') {
        const _contentsTemplates = getUseableTemplates(contentsTemplates, item.data.items.length, 'item')
        const contentsTemplate = _contentsTemplates[Math.floor(Math.random() * _contentsTemplates.length)]

        const sortedNumberItems = contentsTemplate.elements.filter(el => checkTextType(el, 'itemNumber'))
        const sortedNumberItemIds = sortedNumberItems.sort((a, b) => {
          if (sortedNumberItems.length > 6) {
            let aContent = ''
            let bContent = ''
            if (a.type === 'text') aContent = a.content
            if (a.type === 'shape') aContent = a.text!.content
            if (b.type === 'text') bContent = b.content
            if (b.type === 'shape') bContent = b.text!.content

            if (aContent && bContent) {
              const aIndex = parseInt(aContent)
              const bIndex = parseInt(bContent)

              return aIndex - bIndex
            }
          }
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map(el => el.id)

        const sortedItems = contentsTemplate.elements.filter(el => checkTextType(el, 'item'))
        const sortedItemIds = sortedItems.sort((a, b) => {
          if (sortedItems.length > 6) {
            const aItemNumber = sortedNumberItems.find(item => item.groupId === a.groupId)
            const bItemNumber = sortedNumberItems.find(item => item.groupId === b.groupId)

            if (aItemNumber && bItemNumber) {
              let aContent = ''
              let bContent = ''
              if (aItemNumber.type === 'text') aContent = aItemNumber.content
              if (aItemNumber.type === 'shape') aContent = aItemNumber.text!.content
              if (bItemNumber.type === 'text') bContent = bItemNumber.content
              if (bItemNumber.type === 'shape') bContent = bItemNumber.text!.content

              if (aContent && bContent) {
                const aIndex = parseInt(aContent)
                const bIndex = parseInt(bContent)

                return aIndex - bIndex
              }
            }
          }

          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map(el => el.id)

        const longestText = item.data.items.reduce((longest, current) => current.length > longest.length ? current : longest, '')

        const unusedElIds: string[] = []
        const unusedGroupIds: string[] = []
        const elements = contentsTemplate.elements.map(el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (checkTextType(el, 'item')) {
            const index = sortedItemIds.findIndex(id => id === el.id)
            const itemTitle = item.data.items[index]
            if (itemTitle) return getNewTextElement({ el, text: itemTitle, maxLine: 1, longestText })

            unusedElIds.push(el.id)
            if (el.groupId) unusedGroupIds.push(el.groupId)
          }
          if (checkTextType(el, 'itemNumber')) {
            const index = sortedNumberItemIds.findIndex(id => id === el.id)
            const offset = item.offset || 0
            return getNewTextElement({ el, text: index + offset + 1 + '', maxLine: 1, digitPadding: true })
          }
          return el
        }).filter(el => !unusedElIds.includes(el.id) && !(el.groupId && unusedGroupIds.includes(el.groupId)))
        slides.push({
          ...contentsTemplate,
          id: nanoid(10),
          elements,
        })
      }
      else if (item.type === 'transition') {
        transitionIndex.value = transitionIndex.value + 1
        const elements = transitionTemplate.value.elements.map(el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
          if (el.type !== 'text' && el.type !== 'shape') return el
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el, text: item.data.title, maxLine: 1 })
          }
          if (checkTextType(el, 'content') && item.data.text) {
            return getNewTextElement({ el, text: item.data.text, maxLine: 3 })
          }
          if (checkTextType(el, 'partNumber')) {
            return getNewTextElement({ el, text: transitionIndex.value + '', maxLine: 1, digitPadding: true })
          }
          return el
        })
        slides.push({
          ...transitionTemplate.value,
          id: nanoid(10),
          elements,
        })
      }
      else if (item.type === 'content') {
        const _contentTemplates = getUseableTemplates_new(contentTemplates, item.data.items.filter(item => item.type === 'title').length, 'item',item.data.items.filter(item => item.type === 'itemFigure').length, 'itemFigure')!; // 使用非空断言操作符
        const contentTemplate = _contentTemplates[Math.floor(Math.random() * _contentTemplates.length)]
        const itemFigureItem = item.data.items.filter(
            item => item.type === 'itemFigure' && item.src
        );
        const titleItem = item.data.items.filter(
            item => item.type === 'title'
        );
        const sortedTitleItemIds = contentTemplate.elements.filter(el => checkTextType(el, 'itemTitle')).sort((a, b) => {
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map(el => el.id)

        const sortedTextItemIds = contentTemplate.elements.filter(el => checkTextType(el, 'item')).sort((a, b) => {
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map(el => el.id)

        const sortedNumberItemIds = contentTemplate.elements.filter(el => checkTextType(el, 'itemNumber')).sort((a, b) => {
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map(el => el.id)

        const sortedItemFigureItemIds = contentTemplate.elements.filter(el => checkImageType(el, 'itemFigure')).sort((a, b) => {
          const aIndex = a.left + a.top * 2
          const bIndex = b.left + b.top * 2
          return aIndex - bIndex
        }).map(el => el.id)
        const itemTitles = []
        const itemTexts = []
        const titleItemIds: string[] = []
        for (const _item of titleItem) {
          if (_item.title) itemTitles.push(_item.title)
          if (_item.text) itemTexts.push(_item.text)
        }
        const longestTitle = itemTitles.reduce((longest, current) => current.length > longest.length ? current : longest, '')
        const longestText = itemTexts.reduce((longest, current) => current.length > longest.length ? current : longest, '')

        const elements = contentTemplate.elements.map(el => {
          if (el.type === 'image' && el.imageType === 'itemFigure') {
            const index = sortedItemFigureItemIds.findIndex(id => id === el.id)
            const contentItem = itemFigureItem[index]
            if (contentItem && contentItem.src) {
              return getNewImgElement(el, contentItem.src);
            }

            // 如果传入数据中没有图片，尝试从图片池获取
            if (imgPool.value.length) {
              return getNewImgElement(el);
            }

            // 都没有则保持原样
            return el;
          }

          if (el.type !== 'text' && el.type !== 'shape') return el
            if (titleItem.length === 1) {
              const contentItem = titleItem[0]
              if (checkTextType(el, 'content') && contentItem.text) {
                return getNewTextElement({ el, text: contentItem.text, maxLine: 6 })
              }
              if (checkTextType(el, 'itemTitle')) {
                const index = sortedTitleItemIds.findIndex(id => id === el.id)
                const contentItem = titleItem[index]
                if (contentItem && contentItem.title) {
                  return getNewTextElement({ el, text: contentItem.title, longestText: longestTitle, maxLine: 1 })
                }
              }
              if (checkTextType(el, 'item')) {
                const index = sortedTextItemIds.findIndex(id => id === el.id)
                const contentItem = titleItem[index]
                if (contentItem && contentItem.text) {
                  return getNewTextElement({ el, text: contentItem.text, longestText, maxLine: 4 })
                }
              }
          }
          else {
            if (checkTextType(el, 'itemTitle')) {
              const index = sortedTitleItemIds.findIndex(id => id === el.id)
              const contentItem = titleItem[index]
              if (contentItem && contentItem.title) {
                return getNewTextElement({ el, text: contentItem.title, longestText: longestTitle, maxLine: 1 })
              }
            }
            if (checkTextType(el, 'item')) {
              const index = sortedTextItemIds.findIndex(id => id === el.id)
              const contentItem = titleItem[index]
              if (contentItem && contentItem.text) {
                return getNewTextElement({ el, text: contentItem.text, longestText, maxLine: 4 })
              }
            }
            if (checkTextType(el, 'itemNumber')) {
              const index = sortedNumberItemIds.findIndex(id => id === el.id)
              const offset = item.offset || 0
              return getNewTextElement({ el, text: index + offset + 1 + '', maxLine: 1, digitPadding: true })
            }
          }
          if (checkTextType(el, 'title') && item.data.title) {
            return getNewTextElement({ el, text: item.data.title, maxLine: 1 })
          }
          return el
        })
        slides.push({
          ...contentTemplate,
          id: nanoid(10),
          elements,
        })
      }
      else if (item.type === 'end') {
        const endTemplate = endTemplates[Math.floor(Math.random() * endTemplates.length)]
        const elements = endTemplate.elements.map(el => {
          if (el.type === 'image' && el.imageType && imgPool.value.length) return getNewImgElement(el)
          return el
        })
        slides.push({
          ...endTemplate,
          id: nanoid(10),
          elements,
        })
      }
    }
    if (isEmptySlide.value) slidesStore.setSlides(slides)
    else addSlidesFromData(slides)
  }

  return {
    presetImgPool,
    AIPPT,
    getMdContent,
    getJSONContent,
  }
}
