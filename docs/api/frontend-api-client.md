# Fetch services và hooks cho Platform API

Triển khai theo [frontend-api-handoff.md](frontend-api-handoff.md), bao phủ 53 endpoint frontend. Đã nối 5 API admin vào Users, Audit Log và Usage & Cost; các nhóm UI còn lại nối sau. Notification đang tạm hoãn.

## Vị trí và hợp đồng

- `src/lib/api/core.ts`: Axios client hiện có, cookie, CSRF, chuẩn hoá `ApiError`, xử lý lỗi JSON khi tải Blob.
- `src/types/api.ts`: interface envelope thành công/thất bại, `ApiError` và params chung.
- `src/types/enums.ts`: string enum dùng chung cho status, role, review signal, artifact và notification.
- `src/lib/api/request.ts`: download Blob và dựng đường dẫn có encode ID.
- `src/lib/api/types.ts`: kiểu chung cho phân trang, khoảng thời gian và download.
- `src/lib/api/services/fetch-*.ts`: interface dữ liệu/request, kiểu response có tên và các hàm API của từng nghiệp vụ.
- `src/lib/api/query-keys.ts`: cache keys dùng chung.
- `src/hooks/use-*-query.ts`: React Query hooks cho GET và mutation hooks cho thao tác ghi/download.
- `src/hooks/use-api.ts`: query/mutation helpers, retry và toast lỗi.
- `src/hooks/use-infinity-scroll.ts`: hook infinite scroll theo `limit/offset`; các hook nghiệp vụ có thêm `useInfinite...`. Xem [infinite-scroll.md](infinite-scroll.md) để tích hợp UI.

Fetch ở đây là tầng gọi API theo convention `fetchAuth`/`fetchProject` của repo; transport vẫn dùng Axios, không thêm dependency.

Service gọi trực tiếp `apiService.get/post/put/patch/delete/upload`, khai báo `async` với `Promise<ResponseType>` và trả `response.data`, theo cách viết ở `E:\TVu\git-repo\research-hub-client`. Core xử lý lỗi tập trung; không còn wrapper `requestApi` hoặc `unwrap` kiểm tra lỗi lặp lại ở service.

Mỗi service đặt interface dữ liệu và request cạnh hàm gọi API. Tên request thể hiện thao tác (`CreateProjectRequest`, `UpdateProjectRequest`), tên response thể hiện kết quả (`ProjectListResponse`, `ProjectDetailResponse`). Response dùng alias của `ApiResult<T>` để tái sử dụng envelope, không khai báo lặp các trường `success/message/meta`. Params kế thừa `ListParams` và `RequestParams`. Hooks import các kiểu từ service tương ứng.

```ts
import { fetchAdmin } from "@/lib/api/services/fetch-admin";
import { fetchProject, type ProjectListResponse } from "@/lib/api/services/fetch-project";
import { ProjectStatus, UserStatus } from "@/types/enums";

const response: ProjectListResponse = await fetchProject.getList({ limit: 20, offset: 0 });
const completedProjects = response.data.filter((project) => project.status === ProjectStatus.Completed);

// Service nhận request object; hook giữ payload có userId để xác định người dùng.
await fetchAdmin.updateUserStatus(userId, { status: UserStatus.Suspended });
```

Enum giữ nguyên giá trị chuỗi backend (`completed`, `suspended`, ...). UI lấy nhãn project từ `PROJECT_STATUS_LABELS` ở `src/lib/projects/project-status.ts` để giữ nhãn đọc được và tái sử dụng giữa các màn hình. Cookie session và CSRF vẫn là cơ chế xác thực; không dùng Bearer JWT hoặc token refresh của repo tham khảo.

Các service mới và project trả `ApiResult<T>`: `{ success: true, message, data, meta }`. Đọc danh sách qua `result.data`, phân trang qua `result.meta.pagination`, request ID qua `result.meta.request_id`.

Auth giữ hợp đồng cũ để tương thích với luồng đăng nhập hiện tại: `me()` trả `CurrentUser`, login/register trả `SessionResult`, đổi mật khẩu/logout trả `void`, `csrfToken()` trả `{ csrf_token }`.

Download trả `{ blob, filename, contentType }`. Có hàm lấy URL trực tiếp cho dataset version và artifact. UI tự quyết định tải xuống hoặc preview; nếu tạo object URL thì phải revoke sau khi dùng. `filename` có thể null nếu header không được backend expose qua CORS.

## Bao phủ API

| Nhóm | Service | Hooks | Số endpoint |
|---|---|---|---:|
| Auth | `fetch-auth.ts` | `use-auth-query.ts` | 7 |
| Project | `fetch-project.ts` | `use-projects-query.ts` | 8 |
| Thành viên | `fetch-members.ts` | `use-members-query.ts` | 4 |
| Dataset và version | `fetch-datasets.ts` | `use-datasets-query.ts` | 7 |
| Research context | `fetch-research-context.ts` | `use-research-context-query.ts` | 4 |
| Run | `fetch-runs.ts` | `use-runs-query.ts` | 5 |
| Frame review | `fetch-frame-reviews.ts` | `use-frame-reviews-query.ts` | 3 |
| Artifact | `fetch-artifacts.ts` | `use-artifacts-query.ts` | 2 |
| Comment | `fetch-comments.ts` | `use-comments-query.ts` | 4 |
| Notification | `fetch-notifications.ts` | `use-notifications-query.ts` | 4 |
| User admin, audit, usage | `fetch-admin.ts` | `use-admin-query.ts` | 5 |

