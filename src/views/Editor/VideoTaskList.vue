<template>
  <div class="video-task-list">
    <div class="header">
      <div class="title">我的视频任务</div>
      <div class="hint">关闭浏览器后，数据都会丢失，请及时保存</div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">状态：</span>
        <Select
          style="width: 120px;"
          v-model:value="statusFilter"
          :options="statusOptions"
          @update:value="loadTasks"
        />
      </div>
      <Button class="refresh-btn" @click="loadTasks" :loading="loading">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="16px" width="16px">
          <path fill="none" d="M0 0h24v24H0z"></path>
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path>
        </svg>
      </Button>
    </div>

    <div class="task-list">
      <div v-if="loading" style="padding: 20px; text-align: center; color: #666;">
        加载中...
      </div>

      <div v-else-if="tasks.length === 0" class="empty-state">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="64px" width="64px">
          <path fill="none" d="M0 0h24v24H0z"></path>
          <path d="M18 4v5H6V4H4v16h2v-7h12v7h2V4h-2z"></path>
        </svg>
        <div class="empty-text">暂无视频任务</div>
        <div class="empty-hint">点击下方按钮开始创建你的第一个视频</div>
      </div>

      <div v-else class="task-items">
        <div
                    v-for="task in tasks"
                    :key="task.id"
                    class="task-item"
                    @click="viewTask(task)"
                  >
                    <div class="task-thumbnail">
                      <img v-if="task.coverImage" :src="task.coverImage" class="thumbnail-image" alt="封面" />
                      <div v-else class="thumbnail-placeholder">
                        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="40px" width="40px">
                          <path fill="none" d="M0 0h24v24H0z"></path>
                          <path d="M8 5v14l11-7z"></path>
                        </svg>
                      </div>
                      <div v-if="task.status === 'running' || task.status === 'pending'" class="task-progress">
                        <div class="progress-bar">
                          <div class="progress-fill" :style="{ width: parseFloat(task.progress) + '%' }"></div>
                        </div>
                        <span class="progress-text">{{ task.progress }}%</span>
                      </div>
                    </div>

                    <div class="task-info">
                      <div class="task-title">视频任务 {{ task.business_key }}</div>
                      <div class="task-meta">
                        <span class="task-time">{{ formatTime(task.created_at) }}</span>
                        <span class="task-status" :class="`status-${task.status}`">
                          {{ getStatusText(task.status) }}
                        </span>
                        <span 
                          v-if="task.status === 'failed' && task.message" 
                          class="error-icon"
                          @click.stop="showErrorDetail(task)"
                          title="查看错误详情"
                        >
                          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="14px" width="14px">
                            <path fill="none" d="M0 0h24v24H0z"></path>
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                          </svg>
                        </span>
                      </div>
                      <div class="task-detail">
                        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="12px" width="12px">
                          <path fill="none" d="M0 0h24v24H0z"></path>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
                        </svg>
                        <span>{{ task.message }}</span>
                      </div>
                    </div>

                    <div class="task-actions">
                      <Button
                        v-if="task.status === 'success'"
                        type="primary"
                        size="small"
                        @click="downloadVideo(task, $event)"
                      >
                        下载
                      </Button>
                      <Button
                        v-if="task.status === 'running' || task.status === 'pending'"
                        type="danger"
                        size="small"
                        @click="cancelTask(task.id, $event)"
                      >
                        取消
                      </Button>
                      <Button
                        v-if="task.status === 'failed'"
                        type="default"
                        size="small"
                        @click="retryTaskHandler(task, $event)"
                      >
                        重试
                      </Button>
                      <Button
                        size="small"
                        @click="deleteTaskHandler(task.id, $event)"
                      >
                        删除
                      </Button>
                    </div>
                  </div>      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <Button
        :disabled="page <= 1"
        @click="changePage(page - 1)"
      >
        上一页
      </Button>
      <span class="page-info">第 {{ page }} 页 / 共 {{ Math.ceil(total / pageSize) }} 页</span>
      <Button
        :disabled="page >= Math.ceil(total / pageSize)"
        @click="changePage(page + 1)"
      >
        下一页
      </Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getUserId } from '@/utils/user'
import useExport from '@/hooks/useExport'
import type { VideoTask, VideoTaskStatus } from '@/types/video'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import message from '@/utils/message'

const { getTasks, getTaskDetail, deleteTask, retryTask } = useExport()

const tasks = ref<VideoTask[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const statusFilter = ref<VideoTaskStatus | 'all'>('all')

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '等待中', value: 'pending' },
  { label: '运行中', value: 'running' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' }
]

const emit = defineEmits(['close', 'viewTask'])

const loadTasks = async () => {
  loading.value = true
  try {
    const userId = getUserId()
    const params: any = {
      userId,
      limit: pageSize.value,
      offset: (page.value - 1) * pageSize.value
    }

    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value
    }

    const response = await getTasks(params)

    if (response && response.data && response.data.items) {
      tasks.value = response.data.items
      total.value = response.data.items.length
    }
  } catch (error) {
    console.error('加载任务列表失败:', error)
    message.error('加载任务列表失败')
  } finally {
    loading.value = false
  }
}

