import {defineStore, storeToRefs} from 'pinia'
import {useSlidesStore} from "@/store/slides";
import { ACOUSTICS } from "@/configs/Acoustic";
export const useMP4Store = defineStore('MP4', {
  state: () => ({
    resultArray: [],
    zm: "", // 字幕内容,
    isGenerating: false, // 新增：加载状态
    audio:"",
    video:"",
    progress:0,
    isGenerating_video:false,
    logs:'',
    error: false,
    model:'sambert-zhimiao-emo-v1',
    ttId:'',
    fbl:1080,
    videoFormat:"mp4",
    videoFPS:"1",
    videoSy:true,
    videoZM:true,
    bkmusic:'bgm3',
    aiLoading: false,

  }),
  actions: {
    setGenerating(state) {
      this.isGenerating = state
    },
    setExporting(state) {
      this.aiLoading = state
    },
    updateResultArray(newArray) {
      this.resultArray = newArray
    },
    clearResultArray() {
      this.resultArray = []
    },
    addItemToArray(item) {
      this.resultArray.push(item)
    },
    // 新增：实时更新字幕
    updateSubtitle(newText) {
      this.zm += newText // 累加字幕内容
    },
    // 新增：清空字幕
    clearSubtitle() {
      this.zm = ""
    },

    updateAudio(newText) {
      this.audio += newText
    },
    clearAudio() {
      this.audio = ""
    },

    updateVideo(fileUrl) {
      this.video = fileUrl
    },
    clearVideo() {
      this.video = "";
      this.progress = 0;
      this.logs = "";
    },
    updateProgress(value) {
      this.progress = value
      this.error = value < 0
    },
    updateLogs(newLog) {
      this.logs = newLog
    },
    updatemodel(model) {
      this.model = model
    },
    init() {
      this.randomizeModel(); // 初始化时随机设置
    },
    randomizeModel() {
      const randomIndex = Math.floor(Math.random() * ACOUSTICS.length);
      this.model = ACOUSTICS[randomIndex].value;
    },
  }
})
