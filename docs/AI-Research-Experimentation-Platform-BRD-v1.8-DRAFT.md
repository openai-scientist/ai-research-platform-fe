# Business Requirements Document (BRD)
## AI Research Experimentation Platform

**Document Type:** Business Requirements Document  
**Project:** AI Research Experimentation Platform  
**Version:** 1.9 Draft\
**Status:** Draft for supervisor review — aligned with target architecture ([architecture.md](architecture.md))\

---

# 1. Executive Summary

AI Research Experimentation Platform là nền tảng hỗ trợ researcher thực hiện quy trình nghiên cứu dựa trên dữ liệu thông qua AI Agent.

Người dùng có thể đưa dataset, research question, hypothesis và domain context vào hệ thống. AI Agent sau đó hỗ trợ hiểu dữ liệu, kiểm tra chất lượng, lựa chọn phương pháp phân tích, chạy experiment, kiểm tra giả định thống kê, đánh giá kết quả, sinh research finding và tiếp tục đề xuất hypothesis mới dựa trên evidence thu được.

Nền tảng không chỉ dừng ở việc "chat với dataset" hoặc chạy một phép kiểm thử thống kê đơn lẻ. Mục tiêu chính là hỗ trợ một vòng lặp nghiên cứu có cấu trúc:

```text
Research Question + Dataset (Research Brief)
    ↓
Brief Intake + Dataset Understanding / Data Card
    ↓
Split: Exploration / Confirmation Partition
    ↓
Freeze Research Protocol (budgets, margins, stopping rules)
    ↓
┌─ Exploration phase (agent loop, exploration partition only) ─┐
│  Research State + Research Program                            │
│      ↓                                                        │
│  Generate Candidate Hypotheses / Directions                   │
│      ↓                                                        │
│  Exploration Analyses (registered capabilities, ledgered)     │
│      ↓                                                        │
│  Critique → Refine → Structured Selection (decision layer)    │
│      ↓                                                        │
│  Next Move: explore further / alternative / critique / go on  │
└───────────────────────────────────────────────────────────────┘
    ↓
Register Confirmation Batch (estimand, primary analysis, criteria, look budget)
    ↓
Execute Batch on Confirmation Partition (test epoch begins)
    ↓
Deterministic Scientific Validation + Severity / Robustness Checks
    ↓
Deterministic Evidence Sufficiency
    ↓
Finding / Negative Result / Inconclusive (+ Human Review when triggered)
    ↓
Update Research State; follow-ups need fresh data
    ↓
Research Report / Publication Views
```

Mọi finding quan trọng phải có evidence, provenance và execution trace. Các giả thuyết mới do AI sinh ra phải được đánh dấu là chưa được xác minh cho đến khi được kiểm thử trong confirmation batch; hypothesis sinh ra sau khi đã đọc confirmation data chỉ được kiểm thử trên dữ liệu mới.

Kiến trúc nghiệp vụ tách bốn loại trách nhiệm: **reasoning agent** (generative reasoning) để lập kế hoạch, tạo và phản biện candidate hypothesis/experiment; **structured decision layer** để chọn trong một tập option đóng tại các decision point (intake, select, outbound check, next move) cùng confidence và khả năng abstain; **deterministic analytical tools** để tính toán facts khoa học, quyết định evidence sufficiency và official outcome; và **epistemic accounting** (Analysis Ledger, look budget, exploration/confirmation split) để ghi nhận hệ thống đã nhìn vào dữ liệu nào và đã kiểm thử gì. Decision layer chỉ được thu hẹp (narrow), không bao giờ nới rộng những gì deterministic validation cho phép; khi decision layer tắt, không khả dụng hoặc confidence thấp, deterministic rule quyết định và human review được kích hoạt theo trigger đã định nghĩa.

Platform đồng thời cung cấp cơ chế benchmark và evaluation nhằm đo lường độ chính xác, reliability, traceability và hiệu quả của AI Research Agent cũng như chất lượng của các decision gates.

Ngoài execution correctness, platform phải kiểm soát scientific validity của vòng lặp nghiên cứu: data leakage, multiple testing, post-hoc hypothesis, effect size, confidence interval, experiment dependency, conflicting evidence và reproducibility drift.

Từ v1.3, platform bổ sung một số capability theo tinh thần AI Scientist: ideation có reflection, prior-work assessment tham khảo, cùng bản thảo nghiên cứu có automated review và phê duyệt của researcher.

Từ v1.9, BRD được đồng bộ với kiến trúc đích [architecture.md](architecture.md): thứ tự các bước của Decision-Gated Research Loop được giữ làm **workflow floor** (deterministic playbook, luôn chạy được khi không có model), còn research loop được **agent điều hướng trong giới hạn budget và invariant** (BR-80) thay vì một luồng tuyến tính duy nhất. Loop tách **exploration** (thích nghi, không quyết định outcome) khỏi **confirmation** (một batch được đăng ký trước khi đọc dữ liệu, BR-79); official outcome được tính deterministic (BR-59); experiment chỉ chạy qua registered capabilities, không chạy code do model sinh (BR-22). Platform vẫn không phải tree-search engine không giới hạn: nhánh nghiên cứu chỉ là view có giới hạn trên Research Program (BR-81).

---

# 2. Business Context

Trong nghiên cứu dựa trên dữ liệu, researcher thường phải thực hiện nhiều bước:

```text
Research Question
    ↓
Form Hypothesis
    ↓
Understand Dataset
    ↓
Data Quality Check
    ↓
Cleaning
    ↓
Select Analysis Method
    ↓
Check Assumptions
    ↓
Run Experiment
    ↓
Interpret Result
    ↓
Refine Hypothesis
    ↓
Run Next Experiment
    ↓
Generate Finding
    ↓
Create Figure / Table
    ↓
Write Research Report
```

Quy trình này đòi hỏi kiến thức về:

- data analysis;
- statistical methods;
- research methodology;
- experiment design;
- interpretation;
- reproducibility;
- scientific reporting.

AI Research Experimentation Platform được đề xuất để hỗ trợ tự động hóa một phần đáng kể workflow trên nhưng vẫn giữ researcher trong vòng kiểm soát ở những quyết định quan trọng.

---

# 3. Business Problem Statement

## BP-01 — Research workflow có nhiều bước thủ công

Researcher thường phải chuyển đổi giữa nhiều công cụ để:

- kiểm tra dữ liệu;
- cleaning;
- viết code;
- chạy statistical test;
- tạo figure;
- lưu experiment result;
- viết report.

Điều này làm tăng thời gian xử lý và khó duy trì traceability.

---

## BP-02 — Việc lựa chọn statistical method yêu cầu chuyên môn

Researcher không phải lúc nào cũng biết:

- phép kiểm thử nào phù hợp;
- assumption nào cần kiểm tra;
- khi nào nên dùng parametric hoặc non-parametric method;
- khi nào cần regression;
- khi nào cần interaction analysis;
- khi nào cần replication.

Platform cần hỗ trợ method selection dựa trên question, variable type và data characteristics.

---

## BP-03 — Dataset nghiên cứu thường có ambiguity và data-quality issue

Dataset có thể khác nhau về:

- schema;
- định dạng;
- kiểu dữ liệu;
- missing values;
- duplicates;
- outliers;
- domain semantics;
- variable meaning.

AI phải hiểu dataset trước khi đưa ra experiment plan.

---

## BP-04 — AI có thể biến assumption thành conclusion

Một AI Agent có thể suy luận:

```text
Observation
→ Assumption
→ Conclusion
```

mà không có đủ evidence.

Platform phải phân biệt rõ:

```text
Observation
Hypothesis
Finding
Conclusion
```

và không được coi hypothesis là fact khi chưa được experiment xác minh.

---

## BP-05 — Research finding khó kiểm chứng nếu thiếu provenance

Một finding phải truy ngược được về:

```text
Finding
→ Hypothesis
→ Experiment
→ Dataset Version
→ Method
→ Assumptions
→ Registered Capability + Parameters
→ Raw Output
→ Statistical Result
```

Nếu không có provenance, researcher khó đánh giá tính hợp lệ và reproducibility.

---

## BP-06 — Một experiment đơn lẻ có thể chưa đủ

Kết quả E1 có thể tạo ra một câu hỏi mới hoặc hypothesis mới.

Ví dụ:

```text
H1
↓
E1
↓
Finding F1
↓
Generate H2
↓
E2
↓
Finding F2
```

Platform cần hỗ trợ iterative research thay vì chỉ chạy một phép thử rồi dừng.

---

## BP-07 — Khó đánh giá AI Research Agent một cách khách quan

Cần đo lường:

- task success;
- method selection quality;
- statistical correctness;
- retry;
- experiment count;
- latency;
- cost;
- human intervention;
- provenance coverage;
- unsupported claim rate;
- reproducibility.

---


## BP-08 — Iterative hypothesis generation làm tăng nguy cơ false positive

Khi agent liên tục sinh H2, H3, H4... từ kết quả trước và thực hiện nhiều statistical tests, xác suất tìm thấy kết quả có vẻ "significant" do ngẫu nhiên tăng lên.

Platform cần theo dõi số lượng hypothesis/test và áp dụng multiple-testing control khi phù hợp.

---

## BP-09 — Post-hoc hypothesis có thể bị trình bày như hypothesis ban đầu

Hypothesis được tạo sau khi quan sát E1 không tương đương hypothesis được xác định trước khi xem dữ liệu.

Platform phải phân biệt rõ:

```text
Initial / Confirmatory Hypothesis
Post-hoc / Exploratory Hypothesis
```

---

## BP-10 — Experiment phụ thuộc lẫn nhau

E2 có thể được tạo từ finding của E1. Nếu E1 sau đó bị invalidate, downstream hypothesis/finding có thể không còn đáng tin cậy.

Platform cần lưu dependency graph và hỗ trợ invalidate downstream artifacts.

---

## BP-11 — Evidence có thể xung đột

Một experiment có thể support một hypothesis trong khi experiment khác cho kết quả ngược lại.

Platform không được chỉ giữ result thuận lợi mà phải quản lý trạng thái conflicting evidence.

---

## BP-12 — Data leakage và reproducibility drift

Khi sử dụng predictive/ML analysis, preprocessing hoặc model selection có thể vô tình sử dụng thông tin từ test data.

Ngoài ra, cùng một experiment có thể khó tái lập nếu model, prompt, library hoặc environment thay đổi.

Platform phải hỗ trợ data split policy, leakage guard và reproducibility snapshot.

---

## BP-13 — LLM không nên tự quyết định mọi bước của research loop

LLM phù hợp cho việc sinh hypothesis, reasoning và lập kế hoạch nhưng các quyết định như:

- hypothesis nào đáng theo đuổi;
- evidence đã đủ hay chưa;
- có cần replicate;
- có cần alternative method;
- có cần human review;

nếu chỉ dựa vào free-form reasoning có thể khó kiểm soát, khó đo lường và thiếu confidence rõ ràng.

Platform cần một **structured decision layer** tách biệt với generative reasoning để chọn trong các option đã được deterministic validation cho phép tại những decision point có cấu trúc. Ngược lại, việc evidence đã đủ để tạo official outcome hay chưa là một **fact được tính deterministic** theo quy tắc đã đăng ký trước, không phải một quyết định của model.

---

## BP-14 — Experiment chạy thành công về kỹ thuật nhưng evidence vẫn có thể chưa đủ

Một experiment không lỗi code và trả ra statistic hợp lệ không đồng nghĩa research question đã có đủ evidence.

Platform phải phân biệt:

```text
Technical Failure
≠
Scientific Insufficiency
```

Scientific insufficiency phải được ghi nhận thành outcome `Inconclusive` hợp lệ, và có thể dẫn tới next move:

```text
Need More Evidence      (exploration trước test epoch / follow-up trên dữ liệu mới sau đó)
Try Alternative Method
Replicate on Fresh Data
Human Review            (theo trigger đã định nghĩa)
```

thay vì chỉ trả về finding hoặc cố retry cùng một execution.

---

## BP-18 — Agent search có thể "chế tạo" finding dù từng bước đều hợp lệ

Khi agent được tự do khám phá dữ liệu, thử nhiều hướng rồi kiểm thử lại chính hướng đã "trông có vẻ tốt" trên cùng dữ liệu, kết quả significant có thể chỉ là sản phẩm của quá trình tìm kiếm. Mỗi phép kiểm thử riêng lẻ có thể đúng, nhưng quá trình tìm kiếm tổng thể không được kiểm soát.

Platform cần ghi nhận mọi lần phân tích dữ liệu (Analysis Ledger), tách dữ liệu dùng để khám phá khỏi dữ liệu dùng để xác nhận, và cố định confirmation batch trước khi đọc dữ liệu xác nhận.

---

## BP-16 — Ý tưởng do AI sinh có thể không mới hoặc đã được nghiên cứu

Agent có thể đề xuất hypothesis đã có trong tài liệu và xem đó là mới. Platform cần hỗ trợ liên hệ ý tưởng với prior work ở mức tham khảo, trong phạm vi nguồn đã tìm (coverage), không gắn nhãn "novel" và không bảo đảm novelty.

---

## BP-17 — Bản thảo do AI viết dễ có số liệu, hình và trích dẫn sai

Các đánh giá độc lập của hệ thống AI Scientist đời đầu ghi nhận lỗi thí nghiệm, hình thiếu, placeholder và trích dẫn ít hoặc cũ. Bản thảo phải truy được về experiment log và được review trước khi sử dụng.

---

# 4. Business Objectives

## BO-01 — Hỗ trợ researcher từ research question đến research finding

Platform cần hỗ trợ một workflow thống nhất:

```text
Research Question
→ Hypothesis
→ Experiment Planning
→ Analysis
→ Validation
→ Finding
```

---

## BO-02 — Hỗ trợ tự động chọn phương pháp phân tích phù hợp

AI Agent phải có khả năng:

- hiểu research question;
- xác định variable type;
- sinh candidate methods;
- kiểm tra assumptions;
- chọn method phù hợp;
- fallback sang method khác nếu assumption không đạt.

---

## BO-03 — Hỗ trợ iterative hypothesis refinement

Sau một experiment, agent có thể:

- giữ hypothesis hiện tại;
- reject hypothesis;
- đánh dấu inconclusive;
- sinh hypothesis mới;
- đề xuất experiment tiếp theo.

---

## BO-04 — Tăng khả năng kiểm chứng research finding

Finding quan trọng phải có evidence và provenance.

---

## BO-05 — Bảo vệ dữ liệu nghiên cứu gốc

Dataset gốc không được ghi đè.

Mọi transformation phải tạo version mới.

---

## BO-06 — Giữ human control ở các điểm rủi ro

AI phải yêu cầu researcher xác nhận khi:

- data ambiguity;
- destructive cleaning;
- uncertain business/scientific meaning;
- unclear variable semantics;
- experiment có nhiều lựa chọn có ý nghĩa khác nhau.

---

## BO-07 — Tăng reproducibility

Một experiment phải có đủ metadata để người khác có thể hiểu cách kết quả được tạo ra.

---

## BO-08 — Đánh giá AI Research Agent bằng benchmark và metric định lượng

Platform cần hỗ trợ systematic evaluation và ablation study.

---


## BO-09 — Kiểm soát multiple testing và exploratory research

Platform phải phân biệt confirmatory và exploratory hypothesis, đồng thời theo dõi số lượng phép kiểm thử được thực hiện. Mọi phân tích trên dữ liệu phải được ghi vào Analysis Ledger; exploration chỉ gợi ý, còn confirmation batch được cố định trước khi đọc confirmation data và chịu family-wise error control (BR-79).

---

## BO-10 — Quản lý dependency và conflicting evidence

Platform phải biểu diễn quan hệ phụ thuộc giữa hypothesis, experiment và finding; đồng thời giữ được evidence trái chiều thay vì loại bỏ.

---

## BO-11 — Đánh giá practical significance thay vì chỉ p-value

Khi phù hợp, platform phải xem xét effect size, confidence interval và uncertainty bên cạnh statistical significance.

---

## BO-12 — Ngăn data leakage và tăng reproducibility

Experiment phải có data split policy khi cần và lưu execution snapshot đủ để tái lập.

---

## BO-13 — Tách generative reasoning khỏi structured decision making

Platform phải cho phép reasoning agent tập trung vào:

- lập kế hoạch và tạo candidate hypothesis;
- reasoning chuyên sâu;
- thiết kế experiment;
- phản biện, giải thích và refinement;

trong khi structured decision layer chọn trong tập option đóng tại các decision point (intake, select, outbound check, next move), deterministic hooks/gates quyết định lựa chọn có được phép có hiệu lực hay không, và chỉ commit step mới thay đổi state.

---

## BO-14 — Tự động kiểm tra evidence sufficiency trước khi chấp nhận finding

Sau deterministic scientific validation và severity checks, platform phải tính deterministic, theo quy tắc đã đăng ký trước, rằng evidence dẫn tới:

- Finding (supported / contradicted);
- Negative Result (không có effect có ý nghĩa thực tế);
- hoặc Inconclusive;

và tách riêng các next move (thêm evidence, alternative method, replicate trên dữ liệu mới, human review) khỏi việc quyết định outcome.

---

## BO-15 — Hỗ trợ confidence-based human escalation

Human escalation phải có mức sàn là các trigger deterministic đã định nghĩa; khi decision confidence thấp hoặc decision layer abstain, platform chỉ được **thêm** escalation, không bao giờ dùng confidence cao để bỏ qua trigger bắt buộc.

---

## BO-17 — Ideation có cấu trúc và nhận thức về prior work

Candidate hypothesis phải có idea record, được phản biện (critique) trước khi vào selection, và có prior-work assessment tham khảo, giới hạn theo phạm vi nguồn đã tìm, khi có nguồn tài liệu.

---

## BO-19 — Bản thảo nghiên cứu có thể review

Platform hỗ trợ tạo bản thảo từ validated findings với số liệu và trích dẫn kiểm chứng được, có review tự động và phê duyệt của researcher.

---

## BO-20 — Xử lý candidate hypothesis ngang điểm một cách có kiểm soát

