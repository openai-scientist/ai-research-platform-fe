# Project Settings — Backend Handoff

Ngày lập: 2026-10-16. Sản phẩm: OpenAI Scientist.

> **Cập nhật tích hợp FE — 2026-10-18:** Nội dung từ mục 1 trở đi là bản đề xuất gốc.
> FE hiện đã đối chiếu source BE trong `src/management/projects/router/settings.py`,
> `schemas/settings.py`, `settings_service.py` và `router/ownership.py` của repository BE cùng cấp,
> rồi nối theo contract thực tế bên dưới. Chưa chạy validation hoặc gọi API live trong lượt tích hợp này.

### Contract thực tế đã nối vào FE

- GET `/projects/{projectId}/settings` trả trực tiếp snapshot trong `data`:
  `version`, `updated_at`, `updated_by_user_id`, `sections`, `capabilities`.
  Không trả `{ project, settings }` như đề xuất gốc.
- PATCH `/projects/{projectId}/settings/{section}` nhận `{ version, values }`.
  Có 8 section: `general`, `access`, `runs`, `models`, `literature`, `review`, `data`, `spending`.
  FE chỉ gửi field thay đổi, cập nhật form từ response canonical và giữ draft khi request thất bại.
- Tên field theo schema BE: `access.default_role`, `expiry_days`, `join_link`, `join_approval`,
  `reviewers_see_data`; `runs.stage_limit`, `pause_on_failure`; `literature.per_round`;
  `review.self_approval`; `data.same_name`; `spending.warn_at`, `at_limit`, `billing_email`.
  Các key còn lại giữ dạng tương ứng của form. Count/TTL/time-limit vẫn là string theo BE.
- `capabilities` là object keyed `section.field`, không phải array.
  Source BE hiện chỉ đánh dấu `access.expiry_days` supported; các field khác lưu được nhưng
  `reason_code=NOT_ENFORCED_YET`. UI có ghi chú phân biệt lưu cấu hình với áp dụng runtime.
- TTL hiệu lực được BE cap bởi platform maximum. FE đã bỏ copy “24 hours” cố định và
  hiển thị expiry theo dữ liệu từng invitation.
- General metadata dùng PATCH `/projects/{projectId}` có sẵn; preferences dùng settings PATCH riêng.
  Hai thao tác **không atomic** trong BE hiện tại. FE không báo toàn bộ thành công nếu một request lỗi.
- Archive/restore/complete/reopen nối lại adapter thật; transfer dùng POST
  `/projects/{projectId}/transfer-ownership` với `{ new_owner_user_id }`; delete dùng
  DELETE `/projects/{projectId}`. Chưa thực thi thao tác phá hủy khi kiểm tra tích hợp.
- Source BE chưa có route tương ứng cho personal notification preferences, integrations/webhooks,
  join links/requests, project activity và duplicate. UI không chạy sample/mock thành công cho những
  mục này; hiển thị chưa khả dụng hoặc khóa thao tác. Export settings là JSON snapshot đã tải từ BE.
- Source FE: `fetch-project-settings.ts` và `settings-api.tsx`. `settings-preview*.tsx` còn trong
  repository nhưng không được compose trong màn Settings đang nối API.


## 1. Mục đích và mức độ xác nhận

Tài liệu bàn giao các nhu cầu BE xuất phát từ giao diện Project Settings hiện tại.
Đây là **đề xuất contract để BE triển khai và thống nhất với FE**, không phải xác nhận API mới đã tồn tại.

- Đã đối chiếu source FE, service API, kiểu dữ liệu và project role policy trong checkout này.
- Chưa kiểm tra source BE, database, OpenAPI hoặc gọi API live trong lượt bàn giao này.
- “Có FE adapter” chỉ xác nhận FE đã có hàm gọi endpoint; không đồng nghĩa BE đã được kiểm chứng.
- Giá trị mặc định trong các bảng là **giá trị UI mock**, chưa phải chính sách sản phẩm đã chốt.
- Phạm vi bàn giao là Settings của từng project; không bao gồm Admin Settings của toàn platform.

Các URL API bên dưới tính từ `/api/v1`, trừ URL trang FE.

## 2. UI và hiện trạng tích hợp

Trang FE: `/projects/{projectId}/settings?tab={tab}`.

| Mục UI | `tab` | Hiện trạng trong màn Settings |
| --- | --- | --- |
| General | `general` | Đọc thông tin project làm giá trị ban đầu; Save hiện chỉ cập nhật preview, chưa gọi update API. Export chỉ tải JSON preview; Duplicate chỉ mô phỏng. |
| Members & access | `access` | Có ba tab con: Members, Invitations, Access settings. Hai tab đầu dùng API thành viên hiện có; Access settings là mock. |
| Research runs | `runs` | Mock các mặc định và giới hạn chạy. |
| AI models | `models` | Mock lựa chọn model và hành vi. |
| Literature | `literature` | Mock nguồn, bộ lọc và giới hạn bài báo. |
| Review & publishing | `review` | Mock điều kiện duyệt và định dạng xuất bản. |
| Data & storage | `data` | Mock phiên bản dataset, loại file, privacy và retention. |
| Integrations | `integrations` | Connect/Disconnect, thêm/xóa webhook chỉ thay đổi mock; không OAuth, không gửi webhook. |
| Spending | `spending` | Mock giới hạn tháng, cảnh báo và billing contact. |
| Notifications | `notifications` | Mock lựa chọn của người dùng hiện tại, theo từng project. |
| Activity | `activity` | Sample events và thao tác preview; chưa nối audit thật trong màn đang render. |
| Danger zone | `danger` | Archive/restore/complete/reopen/transfer/delete đều mô phỏng trong màn đang render. |

