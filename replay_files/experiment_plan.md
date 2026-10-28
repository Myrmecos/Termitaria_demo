# Executable Experiment Plan — MedQuAD Glossary-Faithfulness Pilot

**Status:** Reviewed experiment PLAN (protocol specification). No results are reported here and none are claimed.
**Instrument:** 30 MedQuAD items × 4 arms = 120 generations, Qwen2.5-7B-Instruct, temperature 0, one ~200-token appended block.
**Framing (carried from `hypotheses.md`):** the research question ("does a definition-only glossary increase claim-level faithfulness?") is the *ostensive* question; the load-bearing contribution is **confound accounting** — separating glossary **content** from added **prompt length**, added **prompt shape/label**, and **topic priming / definition source**. This is an explicitly **underpowered feasibility pilot**: it delivers a protocol, σ_d estimates, and a first decomposition, not a powered test.
**Owner / executor:** a second person must be able to run this end-to-end from this document plus the artifact list in §11.

---

## 0. Notation, arms, contrasts, decision objects (fixed before data collection)

Per-item, per-arm **claim-support rate** (co-primary #1):

    f[i,a] = (# atomic claims in answer (i,a) labeled SUPPORTED) / (# atomic claims in answer (i,a))

**Supported-claim count** (co-primary #2): `n_sup[i,a]` = raw count of supported atomic claims; `n_claim[i,a]` = raw count of atomic claims. Both reported always, never only the rate (a rate rise with flat count = attrition; see §7.5).

Per-item paired differences: `d_c[i] = f[i, arm_2] − f[i, arm_1]` for contrast label `c`.

**Arms** (names fixed; hypotheses doc calls them P/G/L/N, this plan calls them A/B/C/D):

| Arm | Name | Appended block |
|---|---|---|
| **A** | passage-only | none (block slot is empty) |
| **B** | passage + passage-derived definition glossary | ~200-token `GLOSSARY (source: passage)` block, definitions only |
| **C** | passage + length-matched neutral filler | ~200-token identically-formatted `GLOSSARY (source: passage)`-shaped block, neutral content, no definitions |
| **D** | passage + external-lexicon definitions of the SAME terms | ~200-token identically-formatted block, same headwords, definitions from an external lexicon |

**Primary contrasts** (sign convention: positive = later arm better):

| ID | Contrast | Interpreted as |
|---|---|---|
| T1 | `d_BA = f_B − f_A` | naive/ostensive glossary effect |
| T2 | `d_CA` | length + shape/label effect (filler) |
| T3 | `d_CB = f_B − f_C` | **glossary-specific residual over a length/shape twin** (H1's load-bearing cell) |
| T4 | `d_DB = f_B − f_D` | **passage-derived vs external definition source** (priming/conflict cell) |
| T5 | `d_DC = f_D − f_C` | definition layer (whatever source) over filler |

**Decision objects M1–M5** (each = a median (or mean) + 95% bootstrap CI, computed in §7):
`M1 = median(d_BA)`, `M2 = median(d_CA)`, `M3 = median(d_CB)`, `M4 = median(d_DB)`, `M5 = median(d_DC)`; plus subset versions `M3_high`, `M3_low` (pre-registered stratification, §1.4), plus `Δcount_3 = median(n_sup[B] − n_sup[C])`.

---

## 1. Item selection and sampling for the 30 MedQuAD items

### 1.1 Source snapshot (fixed, immutable)
- Dataset: MedQuAD (Ben Abacha & Demner-Fushman, *A Question-Entailment Approach to Question Answering*, BMC Bioinformatics 20:511, 2019); repo `github.com/abachaa/MedQuAD`, license **CC BY 4.0**.
- **Snapshot rule:** clone the repo once and record `git -C MedQuAD rev-parse HEAD` (the repo has 8 commits; record the 40-char SHA) plus SHA-256 of every file used. All item IDs are resolved against that SHA only.

### 1.2 Which subsets (inclusion)
Use **only** subsets that (a) contain answer text in the distributed XML and (b) are single-disease-entity collections with UMLS annotations, so a "passage" can be defined as the answer text of one QA record:

- **In (primary pool):** `1_CancerGov_QA`, `2_GARD_QA`, `3_GHR_QA` (all disease-focused; the repo notes all non-MedlinePlus collections are about diseases and retain answers).
- **Out (excluded a priori):** `10_MPlus_ADAM_QA`, `11_MPlusDrugs_QA`, `12_MPlusHerbsSupplements_QA` — answers **removed** upstream for MedlinePlus copyright (per repo readme) → no passage available.
- **Out (excluded a priori):** `4_MPlus_Health_Topics_QA`, `5_NIDDK_QA`, `6_NINDS_QA`, `7_SeniorHealth_QA`, `8_NHLBI_QA_XML`, `9_CDC_QA` — MedlinePlus/long-article collections whose answer elements are multi-paragraph topic documents of highly variable length and heterogeneous structure; excluded to keep "the passage" the same kind of object across items. (If a reviewer wants these, they become a replication pool — flagged, not used here.)

### 1.3 Which QA types (inclusion)
From the XML `<Question>` annotation `qtype`, include **only** these five question types, which have answers that are *expository paragraphs* (needed for both claim atomization and a definition glossary to be meaningful):

`"information"` (overview/what-is), `"symptoms"`, `"treatment"`, `"causes"`, `"exams and tests"`.

**Exclude** `"complications"`, `"support group"`, `"outlook (prognosis)"`, `"prevention"`, `"risk factors"`, `"frequency"`, `"genetic changes"`, `"inheritance"`, `"susceptibility"`, `"stages"`, `"diagnosis"`, `"research"`, `"other"` — too short, too list-like, or (e.g. frequency/orphanet-style) numeric one-liners that produce 1-claim answers with no denominator headroom. Rationale is pre-registered: we want items whose answers can plausibly reach ≥5 atomic claims.

### 1.4 Construction of the candidate frame (deterministic filtering)
For every QA record in the in-scope subsets (`1_`, `2_`, `3_`) with an in-scope qtype:

1. **Passage definition.** `passage_i` := the concatenated text content of the record's `<Answer>` element(s), whitespace-normalized, HTML/XML tags stripped, MedlinePlus-style boilerplate removed by exact-match regex list (see `config/boilerplate.txt`, built once and frozen). Passage = the *only* grounding evidence the model sees; the MedQuAD answer key is **never** shown to the model and is **not** used as the gold answer — it *is* the passage (see §1.5 note).
2. **Length band:** keep passages with **120–400 Qwen tokens** (tokenizer of §5.1, `add_special_tokens=False`). Rationale: long enough to contain ≥2 definition-worthy terms for a 200-token glossary, short enough that a +200-token append does not double or triple the context (keeps the length manipulation at ~1.5–2.5×, comparable to glossary-injection practice; also keeps us far below the 7K–30K regime of arXiv:2510.05381, which we treat as analogy only).
3. **Definitional-term availability:** passage must contain **≥8 distinct candidate glossary terms** under the extraction rule in §3.1 (computed pre-hoc). Items below 8 cannot host a fillable ~200-token definition-only glossary and are dropped.
4. **Dedup:** one item per `<Question focus>` CUIs (UMLS CUI if present in `<Question focus>`/`<Synonyms>`), keeping the record with the median passage length in its CUI group. Prevents 30 items about the same three diseases.
5. **Language/format:** English only; drop passages with >20% numeric-token density or containing tables/flow-charts markers (`&#x2022;`, `<table>`, `|`) — these break atomization.

Record `frame_size` after each filter (expect O(10^2–10^3); if `frame_size < 120`, stop and report, do not relax filters ad hoc).

### 1.5 The prompt asks a *closed-book-grounded* question — explicit choice
The model is asked: *answer the record's question using **only** the passage*. The passage is the MedQuAD answer text. So the task is "restate/derive the answer under passage-only grounding," which is exactly the setting in which claim-level faithfulness is defined and in which a definition glossary could plausibly help (paraphrase, terminology). We deliberately do **not** use the MedQuAD answer as a reference answer, because claim-level faithfulness is measured against the *passage* (§6).

### 1.6 Sampling of n = 30
- **Stratification factor (pre-registered):** *passage jargon density* = (# candidate glossary terms per 100 passage tokens) from §3.1, computed in the frame **before** any generation.
- **Cut:** **tercile split at the frame levels** (frame tercile boundaries frozen and printed): `high-ambiguity/jargon` = top tercile, `low-ambiguity/jargon` = bottom tercile, `mid` = middle tercile (retained for completeness but not part of the H1 stratified test).
- **Allocation:** **10 high + 10 low + 10 mid** via *within-stratum simple random sampling without replacement*, `numpy.random.default_rng(seed=20250101)`, one draw, reproducible: write out `sample_frame.csv` with columns `item_id, subset, qtype, focus_cui, passage_tokens, n_terms, jargon_density, stratum` and `sampled.csv` with the 30 chosen rows and the seed.
- **Pre-registration of the stratification:** the tercile cut points, the allocation 10/10/10, and the seed are written into `prereg.md` **and hashed** (`sha256sum prereg.md`) **before** any model call. Any later change is labeled exploratory in the write-up.
- **Exclusion-after-sampling rule (the only one):** if a drawn item's row 1 generation under arm A returns empty/refusal (`<5` tokens, or a stock refusal string from `config/refusals.txt`), replace it with the **next item in the same stratum from the frozen shuffled order**, and log the substitution. Max 3 substitutions per stratum; if exceeded, stop and report.

**Deliverable:** `items.jsonl`, 30 records: `{item_id, subset, qtype, focus_cui, question, passage, passage_tokens, stratum, jargon_density}` — this file is the unit of everything downstream.

---

## 2. Exact prompt templates for the four arms

**Invariance rule (mechanical, enforced by assertion in `build_prompts.py`):** all four prompts are assembled from the identical template string by `.format(...)`. The *only* substring that may differ is `{BLOCK}`. Assertions, run on all 120 prompts:

1. `prompt.split("{BLOCK}")`-analogue: `len(prompt) == len(template_fixed_parts) + len(block)`; i.e. `prompt_A.replace(block_A, "") == prompt_B.replace(block_B, "")` after substituting each arm's block — byte equality of the non-block text across arms (checked with `assert`; any failure aborts the run).
2. `block_A == ""`.
3. In arms B, C, D: tokenized lengths of the block satisfy §3.4 (±5% matching, and B/C/D pairwise within ±5%).
4. In arms B, C, D: the block is exactly the lines `GLOSSARY (source: passage)` then `- <headword>: <gloss>` lines then nothing else; the headword list and order are identical in B, C, D.
5. In arms C: no gloss line may contain more than 2 content words that co-occur (lowercased, stopword-removed) with the item's own glossary definition text (automated check, `assert max_overlap <= 2`); the *headword* field is left as a placeholder token `TERM_1 … TERM_k` in C (see §4.1) so that C cannot prime content at all — this is the deliberate design choice discussed in §4.1.

### 2.1 The template (single source of truth)

```
You are a careful biomedical question answering system.

Answer the QUESTION using ONLY the PASSAGE below.
Rules:
1. Every statement in your answer must be directly supported by the PASSAGE.
2. Do not add facts, numbers, doses, or advice that are not stated in the PASSAGE.
3. If the PASSAGE does not contain the information, say "The passage does not say."
4. Write 2-5 sentences. No bullet lists, no headings.

PASSAGE:
{passage}
{BLOCK}
QUESTION:
{question}

ANSWER:
```

- `{passage}` and `{question}` are byte-identical across arms for a given item.
- `{BLOCK}` for arm A is the empty string. **Line-break accounting:** in arm A the template therefore yields `...{passage}\n\nQUESTION:` (one blank line); in arms B/C/D it yields `...{passage}\n\nGLOSSARY (source: passage)\n- ...\n\nQUESTION:`. The difference is *exactly one newline pair plus the block text*; this is the entire manipulation. Logged and asserted.
- No system prompt is used beyond the template (Qwen chat template's default system string, if any, is applied identically to all arms by the chat template and is logged).
- **Do not mention "glossary", "definitions", or the block in the instruction text.** The instruction refers only to PASSAGE and QUESTION, so arms B/C/D differ only in the material attached to the passage — not in what the model is instructed to do with it. (The label inside the block says `GLOSSARY (source: passage)`; this is the shape manipulation.)

### 2.2 Rendered example (illustrative, arm placement only; real items come from `items.jsonl`)

Arm A (block empty):
```
... PASSAGE:
Coronary artery disease is caused by plaque buildup...
```
Arm B/C/D (same passage, same question):
```
... PASSAGE:
Coronary artery disease is caused by plaque buildup...

GLOSSARY (source: passage)
- plaque: a deposit of fatty material on the inner wall of an artery.
- artery: a blood vessel that carries blood away from the heart.
- ...

QUESTION:
What causes coronary artery disease?
```

### 2.3 Files
`prompts/{item_id}_{arm}.txt` — verbatim rendered prompt, UTF-8, no trailing-space normalization. `prompts/index.csv` — `item_id, arm, prompt_sha256, prompt_tokens, block_tokens`.

---

## 3. Glossary construction (arm B) — procedure, rules, token targeting

### 3.1 Term extraction rule (deterministic, pre-hoc)
Input: passage only (never the question, never the answer key, never external text).

1. Tokenize passage with `spacy` (`en_core_sci_sm`, pinned version in `requirements.lock`). (Fallback if unavailable: `en_core_web_sm`; record which.)
2. Candidate spans = **noun phrases** (spaCy `noun_chunks`) whose **head** is a `NOUN` or `PROPN`, **and** that satisfy at least one of:
   - (a) head appears in the item's UMLS-derived domain set: for each `<Question focus>`/`<Synonyms>` CUI in the record, pull the CUI's preferred term + synonyms from the **UMLS MRCONSO subset restricted to the item's CUIs**; then accept candidate head if its lemma is in the *passage* and is **not** a top-2,000 English word (`wordfreq` zipf ≥ 4.5) — i.e. domain-jargon filter; **or**
   - (b) the noun phrase is a multiword technical phrase (`len(tokens) ≥ 2`) whose head is absent from the top-2,000 list.
3. **Deduplicate** by lemma (case-insensitive), keep first surface form as printed in the passage.
4. **Rank** candidates by: (i) frequency in passage desc, (ii) earliest first position asc, (iii) longer phrase first. Take the **top 12** as the headword list `T = [t_1 … t_k]`, `k ≤ 12`.
5. Freeze: `glossary_terms.jsonl` → `{item_id, term_surface, term_lemma, char_span_in_passage, rank}`. **The same `T` (same order, same surface) is used for B, C and D** — headword identity is held constant; only the gloss text and its provenance change.

### 3.2 Definition-only constraint (arm B)
For each `t_j ∈ T`, the gloss string `g_j` must satisfy:

- **Passage-extracted:** `g_j` is one of the item passage's own sentences (or an exact clause of one) that contains `t_j` **or** a morphological variant/abbreviation of `t_j`, and that has a copular/definitional form: matches `^(X (is|are|refers to|means|is defined as|occurs when|results from|is caused by)\b)` after substituting the head, or the sentence is a `nsubj`–`cop`–`attr` clause in the spaCy parse. If no such sentence exists for `t_j`, drop `t_j` (do not paraphrase, do not use world knowledge).
- **Copy-exact:** `g_j` is copied verbatim from the passage (no rewriting, no LLM summarization) — this keeps B strictly *passage-derived* and makes H1's mechanism claim (passage-consistent paraphrase) well-posed.
- **Definition-only:** `g_j` must contain **no** (i) numeric dosing/quantity tokens beyond what is inside the defining clause, (ii) imperative/advice verbs (`take`, `avoid`, `call`, `see your doctor`), (iii) statistics (`%`, `risk of`, `chance of`), (iv) hedges that add new commitments (`may`, `can`, `sometimes`) unless present in the source clause. Violations → drop `t_j`.
- **One gloss per headword, one line per headword:** `- {t_j}: {g_j}`. No synonyms lists, no etymology, no examples, no "see also".
- If fewer than 5 headwords survive, the item is **ineligible for B** → replace item (§1.6 substitution rule) and log; do not pad with weaker definitions.

### 3.3 ~200-token targeting with tokenizer verification
- Tokenizer: `AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct", revision=<pinned sha>, trust_remote_code=False)`; count with `add_special_tokens=False`.
- **Target:** block token length `L_B ∈ [190, 210]` (i.e. 200 ±5%).
- **Procedure:** add headwords in rank order `t_1, t_2, …` with their glosses; after each addition compute `L_B`; stop at the **largest prefix with `L_B ≤ 210`**; then if `L_B < 190`, either (i) extend the longest gloss to its full containing sentence if that stays ≤210, or (ii) drop the item (no filler added to B — filler would import the C confound into B). `L_B` distribution over the 30 items is reported; target: [`190,210`] for ≥27/30 items, else stop and fix the term budget (recorded as a protocol revision, not silently).
- Note the block text is `GLOSSARY (source: passage)\n` + lines + `\n`; the header line (~5 tokens) is counted inside `L_B` (i.e. `L_B` is measured from the first char of `GLOSSARY` to the last char of the last gloss line, and the template adds the surrounding newlines identically for B, C, D).

### 3.4 Cross-arm length matching (±5%)
For each item, after constructing B, C, D (procedures §4), require:

    |L_B − L_C| ≤ 5% of L_B  AND  |L_B − L_D| ≤ 5% of L_B   (equivalently, L_C, L_D ∈ [0.95·L_B, 1.05·L_B])

If violated, adjust in this fixed order and log which lever fired:
1. C: add/remove neutral filler lines (`- FILLER_n: <neutral sentence>`) to hit the band (C's content is filler by design, so length is its only constraint aside from §4.1's non-priming check).
2. D: extend/truncate external definitions to their full first sentence / first clause, or substitute the next-ranked single-sentence lexicon sense, to hit the band.
3. B: only if both fail, drop the lowest-ranked headword from B **and from C and D** (headword list stays shared) and re-run 1–2.
If still out of band after 3 attempts, drop the item and substitute (§1.6). Log `attempts, levers_used` per item in `glossary_audit.csv`.

Automatic gate before generation: `python check_blocks.py` asserts §2 (1–5) and §3.4 for all 30 items; exit code 0 required.

---

## 4. Arms C and D construction

### 4.1 Arm C — length-matched neutral filler, same format/label
**Design choice, stated explicitly:** in arm C the headword *slots* are filled with opaque placeholder tokens (`TERM_1, TERM_2, …, TERM_k`) in the same order, and the gloss slot is filled with neutral, medical-content-free sentences that are **not** definitions of anything:

- Neutral filler pool (frozen, `config/filler.txt`, 60 sentences): sentences about text formatting and process, e.g. `- TERM_1: this line holds a fixed number of words used as spacing.` / `- TERM_2: the following line is present only to occupy length in this section.` Each filler sentence is written to (i) contain no biomedical content word, (ii) not be a definition of the placeholder, (iii) match the surface shape `- <placeholder>: <sentence>.`
- Because the headwords are placeholders, C cannot prime the model toward the item's actual terms — this is what makes C the *length + shape only* control. (Alternative "real headwords with neutral glosses" was considered and rejected: real headwords would import H4 priming into C, contaminating the T3 cell. Recorded as an explicit design decision, and §7.7 reports a sensitivity note on it.)
- Fill to the length band per §3.4 lever 1.

### 4.2 Arm D — external-lexicon definitions of the SAME terms
- Same `T` (same surface forms, same order, same count). Gloss slot filled from an **external lexicon only**, never the passage:
  - **Source:** UMLS `MRDEF` (definitions) for the CUI matched to `t_j` via `MRCONSO` (exact string or lemma match, restricted to the item's semantic group); fallback in fixed order: `MRCONSO` preferred term + UMLS semantic type gloss template (`"{term}: a {semantic_type} concept in the UMLS."`) — **no** such template may be used for more than 3 of the 12 headwords; second fallback: a frozen medical dictionary file (`config/lexicon_fallback.jsonl`, e.g. public-domain MedlinePlus/WordNet glosses), **not** any generative model.
- **Definition-only** constraint identical to §3.2 (no advice, no dosing, single sentence, one line per headword).
- **Contradiction tally (per item, pre-registered H4′ instrument):** for each `(t_j, g_j^D)`, a human coder labels `{consistent, silent, conflicting}` w.r.t. the passage's own statement about `t_j` (3-way; two coders on all items, κ reported). Counts `n_conflict[i]` recorded. This is both a prediction variable and a validity check on D.
- Fill to the length band per §3.4 lever 2.
- **No LLM is used anywhere in constructing any block** (B, C, D). This is a hard rule: an LLM-written glossary would inject generation-model variance into the independent variable.

---

## 5. Inference settings

### 5.1 Model, revision, tokenizer
- Model: **`Qwen/Qwen2.5-7B-Instruct`** (Qwen2ForCausalLM, 28 layers, hidden 3584, bf16, `max_position_embeddings` 32768, vocab 152064).
- **Pin an immutable revision:** resolve `main` to its commit SHA at run time and hard-code it: `REVISION=<40-char sha of Qwen/Qwen2.5-7B-Instruct @ freeze>`; download with `snapshot_download("Qwen/Qwen2.5-7B-Instruct", revision=REVISION)`; record `SHA256` of `config.json`, `generation_config.json`, `tokenizer.json`, and every `*.safetensors` file. (At time of writing `main`'s last commit is 2025‑01‑12; the executor records the exact SHA in `run_manifest.json` §11.)
- Tokenizer: same revision; used for all token counting (prompts, blocks, outputs).

### 5.2 Decoding parameters (all pre-registered)
Load with **vLLM** (pinned version) `AsyncEngineArgs`/`SamplingParams` **and** record the equivalent `transformers` `generate` settings:

| Parameter | Value | Note |
|---|---|---|
| `temperature` | **0.0** | argmax / greedy |
| `top_p` | 1.0 | irrelevant at T=0; logged for completeness |
| `top_k` | -1 | |
| `do_sample` | **False** | overrides the repo's `generation_config.json` defaults (`temperature 0.7`, `top_p 0.8`, `top_k 20`, `repetition_penalty 1.05`) — these defaults must **not** leak in; assert them off |
| `repetition_penalty` | **1.0** | same reason (repo default 1.05) |
| `max_new_tokens` | **256** | 2–5 sentences at ≤60 tokens each, with headroom |
| `min_new_tokens` | 8 | prevents empty stingy outputs |
| `stop` | `<\|im_end\|>` | Qwen chat EOS |
| `seed` | 0 | with T=0 and no sampling, seed is a formality; set it and record |
| batching | **batch size 1**, one request at a time, arms **interleaved per item** (A,B,C,D,A,B,C,D…) | avoids batch-dependent nondeterminism and any ordering drift |
| engine | `enforce_eager=True`; `gpu_memory_utilization=0.90`; single GPU | documented for reruns |

### 5.3 Prompt logging (verbatim) and run integrity
- Log per request, in `runs/run_<date>/generations.jsonl`:
  `{item_id, arm, prompt_verbatim, prompt_sha256, prompt_tokens, block_tokens, seed, sampling_params_json, model_revision, vllm_version, transformers_version, torch_version, cuda_version, gpu_name, driver, request_index, started_at_utc, latency_s, output_text, output_tokens, finish_reason}`.
- **Prompt-hash verification:** for every request, recompute `sha256(prompt_verbatim)` and compare with `prompts/index.csv`; any mismatch aborts the run.
- **Determinism audit:** re-run **4 items × 4 arms = 16 generations** at the end of the run and require `output_text` byte equality. If any differ, report the count and the model/engine setting responsible; if >0 differ, flag temperature-0 as not bit-reproducible in this stack and switch all analysis to a *pair-level* statement with the differing items listed (do not silently average).
- Chat wrapper: only the tokenizer's `apply_chat_template([{"role":"user","content": rendered_prompt}], add_generation_prompt=True, tokenize=False)` is used; the rendered template string is logged (`chat_template_sha256` stored in the manifest). No system message beyond the template default.

### 5.4 Failure handling at generation time
- Empty/refusal output (per §1.6 list) or `finish_reason == "length"` with truncated sentence: **retry once** with identical settings; if identical failure, keep the output and mark `generation_status ∈ {ok, empty, refusal, truncated}`. `empty|refusal` → item substitution (§1.6) applies only if it occurs in arm A row 1. All statuses are reported per arm; a systematic arm-imbalance in statuses is itself a finding.
- No retries change prompts; retries change nothing except the retry count.

---

## 6. Claim-level faithfulness measurement pipeline (step by step)

All judging models run at temperature 0 with pinned revisions (§5.1-style), and every judge prompt is logged verbatim. All judge calls happen **after** `generations.jsonl` is frozen and hashed, so generation cannot see measurement.

### 6.1 Step 1 — Sentence split and normalization
`spacy` `en_core_sci_sm` sentence segmentation on `output_text` (fallback: `blingspacy`/regex; record which). Strip the model's "ANSWER:" echo if present. Record `n_sentences`.

### 6.2 Step 2 — Claim atomization (FActScore-style, arXiv:2305.14251)
For each sentence, call the **atomizer** judge: `Qwen/Qwen2.5-72B-Instruct` (pinned revision), temperature 0, `max_new_tokens=512`, prompt:

```
Split the following sentence into the smallest possible set of simple, self-contained factual claims.
Each claim must:
- be a single declarative proposition about one thing,
- stand alone (resolve pronouns and definite references into explicit nouns using the sentence itself),
- contain no hedging, no conjunction ("and", "but", "because", "while"), and no comparisons across claims,
- be a verbatim-spanning rewrite: do not introduce any fact, number, or entity that is not in the sentence.
Return ONLY a JSON array of strings, e.g. ["claim 1", "claim 2"].

SENTENCE:
{sentence}
```
- Output validated as JSON array of non-empty strings; if invalid, one repair pass with the parse error appended; if still invalid, mark `atomization_failed` and fall back to splitting on `;`/`,` at clause boundaries with the failure logged.
- Claim IDs: `{item_id}_{arm}_s{sentence_idx}_c{claim_idx}`. Claims from all arms of the same item are pooled in one file but **never** shown to a judge together with arm labels.
- `n_claim[i,a]` = number of atomic claims.

### 6.3 Step 3 — Support labeling (primary judge)
For each atomic claim, **primary judge**: `Qwen/Qwen2.5-72B-Instruct`, temperature 0, `max_new_tokens=8`. Prompt is a strict two-label version of the AttrScore attribution prompt (arXiv:2305.06311, Appendix C "Attribution"):

```
You verify whether a PASSAGE supports a CLAIM.

Label the CLAIM with exactly one word:
SUPPORTED  - the PASSAGE entails the claim, including straightforward paraphrases.
UNSUPPORTED - the PASSAGE does not entail the claim. This covers:
  - the claim contradicts the PASSAGE,
  - the claim adds information the PASSAGE does not state,
  - the claim generalizes or hedges beyond what the PASSAGE states.

Judge only against the PASSAGE. Do not use outside knowledge. Topical overlap is not support.
Answer with one word.

PASSAGE:
{passage}

CLAIM:
{claim}

LABEL:
```
- Parse first token in `{SUPPORTED, UNSUPPORTED}` (case-insensitive); else mark `parse_error` and re-ask once; else route to human adjudication (§6.6).
- `f[i,a] = mean(label == SUPPORTED)`, `n_sup[i,a] = sum(...)`.
- The passage shown is the **same** passage for all four arms (the glossary block is **not** shown; faithfulness is to the passage, not to the block — otherwise B could be "supported" by its own glossary).

### 6.4 Step 4 — NLI cross-check (arXiv:2305.14627 style citation-recall NLI)
- Second, independent scorer: an NLI model, **`facebook/bart-large-mnli`** (pinned revision; fixed because it is deterministic and cheap), premise = passage, hypothesis = claim, `max_length=1024`. Decision rule: `SUPPORTED` iff `entailment` is the argmax **and** `p(entailment) ≥ 0.5`; otherwise `UNSUPPORTED`.
- Compute **agreement** between Step 3 and Step 4 at the claim level: raw agreement, Cohen's κ, and per-arm disagreement rates. Report `f_nli[i,a]` and the whole §7 analysis re-run on `f_nli` as a **sensitivity replicate** (pre-registered as secondary, not primary).

### 6.5 Step 5 — RAGTruth-style typing of unsupported claims (arXiv:2401.00396 §3.1 taxonomy)
For every claim labeled `UNSUPPORTED`, the **typist** judge (`Qwen2.5-72B-Instruct`, T=0) assigns exactly one of:

- `EC` **Evident Conflict** — direct contradiction/opposition to the passage (wrong number, wrong name, reversed relation).
- `SC` **Subtle Conflict** — departure/divergence altering intended meaning (term substitution with different severity/implication).
- `EBI` **Evident Baseless Information** — fabricated detail not substantiated anywhere in the passage.
- `SBI` **Subtle Baseless Information** — inferred extension, generalization, norm, or sentiment beyond the passage.

Prompt:
```
A PASSAGE and a CLAIM are given. The CLAIM is known to be UNSUPPORTED by the PASSAGE.
Classify why, with exactly one label:
EC  = Evident Conflict: the claim directly contradicts the passage (wrong fact, number, name, or reversed relation).
SC  = Subtle Conflict: the claim departs from the passage's intended meaning (substitution of terms with different implications or severity).
EBI = Evident Baseless Information: the claim invents details with no basis in the passage.
SBI = Subtle Baseless Information: the claim extends the passage with inferred detail, generalization, or a common norm not stated.
Answer with exactly one label.

PASSAGE:
{passage}

CLAIM:
{claim}

LABEL:
```
- Reported per arm as **error-type shares** (EC/SC/EBI/SBI as fractions of unsupported claims), plus counts. §7.6 gives the pre-registered per-hypothesis type profiles.

### 6.6 Step 6 — Human verification subsample and reliability
- **Judge-vs-human:** draw a **stratified random subsample of 120 claims** (seed 20250102): 60 `SUPPORTED` and 60 `UNSUPPORTED` per the primary judge, drawn **proportional within arm** (≥15 per arm), plus an **oversample of 40 claims where the primary judge and NLI disagree** (to estimate the disagreement population's human-corrected rates). Total human-labeled claims: **160**.
- Two annotators (biomedical background) label each claim `SUPPORTED/UNSUPPORTED/AMBIGUOUS` blind to arm; disagreements adjudicated by a third. Reported: per-arm judge accuracy vs human majority label, Cohen's κ (pairwise) and Fleiss' κ (three-way with adjudication as tiebreak), and confusion matrix. **Pre-registered rule:** primary-judge accuracy on `SUPPORTED`/`UNSUPPORTED` must be ≥0.85 with κ ≥ 0.6 for the pilot's rate estimates to be treated as valid; below either, §6.3 labels are replaced by human labels for the 160-claim subsample *and* the pilot is flagged as protocol-calibration-incomplete (§8.4).
- **Atomization check (separate, small):** 30 sentences (one per item, random arm) human-checked for split correctness (FActScore reports 18% splits/34% merges by experts; we report our own split/merge rate).
- **Arm-blindness:** annotators see `{passage, claim}` only. The `item_id` is replaced by a random code; the mapping is sealed until labels are returned.

### 6.7 Step 7 — derived per-claim features (for §7.6/§7.7)
Per claim, mechanically (no judging): `mentions_glossed_term` = 1 if the claim's lemma set intersects `T`'s lemma set (∪ morphological variants). This defines the pre-registered **definition-relevant subset** (claims = 1) vs **control subset** (= 0). Also per item-arm: **glossary utilization rate** = |T ∩ answer lemmas| / |T|; `n_conflict[i]` from §4.2.

---

## 7. Analysis plan (all pre-registered; n = 30 paired items)

### 7.1 Per-arm descriptive
For each arm: mean/median `f`, mean/median `n_claim`, mean/median `n_sup`, empty/refusal rate, `f` per stratum, with **item-bootstrap 95% CIs** (below). Report the full per-item table (`per_item.csv`) — every number in the paper must be traceable to it.

### 7.2 Paired differences and bootstrap
For each contrast `c ∈ {BA, CA, CB, DB, DC}` and each metric `m ∈ {f, n_sup, f_defrel, f_control}`:
- `d_c[i] = m[i, later] − m[i, earlier]` for `i = 1..30`.
- **Point estimate:** **median** of `d_c` (primary; the decision rule in `hypotheses.md` is stated on medians) and **mean** (reported alongside; disagreement between mean and median is itself reported — it signals outlier items).
- **CI:** paired **item bootstrap**, `B = 10,000` resamples of the 30 item indices (with replacement), percentile 95% CI; `numpy.random.default_rng(20250103)`; for each resample recompute median (and mean). CI reported for both.
- Also report: sign count (how many of the 30 items are positive), and the **full 30-element vector** (never only the summary).
- Bonferroni: 5 contrasts × primary metric → α' = 0.01 for *exploratory* flagging; but the decision rule of §7.4 is explicitly **not** a multiplicity-corrected significance test — it is a pre-registered description-with-thresholds, and every CI is reported raw so the reader can correct.

### 7.3 Co-primary: supported-claim count
`Δcount_c` = median/mean of `(n_sup[later] − n_sup[earlier])` + bootstrap CI, and `Δn_claim` for the same comparison. **Attrition test (pre-registered):** "rate rises while supported count stays flat" = `median(f_B − f_C) > 0` **AND** `Δcount_CB` CI contains 0 **AND** `median(n_claim[B] − n_claim[C]) < 0` (fewer total claims). Report this pattern explicitly whenever it appears.
Rationale: a rate can rise simply because a model produces fewer, safer claims; `n_sup` is the co-primary that does not reward that.

### 7.4 Decision rule mapping outcomes → H1 / H2a–H2e (pre-registered, exact)

Let `lo3, hi3` = 95% bootstrap CI of `median(d_CB)`; `lo4, hi4` for `median(d_DB)`; `lo1, hi1` for `median(d_BA)`; `lo2, hi2` for `median(d_CA)`; `lo5, hi5` for `median(d_DC)`; `M*` = the corresponding medians; `M*_high`, `M*_low` the stratum medians (`M3_high`, `M3_low`); `r1` = Pearson r over the 30 items between `d_CA[i]` and `d_BA[i]`; `attrition` = the §7.3 pattern.

Applied **in this order**; first rule whose condition holds is the reported primary classification, and **all** rules' conditions are printed in the results table so the reader sees near-misses.

| # | Hypothesis | Condition (all must hold) |
|---|---|---|
| **R1** | **H1 (definitional content)** | `M3 > 0` **and** `lo3 > 0` **and** `M4 > 0` **and** `lo4 > 0` **and** `M3_high > M3_low`. (H1's own doc also requires `M1 > 0`; we report `M1` but do **not** require it for R1, because H1's mechanism clause is defined on T3/T4; if `M1 ≤ 0` we report "H1 mechanism holds but naive direction reverses" as a separate line.) |
| **R2** | **H2a — length dominates** | `|M2| ≥ |M3|` **and** `lo2, hi2` excludes 0. (Doc form: `|Δ_A−C| ≥ |Δ_B−D|` ⇔ `|M2| ≥ |M4|`; we test **both** `|M2| ≥ |M4|` and `|M2| ≥ |M3|` and report which version triggered — `|M2| ≥ |M4|` is the doc's literal form and is checked first.) |
| **R3** | **H2b — H2 (append hurts)** | `M2 < 0` **and** `M1 < 0` **and** `hi2 < 0` **and** `hi1 < 0` (both appends degrade). |
| **R4** | **H2c — shape/label dominates** | `M3 ≈ 0` **and** `M2 ≈ 0` **and** `M5 ≈ 0` **and** `M1 > 0` where **≈ 0 := |M| ≤ 0.05** (5 pp band) with the CI inside [−0.10, +0.10] — plus, if `r1 > 0.6`, the stronger "same items move under C and B" statement. (Doc form `Δ_C−B ≈ 0` is exactly `M3 ≈ 0`.) |
| **R5** | **H2d — priming/salience dominates** | `M4 ≈ 0` **and** `M1 > 0` **and** `M5 > 0` (i.e. `f_D − f_A > 0`), with `≈ 0` as in R4. |
| **R6** | **H2d′ — conflict sub-case** | `M4 > 0` **and** the items with `n_conflict[i] ≥ 1` carry ≥50% of the total `d_DB` mass, and `M5 > 0`. |
| **R7** | **H2e — attrition** | §7.3 pattern holds for the T3 contrast. |
| **R8** | **Inconclusive at pilot precision** | none of R1–R7; label explicitly "no pre-registered pattern reached; instrument precision insufficient." **Not** "no effect." |

**Numeric instantiation of the doc's escalation thresholds** (used both in R4/R5's "≈ 0" and in §8):
`content effect`: `median(d_DB) ∈ [0.10, 0.20]` with `lo4 > 0.05`; `confound effect`: `|M2| ≥ 0.10` with CI excluding 0.

### 7.5 Confound-separation diagnostics (report regardless of classification)
1. **`M2` vs `M1`** — how much of the naive effect is filler-shaped.
2. **`M3` vs `M5`** — is the glossary residual bigger than the "any definitions (even external)" residual? (`M3 − M5`)
3. **`r1`** (Pearson over items of `d_CA` vs `d_BA`) with CI (`r` reported with 10k item bootstrap; the doc's a priori threshold is `r1 > 0.6`).
4. **Correlation `corr(jargon_density[i], d_CB[i])`** (pre-registered secondary; H1 predicts > 0).
5. **Stratified `M3_high` vs `M3_low`** with separate CIs and a paired medians test (sign test on the 10 high vs 10 low `d_CB` values → exact binomial; report p uncorrected).
6. **Error-type share table** per arm (EC/SC/EBI/SBI) and the subset split (`f_defrel`, `f_control`) per §6.7.
7. **Glossary utilization rate** per arm, and `n_conflict` distribution (H4′ validity).

### 7.6 Pre-registered per-hypothesis error-type profiles (what the table should look like if each is true)
- **H1:** B reduces `EBI`+`SBI` on **definition-relevant** claims vs C, with `EC/SC` roughly unchanged (fewer un-attributable restatements, not fewer contradictions).
- **H2 (length):** all four types rise roughly uniformly in C and B vs A; effects appear in **both** subsets.
- **H3 (shape):** C and B have the **same** type share shift vs A.
- **H4 (priming):** D and B both shift share vs C; no term-specific concentration of the shift.
- **H4′ (conflict):** D specifically **adds** `EBI`/`SC` on claims mentioning conflict-flagged terms; `corr(n_conflict[i], d_DB[i]) > 0` expected in the conflict direction.

### 7.7 Sensitivity analyses (pre-registered; all reported, none replaces the primary)
(a) `f_nli` replicate of §7.2 decision objects; (b) human-labeled 160-claim subsample recomputed decision objects; (c) 0-claim/atomization-failed items excluded (and the count reported); (d) item-level leave-one-out: recompute `M3`,`M4` with each of 30 items dropped, report the range (identifies single-item leverage); (e) results with `mean` instead of `median`; (f) note on arm C's placeholder-identity design (would be exploratory to change).
No exploratory analysis is presented in the primary results table; anything run after seeing data is in a separate `exploratory.md` with its own flag.

---

## 8. Pilot go/no-go validation checks and escalation threshold

### 8.1 Instrument-validity gates (checked **before** interpreting any effect; §8.4 defines failure)
| # | Gate | Pass condition |
|---|---|---|
| G1 | Prompt invariance | 120/120 prompts pass §2 assertions (non-block text byte-identical across arms). |
| G2 | Length matching | ≥27/30 items with `L_C, L_D ∈ [0.95, 1.05]·L_B`; all 30 reported with the ratio. |
| G3 | Determinism | 16/16 repeat generations byte-identical (§5.3); if not, reported and pair-level handling adopted. |
| G4 | Atomization sanity | `n_claim` mean ≥ 3 per arm; ≤ 2/120 item-arms with `atomization_failed`; human split/merge rate reported. |
| G5 | Judge–human agreement | primary judge accuracy ≥ 0.85 and κ ≥ 0.6 on the 160-claim subsample. |
| G6 | Judge–NLI agreement | claim-level κ ≥ 0.4 between primary judge and NLI; disagreement rate reported per arm. |
| G7 | Generation status balance | per-arm empty+refusal+truncated rate ≤ 10% and arm-to-arm difference ≤ 2 items. |
| G8 | Denominator stability | mean `n_claim` differs by ≤ 20% between the max and min arm (else attrition confounds every rate comparison and must be reported first). |
| G9 | No block-construction leakage | 0/30 items where a B gloss is not verbatim in the passage; 0/30 where D gloss was taken from the passage (checked by string containment); C non-priming assertion passes. |

### 8.2 Escalation threshold (when a scaled study is worth mounting)
Escalate to a powered study (≥150–300 items, ≥2 models, temp-robustness, ≥2 glossary lengths) if **either**:

- **(E1) load-bearing content signal:** `median(d_DB)` with 95% CI **excluding 0** and **lower bound ≥ 0.05**, `median(d_DB) ∈ [0.10, 0.20]`-ish band reported, **and** the same-sign definition-relevant-subset differential `median(d_DB on f_defrel) > 0`; **and** the confound estimates are separable (i.e. R1 does not co-trigger with R2/R4/R5 by the §7.4 ordering, or the §7.5 diagnostics show `|M3| > |M2|`); **or**
- **(E2) confident confound-dominance:** `|M2| ≥ 0.10` with CI excluding 0 (or `|M1| ≥ 0.10`) **and** `M3 ≈ 0` (5 pp band) — the "glossary gains are length/shape artifacts" claim becomes escalation-worthy.

**Also escalate if:**
- **(E3) `|M2| ≥ 0.10` with CI excluding 0** even when content effect is null — the length/shape confound alone justifies a scaled study, because it would mean `+200` tokens is not a safe manipulation size in this literature;
- **(E4) protocol quality alone:** if G1–G9 all pass and `σ_d` estimates are small enough that a scaled study would reach the 5 pp CI lower bound at feasible n (report the implied required n from the observed `σ_d`), escalate on protocol grounds even with small effects — this is exactly the pilot's stated purpose.

### 8.3 No-go / do-not-escalate
- `|M3| < 0.05` and `|M2| < 0.10` and `|M1| < 0.10` **with** G-gates passing → "no pilot-detectable pattern at this precision"; report as inconclusive, do not escalate on effect-size grounds (E4 may still apply).
- Any of R1–R8 = "Inconclusive" plus `σ_d` so large that the required n is implausible → report and stop.

### 8.4 Instrument-failure handling (debug, do not interpret)
If **any** of the following, the pilot is declared **instrument failure**, results are *not* interpreted as evidence for/against any hypothesis, and the pipeline is debugged and re-run: (a) G1/G2/G9 fail; (b) G5 fails and the human-labeled subsample cannot be completed; (c) G7/G8 fail such that arms differ systematically in output availability/length not attributable to the block; (d) >3 item substitutions in any stratum. The write-up in that case is a *protocol report*: what broke, what was changed, the frozen `prereg.md` hash, and the re-run plan.

---

## 9. Worked decision table (how the numbers map; template to fill at analysis time)

| Outcome (filled after run) | Holds | Reported claim |
|---|---|---|
| M3=__ [__ , __]; M4=__ [__ , __]; M3_high=__, M3_low=__ | R1 if conditions | "definitional content, passage-derived, survives length/shape and priming controls (pilot precision)" |
| M2=__ [__ , __]; M1=__ | R2/R3 | "appending ~200 tokens dominates; glossary content unresolved" |
| M3=__; M2=__; M5=__; M1=__; r1=__ | R4 | "shape/label account; glossary content unsupported at pilot precision" |
| M4=__; M1=__; M5=__; n_conflict mean=__ | R5/R6 | "priming/salience (or source-conflict) account" |
| M3=__; Δcount_CB=__; Δn_claim_CB=__ | R7 | "attrition: rate rises, supported count flat" |
| none | R8 | "inconclusive at pilot precision" |

---

## 10. Risks / what could still go wrong (stated so the executor recognizes it)
1. **Ceiling effect in arm A:** MedQuAD answers are themselves expository; a model grounded on them may already be near `f ≈ 0.9`, leaving no headroom for any append. Detection: per-arm `f` distribution (G8 adjacent); remedy is a protocol note, not a filter change mid-run.
2. **Short outputs:** if answers are 1–2 sentences, `n_claim` may be 1–3 and rates become coarse (0, 1/2, 1/3). Detection: `n_claim` histogram per arm; reported as a precision limitation, not fixed by changing `max_new_tokens` mid-run.
3. **Glossary too thin:** some passages may yield <5 clean definitional sentences → substitution rate; cap stated in §1.6.
4. **Judge bias toward `SUPPORTED` on paraphrase:** quantified by G5/G6; if κ < 0.6, human labels become the rate source for the subsample and the conclusion is downgraded accordingly.
5. **NLI over-flagging unsupported (BART-MNLI is not biomedical):** why it is a *cross-check*, not the primary; both are reported, and disagreement is routed to the human subsample (§6.6) — the RAGTruth-style typology explains what kind of disagreement, it does not resolve which label is right.
6. **Single model, single temperature, single glossary length:** no generalization claim is made anywhere (§8.2's escalation is the path to generality).

---

## 11. Artifacts and reproducibility list

Required to be produced, versioned, and linked from the write-up (hash everything):

1. `prereg.md` (+ `sha256`) — frozen before any generation; contains §1.6 seeds/terciles, §2 template, §3–§4 procedures, §7 decision rule, §8 gates/thresholds.
2. `items.jsonl` (30), `sample_frame.csv`, `config/{boilerplate.txt,refusals.txt,filler.txt,lexicon_fallback.jsonl}`, `config/terciles.json`.
3. `glossary_terms.jsonl`, `blocks_B.jsonl`, `blocks_C.jsonl`, `blocks_D.jsonl`, `glossary_audit.csv` (lengths, levers, attempts), `conflict_tally.csv` (+ κ).
4. `prompts/{item}_{arm}.txt` (120), `prompts/index.csv` (sha256 + token counts).
5. `runs/run_<date>/generations.jsonl`, `run_manifest.json` (model revision SHA, file SHA-256s, vLLM/transformers/torch/CUDA/driver/GPU, all sampling params, `chat_template_sha256`, seeds, wall-clock, per-request latency), `determinism_repeats.jsonl`.
6. `analysis/{claims.jsonl (atomizer output), labels_primary.jsonl, labels_nli.jsonl, labels_human.jsonl, types.jsonl, per_item.csv, per_item_full.csv, decisions.json}`.
7. `analysis/decision_table.md` (§9 filled), `analysis/exploratory.md`, `analysis/figures/` (per-arm `f` with CIs; 30-element dot plots for each contrast; error-type stack; `f_defrel` vs `f_control`).
8. `requirements.lock` (incl. `transformers`, `vllm`, `spacy` + `en_core_sci_sm` model SHA, `torch`, `numpy`, `scikit-learn`), `Dockerfile` (CUDA base), `run.sh` one-command pipeline (`00_build_blocks → 01_check_blocks → 02_generate → 03_atomize → 04_label → 05_type → 06_analyze`), each step idempotent and hash-checking its inputs.
9. `LICENSE-NOTICE.md` — MedQuAD CC BY 4.0 attribution; note that no MedlinePlus answer text is redistributed beyond the repo's own terms (arms B/C/D glosses are passage-derived or lexicon-derived, with lexicon license per source).
10. `datasheet.md` — the 30 items with provenance (subset, qtype, CUI, URL field from XML), 1 paragraph.

**Reference list for the protocol** (cited in the write-up): FActScore arXiv:2305.14251 (atomization procedure, Table 15 prompt family; expert split 18% / merge 34%); AttrScore arXiv:2305.06311 (Appendix C attribution prompt, three-label version, `Attributable/Contradictory/Extrapolatory`; qualitative error modes: overlooking contextual cues 79.4%, fine-grained information insensitivity 13.8%, symbolic operators 6.8%); RAGTruth arXiv:2401.00396 §3.1 (Evident Conflict / Subtle Conflict / Evident Baseless Info / Subtle Baseless Info) and §3.4 (implicit-true rule: unmentioned-but-true counts as hallucination — we adopt exactly this rule and record it); ALCE arXiv:2305.14627 §3.3 (TRUE-NLI citation recall: claim supported iff the passage entails it); DiPMT arXiv:2302.07856 and medical MT glossary arXiv:2408.16440 (the bundled-manipulation critique that motivates the C/D arms); context-length arXiv:2510.05381 (length confound — **analogy only**, effects at 7K–30K tokens, not at +200); MedQuAD (Ben Abacha & Demner-Fushman 2019, CC BY 4.0).

---

## 12. Rough compute budget (feasibility estimate, not a measured cost)

**Generation (Qwen2.5-7B-Instruct, 1 GPU, batch 1):**
- 120 requests (+16 determinism repeats + up to ~24 retries/substitutions) ≈ **160 requests**.
- Per request: prompt ≈ max(1,600) tokens incl. passage (~250) + block (~200) + template (~120); output ≤ 256 tokens. ≈ **1,900 tokens total** per request → **≈ 0.3 M tokens** total.
- Throughput assumption: 1×A100-80GB (bf16, vLLM) at ~35–55 output tok/s, prefill negligible at this length: ≈ **10–20 min** wall-clock for all generation. (On a 1×L4/A10 it is ≈1–2 h; no flashy batching needed.)

**Measurement (judges, temperature 0):**
- Atomization: ~120 answers × ~3–5 sentences ≈ **450 calls** to Qwen2.5-72B-Instruct (short inputs, ≤ 512 out) → ≈ 0.3 M in-tokens. On 4×A100 (TP4) ≈ **30–60 min**; on an API ≈ negligible cost.
- Support labeling: ~450 sentences → ~**1,200–1,800 claims** × ~700 in-tokens ≈ 1.2 M tokens, ≤ 8 out → ~20–40 min.
- NLI: 1,800 claims × ≤1024 tokens on 1 GPU (BART-large) → ~10–20 min.
- Typing unsupported claims (~15–30% of 1,800 ≈ 300–500 calls) → ~10 min.
- **Judge total ≈ 1.5–2.5 GPU-hours (Qwen-72B) + ~0.3 GPU-hour (BART).**

**Human:** 160 claim labels × 2 annotators (≈1.5–2 h each) + adjudication (≈30 min) + 30 atomization checks (≈30 min) + 30-item D-arm conflict tally (≈1 h). ≈ **1.5 person-days** total.

**Block construction:** scripted, CPU only, ≈ minutes; plus human spot-check of 30/30 blocks (≈1 h) since block validity is the independent variable.

**Total, order of magnitude:** ≈ **4–6 GPU-hours** on 1×A100 (or ≈ 2 h on 4×A100 for the judge) and ≈ **2 person-days**. This is a run-on-one-box pilot; no cluster required. (Exact figures to be recorded in `run_manifest.json`.)
