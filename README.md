# 可见 · AI 实验室

**让抽象的 AI，变成看得见的学习过程。**

一个中文交互式 AI / 机器学习 / 深度学习基础学习站：34 个章节（18 个大语言模型进阶专题）、236 个中英概念、真实神经网络训练台，以及可以保存的笔记和实验快照。

原生 HTML / CSS / JavaScript，**零生产依赖，无需账号、API Key、npm 安装或后端**。所有实验在浏览器本地计算。

## 立即使用

下载仓库 ZIP 并解压，双击根目录的 `index.html`，保持 `src/` 和 `assets/` 的相对位置。适配现代桌面和移动浏览器。

也可启动本地静态服务：

```sh
npm start
```

打开 `http://127.0.0.1:4173`。在同一个终端按 **Ctrl+C** 即完全停止服务，不安装后台程序。

### 单文件离线版

```sh
npm run build
```

生成 `dist/visible-ai-offline.html`，内嵌全部代码、样式与图标，可单独复制、移动和离线打开。`dist/index.html` 是普通静态网站入口。Actions 的成功验收运行也提供 `visible-ai-offline` 下载附件。

这里的离线是“下载后本地打开”，不是 Service Worker 缓存。部分浏览器限制 `file://` 下的本地存储，计算不受影响；保存失败时会提示，可改用本地 HTTP 或导出记录。

## 1.2：大语言模型进阶研习室

打开页面后，点击侧栏 **“大语言模型进阶”**（`#/llm`），进入独立路线。原有16章完整保留，全站现有 **34章、236词条、50项来源**。

| 路线 | 进阶专题 |
|---|---|
| 语言与表示 17–22 | 语言建模、BPE、语料与Packing、RoPE、RMSNorm/SwiGLU、KV/GQA/FlashAttention |
| 训练与适配 23–27 | 真正训练微型解码器、计算/内存预算、SFT模板与损失掩码、LoRA/QLoRA、RLHF/DPO/推理训练 |
| 推理与应用 28–34 | 温度/top-k/top-p、量化、MoE路由、RAG检索、评估与污染、多模态patch、服务调度 |

每个专题有可操作实验、机制解释、公式与迁移练习，词典继续提供定义、例子、关联概念和来源。进阶主页提供与《动手学深度学习》的阅读对照，完整教材和PyTorch实现从原站继续学习。没有复制教材文字、代码或图片。

### 真正训练一个260参数的因果解码器

第23章使用原创标量自动微分，**嵌入、位置、注意力、前馈和词表头全部参与训练**。宽度4、单头、单块、11项词表；六句训练、两句留出验证。先生成一次，再点击“训练120步”并重新生成，观察损失、权重和输出如何变化。

生成采用真实自回归：根据当前前缀前向计算，采样新词，接回上下文再算，遇到EOS或预算停止。支持单步、暂停、种子重置、温度/top-p，以及独立的 `visible-microgpt-v1` 模型导入导出。原MLP格式仍然兼容，两个模型文件不能混用。

这个模型没有通用语言能力；小词表和原创短句让整个计算过程可检查。它采用Pre-RMSNorm与ReLU，RoPE、SwiGLU等另设实验。全部260个参数有独立中心差分验证。

### 算法、训练与预算各自标清

BPE、RoPE、KV缓存等价性、量化、检索与patch投影实际计算；LoRA案例真实训练低秩矩阵，但不是语言模型微调。DPO只展示单对标量目标，MoE只执行路由；资源与服务调度有明确假设，不是硬件跑分。RAG返回六段原创资料中的证据，不伪造生成回答。

保持CPU、零生产依赖、无模型下载。微型解码器最多8个输入位置/600步，LoRA最多300步；数十亿参数的预算只是算术，不创建相应张量。所有播放离页释放，切后台暂停。完整实现范围、数据、公式与限制见 [LLM_TRACK.md](docs/LLM_TRACK.md)。

## 基础与轻量专题：原有16章

