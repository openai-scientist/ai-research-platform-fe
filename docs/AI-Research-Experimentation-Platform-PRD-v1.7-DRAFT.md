# Product Requirements Document (PRD)
## AI Research Experimentation Platform

**Document Type:** Product Requirements Document  
**Project:** AI Research Experimentation Platform  
**Version:** 1.8 Draft\
**Status:** Draft / Aligned with BRD v1.9 (Draft) and target architecture ([architecture.md](architecture.md))\
**Source:** Business Requirements Document v1.9 (Draft)\
**Date:** 2026-09-28\

---

# 1. Product Summary

AI Research Experimentation Platform là nền tảng web sử dụng AI Agent để hỗ trợ researcher thực hiện quy trình nghiên cứu dựa trên structured/tabular datasets.

Sản phẩm không chỉ thực hiện một lần phân tích dữ liệu, mà quản lý một research loop có cấu trúc:

```text
Research Brief (Research Question + Dataset + H0/H1 + context + δ_F / δ_N)
        ↓
Brief Intake + Dataset Understanding / Data Card
        ↓
Exploration / Confirmation Split + Freeze Research Protocol
        ↓
Build Research State + Research Program
        ↓
Exploration phase (agent loop, exploration partition, every analysis ledgered)
├── Generate Candidate Hypotheses / Directions
├── Exploration Analyses via Registered Capabilities
├── Critique → Refine
├── Structured Selection (decision point: select)
└── Next Move (decision point): explore further / alternative / critique / go on
        ↓
Experiment Planning (estimand → method → criteria)
        ↓
Candidate Method Generation + Deterministic Assumption Checks
        ↓
Register Confirmation Batch (look budget)
        ↓
Execute Batch on Confirmation Partition (test epoch)
        ↓
Deterministic Scientific Validation + Severity + Robustness
        ↓
Deterministic Evidence Sufficiency
├── FINDING (supported / contradicted)
├── NEGATIVE_RESULT
└── INCONCLUSIVE
    (+ Researcher Review when a deterministic trigger fires)
        ↓
Update Research State
        ↓
Next Move / Stopping Criteria
├── Follow-up → new run on fresh data
└── Stop → Final Outcomes → Figures/Tables → Research Report
```

Mọi finding quan trọng phải có khả năng truy ngược về:

```text
Finding
→ Hypothesis
→ Experiment
→ Dataset Version
→ Selected Method
→ Assumption Checks
→ Registered Capability + Parameters + Partition
→ Raw Output
→ Statistical Result
```

Platform tập trung vào bảy giá trị sản phẩm:

1. **Scientific Validity** — method phù hợp, assumptions rõ ràng, multiple-testing control, effect size và uncertainty.
2. **Structured Decision Safety** — bounded decisions tại decision points có output cấu trúc, confidence, abstention và rule fallback; decision layer chỉ thu hẹp, không nới rộng.
3. **Separation of Responsibilities** — reasoning agent dùng cho plan/generate/reason/critique/refine; decision layer dùng để chọn tại decision points; deterministic tools tính scientific facts và official outcome; hooks/commit tools kiểm soát thay đổi state.
4. **Search Integrity** — mọi phân tích được ghi vào Analysis Ledger; exploration tách khỏi confirmation; confirmation batch cố định trước khi đọc dữ liệu kiểm thử.
5. **Traceability** — mọi finding và structured decision quan trọng có provenance, decision record và execution trace.
6. **Reproducibility** — experiment có metadata/snapshot đủ để tái lập.
7. **Human Control** — researcher giữ quyền quyết định tại các bước có uncertainty/risk cao.

---

# 2. Product Vision

> Cho phép researcher biến một research question và dataset thành một chuỗi experiment có kiểm soát, tạo ra evidence-backed findings có thể kiểm chứng và tái lập, thay vì chỉ nhận một câu trả lời dạng black-box từ AI.

---

# 3. Product Goals

| ID | Product Goal |
|---|---|
| PG-01 | Cho phép researcher bắt đầu từ research question, hypothesis và dataset |
| PG-02 | Tự động profiling và hiểu dataset mà không yêu cầu khai báo schema thủ công |
| PG-03 | Tự động đề xuất candidate analytical/statistical methods |
| PG-04 | Kiểm tra assumptions trước khi thực thi method |
| PG-05 | Thực thi experiment an toàn chỉ qua registered capabilities trong sandbox và hỗ trợ technical retry |
| PG-06 | Chuyển raw output thành evidence-backed finding |
| PG-07 | Sinh/refine hypothesis mới từ validated finding |
| PG-08 | Quản lý vòng lặp H → E → F → H(n+1) có stopping criteria |
| PG-09 | Quản lý provenance, dependency, conflicting evidence và downstream invalidation |
| PG-10 | Tạo figure/table/report có thể truy vết |
| PG-11 | Lưu reproducibility snapshot cho official experiments |
| PG-12 | Đánh giá agent bằng benchmark, metrics và ablation study |
| PG-13 | Xây dựng Research State có cấu trúc cho từng research iteration |
| PG-14 | Sinh và đánh giá candidate hypotheses/research directions trước deep experiment planning |
| PG-15 | Sử dụng structured decision layer tại decision point *select* để rank/select/reject/defer candidate directions, với deterministic rule fallback |
| PG-16 | Tính deterministic evidence sufficiency (Finding / Negative Result / Inconclusive) và tách next move (refinement, replication, review, stop) thành decision point riêng |
| PG-17 | Đánh giá chất lượng decision layer theo từng decision point và so sánh với deterministic rule và LLM-only baseline |
| PG-18 | Khi candidate hypothesis ngang điểm trong ngưỡng cấu hình, đưa chúng vào cùng một confirmation batch trong look budget thay vì ép chọn 1, có kiểm soát chi phí và multiple-testing |
| PG-19 | Tách exploration khỏi confirmation, ghi mọi phân tích vào Analysis Ledger và cố định confirmation batch trước test epoch |
| PG-20 | Vận hành research loop bằng một agent loop trên workflow floor, với hooks, commit tools, budgets và autonomy level |

---

# 4. Non-Goals

Phiên bản capstone không nhằm xây dựng:

- fully autonomous AI Scientist;
- autonomous literature discovery trên toàn Internet;
- automatic novelty guarantee;
- autonomous paper submission/publication;
- foundation model training;
- distributed big-data platform;
- real-time streaming analytics;
- scientific image/audio/video analysis;
- full causal-inference engine;
- execution of model-generated code, SQL, shell commands or unrestricted imports — analyses run only through registered capabilities with typed parameters (BR-22);
- unbounded autonomous tree search (kiểu Sakana AI Scientist-v2) — platform không tổ chức experiment thành cây node cha-con được mở rộng không giới hạn. Research loop là **agent-directed trong budget và invariant** (BR-80): agent có thể khám phá nhiều bước, quay lại và prune hướng nghiên cứu trước test epoch, nhưng chỉ trong exploration budget, round limit và diversity floor; Research Program branches (BR-81, P2) chỉ là view có giới hạn trên Research Graph và MVP không phụ thuộc vào chúng.

Platform tham khảo các agentic research systems (idea reflection, prior-work assessment, sequential falsification, agent harness với tools/hooks/subagents; xem [architecture.md](architecture.md) §3.1) nhưng giữ thứ tự Decision-Gated Research Loop làm workflow floor. Scope chính vẫn là **scientific analysis trên user-provided structured datasets**, có audit, dễ kiểm soát chi phí.

---

# 5. Target Users & Roles

## 5.1. Researcher / Data Analyst — Primary Persona

### Jobs to Be Done

- upload và hiểu dataset;
- định nghĩa research question và H0/H1;
- yêu cầu AI lập experiment plan;
- xem lý do chọn statistical method;
- review assumption checks;
- chạy experiment;
- xem result và evidence;
- review hypothesis mới;
- tạo figure/table/report;
- kiểm tra provenance và reproducibility.

### Success Definition

Researcher có thể đi từ dataset + hypothesis đến validated finding mà không phải tự viết toàn bộ workflow thủ công.

---

## 5.2. Project Manager

### Jobs to Be Done

- tạo project;
- quản lý members;
- theo dõi research progress;
- theo dõi experiment/finding history;
- review final research outputs.

---

## 5.3. Reviewer / Stakeholder

### Jobs to Be Done

- xem findings;
- xem figures/tables;
- xem methodology;
- kiểm tra evidence/provenance;
- review report;
- để lại feedback nếu được cấp quyền.

---

## 5.4. System Administrator

### Jobs to Be Done

- quản lý users/roles;
- quản lý AI model configuration;
- xem logs;
- theo dõi system health;
- theo dõi usage/cost;
- quản lý benchmark/evaluation configurations.

---

# 6. Product Principles

## PP-01 — Evidence Before Conclusion

Finding quan trọng không được xuất hiện trong official report nếu không có supporting evidence.

## PP-02 — Hypothesis Is Not Fact

Hypothesis mới do agent sinh ra luôn bắt đầu ở trạng thái `Unverified`.

## PP-03 — Unusual Does Not Mean Incorrect

Outlier/anomaly không tự động được sửa hoặc loại bỏ.

## PP-04 — Association Does Not Imply Causation

Agent không được dùng language causal khi research design chỉ hỗ trợ association/correlation.

## PP-05 — Preserve the Original

Raw dataset không bao giờ bị ghi đè.

## PP-06 — Method Selection Must Be Explainable

Agent phải lưu lý do chọn method và lý do loại candidate khác khi cần.

## PP-07 — Human Controls High-Risk Decisions

Risky cleaning, ambiguous variable meaning, conflicting evidence hoặc strong causal interpretation phải có human review.

## PP-08 — Reproducibility by Default

Official experiment phải có reproducibility snapshot.

## PP-09 — Tools Establish Scientific Facts

Statistical values, diagnostics và deterministic checks phải đến từ analytical/statistical tools khi có thể. LLM hoặc decision model không được tự phát minh scientific facts.

## PP-10 — Structured Decisions Before Automation

Các bounded decision quan trọng phải dùng structured output có decision type, confidence/uncertainty và downstream action.

## PP-11 — Technical Retry Is Not Scientific Refinement

Execution failure được xử lý bằng technical retry trong registered capability (cùng experiment, không tạo look mới); valid execution nhưng evidence chưa đủ phải đi vào scientific refinement (next move).

## PP-12 — Confidence Does Not Replace Evidence

Confidence của decision gate chỉ dùng cho routing/escalation, không thay thế p-value, effect size, confidence interval, diagnostics hoặc evidence thực tế.

## PP-13 — Every Look Counts; Explore, Then Confirm Once

Mọi phân tích trên dữ liệu có ledger entry. Exploration chỉ gợi ý; confirmation batch, primary analysis và criteria được cố định trước khi đọc confirmation data.

## PP-14 — Decision Layer Narrows, Never Widens

Decision layer chỉ chọn trong các option đã được deterministic validation cho phép; nó không admit proposal, không pass gate và không tạo official outcome.

## PP-15 — Enforce Invariants in Hooks, Not Prompts

Invariant (phase, budget, partition access, ledger, origin) được thực thi bằng deterministic hooks và commit preconditions, không dựa vào instruction trong prompt. Chỉ commit tools thay đổi state.

---

# 7. Product Scope & Priority

## 7.1. P0 — Core MVP

- authentication;
- RBAC cơ bản;
- research project;
- dataset upload;
- dataset validation;
- profiling;
- Data Card;
- research question;
- H0/H1;
- Research State;
- candidate hypothesis / research-direction generation;
- idea record & reflection (Module AH, BR-64, Must);
- structured decision-provider interface;
- experiment planner;
- candidate method generation;
- assumption checking;
- method selection;
- secure experiment execution via registered capabilities;
- technical retry;
- deterministic playbook (autonomy A0) with hooks and commit tools (Module AJ);
- statistical result;
- finding generation;
- provenance;
- execution trace;
- dataset versioning.

## 7.2. P1 — Research Loop & Scientific Validity

- hypothesis refinement;
- hypothesis origin/status;
- agent-directed research loop with decision points, autonomy A1 (Module AJ, BR-80, Must);
- exploration/confirmation split, Analysis Ledger, Research Protocol, confirmation batch (Module AI, BR-79, Must);
- structured Hypothesis Selection Gate;
- deterministic Evidence Sufficiency Gate;
- scientific refinement loop (next move);
- confidence-based human escalation;
- decision audit trail;
- decision-gate evaluation;
- stopping criteria;
- limited experiment branching as triangulation/bounded robustness (Must for final capstone per BRD BR-21; grouped here because it depends on P1 method-selection scope);
- multiple-testing control;
- effect size;
- confidence interval;
- data leakage guard;
- experiment dependency graph;
- conflicting evidence;
- downstream invalidation;
- uncertainty/confidence metadata;
- figure/table generation;
- research report;
- research artifacts with envelope/visibility and publication views with integrity audit (Module AK, BR-83/84, Must);
- claim-level gate and causal assumption endorsement (Module M);
- reproducibility snapshot, replay vs re-derivation;
- evaluation center;
- benchmark;
- ablation;
- prior-work assessment (tham khảo, coverage-scoped, Module AH, BR-65);
- figure aggregation & visual feedback (Module AH, BR-73);
- manuscript draft generation (Module AH, BR-74);
- automated manuscript review (Module AH, BR-75).

## 7.3. P2 — Extension

- figure/VLM reviewer;
- Research Program branch map / research map view (BR-81, Should);
- subagents (Skeptic, Literature) once they beat the single-loop baseline;
- autonomy levels above A1;
- research map and portfolio view with named lenses (Module AK, BR-84);
- Research Knowledge Layer: domain packs beyond `general`, method lessons (Module AL, BR-82);
- Simulation Lab (Module AM, BR-85);
- theory and observable implications (FR-STATE-06, BR-86);
- research campaign across runs (FR-REFLOOP-06, BR-87);
- literature connectors;
- advanced ML;
- collaborative editing;
- scheduled experiments;
- external database connectors;
- advanced research templates.

---

# 8. Information Architecture

Primary project navigation:

```text
Project Overview
├── Research
│   ├── Research Questions / Brief
│   ├── Research Protocol & Deviations
│   ├── Research State / Research Program
│   ├── Candidate Hypotheses
│   ├── Active Hypothesis
│   ├── Confirmation Batch
│   ├── Analysis Ledger
│   ├── Decision History
│   └── Research Loop
├── Datasets
│   ├── Dataset List
│   ├── Data Card
│   ├── Data Quality
│   └── Versions
├── Experiments
│   ├── Plans
│   ├── Runs
│   ├── Dependency Graph
│   └── Execution Trace
├── Findings
│   ├── Outcomes (Findings / Negative Results / Inconclusive)
│   ├── Conflicting Evidence
│   ├── Evidence Sufficiency Outcomes
│   └── Evidence View
├── Outputs
│   ├── Artifacts
│   ├── Figures
│   ├── Tables
│   ├── Reports / Finding Briefs
│   ├── Preregistration View
│   ├── Disclosure Bundle
│   ├── Analysis Package
│   └── Research Map / Lineage / Portfolio
├── Evaluation
│   ├── Benchmarks
│   ├── Runs
│   ├── Metrics
│   └── Ablations
└── Project Settings
```

Admin navigation:

```text
Users
Roles
Model Configuration
System Logs
Usage / Cost
Evaluation Configuration
System Health
```

---

# 9. Primary End-to-End User Flow

```text
Login
↓
Create/Open Project
↓
Upload Dataset
↓
Dataset Validation
↓
Automatic Profiling + Data Card
↓
Review Data Quality
↓
Apply Approved Cleaning if needed
↓
Enter Research Question
↓
Define / Confirm Initial H0/H1, context, δ_F / δ_N (or accept defaults)
↓
Brief Intake (decision point: intake → proceed / restate / clarify)
↓
Exploration / Confirmation Split
↓
Freeze Research Protocol
↓
Build Research State + Research Program
↓
Exploration loop (exploration partition only; every analysis ledgered)
├── Generate Candidate Hypotheses / Research Directions
├── Exploration Analyses via Registered Capabilities
├── Skeptic Critique → Refine
├── Structured Hypothesis Selection (decision point: select)
│   ├── Select → Continue
│   ├── Reject / Defer → Idea Pool with reason
│   └── Abstain / below threshold → Rule → Researcher Review if triggered
└── Next Move (decision point): explore further / alternative / critique again / go on
↓
LLM Deep Reasoning (estimand → method)
↓
Generate Experiment Plan / Research Proposal
↓
Generate Candidate Methods
↓
Deterministic Assumption Checks (exploration partition)
↓
Register Confirmation Batch (admission gate, look budget)
↓
Execute Batch in Secure Sandbox on Confirmation Partition (test epoch)
↓
Execution Successful?
├── No → Technical Retry inside capability
└── Yes
     ↓
Deterministic Scientific Validation + Severity + Robustness
↓
Deterministic Evidence Sufficiency
├── FINDING (supported / contradicted)
├── NEGATIVE_RESULT
└── INCONCLUSIVE
    (Deterministic review trigger → Researcher Review)
↓
Update Research State
↓
Next Move / Stopping Criteria?
├── Follow-up → new run on fresh data
└── Stop → Final Outcomes → Figures/Tables → Research Report → Reproducibility Package
```

### Product Rule

The product must visibly distinguish:

```text
Technical Retry
= execution failed

Scientific Refinement
= execution succeeded, but evidence is insufficient
  (exploration before the test epoch; follow-up on fresh data after it)
```

These paths must have different states, trace entries and evaluation metrics. The product must also visibly distinguish **exploration results** (hypothesis-generating, never official) from **confirmation-batch outcomes**.

---

# 10. Feature Module A — Authentication & Access Control

## Objective

Đảm bảo user chỉ truy cập project và action được cấp quyền.

## User Stories

**US-AUTH-01**  
As a user, I want to sign in securely so that I can access my research projects.

**US-AUTH-02**  
As a project manager, I want to assign project roles so that members have appropriate permissions.

**US-AUTH-03**  
As an admin, I want to manage global roles and access so that the platform remains controlled.

## Functional Requirements

### FR-AUTH-01 — Login

System shall support authenticated login.

### FR-AUTH-02 — Session / Token

System shall maintain authenticated session/token and reject expired/invalid sessions.

### FR-AUTH-03 — Project Membership

A user must be a project member or privileged admin to access project resources.

### FR-AUTH-04 — Role Enforcement

Actions must be checked server-side, not only hidden in frontend.

## Minimum Permission Model

| Capability | Admin | Project Manager | Researcher | Reviewer |
|---|---:|---:|---:|---:|
| Manage system users | ✓ |  |  |  |
| Create project | ✓ | ✓ | ✓ |  |
| Manage project members | ✓ | ✓ |  |  |
| Upload dataset | ✓ | ✓ | ✓ |  |
| Apply cleaning | ✓ | ✓ | ✓ |  |
| Create hypothesis | ✓ | ✓ | ✓ |  |
| Run experiment | ✓ | ✓ | ✓ |  |
| Review finding | ✓ | ✓ | ✓ | ✓ |
| Generate report | ✓ | ✓ | ✓ |  |
| Run benchmark | ✓ | ✓ | ✓ |  |
| View system logs | ✓ |  |  |  |

