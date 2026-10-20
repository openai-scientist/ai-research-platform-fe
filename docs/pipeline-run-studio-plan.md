# Run studio trên luồng pipeline mới (BE `management` + engine i2h `/v1`)

Ngày 2026-10-14. Viết sau khi chạy thật một run pipeline qua BE (RUN-548B, project demo).
Bổ sung cho `docs/frontend-gap-s1-s2.md`: file đó liệt kê khác biệt API; file này mô tả luồng
thực tế đo được và việc FE cần làm, theo thứ tự.

## 1. Đã làm và kết quả

- Xoá dữ liệu run cũ: 6 run trong DB của BE (project demo) và 30 thư mục run của engine
  (tất cả đều trỏ tới run đã xoá).
- BE: build lại theo code mới (`management/`), migrate tới `20261014_0027`, bật luồng pipeline ở
  local (xem mục 8), cấu hình 2 model qua admin API: stage `cx/gpt-6-luna`, review `cx/gpt-6-sol`
  (khác model chính nên reviewer độc lập thật; `ag/claude-sonnet-4-6` không trả JSON qua router).
- Chạy một run pipeline đầy đủ bằng API (giống FE sẽ gọi): tạo run → gate shortlist → reviewer
  độc lập → gate hypotheses → publish → accept → run `completed`. Không lỗi ở BE hay engine.
- FE hiện tại mở run này chỉ thấy "Waiting for Popper to start": reducer bỏ qua mọi event `i2h.*`.

## 2. Luồng thực tế đo được (RUN-548B, 8 phút 42 giây)

| Thời điểm | Event (class) | Ý nghĩa cho UI |
|---|---|---|
| 0 s | `stage.status_changed` PENDING → RUNNING (platform), `run.phase_changed` drafting, `run.step_changed` `topic_init` (lifecycle) | Bắt đầu màn Scope |
| 12 s | `run.step_changed` `problem_decompose` | Vẫn màn Scope |
| 26 s / 32 s | `run.step_changed` `search_strategy`, `literature_collect` | Màn Search |
| 87 s | `run.step_changed` `literature_screen` | Màn Screen |
| 162 s | `run.gate_opened` (kind `question`, options `approve`/`drop`/`reject`), `attention.required` | Gate shortlist |
| 164 s | `decision.recorded`, `run.gate_closed`, `run.step_changed` `knowledge_extract` | Màn Read |
| 213 s | `run.step_changed` `synthesis` | Màn Synthesize |
| 233 s | `run.step_changed` `hypothesis_gen` | Màn Hypothesize (debate) |
| 452 s | `run.phase_changed` `reviewing` | Reviewer độc lập bắt đầu |
| 492 s | `review.completed`, 18 × `i2h.review.finding`, `run.phase_changed` `awaiting_researcher`, `run.gate_opened` (kind `artifact_review`) | Gate hypotheses kèm finding |
| 495 s | `decision.recorded`, `run.gate_closed`, `run.step_changed` `argument_map` | Màn Map |
| 519 s | `run.published`, `stage.status_changed` (COMPLETED), `attention.required` | Chờ người dùng **Accept** |
| 520 s | (POST accept) `decision.recorded`, `stage.status_changed` (ACCEPTED) | Run `completed` |

Tổng 776 event: 715 activity (`i2h.*`), 18 lifecycle, 10 platform (đếm chi tiết ở mục 9).

### Hai điều quyết định độ mượt

1. **Chữ vẫn stream được.** `i2h.agent.message` giữ `{message_id, text, done}`: 85 event cho
   18 tin nhắn, nên hiệu ứng gõ chữ hiện có (`TypeText`) dùng lại được. `i2h.debate.turn` giữ đủ
   turn (67 turn, mỗi turn một event).
