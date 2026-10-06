# Bàn giao FE: Danh sách user để PM mời vào project

Ngày cập nhật: 06/10/2026.

## API danh sách

```http
GET /api/v1/projects/{project_id}/invite-candidates?limit=50&offset=0
```

Yêu cầu session đăng nhập: Axios `withCredentials: true` hoặc fetch `credentials: "include"`. GET không cần `X-CSRF-Token`. Người gọi phải là PM đang hoạt động của project hoặc Platform Admin.

| Query | Quy tắc |
| --- | --- |
| `q` | Không bắt buộc. Khi gửi: tối đa 120 ký tự, không giới hạn tối thiểu, tìm theo email hoặc display name, không phân biệt hoa thường; mỗi từ phải khớp ít nhất một trường |
| `limit` | Mặc định 50; từ 1 đến 100 |
| `offset` | Mặc định 0; không âm |

Khi ô tìm kiếm rỗng, bỏ `q` khỏi request. Không gửi query chỉ có 1–2 ký tự.

Response `200` mẫu:

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "researcher@example.com",
      "display_name": "Nguyễn An",
      "avatar_url": null
    }
  ],
  "meta": {
    "request_id": "example-request-id",
    "pagination": { "total": 1, "limit": 50, "offset": 0 }
  }
}
```

`id` là ID của user, không phải membership. `display_name` và `avatar_url` có thể null. Dữ liệu được sắp xếp tăng dần theo email đã chuẩn hóa. Không có user phù hợp thì `data: []`, `total: 0`.

## Quy tắc xuất hiện trong danh sách

| User | Có hiển thị? |
| --- | --- |
| Đang hoạt động, đã xác thực email, chưa thuộc project | Có |
| Thành viên `active` của project này, kể cả PM hiện tại | Không |
| Có lời mời `invited` trong project này | Không |
| Có lời mời hết hạn nhưng chưa hủy/từ chối | Không; dùng thao tác gửi lại hoặc hủy lời mời hiện có |
| Đã bị xóa khỏi project hoặc lời mời đã hủy/từ chối (`revoked`) | Có, nếu tài khoản còn hợp lệ |
| Chỉ là thành viên/có lời mời ở project khác | Có |
| Bị đình chỉ hoặc chưa xác thực email | Không |

Backend lọc trước khi tính `total` và phân trang; FE không cần tải toàn bộ user rồi tự loại thành viên. Đây là danh sách dùng để chọn user, không thay thế API danh sách thành viên `/members` hay API quản trị `/users`.

## Gắn vào form mời

1. Khi mở form, kết nối SSE bên dưới với `project_id` hiện tại. Snapshot đầu tiên chứa danh sách candidates; GET vẫn dùng được khi cần tải một lần.
2. Hiển thị tên (fallback email), email và avatar. Debounce tìm kiếm; đặt lại `offset=0` khi đổi `q` hoặc project.
3. Sau khi chọn user và role, gửi API mời hiện có:

```http
POST /api/v1/projects/{project_id}/members
Content-Type: application/json
X-CSRF-Token: <csrf_token của session>
```

```json
{
  "email": "researcher@example.com",
  "role": "researcher"
}
```

Role hợp lệ: `project_manager`, `researcher`, `reviewer`. Body mời dùng **email của user được chọn**, không gửi `id` thay cho email.

4. Mời thành công (`201`): stream candidates tự gửi snapshot mới, loại user vừa được mời. Danh sách thành viên/lời mời dùng cơ chế refresh riêng hiện có.
5. Sau khi xóa thành viên, hủy hoặc từ chối lời mời: stream candidates tự cập nhật để user đủ điều kiện xuất hiện lại, kể cả hành động từ tab/người dùng khác.

## Realtime candidates qua SSE

```http
GET /api/v1/projects/{project_id}/invite-candidates/stream?q=researcher&limit=50&offset=0
```

Endpoint nhận cùng `q`, `limit`, `offset` và kiểm tra cùng quyền PM/Admin như GET danh sách. Dùng cookie session, không cần CSRF và không dùng WebSocket. Origin khác API phải thuộc CORS allowlist.

### Event và payload

| Event | Ý nghĩa | FE xử lý |
| --- | --- | --- |
| `invite-candidates` | Snapshot trang candidates hiện tại, gửi ngay khi kết nối và sau thay đổi đã commit | Thay toàn bộ dữ liệu của trang và `meta.pagination` bằng snapshot mới; không append/merge |
| `session-ended` | Session không còn hợp lệ; data có `{ "code" }`, ví dụ `SESSION_EXPIRED` hoặc `USER_SUSPENDED` | Đóng EventSource, xóa dữ liệu candidates; chạy luồng auth hiện có |
| `access-ended` | Mất quyền PM/Admin, project bị archive hoặc không còn truy cập được; data có `{ "code" }` | Đóng EventSource, xóa dữ liệu candidates, đóng/khóa form mời |

Ví dụ frame thành công:

```text
event: invite-candidates
data: {"success":true,"message":"OK","data":[{"id":"11111111-1111-4111-8111-111111111111","email":"researcher@example.com","display_name":"Nguyễn An","avatar_url":null}],"meta":{"request_id":"example-request-id","pagination":{"total":1,"limit":50,"offset":0}}}

