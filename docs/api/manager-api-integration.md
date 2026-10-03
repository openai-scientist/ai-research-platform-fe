# Project Manager: giao diện và API

Đối chiếu với commit `f2aab64` và OpenAPI đang chạy tại `http://localhost:6789/openapi.json` ngày 2026-10-03.

## Màn hình

Màn trong ảnh là `ManagerOverview`, không phải màn onboarding `ProjectOverview`.
Giữ bố cục KPI, Current research / Warnings, biểu đồ / Budget use và recent items.
Manager được xác định qua `ProjectItem.my_role = project_manager`; Platform Admin cũng xem được.
Không yêu cầu project phải có runs mới hiện dashboard này.

Danh sách project, sidebar và overview dùng UUID từ backend. URL slug cũ được chuyển sang UUID nếu
tìm thấy project tương ứng trong danh sách mà backend cho phép tài khoản xem.
Tạo project gọi API thật, không thêm vào mock store.

## Service và hooks

Mọi đường dẫn dưới đây có prefix `/api/v1`. Các service dùng Axios hiện có, cookie phiên và CSRF cho mutations.

| Chức năng | API | Service / hooks |
|---|---|---|
| Danh sách, chi tiết, tạo, sửa project | GET/POST `/projects`; GET/PATCH `/projects/{id}` | `fetchProject`, `use-projects-query.ts` |
| Archive, restore, complete, reopen | POST `/projects/{id}/{action}` | `fetchProject`, mutations trong `use-projects-query.ts` |
| Quản lý members | GET/POST `/projects/{id}/members`; PUT/DELETE membership | `fetchMembers`, `use-members-query.ts` |
| Dataset và versions, upload/download | `/projects/{id}/datasets/...` | `fetchDatasets`, `use-datasets-query.ts` |
| Research context và versions | GET/PUT `/projects/{id}/research-context` | `fetchResearchContext`, `use-research-context-query.ts` |
| Runs, start/sync/abandon | `/projects/{id}/runs/...` | `fetchRuns`, `use-runs-query.ts` |
| Duyệt frame | `/projects/{id}/runs/{runId}/frame-review` | `fetchFrameReviews`, `use-frame-reviews-query.ts` |
| Artifacts, download | `/projects/{id}/runs/{runId}/artifacts/...` | `fetchArtifacts`, `use-artifacts-query.ts` |
| Comments | `/projects/{id}/runs/{runId}/comments/...` | `fetchComments`, `use-comments-query.ts` |
| Audit của project | GET `/audit?project_id={id}` | `useManagerAuditQuery` luôn gắn project ID |
| Dữ liệu tổng hợp cho overview | Runs + context version + dataset của run gần nhất | `fetchManager.getResearch`, `useManagerResearchQuery` |

## Dữ liệu hiển thị

- Tổng hợp toàn bộ các trang runs bằng `limit`/`offset`, không coi trang đầu là toàn bộ dữ liệu.
- KPI experiment và biểu đồ tuần lấy từ trạng thái run. `queued` được tính là đang chờ/chạy;
  `budget_exceeded` nằm trong nhóm dừng thất bại của run, không mang nghĩa kết quả nghiên cứu âm tính.
- Context và dataset version khớp với run gần nhất. Khi chưa có run, đọc context mới nhất.
- Budget hiển thị `cost_usd` và `budget_usd` của run gần nhất, không dự đoán chi phí.
- Backend hiện chưa có endpoint riêng cho hypothesis/candidates, research stage, official outcomes,
  warnings và tiến độ report. Theo yêu cầu, các mục này dùng mock data của màn Manager cũ,
  được đánh dấu Sample insights. Không suy luận findings từ số runs/artifacts.
- Mock được tách theo project; thao tác frontend cập nhật React Query và giữ qua điều hướng trong
  phiên trang hiện tại. Reload trang sẽ khởi tạo lại mock. Không gửi ID mock sang backend.
- Datasets hỗ trợ upload CSV, sửa thông tin, upload version mới, xem lịch sử và tải file.
- Experiments hỗ trợ lưu context với base_version, chọn dataset version/budget, tạo run, sync/abandon,
  duyệt frame (approve/edit/reject/unknown), tải artifacts và tạo/sửa/xóa comments.
- Members hỗ trợ thêm tài khoản bằng email, sửa role, xóa membership qua API.
- Settings hỗ trợ sửa metadata, archive/restore/complete/reopen và xem audit theo project_id.
- Findings hỗ trợ thêm và validate/reject findings mẫu. Research details cho phép sửa hypothesis,
  đổi research phase mẫu, resolve warning, hoàn thành các section và publish report mẫu.
- Các mutation thật tôn trọng project role và archived state. Lỗi API/validation hiện qua Sonner;
  lỗi API không chuyển thành mock. Research run vẫn phụ thuộc Popper của backend.
- GET `/admin/usage/projects` dành riêng Platform Admin; không gọi từ Manager.

## Phạm vi kiểm tra

Đã đọc lịch sử commit, code và schema OpenAPI thật. Unit tests bao gồm kiểm tra phân trang,
context version khớp run, lỗi API không bị mock và dữ liệu thật không bị sample insights ghi đè.
Kết quả build/test và kiểm tra trình duyệt được ghi trong báo cáo giao hàng của lượt làm việc.

Kết quả hiện tại:

- `npm test`: 116 tests, 8 files, PASS.
- `npm run build`: PASS; TypeScript của build cũng PASS.
- Biome trên các file thay đổi: không có error. Hai warning về phân tích `isPending` được giữ
  vì đây là trạng thái loading thực tế đã xác minh bằng browser; hai thông tin sort class thuộc shell cũ.
- Browser với Manager: PASS upload CSV, upload version mới, tải CSV có cookie, lưu context,
  thêm/đổi role/xóa membership, sửa metadata, audit log, restore/complete/reopen/archive.
- Browser với Reviewer: PASS ẩn các thao tác ghi và quản lý; project archived cũng ẩn upload.
- Mock UI: PASS thêm/validate finding, resolve warning và tăng tiến độ report.
- Desktop, dark mode và mobile 390px được chụp và xem lại. Overview và Datasets không có tràn ngang.
- Không có browser page error. Fixture QA đã archive.
- Chưa thực hiện một run Popper thật; submit run, sync, abandon và duyệt frame đã nối hook/API,
  nhưng chưa có bằng chứng chạy engine trọn luồng trong lượt kiểm tra này.

Ảnh và log QA nằm trong `.artifacts/manager-workspace/` (được Git ignore).
