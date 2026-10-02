# Platform BE — Handoff API cho Frontend

Tài liệu này mô tả toàn bộ API của Platform BE mà frontend gọi: cách đăng nhập, quy ước chung, từng endpoint với request/response, mã lỗi, và các luồng màn hình chính.

- Nhánh code: `feat/research-apis` (repo `ai-research-platform-be`)
- Ngày cập nhật: 2026-10-02
- Schema máy đọc được (luôn đúng nhất): Swagger UI `GET /docs`, OpenAPI `GET /openapi.json`

## 1. Kết nối

| Mục | Giá trị |
|---|---|
| Base URL local | `http://localhost:8000` |
| Prefix | mọi endpoint bắt đầu bằng `/api/v1` |
| Base URL deploy | chưa có, sẽ báo sau khi chọn hosting |
| Kiểu dữ liệu | JSON (`Content-Type: application/json`), trừ upload dataset dùng `multipart/form-data` |
| Xác thực | cookie phiên HttpOnly tên `platform_session` (FE không đọc được, trình duyệt tự gửi) |

Chạy BE ở máy: xem phần Quick start trong `README.md` của repo (`task up`, `task migrate`).

### 4 quy tắc bắt buộc

1. **Mọi request** phải gửi kèm cookie: `fetch(url, { credentials: "include" })` hoặc axios `withCredentials: true`.
2. **Origin của FE phải được BE cho phép.** Báo cho BE địa chỉ FE (ví dụ `http://localhost:3000`) để thêm vào `CORS_ALLOWED_ORIGINS`. Sai origin → `403 ORIGIN_NOT_ALLOWED`.
3. **Mọi request thay đổi dữ liệu** (`POST`, `PUT`, `PATCH`, `DELETE`, trừ `POST /auth/register` và `POST /auth/login`) phải có header `X-CSRF-Token`. Thiếu hoặc sai → `403 CSRF_INVALID`.
4. **Rẽ nhánh theo `error.code`**, không theo `message` (message có thể đổi câu chữ).

### Client mẫu

```ts
const BASE = "http://localhost:8000/api/v1";
let csrfToken: string | null = null;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
              public details: { field: string; message: string }[] = []) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<{ data: T; pagination: Pagination | null }> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (method !== "GET") {
    if (!csrfToken && path !== "/auth/login") {
      csrfToken = (await api<{ csrf_token: string }>("/auth/csrf-token")).data.csrf_token;
    }
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }
  // Không tự đặt Content-Type khi body là FormData (trình duyệt tự thêm boundary).
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const res = await fetch(BASE + path, { ...init, headers, credentials: "include" });
  const json = await res.json();
  if (!json.success) {
    if (res.status === 401) csrfToken = null; // phiên đã hết, đưa người dùng về trang đăng nhập
    throw new ApiError(res.status, json.error.code, json.message, json.error.details);
  }
  return { data: json.data, pagination: json.meta.pagination };
}
```

Sau `POST /auth/login`, lưu `csrf_token` trả về vào biến `csrfToken`. Sau khi tải lại trang, token mất → lấy lại bằng `GET /auth/csrf-token` (client mẫu tự làm).

## 2. Định dạng response

Mọi endpoint (trừ hai endpoint tải file) trả cùng một khung.

Thành công:

```json
{
  "success": true,
  "message": "OK",
  "data": { "id": "..." },
  "meta": { "request_id": "...", "pagination": null }
}
```

- Endpoint danh sách: `data` là mảng, `meta.pagination = { "total": 37, "limit": 50, "offset": 0 }`.
- Endpoint không có gì để trả (logout, xoá thành viên): `200` với `"data": null`.
- `meta.request_id` trùng header `X-Request-ID`. Khi báo lỗi cho BE, gửi kèm giá trị này.

Thất bại:

```json
{
  "success": false,
  "message": "The email or the password is wrong",
  "error": { "code": "INVALID_CREDENTIALS", "details": [] },
  "meta": { "request_id": "..." }
}
```

`error.details` chỉ có nội dung với `VALIDATION_ERROR` (422): mảng `{ "field", "message" }` để hiển thị lỗi theo từng ô nhập.

### Quy ước dữ liệu

| Loại | Quy ước |
|---|---|
| ID | chuỗi UUID |
| Thời gian | chuỗi ISO-8601 có múi giờ, ví dụ `2026-10-02T08:15:30.123456Z` |
| Tiền (`budget_usd`, `cost_usd`) | **chuỗi** số thập phân, ví dụ `"5.00"`. Đừng cộng trừ bằng `number` nếu cần chính xác |
| Phân trang | query `limit` (1–100, mặc định 50) và `offset` (mặc định 0) |
| Trường nullable | luôn có mặt trong response, giá trị `null` khi không có |

## 3. Đăng ký, đăng nhập và phiên

BE tự quản lý tài khoản và mật khẩu, **không dùng Firebase, không có đăng nhập Google**. FE không cần SDK xác thực nào, chỉ gọi API. Tên đăng nhập là email.

