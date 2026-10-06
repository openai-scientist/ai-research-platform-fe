# Bàn giao FE: Reset mật khẩu qua bước xác thực OTP riêng

Ngày cập nhật: 06/10/2026.

## 1. Contract mới

Sau khi gửi OTP, FE phải xác thực OTP trước rồi mới cho người dùng đặt mật khẩu mới. Backend bắt buộc thứ tự này bằng `reset_token`.

| Thao tác | API | Request JSON | Kết quả trong `data` |
| --- | --- | --- | --- |
| Gửi / gửi lại OTP | `POST /api/v1/auth/forgot-password` | `{ "email" }` | `{ "email", "expires_in_seconds", "resend_after_seconds" }` |
| Xác thực OTP | `POST /api/v1/auth/verify-reset-password` | `{ "email", "code" }` | `{ "reset_token", "expires_in_seconds" }` |
| Đặt mật khẩu mới | `POST /api/v1/auth/reset-password` | `{ "email", "reset_token", "new_password" }` | `null` |

**Thay đổi cần sửa ở FE:** `/reset-password` không còn nhận `code`. Thay request cũ `{ email, code, new_password }` bằng hai request verify và reset riêng.

Các endpoint này dùng JSON, không yêu cầu đăng nhập hay `X-CSRF-Token`, nhưng yêu cầu `Origin` được backend cho phép. Trình duyệt tự gửi `Origin`; FE dùng API client hiện có với `credentials: "include"` hoặc Axios `withCredentials: true`.

## 2. Request / response mẫu

### Gửi OTP

`POST /api/v1/auth/forgot-password`

```json
{
  "email": "owner@example.com"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "If the address has an account, a code is on its way",
  "data": {
    "email": "owner@example.com",
    "expires_in_seconds": 600,
    "resend_after_seconds": 60
  },
  "meta": {
    "request_id": "example-request-id",
    "pagination": null
  }
}
```

- Response giống nhau cho email tồn tại, không tồn tại hoặc tài khoản bị đình chỉ; không dùng `200` để khẳng định email đã được gửi hay tài khoản tồn tại.
- Gửi lại OTP bằng chính endpoint này. Mặc định chờ 60 giây giữa hai lần gửi, tối đa 5 lần/giờ/tài khoản cho mục đích reset.
- `resend_after_seconds` là cấu hình cố định, không phải thời gian chờ còn lại của email. FE bắt đầu đếm ngược sau request gửi/gửi lại.
- OTP mặc định có hiệu lực 10 phút. Dùng giá trị response để hiển thị thời gian, không hardcode.

### Xác thực OTP

`POST /api/v1/auth/verify-reset-password`

```json
{
  "email": "owner@example.com",
  "code": "012345"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Code verified; set a new password with the reset token",
  "data": {
    "reset_token": "<token thực tế gồm 64 ký tự>",
    "expires_in_seconds": 600
  },
  "meta": {
    "request_id": "example-request-id",
    "pagination": null
  }
}
```

- `code` là chuỗi 6 chữ số; giữ số `0` ở đầu, không chuyển sang number.
- Verify thành công tiêu thụ OTP. Không gọi verify lại để lấy cùng token.
- Chỉ chuyển sang form mật khẩu sau khi nhận response `200` có `reset_token`.
- Verify chưa đổi mật khẩu, chưa đánh dấu email đã xác thực và chưa kết thúc phiên đăng nhập.
- Token gắn với tài khoản vừa verify, dùng một lần, mặc định hết hạn sau 10 phút tính từ lúc verify thành công. Đây là thời hạn mới, riêng với thời hạn OTP.

### Đặt mật khẩu mới

`POST /api/v1/auth/reset-password`

```json
{
  "email": "owner@example.com",
  "reset_token": "<token nhận từ bước verify>",
  "new_password": "a brand new password"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Password set; sign in with it",
  "data": null,
  "meta": {
    "request_id": "example-request-id",
    "pagination": null
  }
}
```

- `new_password`: 8–128 ký tự, không được bằng phần email trước `@` mà backend chuẩn hóa về chữ thường.
- Ô nhập lại mật khẩu do FE kiểm tra; không gửi `confirm_password`.
- Thành công: token bị tiêu thụ, mọi phiên đăng nhập của tài khoản bị thu hồi. Backend không tự đăng nhập; FE xóa trạng thái auth/cache của người dùng hiện tại và chuyển tới trang login.
- Backend cũng xác thực email nếu trước đó chưa xác thực, kết thúc trạng thái mật khẩu tạm và gửi thông báo đổi mật khẩu qua email.

## 3. State và chuyển màn của FE

| Trạng thái | Dữ liệu cần giữ | Hành động tiếp theo |
| --- | --- | --- |
| Nhập email | `email` | Gọi `forgot-password`; thành công thì mở màn OTP với thông báo trung tính |
| Nhập OTP | `email`, countdown gửi lại | Gọi `verify-reset-password`; thành công thì giữ token và mở form mật khẩu |
| Nhập mật khẩu mới | `email`, `reset_token`, thời điểm hết hạn token | Gọi `reset-password` |
| Reset thành công | Không giữ token/mật khẩu | Xóa state reset và auth/cache hiện tại, chuyển tới login |

Khuyến nghị triển khai:

- Giữ token trong state của luồng reset; không đưa token lên URL, log hay analytics. Nếu dùng state trong bộ nhớ, reload trang sẽ bắt đầu lại từ bước gửi OTP.
- Giữ nguyên email đã verify trong bước đặt mật khẩu. Nếu đổi email hoặc bắt đầu lại luồng, xóa token và OTP cũ khỏi state.
- Khi gửi lại OTP hoặc quay lại bước OTP để xin mã mới, xóa token cũ ở FE. Backend vô hiệu hóa token cũ khi **thực sự phát hành** OTP mới; request bị cooldown/giới hạn chặn vẫn trả `200` và không phát hành mã mới.
- Disable nút submit khi request đang chạy để tránh gửi trùng. Verify và reset là thao tác dùng một lần; không tự retry mù khi timeout/mất mạng.
- Lỗi kiểm tra mật khẩu ở FE hoặc `422` từ backend có thể sửa và gửi lại bằng token hiện có nếu còn hạn. Không xóa token chỉ vì lỗi validation.
- Countdown chỉ giúp UX; backend quyết định token/OTP còn hợp lệ hay không.

## 4. Xử lý lỗi

Đọc `error.code` để xử lý, không so sánh chuỗi `message`.

Ví dụ lỗi verify `400`:

```json
{
  "success": false,
  "message": "The code is wrong or has expired",
  "error": {
    "code": "OTP_INVALID",
    "details": []
  },
  "meta": {
    "request_id": "example-request-id"
  }
}
```

| HTTP | `error.code` | Áp dụng | FE xử lý |
| --- | --- | --- | --- |
| `400` | `OTP_INVALID` | Verify OTP | Giữ màn OTP, báo mã không hợp lệ hoặc hết hạn; cho nhập lại/gửi lại khi được phép |
| `400` | `RESET_TOKEN_INVALID` | Reset mật khẩu | Xóa token, yêu cầu bắt đầu lại luồng gửi và verify OTP |
| `400` | `PASSWORD_UNCHANGED` | Reset mật khẩu | Báo mật khẩu không được trùng tên email; giữ token để sửa mật khẩu |
| `422` | `VALIDATION_ERROR` | Cả ba API | Hiển thị lỗi field từ `error.details` khi có; kiểm tra email, OTP, token và độ dài mật khẩu |
| `403` | `ORIGIN_NOT_ALLOWED` | Cả ba API | Kiểm tra cấu hình API origin/CORS; không xử lý như OTP sai |
| `429` | `RATE_LIMITED` | Cả ba API | Đọc header `Retry-After` (giây), tạm khóa submit và cho thử lại sau |
| `413` | `REQUEST_BODY_TOO_LARGE` | Cả ba API | Báo request quá lớn; kiểm tra payload gửi lên |

`OTP_INVALID` dùng chung cho OTP sai/hết hạn/đã dùng/hết lượt/bị khóa, email không tồn tại hoặc tài khoản đình chỉ. `RESET_TOKEN_INVALID` dùng chung cho token sai/hết hạn/đã dùng, sai tài khoản hoặc tài khoản không khả dụng. FE không suy đoán nguyên nhân cụ thể từ các lỗi này.

Mặc định mỗi OTP có tối đa 5 lượt kiểm tra; đủ 10 lần sai tích lũy sẽ khóa mục đích reset trong 60 phút. Gửi lại OTP không xóa số lần sai tích lũy. Backend không trả số lượt còn lại nên FE không tự hiển thị số lượt.

Các endpoint auth code dùng chung rate limit theo địa chỉ client và từng process API; `429` có thể xuất hiện trước khi chạm giới hạn riêng của OTP.

## 5. Checklist tích hợp

| Case | Kết quả mong đợi |
| --- | --- |
| Email → OTP đúng → token → mật khẩu hợp lệ | Thành công, chuyển tới login; mật khẩu cũ không đăng nhập được |
| Gửi request reset theo body cũ, chỉ có `code` | `422`; bắt buộc lấy và gửi `reset_token` |
| OTP có số `0` ở đầu | FE gửi nguyên chuỗi 6 chữ số |
| OTP sai/hết hạn/verify lần hai | `400 OTP_INVALID` |
| Verify thành công | Mật khẩu và các session cũ chưa thay đổi |
| Token sai/hết hạn/đã dùng/dùng cho email khác | `400 RESET_TOKEN_INVALID` |
| Phát hành OTP mới sau khi đã verify | Token cũ không reset được; cần verify OTP mới |
| Mật khẩu không hợp lệ rồi sửa lại | Token chưa bị tiêu thụ; có thể submit lại nếu còn hạn |
| Reset thành công khi đang có session | Session cũ bị thu hồi; FE xóa auth state và về login |
| Reload hoặc mất response verify sau khi backend đã tiêu thụ OTP | Bắt đầu lại luồng gửi OTP; không cố verify lại mã đã dùng |

## 6. Điều kiện chạy backend

Backend cần áp dụng migration `20261006_0016` trước khi FE gọi contract mới. Với môi trường Docker theo Taskfile của repo, chạy `task migrate`, sau đó chạy bản API chứa thay đổi này.

Tham chiếu triển khai: `src/platform_be/api/v1/auth.py`, `src/platform_be/services/one_time_codes.py`. Swagger tại `/docs` trên API origin chứa schema hiện hành.