Mock được giữ trong `SettingsPreviewProvider` và `useDraft`, mất khi reload hoặc rời phiên Settings.
UI không còn hàng “UI preview / Reset preview”; việc bỏ hàng đó **không thay đổi trạng thái tích hợp**.
Không dùng việc toast Save thành công hoặc status thay đổi trong preview để kết luận BE đã lưu dữ liệu.

PM vào Members qua Settings; URL `/projects/{projectId}/members` của PM redirect tới `settings?tab=access`.
Researcher/Reviewer vẫn có trang Members riêng, không được mở toàn bộ Settings.

## 3. Những contract FE đã có — ưu tiên tái sử dụng

### 3.1. Project và lifecycle

Nguồn: `src/lib/api/services/fetch-project.ts`.

| Method | Path | Hợp đồng FE hiện có |
| --- | --- | --- |
| GET | `/projects/{projectId}` | `ProjectItem`. |
| PATCH | `/projects/{projectId}` | Các field `name`, `description`, `objective`, `domain`, `tags`; trả `ProjectItem`. |
| POST | `/projects/{projectId}/archive` | Trả project sau thao tác. |
| POST | `/projects/{projectId}/restore` | Trả project sau thao tác. |
| POST | `/projects/{projectId}/complete` | Trả project sau thao tác. |
| POST | `/projects/{projectId}/reopen` | Trả project sau thao tác. |

`ProjectItem` có `id`, `name`, `description`, `domain`, `objective`, `tags`, `status`,
`owner_user_id`, `my_role`, `created_at`, `updated_at`.
Status: `draft | data_ready | researching | needs_review | completed | archived`.

Các adapter lifecycle tồn tại nhưng Settings đang render component preview thay vì gọi chúng.
BE cần kiểm chứng endpoint và quy tắc chuyển trạng thái trước khi FE nối lại.

### 3.2. Members và Invitations — màn hiện tại đang gọi các adapter này

Nguồn: `src/lib/api/services/fetch-members.ts`.

| Method | Path | Request / response chính |
| --- | --- | --- |
| GET | `/projects/{projectId}/members` | Query `q`, `role`, `status`, `limit`, `offset`; `status=active|invited`. |
| GET | `/projects/{projectId}/invite-candidates` | Query `q`, `limit`, `offset`; danh sách tài khoản có thể mời. |
| POST | `/projects/{projectId}/members` | `{ email, role }`; trả membership/lời mời. |
| PUT | `/projects/{projectId}/members/{membershipId}` | `{ role }`; chỉ đổi Researcher/Reviewer. |
| DELETE | `/projects/{projectId}/members/{membershipId}` | Xóa thành viên hoặc hủy lời mời; trả `data: null`. |
| POST | `/projects/{projectId}/members/{membershipId}/invite` | Gửi lại/gia hạn lời mời; trả membership cập nhật. |

`ProjectMemberItem` hiện có:

```ts
type ProjectMemberItem = {
  id: string; // membershipId, khác user_id
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "project_manager" | "researcher" | "reviewer";
  status: "invited" | "active";
  invite_sent_at: string | null;
  invite_expires_at: string | null;
  invite_expired: boolean;
  invite_email_sent?: boolean | null;
  created_at: string;
};
```

FE phân biệt lưu lời mời thành công với email gửi thành công qua `invite_email_sent`.
Không trả `true` nếu mới enqueue mail; thống nhất rõ nghĩa của cờ này với cơ chế delivery hiện có.
Việc xóa membership không xóa dataset, tài liệu, run hoặc lịch sử do người đó tạo.

### 3.3. Những API liên quan không nên dùng sai phạm vi

- `fetchAdmin.getAudit()` gọi `GET /audit?project_id=...`. Sự tồn tại của adapter Admin này
  chưa chứng minh PM có quyền gọi; Settings cần endpoint audit đúng scope project.
- `fetchNotifications` đã có list, unread count, mark read, read-all cho `/notifications`.
  Các API này không phải API lưu notification preferences.
- `CreateRunRequest` hiện có `topic`, `domains`, `review_mode`, `budget_usd?`.
  Khi thêm project defaults, giữ tương thích với request tạo run hiện có.

## 4. Nguyên tắc contract và phân quyền

### 4.1. Kết nối và response

- Browser chỉ gọi cùng origin qua `/api/v1/*`, dùng `getApiBaseUrl()`.
- Server dùng `getServerApiBaseUrl()`; không đưa URL backend hoặc secret vào client hay biến public.
- Dùng cơ chế session cookie, CSRF và allowed-origin hiện có cho mutation.
- Dùng ID project từ route; membership phải thuộc đúng project đó.
- Timestamp ISO 8601 có timezone; lưu UTC. Tiền USD dùng decimal string, không float.
- Envelope hiện tại:

```ts
type Success<T> = {
  success: true;
  message: string;
  data: T;
  meta: {
    request_id: string;
    pagination: { total: number; limit: number; offset: number } | null;
  };
};
type Failure = {
  success: false;
  message: string;
  error: {
    code: string;
    details: { field: string; message: string }[];
    reason?: string;
  };
  meta: { request_id: string };
};
```

