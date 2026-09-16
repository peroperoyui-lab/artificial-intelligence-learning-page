/* Inspectable LLM mechanisms. Bounded CPU calculations, original implementation. */
(function (root) {
  'use strict';
  const E = root.AI.E, L = {};
  const ok = E.assert, sum = a => a.reduce((s, x) => s + x, 0);
  const integer = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
  const finite = (x, a, b) => Number.isFinite(x) && x >= a && x <= b;
  L.dot = (a, b) => sum(a.map((x, i) => x * b[i]));
  L.bpe = (text, merges = 0) => {
    ok(typeof text === 'string' && text.length <= 800 && integer(merges, 0, 24), '语料最多 800 字符，最多 24 次合并');
    // Spaces/newlines remain standalone boundaries: reversible without inventing a tokenizer.
    let pieces = Array.from(text), history = [];
    for (let step = 0; step < merges; step++) {
      const counts = new Map();
      for (let i = 0; i < pieces.length - 1; i++) {
        if (/\s/u.test(pieces[i] + pieces[i + 1])) continue;
        const key = JSON.stringify([pieces[i], pieces[i + 1]]);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const candidates = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      if (!candidates.length || candidates[0][1] < 2) break;
      const [key, frequency] = candidates[0], pair = JSON.parse(key), next = []; let replacements = 0;
      for (let i = 0; i < pieces.length; i++) {
        if (pieces[i] === pair[0] && pieces[i + 1] === pair[1]) { next.push(pair.join('')); i++; replacements++; }
        else next.push(pieces[i]);
      }
      history.push({ pair, frequency, replacements, before: pieces.length, after: next.length }); pieces = next;
    }
    return { pieces, history, original: Array.from(text).length, count: pieces.length, vocabulary: [...new Set(pieces)] };
  };
  L.maskedLoss = (probabilities, mask) => {
    ok(Array.isArray(probabilities) && probabilities.length <= 64 && probabilities.length === mask.length && probabilities.every(p => finite(p, 1e-12, 1)) && mask.every(m => m === 0 || m === 1), '概率与掩码无效');
    const losses = probabilities.map(p => -Math.log(p)), count = sum(mask);
    const loss = count ? sum(losses.map((l, i) => l * mask[i])) / count : null;
    return { losses, count, loss, perplexity: loss === null ? null : Math.exp(loss) };
  };
  L.pack = (documents, capacity = 12, deduplicate = true) => {
    ok(Array.isArray(documents) && documents.length <= 20 && documents.every(s => typeof s === 'string' && s.length <= 200) && integer(capacity, 2, 64), '文档或窗口超出上限');
    const seen = new Set(), kept = documents.filter(s => { const key = s.trim(); if (!key || (deduplicate && seen.has(key))) return false; seen.add(key); return true; });
    const tokens = kept.flatMap((s, id) => [...Array.from(s.trim()), '<EOS>'].map(text => ({ text, document: id })));
    const rows = [];
    for (let i = 0; i < tokens.length; i += capacity) { const row = tokens.slice(i, i + capacity); while (row.length < capacity) row.push({ text: '<PAD>', document: -1 }); rows.push(row); }
    return { kept, tokens: tokens.length, rows, slots: rows.length * capacity, utilization: rows.length ? tokens.length / (rows.length * capacity) : 0 };
  };
  L.rope = (vector, position, base = 10000) => {
    ok(Array.isArray(vector) && vector.length >= 2 && vector.length <= 16 && vector.length % 2 === 0 && vector.every(Number.isFinite) && finite(position, -100000, 100000) && finite(base, 2, 1e6), 'RoPE 输入无效');
    return vector.flatMap((_, i) => {
      if (i % 2) return [];
      const angle = position / base ** (i / vector.length), c = Math.cos(angle), s = Math.sin(angle);
      return [vector[i] * c - vector[i + 1] * s, vector[i] * s + vector[i + 1] * c];
    });
  };
  L.norms = vector => {
    ok(Array.isArray(vector) && vector.length >= 1 && vector.length <= 32 && vector.every(x => finite(x, -1e6, 1e6)), '归一化输入无效');
    const mean = sum(vector) / vector.length, rms = Math.sqrt(sum(vector.map(x => x * x)) / vector.length + 1e-5);
    return { mean, rms, rmsNorm: vector.map(x => x / rms), layerNorm: E.layerNorm([vector])[0] };
  };
  L.swiglu = (gate, up) => gate.map((g, i) => g * E.sigmoid(g) * up[i]);
  L.cachedAttention = (tokens = 5) => {
    ok(integer(tokens, 1, 16), '最多 16 个位置');
    const r = E.rng(71), make = () => Array.from({ length: tokens }, () => [r() * 2 - 1, r() * 2 - 1]);
    const Q = make(), K = make(), V = make(), full = E.attention(Q, K, V, true), cached = []; let keys = [], values = [];
    for (let t = 0; t < tokens; t++) {
      keys.push(K[t]); values.push(V[t]);
      const weights = E.softmax(keys.map(k => L.dot(Q[t], k) / Math.sqrt(2)));
      cached.push(values[0].map((_, j) => sum(values.map((v, i) => weights[i] * v[j]))));
    }
    return { Q, K, V, weights: full.weights, full: full.output, cached,
      maxError: Math.max(...cached.flatMap((row, i) => row.map((v, j) => Math.abs(v - full.output[i][j])))),
      freshProjectionRows: tokens, recomputedProjectionRows: tokens * (tokens + 1) / 2 };
  };
  L.budget = ({ parameters = 1, data = 20, batch = 1, context = 2048, layers = 24, kvHeads = 8, headDim = 64, bits = 16, devices = 1, micro = 2, accum = 8, tflops = 100, utilization = .4 } = {}) => {
    ok(finite(parameters, .001, 1000) && finite(data, .001, 1e6) && integer(batch, 1, 256) && integer(context, 1, 1e6) && integer(layers, 1, 256) && integer(kvHeads, 1, 128) && integer(headDim, 1, 512) && [4, 8, 16, 32].includes(bits) && integer(devices, 1, 1024) && integer(micro, 1, 256) && integer(accum, 1, 1024) && finite(tflops, 1, 1e5) && finite(utilization, .01, 1), '资源估算参数无效');
    const weights = parameters * 1e9 * bits / 8, kv = 2 * layers * batch * context * kvHeads * headDim * 2;
    const flops = 6 * parameters * 1e9 * data * 1e9;
    return { weights, kv, inferenceLowerBound: weights + kv, adamState: parameters * 1e9 * 16,
      effectiveBatch: micro * devices * accum, tokensPerUpdate: micro * devices * accum * context,
      flops, days: flops / (tflops * 1e12 * utilization * devices * 86400) };
  };
  L.quantize = (values, bits = 4, group = 8, clip = 0) => {
    ok(Array.isArray(values) && values.length >= 1 && values.length <= 256 && values.every(x => finite(x, -1e6, 1e6)) && [2, 3, 4, 8].includes(bits) && integer(group, 1, 256) && finite(clip, 0, 1e6), '量化输入无效');
    const maxInt = 2 ** (bits - 1) - 1, q = [], reconstructed = [], scales = [];
    for (let start = 0; start < values.length; start += group) {
      const chunk = values.slice(start, start + group), bound = clip || Math.max(...chunk.map(Math.abs)), scale = bound / maxInt || 1;
      scales.push(scale);
      for (const x of chunk) { const code = Math.max(-maxInt, Math.min(maxInt, Math.round(x / scale))); q.push(code); reconstructed.push(code * scale); }
    }
    const mse = sum(values.map((x, i) => (x - reconstructed[i]) ** 2)) / values.length;
    return { q, reconstructed, scales, mse, rawBits: values.length * 32, payloadBits: values.length * bits + scales.length * 32 };
  };
  L.nucleus = (logits, temperature = 1, k = logits.length, p = 1) => {
    ok(Array.isArray(logits) && logits.length >= 1 && logits.length <= 64 && logits.every(x => finite(x, -1e6, 1e6)) && finite(temperature, .05, 5) && integer(k, 1, logits.length) && finite(p, .01, 1), '采样参数无效');
    const ranked = E.softmax(logits, temperature).map((prob, index) => ({ prob, index })).sort((a, b) => b.prob - a.prob || a.index - b.index).slice(0, k);
    // This lesson explicitly applies temperature -> top-k -> renormalize -> top-p.
    const mass = sum(ranked.map(x => x.prob)); let cumulative = 0, selected = [];
    for (const item of ranked) { selected.push(item); cumulative += item.prob / mass; if (cumulative >= p - 1e-14) break; }
    const keptMass = sum(selected.map(x => x.prob)), probabilities = logits.map(() => 0);
    selected.forEach(x => { probabilities[x.index] = x.prob / keptMass; });
    return { probabilities, kept: selected.map(x => x.index), entropy: -sum(probabilities.map(x => x ? x * Math.log(x) : 0)) };
  };
  L.dpo = (policyMargin, referenceMargin, beta) => {
    ok(finite(policyMargin, -100, 100) && finite(referenceMargin, -100, 100) && finite(beta, .01, 5), '偏好参数无效');
    const margin = policyMargin - referenceMargin, scaled = beta * margin;
    return { margin, preference: E.sigmoid(scaled), loss: E.softplus(-scaled), gradient: -beta * E.sigmoid(-scaled) };
  };
  L.routeExperts = (scores, top = 2, capacity = 4) => {
    ok(Array.isArray(scores) && scores.length >= 1 && scores.length <= 16 && scores.every(row => row.length === 4 && row.every(Number.isFinite)) && integer(top, 1, 4) && integer(capacity, 1, 16), '路由参数无效');
    const loads = [0, 0, 0, 0], assignments = scores.map(row => {
      const p = E.softmax(row), choices = p.map((v, id) => ({ id, p: v })).sort((a, b) => b.p - a.p || a.id - b.id).slice(0, top);
      const total = sum(choices.map(x => x.p));
      return choices.map(x => { const accepted = loads[x.id] < capacity; if (accepted) loads[x.id]++; return { ...x, weight: x.p / total, accepted }; });
    });
    return { loads, assignments, dropped: assignments.flat().filter(a => !a.accepted).length, requested: scores.length * top };
  };
  L.retrieve = (query, docs, limit = 3) => {
    ok(typeof query === 'string' && query.length <= 160 && Array.isArray(docs) && docs.length >= 1 && docs.length <= 20 && docs.every(s => typeof s === 'string' && s.length <= 1000) && integer(limit, 1, docs.length), '检索输入无效');
    const grams = text => { const c = Array.from(text.toLowerCase().replace(/[\s，。！？,.!?]/g, '')); return c.flatMap((x, i) => [x, ...(i + 1 < c.length ? [x + c[i + 1]] : [])]); };
    const corpus = docs.map(grams), q = grams(query), vocabulary = [...new Set([...corpus.flat(), ...q])];
    const idf = vocabulary.map(w => Math.log((1 + docs.length) / (1 + corpus.filter(d => d.includes(w)).length)) + 1);
    const vector = tokens => vocabulary.map((w, j) => tokens.filter(t => t === w).length * idf[j]);
    const qv = vector(q), qn = Math.sqrt(L.dot(qv, qv));
    return corpus.map((d, id) => { const v = vector(d), n = Math.sqrt(L.dot(v, v)); return { id, text: docs[id], score: n && qn ? L.dot(v, qv) / (n * qn) : 0 }; }).sort((a, b) => b.score - a.score || a.id - b.id).slice(0, limit);
  };
  L.evaluateSlices = (a, b, weight = .5) => {
    ok(integer(a.correct, 0, a.total) && integer(b.correct, 0, b.total) && integer(a.total, 1, 10000) && integer(b.total, 1, 10000) && finite(weight, 0, 1), '评价计数无效');
    const n = a.total + b.total, p = (a.correct + b.correct) / n, z = 1.96, den = 1 + z * z / n;
    const center = (p + z * z / (2 * n)) / den, half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den;
    return { micro: p, macro: (a.correct / a.total + b.correct / b.total) / 2, weighted: weight * a.correct / a.total + (1 - weight) * b.correct / b.total, interval: [center - half, center + half] };
  };
  L.serve = (lengths, slots = 2, continuous = true) => {
    ok(Array.isArray(lengths) && lengths.length >= 1 && lengths.length <= 12 && lengths.every(x => integer(x, 1, 32)) && integer(slots, 1, 8), '调度输入无效');
    const rows = lengths.map(() => []), completion = lengths.map(() => 0); let tick = 0, next = 0, active = [];
    while (next < lengths.length || active.length) {
      if (continuous || !active.length) while (active.length < slots && next < lengths.length) active.push({ id: next++, done: 0 });
      const ids = active.filter(a => a.done < lengths[a.id]).map(a => a.id);
      rows.forEach((row, id) => row.push(ids.includes(id) ? 1 : 0)); tick++;
      active.forEach(a => { if (a.done < lengths[a.id]) { a.done++; if (a.done === lengths[a.id]) completion[a.id] = tick; } });
      if (continuous) active = active.filter(a => a.done < lengths[a.id]);
      else if (active.every(a => a.done === lengths[a.id])) active = [];
    }
    return { rows, completion, ticks: tick, meanCompletion: sum(completion) / lengths.length, occupancy: sum(lengths) / (tick * slots) };
  };
  class LoRA {
    constructor(rank = 1, seed = 42) {
      ok(integer(rank, 1, 4), '秩需为 1–4'); this.rank = rank; this.scale = 1; const r = E.rng(seed);
      this.A = Array.from({ length: rank }, () => Array.from({ length: 4 }, () => (r() - .5) * .6));
      this.B = Array.from({ length: 4 }, () => Array(rank).fill(0));
      this.target = [[.8,.4,0,0],[.4,.2,0,0],[0,0,.6,-.3],[0,0,-.3,.15]];
    }
    delta() { return E.matmul(this.B, this.A).map(row => row.map(x => x * this.scale)); }
    gradients() {
      const d = this.delta(), error = d.map((row, i) => row.map((x, j) => x - this.target[i][j]));
      const A = this.A.map((row, k) => row.map((_, j) => sum(error.map((er, i) => er[j] * this.B[i][k])) * this.scale / 8));
      const B = this.B.map((row, i) => row.map((_, k) => L.dot(error[i], this.A[k]) * this.scale / 8));
      return { loss: sum(error.flat().map(x => x * x)) / 16, A, B };
    }
    step(lr = .5) {
      ok(finite(lr, .001, 1), 'LoRA 学习率超出范围'); const g = this.gradients();
      this.A = this.A.map((row, i) => row.map((x, j) => x - lr * g.A[i][j])); this.B = this.B.map((row, i) => row.map((x, j) => x - lr * g.B[i][j])); return g.loss;
    }
  }
  L.LoRA = LoRA;
  root.AI.L = L;
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
})(globalThis);
