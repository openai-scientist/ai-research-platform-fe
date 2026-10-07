# Handoff cho FE: đăng nhập bằng Google, kết nối Google Sheets và Google Drive

Ngày 2026-10-07. Backend `ai-research-platform-be`, nhánh `dev`.

Hai tính năng Google thêm trong ngày, độc lập với nhau:

| Phần | Tính năng | Quyền xin ở Google |
|---|---|---|
| A | Đăng nhập bằng Google, tự liên kết với tài khoản đã có | `openid email profile` |
| B | Kết nối dữ liệu Google Sheets và Google Drive | Thêm quyền đọc Drive |

Đăng nhập bằng Google không cho quyền đọc Drive. Người đã đăng nhập bằng Google vẫn phải đi lượt đồng ý của phần B khi tạo kết nối.

Dòng "Đăng nhập bằng Google đã bị gỡ khỏi tài liệu vì BE không có endpoint đó" ở đầu `frontend-api-handoff.md` đã cũ: endpoint giờ đã có, mô tả ở phần A.

Cùng ngày còn có upload dataset bằng `.xlsx`; phần đó đã nằm trong `frontend-api-handoff.md`, mục dataset.

# Phần A: Đăng nhập bằng Google

Luồng đăng nhập đã chạy với Google thật trên localhost ngày 2026-10-07: một địa chỉ Gmail của tài khoản do admin tạo được liên kết, mật khẩu tạm bị xoá, email báo liên kết được gửi. Các trường hợp còn lại dưới đây có test với Google giả.

## A1. Luồng

```text
1. Người dùng bấm "Đăng nhập bằng Google" ở trang /auth/login
2. FE điều hướng cả trang tới  GET /api/v1/auth/google/start
3. Google hỏi tài khoản
4. Google gọi  GET /api/v1/auth/google/callback   (FE không bao giờ gọi endpoint này)
5. Trình duyệt quay về FE:
     {APP_URL}/                          đã có session cookie
     {APP_URL}/auth/login?error=<CODE>   không có gì thay đổi
```

- Bước 2 là điều hướng trang (`window.location.href`), không phải `fetch`. Không cần đăng nhập, không cần CSRF.
- Không có body, không có response JSON. Sau khi về `/`, FE gọi `/auth/me` và `/auth/csrf-token` như sau một lần đăng nhập thường; session cookie giống hệt đăng nhập bằng mật khẩu.
- Người dùng có 10 phút ở trang Google. Quá hạn thì quay về với `GOOGLE_SIGN_IN_FAILED`.
- Server chưa bật tính năng thì `start` trả 404 JSON. Ẩn nút khi gặp.

## A2. Backend làm gì với tài khoản Google

| Trường hợp | Kết quả |
|---|---|
| Email chưa có trong hệ thống | Tạo tài khoản mới, đã xác minh email, không có mật khẩu. Vào thẳng, không qua bước OTP |
| Email đã có, chưa liên kết Google | Liên kết tài khoản Google vào tài khoản đó rồi đăng nhập. Backend gửi email báo đã liên kết. Tài khoản đã xác minh thì mật khẩu cũ vẫn dùng được |
| Đã liên kết | Đăng nhập. Tìm theo tài khoản Google, nên vẫn đúng khi người dùng đổi email ở Google |
| Email thuộc tài khoản đã liên kết với một tài khoản Google khác | Từ chối, `GOOGLE_SIGN_IN_FAILED` |
| Tài khoản bị khoá | Từ chối, `USER_SUSPENDED` |

Liên kết là tự động theo email, không có màn hình xác nhận và không có endpoint riêng để liên kết hay gỡ liên kết.

Một điểm FE cần biết khi liên kết: nếu tài khoản có sẵn chưa từng xác minh email, hoặc đang dùng mật khẩu tạm do admin cấp, backend xoá mật khẩu đó, đánh dấu email đã xác minh và thu hồi mọi phiên đang mở của tài khoản. Lý do: chưa ai chứng minh là chủ hộp thư đó. Sau đó người dùng không đăng nhập bằng mật khẩu cũ được nữa.

