# Hướng dẫn đăng nhập test bằng tài khoản seed

Các tài khoản dưới đây dành cho môi trường phát triển/test đã chạy seed dữ liệu backend.

**Mật khẩu mặc định cho tất cả tài khoản: `Password123!`**

| Email | Vai trò | Phạm vi và dự án |
|---|---|---|
| `admin@example.com` | `platform_admin` | Toàn quyền quản trị hệ thống Platform |
| `pm@example.com` | `project_manager` | Chủ sở hữu và quản lý **Demo Research Project** |
| `researcher@example.com` | `researcher` | Nhà nghiên cứu trong **Demo Research Project** |
| `reviewer@example.com` | `reviewer` | Người phản biện, xem và đánh giá trong **Demo Research Project** |

## Chuẩn bị

- Backend đã chạy và seed đủ 4 tài khoản cùng dự án demo.
- `.env.local` frontend hiện cấu hình `NEXT_PUBLIC_API_URL=http://localhost:6789`.
- Chạy `npm run dev` tại thư mục frontend. Mở `http://localhost:3000/auth/login` hoặc cổng mà Next.js thông báo.
- Dùng cùng hostname `localhost` cho frontend và backend để cookie session dùng được ở cả trình duyệt và kiểm tra phiên phía server.
- Origin frontend phải có trong `CORS_ALLOWED_ORIGINS` của backend.

## Đăng nhập lần lượt theo vai trò

1. Mở trang đăng nhập, nhập email trong bảng và mật khẩu `Password123!`.
2. Nhấn nút đăng nhập. Tài khoản admin được đưa tới `/admin`; ba tài khoản còn lại tới `/projects`, trừ khi có đường dẫn quay lại hợp lệ qua `?next=`.
3. Kiểm tra tên/email ở menu tài khoản. Với tài khoản dự án, kiểm tra membership của **Demo Research Project**.
4. Tải lại trang: phiên vẫn hợp lệ, không bị đưa về trang đăng nhập.
5. Đăng xuất bằng menu tài khoản trước khi chuyển sang tài khoản tiếp theo.

| Trường hợp | Kết quả cần thấy |
|---|---|
| Admin đăng nhập | Có thể mở Users, Audit Log và Usage & Cost trong Admin |
| PM đăng nhập | API membership trả `project_manager` cho dự án demo; có quyền quản lý dự án |
| Researcher đăng nhập | API membership trả `researcher`; không được gọi API quản trị hệ thống |
| Reviewer đăng nhập | API membership trả `reviewer`; có thể vào `/reviews`; không được gọi API quản trị hệ thống |
| Nhập sai mật khẩu | Toast giữ message của backend; không tạo phiên mới |
| Tải lại trang sau đăng nhập | `/auth/me` trả 200 và phiên được khôi phục |
| Đăng xuất | Quay về `/auth/login`; không có cookie thì API trả 401 `UNAUTHENTICATED`; gửi lại cookie cũ đã bị thu hồi thì trả 401 `SESSION_EXPIRED` |

Quyền thực tế do backend kiểm soát. Một số màn dự án vẫn dùng dữ liệu mẫu; màn hình hiển thị chưa đủ để chứng minh thao tác API nghiệp vụ đã hoạt động.

## Xem request trong DevTools

Mở tab **Network**, lọc `auth`:

- `POST /api/v1/auth/login`: trả envelope `success: true`, `user`, `session` và `csrf_token`; backend đặt cookie HttpOnly `platform_session`.
- `GET /api/v1/auth/me`: gửi cookie phiên, trả user cùng memberships. Cookie HttpOnly được trình duyệt quản lý, không đọc bằng JavaScript.
- `GET /api/v1/auth/csrf-token`: lấy token sau tải lại trang nếu cần request ghi.
- `POST /api/v1/auth/logout`: gửi cookie và header `X-CSRF-Token`.
- Request ghi ngoài login/register phải có `X-CSRF-Token`. Frontend không gửi Bearer JWT.

## Chạy kiểm tra tự động

```powershell
npm test
npm run test:api
npm run build
```

- `npm test`: test core và hợp đồng service bằng transport mô phỏng, không gọi backend thật.
- `npm run test:api`: gọi backend thật theo `.env.local`, kiểm tra đăng nhập 4 tài khoản, membership, phân quyền admin, đọc dữ liệu và đăng xuất. Chỉ tạo và đóng các phiên test; không đổi mật khẩu, role hoặc dữ liệu dự án.
- `npm run build`: build production và kiểm tra TypeScript của toàn bộ frontend.

Để dùng backend hoặc mật khẩu seed khác, đặt `API_TEST_URL`, `API_TEST_PASSWORD`, `API_TEST_ORIGIN` trong môi trường chạy test. Origin mặc định là `http://localhost:3000`.

## Kết quả kiểm tra ngày 2026-10-03

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 84 test pass: core, hợp đồng service, auth, multipart, download và enum |
| `npm run test:api` | 6 test pass trên backend `http://localhost:6789` |
| 4 tài khoản seed | Đăng nhập, đọc dữ liệu dự án demo, membership và đăng xuất đều pass |
| Quyền Admin | Admin đọc được Users/Audit/Usage; 3 tài khoản dự án nhận 403 khi gọi Users |
| Session | Sau logout, cookie cũ bị từ chối với `SESSION_EXPIRED`; không có cookie nhận `UNAUTHENTICATED` |
| CORS | Origin `http://localhost:3000` được phép gửi request kèm cookie |
| Build production | Biên dịch và TypeScript pass |

Kiểm tra HTTP dùng Axios trong Node và request preflight CORS; chưa kiểm thử thao tác trên trình duyệt. Các request ghi nghiệp vụ/upload/download thật chưa chạy trên backend trong lần này; chúng được kiểm tra bằng transport mô phỏng để không thay đổi dữ liệu demo.