Project update dùng PATCH; không có DELETE project. Dùng `fetchProject.archive` hoặc `useArchiveProjectMutation`. Hai API cũ `fetchProject.delete` và `useDeleteProjectMutation` đã được bỏ vì không có trong backend. Phân trang dùng `limit`/`offset`, không gửi `search`/`page`.

## Cách dùng khi nối UI

Hook cần chạy trong Client Component bên trong `QueryProvider` hiện có.

```tsx
const projects = useProjectsQuery({ limit: 20, offset: 0 });
const rows = projects.data?.data ?? [];
const total = projects.data?.meta.pagination?.total ?? 0;

const updateProject = useUpdateProjectMutation(projectId);
await updateProject.mutateAsync({ name: "Research project" });

const addMember = useAddMemberMutation(projectId);
await addMember.mutateAsync({ email: "researcher@example.com", role: "researcher" });

const upload = useCreateDatasetMutation(projectId, setUploadProgress);
await upload.mutateAsync({ name: "Exam scores", file });

const saveContext = useSaveResearchContextMutation(projectId);
await saveContext.mutateAsync({ body: markdown, base_version: currentVersion });

const run = useRunDetailQuery(projectId, runId);
const sync = useSyncRunMutation(projectId, runId);
await sync.mutateAsync();

const download = useDownloadArtifactMutation(projectId, runId);
const result = await download.mutateAsync(artifactId);
```

Các query nhận options cuối cùng như `{ enabled: isAuthenticated }`, `staleTime`, `refetchInterval`. Query có ID tự tắt khi thiếu ID; khi UI đổi project cần truyền đúng ID để cache được tách riêng. Không mount query bảo vệ trước khi biết có phiên.

`useRunDetailQuery` mặc định polling 12 giây cho queued/running/awaiting_review, dừng ở trạng thái kết thúc hoặc lỗi. Các query notification hiện bị tắt (`enabled: false`, không polling) và không được mount vào UI. Polling không chạy ngầm khi tab mất focus theo mặc định React Query; có thể cấu hình lại khi nối UI. Các GET run không gọi sync tự động.

Mutation thành công invalidate cache liên quan, gồm danh sách/detail, auth memberships hoặc audit/usage tuỳ thao tác. Notification invalidation đang tạm hoãn. Mutation không retry tự động; riêng client gửi lại một lần khi backend từ chối bằng `CSRF_INVALID`.

## Lỗi và phiên

- Mọi request dùng cookie (`withCredentials: true`). Client lấy token CSRF cho POST/PUT/PATCH/DELETE, trừ login/register. Multipart để trình duyệt tự đặt boundary.
- `ApiError` giữ `status`, `code`, `message`, `details`, `requestId`, `retryAfter`. UI rẽ nhánh theo code và dùng message backend.
- Hook báo lỗi qua Sonner. Không cần toast lỗi thêm cho cùng thao tác; nếu dùng `mutateAsync`, bên gọi vẫn cần catch rejection để thực hiện logic nghiệp vụ.
- Không tự retry lỗi HTTP 4xx. Login/register bị RATE_LIMITED sẽ bị chặn gửi lại trong thời gian Retry-After, giữ message backend.
- `RESEARCH_CONTEXT_NOT_FOUND` và `FRAME_REVIEW_NOT_FOUND` không toast mặc định; query vẫn giữ error để UI biểu diễn trạng thái chưa có dữ liệu.
- Khi `RESEARCH_CONTEXT_CONFLICT`, UI dùng query refetch rồi cho người dùng gộp thay đổi; không tự ghi đè. Khi `REVIEW_NOT_PENDING`, refetch frame và run. Không tự gửi lại quyết định khi Popper chưa xác nhận.
- Query truyền AbortSignal xuống Axios qua request options của core. Client phát sự kiện `auth:expired` khi nhận mã phiên không hợp lệ; cùng một luồng xử lý áp dụng cho lỗi HTTP và envelope `success: false`. CSRF request cũ không ghi đè token sau khi phiên được thay thế.
- Hooks auth mới chỉ phụ trách API và cache. `useAuth` hiện tại vẫn phụ trách Redux, điều hướng và đồng bộ tab. Khi nối màn hình auth nên tiếp tục dùng luồng này hoặc ghép đầy đủ các trách nhiệm đó; không gọi đồng thời cả hai mutation cho cùng thao tác.
- Không bổ sung WebSocket/SSE, health/internal API, quên mật khẩu hoặc xác minh email vì ngoài hợp đồng frontend.

## Cấu hình và giới hạn xác minh

`NEXT_PUBLIC_API_URL` nhận origin backend hoặc URL kết thúc bằng `/api/v1`; mặc định `http://localhost:8000`. Backend phải cho phép origin frontend trong CORS. Các service dùng cookie trình duyệt; không dùng singleton client này để chia sẻ phiên giữa các request server.

Đã bổ sung Vitest theo yêu cầu validation của người dùng: `npm test` có 84 test core/service/download; `npm run test:api` có 6 test HTTP thực tế trên backend cấu hình, gồm đăng nhập/đọc dữ liệu/đăng xuất 4 tài khoản seed và kiểm tra CORS, quyền admin. Build production và TypeScript đã chạy thành công. Biome check cho core và các file test/config đã pass; chưa khẳng định toàn bộ repo sạch lint hoặc UI đã được kiểm thử bằng trình duyệt. Các thao tác ghi nghiệp vụ, upload thật và Popper chưa được xác minh bằng HTTP trong lần này; test service của chúng dùng transport mô phỏng. Xem [auth-login-test.md](../auth-login-test.md) để đăng nhập và chạy lại kiểm tra.
