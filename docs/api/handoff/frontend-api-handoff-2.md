# Platform BE — Thay đổi ngày 05/10/2026

## 1. Thay đổi làm vỡ FE hiện tại

Sáu chỗ dưới đây FE đang gọi theo cách cũ sẽ sai hoặc cho kết quả khác.

| #   | Endpoint                      | Trước                           | Bây giờ                                                                                  | FE cần làm                                                         |
| --- | ----------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `POST /auth/register`         | trả phiên, đăng nhập luôn       | trả `201` với `{ email, expires_in_seconds, resend_after_seconds }`, **không có cookie** | mở màn hình nhập mã 6 số                                           |
| 2   | `POST /auth/login`            | luôn vào được nếu đúng mật khẩu | tài khoản chưa xác minh nhận `403 EMAIL_NOT_VERIFIED`                                    | mở màn hình nhập mã, gọi `resend-verification`                     |
| 3   | `POST /projects/{id}/members` | thêm thành viên ngay            | tạo **lời mời** (`status: "invited"`), người được mời phải chấp nhận                     | hiện nhãn "Đang chờ", thêm chỗ trả lời lời mời                     |
| 4   | `POST /users`                 | admin nhập `password`           | không còn `password`; BE trả `temporary_password`                                        | bỏ ô mật khẩu, hiện mật khẩu tạm cho admin                         |
| 5   | `platform_role`               | `null` hoặc `"platform_admin"`  | `"user"` hoặc `"platform_admin"`                                                         | đổi kiểu, `PUT …/platform-role` gửi `"user"` thay `null`           |
| 6   | `GET /users?email=`           | lọc đúng một email              | tham số `email` **đã bỏ**, dùng `q`                                                      | đổi sang `?q=`; gọi kiểu cũ không báo lỗi mà trả toàn bộ danh sách |

## 2. Xác minh email và quên mật khẩu (OTP)

Bốn endpoint mới, đều không cần đăng nhập:

| Endpoint                         | Body                            | Kết quả                                               |
| -------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `POST /auth/verify-email`        | `{ email, code, password }`     | đăng nhập luôn (trả phiên + cookie)                   |
| `POST /auth/resend-verification` | `{ email }`                     | luôn `200`                                            |
| `POST /auth/forgot-password`     | `{ email }`                     | luôn `200`                                            |
| `POST /auth/reset-password`      | `{ email, code, new_password }` | `200`, **không** đăng nhập; mọi thiết bị bị đăng xuất |

Quy tắc của mã:

- 6 chữ số, hết hạn sau **10 phút**, dùng được một lần.
- Mỗi mã được thử 5 lần. Sai 10 lần (tính cả các mã gửi lại) thì khoá 1 giờ.
- Gửi lại phải chờ **60 giây**, tối đa 5 mã mỗi giờ.
- Gọi bốn endpoint này quá 20 lần/phút thì nhận `429 RATE_LIMITED`; chờ theo header `Retry-After` rồi thử lại.

Điều FE cần biết:

- **Mọi lỗi về mã đều là `400 OTP_INVALID`**: sai mã, hết hạn, đã dùng, hết lượt, đang khoá, sai mật khẩu, email không tồn tại. BE cố ý không nói rõ. Hiện "Mã không đúng hoặc đã hết hạn" kèm nút gửi lại.
- `forgot-password` và `resend-verification` luôn trả `200` dù email có tài khoản hay không. Đừng hiện "email không tồn tại".
- `expires_in_seconds` và `resend_after_seconds` là giá trị cấu hình, không phải thời gian còn lại thật. Dùng để đếm ngược nút "Gửi lại".
- `reset-password` trả `400 PASSWORD_UNCHANGED` nếu mật khẩu mới trùng phần trước `@` của email.
- Sau khi đổi hoặc đặt lại mật khẩu, người dùng nhận một email thông báo.
- `UserProfile` và `UserAdminItem` có thêm `email_verified: boolean`.

## 3. Tài khoản do admin tạo