## Acceptance Criteria

- unauthorized users receive access denied;
- role changes take effect without editing frontend code;
- project data is isolated by project membership;
- all privileged actions are auditable.

**Priority:** P0

---

# 11. Feature Module B — Research Project Workspace

## Objective

Cung cấp một workspace tập trung chứa toàn bộ research lifecycle.

## User Stories

**US-PROJ-01**  
As a researcher, I want to create a research project so that datasets, hypotheses, experiments and findings are organized together.

**US-PROJ-02**  
As a project manager, I want an overview of project progress so that I know the current research state.

## Functional Requirements

### FR-PROJ-01 — Create Project

Fields:

- project name;
- description;
- research domain;
- owner;
- optional objective;
- optional tags.

### FR-PROJ-02 — Project Overview

Overview shall show:

- active research question;
- current hypothesis;
- datasets;
- latest experiment;
- latest finding;
- loop status;
- unresolved warnings;
- report status.

### FR-PROJ-03 — Project State

Suggested states:

```text
Draft
Data Ready
Researching
Needs Review
Completed
Archived
```

## Acceptance Criteria

- project owner can create and edit metadata;
- project page loads key research state without opening multiple screens;
- archived projects become read-only by default.

**Priority:** P0

---

# 12. Feature Module C — Dataset Upload & Validation

## Objective

Cho phép user đưa structured dataset vào platform một cách an toàn.

## Supported Formats

P0:

- CSV;
- XLSX.

P1:

- JSON;
- TSV;
- Parquet.

## User Stories

**US-DATA-01**  
As a researcher, I want to upload my dataset so that the agent can analyze it.

**US-DATA-02**  
As a researcher, I want validation errors before analysis starts so that invalid input does not silently affect findings.

## Functional Requirements

### FR-DATA-01 — Upload

System shall:

1. accept supported file;
2. store immutable original;
3. calculate checksum;
4. create dataset entity;
5. create `v1` raw version;
6. start validation/profiling job.

### FR-DATA-02 — Validation

Validate:

- file readability;
- empty file;
- header/schema;
- duplicate column names;
- unsupported types;
- encoding;
- row/column count;
- file size limit.

### FR-DATA-03 — Error Handling

Upload failures must show actionable error message and must not create a usable dataset version.

## Acceptance Criteria

- original file remains immutable;
- validation result is visible;
- invalid file cannot be used by experiment planner;
- every uploaded dataset has unique ID/version.

**Priority:** P0

---

# 13. Feature Module D — Automatic Profiling & Data Card

## Objective

Tạo machine-readable và human-readable representation của dataset để agent không cần đưa toàn bộ raw data vào LLM context.

## User Stories

**US-PROFILE-01**  
As a researcher, I want to understand my dataset quickly without manually inspecting every column.

**US-PROFILE-02**  
As the agent, I need a compact Data Card so that I can plan experiments without loading the entire dataset into the prompt.

## Functional Requirements

### FR-PROFILE-01 — Profiling

Generate:

- row count;
- column count;
- inferred type;
- missing count/ratio;
- unique count;
- duplicate rows;
- numeric summary;
- categorical frequency summary;
- distribution hints;
- candidate outliers;
- example values;
- possible identifiers;
- possible target/feature hints;
- quality warnings.

### FR-PROFILE-02 — Data Card

Data Card shall include:

```text
Dataset Identity
Version
Schema
Variable Types
Quality Summary
Statistical Summary
Sample Values
Potential Relationships
Warnings
Known Domain Notes
```

### FR-PROFILE-03 — Agent Context

Planner receives Data Card and selected samples/statistics, not unrestricted full raw dataset text.

### FR-PROFILE-04 — Structural vs Relational Facts

The profile computed on the full snapshot exposes structural facts only (types, missingness per variable, cardinality, identifiers, duplicates, sentinel codes, declared order/group columns). Any quantity that relates two variables (Potential Relationships, near-deterministic flags, missingness of one variable by another, outcome-relevant distribution hints) is computed on the exploration partition only; without a split, only declared derivations are flagged. This keeps profiling from reading confirmation data before the test epoch (Module AI).

## Acceptance Criteria

- profiling runs after successful upload;
- Data Card references exact dataset version;
- Data Card is regenerated when version changes;
- researcher can inspect profiling result before experiment.

**Priority:** P0

---

# 14. Feature Module E — Data Quality, Cleaning & Versioning

## Objective

Hỗ trợ data preparation nhưng không tự biến anomaly thành data error.

## Issue Types

```text
Confirmed Data Issue
Potential Anomaly
Needs User Confirmation
Needs Domain Clarification
```

## User Stories

**US-CLEAN-01**  
As a researcher, I want the agent to identify possible data-quality issues so that I can review them before analysis.

**US-CLEAN-02**  
As a researcher, I want risky cleaning to require my approval so that valid scientific data is not silently changed.

## Functional Requirements

### FR-CLEAN-01 — Issue Detection

Each issue must store:

- issue type;
- affected columns/rows;
- severity;
- reason;
- evidence;
- recommended action;
- confidence.

### FR-CLEAN-02 — Cleaning Proposal

Proposal shall show:

- transformation;
- rationale;
- rows/columns affected;
- potential information loss;
- risk;
- reversibility.

### FR-CLEAN-03 — Approval

Actions:

```text
Approve
Reject
Modify
Ask Agent
```

### FR-CLEAN-04 — Version Creation

Approved transformation creates:

```text
Dataset vN
→ Transformation Record
→ Dataset vN+1
```

A run starts on an approved snapshot version. Cleaning applied after the split is a protocol deviation (Module AI), and a cleaning choice that could change an outcome (outlier removal, recoding) is registered as a robustness specification (Module K) instead of being applied silently.

### FR-CLEAN-05 — Lineage

User shall be able to see dataset version lineage.

## Acceptance Criteria

- original version is never overwritten;
- risky transformation cannot execute without required approval;
- every version records parent version and transformations;
- experiments reference a specific dataset version.

**Priority:** P0

---

# 15. Feature Module F — Research Question & Research Context

## Objective

Cho agent đủ scientific/domain context trước experiment planning.

## User Stories

**US-RQ-01**  
As a researcher, I want to enter a research question so that the agent knows what evidence to seek.

**US-RQ-02**  
As a researcher, I want to provide variable/domain meaning so that the agent does not invent business/scientific semantics.

## Functional Requirements

### FR-RQ-01 — Research Question

Required:

- question text.

Optional (Research Brief fields):

- research goal / intended use;
- smallest effect that matters (δ_F) and equivalence margin (δ_N), within policy bounds;
- declared hypotheses;
- target claim level;
- resolution criteria;
- prior exposure to the dataset;
- data dictionary / expected variables and roles;
- domain / domain pack;
- constraints and scope;
- consent for sending data-derived content to external model providers;
- notes;
- prior assumptions.

A missing optional field is recorded as a **gap** that limits what the run can do or claim. Brief text, context and prior knowledge are untrusted data and are never evidence.

### FR-RQ-02 — Brief Intake & Context Clarification

Before any data value is read, the *intake* decision point assesses completeness, ambiguity, scope fit and causal wording (reading the column header only) and returns proceed, restate or clarify. On clarify, the agent calls `ask_user` and the run pauses durably in `awaiting_clarification` for a bounded number of rounds; at the deadline it proceeds with gaps recorded. A requested claim above the reachable level is restated, never widened, and the restatement is shown on every outcome. Clarifications create new brief versions; the brief is frozen into the Research Protocol.

### FR-RQ-03 — Multiple Questions

P1: one project may contain multiple research questions, but only one active loop per research question unless parallel runs are intentionally enabled. Each run keeps its own protocol, test epoch, ledger and look budget; runs are never pooled into one test.

### FR-RQ-04 — Pre-Run Preview

Before a run starts, the product shows for the chosen values: precision plan, expected outcome distribution, cost estimate, answerability and reachable claim level of each brief question, and the evidential status reachable on this dataset lineage.

## Acceptance Criteria

- experiment cannot start without active research question;
- context is versioned or timestamped;
- user can edit context with history retained.

**Priority:** P0

---

# 16. Feature Module G — Hypothesis Management

## Objective

Quản lý hypothesis như first-class product object.

## Hypothesis Fields

```text
Hypothesis ID
Statement
Null / Alternative Type
Origin
Research Question
Parent Finding
Status
Created By
Created At
Approval Status
Evidence Summary
Notes
```

## Origin Values

```text
declared                     # in the brief, before the system read the data
generated_blind              # before the test epoch, from metadata/structural facts/knowledge only
generated_from_exploration   # before the test epoch, with exploration results in context (needs a split)
post_test                    # after the test epoch, or with prior exposure to results on this dataset
```

Creator is recorded separately (`User-defined` / `Agent-generated`). Legacy labels map as: `Initial / Confirmatory` → `declared`; `Post-hoc / Exploratory` → `generated_from_exploration` or `post_test`.

## Status Values

```text
Proposed
Unverified
Supported
Rejected
Inconclusive
Superseded
Needs Review
```

## User Stories

**US-HYP-01**  
As a researcher, I want to define H0/H1 so that the initial experiment has a clear hypothesis.

**US-HYP-02**  
As a researcher, I want agent-generated hypotheses labeled with a system-assigned origin so that exploratory, declared and post-test hypotheses are not mixed.

**US-HYP-03**  
As a reviewer, I want to see which experiment supports or rejects a hypothesis.

## Functional Requirements

### FR-HYP-01 — Initial H0/H1

Researcher may manually define or request an AI draft.

AI-generated initial hypothesis requires researcher confirmation before becoming active.

### FR-HYP-02 — Hypothesis Origin

Origin is derived by the runtime from the test epoch and the context manifests of every step that generated or selected the hypothesis; a model can never set or claim it. System must never silently label a post-result hypothesis as `declared`. A `post_test` hypothesis can only be tested on fresh data (new snapshot or unread sealed partition); otherwise its outcome is hypothesis-generating.

### FR-HYP-03 — Status Update

Hypothesis evaluation is updated from confirmation-batch outcomes only; exploration results never change a hypothesis to `Supported` or `Rejected`.

### FR-HYP-04 — Parent Link

A generated hypothesis must link to the exploration result, finding or critique that motivated it.

## Acceptance Criteria

- all hypotheses have explicit, system-assigned origin;
- agent-generated hypothesis starts `Unverified`;
- hypothesis history is retained;
- a finding cannot silently overwrite hypothesis statement.

**Priority:** P0 for initial hypothesis; P1 for full lifecycle/refinement.

---

# 17. Feature Module H — Experiment Planner

## Objective

Chuyển hypothesis + Data Card + context thành executable scientific plan.

## Planner Inputs

```text
Research Question
Active Hypothesis
Data Card
Dataset Version
Domain Context
Previous Findings
Previous Experiments
Constraints
```

## Planner Output

```text
Experiment Objective
Estimand (population, variables, conditioning set, summary measure,
          missing/outlier handling, question type, target claim level)
Operationalization (concept → column mapping)
Variables
Primary Analysis
Candidate Methods / Registered Robustness Specifications
Assumptions to Check
Severity Checks
Finding Threshold δ_F and Equivalence Margin δ_N
Success / Falsification Criteria
Data Requirements
Proposed Steps
Expected Outputs
Possible Risks
Look Cost
Anticipated Limitations
```

Estimand is fixed before method. When a proposal is admitted to the confirmation batch (Module AI), every field above is frozen; changing any of them afterwards creates new scientific work.

## User Stories

**US-PLAN-01**  
As a researcher, I want the agent to explain the experiment plan before execution so that I understand what it intends to do.

## Functional Requirements

### FR-PLAN-01 — Plan Generation

Planner shall generate structured plan, not only free text.

### FR-PLAN-02 — Plan Revision

Plan may be revised after:

- failed assumption;
- execution error;
- user clarification;
- conflicting evidence;
- invalid dataset version.

### FR-PLAN-03 — Risk Flag

Planner must flag:

- ambiguous variable meaning;
- suspected leakage;
- insufficient sample;
- unsupported causal question;
- destructive preprocessing.

### FR-PLAN-04 — Plans for Tied Candidates in One Confirmation Batch

When the Hypothesis Selection Gate (Module AD) finds tied candidates, Planner shall generate one independent Research Proposal per selected candidate, each referencing its own hypothesis and estimand, and all registered into the **same confirmation batch** (Module AI). There are no parallel execution branches. The `tie_threshold` (score-closeness margin) is a policy setting; the number of proposals is bounded by the look budget and the protocol's look allocation, not by a separate parallel-branch cap.

## Acceptance Criteria

- plan references exact hypothesis, estimand and dataset version/partition;
- plan lists candidate methods and the registered primary analysis;
- user can inspect plan before registration;
- reason for re-plan is logged;
- when multiple candidates are tied-selected, each resulting proposal is independently inspectable and references its own hypothesis and the shared confirmation batch ID;
- total registered looks in the batch never exceed the look budget.

**Priority:** P0

---

# 18. Feature Module I — Candidate Method Generation & Selection

## Objective

Cho agent lựa chọn statistical/analytical method phù hợp thay vì hard-code một test duy nhất.

## Initial Supported Methods

P0 / Must for final capstone (BR-31 Statistical Analysis is Must in BRD MoSCoW and explicitly lists every method below):

- descriptive statistics;
- Pearson correlation;
- Spearman correlation;
- independent t-test;
- paired t-test;
- Mann–Whitney U;
- chi-square test;
- one-way ANOVA;
- Kruskal–Wallis;
- linear regression;
- logistic regression;
- interaction analysis;
- basic time-series analysis.

P1 (extension beyond BR-31 — not required for Must compliance):

- simple repeated-measure support;
- selected ML prediction workflows.

## User Stories

**US-METHOD-01**  
As a researcher, I want to know why a method was selected so that I can review its scientific appropriateness.

## Functional Requirements

### FR-METHOD-01 — Candidate Generation

Agent shall generate one or more candidates based on:

- research goal;
- variable types;
- sample structure;
- distribution;
- expected relationship;
- prior findings.

### FR-METHOD-02 — Assumption Definition

Each candidate shall declare required assumptions.

### FR-METHOD-03 — Selection

System shall store:

- selected method;
- selection reason;
- rejected alternatives;
- failed/passed assumptions.

### FR-METHOD-04 — Alternative Method

If assumptions fail, agent should:

1. choose valid alternative; or
2. ask user; or
3. mark experiment not currently feasible.

## Acceptance Criteria

- selected method is explainable;
- assumption failures are visible;
- method cannot silently switch without trace;
- unsupported method must not be executed as if supported.

**Priority:** P0

---

# 19. Feature Module J — Assumption Checking

## Objective

Kiểm tra điều kiện sử dụng method trước và sau execution khi cần.

## Example Checks

- variable type;
- independence;
- normality where relevant;
- linearity;
- homoscedasticity;
- expected cell count;
- sample size;
- influential outliers;
- multicollinearity where relevant;
- model-specific diagnostics.

## Functional Requirements

### FR-ASSUME-01

Each assumption check produces:

```text
Assumption
Status: Pass / Fail / Warning / Not Applicable
Evidence
Method Used
Impact
Recommended Action
```

### FR-ASSUME-02

Warning/failure must propagate into experiment plan and finding interpretation.

## Acceptance Criteria

- checks are stored with experiment;
- finding cannot hide failed assumption;
- alternative method may be triggered automatically if safe.

**Priority:** P0

---

# 20. Feature Module K — Limited Experiment Branching (Triangulation & Bounded Robustness)

## Objective

Cho phép nhiều method/analytic specification cho cùng một estimand để triangulate và đánh giá robustness, mà không triển khai tree-search và không chọn kết quả "tốt nhất".

## Example

```text
Registered Proposal (estimand: association of ai_usage_rate with score)
├── Primary: Spearman           # registered before the test epoch
├── Sensitivity: Pearson
└── Sensitivity: Linear Regression adjusted for study_hours
```

## Functional Requirements

### FR-BRANCH-01

Each proposal registers exactly one primary analysis plus a bounded, configurable number of sensitivity specifications before the test epoch.

### FR-BRANCH-02

Each specification has separate:

- method;
- assumptions;
- execution;
- result;
- validation.

### FR-BRANCH-03

The primary result decides the outcome. Sensitivity results are reported alongside it as the share of specifications whose sufficiency category matches the primary; they can only weaken a claim and must never replace the primary result. Specification comparison must not choose the most statistically significant result.

## Acceptance Criteria

- primary and sensitivity specifications are visible and labelled;
- evidence from all executed specifications is retained;
- robustness agreement is reported on the outcome;
- no specification replaces the registered primary.

**Priority:** P1 / Must for final capstone (BR-21 is Must in BRD MoSCoW; kept as P1 here because it depends on Module I/J being in place first, not because it is optional for final submission)

---

# 21. Feature Module L — Secure Experiment Execution

## Objective

Thực thi experiment an toàn chỉ qua registered capabilities có typed parameters. Không có code, SQL, shell command hoặc unrestricted import do model sinh được thực thi.

## Execution Flow

```text
Frozen Experiment (registered proposal / exploration request)
↓
PreToolUse hooks (phase, budget, partition access, consent)
↓
Registered Capability Dispatch
↓
Sandbox
↓
Execute
↓
Capture result / typed error
↓
PostToolUse hooks (ledger entry, origin, trace)
↓
Validator
```

## Tool Categories

Every tool has a versioned contract: model-facing description, typed input schema with examples, bounded output that references artifacts by id, typed errors with repair hints, cost class and the phases in which it is enabled.

```text
Read:     read_state, read_profile, read_artifact, read_ledger, retrieve
Analyse:  profile_dataset, explore_analysis, statistical_test, check_assumptions,
          check_answerability, simulate, create_chart, generate_table
Propose:  record_hypothesis, record_critique, draft_proposal, propose_cleaning
Commit:   freeze_protocol, admit_proposal, register_batch, run_confirmation,
          assess_outcome, request_review, ask_user, finalize
Delegate: delegate (subagent, when enabled)
```

`run_python` and `run_sql` from PRD v1.7 are removed. Cleaning is proposed by the agent and applied/versioned by the platform after approval (Module E).

## Sandbox Requirements

- project/session isolation;
- no unrestricted host filesystem;
- network disabled by default;
- CPU limit;
- RAM limit;
- execution timeout;
- library whitelist;
- temporary working directory;
- output size limit;
- scrubbed process environment without worker credentials;
- concurrent-execution quota per project.

## User Stories

**US-EXEC-01**  
As a researcher, I want experiments to execute without risking my system or unrelated project data.

## Functional Requirements

### FR-EXEC-01 — Execution Record

Every execution stores:

- execution ID;
- experiment ID;
- registered capability and version;
- typed parameters;
- data partition;
- input references;
- output;
- error;
- latency;
- resource usage;
- retry number;
- Analysis Ledger entry ID.

### FR-EXEC-02 — Technical Retry

On error:

```text
Observe typed error
→ Diagnose
→ Retry inside the capability OR correct typed parameters
```

Retry count is limited. Technical retry keeps the same experiment, creates a ledger entry but no new look, and never changes scientific intent; changing hypothesis, estimand, method, partition or criteria is scientific refinement (Module AF).

