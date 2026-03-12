# GitHub Repo Mapping Execution Plan v0

## Purpose

This plan defines how to turn a large set of GitHub-trending and bookmarked repositories into a structured candidate set for the company stack.

The goal is not to collect interesting projects. The goal is to identify which repositories may help the business research, compare, launch, measure, and scale wedges with increasing autonomy, while preserving modularity, observability, replaceability, and strategic clarity.

This plan is downstream of the current doctrine and stack documents. Repositories must be judged against the stack thesis, not the other way around.

## Inputs

Primary repo source files:

- /Users/jackhughes/RESEARCH/github-trending/bookmarked-repos.md
- /Users/jackhughes/RESEARCH/github-trending/daily-21.md
- /Users/jackhughes/RESEARCH/github-trending/daily-22.md
- /Users/jackhughes/RESEARCH/github-trending/daily-23.md
- /Users/jackhughes/RESEARCH/github-trending/daily-24.md
- /Users/jackhughes/RESEARCH/github-trending/daily-25.md
- /Users/jackhughes/RESEARCH/github-trending/daily-26.md
- /Users/jackhughes/RESEARCH/github-trending/monthly-4.md
- /Users/jackhughes/RESEARCH/github-trending/weekly-22.md
- /Users/jackhughes/RESEARCH/github-trending/weekly-23.md
- /Users/jackhughes/RESEARCH/github-trending/weekly-24.md

Strategic framework documents to use as evaluation context:

- operating-doctrine-v1.md
- working-venture-thesis-v0.md
- opportunity-research-and-portfolio-model-v0.md
- stack-thesis-and-technology-evaluation-framework-v1.md

## Primary Question

Which repositories most improve the company's ability to autonomously research, compare, launch, observe, and prune wedges without creating stack sprawl?

## Output Files

Create and maintain the following files during execution:

- github_repo_candidate_registry_v0.md
- github_repo_role_map_v0.md
- github_repo_shortlist_v0.md
- github_repo_idea_sources_v0.md
- github_repo_research_gaps_v0.md

## Role Taxonomy

Every repo must be mapped to one or more of these stack roles:

- research capture and market intelligence
- structured knowledge and portfolio state
- experiment registry and comparison
- orchestration and workflow execution
- content and landing-page generation
- site deployment and hosting
- search and booking integration
- analytics and event tracking
- observability and reporting
- decision logging and review
- authentication, permissions, and operational safety
- agent coordination and multi-agent supervision
- data enrichment and scraping
- internal tooling and operator workflow

## Horizon Labels

Every repo must receive one horizon label:

- now
- later
- defer

## Fit Labels

Every repo must receive one fit label:

- direct fit
- adjacent fit
- idea source only
- not relevant

## Risk Labels

Every repo must receive one risk label:

- low maintenance risk
- medium maintenance risk
- high maintenance risk

## Evaluation Criteria

Evaluate each repo against the following criteria:

- strategic fit with current venture thesis
- usefulness for autonomy
- usefulness for travel wedge research or execution
- time to useful output
- modularity
- replaceability
- operational clarity
- maintenance burden
- maturity and stability
- likely lock-in
- whether it strengthens learning loops
- whether it creates unnecessary complexity

## Stage Plan

### Stage 0: Normalize the source pool

Read all listed repo source files and extract every distinct GitHub repository mentioned.

For each repo, capture:

- repo name
- GitHub URL
- one-line description if available
- source file(s) where it appeared
- duplicate count across source files if possible

Output:
- initial version of github_repo_candidate_registry_v0.md

### Stage 1: Deduplicate and normalize

Merge duplicates, normalize repo names and URLs, and remove obvious non-repo noise.

For each candidate, add:

- brief normalized description
- preliminary category guess
- preliminary stack role guess

Output:
- updated github_repo_candidate_registry_v0.md

### Stage 2: First-pass triage

For each candidate repo, assign:

- role taxonomy mapping
- horizon label
- fit label
- risk label
- short note on why it may matter

Do not deeply evaluate yet. This is a classification pass.

Output:
- updated github_repo_candidate_registry_v0.md
- first draft of github_repo_role_map_v0.md

### Stage 3: Identify candidate leaders by role

For each stack role, identify:

- top candidate(s)
- promising alternatives
- idea-source-only repos
- missing capability areas where no good candidate appears yet

Output:
- github_repo_role_map_v0.md
- first draft of github_repo_research_gaps_v0.md

### Stage 4: Deepen the most relevant candidates

Select the strongest candidates in the most important early roles, especially:

- orchestration and workflow execution
- structured knowledge and portfolio state
- content / landing-page generation
- observability / reporting
- agent coordination and multi-agent supervision
- data enrichment / scraping
- internal operator workflow

For these candidates, produce a more detailed assessment:

- what role it fills
- why it is useful
- why it might be too early
- what maintenance burden it creates
- what risks it introduces
- whether it is a serious candidate for the early stack
- whether it is better treated as an idea source only

Output:
- github_repo_shortlist_v0.md

### Stage 5: Separate stack candidates from inspiration

Create a clean distinction between:

- actual stack candidates
- future-watch candidates
- idea-source-only repos
- repos to ignore

Output:
- github_repo_shortlist_v0.md
- github_repo_idea_sources_v0.md

### Stage 6: Flag research tasks

Where the repo pool is weak or unclear, produce explicit research tasks such as:

- find better agent coordination options
- find better portfolio state systems
- find stronger observability candidates
- find alternatives to a given repo category
- assess agenthub and similar tools as an emerging category rather than a default dependency

Output:
- github_repo_research_gaps_v0.md

## Repo Registry Format

Use this section structure for each entry in github_repo_candidate_registry_v0.md:

### [Repo Name]

- URL:
- Description:
- Source files:
- Category guess:
- Stack role(s):
- Horizon:
- Fit:
- Risk:
- Why it might matter:
- Concerns:
- Current verdict:

## Role Map Format

In github_repo_role_map_v0.md, group repos by stack role.

For each role, use this structure:

## [Role Name]

### Leading candidates
- repo
- repo

### Promising alternatives
- repo
- repo

### Idea sources only
- repo
- repo

### Notes
- short summary of what this role needs
- short summary of what appears weak or strong in the current candidate set

## Shortlist Format

In github_repo_shortlist_v0.md, include only the most relevant candidates for the near-term stack.

For each shortlisted repo, include:

- name
- role
- why shortlisted
- horizon
- key upside
- key downside
- verdict: assess further / likely now / likely later / likely reject

## Important Rules

- Do not treat trending popularity as evidence of suitability.
- Do not assume a repo belongs in the stack because it is agent-related.
- Favor repos that improve learning speed, portfolio control, bounded autonomy, or observability.
- Penalize repos that introduce infrastructure sprawl or unclear state.
- Keep a clean distinction between stack candidate and idea source.
- Map all judgments back to the doctrine and stack thesis.
- When a repo is too early, say so directly.
- When a repo seems useful mainly for inspiration, classify it as idea source only.

## AgentHub Note

AgentHub and similar repos should be treated as category candidates for agent coordination and autonomous research infrastructure.

Do not assume they are core stack dependencies by default. Evaluate them as:

- possible inspiration for architecture
- possible later-stage candidate
- possible adjacent fit
- not automatically a near-term foundation

## Completion Standard

This plan is complete when:

- all repos from the input files are normalized into a candidate registry
- each repo is mapped to at least one stack role
- a shortlist exists for serious candidates
- idea-source-only repos are separated out
- weak or missing capability areas are identified
- the output is clean enough to support deeper repo-by-repo evaluation in later prompts
