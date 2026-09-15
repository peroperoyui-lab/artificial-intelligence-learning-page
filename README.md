# 可见 · AI 实验室

**让抽象的 AI，变成看得见的学习过程。**

一个中文、可交互、可离线使用的 AI / 机器学习 / 深度学习基础学习站。13 个递进章节、52 个中英概念、真实的小神经网络训练台，以及可保存的学习与实验记录。

页面采用原生 HTML / CSS / JavaScript。**生产运行零第三方依赖，不需要 API Key、账户、npm 安装或后端服务。** 所有图形与数值实验都在浏览器本地计算。

## 现在就用

下载本仓库的 ZIP 并解压，双击根目录的 `index.html`。保持 `src/` 与 `assets/` 的相对位置。推荐在现代桌面浏览器中学习，页面也适配手机宽度。

也可以使用本地静态服务器：

```bash
npm start
```

打开 `http://127.0.0.1:4173`。在启动它的终端按 **Ctrl+C** 完全停止服务器。训练本身不启动任何后台进程。

只有 Python 的环境可使用：

```bash
python -m http.server 4173 --bind 127.0.0.1
```

### 单文件离线版

```bash
npm run build
```

生成 `dist/visible-ai-offline.html`，可以单独复制给别人。它内嵌所有页面代码、样式和图标，无需携带其他文件。`dist/index.html` 则是标准多文件静态部署版本。

这里的离线使用指下载后本地打开；本站没有 Service Worker，也不保证在线页面关闭后可凭浏览器缓存再次离线访问。部分浏览器限制 `file://` 下的本地存储；计算不受影响，使用本地 HTTP 服务或导出记录即可。

## 你会学到什么

| 章节 | 可操作的实验 | 核心问题 |
|---|---|---|
| 01 AI 的知识地图 | 按任务切换领域、方法与学习信号 | AI、ML、DL 是什么关系？ |
| 02 向量与矩阵 | 调整 2×2 矩阵，旋转或压扁平面 | 神经网络怎样处理一组数字？ |
| 03 第一次预测 | 拖动权重和偏置，真实拟合线性回归 | 参数怎样改变预测？ |
| 04 神经元与激活 | 比较 Sigmoid、tanh、ReLU、线性函数及导数 | 非线性为什么重要？ |
| 05 如何衡量一次错误 | 概率、BCE、Softmax、多类交叉熵联动 | 自信地犯错为什么损失更大？ |
| 06 沿着损失往下走 | 单步/自动梯度下降，调整学习率与动量 | 步长太大时发生什么？ |
| 07 把错误传回每条连接 | 逐步计算图、解析梯度、中心差分核验 | 反向传播具体算了什么？ |
| 08 神经网络训练场 | 真实 MLP、5 种数据、决策概率场、模型导入导出 | 怎样让一个网络真正学起来？ |
| 09 学规律，还是记噪声 | 改多项式复杂度、样本量、噪声和 L2 | 训练变好为何验证可能变差？ |
| 10 一个准确率还不够 | 拖动阈值，联动混淆矩阵及评价指标 | 精确率与召回率如何变化？ |
| 11 让滤镜滑过一张图 | 点击像素、编辑卷积核、逐格乘加 | 卷积怎样提取局部模式？ |
| 12 谁该关注谁 | 修改 Query，查看 Q/K/V、权重矩阵与因果掩码 | 注意力最终加权了什么？ |
| 13 下一个 Token 怎么选 | 调温度、top-k、人工 logits 并真实采样 | 生成中的随机性来自哪里？ |

每章按 **动手实验 → 理解原理 → 展开推导 → 自测与笔记** 组织。前置知识相互链接；`/` 键打开全站概念搜索。可以开启专注模式与减少过渡动画，完成进度由学习者自己确认。

这是一条基础概念主线，不是覆盖所有 AI 分支的百科全书。强化学习、扩散模型等不提供完整训练实验；注意力和语言采样明确标为人工设定数值的机制演示，不伪装成预训练语言模型。

## 训练台确实在训练

- 5 种合成数据：XOR、同心圆、双月牙、双螺旋、线性可分。
- 2 个输入、1 个概率输出，0–3 个隐藏层，每层 2 / 4 / 8 / 12 个神经元。
- tanh、ReLU 或线性隐藏层；SGD 或 Adam；学习率、批量、L2、噪声和种子均可调。
- 240 个样本按类别分层划为 180 条训练、60 条验证；验证样本不参与梯度计算。
- 实时绘制实际预测概率、连接权重、训练/验证 BCE 与准确率。
- 直接键入二维坐标进行真实推断；可导出权重、Adam 状态、批次随机状态，重新导入后继续训练。