```text
Đăng ký:   POST /auth/register { email, password, display_name? }
Đăng nhập: POST /auth/login    { email, password }
   ↓  cả hai đều: BE đặt cookie phiên, trả user + session + csrf_token
Gọi các API khác với credentials: "include" + X-CSRF-Token
```

Lưu ý cho FE:

- **Đăng ký xong là đã đăng nhập**: `/auth/register` trả đúng dữ liệu như `/auth/login`, không cần gọi login thêm. Tài khoản dùng được ngay, không có bước xác minh email hay admin duyệt.
- **Mật khẩu**: 8–128 ký tự (kiểm tra ở FE trước, BE trả `422 VALIDATION_ERROR` nếu sai). BE không bắt buộc chữ hoa/số/ký tự đặc biệt. Ô "nhập lại mật khẩu" do FE tự so sánh, không gửi lên BE.
- **Email** không phân biệt hoa thường khi đăng nhập.
- **Sai email hoặc sai mật khẩu** đều trả cùng một lỗi `401 INVALID_CREDENTIALS`: hiển thị "Email hoặc mật khẩu không đúng", đừng nói rõ cái nào sai.
- **Phiên** sống 30 ngày kể từ lúc đăng nhập, miễn là được dùng ít nhất 7 ngày một lần. Không có refresh token.
- **Đổi mật khẩu**: `POST /auth/change-password`. Thiết bị đang đổi vẫn đăng nhập, mọi thiết bị khác bị đăng xuất.
- **Chưa có "quên mật khẩu"** và chưa có xác minh email, vì BE không gửi email. Đừng làm màn hình "quên mật khẩu" cho tới khi BE có endpoint.
- **Đăng xuất**: gọi `POST /auth/logout`.
- Khi nhận `401` với `SESSION_EXPIRED`, `UNAUTHENTICATED` hoặc `USER_SUSPENDED`: đưa người dùng về trang đăng nhập.

### Endpoint

| Method | Path | Body | `data` trả về |
|---|---|---|---|
| `POST` | `/auth/register` | `{ email, password, display_name? }` | `SessionResult` (HTTP `201`) |
| `POST` | `/auth/login` | `{ email, password }` | `SessionResult` |
| `POST` | `/auth/change-password` | `{ current_password, new_password }` | `null` |
| `GET` | `/auth/me` | — | `CurrentUser` |
| `GET` | `/auth/csrf-token` | — | `{ csrf_token }` |
| `POST` | `/auth/logout` | — | `null` |
| `POST` | `/auth/logout-all` | — | `null` (đăng xuất mọi thiết bị) |

`/auth/register` và `/auth/login` không cần `X-CSRF-Token` (chưa có phiên) nhưng vẫn cần đúng `Origin`. `/auth/change-password` cần `X-CSRF-Token` như mọi request thay đổi dữ liệu.

`GET /auth/me` là endpoint gọi đầu tiên sau khi tải lại trang: trả người dùng, vai trò hệ thống, hạn phiên, và `memberships` (các project của người dùng kèm vai trò trong từng project) để dựng menu.

Lỗi:

| Endpoint | HTTP | `error.code` | Xử lý ở FE |
|---|---|---|---|
| register | 409 | `EMAIL_ALREADY_REGISTERED` | báo "email đã có tài khoản", gợi ý đăng nhập |
| register, login | 422 | `VALIDATION_ERROR` | email sai định dạng hoặc mật khẩu ngoài 8–128 ký tự; hiện lỗi theo `error.details` |
| login | 401 | `INVALID_CREDENTIALS` | "Email hoặc mật khẩu không đúng" |
| login | 403 | `USER_SUSPENDED` | báo tài khoản bị khoá |
| register, login | 429 | `RATE_LIMITED` | quá 10 lần/phút (tính chung cả hai), chờ theo header `Retry-After` rồi thử lại |
| change-password | 403 | `CURRENT_PASSWORD_INCORRECT` | báo mật khẩu hiện tại sai |

### Các case

| # | Case | Gọi | BE trả |
|---|---|---|---|
| 1 | Đăng ký email mới | `POST /auth/register` | `201`, đã đăng nhập |
| 2 | Đăng ký email đã có | `POST /auth/register` | `409 EMAIL_ALREADY_REGISTERED` |
| 3 | Đăng nhập đúng | `POST /auth/login` | `200` |
| 4 | Sai email hoặc mật khẩu | `POST /auth/login` | `401 INVALID_CREDENTIALS` |
| 5 | Tài khoản bị khoá | `POST /auth/login` | `403 USER_SUSPENDED` |
| 6 | Tải lại trang khi còn phiên | `GET /auth/me` | `200` |

## 4. Vai trò và quyền

| Vai trò | Giá trị | Phạm vi |
|---|---|---|
| Platform Admin | `platform_role: "platform_admin"` | toàn hệ thống |
| Project Manager | `role: "project_manager"` | trong 1 project (người tạo project) |
| Researcher | `role: "researcher"` | trong 1 project |
| Reviewer | `role: "reviewer"` | trong 1 project (chỉ đọc + bình luận) |

