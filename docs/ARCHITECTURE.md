# 目录与架构指南

本文记录当前实现，帮助定位文件和接入新功能；不把初始章节数或目录划分当作不可修改的限制。贡献流程见 [CONTRIBUTING.md](../CONTRIBUTING.md)，教学与视觉取舍见 [DESIGN.md](DESIGN.md)。

## 1. 目录与职责

```text
artificial-intelligence-learning-page/
├── index.html                    静态外壳、公共导航容器、样式及脚本加载顺序
├── README.md                     面向使用者的入口、运行方式和功能说明
├── CONTRIBUTING.md               面向贡献者的修改、验证与 PR 规范
├── AGENTS.md                     AI 编码助手的简短工作入口
├── LICENSE                       原创内容与代码的 MIT 许可
├── THIRD_PARTY_NOTICES.md         第三方引用、设计参考与许可声明
├── package.json                  本地服务、构建和测试命令，无生产依赖
├── requirements-dev.txt          浏览器测试用的 Python 开发依赖
├── .gitignore                    忽略产物、依赖和测试临时文件
├── assets/
│   ├── styles.css                全站视觉变量、布局、组件和实验样式
│   ├── cases.css                 轻量专题、增强词典与术语链接样式
│   ├── accessibility.css         SVG、隐藏状态与窄屏的辅助修正
│   └── favicon.svg               原创站点图标
├── src/
│   ├── engine.js                 纯数值引擎、种子随机数与 MLP
│   ├── engine-extra.js           有界矩阵、Transformer 前向、视觉分类头和 K-means
│   ├── content-expansion.js      补充正文、新专题、带例子词典及检索辅助
│   ├── labs-extra.js             小图分类、Transformer、K-means 的交互与清理
│   ├── content.js                课程、分组、词典与来源的结构化内容
│   ├── ui.js                     DOM/表单、绘图、本地状态、下载和播放循环
│   ├── labs-core.js              地图、矩阵、回归、神经元、损失、梯度、反传实验
│   ├── labs-advanced.js          泛化、指标、卷积、注意力和词元采样实验
│   ├── playground.js             真实训练台、配置及模型导入导出协议
│   └── app.js                    路由、课程外壳、搜索、自测、笔记和实验本
├── scripts/
│   ├── serve.js                  仅绑定 127.0.0.1 的本地静态服务器
│   └── build.js                  复制静态站点，并构建可单独携带的离线 HTML
├── tests/
│   ├── engine.test.js            算法、梯度、模型协议及内容引用测试
│   ├── extra.test.js             轻量案例数值、梯度、不变量及词典关系验证
│   ├── ui.test.js                快照拷贝、文本转义与单文件构建回归
│   └── browser_test.py           Playwright 的章节、交互、布局与加载验收
├── docs/
│   ├── ARCHITECTURE.md           本文：目录、运行关系与扩展接点
│   ├── DESIGN.md                 教学结构、视觉、计算口径与工程取舍
│   ├── EXPANSION.md              1.1 轻量专题的口径、接口与验证范围
│   └── VALIDATION.md             有日期与执行范围的历史验收记录
└── .github/
    ├── pull_request_template.md  PR 说明与检查清单
    └── workflows/
        ├── ci.yml                PR 与指定分支的完整自动验收
        ├── pages.yml             主分支的静态构建和条件 Pages 部署
        └── source-check.yml      源码 ZIP 打包，不执行数值/浏览器验收
```

`dist/` 是构建产物，`.test-output/` 是浏览器测试生成的报告、截图和临时文件；二者均在 `.gitignore` 中，不是源码目录。根目录暂存的发布 ZIP 也不应提交，当前忽略规则并没有统一忽略 `*.zip`，提交前需人工检查。

## 2. 页面如何运行

`index.html` 按以下顺序加载普通 `defer` 脚本：

```text
engine → engine-extra → content → content-expansion → ui
→ labs-core → labs-advanced → playground → labs-extra → app
```

各文件通过 IIFE 封装，使用 `globalThis.AI` 共享少量命名空间：

| 命名空间 | 创建者 | 用途 |
|---|---|---|
| `AI.E` | `engine.js` | 纯数值函数、随机数、数据生成、MLP 等；不依赖 DOM |
| `AI.C` | `content.js` | `chapters`、`groups`、`glossary`、`sources` |
| `AI.U` | `ui.js` | 表单、SVG/Canvas 绘图、状态、记录、下载、`Loop` |
| `AI.labs` | `ui.js` 初始化，实验文件注册 | 章节 ID 到挂载函数的映射 |
| `AI.modelIO` | `playground.js` | 默认配置、结构、验证、序列化与反序列化 |