2. **Event đến theo đợt, không đều.** Engine phát theo mốc tiến độ, nên nhiều step dồn event vào
   1–2 thời điểm, rồi im lặng:

   | step_key | Số event | Số mốc thời gian khác nhau | Khoảng im lặng dài nhất |
   |---|---|---|---|
   | topic_init | 7 | 2 | 11 s |
   | problem_decompose | 14 | 2 | 15 s |
   | literature_collect | 102 | 15 | 11 s |
   | literature_screen | 290 | 9 | 23 s |
   | knowledge_extract | 39 | 20 | 5 s |
   | synthesis | 14 | 2 | 20 s |
   | hypothesis_gen | 128 | 17 | 51 s |
   | argument_map | 139 | 2 | 25 s |

   Nếu FE đổ thẳng vào reducer, UI sẽ: đứng yên 20–50 s, rồi hiện một lúc 100–250 dòng (ví dụ
   252 `screen.rejected`). Muốn "mượt, rõ từng bước" thì FE phải có hàng đợi trình chiếu (mục 4.6)
   và trạng thái "đang làm" khi im lặng.

## 3. Hình dạng event (đã kiểm chứng trên run thật)

Mỗi event: `seq, run_id, ts, type, class, stage_key, stage_run_id, step_key, iteration, phase,
summary, refs, actor, payload`.

- **activity** `i2h.<type>`: `payload` **giống hệt** event cũ mà reducer FE đã xử lý
  (`scope.goal`, `screen.kept`, `card.extracted`, `synthesis.*`, `debate.turn`,
  `hypothesis.drafted|checked|selected`, `idea.set_aside`, `map.node|edge`, `canvas.piece`, ...).
  Riêng `i2h.review.finding` là loại mới:
  `{finding_id, anchor:{artifact_id, locator:"hypothesis:H1/conditions"}, severity:"blocking|major|minor",
  kind:"fix|needs_evidence", category, issue, suggestion, author:"reviewer", evidence_refs}`.
- **lifecycle**: `run.step_changed` (`step_key` ở envelope, `payload.from`), `run.phase_changed`
  (`phase` ở envelope), `run.gate_opened` (`payload` = Gate: `gate_id, kind, step_key, prompt,
  options, default_option_id, artifact_ids`), `run.gate_closed` (`gate_id, action, actor`),
  `review.completed` (`round, passed, artifact_id`), `run.published` (`artifact_id`), `run.failed`,
  `run.cancelled`, `run.cost`.
- **platform**: `stage.status_changed` (`payload.status`), `decision.recorded`
  (`payload.action, gate_id`), `attention.required` (`stage_run_id, gate_id`).

Không còn các event FE đang dựa vào: `run.started`, `run.plan`, `run.status`, `run.completed`,
`stage.started|completed`, `step.started|completed`, `gate.opened|resolved`. FE phải tự dựng.

## 4. Việc FE cần làm (theo thứ tự)

### 4.1 Tách run pipeline và run cũ
- `RunItem` có `pipeline_key`, `interaction_mode`, `current_stage`. `pipeline_key` khác null là run
  pipeline. Run cũ (Popper) giữ nguyên đường hiện tại.
- Tạo run: gửi `interaction_mode: "copilot"` cố định (luôn để người dùng duyệt), không hiện bộ chọn.
- `src/lib/run-stream/run-store.ts` chọn nguồn event theo loại run.

### 4.2 Lớp chuyển đổi event: `src/lib/run-stream/pipeline-adapter.ts` (mới)
Nhận envelope của BE, trả về `RunEvent` kiểu cũ để **reducer và mọi scene giữ nguyên**.

| Envelope mới | Event cũ sinh ra |
|---|---|
| event đầu tiên của run | `run.started` (topic, domains, mode từ RunItem) + `run.plan` (kế hoạch tĩnh 4.3) |
| `i2h.<type>` | `<type>` với `stage_key` = màn của `step_key` (bảng dưới), `actor` giữ nguyên |
| activity đầu tiên thuộc step khác step đang chạy | `step.completed` step cũ + `step.started` step mới (bảng 4.3) |
| `run.step_changed` sang màn khác | `stage.completed` màn cũ + `stage.started` màn mới (plan tĩnh) |
| `run.phase_changed` `reviewing` | `step.started` `review` (step mới của Hypothesize) |
| `run.gate_opened` | `run.status` awaiting_review + `gate.opened` (Gate kiểu FE, mục 4.4/4.5) |
| `run.gate_closed` + `decision.recorded` | `gate.resolved` (summary "Approved the shortlist." …) |
| `stage.status_changed` COMPLETED | `step.started` `accept` + `run.status` awaiting_review |
| `stage.status_changed` ACCEPTED (stage cuối) | `stage.completed` + `run.completed` |
| `run.failed` / `run.cancelled` | `run.status` failed / stopped (`failure` từ RunItem) |