Dùng `my_role` trong `ProjectItem` (hoặc `memberships` từ `/auth/me`) cùng `user.platform_role` để ẩn/hiện nút. Platform Admin làm được mọi việc của Project Manager ở mọi project; khi đó `my_role` có thể là `null`.

| Hành động | Admin | PM | Researcher | Reviewer |
|---|:-:|:-:|:-:|:-:|
| Xem mọi thứ trong project, tải file | ✓ | ✓ | ✓ | ✓ |
| Bình luận, sửa bình luận của mình | ✓ | ✓ | ✓ | ✓ |
| Xoá bình luận | mọi bình luận | mọi bình luận | của mình | của mình |
| Tải dataset, lưu research context | ✓ | ✓ | ✓ | ✗ |
| Bắt đầu run, sync run, duyệt frame | ✓ | ✓ | ✓ | ✗ |
| Abandon run | ✓ | ✓ | ✗ | ✗ |
| Sửa project, quản lý thành viên, archive, complete | ✓ | ✓ | ✗ | ✗ |
| Xem audit log của project | ✓ | ✓ | ✗ | ✗ |
| Quản lý user, audit toàn hệ thống, thống kê chi phí | ✓ | ✗ | ✗ | ✗ |

Cách BE từ chối:

- Không phải thành viên → `404 NOT_FOUND` (BE không tiết lộ project có tồn tại).
- Là thành viên nhưng vai trò không đủ → `403 ROLE_REQUIRED`.
- Project đã archive → mọi thao tác ghi trả `409 PROJECT_ARCHIVED` (chỉ đọc).

## 5. Project và thành viên

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| `GET` | `/projects` | `include_archived`, `limit`, `offset` | `ProjectItem[]` |
| `POST` | `/projects` | `ProjectCreate` | `ProjectItem` (201) |
| `GET` | `/projects/{project_id}` | — | `ProjectItem` |
| `PATCH` | `/projects/{project_id}` | `ProjectPatch` (ít nhất 1 trường) | `ProjectItem` |
| `POST` | `/projects/{project_id}/archive` | — | `ProjectItem` |
| `POST` | `/projects/{project_id}/restore` | — | `ProjectItem` |
| `POST` | `/projects/{project_id}/complete` | — | `ProjectItem` |
| `POST` | `/projects/{project_id}/reopen` | — | `ProjectItem` |
| `GET` | `/projects/{project_id}/members` | `limit`, `offset` | `ProjectMemberItem[]` |
| `POST` | `/projects/{project_id}/members` | `{ email, role }` | `ProjectMemberItem` (201) |
| `PUT` | `/projects/{project_id}/members/{membership_id}` | `{ role }` | `ProjectMemberItem` |
| `DELETE` | `/projects/{project_id}/members/{membership_id}` | — | `null` |

Ghi chú:

- `GET /projects` trả project người dùng tham gia, mới nhất trước; Platform Admin thấy tất cả.
- Thêm thành viên bằng **email của người đã có tài khoản**. Không có lời mời qua email.
- `membership_id` là `id` của `ProjectMemberItem`, không phải `user_id`.
- Không có xoá cứng project: "xoá" là archive, khôi phục được.

Trạng thái project (`ProjectItem.status`), BE tự tính:

| `status` | Ý nghĩa | Gợi ý hiển thị |
|---|---|---|
| `draft` | chưa có dataset | "Chưa có dữ liệu" |
| `data_ready` | có dataset, không có run đang chạy | "Sẵn sàng" |
| `researching` | có run đang chạy | "Đang nghiên cứu" |
| `needs_review` | run đang chờ duyệt frame | "Cần duyệt" |
| `completed` | PM đánh dấu hoàn thành | "Hoàn thành" |
| `archived` | đã archive (chỉ đọc) | "Đã lưu trữ" |

Mã lỗi riêng:

| HTTP | `error.code` | Khi nào |
|---|---|---|
| 404 | `REGISTERED_USER_NOT_FOUND` | email thêm vào chưa có tài khoản |
| 409 | `MEMBERSHIP_EXISTS` | người đó đã là thành viên |
| 409 | `USER_SUSPENDED` | người được thêm đang bị khoá |
| 409 | `LAST_PROJECT_MANAGER` | hạ quyền/xoá Project Manager cuối cùng |
| 409 | `RUN_ACTIVE` | complete khi còn run đang chạy |
| 422 | `EMPTY_UPDATE` | `PATCH` không có trường nào |

## 6. Dataset

