import { recordSession } from "./session.mjs";

// examples/demos/autoresearch-demo.md
await recordSession({
  projectName: "Autoresearch Demo 1026",
  template: /autoresearch/i,
  evidence: `
Research question: Does appending a short, definition-only glossary of terms taken from the passage increase claim-level faithfulness in biomedical question answering over MedQuAD, relative to an identical passage-only instruction? Faithfulness means each factual claim in the answer is supported by the passage.

Use 30 MedQuAD items, Qwen2.5-7B-Instruct, temperature 0, and a ~200-token glossary. The contribution is the confound accounting (glossary content vs. prompt length/shape), not the definition-injection question itself. The project should produce a reviewed experiment plan, not a measured result.
`,
  chatName: "General",
  question: `
Using the materials in this project, run the full research workflow. The research question is: in biomedical question answering on MedQuAD, does appending a definition-only glossary increase claim-level faithfulness (each factual claim is supported by the passage), relative to a passage-only control? Proceed in this order: literature gap scan, hypothesis, experiment design, methods review. The reviewer must attack the experiment design before the work is closed. Finish with a reviewed experiment plan.
`,
  sentMark: "MedQuAD",
  recordingName: "autoresearch",
});
