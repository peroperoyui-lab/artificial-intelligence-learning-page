/* Lightweight CPU case studies; every visual comes from the numerical engine. */
(function (root) {
  'use strict';
  const { E, U, C, labs } = root.AI;
  const names = ['竖线', '横线', '斜线'];
  function tensor(values, title, options = {}) {
    const { labels = [], probability = false, highlight = -1, numeric = true } = options;
    const width = values[0].length;
    return `<figure class="tensor-figure"><figcaption>${U.escape(title)} <span>${values.length}×${width}</span></figcaption><div class="table-scroll"><table class="tensor-table"><caption class="sr-only">${U.escape(title)}，逐行逐列数值</caption><tbody>${values.map((row, i) => `<tr class="${i === highlight ? 'selected-row' : ''}">${labels.length ? `<th scope="row">${i + 1}·${U.escape(labels[i])}</th>` : ''}${row.map((v, j) => `<td style="background:${U.probColor(probability ? E.clamp(v, 0, 1) : (E.clamp(v, -2, 2) + 2) / 4)}" title="第 ${i + 1} 行，第 ${j + 1} 列：${U.fmt(v, 6)}" aria-label="行 ${i + 1} 列 ${j + 1}：${U.fmt(v, 6)}">${numeric ? U.fmt(v, 2) : '<span aria-hidden="true">&nbsp;</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></figure>`;
  }
  const panel = (title, html) => `<section class="case-panel"><h3>${title}</h3>${html}</section>`;

  labs.cnn = el => {
    let kind = 0, shift = 3, noise = 0, pooling = 'max', seed = 42, channel = 0;
    let image, features, data, model, epoch = 0, target = 40, metrics, history = [];
    el.classList.add('case-lab');
    el.innerHTML = `<div class="case-intro"><strong>固定滤镜 + 可训练分类头</strong><p>选择一张小图，逐层检查数字。训练只改变最后 147 个参数，不下载图片或模型。</p></div><div class="play-config">${U.select('cnn-pattern', '输入图案', [[0, '竖线'], [1, '横线'], [2, '斜线'], [3, '空白 / 自由编辑']], 0)}${U.range('cnn-shift', '线条位置', 1, 6, 1, 3)}${U.range('cnn-noise', '输入噪声幅度', 0, .4, .02, 0)}${U.select('cnn-pool', '池化方式（改变会重置模型）', [['max', '最大池化'], ['average', '平均池化']], 'max')}${U.select('cnn-channel', '观察的输出通道', E.visionKernels.map((k, i) => [i, k.name]), 0)}${U.number('cnn-seed', '数据与模型种子', 42, 0, 9999)}</div><div class="pipeline-label">输入 1×8×8 → 固定卷积 3×8×8 → ReLU → 池化 3×4×4 → 展平 48 → 分类 3</div><div class="vision-flow"><div id="cnn-input"></div><div id="cnn-conv"></div><div id="cnn-relu"></div><div id="cnn-pooled"></div></div><div class="case-two"><div><div id="cnn-kernel"></div><p class="control-note">响应图：青色偏负、白色近 0、橙色偏正，色阶截在 −2…2；数值没有截断。各张响应图使用相同色阶，可对照强弱。输入像素为 0…1。</p></div><div>${U.number('cnn-row', '编辑第几行', 4, 1, 8)}${U.number('cnn-col', '编辑第几列', 4, 1, 8)}${U.number('cnn-value', '设定像素亮度', 1, 0, 1, .1)}<button id="cnn-set">应用像素</button><p class="control-note">也可直接点击输入格切换 0/1；键盘用户可用行、列、亮度输入。编辑后模型不重训，只做新推断。</p></div></div><details class="case-details"><summary>检查全部 48 维特征与展平顺序</summary><div id="cnn-flat"></div></details><div class="case-two">${panel('当前图像的三类预测', '<div id="cnn-bars" class="bars"></div><p class="control-note">即使画空白图也会分配三类概率。这里只训练了三种线条，不提供未知类别检测。</p>')}${panel('真正训练分类头', '<div class="button-row"><button id="cnn-train" class="primary">训练 40 轮</button><button id="cnn-step">训练 1 轮</button><button id="cnn-reset">重置分类头</button></div><p id="cnn-status" class="lab-status" role="status"></p>')}</div><div id="cnn-stats" class="stats"></div><div id="cnn-loss"></div><p class="control-note">曲线为平均多类交叉熵，不含正则项。训练集 90 条、验证集 30 条，训练使用全批量、学习率 0.4。训练步复用预计算特征，上限 200 轮。</p>`;
    const loop = new U.Loop(() => { trainOne(); return epoch < target && epoch < 200; }, 40, running => {
      U.$('#cnn-train', el).textContent = running ? '暂停训练' : '训练 40 轮';
      U.$('#cnn-status', el).textContent = running ? '正在更新分类头；三片卷积核保持固定。' : `已暂停在 ${epoch} 轮。${epoch >= 200 ? '已达上限，重置后可再试。' : '可继续训练或编辑图像做推断。'}`;
    });
    function drawPredictions() { U.bars(U.$('#cnn-bars', el), names, model.predict(features.flat)); }
    function drawImage() {
      features = E.visionFeatures(image, pooling);
      U.$('#cnn-input', el).innerHTML = `<p class="figure-title">输入 · 8×8</p><div class="case-pixels">${image.flat().map((v, i) => `<button type="button" data-cnn-pixel="${i}" style="background:rgb(${[0, 1, 2].map(() => Math.round(250 - v * 205)).join(',')})" title="${Math.floor(i / 8) + 1},${i % 8 + 1}：${U.fmt(v, 3)}" aria-label="输入行 ${Math.floor(i / 8) + 1} 列 ${i % 8 + 1} 亮度 ${U.fmt(v, 3)}，点击切换">${v >= .5 ? '<span aria-hidden="true">●</span>' : ''}</button>`).join('')}</div>`;
      U.$('#cnn-conv', el).innerHTML = tensor(features.conv[channel], '卷积响应');
      U.$('#cnn-relu', el).innerHTML = tensor(features.activated[channel], 'ReLU 后');
      U.$('#cnn-pooled', el).innerHTML = tensor(features.pooled[channel], `${pooling === 'max' ? '最大' : '平均'}池化`);
      U.$('#cnn-kernel', el).innerHTML = tensor(E.visionKernels[channel].values, `第 ${channel + 1} 片固定核`);
      U.$('#cnn-flat', el).innerHTML = `<p>顺序：通道 1 的 16 项 → 通道 2 的 16 项 → 通道 3 的 16 项；每通道按行排列。</p><pre>${U.escape(features.flat.map(x => U.fmt(x, 3)).join(', '))}</pre>`;
      drawPredictions();
    }
    function evaluate() {
      metrics = { train: model.evaluate(data.train), validation: model.evaluate(data.val) };
      history.push({ epoch, train: metrics.train.loss, validation: metrics.validation.loss });
    }
    function drawTraining() {
      U.stats(U.$('#cnn-stats', el), [['已训练轮次', String(epoch)], ['训练 CE', U.fmt(metrics.train.loss, 4)], ['验证 CE', U.fmt(metrics.validation.loss, 4)], ['验证准确率', U.pct(metrics.validation.accuracy)]]);
      U.plot(U.$('#cnn-loss', el), [
        { points: history.map(p => [p.epoch, p.train]), color: 'teal' },
        { points: history.map(p => [p.epoch, p.validation]), color: 'orange', dash: true }
      ], { xmin: 0, xmax: Math.max(10, epoch), ymin: 0, ymax: Math.max(1.2, ...history.map(p => Math.max(p.train, p.validation))) * 1.05, xlabel: '完整轮次', ylabel: '平均 CE：实线训练，虚线验证', height: 220 });
      drawPredictions();
    }
    function resetModel() {
      loop.stop(); data = E.visionDataset(pooling, seed); model = new E.SoftmaxHead(48, 3, seed);
      epoch = 0; history = []; evaluate(); drawImage(); drawTraining();
      U.$('#cnn-status', el).textContent = '分类头已初始化；点击训练。输入图案不进入训练集。';
    }
    function resetImage() { image = E.lineImage(kind, shift, noise, E.rng(seed + 201)); drawImage(); }
    function trainOne() { if (epoch >= 200) return; model.step(data.train, .4); epoch++; evaluate(); drawTraining(); }
    U.$('#cnn-pattern', el).onchange = e => { kind = Number(e.target.value); resetImage(); };
    U.bindRange(el, 'cnn-shift', v => { shift = v; resetImage(); });
    U.bindRange(el, 'cnn-noise', v => { noise = v; resetImage(); });
    U.$('#cnn-pool', el).onchange = e => { pooling = e.target.value; resetModel(); };
    U.$('#cnn-channel', el).onchange = e => { channel = Number(e.target.value); drawImage(); };
    U.$('#cnn-seed', el).onchange = e => { if (e.target.value !== '' && e.target.checkValidity()) { seed = Number(e.target.value); resetModel(); } };
    U.$('#cnn-input', el).onclick = e => { const b = e.target.closest('[data-cnn-pixel]'); if (!b) return; const i = Number(b.dataset.cnnPixel); image[Math.floor(i / 8)][i % 8] = image[Math.floor(i / 8)][i % 8] >= .5 ? 0 : 1; drawImage(); U.$(`[data-cnn-pixel="${i}"]`, el).focus({ preventScroll: true }); };
    U.$('#cnn-set', el).onclick = () => {
      const fields = ['row', 'col', 'value'].map(id => U.$('#cnn-' + id, el));
      if (!fields.every(f => f.value !== '' && f.checkValidity())) { U.toast('行列需为 1–8 的整数，亮度需在 0–1 内。'); return; }
      image[Number(fields[0].value) - 1][Number(fields[1].value) - 1] = Number(fields[2].value); drawImage();
    };
    U.$('#cnn-train', el).onclick = () => { if (loop.running) loop.stop(); else if (epoch < 200) { target = Math.min(epoch + 40, 200); loop.start(); } };
    U.$('#cnn-step', el).onclick = () => { loop.stop(); trainOne(); U.$('#cnn-status', el).textContent = `已训练 ${epoch} 轮；每轮一次全批量参数更新。`; };
    U.$('#cnn-reset', el).onclick = resetModel;
    el.getSnapshot = () => ({ kind, shift, noise, pooling, seed, channel, epoch, running: loop.running,
      image: image.map(row => row.slice()), features, metrics, trainCount: data.train.length, validationCount: data.val.length,
      trainableParameters: 147, frozenKernelValues: 27, classifier: { w: model.w.map(row => row.slice()), b: model.b.slice() }, probabilities: model.predict(features.flat) });
    image = E.lineImage(kind, shift); resetModel(); return () => loop.dispose();
  };

  labs.transformer = el => {
    let tokens = [0, 2, 3, 4], config = { heads: 2, causal: true, position: true, residual: true, norm: true, seed: 42 };
    let trace, stage = 0, head = 0, query = 0, elapsed = 0;
    const steps = ['词元嵌入', '加入位置', 'Q / K / V', '注意力汇总', '拼接与投影', '第一次 Add & Norm', '逐位置 FFN', '第二次 Add & Norm', '词表投影'];
    const descriptions = [
      '按编号查表，并按原论文约定乘 √d=2。相同词元共享同一行嵌入。这里所有嵌入均为种子生成的教学参数，未经过语言训练。',
      '按位置计算正弦/余弦向量，加到嵌入上。两个相同词元在不同位置可以获得不同的输入表示。关闭位置编码时，X 仅保留缩放后的嵌入。',
      '用三组不同的 4×4 矩阵投影同一 X，再按头拆分最后一维。下面展示当前选中的头；头数不改变总宽度 4。',
      '点积分数除以 √dₖ，未来位置按需要掩码，再对每个查询的键分数逐行 Softmax。最后把这一行概率乘在 V 各行上并求和。',
      '按特征轴拼接各头输出，再乘 Wo。输出回到 T×4，可以和输入残差相加。不同头的结果不是直接平均。',
      '先做输入与注意力输出的残差相加，再按每个位置的四个特征做 LayerNorm。这是 Post-LN 约定；关闭开关时可观察相应消融变体。',
      '对每行应用同一组 4→8→4 权重，8 维中间值经过 ReLU。这里不在词元之间交换信息，所有位置共享这组前馈参数。',
      '把前馈输出与 H 相加，再对每行归一化。单个块的输出仍为 T×4，可传给下一个块。本站只计算这一块。',
      '把选中位置的 4 维输出投影为 8 个词表 logits，再经 Softmax。它们是未训练模型的真实数值输出，不代表语义判断，也没有自动接词生成。'
    ];
    el.classList.add('case-lab');
    el.innerHTML = `<div class="case-intro"><strong>真实矩阵计算 · 固定教学权重 · 不做语言训练</strong><p>更改输入后重新计算完整前向；步骤按钮只决定你查看哪一层。总表示宽度固定为 4，最多 8 个词元。</p></div><div class="play-config">${U.select('tr-length', '序列长度', [1, 2, 3, 4, 5, 6, 7, 8], 4)}${U.select('tr-heads', '注意力头数', [[1, '1 头 · 每头 4 维'], [2, '2 头 · 每头 2 维']], 2)}${U.number('tr-seed', '固定权重种子', 42, 0, 9999)}${U.select('tr-head', '查看哪个头', [[0, '头 1'], [1, '头 2']], 0)}${U.select('tr-query', '重点查看的位置', tokens.map((_, i) => [i, '位置 ' + (i + 1)]), 0)}</div><div class="case-switches">${[['causal', '因果掩码'], ['position', '位置编码'], ['residual', '残差连接'], ['norm', 'LayerNorm']].map(([id, label]) => `<label><input id="tr-${id}" type="checkbox" checked> ${label}</label>`).join('')}</div><div id="tr-tokens" class="token-editors"></div><div class="button-row"><button id="tr-swap">交换前两个词元</button><button id="tr-prev">上一步</button><button id="tr-next" class="primary">下一步</button><button id="tr-play">分步播放</button></div><nav id="tr-stages" class="stage-nav" aria-label="Transformer 计算阶段"></nav><section class="trace-stage"><div class="trace-heading"><h3 id="tr-title"></h3><span id="tr-shape" class="pill"></span></div><p id="tr-description"></p><div id="tr-tensors" class="trace-tensors"></div><p id="tr-readout" class="lab-status" role="status"></p></section><div id="tr-stats" class="stats"></div><p id="tr-status" class="control-note" role="status"></p><details class="case-details"><summary>检查本次固定投影矩阵和数值约定</summary><div id="tr-weights"></div><p>注意力投影无偏置；前馈和词表头偏置为 0；LayerNorm γ=1、β=0，epsilon=10⁻⁵。无 Dropout，未训练。图中负数偏青、正数偏橙，数值表是准确读数；颜色仅作辅助。</p></details>`;
    const loop = new U.Loop(() => { stage++; drawStage(); return stage < 8; }, 700, r => { U.$('#tr-play', el).textContent = r ? '暂停播放' : '分步播放'; });
    function tokenControls() {
      U.$('#tr-tokens', el).innerHTML = tokens.map((t, i) => `<label><span>位置 ${i + 1}</span><select data-tr-token="${i}" aria-label="位置 ${i + 1} 的词元">${E.tinyVocabulary.map((word, j) => `<option value="${j}" ${t === j ? 'selected' : ''}>${U.escape(word)} / id ${j}</option>`).join('')}</select></label>`).join('');
      U.$('#tr-query', el).innerHTML = tokens.map((_, i) => `<option value="${i}" ${i === query ? 'selected' : ''}>位置 ${i + 1}</option>`).join('');
      U.$('#tr-swap', el).disabled = tokens.length < 2;
    }
    function compute() {
      loop.stop(); const t = performance.now(); trace = E.tinyTransformer(tokens, config); elapsed = performance.now() - t;
      // Inspect the actual matrices used in this forward trace, not a recreated copy.
      const matrices = [tensor(trace.embeddingTable, '嵌入表'), ...Object.entries(trace.weights).map(([name, values]) => tensor(values, name))];
      U.$('#tr-weights', el).innerHTML = matrices.join(''); drawStage();
      U.stats(U.$('#tr-stats', el), [['参数位置（全冻结）', '228'], ['单头注意力格数', String(tokens.length ** 2)], ['所有头格数', String(tokens.length ** 2 * config.heads)], ['本次前向 / 毫秒', U.fmt(elapsed, 3)]]);
      U.$('#tr-status', el).textContent = '时间只测当前设备上的数值前向，不包含绘图，也不是其他设备的性能保证。每次输入变化仅算一次，不启动后台训练。';
    }
    function drawStage() {
      const labels = tokens.map(t => E.tinyVocabulary[t]), h = trace.heads[head]; let matrices = [], readout = '';
      const show = (m, title, opts = {}) => tensor(m, title, { labels, highlight: query, ...opts });
      if (stage === 0) matrices = [show(trace.embedding, '缩放后的词元嵌入')];
      if (stage === 1) matrices = [show(trace.pe, 'PE（关闭时不相加）'), show(trace.input, '送入注意力的 X')];
      if (stage === 2) matrices = [show(h.Q, '当前头 Q'), show(h.K, '当前头 K'), show(h.V, '当前头 V')];
      if (stage === 3) {
        matrices = [show(h.scores, '缩放分数（掩码前）'), show(h.weights, '注意力权重（已按开关掩码）', { probability: true }), show(h.output, 'A × V')];
        readout = `位置 ${query + 1} 的权重之和为 ${U.fmt(h.weights[query].reduce((a, b) => a + b, 0), 6)}；输出向量 [${h.output[query].map(v => U.fmt(v, 4)).join(', ')}]。${config.causal ? '该行未来位置权重严格为 0。' : '当前不使用因果掩码。'}`;
      }
      if (stage === 4) matrices = [show(trace.concat, '各头输出按特征拼接'), show(trace.projected, '拼接结果 × Wo')];
      if (stage === 5) matrices = [show(trace.residual1, config.residual ? 'X + M' : 'M（残差关闭）'), show(trace.hidden, config.norm ? 'LN 后 H' : 'H（LN 关闭）')];
      if (stage === 6) matrices = [show(trace.ffPre, 'H × W₁'), show(trace.ffActivation, 'ReLU 后'), show(trace.ff, '再乘 W₂')];
      if (stage === 7) matrices = [show(trace.residual2, config.residual ? 'H + FFN(H)' : 'FFN(H)（残差关闭）'), show(trace.output, config.norm ? 'LN 后 Y' : 'Y（LN 关闭）')];
      if (stage === 8) {
        matrices = [show(trace.logits, '词表 logits'), show(trace.probabilities, '词表概率', { probability: true }), `<div><p class="figure-title">位置 ${query + 1} 的词表分布</p><div id="tr-probabilities" class="bars"></div><p class="control-note">列顺序：${E.tinyVocabulary.join('、')}。这是未训练分布。</p></div>`];
      }
      U.$('#tr-title', el).textContent = `${stage + 1} / 9 · ${steps[stage]}`;
      U.$('#tr-shape', el).textContent = `T=${tokens.length} · d=4 · h=${config.heads} · dₖ=${trace.dk}`;
      U.$('#tr-description', el).textContent = descriptions[stage]; U.$('#tr-tensors', el).innerHTML = matrices.join('');
      U.$('#tr-readout', el).textContent = readout;
      if (stage === 8) U.bars(U.$('#tr-probabilities', el), E.tinyVocabulary, trace.probabilities[query]);
      U.$('#tr-stages', el).innerHTML = steps.map((s, i) => `<button data-stage="${i}" aria-pressed="${i === stage}">${i + 1}. ${s}</button>`).join('');
      U.$('#tr-prev', el).disabled = stage === 0; U.$('#tr-next', el).disabled = stage === 8;
    }
    U.$('#tr-tokens', el).onchange = e => { if (e.target.dataset.trToken !== undefined) { tokens[Number(e.target.dataset.trToken)] = Number(e.target.value); compute(); } };
    U.$('#tr-length', el).onchange = e => { tokens = Array.from({ length: Number(e.target.value) }, (_, i) => tokens[i] ?? i % 8); query = Math.min(query, tokens.length - 1); tokenControls(); compute(); };
    U.$('#tr-heads', el).onchange = e => { config.heads = Number(e.target.value); head = 0; U.$('#tr-head', el).innerHTML = Array.from({ length: config.heads }, (_, i) => `<option value="${i}">头 ${i + 1}</option>`).join(''); compute(); };
    U.$('#tr-head', el).onchange = e => { head = Number(e.target.value); drawStage(); };
    U.$('#tr-query', el).onchange = e => { query = Number(e.target.value); drawStage(); };
    U.$('#tr-seed', el).onchange = e => { if (e.target.value !== '' && e.target.checkValidity()) { config.seed = Number(e.target.value); compute(); } };
    for (const name of ['causal', 'position', 'residual', 'norm']) U.$('#tr-' + name, el).onchange = e => { config[name] = e.target.checked; compute(); };
    U.$('#tr-swap', el).onclick = () => { if (tokens.length > 1) { [tokens[0], tokens[1]] = [tokens[1], tokens[0]]; tokenControls(); compute(); } };
    U.$('#tr-stages', el).onclick = e => { const b = e.target.closest('[data-stage]'); if (b) { loop.stop(); stage = Number(b.dataset.stage); drawStage(); U.$(`[data-stage="${stage}"]`, el).focus({ preventScroll: true }); } };
    U.$('#tr-prev', el).onclick = () => { loop.stop(); stage = Math.max(0, stage - 1); drawStage(); };
    U.$('#tr-next', el).onclick = () => { loop.stop(); stage = Math.min(8, stage + 1); drawStage(); };
    U.$('#tr-play', el).onclick = () => { if (stage === 8) { stage = 0; drawStage(); } loop.toggle(); };
    el.getSnapshot = () => ({ stage, head, query, running: loop.running, ...trace });
    tokenControls(); compute(); return () => loop.dispose();
  };

  labs.clustering = el => {
    let shape = 'clouds', k = 3, seed = 42, method = 'plus', scale = 1;
    let points, centers, labels, phase = 'assign', iteration = 0, halfSteps = 0, history = [], converged = false;
    const palette = ['teal', 'orange', 'violet', '#536437', '#9b3e74'];
    el.classList.add('case-lab');
    el.innerHTML = `<div class="case-intro"><strong>没有标签参与训练的分组</strong><p>点的颜色仅表示当前簇分配。中心标有数字，不代表真实类别。数据固定，种子只改变初始化。</p></div><div class="play-config">${U.select('km-data', '数据形状', [['clouds', '三团点'], ['rings', '同心圆（观察局限）']], 'clouds')}${U.range('km-k', '簇数量 K', 2, 5, 1, 3)}${U.select('km-init', '中心初始化', [['plus', 'K-means++'], ['random', '随机样本']], 'plus')}${U.number('km-seed', '初始化种子', 42, 0, 9999)}${U.range('km-scale', '第一坐标的尺度倍数', .25, 3, .25, 1)}</div><div class="button-row"><button id="km-step" class="primary">执行：分配到最近中心</button><button id="km-run">自动交替</button><button id="km-reset">相同设置重置</button></div><div id="km-status" class="lab-status" role="status"></div><div class="case-two"><div id="km-plot"></div><div><div id="km-stats" class="stats"></div><div id="km-centers"></div><p class="control-note">图中大号数字是中心编号。点按簇着色并交替使用圆/方形；表中列出每簇样本数。空簇保留旧中心。改变设置会重置，不拼接不同条件的曲线。</p></div></div><div id="km-loss"></div>`;
    const loop = new U.Loop(() => { step(); return !converged && iteration < 40; }, 280, r => { U.$('#km-run', el).textContent = r ? '暂停交替' : '自动交替'; });
    function reset() {
      loop.stop(); const r = E.rng(73);
      points = shape === 'clouds' ? Array.from({ length: 120 }, (_, i) => { const c = [[-1, -.65], [1, -.6], [0, 1]][i % 3]; return c.map(x => x + E.normal(r) * .27); }) : E.dataset('circles', 120, .06, 73).all.map(p => p.x);
      points = points.map(([x, y]) => [x * scale, y]); centers = E.kmeansInit(points, k, seed, method);
      labels = []; phase = 'assign'; iteration = 0; halfSteps = 0; history = []; converged = false; draw();
    }
    function step() {
      if (converged || iteration >= 40) return;
      if (phase === 'assign') { labels = E.kmeansAssign(points, centers); phase = 'update'; }
      else {
        const next = E.kmeansUpdate(points, centers, labels);
        converged = centers.every((p, i) => p.every((x, j) => Math.abs(x - next[i][j]) < 1e-10));
        centers = next; phase = 'assign'; iteration++;
      }
      halfSteps++; history.push([halfSteps, E.kmeansInertia(points, centers, labels)]); draw();
    }
    function draw() {
      const assigned = labels.length > 0, inertia = assigned ? E.kmeansInertia(points, centers, labels) : null;
      const series = assigned ? centers.map((_, j) => ({ points: points.filter((p, i) => labels[i] === j), type: 'scatter', square: Boolean(j % 2), radius: 3, color: palette[j] })) : [{ points, type: 'scatter', radius: 3, color: 'gray' }];
      U.plot(U.$('#km-plot', el), series, { xmin: -5.5, xmax: 5.5, ymin: -3.2, ymax: 3.2, height: 350, xlabel: '第一特征（已乘尺度）', ylabel: '第二特征', title: '样本分组与带编号的质心', extra: (sx, sy) => centers.map((p, j) => `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="11" fill="white" stroke="${U.colors[palette[j]] || palette[j]}" stroke-width="2"/><text x="${sx(p[0])}" y="${sy(p[1]) + 4}" text-anchor="middle" font-size="12" fill="#263d48">${j + 1}</text>`).join('') });
      U.stats(U.$('#km-stats', el), [['完整轮次', String(iteration)], ['半步次数', String(halfSteps)], ['当前分配下 J', U.fmt(inertia, 4)], ['样本数', String(points.length)]]);
      U.$('#km-centers', el).innerHTML = `<div class="table-scroll"><table class="case-table"><caption>当前中心和簇大小</caption><thead><tr><th>簇</th><th>中心坐标</th><th>点数</th></tr></thead><tbody>${centers.map((p, j) => `<tr><th>${j + 1}</th><td>${p.map(x => U.fmt(x, 3)).join(', ')}</td><td>${assigned ? labels.filter(x => x === j).length : '待分配'}</td></tr>`).join('')}</tbody></table></div>`;
      U.plot(U.$('#km-loss', el), [{ points: history, color: 'teal' }], { xmin: 0, xmax: Math.max(6, halfSteps), ymin: 0, ymax: Math.max(1, ...history.map(p => p[1])) * 1.1, height: 220, xlabel: '半步（分配 / 更新各算一次）', ylabel: '簇内平方和 J' });
      const finished = converged || iteration >= 40;
      U.$('#km-step', el).disabled = finished; U.$('#km-run', el).disabled = finished;
      U.$('#km-step', el).textContent = phase === 'assign' ? '执行：分配到最近中心' : '执行：移动中心到均值';
      U.$('#km-status', el).textContent = converged ? '中心已稳定，自动停止。目标收敛不保证分组就是现实中的类别。' : iteration >= 40 ? '达到 40 轮上限，已停止。可改变初始化再试。' : `下一步：${phase === 'assign' ? '固定中心，把每个点分到最近的中心' : '固定当前分配，把中心移动到该簇的坐标均值'}。`;
    }
    U.$('#km-step', el).onclick = () => { loop.stop(); step(); }; U.$('#km-run', el).onclick = () => loop.toggle(); U.$('#km-reset', el).onclick = reset;
    U.$('#km-data', el).onchange = e => { shape = e.target.value; reset(); }; U.$('#km-init', el).onchange = e => { method = e.target.value; reset(); };
    U.bindRange(el, 'km-k', v => { k = v; reset(); }); U.bindRange(el, 'km-scale', v => { scale = v; reset(); });
    U.$('#km-seed', el).onchange = e => { if (e.target.value !== '' && e.target.checkValidity()) { seed = Number(e.target.value); reset(); } };
    el.getSnapshot = () => ({ shape, k, seed, method, scale, points, centers, labels, phase, iteration, halfSteps, history, converged, running: loop.running, inertia: labels.length ? E.kmeansInertia(points, centers, labels) : null });
    reset(); return () => loop.dispose();
  };
})(globalThis);