Chỉ nhận file CSV.

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| `GET` | `/projects/{project_id}/datasets` | `limit`, `offset` | `DatasetItem[]` |
| `POST` | `/projects/{project_id}/datasets` | multipart: `name`, `description?`, `file` | `DatasetItem` (201) |
| `GET` | `/projects/{project_id}/datasets/{dataset_id}` | — | `DatasetItem` |
| `PATCH` | `/projects/{project_id}/datasets/{dataset_id}` | `{ name?, description? }` | `DatasetItem` |
| `GET` | `/projects/{project_id}/datasets/{dataset_id}/versions` | `limit`, `offset` | `DatasetVersionItem[]` |
| `POST` | `/projects/{project_id}/datasets/{dataset_id}/versions` | multipart: `file` | `DatasetVersionItem` (201) |
| `GET` | `/projects/{project_id}/datasets/{dataset_id}/versions/{version_id}/download` | — | nội dung file |

Upload:

```ts
const form = new FormData();
form.append("name", "Điểm thi 2025");
form.append("description", "Khối 12");
form.append("file", fileInput.files[0]);       // file .csv
await api<DatasetItem>(`/projects/${projectId}/datasets`, { method: "POST", body: form });
```

Điều kiện của file (nên kiểm tra trước ở FE để báo lỗi sớm):

- Đuôi `.csv`, mã hoá UTF-8, tối đa 50 MiB.
- Dòng đầu là header; tên cột không rỗng, không trùng, tối đa 2000 cột, mỗi tên tối đa 200 ký tự.
- Có ít nhất 1 dòng dữ liệu; mọi dòng có cùng số cột với header.

Mỗi lần upload file mới cho một dataset là một **version mới**; version cũ không bao giờ bị ghi đè. `DatasetItem.latest_version.column_names` là danh sách cột — dùng để gợi ý khi người dùng khai báo biến trong research context.

Tải file: mở thẳng URL download (cùng cookie) bằng `window.location` hoặc thẻ `<a href>`; BE trả header `Content-Disposition: attachment`.

| HTTP | `error.code` | Khi nào |
|---|---|---|
| 409 | `DATASET_NAME_EXISTS` | trùng tên dataset trong project |
| 413 | `REQUEST_BODY_TOO_LARGE` | file quá giới hạn |
| 415 | `UNSUPPORTED_FILE_TYPE` | không phải `.csv` |
| 422 | `INVALID_DATASET` | CSV không hợp lệ; `message` nói rõ lý do, hiển thị thẳng cho người dùng |

## 7. Research context

Mô tả nghiên cứu của project. Mỗi lần lưu tạo một version mới.

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| `GET` | `/projects/{project_id}/research-context` | — | `ResearchContextItem` (mới nhất) |
| `PUT` | `/projects/{project_id}/research-context` | `ResearchContextSave` | `ResearchContextItem` (201) |
| `GET` | `/projects/{project_id}/research-context/versions` | `limit`, `offset` | `ResearchContextSummary[]` |
| `GET` | `/projects/{project_id}/research-context/versions/{version_number}` | — | `ResearchContextItem` |

```json
{
  "body": "# Câu hỏi nghiên cứu\nThời gian học có ảnh hưởng tới điểm thi không?",
  "front_matter": {
    "domain": "education",
    "objectives": ["Đo ảnh hưởng của thời gian học"],
    "variables": { "exam_score": { "role": "outcome" }, "study_hours": { "role": "exposure" } }
  },
  "base_version": 3
}
```

- `body`: Markdown, bắt buộc, tối đa 50 000 ký tự.
- `front_matter`: tuỳ chọn. Các khoá cấp 1 cố định: `domain`, `objectives`, `variables`, `design`, `assumptions`, `constraints`, `concepts`, `notes`. Nội dung bên trong do Popper kiểm tra khi chạy run.
- `base_version`: số version mà người dùng đang sửa (`0` nếu chưa có version nào). Nếu người khác đã lưu version mới hơn → `409 RESEARCH_CONTEXT_CONFLICT`: FE tải lại bản mới nhất và cho người dùng gộp thay đổi.
- Project chưa có context: `GET` trả `404 RESEARCH_CONTEXT_NOT_FOUND` → hiển thị form trống.

## 8. Run

Một run = một lần gửi 1 version dataset + 1 version research context sang Popper để nghiên cứu.

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| `GET` | `/projects/{project_id}/runs` | `limit`, `offset` | `RunItem[]` (mới nhất trước) |
| `POST` | `/projects/{project_id}/runs` | `RunCreate` | `RunItem` (201 hoặc 202) |
| `GET` | `/projects/{project_id}/runs/{run_id}` | — | `RunItem` |
| `POST` | `/projects/{project_id}/runs/{run_id}/sync` | — | `RunItem` |
| `POST` | `/projects/{project_id}/runs/{run_id}/abandon` | — | `RunItem` |

Bắt đầu run:

```json
{
  "dataset_version_id": "7b0c...",
  "research_context_version": 3,
  "budget_usd": "5.00",
  "auto_review": false
}
```

- `research_context_version`: bỏ trống = dùng version mới nhất.
- `budget_usd`: trần chi phí; bỏ trống = mặc định của server (5 USD), tối đa 20 USD.
- `auto_review: true`: Popper tự chạy tiếp, không dừng lại chờ người duyệt frame.
- `201`: Popper đã nhận. `202`: Popper chưa xác nhận kịp, run ở `queued` → vẫn coi là tạo thành công, hiển thị run và cho người dùng bấm "Làm mới" (gọi `sync`).

