/**
 * 视频任务相关类型定义
 */

/**
 * 视频任务状态（匹配后端接口）
 */
export enum VideoTaskStatus {
  PENDING = 'pending',   // 等待中
  RUNNING = 'running',   // 运行中
  SUCCESS = 'success',   // 成功
  FAILED = 'failed'      // 失败
}

/**
 * 视频任务参数
 */
export interface VideoTaskParams {
  timestamp: string           // 业务标识
  videoFormat?: string        // 视频格式，默认 mp4
  videoSy?: string            // 是否加水印，默认 "1"
  videoZM?: string            // 是否加字幕，默认 "true"
  bkmusic?: string            // 背景音乐名，默认 "bgm"
  async?: boolean             // 是否异步，默认 false
}

/**
 * 创建视频任务响应
 */
export interface CreateVideoTaskResponse {
  task_id: string
  status: VideoTaskStatus
  timestamp: string
}

/**
 * 视频任务结果
 */
export interface VideoTaskResult {
  timestamp: string
  fileUrl: string
}

/**
 * 视频任务信息（匹配后端接口）
 */
export interface VideoTask {
  id: string                  // 任务ID
  task_type: string           // 任务类型
  business_key: string        // 业务标识
  user_id: string             // 用户ID
  status: VideoTaskStatus     // 任务状态
  progress: string            // 进度（字符串格式，如 "100.00"）
  message: string             // 状态消息
  params_json: VideoTaskParams // 任务参数
  result_json: VideoTaskResult | null // 任务结果
  error_text: string | null   // 错误信息
  coverImage: string | null   // 封面图片
  created_at: string          // 创建时间
  updated_at: string          // 更新时间
  started_at: string | null   // 开始时间
  finished_at: string | null  // 完成时间
}

/**
 * 视频任务列表响应（匹配后端接口）
 */
export interface VideoTaskListResponse {
  items: VideoTask[]
  limit: number
  offset: number
}

/**
 * 视频任务筛选条件（匹配后端接口）
 */
export interface VideoTaskFilter {
  status?: VideoTaskStatus
  limit?: number
  offset?: number
}

/**
 * 创建视频任务请求（匹配后端接口）
 */
export interface CreateVideoTaskRequest {
  timestamp: string
  videoFormat?: string
  videoSy?: string
  videoZM?: string
  bkmusic?: string
  async?: boolean
}