| 章节 | 实验 |
|---|---|
| AI 的知识地图 | 切换任务实现，区分 AI、ML、DL 和学习信号 |
| 向量与矩阵 | 改变矩阵，观察旋转、剪切、降维及行列式 |
| 第一次预测 | 拖动权重与偏置，查看残差，真实拟合线性回归 |
| 神经元与激活 | 比较 Sigmoid、tanh、ReLU、线性函数及局部导数 |
| 损失与交叉熵 | 调整概率与 logits，联动 BCE、Softmax、多类交叉熵 |
| 梯度下降 | 单步或播放真实轨迹，比较学习率、普通梯度与动量 |
| 反向传播 | 逐步展开计算图，检查解析梯度与中心差分 |
| 神经网络训练场 | 真实 MLP、5 种数据、决策概率场和可恢复模型 |
| 泛化与过拟合 | 实际拟合多项式，调整阶数、样本量、噪声、L2 |
| 评价与阈值 | 联动混淆矩阵、准确率、精确率、召回率、F1 |
| 卷积与局部特征 | 编辑像素与核，逐格检查乘加、步幅和填充 |
| 注意力与 Transformer | 修改 Query，查看 Q/K/V、权重矩阵和因果掩码 |
| 词元与生成 | 调整温度、top-k、人工 logits，并进行真实抽样 |
| 小图像分类流水线 | 8×8 图案、三片固定卷积核、ReLU、最大/平均池化与真实分类头训练 |
| 拆开 Transformer 块 | 1–8 词元、1/2 头、九阶段前向追踪与位置/掩码/残差/归一化开关 |
| K-means 聚类 | 逐步分配与更新，比较随机/K-means++ 初始化、簇数、尺度和数据形状 |

每章按照 **动手实验 → 理解原理 → 展开推导 → 自测与笔记** 组织。前置概念相互链接，按 `/` 可搜索章节和术语。支持专注模式、减少动画、本地进度及最多 30 条实验快照。

## 1.1：更多解释，更多可检验的小实验

原有 13 章新增 42 段机制说明；连同三个新专题，正文共 99 个说明段落，另有可展开推导。词典由 52 项增至 **173 项**，每项含中英名称、定义、例子、对应章节与来源；关联概念可以继续点开。支持按章节筛选，`#/glossary/<术语>` 深链接和 `/` 全站搜索。学习页保留可展开的本章术语入口，首页及实验本数量随课程数据更新。

**小图分类**：1×8×8 输入 → 3×8×8 固定卷积 → ReLU → 3×4×4 池化 → 48 维特征 → 3 类 Softmax。输入可点击或用行/列/亮度编辑；可以移动线条、加噪声并切换最大/平均池化。仅训练最后 **147 个参数**，三片核不更新；120 个合成样本分层划为 90/30，验证集不参与梯度。它是固定特征提取加分类器，不冒充端到端 CNN 训练。分类头尚不支持独立文件导入/导出，可记录实验快照。

**Transformer 单块**：最多 8 个词元、宽度 4、前馈宽度 8、1 或 2 个注意力头。逐层查看嵌入、位置编码、Q/K/V、掩码与 Softmax、拼接与输出投影、两次残差/LayerNorm、前馈和词表概率。采用 Post-LN，全部是固定种子权重；不下载大模型、不做训练、不自动接词生成。可以通过交换词元及消融开关检查位置和因果结构的作用。

**K-means**：120 个二维点，2–5 个簇，分配与均值更新分开观察。支持 K-means++ / 随机样本初始化、三团点/同心圆、坐标尺度变化；每半步绘制真实簇内平方和。空簇保持旧中心。

### 性能与运行边界

新增实验仍为 CPU 上的普通 JavaScript、零生产依赖、无远程请求。Transformer 单头最多 8×8 注意力格，两头合计 128 格；小图特征只在设置重置时批量预计算，训练步复用它们。小图分类最多 200 轮，聚类最多 40 轮；全部播放循环离页释放，页面隐藏时暂停。

测试报告包含 8 词元、2 头 Transformer 的 100 次前向计时，明确排除绘图并记录浏览器环境。不以该计时代替低端手机或所有浏览器的实测。公式、简化范围、参数账本及扩展接口见 [轻量专题设计](docs/EXPANSION.md)。

## 训练场确实在训练

5 种合成数据：XOR、同心圆、双月牙、双螺旋、线性可分。网络可以有 0–3 个隐藏层，每层 2 / 4 / 8 / 12 个神经元；隐藏激活支持 tanh、ReLU、线性，优化器支持 SGD 和 Adam。学习率、批量、L2、噪声及随机种子均可调。

默认网络 `2 → 8 → 8 → 1` 有 **105 个可训练参数**。240 个样本按类别分层划为 **180 条训练、60 条验证**；验证样本不进入梯度。固定种子可复现数据、初始权重和批次顺序。页面绘制的边界、损失与准确率来自当前模型，不是预设动画。

训练目标为平均 BCE 加权重 L2；图上显示的 BCE 不包含 L2，偏置不受惩罚。Adam 的 L2 直接加入梯度，**不是 AdamW**。没有隐藏层时为逻辑回归；线性隐藏层叠加仍受仿射结构限制。

