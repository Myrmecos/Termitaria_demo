// Saved replies for DUMMY=1. The recording shows these instead of waiting on the live model.
export const dummyReplies = {
  autoresearch: {
  "replayProject": "autoresearch",
  "sender": "Principal Investigator",
  "agentId": "pi",
  "mark": "Reviewed experiment plan",
  "turns": [],
  "text": "# Reviewed experiment plan — MedQuAD glossary vs. passage-only faithfulness\n\nThe workflow is complete: gap scan → hypotheses → experiment design → adversarial methods review. The deliverable is a **reviewed plan, not a measured result**. The headline of the review is that the plan is **not yet executable as written** — the reviewer returned must-fix blockers, so the honest output is \"plan + required revisions,\" not \"plan accepted.\"\n\n**The project seed frames the question**: does a definition-only glossary raised from the passage increase claim-level faithfulness over MedQuAD, relative to an identical passage-only instruction (30 items, Qwen2.5-7B-Instruct, temperature 0, ~200-token glossary)? The seed also fixes the contribution as **confound accounting**, not the definition-injection question itself.\n\n## What each stage produced\n\n**1. Literature gap scan** — The intersection is empty: glossary-injection work (DiPMT, medical-domain MT glossaries) measures terminology compliance, never claim-level support, and never runs a length- or shape-matched placebo; faithfulness work (FActScore, AttrScore, RAGTruth, ALCE) treats prompt composition as fixed. The load-bearing confound citation is [Context Length Alone Hurts LLM Performance Despite Perfect Retrieval](https://arxiv.org/abs/2510.05381) — length alone degrades performance even with whitespace filler and masked tokens. Dataset: [MedQuAD](https://github.com/abachaa/MedQuAD), CC BY 4.0, 47,457 QA pairs.\n\n**2. Hypotheses** — H1 (definitions help net of confounds) against H2a length, H2b shape, H2c priming, H2d attrition, H2e null, stated as a pre-registered prediction matrix over per-item paired differences. The plan is explicitly a feasibility pilot: n = 30 supports effect-size estimation and protocol validation, not confirmation.\n\n**3. Experiment design** — Four arms (passage-only; passage-derived definitions; length-matched neutral filler; external-lexicon definitions), token-matched blocks verified on the Qwen tokenizer, pinned model revision, overridden `generation_config` defaults, FActScore-style atomisation with an AttrScore-style judge plus an NLI cross-check, bootstrap CIs, and a nine-gate go/no-go.\n\n**4. Methods review (reviewer #2) — this is the part that matters.** Verdict: **major revision, do not execute as written.** The four blockers:\n\n- **Arm C does not isolate length from shape.** Placeholder headwords (`TERM_1…`) import priming and change the gloss syntactic type, so the load-bearing contrast T3 is a three-way compound, not a residual.\n- **Arm D cannot isolate priming from contradiction.** Consistent external definitions and H1 predict the same thing on that cell; conflicting ones raise the difference mechanically — and the primary hypothesis is gated on the presence of the confound it claims to control.\n- **n = 30 cannot carry five contrasts, a 10/10 split, and an eight-rule decision table with ±5 pp thresholds.** Realised CI half-widths land near ±4–7 pp; the \"confident null\" branches are effectively unreachable and the conjunctive R1 is a conservative multiplicity machine. Also: choosing the estimator based on disagreement is estimator shopping.\n- **No positive control and no base-rate gate.** A pipeline can pass all nine internal-consistency gates while producing near-1.0 support rates everywhere — instrument passed, instrument insensitive.\n\nPlus should-fix items: co-primary outcome duplication, a self-contradictory atomiser prompt with arm-differential atomisation risk, atomiser/judge drawn from the same model family, a determinism audit too small to detect item-specific divergence, framing that says \"biomedical QA\" while the task is passage-grounded restatement over a narrow sample, an \"ambiguity\" stratum that is really jargon density, and a shared-error artefact in the `r1` correlation test.\n\n## Cheapest defensible path (what I'd accept next)\n\nOne primary contrast, honestly relabelled; a **positive-control arm** that must fail faithfulness by construction; a **base-rate gate** (per-arm mean support in roughly 0.50–0.90); an independently drawn human calibration subsample; a single pre-registered estimator with a CI on the difference; a rewritten atomiser prompt with ≥100 human-checked sentences stratified by arm; cross-family judging; and narrowed framing to match what was actually sampled. Reconcile the item-set inconsistency across the three documents and hash the reconciled prereg.\n\n## Limitations\n\nNo result is measured or claimed. Sample size, single model, temperature-0-only, and one glossary length bound external validity. The length-confound literature is at thousands of tokens; its relevance to a +200-token append is an analogy the pilot must test, not import. The review itself arrived truncated in the reviewer's environment, so §8–§11 of the design were reviewed only in part — that truncation is itself on the must-fix list. On the citation in the deck/report for the length confound I am relying on the abstract, the introduction, and the masking/whitespace result sections I read directly; I did not read the full paper, and the DiPMT/medical-MT control claims are inferred from abstracts and prompt examples, not full texts.\n\nFiles:\n- report.md\n- deck.pptx",
  "private": {
    "chatName": "Literature Collector",
    "agentId": "collector",
    "question": "How many papers have you inspected? What are the major sources?",
    "mark": "13 prior-work items",
    "text": "I have not inspected any papers directly in this conversation — I ran no `fetch_url` or `web_search` calls here. So I can't honestly report a count from my own reading. What I can do is count what the project knowledge graph records.\n\n**What the graph contains**\n\nIt holds 2 project documents (the seed research question and the gap scan) and 13 prior-work items, of which 7 carry an arXiv ID:\n\n| Item | ID / source |\n|---|---|\n| DiPMT (Ghazvininejad et al.) | arXiv:2302.07856 |\n| AttrScore | arXiv:2305.06311 |\n| ExpertPrompting | arXiv:2305.14688 |\n| Role design in ICL | arXiv:2509.23501 |\n| Terminology-aware MT w/ constrained decoding | arXiv:2310.05824 |\n| Medical-domain instruction-tuned MT | arXiv:2408.16440 |\n| Context Length Alone Hurts LLM Performance Despite Perfect Retrieval | arXiv:2510.05381 |\n| Few-Shot Degradation Is Not What It Seems | arXiv:2609.15990 |\n\nPlus four non-arXiv-or-mixed entries: MedQuAD (Ben Abacha & Demner-Fushman 2019), PubMedQA (Jin et al. 2019), \"Can large language models reason about medical questions?\", and length-controlled AlpacaEval.\n\n**Major sources, grouped by the job they do in the project**\n\n1. **Confound evidence (the load-bearing cluster).** \"Context Length Alone Hurts LLM Performance Despite Perfect Retrieval\", \"Few-Shot Degradation Is Not What It Seems\", ExpertPrompting, role design in ICL, and length-controlled AlpacaEval. This is the cluster that justifies the project's actual contribution — separating glossary content from prompt length and shape.\n2. **Glossary/dictionary injection precedent.** DiPMT, terminology-aware MT with constrained decoding, and medical-domain instruction-tuned MT. Per the graph, none of these holds prompt length constant, which is the gap.\n3. **Medical QA grounding and datasets.** MedQuAD, PubMedQA, and \"Can large language models reason about medical questions?\"\n4. **Faithfulness metric.** AttrScore, the single named source for claim-level faithfulness scoring.\n\n**Two caveats you should weigh.** First, the graph entries are one-line summaries written during earlier steps; the underlying full texts are not stored, so \"inspected\" is more accurate than \"read in detail.\" Second, three IDs look wrong or at least need checking — arXiv:2609.15990 implies a September 2026 submission, which is plausible given today's date but I have not verified it exists; and the two \"canonical\" papers (MedQuAD, PubMedQA) are recorded only with author-year, not IDs.\n\nIf you want a real count, I'd delegate a fresh check of the four items with no verified ID, and a same-day verification of arXiv:2609.15990. Want me to do that?"
  },
  "artifacts": [
    "gap_scan.md",
    "hypotheses.md",
    "experiment_plan.md",
    "report.md",
    "deck.pptx"
  ],
  "graphMark": "3 documents, 0 claims"
},
  marketing: {
    sender: "Desk Lead",
    agentId: "desk",
    mark: "COMEX copper brief",
    turns: [
      {
        agentId: "researcher",
        sender: "Market Researcher",
        text: "Last full week, 13 Oct 2026 to 17 Oct 2026. Closes: 4.62, 4.58, 4.71, 4.69, 4.74. Weekly average 4.67. Weekly change +0.12. The CME copper page is the source for the series. The mine-outage tonnage is not found.",
      },
      {
        agentId: "critic",
        sender: "Reviewer",
        text: "The five closes and the weekly change are in the researcher note. Drop the mine-outage tonnage. Keep the dollar-softness line only with the CME link.",
      },
    ],
    text: `COMEX copper brief, week of 13 Oct 2026 to 17 Oct 2026

This is a saved desk note for the demo. Prices below are the figures that note recorded. They are not a live quote.

| Day | Close |
| --- | --- |
| Mon 13 Oct | 4.62 |
| Tue 14 Oct | 4.58 |
| Wed 15 Oct | 4.71 |
| Thu 16 Oct | 4.69 |
| Fri 17 Oct | 4.74 |

Weekly average: 4.67. Weekly change: +0.12 from the Monday close to the Friday close.

Drivers.
- Dollar softness through Thursday showed up in the broad metals tape. Source: https://www.cmegroup.com/markets/metals/base/copper.html
- A mine-supply headline on Wednesday lined up with the mid-week jump. The note did not find a second primary filing that quantified the outage, so the tonnage is not found.

Rules kept. Every figure above is tied to that saved note. Where the note had no tool result, the line says not found. No intraday high, no open interest, and no producer guidance number are included.

Deliverables named in the note: a sourced report and a one-page deck. This chat shows the brief those files were written from.`,
  },
};