### FR-EXEC-03 — Cancellation

User can cancel long-running experiment.

## Acceptance Criteria

- execution cannot access other project data;
- no unregistered code, query or shell command is executed;
- exploration tools cannot read the confirmation partition;
- timeout terminates process;
- every retry is traceable;
- failed execution does not create validated finding.

**Priority:** P0

---

# 22. Feature Module M — Statistical & Scientific Validation

## Objective

Không cho raw output đi thẳng thành scientific conclusion.

## Validation Pipeline

```text
Raw Result
↓
Execution Success
↓
Assumption Validation
↓
Multiple-Testing Check
↓
Effect Size
↓
Confidence Interval
↓
Leakage / Partition Check
↓
Severity Checks (negative controls, influence, subgroup reversal, attenuation)
↓
Bounded Robustness (registered specifications, Module K)
↓
Interpretation / Claim-Level Check
↓
Evidence Quality
↓
Deterministic Sufficiency (Module AE)
```

A failed severity check lowers sufficiency or claim level or adds a limitation; it never deletes the result. For a candidate Finding, checks include calibration, negative controls, influence, subgroup reversal, dependence and, for causal claims, the diagram's testable implications; for a candidate Negative Result, attenuation checks (restricted range, ceiling/floor, weak measurement, influence). Limitations are recorded by validity type, and some are mandatory and added deterministically (missing data above a policy share, failed severity check, brief gap, claim restatement, name-inferred operationalization).

## Functional Requirements

### FR-VALID-01 — Result Validation

Validate numerical/statistical output consistency.

### FR-VALID-02 — Unsupported Interpretation Guard

Agent must reject or soften statements not supported by result.

### FR-VALID-03 — Causal Language Guard

If design is observational/non-causal, output must use association language.

### FR-VALID-05 — Claim-Level Gate

A deterministic claim-level gate assigns each outcome a claim type and evidential status:

| Claim type | Requires |
|---|---|
| Descriptive | Declared population, sampling design and weights |
| Associational | Estimand, δ_F / δ_N, look budget, severity checks; declared weights applied |
| Predictive | Held-out evaluation, baseline, leakage and calibration checks |
| Causal (conditional) | Identification from endorsed assumptions, sensitivity analysis, negative controls |

| Evidential status | Requires |
|---|---|
| Hypothesis-generating | Any exploration or post-test result |
| Held-out | Tested once in a batch fixed before its data were read, with family-wise error control |
| Confirmatory | Registered in the protocol and tested on a sealed partition or new snapshot, error control at least as strict |

The MVP exploratory association capability reaches associational / held-out at most; other types and confirmatory status need an explicit contract change with tests.

### FR-VALID-06 — Causal Assumption Endorsement

A causal claim becomes official only when its assumptions are endorsed by the researcher or a reviewer through structured elicitation: the endorser answers questions on confounders, edges and time order before seeing the proposed diagram, the divergence is recorded, and failed testable implications are shown before the decision. A model is never the sole source of a causal assumption; failed testable implications lower the claim type or block the claim.

### FR-VALID-04 — Validation Status

```text
Passed
Passed with Warnings
Needs Review
Failed
```

## Acceptance Criteria

- failed validation blocks official finding;
- warning appears in finding/report;
- causal overclaim is prevented or flagged;
- validation record remains inspectable.

**Priority:** P0/P1

---

# 23. Feature Module N — Multiple-Testing Control

## Objective

Giảm false-positive risk trong iterative/multi-test workflow.

## Functional Requirements

### FR-MTEST-01 — Testing Family Tracking

Multiplicity is a property of the search. All proposals in one confirmation batch (including tied candidates from Module AD) share one testing-family ID, and every deciding interval is adjusted for the m looks registered in the batch; the look budget is the cap. Exploration analyses are Analysis Ledger entries in the disclosure bundle but are not looks and never decide an official outcome (Module AI). Prior looks on the same or near-duplicate snapshot content across the tenant's runs are counted and shown on every outcome (dataset scope is reported, not guaranteed); confirmation rows already read by an earlier run of the tenant yield hypothesis-generating outcomes only.

### FR-MTEST-02 — Correction

When applicable, support:

- Bonferroni — simultaneous intervals at 1 − α/L; the only adjustment used for deciding intervals of official outcomes (Module AE);
- Holm — adjusted p-values for reporting;
- Benjamini-Hochberg / FDR — exploration disclosure only; never decides an official outcome because it does not control family-wise error.

### FR-MTEST-03 — Values

Store:

- raw p-value;
- adjusted p-value and adjusted interval;
- correction method;
- family size (registered looks);
- look budget and looks used;
- rationale.

## Acceptance Criteria

- system does not silently apply correction without showing method;
- system does not claim correction is necessary when not applicable;
- report distinguishes raw/adjusted result.

**Priority:** P1 / Must for final capstone (BR-49 Multiple-Testing Control is Must in BRD MoSCoW)

---

# 24. Feature Module O — Effect Size, Confidence Interval & Uncertainty

## Objective

Không phụ thuộc duy nhất vào p-value.

## Functional Requirements

### FR-EFFECT-01

When supported, output:

- point estimate;
- effect size;
- confidence interval;
- significance/evidence measure.

### FR-UNCERT-01

Finding may contain:

```text
Confidence: Low / Medium / High
Reasons:
- small sample
- wide CI
- unstable result
- assumption warning
- conflicting evidence
```

This confidence label is explanatory metadata and does not replace formal statistical evidence.

## Acceptance Criteria

- finding UI shows practical magnitude when available;
- p-value alone cannot be used as sole explanation for strong finding;
- uncertainty reasons are inspectable.

**Priority:** P1 / Must for final capstone (BR-50 Effect Size & Confidence Interval and BR-54 Confidence & Uncertainty Recording are Must in BRD MoSCoW)

---

# 25. Feature Module P — Data Leakage Guard

## Objective

Ngăn contamination trong predictive/ML workflows.

## Functional Requirements

### FR-LEAK-01 — Split Definition

Support:

```text
Train
Validation
Test
```

where applicable.

### FR-LEAK-02 — Fit Scope

Preprocessing/feature selection/tuning must not fit on held-out test data unless research design explicitly allows it.

### FR-LEAK-03 — Leakage Warning

Agent flags suspicious target leakage or inappropriate data access.

### FR-LEAK-04 — Relation to Exploration / Confirmation Split

For every workflow (not only predictive/ML), the exploration/confirmation partition of Module AI is the leakage guard between the data that suggested a hypothesis and the data that tests it. Predictive train/validation/test splits are applied inside the partition that the analysis is allowed to read.

## Acceptance Criteria

- split strategy is stored in experiment;
- official predictive evaluation identifies held-out data;
- leakage warning blocks or requires review for high-risk case.

**Priority:** P1

---

# 26. Feature Module Q — Finding Management

## Objective

Biến validated experiment results thành first-class research findings.

## Finding Fields

```text
Finding ID
Statement
Research Question
Hypothesis
Experiment
Dataset Version
Evidence
Statistical Result
Effect Size
Confidence Interval (raw and adjusted)
δ_F / δ_N
Outcome Category (Finding supported / Finding contradicted / Negative Result / Inconclusive)
Claim Type (descriptive / associational / predictive / causal)
Evidential Status (hypothesis-generating / held-out / confirmatory)
Severity Check and Robustness Results
Hypothesis Origin
Partition and Look Counts
Limitations
Uncertainty
Status
Created By
Created At
```

Claims are rendered from structured fields with templates per claim level; model-written text is attached only as labelled explanation and may not contain free numerals (numbers are filled from artifact fields).

## Finding Status

```text
Preliminary
Validated
Inconclusive
Rejected
Needs Review
Conflicting Evidence
Invalidated
```

## User Stories

**US-FIND-01**  
As a researcher, I want every finding to show its evidence so that I can verify it.

## Functional Requirements

### FR-FIND-01 — Candidate Finding

Only generated after experiment output exists.

### FR-FIND-02 — Validated Finding / Negative Result

Requires:

- valid experiment from the confirmation batch;
- known dataset version and partition;
- method record;
- assumption record;
- severity check results;
- execution trace;
- supporting evidence;
- deterministic sufficiency outcome `FINDING` or `NEGATIVE_RESULT` and a claim level from the claim-level gate.

Negative Results have the same standing as Findings in every view and report.

### FR-FIND-03 — Evidence View

User can open finding and navigate to all supporting artifacts.

## Acceptance Criteria

- finding without evidence cannot be marked validated;
- finding preserves warnings;
- invalidated finding is not used as official final finding.

**Priority:** P0

---

# 27. Feature Module R — Hypothesis Refinement

## Objective

Cho agent tạo research continuation dựa trên evidence nhưng vẫn phân biệt exploratory hypothesis.

## Flow

```text
Exploration result / critique (before test epoch)
↓
Agent proposes H2
↓
H2 = generated_from_exploration / Agent-generated / Unverified
↓
Researcher Review when required
↓
Registered proposal in the confirmation batch

Confirmation outcome F1 (after test epoch)
↓
Agent proposes H2
↓
H2 = post_test / Agent-generated / Unverified
↓
Follow-up → later run on fresh data (never retested on data already read)
```

## Functional Requirements

### FR-REFINE-01 — Generate New Hypothesis

New hypothesis must include:

- statement;
- rationale;
- parent finding;
- proposed variables;
- why it is testable;
- suggested experiment direction.

### FR-REFINE-02 — No Circular Claim

Agent may not treat its own generated H2 as evidence.

### FR-REFINE-03 — Researcher Control

Configurable policy:

```text
Auto-continue low-risk
Require approval for every new hypothesis
Require approval only for high-impact/ambiguous hypothesis
```

For capstone MVP, default should favor explicit researcher review.

## Acceptance Criteria

- H2 cannot exist without system-assigned origin;
- H2 links to the result that motivated it;
- H2 remains unverified until a confirmation outcome resolves it;
- `post_test` H2 is only recorded as a follow-up for fresh data;
- user can reject hypothesis and stop the line of research.

**Priority:** P1 / Must for final capstone (BR-28 Hypothesis Refinement is Must in BRD MoSCoW)

---

# 28. Feature Module S — Experiment Dependency Graph

## Objective

Biểu diễn full research lineage.

## Example

```text
RQ-01
↓
H1
↓
E1
↓
F1
↓
H2
↓
E2
↓
F2
```

## Functional Requirements

### FR-DEP-01

Graph nodes:

- research question;
- hypothesis;
- experiment;
- finding;
- dataset version where useful.

### FR-DEP-02

Graph edges include:

```text
tests
produces
motivates
depends_on
uses_dataset
supersedes
contradicts
refines
replicates
registered_in
```

`registered_in` links each proposal to the confirmation batch that contains it (including tied candidates from Module AD); it replaces the `co_selected_with` edge of PRD v1.7. Research Program branches (Module AJ) are views over these nodes and edges, not a separate store.

### FR-DEP-03 — Downstream Invalidation

If upstream evidence is invalidated/recomputed:

```text
Upstream artifact
↓
Affected descendants
↓
Needs Re-validation
```

## Acceptance Criteria

- user can trace H2 back to F1/E1;
- affected downstream artifacts are identified;
- invalidation never silently deletes history.

**Priority:** P1

---

# 29. Feature Module T — Conflicting Evidence

## Objective

Ngăn cherry-picking.

## Functional Requirements

### FR-CONFLICT-01

When experiments produce incompatible evidence, system shall preserve all results. This also covers the case where several proposals in one confirmation batch (including tied candidates from Module AD) each produce an outcome: all Findings, Negative Results and Inconclusive outcomes must be retained and shown, and this multi-outcome case must be distinguished from `Conflicting Evidence` (incompatible evidence about the same estimand). Synthesis rules turn disagreement in direction, or a Finding against a Negative Result, into an Inconclusive outcome with a recorded conflict.

### FR-CONFLICT-02

Hypothesis/finding may receive `Conflicting Evidence`.

### FR-CONFLICT-03

Agent may recommend:

- replication;
- subgroup analysis;
- alternative method;
- data-quality investigation;
- researcher review.

## Acceptance Criteria

- contradicting result remains visible;
- final report cannot hide known high-impact conflict;
- resolution action is traceable.

**Priority:** P1

---

# 30. Feature Module U — Stopping Criteria

## Objective

Ngăn infinite experiment loop và xác định khi nào research question đã đủ evidence.

## Default Criteria

Any configured combination of:

- research question sufficiently answered;
- no meaningful/testable new hypothesis;
- evidence converged;
- max experiment count reached;
- look budget or exploration budget exhausted;
- max agent steps reached;
- time budget reached;
- cost/token budget reached;
- every open question unanswerable;
- resolution criteria from the Research Protocol met;
- repeated inconclusive results;
- researcher stops manually.

## Functional Requirements

### FR-STOP-01

Hard stops (resolution criteria met, budget or capability limits reached, every open question unanswerable, review required, policy violation) are deterministic. *Stop* is otherwise one option of the *next move* decision point (Module AJ); a decision-layer stop is allowed only at autonomy level A4 and may only end a run earlier. A Stop hook prevents ending while a registered batch lacks outcomes, a review is pending, or brief items are unaddressed without a recorded reason. Budget consumption is counted across the whole run, including every subagent. Without resolution criteria, a run can end *completed within budget* but never *objective resolved*.

### FR-STOP-02

Agent explains:

```text
Continue / Stop
Reason
Criteria Triggered
Suggested Next Step
```

### FR-STOP-03

Human can override agent stop/continue decision within permission policy.

## Acceptance Criteria

- loop has bounded execution;
- stop reason is stored;
- manual stop preserves current artifacts.

**Priority:** P1 / Must for final capstone (BR-30 Stopping Criteria is Must in BRD MoSCoW)

---

# 31. Feature Module V — Visualization & Figure Review

## Objective

Tạo figure/table hỗ trợ scientific finding, không chỉ decorative charts.

## Functional Requirements

### FR-VIZ-01 — Generate Chart

Chart must reference source experiment/finding.

### FR-VIZ-02 — Figure Metadata

Store:

- chart type;
- variables;
- filters;
- dataset version and partition;
- registered chart capability, version and chart specification;
- data hash;
- caption;
- source finding.

Figures in evidence or reports are drawn only by registered chart capabilities so they can be redrawn exactly; no model-generated plotting code runs.

### FR-VIZ-03 — Figure Review

P1/P2 check:

- chart type appropriateness;
- axes labels;
- units;
- legend;
- misleading scale;
- caption consistency;
- whether figure supports stated finding.

## Acceptance Criteria

- chart can be regenerated from stored metadata;
- figure has source linkage;
- misleading or invalid figure receives warning.

**Priority:** P1 / Must for final capstone (BR-32 Visualization and BR-38 Research Figure/Table Output are Must in BRD MoSCoW); advanced visual/VLM reviewer remains P2

---

# 32. Feature Module W — Research Outputs & Report

## Objective

Tổng hợp only validated/reviewed research artifacts.

## Report Sections

Suggested:

```text
Research Question
Hypotheses
Dataset & Data Preparation
Methodology
Experiments
Statistical Results
Research Protocol & Deviations
Research Findings
Negative Results
Inconclusive Outcomes
Figures / Tables
Conflicting Evidence
Limitations
Conclusion
Reproducibility Information
Disclosure (Analysis Ledger summary, rejected ideas, failed attempts)
```

## Functional Requirements

### FR-REPORT-01

Official outcomes (Findings and Negative Results from the confirmation batch) are included by default; Inconclusive outcomes of the batch are always shown with the same standing and are never hidden or demoted out of view.

### FR-REPORT-02

Exploration results, preliminary and conflicting results can be included only with an explicit label (hypothesis-generating / conflict). Claims are rendered from structured fields by claim-level templates; no sentence exceeds its gated claim level, and model-written text contains no free numerals.

### FR-REPORT-03

Methodology summary must reference actual executed workflow, not invented text.

### FR-REPORT-04

Report content must link back to provenance where UI supports it. The report is one publication view of Module AK and follows its claim-faithfulness rules and integrity audit.

## Acceptance Criteria

- report never silently converts exploratory hypothesis into initial hypothesis;
- Negative Results and Inconclusive outcomes appear with the same standing as Findings;
- every number and statement resolves to a recorded artifact;
- known limitations/warnings are preserved;
- report can identify dataset version/method behind finding.

**Priority:** P1 / Must for final capstone (BR-41 Research Report Generation and BR-42 Finding Validation are Must in BRD MoSCoW)

---

# 33. Feature Module X — Provenance & Evidence

## Objective

Cho researcher verify every important analytical claim.

## Provenance Chain

```text
Claim / Finding
↓
Statistical Result
↓
Experiment
↓
Execution
↓
Registered Capability + Typed Parameters + Partition
↓
Registered Proposal → Hypothesis (origin) → Research Protocol → Research Brief
↓
Dataset Version
↓
Dataset Lineage
```

## Functional Requirements

### FR-PROV-01

Each validated finding stores provenance IDs.

### FR-PROV-02

UI supports "View Evidence".

### FR-PROV-03

Evidence cannot be overwritten; new execution creates new record.

### FR-PROV-04 — Lineage and Reverse Provenance

System shall answer provenance in both directions: the **outcome lineage** from an outcome back through evidence, checks, experiment, proposal and critique, hypothesis and origin, question, protocol and deviations, to the brief version; and **reverse provenance** from a source (policy version, domain pack version, snapshot, model version) to every dependent outcome, so a defective version can be traced and its outcomes superseded or retracted.

## Acceptance Criteria

- 100% validated findings have provenance;
- a policy/pack/model version can be traced to every dependent outcome;
- broken provenance blocks final validation;
- user can navigate from finding to raw output.

**Priority:** P0

---

# 34. Feature Module Y — Execution Trace

## Objective

Hiển thị agent đã làm gì và tại sao.

## Trace Item

```text
Step Number
Timestamp
Agent Stage
Tool
Input References
Plan / Reason Summary
Registered Capability + Typed Parameters
Context Manifest
Hook Decisions / Typed Rejections
Raw Output
Error
Retry
Latency
Token Usage if applicable
```

## Functional Requirements

### FR-TRACE-01

Trace is append-only for completed execution record.

### FR-TRACE-02

Sensitive/internal secrets must not be exposed to normal user.

### FR-TRACE-03

Trace UI supports filtering by experiment/run.

## Acceptance Criteria

- every experiment has visible trace;
- retries appear as separate steps;
- trace distinguishes plan, tool action and validation.

**Priority:** P0

---

# 35. Feature Module Z — Reproducibility Snapshot

## Objective

Đảm bảo official experiment có đủ context để reproduce.

## Snapshot Fields

```text
Dataset Version
Dataset Checksum
Data Split / Partition and Test Epoch
Registered Capability Version
Parameters
Random Seed
Selected Method
Model Name / Version
Agent Configuration
Prompt / Template Version if applicable
Tool Versions
Library Versions
Runtime / Environment
Execution Timestamp
Recorded Model Outputs (replay, not re-query)
Autonomy Level and Decision-Layer Modes
Research Protocol Version
Raw Output References
Figure/Table References
```

## Functional Requirements

### FR-REPRO-01

Snapshot created when experiment is marked official/validated.

