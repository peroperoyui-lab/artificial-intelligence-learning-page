/* A tiny trainable causal decoder, not pretrained. Original scalar reverse-mode AD. */
(function (root) {
  'use strict';
  const E = root.AI.E, L = root.AI.L;
  class Tape {
    constructor() { this.values = []; this.edges = []; }
    node(value, edges = []) { const id = this.values.length; this.values.push(value); this.edges.push(edges); return id; }
    add(a, b) { return this.node(this.values[a] + this.values[b], [[a, 1], [b, 1]]); }
    mul(a, b) { return this.node(this.values[a] * this.values[b], [[a, this.values[b]], [b, this.values[a]]]); }
    scale(a, s) { return this.node(this.values[a] * s, [[a, s]]); }
    exp(a) { const v = Math.exp(this.values[a]); return this.node(v, [[a, v]]); }
    log(a) { return this.node(Math.log(this.values[a]), [[a, 1 / this.values[a]]]); }
    power(a, p) { return this.node(this.values[a] ** p, [[a, p * this.values[a] ** (p - 1)]]); }
    relu(a) { return this.node(Math.max(0, this.values[a]), [[a, this.values[a] > 0 ? 1 : 0]]); }
    sum(ids) { return ids.reduce((a, b) => this.add(a, b), this.node(0)); }
    dot(a, b) { return this.sum(a.map((x, i) => this.mul(x, b[i]))); }
    softmax(ids) {
      const max = Math.max(...ids.map(i => this.values[i]));
      const exp = ids.map(i => this.exp(this.add(i, this.node(-max)))), inv = this.power(this.sum(exp), -1);
      return exp.map(e => this.mul(e, inv));
    }
    ce(ids, target) {
      const max = Math.max(...ids.map(i => this.values[i]));
      const shifted = ids.map(i => this.add(i, this.node(-max)));
      return this.add(this.log(this.sum(shifted.map(i => this.exp(i)))), this.scale(shifted[target], -1));
    }
    backward(loss) {
      const g = new Float64Array(this.values.length); g[loss] = 1;
      for (let i = this.values.length - 1; i >= 0; i--) for (const [parent, slope] of this.edges[i]) g[parent] += g[i] * slope;
      return g;
    }
  }
  class MicroGPT {
    static vocabulary = ['<BOS>', '<EOS>', '红', '蓝', '小', '猫', '鸟', '吃', '鱼', '米', '。'];
    static trainText = ['猫吃鱼。', '鸟吃米。', '红猫吃鱼。', '蓝鸟吃米。', '小猫吃鱼。', '小鸟吃米。'];
    static validationText = ['蓝猫吃鱼。', '红鸟吃米。'];
    constructor(seed = 42) {
      E.assert(Number.isInteger(seed) && seed >= 0 && seed <= 9999, '种子需为 0–9999');
      this.seed = seed; this.steps = 0; this.p = []; this.shapes = {}; this.offsets = {}; this.random = E.rng(seed);
      const allocate = (name, rows, columns, kind = 'weight') => {
        this.offsets[name] = this.p.length; this.shapes[name] = [rows, columns];
        for (let i = 0; i < rows * columns; i++) this.p.push(kind === 'gain' ? 1 : (this.random() * 2 - 1) * (name === 'position' ? .1 : Math.sqrt(1 / columns)));
      };
      allocate('embedding', 11, 4); allocate('position', 8, 4);
      for (const name of ['query', 'key', 'value', 'attentionOut']) allocate(name, 4, 4);
      allocate('norm1', 1, 4, 'gain'); allocate('norm2', 1, 4, 'gain'); allocate('normFinal', 1, 4, 'gain');
      allocate('ffUp', 8, 4); allocate('ffDown', 4, 8); allocate('languageHead', 11, 4);
      this.m = this.p.map(() => 0); this.v = this.p.map(() => 0); this.lastGradNorm = null;
    }
    encode(text, end = false) {
      E.assert(typeof text === 'string' && Array.from(text).length <= 7, '前缀最多 7 个词表字符');
      const ids = Array.from(text).map(c => MicroGPT.vocabulary.indexOf(c));
      E.assert(ids.every(i => i >= 2), '只支持词表中的颜色、动物、“吃”、食物与句号');
      return [0, ...ids, ...(end ? [1] : [])];
    }
    forward(ids, targets = null, needGradient = false) {
      E.assert(Array.isArray(ids) && ids.length > 0 && ids.length <= 8 && ids.every(i => Number.isInteger(i) && i >= 0 && i < 11), '模型只处理 1–8 个有效编号');
      if (targets) E.assert(targets.length === ids.length && targets.every(i => Number.isInteger(i) && i >= 0 && i < 11), '标签长度或编号无效');
      const t = new Tape(), params = this.p.map(p => t.node(p));
      const weight = name => { const [rows, cols] = this.shapes[name], off = this.offsets[name]; return Array.from({ length: rows }, (_, i) => params.slice(off + i * cols, off + (i + 1) * cols)); };
      const linear = (x, w) => w.map(row => t.dot(x, row));
      const rms = (x, gain) => {
        const inv = t.power(t.add(t.scale(t.sum(x.map(i => t.mul(i, i))), 1 / x.length), t.node(1e-5)), -.5);
        return x.map((v, i) => t.mul(t.mul(v, inv), gain[i]));
      };
      const emb = weight('embedding'), pos = weight('position');
      const input = ids.map((id, i) => emb[id].map((e, j) => t.add(e, pos[i][j])));
      const normalized = input.map(x => rms(x, weight('norm1')[0]));
      const Q = normalized.map(x => linear(x, weight('query'))), K = normalized.map(x => linear(x, weight('key'))), V = normalized.map(x => linear(x, weight('value')));
      const attention = [], hidden = input.map((x, i) => {
        const probs = t.softmax(K.slice(0, i + 1).map(k => t.scale(t.dot(Q[i], k), .5)));
        attention.push([...probs.map(p => t.values[p]), ...Array(ids.length - i - 1).fill(0)]);
        const mixed = x.map((_, j) => t.sum(probs.map((p, k) => t.mul(p, V[k][j]))));
        const projected = linear(mixed, weight('attentionOut')); return x.map((v, j) => t.add(v, projected[j]));
      });
      const output = hidden.map(x => {
        const n = rms(x, weight('norm2')[0]);
        const ff = linear(linear(n, weight('ffUp')).map(i => t.relu(i)), weight('ffDown'));
        return rms(x.map((v, j) => t.add(v, ff[j])), weight('normFinal')[0]);
      });
      const logits = output.map(x => linear(x, weight('languageHead'))), numeric = logits.map(row => row.map(i => t.values[i]));
      let loss = null, gradients = null;
      if (targets) {
        const objective = t.scale(t.sum(logits.map((row, i) => t.ce(row, targets[i]))), 1 / targets.length);
        loss = t.values[objective];
        if (needGradient) gradients = Array.from(t.backward(objective).slice(0, this.p.length));
      }
      return { logits: numeric, probabilities: numeric.map(row => E.softmax(row)), attention, loss, gradients, nodes: t.values.length };
    }
    sentence(text, gradients = false) { const ids = this.encode(text, true); return this.forward(ids.slice(0, -1), ids.slice(1), gradients); }
    evaluate(texts) {
      let total = 0, count = 0;
      for (const text of texts) { const n = Array.from(text).length + 1; total += this.sentence(text).loss * n; count += n; }
      return total / count;
    }
    step(lr = .02) {
      E.assert(Number.isFinite(lr) && lr >= .001 && lr <= .05 && this.steps < 600, '学习率需为 .001–.05，最多更新 600 步');
      const text = MicroGPT.trainText[this.steps % MicroGPT.trainText.length], result = this.sentence(text, true);
      const norm = Math.sqrt(result.gradients.reduce((s, x) => s + x * x, 0)), factor = Math.min(1, 1 / (norm + 1e-12)), step = this.steps + 1;
      const g = result.gradients.map(x => x * factor), m = this.m.map((x, i) => .9 * x + .1 * g[i]), v = this.v.map((x, i) => .999 * x + .001 * g[i] ** 2);
      const next = this.p.map((x, i) => x - lr * (m[i] / (1 - .9 ** step)) / (Math.sqrt(v[i] / (1 - .999 ** step)) + 1e-8));
      E.assert(Number.isFinite(result.loss) && next.every(Number.isFinite) && m.every(Number.isFinite) && v.every(Number.isFinite), '数值异常，未应用本次更新');
      this.p = next; this.m = m; this.v = v; this.steps = step; this.lastGradNorm = norm;
      return { loss: result.loss, gradNorm: norm, sentence: text, nodes: result.nodes };
    }
    generate(prefix = '', temperature = .7, topP = .95, seed = 7) {
      let ids = this.encode(prefix), text = prefix, reason = '达到 8 位置预算', history = [], random = E.rng(seed);
      while (ids.length <= 8) {
        const z = this.forward(ids).logits.at(-1);
        // BOS is input-only during generation; renormalize the remaining vocabulary.
        const sample = L.nucleus(z.slice(1), temperature, 10, topP), chosen = E.sample(sample.probabilities, random) + 1;
        history.push({ context: ids.slice(), chosen, probability: sample.probabilities[chosen - 1] });
        if (chosen === 1) { reason = '模型选择 EOS'; break; }
        text += MicroGPT.vocabulary[chosen]; ids.push(chosen);
      }
      return { text, reason, history };
    }
    exportState() { return { format: 'visible-microgpt-v1', seed: this.seed, steps: this.steps, p: this.p.slice(), m: this.m.slice(), v: this.v.slice() }; }
    static fromState(s) {
      E.assert(s && s.format === 'visible-microgpt-v1' && Number.isInteger(s.steps) && s.steps >= 0 && s.steps <= 600, '不支持的微型语言模型文件');
      const model = new MicroGPT(s.seed);
      for (const k of ['p', 'm', 'v']) E.assert(Array.isArray(s[k]) && s[k].length === model.p.length && s[k].every(x => Number.isFinite(x) && Math.abs(x) <= 1e5 && (k !== 'v' || x >= 0)), '权重或优化器状态无效');
      model.p = s.p.slice(); model.m = s.m.slice(); model.v = s.v.slice(); model.steps = s.steps; return model;
    }
  }
  L.Tape = Tape; L.MicroGPT = MicroGPT;
  if (typeof module !== 'undefined' && module.exports) module.exports = MicroGPT;
})(globalThis);
