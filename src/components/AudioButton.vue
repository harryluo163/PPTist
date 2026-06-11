<template>
    <div
            class="audio-button"
            :class="{ active: isPlaying }"
            @click="togglePlay"
    >
        <!-- 进度条容器 -->
        <div class="progress-container"></div>

        <!-- 进度条圆环 -->
        <div
                v-if="isPlaying"
                class="progress-circle"
                :style="{
        background: `conic-gradient(
          var(--color-primary) ${progress}deg,
          var(--color-back) ${progress}deg,
          transparent 360deg
        )`
      }"
        ></div>

        <!-- 播放状态显示 -->
        <div v-if="isPlaying" class="playing-status">
            <div class="sound-rhyme">
                <span v-for="i in 5" :key="i" :style="{ flexBasis: '1px' }"></span>
            </div>
        </div>

        <!-- 播放按钮 -->
        <div v-else class="play-btn">
            <img :src="playIcon" alt="播放">
        </div>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';

export default {
    name: 'AudioPlayerButton',
    props: {
        audioUrl: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const isPlaying = ref(false);
        const progress = ref(0);
        const audioElement = ref(null);
        const animationFrame = ref(null);
        const lastUpdateTime = ref(0);

        // 使用你提供的播放图标URL
        const playIcon = 'https://www.youyan3d.com/editor/static/svg/voice_play_new-52fd9d9c.svg';

        // 模拟进度更新（实际项目中应该从audio元素获取）
        const simulateProgress = (timestamp) => {
            if (!lastUpdateTime.value) {
                lastUpdateTime.value = timestamp;
            }

            const delta = timestamp - lastUpdateTime.value;
            lastUpdateTime.value = timestamp;

            if (isPlaying.value) {
                // 这里应该是从audio元素获取实际进度
                // 这里用模拟进度演示
                progress.value = (progress.value + delta * 0.05) % 360;
                animationFrame.value = requestAnimationFrame(simulateProgress);
            }
        };

        const togglePlay = () => {
            if (isPlaying.value) {
                pause();
            } else {
                play();
            }
        };

        const play = () => {
            isPlaying.value = true;
            lastUpdateTime.value = 0;

            // 实际项目中应该这样获取audio元素
            audioElement.value = new Audio(props.audioUrl);
            audioElement.value.play();

            // 开始模拟进度更新
            animationFrame.value = requestAnimationFrame(simulateProgress);
        };

        const pause = () => {
            isPlaying.value = false;
            progress.value = 0;

            // 实际项目中应该这样暂停
            // if (audioElement.value) {
            //   audioElement.value.pause();
            // }

            if (animationFrame.value) {
                cancelAnimationFrame(animationFrame.value);
            }
        };

        // 实际项目中应该监听audio元素的事件
        // onMounted(() => {
        //   if (audioElement.value) {
        //     audioElement.value.addEventListener('timeupdate', () => {
        //       progress.value = (audioElement.value.currentTime / audioElement.value.duration) * 360;
        //     });
        //     audioElement.value.addEventListener('ended', pause);
        //   }
        // });

        onBeforeUnmount(() => {
            pause();
        });

        return {
            isPlaying,
            progress,
            playIcon,
            togglePlay
        };
    }
};
</script>

<style scoped>
:root {
    --color-primary: #4CAF50;
    --color-primary-border: #E8F5E9;
    --color-back: #f0f0f0;
}

.audio-button {
    position: relative;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--color-primary-border);
    cursor: pointer;
}

.progress-container {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    z-index: 1;
}

.progress-circle {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    z-index: 2;
    transition: background 0.3s ease;
}

.playing-status {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.play-btn {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.play-btn img {
    width: 12px;
    height: 12px;
}

/* 音频波动动画 */
.sound-rhyme {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: 9px;
    height: 8px;
}

.sound-rhyme span {
    display: inline-block;
    background-color: var(--color-primary);
    flex-basis: 1px;
    transition: all 0.2s ease;
}

/* 激活状态 - 音频波动动画 */
.audio-button.active .sound-rhyme span:nth-child(1) {
    animation: wave 1.5s ease-in-out infinite;
    animation-delay: 0.1s;
}
.audio-button.active .sound-rhyme span:nth-child(2) {
    animation: wave 1.5s ease-in-out infinite;
    animation-delay: 0.3s;
}
.audio-button.active .sound-rhyme span:nth-child(3) {
    animation: wave 1.5s ease-in-out infinite;
    animation-delay: 0.5s;
}
.audio-button.active .sound-rhyme span:nth-child(4) {
    animation: wave 1.5s ease-in-out infinite;
    animation-delay: 0.7s;
}
.audio-button.active .sound-rhyme span:nth-child(5) {
    animation: wave 1.5s ease-in-out infinite;
    animation-delay: 0.9s;
}

@keyframes wave {
    0%, 100% {
        height: 2px;
    }
    50% {
        height: 8px;
    }
}
</style>