### FR-REPRO-02

Snapshot is immutable; rerun creates new run/snapshot.

### FR-REPRO-03

Reproduction attempt can reference prior snapshot.

### FR-REPRO-04 — Replay vs Re-derivation

Reproduction creates a new record in one of two modes: **replay** uses recorded model outputs and must match exactly under matching environment identity (dependency lock, language runtime, platform), otherwise it is labelled `environment_differs`; **re-derivation** re-queries models and reports divergence. Model outputs are recorded inputs and are never silently re-derived.

### FR-REPRO-05 — Deletion

User-data deletion is honored through tombstones: content is removed, identity and hash remain, and dependent outcomes are marked as no longer reproducible.

## Acceptance Criteria

- validated official experiment has snapshot;
- replay of an official experiment matches exactly under matching environment identity;
- deletion leaves a tombstone and flags dependent outcomes;
- changing configuration creates new run;
- environment metadata is visible to authorized users.

**Priority:** P1 / Must for final capstone (BR-55 Reproducibility Snapshot is Must in BRD MoSCoW)

---

# 36. Feature Module AA — Evaluation Center

## Objective

Đánh giá agent architecture có hệ thống cho capstone research questions.

## Benchmark Task Structure

```text
Task ID
Dataset
Research Question
Hypothesis
Expected Method / Allowed Methods
Expected Result / Ground Truth
Required Skills
Scoring Function
Difficulty
Tags
Ground-Truth Type (null / structured-null / planted signal / semi-synthetic / reference)
```

Suites built on well-known public datasets use planted-signal variants or controlled perturbations so that model memorization is not measured as skill.

## User Stories

**US-EVAL-01**  
As a researcher, I want to run benchmark tasks repeatedly so that I can measure agent performance objectively.

**US-EVAL-02**  
As a project team, we want ablation comparisons so that we can measure which architecture components matter.

## Functional Requirements

### FR-EVAL-01 — Benchmark Run

Run selected task/configuration N times.

### FR-EVAL-02 — Metrics

Minimum metrics:

- task success;
- result correctness;
- method-selection accuracy;
- assumption-check accuracy;
- experiment count;
- retry count;
- latency;
- token usage;
- cost;
- human intervention;
- provenance coverage;
- unsupported claim rate;
- reproducibility coverage;
- false-finding rate on null / structured-null data;
- power on planted signals;
- looks per outcome and Analysis Ledger coverage.

### FR-EVAL-03 — Skill-Level Evaluation

Suggested skills:

```text
dataset_understanding
method_selection
assumption_checking
execution
result_validation
hypothesis_refinement
evidence_grounding
```

### FR-EVAL-04 — Ablation

Configurations may include:

```text
Full Agent
No Planner
No Profiling
No Assumption Checking
No Retry
No Validator
No Hypothesis Refinement
No Hypothesis Selection Gate
No Evidence Sufficiency Gate
No Tied-Candidate Batching (single-select baseline)
No Hooks / Commit Gates (bare agent loop)
Deterministic Playbook Only (A0)
Single-loop Agent (no subagents)
LLM-only Decision Baseline
Single-Pass Agent
Text-to-Code Baseline
```

All configurations are compared at equal budget (BRD BR-46).

### FR-EVAL-05 — Aggregation

Show:

- mean;
- standard deviation where meaningful;
- success rate;
- per-task;
- per-skill;
- per-configuration.

### FR-EVAL-06 — Champion / Challenger and Adversarial Verification

Every versioned component (model, prompt, role profile, tool contract, subagent type, decision point, policy, capability, domain pack) changes through champion/challenger evaluation: the challenger runs in shadow on recorded runs (replay) and on live runs without affecting outcomes, is compared on the ground-truth suites, and is promoted or rejected by a recorded evaluation decision that uses a held-out suite opened only for that decision. Hooks and gates are verified separately against an adversarial agent that tries to break them. Human review is evaluated for override rate and rubber-stamping.

## Acceptance Criteria

- benchmark run is reproducible/configurable;
- promotion of a component is a recorded evaluation decision;
- metrics retain raw run references;
- comparison does not mix configurations silently.

**Priority:** P1 / Must for final capstone (BR-43 Evaluation Framework and BR-63 Decision Gate Evaluation are Must in BRD MoSCoW)

---

# 37. Feature Module AB — Admin, Telemetry & Cost

## Objective

Cho admin/team theo dõi operational behavior.

## Functional Requirements

### FR-ADMIN-01

Admin can configure available models.

### FR-ADMIN-02

System records:

- agent runs;
- failed runs;
- latency;
- token usage;
- cost estimates;
- sandbox failures;
- tool failures.

### FR-ADMIN-03

Logs must not expose sensitive dataset contents unnecessarily.

### FR-ADMIN-04 — Research Settings and Policy Versions

Research parameters are exposed through a settings view that shows, per parameter, its default, valid range, description and owning policy:

- **Run settings** (δ_F, δ_N, look budget, split, target claim level, domain pack) are chosen in the Research Brief.
- **Policy settings** (δ_min, δ_N ceiling, decision-layer modes and thresholds, fallback cap, step/session/subagent budgets, clarification rounds, diversity floor) change only with policy-admin permission, and each change creates a new policy version that applies only to runs created after it.
- **Evaluation settings** (non-inferiority margins, autonomy promotion) change only through a recorded evaluation decision.

Validators reject any value that would weaken a guarantee.

## Acceptance Criteria

- admin can identify failing component;
- policy changes create a new policy version and never affect running runs;
- usage metrics can be filtered by project/model/date;
- project isolation applies to user-facing logs.

**Priority:** P1

---


# 37.1. Feature Module AC — Research State & Candidate Hypothesis Generation

## Objective

Tạo một structured Research State làm source-of-context chính thức cho mỗi research iteration và sinh candidate hypotheses/research directions có thể đánh giá được.

## Research State Fields

Tối thiểu:

```text
research_question
current_hypothesis
previous_hypotheses
experiment_history
validated_findings
conflicting_evidence
uncertainty_warnings
dataset_version
partition_and_test_epoch
research_protocol_version
analysis_ledger_summary
research_program            # question tree, branch status, brief coverage, plan rationale
remaining_exploration_budget
remaining_look_budget
remaining_resource_budget
autonomy_level
decision_layer_modes
iteration_number
```

Research State is the canonical epistemic record (a typed Research Graph); transcripts are not state. Model context is projected from it by role allowlist, never accumulated from conversation.

## Candidate Hypothesis Fields

```text
candidate_id
statement
rationale
parent_evidence
testability
relevant_variables
risk_notes
uncertainty_notes
origin
status
```

## Functional Requirements

### FR-STATE-01 — Build Research State

System shall build a versioned Research State before each research iteration.

### FR-STATE-02 — State Versioning

Research State changes only through commit tools; each commit atomically writes state, events and ledger entries and creates a new Research State version.

### FR-STATE-03 — Candidate Generation

Agent shall be able to generate one or more candidate hypotheses/research directions from the active Research State.

### FR-STATE-04 — Candidate Testability

Candidate that cannot be operationalized/tested using available data/tools must be marked unsupported, deferred or require clarification.

### FR-STATE-05 — System-Assigned Origin

Candidate origin (`declared`, `generated_blind`, `generated_from_exploration`, `post_test`) is assigned by the runtime from the test epoch and context manifests (Module G), never by a model.

### FR-STATE-06 — Theory and Observable Implications (Should, BR-86)

The Theorist role may propose a theory: constructs, directed relations and a set of observable implications, including non-obvious ones and ones that would contradict the theory. Each implication becomes an ordinary candidate/proposal and passes every gate. A theory is never an official outcome; its status (untested, partially consistent, consistent, inconsistent, mixed — always shown as n of m registered implications) is derived deterministically from implications registered before they were tested. A theory proposed after seeing results has origin `post_test`. Status words never assert a mechanism.

## Acceptance Criteria

- each iteration has an inspectable Research State reference;
- candidates show parent evidence and rationale;
- generated candidates cannot silently become active hypotheses;
- candidate origin and testability are visible;
- Research State references exact dataset version.

**Priority:** P1 / Must for final capstone

---

# 37.2. Feature Module AD — Structured Hypothesis Selection Gate

## Objective

Rank/select/reject/defer candidate hypotheses or research directions at the *select* decision point, before experiment planning and before the confirmation batch is registered. The reasoning agent proposes and ranks; the structured decision layer chooses among options that deterministic validation already permits; hooks and the admission gate decide whether the choice takes effect.

## Decision Outcomes

```text
SELECT
REJECT
DEFER
NO_SUITABLE_CANDIDATE
```

Escalation is not an option to choose: it happens on decision-layer abstention, below-threshold confidence, or a deterministic review trigger.

A selection decision shall include:

```text
decision_id
decision_point            # select
decision_layer_mode       # on / shadow / off
research_state_version
projection_manifest
candidate_scores_or_probabilities
deterministic_features    # answerability, reachable claim level, precision margin,
                          # look cost, brief priority, redundancy, diversity
selected_candidate
decision_outcome
rule_outcome              # answer of the deterministic rule, always recorded
abstained
confidence
uncertainty
reason_codes
provider
provider_model_version
configuration_version
timestamp
downstream_action
```

## Functional Requirements

### FR-HGATE-01 — Candidate Evaluation

Gate shall receive a minimal projection of the active Research State plus candidate hypotheses/directions and their deterministically computed features. Questions to the decision layer never ask for counts, arithmetic or justifications; those are computed and passed in.

### FR-HGATE-02 — Rank / Select / Reject / Defer

Gate shall return a bounded decision and preserve the evaluated candidate set. Rejected or unselected candidates stay in the idea pool with their reason.

### FR-HGATE-03 — Confidence

Decision shall include calibrated confidence and abstention. Confidence is decision confidence, not statistical probability, and never enters evidence.

### FR-HGATE-04 — Human Escalation

Deterministic review triggers always create a researcher review task. Abstention or confidence below the configured threshold falls back to the deterministic rule and may add escalation; it never removes escalation.

### FR-HGATE-05 — Provider Abstraction and Modes

Product shall use a `DecisionProvider` abstraction rather than bind business behavior to one vendor, and every decision point runs in a mode fixed per run:

```text
DecisionProvider
├── TypeSafe / Jev Provider       # candidate implementation
├── Structured LLM Provider       # baseline
└── Deterministic Rule            # mode off; always available fallback

Mode
├── off     # rule decides, no model call
├── shadow  # model called and recorded beside the rule; rule decides
└── on      # model decides within narrow-only authority
```

*select* runs `off` or `shadow` at autonomy A0–A1 and may run `on` only from A2, after beating its rule on the ground-truth suites.

### FR-HGATE-06 — No Silent Activation / Narrow Only

A candidate may only become the active hypothesis/research direction after a valid selection decision or explicit researcher choice. The decision layer may select, reorder, block, send back or escalate; it never admits a proposal that fails the admission gate.

### FR-HGATE-07 — Tied Candidates Enter One Confirmation Batch

If the score gap between top-ranked candidates falls below the configured `tie_threshold`, Gate may select several candidates instead of exactly one; all selected candidates are registered in the **same confirmation batch** (Module AI), share one testing family and are bounded by the look budget and protocol allocation. Gate output shall separate two values: a numeric, comparable decision score (used for tie detection) and the categorical confidence label (Low/Medium/High) used for human-facing explanation and escalation — the two are not interchangeable. Calibration quality of the numeric decision score shall be covered by Module AG's gate-evaluation metrics. When triggered, the decision record shall additionally store the `tie_threshold` used, the full list of tied candidates and the batch ID.

## Acceptance Criteria

- candidate set and selected outcome are inspectable;
- rule outcome and decision-layer mode are recorded beside every decision;
- low-confidence or abstaining decision falls back to the rule and can be escalated;
- deterministic review triggers escalate regardless of confidence;
- provider can be switched without changing research-domain behavior;
- decision record links to the exact Research State version;
- LLM free-form text alone is not treated as the structured selection record;
- decision layer cannot admit a proposal the admission gate rejects;
- tied candidates never exceed the look budget of the batch;
- when tied-candidate selection is used, the decision record includes the tie threshold, the tied-candidate list and the batch ID.

**Priority:** P1 / Must for final capstone

---

# 37.3. Feature Module AE — Evidence Sufficiency Gate (Deterministic)

## Objective

Tính deterministic, theo quy tắc đã đăng ký trước, outcome category của mỗi kết quả trong confirmation batch. Đây là **fact được tính**, không phải quyết định của model; decision-layer confidence không bao giờ đi vào sufficiency.

## Inputs

```text
registered_proposal (estimand, direction, δ_F, δ_N, criteria)
experiment_result
adjusted_interval (multiplicity-adjusted for the batch)
assumption_results
severity_check_results
robustness_summary
leakage_and_partition_status
diagnostics
conflicting_evidence
research_protocol_version
```

## Required Outcomes

```text
FINDING_SUPPORTED     # interval entirely beyond δ_F in the registered direction
                      # (two-sided: either direction, with the observed sign), checks passed
FINDING_CONTRADICTED  # directional only: entirely beyond δ_F in the opposite direction, checks passed
NEGATIVE_RESULT       # interval entirely inside (−δ_N, δ_N), checks passed
INCONCLUSIVE          # otherwise, or an applicable check failed
```

Mapping from PRD v1.7: `ENOUGH_EVIDENCE` → `FINDING_*` or `NEGATIVE_RESULT`; `INCONCLUSIVE` unchanged; `NEED_MORE_EVIDENCE`, `TRY_ALTERNATIVE_METHOD`, `REPLICATE` → options of the *next move* decision point (Module AF); `NEED_HUMAN_REVIEW` → escalation by deterministic trigger or decision-layer abstention.

## Functional Requirements

### FR-EGATE-01 — Gate After Deterministic Validation

Evidence gate shall run only after deterministic scientific validation, registered severity checks and the robustness summary have produced the required facts.

### FR-EGATE-02 — Deterministic Rule

Gate shall compute the outcome from the adjusted interval relative to δ_F and δ_N (δ_N ≤ δ_F) and the check results, with reason codes and the policy version used. No model call decides or changes the outcome.

### FR-EGATE-03 — Official Outcome Protection

Only `FINDING_*` and `NEGATIVE_RESULT` from the confirmation batch become official outcomes, and only after the deterministic claim-level gate assigns claim type and evidential status. Exploration results are always hypothesis-generating.

### FR-EGATE-04 — Inconclusive and Negative Are Valid

`INCONCLUSIVE` and `NEGATIVE_RESULT` must be treated as legitimate research outcomes with the same standing as Findings and must not trigger forced significance-seeking or retesting on data already read.

### FR-EGATE-05 — Frozen Margins

δ_F and δ_N are set in the Research Brief within policy bounds (δ_F ≥ δ_min; δ_N at most min(δ_F, policy ceiling)); a domain pack may only raise δ_F or lower δ_N; both freeze with the Research Protocol and never move afterwards.

## Acceptance Criteria

- every completed confirmation-batch experiment has a deterministic outcome category before official outcome;
- outcome is reproducible from recorded inputs and policy version;
- `INCONCLUSIVE` can terminate or continue according to stopping policy;
- margins cannot change after the protocol is frozen;
- outcome links to validation outputs, checks, robustness and Research State.

**Priority:** P1 / Must for final capstone

---

# 37.4. Feature Module AF — Scientific Refinement & Confidence-Based Escalation

## Objective

Xử lý các trường hợp experiment chạy đúng nhưng evidence chưa đủ thông qua decision point *next move*, và phân biệt rõ chúng với technical retry.

## Refinement Routing (Next Move)

The reasoning agent proposes candidate next moves allowed in the current phase; the decision layer (or the deterministic rule when `off`, abstaining or below threshold) chooses one.

```text
Before the test epoch (exploration):
NEED_MORE_EVIDENCE      → another exploration round (ledgered)
TRY_ALTERNATIVE_METHOD  → alternative method/specification on the exploration partition
CRITIQUE_AGAIN          → Skeptic critique
MOVE_TO_NEXT_PHASE      → register confirmation batch

After the test epoch:
REPLICATE / NEED_MORE_EVIDENCE / TRY_ALTERNATIVE_METHOD
                        → follow-up (origin post_test, protocol deviation)
                        → later run on fresh data
STOP                    → only where the Stop hook and hard stops allow

Deterministic review trigger or abstention
                        → Researcher Review Task (run pauses durably)
```

## Functional Requirements

### FR-REFLOOP-01 — Scientific Refinement

System shall create new exploration work before the test epoch, or a follow-up for fresh data after it, when the chosen next move requests more scientific work. Nothing is tested again on data already read in the run.

### FR-REFLOOP-02 — Technical vs Scientific Classification

Every retry/re-plan event shall be classified at minimum as:

```text
TECHNICAL_RETRY
SCIENTIFIC_REFINEMENT
```

### FR-REFLOOP-03 — Budget Guard

Scientific refinement must respect the exploration budget, look budget and resource budget; the three are never exchanged, and the look budget never grows after the test epoch.

### FR-REFLOOP-04 — Escalation Policy

Deterministic, versioned triggers are the floor of escalation and always apply:

- severity-check conflict or synthesis conflict;
- methodological risk (e.g. name-inferred operationalization behind an official outcome);
- causal diagram awaiting endorsement;
- ambiguity severity;
- budget / autonomy-level requirement.

Decision-layer abstention or confidence below threshold may add escalation; it never removes escalation. At the review deadline the affected outcome becomes Inconclusive with `review_timeout`.

### FR-REFLOOP-05 — Researcher Actions

Researcher can:

```text
Accept gate-eligible outcome (with mandatory limitations)
Reject / End as Inconclusive
Request Follow-up (fresh data)
Add Limitation / Context
Endorse Causal Assumptions (structured elicitation)
Stop Research
```

Researcher may **not** turn insufficient evidence into sufficient, raise a claim above its gated level, edit a frozen experiment/protocol/criteria/result, or bypass severity checks. A rejected outcome remains as `rejected_by_review` with its reason.

### FR-REFLOOP-06 — Research Campaign (Should, BR-87)

Runs that continue one line of research (follow-ups, replications, new snapshots of one dataset lineage) are linked into a campaign derived from follow-up links and dataset lineage. Each run keeps its own protocol, test epoch, ledger and look budget; a campaign pools no looks, no error control and no evidence, and issues no combined outcome. A follow-up enters the later run as a declared hypothesis linked to its source run and is tested only on rows no earlier run has read. Campaign views show each run's outcomes side by side at their own claim levels.

## Acceptance Criteria

- scientific refinement is visible separately from technical retry;
- refinement preserves parent hypothesis/experiment/evidence links;
- post-test refinement becomes a follow-up, never a retest on data already read;
- deterministic triggers always escalate; low-confidence decisions can add escalation;
- review actions stay within the authority matrix;
- loop stops when budget or stopping criteria require it.

**Priority:** P1 / Must for final capstone

---

# 37.5. Feature Module AG — Decision Audit, Configuration & Gate Evaluation

## Objective

Lưu lịch sử structured decisions, cho phép review/debug và đánh giá decision gates như một thành phần riêng của architecture.

## Decision Record

