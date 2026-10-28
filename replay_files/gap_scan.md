# Literature Gap Scan
### Definition-only glossary injection vs. passage-only instruction for claim-level faithfulness (MedQuAD, Qwen2.5-7B-Instruct)

---

## 1. Key prior works

### A. Definition / glossary injection into prompts
| Work | What it does | Why it matters here |
|---|---|---|
| **DiPMT: Dictionary-based Phrase-level Prompting of LLMs for MT** — Ghazvininejad et al., 2023 · https://arxiv.org/abs/2302.07856 | Injects a bilingual dictionary of candidate translations for a subset of input words as a phrase-level control hint. | The canonical "glossary in the prompt" design. Measures translation accuracy/terminology uptake, not faithfulness; no length-matched control arm. |
| **Terminology-Aware Translation with Constrained Decoding** · https://arxiv.org/pdf/2310.05824 | Adds terminology constraints and measures terminology recall + translation quality (COMET-QE). | Shows glossary injection is evaluated on *terminology compliance*, never on claim-level support. |
| **Instruction-tuned LLMs for MT in the Medical Domain** · https://arxiv.org/html/2408.16440v2 | Uses `Glossary: medicine -> medicamento`-style blocks in the medical domain. | Closest analogue to a *biomedical* glossary injection; still MT, still no attribution metric, still no prompt-length control. |

### B. In-context definitions and prompt-shape effects
| Work | What it does | Why it matters here |
|---|---|---|
| **ExpertPrompting: Instructing LLMs to be Distinguished Experts** · https://arxiv.org/abs/2305.14688 | A short fixed description/role block yields large answer-quality gains. | Demonstrates that a small appended block of near-zero task information can move outputs — the core confound your design must absorb. |
| **The Impact of Role Design in In-Context Learning** · https://arxiv.org/html/2509.23501v1 | Prompt *shape* (role framing/format) has measurable, underexplored effects. | Justifies including a same-shape, same-length **sham glossary** arm. |

### C. Closed-book vs. passage-grounded biomedical QA
| Work | What it does | Why it matters here |
|---|---|---|
| **MedQuAD** — Ben Abacha & Demner-Fushman, *BMC Bioinformatics* 20:511, 2019 · https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-019-3119-4 · repo: https://github.com/abachaa/MedQuAD | 47,457 QA pairs from 12 NIH sites; CC BY 4.0. | Your dataset. Cite both the paper and the repo. |
| **PubMedQA** — Jin et al., EMNLP 2019 · https://aclanthology.org/D19-1259/ · https://pubmedqa.github.io/ | Biomedical yes/no/maybe QA from PubMed abstracts. | Canonical context-grounded biomedical QA; used as the "open-book" contrast point. |
| **Can large language models reason about medical questions?** · https://www.sciencedirect.com/science/article/pii/S2666389924000424 | Compares CoT, few-shot, and retrieval augmentation on MedQA/MedMCQA/PubMedQA. | Documents that grounding changes *both* accuracy and the support profile — the reason passage-grounded and closed-book arms must be separated. |

### D. Length and context confounds (the load-bearing cluster for your contribution)
| Work | What it does | Why it matters here |
|---|---|---|
| **Context Length Alone Hurts LLM Performance Despite Perfect Retrieval** · https://arxiv.org/abs/2510.05381 | Performance degrades 13.9%–85% as input length grows *with perfect retrieval*, even when padding is pure whitespace, and even when irrelevant tokens are masked. | Direct evidence that a ~200-token appended block is a non-innocuous treatment on its own. Your passage-only arm must be length-matched. |
| **Few-Shot Degradation Is Not What It Seems** · https://arxiv.org/pdf/2609.15990 | 14%–79% of an observed representational shift is attributable to prompt length alone (few-shot prompts are 5–8× longer). | Same failure mode, one prompt-format over: the literature repeatedly under-controls length. |
| **Length-controlled AlpacaEval** (via HF papers index) · https://huggingface.co/papers?q=length+control | Re-scores preferences at matched output length. | Methodological template: control length *by design*, then interpret the residual. |

---

## 2. Prior work on claim-level faithfulness / hallucination evaluation