Trạng thái run (`RunItem.status`):

| `status` | Ý nghĩa | Nút nên hiện |
|---|---|---|
| `queued` | đã lưu, Popper chưa xác nhận | Làm mới (`sync`) |
| `running` | Popper đang chạy | Làm mới (`sync`) |
| `awaiting_review` | chờ người duyệt frame | Duyệt frame |
| `completed` | xong | Xem kết quả |
| `budget_exceeded` | dừng vì hết budget | Xem kết quả (nếu có) |
| `failed` | lỗi; lý do ở `failure_message` | — |

Ba trạng thái cuối là kết thúc, không bao giờ đổi nữa.

### Cập nhật trạng thái

**BE không có WebSocket/SSE và không tự hỏi Popper.** Trạng thái đổi khi Popper gọi về BE. FE cần:

- Khi run đang `queued` / `running` / `awaiting_review`: gọi lại `GET …/runs/{run_id}` theo chu kỳ (gợi ý 10–15 giây) khi người dùng đang mở trang run.
- Có nút "Làm mới" gọi `POST …/sync` để BE chủ động hỏi Popper khi run có vẻ đứng yên.
- Nếu `sync` liên tục trả `502`, hiện nút "Huỷ run" (`abandon`) cho Project Manager / Platform Admin. Run chuyển `failed`, project chạy run mới được.

Mỗi project chỉ có **một run chưa kết thúc**. Tạo run khi đang có run → `409 RUN_ACTIVE`: ẩn nút "Bắt đầu run" khi `project.status` là `researching` hoặc `needs_review`.

| HTTP | `error.code` | Khi nào / xử lý |
|---|---|---|
| 409 | `RUN_ACTIVE` | project đang có run |
| 409 | `PROJECT_COMPLETED` | project đã completed, phải reopen trước |
| 409 | `RUN_DISPATCHING` | run vừa tạo, đang gửi đi; thử `sync`/`abandon` lại sau khoảng 1 phút |
| 409 | `RUN_FINISHED` | `abandon` một run đã kết thúc |
| 422 | `RESEARCH_CONTEXT_REQUIRED` | chưa có research context |
| 422 | `UNKNOWN_COLUMNS` | context khai báo biến không có trong cột dataset; `message` liệt kê tên |
| 422 | `BUDGET_OUT_OF_RANGE` | budget ≤ 0 hoặc vượt mức tối đa |
| 500 | `RUN_START_FAILED` | lỗi bất ngờ khi gửi; run đã được đánh `failed` |
| 502 | `POPPER_UNAVAILABLE`, `POPPER_BAD_RESPONSE` | Popper lỗi; thử lại sau |
| 503 | `POPPER_NOT_CONFIGURED` | server chưa nối Popper (môi trường dev) |

> Hiện Popper v2 chưa có HTTP API, nên ở môi trường dev ba thao tác gọi Popper (bắt đầu run, sync, duyệt frame) trả `503 POPPER_NOT_CONFIGURED`. Mọi API khác chạy bình thường. FE nên dựng màn hình run theo schema ở đây và xử lý mã lỗi này bằng một thông báo rõ ràng.

## 9. Frame review

Khi run ở `awaiting_review`, Popper gửi một "frame" gồm nhiều mục cần người duyệt.

| Method | Path | Body | `data` |
|---|---|---|---|
| `GET` | `/projects/{project_id}/runs/{run_id}/frame-review` | — | `FrameReviewItem` (đang chờ, hoặc gần nhất) |
| `POST` | `/projects/{project_id}/runs/{run_id}/frame-review` | `FrameReviewSubmit` | `FrameReviewItem` |
| `GET` | `/projects/{project_id}/runs/{run_id}/frame-reviews` | — | `FrameReviewItem[]` (mới nhất trước) |

`FrameReviewItem.request` là nguyên văn Popper gửi; BE chỉ đảm bảo có `items` là một map `id → nội dung`:

```json
{
  "frame": "Exam performance",
  "items": {
    "variables.exam_score.role": { "value": "outcome", "status": "proposed" },
    "variables.school.role": { "value": "cluster", "status": "proposed" },
    "questions.q1": { "value": { "text": "Does study time matter?" }, "status": "proposed" }
  }
}
```

FE hiển thị mỗi mục theo `id` và `value`; cấu trúc bên trong `value` do Popper quyết định nên hãy render phòng thủ (chuỗi thì in chuỗi, object thì in dạng JSON/key-value).

Gửi quyết định — duyệt hết:

```json
{ "approve_all": true }
```

Hoặc từng mục (mục không nhắc tới được coi là `approve`):

```json
{
  "signals": [
    { "id": "variables.school.role", "signal": "edit", "value": "covariate" },
    { "id": "questions.q1", "signal": "reject", "note": "ngoài phạm vi" }
  ],
  "note": "Ghi chú chung"
}
```