`step_key` → màn: `topic_init`, `problem_decompose` → **scope**; `search_strategy`,
`literature_collect` → **search**; `literature_screen` → **screen**; `knowledge_extract` → **read**;
`synthesis` → **synthesize**; `hypothesis_gen` → **hypothesize**; `argument_map` → **map**.

### 4.3 Kế hoạch tĩnh (titles và steps), lấy đúng từ engine (`platform_events.py` `GROUPS`, `_STEPS`)

| Màn | Title | Steps (id → activity mở step đó) |
|---|---|---|
| scope | Scope the question | `goal` ← `scope.goal`; `decompose` ← `problem.subquestion`, `problem.risk`; `evaluate` ← `topic.evaluated` |
| search | Search the literature | `strategy` ← `search.strategy|query|sources`; `collect` ← `literature.*` |
| screen | Screen the papers | `score` ← `screen.criteria|scored`; `reject` ← `screen.rejected`; `shortlist` ← `screen.kept`; `screen_gate` ← gate |
| read | Read and extract | `extract` ← `card.extracted` |
| synthesize | Find the gaps | `cluster` ← `synthesis.cluster|set_aside`; `overview`; `tension`; `gaps` ← `synthesis.gap`; `rank` ← `synthesis.ranked` |
| hypothesize | Hypothesize | `debate` ← `debate.turn`; `write` ← `hypothesis.drafted`; `check` ← `hypothesis.checked`; `select` ← `hypothesis.selected|idea.set_aside|rule.checked`; **`review`** ← phase `reviewing`/`review.finding` (mới); `hypotheses_gate` ← gate |
| map | Map the argument | `questions|foundation|reasoning|contribution` ← `map.node|edge` theo loại node; `canvas` ← `canvas.piece`; **`accept`** ← stage COMPLETED (mới) |

`agent.message` không mở step, chỉ là lời dẫn của step đang chạy.

### 4.4 Gate shortlist (question)
- Route mới: `POST /runs/{run}/stages/{stage_run}/gates/{gate}` body `{action:"answer", option_id, text?, params?}`.
- `approve`; `drop` + `params.dropped: [paper_id…]` (bắt buộc ≥1); `reject` (tìm lại).
- Dùng lại UI gate shortlist hiện có (danh sách lấy từ `screen.kept` đã có trong state; **không**
  hiển thị `prompt` thô vì nó chứa cả danh sách bài dạng text).

### 4.5 Gate hypotheses (artifact_review) + reviewer độc lập: phần UI mới
- Trước gate, hiện **kết quả reviewer** (`i2h.review.finding`): gom theo giả thuyết (H1…H6), mỗi
  finding có mức độ (blocking/major/minor), nhóm (reproducibility, baseline…), vấn đề và gợi ý.
  Trên run thật: 18 finding, mỗi giả thuyết 2–4.
- Hành động: **Approve** `{action:"approve", params?:{dropped, kept}}`, hoặc **Comment**
  `{action:"comment", findings:[{finding_id, anchor:{artifact_id, locator:"hypothesis:H1/<field>"},
  severity, kind, category, issue, suggestion, evidence_refs:[]}]}`. Comment làm engine sửa và
  review lại (vòng 2), sau đó gate mở lại.
- `artifact_id` của bản giả thuyết đang duyệt: `gate.artifact_ids[0]`.

### 4.6 Hàng đợi trình chiếu (để mượt)
- Đặt giữa adapter và store (`run-store.ts` đã gom theo frame): khi một đợt đến, phát ra theo nhịp
  thay vì một lần, ví dụ:
  - danh sách dài (`screen.rejected`, `literature.*`, `map.node|edge`): gom 8–12 mục mỗi nhịp, nhịp
    60–90 ms, có giới hạn tổng thời gian (≤ 2,5 s) để không trễ so với thực tế;
  - mục quan trọng (`hypothesis.drafted`, `synthesis.gap`, `debate.turn`, `review.finding`):
    từng mục, 250–400 ms;
  - `agent.message`: giữ hiệu ứng gõ chữ hiện có.
