# Fetch services và hooks cho Platform API

Triển khai theo [frontend-api-handoff.md](frontend-api-handoff.md), bao phủ 53 endpoint frontend. Đã nối 5 API admin vào Users, Audit Log và Usage & Cost; các nhóm UI còn lại nối sau. Notification đang tạm hoãn.

## Vị trí và hợp đồng

- `src/lib/api/core.ts`: Axios client hiện có, cookie, CSRF, chuẩn hoá `ApiError`, xử lý lỗi JSON khi tải Blob.
- `src/lib/api/request.ts`: request JSON, download Blob và dựng đường dẫn có encode ID.
- `src/lib/api/types.ts`: request/response DTO; dùng lại role và auth types hiện có.
- `src/lib/api/services/fetch-*.ts`: các hàm gọi API theo nhóm nghiệp vụ.
- `src/lib/api/query-keys.ts`: cache keys dùng chung.
- `src/hooks/use-*-query.ts`: React Query hooks cho GET và mutation hooks cho thao tác ghi/download.
- `src/hooks/use-api.ts`: query/mutation helpers, retry và toast lỗi.

Fetch ở đây là tầng gọi API theo convention `fetchAuth`/`fetchProject` của repo; transport vẫn dùng Axios, không thêm dependency.

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
- Query truyền AbortSignal xuống Axios. Client phát sự kiện `auth:expired` theo luồng sẵn có khi nhận mã phiên không hợp lệ.
- Hooks auth mới chỉ phụ trách API và cache. `useAuth` hiện tại vẫn phụ trách Redux, điều hướng và đồng bộ tab. Khi nối màn hình auth nên tiếp tục dùng luồng này hoặc ghép đầy đủ các trách nhiệm đó; không gọi đồng thời cả hai mutation cho cùng thao tác.
- Không bổ sung WebSocket/SSE, health/internal API, quên mật khẩu hoặc xác minh email vì ngoài hợp đồng frontend.

## Cấu hình và giới hạn xác minh

`NEXT_PUBLIC_API_URL` nhận origin backend hoặc URL kết thúc bằng `/api/v1`; mặc định `http://localhost:8000`. Backend phải cho phép origin frontend trong CORS. Các service dùng cookie trình duyệt; không dùng singleton client này để chia sẻ phiên giữa các request server.

Đã đọc và đối chiếu mã nguồn với handoff, định dạng các file TypeScript bằng Biome formatter. Chưa chạy build/lint/check/typecheck hoặc kiểm thử HTTP vì AGENTS.md yêu cầu người dùng chỉ định việc validation. Các thao tác Popper vẫn phụ thuộc backend và có thể trả `POPPER_NOT_CONFIGURED` như handoff mô tả.
