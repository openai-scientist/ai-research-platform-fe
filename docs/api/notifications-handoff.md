# Platform BE — Handoff kết nối Notifications realtime cho Frontend

Tài liệu này chỉ nói về việc nối chuông thông báo với Platform BE: mở stream realtime, hiển thị, đánh dấu đã đọc, và xử lý mất kết nối. Quy ước chung của API (đăng nhập, envelope, CSRF) nằm ở [frontend-api-handoff.md](./frontend-api-handoff.md).

- Ngày cập nhật: 2026-10-04
- Schema máy đọc được: Swagger UI `GET /docs`, tag `notifications`

## 1. Tóm tắt

- BE có thêm một endpoint SSE: `GET /api/v1/notifications/stream`. FE mở nó bằng `EventSource` sau khi đăng nhập.
- Mỗi event `notifications` là **snapshot đầy đủ** (`items` + `unread_count`). FE thay toàn bộ state bằng payload, không append, không dedupe.
- **Không polling** `/notifications` hay `/notifications/unread-count` để cập nhật chuông.
- Đánh dấu đã đọc vẫn qua REST `POST`; BE tự đẩy snapshot mới tới mọi tab của người dùng.
- Các endpoint REST cũ không đổi request/response.

## 2. Điều kiện kết nối

```ts
const API_BASE = "http://localhost:8000/api/v1"; // production: base do đội BE cung cấp
```

| Yêu cầu | Chi tiết |
|---|---|
| Cookie phiên | `EventSource` phải có `withCredentials: true`; `fetch` phải có `credentials: "include"` |
| Origin | Origin của FE phải khớp chính xác một giá trị trong `CORS_ALLOWED_ORIGINS` của BE (mặc định local: `http://localhost:3000`, `http://localhost:5173`). Sai → `403 ORIGIN_NOT_ALLOWED` |
| CSRF | Stream và các `GET` không cần. Hai `POST` đánh dấu đã đọc cần header `X-CSRF-Token` |
| Header tuỳ biến | `EventSource` không gửi được header tuỳ biến; stream chỉ xác thực bằng cookie |

## 3. Endpoint

| Method | Path (sau `API_BASE`) | Query / header | Trả về |
|---|---|---|---|
| `GET` | `/notifications/stream` | `limit` 1–100, mặc định 50 | SSE (không dùng JSON envelope) |
| `GET` | `/notifications` | `unread_only`, `limit` 1–100, `offset` ≥ 0 | `data: NotificationItem[]`, `meta.pagination: { total, limit, offset }` |
| `GET` | `/notifications/unread-count` | — | `data: { unread_count }` |
| `POST` | `/notifications/{notification_id}/read` | `X-CSRF-Token` | `data: NotificationItem` |
| `POST` | `/notifications/read-all` | `X-CSRF-Token` | `data: { marked }` |

`GET /notifications` chỉ còn dùng để xem các trang lịch sử cũ hơn cửa sổ của stream.

## 4. Kiểu dữ liệu

```ts
export type NotificationKind =
  | "run_awaiting_review"
  | "run_finished"
  | "added_to_project"
  | "run_commented";

export interface NotificationItem {
  id: string;                        // UUID
  kind: NotificationKind;
  project_id: string;                // UUID
  project_name: string;
  run_id: string | null;             // UUID
  actor_user_id: string | null;      // UUID
  actor_display_name: string | null;
  created_at: string;                // ISO-8601
  read_at: string | null;            // ISO-8601, null = chưa đọc
}

export interface NotificationSnapshot {
  items: NotificationItem[];         // mới nhất trước, tối đa `limit` item
  unread_count: number;              // tổng chưa đọc, không chỉ trong `items`
}

export type SessionEndedCode = "SESSION_EXPIRED" | "USER_SUSPENDED" | "UNAUTHENTICATED";
```

Người dùng chỉ thấy thông báo của project mà họ còn là thành viên. Khi bị gỡ khỏi project, snapshot kế tiếp không còn các item của project đó và `unread_count` giảm theo.

## 5. Stream realtime

### Server gửi gì

| Frame | Khi nào | FE làm gì |
|---|---|---|
| `event: notifications` | Ngay khi kết nối, rồi sau mỗi thay đổi đã commit: có thông báo mới, đánh dấu đã đọc / đọc hết, bị gỡ khỏi project | Thay danh sách và badge bằng payload |
| `: keep-alive` (comment) | Mỗi 15 giây khi không có thay đổi | Không cần xử lý, `EventSource` tự bỏ qua |
| `event: session-ended` | Phiên hết hạn, bị thu hồi, hoặc tài khoản bị khoá trong lúc stream đang mở. Server đóng kết nối ngay sau đó | `close()` stream, xoá state người dùng, về trang đăng nhập |

```text
event: notifications
data: {"items":[{"id":"7b2099d1-1002-4e54-a3e5-15f5ddf95b48","kind":"run_finished","project_id":"42c21d6e-04ba-4f6d-829f-7e68e7c22021","project_name":"Climate study","run_id":"0ac856c6-4aea-43b2-909e-754c0a419ac7","actor_user_id":null,"actor_display_name":null,"created_at":"2026-10-04T08:15:30Z","read_at":null}],"unread_count":3}

event: session-ended
data: {"code":"SESSION_EXPIRED"}
```