- Khi phát lại lịch sử (mở run đã xong), bỏ nhịp, hiện ngay.
- Khi im lặng > 3 s: thanh "đang làm" của step hiện tại (tên step, actor, thời gian đã chạy,
  lời dẫn mới nhất). Đây là chỗ hay bị "đứng hình" nhất (hypothesis_gen im 51 s).

### 4.7 Accept
- Khi stage `COMPLETED`: khối "Chọn giả thuyết mang sang bước sau" (mặc định chọn hết), gửi
  `POST …/accept {selection:{hypothesis_ids}, note}`. Thiếu lựa chọn → 422 `INVALID_SELECTION`.
- Sau ACCEPTED: run `completed`; hiện như cuối run hiện tại.

### 4.8 Dọn dẹp với run pipeline
- Ẩn pause/resume/sync/abandon (S3/S4 mới có), ẩn tab frame-review.
- Thông báo `run_awaiting_review`: chữ "Research needs attention", dẫn tới run.
- Chi phí: `cost_usd` luôn 0 tới S4 → ghi "Cost tracking is not available yet".
- Lỗi: hiện `message` của BE qua toast như hiện tại (đã có mã engine trong message).

## 5. Sửa nhỏ ở engine/BE (sau FE, khi cần)

- i2h: `summary` của `i2h.review.finding` có chèn UUID artifact ("… (H1, 3e2e645f-…)"). Nên đổi
  thành câu đọc được (ví dụ "Major · reproducibility: …"). FE không phụ thuộc vào summary nên không
  chặn.
- BE: `docker-compose.dev.yml` không truyền `ENGINES`, `PIPELINES` (đã ghi trong `.env.example`).
  Local đang dùng file override (mục 8). Có thể đề xuất team BE thêm hai biến tuỳ chọn vào compose.

## 6. Cần bạn chốt

1. Bỏ giả thuyết ở **approve** (`params.dropped`) hay ở **accept** (`selection`)? Đề xuất: chỉ ở
   accept (một chỗ chọn), approve chỉ là "đồng ý bản này".
2. UI **comment** làm cùng đợt này hay sau khi approve/accept chạy ổn? Đề xuất: làm sau, đợt 2.
3. Run cũ (Popper) vẫn mở xem được như hiện tại: giữ (đề xuất).

## 7. Thứ tự triển khai và cách kiểm chứng

1. 4.1 + 4.2 + 4.3 → mở RUN-548B (đã xong) phải hiện đủ 7 màn như run cũ.
2. 4.6 → chạy run mới, quay màn hình từng màn, kiểm không có khoảng đứng > 3 s mà thiếu thanh
   "đang làm", không có đợt hiện >20 dòng cùng lúc.
3. 4.4 + 4.5 (approve) + 4.7 → chạy run mới bằng UI từ đầu đến cuối.
4. 4.8.
5. (Đợt 2) comment + vòng review 2, lịch sử review (`GET …/reviews`).

Mỗi bước: test vitest cho adapter (dùng event thật đã lưu của RUN-548B làm fixture), Biome, tsc,
chụp màn hình sáng/tối.

## 8. Môi trường local đã dựng

- BE: `docker compose --env-file .env.local --env-file .env.pipeline.local
  -f docker/docker-compose.dev.yml -f docker/docker-compose.pipeline.local.yml
  -p ai-research-platform-be up -d --build`
  - `.env.pipeline.local` (git bỏ qua): `CONNECTION_SECRET_KEY` (khoá Fernet, cần để lưu API key
    model).
  - `docker/docker-compose.pipeline.local.yml` (thêm vào `.git/info/exclude`): `ENGINES` trỏ
    `http://host.docker.internal:8001/v1`, service key lấy từ `POPPER_SERVICE_KEY` của
    `.env.local`; `PIPELINES={"default":[{"stage_key":"hypothesis","engine":"i2h"}]}`.
