/**
 * 用户管理工具
 * 使用 localStorage 存储用户ID，实现简单的用户身份管理
 */

const USER_ID_KEY = 'pptist_user_id'

/**
 * 获取当前用户ID
 * 如果不存在则创建一个新的用户ID并保存到 localStorage
 */
export const getUserId = (): string => {
  let userId = localStorage.getItem(USER_ID_KEY)
  
  if (!userId) {
    // 生成唯一的用户ID：user_时间戳_随机字符串
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substr(2, 9)
    userId = `user_${timestamp}_${randomStr}`
    localStorage.setItem(USER_ID_KEY, userId)
  }
  
  return userId
}

/**
 * 重置用户ID（清除当前用户身份）
 * 警告：此操作会清除当前用户的任务历史
 */
export const resetUserId = (): void => {
  localStorage.removeItem(USER_ID_KEY)
}

/**
 * 获取用户信息对象
 */
export const getUserInfo = () => {
  return {
    userId: getUserId(),
    createdAt: localStorage.getItem(`${USER_ID_KEY}_created_at`) || new Date().toISOString()
  }
}

/**
 * 设置用户创建时间（首次使用时调用）
 */
export const setUserCreatedAt = (): void => {
  const userId = getUserId()
  const key = `${USER_ID_KEY}_created_at`
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, new Date().toISOString())
  }
}