# 可见 · AI 实验室

**让抽象的 AI，变成看得见的学习过程。**

一个中文交互式 AI / 机器学习 / 深度学习基础学习站：13 个递进章节、52 个中英概念、真实神经网络训练台，以及可以保存的笔记和实验快照。

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

## 13 个可以动手的章节

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

每章按照 **动手实验 → 理解原理 → 展开推导 → 自测与笔记** 组织。前置概念相互链接，按 `/` 可搜索章节和术语。支持专注模式、减少动画、本地进度及最多 30 条实验快照。

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

Node.js 20+：

```sh
npm test
npm run build
```

数值、模型、界面和构建回归共 48 项测试。浏览器验收另外需要 Python 3.10+：

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:e2e
```

默认使用真实 HTTP、file URL 和原生 localStorage。Linux CI 使用 `python -m playwright install --with-deps chromium`。受限环境可显式设置 `AI_TEST_IN_MEMORY=1`，它只测试内存渲染交互，并会明确跳过 3 组原生加载与持久化检查，不能代替默认验收。

实际执行记录见 [docs/VALIDATION.md](docs/VALIDATION.md)；完整报告、截图与源码包见 Actions 的 `learning-lab-validation` 附件。测试脚本存在与验收实际通过是两个不同状态，以运行结果为准。

## GitHub Pages

已提供 `.github/workflows/pages.yml`。仓库所有者首次在 **Settings → Pages → Build and deployment → Source → GitHub Actions** 启用，随后在 **Actions → Publish learning lab → Run workflow** 执行一次；以后推送 `main` 自动更新。

工作流未检测到可用 Pages 时会跳过部署并给出说明，不把成功构建标成网站已发布。启用且部署成功后的预期地址为：

`https://peroperoyui-lab.github.io/artificial-intelligence-learning-page/`

以 Pages 设置和实际部署结果为准。普通脚本、相对资源与哈希路由适配项目子路径。官方说明：[Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 项目结构与许可

`src/engine.js` 为无 DOM 的数值引擎；`content.js` 存章节与来源；`ui.js` 提供控件和本地状态；`labs-core.js`、`labs-advanced.js` 实现实验；`playground.js` 负责训练与导入；`app.js` 连接路由、搜索、笔记和课程。

来源包括《动手学深度学习》、Google ML Crash Course、PyTorch / scikit-learn / Hugging Face 官方文档和 Transformer 原始论文。各章提供原始链接。交互思路参考 TensorFlow Playground，设计过程参考 Anthropic 的公开 frontend-design 指南；未复制它们的代码、技能正文、图片或字体。

原创代码、文字和图形按 [MIT License](LICENSE) 开源。第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，教学与工程设计见 [docs/DESIGN.md](docs/DESIGN.md)。

---

**Visible AI Lab** is an offline-capable Chinese interactive introduction to AI, machine learning and deep learning. It includes 13 visual chapters, a real deterministic MLP trainer, gradient checks, resumable models and a local learning journal. Zero production dependencies. Original implementation, MIT licensed.