```text
decision_id
decision_type          # intake / select / outbound_check / next_move / sufficiency_gate / review_trigger
decision_layer_mode    # on / shadow / off (n/a for deterministic gates)
research_state_version
projection_manifest
input_references
candidate_choices
outcome
rule_outcome
abstained
confidence
uncertainty
reason_codes
policy_version
provider
model_version
configuration_version
autonomy_level
latency
estimated_cost
timestamp
downstream_action
human_override
override_reason
tie_threshold_used
tied_candidates
confirmation_batch_id
```

## Functional Requirements

### FR-DEC-01 — Audit History

All decision-point answers (intake, select, outbound check, next move), deterministic sufficiency outcomes and review triggers must be persisted and inspectable. Every decision-layer call counts as a selection step for origin assignment.

### FR-DEC-02 — Configuration Version

Decision record shall identify provider/model/configuration used for reproducibility and evaluation.

### FR-DEC-03 — Human Override

When researcher overrides a decision, system shall retain both original decision and override.

### FR-DEC-04 — Gate Metrics

Evaluation center shall support:

- decision accuracy/correctness per decision point;
- agreement with the deterministic rule;
- hypothesis-selection quality;
- false acceptance and false blocking;
- abstention rate;
- outcome asymmetry (different effects on Findings, Negative Results and Inconclusive outcomes);
- unnecessary continuation rate;
- human escalation rate;
- confidence/calibration quality;
- latency;
- cost.

### FR-DEC-05 — Baseline Comparison and Promotion

When benchmark labels/rubrics support it, evaluation shall compare at equal budget:

```text
Structured Decision Layer
vs
Deterministic Rule
vs
LLM-only Decision Baseline
```

A decision point is promoted from `shadow` to `on` only by a recorded evaluation decision after beating its rule on the ground-truth suites, and is demoted on any change of model, model version, prompt, tool contract or policy.

## Acceptance Criteria

- decision history is filterable by type/provider/outcome;
- benchmark run can collect gate-specific metrics;
- decision-provider changes remain reproducible through configuration versioning;
- human override is auditable.

**Priority:** P1 / Must for final capstone

---

# 37.6. Feature Module AH — Ideation Quality & Manuscript Reporting

## Objective

Nâng chất lượng ideation trước Hypothesis Selection Gate (Module AD) và cung cấp bản thảo nghiên cứu có thể review từ validated outcomes, mà không đưa vào unbounded tree search (xem Non-Goals, mục 4).

## Functional Requirements

### FR-IDEA-01 — Idea Record

Mỗi candidate hypothesis phải có idea record gồm tối thiểu: statement, experiment đề xuất, context liên quan, risk notes, trước khi được đưa vào Module AD.

### FR-IDEA-02 — Reflection Round

Candidate hypothesis phải qua ít nhất một reflection round trước khi vào Hypothesis Selection Gate. Reflection là typed critique theo loại validity (statistical conclusion, construct, internal, external) do Skeptic role thực hiện; Skeptic chỉ thấy proposal, không thấy rationale của người đề xuất. Critique có thể dẫn tới revision, rejection, registered severity check hoặc limitation; nó không bao giờ tự nâng vị thế của proposal.

### FR-IDEA-03 — Prior-Work Assessment (tham khảo)

Hệ thống nên tạo **Prior-Work Assessment** cho idea dựa trên nguồn literature/context do researcher cung cấp hoặc truy xuất qua tool `retrieve` có budget và ghi nhận: công trình liên quan gần nhất, so sánh theo chiều (question, population, operationalization, data, design, method), contribution type và **coverage record** (đã/chưa tìm gì). Không có nhãn `novel`; ngôn ngữ ưu tiên chỉ qua template giới hạn theo coverage. Assessment là context, không phải evidence; không nâng claim level, không admit/reject proposal. Chỉ citation resolve được mới vào context. Khi không có nguồn, idea được ghi nhận trạng thái "chưa đánh giá" thay vì bị chặn hoặc suy diễn.

### FR-MANU-01 — Figure Aggregation & Visual Feedback

Hệ thống nên gom các figure sinh ra từ các candidate method/thử nghiệm đã chạy cho một hypothesis (Module K) và kiểm tra bằng visual reviewer về độ rõ, khớp caption và trùng lặp; đây là phần mở rộng của figure review ở Module V, không tạo cấu trúc node/cây riêng.

### FR-MANU-02 — Manuscript Draft Generation

Hệ thống nên tạo bản thảo nghiên cứu (manuscript draft) từ validated findings, với số liệu lấy trực tiếp từ experiment log và trích dẫn được xác minh tồn tại. Nội dung do AI tạo phải được ghi rõ là AI-generated. Đây chỉ là bản nháp — hệ thống không tự nộp hoặc xuất bản (Non-Goals, mục 4).

### FR-MANU-03 — Automated Manuscript Review

Hệ thống nên review bản thảo theo rubric (soundness, novelty, clarity) và kiểm tra chất lượng: placeholder còn sót, hình thiếu, trích dẫn chưa xác minh, số liệu không khớp experiment log.

### FR-MANU-04 — Human Approval Gate

Bản thảo phải được researcher phê duyệt trước khi dùng bên ngoài hệ thống; hệ thống không được tự động coi bản thảo là final hoặc gửi đi thay researcher.

## Acceptance Criteria

- candidate hypothesis có idea record và ít nhất một critique round trước Module AD;
- khi bật, prior-work assessment hiển thị nguồn tham khảo và coverage record, hoặc trạng thái "chưa đánh giá"; không có nhãn `novel`;
- figure trong bản thảo (nếu có) truy được về experiment log tương ứng;
- bản thảo (nếu tạo) có số liệu truy được về log, trích dẫn xác minh, kết quả automated review, và trạng thái phê duyệt của researcher trước khi export/chia sẻ.

**Priority:** P1 / Must for final capstone (FR-IDEA-01, FR-IDEA-02 — tương ứng BR-64, Must trong BRD); Should cho phần còn lại (FR-IDEA-03, FR-MANU-01→04 — tương ứng BR-65/73/74/75, Should trong BRD) — có thể defer nếu ảnh hưởng core loop.

---

# 37.7. Feature Module AI — Exploration / Confirmation Split & Analysis Ledger

## Objective

Giữ bảo đảm của phép kiểm thử khi agent được tự do khám phá: mọi lần nhìn vào dữ liệu được đếm, và phép kiểm thử quyết định outcome được cố định trước khi đọc dữ liệu của nó (BR-79).

## User Stories

**US-SPLIT-01**\
As a researcher, I want exploration and confirmation to use different data so that a hypothesis is never confirmed on the data that suggested it.

**US-SPLIT-02**\
As a reviewer, I want to see every analysis the agent ran, including failed and exploratory ones, so that I can judge how much searching preceded a finding.

## Functional Requirements

### FR-SPLIT-01 — Partition

System shall assign rows/groups/blocks to exploration and confirmation partitions with a keyed hash (deployment secret), so reordering, re-uploading or adding rows never reshuffles existing assignments. An optional **sealed** partition, read only by its confirmatory test, supports confirmatory status. Below a policy minimum size, splitting is disabled and only `declared` / `generated_blind` hypotheses may enter the batch.

### FR-SPLIT-02 — Research Protocol

Before any confirmation data is read, `freeze_protocol` shall freeze and hash: brief version and restatement, initial question tree, target claim levels, exploration budget, look budget and error-control scheme, stopping rules and resolution criteria, split, δ_F / δ_N, domain pack and policy versions, autonomy level and decision-layer modes. Every later change is a **deviation** event with reason and test epoch.

### FR-SPLIT-03 — Analysis Ledger

Every analysis executed against data (exploration, confirmation, severity check, robustness specification, simulation, failure) shall create an append-only ledger entry with proposal, capability, parameters, partition and outcome. Only confirmation intervals that can decide an official outcome are **looks**.

### FR-SPLIT-04 — Confirmation Batch

`register_batch` shall admit a set of Research Proposals (Module H contract) only if, for every proposal, deterministic features are present (precision margin, answerability and reachable claim level, look cost, brief priority, question-tree coverage, redundancy), zero-value proposals are rejected, and the look budget, protocol allocation and diversity floor are respected. The agent's ranking and the decision layer's *select* answer are recorded.

Before admission, deterministic screens reject proposals that are infeasible, trivial or tautological, redundant with the ledger, imprecise or unanswerable at the target level; a proposal whose look cost exceeds the remaining budget is deferred as a follow-up candidate. The admission gate is deterministic (required typed fields, screens passed, critique items resolved or recorded, allocation and budget allow). Revision rounds are bounded; at the round limit a **circuit breaker** admits the best admissible draft or none, never a proposal that fails the gate. Rejected ideas stay in the idea pool with reasons.

### FR-SPLIT-05 — Test Epoch

`run_confirmation` executes the batch once on the confirmation partition; its first analysis starts the **test epoch**. At the test epoch every open agent session closes; interpretation and reporting run in new sessions whose outputs are `post_test`. After the test epoch the look budget never grows and nothing is retested on data already read.

### FR-SPLIT-06 — Disclosure

The full ledger, rejected ideas, failed attempts and protocol deviations shall be available as a disclosure bundle and summarised on every outcome (looks, deviations, origin, partition).

## Acceptance Criteria

- exploration tools are rejected by hooks on the confirmation or sealed partition;
- every analysis has a ledger entry, including failures;
- confirmation batch and protocol are frozen before confirmation data is read;
- look budget cannot increase after the test epoch;
- outcomes show looks, deviations, origin and partition;
- disclosure bundle lists every ledger entry.

**Priority:** P1 / Must for final capstone (BR-79 Must in BRD MoSCoW)

---

# 37.8. Feature Module AJ — Agent Research Loop, Decision Points & Hooks

## Objective

Vận hành research loop bằng **một main agent loop cho mỗi run** trên workflow floor, với decision points, deterministic hooks, commit tools, budgets và autonomy levels (BR-80), và tùy chọn biểu diễn nhánh nghiên cứu trong Research Program (BR-81).

## Functional Requirements

### FR-LOOP-01 — Main Loop and Typed Steps

Each run has one main loop that advances step by step over Research State. A step has a kind (plan, explore, ideate, design, critique, register, confirm, interpret, report), an input projection, an output contract and a budget. Inside a step the reasoning agent may call tools several times; the step ends with one typed output, never free prose.

### FR-LOOP-02 — Workflow Floor (Playbook)

The phase order of Section 38 is the deterministic playbook. At autonomy A0, or when no model route is available, the playbook and decision rules run the same steps through the same hooks, gates and commits.

### FR-LOOP-03 — Decision Points

The run advances through four decision points answered by the decision layer within its authority, by the deterministic rule when `off`, abstaining or below threshold, and by escalation when neither may decide:

| Decision point | Question | Options |
|---|---|---|
| Intake | Is the brief complete, in scope, answerable; does it use causal wording? | proceed, restate, clarify |
| Select | Which candidates/proposals go forward? | select, reject, defer |
| Outbound check | Is this output in scope, relevant, plausible, within claim language? | pass, revise |
| Next move | Explore further, alternative, critique again, replicate on fresh data, next phase, stop? | options the agent proposed and the phase allows |

Model tier is configuration, not a decision point; escalation is deterministic triggers plus abstention, never a model saying yes.

### FR-LOOP-04 — Hooks and Commit Tools

Deterministic hooks run at SessionStart, PreToolUse, PostToolUse, PreCompact and Stop and enforce: tool enabled for the phase and autonomy level; budget and egress consent; partition access; no branch operation after the test epoch; ledger entry for every analysis; origin assignment; untrusted marking of returned content; Stop conditions. Only commit tools change state; a hook or gate rejection returns a typed reason (`rule`, `field`, `reason`, `allowed_options`) to the same step for a bounded number of repairs. The forbidden transitions of the PRD v1.7 state machine are hooks.

### FR-LOOP-05 — Autonomy Levels

| Level | Enabled | Decision-layer mode cap |
|---|---|---|
| A0 | Deterministic playbook only; no model calls | all `off` |
| A1 (default with a model route) | Reasoning agent steps; narrow-only classes may be `on` | intake/outbound up to `on`; select/next move up to `shadow` |
| A2–A3 | Decision-layer select/next move may influence order; more exploration rounds | up to `on`, no stop option |
| A4 | Decision-layer early stop through the Stop hook | up to `on`, stop included |

The level is fixed per run and recorded in reproduction context. Levels above A1 require a recorded evaluation decision and are demoted on any change of model, prompt, tool contract, role profile, decision class or domain pack.

### FR-LOOP-06 — Context and Durability

Model context is assembled by the runtime from Research State and the Research Program, never inherited from provider memory; every model call records a context manifest. Context is ordered from most to least stable (role instructions and tool contracts, frozen brief and protocol, Program summary, recent steps). When a session nears its context budget, old tool results are replaced by artifact references and an agent-written summary under the PreCompact hook; nothing is lost from state. No session crosses the test epoch. Clarification and review pause the run durably (`awaiting_clarification`, `awaiting_review`) and it resumes from the last commit.

### FR-LOOP-07 — Subagents

Subagents (Skeptic, Literature, Branch explorer, Interpreter/Reporter) are secondary loops started by `delegate`, depth one, with budget granted by the main loop, and never call commit tools. A subagent type is enabled only after it beats the single-loop agent at equal budget.

### FR-LOOP-08 — Research Program Branches (Should, BR-81)

The Research Program may show branches per question (question → direction → hypothesis → exploration → critique → refined hypothesis → registered proposal → outcome). Branch status (`active`, `pruned` with reason, `in_batch`, `resolved`, `follow_up`) is derived from events, never set directly. Branch operations are allowed only before the test epoch, bounded by the exploration budget, round limit and diversity floor. MVP does not depend on this requirement.

### FR-LOOP-09 — Role Profiles

Reasoning is organised into versioned role profiles, each with instructions, a projection allowlist, a tool set, an output contract, a deterministic fallback of the same contract and its own value metric:

| Profile | Typed output | Test epoch |
|---|---|---|
| PI | Research Program, question tree, priorities, look allocation, next moves | Before, then after |
| Theorist | Directions, theories with observable implications | Before |
| Methodologist | Estimand, operationalization, primary analysis, robustness and severity specification | Before |
| Skeptic | Critique by validity type, negative-control suggestions | Before |
| Interpreter | Interpretation and synthesis of validated results | After, new session |
| Reporter | Explanations and view narrative, slot-based numbers | After, new session |

High-stakes outputs (estimand, operationalization, critique) may be sampled several times; code measures agreement on typed fields and disagreement routes to the Skeptic or to review.

## Acceptance Criteria

- run completes end to end at A0 with no model calls;
- every decision point records mode, rule answer and decision-layer answer;
- no state change happens outside a commit tool;
- hooks reject disallowed tools, partitions and post-epoch branch operations regardless of model output;
- typed rejections are returned to the step and repair attempts are bounded;
- autonomy level and decision modes are fixed per run and recorded;
- paused runs resume from the last commit.

**Priority:** P0 for FR-LOOP-02/04 (playbook, hooks, commit); P1 / Must for final capstone for FR-LOOP-01/03/05/06/09 (BR-80); P2 for FR-LOOP-07 subagents and FR-LOOP-08 branches (BR-81 Should)

---

# 37.9. Feature Module AK — Research Artifacts & Publication Views

## Objective

Biến output của run thành chuỗi artifact có kiểu, truy vết được, và render mọi publication (report, brief, preregistration, disclosure…) như view trên các artifact đó, có integrity audit trước khi rời khỏi project (BR-83, BR-84).

## Functional Requirements

### FR-ART-01 — Artifact Chain

Every step leaves an immutable, content-addressed artifact in one tier: Input, Plan, Idea, Experiment, Evidence, Claim, Publication. The Research Graph holds status and relations; the artifact holds content.

### FR-ART-02 — Envelope and Visibility

Every artifact carries one envelope: type and schema version, tier, producer (component, role, model or fallback path, versions), typed input links, partition and test epoch, origin where applicable, lifecycle (`draft`, `registered`, `final`, `superseded`, `retracted`) and visibility (`internal`, `caller`, `publishable`) assigned deterministically. Visibility never overrides the test epoch.

### FR-ART-03 — Live Access and Commands

Researchers can list artifacts, read them and follow relations while a run proceeds. Their commands (e.g. a seed idea or a comment on the Program) enter as brief versions or protocol deviations, never as edits to an existing artifact; after the test epoch they are `post_test`.

### FR-VIEW-01 — Views

The product renders, from artifacts: Research Report (per domain-pack reporting guideline), Finding Brief per official outcome or theory, preregistration view (protocol + deviations), prior-work view per question (with coverage), analysis package (frozen specs, tool versions, results, deterministically generated reproduction script that the platform never executes), disclosure bundle (full ledger, rejected ideas, failed attempts, deviations), research map, lineage view per outcome, and portfolio view. Views are regenerated, never edited, when an input is superseded or retracted.

### FR-VIEW-02 — Claim Faithfulness

Claims are rendered from structured fields by templates per claim level and insert only validated identifiers and column names. Model-written text is attached only as labelled explanation, references numbers by slot, and is rejected if it contains an unmatched numeral. Every statement is typed data-derived, knowledge-derived or interpretation and linked through a claim–evidence map.

### FR-VIEW-03 — Portfolio Order

Portfolio order is computed deterministically from recorded fields (outcome category and claim level, adjusted interval vs δ_F / δ_N, check and robustness results, brief priority, contribution type with coverage, reproducibility status, follow-up feasibility) through a named **lens** chosen by the researcher, with a versioned default. No composite score is computed, shown or stored; no novelty label is used; Negative and Inconclusive outcomes are never hidden or demoted out of view. Portfolio order is attention, not evidence, and is separate from search ranking.

### FR-VIEW-04 — Integrity Audit and Disclosure Control

Before a view becomes `publishable`, a deterministic integrity audit checks that every statement resolves, every number and citation matches, figures match by specification and data hash, no sentence exceeds its claim level, and statistical disclosure control passes (no row-level values, no cell or subgroup below a policy minimum size, sensitive attributes of the domain pack aggregated). Research map, lineage and portfolio views are `caller` by default; only a filtered rendering that passes the audit becomes `publishable`.

## Acceptance Criteria

- every committed step has an artifact with a complete envelope;
- artifacts are readable during the run according to visibility;
- report and briefs regenerate when an input is superseded;
- no view becomes `publishable` without passing the integrity audit;
- portfolio view names its active lens and shows every outcome with its adjusted interval.

**Priority:** P1 / Must for final capstone for FR-ART-01/02, FR-VIEW-01 (report, finding brief, preregistration, disclosure bundle, analysis package), FR-VIEW-02 and FR-VIEW-04 (BR-83, BR-84 Must); P2 for research map / portfolio view and FR-VIEW-03

---

# 37.10. Feature Module AL — Research Knowledge Layer

## Objective

Cung cấp knowledge có version (domain pack, literature context, method lessons) cho reasoning mà không bao giờ biến knowledge thành evidence (BR-82).

## Functional Requirements

### FR-KNOW-01 — Domain Packs

A `general` pack is always present; domain packs (software engineering first) are added through one schema: construct ontology (concept → measures, weak proxies), confounder and bias catalog, margin conventions (δ_F, δ_N), coding and derived-variable rules, reporting guideline, sensitive attributes.