- `signal`: `approve` | `edit` | `reject` | `unknown`. `edit` bắt buộc có `value`.
- Thành công: review chuyển `submitted`, run về `running`.
- `FrameReviewItem.status`: `pending` (chờ quyết định), `submitted` (đã quyết định; xem `decision`, `submitted_by_user_id`, `submitted_at`), `closed` (run đi tiếp mà không có quyết định).
- Một run có thể yêu cầu duyệt nhiều lần; `sequence` là số thứ tự.

| HTTP | `error.code` | Khi nào / xử lý |
|---|---|---|
| 404 | `FRAME_REVIEW_NOT_FOUND` | run chưa từng yêu cầu duyệt |
| 409 | `REVIEW_NOT_PENDING` | không có review nào đang chờ (người khác đã duyệt) → tải lại |
| 422 | `UNKNOWN_REVIEW_ITEM` | `id` không thuộc frame |
| 422 | `POPPER_REJECTED` | Popper từ chối quyết định; `message` nêu lý do |
| 502 | `POPPER_UNAVAILABLE` | Popper không xác nhận. Review vẫn `pending`; cho người dùng **gửi lại** cùng quyết định |

## 10. File kết quả (artifact)

| Method | Path | `data` |
|---|---|---|
| `GET` | `/projects/{project_id}/runs/{run_id}/artifacts` | `RunArtifactItem[]` |
| `GET` | `/projects/{project_id}/runs/{run_id}/artifacts/{artifact_id}/download` | nội dung file |

- `kind`: `paper_pdf` | `paper_tex` | `figure` | `results` | `other`.
- File luôn được trả dạng tải xuống (`Content-Disposition: attachment`). Muốn xem PDF/ảnh ngay trong trang: `fetch(url, { credentials: "include" })` → `blob()` → `URL.createObjectURL`.
- File có thể xuất hiện dần trong lúc run đang chạy; danh sách đầy đủ khi run kết thúc.

## 11. Bình luận

Mọi thành viên (kể cả Reviewer) bình luận trên một run, có thể gắn vào một file kết quả.

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| `GET` | `/projects/{project_id}/runs/{run_id}/comments` | `artifact_id?`, `limit`, `offset` | `CommentItem[]` (cũ nhất trước) |
| `POST` | `/projects/{project_id}/runs/{run_id}/comments` | `{ body, artifact_id? }` | `CommentItem` (201) |
| `PATCH` | `/projects/{project_id}/runs/{run_id}/comments/{comment_id}` | `{ body }` | `CommentItem` |
| `DELETE` | `/projects/{project_id}/runs/{run_id}/comments/{comment_id}` | — | `CommentItem` |

- `body`: 1–5000 ký tự.
- Bình luận đã xoá vẫn nằm trong danh sách với `deleted: true`, `body: null` → hiển thị "Bình luận đã bị xoá".
- `edited_at` khác `null` → hiển thị "đã chỉnh sửa".
- Lỗi: `403 NOT_COMMENT_AUTHOR` (sửa/xoá bình luận của người khác khi không có quyền), `422 ARTIFACT_NOT_IN_RUN`.

## 12. Thông báo

| Method | Path | Query | `data` |
|---|---|---|---|
| `GET` | `/notifications` | `unread_only`, `limit`, `offset` | `NotificationItem[]` (mới nhất trước) |
| `GET` | `/notifications/unread-count` | — | `{ unread_count }` |
| `POST` | `/notifications/{notification_id}/read` | — | `NotificationItem` |
| `POST` | `/notifications/read-all` | — | `{ marked }` |

Thông báo **không có sẵn câu chữ**; FE tự viết câu theo `kind`:

| `kind` | Người nhận | Câu gợi ý | Bấm vào thì mở |
|---|---|---|---|
| `added_to_project` | người được thêm | "{actor} đã thêm bạn vào {project}" | trang project |
| `run_awaiting_review` | PM + Researcher | "Run trong {project} đang chờ duyệt" | trang duyệt frame của `run_id` |
| `run_finished` | mọi thành viên | "Run trong {project} đã kết thúc" | trang run |
| `run_commented` | người bắt đầu run | "{actor} đã bình luận về run trong {project}" | phần bình luận của run |

Không có push/email: gọi `GET /notifications/unread-count` theo chu kỳ (gợi ý 30–60 giây) để cập nhật chấm đỏ.

## 13. Quản trị (Platform Admin)

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| `GET` | `/users` | `email?`, `limit`, `offset` | `UserAdminItem[]` |
| `PATCH` | `/users/{user_id}/status` | `{ status: "active" \| "suspended" }` | `UserAdminItem` |
| `PUT` | `/users/{user_id}/platform-role` | `{ role: "platform_admin" \| null }` | `UserAdminItem` |
| `GET` | `/audit` | `project_id?`, `action?`, `from?`, `to?`, `limit`, `offset` | `AuditItem[]` |
| `GET` | `/admin/usage/projects` | `from?`, `to?`, `limit`, `offset` | `ProjectUsageItem[]` |