Người dùng không có mật khẩu (tạo bằng Google, hoặc vừa bị xoá mật khẩu) nhập form mật khẩu thì nhận `INVALID_CREDENTIALS` như thường. Họ đặt mật khẩu qua luồng quên mật khẩu, sau đó dùng được cả hai cách. Đổi hay đặt lại mật khẩu không gỡ liên kết Google.

Chỉ nhận email do Google quản lý: `@gmail.com` hoặc tên miền Google Workspace, và Google phải báo là đã xác minh. Tài khoản Google mở trên email khác (ví dụ Yahoo) bị từ chối với `GOOGLE_EMAIL_NOT_VERIFIED`.

Response người dùng không có trường nào cho biết tài khoản đã liên kết Google hay chưa.

## A3. Mã lỗi trên `/auth/login?error=`

| Mã | Ý nghĩa | FE làm gì |
|---|---|---|
| `GOOGLE_SIGN_IN_FAILED` | Huỷ ở Google, quá 10 phút, không phải trình duyệt đã bấm, hoặc email thuộc tài khoản gắn với tài khoản Google khác | Báo đăng nhập không thành công, cho bấm lại |
| `GOOGLE_EMAIL_NOT_VERIFIED` | Email không phải Gmail hay Google Workspace đã xác minh | Báo dùng tài khoản Gmail hoặc Workspace, hoặc đăng nhập bằng mật khẩu |
| `USER_SUSPENDED` | Tài khoản bị khoá | Báo như khi đăng nhập bằng mật khẩu |

Đọc xong thì xoá `error` khỏi URL.

## A4. Checklist

- [ ] Nút "Đăng nhập bằng Google" ở trang đăng nhập (và đăng ký, nếu muốn: cùng một endpoint), là điều hướng trang.
- [ ] Trang `/auth/login` đọc `error` từ query và hiển thị theo bảng A3.
- [ ] Trang `/` xử lý được người dùng vừa đăng nhập mà không qua form.
- [ ] Ẩn nút khi `start` trả 404.

# Phần B: Kết nối Google Sheets và Google Drive

Phần này đủ để FE nối hai loại kết nối mới. Phần chung của data connections (phân quyền, duyệt, xem trước, import, envelope) nằm ở `frontend-api-handoff-3-data-connections.md`; ở đây chỉ nhắc lại chỗ cần.

Luồng dưới đây đã chạy với Google thật trên stack dev.

## 1. Khác gì so với Postgres, MySQL, BigQuery

| | Ba loại cũ | Hai loại Google |
|---|---|---|
| Xác thực | Ô mật khẩu hoặc key file (`secret`) | Người dùng đồng ý ở Google; FE gửi `grant_id` |
| Trước khi tạo | Không có bước nào | Một lượt điều hướng sang Google rồi quay về |
| Nguồn import | Bảng hoặc câu `SELECT` | Chỉ bảng |
| Khi quyền hết hạn | Xoá, tạo lại | Nút "Kết nối lại", giữ nguyên kết nối |

Từ bước duyệt trở đi (schemas, tables, columns, preview, import) FE dùng nguyên các endpoint và màn hình đã có.

## 2. Hai loại

| `kind` | Người dùng dán | `schema` là | `table` là |
|---|---|---|---|
| `google_sheets` | URL một spreadsheet | Chính spreadsheet đó, theo tiêu đề. Luôn đúng một schema | Mỗi tab |
| `google_drive` | URL một thư mục | Mỗi file CSV, Google Sheets, `.xlsx` nằm trực tiếp trong thư mục, theo tên file | Mỗi tab. File CSV có một bảng trùng tên file |

Với `google_sheets` chỉ có một schema, FE có thể bỏ bước chọn schema và vào thẳng danh sách tab.

`column_count` của bảng luôn là `null`. Mọi cột có kiểu `text`.

## 3. Luồng tạo kết nối

