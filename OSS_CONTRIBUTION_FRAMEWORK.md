# OSS Contribution Framework

General process for analyzing, researching, and contributing to open-source projects.
Derived from a real session targeting `raycast/ray-so`.

---

## 1. Org / repo discovery

Before touching any code, map the target organization.

```bash
gh repo list <org> --limit 50 --json name,description,isArchived,primaryLanguage
```

Filter out:
- Archived repos
- Forks (unless the org actively develops them)
- Infra/tooling repos (CI bots, GitHub Actions helpers, cron jobs)
- Repos in irrelevant languages for the fix type

You should be left with a short list of repos that could plausibly contain the affected code.

---

## 2. Locate the affected code

Don't assume — find the actual call site.

```bash
# Search for the pattern across the repo
gh search code --repo <org>/<repo> "<pattern>" --json path,textMatches

# Or fetch a specific file
gh api repos/<org>/<repo>/contents/<path> --jq '.content' | base64 -d
```

For search/filter bugs specifically, look for:
- `toLowerCase().includes()`
- `filter(` combined with string comparison
- Any fuzzy-match library (`fuse`, `minisearch`, etc.) — it may already handle the case

Note the exact file paths and line numbers. Multiple call-sites of the same pattern need
all of them fixed, not just one.

---

## 3. Verify with real data

A fix without a concrete example is weak. Find one in the actual dataset.

```bash
gh api repos/<org>/<repo>/contents/<data-file> --jq '.content' | base64 -d | grep "&"
```

The example should:
- Already exist in the codebase (not hypothetical)
- Reproduce the bug with a short, obvious query
- Be something a real user would plausibly type

A named example ("Search B&H") is far more persuasive in an issue than "for example, if
a quicklink were named X&Y".

---

## 4. Check for existing issues and PRs

Never file a duplicate.

```bash
gh issue list --repo <org>/<repo> --search "<keywords>" --json number,title,state
```

Search with multiple keyword combinations. If a closed issue exists, reference it — your
fix may be a follow-up or a different approach.

---

## 5. Design the fix before writing the issue

Write the code change (at least a sketch) before drafting the issue. Reasons:
- Forces you to confirm the fix is actually feasible
- Reveals edge cases (e.g. the `и`/`b` conflict) that belong in the issue
- Gives the maintainer something concrete to evaluate, not just a complaint

Keep the fix minimal. Don't refactor surrounding code. Don't add features beyond the
stated bug.

---

## 6. Scope management

If there are multiple related bugs or improvements, keep them in **separate PRs**.

- One logical change per PR
- Separate local folders if the work is exploratory (one per scope)
- Separate branches even if they share a fork
- Note cross-scope dependencies or conflicts explicitly in your working notes,
  not in the PR itself

When conflicts between scopes exist (e.g. the same token has two valid interpretations
under different fixes), document the conflict and the required architectural change before
implementing either fix. Don't paper over it.

---

## 7. Draft before publishing

Never open an issue or PR without a review step.

- Write the issue body as a local `.md` file first
- Structure: description → steps to reproduce → expected → actual → proposed fix
- Include the code sketch in the issue body
- Only post after the draft has been reviewed

Same for PRs: draft the PR body locally, confirm all tests pass, then open.

---

## 8. Folder and branch conventions

```
<project>-<scope>/       # local working folder (e.g. raycast-ampersand/)
  NOTES.md               # living internal notes: design decisions, conflicts, open questions
  issue-body.md          # public-facing issue draft
  OSS_CONTRIBUTION_FRAMEWORK.md  # (meta, like this file)
```

Git:
```
fork: <your-username>/<repo>
branch: feature/<scope-slug>   # e.g. feature/jcuken-search
```

Clone the fork once. If two scopes share the same fork, use two branches — not two forks.

---

## 9. Living notes discipline

The `NOTES.md` is not the issue body. It captures:
- Internal reasoning and dead ends
- Design conflicts and why one approach was chosen over another
- Future work explicitly deferred ("out of scope for first PR")
- Cross-scope interactions

Update it as understanding evolves. When a previous note turns out to be wrong
(e.g. "these two fixes compose cleanly" → they don't), correct it immediately rather than
appending a correction below the wrong note.

---

## 10. Multi-hypothesis matching (pattern)

When a search normalization fix involves tokens with multiple valid interpretations,
a single-pipeline normalizer will always silently favor one interpretation.
Use multi-hypothesis matching instead:

```typescript
// Generate all plausible normalized forms of the query
const candidates = [
  normalize_a(query),
  normalize_b(query),
  normalize_b(normalize_a(query)),
];

// Match if any candidate hits
return candidates.some((c) => itemName.includes(c));
```

This applies whenever:
- The same character is a layout key in one context and a word token in another
- The same token has meaning in multiple languages
- Typo correction and normalization are both in play
