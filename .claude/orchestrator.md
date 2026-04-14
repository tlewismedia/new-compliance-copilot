---
name: Orchestrator Guide
description: How to coordinate subagents for the compliance copilot project
---

# Orchestrator Guide

This document explains how to use the three subagents (Spec Writer, Implementer, Reviewer) to build features reliably.

## The workflow

```
1. Create GitHub issue with goal
   ↓
2. Dispatch Spec Writer → spec comment on issue
   ↓
3. Dispatch Implementer → branch with commits
   ↓
4. Dispatch Reviewer → approved/changes feedback
   ↓
5. Address feedback (if needed) → goto 3
   ↓
6. Merge PR to main
```

## How to dispatch each agent

### Spec Writer

```
Agent({
  description: "Write spec for issue #123",
  subagent_type: "general-purpose",
  prompt: `Read GitHub issue #123 in tlewismedia/new-compliance-copilot.
  
  Context:
  - Goal: [state the goal]
  - Related context: [plan.md, agents.md, etc.]
  
  Produce a spec comment covering:
  - Summary (1 sentence)
  - Scope (what will be done)
  - Acceptance Criteria (numbered, testable)
  - Files Likely to Change
  - Non-Goals
  - Implementation Notes
  
  Output as [SPEC AGENT] comment ready to post on the issue.`
})
```

### Implementer

```
Agent({
  description: "Implement issue #123",
  subagent_type: "general-purpose",
  prompt: `Read issue #123 in tlewismedia/new-compliance-copilot and the [SPEC AGENT] comment.
  
  Implement on a worktree branch named issue-123/<short-desc>.
  
  Context:
  - Spec: [paste the spec comment]
  - Acceptance Criteria: [list them]
  - Relevant files: [list paths]
  
  Commits must be prefixed with AGENT:.
  Do not change issue state or open a PR.
  
  Report: branch name, commit SHAs, one-paragraph summary, and testing notes.`
})
```

### Reviewer

```
Agent({
  description: "Review implementation for issue #123",
  subagent_type: "general-purpose",
  prompt: `Review the implementation on branch issue-123/<short-desc>.
  
  Spec: [paste the spec comment]
  Acceptance Criteria: [list them]
  
  Verify each criterion is satisfied by the code.
  Check test coverage.
  Assess code quality.
  
  Output [REVIEWER AGENT] APPROVED or list issues with file:line references.
  Do not post to GitHub; orchestrator will gate that.`
})
```

## Key principles from agentic-strategy.md

1. **Synthesise findings yourself.** Never say "based on the agent's report, do X." Read the agent's output, understand it, then decide.

2. **Self-contained prompts.** Each subagent starts with zero context. Re-state the goal, constraints, and expected output format every time.

3. **Trust but verify.** An agent's summary describes intentions, not outcomes. Check the actual diff/code before claiming success.

4. **Parallelise independent work.** Multiple spec-writing tasks can run in parallel. Implementation and review must be serial (review comes after implementation).

5. **Narrow scope.** When you encounter issues:
   - Spec Writer: Flag ambiguities, don't guess
   - Implementer: Report what failed and why; don't work around root causes
   - Reviewer: List specific issues; don't approve broken code

6. **Gate hard-to-reverse actions.** Agent commits are cheap to undo. Merges to main are not—always confirm before merging.

## Troubleshooting

**Subagent hallucinating context?**
→ The prompt isn't self-contained. Add required reading (file paths, issue text, acceptance criteria).

**Reviewer approves broken code?**
→ The reviewer prompt didn't emphasize checking test results. Tighten the criterion.

**Orchestrator keeps forgetting user preferences?**
→ Save important decisions in memory or `.claude/` docs so they persist across sessions.

## Example session

```
Human: Create an issue to "add file counting to the CLI"
Orchestrator: Creates issue #42, adds label "spec-ready"