模型 JSON 保存结构、权重、偏置、Adam 矩、优化器步数及批次随机状态，可以导入并继续训练。导入错误不替换当前模型。修改训练配置会重置实验；离开章节或切到后台会暂停，最多训练 5000 轮。

## 学习记录与隐私

进度、答案、笔记及实验快照只保存于当前浏览器。没有账号、遥测、广告、云同步或远程模型调用；点击外部参考链接时才访问对应网站。

学习记录可以导出为可阅读的 JSON 备份，当前不支持导回；模型 JSON 支持导入。清理浏览器存储前应先导出重要记录。

## 边界与教学约定

这是基础概念主线，不是完整的 AI 学科百科。注意力页的 Q/K/V 与词元页的 logits 为人工教学数值；前者真实执行注意力公式，后者真实从固定分布抽样，**不声称具有预训练语言模型或自回归生成能力**。多项式实验使用 Chebyshev 基底；卷积页按深度学习常用约定执行互相关，不翻转核。

验证集可用于多次配置比较，因此不能视为最终独立测试集；合成数据上的准确率不代表真实应用能力。

## 开发与验收

参与开发请先看 [开发与贡献指南](CONTRIBUTING.md) 和 [目录与架构指南](docs/ARCHITECTURE.md)。新增章节、模型协议、生命周期和验证要求均在其中说明；提交 PR 时使用仓库模板。AI 编码助手另有简短入口 [AGENTS.md](AGENTS.md)。

Node.js 20+：

```sh
npm test
npm run build
```

数值、模型、界面、词典和构建回归共 125 项测试；默认浏览器两套共 72 组验收（原套件45组、LLM套件27组）。浏览器验收另外需要 Python 3.10+：

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:e2e
```

默认使用真实 HTTP、file URL 和原生 localStorage。Linux CI 使用 `python -m playwright install --with-deps chromium`。受限环境可显式设置 `AI_TEST_IN_MEMORY=1`，它只测试内存渲染交互，两套合计会明确跳过 4 组原生加载与持久化检查，不能代替默认验收。

初始执行记录见 [docs/VALIDATION.md](docs/VALIDATION.md)，1.1 新增范围见 [docs/EXPANSION.md](docs/EXPANSION.md)，1.2 进阶范围见 [docs/LLM_TRACK.md](docs/LLM_TRACK.md)；完整报告、截图与源码包见 Actions 的 `learning-lab-validation` 附件。测试脚本存在与验收实际通过是两个不同状态，以运行结果为准。

## GitHub Pages

已提供 `.github/workflows/pages.yml`。仓库所有者首次在 **Settings → Pages → Build and deployment → Source → GitHub Actions** 启用，随后在 **Actions → Publish learning lab → Run workflow** 执行一次；以后推送 `main` 自动更新。

工作流未检测到可用 Pages 时会跳过部署并给出说明，不把成功构建标成网站已发布。启用且部署成功后的预期地址为：

`https://peroperoyui-lab.github.io/artificial-intelligence-learning-page/`

以 Pages 设置和实际部署结果为准。普通脚本、相对资源与哈希路由适配项目子路径。官方说明：[Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 项目结构与许可

`src/engine.js` 为原有数值引擎，`engine-extra.js` 补充轻量案例；`content.js` 存原课程，`content-expansion.js` 扩充说明、词典和新专题；`ui.js` 提供控件和本地状态；`labs-core.js`、`labs-advanced.js`、`labs-extra.js` 实现实验；`playground.js` 保持原有 MLP 与模型协议；`app.js` 连接路由、搜索、笔记和课程。1.2 新增 `engine-llm.js`、`engine-microgpt.js`、`content-llm.js`、`labs-llm.js`、`llm-track.js`，共享原有UI和存储，不修改旧MLP。

来源包括《动手学深度学习》、Google ML Crash Course、PyTorch / scikit-learn / Hugging Face 官方文档和 Transformer 原始论文。各章提供原始链接。交互思路参考 TensorFlow Playground，设计过程参考 Anthropic 的公开 frontend-design 指南；未复制它们的代码、技能正文、图片或字体。

原创代码、文字和图形按 [MIT License](LICENSE) 开源。第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，教学与工程设计见 [docs/DESIGN.md](docs/DESIGN.md)。

---

**Visible AI Lab** is an offline-capable Chinese interactive introduction to AI, machine learning and deep learning. It includes 34 chapters (18 advanced LLM lessons), 236 glossary entries, a fully trainable 260-parameter causal decoder, a deterministic MLP trainer, gradient checks, resumable models and a local learning journal. Zero production dependencies. Original implementation, MIT licensed.
