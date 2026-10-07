# Platform BE — Handoff Data connections cho Frontend

Tài liệu này nói về cách thứ hai để đưa dữ liệu vào project: kết nối tới database bên ngoài, duyệt bảng, xem trước và import thành dataset. Upload CSV không đổi. Quy ước chung của API (đăng nhập, envelope, CSRF) nằm ở [frontend-api-handoff.md](./frontend-api-handoff.md).

- Ngày cập nhật: 2026-10-07
- Mọi ví dụ response bên dưới lấy từ API thật chạy trong container dev ngày 2026-10-07, nguồn là database public Rfam (MySQL). Danh sách dài được cắt bớt và đánh dấu `…`.
- Schema máy đọc được: Swagger UI `GET /docs`, tag `data connections` và `datasets`. Form của từng loại kết nối nằm trong schema `CreatePostgresConnection`, `CreateMysqlConnection`, `CreateBigQueryConnection`.
- BigQuery chưa được thử với tài khoản Google thật (nhóm chưa có service account). Hợp đồng bên dưới đúng với code và với bộ test dùng thư viện của Google; số liệu thời gian của BigQuery chưa có.

## 1. Tóm tắt

- Kết nối thuộc về một project. Ba loại: `postgres` (dùng được cho Supabase), `mysql` (dùng được cho MariaDB), `bigquery`.
- Tạo kết nối là thử kết nối luôn. Thử hỏng thì không có gì được lưu.
- Sau khi tạo chỉ đổi được tên. Muốn đổi host, database, user hay mật khẩu: xoá rồi tạo lại.
- Mật khẩu và key file không bao giờ được trả về. Form sửa không có gì để điền sẵn vào ô mật khẩu.
- Duyệt bảng và xem trước chạy trực tiếp trên database ngoài, mỗi lần gọi mất khoảng 1–4 giây với server ở xa. Không có gì được lưu.
- Import tạo một `dataset_version` là file CSV, giống hệt kết quả của upload. Run dùng version đó, không truy vấn lại database.
- Import lại cùng nguồn tạo version mới với dữ liệu hiện tại của nguồn. Không có đồng bộ tự động.

## 2. Phân quyền

| Hành động | Platform Admin | Project Manager | Researcher | Reviewer |
|---|:-:|:-:|:-:|:-:|
| Xem danh sách và chi tiết kết nối | ✓ | ✓ | ✓ | ✓ |
| Tạo, đổi tên, xoá, thử lại | ✓ | ✓ | ✓ | 403 |
| Duyệt schema, bảng, cột; xem trước | ✓ | ✓ | ✓ | 403 |
| Import thành dataset hoặc version mới | ✓ | ✓ | ✓ | 403 |

Người ngoài project nhận 404. Project đã archive: mọi thao tác trừ xem danh sách và xem chi tiết trả 409 `PROJECT_ARCHIVED`. Ẩn các nút tạo, duyệt, import với Reviewer và với project đã archive.

## 3. Luồng màn hình

```text
Danh sách kết nối
  └─ "Thêm kết nối" → chọn loại (PostgreSQL / MySQL / BigQuery)
       └─ Form theo loại → "Kết nối" = POST /connections (thử + lưu trong một lần gọi)
            ├─ 201 → mở màn hình duyệt
            └─ 422 → hiển thị lỗi theo error.reason ngay trên form, giữ nguyên dữ liệu đã nhập
Duyệt
  ├─ GET /schemas → chọn schema
  ├─ GET /tables?schema= → chọn bảng (có ô tìm theo tên)
  ├─ GET /columns?schema=&table= → danh sách cột và kiểu
  ├─ POST /preview (bảng hoặc câu SELECT) → bảng 100 dòng đầu
  └─ "Import" → POST /datasets/from-connection → chuyển tới dataset vừa tạo
Dataset đã import
  └─ "Lấy dữ liệu mới" → POST /datasets/{id}/versions/from-connection với cùng connection_id và source
```

Không có endpoint "thử mà không lưu". Nút "Kết nối" trên form vừa thử vừa lưu; nếu người dùng đổi ý thì xoá kết nối.

Giá trị `connection_id` và `source` để "lấy dữ liệu mới" nằm trong `latest_version.source` của dataset (mục 6). Kết nối đó có thể đã bị xoá: khi đó API trả 404 và FE nên đề nghị chọn kết nối khác.