FE dùng `message` từ BE cho Sonner toast, branch theo `error.code`, không theo message.
Với rate limit, trả `Retry-After`; FE đã có xử lý `retryAfter`.

### 4.2. Policy nền phải được giữ

Theo [project-role-policy.md](../../project-role-policy.md):

- Quyền project lấy từ active membership của project hiện tại. Platform Admin không tự có quyền project.
- PM đọc/sửa project settings; Researcher/Reviewer được đọc Members theo policy hiện tại.
- Chỉ Researcher/Reviewer là role được mời/gán từ Members. Không cho gán thêm PM bằng endpoint đổi role.
- Creator/Owner và membership PM được bảo vệ khỏi đổi role/xóa ở Members.
- Archived project chặn mutation project; PM vẫn mở Settings và restore được.
- Transfer ownership là luồng riêng, không được lách qua PUT membership.

Các lựa chọn mock mở rộng quyền được liệt kê ở mục 11; chưa được coi là thay thế policy này.
BE phải enforce trực tiếp; ẩn nút ở FE không đủ để cấp hoặc chặn quyền.

## 5. API Settings đề xuất

**Toàn bộ endpoint trong mục này là đề xuất, chưa được xác minh trên BE.**

| Method | Path | Mục đích |
| --- | --- | --- |
| GET | `/projects/{projectId}/settings` | Snapshot cấu hình project, version, metadata và capabilities. PM only. |
| PATCH | `/projects/{projectId}/settings/{section}` | Lưu nhóm `general|access|runs|models|literature|review|data|spending`. PM, project không archived. |
| GET | `/projects/{projectId}/settings/options` | Danh mục model/provider và giới hạn thực sự được hỗ trợ. PM only. |
| GET / PATCH | `/projects/{projectId}/me/notification-preferences` | Preferences của user hiện tại; không nhận `user_id` tùy ý từ client. |
| GET | `/projects/{projectId}/activity` | Audit project đã lọc quyền, phân trang `limit/offset`. |

GET và PATCH settings đề xuất cùng trả `data: { project: ProjectItem, settings: SettingsSnapshot }`.
`ProjectItem` giữ contract hiện có; snapshot trong `data.settings` có cấu trúc:

```ts
type SettingsSnapshot = {
  project_id: string;
  version: number;
  updated_at: string;
  updated_by_user_id: string | null;
  sections: {
    general: GeneralPreferences;
    access: AccessSettings;
    runs: RunSettings;
    models: ModelSettings;
    literature: LiteratureSettings;
    review: ReviewSettings;
    data: DataSettings;
    spending: SpendingSettings;
  };
  capabilities: {
    section: string;
    field: string | null;
    supported: boolean;
    reason_code: string | null;
  }[];
};
```

Các type của `sections` được định nghĩa bằng bảng field ở mục 6.
Integrations/webhooks là resource riêng, Notifications thuộc user; không nhét secret hoặc preferences
của mọi người vào snapshot project.

### Quy tắc lưu

- Body PATCH: `{ version, values }`. `values` là partial của đúng section.
- Field không gửi phải được giữ nguyên; object merge theo field, array thay toàn bộ.
- `null` chỉ hợp lệ ở field được định nghĩa nullable; không hiểu `null` là reset mọi field.
- Validate toàn bộ cấu hình hiệu lực sau merge; ghi trong một transaction.
- Trả `{ project, settings }` canonical trong envelope, tăng `settings.version` và cập nhật metadata.
- `version` không khớp: `409 SETTINGS_VERSION_CONFLICT`, không ghi đè dữ liệu người khác.
- Riêng General, cho phép thêm `project: { name?, description?, objective?, domain?, tags? }`
  trong cùng body. Cập nhật metadata project và preferences atomically; dùng chung business service
  với PATCH `/projects/{projectId}`, không tạo bản sao metadata. FE cập nhật project detail/list
  cache từ `data.project`. Mutation qua endpoint project cũ cũng phải cập nhật revision liên quan
  hoặc kiểm tra version metadata để tránh General ghi đè một thay đổi bên ngoài Settings.
- GET trả đủ defaults hiệu lực cho project cũ chưa có settings record.
- Chỉ báo supported khi giá trị thực sự có tác dụng. Field chưa có engine/worker hỗ trợ phải
  trả capability `supported: false`, không lưu rồi giả vờ tính năng đã hoạt động.

Ví dụ lưu Access settings, sau khi policy TTL và quyền mời đã được chốt:

```http
PATCH /api/v1/projects/{projectId}/settings/access
Content-Type: application/json

{
  "version": 4,
  "values": {
    "invitation_expiry_days": 7,
    "allowed_email_domains": ["example.com"],
    "default_role": "researcher"
  }
}
```

## 6. Field dictionary và mapping từ mock FE

Tên bên phải là **tên wire đề xuất**. FE sẽ có adapter chuyển tên/cách biểu diễn từ mock.
Không gửi nguyên string của control số hoặc label hiển thị lên BE.

### 6.1. General