- `GET /audit`: Platform Admin xem toàn hệ thống; **Project Manager** cũng gọi được nhưng bắt buộc truyền `project_id` của project mình quản lý.
- `from` / `to`: ISO-8601 **có múi giờ** (`2026-10-01T00:00:00+07:00`). Thiếu múi giờ → `422 TIMEZONE_REQUIRED`; `from` sau `to` → `422 INVALID_TIME_RANGE`. Nhớ `encodeURIComponent` vì dấu `+`.
- `/admin/usage/projects`: project tốn nhiều nhất đứng trước; project không có run trong khoảng thời gian vẫn được liệt kê với số 0.
- Lỗi: `409 LAST_PLATFORM_ADMIN` (khoá/gỡ quyền admin cuối cùng), `409 LAST_PROJECT_MANAGER` (khoá người đang là Project Manager duy nhất của một project có người khác).

## 14. Mã lỗi chung

Có thể gặp ở bất kỳ endpoint nào:

| HTTP | `error.code` | Ý nghĩa | Xử lý ở FE |
|---|---|---|---|
| 401 | `UNAUTHENTICATED` | chưa đăng nhập | về trang đăng nhập |
| 401 | `SESSION_EXPIRED` | phiên hết hạn / bị thu hồi | về trang đăng nhập |
| 401 | `USER_SUSPENDED` | tài khoản bị khoá | báo và về trang đăng nhập |
| 403 | `ORIGIN_NOT_ALLOWED` | origin FE chưa được cấu hình | báo BE thêm origin |
| 403 | `CSRF_INVALID` | thiếu/sai `X-CSRF-Token` | lấy lại token rồi gửi lại 1 lần |
| 403 | `ROLE_REQUIRED` | vai trò không đủ | ẩn nút / báo không có quyền |
| 404 | `NOT_FOUND` | không tồn tại hoặc không phải thành viên | trang 404 |
| 409 | `PROJECT_ARCHIVED` | project chỉ đọc | khoá các nút ghi |
| 413 | `REQUEST_BODY_TOO_LARGE` | body quá lớn (JSON tối đa 1 MiB) | báo người dùng |
| 422 | `VALIDATION_ERROR` | dữ liệu sai định dạng | hiển thị `error.details` theo ô nhập |
| 429 | `RATE_LIMITED` | gọi quá nhanh (chỉ áp cho login) | chờ rồi thử lại |

## 15. Kiểu dữ liệu (TypeScript)