```

Payload của `invite-candidates` là **toàn bộ envelope giống GET**, gồm `data` và `meta.pagination`. `request_id` thuộc request kết nối stream, không phải ID của thao tác gây thay đổi.

Backend gửi snapshot mới sau các thay đổi được thực hiện qua API và commit:

- Mời user, chấp nhận/từ chối lời mời, hủy lời mời, xóa thành viên hoặc đổi role.
- Tạo/cập nhật user; xác thực email; đình chỉ/kích hoạt lại tài khoản; đổi tên hoặc avatar.
- Đổi quyền Platform Admin hoặc archive project: kiểm tra lại quyền trước khi gửi thêm dữ liệu.

Thay đổi membership chỉ đánh thức stream của project liên quan. Thay đổi tài khoản có thể ảnh hưởng mọi project nên đánh thức các stream đang mở. Có thể nhận snapshot có dữ liệu không đổi, ví dụ user vừa accept vẫn bị loại khỏi candidates; FE vẫn thay trang theo snapshot.

Chỉ phát sau commit; transaction rollback không tạo sự kiện. PostgreSQL LISTEN/NOTIFY truyền tín hiệu giữa các instance/worker API. Kênh candidates riêng với kênh notification; sự kiện candidates không tạo notification hay gửi thêm email.

### Ví dụ kết nối ở FE

```ts
const url = new URL(
  `/api/v1/projects/${projectId}/invite-candidates/stream`,
  apiOrigin, // Origin của backend; dùng cấu hình API hiện có.
);
url.searchParams.set("limit", "50");
url.searchParams.set("offset", "0");
if (search.trim().length >= 3) url.searchParams.set("q", search.trim());

const source = new EventSource(url.toString(), { withCredentials: true });

source.addEventListener("invite-candidates", (event) => {
  const snapshot = JSON.parse((event as MessageEvent<string>).data);
  setCandidates(snapshot.data);
  setPagination(snapshot.meta.pagination);
  setRealtimeConnected(true);
});

source.addEventListener("session-ended", (event) => {
  source.close();
  setCandidates([]);
  handleSessionEnded(JSON.parse((event as MessageEvent<string>).data).code);
});

source.addEventListener("access-ended", (event) => {
  source.close();
  setCandidates([]);
  handleInviteAccessEnded(JSON.parse((event as MessageEvent<string>).data).code);
});