### FR-KNOW-02 — Controlled Retrieval

Only the `retrieve` tool, dispatched to registered, versioned sources, searches external knowledge; no role has provider-side browsing. Queries, results and cost draw on a search budget, and every call records source, version, date, query and ranked results. Retrieved text is untrusted and enters context only after its reference resolves.

### FR-KNOW-03 — Method Lessons

Reviewed, data-free lessons from earlier runs (e.g. a column known to be derived from another) may be added to screens and critique.

### FR-KNOW-04 — Narrow Only

Knowledge may add screens, critique items, limitations and egress restrictions, and may make a Finding or Negative Result harder to reach, never easier; it never relaxes a gate or counts as evidence. A reference reporting results on the same dataset is prior exposure and makes dependent steps `post_test`. Every outcome records the pack and lesson versions used.

## Acceptance Criteria

- run works with only the `general` pack;
- no external search happens outside `retrieve`;
- unresolved references are dropped with a reason;
- pack versions are recorded on outcomes and traceable by reverse provenance.

**Priority:** P2 / Should (BR-82 Should); `general` pack and FR-KNOW-04 rules are required whenever any knowledge is used

---

# 37.11. Feature Module AM — Simulation Lab

## Objective

Kiểm tra method trước khi tin vào nó, không kiểm thử hypothesis thật (BR-85).

## Functional Requirements

### FR-SIM-01 — In-Run Simulation

Before registration, simulations on the dataset's structure (null designs that preserve declared dependence, e.g. permutation within clusters or blocks; plasmode designs with known effects) run the primary estimator with bounded replicates and report Monte Carlo error, estimating type I error, coverage and power for the planned design. They use only the profile and the exploration partition, create ledger entries but no looks.

### FR-SIM-02 — Narrow Only

Simulation results are method facts: they may block a method, add a limitation or change the precision plan. A simulation never selects the "best" method among admissible ones.

### FR-SIM-03 — Offline Suites

The same generators produce the null, structured-null, planted-signal and semi-synthetic ground-truth suites used by Module AA.

## Acceptance Criteria

- simulations never read the confirmation partition;
- simulation reports include Monte Carlo error;
- a failing simulation can block or limit a method but never promote one.

**Priority:** P2 / Should (BR-85 Should); FR-SIM-03 generators are needed for the Module AA ground-truth suites

---

# 38. Agent Runtime Product Behavior

The state machine below is the **workflow floor** (deterministic playbook, Module AJ FR-LOOP-02). At A1 and above, the main agent loop runs each phase as typed agent steps with tools inside, typed rejections and repairs, independent critique, and **going back** (another exploration round, an alternative method, a new critique) when the *next move* calls for it — always within budgets and the test epoch. Phases change only through commit tools, and the forbidden transitions of this state machine are enforced as hooks, so the agent loop never removes a guarantee the workflow has.

```text
IDLE
↓
INTAKE                                   # decision point: intake
├── Clarify → AWAITING_CLARIFICATION
└── Proceed / Restate
      ↓
PROFILE_AND_SPLIT
↓
FREEZE_PROTOCOL                          # commit: freeze_protocol
↓
BUILD_RESEARCH_STATE
↓
EXPLORE (exploration partition only; every analysis ledgered)
├── GENERATE_CANDIDATES
├── EXPLORATION_ANALYSES
├── CRITIQUE
├── HYPOTHESIS_GATE                      # decision point: select
│   ├── Deterministic trigger / abstain → AWAITING_REVIEW
│   └── No Suitable Candidate → ASK_USER / STOP
└── NEXT_MOVE                            # decision point: next move
    ├── Explore further / Alternative / Critique again → EXPLORE
    └── Move to next phase
          ↓
DEEP_REASON (estimand → method)
↓
PLAN
↓
CHECK_ASSUMPTIONS (exploration partition)
↓
SELECT_METHOD (primary + registered sensitivity specifications)
↓
REGISTER_BATCH                           # commit: register_batch
↓
RUN_CONFIRMATION                         # commit: run_confirmation; test epoch begins
↓
OBSERVE
├── Error → TECHNICAL_RETRY (inside capability)
└── Success
      ↓
DETERMINISTIC_VALIDATE (+ severity + robustness)
├── Invalid → INCONCLUSIVE
└── Valid
      ↓
SUFFICIENCY_GATE (deterministic)         # commit: assess_outcome
├── FINDING_SUPPORTED / FINDING_CONTRADICTED
├── NEGATIVE_RESULT
└── INCONCLUSIVE
      ↓
REVIEW_TRIGGERS?
├── Yes → AWAITING_REVIEW
└── No
      ↓
UPDATE_RESEARCH_STATE
      ↓
NEXT_MOVE / EVALUATE_STOPPING (Stop hook)
├── Follow-up → record for a later run on fresh data
└── Stop → INTERPRET_AND_REPORT (new post-test sessions) → FINALIZE
```

## Agent Responsibility Model

```text
Reasoning Agent (role profiles: PI, Theorist, Methodologist, Skeptic, Interpreter, Reporter)
= plan + generate + design + critique + interpret + propose next moves (through tools)

Structured Decision Layer (e.g. TypeSafe / Jev)
= choose at decision points (intake, select, outbound check, next move); narrow only

Analytical / Statistical Tools (Scientific Core)
= calculate + execute registered capabilities + deterministic checks
  + sufficiency outcome + claim level

Hooks / Commit Tools (Runtime)
= enforce invariants + authorize transitions + change state + ledger
```

## Agent Rules

1. Never claim access to data/tool result that was not actually available.
2. Never mark hypothesis supported from planning/reasoning alone.
3. Never silently change dataset version.
4. Never hide failed assumptions.
5. Never select the "best" specification or branch because its p-value is lowest; the registered primary decides.
6. Never state causal conclusion without supported design.
7. Ask user when domain ambiguity materially changes interpretation.
8. Preserve conflicting evidence.
9. Respect step/time/cost limits.
10. Store reason summary for method selection/re-plan.
11. Never treat decision-model confidence as scientific evidence.
12. Never allow a candidate hypothesis to become active without a selection record or explicit researcher choice.
13. Never create an official outcome outside the confirmation batch or before the deterministic sufficiency and claim-level gates.
14. Keep technical retry and scientific refinement as separate trace categories.
15. Preserve all structured decision records and human overrides.
16. If a structured decision provider is unavailable, run the decision point `off` (deterministic rule) or require human review; do not silently skip the decision point.
17. Never execute model-generated code; analyse data only through registered capabilities.
18. Never read the confirmation partition with an exploration tool, and never retest on data already read.
19. Never let the decision layer admit a proposal, pass a gate or change an outcome.
20. Never change state except through a commit tool.

These rules are enforced as hook rules and commit preconditions (Module AJ FR-LOOP-04) and tested against an adversarial agent, not only stated in prompts.

---

# 39. Human-in-the-Loop Decision Policy

## Mandatory Review

- destructive/risky cleaning;
- unresolved variable semantics;
- agent-generated initial hypothesis before activation;
- high-impact post-hoc hypothesis if configured;
- severe assumption violation;
- potential causal interpretation;
- conflicting evidence before final conclusion;
- downstream invalidation affecting report;
- explicit publication/final report approval;
- severity-check conflict or synthesis conflict among outcomes in one confirmation batch;
- causal diagram awaiting endorsement (structured elicitation);
- name-inferred operationalization behind an official outcome;
- autonomy-level or policy requirement;
- decision-layer abstention or confidence below configured threshold at any decision point (adds escalation, never removes it);
- provider disagreement when configured as a high-risk policy.

Deterministic triggers above always apply whatever the decision layer answers.

## Optional Auto-Continue

Low-risk cases may continue automatically:

- profiling;
- descriptive stats;
- safe schema inspection;
- read-only diagnostics;
- technical retry of a capability error within limit;
- exploration analyses within the exploration budget;
- high-confidence structured decision when its decision point is `on`, policy allows auto-continue and no deterministic trigger has fired.

---

# 40. Product State Models

Research State (epistemic record), Run State (run lifecycle, 40.8) and Execution State (technical state of one experiment attempt, 40.2) are separate: an execution-attempt failure does not imply a hypothesis failure or an invalid run.

## 40.1. Dataset

```text
Uploaded
→ Validating
→ Valid
→ Profiled
→ Ready
→ Superseded
```

Failure:

```text
Uploaded
→ Validation Failed
```

---

## 40.2. Experiment

```text
Draft
→ Planned
→ Ready
→ Running
→ Validating
→ Completed
```

Alternative outcomes:

```text
Failed
Cancelled
Needs Review
Invalidated
```

---

## 40.3. Hypothesis

```text
Proposed
→ Unverified
→ Supported / Rejected / Inconclusive
→ Superseded
```

---

## 40.4. Finding

```text
Preliminary
→ Validating
→ Validated
```

Alternative:

```text
Needs Review
Conflicting Evidence
Rejected
Invalidated
```

## 40.5. Research State

```text
Building
→ Active
→ Updated
→ Superseded
```

Each experiment/finding/decision must reference the Research State version used at the time.

## 40.6. Structured Decision

```text
Pending
→ Evaluating
→ Decided
```

Alternative:

```text
Abstained → Rule Used
Needs Human Review
Overridden
Failed
Fallback Used (rule / mode off)
Shadow Recorded (rule decided)
```

## 40.7. Scientific Refinement

```text
Requested
→ Planning
→ Ready
→ Executing (exploration, before test epoch)
→ Re-verified
```

After the test epoch:

```text
Requested → Follow-up Recorded (post_test, deviation) → Carried to Later Run
```

## 40.8. Run

```text
Created
→ Intake
→ Awaiting Clarification (optional, durable pause)
→ Protocol Frozen
→ Exploring
→ Batch Registered
→ Confirming (test epoch)
→ Assessing
→ Awaiting Review (optional, durable pause)
→ Reporting
→ Completed within Budget / Objective Resolved
```

Alternative:

```text
Stopped by Hard Stop
Stopped by Researcher
Blocked (integrity mismatch)
Failed
```

## 40.9. Confirmation Batch

```text
Draft
→ Registered (frozen)
→ Executing
→ Outcomes Assessed
```

---

# 41. Core UI Screens

## 41.1. Project Dashboard

Show:

- research objective;
- current question;
- active hypothesis;
- latest experiment;
- latest finding;
- warnings;
- loop progress and current phase (exploring / batch registered / confirming);
- budget use (exploration, looks, resources);
- dataset version;
- quick actions.

## 41.2. Dataset Detail

Tabs:

```text
Overview
Data Card
Quality
Versions
Transformations
```

## 41.3. Research Workspace

Primary workspace should show:

```text
Research Question / Brief (with gaps and restatements)
Research Protocol (frozen) and Deviations
Research State / Research Program Summary
Candidate Hypotheses / Directions (with origin)
Hypothesis Selection Decision
Exploration Results (labelled hypothesis-generating)
Confirmation Batch
Agent Deep-Reasoning / Plan Summary
Experiment Timeline
Current Outcome
Evidence Sufficiency Outcome
Analysis Ledger Summary (analyses, looks used / budget)
Next Move
```

## 41.4. Experiment Detail

Tabs:

```text
Plan / Registered Proposal
Method & Assumptions
Execution (capability, parameters, partition)
Result
Deterministic Validation
Severity & Robustness
Sufficiency Outcome
Refinement History
Ledger Entries
Trace
Reproducibility
```

## 41.5. Finding Detail

Show:

- finding statement (template-rendered by claim level);
- outcome category and claim level;
- status;
- effect / raw and adjusted CI against δ_F and δ_N;
- hypothesis and origin;
- evidence;
- severity check and robustness results;
- looks, deviations and partition;
- warnings and limitations;
- provenance / lineage;
- next move / follow-ups.

## 41.6. Dependency Graph

Visual graph of:

```text
RQ → H → Proposal → Batch → E → Outcome → Follow-up
```

When BR-81 is enabled, the same view shows Research Program branches with status, budget use and pruning reasons.

## 41.7. Evaluation Dashboard

Show:

- benchmark runs;
- success rate;
- method accuracy;
- skill scores;
- hypothesis-selection quality;
- decision-layer agreement with rule, per decision point;
- false-finding rate on null / structured-null data;
- power on planted signals;
- escalation rate;
- confidence/calibration quality;
- cost;
- ablation comparison at equal budget.

## 41.8. Decision History

Show:

```text
Decision Type / Decision Point
Mode (on / shadow / off)
Research State Version
Candidates / Evidence Input
Outcome
Rule Outcome
Confidence / Abstained
Reason Codes
Provider / Model
Downstream Action
Human Override
Timestamp
```

User must be able to open a decision and navigate to the related hypothesis, experiment, validation result and Research State.

---

# 42. Error & Empty States

## Dataset

- unsupported format;
- unreadable file;
- empty dataset;
- duplicate column names;
- too-large file;
- profiling failed.

## Research

- no active dataset;
- no research question;
- hypothesis not approved;
- insufficient sample;
- ambiguous variable.

## Experiment

- unsupported method / capability not registered;
- assumption failed;
- sandbox timeout;
- capability error (typed);
- dependency unavailable;
- max retry reached;
- partition access denied by hook;
- look budget exhausted;
- user cancelled.

## Validation

- result invalid;
- conflicting evidence;
- multiple-testing warning;
- possible leakage;
- unsupported causal claim;
- severity check failed;
- sufficiency outcome inconclusive;
- evidence insufficient for official outcome;
- dataset too small for a split (only declared / blind hypotheses allowed);
- low-confidence structured decision.

## Decision Gate

- no suitable candidate hypothesis;
- decision provider unavailable (decision point runs `off`);
- decision timeout;
- malformed structured decision;
- abstention or low confidence requiring review;
- typed rejection by hook or gate (repair limit reached);
- provider fallback activated.

Every error state must include:

```text
What happened
Why it matters
What the user can do next
```

---

# 43. Notifications & Review Tasks

P1 notification types:

- dataset profiling complete;
- approval required;
- experiment complete;
- experiment failed;
- conflicting evidence detected;
- downstream findings invalidated;
- report ready;
- benchmark complete;
- clarification needed (run paused);
- hypothesis selection needs review;
- outcome needs review (deterministic trigger);
- confirmation batch registered / confirmation complete;
- decision provider fallback used;
- scientific refinement or follow-up requested.

Notifications should deep-link to the relevant object.

---

# 44. High-Level Data Entities

This PRD does not define the physical database schema, but product behavior requires at least:

```text
User
Role
Project
ProjectMember
Dataset
DatasetVersion
Transformation
DataProfile
DataCard
ResearchQuestion
ResearchBrief
ResearchContext
ResearchProtocol
ProtocolDeviation
DataPartition
ResearchState
ResearchProgram
CandidateHypothesis
Hypothesis
PriorWorkAssessment
Critique
HypothesisSelectionDecision
ResearchProposal
ConfirmationBatch
ExperimentPlan
Experiment
RobustnessSpecification
AssumptionCheck
SeverityCheck
MethodSelection
RegisteredCapability
ExecutionRun
ExecutionStep
AnalysisLedgerEntry
StatisticalResult
ScientificValidation
EvidenceSufficiencyOutcome
DecisionRecord
Finding / Outcome
Evidence
DependencyEdge
ConflictRecord
Figure
ResearchTable
Report
Artifact (envelope, visibility)
PublicationView
ClaimEvidenceMap
DomainPack
MethodLesson
RetrievalRecord
SimulationReport
Theory
Campaign
ReproducibilitySnapshot
BenchmarkTask
BenchmarkRun
EvaluationMetric
AgentConfiguration
DecisionGateConfiguration
AuditLog
```

---

# 45. High-Level Relationship Model

```text
Project
├── Dataset
│   └── DatasetVersion
│       ├── DataProfile
│       └── Transformation
│
├── ResearchQuestion / ResearchBrief
│   └── ResearchProtocol (frozen; deviations)
│       └── ResearchState / ResearchProgram
│           ├── AnalysisLedger
│           ├── CandidateHypothesis
│           │   └── HypothesisSelectionDecision
│           │       └── Active Hypothesis
│           └── ConfirmationBatch
│               └── ResearchProposal (Hypothesis + estimand)
│                   └── Experiment
│                       ├── AssumptionCheck
│                       ├── MethodSelection (+ RobustnessSpecification)
│                       ├── ExecutionRun (RegisteredCapability, partition)
│                       ├── StatisticalResult
│                       ├── ScientificValidation + SeverityCheck
│                       ├── EvidenceSufficiencyOutcome
│                       └── Finding / Outcome
│                           └── Updated ResearchState
│
├── Figure / Table
├── Report
└── Evaluation
```

---

# 46. Non-Functional Requirements

## NFR-01 — Security

- authentication required;
- server-side authorization;
- project data isolation;
- secure sandbox;
- encryption in transit;
- secret management;
- audit log for privileged actions.

## NFR-02 — Privacy

- user dataset is not exposed across projects;
- logs avoid storing raw sensitive data unless required;
- configurable retention where practical; deletion via tombstones (FR-REPRO-05);
- external model providers receive only allowlisted projections under per-run consent; without consent a deterministic/local path runs or the step is skipped with a recorded reason;
- only `publishable` artifacts may leave the project's control.

## NFR-03 — Reliability

- failed experiment does not corrupt project data;
- dataset versions immutable after creation;
- asynchronous jobs are retry-safe/idempotent where possible;
- each commit writes state, events and ledger entries atomically; event replay verifies declared epistemic fields and an integrity mismatch blocks the run;
- every failure is classified after the last safe state is preserved: technical → retry, scientific → refinement, review-required → review, integrity mismatch → block, terminal → stop; no failure path silently advances epistemic state and every path leaves the artifacts committed so far.

## NFR-04 — Performance

Initial targets for capstone:

- common page response target: ≤ 2 seconds excluding long-running jobs;
- upload/profiling can be asynchronous;
- experiment UI must show progress for long-running task;
- cancellation should be supported.

## NFR-05 — Explainability

User must be able to inspect:

- selected method;
- assumption result;
- experiment plan;
- supporting evidence;
- warnings.

## NFR-06 — Auditability

Important user/agent actions must have timestamp + actor + object.

## NFR-07 — Reproducibility

Official experiment must retain reproducibility snapshot.

## NFR-08 — Scalability

Architecture should allow workers/sandbox execution to scale separately from frontend/API, without requiring microservices for MVP.

## NFR-09 — Maintainability

Agent tools, validators and scorers should be modular and independently testable.

## NFR-10 — Accessibility

Primary web flows should support keyboard navigation, readable status labels and non-color-only error indication.

## NFR-11 — Scientific Integrity

Product must enforce:

- hypothesis ≠ fact;
- anomaly ≠ error;
- association ≠ causation;
- statistically significant ≠ practically important;
- decision confidence ≠ scientific evidence;
- exploration ≠ confirmation; reasoning step ≠ look;
- absence of evidence ≠ evidence of absence (Negative Results need an interval inside (−δ_N, δ_N)).

False-finding rate on null and structured-null benchmark data must be at or below the registered α, including under an adversarial proposer.

## NFR-12 — Decision Safety