| FE / wire đề xuất | Kiểu, giá trị | Giá trị UI hiện tại |
| --- | --- | --- |
| `name` | String sau trim, 2–160 ký tự. Metadata project hiện có. | Đọc từ project. |
| `description` | String tối đa 5.000 ký tự hoặc null. | Đọc từ project. |
| `objective` | String tối đa 10.000 ký tự hoặc null. | Đọc từ project. |
| `domain` | String tối đa 160 ký tự hoặc null. | Đọc từ project. |
| `tags` | String array; UI tối đa 20 tag, 40 ký tự/tag; trim, bỏ trùng không phân biệt hoa thường. | Đọc từ project. |
| `visibility` → `visibility` | `members | organization`. Organization còn cần chốt model quyền. | `members` |
| `timezone` → `timezone` | IANA timezone hợp lệ; không dùng offset cố định cho DST. | `Asia/Ho_Chi_Minh` |
| `language` → `locale` | `en | vi`; định dạng ngày/số, không tự đổi copy UI khỏi tiếng Anh. | `en` |

`id`, `created_at`, owner và status là dữ liệu đọc/lifecycle; không cho ghi qua General tùy ý.

### 6.2. Members & access → Access settings

| FE key → wire | Kiểu, giá trị | Mock default |
| --- | --- | --- |
| `inviters` → `who_can_invite` | `managers | researchers`; `researchers` nghĩa PM và Researcher. | `managers` |
| `defaultRole` → `default_role` | `researcher | reviewer` | `researcher` |
| `expiry` → `invitation_expiry_days` | Integer: `3, 7, 14, 30`. | `7` |
| `domains` → `allowed_email_domains` | Domain array; rỗng nghĩa bất kỳ tài khoản đủ điều kiện. Normalize lowercase, không chứa `@`. | `[]` |
| `link` → `join_link_enabled` | Boolean. | `false` |
| `approval` → `join_requires_approval` | Boolean. | `true` |
| `reviewersSeeData` → `reviewers_can_open_datasets` | Boolean. | `true` |
| `linkVersion` | Chỉ là counter mock để đổi sample URL; **không phải token hoặc wire field**. | `1` |

Members/Invitations dùng contract hiện có ở mục 3.2. Luồng join-link mới nằm ở mục 7.
Thay default role chỉ preselect form mời mới, không đổi role người đã tham gia.
Đổi TTL áp dụng cho lời mời mới/gửi lại; BE phải chốt riêng xử lý lời mời đang tồn tại.

### 6.3. Research runs

| FE key → wire | Kiểu, giá trị | Mock default |
| --- | --- | --- |
| `mode` → `review_mode` | `auto | light | copilot | full` theo run contract hiện có. | `copilot` |
| `budget` → `budget_usd` | Decimal string USD, >0. UI giới hạn tối đa `20`; BE cần xác nhận giới hạn thật. | `"5"` |
| `fields` → `domains` | String array, gợi ý khi tạo run. | `[]` |
| `starters` → `who_can_start_runs` | `researchers | managers` | `researchers` |
| `concurrent` → `max_concurrent_runs` | Integer: `1, 2, 3, 5`. | `2` |
| `rounds` → `max_research_rounds` | Integer: `1, 2, 3, 5`. | `3` |
| `stageLimit` → `stage_timeout_minutes` | `30, 60, 120` hoặc null (`none` ở FE). | `60` |
| `retry` → `retry_failed_stage_once` | Boolean. | `true` |
| `pauseOnFailure` → `pause_on_failure` | Boolean. | `true` |

Đề xuất snapshot settings khi tạo run. Request hợp lệ override project defaults trong giới hạn
BE cho phép; thiếu field thì dùng project default, sau đó platform default.
Run đang chạy không tự đổi model, budget, số vòng hoặc dataset version vì PM vừa sửa Settings.
Queue/concurrency, timeout và retry phải được thực thi ở worker, kể cả khi client gọi trực tiếp API.
Retry một lần không làm tăng số lần chạy side effect ngoài ý muốn; retry thất bại mới áp dụng pause/stop policy.

### 6.4. AI models

| FE key → wire | Kiểu, giá trị | Mock default |
| --- | --- | --- |
| `stage` → `research_model_id` | ID từ catalog, hoặc `default`. | `default` |
| `review` → `review_model_id` | ID từ catalog, hoặc `default`. | `default` |
| `fallback` → `fallback_model_id` | ID từ catalog hoặc null (`none` ở FE). | null |
| `effort` → `reasoning_effort` | `low | medium | high`, tùy capability của model. | `medium` |
| `style` → `hypothesis_style` | `conservative | balanced | exploratory`. | `balanced` |

Mock đang liệt kê `claude-opus`, `claude-sonnet`, `claude-haiku`, `gpt-5`, `gemini-2-5-pro`.
Đây không phải bằng chứng provider có model đó. BE trả catalog thực và capability theo model;
không chấp nhận model không khả dụng hoặc effort không hỗ trợ. Provider credentials chỉ nằm ở BE.
Khi fallback=null và model không dùng được, trả trạng thái pause/failure có code rõ ràng.

### 6.5. Literature

| FE key → wire | Kiểu, giá trị | Mock default |
| --- | --- | --- |
| `arxiv/semantic/openalex/pubmed/crossref` → `sources` | Array source key; ít nhất 1. | `["arxiv", "semantic", "openalex"]` |
| `years` → `published_within_years` | `3, 5, 10` hoặc null (`any`). | `10` |
| `preprints` → `include_preprints` | Boolean. | `true` |
| `perRound` → `papers_per_round` | Integer, 5–200. | `40` |
| `languages` → `languages` | Array; mock dùng label `English`. BE/FE cần thống nhất language code. | `["English"]` trong mock |
| `exclude` → `excluded_terms` | String array; venues/authors/keywords theo semantics cần chốt. | `[]` |

