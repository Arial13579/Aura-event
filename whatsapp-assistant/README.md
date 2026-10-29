# WhatsApp personal assistant (Kapso)

Owner-only personal assistant on WhatsApp, running as a Kapso workflow.

- Phone number ID: `597907523413541` (Kapso sandbox)
- Owner: `972512440252` — every other sender is dropped before reaching the AI
- Workflow: `Personal Assistant` (`010a724c-e414-4af4-8078-0a23c3cbe5f7`)
- Filter function: `owner-filter` (`9367dd18-e04a-45a6-b20b-5e7b45392ef2`)
- Model: Claude Opus 5.5, with remote sandbox (bash + internet)
- Calendar tool: `apple-calendar` (`1955faab-8380-46b4-a5ae-2d613b85203f`), iCloud CalDAV; secrets `APPLE_ID`, `APPLE_APP_PASSWORD` set in Kapso
- File delivery: `file-drop` (`ab170a77-7d47-4a20-884e-b0356bd0755c`), 1-hour private links for `send_media`

Notes:
- Kapso only provisions the agent sandbox when a repository resource is attached, so a tiny public repo is attached.
- `__UPLOAD_TOKEN__` in `file-drop.js` and `workflow-graph.json` is replaced with the real token at deploy time; the token is not committed.
- No `enter_waiting` tool: with auto-send delivery the agent waits on its own, and that tool let the model skip replies.

Flow: inbound message → `owner-filter` decide → agent (owner) / drop (anyone else).

Files:
- `owner-filter.js` — decide-function code
- `workflow-graph.json` — workflow graph (token placeholder)
- `apple-calendar.js` — calendar tool
- `file-drop.js` — file delivery (token placeholder)

Next: Gmail, WhatsApp reminders.
