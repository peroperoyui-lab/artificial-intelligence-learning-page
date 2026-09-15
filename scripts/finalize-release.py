"""Prepare a release without secrets, forced pushes, or guessed Git object IDs."""
from pathlib import Path
import json, re, shutil, subprocess, sys
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
def write(name,text):
    p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf8')
def replace(name,old,new):
    p=ROOT/name;s=p.read_text(encoding='utf8')
    if old in s:p.write_text(s.replace(old,new),encoding='utf8')
    elif new not in s:raise RuntimeError('Expected source pattern not found in '+name)
mode=sys.argv[1] if len(sys.argv)>1 else 'prepare'
if mode=='prepare':
    for f in ['src/engine.js','src/content.js','src/ui.js','src/labs-core.js','src/labs-advanced.js','src/playground.js','src/app.js','tests/engine.test.js']:
        if not (ROOT/f).is_file():raise RuntimeError('Missing required source: '+f)
    replace('scripts/build.js',"bundled=bundled.replace('</body>',scripts.join('\\n')+'\\n</body>');","bundled=bundled.replace('</body>',()=>scripts.join('\\n')+'\\n</body>');")
    replace('src/app.js',"[c.short,c.title,c.summary].join(' ').toLowerCase().includes(q)","[c.id,c.short,c.title,c.summary].join(' ').toLowerCase().includes(q)")
    replace('src/ui.js',"U.state.journal.unshift({title,date:new Date().toISOString(),data});","U.state.journal.unshift({title,date:new Date().toISOString(),data:JSON.parse(JSON.stringify(data))});")
    replace('src/labs-advanced.js',"U.range('gen-noise','观测噪声 σ',0,.6,.02,s.noise)","U.range('gen-noise','观测噪声 σ',0,.6,.01,s.noise)")
    p=ROOT/'index.html';html=p.read_text(encoding='utf8')
    if 'assets/accessibility.css' not in html:html=html.replace('</head>','<link rel="stylesheet" href="assets/accessibility.css">\n</head>')
    p.write_text(html,encoding='utf8')
    write('assets/accessibility.css','[hidden]{display:none!important}\n.axis-line,.grid-line{fill:none}\n.lesson-reading,.lesson-aside,.preview-network{min-width:0}\n.brand svg{flex:none}\n.formula,.lab-status{overflow-wrap:anywhere}\n.scope-title{gap:12px;flex-wrap:wrap}\n')
    write('requirements-dev.txt','playwright==1.57.0\n')
    package=json.loads((ROOT/'package.json').read_text(encoding='utf8'))
    package['scripts']['test']='node --test tests/engine.test.js'
    package['scripts']['test:e2e']='python tests/release-browser.py'
    write('package.json',json.dumps(package,ensure_ascii=False,indent=2)+'\n')
    write('LICENSE','''MIT License

Copyright (c) 2026 peroperoyui-lab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
''')
    write('THIRD_PARTY_NOTICES.md','''# 来源与第三方声明

本站的文字、数学实现、SVG / Canvas 图形与布局为原创，采用 MIT 许可。生产页面无第三方运行依赖，没有打包外部字体、照片或模型权重。

全部知识来源及原始链接存于 `src/content.js` 的 `sources`，通过各章 `refs` 对应到讲解；站内“来源与开源”提供可点击索引。主要依据为《动手学深度学习》、Google ML Crash Course、PyTorch、scikit-learn 与 Hugging Face 官方文档，以及 Vaswani et al. (2017) 的 Transformer 原始论文。外链资料保留原作者权利，不因被引用而改用本站许可。

TensorFlow Playground（https://playground.tensorflow.org/）为交互教学思路参考；未复制其实现。Anthropic 的公开 frontend-design 指南（https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md）为设计过程参考；未复制或分发技能文件。

仅用于开发的 Playwright Python（https://github.com/microsoft/playwright-python）按 Apache-2.0 许可使用，不进入生产网页。Node.js 和 GitHub 官方 Actions 仅执行测试、构建与发布，分别遵循其官方仓库许可。
''')
    write('README.md','''# 可见 · AI 实验室

让抽象的 AI，变成看得见的学习过程。中文交互课程，原生 HTML / CSS / JavaScript，零生产依赖，无账号、无 API Key、无遥测。

## 立即使用

下载仓库 ZIP 后，直接双击根目录 `index.html`；保留 `src/` 与 `assets/` 的相对位置。发布流程也会生成根目录 `visible-ai-offline.html`，它把所有代码与样式装进一个文件，可单独保存、移动和离线打开。

网页依靠现代浏览器的 JavaScript、SVG 与 Canvas。无需安装 Python 或 Node.js 即可学习。浏览器限制 `file://` 下的本地存储时，计算仍可使用；笔记会提示保存失败，可导出备份。

## 13 章主线

| 阶段 | 章节 | 动手做什么 |
|---|---|---|
| 建立直觉 | AI 知识地图、向量矩阵、线性回归、神经元与激活 | 看清任务与方法，变换平面，移动预测直线，观察激活和导数 |
| 让模型学会 | 损失与交叉熵、梯度下降、反向传播、神经网络训练场 | 操作概率与损失，比较优化轨迹，逐步走计算图，真正训练 MLP |
| 走向真实问题 | 泛化与过拟合、评价与阈值、卷积、注意力、词元生成 | 比较训练与验证，检查误报漏报，逐格乘加，计算 Q/K/V 和采样分布 |

每章包含操作任务、原理说明、可展开的数学细节、自测和笔记。另有 52 个中英术语、17 项来源记录、`/` 快捷搜索、专注模式、减少动画、移动布局和实验快照。

## 真正可训练的网络

支持 XOR、同心圆、双月牙、双螺旋和线性数据。可选 0–3 个隐藏层、每层 2 / 4 / 8 / 12 个神经元，tanh / ReLU / 线性激活，以及 SGD / Adam。学习率、批量、L2、噪声和种子均可调。

默认结构 `2→8→8→1`，共 105 个参数；240 个合成样本按类别分层为 180 个训练样本和 60 个验证样本。验证集不进入梯度。图像、损失与准确率全部实时计算，没有预录训练动画。

模型 JSON 保存权重、偏置、Adam 矩、优化器步数、配置和批次随机状态，支持导入并接续训练。学习记录 JSON 用作可阅读备份，当前不支持导回。修改配置会重置实验；离开章节或切到后台会暂停；训练最多 5000 轮。

注意力使用人工 Q/K/V 演示标准公式；词元实验从人工 logits 的固定分布采样，并非完整语言模型或自回归生成器。多项式实验真实拟合 Chebyshev 基底中的最小二乘与岭回归。卷积页按深度学习常用约定执行互相关，不翻转核。

## 本地开发与测试

Node.js 20+：

```sh
npm start
npm test
npm run build
```

本地服务只监听 `127.0.0.1:4173`。在同一终端按 Ctrl+C 即停止，不安装后台服务。构建结果位于 `dist/`，包括普通静态网站和单文件离线版。

Python 浏览器验收：

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:e2e
```

Linux CI 使用 `python -m playwright install --with-deps chromium` 安装浏览器系统依赖。验收报告的实际结果、环境和范围写入 `docs/VALIDATION.md`，截图和原始报告保存在 Actions artifact。以实际运行报告为准，不把测试脚本存在视为已经通过。

## GitHub Pages

仓库管理员在 Settings → Pages 将 Source 设为 GitHub Actions，再从 Actions 手动运行 Publish learning lab。初次启用 Pages 需要仓库管理权限；成功构建、生成离线文件与网站已在线发布是三个不同的状态。

## 代码结构

`src/engine.js` 是无 DOM 的数值引擎；`content.js` 存章节与来源；`ui.js` 提供控件、图形与本地记录；`labs-core.js` 和 `labs-advanced.js` 提供实验；`playground.js` 负责训练和模型导入；`app.js` 连接路由、搜索、笔记与课程。

原创内容按 MIT 开源；参考与工具声明见 `THIRD_PARTY_NOTICES.md`。本站不包含第三方字体文件、图片库或远程模型服务。
''')
    print('Release sources prepared; no validation success has been asserted yet.')