- `POST /users` chỉ cần `{ email }`, tuỳ chọn `display_name` và `send_email` (mặc định `true`).
- Tên mặc định và **mật khẩu tạm là phần trước `@` của email, viết thường** (`Dat.Ngo@example.com` → `dat.ngo`). Vai trò luôn là `user`.
- `invite_email_sent: false` nghĩa là không gửi email (do `send_email: false` hoặc gửi lỗi); tài khoản vẫn được tạo.
- `POST /users/{id}/invite` gửi lại thông tin đăng nhập. Lỗi: `409 INVITE_NOT_PENDING` (đã đổi mật khẩu), `409 USER_SUSPENDED`, `429 INVITE_COOLDOWN` (vừa gửi trong 60 giây).
- Lần đăng nhập đầu của người được tạo đi qua ba bước: `403 EMAIL_NOT_VERIFIED` → nhập mã với mật khẩu tạm → `must_change_password: true` → màn hình đổi mật khẩu.
- Khi `must_change_password: true`, mọi API trừ `GET /auth/me`, `GET /auth/csrf-token`, `POST /auth/change-password` và logout trả `403 PASSWORD_CHANGE_REQUIRED`.
- Không cấp được Platform Admin cho tài khoản chưa xác minh (`409 EMAIL_NOT_VERIFIED`) hoặc còn mật khẩu tạm (`409 PASSWORD_CHANGE_PENDING`).
- Không khoá được người đang là Project Manager duy nhất của một project: `409 LAST_PROJECT_MANAGER`.

## 4. Hồ sơ và ảnh đại diện

| Endpoint                             | Việc                                                   |
| ------------------------------------ | ------------------------------------------------------ |
| `PATCH /auth/me`                     | đổi `display_name` (1–200 ký tự); email không đổi được |
| `POST /auth/me/avatar`               | upload ảnh, multipart trường `file`                    |
| `DELETE /auth/me/avatar`             | xoá ảnh                                                |
| `PATCH /users/{id}`                  | admin đổi tên người khác                               |
| `POST` / `DELETE /users/{id}/avatar` | admin đổi hoặc xoá ảnh người khác                      |
| `GET /users/{id}/avatar`             | file ảnh, mọi người đã đăng nhập xem được              |

- Nhận PNG, JPEG, WebP, tối đa **4 MiB**. Sai loại: `415 UNSUPPORTED_IMAGE_TYPE`; quá cỡ: `413 REQUEST_BODY_TOO_LARGE`.
- BE lưu nguyên file. Cắt vuông và thu nhỏ là việc của FE trước khi upload.
- `avatar_url` là đường dẫn tương đối trên origin của API, có sẵn `?v=` để cache. Dùng nguyên, đừng bỏ `?v=`.
- Ảnh cần cookie phiên: khác origin thì dùng `<img crossOrigin="use-credentials">`.
- `avatar_url` xuất hiện ở mọi nơi có tên người dùng: thành viên, bình luận, thông báo, lời mời.

## 5. Lời mời vào project

```text
PM:              POST /projects/{id}/members { email, role }   → status "invited" + email + thông báo
Người được mời:  GET  /invitations
                 POST /invitations/{membership_id}/accept | /decline
PM:              POST /projects/{id}/members/{membership_id}/invite   → gửi lại, chỉ khi đã hết hạn
```

- Lời mời có hiệu lực **24 giờ**. Hết hạn thì `accept` trả `409 INVITE_EXPIRED`.
- Gửi lại khi còn hạn: `409 INVITE_STILL_VALID`. Chỉ hiện nút "Gửi lại" khi `status === "invited" && invite_expired`.
- Trước khi chấp nhận, người được mời chưa có quyền gì trong project (project trả `404`).
- Chỉ mời được tài khoản đã xác minh email; nếu chưa thì `404 REGISTERED_USER_NOT_FOUND`.
- `GET /projects/{id}/members` trả cả dòng `invited`, lọc được bằng `status=invited|active`.
- Thành viên có từ trước vẫn là thành viên, không phải chấp nhận gì.
- Năm loại thông báo mới: `project_invited`, `invite_accepted`, `invite_declined`, `member_role_changed`, `removed_from_project`.

## 6. Tìm kiếm, lọc và phân trang

Tìm kiếm chỉ cần một tham số `q`; BE tự tìm trên các trường của từng danh sách.

