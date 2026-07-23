# LLM 训练全流程资源

## Knowledge

- [Book: *Building an LLM from Zero* — Truong (Jack) Luu](https://jackluu.io/files/building-an-llm-from-zero.pdf)
  从零用 PyTorch 搭建完整 GPT 模型（含 tokenizer、embedding、attention、训练）。无 GPU 也能跑。Use for: 动手实现时的主要参考书。

- [Blog: *The Illustrated Transformer* — Jay Alammar](https://jalammar.github.io/illustrated-transformer/)
  视觉化讲解 Transformer 的每一步，概念密度适中。Use for: 第一次理解 Transformer 架构时的首选。

- [Blog: *大模型完整训练流水线: 预训练 → SFT → RLHF 深度解析* — yaoyuanzhou](https://yaoyuanzhou.github.io/topics/notes-llm-pipeline.html)
  中文资源中最系统的训练流程讲解，含 PPO/DPO/GRPO 对比。Use for: 理解三/四阶段训练全貌。

- [Course: *Neural Networks: Zero to Hero* — Andrej Karpathy (YouTube)](https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ)
  从反向传播手写到 GPT 的完整视频系列。Use for: 建立对语言模型训练的底层直觉。

- [Interactive: *Transformer Explainer* — Polo Club](https://poloclub.github.io/transformer-explainer/)
  可在浏览器中交互式操作 Transformer 每一步。Use for: 验证理解、可视化 attention 权重。

- [Repo: *nanoGPT* — Andrej Karpathy](https://github.com/karpathy/nanoGPT)
  极简但完整的 GPT 训练代码（~300 行核心）。Use for: 动手跑通第一个语言模型训练。

- [Blog: *The Annotated Transformer* — Harvard NLP](https://nlp.seas.harvard.edu/annotated-transformer/)
  原始论文的逐行代码实现 + 详细注释。Use for: 想深入代码实现细节时。

## Wisdom (Communities)

- [r/MachineLearning](https://reddit.com/r/MachineLearning)
  高信号机器学习社区，论文讨论深入。Use for: 跟踪最新架构进展和训练技巧。

- [Hugging Face Discord / Forums](https://discuss.huggingface.co/)
  实操问题解答最快的地方，尤其是 transformers 库和训练相关。Use for: 遇到代码问题时的求助渠道。

- [Chinese LLM WeChat Groups / 知乎话题](https://www.zhihu.com/topic/28003574/hot)
  中文讨论活跃，适合理解国内训练实践（DeepSeek、Qwen 等）。Use for: 中文语境下的技术选型讨论。

## Gaps

- 稀疏/混合专家模型（MoE）的系统入门资源较少，大多散见于论文和博客
- 训练稳定性工具（WandB、DeepSpeed、FSDP）的系统性中文教程不足
