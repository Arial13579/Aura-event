# WhatsApp personal assistant (Kapso)

Owner-only personal assistant on WhatsApp, running as a Kapso workflow.

- Phone number ID: `597907523413541` (Kapso sandbox)
- Owner: `972512440252` — every other sender is dropped before reaching the AI
- Workflow: `Personal Assistant` (`010a724c-e414-4af4-8078-0a23c3cbe5f7`)
- Filter function: `owner-filter` (`9367dd18-e04a-45a6-b20b-5e7b45392ef2`)
- Model: Claude Opus 5.5, with remote sandbox (bash + internet)

Flow: inbound message → `owner-filter` decide → agent (owner) / drop (anyone else).

Files:
- `owner-filter.js` — decide-function code
- `workflow-graph.json` — workflow graph as deployed

Next: Google Calendar tool (needs a Google service-account key).