默认网络 `2 → 8 → 8 → 1` 有 **105 个可训练参数**。固定种子 42、默认配置和数据划分下，验证 BCE 从约 **0.677546** 降至 100 轮时的 **0.012088**。这是一个确定的合成任务回归测试，不代表所有种子、所有任务或真实世界数据的表现。

训练目标为平均 BCE 加权重 L2；显示的训练和验证损失不含 L2 惩罚。Adam 中的 L2 直接加入梯度，**不是 AdamW**。详见训练台内的实验口径与 `src/engine.js`。

修改训练配置会重置模型与曲线。离开章节或切到后台会停止训练，回到页面不会自行恢复。单次实验最多 5000 轮，避免页面持续占用计算资源。

## 学习记录与隐私

学习进度、答案、笔记和最多 30 条实验快照保存在当前浏览器的 `localStorage` 中。没有账户、遥测、广告、远程模型请求或云同步。点击外部参考链接时才会访问对应网站。

“记入实验本”保存指标快照；“导出模型”保存可继续训练的网络。学习记录可以导出为可阅读的 JSON 备份，当前不支持把学习记录 JSON 导回；模型 JSON 则可在训练台导入。删除或清理浏览器存储前请先导出。

## 开发与测试

运行页面不需要安装开发依赖。修改源码后刷新页面即可。

数值测试需要 Node.js 20+，默认开发基线为 Node.js 22：

```bash
npm test
```

浏览器测试另外需要 Python 3.10+ 和 Playwright：

```bash
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:e2e
```

Linux CI 使用 `python -m playwright install --with-deps chromium`。浏览器测试默认启动本地 HTTP 服务，验证真实页面加载和原生本地存储。受限渲染环境可显式设置 `AI_TEST_IN_MEMORY=1`，该模式用构建后的单文件页面和测试专用 Storage 替身运行交互，**不等价于 HTTP/file 导航与原生存储持久化测试**。

初始交付已通过 **32 项数值测试**与 **23 组浏览器交互验收（内存渲染模式）**。初始环境的 Chromium 管理策略禁止访问本地 URL，HTTP 与原生存储的完整验证交给仓库 CI 默认模式继续执行。准确的执行范围、数值结果和限制见 [校验记录](docs/VALIDATION.md)。

## GitHub Pages 发布

仓库包含 `.github/workflows/pages.yml`。它会构建静态站点，并在 Pages 已启用时发布；未启用时跳过部署，在运行摘要中给出提示，不把未发布标成已上线。

仓库所有者首次进入 **Settings → Pages → Build and deployment → Source → GitHub Actions**。保存后，在 **Actions → Publish learning lab → Run workflow** 运行一次；以后推送 `main` 会自动更新。

启用且部署成功后的地址应为：

`https://peroperoyui-lab.github.io/artificial-intelligence-learning-page/`

以 Actions 的部署结果和 Pages 设置显示的实际网址为准。哈希路由及相对资源路径适配 GitHub 项目子路径，不需要 SPA 重写规则。官方依据：[Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 目录

```text
index.html                  页面外壳，普通脚本即可本地打开
assets/styles.css           响应式视觉系统
assets/favicon.svg          原创 SVG 图标
src/engine.js               可独立测试的数值引擎
src/content.js              13 章内容、52 个概念、17 项来源
src/ui.js                   SVG/Canvas、表单、本地存储、播放循环
src/labs-core.js            地图、矩阵、回归、神经元、损失、梯度、反传
src/labs-advanced.js        泛化、指标、卷积、注意力、采样
src/playground.js           真正的神经网络训练台与模型格式验证
src/app.js                  路由、学习页、词典、实验本、搜索
scripts/                    本地服务和无依赖构建
tests/                      数值测试、浏览器验收
docs/                       设计、校验与扩展说明
.github/workflows/          数值/浏览器 CI 与 Pages 发布
```

## 来源与许可

知识依据包括《动手学深度学习》、Google Machine Learning Crash Course、PyTorch 与 scikit-learn 官方文档，以及 Transformer 原始论文。每章带有对应原始链接，站内“来源与开源”页集中说明用途。

交互教学思路参考 TensorFlow Playground；界面设计过程参考 Anthropic 公开的 frontend-design 指南。本站没有复制它们的代码、技能正文、图片或字体，所有教学图形都由代码生成。

本站原创代码、文字与图形按 [MIT License](LICENSE) 开源。外链资料的权利与许可仍归原作者；开发工具和设计参考详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

---

**Visible AI Lab** is an offline-capable Chinese interactive introduction to AI, machine learning and deep learning. It includes 13 visual chapters, a real deterministic MLP trainer, gradient checks, model roundtrips and a local learning journal. Zero production dependencies. Original implementation, MIT licensed.
