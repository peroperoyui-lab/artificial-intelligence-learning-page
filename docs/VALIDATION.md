# 初始交付验收记录

## 已执行结果

2026-09-15，在本地受限渲染环境中执行数值、状态与构建回归测试：48 项通过，0 失败。包括 45 项数值引擎测试和 3 项界面状态 / 单文件构建测试。

同日在 GitHub Actions 的 Ubuntu / Node.js 22 / Python 3.12 / Playwright Chromium 环境完成原生浏览器验收：工作流 `Validate learning lab` 运行 34975478121，提交 0f3d43013c631a7e2b7d9523ffcab468f2e030c8，原生 HTTP、file 与交互测试步骤成功。该轮还通过当时的 45 项数值测试。此后增加的 3 项回归与快照拷贝修订由后续 CI 再验；最终以对应提交的 Actions 结果为准。

参考运行：https://github.com/peroperoyui-lab/artificial-intelligence-learning-page/actions/runs/34975478121

## 数值与状态覆盖

稳定 Sigmoid / Softplus / BCE / Softmax、极端 logits、单神经元与回归梯度、所有 MLP 参数的中心差分校验、tanh / ReLU / 线性激活、SGD、Adam 偏差校正、L2 权重惩罚、拒绝发散批次时的原子性、随机序列恢复、5 种数据的可复现分层划分、模型保存后接续相同优化器与批次序列、导入结构与数值校验。

此外检查混淆矩阵、未定义精确率、互相关数值与输出形状、因果掩码、注意力值聚合、top-k、分类抽样频率、Chebyshev 拟合、课程引用完整性、不可变实验快照、用户文本转义，以及单文件构建不会改变 JavaScript 字面美元符号。

## 浏览器覆盖

默认浏览器套件包含 32 组断言：13 章挂载、矩阵操作、真实回归与神经网络训练、反向传播分步、模型下载 / 导入 / 继续训练、损坏及过大文件拒绝、架构修改重置、全部数据集运行、坐标预测、离开章节停止计时器、多项式实际拟合、阈值极值、卷积像素及输出形状、注意力掩码、词元抽样、快照导出、笔记转义、自测与完成进度、搜索、专注与减少动画、错误路由、首页真实训练、390px / 320px 布局、原生 HTTP 刷新持久化、原始与单文件 file URL、项目子路径资源加载，以及无未处理异常 / 远程运行依赖。

本地浏览器受管理策略限制，原生本地 URL 返回 ERR_BLOCKED_BY_ADMINISTRATOR，因此本地先显式使用内存渲染 + 测试 Storage 替身：29 组通过、3 组跳过。上述 GitHub Actions 默认模式补验了原生加载与存储，不采用该替身。

## 复现

```sh
npm test
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:e2e
```

完整 JSON 结果与截图在 `.test-output/`。CI 附件开启包含隐藏文件选项，以便实际保留该目录。

## 未作出的保证

这些结果不构成所有浏览器、全部移动设备和所有辅助技术的兼容性认证，也不表示 GitHub Pages 已启用。模型只用于合成二维任务；验证集不参与梯度，但多次看验证结果调参仍属于模型选择。注意力与词元演示使用人工数值，页面已明示。