| Endpoint                      | `q` tìm trên      | Lọc                          |
| ----------------------------- | ----------------- | ---------------------------- |
| `GET /users`                  | email, tên        | `status`                     |
| `GET /projects`               | tên, mô tả        | `status`, `include_archived` |
| `GET /projects/{id}/members`  | email, tên        | `role`, `status`             |
| `GET /projects/{id}/datasets` | tên dataset       | —                            |
| `GET /projects/{id}/files`    | tên file          | `kind`                       |
| `GET /admin/usage/projects`   | tên project (mới) | `from`, `to`                 |

- `q` tối thiểu 3 ký tự (ngắn hơn trả `422`), không phân biệt hoa thường.
- **Nhiều từ:** cách nhau bằng dấu cách, mọi từ đều phải xuất hiện, thứ tự bất kỳ. `q=ngo dat` tìm được "Dat Ngo".
- `q` là tìm chứa, không phải khớp chính xác: `q=dat@example.com` cũng trả `dat@example.com.vn` nếu có.
- Phân trang: `limit` (mặc định 50, tối đa 100) và `offset`; tổng số dòng ở `meta.pagination.total`.
- Hai danh sách **không** phân trang: `…/runs/{id}/artifacts` và `…/runs/{id}/frame-reviews`.
- Không có tham số sắp xếp; thứ tự cố định theo từng danh sách.

## 7. File của project

Tài liệu đính kèm project (PDF, CSV, Excel). Khác dataset: không có version, không dùng để chạy run.

| Endpoint                                      | Việc                                  |
| --------------------------------------------- | ------------------------------------- |
| `GET /projects/{id}/files`                    | danh sách, có `q`, `kind`, phân trang |
| `POST /projects/{id}/files`                   | upload, multipart trường `file`       |
| `GET /projects/{id}/files/{file_id}/download` | tải file                              |
| `DELETE /projects/{id}/files/{file_id}`       | xoá                                   |

FE triển khai mục **Documents** trong sidebar Project, tại `/projects/{id}/files`.

- Giao diện mặc định dạng thẻ, có Grid View / List View. Dùng infinite scroll để tải tiếp khi cuộn gần cuối danh sách, không có nút phân trang. API vẫn dùng `limit`/`offset` cho từng lượt tải.
- Màu theo loại file: PDF đỏ, Excel xanh lá, CSV xanh dương; cùng cách thể hiện ở Grid View và List View.

- Upload và xoá chỉ dành cho thành viên **đang active** có vai trò `project_manager` hoặc `researcher` trong project. Vai trò `platform_admin` riêng lẻ không cấp quyền upload/xoá file.
- Reviewer và Platform Admin được xem danh sách, tải xuống. Project đã archive chỉ cho đọc/tải xuống.
- Multipart chỉ có trường `file`; hỗ trợ `.pdf`, `.csv`, `.xlsx`, `.xls`, không nhận file rỗng. Giới hạn upload mặc định của BE là 50 MiB.
- Item trả về: `id`, `project_id`, `filename`, `kind` (`pdf`, `csv`, `excel`), `content_type`, `size_bytes`, `sha256`, `created_by_user_id`, `created_at`.
- Riêng danh sách file: `q` nhận cả 1–2 ký tự, tối đa 120 ký tự; `kind` là `pdf`, `csv` hoặc `excel`. Danh sách mới nhất trước, phân trang bằng `limit`/`offset`, tổng số ở `meta.pagination.total`.
- Mọi lỗi API/validation của FE hiển thị qua Sonner toast. Upload/xoá thành công làm mới cache danh sách file.

## 8. Email người dùng nhận

- Năm loại: thông tin đăng nhập (tài khoản admin tạo), lời mời vào project, mã xác minh, mã đặt lại mật khẩu, thông báo mật khẩu đã đổi.
- Nội dung bằng tiếng Anh, giờ ghi theo giờ Việt Nam (GMT+7).
- Email chỉ có link tới trang chủ FE, **không có token và không có link sâu**. Người dùng đăng nhập rồi thao tác trong app, nên FE không cần trang nào nhận token từ email.

## 9. Chưa có

- `GET /users` chưa lọc được theo `platform_role` và `email_verified`.
- Mã OTP ở mỗi lần đăng nhập (2FA), đổi email, cảnh báo thiết bị mới.