```text
1. Người dùng chọn loại Google, bấm "Kết nối tài khoản Google"
2. FE lưu loại đã chọn và dữ liệu form vào sessionStorage
3. FE điều hướng cả trang tới
     GET /api/v1/projects/{project_id}/connections/google/start
4. Google hỏi quyền
5. Trình duyệt quay về FE ở một trong ba địa chỉ:
     {APP_URL}/projects/{project_id}/connections?google_grant=<uuid>
     {APP_URL}/projects/{project_id}/connections?error=<CODE>
     {APP_URL}/projects?error=GOOGLE_ACCESS_FAILED
6. FE đọc google_grant, xoá nó khỏi URL, mở lại form với dữ liệu đã lưu
7. Người dùng dán URL, đặt tên, bấm "Kết nối"
8. FE gọi POST /api/v1/projects/{project_id}/connections kèm grant_id
```

### Bước 3: `start`

- Phải là điều hướng trang (`window.location.href = ...`). `fetch` không dùng được: backend đặt cookie rồi trả 302 sang Google.
- Không cần header CSRF, đây là `GET`.
- Khi không được phép, `start` trả JSON chứ không redirect, và người dùng sẽ thấy JSON thô. Vì vậy chỉ hiện nút khi người dùng có quyền ghi và project chưa archive.

| HTTP | Khi nào |
|---|---|
| 401 | Chưa đăng nhập |
| 403 | Reviewer |
| 404 | Không thuộc project, hoặc server chưa bật hai loại Google |
| 409 | Project đã archive |

### Bước 5: quay về

- Trang `/projects/{id}/connections` đọc cả `google_grant` và `error`.
- Trang `/projects` cũng phải đọc `error`: backend chuyển về đó khi không xác định được project.
- Đọc xong thì xoá tham số khỏi URL (`history.replaceState`), để tải lại trang không dùng lại grant cũ.

### Bước 8: tạo kết nối

Cần header `X-CSRF-Token` như mọi `POST` khác.

```http
POST /api/v1/projects/{project_id}/connections
{
  "name": "Điểm thi học kỳ 1",
  "kind": "google_sheets",
  "config": { "spreadsheet": "https://docs.google.com/spreadsheets/d/<id>/edit" },
  "grant_id": "<uuid từ google_grant>"
}
```

```http
POST /api/v1/projects/{project_id}/connections
{
  "name": "Thư mục dữ liệu lớp",
  "kind": "google_drive",
  "config": { "folder": "https://drive.google.com/drive/folders/<id>" },
  "grant_id": "<uuid từ google_grant>"
}
```

`spreadsheet` và `folder` nhận URL đầy đủ hoặc chỉ ID. Không gửi `secret`.

Trả 201 với `ConnectionItem` như các loại khác. `config` trong response:

```ts
type ConnectionKind = "postgres" | "mysql" | "bigquery" | "google_sheets" | "google_drive";

// kind = "google_sheets"
interface GoogleSheetsConfig {
  spreadsheet_id: string;
  title: string;            // tiêu đề spreadsheet, cũng là tên schema
  account_email: string;    // tài khoản Google đang cho mượn quyền
  google_subject: string;   // ID tài khoản Google, FE không cần hiển thị
}

// kind = "google_drive"
interface GoogleDriveConfig {
  folder_id: string;
  folder_name: string;
  account_email: string;
  google_subject: string;
}
```

Hiển thị `account_email` trên thẻ kết nối.

### Quy tắc của grant

- Dùng một lần.
- Sống 10 phút tính từ lúc gọi `start`. Thời gian người dùng ở trang Google cũng tính.
- Chỉ dùng được bởi người đã bấm, trong đúng project đó.
- Tạo kết nối hỏng thì grant vẫn còn. Cho người dùng sửa URL hoặc tên rồi gửi lại, không phải sang Google lần nữa.
- Chỉ khi nhận `GOOGLE_GRANT_INVALID` mới phải bấm "Kết nối tài khoản Google" lại.

## 4. Kết nối lại

Quyền đã lưu có thể mất: người dùng gỡ quyền ở Google, hoặc token hết hạn. Khi đó mọi lần đọc trả 422 `CONNECTION_FAILED` với `error.reason = "access_revoked"`, và `last_error_code` của kết nối là `access_revoked` sau lần `test` gần nhất.

