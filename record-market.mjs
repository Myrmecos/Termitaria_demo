import { recordSession } from "./session.mjs";

// examples/demos/market-research-demo.md
await recordSession({
  projectName: "Copper Desk Demo 1026",
  template: /copper-desk/i,
  evidence: `
Track COMEX copper front-month (HG=F) for the most recent full trading week.
`,
  chatName: "General",
  question: `
Prepare a market brief on last week's COMEX copper futures (HG=F).
1) Give the date, closing price, weekly average, and weekly change for the five most recent full trading days.
2) Explain the main drivers of this week's move with at least two clickable sources.
3) Every number and attribution must come from a tool you actually called. If you cannot find it, write "not found". Do not invent it.
4) Finish with a sourced report and a deck.
`,
  sentMark: "HG=F",
  recordingName: "marketing",
});