Không coi việc chọn một source là source đó đã được connector hỗ trợ.
Catalog/options phải cho biết source nào thực sự chạy được và có cần cấu hình ở BE không.

### 6.6. Review & publishing

| FE key → wire | Kiểu, giá trị | Mock default |
| --- | --- | --- |
| `approvals` → `required_approvals` | Integer: `1, 2, 3`. | `1` |
| `approvers` → `who_can_approve` | `reviewers | reviewers-managers | anyone`. Cần chốt policy trước khi mở rộng. | `reviewers` |
| `selfApproval` → `allow_self_approval` | Boolean. | `false` |
| `format` → `paper_format` | `latex | markdown | docx`. | `latex` |
| `citation` → `citation_style` | `apa | ieee | chicago | harvard | vancouver`. | `apa` |
| `language` → `paper_language` | `en | vi | ja | fr | de`. | `en` |
| `appendix` → `include_code_appendix` | Boolean. | `true` |
| `watermark` → `watermark_drafts` | Boolean. | `true` |

Approval phải gắn đúng phiên bản kết quả/paper; đếm người duyệt khác nhau, không đếm một người nhiều lần.
Phân biệt publish approval với các decision gate trong run pipeline; không thay lẫn hai cơ chế.
Nếu định dạng xuất bản chưa có generator, trả unsupported capability thay vì nhận nhưng không thực hiện.

### 6.7. Data & storage

| FE key → wire | Kiểu, giá trị | Mock default |
| --- | --- | --- |
| `pinning` → `dataset_version_policy` | `latest | pinned` | `latest` |
| `sameName` → `duplicate_name_policy` | `version | copy` | `version` |
| `types` → `allowed_file_types` | Array không rỗng; wire đề xuất `csv | excel | parquet | json`. FE hiện dùng label viết hoa. | `["CSV"]` trong mock |
| `pii` → `detect_personal_data` | Boolean. | `true` |
| `mask` → `mask_personal_data_in_previews` | Boolean; UI khóa control khi `pii=false`. | `true` |
| `artifacts` → `run_file_retention_days` | `90, 180, 365` hoặc null (`forever`). | null |
| `trash` → `deleted_item_retention_days` | `7, 14, 30` | `30` |
| `region` → `storage_region` | `auto | us | eu | apac` | `auto` |

- Cần chốt nghĩa `latest`: nên resolve phiên bản mới nhất khi tạo run rồi lưu ID cụ thể để tái lập;
  nếu muốn refresh giữa các stage, cần contract rõ, không thay phiên bản ngầm.
- Cần chốt `pinned` lấy lựa chọn phiên bản từ đâu; current mock chưa có control chọn version.
- Upload, import và versioning phải dùng cùng quy tắc duplicate-name/type; validate content, không chỉ đuôi file.
- Chỉ cho bật loại file parser thực sự hỗ trợ.
- PII detection/masking phải nằm phía server cho dữ liệu trả về preview. Không coi che UI là bảo vệ raw data.
- Với `pii=false`, đề xuất giữ giá trị `mask` nhưng effective masking=false; FE có thể bật lại sau đó.
- Retention cần soft-delete, lịch purge và cơ chế restore thật trước khi quảng bá “giữ mục đã xóa”.
- Không purge dữ liệu còn được run/paper tham chiếu trái với policy lưu trữ đã chốt.
- Region cần phân biệt vùng yêu cầu và vùng thực tế. Không đổi nhãn rồi coi dữ liệu cũ đã được migrate.

### 6.8. Spending

| FE key → wire | Kiểu, giá trị | Mock default |
| --- | --- | --- |
| `capped` → `monthly_limit_enabled` | Boolean. | `false` |
| `limit` → `monthly_limit_usd` | Decimal string >0 khi bật limit. | `"100"` |
| `warnAt` → `warning_percent` | Integer: `50, 75, 80, 90`. | `80` |
| `atLimit` → `at_limit_action` | `stop | pause | notify` | `stop` |
| `billingEmail` → `billing_email` | Email hợp lệ hoặc null khi rỗng. | Rỗng |

`stop` = không bắt đầu run mới; `pause` = thêm pause run đang chạy; `notify` = chỉ cảnh báo.
Tháng tính theo timezone project, reset ngày 1. BE xác định nguồn cost, reservation và thời điểm
ghi nhận; kiểm tra limit atomically để nhiều run song song không vượt giới hạn do race condition.
Không dùng số liệu sample để tính hạn mức; monthly limit tách biệt budget từng run.
Deduplicate thông báo vượt ngưỡng theo project/tháng/ngưỡng; delivery mail cần worker thực.

### 6.9. Notifications — dữ liệu riêng của user/project

Payload đề xuất: `{ channels, email_digest, quiet_hours_enabled }`.