Hiện nút "Kết nối lại" khi gặp một trong hai dấu hiệu đó:

1. Lưu `connection_id` đang kết nối lại vào `sessionStorage`.
2. Điều hướng tới `start` như mục 3.
3. Khi quay về có `google_grant`, gọi:

```http
POST /api/v1/projects/{project_id}/connections/{connection_id}/reauthorize
{ "grant_id": "<uuid>" }
```

Trả 200 với `ConnectionItem`. `id`, tên và đích giữ nguyên; `last_error_code` về `null`. Các dataset đã import từ kết nối này vẫn "lấy dữ liệu mới" được.

Người dùng phải chọn đúng tài khoản Google ban đầu. Nhắc họ bằng `config.account_email` trước khi điều hướng.

Hiện app Google đang ở chế độ Testing, nên theo quy định của Google việc kết nối lại xảy ra khoảng mỗi 7 ngày.

## 5. Mã lỗi

Envelope lỗi như cũ. Hiển thị theo `error.reason` khi có, theo `error.code` khi không.

### Trên URL khi quay về (`?error=`)

| Mã | Ý nghĩa | FE làm gì |
|---|---|---|
| `GOOGLE_ACCESS_FAILED` | Huỷ ở Google, quá 10 phút, hoặc không phải trình duyệt đã bấm | Báo lỗi, cho bấm lại |
| `GOOGLE_ACCESS_NOT_GRANTED` | Bấm tiếp tục nhưng không tích ô quyền Drive | Nhắc tích ô quyền xem file Google Drive trên màn hình của Google rồi bấm lại |

### Khi tạo kết nối hoặc kết nối lại

| HTTP | `error.code` | Ý nghĩa | FE làm gì |
|---|---|---|---|
| 422 | `VALIDATION_ERROR` | URL sai dạng, ví dụ link publish `/d/e/...` | Báo trên ô URL. Grant còn |
| 422 | `GOOGLE_GRANT_INVALID` | Grant hết hạn, đã dùng, hoặc không phải của người này trong project này | Bấm "Kết nối tài khoản Google" lại |
| 422 | `CONNECTION_FAILED` | Không đọc được đích; xem `reason` | Báo trên form. Grant còn |
| 409 | `CONNECTION_NAME_EXISTS` | Trùng tên trong project | Báo trên ô tên. Grant còn |
| 422 | `GOOGLE_ACCOUNT_MISMATCH` | `reauthorize` bằng tài khoản Google khác | Nhắc dùng `config.account_email` |
| 422 | `CONNECTION_NOT_GOOGLE` | `reauthorize` trên kết nối loại khác | Không hiện nút với loại khác |

### `error.reason`

| `reason` | Đi với `code` | Ý nghĩa | FE làm gì |
|---|---|---|---|
| `access_revoked` | `CONNECTION_FAILED` | Google không còn nhận quyền đã lưu | Nút "Kết nối lại" |
| `permission_denied` | `CONNECTION_FAILED` | Tài khoản không mở được đích, hoặc URL là file Excel đang mở trong Google Sheets | Hiển thị `message` của API |
| `rate_limited` | `CONNECTION_FAILED` | Google đang giới hạn tài khoản | Báo thử lại sau |
| `unreachable`, `timeout` | `CONNECTION_FAILED` | Không gọi được Google, hoặc server đã tắt hai loại này | Báo thử lại sau |
| `source_not_found` | `SOURCE_INVALID` | Không có file hoặc tab tên đó (đã đổi tên hoặc xoá) | Tải lại danh sách |
| `source_malformed` | `SOURCE_INVALID` | Dòng tiêu đề sai quy tắc, hai file trùng tên, hoặc file hỏng | Hiển thị `message` của API |
| `source_too_large` | `SOURCE_INVALID` | File CSV hoặc Excel lớn hơn giới hạn dataset | Báo file quá lớn |
| `unsupported_source` | `SOURCE_INVALID` | Gửi nguồn `query` | Không xảy ra nếu đã ẩn ô `SELECT` |

Với `permission_denied` và `source_malformed`, `message` nói rõ nguyên nhân và cách sửa, nên hiển thị nguyên văn.