## 4. Endpoint kết nối

Base: `/api/v1/projects/{project_id}/connections`. Các `POST`, `PATCH`, `DELETE` cần header `X-CSRF-Token`.

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| `GET` | `` | `q?` (tên, tối thiểu 3 ký tự), `limit` (mặc định 50, tối đa 100), `offset` | `ConnectionItem[]`, mới nhất trước |
| `POST` | `` | `CreateConnection` (mục 5) | `ConnectionItem` (201) |
| `GET` | `/{connection_id}` | — | `ConnectionItem` |
| `PATCH` | `/{connection_id}` | `{ name }` | `ConnectionItem` |
| `DELETE` | `/{connection_id}` | — | `null` |
| `POST` | `/{connection_id}/test` | — | `ConnectionItem` |
| `GET` | `/{connection_id}/schemas` | — | `string[]` |
| `GET` | `/{connection_id}/tables` | `schema` (bắt buộc), `search?` | `TableItem[]`, tối đa 500, theo tên |
| `GET` | `/{connection_id}/columns` | `schema`, `table` (bắt buộc) | `ColumnItem[]` |
| `POST` | `/{connection_id}/preview` | `{ source }` | `PreviewData` |

```ts
type ConnectionKind = "postgres" | "mysql" | "bigquery";

interface ConnectionItem {
  id: string; project_id: string; name: string; kind: ConnectionKind;
  // postgres, mysql: { host, port, database, username, ssl }
  // bigquery:        { project_id, location }  (location có thể null)
  config: Record<string, unknown>;
  last_tested_at: string | null;
  last_error_code: string | null;       // một giá trị error.reason của lần thử gần nhất, null nếu thành công
  created_by_user_id: string; created_at: string; updated_at: string;
}
interface TableItem { schema: string; name: string; type: "table" | "view"; column_count: number | null; } // null với BigQuery
interface ColumnItem { name: string; type: string; }   // type là tên kiểu của database, chỉ để hiển thị
type Source =
  | { type: "table"; schema: string; name: string }
  | { type: "query"; sql: string };                    // một câu SELECT, tối đa 20 000 ký tự
interface PreviewData {
  columns: ColumnItem[];
  rows: (string | null)[][];           // mọi giá trị là text; giá trị dài hơn 500 ký tự bị cắt và kết thúc bằng "…"
  truncated: boolean;                  // true: nguồn còn dòng chưa hiển thị
}
```

### Tạo kết nối

```http
POST /api/v1/projects/51da9727-…/connections
{ "name": "Rfam", "kind": "mysql",
  "config": { "host": "mysql-rfam-public.ebi.ac.uk", "port": 4497, "database": "Rfam", "username": "rfamro", "ssl": "require" },
  "secret": { "password": "" } }
```

```json
{
  "success": true, "message": "Connection created",
  "data": {
    "id": "54690157-45a1-4b53-9a7e-4ac04b472f0e",
    "project_id": "51da9727-573a-418d-bd4d-9a7ebfbeb809",
    "name": "Rfam", "kind": "mysql",
    "config": { "host": "mysql-rfam-public.ebi.ac.uk", "database": "Rfam", "username": "rfamro", "ssl": "require", "port": 4497 },
    "last_tested_at": "2026-10-06T17:08:06.644125Z", "last_error_code": null,
    "created_by_user_id": "5b588728-7273-45e2-ab66-005506188adc",
    "created_at": "2026-10-06T17:08:06.654686Z", "updated_at": "2026-10-06T17:08:06.654690Z"
  },
  "meta": { "request_id": "aa2596a2-9e43-4532-ab1f-008ddb8d65fb", "pagination": null }
}
```

Thử hỏng (ở đây là sai mật khẩu), không có gì được lưu:

```json
{
  "success": false, "message": "The user name or password was rejected",
  "error": { "code": "CONNECTION_FAILED", "details": [], "reason": "auth_failed" },
  "meta": { "request_id": "ae33a4d6-b556-4cdd-b64a-d70749faf5e2" }
}
```

### Thử lại kết nối đã lưu

`POST /{connection_id}/test` **trả 200 cả khi thử hỏng**. Đọc `last_error_code`: `null` là thành công, ngược lại là một `error.reason` ở mục 7. Dùng để hiển thị trạng thái của kết nối trong danh sách.

### Duyệt