Khi selection không thể phân biệt rõ candidate tốt nhất do điểm/confidence quá sát nhau, platform phải cho phép các candidate ngang điểm cùng vào **một confirmation batch** trong giới hạn look budget (BR-78), thay vì ép chọn một candidate duy nhất dựa trên khác biệt điểm số không đáng tin cậy hoặc mở nhiều nhánh thực thi song song, đồng thời giữ nguyên kiểm soát về chi phí, multiple-testing và audit.

---

## BO-21 — Agent-directed research trong giới hạn budget và invariant

Platform phải để reasoning agent điều hướng research loop (khám phá nhiều bước, sửa output khi bị từ chối, phản biện độc lập, quay lại khám phá thêm) trong khuôn khổ workflow floor, budget và các invariant deterministic, sao cho mọi nâng cấp của agent không làm mất bất kỳ bảo đảm nào mà workflow tuyến tính đã có.

---

# 5. Success Metrics

Các target dưới đây là đề xuất ban đầu và cần được supervisor xác nhận.

| ID | Objective | Metric | Target đề xuất |
|---|---|---|---:|
| KPI-01 | Dataset understanding | Profiling completion rate | ≥ 95% dataset hợp lệ |
| KPI-02 | Method selection | Appropriate-method selection rate | ≥ 80% trên benchmark |
| KPI-03 | Research execution | Experiment success rate | ≥ 75% |
| KPI-04 | Trustworthiness | Important findings with evidence | 100% |
| KPI-05 | Human control | Destructive changes without approval | 0 |
| KPI-06 | Traceability | Experiments with execution trace | 100% |
| KPI-07 | Reproducibility | Experiments with reproducibility metadata | 100% |
| KPI-08 | Data safety | Original dataset preserved | 100% |
| KPI-09 | Hypothesis discipline | New hypotheses clearly marked unverified | 100% |
| KPI-10 | Evaluation | Benchmark tasks with measurable score | 100% |
| KPI-11 | Scientific validity | Hypotheses with origin classification | 100% |
| KPI-12 | Multiple testing | Eligible multi-test workflows with correction/justification | 100% |
| KPI-13 | Dependency | Downstream artifacts linked to parent evidence | 100% |
| KPI-14 | Reproducibility | Official experiments with execution snapshot | 100% |
| KPI-15 | Hypothesis gate | Selected hypothesis/direction has structured decision record | 100% |
| KPI-16 | Evidence gate | Confirmation-batch result receives a deterministic sufficiency outcome (Finding / Negative Result / Inconclusive) | 100% |
| KPI-17 | Decision safety | Deterministic review triggers fired and escalated regardless of decision-layer confidence | 100% |
| KPI-18 | Decision evaluation | Decision-gate quality measured on benchmark tasks | 100% |
| KPI-21 | Ideation quality | Candidate hypotheses có idea record và reflection trước selection gate | 100% |
| KPI-22 | Manuscript integrity | Số liệu trong bản thảo truy được về experiment log | 100% |
| KPI-23 | Manuscript integrity | Trích dẫn trong bản thảo được xác minh là tồn tại | 100% |
| KPI-26 | Gate accuracy | Decision accuracy của structured decision layer so với baseline rule-based | Không thấp hơn baseline; ngưỡng do supervisor xác nhận |
| KPI-27 | Search integrity | Analyses on data recorded in Analysis Ledger (exploration và confirmation) | 100% |
| KPI-28 | Search integrity | False-finding rate trên null / structured-null benchmark data | ≤ α; đề xuất α = 0.05 (PRD §53.1) |

---

# 6. Stakeholders

## 6.1. System Administrator

### Mục tiêu

Quản lý hệ thống, user, model và operational monitoring.

### Nhu cầu

- quản lý tài khoản;
- quản lý role và quyền;
- cấu hình AI model;
- xem logs;
- xem usage;
- xem token/cost;
- theo dõi agent failures;
- theo dõi system performance.

---

## 6.2. Research Project Manager

### Mục tiêu

Quản lý research project, dataset, member, experiment history và output.

### Nhu cầu

- tạo research project;
- quản lý member;
- quản lý dataset;
- theo dõi experiment;
- theo dõi finding;
- xem research report;
- xem project summary.

---

## 6.3. Researcher / Data Analyst

### Mục tiêu

Thực hiện nghiên cứu dựa trên dữ liệu với sự hỗ trợ của AI.

### Nhu cầu

- upload dataset;
- nhập research question;
- nhập hypothesis;
- xem profiling;
- cleaning;
- chạy experiment;
- xem statistical result;
- kiểm tra assumption;
- xem evidence;
- xem execution trace;
- tạo figure/table;
- tạo research report.

---

## 6.4. Reviewer / Stakeholder

### Mục tiêu

Đánh giá output nghiên cứu mà không cần trực tiếp chạy experiment.

### Nhu cầu

- xem research finding;
- xem figure/table;
- xem evidence;
- xem report;
- xem experiment trace;
- gửi feedback.

---

# 7. Current State — As-Is

```text
Researcher
    ↓
Define Research Question
    ↓
Write Hypothesis
    ↓
Open Dataset
    ↓
Inspect Variables
    ↓
Clean Data
    ↓
Choose Statistical Method
    ↓
Write Code
    ↓
Run Analysis
    ↓
Check Result
    ↓
Interpret
    ↓
Create Figure
    ↓
Generate New Question
    ↓
Repeat Manually
    ↓
Write Report
```

## Pain Points

### P1 — Nhiều thao tác lặp lại

Profiling, cleaning, assumption checking và reporting lặp lại giữa nhiều experiment.

### P2 — Method selection phụ thuộc chuyên môn

Chọn sai test có thể dẫn đến kết luận không hợp lệ.

### P3 — Research iteration khó quản lý

H1 → E1 → H2 → E2 thường bị lưu rời rạc giữa notebook, file và document.

### P4 — Khó phân biệt hypothesis và confirmed finding

AI hoặc researcher có thể diễn giải quá mức một result chưa đủ evidence.

### P5 — Khó truy vết finding

Một finding có thể không rõ được tạo từ experiment nào.

### P6 — Khó tái lập

Thiếu code, dataset version, assumptions hoặc environment làm experiment khó reproduce.

### P7 — Khó đánh giá AI

Không có benchmark thì khó chứng minh agent thực sự chọn method và reason tốt.

---

# 8. Future State — To-Be

```text
Researcher
    ↓
Create/Open Research Project
    ↓
Upload Dataset
    ↓
Automatic Profiling + Data Card
    ↓
Enter Research Brief (Research Question, H0 / H1, context, margins)
    ↓
Brief Intake (complete / restate / clarify)
    ↓
Exploration / Confirmation Split + Freeze Research Protocol
    ↓
Build Research State + Research Program
    ↓
Exploration loop (agent-directed, exploration partition, ledgered)
├── Generate Candidate Hypotheses / Directions
├── Exploration Analyses via Registered Capabilities
├── Critique → Refine
├── Structured Selection (decision layer: select)
└── Next Move (decision layer): explore further / alternative / critique / go on
    ↓
Register Confirmation Batch
(estimand, primary analysis, candidate methods + assumptions,
 δ_F / δ_N, success/falsification criteria, look budget)
    ↓
Execute Batch on Confirmation Partition (test epoch)
    ↓
Deterministic Scientific Validation + Severity + Robustness
    ↓
Deterministic Evidence Sufficiency
├── Finding (supported / contradicted)
├── Negative Result
└── Inconclusive
    (+ Human Review when a deterministic trigger fires)
    ↓
Update Research State
    ↓
Next Move / Stopping Criteria
├── Follow-up → new run on fresh data
└── Stop → Final Outcomes
                  ↓
            Figures / Tables
                  ↓
            Research Report
```

---


# 8.1. Gap Analysis

Gap Analysis liên kết trực tiếp giữa pain point hiện tại, khoảng trống cần giải quyết, target state và Business Requirement tương ứng.

| ID | Pain Point / Current State | Gap | Target State | Related BR |
|---|---|---|---|---|
| GA-01 | Research workflow gồm nhiều bước rời rạc và lặp lại | Không có một workflow thống nhất từ question đến finding | Một research lifecycle thống nhất có planning, execution, validation và iteration | BR-13 → BR-30 |
| GA-02 | Method selection phụ thuộc nhiều vào kinh nghiệm cá nhân | Khó đảm bảo phương pháp phù hợp và assumptions được kiểm tra | Agent sinh candidate methods, kiểm tra assumptions và ghi rationale | BR-18, BR-19, BR-20, BR-24 |
| GA-03 | Dataset mới thường có ambiguity, missing values hoặc quality issues | Dễ xử lý sai dữ liệu trước khi analysis | Dataset được validate, profile, review và version trước khi experiment | BR-04 → BR-12 |
| GA-04 | Hypothesis, assumption và finding có thể bị trộn lẫn | Dễ biến hypothesis hoặc association thành fact/causal claim | Hypothesis có status/origin rõ; finding chỉ được chấp nhận sau validation | BR-14, BR-15, BR-27, BR-42, BR-48 |
| GA-05 | Finding khó kiểm chứng hoặc tái lập | Thiếu provenance, execution trace và reproducibility metadata | Official finding truy vết được về experiment, dataset, code và snapshot | BR-34 → BR-37, BR-55 |
| GA-06 | Một experiment chạy thành công có thể vẫn chưa đủ evidence | Không có cơ chế quyết định tiếp tục nghiên cứu hay dừng | Evidence sufficiency tính deterministic (Finding / Negative Result / Inconclusive); next move quyết định tiếp tục, replicate, review hoặc dừng | BR-59, BR-60, BR-61 |
| GA-07 | Nhiều hypothesis/tests có thể làm tăng false-positive risk | Thiếu phân biệt initial/post-hoc và multiple-testing control | Hypothesis origin, correction, effect size và CI được quản lý rõ | BR-48, BR-49, BR-50 |
| GA-08 | Experiment phụ thuộc nhau và có thể tạo evidence xung đột | Không theo dõi downstream impact khi evidence thay đổi | Dependency graph, invalidation và conflict preservation | BR-51, BR-52, BR-53 |
| GA-09 | LLM free-form reasoning có thể tự quyết định quá nhiều | Bounded decisions khó audit và thiếu confidence rõ ràng | Tách reasoning agent, structured decision layer (narrow-only) và deterministic hooks/gates | BR-56 → BR-63, BR-80 |
| GA-10 | Khó chứng minh kiến trúc agentic tốt hơn baseline | Demo thành công đơn lẻ không đủ bằng chứng | Benchmark, quantitative metrics, ablation và gate evaluation | BR-43 → BR-46, BR-63 |
| GA-12 | Ý tưởng do AI sinh có thể đã được nghiên cứu | Không có đánh giá quan hệ với prior work | Idea record có critique và Prior-Work Assessment tham khảo, có coverage record | BR-64, BR-65 |
| GA-13 | Bản thảo do AI viết khó kiểm chứng | Số liệu, hình và trích dẫn không truy vết được; thiếu review | Manuscript draft liên kết log, automated review và human approval | BR-73, BR-74, BR-75 |
| GA-14 | Selection Gate phải ép chọn 1 candidate dù điểm/confidence giữa các candidate top gần như ngang nhau | Ép chọn cứng khi chênh lệch điểm nằm trong sai số đo lường của chính decision model có thể loại bỏ oan một hướng nghiên cứu tốt | Candidate ngang điểm cùng vào một confirmation batch trong look budget, chung một error-control family | BR-78, BRule-35 |
| GA-15 | Agent tự do khám phá rồi kiểm thử lại trên cùng dữ liệu | Quá trình tìm kiếm có thể tạo finding giả dù từng bước hợp lệ | Exploration/confirmation split, Analysis Ledger, look budget và confirmation batch cố định trước test epoch | BR-79, BRule-36, BRule-37 |
| GA-16 | Research loop tuyến tính một LLM call mỗi bước không thể khám phá nhiều bước, sửa output hoặc quay lại | Agent bị giới hạn ở single-path, còn tự do không kiểm soát thì mất bảo đảm | Agent loop trên workflow floor, decision points, hooks và budget | BR-80, BR-81, BRule-38 |
| GA-17 | Output chỉ là một report; khó kiểm tra số liệu và quá trình | Report có thể chứa số/claim không truy được, lộ dữ liệu cá nhân hoặc ẩn kết quả âm | Chuỗi artifact có kiểu, publication view được render, integrity audit và statistical disclosure control | BR-83, BR-84 |
| GA-18 | Agent thiếu domain knowledge, theory và kiểm tra method trước khi tin | Reasoning nông, method không phù hợp với cấu trúc dữ liệu, giải thích hậu kiểm | Knowledge Layer chỉ thu hẹp, Simulation Lab, theory kiểm thử qua implication đăng ký trước, campaign cho nghiên cứu nhiều run | BR-82, BR-85, BR-86, BR-87 |

**Kết luận Gap Analysis:** mọi capability chính trong scope đều phải giải quyết một gap cụ thể; capability không truy vết được về pain point/objective không nên được đưa vào core scope.

---

# 9. Scope

## 9.1. Core / Must Have

### User & Research Project

- Authentication
- RBAC
- Research project management
- Member management

### Dataset

- Dataset upload
- Dataset validation
- Data profiling
- Data Card
- Data-quality review
- Cleaning proposal
- Human approval
- Dataset versioning

### Research Context

- Research question
- H0 / H1 definition
- Domain context
- Analysis goal
- Optional literature/context notes
- Research State built from previous hypotheses, experiments, findings, conflicts and uncertainty

### Decision & Verification Gates

- Agent-directed research loop over a deterministic workflow floor (BR-80)
- Candidate hypothesis/direction generation
- Structured decision layer at decision points: intake, select, outbound check, next move
- Decision confidence / uncertainty / abstention, with deterministic rule fallback
- Deterministic evidence sufficiency: Finding / Negative Result / Inconclusive
- Next moves: explore further / alternative method / replicate on fresh data / human review / stop
- Deterministic review triggers as the floor of human escalation
- Decision audit trail

### Experimentation

- Experiment planner (estimand before method)
- Candidate method generation
- Assumption checking
- Method selection
- Statistical analysis via registered capabilities (no model-generated code)
- Triangulation / bounded robustness across methods (reported, never selected from)
- Technical retry inside the execution tool
- Hypothesis refinement
- Exploration / confirmation split, Analysis Ledger, look budget, confirmation batch
- Hypothesis origin classification: declared / generated before test / post-test
- Multiple-testing control
- Effect size & confidence interval
- Data leakage guard where applicable
- Experiment dependency graph
- Conflicting evidence handling
- Uncertainty/confidence recording
- Stopping criteria
- Replication where appropriate

### Research Output

- Research finding / negative result / inconclusive outcome with claim level
- Statistical result
- Figure/table
- Methodology summary
- Limitations
- Research report
- Typed research artifacts with visibility (BR-83)
- Publication views: preregistration, disclosure bundle, analysis package, lineage (BR-84)
- Integrity audit and statistical disclosure control before `publishable` (BR-84)

### Trust & Reproducibility

- Provenance
- Execution trace
- Experiment history
- Dataset lineage
- Reproducibility metadata
- Reproducibility snapshot
- Downstream invalidation
- Evidence conflict tracking

### Evaluation

- Telemetry
- Benchmark execution
- Method-selection evaluation
- Hypothesis-gate evaluation
- Evidence-gate evaluation
- Confidence/calibration evaluation
- Quantitative metrics
- Ablation study

### Ideation Quality

- Structured idea record & critique

> **Implementation note:** TypeSafe/Jev là một candidate cho structured decision layer. BRD chỉ yêu cầu capability `Structured Decision Layer` (decision points với mode `on` / `shadow` / `off`); vendor/model cụ thể được quyết định ở PRD/SDD để tránh khóa kiến trúc vào một provider. Kiến trúc đích và các invariant được mô tả tại [architecture.md](architecture.md).

---

## 9.2. Supporting / Should Have

- Project summary dashboard
- Reviewer view
- Cost monitoring
- Multi-dataset analysis
- Figure reviewer
- Finding validator
- Model configuration
- Research report customization
- Prior-work assessment (tham khảo, coverage-scoped)
- Research Program branch map (bounded, view-only)
- Research Knowledge Layer: domain packs, method lessons (BR-82)
- Simulation Lab trước registration (BR-85)
- Theory & observable implications (BR-86)
- Research campaign liên kết nhiều run (BR-87)
- Research map và portfolio view với named lens (BR-84)
- Figure aggregation & visual feedback
- Manuscript draft generation
- Automated manuscript review

---

## 9.3. Nice to Have

- Literature connector
- Database connector
- Scheduled experiment
- Collaborative report editing
- Advanced statistical models
- Automatic citation assistance
- More advanced experiment search

---

## 9.4. Out of Scope

- Fully autonomous literature discovery
- Fully autonomous paper publication
- Automatic novelty guarantee
- Execution of model-generated code, shell commands or unrestricted imports
- Unbounded tree search over experiments
- Training custom foundation models
- Large-scale distributed big data
- Real-time streaming analytics
- Image/audio/video scientific analysis
- Mobile application

---

# 10. Business Requirements

## BR-01 — Authentication

Hệ thống phải cho phép người dùng đăng nhập và truy cập theo danh tính hợp lệ.

---

## BR-02 — Role-Based Access Control

Hệ thống phải phân quyền theo role và project scope.

---

## BR-03 — Research Project Workspace

Hệ thống phải cho phép tạo một research project chứa:

- members;
- datasets;
- research questions;
- hypotheses;
- experiments;
- findings;
- figures/tables;
- reports.

---

## BR-04 — Dataset Upload

Researcher phải có khả năng upload structured dataset.

Target format:

- CSV;
- XLSX;
- JSON;
- Parquet;
- TSV.

---

## BR-05 — Dataset Validation

Hệ thống phải kiểm tra dataset trước khi sử dụng.

---

## BR-06 — Automatic Dataset Understanding

Hệ thống phải tự hiểu schema, variable type và basic data characteristics.

---

## BR-07 — Data Profiling

Hệ thống phải cung cấp:

- row/column count;
- data type;
- missing values;
- duplicates;
- distribution;
- cardinality;
- outliers;
- sample values;
- potential relationships.