```ts
type ProjectRole = "project_manager" | "researcher" | "reviewer";
type PlatformRole = "platform_admin";
type ProjectStatus = "draft" | "data_ready" | "researching" | "needs_review" | "completed" | "archived";
type RunStatus = "queued" | "running" | "awaiting_review" | "completed" | "budget_exceeded" | "failed";

interface Pagination { total: number; limit: number; offset: number }

interface UserProfile {
  id: string; email: string; display_name: string | null;
  status: "active" | "suspended"; platform_role: PlatformRole | null; created_at: string;
}
interface SessionDetails {
  created_at: string; last_seen_at: string; idle_expires_at: string; absolute_expires_at: string;
}
interface MembershipSummary { project_id: string; project_name: string; role: ProjectRole; archived: boolean }
interface SessionResult { user: UserProfile; session: SessionDetails; csrf_token: string }
interface CurrentUser { user: UserProfile; session: SessionDetails; memberships: MembershipSummary[] }

interface ProjectItem {
  id: string; name: string; description: string | null; domain: string | null; objective: string | null;
  tags: string[]; status: ProjectStatus; owner_user_id: string;
  my_role: ProjectRole | null;            // null: đang xem với tư cách Platform Admin
  created_at: string; updated_at: string;
}
interface ProjectCreate {
  name: string;                           // 2–160 ký tự
  description?: string | null;            // ≤ 5000
  domain?: string | null;                 // ≤ 160
  objective?: string | null;              // ≤ 10000
  tags?: string[];
}
type ProjectPatch = Partial<ProjectCreate>;
interface ProjectMemberItem {
  id: string;                             // membership_id
  user_id: string; email: string; display_name: string | null; role: ProjectRole; created_at: string;
}

interface DatasetVersionItem {
  id: string; dataset_id: string; version_number: number; original_filename: string;
  size_bytes: number; sha256: string;
  row_count: number;                      // không tính dòng header
  column_names: string[]; created_by_user_id: string; created_at: string;
}
interface DatasetItem {
  id: string; project_id: string; name: string; description: string | null;
  created_by_user_id: string; created_at: string; updated_at: string;
  latest_version: DatasetVersionItem | null;
}

interface FrontMatter {
  domain?: string | null; objectives?: unknown[] | null; variables?: Record<string, unknown> | null;
  design?: Record<string, unknown> | null; assumptions?: unknown[] | null;
  constraints?: Record<string, unknown> | null; concepts?: unknown[] | null; notes?: Record<string, unknown> | null;
}
interface ResearchContextSummary {
  id: string; project_id: string; version_number: number; created_by_user_id: string; created_at: string;
}
interface ResearchContextItem extends ResearchContextSummary { body: string; front_matter: FrontMatter | null }
interface ResearchContextSave { body: string; front_matter?: FrontMatter | null; base_version?: number | null }

interface RunCreate {
  dataset_version_id: string; research_context_version?: number | null;
  budget_usd?: string | number | null; auto_review?: boolean;
}
interface RunItem {
  id: string; project_id: string;
  dataset_id: string; dataset_version_id: string; dataset_version_number: number;
  research_context_id: string; research_context_version: number;
  created_by_user_id: string; status: RunStatus; auto_review: boolean;
  budget_usd: string; cost_usd: string;   // chuỗi số thập phân
  failure_message: string | null;
  created_at: string; started_at: string | null; finished_at: string | null; updated_at: string;
}

type ReviewSignalKind = "approve" | "edit" | "reject" | "unknown";
interface ReviewSignal { id: string; signal: ReviewSignalKind; value?: unknown; note?: string }
interface FrameReviewSubmit { approve_all?: boolean; signals?: ReviewSignal[]; note?: string }
interface FrameReviewItem {
  id: string; run_id: string; sequence: number; status: "pending" | "submitted" | "closed";
  requested_at: string;
  request: { items: Record<string, unknown>; [key: string]: unknown };
  decision: Record<string, unknown> | null;
  submitted_by_user_id: string | null; submitted_at: string | null;
}

interface RunArtifactItem {
  id: string; run_id: string; kind: "paper_pdf" | "paper_tex" | "figure" | "results" | "other";
  filename: string; content_type: string; size_bytes: number; sha256: string; created_at: string;
}

interface CommentItem {
  id: string; run_id: string; artifact_id: string | null;
  author_user_id: string; author_display_name: string | null;
  body: string | null;                    // null khi đã xoá
  deleted: boolean; created_at: string; edited_at: string | null;
}

interface NotificationItem {
  id: string; kind: "run_awaiting_review" | "run_finished" | "added_to_project" | "run_commented";
  project_id: string; project_name: string; run_id: string | null;
  actor_user_id: string | null; actor_display_name: string | null;
  created_at: string; read_at: string | null;   // null = chưa đọc
}

interface UserAdminItem {
  id: string; email: string; display_name: string | null; status: string;
  platform_role: PlatformRole | null; created_at: string;
}
interface AuditItem {
  id: string; actor_user_id: string | null; action: string; resource_type: string; resource_id: string;
  project_id: string | null; request_id: string | null; details: Record<string, unknown>; created_at: string;
}
interface ProjectUsageItem {
  project_id: string; project_name: string; archived: boolean; run_count: number;
  runs_by_status: Partial<Record<RunStatus, number>>;
  cost_usd: string; budget_usd: string; last_run_at: string | null;
}
```

## 16. Luồng màn hình gợi ý

```text
Trang đăng ký        → POST /auth/register (xong là đã đăng nhập)
Trang đăng nhập      → POST /auth/login
Đổi mật khẩu         → POST /auth/change-password
Khởi động app        → GET /auth/me (401 → trang đăng nhập)
Danh sách project    → GET /projects                          | tạo: POST /projects
Trang project        → GET /projects/{id} + /members + /datasets + /research-context + /runs
Tab Dataset          → upload: POST …/datasets (multipart)    | version mới: POST …/versions
Tab Research context → GET …/research-context → sửa → PUT (kèm base_version)
Bắt đầu run          → POST …/runs → mở trang run
Trang run            → GET …/runs/{run_id} (lặp 10–15s khi chưa kết thúc) | Làm mới: POST …/sync
Duyệt frame          → GET …/frame-review → POST …/frame-review
Kết quả              → GET …/artifacts → tải …/artifacts/{id}/download
Bình luận            → GET/POST …/comments
Chuông thông báo     → GET /notifications/unread-count (lặp 30–60s) → GET /notifications
Trang admin          → GET /users, /audit, /admin/usage/projects
```

## 17. Điều FE không cần quan tâm

- `/api/v1/internal/popper/...`: chỉ Popper gọi bằng khoá dịch vụ. FE không gọi.
- `/api/v1/health/live`, `/health/ready`: dành cho hạ tầng.

## 18. Việc còn mở

- Base URL môi trường deploy: chưa chọn hosting.
- Quên mật khẩu và xác minh email: chưa có, vì BE chưa có dịch vụ gửi email.
- Popper v2 chưa có HTTP API: các thao tác run/sync/duyệt frame chưa chạy thật được đầu-cuối; schema ở đây là hợp đồng BE đã cố định, đã có test với Popper giả lập.
- Budget mặc định (5 USD) và tối đa (20 USD) của run là giá trị tạm, có thể đổi; FE nên để người dùng nhập và hiển thị lỗi `BUDGET_OUT_OF_RANGE` thay vì cố định giới hạn ở FE.
- Huỷ run phía Popper: `abandon` hiện chỉ đổi trạng thái ở Platform, đang chờ làm rõ với bên Popper.
