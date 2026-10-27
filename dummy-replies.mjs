// Saved replies for DUMMY=1. The recording shows these instead of waiting on the live model.
export const dummyReplies = {
  autoresearch: {
    sender: "Principal Investigator",
    agentId: "pi",
    mark: "Reviewed experiment plan",
    turns: [
      {
        agentId: "collector",
        sender: "Literature Collector",
        text: "Literature gap: definition injection on MedQuAD is already reported. The open question is whether a glossary helps because of the definitions, or only because the prompt gets longer. I logged the two source papers on the project graph.",
      },
      {
        agentId: "ideator",
        sender: "Idea Generator",
        text: "Hypothesis: a definition-only glossary of about 200 tokens raises claim-level faithfulness against a passage-only control. A length-matched filler with no definitions should remove most of that gain if the effect is prompt shape.",
      },
      {
        agentId: "experimenter",
        sender: "Experiment Designer",
        text: "Design: Qwen2.5-7B-Instruct, temperature 0, 30 MedQuAD items. Arm A is the passage only. Arm B adds the glossary. Arm C adds a length-matched filler. Score claim-level faithfulness. This is a plan, not a measured run.",
      },
      {
        agentId: "reviewer",
        sender: "Skeptical Reviewer",
        text: "The first design mixes glossary content with prompt length, and 30 items cannot support a model comparison. Require the filler arm, keep the glossary from leaking the answer, and call the write-up a methods pilot.",
      },
    ],
    text: `Reviewed experiment plan

Literature gap. Definition injection in biomedical QA is already reported. The open gap is narrower: a glossary can raise faithfulness because it adds definitions, or only because it makes the prompt longer and more structured. Prior MedQuAD runs do not hold length and shape fixed, so they cannot separate those two causes.

Hypothesis. On 30 MedQuAD items, a definition-only glossary of about 200 tokens raises claim-level faithfulness relative to a passage-only control. A length-matched control that adds the same number of tokens without definitions should erase most of that gain if the effect is prompt shape rather than glossary content.

Experiment.
- Model: Qwen2.5-7B-Instruct, temperature 0.
- Items: 30 MedQuAD questions, fixed order, same passage for every arm.
- Arm A: passage only.
- Arm B: passage plus a definition-only glossary built from terms in that passage.
- Arm C: passage plus a length-matched filler with no definitions.
- Outcome: claim-level faithfulness. A claim counts only when the passage supports it. Unsupported claims count against the answer.

Reviewer attack. The reviewer rejected the first design. Thirty items cannot support a model comparison, the glossary writer can leak the answer, and Arm C was unspecified. The revision fixes those points: the glossary may contain only definitions of terms that already appear in the passage, Arm C is a scrambled definition list of the same token length, and the write-up will call this a methods pilot rather than a result.

Close. The project stops at this reviewed plan. No faithfulness number is claimed, because this run does not measure the model.`,
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