elif mode=='report':
    report=json.loads((ROOT/'.test-output/release-browser-results.json').read_text(encoding='utf8'))
    if report['failed'] or report['skipped']:raise RuntimeError('Release browser validation is incomplete')
    log=(ROOT/'.test-output/numerical.tap').read_text(encoding='utf8')
    failed=re.search(r'^# fail (\d+)',log,re.M);passed=re.search(r'^# pass (\d+)',log,re.M)
    if not passed or not failed or int(failed.group(1)):raise RuntimeError('Numerical test report did not pass')
    stamp=datetime.now(timezone.utc).isoformat()
    write('docs/VALIDATION.md',f'''# 发布验收记录

生成于 {stamp}，GitHub Actions Linux 环境。

数值测试：**{passed.group(1)} 通过，0 失败**。原始 TAP 为 artifact 中的 `numerical.tap`。

原生 Chromium 浏览器：**{report['passed']} 组通过，0 失败，0 跳过**。通过实际 HTTP URL、原始 file URL 和单文件 file URL 加载；没有替换浏览器存储。

覆盖章节挂载、真实网络训练、模型保存/恢复与错误输入、概率与损失、反向传播、卷积、注意力、采样、笔记、搜索、响应式溢出以及离开页面停止训练。断言与逐项结果见 `tests/release-browser.py` 及 artifact 中的 `release-browser-results.json`。

数值引擎包含种子复现、全参数中心差分梯度校验、SGD / Adam、L2、导入校验、原始优化器与随机状态接续、混淆矩阵、卷积、注意力和多项式测试。

## 范围

这些测试不是跨所有设备、所有浏览器、全部辅助技术的认证，也不表示 GitHub Pages 已启用。实际模型是合成二维任务的教学网络；验证数据参与多次配置比较，不能当成最终独立测试集。注意力和词元分布的人工设定在页面中明确标注。
''')
    subprocess.run(['node','scripts/build.js'],cwd=ROOT,check=True)
    shutil.copyfile(ROOT/'dist/visible-ai-offline.html',ROOT/'visible-ai-offline.html')
    print('Verified release report and standalone file generated.')
else:raise SystemExit('Use prepare or report')