| Work | Contribution | Use in your design |
|---|---|---|
| **AttrScore / Automatic Evaluation of Attribution by LLMs** — Yue et al., 2023 · https://arxiv.org/abs/2305.06311 | Automated attribution judging + an explicit taxonomy of attribution errors (fully/partially supported, contradictory). | Your "each factual claim is supported by the passage" operationalization; the taxonomy gives you a 3-way label instead of a binary. |
| **FActScore** — Min et al., EMNLP 2023 · https://arxiv.org/abs/2305.14251 · code: https://github.com/shmsw25/FActScore · ACL: https://aclanthology.org/2023.emnlp-main.741/ | Decomposes long-form output into atomic facts, scores each for support. | The claim-**decomposition** step. Adapt the knowledge-source from Wikipedia to the MedQuAD passage. |
| **RAGTruth** — Niu et al., 2024 · https://arxiv.org/abs/2401.00396 · code: https://github.com/ParticleMedia/RAGTruth | ~18k naturally generated hallucinations, **word/span-level** human annotations across QA, summarization, data-to-text. | Span-level labels let you count *unsupported claims per answer*, not just a pass/fail. Best available benchmark for validating your judge. |
| **ALCE: Enabling LLMs to Generate Text with Citations** — Gao et al., 2023 · https://arxiv.org/html/2305.14627v2 | NLI-based citation recall/precision. | The entailment-based scorer you can pair with an LLM judge for a second, independent faithfulness estimate. |
| **FACTS Grounding** — Google DeepMind · https://deepmind.google/blog/facts-grounding-a-new-benchmark-for-evaluating-the-factuality-of-large-language-models/ | 1,719 long-form, document-grounded factuality examples. | Precedent for "grounded long-form factuality" as a construct distinct from accuracy. |

---

## 3. The gap, stated explicitly

**The bundled treatment.** A published definition/glossary-injection result (DiPMT, terminology-aware MT, medical glossary prompting) typically changes *four* things at once relative to the baseline:

1. **Prompt length** — the prompt grows by the glossary's token count.
2. **Prompt shape/format** — a labelled, delimited block (`Glossary:` … `term: definition`) is inserted at a specific position, which acts as a structural instruction *about how to use terminology*.
3. **Topic priming** — the glossary names the passage's topic vocabulary, so the model is oriented toward the subject *before* it reads the passage.
4. **Glossary content** — the actual definitions (the only intended treatment).

**What prior work fails to control.**
- **Length.** Neither DiPMT nor the terminology-aware MT papers report a length-matched placebo. Given arXiv:2510.05381 (length alone degrades performance even with whitespace padding) and arXiv:2609.15990 (14–79% of a shift is length), an unmatched baseline cannot separate content from length.
- **Shape.** ExpertPrompting and role-design work show that a compact added block changes outputs on its own; glossary studies almost never insert an equally sized, equally formatted block of *non-definitional* text.
- **Topic priming.** A glossary built from the passage's own terms is inherently topic-relevant. A same-length list of *off-topic* medical terms in the same shape would isolate priming from definitional content — this arm is essentially absent from the literature.

**Why definition-only-glossary vs. passage-only is under-addressed.**
- The *definition-injection* literature lives in MT and measures **terminology compliance / adequacy**, not whether each generated claim is entailed by the source passage. The metric and the task are both different.
- The *faithfulness* literature (AttrScore, FActScore, RAGTruth, ALCE, FACTS Grounding) supplies judges and labeled corpora but treats prompt composition as fixed — it asks *"is this output supported?"*, never *"does a definition block change how many claims are supported?"*.
- The two literatures do not intersect: no study, to our scan, crosses a length-, shape-, and topic-matched glossary manipulation with a claim-level support metric on a biomedical grounded-QA set.

**Therefore the project's contribution is confound accounting, not the definition-injection question.** The experiment plan should hold the glossary at a fixed ~200 tokens and add at minimum: passage-only; +200-token definition glossary; +200-token **sham glossary** (same shape/position, non-definitional or off-topic content) to absorb length+shape+priming; and a **length-matched filler** arm (neutral text, same token count) to absorb length alone. Any definition-specific effect is the residual after the sham and filler contrasts.

---

## 4. URLs to cite in the report

**Primary (use these two):**
1. MedQuAD dataset + paper — https://github.com/abachaa/MedQuAD and https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-019-3119-4
2. Context-length confound — https://arxiv.org/abs/2510.05381

**Supporting:** https://arxiv.org/abs/2305.06311 (AttrScore) · https://arxiv.org/abs/2305.14251 (FActScore) · https://arxiv.org/abs/2401.00396 (RAGTruth) · https://arxiv.org/abs/2302.07856 (DiPMT) · model card: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct

> **Note on scope:** the deliverable is a reviewed experiment plan. Section 3's confound list, not a measured effect size, is the claim to defend in review.