Profile trên toàn snapshot chỉ chứa structural facts (kiểu, missingness từng biến, cardinality, identifier, duplicate, sentinel code). Mọi đại lượng liên hệ hai biến (potential relationships, missingness của biến này theo biến khác) chỉ được tính trên exploration partition (BR-79), để profiling không đọc confirmation data trước test epoch.

---

## BR-08 — Data Quality Review

Researcher phải có khả năng review issue trước experiment.

---

## BR-09 — Cleaning Recommendation

AI phải đề xuất cleaning plan và nêu risk/information loss.

---

## BR-10 — Human Approval

Destructive hoặc semantically risky change phải được user approve.

---

## BR-11 — Original Dataset Preservation

Raw dataset không được ghi đè.

---

## BR-12 — Dataset Versioning

Mỗi transformation phải tạo dataset version mới. Research run bắt đầu trên một snapshot version đã được approve; cleaning sau khi split là protocol deviation, và lựa chọn cleaning có thể thay đổi outcome (loại outlier, recode) được đăng ký thành robustness specification (BR-21) thay vì áp dụng ngầm.

---

## BR-13 — Research Question Definition

Researcher phải có khả năng nhập research question.

---

## BR-14 — Hypothesis Definition

Researcher phải có khả năng định nghĩa:

```text
H0
H1
```

hoặc để agent đề xuất hypothesis draft cần researcher review.

---

## BR-15 — Hypothesis Status

Mỗi hypothesis phải có status:

```text
Proposed
Unverified
Supported
Rejected
Inconclusive
Superseded
```

---

## BR-16 — Research Context

Hệ thống phải cho phép lưu:

- domain context;
- variable meaning;
- research goal;
- important assumptions;
- optional prior knowledge.

Research question, context và dataset tạo thành **Research Brief** — input contract của một run. Ngoài các trường trên, brief có thể chứa: intended use và effect nhỏ nhất có ý nghĩa (δ_F / δ_N), declared hypotheses, target claim level, resolution criteria, prior exposure với dataset, data dictionary, scope/constraints và consent cho gửi dữ liệu ra model provider. Trường thiếu được ghi là **gap** giới hạn những gì run có thể claim. Trước khi đọc bất kỳ giá trị dữ liệu nào, hệ thống đánh giá brief (intake: proceed / restate / clarify); yêu cầu vượt quá claim level đạt được sẽ bị restate, không bao giờ bị nới rộng. Context và prior knowledge chỉ định hướng reasoning, không bao giờ là evidence.

Trước khi run bắt đầu, researcher phải xem được **pre-run preview** cho các giá trị đã chọn: precision plan, phân phối outcome dự kiến, ước tính chi phí, answerability của từng câu hỏi trong brief, và evidential status có thể đạt được trên dataset lineage này.

---

## BR-17 — Experiment Planning

Agent phải tạo experiment plan dựa trên:

- research question;
- hypothesis;
- dataset;
- variable types;
- data quality;
- domain context.

Plan phải xác định **estimand trước method**: population, variables và conditioning set, summary measure, cách xử lý missing/outlier, target claim level; sau đó mới đến primary analysis, success/falsification criteria, Finding threshold δ_F và equivalence margin δ_N. Các trường này được cố định khi proposal được đăng ký vào confirmation batch (BR-79).

---

## BR-18 — Candidate Method Generation

Agent phải có khả năng sinh một hoặc nhiều candidate analytical methods.

Ví dụ:

```text
Pearson
Spearman
T-test
Mann–Whitney
ANOVA
Kruskal–Wallis
Chi-square
Regression
Interaction Analysis
```

---

## BR-19 — Assumption Checking

Trước khi chạy một statistical method, agent phải kiểm tra các assumption liên quan.

Ví dụ:

- variable type;
- normality;
- independence;
- linearity;
- homoscedasticity;
- expected frequency;
- sample size;
- outliers.

---

## BR-20 — Method Selection

Agent phải chọn method phù hợp dựa trên assumption và research goal.

Nếu assumption không đạt, agent phải:

- chọn alternative method;
- hoặc yêu cầu user clarification;
- hoặc đánh dấu experiment không phù hợp.

---

## BR-21 — Limited Experiment Branching (Triangulation & Bounded Robustness)

Khi nhiều method hoặc analytic specification hợp lệ cho cùng một estimand, hệ thống có thể chạy chúng để **triangulate** và đánh giá robustness:

```text
Registered Proposal (one estimand, one primary analysis)
├── Primary: Method A
├── Sensitivity: Method B
└── Sensitivity: Method C / alternative specification
```

Primary analysis được đăng ký trước; các method/specification khác là sensitivity analysis được báo cáo cùng primary, chỉ có thể làm yếu claim và **không bao giờ được chọn ra thay cho primary** (không chọn nhánh "significant nhất"). Số specification bị giới hạn và được đăng ký trước test epoch.

---

## BR-22 — Experiment Execution

Agent phải thực hiện experiment chỉ thông qua **registered capabilities** có typed parameters do hệ thống kiểm soát (ví dụ statistical test, profiling, chart). Hệ thống không được chạy code, SQL, shell command hoặc import không giới hạn do model sinh ra, ở cả exploration lẫn confirmation.

---

## BR-23 — Technical Retry (Self-Correction)

Nếu execution lỗi, hệ thống có thể:

```text
Observe Error (typed error + repair hint)
→ Retry inside the registered capability, or correct typed parameters
→ Retry
```

trong giới hạn cho phép. Technical retry giữ nguyên experiment, không tạo experiment hoặc look mới, và không sửa scientific intent (hypothesis, estimand, method, partition, criteria); thay đổi các trường đó là scientific refinement (BR-60).

---

## BR-24 — Experiment Validation

Sau khi execution thành công, hệ thống phải validate:

- statistical result;
- assumptions;
- output consistency;
- possible data leakage;
- unsupported interpretation.

---

## BR-25 — Replication

Khi cần, experiment có thể chạy nhiều lần hoặc qua nhiều sampling/run để đánh giá stability.

Hai loại cần phân biệt:

- **Stability check** (resampling, seed, bootstrap trên cùng dữ liệu): được đăng ký cùng proposal như severity/robustness check, tạo ledger entry nhưng không tạo look và chỉ có thể làm yếu claim.
- **Replication** như bằng chứng mới: phải chạy trên dữ liệu mới (snapshot mới hoặc sealed partition chưa đọc) dưới dạng follow-up (BR-60); không được replicate trên dữ liệu đã đọc trong run rồi coi đó là evidence độc lập.

---

## BR-26 — Research Finding Generation

Agent phải chuyển raw experiment result thành research finding dễ hiểu.

---

## BR-27 — Finding Status

Finding phải có status:

```text
Preliminary
Validated
Inconclusive
Rejected
Needs Review
```

Ngoài status, mỗi outcome chính thức phải có **outcome category** do BR-59 tính deterministic (`Finding — supported`, `Finding — contradicted`, `Negative Result`, `Inconclusive`) và **claim level** gồm claim type (descriptive / associational / predictive / causal) và evidential status (hypothesis-generating / held-out / confirmatory). Negative Result có vị thế ngang Finding trong report.

Claim-level gate là deterministic và xét riêng từng trục:

| Claim type | Yêu cầu tối thiểu |
|---|---|
| Descriptive | Population, sampling design và weights được khai báo |
| Associational | Estimand, δ_F / δ_N, look budget, severity checks; weights được áp dụng nếu có |
| Predictive | Held-out evaluation, baseline, leakage và calibration checks |
| Causal (có điều kiện) | Identification từ assumption đã được endorse (BRule-07), sensitivity analysis, negative controls |

| Evidential status | Yêu cầu |
|---|---|
| Hypothesis-generating | Mọi exploration hoặc post-test result |
| Held-out | Được kiểm thử một lần trong batch cố định trước khi đọc dữ liệu, có family-wise error control |
| Confirmatory | Đăng ký trong Research Protocol và kiểm thử trên sealed partition hoặc snapshot mới, error control ít nhất nghiêm ngặt như held-out |

Capability exploratory association trong MVP đạt tối đa associational / held-out; các claim type khác và status confirmatory cần thay đổi contract có test riêng. Outcome chỉ chuyển `active → superseded | retracted` qua event append-only có lý do; outcome không bị xoá.

---

## BR-28 — Hypothesis Refinement

Dựa trên finding, agent có thể đề xuất hypothesis mới.

Ví dụ:

```text
H1
↓
E1
↓
F1
↓
H2
```

Hypothesis mới phải được đánh dấu `Unverified`.

Trước test epoch, refinement là exploration trên exploration partition. Sau test epoch, hypothesis mới có origin `post_test` và chỉ được đưa vào **follow-up** để kiểm thử trên dữ liệu mới (snapshot mới hoặc sealed partition chưa đọc); không được kiểm thử lại trên dữ liệu đã đọc trong run.

---

## BR-29 — Experiment-Finding-Hypothesis Linkage

Hệ thống phải lưu quan hệ:

```text
Hypothesis
→ Experiment
→ Finding
→ Next Hypothesis
```

---

## BR-30 — Stopping Criteria

Research loop phải dừng khi:

- research question đã được trả lời đủ mức;
- không còn meaningful hypothesis;
- hết experiment budget;
- hết step/time limit;
- researcher dừng;
- result vẫn inconclusive sau giới hạn cho phép.

**Hard stop** (resolution criteria đạt, hết look/exploration/resource budget, mọi câu hỏi còn lại unanswerable, cần review, vi phạm policy) được quyết định deterministic. Đề xuất dừng sớm do decision layer đưa ra chỉ được phép ở autonomy level cao nhất (BR-80) và chỉ có thể dừng sớm hơn, không kéo dài run. Hệ thống không được dừng khi confirmation batch đã đăng ký còn thiếu outcome hoặc đang chờ review. Budget được tính trên toàn run (gồm mọi subagent/branch), không tính riêng lẻ.

---

## BR-31 — Statistical Analysis

Platform phải hỗ trợ các method cơ bản:

- correlation;
- t-test;
- Mann–Whitney;
- chi-square;
- ANOVA;
- Kruskal–Wallis;
- linear regression;
- logistic regression;
- interaction analysis;
- basic time-series analysis.

---

## BR-32 — Visualization

Agent phải có khả năng tạo figure phù hợp với research question và statistical result.

---

## BR-33 — Figure Review

Hệ thống nên kiểm tra:

- chart type;
- axis labels;
- units;
- legend;
- misleading scale;
- caption consistency;
- figure supports finding.

---

## BR-34 — Research Finding Provenance

Mọi finding quan trọng phải truy vết được về:

- research question;
- hypothesis;
- experiment;
- dataset version;
- selected method;
- assumptions;
- registered capability, version và typed parameters;
- data partition và test epoch;
- raw output;
- statistical result.

Provenance phải trả lời theo cả hai chiều: từ outcome ngược về nguồn (outcome lineage: evidence → checks → experiment → proposal và critique → hypothesis và origin → question → protocol → brief) và từ một nguồn (policy version, domain pack version, snapshot, model version) tới mọi outcome phụ thuộc (**reverse provenance**), để truy được ảnh hưởng khi một version bị phát hiện lỗi.

---

## BR-35 — Execution Trace

Researcher phải có khả năng xem từng step agent đã thực hiện.

---

## BR-36 — Experiment History

Hệ thống phải lưu experiment history.

---

## BR-37 — Reproducibility Metadata

Mỗi experiment phải lưu tối thiểu:

- dataset version;
- method;
- parameters;
- registered capability và version;
- execution time;
- environment info;
- output;
- random seed nếu có;
- agent/model configuration.

---

## BR-38 — Research Figure/Table Output

Hệ thống phải hỗ trợ tạo figure/table phục vụ report.

---

## BR-39 — Methodology Summary

Agent phải có khả năng sinh summary mô tả:

- dataset;
- cleaning;
- variables;
- method;
- assumptions;
- experiment procedure.

---

## BR-40 — Limitations

Agent phải hỗ trợ ghi rõ limitations của analysis, được phân loại theo validity type (statistical conclusion, construct, internal, external). Một số limitation là bắt buộc và được thêm deterministic, ví dụ: missing data vượt ngưỡng policy, severity check fail, gap trong Research Brief, restatement của claim yêu cầu, operationalization dựa trên suy đoán tên cột.

---

## BR-41 — Research Report Generation

Platform phải tạo research report từ validated outcomes: Finding và Negative Result được trình bày ngang nhau, Inconclusive outcome của confirmation batch luôn được hiển thị, còn exploration result chỉ xuất hiện với nhãn hypothesis-generating.

---

## BR-42 — Finding Validation

Trước khi finding xuất hiện trong report chính thức, hệ thống phải kiểm tra:

```text
Has Evidence?
From Confirmation Batch?
Method Valid?
Assumptions Documented?
Severity Checks Passed?
Dataset Version / Partition Known?
Execution Trace Exists?
Interpretation Within Claim Level?
```

---

## BR-43 — Evaluation Framework

Hệ thống phải có benchmark runner để đánh giá agent.

---

## BR-44 — Benchmark Task Structure

Mỗi task có thể gồm:

- dataset;
- research question;
- hypothesis;
- expected method;
- expected output/ground truth;
- required skills;
- scoring function.

Benchmark suite phải có dữ liệu có đáp án biết trước: null và structured-null (không có effect), planted signal (effect đã cài sẵn) và semi-synthetic, để đo false-finding rate và power. Suite dựa trên dataset công khai phải dùng biến thể có planted signal hoặc perturbation để tránh model đã "nhớ" kết quả.

---

## BR-45 — Evaluation Metrics

Hệ thống phải đo:

- task success;
- correctness;
- method-selection accuracy;
- assumption-check quality;
- retry count;
- experiment count;
- latency;
- token usage;
- cost;
- human intervention;
- provenance coverage;
- unsupported claim rate;
- reproducibility coverage;
- false-finding rate trên null / structured-null data;
- power trên planted signal;
- looks per outcome và Analysis Ledger coverage.

---

## BR-46 — Agent Configuration Comparison

Hệ thống phải hỗ trợ ablation study.

Ví dụ:

```text
Full Agent
No Planner
No Assumption Checking
No Retry
No Profiling
No Validator
No Hypothesis Refinement
No Hypothesis Selection Gate
No Evidence Sufficiency Gate
No Tied-Candidate Batching (single-select baseline)
No Hooks / Commit Gates (bare agent loop)
Deterministic Playbook Only (rule-based decisions, no model)
LLM-only Decision Baseline
Single-loop Agent (no subagents)
Text-to-Code Baseline
```

Các configuration được so sánh ở cùng budget.

---


## BR-47 — Data Split & Leakage Guard

Khi experiment sử dụng predictive/ML workflow, hệ thống phải cho phép hoặc yêu cầu xác định:

- training split;
- validation split;
- test split;
- preprocessing scope;
- feature-selection scope.

Agent không được sử dụng test data để fit preprocessing, select features hoặc tune model nếu research design không cho phép.

Với mọi workflow (không chỉ predictive/ML), exploration/confirmation partition theo BR-79 là cơ chế chống leakage giữa dữ liệu dùng để gợi ý hypothesis và dữ liệu dùng để kiểm thử nó.

---

## BR-48 — Hypothesis Origin Classification

Mỗi hypothesis phải lưu origin:

```text
declared                     — researcher khai báo trong brief trước khi hệ thống đọc dữ liệu
generated_blind              — sinh trước test epoch chỉ từ metadata, structural facts, knowledge
generated_from_exploration   — sinh trước test epoch có dùng kết quả exploration (cần split)
post_test                    — sinh sau test epoch hoặc có prior exposure với kết quả trên dataset
```

và người tạo (User-defined / Agent-generated). Origin do hệ thống gán từ test epoch và context manifest của các bước sinh/chọn hypothesis, **không bao giờ do model tự khai báo**. Hypothesis `post_test` chỉ được kiểm thử trên dữ liệu mới; nếu không, outcome của nó là hypothesis-generating. Các nhãn cũ `Initial / Confirmatory` tương ứng `declared`, `Post-hoc / Exploratory` tương ứng `generated_from_exploration` hoặc `post_test`.

---

## BR-49 — Multiple-Testing Control

Khi một workflow thực hiện nhiều hypothesis tests có liên quan, hệ thống phải:

- ghi nhận số lượng tests;
- xác định testing family khi phù hợp;
- đề xuất hoặc áp dụng correction phù hợp;
- lưu correction method;
- lưu cả raw và adjusted significance values khi có.

Testing family được xác định ở cấp **search**, không ở cấp một experiment: mọi proposal trong cùng một confirmation batch (bao gồm các candidate ngang điểm theo BR-78) thuộc cùng một family; interval quyết định outcome được điều chỉnh theo số look đã đăng ký trong batch (look budget là trần). Exploration analyses được ghi vào Analysis Ledger và disclosure nhưng không phải look và không quyết định official outcome (BR-79). Số look trước đó trên cùng dataset (hoặc snapshot gần trùng) qua các run của cùng project/tenant được đếm và báo cáo trên mọi outcome; nếu confirmation row đã bị một run trước đọc, outcome chỉ là hypothesis-generating. Bảo đảm error control áp dụng ở cấp run; ở cấp dataset chỉ là báo cáo.

Ví dụ:

```text
Bonferroni
Holm
Benjamini-Hochberg / FDR
```

Official outcome phải được quyết định bằng method kiểm soát family-wise error và cho ra simultaneous interval (ví dụ Bonferroni ở mức 1 − α/L). Holm dùng để báo cáo adjusted p-value. FDR (Benjamini-Hochberg) chỉ dùng cho disclosure của exploration, không bao giờ quyết định official outcome.

---

## BR-50 — Effect Size & Confidence Interval

Khi statistical method hỗ trợ, agent phải báo cáo:

- effect size;
- confidence interval;
- p-value hoặc equivalent evidence measure;
- practical interpretation.

Agent không được dựa duy nhất vào p-value để đưa ra finding mạnh. Interval được dùng cho official outcome là interval đã điều chỉnh theo multiplicity (BR-49) và được so với δ_F / δ_N (BR-59).

---

## BR-51 — Experiment Dependency Graph

Hệ thống phải lưu dependency:

```text
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

Mỗi downstream hypothesis/finding phải biết evidence upstream mà nó phụ thuộc.

Graph phải biểu diễn thêm quan hệ `registered_in` giữa mỗi proposal và confirmation batch chứa nó (bao gồm các candidate ngang điểm theo BR-78), cùng các quan hệ `refines` và `replicates`, tách biệt với các quan hệ tests/produces/motivates/depends_on/uses_dataset/supersedes/contradicts đã có. Research Program branches (BR-81) là view trên các node và quan hệ này, không phải store riêng.

---

## BR-52 — Downstream Invalidation

Nếu experiment/finding upstream bị:

```text
Rejected
Invalidated
Recomputed
Replaced
```

hệ thống phải đánh dấu các downstream hypothesis/finding bị ảnh hưởng và yêu cầu re-validation khi cần.

---

## BR-53 — Conflicting Evidence Management

Nếu nhiều experiment cho evidence trái chiều, hệ thống phải:

- giữ tất cả result;
- không cherry-pick result thuận lợi;
- đánh dấu trạng thái `Conflicting Evidence`;
- yêu cầu thêm analysis hoặc human review khi cần.

Phạm vi này cũng áp dụng khi nhiều proposal trong cùng một confirmation batch (bao gồm candidate ngang điểm theo BR-78) cùng có outcome: hệ thống phải giữ lại tất cả outcome (Finding, Negative Result, Inconclusive), không được tự ý gộp hoặc chỉ báo cáo một outcome, và phải phân biệt trường hợp này (nhiều outcome độc lập từ hypothesis khác nhau) với `Conflicting Evidence` (evidence mâu thuẫn trên cùng một estimand). Synthesis rule chuyển bất đồng về hướng, hoặc một Finding đối lập một Negative Result, thành outcome Inconclusive có ghi conflict.

---

## BR-54 — Confidence & Uncertainty Recording

Finding và hypothesis evaluation phải có uncertainty metadata khi phù hợp.

Ví dụ:

```text
Confidence: Low / Medium / High
Reason:
- small sample
- wide confidence interval
- conflicting evidence
- violated assumption
- unstable replication
```

Confidence không được thay thế statistical evidence mà chỉ là metadata hỗ trợ review.

---

## BR-55 — Reproducibility Snapshot

Mỗi official experiment phải lưu snapshot tối thiểu:

- dataset version;
- data split / partition và test epoch;
- registered capability version và typed parameters;
- parameters;
- random seed;
- statistical method;
- model name/version;
- agent configuration;
- prompt/template version khi relevant;
- tool/library versions;
- runtime/environment;
- execution timestamp;
- recorded model outputs (để replay, không re-query);
- autonomy level và decision-layer modes;
- raw outputs;
- generated figures/tables;
- environment identity (dependency lock, language runtime, platform).

Reproduction tạo record mới và có hai mode: **replay** dùng recorded model outputs và phải khớp chính xác khi environment identity trùng (nếu không, gắn nhãn `environment_differs`); **re-derivation** gọi lại model và báo cáo phần sai khác. Khi user yêu cầu xoá dữ liệu, content được xoá bằng tombstone (giữ identity và hash), và outcome phụ thuộc được đánh dấu không còn reproducible.

---

## BR-56 — Research State Construction

Trước mỗi research iteration, hệ thống phải xây dựng một Research State có cấu trúc từ:

- research question;
- current hypothesis;
- previous hypotheses;
- experiment history;
- validated findings;
- conflicting evidence;
- uncertainty/warnings;
- dataset version, partition và test epoch;
- Analysis Ledger summary (số exploration analysis và look đã dùng);
- Research Protocol và các deviation;
- remaining exploration / look / resource budget.

Research State là bản ghi epistemic chính thức (dạng Research Graph) và là input dùng để sinh và đánh giá hướng nghiên cứu tiếp theo; transcript hội thoại không phải state. Model context được **projection** từ Research State theo allowlist cho từng role, không tích lũy từ hội thoại. **Research Program** (question tree, branch status, plan rationale, brief coverage, budget) là view của Research State và là bộ nhớ làm việc của agent. Research State chỉ thay đổi qua commit step; mỗi commit tạo version mới.

Research State (bản ghi epistemic), Run State (vòng đời run, gồm `awaiting_clarification`, `awaiting_review`) và Execution State (trạng thái kỹ thuật của một lần chạy experiment) được tách riêng: lỗi execution không có nghĩa hypothesis sai hay run không hợp lệ.

---

## BR-57 — Candidate Hypothesis / Direction Generation

Hệ thống phải có khả năng tạo một hoặc nhiều candidate hypotheses/research directions từ Research State.

Mỗi candidate phải có:

- statement;
- rationale;
- parent evidence;
- testability;
- relevant variables;
- risk/uncertainty notes.

---

## BR-58 — Structured Hypothesis Selection Gate

Trước khi đầu tư vào deep reasoning/experiment planning và trước khi đăng ký confirmation batch, hệ thống phải có khả năng:

```text
Rank
Select
Reject
Defer
```

candidate hypotheses/directions bằng một structured decision. Escalation không phải là option để chọn: nó xảy ra khi decision layer abstain, dưới threshold hoặc khi một deterministic trigger kích hoạt (BR-61).

Phân chia trách nhiệm:

- reasoning agent đề xuất candidate và xếp hạng kèm rationale;
- hệ thống tính deterministic các feature (answerability và claim level đạt được, precision margin, look cost, brief priority, redundancy, diversity);
- structured decision layer trả lời decision point *select* chỉ trong tập option mà deterministic validation đã cho phép; nó có thể thu hẹp (chọn, loại, trì hoãn) nhưng **không bao giờ** admit một proposal không qua gate;
- khi decision layer ở mode `off`, abstain hoặc dưới threshold, deterministic rule quyết định;
- candidate bị loại hoặc không được chọn vẫn nằm trong idea pool kèm lý do.

Decision record tối thiểu phải có:

- selected candidate hoặc outcome;
- confidence/uncertainty hoặc abstention;
- câu trả lời của deterministic rule đặt cạnh câu trả lời của decision layer;
- decision-layer mode (`on` / `shadow` / `off`);
- reason codes hoặc decision metadata;
- Research State version được sử dụng.

Trước selection, **deterministic screens** loại proposal infeasible, trivial/tautological, redundant với ledger, imprecise hoặc unanswerable ở target level; proposal vượt budget còn lại được defer thành follow-up candidate. **Admission gate** là deterministic: đủ trường có kiểu, screens pass, critique item đã resolve hoặc được ghi lại, allocation và budget cho phép. Vòng revision có giới hạn; khi hết round, **circuit breaker** admit bản nháp tốt nhất còn hợp lệ hoặc không admit gì, không bao giờ admit proposal không qua gate.

Khi nhiều candidate ngang điểm trong ngưỡng cấu hình được, xem BR-78.

---

## BR-59 — Evidence Sufficiency Gate (Deterministic)

Sau deterministic scientific validation, severity checks và robustness summary, mỗi kết quả của confirmation batch phải được xếp **deterministic** vào một outcome category, dựa trên interval đã điều chỉnh multiplicity so với hai margin đã cố định trong Research Protocol: Finding threshold **δ_F** và equivalence margin **δ_N ≤ δ_F**.

```text
Interval hoàn toàn vượt δ_F theo hướng đã đăng ký, checks pass  → FINDING (supported)
  (two-sided: vượt δ_F theo một trong hai hướng, ghi dấu quan sát được)
