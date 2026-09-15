/* Original Chinese explanations; linked sources are references, not reproduced material. */
(function(root){
'use strict';
const sources = [
['ml','Google · Introduction to Machine Learning','https://developers.google.com/machine-learning/intro-to-ml','学习范式、任务与模型的基础定位'],
['algebra','动手学深度学习 · 线性代数','https://zh.d2l.ai/chapter_preliminaries/linear-algebra.html','标量、向量、矩阵与张量'],
['gd','Google · Gradient descent','https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent','均方误差与梯度更新'],
['mlp','动手学深度学习 · 多层感知机','https://zh.d2l.ai/chapter_multilayer-perceptrons/mlp.html','激活函数与多层网络'],
['ce','动手学深度学习 · Softmax 回归','https://zh.d2l.ai/chapter_linear-networks/softmax-regression.html','概率输出与交叉熵'],
['bce','PyTorch · BCEWithLogitsLoss','https://docs.pytorch.org/docs/stable/generated/torch.nn.BCEWithLogitsLoss.html','二元交叉熵的数值稳定实现'],
['backprop','Dive into Deep Learning · Backpropagation','https://d2l.ai/chapter_multilayer-perceptrons/backprop.html','前向传播、反向传播与计算图'],
['adam','Dive into Deep Learning · Adam','https://d2l.ai/chapter_optimization/adam.html','一阶矩、二阶矩与偏差校正'],
['generalization','Google · Overfitting','https://developers.google.com/machine-learning/crash-course/overfitting/overfitting','训练误差、泛化与数据划分'],
['metrics','scikit-learn · Model evaluation','https://scikit-learn.org/stable/modules/model_evaluation.html','混淆矩阵、精确率、召回率与 F1'],
['conv','Dive into Deep Learning · Convolutions for Images','https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html','互相关运算、局部窗口与卷积核'],
['attention','Dive into Deep Learning · Attention Scoring Functions','https://d2l.ai/chapter_attention-mechanisms-and-transformers/attention-scoring-functions.html','缩放点积注意力与掩码'],
['transformer','Vaswani et al. (2017) · Attention Is All You Need','https://arxiv.org/abs/1706.03762','Transformer 原始论文及架构'],
['generation','Hugging Face · Generation','https://huggingface.co/docs/transformers/main_classes/text_generation','温度、top-k 与生成配置'],
['tokenizer','Hugging Face · Summary of the tokenizers','https://huggingface.co/docs/transformers/tokenizer_summary','词元、子词与分词方法'],
['playground','TensorFlow Playground','https://playground.tensorflow.org/','浏览器中训练小网络的交互教学参考；本站未复用其代码'],
['design','Anthropic · frontend-design','https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md','设计过程参考；未打包技能文件、字体或图片']
].map(([id,title,url,use])=>({id,title,url,use}));
const chapters = [
{
 id:'map',short:'AI 的知识地图',title:'先知道自己站在哪里',group:0,
 lead:'人工智能、机器学习、深度学习：它们描述的范围不同。先把任务、方法和学习信号拆开。',
 summary:'机器学习从数据中调整模型，深度学习用多层神经网络学习表示。',prereqs:[],challenge:'切换下面的任务：哪些系统需要训练？它们从哪里得到学习信号？',
 body:[
 {h:'先有任务，再选方法',p:'识别垃圾邮件、预测需求、让机器走出迷宫，都可以是人工智能任务。同一个任务可由规则系统、统计模型或神经网络实现。机器学习把一部分规则的确定交给数据：选定模型形式与目标，利用样本调整参数。深度学习是其中以多层神经网络为核心的一类方法。'},
 {h:'学习信号决定怎样学',p:'监督学习使用输入与目标配对的样本；无监督学习寻找未标注数据中的结构；自监督学习从数据本身构造预测目标，例如遮住一个词再预测它；强化学习根据行动后的奖励优化策略。自监督目标常能写成监督式损失，但标签的来源不同。任务名称、模型架构和训练方式是三条不同的轴。'},
 {h:'把一个模型放回完整流程',p:'真实系统还需要数据清洗、训练与评估、部署、监测以及更新。训练阶段改变参数；常规推断阶段固定参数，计算新输入的输出。一个会调用工具的 AI 助手还需要检索、调度、权限与记录，这些系统能力不会自动由增加神经网络层数得到。'}],
 deep:{title:'用一个数学框架串起来',html:'<div class="formula">θ* = arg min<sub>θ</sub> [ (1/n) Σ<sub>i=1…n</sub> L(f<sub>θ</sub>(x<sub>i</sub>), y<sub>i</sub>) + λR(θ) ]</div><p>x 是输入，y 是训练目标，f 是参数为 θ 的模型，L 衡量单次预测的代价，R 是约束复杂度的惩罚。这个框架适用于本站的监督实验，不囊括所有 AI。对于奖励驱动的序列决策，目标通常是最大化期望累计回报。</p><p>接下来的路线：数字表示 → 参数化预测 → 损失 → 梯度 → 参数更新 → 未见数据上的检验。</p>'},
 quiz:{q:'用预先写好的 if/else 规则筛选邮件，需要训练神经网络吗？',options:['需要，所有 AI 都是神经网络','不需要，这可以是规则系统','需要，但只训练输出层'],answer:1,why:'规则系统可直接执行人为给定的规则。是否需要训练取决于具体实现，不能仅由任务名称判断。'},refs:['ml']
},
{
 id:'vectors',short:'向量与矩阵',title:'让一组数字动起来',group:0,
 lead:'矩阵不是一张神秘的数字表。它规定了如何把输入向量组合成新的向量。',
 summary:'矩阵的每一行，为一个输出定义一组输入权重。',prereqs:['map'],challenge:'先选择旋转，再把矩阵的第二行设为第一行的两倍。观察整个平面如何被压到一条线上。',
 body:[
 {h:'从一个数到一组数',p:'温度可以用一个标量表示；一条记录中的温度、湿度、风速可以组成一个向量。多条记录排成矩阵。彩色图像常表示为高度 × 宽度 × 通道的多维数组；再加上批次维度就是四阶张量。数学里的“阶数”和矩阵的“秩”含义不同。'},
 {h:'一次乘法，是多次加权求和',p:'这里输入是二维向量 x。矩阵 A 的第一行与 x 做点积，得到输出的第一维；第二行给出第二维。在图上，A 的两列分别告诉你原来的两个基向量去了哪里。把许多向量一起变换，就能看见平面的旋转、缩放或剪切。'},
 {h:'维度先对齐，单位再统一',p:'当 W 的形状为 m × d、x 有 d 个分量时，Wx 有 m 个分量。神经网络的一层常写为 z = Wx + b，其中偏置 b 也有 m 个分量。特征量纲相差很大时，优化路径可能很偏斜；标准化有助于改善尺度，但均值和标准差应只从训练数据估计。'}],
 deep:{title:'矩阵乘法与行列式',html:'<div class="formula">y₁ = a₁₁x₁ + a₁₂x₂<br>y₂ = a₂₁x₁ + a₂₂x₂<br>det(A) = a₁₁a₂₂ − a₁₂a₂₁</div><p>二维行列式的绝对值是面积的缩放倍数，符号标记方向是否翻转。det(A)=0 表示变换不可逆，某些输入信息被压到较低维度。W₂(W₁x+b₁)+b₂ 可合并为一个仿射变换；仅仅堆叠线性层不会增加这里所需的非线性表达能力。</p>'},
 quiz:{q:'W 为 3×2，x 为二维列向量，Wx 有几个分量？',options:['2 个','3 个','6 个'],answer:1,why:'W 的每一行与 x 做一次点积，3 行产生 3 个输出。'},refs:['algebra','mlp']
},
{
 id:'regression',short:'第一次预测',title:'用一条直线学会预测',group:0,
 lead:'先不交给机器。你自己调权重和偏置，看看怎样让预测更接近样本。',
 summary:'权重改变斜率，偏置整体平移预测；训练是寻找损失更小的参数。',prereqs:['vectors'],challenge:'先手动降低均方误差，再点击拟合。观察机器改动的是样本，还是直线的两个参数。',
 body:[
 {h:'模型：规定一个可调整的函数',p:'实验使用 ŷ = wx + b。x 是输入特征，ŷ 是预测，w 控制 x 变化时预测变化多少，b 控制 x=0 时的预测值。训练标签 y 是固定的观察值。图中的竖线表示每个样本的残差 ŷ−y，直线移动时，残差随之变化。'},
 {h:'目标：把误差变成一个数',p:'均方误差 MSE 先把每条残差平方，再取平均。平方避免正负误差抵消，也让较大的偏差承担更大的代价。实验中的每一步都对当前样本重新计算梯度，不是播放预设的拟合动画。'},
 {h:'学到关系，不等于得到因果',p:'这里的样本来自 y=0.8x+0.3 加随机噪声。现实数据还可能有遗漏变量、选择偏差和测量误差。拟合得到的斜率刻画当前数据和模型下的预测关系；要解释干预造成的改变，需要额外研究设计与识别假设。'}],
 deep:{title:'把 MSE 对两个参数求导',html:'<div class="formula">L = (1/n) Σ (wxᵢ + b − yᵢ)²<br>∂L/∂w = (2/n) Σ (wxᵢ + b − yᵢ)xᵢ<br>∂L/∂b = (2/n) Σ (wxᵢ + b − yᵢ)<br>w ← w − η∂L/∂w，b ← b − η∂L/∂b</div><p>两个导数告诉你各参数略微增加时损失怎样变化。这里的损失没有额外的 1/2 系数，因此梯度前面有 2。不同教材采用不同常数约定时，公式需前后一致。</p>'},
 quiz:{q:'保持 w 不变，只增加 b，会发生什么？',options:['直线整体上移','斜率增大','样本标签变大'],answer:0,why:'b 对每个预测都加上同一个数，因此整条直线平行上移。'},refs:['gd']
},
{
 id:'neuron',short:'神经元与激活',title:'一个神经元，究竟算什么',group:0,
 lead:'加权求和，再经过一个函数。把神经元拆开，就能看懂它如何响应输入。',
 summary:'神经元计算 a=φ(w·x+b)；非线性激活让多层组合拥有更丰富的表达能力。',prereqs:['regression'],challenge:'把 Sigmoid 的输入推到很大，再观察导数。然后切换 ReLU，把输入移到负半轴。',
 body:[
 {h:'权重像旋钮，偏置像门槛',p:'这里有两个输入 x₁、x₂，先计算 z=w₁x₁+w₂x₂+b，再计算 a=φ(z)。权重的正负决定输入对 z 的作用方向，绝对值决定在线性组合中的强度。比较不同特征的权重大小时，应同时考虑特征尺度。'},
 {h:'为什么要插入非线性',p:'多个仿射层直接串起来，仍可合并为一个仿射变换。加入 ReLU、tanh 等非线性激活，网络才能用多层组合弯折空间，形成更复杂的边界。Sigmoid 把输出压到 0 和 1 之间，适合在本实验的二分类输出层解释为概率。'},
 {h:'导数决定反向信号能通过多少',p:'Sigmoid 在两端趋于饱和，导数接近 0；tanh 在绝对值较大时也如此。ReLU 在正半轴导数为 1，在负半轴为 0。如果某个 ReLU 对所有训练输入都为负，它可能长期收不到有效更新。初始化、残差连接和归一化等方法，都与稳定信号传播有关。'}],
 deep:{title:'常见激活及局部导数',html:'<div class="formula">σ(z) = 1/(1+e<sup>−z</sup>)，σ′(z)=σ(z)(1−σ(z))<br>tanh′(z)=1−tanh²(z)<br>ReLU(z)=max(0,z)</div><p>ReLU 在 z=0 处不可导，本实验按常见实现取该点导数为 0。神经元是一个可微或分段可微的计算单元；它是受生物启发的工程抽象，不能据此推断与真实神经细胞在机制上一一对应。</p>'},
 quiz:{q:'只堆叠多个没有非线性激活的仿射层，整体会变成什么？',options:['必然得到任意复杂的曲线','仍可合并为一个仿射变换','等价于一个随机森林'],answer:1,why:'矩阵相乘与偏置项可重新合并。增加层数本身无法打破这种仿射结构。'},refs:['mlp']
},
{
 id:'loss',short:'损失与交叉熵',title:'如何衡量一次错误',group:1,
 lead:'猜错有很多种：稍微犹豫地猜错，和极其自信地猜错，应该付出一样的代价吗？',
 summary:'交叉熵直接惩罚模型给真实类别分配的低概率。',prereqs:['neuron'],challenge:'把真实标签设为 1，分别给它 0.99 和 0.01 的预测概率。对比损失与 logit 梯度。',
 body:[
 {h:'二分类：关注真实事件的概率',p:'标签 y 只能取 0 或 1。预测 p 表示 y=1 的概率。二元交叉熵为 −y ln p−(1−y)ln(1−p)。真实标签为 1 时，公式简化为 −ln p：p=0.99 时损失约 0.010，p=0.01 时约 4.605。这里使用自然对数，单位是 nat。'},
 {h:'多分类：先把分数变成分布',p:'模型常先输出一组未归一化分数 logits。Softmax 对分数取指数后归一化，使概率和为 1。对单一真实类别的交叉熵，仍是该类别概率的负对数。把所有 logits 同时加上同一个常数，不会改变输出分布。'},
 {h:'损失和准确率各自回答什么',p:'准确率只看最终类别是否猜中，通常忽略概率从 0.51 改善到 0.95 的区别。交叉熵对此敏感，更适合提供连续的优化信号。不过低交叉熵也需要在独立数据上检验，概率质量还可以从校准等角度评价。'}],
 deep:{title:'为什么从 logits 直接算更稳定',html:'<div class="formula">L(z,y)=max(z,0)−zy+ln(1+e<sup>−|z|</sup>)<br>∂L/∂z = σ(z)−y<br>pⱼ = exp(zⱼ−m) / Σₖ exp(zₖ−m)，m=max(z)</div><p>直接算 ln(σ(z)) 可能因为极端数值出现 ln(0)。上面的二元表达式避免先形成极端概率。Softmax 先减最大值也可避免指数溢出。实验引擎采用这些等价但更稳定的实现。PyTorch 的 CrossEntropyLoss 通常接收 logits，重复先做 Softmax 会改变实际计算。</p>'},
 quiz:{q:'真实标签为 1。哪个预测的二元交叉熵最大？',options:['p=0.9','p=0.5','p=0.01'],answer:2,why:'真实类别的预测概率越接近 0，负对数越大。'},refs:['ce','bce']
},
{
 id:'descent',short:'梯度下降',title:'沿着损失往下走',group:1,
 lead:'在这张地形图里，位置代表两个参数，高度代表损失。你来决定每一步走多远。',
 summary:'梯度指向局部上升最快的方向；优化器据此选择参数更新。',prereqs:['loss'],challenge:'先用较小学习率单步前进，再把学习率调到 0.3。观察陡峭方向为何来回跳动。',
 body:[
 {h:'梯度是一个向量',p:'每个参数对应一个偏导数，它们合起来组成梯度。负梯度给出一阶近似下的下降方向。实验使用 L(u,v)=½(u²+8v²)，因此 v 方向比 u 方向更陡。等高线越密，表示损失对该方向的参数变化越敏感。'},
 {h:'学习率决定步长',p:'学习率 η 太小时，每一步改善很少；太大时可能越过谷底、振荡甚至发散。这里沿 v 轴的纯梯度更新是 v←(1−8η)v，因此稳定收缩需要 0<η<0.25。真实网络的曲率随位置变化，没有一个通用于所有问题的阈值。'},
 {h:'动量让过去的方向留下痕迹',p:'本实验采用 vₜ=βvₜ₋₁+gₜ，再更新 θ←θ−ηvₜ。注意这个 v 是动量向量，和上面参数坐标 v 的含义要区分。开启动量后，同时展示同学习率的普通梯度轨迹；它可以加速，也可能造成过冲，不能保证每一步损失都下降。'}],
 deep:{title:'从局部线性近似理解更新',html:'<div class="formula">L(θ+Δθ) ≈ L(θ) + ∇L(θ)ᵀΔθ<br>取 Δθ=−η∇L(θ)，一阶变化为 −η‖∇L(θ)‖²</div><p>忽略的高阶项解释了为什么学习率太大时近似失效。全批量梯度使用全部训练样本，小批量梯度用一部分样本估计方向，通常更便于规模化计算。深度网络损失一般非凸，梯度下降的轨迹本身不构成找到全局最优点的证明。</p>'},
 quiz:{q:'某个参数的梯度为 +3，学习率为 0.1，普通梯度下降如何更新？',options:['增加 0.3','减少 0.3','减少 3'],answer:1,why:'θ_new=θ−ηg=θ−0.3。梯度为正意味着在局部增加该参数会增加损失。'},refs:['gd','adam']
},
{
 id:'backprop',short:'反向传播',title:'把错误传回每条连接',group:1,
 lead:'前向计算得到预测，反向计算得到每个参数对损失的影响。链式法则把两者接起来。',
 summary:'反向传播高效计算梯度，优化器再用梯度更新参数。',prereqs:['neuron','loss','descent'],challenge:'逐步走完计算图，再查看解析梯度与中心差分。把输入 x 改为负数，权重梯度会怎样变？',
 body:[
 {h:'前向：记下中间结果',p:'先算 z=wx+b，再算 p=σ(z)，最后根据标签得到二元交叉熵 L。每个中间结果都可在图中检查。在复杂网络里，保存这些中间值会占用内存，它们也是反向计算的依据。'},
 {h:'反向：沿路径相乘，在分叉处相加',p:'损失对权重的导数等于 ∂L/∂p × ∂p/∂z × ∂z/∂w。对于 Sigmoid 加二元交叉熵，前两个因子恰好简化为 p−y，于是 ∂L/∂w=(p−y)x，∂L/∂b=p−y。若参数影响损失的路径不止一条，需要把所有路径贡献相加。'},
 {h:'用数值实验检查推导',p:'把 w 稍微加一点和减一点，分别重算损失，再用中心差分近似导数。它独立于手写的反向公式，适合做梯度校验。不过对每个参数各做两次前向很昂贵，因此训练台使用解析反向传播，而不是用差分训练。'}],
 deep:{title:'从单个神经元推广到一层',html:'<div class="formula">δ<sup>(L)</sup> = p−y<br>δ<sup>(l)</sup> = (W<sup>(l+1)</sup>)ᵀδ<sup>(l+1)</sup> ⊙ φ′(z<sup>(l)</sup>)<br>∂L/∂W<sup>(l)</sup> = δ<sup>(l)</sup>(a<sup>(l−1)</sup>)ᵀ<br>∂L/∂b<sup>(l)</sup> = δ<sup>(l)</sup></div><p>δ 是对该层激活前数值 z 的梯度，⊙ 表示逐元素相乘。对批量样本，本站把这些梯度取平均。反向计算发生在更新之前：不能一边计算前层梯度，一边提前改变后层权重。</p><div class="formula">数值梯度 ≈ [L(w+h)−L(w−h)]/(2h)，h=10⁻⁵</div>'},
 quiz:{q:'反向传播结束后，参数是否必然已经改变？',options:['是，梯度就是新参数','否，还需要优化器执行更新','只有偏置改变'],answer:1,why:'反向传播计算梯度。参数更新由 SGD、Adam 等优化器完成，两步应明确区分。'},refs:['backprop','bce']
},
{
 id:'playground',short:'神经网络训练场',title:'现在，亲手训练一个网络',group:1,
 lead:'数据、权重、梯度和更新都在你的浏览器里。每一条曲线来自刚刚发生的训练。',
 summary:'输入经过隐藏层变换，输出概率；观察未参与训练的样本，才能检验泛化。',prereqs:['backprop'],challenge:'用没有隐藏层的模型学习 XOR，再改成两层 tanh 网络。保持种子和数据相同，比较验证损失。',
 body:[
 {h:'先做一个可复现的实验',p:'选数据、结构与随机种子，再开始训练。每组数据有 240 个合成样本，两类均衡；按类别分层划为 180 条训练和 60 条验证。空心方形是验证样本，不参与梯度计算。固定种子可复现数据、初始权重与小批量顺序，方便对照不同方法。'},
 {h:'网络正在改变输入空间',p:'每一层先做仿射变换，再施加激活。图中连接的颜色表示权重正负，粗细表示大小；背景表示类别 1 的预测概率，接近两类分界的浅色区域通常对应接近 0.5 的输出。概率是模型输出的数值，不是已验证的可信度保证。'},
 {h:'用对照实验学会判断',p:'没有隐藏层时，这个模型退化为逻辑回归，只能在当前二维特征中产生线性决策边界。增加非线性隐藏层可表达 XOR 一类结构；所有隐藏激活改成线性后，多层网络仍受仿射结构限制。调整复杂度时同时观察训练与验证，不要只追求训练误差更低。'}],
 deep:{title:'训练口径与模型边界',html:'<div class="formula">J = mean(BCE) + (λ/2) Σ w²<br>单层参数量 = 输入维度 × 输出维度 + 输出维度<br>2→8→8→1：24+72+9 = 105 个参数</div><p>正则只施加于权重，不惩罚偏置。图上显示的 BCE 不含 L2 项。Adam 的 β₁=0.9、β₂=0.999、ε=10⁻⁸，包含偏差校正；L2 直接加入梯度，因此不是 AdamW。tanh 使用 Glorot 均匀初始化，ReLU 隐藏层使用 He 均匀初始化。</p><p>反复查看验证集并据此调整配置，会使它参与模型选择。本实验没有最终保留测试集；真实项目应另留测试数据用于最后评价。所有数据是合成任务，不应把这里的准确率当作真实应用能力。</p>'},
 quiz:{q:'为什么训练场里的验证样本不参与梯度计算？',options:['为了检验对未用于拟合的数据的表现','因为它们没有标签','因为验证集只能包含错误样本'],answer:0,why:'验证标签用于计算指标，但不用于参数拟合。这样可观察模型对未见样本的表现；反复调参后仍需独立测试集。'},refs:['backprop','adam','generalization','playground']
},
{
 id:'generalization',short:'泛化与过拟合',title:'学规律，还是记噪声',group:2,
 lead:'拟合得漂亮，未必预测得好。给模型更复杂的函数，看看它如何开始追逐噪声。',
 summary:'训练误差衡量对已见数据的拟合，验证误差帮助发现过拟合。',prereqs:['regression','playground'],challenge:'用少量样本和较高噪声，把多项式阶数从 1 调到 12；然后逐渐增加 L2，观察两种误差。',
 body:[
 {h:'把规律和噪声放到同一张图里',p:'灰色虚线是真实生成函数 sin(3x)，实线是仅用训练样本拟合的多项式。训练样本和验证样本分别生成；你可以观察训练误差下降时，未见样本的误差是否同步改善。这是实算最小二乘拟合，不是预设一条 U 形误差曲线。'},
 {h:'欠拟合与过拟合是相对概念',p:'复杂度不足时，模型连主要变化形状都难以表达，训练与验证表现可能都差。复杂度很高而数据少时，函数可能跟随局部噪声摆动。具体误差不会在每个随机样本上都呈现教科书曲线；应通过多个种子和合理的数据划分检查模式是否稳定。'},
 {h:'约束复杂度，保护评价',p:'L2 正则让较大的系数付出额外代价，减少模型对少量样本的敏感性。增加可靠数据、早停、数据增强也可帮助泛化。真实研究中，同一主体的重复记录、时间先后关系和预处理拟合都可能造成数据泄漏；划分方式要与最终使用场景一致。'}],
 deep:{title:'这里到底拟合了什么',html:'<div class="formula">ŷ(x)=Σ<sub>j=0…d</sub> βⱼTⱼ(x)<br>J=mean((ŷ−y)²)+λΣ<sub>j≥1</sub>βⱼ²</div><p>为了缓解高阶幂的数值病态，实验用 Chebyshev 多项式作为基底，在 [−1,1] 上拟合。它张成的函数空间仍是 d 阶多项式，但 L2 惩罚的含义依赖所用基底，不能直接与原始幂系数的同一 λ 比较。截距不受惩罚；验证 MSE 不包含正则项。</p><p>最终测试集应在方法确定后使用。面板与时间序列还应考虑按主体、时间或二者组合划分，而不是机械随机拆行。</p>'},
 quiz:{q:'训练损失持续下降，而验证损失开始上升，最值得警惕什么？',options:['模型在这段训练中可能开始过拟合','验证数据一定有错','梯度公式必然反了'],answer:0,why:'这是过拟合的常见信号，需要结合噪声与多次实验判断，可考虑早停、正则或调整复杂度。'},refs:['generalization','algebra']
},
{
 id:'metrics',short:'评价与阈值',title:'一个准确率还不够',group:2,
 lead:'100 个样本中只有 20 个正例。把所有样本都判为负，准确率也能达到 80%。',
 summary:'阈值改变预测类别；混淆矩阵揭示误报和漏报之间的代价。',prereqs:['loss','generalization'],challenge:'把阈值调高，观察漏报数量。再把阈值降到 0，为什么召回率很高而精确率很低？',
 body:[
 {h:'先明确什么算正类',p:'在筛查任务里，正类可以表示需要进一步关注的样本。真正例 TP 是正确识别的正类；假正例 FP 是误报；真负例 TN 是正确排除；假负例 FN 是漏报。实验使用固定的合成分数和真实标签，拖动阈值只改变决策，不重新训练模型。'},
 {h:'两个比例，两个方向',p:'精确率 TP/(TP+FP) 问的是：被判为正的样本中，有多少是真的？召回率 TP/(TP+FN) 问的是：所有真实正例中，找回了多少？降低阈值通常增加召回，也可能带来更多误报。类别不平衡时，整体准确率容易掩盖少数类的失败。'},
 {h:'用场景决定评价重点',p:'F1 是精确率与召回率的调和平均，适合同时关注两者，但它不考虑真负例，也没有自动编码业务成本。需要排序质量时可看 PR/ROC 曲线，需要概率可靠性时看校准与适当评分规则。指标应服务任务风险，而不是只选数值最好看的那一个。'}],
 deep:{title:'分母为零时如何显示',html:'<div class="formula">Accuracy=(TP+TN)/N<br>Precision=TP/(TP+FP)<br>Recall=TP/(TP+FN)<br>F1=2TP/(2TP+FP+FN)</div><p>没有预测正类时，精确率分母为 0，本站显示“—”，而不伪装成一个可解释的 0% 或 100%。不同工具对未定义指标有不同配置选项，报告时应声明约定。本站的阈值判断采用 score≥threshold。</p>'},
 quiz:{q:'一个全判负的模型在 80% 为负类的数据上准确率为 80%。它的正类召回率是多少？',options:['80%','100%','0%'],answer:2,why:'所有正例都被漏掉，TP=0、FN>0，因此召回率为 0。'},refs:['metrics']
},
{
 id:'convolution',short:'卷积与局部特征',title:'让滤镜滑过一张图',group:2,
 lead:'一个小窗口重复使用同一组权重，在整张图上寻找局部模式。',
 summary:'局部连接与权重共享，让卷积高效地提取空间特征。',prereqs:['vectors','neuron'],challenge:'点亮或擦除图像像素。切换边缘核，逐格检查窗口里的 9 次乘法为什么得到这个输出。',
 body:[
 {h:'一次输出，是一个窗口的加权求和',p:'图像每个位置有一个亮度值。3×3 核覆盖 9 个像素，将相对位置上的像素与核元素相乘再求和，得到一个输出值。窗口继续滑动时，同一个核被重复使用。这种权重共享让模型不必为每个图像位置单独学习一套检测器。'},
 {h:'步幅和填充改变输出形状',p:'步幅 stride 决定窗口每次移动几格。填充 padding 在输入外围补值，本实验使用补 0。无填充时，一张 5×5 图像经过 3×3 核、步幅 1，会得到 3×3 输出。增加填充可保留更多边缘位置，但也引入了边界约定。'},
 {h:'从手工滤镜到卷积网络',p:'这里的核由你手动设定，展示边缘、锐化或模糊等响应。卷积神经网络会通过反向传播学习核参数，并组合多个通道、激活函数和层级结构。池化则用局部最大值或平均值汇总特征，和带可学习权重的卷积承担不同功能。'}],
 deep:{title:'精确运算约定',html:'<div class="formula">Yᵢⱼ=ΣₐΣᵦ X<sub>is+a−p, js+b−p</sub>Kₐᵦ<br>输出边长=⌊(n+2p−k)/s⌋+1</div><p>本站和很多深度学习库一样，演示的是互相关：不把核翻转。严格数学卷积会翻转核；神经网络训练时这通常不改变可学习函数族，但检查具体数值时必须区分。越界输入按 0 处理，所有中间乘积都保留符号。</p>'},
 quiz:{q:'5×5 输入、3×3 核、步幅 1、无填充，输出大小是？',options:['5×5','3×3','2×2'],answer:1,why:'每个方向的有效位置数量是 (5−3)/1+1=3。'},refs:['conv']
},
{
 id:'attention',short:'注意力与 Transformer',title:'谁该关注谁',group:2,
 lead:'用查询与键计算关联权重，再对值向量加权汇总。把 Q、K、V 分开看。',
 summary:'注意力的权重由输入相关性决定，输出是值向量的加权和。',prereqs:['vectors','loss'],challenge:'选择一个查询词，修改 Q 的两个分量；开启因果掩码，检查它还能否读取后面的词。',
 body:[
 {h:'查询、键、值各做一件事',p:'Query 表示当前位置用什么方向寻找相关信息；Key 用于被匹配；Value 提供真正要汇总的内容。点积 Q·K 得到匹配分数，按键的维度平方根缩放后经过 Softmax，形成权重。这里的 Q、K、V 是手工构造的二维教学数值，不具有真实预训练词向量的语义保证。'},
 {h:'注意力改变的是信息混合方式',p:'选择某一行查询，会得到对全部允许位置的权重分布。高权重表示该位置的 Value 对当前加权输出贡献更大。把注意力权重当作模型完整的因果解释会忽略值向量、后续变换与其他路径；这个实验只展示可精确检查的计算机制。'},
 {h:'Transformer 还包含什么',p:'自注意力的 Q、K、V 通常来自同一输入序列的不同线性投影。多头机制在不同子空间分别计算，随后拼接并投影。完整 Transformer 还结合前馈网络、残差连接、归一化和位置信息。自回归生成使用因果掩码，阻止当前位置在训练时读取未来目标。'}],
 deep:{title:'从一行到整个矩阵',html:'<div class="formula">Q=XW<sub>Q</sub>，K=XW<sub>K</sub>，V=XW<sub>V</sub><br>A=softmax(QKᵀ/√d<sub>k</sub> + M)<br>Output=AV</div><p>Softmax 按行归一化；掩码 M 的禁用位置取负无穷，概率恰为 0。标准全注意力需形成与序列长度平方相关的配对分数。不同实现会用优化内核或结构近似降低开销，本站展示标准公式，没有实现完整 Transformer 训练。</p>'},
 quiz:{q:'注意力最终按权重求和的是哪一组向量？',options:['Query','Value','Softmax 之前的分数'],answer:1,why:'Q 与 K 生成权重，Value 提供被加权汇总的内容。输出是 AV。'},refs:['attention','transformer']
},
{
 id:'tokens',short:'词元与生成',title:'下一个 Token 怎么选',group:2,
 lead:'概率分布给出可能性，采样规则决定如何从中选择。温度不会凭空补充知识。',
 summary:'语言模型给出条件分布；温度与 top-k 改变采样，而不是重新训练权重。',prereqs:['loss','attention'],challenge:'先从全部候选采样，再把 top-k 设为 1。无论温度怎么调，结果还会变化吗？',
 body:[
 {h:'词元：模型处理文本的单位',p:'Token 可以对应一个词、子词、字符或字节片段，具体取决于分词器。中文汉字与 Token 不是固定的一一关系。分词器把文本映射为离散编号，嵌入层再把编号映射为向量；向量经过模型计算，输出下一词元的 logits。'},
 {h:'温度与候选截断',p:'温度 T 通过除 logits 来改变概率分布：较小温度使高分候选更突出，较大温度使分布更平坦。top-k 只保留分数最高的 k 个候选，再归一化采样。这里分数由滑块人工设定，抽样是真实随机抽样，但不是向远程大模型发请求。'},
 {h:'从一次抽样到自回归生成',p:'真正的自回归语言模型每生成一个词元，就把它接到上下文后，再重新计算下一个条件分布。本站为隔离温度与 top-k 的作用，反复从同一个固定分布抽样，不实现上下文依赖的语言生成。概率高反映模型在训练与条件下的倾向，事实核验还需要外部证据。'}],
 deep:{title:'训练目标与推断过程怎样衔接',html:'<div class="formula">p(x₁,…,xₜ)=Π<sub>i=1…t</sub>p(xᵢ|x&lt;ᵢ)<br>L=−Σ<sub>i</sub>ln p(xᵢ|x&lt;ᵢ)<br>pⱼ(T)=exp(zⱼ/T)/Σₖexp(zₖ/T)</div><p>语言模型预训练可通过预测后续词元构造自监督目标。训练时目标词元已知；推断时需要选择或抽样。T 趋向 0 时分布集中在最大 logit；本站最小温度为 0.1，避免直接除以 0。top-k=1 时只剩一个候选，因此采样退化为确定选择。</p><p>检索增强生成把检索内容加入上下文；微调更新模型参数。二者处理知识和任务适配的方式不同，仍需分别评价检索质量、生成质量及证据忠实性。</p>'},
 quiz:{q:'模型权重不变，单独调高采样温度会直接增加模型知识吗？',options:['会，温度就是智力','不会，它改变已有分数的采样分布','会自动连接搜索引擎'],answer:1,why:'温度改变概率分布的集中程度，不改变已训练参数，也不会自动引入新的事实来源。'},refs:['tokenizer','generation','transformer']
}
];
chapters.forEach((c,i)=>{c.no=String(i+1).padStart(2,'0');});
const groups=[{title:'建立直觉',subtitle:'从任务到数字，再到一个神经元',range:'01—04'},{title:'让模型学会',subtitle:'把损失、梯度和训练真正连起来',range:'05—08'},{title:'走向真实问题',subtitle:'评价、泛化，以及更丰富的模型',range:'09—13'}];
const glossaryRows=[
['人工智能','Artificial intelligence','让计算系统完成感知、推理、决策等任务的研究与工程领域。','map'],['机器学习','Machine learning','用数据和学习目标调整模型，使其在某类任务上改善表现。','map'],['深度学习','Deep learning','以多层神经网络为核心，联合学习表示与任务映射的一类机器学习方法。','map'],['自监督学习','Self-supervised learning','从数据本身构造目标，例如预测被遮挡或后续的词元。','map'],
['标量','Scalar','一个数；例如某个样本的损失值。','vectors'],['向量','Vector','有顺序的一组数；常用于表示特征或嵌入。','vectors'],['矩阵','Matrix','二维数字数组，可表示批量数据或线性变换。','vectors'],['张量','Tensor','在此处指多维数组；维度形状描述数据的组织方式。','vectors'],
['特征','Feature','模型用于预测的输入变量或表示。','regression'],['标签','Label','监督训练或评价使用的目标值。','regression'],['权重','Weight','决定输入如何贡献于输出的可学习系数。','regression'],['偏置','Bias','仿射变换中的加法常数；与统计偏差是不同用法。','regression'],
['激活函数','Activation function','作用于加权求和结果的函数，常用于引入非线性。','neuron'],['Sigmoid','Logistic sigmoid','把实数映射到 (0,1) 的 S 形函数。','neuron'],['ReLU','Rectified linear unit','输出 max(0,z)，正半轴保留输入、负半轴置零。','neuron'],['tanh','Hyperbolic tangent','输出范围为 (−1,1) 的双曲正切函数。','neuron'],
['损失函数','Loss function','把预测与目标之间的差异表示为训练可优化的数值。','loss'],['均方误差','Mean squared error / MSE','预测残差平方的平均。','loss'],['交叉熵','Cross-entropy','衡量目标分布与预测分布差异的评分；单标签时为真实类别概率的负对数。','loss'],['Softmax','Softmax','将一组 logits 归一化为概率分布的函数。','loss'],
['梯度','Gradient','函数对各参数的偏导数构成的向量。','descent'],['学习率','Learning rate','控制梯度更新尺度的超参数。','descent'],['批量','Batch','一次梯度估计使用的一组训练样本。','descent'],['轮次','Epoch','训练过程完整遍历一次训练集。','descent'],
['前向传播','Forward pass','从输入依次计算各层中间值和输出。','backprop'],['反向传播','Backpropagation','沿计算图反向应用链式法则，累积参数梯度。','backprop'],['链式法则','Chain rule','复合函数求导时，将沿路径的局部导数相乘。','backprop'],['计算图','Computational graph','用节点与连线表示运算及其依赖关系。','backprop'],
['隐藏层','Hidden layer','位于输入与输出之间，学习中间表示的网络层。','playground'],['初始化','Initialization','训练开始前为权重设定初值；会影响信号与梯度传播。','playground'],['SGD','Stochastic gradient descent','使用样本或小批量估计梯度进行更新；本站采用小批量版本。','playground'],['Adam','Adaptive moment estimation','结合梯度一阶与二阶矩估计，并进行偏差校正的优化器。','playground'],
['训练集','Training set','用于梯度计算与参数拟合的数据。','generalization'],['验证集','Validation set','用于比较配置和观察泛化、但不直接用于梯度拟合的数据。','generalization'],['过拟合','Overfitting','对训练数据的特殊性拟合过多，未见数据表现相对受损。','generalization'],['正则化','Regularization','通过惩罚、约束或训练策略限制模型对数据的过度适应。','generalization'],
['混淆矩阵','Confusion matrix','按真实与预测类别交叉统计的计数表。','metrics'],['精确率','Precision','预测为正的样本中，真正例所占比例。','metrics'],['召回率','Recall','真实正例中，被成功找回的比例。','metrics'],['F1 分数','F1 score','精确率与召回率的调和平均。','metrics'],
['卷积核','Kernel / Filter','在局部窗口上重复使用的一组权重。','convolution'],['步幅','Stride','卷积窗口每次移动的格数。','convolution'],['填充','Padding','在输入边界补值，控制边界处理和输出形状。','convolution'],['池化','Pooling','通过局部最大值或平均值等方式汇总特征。','convolution'],
['查询','Query / Q','注意力中用于匹配键的向量。','attention'],['键','Key / K','注意力中用于与查询计算关联分数的向量。','attention'],['值','Value / V','注意力中被权重加权汇总的内容向量。','attention'],['因果掩码','Causal mask','限制当前位置不能访问后续位置的注意力掩码。','attention'],
['词元','Token','分词器处理文本的离散单位，不固定等于一个汉字或一个词。','tokens'],['嵌入','Embedding','把离散编号映射成连续向量表示。','tokens'],['温度','Temperature','缩放 logits、控制采样分布集中程度的参数。','tokens'],['top-k','Top-k sampling','只在分数最高的 k 个候选中重新归一化并采样。','tokens']
];
const glossary=glossaryRows.map(([term,en,definition,chapter])=>({term,en,definition,chapter}));
root.AI=Object.assign(root.AI||{},{C:{chapters,groups,sources,glossary}});
if(typeof module!=='undefined'&&module.exports) module.exports={chapters,groups,sources,glossary};
})(globalThis);