`engine.js` 和 `playground.js` 另提供 CommonJS 导出供现有 Node 测试使用；网页本身不使用 ES Module 加载。`ui.js` 初始化时会创建实验注册表，所以新增实验脚本应放在它之后、`app.js` 之前。

路由只使用 URL hash：`#/`、`#/learn/<id>`、`#/glossary`、`#/glossary/<编码后的术语>`、`#/journal`、`#/sources`。`app.js` 先清理旧页面，再挂载新页面；课程页统一生成说明、自测、笔记及记录按钮，实验函数只负责 `#lab-root` 内部的交互。

控件改变局部状态后，调用数值计算并重绘。数值与显示应共享同一份计算结果，避免曲线、文本指标和实际模型各用一套数据。小型教学步骤可保留在实验函数内，需要复用或独立验证的算法优先放入 `engine.js`。

## 3. 章节、词典和来源格式

章节在 `src/content.js` 的 `chapters` 数组内登记，数组顺序决定展示顺序，`no` 会自动生成。字段如下：

| 字段 | 当前约定 |
|---|---|
| `id` | 唯一、稳定的字符串；同时匹配 `AI.labs[id]`、路由和学习记录 |
| `short` / `title` | 导航短标题 / 正文主标题 |
| `group` | `groups` 数组的下标；新增分组需同步分组数据和布局检查 |
| `lead` / `summary` / `challenge` | 导语 / 目录摘要 / 可验证的操作任务 |
| `prereqs` | 前置章节 ID 数组，所有引用都应存在且不形成学习循环 |
| `body` | `{ h, p }` 段落数组；正文段数可变，浏览器按当前章节数据核对实际渲染段数 |
| `deep` | `{ title, html }`，可展开的推导；HTML 为仓库维护的静态内容 |
| `quiz` | `{ q, options, answer, why }`；`answer` 为从 0 开始的正确选项下标 |
| `refs` | `sources` 中的来源 ID 数组 |

当前自测使用 3 个选项，`U.load()` 只恢复 0–2 的答案下标；如需更多选项，应一起修改加载校验和测试。正文与浏览器验收已解除固定 3 段限制。

来源原始行格式为 `[id, title, url, use]`，映射为同名对象字段。基础词典的 `glossaryRows` 行格式为 `[term, en, definition, chapter]`。`content-expansion.js` 为所有词条补充 `example`、`refs`、`related`；其新增行采用五列文本，分隔符是 `|`，正文不要包含该分隔符。`C.findTerms(query, chapter)` 统一筛选，`C.termLink(term)` 生成可编码的深链接；`related` 存准确术语名并由测试验证引用。来源使用 `C.sources` 中已有 ID。

## 4. 实验挂载与清理

统一入口是 `AI.labs[id](element)`。每章提供 `element.getSnapshot()`，供“记入实验本”及浏览器测试读取；快照使用可 JSON 序列化的普通数据，不放 DOM、函数、模型实例或循环引用。未知/未定义指标显式使用 `null` 并配说明，不依靠 JSON 把非有限数值悄悄变成 `null`。

有播放或全局资源时返回清理函数。以下是最小生命周期示例，并非新课程实现；接入时需补充实际算法与解释：

```js
(function (root) {
  'use strict';
  const { U, labs } = root.AI;

  labs.example = function (el) {
    let steps = 0;
    el.innerHTML = '<button type="button">播放 / 暂停</button><output>0</output>';
    const button = el.querySelector('button');
    const output = el.querySelector('output');
    const loop = new U.Loop(() => {
      steps += 1; // 实际实验在这里计算一小步，并更新对应视图。
      output.textContent = String(steps);
      return steps < 20; // 返回 false 自动停止。
    }, 150);
    const toggle = () => loop.toggle();
    button.addEventListener('click', toggle);
    el.getSnapshot = () => ({ steps });

    return () => {
      loop.dispose();
      button.removeEventListener('click', toggle);
    };
  };
})(globalThis);
```