Chỉ với giả thuyết có hướng: interval hoàn toàn vượt δ_F theo
hướng ngược lại, checks pass                                    → FINDING (contradicted)
Interval nằm hoàn toàn trong (−δ_N, δ_N), checks pass           → NEGATIVE_RESULT
Trường hợp còn lại, hoặc một check bắt buộc fail                → INCONCLUSIVE
```

Yêu cầu:

- outcome category là fact được tính, **không** phải quyết định của model; decision-layer confidence không bao giờ đi vào sufficiency, evidence hoặc claim level;
- chỉ kết quả của confirmation batch mới tạo official outcome; exploration result luôn là hypothesis-generating;
- δ_F và δ_N do researcher đặt trong giới hạn policy, domain pack chỉ được siết chặt, và không thay đổi sau khi Research Protocol được freeze;
- mỗi outcome mang claim level do deterministic claim-level gate quyết định (BR-27);
- Inconclusive và Negative Result là outcome hợp lệ, không được kích hoạt việc cố tìm significance.

Các giá trị `NEED_MORE_EVIDENCE`, `TRY_ALTERNATIVE_METHOD`, `REPLICATE` của phiên bản trước **không còn là outcome của gate**; chúng trở thành option của decision point *next move* (BR-60). `NEED_HUMAN_REVIEW` trở thành escalation (BR-61). `ENOUGH_EVIDENCE` tương ứng Finding hoặc Negative Result.

---

## BR-60 — Scientific Refinement Loop (Next Move)

Sau mỗi step hoặc result, reasoning agent đề xuất các next move hợp lệ theo phase, ví dụ:

```text
NEED_MORE_EVIDENCE      — khám phá thêm
TRY_ALTERNATIVE_METHOD  — thử method/specification khác
REPLICATE               — replicate trên dữ liệu mới
CRITIQUE_AGAIN
MOVE_TO_NEXT_PHASE
STOP
```

và decision layer (hoặc deterministic rule) chọn tại decision point *next move*.

- **Trước test epoch:** refinement là exploration trên exploration partition, được ghi Analysis Ledger và nằm trong exploration budget.
- **Sau test epoch:** refinement chỉ tạo **follow-up**: work mới được đăng ký với origin `post_test`, ghi nhận là protocol deviation và chuyển sang run sau trên dữ liệu mới. Không có gì được kiểm thử lại trên dữ liệu đã đọc trong run.

Đây là scientific refinement, khác với technical retry do execution error (BR-23); hai loại được trace riêng.

---

## BR-61 — Confidence-Based Human Escalation

Human escalation có **mức sàn deterministic**: các trigger đã version hóa luôn áp dụng bất kể decision layer trả lời gì, ví dụ:

- severity check conflict hoặc evidence conflict nghiêm trọng;
- ambiguity về variable semantics ảnh hưởng interpretation;
- methodological choice có high impact;
- causal assumption cần researcher endorse;
- synthesis conflict giữa các outcome;
- yêu cầu của autonomy level hoặc policy.

Ngoài mức sàn đó, decision layer abstain hoặc có confidence dưới policy threshold chỉ được **thêm** escalation, không bao giờ loại bỏ escalation. Khi trigger kích hoạt, run tạm dừng bền vững ở trạng thái chờ review; hết hạn review, outcome liên quan trở thành Inconclusive (`review_timeout`). Reviewer có thể chấp nhận outcome đủ điều kiện kèm limitation, reject, yêu cầu follow-up, thêm limitation/context; reviewer **không** được biến evidence chưa đủ thành đủ, nâng claim level hoặc sửa experiment/protocol đã freeze.

---

## BR-62 — Decision Auditability

Mọi decision point và gate phải lưu:

- input Research State/reference và projection manifest;
- decision point (intake / select / outbound check / next move) hoặc gate;
- candidate choices;
- selected outcome hoặc abstention;
- confidence/uncertainty;
- câu trả lời của deterministic rule và decision-layer mode;
- timestamp;
- model/provider/configuration identifier;
- downstream action.

Khi các candidate ngang điểm được đưa vào cùng confirmation batch (BR-78), decision record phải lưu thêm: tie threshold đã dùng, danh sách candidate được coi là ngang điểm và confirmation batch ID.

---

## BR-63 — Decision Gate Evaluation

Evaluation framework phải đo được quality của structured decision gates, bao gồm tối thiểu:

- decision accuracy/correctness;
- selection quality;
- false acceptance of insufficient evidence;
- unnecessary continuation rate;
- human escalation rate;
- confidence/calibration quality;
- latency;
- cost.

System phải hỗ trợ so sánh:

```text
Structured Decision Layer
vs
Deterministic Rule
vs
LLM-only Decision
```

trên cùng benchmark tasks và cùng budget khi khả thi. Một decision point chỉ được bật mode `on` sau khi thắng deterministic rule của nó trên ground-truth benchmark; trước đó nó chạy `shadow` (được gọi và ghi nhận cạnh rule, rule quyết định) hoặc `off`.

Mọi thành phần có version (model, prompt, role profile, tool contract, subagent type, decision point, policy, capability, domain pack) chỉ thay đổi qua **champion/challenger**: challenger chạy shadow trên run đã ghi (replay) và run thật mà không ảnh hưởng outcome, được so sánh trên ground-truth suite, rồi được promote hoặc reject bằng một evaluation decision có ghi nhận. Quyết định promote dùng một held-out suite chỉ mở cho quyết định đó. Runtime guarantee (hooks, gates) được kiểm chứng riêng bằng một **adversarial agent** cố phá chúng. Review của con người cũng được đánh giá (override rate, dấu hiệu rubber-stamping).

---


## BR-64 — Structured Idea Record & Reflection

Mỗi candidate hypothesis phải có idea record gồm statement, experiment đề xuất, context liên quan và risk, và phải qua ít nhất một reflection round trước khi vào Hypothesis Selection Gate. Reflection là **critique theo loại validity** (statistical conclusion, construct, internal, external) do một Skeptic role thực hiện độc lập với rationale của người đề xuất; critique có thể dẫn tới revision, rejection, severity check hoặc limitation, nhưng không tự nâng vị thế của proposal.

---

## BR-65 — Prior-Work Assessment (Novelty Assessment)

Hệ thống nên liên hệ idea với prior work dựa trên nguồn literature/context được cung cấp hoặc truy xuất có kiểm soát, ở mức tham khảo. Kết quả là một **Prior-Work Assessment** gồm các công trình liên quan gần nhất, so sánh theo từng chiều (question, population, operationalization, data, design, method), contribution type (replication, extension, new population, new method, unclear…) và **coverage record** ghi rõ những gì đã và chưa tìm.

- Không có nhãn `novel`; ngôn ngữ ưu tiên ("đầu tiên", "chưa ai nghiên cứu") chỉ xuất hiện qua template giới hạn theo coverage.
- Assessment là context, không phải evidence; không nâng claim level, không admit hay reject proposal và không chặn core loop.
- Chỉ trích dẫn resolve được mới vào context; khi không có nguồn, idea được ghi nhận là chưa đánh giá.

---

## BR-73 — Figure Aggregation & Visual Feedback

Hệ thống nên gom figure từ các phương pháp/thử nghiệm đã chạy cho một hypothesis (BR-21) và kiểm tra bằng visual reviewer về độ rõ, khớp caption và trùng lặp (mở rộng BR-33).

---

## BR-74 — Manuscript Draft Generation

Hệ thống nên tạo bản thảo từ validated findings với số liệu lấy trực tiếp từ experiment log, trích dẫn được xác minh và nội dung do AI tạo được ghi rõ. Đây chỉ là draft, hệ thống không tự nộp hoặc xuất bản (Scope 9.4).

---

## BR-75 — Automated Manuscript Review

Hệ thống nên review bản thảo theo rubric (soundness, novelty, clarity) và kiểm tra chất lượng: placeholder, hình thiếu, trích dẫn chưa xác minh, số không khớp log. Bản thảo cần researcher phê duyệt trước khi dùng bên ngoài.

---

## BR-78 — Bounded Tied-Candidate Selection (One Confirmation Batch)

Khi nhiều candidate hypothesis có điểm/confidence chênh nhau dưới một ngưỡng cấu hình được (tie threshold), Structured Hypothesis Selection Gate (BR-58) được phép đưa các candidate ngang điểm **cùng vào một confirmation batch** (BR-79) thay vì bắt buộc chọn duy nhất một candidate. Không có nhánh thực thi song song: mọi candidate được chọn chạy trong cùng batch, chung một error-control family (BR-49) và bị giới hạn bởi look budget và protocol allocation. Ngưỡng phải cấu hình được ở cấp project/policy, không hard-code. Decision layer phải xuất ra một điểm số dạng numeric có thể so sánh được (dùng để xác định tie) tách biệt với nhãn confidence định tính ở BR-54 (dùng cho giải thích/escalation); chất lượng calibration của điểm số này phải nằm trong phạm vi đánh giá của BR-63.

---

## BR-79 — Exploration / Confirmation Split & Analysis Ledger

Hệ thống phải tách một run thành hai phase:

1. **Exploration:** agent khám phá thích nghi trên **exploration partition**; mọi phân tích là một entry trong **Analysis Ledger** và tính vào exploration budget, nhưng không phải look và không quyết định official outcome.
2. **Confirmation:** trước khi đọc confirmation data, hệ thống đăng ký một **confirmation batch** gồm các Research Proposal (mỗi proposal một hypothesis kèm estimand, primary analysis, δ_F, δ_N, success/falsification criteria, severity checks, robustness specification, target claim level, look cost). Batch được chạy một lần trên **confirmation partition**; thời điểm phân tích đầu tiên trên confirmation data là **test epoch**.

Yêu cầu:

- partition được gán theo row/group/block bằng keyed hash, để reorder/re-upload/thêm row không xáo trộn partition cũ; dưới kích thước tối thiểu, split bị tắt và chỉ hypothesis `declared` / `generated_blind` được vào batch;
- trước test epoch, hệ thống freeze **Research Protocol** (brief, question tree, budgets, error-control scheme, stopping rules, split, margins, autonomy level, decision-layer modes); mọi thay đổi sau đó là deviation có lý do;
- **look budget** là trần số look của batch, cố định khi freeze protocol và không bao giờ tăng sau test epoch; exploration budget, look budget và resource budget không được trao đổi cho nhau;
- mọi phân tích trên dữ liệu (kể cả failure) có ledger entry; không có bước reasoning nào đọc dữ liệu mà không đi qua registered capability;
- mọi thứ được tạo sau test epoch (bởi role, agent, reviewer hoặc caller) có origin `post_test`;
- toàn bộ ledger, rejected ideas, failed attempts và deviations được công bố trong disclosure bundle.

---

## BR-80 — Agent-Directed Research Loop within Budgets and Invariants

Research loop phải được vận hành bởi **một main agent loop cho mỗi run**, tiến từng research step có kiểu (plan, explore, ideate, design, critique, register, confirm, interpret, report) trên Research State, thay vì một chuỗi LLM call cố định mỗi state.

- Thứ tự phase của Decision-Gated Research Loop được giữ làm **workflow floor**: một deterministic playbook luôn chạy được cùng các step, hook và gate khi không có model (autonomy level A0).
- Trong một step, reasoning agent có thể gọi registered tools nhiều lần trong step budget, sửa output khi bị hook/gate trả về typed rejection (có giới hạn), và đề xuất quay lại (khám phá thêm, method khác, critique lại) khi next move cho phép.
- Run tiến qua các **decision point** (intake, select, outbound check, next move); mỗi point chạy mode `on`, `shadow` hoặc `off` cố định cho run.
- **Deterministic hooks** thực thi invariant trước/sau mỗi tool call, commit và stop (phase cho phép, budget, egress consent, partition access, ledger entry, gán origin); chỉ **commit tool** mới thay đổi state, và commit là nguyên tử, không đảo ngược.
- Reasoning được tổ chức theo **role profile** có version (PI, Theorist, Methodologist, Skeptic, Interpreter, Reporter), mỗi profile có instruction, projection allowlist, tool set, output contract, deterministic fallback cùng contract và value metric riêng. Interpreter và Reporter chạy trong session mới sau test epoch.
- Context của model được runtime **lắp ráp** từ Research State và Research Program (không kế thừa memory của provider). Khi gần hết context budget, tool result cũ được thay bằng artifact reference và summary (compaction) mà không mất state; mọi model call ghi context manifest.
- Subagent (ví dụ Skeptic, Literature) chỉ được bật khi đo được là tốt hơn single-loop agent ở cùng budget; subagent không được commit.
- **Autonomy level** (A0 playbook-only; A1 mặc định khi có model; các level cao hơn chỉ sau evaluation) cố định cho mỗi run và bị hạ khi model, prompt, tool contract hoặc policy thay đổi.
- Run là job bền vững: clarification và review tạm dừng run và resume từ state đã commit; không có chat per step.

Các forbidden transition của state machine cũ trở thành hook, nên nâng cấp agent loop không loại bỏ bảo đảm nào của workflow tuyến tính.

---

## BR-81 — Research Program Branches (Bounded)

Hệ thống nên cho phép Research Program biểu diễn các **nhánh nghiên cứu** dưới mỗi câu hỏi (question → direction → hypothesis → exploration → critique → refined hypothesis → registered proposal → outcome) như một **view** trên Research Graph.

- Trước test epoch, agent có thể expand, refine, fork hoặc prune nhánh dựa trên exploration result; mỗi thao tác là một selection step được ghi nhận và mọi phân tích cần cho nó là exploration analysis có ledger entry.
- Sau test epoch, mọi thao tác nhánh bị hook từ chối; nhánh chỉ được interpret tới outcome hoặc thêm follow-up cho dữ liệu mới.
- Branch status (`active`, `pruned` kèm lý do, `in_batch`, `resolved`, `follow_up`) được suy ra deterministic từ event, không lưu hay set trực tiếp; nhánh bị prune vẫn ở trong graph.
- Branching bị giới hạn bởi exploration budget, round limit và diversity floor; đây không phải unbounded tree search. MVP không phụ thuộc vào capability này.

---

## BR-82 — Research Knowledge Layer

Hệ thống nên cung cấp knowledge có version cho reasoning, gồm:

- **Domain pack:** construct ontology (khái niệm → cách đo, proxy yếu), catalog confounder/bias, quy ước margin (δ_F, δ_N), quy tắc coding/derived variable, reporting guideline, sensitive attributes. Luôn có một pack `general`; domain pack đầu tiên là software engineering.
- **Literature context:** reference do researcher cung cấp và retrieval có kiểm soát qua một tool duy nhất, có search budget và ghi nhận source, version, query, kết quả (BR-65).
- **Method lessons:** bài học không chứa dữ liệu, đã được review, từ các run trước (ví dụ một cột là derived từ cột khác).

Quy tắc: knowledge **chỉ được thu hẹp** (thêm screen, critique item, limitation, egress restriction, làm Finding/Negative Result khó đạt hơn), không bao giờ nới gate hoặc được tính là evidence. Chỉ citation resolve được mới vào context. Reference báo cáo kết quả trên cùng dataset được coi là prior exposure và làm origin thành `post_test`. Mọi outcome ghi lại version của pack và lesson đã dùng.

---

## BR-83 — Research Artifacts & Visibility

Output của một run là **chuỗi artifact có kiểu**, không chỉ một report. Mỗi bước để lại một artifact bất biến, content-addressed, thuộc một tier: Input (brief, snapshot, profile, cleaning), Plan (protocol, program, deviation), Idea (prior-work assessment, direction, critique, proposal, rejected idea), Experiment (registered proposal, frozen experiment, execution record), Evidence (assumption audit, validation, severity, robustness), Claim (outcome kèm claim level, claim–evidence map), Publication (view).

Mỗi artifact có envelope thống nhất: type và schema version, producer (component, role, model hoặc fallback path), input links, partition và test epoch, origin, lifecycle (`draft`, `registered`, `final`, `superseded`, `retracted`) và **visibility** được gán deterministic (`internal`, `caller`, `publishable`). Researcher có thể liệt kê, đọc và đi theo quan hệ giữa artifact trong khi run đang chạy; phản hồi của researcher (ví dụ seed idea) đi vào dưới dạng brief version hoặc deviation, không sửa artifact có sẵn.

---

## BR-84 — Publication Views & Integrity Audit

Mọi publication là **view được render từ artifact**, không phải tài liệu độc lập, và được regenerate (không edit) khi input bị supersede hoặc retract. Các view:

- Research Report theo reporting guideline của domain pack;
- Finding Brief cho từng official outcome;
- Preregistration view của Research Protocol và deviations;
- Prior-work view theo câu hỏi, kèm search coverage;
- Analysis package (spec đã freeze, tool version, kết quả, script tái lập sinh deterministic);
- Disclosure bundle (toàn bộ ledger, rejected idea, failed attempt, deviation);
- Research map, lineage view (từ outcome ngược về brief) và portfolio view.

Yêu cầu:

- claim được render bằng template theo claim level; text do model viết chỉ là explanation có nhãn và không chứa số tự do (số được điền từ field của artifact);
- mỗi statement được phân loại data-derived / knowledge-derived / interpretation và liên kết qua claim–evidence map;
- **portfolio order** được tính deterministic qua một *lens* có tên (danh sách sort key do researcher chọn); không tính composite score, không dùng nhãn novelty, không bao giờ ẩn hoặc hạ Negative Result / Inconclusive;
- trước khi thành `publishable`, view phải qua **integrity audit** deterministic: mọi statement resolve được, số và citation khớp, figure khớp spec và data hash, không câu nào vượt claim level, và **statistical disclosure control** pass (không có giá trị ở mức row, không có cell/subgroup dưới kích thước tối thiểu, sensitive attribute được aggregate).

---

## BR-85 — Simulation Lab

Trước khi đăng ký, hệ thống nên có thể mô phỏng method trên cấu trúc của dataset (null design giữ nguyên dependence, plasmode design có effect biết trước), chỉ dùng profile và exploration partition, để ước lượng type I error, coverage và power của design dự kiến kèm Monte Carlo error. Simulation tạo ledger entry nhưng không tạo look. Kết quả là method fact chỉ được thu hẹp (chặn method, thêm limitation, đổi precision plan); simulation không bao giờ chọn method "tốt nhất" trong số các method hợp lệ. Cùng generator được dùng để tạo ground-truth benchmark (BR-44).

---

## BR-86 — Theory & Observable Implications

Hệ thống nên cho phép Theorist role đề xuất một **theory**: các construct, quan hệ có hướng giữa chúng và tập **observable implications**, bao gồm implication không hiển nhiên và implication có thể bác bỏ theory. Mỗi implication trở thành một proposal bình thường và phải qua mọi gate. Theory không bao giờ là official outcome; status của nó (untested, partially consistent, consistent, inconsistent, mixed — luôn báo cáo dưới dạng n trên m implication đã đăng ký) được tính deterministic chỉ từ implication đăng ký trước khi kiểm thử. Theory đề xuất sau khi xem kết quả có origin `post_test`. Ngôn ngữ status không khẳng định cơ chế.

---

## BR-87 — Research Campaign

Các run tiếp nối một hướng nghiên cứu (follow-up, replication, snapshot mới của cùng dataset lineage) nên được liên kết thành một **campaign**, suy ra từ follow-up link và dataset lineage. Run vẫn là đơn vị khoa học: một protocol, một test epoch, một ledger, một look budget. Campaign **không gộp** look, error control hay evidence và không tạo outcome tổng hợp; view của campaign hiển thị outcome của từng run cạnh nhau ở claim level riêng. Follow-up được mang sang run sau như declared hypothesis có link về run nguồn và chỉ được kiểm thử trên row mà chưa run nào trước đó đọc. Meta-analysis giữa các run nằm ngoài phạm vi cho đến khi có contract riêng.

---

# 10.1. Business Requirement Prioritization — MoSCoW

Priority được hiểu theo **cam kết cho bản capstone cuối**, không phải thứ tự sprint.

- **Must:** bắt buộc để platform đáp ứng research scope và acceptance criteria.
- **Should:** giá trị cao và nên hoàn thành, nhưng có thể defer nếu ảnh hưởng tiến độ core.
- **Could:** chỉ thực hiện khi còn capacity; hiện được quản lý ở Scope 9.3 và chưa cấp BR ID.
- **Won't:** chủ động loại khỏi phiên bản capstone hiện tại; được liệt kê tại Scope 9.4.
- **Must\*:** Must có điều kiện khi loại workflow tương ứng được sử dụng.

| BR | Requirement | Priority | Rationale |
|---|---|---|---|
| BR-01 | Authentication | Must | Thuộc core/final submission scope. |
| BR-02 | Role-Based Access Control | Must | Thuộc core/final submission scope. |
| BR-03 | Research Project Workspace | Must | Thuộc core/final submission scope. |
| BR-04 | Dataset Upload | Must | Thuộc core/final submission scope. |
| BR-05 | Dataset Validation | Must | Thuộc core/final submission scope. |
| BR-06 | Automatic Dataset Understanding | Must | Thuộc core/final submission scope. |
| BR-07 | Data Profiling | Must | Thuộc core/final submission scope. |
| BR-08 | Data Quality Review | Must | Thuộc core/final submission scope. |
| BR-09 | Cleaning Recommendation | Must | Thuộc core/final submission scope. |
| BR-10 | Human Approval | Must | Thuộc core/final submission scope. |
| BR-11 | Original Dataset Preservation | Must | Thuộc core/final submission scope. |
| BR-12 | Dataset Versioning | Must | Thuộc core/final submission scope. |
| BR-13 | Research Question Definition | Must | Thuộc core/final submission scope. |
| BR-14 | Hypothesis Definition | Must | Thuộc core/final submission scope. |
| BR-15 | Hypothesis Status | Must | Thuộc core/final submission scope. |
| BR-16 | Research Context | Must | Thuộc core/final submission scope. |
| BR-17 | Experiment Planning | Must | Thuộc core/final submission scope. |
| BR-18 | Candidate Method Generation | Must | Thuộc core/final submission scope. |
| BR-19 | Assumption Checking | Must | Thuộc core/final submission scope. |
| BR-20 | Method Selection | Must | Thuộc core/final submission scope. |
| BR-21 | Limited Experiment Branching (Triangulation & Bounded Robustness) | Must | Thuộc core/final submission scope. |
| BR-22 | Experiment Execution (registered capabilities) | Must | Thuộc core/final submission scope. |
| BR-23 | Technical Retry (Self-Correction) | Must | Thuộc core/final submission scope. |
| BR-24 | Experiment Validation | Must | Thuộc core/final submission scope. |
| BR-25 | Replication | Should | Tăng độ mạnh evidence; core loop vẫn hoạt động khi chưa cần replication. |
| BR-26 | Research Finding Generation | Must | Thuộc core/final submission scope. |
| BR-27 | Finding Status | Must | Thuộc core/final submission scope. |
| BR-28 | Hypothesis Refinement | Must | Thuộc core/final submission scope. |
| BR-29 | Experiment-Finding-Hypothesis Linkage | Must | Thuộc core/final submission scope. |
| BR-30 | Stopping Criteria | Must | Thuộc core/final submission scope. |
| BR-31 | Statistical Analysis | Must | Thuộc core/final submission scope. |
| BR-32 | Visualization | Must | Thuộc core/final submission scope. |
| BR-33 | Figure Review | Should | Nâng chất lượng figure; không chặn core research loop. |
| BR-34 | Research Finding Provenance | Must | Thuộc core/final submission scope. |
| BR-35 | Execution Trace | Must | Thuộc core/final submission scope. |
| BR-36 | Experiment History | Must | Thuộc core/final submission scope. |
| BR-37 | Reproducibility Metadata | Must | Thuộc core/final submission scope. |
| BR-38 | Research Figure/Table Output | Must | Thuộc core/final submission scope. |
| BR-39 | Methodology Summary | Must | Thuộc core/final submission scope. |
| BR-40 | Limitations | Must | Thuộc core/final submission scope. |
| BR-41 | Research Report Generation | Must | Thuộc core/final submission scope. |
| BR-42 | Finding Validation | Must | Thuộc core/final submission scope. |
| BR-43 | Evaluation Framework | Must | Thuộc core/final submission scope. |
| BR-44 | Benchmark Task Structure | Must | Thuộc core/final submission scope. |
| BR-45 | Evaluation Metrics | Must | Thuộc core/final submission scope. |
| BR-46 | Agent Configuration Comparison | Must | Thuộc core/final submission scope. |
| BR-47 | Data Split & Leakage Guard | Must* | Bắt buộc khi workflow predictive/ML có data split. |
| BR-48 | Hypothesis Origin Classification | Must | Thuộc core/final submission scope. |
| BR-49 | Multiple-Testing Control | Must | Thuộc core/final submission scope. |
| BR-50 | Effect Size & Confidence Interval | Must | Thuộc core/final submission scope. |
| BR-51 | Experiment Dependency Graph | Should | Quan trọng cho research nhiều vòng; có thể triển khai sau core lineage. |
| BR-52 | Downstream Invalidation | Should | Phụ thuộc dependency graph; triển khai sau khi BR-51 ổn định. |
| BR-53 | Conflicting Evidence Management | Should | Tăng scientific robustness; có thể triển khai sau core finding flow. |
| BR-54 | Confidence & Uncertainty Recording | Must | Thuộc core/final submission scope. |
| BR-55 | Reproducibility Snapshot | Must | Thuộc core/final submission scope. |
| BR-56 | Research State Construction | Must | Thuộc core/final submission scope. |
| BR-57 | Candidate Hypothesis / Direction Generation | Must | Thuộc core/final submission scope. |
| BR-58 | Structured Hypothesis Selection Gate | Must | Thuộc core/final submission scope. |
| BR-59 | Evidence Sufficiency Gate (Deterministic) | Must | Thuộc core/final submission scope. |
| BR-60 | Scientific Refinement Loop (Next Move) | Must | Thuộc core/final submission scope. |
| BR-61 | Confidence-Based Human Escalation | Must | Thuộc core/final submission scope. |
| BR-62 | Decision Auditability | Must | Thuộc core/final submission scope. |
| BR-63 | Decision Gate Evaluation | Must | Thuộc core/final submission scope. |
| BR-64 | Structured Idea Record & Reflection | Must | Thuộc core ideation scope (BO-17). |
| BR-65 | Prior-Work Assessment (Novelty Assessment) | Should | Hỗ trợ ideation; là context giới hạn theo coverage, không bảo đảm novelty nên không chặn core loop. |
| BR-73 | Figure Aggregation & Visual Feedback | Should | Nâng chất lượng figure; không chặn core loop. |
| BR-74 | Manuscript Draft Generation | Should | Mở rộng Research Report; có thể defer nếu ảnh hưởng core. |
| BR-75 | Automated Manuscript Review | Should | Phụ thuộc BR-74; có thể defer. |
| BR-78 | Bounded Tied-Candidate Selection (one confirmation batch) | Must | Bảo vệ Hypothesis Selection Gate (BR-58, Must) khỏi ép chọn sai khi candidate ngang điểm; thuộc core decision-gate scope. |
| BR-79 | Exploration / Confirmation Split & Analysis Ledger | Must | Bảo đảm search-process integrity (BP-18, GA-15); là điều kiện để official outcome có ý nghĩa khi agent được tự do khám phá. |
| BR-80 | Agent-Directed Research Loop within Budgets and Invariants | Must | Kiến trúc thực thi của core research loop (BO-21, GA-16); deterministic playbook (A0) là fallback luôn có. |
| BR-81 | Research Program Branches (Bounded) | Should | Tăng khả năng điều hướng và giải thích quá trình nghiên cứu; MVP không phụ thuộc. |
| BR-82 | Research Knowledge Layer | Should | Nâng chất lượng reasoning; chỉ thu hẹp nên core loop vẫn đúng khi chỉ có pack `general`. |
| BR-83 | Research Artifacts & Visibility | Must | Output artifact-centered là nền cho provenance (BR-34), reproducibility (BR-55) và report (BR-41). |
| BR-84 | Publication Views & Integrity Audit | Must | Claim template, integrity audit, disclosure bundle và preregistration view là Must để report trung thực; research map và portfolio view có thể defer. |
| BR-85 | Simulation Lab | Should | Kiểm tra method trước khi tin; chỉ thu hẹp nên có thể defer. |
| BR-86 | Theory & Observable Implications | Should | Hướng tới giải thích; không cần cho core loop. |
| BR-87 | Research Campaign | Should | Hỗ trợ nghiên cứu nhiều run; mỗi run vẫn là đơn vị khoa học độc lập. |

**Scope control rule:** một requirement mới chỉ được thêm vào nhóm Must khi chứng minh được liên kết tới Business Problem, Business Objective và Research/Evaluation need. Nếu không, requirement phải được xếp Should/Could hoặc Out of Scope.

---


# 10.2. High-Level Non-Functional Requirements

Các NFR dưới đây mô tả **quality expectations ở mức BRD**. Threshold kỹ thuật chi tiết sẽ được chốt ở PRD/SDD và Test Plan.

| ID | Quality Attribute | Business Requirement |
|---|---|---|
| NFR-01 | Security & Access Control | Dataset, experiment, findings và project artifacts chỉ được truy cập bởi user có quyền phù hợp; không được có cross-project data exposure. |
| NFR-02 | Reliability & Recovery | Execution failure không được làm mất raw dataset, experiment history hoặc project state; user phải có khả năng tiếp tục/re-run từ trạng thái an toàn. Failure được phân loại sau khi lưu state an toàn cuối cùng: technical failure → retry, scientific failure → refinement, cần review → review, integrity mismatch (state/event replay không khớp) → chặn run, terminal failure → dừng; không failure path nào được âm thầm đẩy tiến epistemic state. |
| NFR-03 | Auditability & Traceability | Mọi official experiment, finding, approval và structured decision quan trọng phải có audit trail/execution reference. |
| NFR-04 | Explainability | Method selection, validation outcome và bounded decision quan trọng phải có rationale hoặc structured metadata đủ để researcher review. |
| NFR-05 | Reproducibility | Official experiments/findings phải có reproducibility metadata/snapshot đủ để tái lập trong phạm vi environment được hỗ trợ. |
| NFR-06 | Performance & Responsiveness | Tác vụ tương tác thông thường phải phản hồi trong thời gian chấp nhận được; long-running experiment phải có status/progress, timeout và failure state rõ ràng. |
| NFR-07 | Privacy & Data Governance | Dữ liệu nghiên cứu chỉ được sử dụng trong scope được user/project cho phép; raw data và sensitive context không được expose ngoài luồng được kiểm soát. Model provider bên ngoài chỉ nhận projection theo allowlist khi có consent cho từng run; không có consent thì chạy path deterministic/local hoặc bỏ qua bước có ghi lý do. Chỉ artifact `publishable` mới được rời khỏi phạm vi kiểm soát của project; xoá dữ liệu dùng tombstone. |
| NFR-08 | Maintainability & Modularity | Planner, analytical tools, validators và structured decision providers phải có thể thay đổi độc lập ở mức thiết kế; platform không được phụ thuộc bắt buộc vào một AI/decision vendor duy nhất. |
| NFR-09 | Usability | Core research workflow phải có thể được thực hiện mà researcher không cần trực tiếp viết code; system phải hiển thị state, warning và required human action rõ ràng. |
| NFR-10 | Observability & Cost Awareness | System phải ghi nhận execution status, error, latency, usage và cost-related telemetry đủ để vận hành và đánh giá research agent. |
| NFR-11 | Scientific Integrity | System không được tự động biến hypothesis thành fact, association thành causation, exploration result thành confirmed outcome hoặc statistically significant result thành practical significance nếu thiếu evidence phù hợp; false-finding rate trên null data phải được giữ ở mức ≤ α đã đăng ký. |
| NFR-12 | Decision Safety | Decision layer chỉ được thu hẹp, không nới rộng những gì deterministic validation cho phép; deterministic review triggers luôn áp dụng; low-confidence hoặc abstention chỉ thêm escalation; confidence không được dùng để thay thế deterministic scientific evidence. |
| NFR-14 | Execution Safety | Chỉ registered capabilities được thực thi, trong môi trường cô lập có giới hạn tài nguyên; dataset text, brief, knowledge và model output là untrusted data, không bao giờ là instruction. |

### NFR Acceptance Direction

Các tiêu chí sau phải được thể hiện trong PRD/Test Plan:

```text
Security
→ authorization / project-isolation tests