| UI event key | Nội dung | Mock In app / Email |
| --- | --- | --- |
| `decision` | Run cần quyết định | true / true |
| `finished` | Run hoàn thành hoặc thất bại | true / false |
| `comments` | Bình luận mới trên run | true / false |
| `mentions` | Được nhắc tên | true / true |
| `approved` | Paper được duyệt | true / false |
| `imports` | Import dữ liệu hoàn thành | true / false |
| `spending` | Chi tiêu chạm ngưỡng cảnh báo | true / true |
| `members` | Thay đổi thành viên | true / false |

`channels[event] = { app: boolean, email: boolean }`.
`email_digest = off | daily | weekly`, mặc định `off` nghĩa gửi ngay, không phải tắt email.
`quiet_hours_enabled=false`; bật thì không gửi email 22:00–08:00 theo timezone project.
Mock chưa có picker giờ, ngày/giờ gửi digest; BE/FE cần chốt lịch daily/weekly.

Event category UI không bằng `NotificationKind` hiện có. Các kind đã có gồm
`run_awaiting_review`, `run_finished`, `run_commented`, `project_invited`, `invite_accepted`,
`invite_declined`, `member_role_changed`, `removed_from_project`, `added_to_project`.
BE cần mapping category → kind và bổ sung event còn thiếu, không gửi UI label làm event ID.
Không cho user thay preferences của người khác. Preferences không được tạo quyền nhận dữ liệu project
mà user không còn được xem. Chốt thông báo bảo mật/lời mời nào là bắt buộc, không bị tắt theo preferences thường.

## 7. Invite link và join requests — contract mới cần thống nhất

Sample link `https://research.example/join/...` không phải endpoint thật; không triển khai token bằng project ID rút gọn.

| Method | Path đề xuất | Hành vi |
| --- | --- | --- |
| GET | `/projects/{projectId}/join-link` | PM xem trạng thái link, URL/token được phép hiển thị và approval policy. |
| POST | `/projects/{projectId}/join-link/rotate` | PM tạo token ngẫu nhiên mới, thu hồi link cũ. |
| POST | `/project-join-requests` | User đã đăng nhập gửi `{ token }`; BE resolve project từ token và kiểm tra policy. |
| GET | `/projects/{projectId}/join-requests` | PM xem requests, filter `status`, phân trang. |
| POST | `/projects/{projectId}/join-requests/{requestId}/approve` | PM duyệt, nhận role hợp lệ và kiểm tra domain/membership lại. |
| POST | `/projects/{projectId}/join-requests/{requestId}/reject` | PM từ chối request pending. |

Status đề xuất: `pending | approved | rejected | cancelled`.
Tạo request lặp phải idempotent hoặc trả conflict rõ; không tạo nhiều active membership.
Link disabled/rotated phải được kiểm tra ở server; thông tin project trả về trước khi join cần giới hạn.
`approval=false` cần chốt tham gia trực tiếp hay tạo auto-approved request, vẫn kiểm tra domain và role.
UI hiện có switch policy nhưng **chưa có màn Join requests**. Không coi gợi ý tính năng trong trao đổi
trước đó là tính năng FE đã triển khai.

## 8. Integrations và webhooks

Đều là **contract đề xuất**, mock hiện không có OAuth hoặc outbound delivery.

| Method | Path | Hành vi cần có |
| --- | --- | --- |
| GET | `/projects/{projectId}/integrations` | Danh sách provider, capability và trạng thái kết nối. |
| POST | `/projects/{projectId}/integrations/{provider}/connect` | Khởi tạo OAuth/configuration flow phía server. |
| DELETE | `/projects/{projectId}/integrations/{integrationId}` | Disconnect/revoke theo provider. |
| GET / POST | `/projects/{projectId}/webhooks` | Liệt kê/tạo endpoint và subscriptions. |
| DELETE | `/projects/{projectId}/webhooks/{webhookId}` | Thu hồi endpoint, ngừng delivery tiếp theo. |

Provider mock: Slack, Microsoft Teams, Zotero, Mendeley, GitHub.
Trả ID, provider, status (`disconnected|pending|connected|error`), thông tin đích hiển thị được,
timestamps và `supported`; không trả access token, refresh token hoặc secret trong list response.
Chỉ chuyển connected sau khi hoàn tất xác thực và kiểm tra quyền cần thiết.

Webhooks có `id`, `url`, `events`, trạng thái enabled và metadata; BE kiểm tra HTTPS,
địa chỉ đích và redirect để tránh gọi nhầm tài nguyên nội bộ. Ký payload, delivery ID ổn định,
timeout/retry có giới hạn và deduplication ở bên nhận. Không log secret.

| UI label hiện có | Event ID đề xuất |
| --- | --- |
| Run started | `run.started` |
| Run needs a decision | `run.awaiting_review` |
| Run finished | `run.finished` |
| Paper approved | `paper.approved` |
| Dataset uploaded | `dataset.uploaded` |

Cần chốt `run.finished` bao gồm completed/failed/stopped hay chỉ completed, rồi mô tả payload tương ứng.
Mock add/remove hiện được Save cùng tab; BE resource CRUD là mutation riêng. FE cần đổi luồng lưu
cho rõ thao tác có hiệu lực ngay hay nằm trong draft, không trộn hai semantics.

## 9. Activity, lifecycle, transfer, duplicate và export

### Activity