- decision layer narrows, never widens what deterministic validation allows;
- deterministic review triggers always apply; low confidence or abstention only adds escalation;
- decision outcome must be typed/structured;
- malformed or missing decision must fail safely to the deterministic rule;
- official outcome cannot bypass the deterministic sufficiency and claim-level gates;
- hooks and gates are verified against an adversarial agent.

## NFR-13 — Provider Portability

Hypothesis/evidence decision capability must be isolated behind a provider interface so that TypeSafe/Jev, structured LLM baseline or another compatible provider can be evaluated without rewriting research-domain workflows.

## NFR-14 — Observability

Telemetry must distinguish:

```text
technical retry
scientific refinement
exploration analysis vs look
gate decision / decision point (mode, rule answer)
hook rejection and repair
human escalation
provider fallback
human override
```

Operational telemetry is never an input to evidence, decisions or outcomes.

## NFR-15 — Execution Safety

- only registered capabilities execute, in a scrubbed sandbox under resource limits;
- dataset strings, brief text, knowledge, retrieved text and re-projected model output are bounded, marked as data and never treated as instructions;
- data-derived content is sent to external model providers only as allowlisted projections under per-run consent.

---

# 47. Product Metrics

## Adoption / Usage

- projects created;
- datasets uploaded;
- research loops started;
- experiments executed;
- reports generated.

## Agent Quality

- experiment success rate;
- method-selection acceptance rate;
- assumption warning rate;
- technical retry rate;
- scientific refinement rate;
- unsupported claim rate;
- human intervention rate;
- hypothesis-selection quality;
- evidence-gate correctness;
- false acceptance of insufficient evidence;
- unnecessary continuation rate;
- false-finding rate on null data;
- hook rejection and repair rates;
- gain over deterministic playbook and linear baseline at equal budget;
- negative-result share.

## Trust

- provenance coverage;
- validated findings with evidence;
- reproducibility snapshot coverage;
- structured decision record coverage;
- Analysis Ledger coverage;
- looks per outcome and protocol deviations;
- deterministic-trigger escalation compliance;
- decision calibration quality;
- number of downstream invalidations;
- number of conflicting evidence cases surfaced.

## Performance / Cost

- median experiment latency;
- average tool calls;
- tokens/run;
- estimated cost/run;
- sandbox failure rate.

---

# 48. Product Acceptance Criteria

Product is accepted when:

1. User can authenticate and create a project.
2. User can upload supported dataset.
3. Platform preserves immutable original dataset.
4. Platform automatically profiles dataset.
5. Data Card is generated for exact dataset version.
6. User can enter research question.
7. User can define/confirm H0/H1.
8. System builds a versioned Research State before research iteration.
9. Agent can generate candidate hypotheses/research directions from Research State.
10. Candidate hypotheses contain rationale, parent evidence and testability metadata.
11. Candidate cannot silently become active hypothesis.
12. Structured Hypothesis Selection Gate can rank/select/reject/defer candidates, with deterministic rule fallback.
13. Hypothesis-selection decision links to exact Research State version.
14. Selection decision stores confidence/uncertainty, abstention, rule outcome, mode and provider/configuration reference.
15. Abstention or low-confidence selection falls back to the rule and can create researcher review task.
16. Agent can generate structured experiment plan for selected hypothesis/direction.
17. Agent can generate candidate methods.
18. Agent can execute deterministic assumption checks.
19. Agent records selected method and rationale.
20. Agent can execute experiment in isolated sandbox through registered capabilities only; no model-generated code runs.
21. Execution error can trigger bounded technical retry inside the capability.
22. Technical retry is recorded separately from scientific refinement.
23. Experiment creates inspectable raw/statistical result.
24. Deterministic validation can block unsupported result/interpretation.
25. Multiple-testing control is applied/justified when applicable.
26. Effect size/CI is shown when supported.
27. Leakage guard is applied for predictive/ML workflow when applicable.
28. Every completed confirmation-batch experiment receives a deterministic sufficiency outcome before official outcome.
29. Sufficiency gate computes `FINDING_SUPPORTED` / `FINDING_CONTRADICTED` from the adjusted interval vs δ_F.
30. Sufficiency gate computes `NEGATIVE_RESULT` from the adjusted interval inside (−δ_N, δ_N).
31. Sufficiency gate computes `INCONCLUSIVE` otherwise or when an applicable check fails.
32. No model call decides or changes the sufficiency outcome.
33. δ_F and δ_N cannot change after the Research Protocol is frozen.
34. Exploration results are always labelled hypothesis-generating and never become official outcomes.
35. Only `FINDING_*` and `NEGATIVE_RESULT` from the confirmation batch, after the claim-level gate, become official outcomes.
36. `NEED_MORE_EVIDENCE`, `TRY_ALTERNATIVE_METHOD`, and `REPLICATE` are *next move* options: exploration before the test epoch, follow-up on fresh data after it.
37. A deterministic review trigger creates a researcher review task and pauses the run durably; low confidence only adds escalation.
38. Validated outcome links to hypothesis, proposal, batch, experiment, dataset version, partition, validation, sufficiency outcome and execution trace.
39. Dataset transformations create new versions.
40. User can inspect experiment trace and provenance/evidence.
41. System preserves hypothesis → proposal → batch → experiment → outcome → follow-up lineage for iterative research.
42. Hypotheses carry system-assigned origin (`declared` / `generated_blind` / `generated_from_exploration` / `post_test`) and stay `Unverified` until tested.
43. Conflicting evidence is preserved.
44. Upstream invalidation flags affected downstream artifacts.
45. Stopping criteria can terminate research loop.
46. Official experiment has reproducibility snapshot.
47. Decision records preserve provider/model/configuration and downstream action.
48. Human override preserves original decision and override reason.
49. Evaluation center can measure decision-layer quality per decision point.
50. Evaluation center can measure evidence-gate quality and false-finding rate on null data.
51. Evaluation center can compare Structured Decision Layer vs deterministic rule vs LLM-only decision baseline at equal budget when benchmark labels/rubrics allow.
52. Benchmark/evaluation can compare at least two agent configurations.
53. System runs the decision point `off` (deterministic rule) or requires human review if structured decision provider is unavailable.
54. Final report uses validated outcomes only and gives Negative Results and Inconclusive outcomes the same standing as Findings.
55. Every analysis on data has an Analysis Ledger entry; the disclosure bundle lists them all.
56. Research Protocol and confirmation batch are frozen before confirmation data is read; look budget cannot grow after the test epoch.
57. Hooks reject exploration tools on the confirmation partition and branch operations after the test epoch.
58. Tied candidates enter one confirmation batch within the look budget; no parallel execution branches are created.
59. The full loop runs at autonomy A0 (deterministic playbook, no model calls) with the same hooks, gates and commits.
60. No state change happens outside a commit tool.
61. Every committed step leaves an artifact with a complete envelope and deterministic visibility.
62. No view becomes `publishable` without passing the integrity audit and statistical disclosure control.
63. Every outcome carries a claim type and evidential status from the deterministic claim-level gate; causal claims require endorsed assumptions.
64. Replay of an official experiment matches exactly under matching environment identity.
65. Pre-run preview shows precision plan, cost estimate and answerability before a run starts.
66. A policy, pack or model version can be traced to every dependent outcome (reverse provenance).

---

# 49. Release Plan

## Release 0 — Technical & Decision Spike

Goal: prove the riskiest execution and structured-decision interfaces.

Deliver:

```text
CSV
→ Data Profile + Exploration / Confirmation Split
→ Research Protocol
→ Research State
→ Deterministic Playbook (A0) + Mock / Structured DecisionProvider (shadow)
→ Planner
→ registered statistical_test capability
→ Deterministic Validation
→ Deterministic Sufficiency Outcome
```

Must prove:

- sandbox execution of registered capabilities;
- hooks and commit tools;
- Analysis Ledger;
- structured decision schema;
- provider abstraction with rule fallback;
- trace persistence.

---

## Release 1 — Core Research MVP

Deliver:

- auth/project;
- upload;
- profiling/Data Card;
- research question/H0/H1;
- Research State;
- exploration/confirmation split, Research Protocol, Analysis Ledger;
- experiment planner;
- method selection;
- assumption check;
- secure execution;
- deterministic validation;
- deterministic sufficiency gate;
- finding / negative result;
- trace/provenance.

Success demo:

```text
Dataset + declared H1
→ Split + Protocol
→ Research State
→ Confirmation Batch {H1}
→ E1 on confirmation partition
→ Validation
→ Sufficiency Outcome
→ Finding / Negative Result / Inconclusive
```

---

## Release 2 — Decision-Gated Iterative Research Agent

Deliver:

- agent loop at A1 with decision points and typed rejections;
- candidate hypothesis generation and exploration analyses;
- Skeptic critique;
- Hypothesis Selection Gate;
- confidence-based escalation over deterministic triggers;
- hypothesis refinement;
- next-move decision point;
- stopping criteria and Stop hook;
- decision history;
- triangulation / bounded robustness;
- conflict handling.

Success demo:

```text
Exploration partition
→ Candidate H-A / H-B / H-C (exploration analyses, ledgered)
→ Critique → Refine
→ Selection Gate (select)
→ Confirmation Batch {H-A, H-C if tied}
→ E on confirmation partition
→ Validation + Severity + Robustness
→ Sufficiency Outcomes
→ Follow-up / Stop
```

---

## Release 3 — Scientific Validity & Reproducibility

Deliver:

- multiple testing;
- effect size/CI;
- leakage guard;
- dependency graph;
- downstream invalidation;
- reproducibility snapshot, replay vs re-derivation;
- claim-level gate;
- research artifacts and publication views (report, finding brief, preregistration, disclosure bundle, analysis package);
- integrity audit and statistical disclosure control;
- figure/table/report.

---

## Release 4 — Evaluation & Ablation

Deliver:

- benchmark tasks;
- repeated runs;
- quantitative metrics;
- skill evaluation;
- hypothesis-gate metrics;
- evidence-gate metrics;
- calibration metrics;
- false-finding rate on null / structured-null data and power on planted signals;
- `Structured Decision Layer vs Deterministic Rule vs LLM-only Decision`;
- ablation comparison at equal budget.

---

# 50. BRD → PRD Traceability

| BRD Requirement | PRD Module |
|---|---|
| BR-01 Authentication | Module A |
| BR-02 RBAC | Module A |
| BR-03 Research Project Workspace | Module B |
| BR-04–07 Dataset Upload/Validation/Profiling | Modules C–D |
| BR-08–12 Data Quality/Cleaning/Versioning | Module E |
| BR-13 Research Question | Module F |
| BR-14–16 Hypothesis/Context | Modules F–G |
| BR-17 Experiment Planning | Module H |
| BR-18–20 Candidate Method/Assumption/Selection | Modules I–J |
| BR-21 Limited Branching (Triangulation & Bounded Robustness) | Module K |
| BR-22–23 Execution via Registered Capabilities / Technical Retry | Module L |
| BR-24–25 Validation/Replication | Modules M, O |
| BR-26–30 Finding/Refinement/Stopping | Modules Q, R, U |
| BR-31 Statistical Analysis | Module I |
| BR-32–33 Visualization/Figure Review | Module V |
| BR-34–37 Provenance/Trace/Reproducibility | Modules X, Y, Z |
| BR-38–42 Research Output/Validation | Modules V, W, M |
| BR-43–46 Evaluation/Ablation | Module AA |
| BR-47 Leakage Guard | Module P |
| BR-48 Hypothesis Origin | Module G |
| BR-49 Multiple Testing | Module N |
| BR-50 Effect Size/CI | Module O |
| BR-51 Dependency Graph | Module S |
| BR-52 Downstream Invalidation | Module S |
| BR-53 Conflicting Evidence | Module T |
| BR-54 Confidence/Uncertainty | Module O |
| BR-55 Reproducibility Snapshot | Module Z |
| BR-56 Research State Construction | Module AC |
| BR-57 Candidate Hypothesis / Direction Generation | Module AC |
| BR-58 Structured Hypothesis Selection Gate | Module AD |
| BR-59 Evidence Sufficiency Gate (Deterministic) | Module AE |
| BR-60 Scientific Refinement Loop (Next Move) | Modules AF, AJ |
| BR-61 Confidence-Based Human Escalation | Modules AD, AF |
| BR-62 Decision Auditability | Module AG |
| BR-63 Decision Gate Evaluation | Modules AG, AA |
| BR-64 Structured Idea Record & Reflection | Module AH |
| BR-65 Prior-Work Assessment (Novelty Assessment) | Module AH |
| BR-73 Figure Aggregation & Visual Feedback | Module AH |
| BR-74 Manuscript Draft Generation | Module AH |
| BR-75 Automated Manuscript Review | Module AH |
| BR-78 Bounded Tied-Candidate Selection (one confirmation batch) | Modules AD, H, AI |
| BR-79 Exploration / Confirmation Split & Analysis Ledger | Modules AI, N, P |
| BR-80 Agent-Directed Research Loop within Budgets and Invariants | Module AJ, Section 38 |
| BR-81 Research Program Branches (Bounded) | Module AJ (FR-LOOP-08), Module S |
| BR-82 Research Knowledge Layer | Module AL |
| BR-83 Research Artifacts & Visibility | Module AK |
| BR-84 Publication Views & Integrity Audit | Modules AK, W |
| BR-85 Simulation Lab | Module AM |
| BR-86 Theory & Observable Implications | Module AC (FR-STATE-06) |
| BR-87 Research Campaign | Module AF (FR-REFLOOP-06) |

---

# 51. Research Evaluation Alignment

The product must expose telemetry required to answer the three research questions carried forward from BRD v1.2.

## RQ1 — End-to-End Effectiveness

How effectively can the AI Research Agent perform end-to-end research experimentation on user-provided datasets?

Relevant metrics:

- task success;
- result correctness;
- experiment completion;
- method-selection accuracy;
- evidence coverage;
- provenance coverage;
- reproducibility coverage;
- unsupported claim rate.

## RQ2 — Architecture Effectiveness

How effective is the architecture:

```text
GENERATE
→ SELECT
→ REASON
→ EXECUTE
→ VALIDATE
→ VERIFY
→ REFINE
```

compared with simpler architectures?

Required comparisons/ablations should include when feasible:

```text
Full Agent
No Planner
No Profiling
No Assumption Checking
No Retry
No Validator
No Hypothesis Refinement
No Hypothesis Selection Gate
No Evidence Sufficiency Gate
No Hooks / Commit Gates (bare agent loop)
Deterministic Playbook Only (A0)
Single-loop Agent (no subagents)
LLM-only Decision Baseline
Single-Pass / Text-to-Code Baseline
```

All arms run at equal budget; these evaluation arms are experiments, not earned autonomy levels.

Relevant metrics:

- task success delta;
- false evidence acceptance;
- false-finding rate on null data;
- unnecessary continuation;
- human escalation;
- latency;
- cost;
- retry/refinement counts.

## RQ3 — Task / Skill Performance

How does the agent perform across:

- dataset understanding;
- candidate-hypothesis generation;
- hypothesis selection;
- deep experiment planning;
- method selection;
- assumption checking;
- execution;
- deterministic validation;
- evidence sufficiency verification;
- scientific refinement;
- evidence grounding;
- reproducibility.

Decision-gate evaluation should include:

- decision correctness;
- selection quality;
- confidence/calibration quality;
- false acceptance of insufficient evidence;
- unnecessary continuation rate;
- human escalation rate;
- latency;
- cost.

---

# 52. Key Product Risks

| Risk | Product Response |
|---|---|
| Agent chooses wrong method | Candidate methods + assumption checks + explain selection |
| Agent hallucinates business meaning | Research context + ask-user |
| Agent overclaims causality | Causal-language guard |
| Agent p-hacks through many tests | Analysis Ledger + exploration/confirmation split + look budget + batch-level correction |
| Agent search manufactures findings or retests on data it has read | Confirmation batch frozen before test epoch; system-assigned origin; follow-ups only on fresh data |
| Agent cherry-picks results | Registered primary analysis; preserve specifications/conflicts; disclosure bundle |
| Experiment chain depends on invalid result | Dependency graph + downstream invalidation |
| Dataset is damaged by cleaning | Immutable raw + versioning + approval |
| Generated code is unsafe or irreproducible | No generated code: registered capabilities only + sandbox + limits + no network by default |
| Result cannot be reproduced | Reproducibility snapshot |
| Loop runs forever | Stopping criteria + budgets |
| Too much scope for capstone | P0/P1/P2 prioritization |
| Hypothesis gate selects weak/irrelevant direction | Candidate set preserved + benchmark + human escalation |
| Evidence gate accepts insufficient evidence | Deterministic sufficiency on adjusted intervals vs frozen δ_F / δ_N + severity checks + claim-level gate |
| Decision confidence is poorly calibrated | Calibration metrics + conservative threshold + deterministic triggers as escalation floor + `shadow` mode until earned |
| Decision layer or agent loosens control (e.g. prompt injection) | Narrow-only authority; hooks independent of model output; untrusted-data marking; adversarial-agent tests |
| TypeSafe/decision provider unavailable | Provider abstraction + decision point `off` (deterministic rule) + human review |
| LLM and gate create long feedback loop | Stopping criteria + Stop hook + exploration/look/resource budgets |
| Gate provider fabricates scientific facts | Decision layer receives validated structured facts only; no fact-generation authority; outcomes are computed |

---

# 53. Open Product Decisions

These decisions should be finalized before implementation freeze:

1. Which file formats are P0: recommend CSV + XLSX.
2. Maximum dataset size for capstone deployment.
3. Which statistical methods are officially supported/tested in P0.
4. Whether every agent-generated post-hoc hypothesis requires manual approval.
5. Default max experiment count.
6. Default retry count per execution.
7. Default number of sensitivity specifications per proposal (Module K).
8. Which LLM/model provider(s) are supported.
9. Whether report export is Markdown/PDF/DOCX in MVP.
10. Whether evaluation datasets are internal, public benchmark, or both.
11. Exact benchmark scoring rubric.
12. Retention policy for uploaded datasets and raw execution output.
13. Which structured decision provider is primary for evaluation: TypeSafe/Jev, structured LLM, or both.
14. Default confidence threshold per decision point (intake, select, outbound check, next move).
15. Default δ_F, δ_N, δ_min and δ_N ceiling per domain pack.
16. Whether first iteration uses gate-selected sub-hypothesis/direction or researcher-confirmed (`declared`) H1 directly.
17. Fallback policy when decision provider fails: deterministic rule (`off`), human review, or fail-closed.
18. Which benchmark tasks have gold/rubric labels suitable for decision-gate calibration.
19. Whether candidate hypothesis count is fixed or budget-driven.
20. Whether human override should feed future evaluation only or also adaptive policy tuning.
21. Default exploration/confirmation split ratio and minimum partition size for a split.
22. Default look budget, exploration budget and error-control scheme (e.g. Holm vs sequential e-values).
23. Initial decision-layer mode per decision point at A1 (which classes start `on` vs `shadow`).
24. Registered capability set and tool contracts for the MVP.

## 53.1. Proposed Defaults (pending team and supervisor approval)