Reliability
→ failure / retry / recovery tests

Auditability
→ trace completeness tests

Explainability
→ rationale / decision-record checks

Reproducibility
→ re-run / snapshot verification

Performance
→ response-time / long-running job tests

Decision Safety
→ low-confidence escalation tests
→ adversarial-agent tests against hooks and gates

Scientific Integrity
→ unsupported-claim / evidence checks
→ false-finding rate on null / structured-null data

Execution Safety
→ no unregistered execution; sandbox limit tests
```

---

# 11. Business Rules

## BRule-01 — Project Isolation

Research project chỉ được truy cập bởi user có quyền.

---

## BRule-02 — Original Dataset Preservation

Raw dataset không được ghi đè.

---

## BRule-03 — Version on Change

Mọi transformation tạo version mới.

---

## BRule-04 — Approval Before Risky Change

Risky cleaning phải được approve.

---

## BRule-05 — Unusual Does Not Mean Incorrect

Anomaly không tự động được coi là lỗi.

---

## BRule-06 — Hypothesis Is Not Fact

Hypothesis mới chưa được experiment xác minh phải được đánh dấu `Unverified`.

---

## BRule-07 — Association Does Not Imply Causation

Agent không được kết luận causation chỉ từ correlation/association nếu design không hỗ trợ causal inference. Causal claim chỉ trở thành official khi causal assumption được researcher/reviewer **endorse qua structured elicitation**: người endorse trả lời câu hỏi về confounder, edge và thứ tự thời gian trước khi thấy diagram đề xuất, sự khác biệt được ghi lại, và testable implication bị fail được hiển thị trước khi quyết định. Model không bao giờ là nguồn duy nhất của một causal assumption.

---

## BRule-08 — Assumptions Must Be Explicit

Statistical assumptions phải được ghi lại.

---

## BRule-09 — Method Selection Must Be Justified

Agent phải lưu lý do chọn method.

---

## BRule-10 — Finding Must Have Evidence

Validated finding phải có evidence.

---

## BRule-11 — Finding Must Reference Experiment

Mỗi finding phải link về experiment tạo ra nó.

---

## BRule-12 — Experiment Must Reference Dataset Version

Mỗi experiment phải ghi rõ dataset version.

---

## BRule-13 — Interpretation Must Match Statistical Evidence

Agent không được diễn giải mạnh hơn evidence cho phép.

---

## BRule-14 — Human Decision Ownership

Researcher giữ quyền quyết định với các bước có uncertainty cao.

---

## BRule-15 — Reproducibility

Experiment chính thức phải có đủ metadata để tái lập.

---


## BRule-16 — Initial and Post-hoc Hypotheses Must Be Distinguishable

Hypothesis được tạo sau khi quan sát result không được trình bày như hypothesis ban đầu.

---

## BRule-17 — Multiple Testing Must Be Accounted For

Agent không được coi nhiều p-values độc lập như một single-test workflow nếu chúng thuộc cùng testing family.

---

## BRule-18 — Statistical Significance Is Not Practical Significance

Agent phải xem xét effect size và confidence interval khi phù hợp.

---

## BRule-19 — No Data Leakage

Test data không được dùng để fit/tune workflow khi research design yêu cầu holdout evaluation.

---

## BRule-20 — Dependency Must Be Preserved

Downstream hypothesis/finding phải giữ link đến upstream evidence.

---

## BRule-21 — Invalidated Evidence Propagates

Khi upstream evidence bị invalidate, downstream artifacts phải được đánh dấu cần re-validation.

---

## BRule-22 — Conflicting Evidence Must Be Preserved

Agent không được xóa hoặc bỏ qua result trái chiều chỉ vì không phù hợp với hypothesis đang theo đuổi.

---

## BRule-23 — Official Findings Require Reproducibility Snapshot

Finding được đưa vào final research report phải tham chiếu experiment có reproducibility snapshot đầy đủ.

---

## BRule-24 — Generative Reasoning and Decision Gating Are Separate Responsibilities

Free-form LLM reasoning không được là nguồn duy nhất cho các bounded decisions quan trọng nếu hệ thống đã định nghĩa decision point cho decision đó. Reasoning agent đề xuất option; decision layer chọn trong option đã được phép; hooks và domain gates quyết định lựa chọn có được có hiệu lực; chỉ commit tool thay đổi state.

---

## BRule-25 — Tools Establish Scientific Facts

Statistical values, diagnostics và deterministic checks phải được tạo bởi analytical/statistical tools khi có thể; decision model không được tự phát minh scientific facts.

---

## BRule-26 — Evidence Gate Precedes Official Finding

Experiment chạy thành công không tự động tạo validated finding. Chỉ kết quả của confirmation batch đã qua validation, severity checks, sufficiency gate và claim-level gate deterministic mới trở thành official outcome (Finding hoặc Negative Result); mọi trường hợp khác là Inconclusive hoặc hypothesis-generating.

---

## BRule-27 — Technical Retry Is Not Scientific Refinement

```text
Execution Error → Technical Retry (same experiment, no new look)
```

khác với:

```text
Valid Execution + Insufficient Evidence → Scientific Refinement
```

Hai loại loop phải được ghi nhận và đánh giá riêng.

---

## BRule-28 — Low Confidence Requires Policy-Based Escalation

Decision có confidence thấp hoặc risk cao phải tuân theo escalation policy thay vì tự động tiếp tục. Deterministic review triggers là mức sàn và áp dụng bất kể confidence; confidence thấp hoặc abstention chỉ thêm escalation, không bao giờ loại bỏ escalation.

---

## BRule-29 — Structured Decision History Must Be Preserved

Mọi selection/verification decision phải được giữ trong audit history và liên kết với Research State đã tạo ra decision đó.

---

## BRule-33 — Manuscript Claims Must Be Verifiable

Số liệu và figure trong bản thảo phải truy được về experiment log; trích dẫn phải được xác minh là tồn tại.

---

## BRule-34 — AI-Generated Manuscripts Must Be Disclosed and Approved

Bản thảo do AI tạo phải được ghi rõ, cần researcher phê duyệt trước khi dùng bên ngoài và không được tự động nộp.

---

## BRule-35 — Tied Candidates Share One Confirmation Batch Within the Look Budget

Khi Structured Hypothesis Selection Gate (BR-58) xác định nhiều candidate có điểm gần bằng nhau, các candidate đó chỉ được đưa vào cùng một confirmation batch trong giới hạn look budget và protocol allocation (BR-78); đây không phải cơ chế tìm kiếm mở rộng không giới hạn, và mọi candidate được chọn theo cơ chế này phải được tính vào cùng một testing family theo BR-49.

---

## BRule-36 — Budgets Are Not Exchanged

Exploration budget, look budget và resource budget là ba loại riêng và không được đổi cho nhau. Exploration budget có thể phân bổ thích nghi giữa các nhánh; look budget cố định khi freeze protocol và không bao giờ tăng sau test epoch; hết resource budget kết thúc work an toàn và không bao giờ thay đổi claim của outcome. Số specification robustness (BR-21) được tính vào registration của proposal, không tạo look mới.

---

## BRule-37 — Every Look Counts; Explore, Then Confirm Once

Mọi phân tích thực thi trên dữ liệu phải được ghi vào Analysis Ledger. Exploration chỉ gợi ý, không bao giờ quyết định official outcome. Confirmation batch, primary analysis và success/falsification criteria được cố định trước khi đọc confirmation data; không có gì được kiểm thử lại trên dữ liệu đã đọc trong run.

---

## BRule-38 — Decision Layer Narrows, Never Widens

Structured decision layer chỉ được chọn, sắp xếp, chặn, trả lại hoặc escalate trong tập option đã được deterministic validation cho phép. Nó không bao giờ admit proposal, pass gate, bỏ qua registered check, tạo hoặc sửa official outcome, hay cho phép side effect mà deterministic validation từ chối. Decision confidence không phải xác suất thống kê và không đi vào evidence.

---

## BRule-39 — Policy Changes Are Versioned and Cannot Weaken Guarantees

Tham số của run được chia ba nhóm. Run settings (δ_F, δ_N, look budget, split, target claim level, domain pack) được chọn trong Research Brief. Policy settings (δ_min, trần δ_N, decision-layer modes và thresholds, fallback cap, budget của step/session/subagent, số vòng clarification, diversity floor) chỉ đổi được với quyền policy-admin, và mỗi thay đổi tạo policy version mới chỉ áp dụng cho run tạo sau đó. Evaluation settings (non-inferiority margin, promotion autonomy) chỉ đổi qua evaluation decision có ghi nhận. Validator từ chối mọi giá trị làm yếu bảo đảm.

---

# 12. Business Process — Research Setup

```text
Researcher
    ↓
Create Project
    ↓
Upload Dataset
    ↓
Enter Research Question
    ↓
Define H0 / H1
    ↓
Add Domain Context, margins (δ_F / δ_N), budgets
    ↓
Brief Intake (proceed / restate / clarify)
    ↓
Profile Dataset + Exploration / Confirmation Split
    ↓
Freeze Research Protocol
    ↓
Start Research Loop
```

---

# 13. Business Process — Decision-Gated Research Loop

Thứ tự phase dưới đây là **workflow floor** (deterministic playbook). Ở autonomy level có model, mỗi phase được thực hiện bởi các agent step có tool, typed rejection và khả năng quay lại theo next move (BR-80); phase chỉ chuyển qua commit step.

```text
Research State + Research Program
    ↓
── EXPLORATION (exploration partition; ledgered; không quyết định outcome) ──
Generate Candidate Hypotheses / Directions
    ↓
Exploration Analyses (registered capabilities)
    ↓
Critique (Skeptic) → Refine
    ↓
Structured Selection (decision point: select; rule fallback)
    ↓
Next Move (decision point)
├── NEED_MORE_EVIDENCE / TRY_ALTERNATIVE_METHOD / CRITIQUE_AGAIN → tiếp tục exploration
└── MOVE_TO_NEXT_PHASE
    ↓
── REGISTRATION ──
Experiment Planning (estimand → method → criteria, δ_F / δ_N)
    ↓
Generate Candidate Methods + Check Assumptions (exploration partition)
    ↓
Register Confirmation Batch (admission gate, look budget)
    ↓
── CONFIRMATION (test epoch) ──
Execute Batch on Confirmation Partition
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
Next Move / Stopping Criteria
├── REPLICATE / follow-up → new run on fresh data
└── STOP → Final Outcomes → Report
```

---

# 14. Business Process — Hypothesis Generation & Selection

```text
Initial H1 / Previous Finding Fn
        ↓
Build / Update Research State
        ↓
Generate Candidates
├── H(n+1)-A
├── H(n+1)-B
└── H(n+1)-C
        ↓
Idea Record + Critique + Prior-Work Assessment (optional)
        ↓
Deterministic Screens (feasibility, triviality, answerability, redundancy)
        ↓
Structured Hypothesis Selection Gate
        ↓
Rank / Select / Reject / Defer  (abstain → rule → escalation)
        ↓
Selected H(n+1)
        ↓
Origin: generated_blind / generated_from_exploration / post_test (assigned by system)
Status: Unverified
        ↓
Deep Reasoning + Experiment Planning
        ↓
Registered Proposal in Confirmation Batch (before test epoch)
or Follow-up for fresh data (after test epoch)
```

Candidate hypothesis chỉ trở thành active research direction sau khi được selection gate và policy/human review xử lý.

---

# 15. Business Process — Method Selection

```text
Research Question
      ↓
Identify Variables
      ↓
Determine Variable Types
      ↓
Generate Candidate Methods
      ↓
Check Assumptions
      ↓
Suitable?
  ┌────┴────┐
 Yes        No
  │          │
  ▼          ▼
Execute   Alternative Method
             ↓
          Re-check
```

---

# 16. Business Process — Research Finding Verification

```text
Research Finding
      ↓
View Evidence
      ↓
Hypothesis
      ↓
Experiment
      ↓
Dataset Version
      ↓
Method + Assumptions
      ↓
Registered Capability + Parameters + Partition
      ↓
Raw Output
      ↓
Statistical Result
```

---


# 16.1. Business Process — Scientific Validity Guard

```text
Experiment Result
      ↓
Assumptions Valid?
      ↓
Look Budget + Batch Family → Adjusted Interval
      ↓
Effect Size + Confidence Interval
      ↓
Severity Checks (negative controls, influence, attenuation…)
      ↓
Bounded Robustness (registered specifications)
      ↓
Leakage / Partition Check
      ↓
Evidence Quality Facts
```

Deterministic scientific validation tạo facts/evidence; nó không tự động quyết định rằng research đã đủ để dừng.

---

# 16.1.1. Business Process — Evidence Sufficiency Gate

```text
Validated Scientific Facts (adjusted interval, checks, robustness)
      +
Frozen δ_F / δ_N from Research Protocol
      ↓
Deterministic Sufficiency Rule
      ↓
Outcome Category
├── FINDING (supported / contradicted)
├── NEGATIVE_RESULT
└── INCONCLUSIVE
      ↓
Deterministic Claim-Level Gate (claim type × evidential status)
      ↓
Deterministic Review Triggers?
├── Yes → Researcher Review (authority matrix)
└── No  → Official Outcome
      ↓
Next Move (decision point): follow-up on fresh data / stop
```

---

# 16.2. Business Process — Dependency & Conflict Handling

```text
Finding F1
   ↓
Generates H2
   ↓
Experiment E2
   ↓
Finding F2
   ↓
Conflict with F1?
 ┌────┴────┐
 No       Yes
 │         │
 ▼         ▼
Continue   Mark Conflicting Evidence
              ↓
          Human / Agent Review
```

Nếu F1 bị invalidate:

```text
F1 Invalidated
      ↓
H2 flagged
      ↓
E2/F2 marked "Needs Re-validation"
```

---

# 17. Business Process — Evaluation

```text
Benchmark Task
      ↓
Load Dataset
      ↓
Load Research Question / Hypothesis
      ↓
Run Agent
      ↓
Collect Experiments
      ↓
Collect Decision-Gate Outputs
      ↓
Collect Findings
      ↓
Collect Trace
      ↓
Score
      ↓
Repeat N Times
      ↓
Aggregate Metrics
      ↓
Compare Configurations
      ↓
Evaluation Report
```

---

# 17.1. Business Process — Manuscript Draft & Review

```text
Validated Findings + Experiment Logs
      ↓
Figure Aggregation + Visual Feedback
      ↓
Manuscript Draft (số liệu từ log, trích dẫn xác minh)
      ↓
Automated Review (rubric + quality checks)
      ↓
