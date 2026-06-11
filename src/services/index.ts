import axios from './axios'
import fetchRequest from './fetch'

// export const SERVER_URL = 'http://localhost:5000'
export const SERVER_URL = (import.meta.env.MODE === 'development') ? '/api' : '/aippt_data'
export const ASSET_URL = 'https://asset.pptist.cn'

interface ImageSearchPayload {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square' | 'all';
  locale?: 'zh' | 'en';
  order?: 'popular' | 'latest';
  size?: 'large' | 'medium' | 'small';
  image_type?: 'all' | 'photo' | 'illustration' | 'vector';
  page?: number;
  per_page?: number;
}

interface AIPPTOutlinePayload {
  content: string
  language: string
  model: string
  pageRange?: string
}

interface AIPPTPayload {
  content: string
  language: string
  style: string
  model: string
  originalInput?: string
  pageRange?: string
}

interface AIWritingPayload {
  content: string
  command: string
}

export default {
  getMockData(filename: string): Promise<any> {
    return axios.get(`./mocks/${filename}.json`)
  },

  searchImage(body: ImageSearchPayload): Promise<any> {
    return axios.post(`${SERVER_URL}/tools/img_search`, body)
  },

  getFileData(filename: string): Promise<any> {
    return axios.get(`./mocks/${filename}.json`)
  },

  AIPPT_Outline({
    content,
    language,
    model,
    pageRange,
  }: AIPPTOutlinePayload): Promise<any> {
    return fetchRequest(`${SERVER_URL}/tools/aippt_outline`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        language,
        model,
        stream: true,
        ...(pageRange ? { pageRange } : {}),
      }),
    })
  },

  AIPPT({
    content,
    language,
    style,
    model,
    originalInput,
    pageRange,
  }: AIPPTPayload): Promise<any> {
    return fetchRequest(`${SERVER_URL}/tools/aippt`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        language,
        model,
        style,
        stream: true,
        ...(originalInput ? { originalInput } : {}),
        ...(pageRange ? { pageRange } : {}),
      }),
    })
  },

  AI_Writing({
    content,
    command,
  }: AIWritingPayload): Promise<any> {
    return fetchRequest(`${SERVER_URL}/tools/ai_writing`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        command,
        model: 'glm-4.7-flash',
        stream: true,
      }),
    })
  },
}
