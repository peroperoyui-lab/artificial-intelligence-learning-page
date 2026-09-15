/* Small, inspectable CPU experiments. Original implementation, MIT. */
(function (root) {
  'use strict';
  const E = root.AI.E;
  const matrix = (a, max = 64) => Array.isArray(a) && a.length > 0 && a.length <= max &&
    Array.isArray(a[0]) && a[0].length > 0 && a[0].length <= max &&
    a.every(row => Array.isArray(row) && row.length === a[0].length && row.every(Number.isFinite));
  E.matmul = (a, b) => {
    E.assert(matrix(a) && matrix(b) && a[0].length === b.length, '矩阵形状不匹配或包含非有限数值');
    return a.map(row => b[0].map((_, j) => row.reduce((sum, x, k) => sum + x * b[k][j], 0)));
  };
  E.layerNorm = (rows, epsilon = 1e-5) => {
    E.assert(matrix(rows) && Number.isFinite(epsilon) && epsilon > 0, 'LayerNorm 输入无效');
    // Population variance over each token's feature dimension; gamma=1, beta=0.
    return rows.map(row => {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance = row.reduce((s, x) => s + (x - mean) ** 2, 0) / row.length;
      return row.map(x => (x - mean) / Math.sqrt(variance + epsilon));
    });
  };
  E.positionEncoding = (length, width = 4) => {
    E.assert(Number.isInteger(length) && length >= 1 && length <= 8 && Number.isInteger(width) && width >= 2 && width <= 8 && width % 2 === 0, '位置编码形状超出教学上限');
    return Array.from({ length }, (_, p) => Array.from({ length: width }, (_, j) => {
      const angle = p / 10000 ** (2 * Math.floor(j / 2) / width);
      return j % 2 ? Math.cos(angle) : Math.sin(angle);
    }));
  };
  E.tinyVocabulary = ['我', '你', '喜欢', '学习', '模型', '今天', '很', '。'];
  E.tinyTransformer = (tokens, config = {}) => {
    const { heads = 2, causal = true, position = true, residual = true, norm = true, seed = 42 } = config;
    E.assert(Array.isArray(tokens) && tokens.length >= 1 && tokens.length <= 8 && tokens.every(x => Number.isInteger(x) && x >= 0 && x < 8), '仅接受 1–8 个教学词表编号');
    E.assert([1, 2].includes(heads) && Number.isInteger(seed) && seed >= 0 && seed <= 9999, '注意力头数或种子无效');
    E.assert([causal, position, residual, norm].every(x => typeof x === 'boolean'), '消融开关需要布尔值');
    const r = E.rng(seed), randomMatrix = (n, m) => Array.from({ length: n }, () => Array.from({ length: m }, () => (r() * 2 - 1) * Math.sqrt(3 / n)));
    const embeddingTable = randomMatrix(8, 4), Wq = randomMatrix(4, 4), Wk = randomMatrix(4, 4), Wv = randomMatrix(4, 4), Wo = randomMatrix(4, 4);
    const W1 = randomMatrix(4, 8), W2 = randomMatrix(8, 4), Wout = randomMatrix(4, 8);
    // Fixed seeded weights, zero biases, no dropout. This is NOT a pretrained model.
    const embedding = tokens.map(t => embeddingTable[t].map(x => x * 2));
    const pe = E.positionEncoding(tokens.length), add = (a, b) => a.map((row, i) => row.map((x, j) => x + b[i][j]));
    const input = position ? add(embedding, pe) : embedding.map(row => row.slice());
    const Q = E.matmul(input, Wq), K = E.matmul(input, Wk), V = E.matmul(input, Wv), dk = 4 / heads;
    const headResults = Array.from({ length: heads }, (_, h) => {
      const slice = a => a.map(row => row.slice(h * dk, (h + 1) * dk));
      const q = slice(Q), k = slice(K), v = slice(V);
      const scores = q.map(row => k.map(key => row.reduce((s, x, i) => s + x * key[i], 0) / Math.sqrt(dk)));
      return { Q: q, K: k, V: v, scores, ...E.attention(q, k, v, causal) };
    });
    const concat = input.map((_, i) => headResults.flatMap(h => h.output[i]));
    const projected = E.matmul(concat, Wo), residual1 = residual ? add(input, projected) : projected;
    const hidden = norm ? E.layerNorm(residual1) : residual1.map(row => row.slice());
    const ffPre = E.matmul(hidden, W1), ffActivation = ffPre.map(row => row.map(x => Math.max(0, x)));
    const ff = E.matmul(ffActivation, W2), residual2 = residual ? add(hidden, ff) : ff;
    const output = norm ? E.layerNorm(residual2) : residual2.map(row => row.slice());
    const logits = E.matmul(output, Wout), probabilities = logits.map(row => E.softmax(row));
    return { tokens: tokens.slice(), embeddingTable, weights: { Wq, Wk, Wv, Wo, W1, W2, Wout }, embedding, pe, input, Q, K, V, heads: headResults,
      concat, projected, residual1, hidden, ffPre, ffActivation, ff, residual2, output, logits, probabilities,
      parameters: 228, dk, config: { heads, causal, position, residual, norm, seed } };
  };
  E.pool2d = (image, mode = 'max', size = 2, stride = 2) => {
    E.assert(matrix(image, 16) && ['max', 'average'].includes(mode) && Number.isInteger(size) && size >= 1 && size <= 4 && Number.isInteger(stride) && stride >= 1 && stride <= 4, '池化配置无效');
    const h = Math.floor((image.length - size) / stride) + 1, w = Math.floor((image[0].length - size) / stride) + 1;
    E.assert(h > 0 && w > 0, '池化窗口大于输入');
    return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
      const values = [];
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) values.push(image[y * stride + j][x * stride + i]);
      return mode === 'max' ? Math.max(...values) : values.reduce((a, b) => a + b, 0) / values.length;
    }));
  };
  E.visionKernels = [
    { name: '横向亮度差 / Sobel x', values: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]].map(row => row.map(x => x / 4)) },
    { name: '纵向亮度差 / Sobel y', values: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]].map(row => row.map(x => x / 4)) },
    { name: '局部亮度差 / Laplacian', values: [[0, 1, 0], [1, -4, 1], [0, 1, 0]].map(row => row.map(x => x / 4)) }
  ];
  E.visionFeatures = (image, pooling = 'max') => {
    E.assert(matrix(image, 8) && image.length === 8 && image[0].length === 8 && image.flat().every(x => x >= 0 && x <= 1), '输入必须是 8×8 且像素在 0–1 内');
    const conv = E.visionKernels.map(k => E.correlate(image, k.values, 1, 1));
    const activated = conv.map(m => m.map(row => row.map(x => Math.max(0, x))));
    const pooled = activated.map(m => E.pool2d(m, pooling));
    return { conv, activated, pooled, flat: pooled.flat(2) };
  };
  E.lineImage = (kind = 0, shift = 3, noise = 0, random = E.rng(42)) => {
    E.assert(Number.isInteger(kind) && kind >= 0 && kind <= 3 && Number.isInteger(shift) && shift >= 1 && shift <= 6 && Number.isFinite(noise) && noise >= 0 && noise <= .5, '图案参数无效');
    return Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => {
      const on = kind === 0 ? x === shift : kind === 1 ? y === shift : kind === 2 ? x === y + shift - 3 : false;
      return E.clamp((on ? 1 : 0) + (random() * 2 - 1) * noise, 0, 1);
    }));
  };
  E.visionDataset = (pooling = 'max', seed = 42) => {
    const r = E.rng(seed), train = [], val = [];
    for (let y = 0; y < 3; y++) {
      const items = Array.from({ length: 40 }, (_, i) => {
        const image = E.lineImage(y, 1 + Math.floor(r() * 6), .18, r);
        return { id: y * 40 + i, x: E.visionFeatures(image, pooling).flat, y };
      });
      const shuffled = E.shuffle(items, r); train.push(...shuffled.slice(0, 30)); val.push(...shuffled.slice(30));
    }
    return { train, val };
  };
  class SoftmaxHead {
    constructor(width = 48, classes = 3, seed = 42) {
      E.assert(Number.isInteger(width) && width >= 1 && width <= 64 && Number.isInteger(classes) && classes >= 2 && classes <= 8, '分类头尺寸超出教学上限');
      this.width = width; this.classes = classes;
      const r = E.rng(seed); this.w = Array.from({ length: classes }, () => Array.from({ length: width }, () => (r() - .5) * .1));
      this.b = Array(classes).fill(0);
    }
    logits(x) {
      E.assert(Array.isArray(x) && x.length === this.width && x.every(Number.isFinite), '分类头输入无效');
      return this.w.map((row, j) => row.reduce((s, w, i) => s + w * x[i], this.b[j]));
    }
    predict(x) { return E.softmax(this.logits(x)); }
    gradients(data) {
      E.assert(Array.isArray(data) && data.length > 0 && data.length <= 512, '样本数无效');
      const w = this.w.map(row => row.map(() => 0)), b = this.b.map(() => 0); let loss = 0;
      for (const item of data) {
        E.assert(Number.isInteger(item.y) && item.y >= 0 && item.y < this.classes, '类别编号无效');
        const z = this.logits(item.x), p = E.softmax(z); loss += E.crossEntropy(z, item.y);
        for (let j = 0; j < this.classes; j++) {
          const d = (p[j] - Number(j === item.y)) / data.length; b[j] += d;
          item.x.forEach((x, i) => { w[j][i] += d * x; });
        }
      }
      return { w, b, loss: loss / data.length };
    }
    step(data, lr = .4) {
      E.assert(Number.isFinite(lr) && lr > 0 && lr <= 1, '学习率必须在 0–1 内');
      const g = this.gradients(data), w = this.w.map((row, j) => row.map((x, i) => x - lr * g.w[j][i])), b = this.b.map((x, j) => x - lr * g.b[j]);
      E.assert(w.flat().every(Number.isFinite) && b.every(Number.isFinite), '数值溢出，本次更新未应用');
      this.w = w; this.b = b;
    }
    evaluate(data) {
      E.assert(Array.isArray(data) && data.length > 0, '评价样本不能为空');
      let loss = 0, correct = 0;
      for (const item of data) { const z = this.logits(item.x); loss += E.crossEntropy(z, item.y); correct += Number(z.indexOf(Math.max(...z)) === item.y); }
      return { loss: loss / data.length, accuracy: correct / data.length };
    }
  }
  E.SoftmaxHead = SoftmaxHead;
  const sqDistance = (a, b) => a.reduce((s, x, j) => s + (x - b[j]) ** 2, 0);
  const validatePoints = points => E.assert(matrix(points, 256) && points[0].length === 2 && points.flat().every(x => Math.abs(x) <= 100), '聚类需要有界的二维点');
  E.kmeansAssign = (points, centers) => {
    validatePoints(points); validatePoints(centers); E.assert(centers.length <= 6, '最多 6 个簇');
    return points.map(p => { const ds = centers.map(c => sqDistance(p, c)); return ds.indexOf(Math.min(...ds)); });
  };
  E.kmeansUpdate = (points, centers, labels) => {
    validatePoints(points); validatePoints(centers);
    E.assert(centers.length <= 6 && labels.length === points.length && labels.every(j => Number.isInteger(j) && j >= 0 && j < centers.length), '簇分配无效');
    return centers.map((old, j) => {
      const group = points.filter((_, i) => labels[i] === j);
      // Explicit empty-cluster convention: retain its previous center.
      return group.length ? old.map((_, d) => group.reduce((sum, x) => sum + x[d], 0) / group.length) : old.slice();
    });
  };
  E.kmeansInertia = (points, centers, labels) => points.reduce((s, p, i) => s + sqDistance(p, centers[labels[i]]), 0);
  E.kmeansInit = (points, count, seed = 42, method = 'plus') => {
    validatePoints(points); E.assert(Number.isInteger(count) && count >= 1 && count <= Math.min(6, points.length) && ['plus', 'random'].includes(method), '初始化配置无效');
    const r = E.rng(seed);
    if (method === 'random') return E.shuffle(points, r).slice(0, count).map(p => p.slice());
    const ids = [Math.floor(r() * points.length)];
    while (ids.length < count) {
      const distances = points.map((p, i) => ids.includes(i) ? 0 : Math.min(...ids.map(j => sqDistance(p, points[j]))));
      const sum = distances.reduce((a, b) => a + b, 0);
      const chosen = sum > 0 ? E.sample(distances.map(x => x / sum), r) : points.findIndex((_, i) => !ids.includes(i));
      ids.push(chosen);
    }
    return ids.map(i => points[i].slice());
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(globalThis);