source.onerror = () => setRealtimeConnected(false);
// Cleanup khi unmount/đóng form/đổi project, query hoặc trang:
// source.close();
```

Đoạn trên minh họa contract; đặt trong hook/lifecycle của FE hiện có. `apiOrigin` không chứa `/api/v1`; nếu API client dùng base URL đã gồm prefix thì ghép path theo quy ước của client đó.

### Lifecycle, reconnect và phân trang

- Mỗi form mở một stream cho project/query/trang hiện tại. Đóng stream khi đóng form hoặc unmount.
- Khi thay `q`, `limit`, `offset` hoặc project: đóng stream cũ, mở stream mới. Khi đổi search/project, đặt `offset=0`; xử lý search dưới 3 ký tự như GET.
- `EventSource` tự reconnect khi mất mạng/connection. Backend gửi snapshot hiện tại ngay sau reconnect; không cần `Last-Event-ID`, replay từng thay đổi hay polling nền.
- Trong lúc mất kết nối, có thể giữ dữ liệu cũ và đánh dấu chưa đồng bộ. POST mời vẫn kiểm tra điều kiện ở backend.
- Nếu snapshot có `data: []` nhưng `total > 0` và `offset >= total`, chuyển về trang hợp lệ (hoặc `offset=0`) rồi mở lại stream. Membership thay đổi có thể làm trang cuối rỗng.
- Nếu user đang được chọn biến mất do đã được mời/bị đình chỉ, bỏ chọn hoặc xử lý lỗi POST; đừng dựa vào việc vắng trong một trang/query để kết luận user không còn hợp lệ.
- Backend gửi comment `: keep-alive` khoảng 15 giây khi không có thay đổi. Heartbeat chỉ kiểm tra session/quyền, không tải lại candidates và không kéo dài idle session. FE không cần xử lý comment.
- Với stream đã mở, lỗi auth/quyền được báo bằng event kết thúc bên trên. Lỗi trước khi mở trả HTTP JSON như GET; thêm `503 INVITE_CANDIDATES_UNAVAILABLE` nếu listener không khởi động được. Native EventSource không đọc được error JSON/status: nếu cần phân biệt, gọi GET danh sách một lần khi lỗi; không lặp lại thành polling. Đóng stream nếu GET xác nhận mất session/quyền.

### Checklist realtime

| Case | Kết quả |
| --- | --- |
| Mở form/kết nối lại | Nhận ngay snapshot cùng query và pagination |
| PM khác mời user | User biến mất ở tab đang mở sau commit |
| Hủy/từ chối lời mời hoặc xóa thành viên | User đủ điều kiện xuất hiện lại |
| Đình chỉ user hoặc đổi tên làm lệch query | Snapshot loại user khỏi kết quả |
| Transaction thất bại/rollback | Không phát snapshot từ thay đổi bị hủy |
| Mất quyền PM/Admin hoặc archive project | Nhận `access-ended`, đóng form/stream |
| Logout/session hết hạn | Nhận `session-ended` ở lần kiểm tra tiếp theo, đóng stream |
| Đổi search/trang/đóng form | Stream cũ được cleanup |

## Lỗi và trạng thái thay đổi

| HTTP / code | FE xử lý |
| --- | --- |
| `401` | Dùng luồng xử lý session hết hạn/chưa đăng nhập hiện có |
| `403 ROLE_REQUIRED` | Không cho mở form mời khi người dùng không có quyền quản lý project |
| `403 PASSWORD_CHANGE_REQUIRED` | Yêu cầu đổi mật khẩu tạm theo luồng auth hiện có |
| `404 NOT_FOUND` | Project không tồn tại hoặc người gọi không có quyền truy cập |
| `409 PROJECT_ARCHIVED` | Project chỉ đọc; không cho mời thành viên |
| `422 VALIDATION_ERROR` | Kiểm tra UUID, độ dài `q`, `limit`, `offset` |

Danh sách không giữ chỗ cho user. Nếu một PM khác đã mời user sau khi danh sách được tải, POST mời vẫn có thể trả `409 MEMBERSHIP_EXISTS`; báo user đã là thành viên/được mời và refresh candidates. Nếu user bị đình chỉ hoặc không còn đủ điều kiện, xử lý lỗi POST hiện có và refresh danh sách.

API mới không cần migration database.