```json
// GET …/schemas
{ "data": ["Rfam"] }

// GET …/tables?schema=Rfam            (64 bảng, cắt bớt)
{ "data": [
  { "schema": "Rfam", "name": "_annotated_file", "type": "table", "column_count": 4 },
  { "schema": "Rfam", "name": "_family_file", "type": "table", "column_count": 3 }, …
] }

// GET …/columns?schema=Rfam&table=family    (35 cột, cắt bớt)
{ "data": [
  { "name": "rfam_acc", "type": "varchar(7)" },
  { "name": "rfam_id", "type": "varchar(40)" },
  { "name": "auto_wiki", "type": "int unsigned" }, …
] }
```

- `postgres`: chỉ liệt kê schema mà user của database đọc được. Danh sách rỗng nghĩa là user đó chưa được cấp quyền trên schema nào; hiển thị thông báo riêng cho trường hợp này thay vì bảng trống.
- `mysql`: luôn có đúng một schema, là database của kết nối. Có thể bỏ qua bước chọn schema.
- `bigquery`: schema là dataset của BigQuery. `column_count` là `null`.
- Schema có hơn 500 bảng: thu hẹp bằng `search` (tên chứa chuỗi, không phân biệt hoa thường).

### Xem trước

```http
POST …/preview
{ "source": { "type": "table", "schema": "Rfam", "name": "family" } }
```

```json
{
  "success": true, "message": "OK",
  "data": {
    "columns": [ { "name": "rfam_acc", "type": "varchar" }, { "name": "rfam_id", "type": "varchar" }, { "name": "auto_wiki", "type": "int" }, … ],
    "rows": [
      ["RF00001", "5S_rRNA", "1302", "5S ribosomal RNA", … ],
      ["RF00002", "5_8S_rRNA", "1303", … ], …
    ],
    "truncated": true
  }
}
```

- Tối đa 100 dòng. Với dòng rất rộng, preview dừng sớm hơn (khoảng 2 MB) và vẫn đặt `truncated: true`.
- Tên kiểu ở preview có thể ngắn hơn ở `/columns` (`varchar` so với `varchar(7)`). Chỉ dùng để hiển thị.
- `NULL` của database là `null`; chuỗi rỗng là `""`.
- Với `type: "query"`, khi database từ chối câu lệnh thì `message` chứa nguyên văn lỗi của database để người dùng sửa:

```json
{
  "success": false, "message": "The database rejected the query: Unknown column 'nope' in 'field list'",
  "error": { "code": "SOURCE_INVALID", "details": [], "reason": "query_failed" }
}
```

## 5. Trường form theo loại

Body là union phân biệt theo `kind`. Mọi body đều cấm trường lạ (422 `VALIDATION_ERROR`).

**Chung**: `name` — 2 đến 120 ký tự, duy nhất trong project (không phân biệt hoa thường).

**`postgres` và `mysql`**

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| `config.host` | ✓ | Tên DNS hoặc địa chỉ IP, không kèm cổng hay `scheme://`. Dán cả connection URL vào đây bị từ chối 422 |
| `config.port` | | Mặc định `5432` (postgres), `3306` (mysql) |
| `config.database` | ✓ | |
| `config.username` | ✓ | |
| `config.ssl` | | `require` (mặc định), `verify-full`, `disable` |
| `secret.password` | | Tối đa 1024 ký tự. Được phép rỗng, nhưng object `secret` thì bắt buộc: gửi `"secret": {}` hoặc `{ "password": "" }` |

**`bigquery`**

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| `secret.service_account_json` | ✓ | Nội dung file key JSON của service account, dạng chuỗi, tối đa 16 384 ký tự. Dùng ô chọn file hoặc textarea |
| `config.project_id` | | Project được duyệt và bị tính tiền. Bỏ trống: lấy project của service account |
| `config.location` | | Ví dụ `US`, `asia-southeast1`. Thường không cần |

`config` có thể bỏ hẳn. Bảng nằm ở project Google khác (ví dụ `bigquery-public-data`) không hiện khi duyệt; đọc bằng `source.type = "query"` với tên đầy đủ `` `project.dataset.table` ``.

### Cảnh báo cần hiển thị trên form

