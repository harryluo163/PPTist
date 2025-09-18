import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { trim } from 'lodash'
import { saveAs } from 'file-saver'
import pptxgen from 'pptxgenjs'
import tinycolor from 'tinycolor2'
import { toPng, toJpeg } from 'html-to-image'
import { useSlidesStore } from '@/store'
import type { PPTElementOutline, PPTElementShadow, PPTElementLink, Slide } from '@/types/slides'
import { getElementRange, getLineElementPath, getTableSubThemeColor } from '@/utils/element'
import { type AST, toAST } from '@/utils/htmlParser'
import { type SvgPoints, toPoints } from '@/utils/svgPathParser'
import { encrypt } from '@/utils/crypto'
import { svg2Base64 } from '@/utils/svg2Base64'
import message from '@/utils/message'
import type {AIPPTSlide} from "@/types/AIPPT";
import {useMP4Store} from "@/store/mp4";
import axios from 'axios';
export const previewDataUrls = ref<string[]>([])
import { htmlToText } from '@/utils/common'
import useImport from "@/hooks/useImport";

interface UploadResult {
  image: string;
  text: string;
  timestamp: number;
}
interface ExportImageConfig {
  quality: number
  width: number
  fontEmbedCSS?: string
}

export default () => {
  const slidesStore = useSlidesStore()
  const { slides, theme, viewportRatio, title, viewportSize } = storeToRefs(slidesStore)
  const MP4Store = useMP4Store()
  const { resultArray,aiLoading } = storeToRefs(MP4Store)

  const defaultFontSize = 16

  const ratioPx2Inch = computed(() => {
    return 96 * (viewportSize.value / 960)
  })
  const ratioPx2Pt = computed(() => {
    return 96 / 72 * (viewportSize.value / 960)
  })

  const exporting = ref(false)
  // 导出视频
// 在useExport.ts中改进
  interface UploadResult {
    image: string;
    text: string;
    timestamp: number;
  }

  const API_URL = (import.meta.env.MODE === 'development') ? 'http://127.0.0.1:5000' : 'https://chatbi-video.centaline.com.cn'
  const uploadImage = async (domRef: HTMLElement, format: string, quality: number, ignoreWebfont = true, timestamp = Date.now()): Promise<UploadResult[]> => {
    const images = domRef.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      // Skip already loaded images
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        img.onerror = () => {
          // Replace with transparent placeholder
          img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
          resolve(); // Continue even if image fails
        };
        img.onload = resolve;
        // Force reload without cache
        img.src = `${img.src.split('?')[0]}?t=${Date.now()}`;
      }).catch(() => {}); // Silently handle individual image errors
    });

    await Promise.all(imagePromises); // Wait for all image checks to complete



    const toImage = format === 'png' ? toPng : toJpeg;
    const foreignObjectSpans = domRef.querySelectorAll('foreignObject [xmlns]');
    foreignObjectSpans.forEach(spanRef => spanRef.removeAttribute('xmlns'));

    const thumbnails = domRef.querySelectorAll('div.thumbnail-slide.thumbnail');
    MP4Store.clearResultArray()

    const uploadPromises: Promise<void>[] = [];

    thumbnails.forEach((thumbnail, index) => {
      const textElement = thumbnail.querySelector('.text-content');
      const text = textElement ? textElement.textContent || '' : '';
      const filename = `${timestamp}-${index}.${format}`;

      const promise = toImage(thumbnail, {
        quality,
        width: 1600,
        ...(ignoreWebfont ? { fontEmbedCSS: '' } : {})
      })
          .then(dataUrl => fetch(dataUrl).then(res => res.blob()))
          .then(blob => {
            const formData = new FormData();
            formData.append('file', blob, filename);

            return fetch(API_URL+'/upload', {
              method: 'POST',
              body: formData
            });
          })
          .then(response => {
            if (!response.ok) throw new Error('Upload failed');
            return response.json();
          })
          .then(data => {
            MP4Store.addItemToArray({
              image: data.url || '',
              text,
              timestamp
            });
          })
          .catch(error => {
            console.error('Upload error:', error);
            // 即使失败也继续处理，可以在这里记录失败项
          });

      uploadPromises.push(promise);
    });

    return Promise.allSettled(uploadPromises).then(() => resultArray);
  };

  const exportMP4 = async (domRef: HTMLElement, format: string, quality: number, ignoreWebfont = true, email?: string): Promise<any> => {
    if (email && !validateEmail(email)) {
      throw new Error('Invalid email address');
    }

    const timestamp = Date.now();
    //上传图片
    const data = await uploadImage(domRef, format, quality, ignoreWebfont, timestamp);

    //发送字幕生成音频
    await exportAudiozm(timestamp)

    // await exportVideo( '1757574647654');



    //生成字幕+语言
    // const zm= await exportZM(convertAISlidesToText(convertSlidesToAISlides(slides.value)),timestamp)

    // const mp4Store = useMP4Store();
    // mp4Store.setGenerating(true);
    // c.zm="1111"
    // exportVideo(1752133195899)
  };


  const exportZM = async (text: string, timestamp: string): Promise<void> => {
    const SSE_DELIMITER = "\n\n";
    const DONE_MARKER = "[DONE]";
    const mp4Store = useMP4Store();
    mp4Store.clearSubtitle();
    mp4Store.setGenerating(true);

    const controller = new AbortController();
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 100; // 毫秒

    try {
      const response = await fetch(API_URL+"/convertZM", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, timestamp }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          await exportAudio(timestamp)
          break
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(SSE_DELIMITER);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          if (part === DONE_MARKER) {
            controller.abort();

            return;
          }

          try {
            const now = Date.now();
            if (now - lastUpdateTime < UPDATE_THROTTLE) continue;

            const data = JSON.parse(part);
            if (data.subtitle) {
              mp4Store.updateSubtitle(data.subtitle.replace(/\[|\]/g, "")
                  .replace(/"/g, ""));
              lastUpdateTime = now;
            }
          } catch (e) {
            console.warn("Failed to parse chunk:", part, e);
          }
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Stream error:", error);
        mp4Store.setError("生成字幕时出错，请重试");
        throw error;
      }
    } finally {
      mp4Store.setGenerating(false);
    }
  };

  const clearAllSlideRemarks = () => {
    slides.value.forEach(slide => {
      if (slide.remark) {
        slidesStore.updateSlide(
            { remark: "" },
            slide.id
        );
      }
    })

  }

  const exportZMv22 = async (text: string, timestamp: string): Promise<void> => {
    clearAllSlideRemarks();
    const SSE_DELIMITER = "\n";
    const DONE_MARKER = "[DONE]";
    const mp4Store = useMP4Store();
    const slidesStore = useSlidesStore();
    const { slides } = storeToRefs(slidesStore); // 确保 slides 是响应式的

    mp4Store.clearSubtitle();
    mp4Store.setGenerating(true);
    const controller = new AbortController();

    // 模拟数据（实际使用时替换为你的 SSE 流数据）
    const parts = [
      { "id": "XwQ6ytH4xh", "pageIndex": 0, "lines": ["大家好，欢迎查看深圳2025年5月房地产市场分析报告。", "接下来，我们一起了解市场最新动态。"] },
      { "id": "myDyPeII5o", "pageIndex": 1, "lines": ["首先2，我们来看本次报告的目录内容。", "包括市场概况、新房与二手房市场分析，", "以及趋势研判、建议与未来展望。"] },
      { "id": "PDajVo-qmA", "pageIndex": 2, "lines": ["现在进入第一部分——市场概况。", "整体来看，新房市场有所降温，", "而二手房表现活跃，市场呈现明显分化。"] },
      { "id": "D_xwMsh-el", "pageIndex": 3, "lines": ["我们来看具体数据。", "新房住宅成交量环比下降7.99%。", "同比下降更是达到了26.12%。", "这说明新房市场确实出现了短期降温。", "再看二手房方面，", "虽然环比下降了18.2%，但同比增长18.3%。", "显示出市场依然有较强韧性。", "区域方面，龙华区新房成交面积最多，", "龙岗区二手房过户量领先，", "核心区合计占比高达45%，", "区域分化特征十分明显。"] },
      { "id": "BJFn4RaZnS", "pageIndex": 4, "lines": ["接下来进入第二部分——新房市场分析。", "我们将全面解析成交数据、网签情况和区域分布。"] }
    ];

    // 每1秒更新一个 slide 的 remark
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const { ttId } = storeToRefs(mp4Store)
      ttId.value = Date.now(); // 触发 Draggable 重新渲染
      // 使用 setTimeout 延迟执行，确保每次更新间隔 1 秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const pageData = part;

        if (typeof pageData.pageIndex !== "number" || !Array.isArray(pageData.lines)) {
          throw new Error("Invalid page data");
        }

        const cleanedLines = pageData.lines
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);

        // 更新对应 slide 的 remark
        slidesStore.updateSlide(
            { remark: cleanedLines.join("\n") },
            slides.value[pageData.pageIndex].id
        );

      } catch (e) {
        console.warn("Failed to parse chunk:", part, e);
      }
    }

    mp4Store.setGenerating(false); // 加载完成
  };
  const exportZMv2 = async (text: string, timestamp: string): Promise<void> => {
    aiLoading.value=true
    clearAllSlideRemarks()
    const SSE_DELIMITER = "\n";
    const DONE_MARKER = "[DONE]";
    const mp4Store = useMP4Store();
    const slidesStore = useSlidesStore();

    mp4Store.clearSubtitle();
    mp4Store.setGenerating(true);
    const controller = new AbortController();
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 100;

    // 累积待更新数据
    let pendingUpdates: { pageIndex: number; lines: string[] }[] = [];

    try {
      const response = await fetch(API_URL + "/convertZM", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, timestamp }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error("Response body is null");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(SSE_DELIMITER);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim() || part === DONE_MARKER) continue;

          try {
            const pageData = JSON.parse(part);

            if (typeof pageData.pageIndex !== "number" || !pageData.script) {
              throw new Error("Invalid page data");
            }

            pendingUpdates.push({ pageIndex: pageData.pageIndex,id: pageData.id, script: pageData.script });

            const { ttId } = storeToRefs(mp4Store)
            ttId.value = Date.now(); // 触发 Draggable 重新渲染
            for (const update of pendingUpdates) {
              slidesStore.updateSlide(
                  { remark: update.script },
                  update.id
              );
            }
            pendingUpdates = [];
          } catch (e) {
            console.warn("Failed to parse chunk:", part, e);
          }
        }
      }

      // 处理剩余未更新的数据
      if (pendingUpdates.length > 0) {
        for (const update of pendingUpdates) {
          slidesStore.updateSlide(
              { remark: update.script },
              update.id
          );
        }
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Stream error:", error);
        mp4Store.setError("生成字幕时出错，请重试");
        throw error;
      }
    } finally {
      aiLoading.value=false
      mp4Store.setGenerating(false);
    }
  };
  const exportAudiozm = async (timestamp: string): Promise<void> => {
    const mp4Store = useMP4Store();
    mp4Store.clearAudio();


    try {
      const response = await fetch(API_URL+"/convertZMtoAduio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: mp4Store.model,
          timestamp:timestamp,
          text:convertSlidesToAIZM()
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json(); // 解析JSON响应
      mp4Store.updateAudio(result.fileUrl)
      await exportVideo( timestamp);

    } catch (error) {

    } finally {
      mp4Store.setGenerating(false);
    }
  };

  const exportAudio = async (timestamp: string): Promise<void> => {
    const mp4Store = useMP4Store();
    mp4Store.clearAudio();


    try {
      const response = await fetch(API_URL+"/convertAduio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timestamp }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json(); // 解析JSON响应
      mp4Store.updateAudio(result.fileUrl)
      await exportVideo( timestamp);

    } catch (error) {

    } finally {
      mp4Store.setGenerating(false);
    }
  };
  const exportVideo = async (timestamp: string) => {
    const mp4Store = useMP4Store()
    mp4Store.clearVideo()
    mp4Store.logs=""
    mp4Store.isGenerating_video = true

    const controller = new AbortController()
    const PROGRESS_THROTTLE = 0.05 // 5%更新阈值

    try {
      const response = await fetch(`${API_URL}/convertVideo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp:timestamp,
          videoFormat: mp4Store.videoFormat,
          videoSy: mp4Store.videoSy,
          videoZM: mp4Store.videoZM,
          bkmusic: mp4Store.bkmusic,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let lastProgress = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 处理可能的多条消息
        const chunks = buffer.split("data: ")
        // buffer = chunks.pop() || "" // 剩余部分放回缓冲区

        for (const chunk of chunks) {
          if (!chunk.trim()) continue

          try {
            const data = JSON.parse(chunk.replace(/\n\n$/, ""))

            // 实时处理所有状态消息
            switch(data.status) {
              case "info":
                if (data.message.indexOf("MoviePy - Building video")>=0&&data.message.indexOf(".mp4")>=0){
                  mp4Store.updateLogs("开始生成视频中...")
                }else if (data.message.indexOf("MoviePy - Writing audio")>=0&&data.message.indexOf(".mp3")>=0){
                  mp4Store.updateLogs("第一步：生成音频中...")
                }else if (data.message.indexOf("MoviePy - Writing video")>=0&&data.message.indexOf(".mp4")>=0){
                  mp4Store.updateLogs("第二步：合成视频中...")
                }

                break
              case "progress":
                // 更灵敏的进度更新
                if (Math.abs(data.progress - lastProgress) >= PROGRESS_THROTTLE ||
                    data.progress === 1) {
                  mp4Store.updateProgress(Math.round(data.progress * 100))
                  lastProgress = data.progress
                }
                break

              case "completed":
                mp4Store.updateVideo(data.fileUrl)
                mp4Store.updateProgress(100)
                return // 完成时直接退出

              case "error":
                throw new Error(data.message)

              default:

            }
          } catch (e) {
            console.error("Parse error:", chunk, e)
          }
        }
      }
    } catch (error) {

      console.error("Video generation failed:", error)
    } finally {
      mp4Store.isGenerating_video = false
      controller.abort() // 确保取消请求
    }
  }

  function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@h[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  const convertSlidesToAIZM = (): AIPPTSlide[] => {
    const aiSlides: AIPPTSlide[] = []

    slides.value.forEach((slide, index) => {
      aiSlides.push({
        id: slide.id,
        pageIndex: index,
        script: htmlToText(slide.remark || ''),
      })
    })
    return JSON.stringify(aiSlides)
  }
  const convertSlidesToAISlides = (): AIPPTSlide[] => {
    const aiSlides: AIPPTSlide[] = []

    // 去除HTML标签的辅助函数
    const stripHtml = (html: string): string => {
      return html.replace(/<[^>]+>/g, '').replace(/\s*/g, '')
    }

    slides.value.forEach((slide, index) => {
      if (slide.type=="cover") {
        // 第一张作为封面
        aiSlides.push({
          type: '封面',
          id: slide.id,
          data: {
            text: slide.elements.filter(el => el.type === 'text')?.map(item => stripHtml(item?.content)).join(" ")
          }
        })
      }
      else if(slide.type=="contents"){
        aiSlides.push({
          type: '目录页',
          id: slide.id,
          data: {
            text: slide.elements.filter(el => el.type === 'text')?.map(item => stripHtml(item?.content)).join(" ")
          }
        })

      }else if(slide.type=="content"){
        //拿到标题
        const titleElement = slide.elements.find(el => el.type === 'text'&&el.textType=="title")
        //拿到内容，去除标题
        const _text= slide.elements.filter(el =>el.textType!="title").map((item)=>{  if(item.content){ return stripHtml(item.content) }else if(item.text){ return stripHtml(item.text.content)}}).join(" ")

        aiSlides.push({
          type: '内容页',
          id: slide.id,
          data: {
            title: titleElement?.content ? stripHtml(titleElement.content) : '',
            text: _text
          }
        })
      }else if (slide.type === 'transition'){
        aiSlides.push({
          type: '过度页',
          id: slide.id,
          data: {
            title: '',
            text: slide.elements.map((item)=>{  if(item.content){ return stripHtml(item.content) }else if(item.text){ return stripHtml(item.text.content)}}).join(" ")
          }
        })

      }else if (slide.type === 'end'){
        aiSlides.push({
          type: '结尾',
          id: slide.id,
          data: {
            title: '',
            text: slide.elements.map((item)=>{  if(item.content){ return stripHtml(item.content) }else if(item.text){ return stripHtml(item.text.content)}}).join(" ")
          }
        })

      }else{
        const titleElement = slide.elements.find(el => el.type === 'text'&&el.textType=="title")
        //拿到内容，去除标题
        const _text= slide.elements.filter(el =>el.textType!="title").map((item)=>{  if(item.content){ return stripHtml(item.content) }else if(item.text){ return stripHtml(item.text.content)}}).join(" ")

        aiSlides.push({
          type: '',
          id: slide.id,
          data: {
            title: titleElement?.content ? stripHtml(titleElement.content) : '',
            text: _text?_text:''
          }
        })
      }


    })

    return JSON.stringify(aiSlides)
  }
// 辅助函数：检查文本元素类型
  const checkTextType = (element: any, type: string): boolean => {
    // 这里需要根据实际的文本元素结构来判断
    // 可能需要检查元素的样式、位置或其他属性来确定类型
    return true // 简化实现
  }
  const convertAISlidesToText = (aiSlides: AIPPTSlide[]): string => {
    let textOutput = ''
    let contentIndex = 0

    aiSlides.forEach((slide, index) => {
      contentIndex++
      switch (slide.type) {
        case 'cover':
          textOutput += `第${contentIndex}页的id是${slide.id},是标题页：${slide.data.text}。`
          break

        case 'content':
          textOutput += `第${contentIndex}页的id是${slide.id},是内容页：标题是${slide.data.title}`
          textOutput += `内容是${slide.data.text} 。`
          break

        case 'transition':
          textOutput += `第${contentIndex}页id是${slide.id},是过渡页：${slide.data.text}。`
          break

        case 'contents':
          textOutput += `第${contentIndex}页id是${slide.id},是目录页：${slide.data.text}。`
          break

        case 'end':
          textOutput += `第${contentIndex}页id是${slide.id},是结尾：${slide.data.text}。`
          break
      }
    })

    return textOutput
  }
  // 导出图片
  const exportImage = async (
      domRef: HTMLElement,
      format: 'png' | 'jpeg', // 明确限定格式，避免非法值
      quality: number,
      ignoreWebfont = true
  ): Promise<void> => {
    exporting.value = true;
    const toImage = format === 'png' ? toPng : toJpeg;

    // 1. 移除 foreignObject 的 xmlns 属性（避免 SVG 渲染问题）
    const foreignObjectSpans = domRef.querySelectorAll('foreignObject [xmlns]');
    foreignObjectSpans.forEach(span => span.removeAttribute('xmlns'));

    // 2. 预处理图片：替换失效图片为透明占位图
    const images = domRef.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      // 跳过已加载成功的图片（避免重复检查）
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        img.onerror = () => {
          img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
          resolve(); // 即使失败也继续执行
        };
        img.onload = resolve;
        img.src = `${img.src.split('?')[0]}?t=${Date.now()}`; // 强制重新加载
      }).catch(() => {}); // 静默处理单个图片错误
    });

    await Promise.all(imagePromises); // 等待所有图片检查完成

    // 3. 动态延迟（根据图片数量调整，避免硬编码 200ms）
    const delay = images.length > 5 ? 300 : 100;

    setTimeout(() => {
      const config: ExportImageConfig = {
        quality,
        width: 1600,
      };

      if (ignoreWebfont) {
        config.fontEmbedCSS = ''; // 禁用字体嵌入（可选）
      }

      toImage(domRef, config)
          .then(dataUrl => {
            const filename = `${title.value || 'export'}.${format}`;
            saveAs(dataUrl, filename);
          })
          .catch((err: Error) => {
            console.error('导出失败:', err);
            message.error(`导出失败: ${err.message || '未知错误'}`);
          })
          .finally(() => {
            exporting.value = false;
          });
    }, delay);
  };

  // 导出pptist文件（特有 .pptist 后缀文件）
  const exportSpecificFile = (_slides: Slide[]) => {
    const json = {
      title: title.value,
      width: viewportSize.value,
      height: viewportSize.value * viewportRatio.value,
      theme: theme.value,
      slides: _slides,
    }
    const blob = new Blob([encrypt(JSON.stringify(json))], { type: '' })
    saveAs(blob, `${title.value}.pptist`)
  }

  // 导出JSON文件
  const exportJSON = () => {
    const json = {
      title: title.value,
      width: viewportSize.value,
      height: viewportSize.value * viewportRatio.value,
      theme: theme.value,
      slides: slides.value,
    }
    const blob = new Blob([JSON.stringify(json)], { type: '' })
    saveAs(blob, `${title.value}.json`)
  }

  // 格式化颜色值为 透明度 + HexString，供pptxgenjs使用
  const formatColor = (_color: string) => {
    if (!_color) {
      return {
        alpha: 0,
        color: '#000000',
      }
    }

    const c = tinycolor(_color)
    const alpha = c.getAlpha()
    const color = alpha === 0 ? '#ffffff' : c.setAlpha(1).toHexString()
    return {
      alpha,
      color,
    }
  }

  type FormatColor = ReturnType<typeof formatColor>

  // 将HTML字符串格式化为pptxgenjs所需的格式
  // 核心思路：将HTML字符串按样式分片平铺，每个片段需要继承祖先元素的样式信息，遇到块级元素需要换行
  const formatHTML = (html: string) => {
    const ast = toAST(html)
    let bulletFlag = false
    let indent = 0

    const slices: pptxgen.TextProps[] = []
    const parse = (obj: AST[], baseStyleObj: { [key: string]: string } = {}) => {

      for (const item of obj) {
        const isBlockTag = 'tagName' in item && ['div', 'li', 'p'].includes(item.tagName)

        if (isBlockTag && slices.length) {
          const lastSlice = slices[slices.length - 1]
          if (!lastSlice.options) lastSlice.options = {}
          lastSlice.options.breakLine = true
        }

        const styleObj = { ...baseStyleObj }
        const styleAttr = 'attributes' in item ? item.attributes.find(attr => attr.key === 'style') : null
        if (styleAttr && styleAttr.value) {
          const styleArr = styleAttr.value.split(';')
          for (const styleItem of styleArr) {
            const [_key, _value] = styleItem.split(': ')
            const [key, value] = [trim(_key), trim(_value)]
            if (key && value) styleObj[key] = value
          }
        }

        if ('tagName' in item) {
          if (item.tagName === 'em') {
            styleObj['font-style'] = 'italic'
          }
          if (item.tagName === 'strong') {
            styleObj['font-weight'] = 'bold'
          }
          if (item.tagName === 'sup') {
            styleObj['vertical-align'] = 'super'
          }
          if (item.tagName === 'sub') {
            styleObj['vertical-align'] = 'sub'
          }
          if (item.tagName === 'a') {
            const attr = item.attributes.find(attr => attr.key === 'href')
            styleObj['href'] = attr?.value || ''
          }
          if (item.tagName === 'ul') {
            styleObj['list-type'] = 'ul'
          }
          if (item.tagName === 'ol') {
            styleObj['list-type'] = 'ol'
          }
          if (item.tagName === 'li') {
            bulletFlag = true
          }
          if (item.tagName === 'p') {
            if ('attributes' in item) {
              const dataIndentAttr = item.attributes.find(attr => attr.key === 'data-indent')
              if (dataIndentAttr && dataIndentAttr.value) indent = +dataIndentAttr.value
            }
          }
        }

        if ('tagName' in item && item.tagName === 'br') {
          slices.push({ text: '', options: { breakLine: true } })
        }
        else if ('content' in item) {
          const text = item.content.replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\n/g, '')
          const options: pptxgen.TextPropsOptions = {}

          if (styleObj['font-size']) {
            options.fontSize = parseInt(styleObj['font-size']) / ratioPx2Pt.value
          }
          if (styleObj['color']) {
            options.color = formatColor(styleObj['color']).color
          }
          if (styleObj['background-color']) {
            options.highlight = formatColor(styleObj['background-color']).color
          }
          if (styleObj['text-decoration-line']) {
            if (styleObj['text-decoration-line'].indexOf('underline') !== -1) {
              options.underline = {
                color: options.color || '#000000',
                style: 'sng',
              }
            }
            if (styleObj['text-decoration-line'].indexOf('line-through') !== -1) {
              options.strike = 'sngStrike'
            }
          }
          if (styleObj['text-decoration']) {
            if (styleObj['text-decoration'].indexOf('underline') !== -1) {
              options.underline = {
                color: options.color || '#000000',
                style: 'sng',
              }
            }
            if (styleObj['text-decoration'].indexOf('line-through') !== -1) {
              options.strike = 'sngStrike'
            }
          }
          if (styleObj['vertical-align']) {
            if (styleObj['vertical-align'] === 'super') options.superscript = true
            if (styleObj['vertical-align'] === 'sub') options.subscript = true
          }
          if (styleObj['text-align']) options.align = styleObj['text-align'] as pptxgen.HAlign
          if (styleObj['font-weight']) options.bold = styleObj['font-weight'] === 'bold'
          if (styleObj['font-style']) options.italic = styleObj['font-style'] === 'italic'
          if (styleObj['font-family']) options.fontFace = styleObj['font-family']
          if (styleObj['href']) options.hyperlink = { url: styleObj['href'] }

          if (bulletFlag && styleObj['list-type'] === 'ol') {
            options.bullet = { type: 'number', indent: (options.fontSize || defaultFontSize) * 1.25 }
            options.paraSpaceBefore = 0.1
            bulletFlag = false
          }
          if (bulletFlag && styleObj['list-type'] === 'ul') {
            options.bullet = { indent: (options.fontSize || defaultFontSize) * 1.25 }
            options.paraSpaceBefore = 0.1
            bulletFlag = false
          }
          if (indent) {
            options.indentLevel = indent
            indent = 0
          }

          slices.push({ text, options })
        }
        else if ('children' in item) parse(item.children, styleObj)
      }
    }
    parse(ast)
    return slices
  }

  type Points = Array<
      | { x: number; y: number; moveTo?: boolean }
      | { x: number; y: number; curve: { type: 'arc'; hR: number; wR: number; stAng: number; swAng: number } }
      | { x: number; y: number; curve: { type: 'quadratic'; x1: number; y1: number } }
      | { x: number; y: number; curve: { type: 'cubic'; x1: number; y1: number; x2: number; y2: number } }
      | { close: true }
  >

  // 将SVG路径信息格式化为pptxgenjs所需要的格式
  const formatPoints = (points: SvgPoints, scale = { x: 1, y: 1 }): Points => {
    return points.map(point => {
      if (point.close !== undefined) {
        return { close: true }
      }
      else if (point.type === 'M') {
        return {
          x: point.x / ratioPx2Inch.value * scale.x,
          y: point.y / ratioPx2Inch.value * scale.y,
          moveTo: true,
        }
      }
      else if (point.curve) {
        if (point.curve.type === 'cubic') {
          return {
            x: point.x / ratioPx2Inch.value * scale.x,
            y: point.y / ratioPx2Inch.value * scale.y,
            curve: {
              type: 'cubic',
              x1: (point.curve.x1 as number) / ratioPx2Inch.value * scale.x,
              y1: (point.curve.y1 as number) / ratioPx2Inch.value * scale.y,
              x2: (point.curve.x2 as number) / ratioPx2Inch.value * scale.x,
              y2: (point.curve.y2 as number) / ratioPx2Inch.value * scale.y,
            },
          }
        }
        else if (point.curve.type === 'quadratic') {
          return {
            x: point.x / ratioPx2Inch.value * scale.x,
            y: point.y / ratioPx2Inch.value * scale.y,
            curve: {
              type: 'quadratic',
              x1: (point.curve.x1 as number) / ratioPx2Inch.value * scale.x,
              y1: (point.curve.y1 as number) / ratioPx2Inch.value * scale.y,
            },
          }
        }
      }
      return {
        x: point.x / ratioPx2Inch.value * scale.x,
        y: point.y / ratioPx2Inch.value * scale.y,
      }
    })
  }

  // 获取阴影配置
  const getShadowOption = (shadow: PPTElementShadow): pptxgen.ShadowProps => {
    const c = formatColor(shadow.color)
    const { h, v } = shadow

    let offset = 4
    let angle = 45

    if (h === 0 && v === 0) {
      offset = 4
      angle = 45
    }
    else if (h === 0) {
      if (v > 0) {
        offset = v
        angle = 90
      }
      else {
        offset = -v
        angle = 270
      }
    }
    else if (v === 0) {
      if (h > 0) {
        offset = h
        angle = 1
      }
      else {
        offset = -h
        angle = 180
      }
    }
    else if (h > 0 && v > 0) {
      offset = Math.max(h, v)
      angle = 45
    }
    else if (h > 0 && v < 0) {
      offset = Math.max(h, -v)
      angle = 315
    }
    else if (h < 0 && v > 0) {
      offset = Math.max(-h, v)
      angle = 135
    }
    else if (h < 0 && v < 0) {
      offset = Math.max(-h, -v)
      angle = 225
    }

    return {
      type: 'outer',
      color: c.color.replace('#', ''),
      opacity: c.alpha,
      blur: shadow.blur / ratioPx2Pt.value,
      offset,
      angle,
    }
  }

  const dashTypeMap = {
    'solid': 'solid',
    'dashed': 'dash',
    'dotted': 'sysDot',
  }

  // 获取边框配置
  const getOutlineOption = (outline: PPTElementOutline): pptxgen.ShapeLineProps => {
    const c = formatColor(outline?.color || '#000000')

    return {
      color: c.color,
      transparency: (1 - c.alpha) * 100,
      width: (outline.width || 1) / ratioPx2Pt.value,
      dashType: outline.style ? dashTypeMap[outline.style] as 'solid' | 'dash' | 'sysDot' : 'solid',
    }
  }

  // 获取超链接配置
  const getLinkOption = (link: PPTElementLink): pptxgen.HyperlinkProps | null => {
    const { type, target } = link
    if (type === 'web') return { url: target }
    if (type === 'slide') {
      const index = slides.value.findIndex(slide => slide.id === target)
      if (index !== -1) return { slide: index + 1 }
    }

    return null
  }

  // 判断是否为Base64图片地址
  const isBase64Image = (url: string) => {
    const regex = /^data:image\/[^;]+;base64,/
    return url.match(regex) !== null
  }

  // 判断是否为SVG图片地址
  const isSVGImage = (url: string) => {
    const isSVGBase64 = /^data:image\/svg\+xml;base64,/.test(url)
    const isSVGUrl = /\.svg$/.test(url)
    return isSVGBase64 || isSVGUrl
  }

  // 导出PPTX文件
  const exportPPTX = (_slides: Slide[], masterOverwrite: boolean, ignoreMedia: boolean) => {
    exporting.value = true
    const pptx = new pptxgen()

    if (viewportRatio.value === 0.625) pptx.layout = 'LAYOUT_16x10'
    else if (viewportRatio.value === 0.75) pptx.layout = 'LAYOUT_4x3'
    else if (viewportRatio.value === 0.70710678) {
      pptx.defineLayout({ name: 'A3', width: 10, height: 7.0710678 })
      pptx.layout = 'A3'
    }
    else if (viewportRatio.value === 1.41421356) {
      pptx.defineLayout({ name: 'A3_V', width: 10, height: 14.1421356 })
      pptx.layout = 'A3_V'
    }
    else pptx.layout = 'LAYOUT_16x9'

    if (masterOverwrite) {
      const { color: bgColor, alpha: bgAlpha } = formatColor(theme.value.backgroundColor)
      pptx.defineSlideMaster({
        title: 'PPTIST_MASTER',
        background: { color: bgColor, transparency: (1 - bgAlpha) * 100 },
      })
    }

    for (const slide of _slides) {
      const pptxSlide = pptx.addSlide()

      if (slide.background) {
        const background = slide.background
        if (background.type === 'image' && background.image) {
          if (isSVGImage(background.image.src)) {
            pptxSlide.addImage({
              data: background.image.src,
              x: 0,
              y: 0,
              w: viewportSize.value / ratioPx2Inch.value,
              h: viewportSize.value * viewportRatio.value / ratioPx2Inch.value,
            })
          }
          else if (isBase64Image(background.image.src)) {
            pptxSlide.background = { data: background.image.src }
          }
          else {
            pptxSlide.background = { path: background.image.src }
          }
        }
        else if (background.type === 'solid' && background.color) {
          const c = formatColor(background.color)
          pptxSlide.background = { color: c.color, transparency: (1 - c.alpha) * 100 }
        }
        else if (background.type === 'gradient' && background.gradient) {
          const colors = background.gradient.colors
          const color1 = colors[0].color
          const color2 = colors[colors.length - 1].color
          const color = tinycolor.mix(color1, color2).toHexString()
          const c = formatColor(color)
          pptxSlide.background = { color: c.color, transparency: (1 - c.alpha) * 100 }
        }
      }
      if (slide.remark) {
        const doc = new DOMParser().parseFromString(slide.remark, 'text/html')
        const pList = doc.body.querySelectorAll('p')
        const text = []
        for (const p of pList) {
          const textContent = p.textContent
          text.push(textContent || '')
        }
        pptxSlide.addNotes(text.join('\n'))
      }

      if (!slide.elements) continue

      for (const el of slide.elements) {
        if (el.type === 'text') {
          const textProps = formatHTML(el.content)

          const options: pptxgen.TextPropsOptions = {
            x: el.left / ratioPx2Inch.value,
            y: el.top / ratioPx2Inch.value,
            w: el.width / ratioPx2Inch.value,
            h: el.height / ratioPx2Inch.value,
            fontSize: defaultFontSize / ratioPx2Pt.value,
            fontFace: '微软雅黑',
            color: '#000000',
            valign: 'top',
            margin: 10 / ratioPx2Pt.value,
            paraSpaceBefore: 5 / ratioPx2Pt.value,
            lineSpacingMultiple: 1.5 / 1.25,
            autoFit: true,
          }
          if (el.rotate) options.rotate = el.rotate
          if (el.wordSpace) options.charSpacing = el.wordSpace / ratioPx2Pt.value
          if (el.lineHeight) options.lineSpacingMultiple = el.lineHeight / 1.25
          if (el.fill) {
            const c = formatColor(el.fill)
            const opacity = el.opacity === undefined ? 1 : el.opacity
            options.fill = { color: c.color, transparency: (1 - c.alpha * opacity) * 100 }
          }
          if (el.defaultColor) options.color = formatColor(el.defaultColor).color
          if (el.defaultFontName) options.fontFace = el.defaultFontName
          if (el.shadow) options.shadow = getShadowOption(el.shadow)
          if (el.outline?.width) options.line = getOutlineOption(el.outline)
          if (el.opacity !== undefined) options.transparency = (1 - el.opacity) * 100
          if (el.paragraphSpace !== undefined) options.paraSpaceBefore = el.paragraphSpace / ratioPx2Pt.value
          if (el.vertical) options.vert = 'eaVert'

          pptxSlide.addText(textProps, options)
        }

        else if (el.type === 'image') {
          const options: pptxgen.ImageProps = {
            x: el.left / ratioPx2Inch.value,
            y: el.top / ratioPx2Inch.value,
            w: el.width / ratioPx2Inch.value,
            h: el.height / ratioPx2Inch.value,
          }
          if (isBase64Image(el.src)) options.data = el.src
          else options.path = el.src

          if (el.flipH) options.flipH = el.flipH
          if (el.flipV) options.flipV = el.flipV
          if (el.rotate) options.rotate = el.rotate
          if (el.link) {
            const linkOption = getLinkOption(el.link)
            if (linkOption) options.hyperlink = linkOption
          }
          if (el.filters?.opacity) options.transparency = 100 - parseInt(el.filters?.opacity)
          if (el.clip) {
            if (el.clip.shape === 'ellipse') options.rounding = true

            const [start, end] = el.clip.range
            const [startX, startY] = start
            const [endX, endY] = end

            const originW = el.width / ((endX - startX) / ratioPx2Inch.value)
            const originH = el.height / ((endY - startY) / ratioPx2Inch.value)

            options.w = originW / ratioPx2Inch.value
            options.h = originH / ratioPx2Inch.value

            options.sizing = {
              type: 'crop',
              x: startX / ratioPx2Inch.value * originW / ratioPx2Inch.value,
              y: startY / ratioPx2Inch.value * originH / ratioPx2Inch.value,
              w: (endX - startX) / ratioPx2Inch.value * originW / ratioPx2Inch.value,
              h: (endY - startY) / ratioPx2Inch.value * originH / ratioPx2Inch.value,
            }
          }

          pptxSlide.addImage(options)
        }

        else if (el.type === 'shape') {
          if (el.special) {
            const svgRef = document.querySelector(`.thumbnail-list .base-element-${el.id} svg`) as HTMLElement
            if (svgRef.clientWidth < 1 || svgRef.clientHeight < 1) continue // 临时处理（导入PPTX文件带来的异常数据）
            const base64SVG = svg2Base64(svgRef)

            const options: pptxgen.ImageProps = {
              data: base64SVG,
              x: el.left / ratioPx2Inch.value,
              y: el.top / ratioPx2Inch.value,
              w: el.width / ratioPx2Inch.value,
              h: el.height / ratioPx2Inch.value,
            }
            if (el.rotate) options.rotate = el.rotate
            if (el.flipH) options.flipH = el.flipH
            if (el.flipV) options.flipV = el.flipV
            if (el.link) {
              const linkOption = getLinkOption(el.link)
              if (linkOption) options.hyperlink = linkOption
            }

            pptxSlide.addImage(options)
          }
          else {
            const scale = {
              x: el.width / el.viewBox[0],
              y: el.height / el.viewBox[1],
            }
            const points = formatPoints(toPoints(el.path), scale)

            let fillColor = formatColor(el.fill)
            if (el.gradient) {
              const colors = el.gradient.colors
              const color1 = colors[0].color
              const color2 = colors[colors.length - 1].color
              const color = tinycolor.mix(color1, color2).toHexString()
              fillColor = formatColor(color)
            }
            if (el.pattern) fillColor = formatColor('#00000000')
            const opacity = el.opacity === undefined ? 1 : el.opacity

            const options: pptxgen.ShapeProps = {
              x: el.left / ratioPx2Inch.value,
              y: el.top / ratioPx2Inch.value,
              w: el.width / ratioPx2Inch.value,
              h: el.height / ratioPx2Inch.value,
              fill: { color: fillColor.color, transparency: (1 - fillColor.alpha * opacity) * 100 },
              points,
            }
            if (el.flipH) options.flipH = el.flipH
            if (el.flipV) options.flipV = el.flipV
            if (el.shadow) options.shadow = getShadowOption(el.shadow)
            if (el.outline?.width) options.line = getOutlineOption(el.outline)
            if (el.rotate) options.rotate = el.rotate
            if (el.link) {
              const linkOption = getLinkOption(el.link)
              if (linkOption) options.hyperlink = linkOption
            }

            pptxSlide.addShape('custGeom' as pptxgen.ShapeType, options)
          }
          if (el.text) {
            const textProps = formatHTML(el.text.content)

            const options: pptxgen.TextPropsOptions = {
              x: el.left / ratioPx2Inch.value,
              y: el.top / ratioPx2Inch.value,
              w: el.width / ratioPx2Inch.value,
              h: el.height / ratioPx2Inch.value,
              fontSize: defaultFontSize / ratioPx2Pt.value,
              fontFace: '微软雅黑',
              color: '#000000',
              paraSpaceBefore: 5 / ratioPx2Pt.value,
              valign: el.text.align,
            }
            if (el.rotate) options.rotate = el.rotate
            if (el.text.defaultColor) options.color = formatColor(el.text.defaultColor).color
            if (el.text.defaultFontName) options.fontFace = el.text.defaultFontName

            pptxSlide.addText(textProps, options)
          }
          if (el.pattern) {
            const options: pptxgen.ImageProps = {
              x: el.left / ratioPx2Inch.value,
              y: el.top / ratioPx2Inch.value,
              w: el.width / ratioPx2Inch.value,
              h: el.height / ratioPx2Inch.value,
            }
            if (isBase64Image(el.pattern)) options.data = el.pattern
            else options.path = el.pattern

            if (el.flipH) options.flipH = el.flipH
            if (el.flipV) options.flipV = el.flipV
            if (el.rotate) options.rotate = el.rotate
            if (el.link) {
              const linkOption = getLinkOption(el.link)
              if (linkOption) options.hyperlink = linkOption
            }

            pptxSlide.addImage(options)
          }
        }

        else if (el.type === 'line') {
          const path = getLineElementPath(el)
          const points = formatPoints(toPoints(path))
          const { minX, maxX, minY, maxY } = getElementRange(el)
          const c = formatColor(el.color)

          const options: pptxgen.ShapeProps = {
            x: el.left / ratioPx2Inch.value,
            y: el.top / ratioPx2Inch.value,
            w: (maxX - minX) / ratioPx2Inch.value,
            h: (maxY - minY) / ratioPx2Inch.value,
            line: {
              color: c.color,
              transparency: (1 - c.alpha) * 100,
              width: el.width / ratioPx2Pt.value,
              dashType: dashTypeMap[el.style] as 'solid' | 'dash' | 'sysDot',
              beginArrowType: el.points[0] ? 'arrow' : 'none',
              endArrowType: el.points[1] ? 'arrow' : 'none',
            },
            points,
          }
          if (el.shadow) options.shadow = getShadowOption(el.shadow)

          pptxSlide.addShape('custGeom' as pptxgen.ShapeType, options)
        }

        else if (el.type === 'chart') {
          const chartData = []
          for (let i = 0; i < el.data.series.length; i++) {
            const item = el.data.series[i]
            chartData.push({
              name: `系列${i + 1}`,
              labels: el.data.labels,
              values: item,
            })
          }

          let chartColors: string[] = []
          if (el.themeColors.length === 10) chartColors = el.themeColors.map(color => formatColor(color).color)
          else if (el.themeColors.length === 1) chartColors = tinycolor(el.themeColors[0]).analogous(10).map(color => formatColor(color.toHexString()).color)
          else {
            const len = el.themeColors.length
            const supplement = tinycolor(el.themeColors[len - 1]).analogous(10 + 1 - len).map(color => color.toHexString())
            chartColors = [...el.themeColors.slice(0, len - 1), ...supplement].map(color => formatColor(color).color)
          }

          const options: pptxgen.IChartOpts = {
            x: el.left / ratioPx2Inch.value,
            y: el.top / ratioPx2Inch.value,
            w: el.width / ratioPx2Inch.value,
            h: el.height / ratioPx2Inch.value,
            chartColors: (el.chartType === 'pie' || el.chartType === 'ring') ? chartColors : chartColors.slice(0, el.data.series.length),
          }

          const textColor = formatColor(el.textColor || '#000000').color
          options.catAxisLabelColor = textColor
          options.valAxisLabelColor = textColor

          const fontSize = 14 / ratioPx2Pt.value
          options.catAxisLabelFontSize = fontSize
          options.valAxisLabelFontSize = fontSize

          if (el.fill || el.outline) {
            const plotArea: pptxgen.IChartPropsFillLine = {}
            if (el.fill) {
              plotArea.fill = { color: formatColor(el.fill).color }
            }
            if (el.outline) {
              plotArea.border = {
                pt: el.outline.width! / ratioPx2Pt.value,
                color: formatColor(el.outline.color!).color,
              }
            }
            options.plotArea = plotArea
          }

          if ((el.data.series.length > 1 && el.chartType !== 'scatter') || el.chartType === 'pie' || el.chartType === 'ring') {
            options.showLegend = true
            options.legendPos = 'b'
            options.legendColor = textColor
            options.legendFontSize = fontSize
          }

          let type = pptx.ChartType.bar
          if (el.chartType === 'bar') {
            type = pptx.ChartType.bar
            options.barDir = 'col'
            if (el.options?.stack) options.barGrouping = 'stacked'
          }
          else if (el.chartType === 'column') {
            type = pptx.ChartType.bar
            options.barDir = 'bar'
            if (el.options?.stack) options.barGrouping = 'stacked'
          }
          else if (el.chartType === 'line') {
            type = pptx.ChartType.line
            if (el.options?.lineSmooth) options.lineSmooth = true
          }
          else if (el.chartType === 'area') {
            type = pptx.ChartType.area
          }
          else if (el.chartType === 'radar') {
            type = pptx.ChartType.radar
          }
          else if (el.chartType === 'scatter') {
            type = pptx.ChartType.scatter
            options.lineSize = 0
          }
          else if (el.chartType === 'pie') {
            type = pptx.ChartType.pie
          }
          else if (el.chartType === 'ring') {
            type = pptx.ChartType.doughnut
            options.holeSize = 60
          }

          pptxSlide.addChart(type, chartData, options)
        }

        else if (el.type === 'table') {
          const hiddenCells = []
          for (let i = 0; i < el.data.length; i++) {
            const rowData = el.data[i]

            for (let j = 0; j < rowData.length; j++) {
              const cell = rowData[j]
              if (cell.colspan > 1 || cell.rowspan > 1) {
                for (let row = i; row < i + cell.rowspan; row++) {
                  for (let col = row === i ? j + 1 : j; col < j + cell.colspan; col++) hiddenCells.push(`${row}_${col}`)
                }
              }
            }
          }

          const tableData = []

          const theme = el.theme
          let themeColor: FormatColor | null = null
          let subThemeColors: FormatColor[] = []
          if (theme) {
            themeColor = formatColor(theme.color)
            subThemeColors = getTableSubThemeColor(theme.color).map(item => formatColor(item))
          }

          for (let i = 0; i < el.data.length; i++) {
            const row = el.data[i]
            const _row = []

            for (let j = 0; j < row.length; j++) {
              const cell = row[j]
              const cellOptions: pptxgen.TableCellProps = {
                colspan: cell.colspan,
                rowspan: cell.rowspan,
                bold: cell.style?.bold || false,
                italic: cell.style?.em || false,
                underline: { style: cell.style?.underline ? 'sng' : 'none' },
                align: cell.style?.align || 'left',
                valign: 'middle',
                fontFace: cell.style?.fontname || '微软雅黑',
                fontSize: (cell.style?.fontsize ? parseInt(cell.style?.fontsize) : 14) / ratioPx2Pt.value,
              }
              if (theme && themeColor) {
                let c: FormatColor
                if (i % 2 === 0) c = subThemeColors[1]
                else c = subThemeColors[0]

                if (theme.rowHeader && i === 0) c = themeColor
                else if (theme.rowFooter && i === el.data.length - 1) c = themeColor
                else if (theme.colHeader && j === 0) c = themeColor
                else if (theme.colFooter && j === row.length - 1) c = themeColor

                cellOptions.fill = { color: c.color, transparency: (1 - c.alpha) * 100 }
              }
              if (cell.style?.backcolor) {
                const c = formatColor(cell.style.backcolor)
                cellOptions.fill = { color: c.color, transparency: (1 - c.alpha) * 100 }
              }
              if (cell.style?.color) cellOptions.color = formatColor(cell.style.color).color

              if (!hiddenCells.includes(`${i}_${j}`)) {
                _row.push({
                  text: cell.text,
                  options: cellOptions,
                })
              }
            }
            if (_row.length) tableData.push(_row)
          }

          const options: pptxgen.TableProps = {
            x: el.left / ratioPx2Inch.value,
            y: el.top / ratioPx2Inch.value,
            w: el.width / ratioPx2Inch.value,
            h: el.height / ratioPx2Inch.value,
            colW: el.colWidths.map(item => el.width * item / ratioPx2Inch.value),
          }
          if (el.theme) options.fill = { color: '#ffffff' }
          if (el.outline.width && el.outline.color) {
            options.border = {
              type: el.outline.style === 'solid' ? 'solid' : 'dash',
              pt: el.outline.width / ratioPx2Pt.value,
              color: formatColor(el.outline.color).color,
            }
          }

          pptxSlide.addTable(tableData, options)
        }

        else if (el.type === 'latex') {
          const svgRef = document.querySelector(`.thumbnail-list .base-element-${el.id} svg`) as HTMLElement
          const base64SVG = svg2Base64(svgRef)

          const options: pptxgen.ImageProps = {
            data: base64SVG,
            x: el.left / ratioPx2Inch.value,
            y: el.top / ratioPx2Inch.value,
            w: el.width / ratioPx2Inch.value,
            h: el.height / ratioPx2Inch.value,
          }
          if (el.link) {
            const linkOption = getLinkOption(el.link)
            if (linkOption) options.hyperlink = linkOption
          }

          pptxSlide.addImage(options)
        }

        else if (!ignoreMedia && (el.type === 'video' || el.type === 'audio')) {
          const options: pptxgen.MediaProps = {
            x: el.left / ratioPx2Inch.value,
            y: el.top / ratioPx2Inch.value,
            w: el.width / ratioPx2Inch.value,
            h: el.height / ratioPx2Inch.value,
            path: el.src,
            type: el.type,
          }
          if (el.type === 'video' && el.poster) options.cover = el.poster

          const extMatch = el.src.match(/\.([a-zA-Z0-9]+)(?:[\?#]|$)/)
          if (extMatch && extMatch[1]) options.extn = extMatch[1]
          else if (el.ext) options.extn = el.ext

          const videoExts = ['avi', 'mp4', 'm4v', 'mov', 'wmv']
          const audioExts = ['mp3', 'm4a', 'mp4', 'wav', 'wma']
          if (options.extn && [...videoExts, ...audioExts].includes(options.extn)) {
            pptxSlide.addMedia(options)
          }
        }
      }
    }

    setTimeout(() => {
      pptx.writeFile({ fileName: `${title.value}.pptx` }).then(() => exporting.value = false).catch(() => {
        exporting.value = false
        message.error('导出失败')
      })
    }, 200)
  }

  return {
    exporting,
    exportImage,
    exportJSON,
    exportSpecificFile,
    exportPPTX,
    exportMP4,
    exportZM,
    exportZMv2,
    convertAISlidesToText,
    convertSlidesToAISlides
  }
}
