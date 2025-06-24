import axios from './config'

// export const SERVER_URL = 'http://localhost:5000'
export const SERVER_URL = (import.meta.env.MODE === 'development') ? '/api' : '/aippt_data'
// export const ASSET_URL = 'http://aacn-r194.centaline.com.cn:5173'
// export const ASSET_URL = 'http://dataplat.centaline.com.cn'
export default {
  getMockData(filename: string): Promise<any> {
    return axios.get(`./mocks/${filename}.json`)
  },

  getFileData(filename: string): Promise<any> {
    return axios.get(`./mocks/${filename}.json`)
    // return axios.get(`${ASSET_URL}/data/${filename}.json`)
  },

  AIPPT_Outline(
    content: string,
    language: string,
    model: string,
  ): Promise<any> {
    return fetch(`${SERVER_URL}/tools/aippt_outline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language,
        model,
        stream: true,
      }),
    })
  },

  AIPPT(
    content: string,
    language: string,
    model: string,
  ): Promise<any> {
    return fetch(`${SERVER_URL}/tools/aippt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language,
        model,
        stream: true,
      }),
    })
  },
}