const changePage = (newPage: number) => {
  page.value = newPage
  loadTasks()
}

const formatTime = (time: string) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const getStatusText = (status: VideoTaskStatus) => {
  const statusMap = {
    pending: '等待中',
    running: '运行中',
    success: '成功',
    failed: '失败'
  }
  return statusMap[status] || status
}

const showErrorDetail = (task: VideoTask) => {
  if (task.error_text) {
    alert(`错误原因：\n${task.error_text}`)
  }
}

const viewTask = (task: VideoTask) => {
  emit('viewTask', task)
}

const downloadVideo = (task: VideoTask, event?: Event) => {
  event?.stopPropagation()
  if (task.result_json && task.result_json.fileUrl) {
    // 在新标签页打开视频链接，用户可在新页面右键保存或直接下载
    window.open(task.result_json.fileUrl, '_blank')
  }
}

const cancelTask = async (taskId: string, event: Event) => {
  event.stopPropagation()
  try {
    // 注意：后端接口文档中没有提供取消任务的接口，这里先注释掉
    // await api.cancelVideoTask(taskId)
    message.info('取消功能暂未实现')
    // loadTasks()
  } catch (error) {
    message.error('取消任务失败')
  }
}

const retryTaskHandler = async (task: VideoTask, event?: Event) => {
  event?.stopPropagation()
  
  try {
    const response = await retryTask(task.id)
    
    if (response && response.status === 202) {
      message.success('重试任务已提交，正在后台处理中')
      // 刷新任务列表以更新状态
      loadTasks()
    }
  } catch (error: any) {
    console.error('重试任务失败:', error)
    
    // 根据不同的状态码给出不同的提示
    const status = error.response?.status
    const message_text = error.response?.data?.message || error.response?.data?.detail
    
    if (status === 404) {
      message.error('任务不存在')
    } else if (status === 400) {
      message.error(message_text || '无法重试该任务')
    } else if (status === 409) {
      message.error(message_text || '任务状态冲突，无法重试')
    } else {
      message.error('重试任务失败，请稍后重试')
    }
  }
}

const deleteTaskHandler = async (taskId: string, event?: Event) => {
  event?.stopPropagation()
  if (!confirm('确定要删除这个任务吗？')) return

  try {
    await deleteTask(taskId)
    message.success('删除成功')
    loadTasks()
  } catch (error) {
    console.error('删除任务失败:', error)
    message.error('删除任务失败')
  }
}

const close = () => {
  emit('close')
}

onMounted(() => {
  loadTasks()

  // 定时刷新运行中的任务（按照建议，2-3秒轮询一次）
  const interval = setInterval(() => {
    const hasRunningTask = tasks.value.some(t => t.status === 'running' || t.status === 'pending')
    if (hasRunningTask) {
      loadTasks()
    }
  }, 3000)

  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>

<style lang="scss" scoped>
.video-task-list {
  display: flex;
  flex-direction: column;
  height:500px;
  background: #fff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .hint {
    font-size: 12px;
    color: #999;
  }
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;

    .filter-label {
      font-size: 14px;
      color: #666;
    }
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  min-height: 300px;
  max-height: calc(70vh - 280px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;

  svg {
    margin-bottom: 16px;
    color: #ddd;
  }

  .empty-text {
    font-size: 16px;
    margin-bottom: 8px;
    color: #666;
  }

  .empty-hint {
    font-size: 14px;
    color: #999;
  }
}

.task-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 92px;
  box-sizing: border-box;

  &:hover {
    border-color: #d9d9d9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}

.task-thumbnail {
  width: 120px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  background: #f5f5f5;
  position: relative;
  flex-shrink: 0;

  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumbnail-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ccc;
  }

  .task-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    padding: 4px 6px;
    display: flex;
    align-items: center;
    gap: 6px;

    .progress-bar {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: #52c41a;
        transition: width 0.3s;
      }
    }

    .progress-text {
      font-size: 10px;
      color: #fff;
      white-space: nowrap;
    }
  }
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  .task-title {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #999;

    .task-status {
            padding: 2px 6px;
            border-radius: 4px;
            background: #f5f5f5;

            &.status-pending {
              background: #fff7e6;
              color: #fa8c16;
            }

            &.status-running {
              background: #e6f7ff;
              color: #1890ff;
            }

            &.status-success {
              background: #f6ffed;
              color: #52c41a;
            }

            &.status-failed {
              background: #fff1f0;
              color: #f5222d;
            }
          }

    .error-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #f5222d;
      transition: all 0.2s;
      padding: 2px;
      border-radius: 50%;

      &:hover {
        background: rgba(245, 34, 45, 0.1);
        transform: scale(1.1);
      }

      svg {
        display: block;
      }
    }
  }

  .task-detail {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #999;
  }
}

.task-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;

  .page-info {
    font-size: 14px;
    color: #666;
  }
}
</style>