Endpoint project-scoped đề xuất trả item tương thích `AuditItem` hiện có:
`id`, `actor_user_id`, `action`, `resource_type`, `resource_id`, `project_id`, `request_id`, `details`, `created_at`.
Thêm thông tin actor hiển thị được hoặc dùng lookup membership có fallback cho người đã rời project.
Sắp mới nhất trước, thứ tự ổn định khi trùng timestamp. Không lộ audit của project khác hoặc secret.
Chỉ ghi audit khi mutation commit; không ghi event mẫu của UI vào audit thật.
Thay đổi settings nên ghi section, các field đổi và before/after đã redact, gắn actor/request ID.

### Lifecycle và ownership

- Nối lại các adapter archive/restore/complete/reopen ở mục 3; dùng status BE trả về.
- Đừng copy logic preview `restore → draft`, `reopen → data_ready` thành business rule.
  BE quyết định trạng thái hợp lệ và hành vi với run đang chạy/đang chờ review.
- Chỉ owner được transfer/delete theo UI hiện có; BE bắt buộc kiểm tra lại owner.
- `POST /projects/{projectId}/transfer-ownership` đề xuất nhận `{ new_owner_user_id }`.
  Kiểm tra active member cùng project, xử lý role owner cũ/mới trong một transaction,
  bảo đảm không có giai đoạn project không owner hoặc tạo PM ngoài policy.
- `DELETE /projects/{projectId}` chưa có FE service trong `fetch-project.ts`.
  Cần chốt hard delete hay soft delete/retention trước khi nối nút; chặn hoặc xử lý run đang hoạt động,
  thu hồi link/integration/delivery và lưu audit phù hợp. Xác nhận bằng tên tại FE không thay thế BE authorization.

### Duplicate và export

- Duplicate hiện chỉ toast; đề xuất `POST /projects/{projectId}/duplicate`.
  Copy metadata/settings được phép, không copy dataset/run, members, credentials, webhooks,
  invite tokens hoặc lịch sử audit. Project mới có owner/PM là người tạo, trạng thái do BE quyết định.
- Export hiện chỉ tải JSON metadata/preferences trên browser; không có full-project archive.
  BE có thể cung cấp `GET /projects/{projectId}/settings/export` nếu cần canonical settings export.
  Không mở rộng thành export toàn bộ dataset/tài liệu/run nếu chưa chốt phạm vi.
- Không xuất secret của integrations/webhooks hoặc preferences riêng của user khác.

## 10. Persistence, áp dụng runtime và FE wiring

Đề xuất tối thiểu: bản ghi settings theo `project_id` với schema version, revision và actor metadata;
notification preferences theo `(project_id, user_id)`; integration/webhook/join request lưu riêng.
BE lựa chọn cấu trúc SQL/JSON phù hợp hệ thống hiện tại, không bắt buộc một bảng cho mỗi tab.

Lưu được giá trị và thực thi giá trị là hai mốc bàn giao khác nhau:

| Nhóm | Nơi cần áp dụng thật |
| --- | --- |
| Access | Mời/gửi lại lời mời, join, membership, raw dataset/preview/download APIs. |
| Runs / Models / Literature | Tạo run, snapshot cấu hình, scheduler, worker và provider call. |
| Review | Review authorization, approval counting, publish/export generator. |
| Data | Upload/import/parser, preview masking, version binding, storage/purge worker. |
| Spending | Cost ledger, admission/concurrency checks, cảnh báo và pause/stop runtime. |
| Notifications | Event routing, in-app delivery, mail worker, digest và quiet-hour scheduler. |
| Integrations | OAuth callback, token lifecycle, outbound worker và retries. |

Khi nối BE, FE cần:

1. Thay `SettingsPreviewProvider`/`useDraft` persistence bằng query/mutation lấy snapshot thật;
   form draft vẫn giữ để Save/Discard, chỉ clear dirty sau response thành công.
2. Hydrate defaults từ GET, không lấy constant mock làm chính sách khi BE đã trả giá trị.
3. Map key/control string theo mục 6, dùng capabilities để khóa lựa chọn unsupported.
4. General lưu metadata và preferences atomically; cập nhật project detail/list/sidebar từ canonical response.
5. Reuse Members/Invitations adapter hiện có; đồng bộ default role và TTL từ contract đã chốt.
6. Nối lifecycle adapter hiện có, thay sample Activity bằng audit scope project.
7. Tách query cache project settings và current-user preferences; clear cache khi logout/chuyển user.
8. Xử lý 409 bằng tải lại snapshot, giữ draft để người dùng quyết định; không auto overwrite.
9. Bổ sung lối vào notification preferences cho Researcher/Reviewer nếu tính năng dành cho mọi member.
10. Đảm bảo lỗi qua Sonner; không thêm inline error banner hoặc suy quyền từ tên role platform.

## 11. Các quyết định còn mở — không tự xem mock là yêu cầu đã duyệt

