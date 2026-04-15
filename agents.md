# Agents

Operational rules for every agent working in this repo.

**Read at the start of every task:** this file, `plan.md`, `project-goals.md`, and the GitHub issue you are assigned to.

---

## Principles

1. **One agent, one job.** Subagents produce artifacts (code, reviews). They do not decide workflow.
2. **The orchestrator owns all external state.** Only the main agent changes GitHub state (labels, issue open/close, PRs). Subagents post comments only.
3. **Durable artifacts over chat.** Decisions live in GitHub issues, PRs, and commits — not in conversation history.
4. **Human at the state transitions.** Humans confirm anything hard to reverse: posting a review, opening a PR, merging, closing.
5. **Traceable provenance.** Every agent action is tagged so a human can see what was done by whom.

---

## Roles

### Orchestrator (main agent)

The only actor that:

- Creates, labels, and closes GitHub issues.
- Opens and merges PRs.
- Updates memory.
- Decides which subagent runs next and in what order.

Reads: this file, `plan.md`, `project-goals.md`, the issue body, the relevant code.

### Implementer (subagent)

Invoked once the human has approved the issue body (which _is_ the spec — see [Specs live in the issue body](#specs-live-in-the-issue-body) below).

Reads: issue body + `plan.md` + relevant code.

Writes code and tests in a worktree branch.

Rules:

- Branch name: `issue-<N>/<short-description>`.
- TypeScript only. No Python. No plain JS.
- Write tests only when the spec asks for them.
- Do not exceed spec scope. If something outside scope needs changing, surface it — don't silently do it.
- Do not open, close, or label issues. Do not open PRs.
- Do not strip `// TODO:` lines unless explicitly asked.
- Commit prefix: `AGENT:` on every commit. First line: `AGENT: <imperative summary>`.
- Comment prefix: `[IMPLEMENTER AGENT]` on progress comments.

### Reviewer (subagent)

Invoked after the implementer reports completion.

Reads: the diff, the spec, `plan.md`.

Checks:

1. Does the code satisfy every acceptance criterion?
2. Are the tests meaningful? Do they cover the spec's edge cases?
3. Does anything contradict `plan.md` or `project-goals.md`?
4. Obvious bugs or security issues?

Output: either `APPROVED` or a numbered list of issues with `file:line` references.

**Must ask the human to confirm before posting the review as a GitHub comment.**

Comment prefix: `[REVIEWER AGENT]`.

Does not modify code. Does not change issue state.

### Eval Runner (subagent, post-MVP)

Invoked when a change touches the pipeline. Runs the eval harness, reports regression or improvement vs the previous baseline. Does not change code. Does not change issue state.

Comment prefix: `[EVAL AGENT]`.

---

## Specs live in the issue body

There is no separate Spec Writer role. The orchestrator drafts the spec directly in the issue body (scope, acceptance criteria, non-goals, implementation notes). The human reads the issue before the implementer is dispatched — that's the spec-approval gate.

Rationale: the orchestrator already holds the project context (`plan.md`, `project-goals.md`, prior issues). Dispatching a subagent to re-derive the spec from scratch adds round-trips, drift risk, and token cost without adding information. Writing the spec directly into the durable artifact (the issue) keeps specs tight and reviewable.

If a spec genuinely needs research the orchestrator doesn't have (rare), the orchestrator does a narrow, one-off research dispatch and edits the findings into the issue body itself — not as a standing role.

## Workflow

```
1. Orchestrator → creates issue with spec in the body
2. Human        → reads the issue body; approves or edits it
3. Orchestrator → labels `in-progress`
4. Implementer  → writes code + tests on a worktree branch
5. Orchestrator → labels `in-review`
6. Reviewer     → outputs APPROVED or NEEDS CHANGES
7a. If NEEDS CHANGES → orchestrator labels `needs-changes`; back to step 4
7b. If APPROVED      → orchestrator labels `approved` and opens PR with `Closes #<N>` automatically
8. Human        → reviews diff in the PR and merges (auto-closes issue)
```

---

## Labels (workflow state machine)

| Label           | Meaning                             |
| --------------- | ----------------------------------- |
| `in-progress`   | Implementer working.                |
| `in-review`     | Implementer done; reviewer running. |
| `needs-changes` | Reviewer found issues.              |
| `approved`      | Reviewer approved; PR open.         |

Only the orchestrator sets these.

---

## Branch and PR convention

- Branch: `issue-<N>/<short-description>` — one issue per branch, one branch per issue.
- PR title matches branch description.
- PR body must include `Closes #<N>` so merging auto-closes the issue.
- Commits: prefixed `AGENT:` when an agent authored them. Humans commit without the prefix.

---

## What automation is OK, what needs confirmation

**Auto-posted without asking:**

- Progress comments (`Starting work…`, `Implementation complete`).
- Label transitions (orchestrator only).
- Reviewer verdict as a GitHub comment.
- Opening a PR after reviewer APPROVED (so the human can review the diff in GitHub).

**Requires human confirmation before action:**

- Merging a PR.
- Closing an issue.
- Deleting branches.
- Any `git reset --hard`, force push, or amend of pushed commits.

Why: merging and closing are hard to reverse. PRs open automatically so the human has a diff to review before deciding to merge.

---

## Parallelism

- Run independent issues in parallel (separate worktrees).
- Run dependent issues in sequence — the orchestrator tracks the DAG.
- Never run two agents against the same worktree at once.

---

## How to dispatch agents

The orchestrator invokes subagents via the `Agent` tool with complete, self-contained prompts. Templates below.

### Dispatching Implementer

```javascript
Agent({
  description: "Implement issue #<N>",
  subagent_type: "general-purpose",
  prompt: `Read issue #<N> in tlewismedia/new-compliance-copilot — the body is the spec.

Implement on a worktree branch named issue-<N>/<short-desc>.

Spec (paste the issue body verbatim):
<paste the issue body>

Acceptance Criteria:
- <criterion 1>
- <criterion 2>

Relevant files: <list paths>

Rules:
- Commits prefixed AGENT:
- Do not change issue state or open a PR
- Do not exceed spec scope

Report back with: branch name, commit SHAs, one-paragraph summary, testing notes.`,
});
```

### Dispatching Reviewer

```javascript
Agent({
  description: "Review implementation for issue #<N>",
  subagent_type: "general-purpose",
  prompt: `Review the implementation on branch issue-<N>/<short-desc>.

Spec (paste the issue body verbatim):
<paste the issue body>

Acceptance Criteria:
- <criterion 1>
- <criterion 2>

Verify:
1. Each criterion is satisfied by the code
2. Tests are meaningful and cover edge cases
3. No contradictions with plan.md or project-goals.md
4. No obvious bugs or security issues

Output [REVIEWER AGENT] APPROVED or a numbered list of issues with file:line references.
Do not post to GitHub; orchestrator will gate confirmation.`,
});
```

### Dispatch principles

From `agentic-strategy.md`:

1. **Self-contained prompts.** Subagents start with zero context. Re-state goal, constraints, expected output.
2. **Synthesise findings.** Never tell a subagent "based on the other agent's output, do X." Read the output, understand it, then decide what to ask.
3. **Specific instructions.** Include file paths, line numbers, acceptance criteria — don't make the agent guess.
4. **Parallelise independent work.** Independent issues can run in parallel in separate worktrees. Implementation and review for the same issue must be serial.
5. **Trust but verify.** Check the actual diff/code before accepting an agent's summary as complete.

---

## Memory

The orchestrator maintains `memory/` across sessions. Memory captures:

- User preferences confirmed or corrected ("this user prefers X").
- Project decisions and their motivation ("we chose Pinecone on <date> because …").
- External resource pointers ("eval dataset lives in …").

Memory does **not** capture: code snippets, file paths, recent commits, git history (all derivable). See the memory skill docs for full rules.