| Khi | Nội dung cần nói |
|---|---|
| `ssl = disable` | Mật khẩu và dữ liệu đi qua mạng không mã hoá. Chỉ dùng khi server không hỗ trợ TLS |
| `ssl = require` | Kết nối được mã hoá nhưng không kiểm tra chứng chỉ của server. Chọn `verify-full` nếu server có chứng chỉ do CA công khai cấp |
| `kind = bigquery` | Mỗi câu query bị tính tiền vào project Google của kết nối. Xem trước một bảng thì miễn phí; xem trước và import bằng câu `SELECT` thì có tính. Server từ chối query quét quá 1 GiB |
| Mọi loại | Nên dùng user chỉ có quyền đọc. Mọi Project Manager và Researcher của project chạy được mọi câu `SELECT` mà user đó chạy được |
| Mọi loại | Server chưa có địa chỉ IP ra cố định, nên database đặt sau firewall allowlist chưa kết nối được |

Kết quả thử thật với hai nguồn public, có thể dùng làm gợi ý trong UI khi gặp lỗi tương ứng:

| Nguồn | `require` | `verify-full` | `disable` |
|---|---|---|---|
| RNAcentral (PostgreSQL) | `tls_unavailable` | `tls_unavailable` | được |
| Rfam (MySQL) | được | `tls_verify_failed` | được |

### Hướng dẫn tạo user chỉ đọc (hiển thị cho người dùng)

PostgreSQL:

```sql
CREATE ROLE platform_reader LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE mydb TO platform_reader;
GRANT USAGE ON SCHEMA public TO platform_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO platform_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO platform_reader;
```

MySQL:

```sql
CREATE USER 'platform_reader'@'%' IDENTIFIED BY '...';
GRANT SELECT ON mydb.* TO 'platform_reader'@'%';
```

BigQuery: service account cần hai IAM role trên project là **BigQuery Job User** (`roles/bigquery.jobUser`) và **BigQuery Data Viewer** (`roles/bigquery.dataViewer`).

## 6. Import

Base: `/api/v1/projects/{project_id}/datasets`. Cả hai cần `X-CSRF-Token`.

| Method | Path | Body | `data` |
|---|---|---|---|
| `POST` | `/from-connection` | `{ name, description?, connection_id, source }` | `DatasetItem` (201) |
| `POST` | `/{dataset_id}/versions/from-connection` | `{ connection_id, source }` | `DatasetVersionItem` (201) |

`name` (2–160 ký tự) và `description` (tối đa 5000) theo cùng quy tắc với upload.

```http
POST /api/v1/projects/51da9727-…/datasets/from-connection
{ "name": "rfam rows", "connection_id": "54690157-45a1-4b53-9a7e-4ac04b472f0e",
  "source": { "type": "query", "sql": "SELECT rfam_acc, rfam_id, description, num_seed, num_full FROM family LIMIT 1000" } }
```

```json
{
  "success": true, "message": "Dataset imported",
  "data": {
    "id": "264f37e4-3fa6-46be-9792-61909d351e8c",
    "project_id": "51da9727-573a-418d-bd4d-9a7ebfbeb809",
    "name": "rfam rows", "description": null,
    "created_by_user_id": "5b588728-7273-45e2-ab66-005506188adc",
    "created_at": "2026-10-06T17:08:27.320905Z", "updated_at": "2026-10-06T17:08:27.320909Z",
    "latest_version": {
      "id": "b9124e85-4f84-47c9-8acc-69447e12938b",
      "dataset_id": "264f37e4-3fa6-46be-9792-61909d351e8c",
      "version_number": 1,
      "original_filename": "query.csv",
      "size_bytes": 54794,
      "sha256": "5f9cf647883dbb59f2b402ed15e90f397af537b14fb0c7a959add1ca31603c1c",
      "row_count": 1000,
      "column_names": ["rfam_acc", "rfam_id", "description", "num_seed", "num_full"],
      "source_type": "connection",
      "source": {
        "connection_id": "54690157-45a1-4b53-9a7e-4ac04b472f0e",
        "connection_name": "Rfam",
        "connection_kind": "mysql",
        "source": { "type": "query", "sql": "SELECT rfam_acc, rfam_id, description, num_seed, num_full FROM family LIMIT 1000" },
        "fetched_at": "2026-10-06T17:08:23.000964Z"
      },
      "created_by_user_id": "5b588728-7273-45e2-ab66-005506188adc",
      "created_at": "2026-10-06T17:08:27.325093Z"
    }
  }
}
```