- Engine: `I2H_CONFIG=configs/platform-local.yaml .venv/bin/python tools/serve_api.py` (cổng 8001).
- Model (admin API, lưu trong DB): stage `cx/gpt-6-luna`, review `cx/gpt-6-sol`, router
  `https://9router.oraltest.site/v1`.
- Bỏ file override và `.env.pipeline.local` là quay về luồng Popper cũ.

## 9. Số liệu event của RUN-548B

activity: agent.message 85, canvas.piece 9, card.extracted 18, debate.turn 67, hypothesis.checked 6,
hypothesis.drafted 6, hypothesis.selected 6, idea.set_aside 4, literature.batch 27,
literature.collected 1, literature.merged 30, literature.request 27, map.edge 78, map.node 47,
problem.risk 5, problem.subquestion 5, review.finding 18, rule.checked 1, scope.goal 5,
screen.criteria 1, screen.kept 18, screen.rejected 252, screen.scored 7, search.query 9,
search.sources 1, search.strategy 3, synthesis.cluster 4, synthesis.gap 3, synthesis.overview 1,
synthesis.ranked 1, synthesis.set_aside 1, synthesis.tension 1, topic.evaluated 1.
lifecycle: review.completed 1, run.gate_closed 2, run.gate_opened 2, run.phase_changed 3,
run.published 1, run.step_changed 9. platform: attention.required 3, decision.recorded 3,
stage.status_changed 4.

## 10. Kết quả triển khai (2026-10-15)

Đã làm 4.1–4.8 và đợt 2 (gửi lại để sửa). Run cũ (Popper) giữ nguyên đường cũ.

- `src/lib/run-stream/pipeline-adapter.ts`: đổi envelope mới thành event cũ (kế hoạch tĩnh, bước suy ra từ
  `message_id` của lời dẫn và từ loại nội dung, gate shortlist / hypotheses / accept, tóm tắt từng màn, mỗi vòng
  sửa một màn `rN-hypothesize`). Test `pipeline-adapter.test.ts` dùng 776 event thật của RUN-548B.
- Trả lời gate: `POST …/stages/{stage_run}/gates/{gate}` (`answer`, `approve`, `comment` kèm finding đã chọn và
  comment riêng từng giả thuyết); Accept: `POST …/stages/{stage_run}/accept`.
- UI: kết quả reviewer trên từng thẻ giả thuyết; dòng "Reviewer is checking…"; chọn finding để gửi lại; tab R2
  "Round 2 · revision" với khung "Your comments from round 1" (Fixed / Rebutted / Not fixed lấy từ artifact
  `revision.response/v1`); danh sách chọn ở bước Accept; "Still working · m:ss" khi im > 3 s; ẩn Pause.
- 4.8: run pipeline ghi "cost not tracked yet"; thông báo "needs your decision" và mở thẳng workspace
  (`/experiments?run=`); tab tự nhận run mới tạo ở nơi khác khi run đang xem đã xong.
- Sửa thêm: stage track giật (`animate-ping` làm hiện thanh cuộn dọc), key trùng ở canvas, thẻ "ready to test"
  tính cả giả thuyết đã bỏ, nút zoom React Flow ở giao diện tối.
- BE: `decision.recorded` ghi `option_id`, `text`, `params`, `findings` (gate) và `note` (accept).
  i2h: summary của `review.finding` đọc được, refs của canvas không lặp.

Đo trên run thật qua UI:
- RUN-0317 (không sửa): đợt lớn nhất 9 dòng / 100 ms; một khoảng im 50 s lúc review chưa có "Still working"
  (đã sửa); lỗi key trùng (đã sửa).
- RUN-E068 (gửi lại 16 mục, vòng 2, accept): đợt lớn nhất 7 dòng / 100 ms; 0 khoảng im thiếu "Still working";
  0 lỗi console; engine trả lời 16/16 "fixed".

Còn lại: form tự viết finding đầy đủ (mức độ, loại, nhóm); diff giữa hai vòng (`revision.diff/v1`).