`U.Loop` 封装 `start / stop / toggle / dispose`，隐藏页面时停止；路由卸载需要调用 `dispose()` 以移除全局可见性监听。单次异步读取还需“已卸载”或版本标记，训练台的 `disposed` / `importVersion` 是现成例子。当前实现没有跨路由保留模型实例，离开训练场前需导出模型以便之后恢复。

## 5. 新增章节时要联动哪些文件

1. 在 `content.js` 登记章节、分组位置、前置关系、来源与词典；优先保留已有章节 ID。
2. 在合适的 `labs-*.js` 注册同名挂载函数，提供快照与清理；复杂独立实验可新增文件。新增脚本需要在 `index.html` 明确加载，维护依赖顺序。
3. 在 `engine.test.js` 或相应测试里验证算法和内容关系，在 `browser_test.py` 中验证新控件、计算结果、快照及生命周期。
4. 首页、词典和实验本数量已经从 `C` 自动生成；新增时仍需同步 `C.groups[].range`、README 和测试对本版课程规模的断言。1.1 基线为 16 章 / 173 词条。
5. 检查学习页、目录、搜索、来源、窄屏、普通静态页面与单文件构建。

新增自动化测试文件也要接入命令：`package.json` 的 `npm test` 当前显式列出三个 `.test.js` 文件，并不自动运行其他新文件。`ui.test.js` 的构建断言会检查 `src/` 下全部顶层 JS 均被内嵌；增加独立 Worker、非入口脚本或子目录时，要明确新的打包策略并同步测试。

## 6. 两种保存机制

**学习记录**在 `ui.js` 中管理，localStorage 键为 `visible-ai-v1`，主要字段为 `completed`、`notes`、`answers`、`journal`、`focus`、`motion`。笔记加载上限为每章 4000 字符，实验本保留最近 30 条快照；`U.record()` 深拷贝记录，避免随后修改参数污染历史。保存失败时保留内存状态并提示导出。学习记录 JSON 当前只有导出，没有导回接口。

**模型文件**由 `AI.modelIO` 管理：`format: 'visible-ai-model-v1'`、`engineVersion: 1`，包含 `config`、`epoch`、`shuffleState`、`network`。网络保存权重、偏置、Adam 矩和优化器步数。导入不仅检查类型与数值，还核对结构、激活函数和完整轮次对应的更新次数；训练/验证数据由配置重新生成，不直接存进模型文件。

当前导入器绑定 240 个样本、180 条训练和最多 5000 轮，并按 `epoch * ceil(180 / batch)` 校验优化器步数。改变样本量、分割方式、随机序列或轮次语义时，必须同时考虑旧模型文件如何解释，不能只改页面上的数字。模型导入后损失曲线从导入轮次重新记录，不恢复导出前的整条曲线。

## 7. 构建与发布边界

`build.js` 将 `src/`、`assets/` 复制到 `dist/`，输出普通 `index.html`、`.nojekyll`、许可说明和单文件页面。单文件通过匹配 `index.html` 中的样式与脚本标签内嵌内容，并保持原脚本顺序移到正文末尾；favicon 单独转为 data URL。

构建器不是通用依赖打包器：标签格式、`defer`、引号或属性顺序的改动可能影响现有匹配；新增 CSS 图片、字体、JS 动态加载、Worker 或其他资源不会自动递归内嵌。涉及这些修改时，需要更新构建逻辑并实际独立打开产物验证。构建复制前不会自动清空旧 `dist/`，删除/改名源资源时应清理旧产物后复核，防止残留文件掩盖问题。

`ci.yml` 验证交互与数值，`source-check.yml` 仅打包源码，`pages.yml` 独立运行基本测试、构建并在检测到可用 Pages 后部署。成功打包、成功验收和成功在线发布是三个不同状态。工作流触发范围、工具版本和 artifacts 保留时间以对应 YAML 为准。

## 8. 1.1 新增模块

扩展文件在基础文件之后注册，不复制原有 MLP。`engine-extra.js` 扩充 `AI.E`，`content-expansion.js` 扩充 `AI.C`；`labs-extra.js` 遵循同一 `AI.labs[id](el)`、快照与清理协议。所有旧章节 ID、`visible-ai-v1` 学习记录键和 `visible-ai-model-v1` 模型格式保持不变。

新案例快照是观察记录，不是新的通用模型导入格式。分类头与 Transformer 不接入原 MLP 导入器。详见 [EXPANSION.md](EXPANSION.md)。