Nhiều thay đổi sát nhau có thể được gộp thành một event; vì mỗi event là trạng thái hiện tại nên không mất dữ liệu. Không có `Last-Event-ID` hay cursor: kết nối lại là nhận snapshot mới.

### Helper TypeScript

```ts
export function subscribeNotifications(
  apiBase: string,
  handlers: {
    replaceSnapshot: (snapshot: NotificationSnapshot) => void;
    onSessionEnded: (code: SessionEndedCode) => void;
    onConnectionError?: (readyState: number) => void;
  },
  limit = 50,
) {
  const base = `${apiBase.replace(/\/$/, "")}/`;
  const stream = new EventSource(new URL(`notifications/stream?limit=${limit}`, base), {
    withCredentials: true,
  });
  stream.addEventListener("notifications", (event) => {
    handlers.replaceSnapshot(JSON.parse((event as MessageEvent<string>).data));
  });
  stream.addEventListener("session-ended", (event) => {
    const { code } = JSON.parse((event as MessageEvent<string>).data) as { code: SessionEndedCode };
    stream.close(); // đóng trước, nếu không EventSource sẽ tự kết nối lại
    handlers.onSessionEnded(code);
  });
  stream.onerror = () => handlers.onConnectionError?.(stream.readyState);
  return () => stream.close();
}
```

Dùng trong React:

```tsx
useEffect(() => {
  if (!user) return;
  return subscribeNotifications(API_BASE, {
    replaceSnapshot: ({ items, unread_count }) => {
      setNotifications(items);
      setUnreadCount(unread_count);
    },
    onSessionEnded: () => signOutLocally(),
    onConnectionError: (state) => {
      if (state === EventSource.CLOSED) recoverNotificationStream();
    },
  });
}, [user?.id]);
```

### Vòng đời

- Mở **một** stream cho mỗi tab, sau khi `POST /auth/login` hoặc `GET /auth/me` thành công.
- Đóng stream khi logout, khi component gốc unmount, và khi đổi người dùng.
- Trình duyệt giới hạn khoảng 6 kết nối HTTP/1.1 tới cùng một origin, tính chung mọi tab. Mỗi tab giữ một stream, nên đừng mở thêm stream thứ hai trong cùng tab. Production nên chạy sau proxy HTTP/2 để không chạm giới hạn này.

### Mất kết nối

`onerror` có hai trường hợp, phân biệt bằng `readyState`:

| `readyState` | Nghĩa | Xử lý |
|---|---|---|
| `EventSource.CONNECTING` | Rớt mạng, BE restart, proxy cắt stream. Trình duyệt tự kết nối lại | Không làm gì; snapshot đầu tiên sau khi nối lại sẽ khôi phục state |
| `EventSource.CLOSED` | Lần kết nối trả HTTP khác `200` (401, 403, 422, 503). Trình duyệt **không** thử lại | Gọi `GET /auth/me`: lỗi 401 → về trang đăng nhập; vẫn đăng nhập → tạo stream mới với backoff (ví dụ 1s, 2s, 5s, tối đa 30s) |

`EventSource` không cho đọc status hay body của lần kết nối thất bại, vì vậy phải hỏi `/auth/me` để biết lý do. Không chuyển sang polling khi stream lỗi.

### Phiên và keep-alive

- Lần kết nối đầu và mỗi snapshot được tính là hoạt động của phiên (gia hạn idle expiry như một request thường).
- Keep-alive chỉ kiểm tra phiên còn hợp lệ, **không** gia hạn idle expiry. Một tab mở mà không có hoạt động nào khác sẽ nhận `session-ended` khi phiên hết hạn idle (mặc định 7 ngày) hoặc hết hạn tuyệt đối (mặc định 30 ngày).
- Phiên bị thu hồi hoặc tài khoản bị khoá được phát hiện trong tối đa 15 giây.

## 6. Hiển thị và deep link

BE không gửi câu chữ. FE tự viết câu từ `kind`, `project_name` và `actor_display_name`.

| `kind` | Người nhận | `run_id` | `actor_*` | Câu gợi ý | Bấm vào thì mở |
|---|---|---|---|---|---|
| `added_to_project` | Người được thêm (không gửi khi tự thêm chính mình) | `null` | người thêm | "{actor} đã thêm bạn vào {project}" | Trang project |
| `run_awaiting_review` | Project Manager + Researcher | có | `null` | "Run trong {project} đang chờ duyệt" | Trang duyệt frame của run |
| `run_finished` | Mọi thành viên | có | `null` | "Run trong {project} đã kết thúc" | Trang run |
| `run_commented` | Người bắt đầu run, khi người bình luận là người khác | có | người bình luận | "{actor} đã bình luận về run trong {project}" | Phần bình luận của run |