Cần sửa?
 ┌───┴───┐
Yes      No
 │        │
 ▼        ▼
Revise   Researcher Approval
            ↓
      Final Manuscript Draft
```

---

# 18. Assumptions

- Dataset chủ yếu là structured/tabular data.
- User có quyền sử dụng dataset.
- Researcher chịu trách nhiệm cuối cùng cho interpretation.
- AI-generated hypothesis cần được xem là proposal cho đến khi được experiment kiểm thử.
- Không phải mọi correlation đều có causal meaning.
- Statistical method phải phù hợp với data characteristics.
- Một research question có thể cần nhiều experiment.
- Post-hoc hypothesis phải được phân biệt với initial hypothesis.
- Multiple testing có thể yêu cầu correction.
- Predictive workflows phải kiểm soát data leakage.
- Downstream findings có thể phụ thuộc evidence upstream.
- Ground truth hoặc expert rubric cần thiết cho benchmark.
- Structured decision capability có thể được triển khai bằng TypeSafe/Jev hoặc provider/model tương đương; business requirements không phụ thuộc một vendor cụ thể.
- Decision confidence chỉ hỗ trợ routing/escalation, không thay thế deterministic statistical evidence.
- Dataset đủ lớn để tách exploration/confirmation partition; nếu không, chỉ hypothesis được khai báo hoặc sinh trước khi xem dữ liệu mới được kiểm thử.
- Researcher có thể khai báo hoặc chấp nhận default cho δ_F / δ_N trong giới hạn policy trước khi freeze Research Protocol.

---

# 19. Constraints

- Scope phải phù hợp với capstone.
- Không xây full autonomous AI Scientist.
- Không đảm bảo novelty research tự động.
- Không train foundation model.
- Phải kiểm soát cost.
- Agent output có tính bất định.
- Chỉ registered capabilities được thực thi; không chạy code do model sinh.
- Research data phải được isolate.
- Experiment history phải được lưu để audit.
- Experiment exploration được giới hạn bởi exploration budget, round limit và diversity floor, và không thay thế human control.
- Autonomy level vượt quá A1 chỉ được bật sau evaluation có ghi nhận.
- Bản thảo do AI tạo chỉ là draft cần researcher phê duyệt.

---

# 20. Risks & Mitigation

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R-01 | Chọn sai statistical method | High | Candidate methods + assumption checking |
| R-02 | AI over-interpret result | High | Finding validator + evidence |
| R-03 | Correlation bị diễn giải thành causation | High | Explicit business/scientific rule |
| R-04 | Hypothesis mới bị coi là fact | High | Hypothesis status |
| R-05 | Data cleaning làm sai result | High | Human approval + versioning |
| R-06 | Experiment không reproducible | High | Reproducibility metadata |
| R-07 | Agent loop chạy quá lâu | Medium | Stopping criteria |
| R-08 | Dataset ambiguity | High | Human clarification |
| R-09 | AI cost cao | Medium | Budget monitoring |
| R-10 | Figure gây hiểu nhầm | Medium | Figure reviewer |
| R-11 | Benchmark không đủ tốt | Medium | Diverse task design |
| R-12 | Unsupported finding | High | Provenance + finding validation |
| R-13 | Multiple testing tạo false positive | High | Testing-family tracking + correction |
| R-14 | Post-hoc hypothesis bị trình bày như confirmatory | High | Hypothesis origin classification |
| R-15 | Data leakage | High | Split policy + leakage guard |
| R-16 | Upstream experiment sai làm lệch downstream | High | Dependency graph + invalidation propagation |
| R-17 | Cherry-picking evidence | High | Conflicting-evidence preservation |
| R-18 | Re-run cho kết quả khác | Medium | Reproducibility snapshot |
| R-19 | Decision gate chọn hypothesis kém | High | Benchmark selection quality + human review |
| R-20 | Evidence gate chấp nhận evidence chưa đủ | High | Sufficiency tính deterministic trên adjusted interval so với δ_F / δ_N + severity checks + claim-level gate |
| R-21 | Confidence không được calibration tốt | Medium | Calibration evaluation + conservative threshold |
| R-22 | Quá phụ thuộc một decision-model provider | Medium | Provider abstraction + fallback strategy |
| R-23 | LLM và decision gate tạo feedback loop quá dài | Medium | Stopping criteria + experiment/time/cost budgets |
| R-25 | Prior-work assessment bỏ sót hoặc phóng đại quan hệ với prior work | Medium | Chỉ dùng reference resolve được + coverage record + không có nhãn `novel` + đánh giá recall |
| R-26 | Trích dẫn sai hoặc cũ, bản thảo chất lượng thấp | High | Xác minh trích dẫn + automated review + human approval |
| R-29 | Tied candidates làm tăng chi phí hoặc false-positive nếu không gộp đúng testing family | High | Cùng một confirmation batch trong look budget (BRule-35) + gộp testing family (BR-49) + audit ngưỡng tie (BR-62) |
| R-30 | Agent search tạo finding giả, hoặc kiểm thử hypothesis trên chính dữ liệu đã gợi ý nó | High | Exploration/confirmation split, Analysis Ledger, look budget, confirmation batch cố định trước test epoch, origin do hệ thống gán (BR-79) |
| R-31 | Decision layer hoặc agent nới lỏng kiểm soát (prompt injection, confidence cao sai) | High | Narrow-only authority (BRule-38), deterministic hooks, mode `off`/`shadow`, untrusted-data marking, adversarial-agent tests |
| R-32 | Model-generated code không an toàn hoặc không tái lập | High | Chỉ registered capabilities có typed parameters (BR-22) |
| R-33 | Report chứa số/claim không truy được hoặc lộ thông tin cá nhân | High | Claim template, slot-based numbers, integrity audit, statistical disclosure control (BR-84) |
| R-34 | Researcher hoặc domain pack dịch margin để ép ra outcome | High | δ_F / δ_N trong policy bounds, pack chỉ siết chặt, freeze cùng protocol (BR-59) |
| R-35 | Simulation hoặc benchmark gây hiểu nhầm (memorization, suite tự đánh giá mình) | Medium | Structure-preserving null, simulation chỉ thu hẹp, planted-signal variants, held-out promotion suite (BR-44, BR-63, BR-85) |
| R-36 | Policy/pack/model version lỗi gây ảnh hưởng lâu dài | Medium | Versioning, reverse provenance, retraction (BR-34, BR-27) |

---

# 21. Business Benefits

## Cho Researcher

- giảm thao tác lặp;
- hỗ trợ chọn method;
- hỗ trợ assumption checking;
- quản lý experiment loop;
- hỗ trợ hypothesis refinement;
- tạo figure/table nhanh;
- giữ trace và evidence.

## Cho Research Project Manager

- theo dõi research progress;
- quản lý experiment history;
- quản lý dataset version;
- xem findings và report.

## Cho Reviewer

- kiểm tra evidence;
- xem experiment trace;
- review methodology và result dễ hơn.

## Cho Research Evaluation

- benchmark được agent;
- so sánh architecture;
- đo method selection;
- đo hypothesis-selection quality;
- đo evidence-sufficiency outcome và false-finding rate;
- đo confidence/calibration;
- so sánh structured decision gate với LLM-only decision baseline;
- đo reproducibility;
- đo provenance.

---

# 22. Business Acceptance Criteria

Platform được xem là đạt mục tiêu business khi:

*Lưu ý: các tiêu chí 27–29 tương ứng với BR-51, BR-52, BR-53 (priority Should theo mục 10.1). Nếu các BR này chưa được triển khai trong phạm vi capstone do giới hạn thời gian, ba tiêu chí này được coi là extended acceptance (mục tiêu mở rộng), không phải điều kiện bắt buộc để platform đạt business acceptance tối thiểu.*

1. User có thể upload dataset mà không cần khai báo schema trước.
2. Platform tự profiling dataset.
3. Researcher nhập được research question và H0/H1.
4. Agent sinh được experiment plan.
5. Agent sinh candidate methods.
6. Agent kiểm tra assumptions trước khi chọn method.
7. Agent chọn hoặc fallback method phù hợp.
8. Experiment được chạy và lưu trace.
9. Hệ thống có thể technical retry trong registered capability khi execution lỗi.
10. Raw dataset luôn được giữ nguyên.
11. Finding có link về experiment.
12. Finding quan trọng có evidence.
13. Agent có thể đề xuất hypothesis mới từ finding.
14. Hypothesis mới được đánh dấu unverified.
15. Hypothesis mới được kiểm thử trong confirmation batch nếu sinh trước test epoch, hoặc thành follow-up cho dữ liệu mới nếu sinh sau test epoch.
16. Agent có stopping criteria.
17. Researcher có thể tạo figure/table.
18. Researcher có thể tạo research report.
19. Experiment có reproducibility metadata.
20. Agent có thể được benchmark bằng metric định lượng.
21. Có thể chạy ablation study giữa nhiều configuration.
22. Mỗi hypothesis có origin classification.
23. Post-hoc hypothesis không được trình bày như initial hypothesis.
24. Multi-test workflow có correction hoặc justification rõ ràng khi phù hợp.
25. Statistical finding có effect size/confidence interval khi method hỗ trợ.
26. Predictive workflow có leakage guard.
27. Experiment/finding có dependency graph.
28. Upstream invalidation được propagate xuống downstream artifacts.
29. Conflicting evidence được giữ lại và hiển thị.
30. Official experiment có reproducibility snapshot.
31. Hệ thống xây dựng Research State trước mỗi iteration.
32. Agent có thể tạo nhiều candidate hypotheses/research directions.
33. Candidate hypothesis được rank/select/reject bằng structured decision layer (hoặc deterministic rule khi layer `off`) trước khi đăng ký confirmation batch; decision layer không admit được proposal không qua gate.
34. Hypothesis selection decision có confidence/uncertainty, câu trả lời của rule, mode và audit record.
35. Deterministic scientific validation và severity checks hoàn tất trước Evidence Sufficiency Gate.
36. Experiment chạy thành công không tự động trở thành validated finding.
37. Evidence Sufficiency Gate tính deterministic một outcome category (Finding / Negative Result / Inconclusive) từ adjusted interval và δ_F / δ_N; không có model call nào quyết định outcome.
38. `NEED_MORE_EVIDENCE`, `TRY_ALTERNATIVE_METHOD` và `REPLICATE` là option của next move: trước test epoch là exploration, sau test epoch là follow-up cho dữ liệu mới.
39. Deterministic review trigger chuyển decision cho researcher và tạm dừng run bền vững.
40. Low-confidence/abstention chỉ thêm escalation; không có trường hợp confidence cao bỏ qua trigger bắt buộc.
41. Technical retry và scientific refinement được trace riêng.
42. Evaluation framework đo được quality của decision layer theo từng decision point và của evidence gate.
43. Có thể so sánh structured decision layer với deterministic rule và LLM-only decision baseline ở cùng budget.
50. Candidate hypothesis có idea record và critique; prior-work assessment (nếu bật) có nguồn và coverage record, không có nhãn `novel`.
51. Bản thảo (nếu tạo) có số liệu truy được về log, trích dẫn xác minh, review và phê duyệt của researcher.
53. Khi candidate hypothesis ngang điểm trong ngưỡng cấu hình, các candidate đó được đưa vào cùng một confirmation batch trong look budget thay vì chỉ 1, và quyết định này được ghi audit.
54. Mọi phân tích trên dữ liệu có Analysis Ledger entry; exploration analysis không quyết định official outcome.
55. Confirmation batch và Research Protocol được freeze trước khi đọc confirmation data; look budget không tăng sau test epoch.
56. Hypothesis origin do hệ thống gán; hypothesis `post_test` không được kiểm thử trên dữ liệu đã đọc trong run.
57. Không có code do model sinh được thực thi; mọi analysis đi qua registered capability.
58. Research loop chạy được ở autonomy level A0 (deterministic playbook, không có model) với cùng hooks, gates và commit.
59. Mỗi bước của run để lại artifact có kiểu với envelope và visibility; researcher đọc được artifact trong khi run đang chạy.
60. Report và view được render từ artifact; mọi số và statement resolve được về artifact; view chỉ thành `publishable` sau integrity audit và statistical disclosure control.
61. Mỗi outcome có claim type và evidential status do deterministic gate quyết định; không câu nào vượt claim level.
62. Replay tái tạo chính xác official experiment khi environment identity trùng khớp.
63. Researcher xem được pre-run preview (precision plan, cost estimate, answerability) trước khi chạy.

---

# 23. Business & Research Traceability Matrix

## 23.1. Research Questions Used for Traceability

Để giữ liên kết với mục tiêu nghiên cứu ban đầu của capstone, BRD operationalize ba Research Questions như sau:

- **RQ1 — End-to-End Effectiveness:** AI Research Agent thực hiện end-to-end research experimentation trên user-provided datasets hiệu quả đến mức nào?
- **RQ2 — Architecture Effectiveness:** Kiến trúc `Generate → Select → Reason → Execute → Validate → Verify → Refine`, vận hành bởi một agent loop trên workflow floor và kết hợp reasoning agent, deterministic scientific tools, structured decision layer và epistemic accounting, cải thiện reliability/quality của research workflow đến mức nào so với linear workflow và bare LLM?
- **RQ3 — Task/Skill Performance:** AI Research Agent hoạt động như thế nào theo từng nhóm research task và skill khi được đánh giá bằng benchmark và quantitative metrics?

Các RQ này giữ nguyên ý định cốt lõi của proposal: đánh giá end-to-end capability, giá trị của agentic architecture và performance theo task category.

## 23.2. BO → BR → KPI → RQ Matrix

| Business Objective | Key Business Requirements | KPI / Evidence | Research Question |
|---|---|---|---|
| BO-01 — Hỗ trợ researcher từ question đến finding | BR-13 → BR-30 | KPI-03 Agent reliability, task completion, experiment success | RQ1 |
| BO-02 — Chọn phương pháp phù hợp | BR-18, BR-19, BR-20, BR-24, BR-85 | Method-selection accuracy, assumption-check quality, simulation-blocked methods | RQ1, RQ3 |
| BO-03 — Iterative hypothesis refinement | BR-28, BR-29, BR-30, BR-57, BR-60, BR-87 | Experiment count, valid refinement rate, successful continuation, follow-ups carried to fresh data | RQ1, RQ2 |
| BO-04 — Tăng khả năng kiểm chứng finding | BR-34, BR-35, BR-42, BR-55, BR-83, BR-84 | KPI-04 evidence coverage, KPI-06 traceability; integrity-audit failures | RQ1, RQ2 |
| BO-05 — Bảo vệ dữ liệu gốc | BR-10, BR-11, BR-12 | KPI-05 destructive changes without approval = 0; KPI-08 raw preservation | RQ1 |
| BO-06 — Human control | BR-10, BR-61 | Human intervention rate, escalation correctness | RQ2, RQ3 |
| BO-07 / BO-12 — Reproducibility & leakage control | BR-37, BR-47, BR-55 | KPI-14 reproducibility coverage, leakage violations | RQ1, RQ3 |
| BO-08 — Quantitative evaluation | BR-43 → BR-46, BR-63 | KPI-10 benchmark score coverage; task success; ablation deltas | RQ1, RQ2, RQ3 |
| BO-09 — Multiple-testing & exploratory control | BR-48, BR-49, BR-79 | Hypothesis-origin coverage, correction compliance, KPI-27 ledger coverage, KPI-28 false-finding rate | RQ1, RQ2, RQ3 |
| BO-10 — Dependency & conflicting evidence | BR-51, BR-52, BR-53 | Dependency coverage, invalidation propagation, conflict preservation | RQ1, RQ2 |
| BO-11 — Practical significance | BR-50 | Effect-size/CI coverage | RQ1, RQ3 |
| BO-13 — Tách reasoning khỏi bounded decision | BR-56, BR-57, BR-58, BR-62 | KPI-15 selection records; decision correctness | RQ2 |
| BO-14 — Evidence sufficiency verification | BR-59, BR-60 | KPI-16 evidence-gate coverage; false acceptance rate | RQ2, RQ3 |
| BO-15 — Confidence-based escalation | BR-54, BR-61, BR-63 | KPI-17 safe escalation; calibration quality | RQ2, RQ3 |
| BO-17 — Ideation & prior work | BR-64, BR-65, BR-82, BR-86 | KPI-21 | RQ2 || BO-19 — Bản thảo review được | BR-73, BR-74, BR-75 | KPI-22, KPI-23 | RQ1, RQ3 |
| BO-20 — Bounded tied-candidate selection | BR-78, BRule-35, BR-49, BR-51, BR-53, BR-62, BR-79 | Acceptance Criteria 53; tied-selection audit coverage; R-29 mitigation coverage | RQ2, RQ3 |
| BO-21 — Agent-directed research within budgets and invariants | BR-80, BR-81, BR-56, BR-58, BR-60, BRule-36, BRule-38 | Acceptance Criteria 58; gain over playbook and linear baseline at equal budget; hook-rejection and repair rates | RQ2, RQ3 |

## 23.3. Product Traceability Chain

Ở cấp artifact, traceability phải duy trì theo chuỗi:

```text
Business Problem
      ↓
Business Objective
      ↓
Business Requirement
      ↓
Product Feature / User Story
      ↓
Acceptance Criteria
      ↓
Test Case
      ↓
Telemetry / Evaluation Metric
      ↓
Research Question
```

Ở cấp research execution:

```text
Research Brief / Research Question
      ↓
Research Protocol (frozen)
      ↓
Research State + Research Program
      ↓
Candidate Hypotheses (+ exploration ledger entries)
      ↓
Hypothesis Selection Decision
      ↓
Registered Proposal in Confirmation Batch
      ↓
Experiment
      ↓
Method
      ↓
Execution (registered capability, confirmation partition)
      ↓
Deterministic Scientific Evidence
      ↓
Deterministic Sufficiency Outcome
      ↓
Finding / Negative Result / Inconclusive (+ Human Review)
      ↓
Updated Research State
      ↓
