---
description: Run the full QC test suite against production (or a specific section if passed).
allowed-tools: Agent
---

Invoke the `qa-tester` subagent to execute the QC test catalog at `qa/test-cases.md` against `https://bramsmindcare.com`.

If the user passed arguments after the command (e.g. `/test-qc D` or `/test-qc booking`), pass them through as the scope; otherwise run the full catalog.

Arguments from the user: $ARGUMENTS

Do not summarize or paraphrase the agent's report — pass it through verbatim. The report is the deliverable.