- `run_finished` được gửi cho cả ba trạng thái kết thúc `completed`, `budget_exceeded`, `failed`; thông báo không mang trạng thái, muốn hiện kết quả thì đọc run theo `run_id`.
- Kiểu dữ liệu cho phép `run_id` và `actor_display_name` là `null` ở mọi `kind`: thiếu `run_id` thì link về project, thiếu actor thì dùng câu không nêu người thực hiện.
- Thành viên đã bị gỡ khỏi project và tài khoản bị khoá không nhận thông báo.

## 7. Đánh dấu đã đọc

```ts
async function markRead(notificationId: string, csrfToken: string) {
  return fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

async function markAllRead(csrfToken: string) {
  return fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken },
  });
}
```

- Sau khi `POST` thành công, stream đẩy snapshot mới tới mọi tab. Không tự sửa badge, không refetch.
- Snapshot chỉ được đẩy khi **có thay đổi thật**. Đánh dấu một item đã đọc từ trước, hoặc `read-all` khi không còn item chưa đọc (`marked: 0`), vẫn trả `200` nhưng không có snapshot mới. Vì vậy trạng thái loading của nút phải kết thúc theo response của `POST`, không chờ event SSE.
- `marked` đếm cả thông báo của project mà người dùng không còn thấy, nên có thể lớn hơn badge. Không dùng số này để trừ badge.
- CSRF token: lấy từ response đăng nhập, hoặc `GET /auth/csrf-token` sau khi tải lại trang.

## 8. CORS, cookie và proxy

- FE khác origin với BE: `CORS_ALLOWED_ORIGINS` phải chứa đúng origin của FE, không dùng wildcard.
- Khác cổng trên `localhost` vẫn là cùng site, cookie mặc định (`SameSite=Lax`) hoạt động. FE và BE khác site thật sự thì cần HTTPS và BE cấu hình cookie `SameSite=None; Secure`.
- Reverse proxy phải tắt response buffering cho đường dẫn stream (BE đã gửi `X-Accel-Buffering: no` và `Cache-Control: no-cache`) và đặt read/idle timeout lớn hơn 15 giây.
- Nếu dev server của FE proxy `/api` sang BE, kiểm tra proxy đó không buffer hoặc nén response `text/event-stream`; dấu hiệu là event chỉ đến khi stream đóng.
- Khi BE restart, kết nối bị đóng trong tối đa 30 giây và `EventSource` tự nối lại.

## 9. Mã lỗi

| HTTP | Code | Gặp ở | Xử lý FE |
|---|---|---|---|
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED` | mọi endpoint | Xoá state, về trang đăng nhập |
| 401 | `USER_SUSPENDED` | mọi endpoint | Xoá state, báo tài khoản bị khoá |
| 403 | `ORIGIN_NOT_ALLOWED` | stream, hai `POST` | Báo BE thêm origin của FE vào `CORS_ALLOWED_ORIGINS` |
| 403 | `CSRF_INVALID` | hai `POST` | Lấy lại `/auth/csrf-token`, gửi lại một lần |
| 404 | `NOT_FOUND` | `POST /{id}/read` | Thông báo không tồn tại hoặc không còn thuộc người dùng; bỏ qua, snapshot sẽ sửa danh sách |
| 422 | `VALIDATION_ERROR` | stream, `GET /notifications` | Kiểm tra `limit` 1–100, `offset` ≥ 0 |
| 503 | `NOTIFICATIONS_UNAVAILABLE` | stream | BE chưa lắng nghe được tín hiệu realtime; thử lại với backoff |

Ba mã 401 cũng là giá trị `code` của event `session-ended`. Với stream, lỗi lúc mở kết nối trả JSON envelope như REST nhưng `EventSource` không đọc được (xem mục 5, "Mất kết nối").

## 10. Thử nhanh bằng curl

```bash
# đăng nhập, lưu cookie
curl -c cookies.txt -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"..."}' http://localhost:8000/api/v1/auth/login

# mở stream: thấy ngay một event notifications, sau đó ": keep-alive" mỗi 15 giây
curl -N -b cookies.txt 'http://localhost:8000/api/v1/notifications/stream?limit=5'
```

Giữ stream mở, rồi ở cửa sổ khác thêm tài khoản này vào một project hoặc bình luận vào run của tài khoản này: event `notifications` mới xuất hiện ngay.

## 11. Checklist tích hợp

1. `API_BASE` có `/api/v1`; origin của FE đã nằm trong `CORS_ALLOWED_ORIGINS`.
2. Sau khi đăng nhập hoặc `/auth/me` thành công: mở một stream cho tab, với `withCredentials: true`.
3. Mỗi event `notifications`: thay toàn bộ danh sách và badge.
4. `session-ended`: `close()` rồi về trang đăng nhập.
5. `onerror` với `CLOSED`: hỏi `/auth/me`, rồi nối lại với backoff. Với `CONNECTING`: để trình duyệt tự nối lại.
6. Đánh dấu đã đọc qua `POST` kèm `X-CSRF-Token`; kết thúc loading theo response.
7. Đóng stream khi logout, unmount, đổi người dùng.
8. Bỏ mọi `setInterval` đang polling notifications.
