# 来源、开发工具与第三方声明

## 生产运行

可见 AI 实验室使用原生 HTML、CSS、JavaScript、SVG 和 Canvas，没有第三方生产依赖。图标、图形、解释文字和数值代码是本项目原创。没有复制或打包外部字体、照片、教材段落、技能文件或第三方图标库。

原创代码、文字及图形按根目录 `LICENSE` 中的 MIT 许可发布。外链资料不因此变为 MIT 许可；其权利与许可仍归原作者。

## 知识来源

`src/content.js`、`src/content-expansion.js` 及 `src/content-llm.js` 中 `sources` 列表记录每一项原始 URL 与使用范围，章节的 `refs` 将其连接到相应内容。站内“来源与开源”页面呈现这份记录。

- 《动手学深度学习》 / Dive into Deep Learning：线性代数、Softmax、多层感知机、反向传播、Adam、卷积、注意力。参考数学定义与概念；没有复制原文、插图或实现。
- Google Machine Learning Crash Course：学习任务、梯度下降、过拟合。
- PyTorch 官方文档：BCEWithLogitsLoss 的数学与数值稳定性。
- scikit-learn 官方文档：分类评价指标与未定义分母的处理说明。
- Vaswani et al. (2017), *Attention Is All You Need*, arXiv:1706.03762：Transformer 与缩放点积注意力的原始论文。
- Hugging Face 官方文档：分词器、温度与 top-k 生成配置。

## 设计和交互参考

**TensorFlow Playground** — https://playground.tensorflow.org/

参考“在浏览器中调参数并观察小型神经网络”的教学思路。本项目的训练引擎、数据集生成、布局与绘图代码独立编写，没有复制 TensorFlow Playground 源码。此项为灵感来源声明，不表示本站代码依赖它。

**Anthropic frontend-design 指南** — https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md

设计过程阅读该公开指南，参考其有明确视觉方向、控制层级和细节的设计建议。没有把技能正文复制到仓库，也没有从中下载或打包任何字体及素材。

## 仅用于开发和持续集成的工具

**Playwright / Microsoft** — Python 包固定于 `requirements-dev.txt`，Apache License 2.0。用于浏览器交互验收，不包含在静态网页发布包中。项目：https://github.com/microsoft/playwright-python

**Node.js** — 用于构建、启动本地静态服务和执行数值测试。没有将 Node.js 运行时打包到网页中。许可信息：https://github.com/nodejs/node/blob/main/LICENSE

**GitHub Actions** — 工作流引用 actions/checkout、actions/setup-node、actions/setup-python、actions/upload-artifact 及 Pages 官方 actions。这些工具只在 CI 环境执行，不成为本站浏览器运行依赖。各自许可见其官方仓库。

浏览器测试产生的截图是本站自己的页面渲染结果，不包含第三方照片或预训练模型输出。

## 1.1 新增教学参考

新增说明依据《动手学深度学习》的多通道卷积、汇聚、填充/步幅、Transformer、正弦位置编码和 Dropout 章节，以及 scikit-learn 的聚类、预处理、数据泄漏说明。每项链接和用途记录在 `content-expansion.js`，由章节及词典关联。

8×8 线条图案在浏览器中原创生成，不使用 MNIST 或第三方图片数据集。卷积核使用公开的数学算子；Transformer 投影用项目种子函数生成，不载入外部预训练权重。分类头、矩阵步骤、Lloyd/K-means++ 和界面均为独立实现，没有引入第三方生产包或额外模型许可。

## 1.2 大语言模型路线的参考与实现

《动手学深度学习》用于数学、语言模型、注意力、预训练与计算性能的阅读导航。D2L教材仓库的许可见 https://github.com/d2l-ai/d2l-en/blob/master/LICENSE （CC BY-SA 4.0）；其内容不因本站MIT许可而变更许可。本次没有复制、翻译或改编教材段落、图片、代码文件，也不分发教材本体。本站是独立原创讲解和实验，不是D2L官方分站。

现代LLM专题参考RoFormer、RMSNorm、GLU Variants、LoRA、QLoRA、GQA、FlashAttention、InstructGPT、DeepSeekMath、Switch、RAG、HELM、PagedAttention及Hugging Face课程/官方文档。原始链接和用途逐项登记于 `content-llm.js`；仅链接阅读，不复制论文图表或正文。

`engine-microgpt.js` 的标量自动微分和260参数解码器为本项目原创实现，不复制第三方micrograd/microGPT代码；六句训练和两句验证均为原创人工句子，不下载语料、图片、预训练权重或字体。其他矩阵、BPE、量化、检索与调度同样独立实现。浏览器计时或合成句子成绩不作为真实大模型能力背书。