The values below are **proposals** based on common statistical practice, offered so the team can approve or adjust instead of starting from nothing. None is final until recorded as approved; once approved, run defaults are exposed through the settings view (FR-ADMIN-04) and policy values become policy version 1. Every value may later change only as described in BRD BRule-39.

**Error control and evidence**

| Parameter | Proposed default | Rationale | Decision # |
|---|---|---|---|
| α (family-wise, per confirmation batch) | 0.05 | Conventional level; also the absolute ceiling for the false-finding rate in KPI-28 | 22 |
| Deciding interval (sufficiency, Module AE) | Two-sided simultaneous CI at level 1 − α/L (Bonferroni over the L registered looks; 99% when L = 5) | Sufficiency is decided on intervals; Bonferroni gives simultaneous intervals with FWER ≤ α, which step-down Holm does not | 22 |
| Adjusted p-values (reporting only) | Holm over the batch's looks | Reported alongside the interval; never used to override the interval-based outcome | 22 |
| FDR (Benjamini–Hochberg) | Exploration disclosure only | FDR does not control FWER, so it never decides an official outcome | 22 |
| Confirmatory status (fresh / sealed data) | Same interval rule at the same α; sequential e-values reserved for multi-run follow-ups | Keeps confirmatory at least as strict as held-out | 22 |
| Planning power | 0.80 | Conventional target for the precision plan in the pre-run preview (FR-RQ-04) | 15 |

**Margins (standardized effect sizes)**

| Pack | Measure | δ_min | δ_F default | δ_N default | δ_N ceiling | Decision # |
|---|---|---|---|---|---|---|
| `general` | Cohen's d / r | d = 0.10 / r = 0.05 | d = 0.20 / r = 0.10 ("small") | = δ_F | ≤ δ_F | 15 |
| Software engineering | Cliff's δ | 0.11 | 0.147 (negligible/small boundary, Romano et al.) | = δ_F | ≤ δ_F | 15 |

The researcher may raise δ_F (never below δ_min) or lower δ_N in the brief; a domain pack may only raise δ_F or lower δ_N. Setting δ_N = δ_F by default means a Negative Result requires the whole interval to lie inside the "negligible" band.

Margins are stated on the **summary measure of the estimand** (BR-17). Default `general` margins for other measures, equivalent to d = 0.20:

| Summary measure (typical method) | δ_F default | δ_min |
|---|---|---|
| Standardized mean difference d / Hedges' g (t-test, Mann–Whitney via d) | 0.20 | 0.10 |
| Correlation r (Pearson, Spearman) | 0.10 | 0.05 |
| Standardized regression coefficient β (linear regression) | 0.10 | 0.05 |
| Odds ratio (logistic regression, 2×2 tables); symmetric on log scale | 1.44 (log OR 0.36) | 1.20 |
| Cramér's V (chi-square) | 0.10 | 0.05 |
| η² / partial η² (ANOVA, Kruskal–Wallis via ε²) | 0.01 | 0.0025 |

For measures not listed, the Methodologist must state δ_F in the measure's units with a rationale, and δ_F may never be set below δ_min by conversion.

**Data split and budgets**

| Parameter | Proposed default | Rationale | Decision # |
|---|---|---|---|
| Exploration / confirmation split | 50 / 50 by keyed hash on row, group or block | Balances exploration breadth against confirmation precision | 21 |
| Sealed partition | Off by default; 20% when the researcher asks for confirmatory status | Only needed for confirmatory claims | 21 |
| Minimum partition size for a split | 100 units (rows, or groups when clustered) per partition | Below this, split is disabled and only `declared` / `generated_blind` hypotheses enter the batch. This is the floor for enabling a split, not a size that makes conclusions likely (see sample-size guidance below) | 21 |
| Look budget L | 5 per run | Deciding intervals at 99%; each extra look widens every interval in the batch | 22 |
| Exploration budget | 30 exploration analyses per run | Enough for several directions without unbounded search | 22 |
| Max experiments per run | 5 registered proposals + their registered checks | Equal to the look budget | 5 |
| Sensitivity specifications per proposal | Up to 3 | Bounded robustness (Module K) | 7 |
| Technical retries per execution | 2 | Separates transient errors from real failures | 6 |
| Typed-rejection repair attempts per step | 2 | Bounded repair (FR-LOOP-04) | — (policy setting) |
| Clarification rounds at intake | 2, deadline 72 h | Then proceed with gaps recorded (FR-RQ-02) | — (policy setting) |
| Candidate hypotheses per exploration round | Budget-driven, 3–5 | Diversity floor of at least 2 distinct constructs or question types | 19 |

**Sample-size guidance (two-group comparison, confirmation partition, α = 0.05, L = 5 so 99% intervals, power 0.80)**

| Target outcome | δ_F / δ_N | True effect d | Units per group in the confirmation partition |
|---|---|---|---|
| Finding | δ_F = 0.20 | 0.50 | ≈ 260 |
| Finding | δ_F = 0.20 | 0.40 | ≈ 585 |
| Finding | δ_F = 0.20 | 0.30 | ≈ 2,340 |
| Negative Result | δ_N = 0.20 | 0.00 | ≈ 745 |

Computed as n ≈ 2·((z₁₋α/(2L) + z_β) / |d − δ|)², with z_β = z₁₋β for a Finding and z₁₋β/₂ for a Negative Result (both interval bounds must clear ±δ_N). With a 50/50 split the whole dataset must be about twice these sizes. The pre-run preview (FR-RQ-04) shows this calculation for the actual design and warns when the expected outcome is mostly Inconclusive; for the MVP demo dataset this warning is expected unless the dataset has several thousand rows or δ_F is raised.

**Decision layer (autonomy A1)**

| Decision point | Initial mode | Initial confidence threshold | Decision # |
|---|---|---|---|
| Intake | `on` (narrow-only) | 0.80 | 14, 23 |
| Outbound check | `on` (narrow-only) | 0.80 | 14, 23 |
| Select | `shadow` | 0.70 (recorded only until promoted) | 14, 23 |
| Next move | `shadow` | 0.70 (recorded only until promoted) | 14, 23 |

Thresholds are recalibrated per pinned model version; below threshold or on abstention the deterministic rule decides, then escalation. Provider failure → the decision point runs `off` (rule), then human review; never fail-open (decision 17). The first iteration sends a researcher-confirmed `declared` H1 directly to the confirmation batch (decision 16).

**Evaluation**

| Parameter | Proposed default | Decision # |
|---|---|---|
| KPI-28 false-finding rate ceiling | ≤ 0.05 per run on null / structured-null suites | 18 |
| Non-inferiority margin (A1 vs A0 false-finding rate) | +0.03 absolute, judged on the upper bound of a one-sided 95% CI of the difference | 18 |
| Runs per arm | Power calculation n ≈ 2·p(1−p)·(z₀.₉₅ + z₀.₈₀)² / margin² at baseline rate p = 0.05: ≈ 655 null-suite runs per arm for margin 0.03 (≈ 1,470 for 0.02; ≈ 235 for 0.05 if model-call budget is tight) | 18 |

**MVP registered capabilities (decision 24)**

Descriptive statistics; Pearson and Spearman correlation; independent and paired t-test; Mann–Whitney U; chi-square; one-way ANOVA; Kruskal–Wallis; linear and logistic regression; interaction analysis; basic time-series analysis (BR-31); assumption checks for each; charts: histogram, box plot, scatter with fitted line, group comparison, forest plot of adjusted intervals against δ_F / δ_N, Q–Q and residual plots.

---

# 54. Recommended MVP Demo Scenario

A canonical capstone demo should use a student dataset containing variables such as:

```text
student_id
score
ai_usage_rate
study_hours
attendance
major
other contextual variables
```

Example research flow:

```text
RQ:
Is AI usage associated with student academic performance?

Initial H0:
No statistically meaningful association exists.

Initial H1 (declared):
An association exists.

Margins: δ_F and δ_N set in the brief (or policy defaults).

↓
Brief Intake → proceed (causal wording, if any, restated to associational)

↓
Split rows into exploration / confirmation partitions
Freeze Research Protocol (budgets, δ_F / δ_N, error control, A1 modes)

↓
Build Research State + Research Program
- dataset/Data Card
- H0/H1
- current evidence = none
- available variables
- ledger = empty; look budget = L

↓
Exploration (exploration partition only)
Generate Candidate Research Directions
A. Overall association between AI usage and score
B. Association differs by major
C. Adjusted association controlling study_hours
- exploration analyses on each (ledgered, not looks)
- Skeptic critique: study_hours may confound A
- refine C; B pruned for insufficient subgroup size

↓
Next Move → MOVE_TO_NEXT_PHASE

↓
Hypothesis Selection Gate (select, mode shadow at A1)
Rule selects H1 (declared) and C (generated_from_exploration);
decision-layer answer and confidence recorded beside the rule

↓
LLM Deep Reasoning
- estimand for each proposal
- primary analysis + sensitivity specifications
- success/falsification criteria

↓
Deterministic Assumption Checks (exploration partition)

↓
Register Confirmation Batch {H1, C}  (2 looks ≤ L)

↓
Run Confirmation on confirmation partition (test epoch)

↓
Deterministic Validation
- statistic / p-value
- effect size
- raw and batch-adjusted confidence interval
- assumptions, severity checks, robustness agreement

↓
Deterministic Sufficiency
Example outcomes:
H1 → FINDING_SUPPORTED (associational, held-out)
C  → INCONCLUSIVE (interval crosses δ_F)

↓
Next Move
Follow-up for C recorded (post_test) → later run on fresh data

↓
Update Research State
↓
Stopping Criteria
↓
Final Outcomes → Report + Disclosure Bundle
```

The demo should visibly show:

- exact Research State and frozen Research Protocol used;
- candidate hypotheses/directions and their system-assigned origin;
- exploration analyses in the ledger, labelled hypothesis-generating;
- structured selection decision with rule answer, mode, confidence and reason codes;
- why statistical method was chosen (estimand first);
- assumption, severity and robustness results;
- technical retry vs scientific refinement if triggered;
- deterministic validation facts and adjusted intervals vs δ_F / δ_N;
- deterministic sufficiency outcomes, including an Inconclusive one;
- experiment trace;
- evidence/provenance;
- hypothesis → batch → experiment → outcome → follow-up lineage;
- no unsupported causal conclusion;
- reproducibility metadata;
- decision-provider/configuration metadata.

### Demo Comparison for RQ2

If time permits, run the same benchmark/demo under:

```text
Configuration A
LLM handles reasoning + bounded decisions (no hooks)

vs

Configuration B
Deterministic playbook only (A0)

vs

Configuration C
Agent loop (A1) + Structured Decision Layer at decision points
+ hooks, ledger and deterministic sufficiency
```

Compare at equal budget:

```text
correctness
false-finding rate on null data
selection quality
false evidence acceptance
latency
cost
human intervention
confidence calibration
```

---

# 55. Definition of Done — Product Level

A feature is considered complete only when:

1. functional behavior is implemented;
2. authorization is enforced;
3. success/error/empty state exists;
4. audit/trace requirement is satisfied where relevant;
5. data object is linked to correct project/dataset version;
6. unit/integration tests cover critical logic;
7. acceptance criteria pass;
8. agent-related output is evaluated against at least one known test case;
9. UI communicates uncertainty/warnings clearly;
10. documentation is updated;
11. if the feature participates in structured decision flow, decision schema, rule fallback and audit record are tested;
12. technical retry and scientific refinement are classified correctly where applicable;
13. low-confidence/high-risk cases have a defined safe escalation path;
14. if the feature touches data, every analysis produces a ledger entry and respects partition access;
15. if the feature changes state, it does so only through a commit tool guarded by hooks.

---

# 56. Next Documents

After PRD review, recommended next artifacts:

```text
PRD
↓
Use Case Specification
↓
System Architecture (target: architecture.md)
↓
Agent Workflow / State Machine
↓
Decision Gate Contract / Provider Interface
↓
Activity Diagrams (Overall / Execution & Validation / Hypothesis & Evidence Loop)
↓
Database ERD
↓
API Contract
↓
UI Wireframe
↓
Test Strategy
↓
Benchmark & Evaluation Protocol
```

---

# 57. Document Change Log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-19 | Initial full PRD derived from BRD Final v1.0 |
| 1.0 | 2026-09-20 | Finalized PRD aligned with BRD v1.2; added Research State, candidate-hypothesis generation, Structured Hypothesis Selection Gate, Evidence Sufficiency Gate, scientific refinement, confidence-based escalation, decision audit/provider abstraction, TypeSafe/Jev as candidate provider, decision-gate evaluation, updated state machine, UI, entities, NFRs, release plan, acceptance criteria, risks and RQ alignment |
| 1.1 | 2026-09-22 | Added support for bounded tied-candidate selection at the Hypothesis Selection Gate (BR-58/BR-78): new FR-PLAN-04, concurrency-quota bullet in the concurrent-execution module, extended multiple-testing FR, new `co_selected_with` dependency-graph edge, extended conflicting-evidence and stopping-criteria FRs, new ablation arm, new FR-HGATE-07, and new Decision Record fields `tie_threshold_used`/`tied_candidates`, plus a new human-escalation trigger |
| 1.2 | 2026-09-22 | Added PG-18 (Product Goal for bounded tied-candidate selection) |
| 1.3 | 2026-09-22 | Fixed a direct contradiction in Non-Goals: the original wording excluded "full Agentic Tree Search" while BRD v1.7 mandated a bounded Experiment Tree (BR-66→BR-71) as Must — reworded Non-Goals to distinguish unbounded/general-purpose tree search (excluded) from the bounded, single-hypothesis Experiment Tree (then in scope) |
| 1.4 | 2026-09-22 | BRD v1.8 removed the entire bounded tree-search layer (BR-66→BR-72, BR-76, BR-77 and dependents) to restore the platform's original linear Decision-Gated Research Loop; reworded Non-Goals again to plainly exclude Agentic Tree Search (bounded or unbounded) and note that idea reflection, novelty assessment and automated manuscript review are still referenced from agentic-research systems without adopting their tree-search architecture; updated header Status/Source to BRD v1.8 |
| 1.5 | 2026-09-22 | Closed three remaining coverage/consistency gaps found by cross-audit: (1) added new Feature Module AH — Ideation Quality & Manuscript Reporting, covering BR-64 (Idea Record & Reflection, Must), BR-65 (Novelty Assessment), BR-73 (Figure Aggregation & Visual Feedback), BR-74 (Manuscript Draft Generation) and BR-75 (Automated Manuscript Review), none of which had any PRD module/FR before this version despite being defined in BRD since v1.3; (2) added BR-64/65/73/74/75/78 rows to the BRD → PRD Traceability table (mục 50), which previously stopped at BR-63 and also omitted BR-78 even though BR-78 was already functionally implemented in Modules AD/H; (3) annotated Module K (Limited Experiment Branching, BR-21) as "Must for final capstone" to match the BRD MoSCoW (Must) and the annotation convention used by Modules AC-AH, resolving a priority-signal mismatch flagged earlier but not previously fixed |
| 1.6 | 2026-09-22 | A follow-up cross-audit (comparing every BRD Must-priority BR against its PRD module's Priority line) found the same priority-signal mismatch fixed for Module K in v1.5 was still present in 8 more modules; annotated all of them with "Must for final capstone" plus the specific Must BR(s) driving it: Module N (BR-49), Module O (BR-50, BR-54), Module R (BR-28), Module U (BR-30), Module V (BR-32, BR-38; advanced visual/VLM reviewer sub-item stays P2), Module W (BR-41, BR-42), Module Z (BR-55), Module AA (BR-43, BR-63) — every PRD module that contains at least one BRD Must requirement is now annotated consistently; no functional/FR changes |
| 1.7 | 2026-09-22 | Fixed a different kind of priority mismatch in Module I: BR-31 (Statistical Analysis, Must in BRD, flat list with no internal split) had been silently split by the PRD into P0 and P1 sub-lists, demoting "interaction analysis" and "basic time-series analysis" to P1 despite both being explicitly named in the Must-priority BR-31; moved both into the P0/Must list so it now matches BR-31 exactly, and kept "simple repeated-measure support" and "selected ML prediction workflows" (which are PRD-only additions not present in BR-31 at all) at P1 with a note that they are extensions beyond BR-31 and not required for Must compliance |
| 1.8 | 2026-09-28 | Aligned with BRD v1.9 and the target architecture in [architecture.md](architecture.md): replaced the tree-search/linear-flow Non-Goal with "agent-directed within budgets and invariants" and added a no-generated-code Non-Goal; added PG-19/20, PP-13/14/15; new Module AI (Exploration / Confirmation Split & Analysis Ledger, BR-79) and Module AJ (Agent Research Loop, Decision Points & Hooks, autonomy levels, optional Research Program branches; BR-80/81); rewrote Module AE as a deterministic sufficiency gate (`FINDING_SUPPORTED` / `FINDING_CONTRADICTED` / `NEGATIVE_RESULT` / `INCONCLUSIVE` on adjusted intervals vs frozen δ_F / δ_N) and moved `NEED_MORE_EVIDENCE` / `TRY_ALTERNATIVE_METHOD` / `REPLICATE` to the *next move* decision point in Module AF and `NEED_HUMAN_REVIEW` to escalation; Module AD now records rule outcome, mode and abstention, runs `off`/`shadow`/`on`, and sends tied candidates into one confirmation batch (FR-HGATE-07, FR-PLAN-04; `max_parallel_candidates` / `max_total_concurrent_branches` and `co_selected_with` removed, `registered_in` added); deterministic triggers are the escalation floor (FR-HGATE-04, FR-REFLOOP-04, Section 39); Module L replaces `run_python` / `run_sql` with registered capabilities and typed tool contracts; Module K becomes triangulation/bounded robustness; Module G uses system-assigned origins; Module AH uses coverage-scoped Prior-Work Assessment; updated Sections 1, 3, 4, 6, 7, 8, 9, 38–49, 50, 51, 52, 53, 54, 55 accordingly. Coverage audit against architecture.md then added Module AK (Research Artifacts & Publication Views: envelope, visibility, views, claim faithfulness, portfolio lens, integrity audit, statistical disclosure control; BR-83/84), Module AL (Research Knowledge Layer; BR-82), Module AM (Simulation Lab; BR-85), FR-STATE-06 (theory, BR-86), FR-REFLOOP-06 (campaign, BR-87), FR-LOOP-09 (role profiles), FR-VALID-05/06 (claim-level gate, causal endorsement), FR-PROV-04 (lineage, reverse provenance), FR-REPRO-04/05 (replay vs re-derivation, tombstones), FR-EVAL-06 (champion/challenger, adversarial verification), FR-RQ-02/04 (intake, pre-run preview), FR-PROFILE-04, FR-ADMIN-04 (settings and policy versions), circuit breaker in FR-SPLIT-04, NFR-02/03 (consent, failure classification, integrity mismatch), acceptance criteria 61–66, entities, release plan and traceability for BR-82→87. Added §53.1 Proposed Defaults (α, Bonferroni deciding intervals with Holm for reporting, margins per summary measure, sample-size guidance for `general` and software-engineering packs, split, budgets, decision-layer modes and thresholds at A1, evaluation margins, MVP capability set), pending team and supervisor approval |
