# PPTist 项目文档

## 项目概述

PPTist 是一个基于 Web 的在线演示文稿（幻灯片）编辑应用，旨在还原大部分 Office PowerPoint 常用功能。该项目使用 Vue 3.x + TypeScript + Vite 技术栈构建，不依赖第三方 UI 组件库，实现了完整的幻灯片编辑、演示和导出功能。

### 主要特性

- **丰富的元素支持**：支持文字、图片、形状、线条、图表、表格、视频、音频、公式等多种元素类型
- **完善的编辑功能**：支持历史记录（撤销/重做）、快捷键、右键菜单、元素拖拽、缩放、旋转等
- **多种导出格式**：支持 PPTX、JSON、图片、PDF 等格式导出
- **AI 生成 PPT**：集成 AI 功能，支持智能生成幻灯片
- **移动端支持**：提供基础编辑和预览功能
- **主题系统**：支持幻灯片主题设置和模板应用

### 技术栈

- **框架**：Vue 3.5.17
- **语言**：TypeScript 5.3.0
- **构建工具**：Vite 5.3.5
- **状态管理**：Pinia 3.0.2
- **富文本编辑**：ProseMirror
- **图表库**：ECharts 5.5.1
- **样式预处理**：SCSS

## 构建和运行

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发服务器将在 `http://127.0.0.1:5173/` 启动。

### 生产构建

```bash
npm run build
```

生产构建会自动执行 TypeScript 类型检查（`vue-tsc --build --force`），然后执行 Vite 构建。

### 预览生产构建

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

### 类型检查

```bash
npm run type-check
```

## 项目结构

```
src/
├── assets/              # 静态资源
│   ├── fonts/          # 在线字体文件
│   └── styles/         # 样式文件
│       ├── global.scss     # 通用全局样式
│       ├── variable.scss   # SCSS 全局变量
│       ├── mixin.scss      # SCSS 全局混入
│       └── prosemirror.scss # ProseMirror 富文本样式
├── components/          # 通用组件（与业务逻辑无关）
├── configs/            # 配置文件（画布尺寸、字体、动画、快捷键等）
├── hooks/              # 供多个组件使用的 hooks 方法
├── plugins/            # 自定义 Vue 插件
├── services/           # API 方法
├── store/              # Pinia store（状态管理）
│   ├── main.ts         # 主状态管理
│   ├── slides.ts       # 幻灯片数据管理
│   ├── snapshot.ts     # 历史记录管理
│   ├── screen.ts       # 放映状态管理
│   └── keyboard.ts     # 键盘事件管理
├── types/              # TypeScript 类型定义
├── utils/              # 通用工具方法
└── views/              # 业务组件
    ├── Editor/         # 编辑器模块
    ├── Screen/         # 放映器模块
    ├── Mobile/         # 移动端模块
    └── components/     # 公用业务组件
```

## 数据结构

幻灯片数据存储在 `src/store/slides.ts` 中，主要包含：

- `title`：幻灯片标题/文件名
- `slides`：幻灯片页面数据数组
  - 每页包含 ID、元素内容、备注、背景、动画、切页方式等信息
- `theme`：幻灯片主题数据（背景色、主题色、字体等）
- `viewportSize`：幻灯片可视区域宽度基数（默认 1000）
- `viewportRatio`：幻灯片可视区域比例（默认 16:9）
- `templates`：幻灯片模板

### 元素类型

支持的元素类型定义在 `src/types/slides.ts`：

- `text`：文本元素（富文本编辑）
- `image`：图片元素（支持裁剪、滤镜等）
- `shape`：形状元素（支持绘制任意多边形）
- `line`：线条元素
- `chart`：图表元素（柱状图、折线图、饼图等）
- `table`：表格元素
- `latex`：公式元素（LaTeX 编辑）
- `video`：视频元素
- `audio`：音频元素

所有元素都继承自 `PPTBaseElement`，包含基本属性：

