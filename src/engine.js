/* Original numerical teaching engine. No runtime dependencies. MIT license. */
(function (root) {
  'use strict';
  const E = {};
  E.assert = (ok, message) => { if (!ok) throw new Error(message); };
  E.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  E.rng = function (seed = 42) {
    let state = seed >>> 0;
    const next = () => { state = (state + 0x6D2B79F5) >>> 0; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    next.state = () => state;
    next.restore = s => { E.assert(Number.isInteger(s) && s >= 0 && s <= 0xffffffff, '随机状态无效'); state = s >>> 0; };
    return next;
  };
  E.normal = r => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
  E.shuffle = (array, r) => { const a = array.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  E.sigmoid = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  E.softplus = z => Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
  E.bceLogit = (z, y) => Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
  E.bce = (p, y) => -y * Math.log(E.clamp(p, 1e-12, 1 - 1e-12)) - (1 - y) * Math.log(E.clamp(1 - p, 1e-12, 1 - 1e-12));
  E.softmax = (values, temperature = 1) => {
    E.assert(Array.isArray(values) && values.length && temperature > 0 && Number.isFinite(temperature), 'Softmax 输入或温度无效');
    E.assert(values.every(x => Number.isFinite(x) || x === -Infinity), 'logit 必须有限或为负无穷');
    const max = Math.max(...values); E.assert(Number.isFinite(max), '至少保留一个未掩码元素');
    const exps = values.map(x => Math.exp((x - max) / temperature)); const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  };
  E.crossEntropy = (logits, target) => { E.assert(logits.every(Number.isFinite) && Number.isInteger(target) && target >= 0 && target < logits.length, '类别索引无效'); const m = Math.max(...logits); return m - logits[target] + Math.log(logits.reduce((s, x) => s + Math.exp(x - m), 0)); };
  E.activation = (z, name) => name === 'relu' ? Math.max(0, z) : name === 'linear' ? z : name === 'sigmoid' ? E.sigmoid(z) : Math.tanh(z);
  E.derivative = (z, name) => name === 'relu' ? (z > 0 ? 1 : 0) : name === 'linear' ? 1 : name === 'sigmoid' ? E.sigmoid(z) * (1 - E.sigmoid(z)) : 1 - Math.tanh(z) ** 2;
  E.dataset = (name = 'xor', n = 240, noise = 0.12, seed = 42) => {
    E.assert(['xor', 'circles', 'moons', 'spirals', 'linear'].includes(name), '未知数据集');
    E.assert(Number.isInteger(n) && n >= 8 && n <= 2000 && n % 2 === 0 && Number.isFinite(noise) && noise >= 0 && noise <= 1, '数据配置无效');
    const r = E.rng(seed), points = [];
    for (let i = 0; i < n; i++) {
      const y = i % 2; let x1, x2;
      if (name === 'xor') { const s = r() > 0.5 ? 1 : -1; x1 = s * (0.2 + r()); x2 = s * (y ? -1 : 1) * (0.2 + r()); }
      if (name === 'circles') { const a = r() * 2 * Math.PI, rad = y ? 0.43 : 1.12; x1 = rad * Math.cos(a); x2 = rad * Math.sin(a); }
      if (name === 'moons') { const a = r() * Math.PI; x1 = (y ? 1 - Math.cos(a) : Math.cos(a)) - 0.5; x2 = y ? 0.35 - Math.sin(a) : Math.sin(a) - 0.15; }
      if (name === 'spirals') { const t = r(), a = t * Math.PI * 2 + y * Math.PI, rad = 0.18 + t * 1.15; x1 = rad * Math.cos(a); x2 = rad * Math.sin(a); }
      if (name === 'linear') { x1 = (y ? 0.7 : -0.7) + E.normal(r) * 0.32; x2 = (y ? 0.5 : -0.5) + E.normal(r) * 0.32; }
      points.push({ id: i, x: [x1 + E.normal(r) * noise, x2 + E.normal(r) * noise], y });
    }
    const train = [], val = [];
    for (const c of [0, 1]) { const a = E.shuffle(points.filter(p => p.y === c), r); const cut = Math.floor(a.length * 0.75); train.push(...a.slice(0, cut)); val.push(...a.slice(cut)); }
    return { train: E.shuffle(train, r), val: E.shuffle(val, r), all: points };
  };
  E.regressionData = (n = 22, seed = 12) => { const r = E.rng(seed); return Array.from({ length: n }, (_, i) => { const x = -1.5 + i * 3 / (n - 1); return { x, y: 0.8 * x + 0.3 + E.normal(r) * 0.19 }; }); };
  E.regression = (data, w, b) => { let loss = 0, dw = 0, db = 0; for (const p of data) { const d = w * p.x + b - p.y; loss += d * d; dw += 2 * d * p.x; db += 2 * d; } return { loss: loss / data.length, dw: dw / data.length, db: db / data.length }; };
  E.singleNeuron = (x, w, b, y) => { const z = x * w + b, p = E.sigmoid(z), dz = p - y; return { z, p, loss: E.bceLogit(z, y), dz, dw: dz * x, db: dz }; };
  E.finiteDifference = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);
  class MLP {
    constructor(sizes = [2, 8, 8, 1], activation = 'tanh', seed = 42) {
      E.assert(Array.isArray(sizes) && sizes.length >= 2 && sizes.length <= 5 && sizes[0] === 2 && sizes.at(-1) === 1 && sizes.every(n => Number.isInteger(n) && n >= 1 && n <= 12), '网络结构超出范围');
      E.assert(['tanh', 'relu', 'linear'].includes(activation), '未知激活函数');
      this.sizes = sizes.slice(); this.activation = activation; this.t = 0; const r = E.rng(seed);
      this.layers = sizes.slice(1).map((nout, l) => {
        const nin = sizes[l], bound = Math.sqrt(6 / (activation === 'relu' && l < sizes.length - 2 ? nin : nin + nout));
        const zeroW = () => Array(nin * nout).fill(0), zeroB = () => Array(nout).fill(0);
        return { nin, nout, w: zeroW().map(() => (r() * 2 - 1) * bound), b: zeroB(), mw: zeroW(), vw: zeroW(), mb: zeroB(), vb: zeroB() };
      });
    }
    get count() { return this.layers.reduce((n, l) => n + l.w.length + l.b.length, 0); }
    forward(input) {
      E.assert(input.length === 2 && input.every(Number.isFinite), '输入需要两个有限数字');
      const a = [input.slice()], z = [];
      this.layers.forEach((l, k) => { const row = Array(l.nout).fill(0); for (let j = 0; j < l.nout; j++) { let s = l.b[j]; for (let i = 0; i < l.nin; i++) s += l.w[j * l.nin + i] * a[k][i]; row[j] = s; } z.push(row); a.push(row.map(v => k === this.layers.length - 1 ? E.sigmoid(v) : E.activation(v, this.activation))); });
      return { a, z, p: a.at(-1)[0], logit: z.at(-1)[0] };
    }
    predict(input) { return this.forward(input).p; }
    evaluate(data) { E.assert(data.length > 0, '数据不能为空'); let loss = 0, correct = 0; for (const p of data) { const f = this.forward(p.x); loss += E.bceLogit(f.logit, p.y); correct += Number((f.p >= 0.5 ? 1 : 0) === p.y); } return { loss: loss / data.length, accuracy: correct / data.length }; }
    gradients(batch, lambda = 0) {
      E.assert(batch.length > 0 && Number.isFinite(lambda) && lambda >= 0, '批量或正则强度无效');
      const g = this.layers.map(l => ({ w: Array(l.w.length).fill(0), b: Array(l.b.length).fill(0) })); let loss = 0;
      for (const item of batch) {
        E.assert(item.y === 0 || item.y === 1, '标签只能为 0 或 1');
        const f = this.forward(item.x); loss += E.bceLogit(f.logit, item.y); let delta = [f.p - item.y];
        for (let k = this.layers.length - 1; k >= 0; k--) {
          const l = this.layers[k];
          for (let j = 0; j < l.nout; j++) { g[k].b[j] += delta[j]; for (let i = 0; i < l.nin; i++) g[k].w[j * l.nin + i] += delta[j] * f.a[k][i]; }
          if (k) { const prev = Array(l.nin).fill(0); for (let i = 0; i < l.nin; i++) { for (let j = 0; j < l.nout; j++) prev[i] += l.w[j * l.nin + i] * delta[j]; prev[i] *= E.derivative(f.z[k - 1][i], this.activation); } delta = prev; }
        }
      }
      let penalty = 0;
      this.layers.forEach((l, k) => { g[k].w = g[k].w.map((v, i) => { penalty += lambda * l.w[i] ** 2 / 2; return v / batch.length + lambda * l.w[i]; }); g[k].b = g[k].b.map(v => v / batch.length); });
      return { layers: g, loss: loss / batch.length, objective: loss / batch.length + penalty };
    }
    trainBatch(batch, options = {}) {
      const { lr = 0.03, optimizer = 'adam', lambda = 0 } = options;
      E.assert(Number.isFinite(lr) && lr > 0 && lr <= 1 && ['sgd', 'adam'].includes(optimizer), '优化器配置无效');
      const gradients = this.gradients(batch, lambda), t = this.t + 1;
      // Calculate all candidate values before mutating: divergence must not leave a partial update.
      const next = this.layers.map((l, k) => { const n = { ...l }; for (const field of ['w', 'b']) { const mkey = 'm' + field, vkey = 'v' + field; n[field] = l[field].slice(); n[mkey] = l[mkey].slice(); n[vkey] = l[vkey].slice(); l[field].forEach((w, i) => { const g = gradients.layers[k][field][i]; if (optimizer === 'adam') { n[mkey][i] = 0.9 * l[mkey][i] + 0.1 * g; n[vkey][i] = 0.999 * l[vkey][i] + 0.001 * g * g; n[field][i] -= lr * (n[mkey][i] / (1 - 0.9 ** t)) / (Math.sqrt(n[vkey][i] / (1 - 0.999 ** t)) + 1e-8); } else n[field][i] -= lr * g; E.assert(Number.isFinite(n[field][i]) && Math.abs(n[field][i]) <= 1e6 && Number.isFinite(n[mkey][i]) && Number.isFinite(n[vkey][i]), '训练已发散；请降低学习率并重置'); }); } return n; });
      this.layers = next; this.t = t; return gradients.loss;
    }
    epoch(data, options = {}, random = E.rng(42)) { const batch = options.batch || 16; E.assert(Number.isInteger(batch) && batch > 0 && batch <= 2048, '批量大小无效'); const shuffled = E.shuffle(data, random); for (let i = 0; i < shuffled.length; i += batch) this.trainBatch(shuffled.slice(i, i + batch), options); }
    state() { return JSON.parse(JSON.stringify({ sizes: this.sizes, activation: this.activation, t: this.t, layers: this.layers })); }
    static fromState(state) {
      E.assert(state && typeof state === 'object', '模型文件格式错误');
      const m = new MLP(state.sizes, state.activation);
      E.assert(Number.isInteger(state.t) && state.t >= 0 && state.t <= 1e8 && Array.isArray(state.layers) && state.layers.length === m.layers.length, '优化器状态无效');
      m.layers.forEach((l, k) => { const source = state.layers[k]; E.assert(source && source.nin === l.nin && source.nout === l.nout, '权重形状不匹配'); for (const key of ['w', 'b', 'mw', 'vw', 'mb', 'vb']) { const a = source[key]; E.assert(Array.isArray(a) && a.length === l[key].length && a.every(v => Number.isFinite(v) && Math.abs(v) <= 1e12 && (!(key === 'vw' || key === 'vb') || v >= 0)), '权重或动量数据无效'); l[key] = a.slice(); } }); m.t = state.t; return m;
    }
  }
  E.MLP = MLP;
  E.chebyshev = (x, degree) => { const a = [1]; if (degree) a.push(x); for (let i = 2; i <= degree; i++) a.push(2 * x * a[i - 1] - a[i - 2]); return a; };
  E.solve = (A, b) => {
    const n = b.length, a = A.map((row, i) => [...row, b[i]]);
    for (let k = 0; k < n; k++) { let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i; [a[k], a[p]] = [a[p], a[k]]; E.assert(Math.abs(a[k][k]) > 1e-12, '拟合矩阵接近奇异；请降低阶数或增加正则'); const d = a[k][k]; for (let j = k; j <= n; j++) a[k][j] /= d; for (let i = 0; i < n; i++) if (i !== k) { const f = a[i][k]; for (let j = k; j <= n; j++) a[i][j] -= f * a[k][j]; } }
    return a.map(row => row[n]);
  };
  E.polyfit = (data, degree, lambda = 0) => {
    E.assert(Number.isInteger(degree) && degree >= 0 && degree <= 12 && Number.isFinite(lambda) && lambda >= 0 && data.length > degree, '多项式配置无效');
    const n = degree + 1, A = Array.from({ length: n }, () => Array(n).fill(0)), b = Array(n).fill(0);
    for (const p of data) { const f = E.chebyshev(p.x, degree); for (let i = 0; i < n; i++) { b[i] += f[i] * p.y / data.length; for (let j = 0; j < n; j++) A[i][j] += f[i] * f[j] / data.length; } }
    for (let i = 1; i < n; i++) A[i][i] += lambda;
    return E.solve(A, b);
  };
  E.polyval = (weights, x) => E.chebyshev(x, weights.length - 1).reduce((s, a, i) => s + a * weights[i], 0);
  E.metrics = (data, threshold) => { let tp = 0, fp = 0, tn = 0, fn = 0; for (const p of data) { if (p.score >= threshold) { if (p.y) tp++; else fp++; } else { if (p.y) fn++; else tn++; } } const precision = tp + fp ? tp / (tp + fp) : null, recall = tp + fn ? tp / (tp + fn) : null; return { tp, fp, tn, fn, precision, recall, accuracy: data.length ? (tp + tn) / data.length : null, f1: 2 * tp + fp + fn ? 2 * tp / (2 * tp + fp + fn) : null }; };
  E.correlate = (image, kernel, stride = 1, padding = 0) => { const n = image.length, k = kernel.length, size = Math.floor((n + 2 * padding - k) / stride) + 1; E.assert(Number.isInteger(stride) && stride >= 1 && Number.isInteger(padding) && padding >= 0 && size > 0 && image.every(row => row.length === n && row.every(Number.isFinite)) && kernel.every(row => row.length === k && row.every(Number.isFinite)), '图像或卷积配置无效'); return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => { let sum = 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) sum += (image[y * stride + j - padding]?.[x * stride + i - padding] || 0) * kernel[j][i]; return sum; })); };
  E.attention = (Q, K, V, causal = false) => { E.assert(Q.length && Q.length === K.length && K.length === V.length && Q.every(q => q.length === K[0].length), '注意力形状无效'); const weights = Q.map((q, row) => E.softmax(K.map((k, col) => causal && col > row ? -Infinity : k.reduce((s, v, i) => s + v * q[i], 0) / Math.sqrt(q.length)))); const output = weights.map(w => V[0].map((_, j) => w.reduce((s, a, i) => s + a * V[i][j], 0))); return { weights, output }; };
  E.topK = (logits, k, temperature = 1) => { E.assert(Number.isInteger(k) && k >= 1 && k <= logits.length, 'top-k 超出范围'); const ids = logits.map((_, i) => i).sort((a, b) => logits[b] - logits[a]).slice(0, k); return E.softmax(logits.map((v, i) => ids.includes(i) ? v : -Infinity), temperature); };
  E.sample = (probabilities, r = Math.random) => { const u = r(); let sum = 0; for (let i = 0; i < probabilities.length; i++) { sum += probabilities[i]; if (u < sum) return i; } return probabilities.length - 1; };
  root.AI = Object.assign(root.AI || {}, { E });
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(globalThis);