Follow-up on Fresh Data or Research Conclusion
```

**Traceability rule:** một official conclusion phải truy ngược được về evidence và experiment; một core feature phải truy ngược được về BR/BO/RQ hoặc một NFR đã được phê duyệt.

---

# 24. High-Level Product Positioning

> AI Research Experimentation Platform là nền tảng AI Agent hỗ trợ researcher thực hiện vòng lặp nghiên cứu dựa trên dữ liệu với kiến trúc `Generate → Select → Reason → Execute → Validate → Verify → Refine`. Platform để agent khám phá trong budget, tách generative reasoning, structured decision layer, deterministic scientific computation và epistemic accounting, và chỉ kiểm thử một lần trên dữ liệu chưa đọc để outcome không bị quá trình tìm kiếm làm sai lệch. Mục tiêu là tạo evidence-backed findings có provenance, reproducibility, confidence-aware escalation và human control thay vì chỉ trả về câu trả lời dạng black-box.

---

# 25. Product Value Proposition

```text
Research Question
        +
Research State
        +
Candidate Hypothesis Generation
        +
Structured Hypothesis Selection
        +
Hypothesis Management
        +
Unknown Dataset Understanding
        +
Automated Profiling
        +
Method Selection
        +
Assumption Checking
        +
Experiment Execution (Registered Capabilities)
        +
Triangulation / Bounded Robustness
        +
Exploration / Confirmation Split + Analysis Ledger
        +
Agent-Directed Research Loop
        +
Hypothesis Refinement
        +
Deterministic Scientific Validation
        +
Evidence Sufficiency Verification
        +
Scientific Refinement Loop
        +
Finding Validation
        +
Confidence-Based Human Escalation
        +
Decision Auditability
        +
Provenance
        +
Execution Trace
        +
Reproducibility
        +
Scientific Validity Guard
        +
Multiple-Testing Control
        +
Experiment Dependency Graph
        +
Conflicting Evidence Handling
        +
Reproducibility Snapshot
        +
Tied Candidates in One Confirmation Batch
        +
Systematic Evaluation
```

---

# 26. Glossary

| Term | Definition |
|---|---|
| Research Question | Câu hỏi nghiên cứu cần được trả lời bằng evidence |
| Hypothesis | Giả thuyết cần được kiểm thử |
| H0 | Null hypothesis |
| H1 | Alternative hypothesis |
| Experiment | Một quy trình phân tích/kiểm thử nhằm đánh giá hypothesis |
| Candidate Method | Phương pháp phân tích được agent xem xét |
| Assumption Checking | Kiểm tra điều kiện áp dụng statistical method |
| Finding | Kết quả nghiên cứu được suy ra từ experiment |
| Hypothesis Refinement | Sinh/chỉnh hypothesis mới dựa trên finding |
| Provenance | Thông tin truy vết finding về experiment và dữ liệu |
| Execution Trace | Lịch sử step/tool/code/output của agent |
| Reproducibility | Khả năng tái lập experiment từ metadata đã lưu |
| Replication | Lặp experiment để kiểm tra stability |
| Ablation Study | Loại bỏ một thành phần để đo ảnh hưởng |
| Benchmark | Tập task dùng để đánh giá agent |
| Ground Truth | Expected result hoặc tiêu chí chuẩn để chấm |
| Initial Hypothesis | Hypothesis xác định trước khi xem kết quả liên quan |
| Post-hoc Hypothesis | Hypothesis được tạo sau khi quan sát evidence/result |
| Multiple Testing | Thực hiện nhiều statistical tests trong cùng một research family |
| Effect Size | Mức độ lớn của effect/association, không chỉ mức significance |
| Confidence Interval | Khoảng bất định của estimate |
| Data Leakage | Thông tin từ evaluation/test data ảnh hưởng vào training/tuning |
| Experiment Dependency Graph | Graph liên kết hypothesis, experiment, finding và downstream research steps |
| Conflicting Evidence | Nhiều experiment tạo evidence trái chiều |
| Reproducibility Snapshot | Snapshot dataset/code/config/model/tool/environment để tái lập experiment |
| Research State | Structured state tổng hợp question, hypothesis, experiment history, findings, conflicts, uncertainty và constraints tại một iteration |
| Candidate Hypothesis | Hypothesis/research direction được sinh ra để selection gate đánh giá trước khi active |
| Structured Decision Gate / Decision Layer | Thành phần trả bounded decision có cấu trúc (label trong option set, probability, abstain) thay vì free-form text; chỉ thu hẹp, không nới rộng |
| Decision Point | Điểm trong agent loop nơi decision layer (hoặc deterministic rule) chọn: intake, select, outbound check, next move |
| Decision-Layer Mode | `on` (layer quyết định), `shadow` (layer được gọi và ghi nhận, rule quyết định), `off` (rule quyết định, không gọi model); cố định cho mỗi run |
| Hypothesis Selection Gate | Decision point *select* dùng để rank/select/reject/defer candidate hypotheses |
| Evidence Sufficiency Gate | Deterministic gate xếp kết quả confirmation batch vào Finding, Negative Result hoặc Inconclusive dựa trên adjusted interval so với δ_F / δ_N |
| Negative Result | Official outcome: interval nằm hoàn toàn trong (−δ_N, δ_N) và checks pass — không có effect có ý nghĩa thực tế |
| Finding Threshold δ_F / Equivalence Margin δ_N | Hai margin cố định trong Research Protocol, dùng để quyết định Finding và Negative Result; δ_N ≤ δ_F |
| Next Move | Decision point sau mỗi step/result: khám phá thêm, method khác, critique lại, replicate trên dữ liệu mới, chuyển phase hoặc dừng |
| Scientific Refinement | Work bổ sung vì evidence chưa đủ: exploration trước test epoch, follow-up trên dữ liệu mới sau test epoch; khác technical retry do lỗi execution |
| Exploration / Confirmation Partition | Hai phần dữ liệu tách bằng keyed hash: exploration để gợi ý hypothesis, confirmation để kiểm thử confirmation batch |
| Test Epoch | Thời điểm phân tích đầu tiên của confirmation batch trên confirmation data; mọi thứ tạo sau đó có origin `post_test` |
| Analysis Ledger | Bản ghi append-only của mọi phân tích thực thi trên dữ liệu, kể cả exploration và failure |
| Look / Look Budget | Look là interval có thể quyết định official outcome; look budget là trần số look của confirmation batch |
| Confirmation Batch | Tập Research Proposal được đăng ký trước khi đọc confirmation data và chạy một lần, chung một error-control family |
| Research Protocol | Kế hoạch cấp run được freeze trước khi đọc dữ liệu kiểm thử: brief, question tree, budgets, margins, split, stopping rules, autonomy level |
| Research Program | View của Research State dùng làm bộ nhớ làm việc của agent: question tree, branches, brief coverage, budget, plan rationale |
| Registered Capability | Phân tích/tool được đăng ký với typed parameters, version và contract; là cách duy nhất để thực thi phân tích |
| Hook | Kiểm tra deterministic trước/sau mỗi tool call, commit và stop; thực thi invariant bất kể model trả lời gì |
| Autonomy Level | Mức A0 (playbook deterministic) → A4, xác định tool/loop/decision mode nào được bật; cố định cho mỗi run |
| Decision Confidence | Confidence/uncertainty metadata dùng cho routing và human escalation; không phải xác suất thống kê |
| TypeSafe / Jev | Candidate implementation cho structured decision layer; không phải dependency bắt buộc của BRD |
| Prior-Work Assessment (Novelty Assessment) | Đánh giá tham khảo quan hệ của idea với prior work kèm coverage record; không có nhãn `novel`, không bảo đảm novelty |
| Manuscript Draft | Bản thảo do AI tạo từ validated findings, cần review và phê duyệt của researcher |
| Bounded Tied-Candidate Selection | Cơ chế cho phép các candidate có điểm/confidence chênh nhau dưới ngưỡng cấu hình cùng vào một confirmation batch trong look budget, thay vì ép chọn một candidate duy nhất |
| Tie Threshold | Ngưỡng chênh lệch điểm/confidence cấu hình được, dùng để xác định các candidate được coi là "ngang điểm" |
| registered_in | Loại quan hệ trong Experiment Dependency Graph, liên kết một proposal với confirmation batch chứa nó (thay cho `co_selected_with` của v1.8) |
| Claim Level | Hai trục của một outcome: claim type (descriptive / associational / predictive / causal) và evidential status (hypothesis-generating / held-out / confirmatory) |
| Sealed Partition | Phần dữ liệu dành riêng khi freeze protocol, chỉ được đọc bởi confirmatory test của nó |
| Research Brief | Input contract của run: dataset, research question và các trường context/margin/criteria tùy chọn; trường thiếu được ghi là gap |
| Domain Pack | Knowledge có version cho một lĩnh vực: construct ontology, confounder catalog, quy ước margin, reporting guideline, sensitive attributes |
| Artifact Envelope / Visibility | Metadata chung của artifact (type, producer, input links, partition, origin, lifecycle); visibility là `internal`, `caller` hoặc `publishable` |
| Publication View | Tài liệu được render từ artifact (report, finding brief, preregistration, disclosure bundle, analysis package, research map, lineage, portfolio); regenerate thay vì edit |
| Integrity Audit | Kiểm tra deterministic trước khi view thành `publishable`: statement resolve được, số/citation khớp, không vượt claim level, statistical disclosure control pass |
| Portfolio Lens | Danh sách sort key có tên dùng để sắp xếp outcome theo mức ưu tiên chú ý; không phải composite score, không phải evidence |
| Simulation Lab | Mô phỏng method trên cấu trúc dataset (null / plasmode) trước registration; chỉ thu hẹp |
| Theory | Tập construct và quan hệ kèm observable implications; status tính từ implication đăng ký trước, không bao giờ là official outcome |
| Research Campaign | Nhóm run nối tiếp một hướng nghiên cứu; không gộp look, error control hay evidence |
| Replay / Re-derivation | Hai mode tái lập: replay dùng recorded model outputs và phải khớp chính xác; re-derivation gọi lại model và báo cáo sai khác |
| Reverse Provenance | Truy từ một nguồn (policy, pack, snapshot, model version) tới mọi outcome phụ thuộc |
| Champion / Challenger | Cơ chế thay đổi thành phần có version: challenger chạy shadow và chỉ được promote bằng evaluation decision có ghi nhận |

---

# 27. Approval & Sign-off

| Role | Name | Status | Date |
|---|---|---|---|
| Project Leader |  | Pending |  |
| Project Members |  | Pending |  |
| Supervisor |  | Pending |  |

---

# 28. Document Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 |  |  | Initial AI Data Analytics BRD |
| 0.2 |  |  | Reframed toward AI Research Experimentation with iterative hypothesis-experiment loops |
| 0.3 | 2026-09-19 |  | Added scientific-validity controls: multiple testing, post-hoc hypothesis classification, effect size/CI, data leakage guard, dependency graph, conflicting evidence, uncertainty and reproducibility snapshot |
| 1.0 | 2026-09-19 |  | Finalized BRD and aligned with final architecture diagram and iterative research loop |
| 1.1 | 2026-09-20 |  | Added decision-gated research architecture: Research State, candidate-hypothesis selection, structured decision confidence, evidence sufficiency verification, scientific refinement loop, human escalation, and decision-gate evaluation; TypeSafe/Jev recorded as an implementation candidate rather than a required vendor |
| 1.2 | 2026-09-20 |  | Submission-ready BRD: added Gap Analysis, explicit MoSCoW prioritization for BR-01→BR-63, high-level NFR summary, and BO→BR→KPI→RQ traceability matrix; scope remains unchanged from v1.1 |
| 1.3 | 2026-09-21 |  | Added AI-Scientist-style experiment exploration (BP-15→17, BO-16→19, BR-64→77, KPI-19→26, BRule-30→34, NFR-13, R-24→28, GA-11→13, acceptance criteria 44→52): structured idea record and reflection, novelty assessment, experiment tree with Experiment Manager and staged exploration, debug nodes, search budget and selection-bias control, manuscript draft and review, exploration ablation with rule-based gate baseline and benchmark seed set; existing requirements unchanged |
| 1.4 | 2026-09-22 |  | Added bounded tied-candidate selection at Hypothesis Selection Gate (BR-58.1, BRule-35, BRule-36) and its cross-cutting impact on multiple-testing family (BR-49), Research State versioning under parallel branches (BR-56), dependency-graph sibling edges (BR-51), multi-finding handling (BR-53), cumulative stopping-criteria budget (BR-30), escalation on disagreeing parallel branches (BR-61), decision audit fields (BR-62) and a new ablation arm (BR-46); acceptance criterion 53 added; fixed KPI mislabeling in section 23.2 (BO-05: KPI-07→KPI-08; BO-08: KPI-08→KPI-10) and added a conditional-scope note for acceptance criteria 27–29 relative to the Should-priority of BR-51/52/53; existing requirements otherwise unchanged |
| 1.7 | 2026-09-22 |  | Renumbered the bounded tied-candidate selection requirement from the sub-clause BR-58.1 to a standalone BR-78, for consistency with the document's convention that every BR is a top-level, independently prioritized requirement; added BR-78 to the MoSCoW table (Must); updated all cross-references (GA-14, traceability matrix, BRule-35/36, BR-30/49/51/53/56/61/62 cross-references) accordingly; BR-58 now carries a short pointer to BR-78; no semantic change to the requirement itself |
| 1.8 | 2026-09-22 |  | Removed the Sakana-style bounded tree-search layer added in v1.3 (BR-66 Experiment Tree, BR-67 Staged Exploration, BR-68 Experiment Manager, BR-69 Debug Node & Bounded Retry, BR-70 Search Budget Control, BR-71 Search Selection-Bias Control, BR-72 Replication & Aggregation Nodes, BR-76 Search Trace View, BR-77 Exploration Evaluation & Ablation) and their dependent BRule-30/31/32, BP-15, BO-16, BO-18, GA-11, R-24/27/28, KPI-19/20/24/25, NFR-13, acceptance criteria 44–49 and 52, Business Process 13.1, and related MoSCoW/traceability/glossary entries — restoring the platform's original linear, single-path Decision-Gated Research Loop (BR-21) as the sole execution architecture, since the tree-search layer conflicted with that original design choice and its Sakana-comparable value was judged not to justify the added scope/engineering risk for a capstone deliverable; retained the tree-independent parts of the same v1.3 addition (BR-64 Structured Idea Record & Reflection, BR-65 Novelty Assessment, BR-73 Figure Aggregation & Visual Feedback — reworded to reference BR-21 method-level results instead of experiment-tree nodes, BR-74 Manuscript Draft Generation, BR-75 Automated Manuscript Review) and the bounded tied-candidate selection capability (BR-78, BRule-35/36, BO-20, GA-14, R-29) which operates at the Hypothesis Selection Gate and is independent of tree search; existing requirements otherwise unchanged |
| 1.5 | 2026-09-22 |  | Closed internal-consistency gaps left by v1.4: added BO-20 as a proper Business Objective for bounded tied-candidate selection (replacing the ad-hoc "BO-13 (mở rộng)" traceability label), added GA-14 (Gap Analysis) and R-29 (Risks & Mitigation) so the new capability is traceable end-to-end per BRD's own rule that every core capability must resolve a gap; existing requirements otherwise unchanged |
| 1.9 | 2026-09-28 |  | Aligned with the target architecture in [architecture.md](architecture.md) (§7.10 "Proposed BRD/PRD changes"): replaced the linear single-path execution statement with an agent-directed research loop over a deterministic workflow floor (new BR-80, BO-21, GA-16, BRule-38); added exploration/confirmation split, Analysis Ledger, look budget, Research Protocol and confirmation batch (new BR-79, BP-18, GA-15, BRule-36 rewritten, BRule-37, KPI-27/28, R-30); made BR-59 evidence sufficiency deterministic (Finding / Negative Result / Inconclusive on adjusted intervals vs δ_F / δ_N) and moved `NEED_MORE_EVIDENCE` / `TRY_ALTERNATIVE_METHOD` / `REPLICATE` to the *next move* decision point (BR-60) and `NEED_HUMAN_REVIEW` to escalation; made deterministic triggers the floor of escalation with decision-layer confidence only adding to it (BR-61, BRule-28, BO-15); reworded BR-78 / BRule-35 from parallel branches to "tied candidates enter one confirmation batch within the look budget" and removed parallel-branch clauses from BR-30/49/51/53/56/61/62 (`co_selected_with` replaced by `registered_in`); replaced generated code with registered capabilities (BR-22/23/34/37/55, R-32, NFR-14); reframed BR-21 as triangulation/bounded robustness that never selects among specifications; reframed BR-65 as coverage-scoped Prior-Work Assessment without a `novel` label; added hypothesis origins `declared` / `generated_blind` / `generated_from_exploration` / `post_test` assigned by the system (BR-48); added optional bounded Research Program branches (BR-81, Should); updated Executive Summary, To-Be, Scope, business processes 12–16.1.1, acceptance criteria 33–43 and 53–58, traceability, glossary. BP-15, BO-16/18, GA-11 and NFR-13 IDs removed in v1.8 are not reused. Coverage audit against architecture.md then added BR-82 Research Knowledge Layer, BR-83 Research Artifacts & Visibility (Must), BR-84 Publication Views & Integrity Audit (Must), BR-85 Simulation Lab, BR-86 Theory & Observable Implications, BR-87 Research Campaign, GA-17/18, R-33→36, acceptance criteria 59–63; extended BR-07 (relational profile facts on exploration partition only), BR-12 (cleaning after split is a deviation), BR-16 (Research Brief, intake, pre-run preview), BR-25 (stability vs replication), BR-27 (claim-level requirements per type/status, outcome lifecycle), BR-34 (reverse provenance), BR-41/42, BR-44/45 (null / planted-signal ground truth), BR-55 (environment identity, replay vs re-derivation, tombstones), BR-58 (screens, admission gate, circuit breaker), BR-63 (champion/challenger, adversarial agent, review evaluation), BR-80 (role profiles, context assembly), BRule-07 (causal assumption endorsement), BR-40 (limitations by validity type, mandatory limitations), BR-49 (dataset-scope looks across runs), BR-56 (Research / Run / Execution state separation), new BRule-39 (versioned policy settings that cannot weaken guarantees), NFR-02/07; moved BR-78 from section 11 back to section 10 |