| Điểm cần chốt | Hiện trạng / lý do |
| --- | --- |
| TTL lời mời | Invitations đang ghi 24 giờ; Access settings mock 7 ngày. Cần một nguồn sự thật và migration/default cho lời mời cũ. |
| Researcher mời người khác | Policy hiện tại chỉ PM quản lý members; `who_can_invite=researchers` là mở rộng quyền, chưa có UI invite cho Researcher. |
| Organization visibility | Chưa xác minh mô hình organization hoặc membership organization trong contract project hiện có. |
| Reviewer và dataset | Policy hiện tại cho đọc workspace; tắt raw data cần enforce đồng bộ preview/download/connection data và URL truy cập tệp. |
| Người được approve | `reviewers-managers`, `anyone`, self-approval phải thống nhất với review workflow và role policy hiện có. |
| Notification khi archived | UI mock vẫn cho sửa personal notifications; cần chốt exception cho user preferences hay khóa như mutation project. |
| Model/source/format/region support | Danh sách mock không chứng minh runtime hỗ trợ. BE trả catalog/capability và lý do unavailable. |
| Version policy | Chốt `latest`/`pinned` và thời điểm bind dataset version cho khả năng tái lập. |
| Lịch digest và quiet hours | Chốt giờ/ngày gửi, DST và cách dời lịch khi đổi timezone; không mất hoặc gửi trùng mail. |
| Integration delivery | Chốt cấu hình đích từng provider, quyền OAuth, webhook schema, retry và audit. |
| Retention/delete/ownership | Chốt dữ liệu được giữ, khi nào purge, role owner cũ và hành vi với run đang chạy. |
| Join requests / bulk invites / View permissions | Đã được gợi ý trong trao đổi; chưa có UI hoàn chỉnh. Bulk invite và View permissions không thuộc yêu cầu API bắt buộc của mock hiện tại. |

## 12. Thứ tự triển khai và tiêu chí bàn giao

### Giai đoạn đề xuất

1. Chốt policy/enum/default; GET settings + PATCH theo section + versioning + capabilities + audit.
2. Nối General, Access, lifecycle và TTL/default-role vào API hiện có; giữ role protection.
3. Thực thi Runs/Models/Literature/Review/Data/Spending trong runtime. Field chưa hỗ trợ để unavailable.
4. Notification delivery/digest, integrations/webhooks và các luồng join/ownership/delete cần bổ sung.

### Checklist nghiệm thu để BE/FE thực hiện sau

- [ ] Response thực tế/OpenAPI khớp field, enum, unit, nullable và envelope đã chốt.
- [ ] Project cũ đọc được effective defaults; reload/đăng nhập lại vẫn thấy giá trị đã lưu.
- [ ] PATCH không làm mất field/section không gửi; request lỗi không ghi một phần.
- [ ] Hai PM lưu version cũ không ghi đè nhau; metadata/audit đúng actor và project.
- [ ] Test PM/Researcher/Reviewer/non-member và Platform Admin không có membership qua API trực tiếp.
- [ ] Archived project chặn mutation đúng policy; restore hoạt động và trả status authoritative.
- [ ] Owner/PM protection, candidate scope, resend/cancel/expiry và default role nhất quán.
- [ ] Policy raw data được áp dụng cho mọi đường preview/download và dữ liệu từ connection.
- [ ] Run tạo mới snapshot cấu hình; run cũ không bị đổi ngầm; concurrency/cost checks chịu được race.
- [ ] Retention, timeout, retry, digest, quiet hours và delivery có worker hoạt động thật.
- [ ] Chỉ xác nhận email delivery sau khi kiểm tra cơ chế gửi/receipt, không dựa riêng enqueue hoặc mock toast.
- [ ] Test mail/invite chỉ dùng tài khoản `@example.com`, không gửi cho người thật; dọn dữ liệu test đã tạo.
- [ ] Kiểm tra desktop, khoảng 390px và dark mode khi FE nối lại; không cuộn ngang toàn trang.

Checklist trên là việc cần làm khi tích hợp, **không phải kết quả test đã chạy**.
Lượt bàn giao này chỉ tạo tài liệu; không chạy test/build/lint/live API.

## 13. Source map cho người triển khai

| Source | Vai trò |
| --- | --- |
| `src/app/(main)/projects/[projectId]/_components/settings-section.tsx` | Menu Settings, General, compose Members & access. |
| `settings-extra.tsx` trong cùng thư mục | Access, Models, Literature, Review, Data, Integrations và webhook mock. |
| `settings-system.tsx` trong cùng thư mục | Runs, Spending và Notifications mock. |
| `settings-kit.tsx`, `settings-preview.tsx` | Cơ chế draft/save trong phiên, không persistence server. |
| `settings-preview-lifecycle.tsx`, `settings-preview-activity.tsx` | Lifecycle, ownership/delete và Activity đang render ở chế độ mô phỏng. |
| `settings-lifecycle.tsx`, `settings-activity.tsx` | Thành phần cũ có adapter lifecycle/audit; không dùng thay cho bằng chứng màn hiện tại đã nối API. |
| `members-section.tsx`, `member-rows.tsx`, `invite-member-dialog.tsx` | UI Members/Invitations và kiểm tra quyền hiện có. |
| `src/lib/api/services/fetch-project.ts`, `fetch-members.ts`, `fetch-runs.ts`, `fetch-notifications.ts`, `fetch-admin.ts` | Adapter/DTO hiện có. |
| `src/lib/auth/project-access.ts`, `docs/project-role-policy.md` | Role policy FE và các yêu cầu BE alignment. |
| `src/types/api.ts`, `src/types/enums.ts` | Envelope, error shape và enum hiện tại. |
| `src/lib/api/config.ts`, `src/lib/api/server-config.ts` | Phân biệt base URL browser và server. |

Các path rút gọn `settings-*.tsx`, `members-*.tsx` ở trên đều nằm dưới
`src/app/(main)/projects/[projectId]/_components/`.