Hai trường mới trên **mọi** `DatasetVersionItem` (kể cả ở các endpoint dataset cũ):

```ts
interface DatasetVersionItem {
  // … các trường cũ
  source_type: "upload" | "connection";
  source: null | {                       // null với upload
    connection_id: string;               // kết nối lúc import; có thể đã bị đổi tên hoặc xoá
    connection_name: string;
    connection_kind: ConnectionKind;
    source: Source;
    fetched_at: string;
  };
}
```

`original_filename` là `<tên bảng>.csv` khi import một bảng và `query.csv` khi import một câu `SELECT`. File tải về qua endpoint download như mọi version khác.

### Những điều FE phải xử lý

- **Request kéo dài.** Import chạy trong request, tối đa 300 giây. Đặt timeout phía client lớn hơn 300 giây, hiển thị trạng thái đang chạy và chặn bấm lần hai.
- **Request bị ngắt giữa chừng** (mất mạng, proxy cắt): import vẫn có thể đã xong. **Tải lại danh sách dataset (hoặc danh sách version) trước khi cho thử lại**, nếu không sẽ có hai bản.
- **Không bị cắt bớt.** Kết quả lớn hơn 50 MB khi ghi thành CSV trả 413 `DATASET_TOO_LARGE`; một ô dài hơn 100 000 ký tự trả 422 `SOURCE_INVALID` với reason `cell_too_large`. Gợi ý người dùng chọn ít cột hoặc ít dòng hơn bằng câu `SELECT`.
- **Import hai lần cho hai version**, kể cả khi dữ liệu giống hệt (cùng `sha256`). BE không gộp.
- **Tên cột phải khác nhau.** `SELECT a.id, b.id …` trả 422 `INVALID_DATASET`; `message` hướng dẫn đặt tên bằng `AS`.
- Sau khi import, project chuyển trạng thái như sau khi upload dataset.

## 7. Mã lỗi

Envelope lỗi có thêm trường tuỳ chọn `error.reason`. Hiển thị theo `reason` khi có, theo `code` khi không.

| HTTP | `error.code` | Khi nào |
|---|---|---|
| 403 | `ROLE_REQUIRED` | Reviewer gọi thao tác ghi, duyệt hoặc import |
| 403 | `CSRF_INVALID` | Thiếu hoặc sai `X-CSRF-Token` |
| 404 | `NOT_FOUND` | Project, kết nối hoặc dataset không tồn tại, hoặc người gọi không thuộc project |
| 409 | `PROJECT_ARCHIVED` | Project đã archive |
| 409 | `CONNECTION_NAME_EXISTS` | Trùng tên kết nối trong project |
| 409 | `DATASET_NAME_EXISTS` | Trùng tên dataset khi import |
| 409 | `CONNECTION_SECRET_UNREADABLE` | Khoá mã hoá của server đã đổi. Phải xoá kết nối và tạo lại |
| 413 | `DATASET_TOO_LARGE` | Kết quả import lớn hơn giới hạn file dataset |
| 422 | `VALIDATION_ERROR` | Body sai; `error.details[]` có `field` và `message` |
| 422 | `CONNECTION_FAILED` | Không dùng được server; xem `reason` |
| 422 | `SOURCE_INVALID` | Bảng hoặc câu lệnh có vấn đề; xem `reason` |
| 422 | `INVALID_DATASET` | Kết quả không thành dataset được: không có dòng nào, hoặc tên cột trùng/rỗng |
| 429 | `CONNECTION_BUSY` | Đang có quá nhiều lời gọi tới database ngoài. Thử lại sau vài giây; **không** có `Retry-After` |
| 429 | `RATE_LIMITED` | Người dùng gọi quá nhiều trong một phút. Chờ theo header `Retry-After` (giây) |
| 503 | `CONNECTIONS_NOT_CONFIGURED` | Server chưa bật tính năng. Xem danh sách, đổi tên và xoá vẫn chạy; tạo, thử, duyệt, xem trước, import trả 503. Ẩn các nút đó và báo liên hệ quản trị |

`error.reason`:

| `reason` | Đi với `code` | Ý nghĩa | Gợi ý cho người dùng |
|---|---|---|---|
| `host_not_allowed` | `CONNECTION_FAILED` | Host là địa chỉ nội bộ (localhost, IP riêng) | Dùng địa chỉ public của database |
| `unreachable` | `CONNECTION_FAILED` | Không tới được server hoặc bị từ chối | Kiểm tra host, cổng, firewall |
| `timeout` | `CONNECTION_FAILED` | Server không trả lời trong 10 giây | Kiểm tra firewall; thử lại |
| `auth_failed` | `CONNECTION_FAILED` | Sai user hoặc mật khẩu | |
| `permission_denied` | `CONNECTION_FAILED` | Database không tồn tại hoặc user không có quyền vào | |
| `tls_unavailable` | `CONNECTION_FAILED` | Server không hỗ trợ kết nối mã hoá | Chọn `ssl = disable` nếu chấp nhận |
| `tls_verify_failed` | `CONNECTION_FAILED` | Không xác minh được chứng chỉ | Chọn `ssl = require` nếu server dùng chứng chỉ tự ký |
| `source_not_found` | `SOURCE_INVALID` | Bảng không tồn tại hoặc user không đọc được | |
| `query_failed` | `SOURCE_INVALID` | Database từ chối câu lệnh; `message` có lỗi gốc | Hiển thị `message` |
| `query_timeout` | `SOURCE_INVALID` | Quá thời gian (60 giây với duyệt/preview, 300 giây với import) | Thu hẹp câu lệnh |
| `scan_limit_exceeded` | `SOURCE_INVALID` | BigQuery: query quét nhiều hơn mức server cho phép | Lọc theo partition hoặc chọn ít cột hơn |
| `cell_too_large` | `SOURCE_INVALID` | Import: một ô dài hơn 100 000 ký tự; `message` nêu tên cột | Bỏ cột đó hoặc rút ngắn bằng `SELECT` |

`message` của mọi lỗi là câu cố định bằng tiếng Anh, an toàn để hiển thị, trừ `query_failed` chứa lỗi gốc của database.

Phân biệt hai lỗi 429: `CONNECTION_BUSY` là giới hạn số lời gọi chạy cùng lúc (cả server 4, mỗi project 2, mỗi người dùng 2) và hết ngay khi một lời gọi khác xong, nên **đừng gửi các lời gọi duyệt song song** (ví dụ tải cột của nhiều bảng cùng lúc). `RATE_LIMITED` là giới hạn theo người dùng trong 60 giây: 30 lần tạo hoặc thử kết nối, 120 lần duyệt, xem trước hoặc import.

## 8. Giới hạn

| Giới hạn | Giá trị |
|---|---|
| Dòng trong một preview | 100 |
| Ký tự mỗi ô trong preview | 500, phần sau bị cắt |
| Bảng trả về trong một lần liệt kê | 500 |
| Độ dài câu `SELECT` | 20 000 ký tự |
| Kích thước kết quả import (dạng CSV) | 50 MB |
| Ký tự mỗi ô khi import | 100 000 |
| Thời gian thử kết nối | 10 giây |
| Thời gian duyệt hoặc xem trước | 60 giây |
| Thời gian import | 300 giây |
| BigQuery: dung lượng một query được quét | 1 GiB |

Thời gian đo thật từ máy dev tại Việt Nam tới Rfam (server ở châu Âu) ngày 2026-10-07: tạo kết nối 1,6 giây; liệt kê schema, bảng, cột khoảng 2,1 giây mỗi lần; xem trước 2,5–4 giây; import 1000 dòng 2,6–4,4 giây. Mỗi lời gọi mở một kết nối mới, nên luôn hiển thị trạng thái đang tải.

## 9. Checklist tích hợp

- [ ] Ẩn nút tạo, duyệt, import với Reviewer và project đã archive.
- [ ] Form theo `kind`, có ba cảnh báo ở mục 5.
- [ ] Lỗi tạo kết nối hiển thị theo `error.reason`, không xoá dữ liệu đã nhập.
- [ ] Trạng thái kết nối trong danh sách lấy từ `last_error_code`.
- [ ] Các lời gọi duyệt chạy lần lượt, không song song.
- [ ] Import: timeout phía client trên 300 giây, chặn bấm lần hai, tải lại danh sách trước khi cho thử lại.
- [ ] Hiển thị nguồn gốc version từ `source_type` và `source`; nút "Lấy dữ liệu mới" dùng lại `connection_id` và `source`.
- [ ] 503 `CONNECTIONS_NOT_CONFIGURED`: ẩn nút tạo, giữ danh sách.
