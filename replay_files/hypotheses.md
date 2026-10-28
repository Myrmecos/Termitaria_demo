# Falsifiable Hypotheses: Definition-Glossary Effects on Claim-Level Faithfulness (MedQuAD Pilot)

**Status:** Pre-registered-style hypothesis set for a *reviewed experiment plan*, not a measured result.
**Instrument:** 30 MedQuAD items, Qwen2.5-7B-Instruct, temperature 0, ~200-token append. This is a **feasibility/pilot instrument**, not a powered test (see §4).

**Framing note.** The research question in the project seed ("does a definition-only glossary increase claim-level faithfulness?") is retained as the *ostensive* question, but the thesis claim is the confound-accounting one: *how much of any observed effect is attributable to prompt length, prompt shape/format, topic priming, versus definitional content?* The hypotheses below are constructed to make the confounds, not the glossary, the discriminating objects.

---

## Definitions and operationalization (needed to state falsifiable predictions)

Let per-item, per-arm *claim-support rate* be

    f_{i,a} = (# atomic claims in answer (i,a) supported by the passage) / (# atomic claims)

following FActScore-style atomic decomposition with binary passage-support labels (arXiv:2305.14251), optionally cross-checked with AttrScore attribution-error typing (arXiv:2305.06311). Undecomposable (0-claim) outputs are handled by a pre-registered rule (excluded from the denominator, counted separately as a failure mode; sensitivity analysis reported). Per-item paired differences are

    d_{i}(A→B) = f_{i,B} − f_{i,A}

Arms (from gap scan, fixed for this plan):

- **P** — passage-only instruction.
- **G** — passage + ~200-token passage-derived definition glossary (the "treatment").
- **L** — passage + ~200-token length-matched **neutral filler**, presented in the *same* labelled glossary-shaped section (length + shape control, little/no definitional content).
- **N** — passage + ~200-token **non-passage-derived** (external-lexicon) definitions of the same terms, same shape (priming/definition-source control).

Primary contrasts:

- **T1 (naive/ostensive effect):** d(G→P) — summary mean of d_i(P→G), i.e. glossary vs passage-only.
- **T2 (length+shape):** d(P→L).
- **T3 (shape/label alone, holding length):** d(L→G) — the glossary-specific residual over an equally long, identically shaped filler block.
- **T4 (definition source / priming):** d(N→G) — passage-derived vs external definitions of the same terms.
- **T5 (definition-layer over shape at the right baseline):** d(L→N) — external definitions over length/shape-matched filler.

---

## (1) Primary hypothesis — H1: definitional content is the mechanism

**H1 (directional + mechanistic).** Appending a ~200-token, definition-only glossary *derived from the passage* increases claim-level faithfulness relative to a passage-only instruction, **and the increase survives** a length- and shape-matched filler control. That is, the mechanism is *definitional grounding*: definitions supply passage-consistent paraphrases that let the model restate claims in terms it can attribute back to the passage, reducing unsupported elaboration.

**Stated as a testable prediction:**

- **Direction:** mean d(P→G) > 0.
- **Mechanism (the load-bearing clause):** mean d(L→G) > 0, i.e. the effect is not explained by the extra ~200 tokens or by adding a labelled "GLOSSARY:" section. If mean d(L→G) ≈ 0 (or reverses), H1's mechanistic claim is **falsified** even if the naive contrast is positive.
- **Diagnostic signature (mechanism, not just direction):** under H1, the unsupported-claim mass is disproportionately reduced among claims that *use or restate* passage terms defined in the glossary. This is testable by tagging each atomic claim as "definition-relevant" (mentions a glossed term or its definitional paraphrase) vs "other," and predicting a larger d(P→G) on the definition-relevant subset. A positive overall effect *without* differential movement on definition-relevant claims is evidence against definitional grounding as the mechanism (favoring gain-based explanations under H2/H3).

**Falsification conditions for H1:** (a) mean d(P→G) ≤ 0; or (b) mean d(P→G) > 0 on the naive contrast but mean d(L→G) ≤ 0 with a non-trivial positive d(P→L) (i.e. the "gain" is really filler/format), in which case H1's mechanism claim fails even if direction holds.

---

## (2) Competing/alternative hypotheses

These are not null hypotheses: each predicts a *specific positive effect with a different locus*, so the four-arm design can attribute variance rather than merely reject.

### H2 — LENGTH: the "effect" is prompt-growth degradation, not definitions

**Claim.** Any apparent effect of adding a glossary is dominated by the sheer added ~200 tokens degrading the model's ability to use the passage — consistent with arXiv:2510.05381 (a ~250-token prompt growth alone degrades performance 13.9–85% even with whitespace or attention-masked filler; at 7.5K whitespace tokens degradation begins within the 7K band well below retrieval failure, and it is present "regardless of the relative position between evidence and question," including when evidence is at the best positions). Under H2 the expected signature is **negative** d(P→L) and d(P→G), with the glossary's own content failing to overcome the length penalty.

**Note on scale (important for this pilot).** The cited degradation is demonstrated at *thousands* of tokens (7.5K–30K). A ~200-token append is far below that regime, so H2's *size* on this instrument is expected to be small; the pilot's job is to *estimate its sign and rough magnitude* at ~200 tokens, not to import the 13.9–85% range. This is itself a reported deliverable: "does the published long-context penalty extrapolate to the ~200-token append regime that glossary-injection papers actually operate in?" — a question the gap scan identifies as unanswered.

### H3 — SHAPE/FORMAT: the labelled-section treatment does the work

**Claim.** Any apparent effect is attributable to *prompt shape*, not content: adding a new labelled section ("GLOSSARY:"), a separator, and a list-formatted bundle changes the prompt distribution and instruction-following behavior, producing an effect with little or no lexical-semantic content requirement. This is the *bundle* critique of glossary-injection work (DiPMT arXiv:2302.07856; medical MT glossary arXiv:2408.16440), which treat content-plus-tokens-plus-labelled-section as one manipulation and therefore cannot separate the three. Under H3 the signature is d(P→L) ≈ d(P→G) ≠ 0 (same-sign, similar-size effects for filler and glossary), and d(L→G) ≈ 0.

### H4 — TOPIC PRIMING / SALIENCE: the effect is salience, not definitions

**Claim.** A passage-derived glossary names the passage's salient entities, which is a *salience aid* (it tells the model what to attend to and in what order), not definitional knowledge. Under H4, external-lexicon definitions of the same terms should reproduce the effect (or exceed it), because priming/salience operates regardless of whether the definition matches the passage. Signature: d(L→N) > 0 and d(N→G) ≈ 0 (or negative if non-passage definitions conflict with passage usage, which would be the *opposite* signature — see H4′).

**H4′ — CONFLICT (pre-registered sub-case).** If external definitions disagree with the passage's own usage or introduce out-of-passage facts, N may *lower* per-item faithfulness relative to G (d(N→G) > 0) by inducing claims the passage cannot support. This sub-case is distinguishable from H1 by the *error-type* profile: under H4′ the N arm inflates out-of-passage/ungrounded claims specifically on items where the external gloss contradicts the passage. Report the per-item contradiction tally for N, because it is both a prediction and a validity check on the N arm.

**Joint attribution statement the pilot is designed to support:** effect_G = effect from length + effect from shape/label + effect from priming/salience + residual definitional grounding. The primary deliverable is this decomposition and its uncertainty, not a single "glossary helps/doesn't help" verdict.

---

## (3) Measurement-level predictions (so the design can discriminate)

### 3.1 Direction/sign predictions on the primary contrasts

| Contrast | H1 (definition) | H2 (length) | H3 (shape) | H4 (priming) |
|---|---|---|---|---|
| d(P→G) naive | > 0 | < 0 (or ≈0) | > 0 (but mediated by shape) | > 0 |
| d(P→L) length-matched filler | ≈ 0 or < 0 | **< 0** (largest single effect) | ≈ d(P→G) (bucket for H3) | ≈ 0 or < 0 |
| d(L→G) glossary residual over filler | **> 0** (core prediction) | ≈ 0 (β_L dominates) | **≈ 0** (H3's core prediction) | > 0 |
| d(L→N) external definitions vs filler | ≈ d(L→G) (definitions matter, source less so) | ≈ 0 | ≈ d(P→G) (any labelled block helps) | **> 0** (salience) |
| d(N→G) G vs external definitions | **> 0** (passage-grounding matters) | ≈ 0 | ≈ 0 | **≈ 0 or > 0 only on H4′ contradiction items** |
| d(P→G) on definition-relevant claim subset | **> effect on other claims** | uniform, no term-related differential | uniform | ≥ effect on other claims (attention shift) |

Reading the table: the **discriminating cells** are d(L→G) and d(N→G) (and the definition-relevant subset differential). H1 and H3 are separated almost entirely by d(L→G); H1 and H4 by d(N→G) *plus* the definition-relevant subset differential, which is the only cell where H1 and H4 diverge in the same direction.

### 3.2 Distributional predictions (per-arm claim-support rates and per-item paired differences)

Because n = 30 paired items, predictions should be stated distributionally, not as point estimates.

1. **Per-arm claim-support rates** (mean over items, with item-bootstrapped 95% CIs; also report median and item-level variance): predicted orderings
   - H1: L ≈ P < N ≤ G (G highest; and importantly, the G−L gap is the load-bearing one).
   - H2: G ≤ L < P (append hurts; P highest).
   - H3: G ≈ L > P (glossary and filler both beat passage-only; glossary gain is "any block" gain).
   - H4: G ≈ N > L ≈ P (both definition arms beat both non-definition arms; passage-derived vs external not distinguishable).

2. **Per-item paired differences d_i** — report the full vector of 30 values, not just the mean. Predictions:
   - **H1:** mean d_i(L→G) > 0 with a *majority* of items positive; d_i(L→G) should be **correlated across items with the number/content of glossary terms actually used in each answer** (a within-item usage covariate is the cleanest mechanism test). Effect should be concentrated on items whose passages have more domain-jargon terms; the correlation between per-item glossary coverage (glossed terms per 100 passage tokens) and d_i should be positive and reported as a pre-registered secondary analysis.
   - **H2:** d_i(P→L) negative on a majority of items, with magnitude increasing in **answer length** (more tokens to generate, longer context) and in the appended-token count if tokenization varies across items. Homogeneous sign, no jargon-coverage correlation.
   - **H3:** d_i(P→L) and d_i(P→G) should be **tightly correlated item-by-item** (same items help/hurt under both block conditions; Pearson r on the 30 paired differences expected high, e.g. > 0.6 as an a priori threshold). This item-level correlation is a stronger H3 test than the mean-level d(L→G) ≈ 0.
   - **H4:** d_i(P→N) and d_i(P→G) similarly tightly correlated; d_i(L→G) ≈ d_i(L→N) item-by-item; and no significant within-item dependence on whether the answer actually restates a definition.

3. **Error-type profile** (from AttrScore-style error typing and/or RAGTruth-style hallucination taxonomy): under H1 the reduction under G (vs P) is concentrated in **extrinsic/unsupported paraphrase** errors on glossed-term claims (the model makes fewer un-attributable restatements); under H4′ the N arm *adds* extrinsic errors on out-of-passage definitions; under H2 all error types rise roughly uniformly (or intrinsic support errors rise) with the added block independent of term content; under H3 the profile under G and L is the same in kind. Predict the per-arm error-type shares and their ordering, not just scalar faithfulness.

4. **Sensitivity/re-prediction checks:**
   - Re-run the primary contrasts with claims restricted to those mentioning glossed terms (definition-relevant subset) and with claims mentioning no glossed term (control subset). **H1 predicts the effect lives in the definition-relevant subset; H2 deliberately predicts the effect appears in both; H3/H4 predict an intermediate, attention-shifting pattern.** This subset split is the highest-information single analysis in the pilot.
   - Report the **glossary-utilization rate** (fraction of glossed terms that appear in the answer) per arm; under H1 this should rise under G relative to P and L; under H2 it may fall (the model uses the passage *less* as extra tokens accumulate); under H4 it rises under both G and N.
   - N-arm **contradiction tally** per item (external definition conflicts with passage fact) → the H4′ stratified analysis.

5. **Pre-registered decision rules (so the pilot is a *test*, not a fishing expedition):** Before running, fix the contrast definitions, the atomization protocol, and thresholds for interpreting each pattern — e.g., d(L→G) > 0 with its item-bootstrap 95% CI excluding 0 **and** the definition-relevant subset differential of the same sign → "definitional grounding supported at pilot precision"; d(L→G) within ±[small band] while d(P→L) ≈ d(P→G) with r_item > 0.6 → "shape/length account, glossary content unsupported"; etc. All four are stated before data collection; post-hoc changes are flagged as exploratory.

---

## (4) Instrument and escalation caveat (feasibility/pilot, not a powered test)

**Explicit statement for the plan:** This is a **feasibility/pilot instrument** with **30 MedQuAD items** and a **single model (Qwen2.5-7B-Instruct) at temperature 0**, using a **~200-token glossary**. It is **not a powered hypothesis test.** Temperature 0 makes outputs deterministic given the prompt, so within-cell variance comes only from items (and from any non-determinism in serving/batching, which should be logged); with n = 30 paired items the achievable precision on the mean paired difference is on the order of several percentage points (roughly ±(0.15–0.25)·σ_d / √30 scale for a paired design; report the empirically estimated σ_d from the pilot to get the realized CI width). Consequences to accept explicitly:

- **No "no effect" conclusions.** Absence of a detectable difference at n = 30 must be reported as "inconclusive at pilot precision," never as evidence of no effect.
- **No generalization** to other models, temperatures, glossary lengths, or domains. MedQuAD also has no established faithfulness-evaluation protocol, so the pilot's protocol *is itself a deliverable*: a pilot-calibrated atomization + support-labeling protocol (with inter-annotator agreement or LLM-judge agreement reported) is needed before any scaled study.
- **The pilot's job** is (a) to establish the protocol and its reliability, (b) to estimate σ_d and per-arm claim-support rates so a scale-up can be powered, and (c) to produce a *first* estimate of the decomposition in §2's joint attribution statement.

**Escalation criterion.** A scaled study (more items, ≥2 models, temperature-robust) is worth mounting when the pilot shows either:
- **the load-bearing signal** — mean d(L→G) with a 95% item-bootstrap CI **excluding 0**, with a **lower bound of at least ~5 percentage points** claim-support rate, **and** the same-sign definition-relevant subset differential; or
- **a confident null on definitions with a confident confound signal** — d(L→G) small (say |mean| < 5 pp, CI spanning a ±5 pp band) while d(P→L) or d(P→G) is **≥ ~10 pp** with a CI excluding 0 and item-paired r > 0.6, which would make "glossary papers' gains are length/shape artifacts" the escalation-worthy claim.
- **Escalate below that band only if** the pilot also yields a favorable protocol (high support-label agreement, low atomization ambiguity), since then the cost of a larger run is justified by measurement quality rather than by effect size. A pilot with |d(L→G)| < 5 pp and |d(P→L)| < 10 pp and unstable labels should be treated as *instrument failure*, not as a result, and debugged rather than scaled.

---

## (5) Contribution framing (what the experiment claims, in advance)

**Primary contribution — confound accounting, not definition injection.** The paper's claim is *not* "a definition glossary improves faithfulness in biomedical QA." The claim is:

> **Any apparent effect of a short definition glossary on claim-level faithfulness is decomposed into: (i) prompt-length change, (ii) prompt shape/format change, (iii) topic priming/salience of passage-derived terms, and (iv) a residual definitional-grounding component — with a pilot instrument that estimates each component's sign and rough magnitude in the ~200-token append regime and makes the decomposition, not the treatment, the object of measurement.**

The three live confounds (LENGTH: arXiv:2510.05381; SHAPE/FORMAT: arXiv:2302.07856 and arXiv:2408.16440; PRIMING: passage-derived vs external-lexicon definitions) are the design's *reason for the arms*, and the four-arm structure is the deliverable. Secondary contribution: a pilot-calibrated, MedQuAD-adapted claim-level faithfulness protocol (atomic decomposition + binary passage-support labeling, with protocol reliability), which the gap scan notes does not exist for MedQuAD. The pilot makes no treatment recommendation; it produces a plan and a decomposition estimate sufficient to justify (or reject) a powered follow-up.

**What would count as a "result" to report at pilot scale:** the four per-arm claim-support rates with item-bootstrap CIs, the 30-element paired-difference vectors for each contrast, the item-level contrast correlations, the definition-relevant vs control subset split, the glossary-utilization rate and N-arm contradiction tally, and a pre-registered statement of which hypothesis pattern the data resemble — with the explicit caveat that 30 items and one model cannot confirm any of them.