```typescript
interface PPTBaseElement {
  id: string;
  left: number;      // 左侧位置
  top: number;       // 顶部位置
  width: number;     // 宽度
  height: number;    // 高度
  rotate?: number;   // 旋转角度
  lock?: boolean;    // 是否锁定
  groupId?: string;  // 所属组合 ID
  link?: string;     // 超链接
}
```

## 画布原理

画布可视区域以宽 1000 像素、高 562.5 像素（16:9 比例）为基础比例。无论实际画布大小如何，元素都会根据缩放比例进行渲染。

### 元素渲染流程

1. 编辑器根据可视区域实际尺寸计算缩放比例
2. 元素位置和尺寸基于 1000×562.5 的基准坐标系定义
3. 渲染时将元素按缩放比例进行缩放

### 三种视图

- **编辑器画布**：标准可视区域
- **缩略图**：缩小版可视区域
- **放映页面**：放大版可视区域

## 开发规范

### 代码风格

- 使用 TypeScript 进行严格类型检查
- 使用 ESLint 进行代码规范检查
- 使用 Husky 和 Commitlint 进行提交规范管理
- 提交消息遵循 Conventional Commits 规范

### 样式规范

- 使用 SCSS 作为样式预处理器
- 全局样式变量定义在 `src/assets/styles/variable.scss`
- 全局混入定义在 `src/assets/styles/mixin.scss`
- 组件样式使用 `scoped` 属性
- SCSS 全局变量和混入在 `vite.config.ts` 中自动导入，无需在每个组件中手动导入

### 组件开发

- 通用组件放在 `src/components/` 目录
- 业务组件放在 `src/views/` 目录
- 元素组件分为可编辑版和基础版（用于缩略图/放映）
- 元素操作节点（缩放点、旋转点等）使用通用组件或自定义组件

### 状态管理

- 使用 Pinia 进行状态管理
- Store 文件按功能模块划分
- 使用 `storeToRefs` 解构状态以保持响应性

## API 配置

开发环境配置了 API 代理，将 `/api` 请求代理到 `http://127.0.0.1:3000/aippt_data`。配置文件：`vite.config.ts`

## 扩展开发

### 添加新元素类型

如需添加新的元素类型，请参考 `doc/CustomElement.md` 文档，主要步骤：

1. 在 `types/slides.ts` 中定义元素类型和接口
2. 在 `configs/element` 中添加中文名和最小尺寸配置
3. 编写可编辑版和基础版元素组件
4. 在相关组件中注册新元素类型
5. 创建右侧样式编辑面板
6. 编写元素创建方法并添加到工具栏

## 文档资源

项目提供以下开发文档：

- `doc/DirectoryAndData.md`：项目目录与数据结构
- `doc/Canvas.md`：画布与元素的基本原理
- `doc/CustomElement.md`：如何自定义一个元素
- `doc/AIPPT.md`：关于 AI PPT 功能
- `doc/Q&A.md`：常见问题解答
- `doc/Blacklist.md`：黑名单/耻辱柱

## 开源协议

本项目遵循 AGPL-3.0 开源协议。如需商业用途，请遵守协议要求或联系作者获取商业授权。

### 协议要点

- 所有使用本项目的代码必须开源
- 网络服务也需遵守开源义务
- 保留原作者信息和许可证声明
- 不能添加额外限制

## 常见命令速查

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本（包含类型检查）
npm run build

# 预览生产构建
npm run preview

# 代码检查和修复
npm run lint

# TypeScript 类型检查
npm run type-check
```

## 注意事项

- 本项目是开发工具，需要开发者具备 Web 开发经验
- 不提供开箱即用的在线服务
- 移动端功能相对简化
- 部分功能（如 AI PPT）需要后端支持
- 使用 `@/` 路径别名访问 `src/` 目录下的文件
- ESLint 配置文件 `.eslintrc.cjs` 当前为空，lint 命令可能无法正常工作
- TypeScript 类型检查存在一些错误，主要与未完成的 MP4 导出和 AI PPT 功能相关
- 项目使用 `npm-run-all2` 的 `run-p` 命令并行执行构建任务
- 开发服务器配置了 API 代理，需要后端服务运行在 `http://127.0.0.1:3000/aippt_data`