## 6. Duyệt và import

Dùng nguyên endpoint cũ. Ba điểm khác:

- Chỉ gửi nguồn dạng bảng. Ẩn ô nhập `SELECT` với hai loại Google.

  ```json
  { "type": "table", "schema": "<tên file hoặc tiêu đề spreadsheet>", "name": "<tên tab>" }
  ```

- `schema` và `name` là tên hiển thị, không phải ID. Người dùng đổi tên file hoặc tab ở Google thì "lấy dữ liệu mới" trả `source_not_found`.
- Hai file trùng tên trong một thư mục: API từ chối đọc tên đó (`source_malformed`), không chọn ngầm một file.

Giá trị ô khi xem trước và import:

| Nguồn | Số | Ngày |
|---|---|---|
| Google Sheets | Dạng thô: `12345.5` | Như ô hiển thị: `14/09/2026` |
| `.xlsx` | Dạng thô | ISO: `2026-09-14T00:00:00` |
| CSV | Nguyên chữ trong file | Nguyên chữ trong file |

Ô công thức trong `.xlsx` chưa từng được Excel tính thì ra ô trống.

## 7. Chữ nên có trên form

Quy tắc dòng tiêu đề:

- Dòng đầu tiên của tab là tên cột; không trùng tên.
- Có giá trị nằm dưới ô tiêu đề trống thì tab bị từ chối.
- Dòng ngắn được đệm ô trống; dòng trống ở cuối bị bỏ.

Cảnh báo:

- "Mọi thành viên có quyền đóng góp của project sẽ đọc được spreadsheet (hoặc các file trong thư mục) này bằng tài khoản Google của bạn."
- Google Drive: "Chỉ đọc file nằm trực tiếp trong thư mục, không đọc thư mục con. Hỗ trợ CSV, Google Sheets, Excel `.xlsx`."
- Google Sheets: "File Excel mở trong Google Sheets chưa phải Google Sheets. Chọn File → Save as Google Sheets, hoặc dùng kết nối Google Drive."

## 8. Chạy local

- Backend: `http://localhost:8080`. `APP_URL` của backend đang là `http://localhost:3000`, nên FE phải chạy ở cổng 3000 để nhận lượt quay về.
- App Google ở chế độ Testing: chỉ tài khoản nằm trong danh sách test users mới đồng ý được. Nhờ chủ backend thêm email của bạn.
- Google hiện màn hình "Google chưa xác minh ứng dụng này" trước màn hình quyền. Bấm tiếp tục.
- Sau khi đã gỡ quyền rồi kết nối lại, ô quyền Drive không được tích sẵn. Quên tích thì quay về với `GOOGLE_ACCESS_NOT_GRANTED`.
- Server chưa bật hai loại này thì `start` trả 404. Ẩn hai loại khỏi danh sách chọn khi gặp.

## 9. Checklist

- [ ] Thêm `google_sheets` và `google_drive` vào danh sách loại và kiểu `ConnectionKind`.
- [ ] Nút "Kết nối tài khoản Google" là điều hướng trang, không phải `fetch`.
- [ ] Lưu dữ liệu form vào `sessionStorage` trước khi điều hướng, khôi phục khi quay về.
- [ ] Trang `/projects/{id}/connections` đọc `google_grant` và `error`, rồi xoá khỏi URL.
- [ ] Trang `/projects` đọc `error`.
- [ ] Giữ grant khi tạo kết nối hỏng; xin lại khi nhận `GOOGLE_GRANT_INVALID`.
- [ ] Ẩn ô `SELECT` với hai loại Google.
- [ ] Nút "Kết nối lại" khi `access_revoked`, gọi `reauthorize`.
- [ ] Hiển thị `config.account_email` trên thẻ kết nối.
- [ ] Ẩn nút với Reviewer và project đã archive.

## 10. Chưa hỗ trợ

Thư mục con; Shared drive (chưa thử nên chưa cam kết); `.xls`, Google Docs, PDF; câu `SELECT`; đồng bộ tự động; chọn file bằng Google Picker.
