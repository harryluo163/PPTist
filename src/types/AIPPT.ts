export interface AIPPTCover {
  type: 'cover'
  data: {
    title: string
    text: string
  }
}

export interface AIPPTContents {
  type: 'contents'
  data: {
    items: string[]
  }
  offset?: number
}

export interface AIPPTTransition {
  type: 'transition'
  data: {
    title: string
    text: string
  }
}

export interface AIPPTContent {
  type: 'content'
  data: {
    title: string
    items: {
      title?: string
      text?: string
      type?: 'title' | 'itemFigure'
      src?: string  // 图片URL
    }[]
  },
  offset?: number
}

export interface AIPPTEnd {
  type: 'end'
}

export type AIPPTSlide = AIPPTCover | AIPPTContents | AIPPTTransition | AIPPTContent | AIPPTEnd
