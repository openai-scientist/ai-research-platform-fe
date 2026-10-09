# Handoff cho FE: kết nối time series (Prometheus, InfluxDB)

Ngày 2026-10-08. Backend `ai-research-platform-be`, nhánh `dev`.

Hai loại kết nối mới cho dữ liệu chuỗi thời gian: `prometheus` và `influxdb`. Phần chung của data connections (phân quyền, envelope, CSRF, danh sách kết nối, đổi tên, xoá) nằm ở [frontend-api-handoff-3-data-connections.md](./frontend-api-handoff-3-data-connections.md); tài liệu này chỉ nói phần khác.

- Mọi ví dụ response bên dưới lấy từ API thật ngày 2026-10-08. Nguồn Prometheus là server demo công khai `https://prometheus.demo.prometheus.io` (Prometheus 3.13.0, không xác thực). Nguồn InfluxDB là ba container trên máy dev: 1.8.10, 2.7.12 và 3 Core 3.12.0, cùng một bộ dữ liệu mẫu. Danh sách dài được cắt bớt và đánh dấu `…`.
- Schema máy đọc được: Swagger UI `GET /docs`, schema `CreatePrometheusConnection`, `CreateInfluxConnection`, `TimeSeriesForm`, `LiveRequest`, `LiveData`.
- Những gì chưa kiểm được với nguồn thật nằm ở [mục 11](#11-đã-kiểm-và-chưa-kiểm-với-nguồn-thật).

## 1. Khác gì so với các loại cũ

| | Postgres, MySQL, BigQuery, Google | Prometheus, InfluxDB |
|---|---|---|
| Người dùng nhập | Host, cổng, database, user | Một URL (InfluxDB thêm tên database) |
| Chọn dữ liệu | Bảng hoặc câu `SELECT` | Form: metric, cột, khung thời gian, độ gộp. Không có ô viết truy vấn |
| `source.type` | `table`, `query` | Chỉ `timeseries` |
| Xem dữ liệu đang chạy | Không | `POST /live`, FE polling |
| Bảng kết quả | Cột theo nguồn | Luôn là `time`, rồi các tag, rồi các field |

Giữ nguyên: tạo kết nối là thử luôn, thử hỏng thì không lưu gì; sau khi tạo chỉ đổi được tên; token không bao giờ được trả về; import tạo `dataset_version` là file CSV bất biến; run không truy vấn lại nguồn.

Ánh xạ sang các endpoint duyệt đã có:

| | `prometheus` | `influxdb` |
|---|---|---|
| Schema | Luôn đúng một: `default` | Luôn đúng một: `default` |
| Bảng | Mỗi metric | Mỗi measurement của database |
| Cột `role: "field"` | Luôn đúng một, tên `value` | Mỗi field của measurement |
| Cột `role: "tag"` | Mỗi label | Mỗi tag |

Vì chỉ có một schema, FE bỏ bước chọn schema và gọi thẳng `GET /tables?schema=default`.

## 2. Luồng màn hình

```text
Danh sách kết nối
  └─ "Thêm kết nối" → chọn loại. Nhóm mới "Time series": Prometheus, InfluxDB        (màn 1)
       └─ Form kết nối → "Kết nối" = POST /connections                              (màn 2)
            ├─ 201 → mở form chọn dữ liệu
            └─ 422 → lỗi theo error.reason ngay trên form
Form chọn dữ liệu                                                                  (màn 3)
  ├─ GET /tables?schema=default&search=  → ô tìm metric / measurement
  ├─ GET /columns?schema=default&table=  → dựng các ô chọn field và tag theo `role`
  ├─ Khung thời gian, bucket, aggregate
  ├─ POST /preview  → bảng 100 dòng đầu
  ├─ "Xem live"     → POST /live lặp lại                                            (màn 4)
  └─ "Import"       → POST /datasets/from-connection
Dataset đã import                                                                  (màn 5)
  ├─ Thông tin nguồn đọc từ latest_version.source.source
  └─ "Lấy dữ liệu mới" → POST /datasets/{id}/versions/from-connection
```

Phác thảo từng màn:

```text
Màn 1: chọn loại                         Màn 2: form kết nối (InfluxDB)
┌──────────────────────────────┐         ┌──────────────────────────────────────┐
│ Database                     │         │ Tên        [ Benchmark k6          ] │
│  PostgreSQL  MySQL  BigQuery │         │ URL        [ https://influx.lab.io ] │
│ Google                       │         │ Database   [ bench                 ] │
│  Sheets      Drive           │         │ Token      [ ••••••••              ] │
│ Time series                  │         │ ⚠ URL http:// kèm token: token đi    │
│  Prometheus  InfluxDB        │         │   qua mạng không mã hoá              │
└──────────────────────────────┘         │                        [ Kết nối ]   │
                                         └──────────────────────────────────────┘

Màn 3: form chọn dữ liệu
┌───────────────────────────────────────────────────────────────┐
│ Metric      [ latency                    🔍 ]                 │
│ Field       [x] value  [x] p95  [ ] requests   (ẩn với Prom.) │
│ Tách theo   [x] host   [ ] region                             │
│ Từ          [ 2026-10-08 07:00 ]  Đến [ 2026-10-08 13:00 ]    │
│ Bucket      [ 5 phút ▾ ]          Gộp [ Trung bình ▾ ]        │
│                       [ Xem trước ]  [ Xem live ]  [ Import ] │
├───────────────────────────────────────────────────────────────┤
│ time                  host   value    p95                     │
│ 2026-10-08T07:00:00Z  web-1  33.38    60.08                   │
└───────────────────────────────────────────────────────────────┘

Màn 4: xem live                           Màn 5: nguồn của dataset
┌──────────────────────────────────┐      ┌────────────────────────────────────┐
│ latency · value · theo host      │      │ Nguồn   Bench (InfluxDB)           │
│ [15 phút] [1 giờ] [6 giờ] [24 giờ]│      │ Metric  latency · value, p95       │
│   ╱╲    ╱╲╱╲                     │      │ Tách    host                       │
│  ╱  ╲╱╲╱    ╲   ── web-1         │      │ Từ      2026-10-08 07:00 UTC       │
│ ╱            ╲  ── web-2         │      │ Đến     2026-10-08 13:00 UTC       │
│ Cập nhật 13:01:15 UTC · 1 phút   │      │ Bucket  5 phút · trung bình        │
│                         [ Dừng ] │      │ Lấy lúc 2026-10-08 13:01 UTC       │
└──────────────────────────────────┘      │              [ Lấy dữ liệu mới ]   │
                                          └────────────────────────────────────┘
```

## 3. Tạo kết nối

`POST /api/v1/projects/{project_id}/connections`, cần `X-CSRF-Token`.

```ts
type ConnectionKind =
  | "postgres" | "mysql" | "bigquery" | "google_sheets" | "google_drive"
  | "prometheus" | "influxdb";

interface CreatePrometheusConnection {
  name: string;                       // 2–160 ký tự, như các loại cũ
  kind: "prometheus";
  config: { url: string };
  secret?: { username?: string; token?: string };
}

interface CreateInfluxConnection {
  name: string;
  kind: "influxdb";
  config: { url: string; database: string };
  secret?: { token?: string; username?: string; password?: string };
}
```

### Trường form

| Loại | Trường | Bắt buộc | Ghi chú |
|---|---|:-:|---|
| Cả hai | `config.url` | ✓ | `http(s)://host[:port][/tiền-tố]`, tối đa 2048 ký tự. Là địa chỉ đứng **trước** đường dẫn API: không gõ `/api/v1` (Prometheus) hay `/query` (InfluxDB) |
| `prometheus` | `secret.token` | | Để trống: không xác thực. Một mình: gửi dạng Bearer. Tối đa 4096 ký tự ASCII in được, không có khoảng trắng |
| `prometheus` | `secret.username` | | Có `username` thì `token` là mật khẩu của Basic auth (Grafana Cloud dùng cách này). Tối đa 255 ký tự, không có dấu `:` |
| `influxdb` | `config.database` | ✓ | 1.x: tên database. 2.x và 3: tên bucket. 1–255 ký tự |
| `influxdb` | `secret.token` | | InfluxDB 2.x/3: gửi dạng `Authorization: Token …`. Tối đa 4096 ký tự ASCII in được, không khoảng trắng. Để trống: không xác thực |
| `influxdb` | `secret.username`, `secret.password` | Cặp | InfluxDB 1.8 có bật xác thực: backend gửi Basic auth. Username tối đa 255 ký tự ASCII in được, không có `:`; password tối đa 4096 ký tự ASCII in được. Nhập cả hai; không gửi đồng thời với `token` |

`secret` có thể bỏ hẳn khi server không cần xác thực.

### URL bị từ chối trước khi thử

Trả 422 `VALIDATION_ERROR`, `error.details[0].field` là `body.prometheus.config.url` hoặc `body.influxdb.config.url`. Không có gì được lưu hay ghi log.

| URL | `details[0].message` |
|---|---|
| `https://user:pw@host` | `Value error, url must not hold a user name or a password` |
| `https://host/?a=1`, `https://host/#x` | `Value error, url must not hold a query or a fragment` |
| `ftp://host`, `host:9090` | `Value error, url must start with http:// or https://` |
| Có khoảng trắng hay ký tự điều khiển | `Value error, url must not hold spaces or control characters` |
| Tiền tố có ký tự ngoài chữ, số, `. _ ~ -` | `Value error, url path may hold only letters, digits and . _ ~ - between slashes` |

Backend cắt khoảng trắng hai đầu, bỏ dấu `/` cuối và bỏ cổng mặc định; `config.url` trả về là dạng đã chuẩn hoá.

### Response

```http
POST /api/v1/projects/41503ed6-…/connections
{ "name": "Prometheus demo", "kind": "prometheus",
  "config": { "url": "https://prometheus.demo.prometheus.io" } }
```

```json
{
  "success": true, "message": "Connection created",
  "data": {
    "id": "cfb1d409-13e5-444d-8115-4a5d7854afef",
    "project_id": "41503ed6-43f1-45e8-b662-0e1644764720",
    "name": "Prometheus demo",
    "kind": "prometheus",
    "config": { "url": "https://prometheus.demo.prometheus.io",
                "host": "prometheus.demo.prometheus.io", "port": 443 },
    "last_tested_at": "2026-10-08T13:01:43.660932Z",
    "last_error_code": null,
    "created_by_user_id": "50614215-5647-449c-9bcb-e8d09c377f94",
    "created_at": "2026-10-08T13:01:43.672793Z",
    "updated_at": "2026-10-08T13:01:43.672798Z"
  }
}
```

`config` của `influxdb` có thêm `database`:

```json
"config": { "url": "http://127.0.0.1:28086", "database": "bench", "host": "127.0.0.1", "port": 28086 }
```

`host` và `port` do backend tách từ `url`; FE không gửi hai trường này. Hiển thị `config.url` trên thẻ kết nối.

### Cảnh báo cần có trên form

- **URL `http://` kèm token.** Backend cho phép, nhưng token đi qua mạng không mã hoá. Khi `url` bắt đầu bằng `http://` và có `token` (hoặc `username`), hiện cảnh báo ngay dưới ô URL trước khi người dùng bấm "Kết nối".
- **Server trong mạng nội bộ không kết nối được.** `localhost`, IP riêng, địa chỉ metadata của cloud đều bị từ chối với `host_not_allowed`. Prometheus thường chỉ mở trong mạng nội bộ: ghi sẵn trên form rằng cần một địa chỉ public.
- **Chuyển hướng không được theo.** Server trả 3xx thì nhận `unreachable` với lời nhắn dùng URL cuối cùng. Ví dụ thật: nhập `http://prometheus.demo.prometheus.io` cho một server chỉ nói HTTPS.
- Nên tạo token chỉ có quyền đọc.

## 4. Duyệt: `/tables` và `/columns`

Base: `/api/v1/projects/{project_id}/connections/{connection_id}`. Hai endpoint có sẵn, không đổi tham số.

```ts
interface ColumnItem {
  name: string;
  type: string;
  role: "time" | "field" | "tag" | null;   // mới. null với năm loại cũ
}
```

`role` là trường mới trên `ColumnItem` của **mọi** loại kết nối, ở cả `/columns` và `/preview`. Năm loại cũ luôn trả `null`.

### `GET /tables?schema=default&search=http_requests`

```json
{
  "success": true, "message": "OK",
  "data": [
    { "schema": "default", "name": "alertmanager_http_requests_in_flight", "type": "table", "column_count": null },
    { "schema": "default", "name": "caddy_admin_http_requests_total", "type": "table", "column_count": null },
    { "schema": "default", "name": "caddy_http_requests_in_flight", "type": "table", "column_count": null },
    { "schema": "default", "name": "caddy_http_requests_total", "type": "table", "column_count": null },
    { "schema": "default", "name": "prometheus_http_requests_total", "type": "table", "column_count": null }
  ]
}
```

- `search` tìm chuỗi con, không phân biệt hoa thường. Tên xếp theo bảng chữ cái.
- Tối đa 500 tên mỗi lần. Server demo có 1374 metric và trả đúng 500 khi không có `search`: **luôn có ô tìm kiếm**, đừng coi danh sách không lọc là đầy đủ.
- `column_count` luôn `null`.
- Tên không viết được trong truy vấn bị ẩn khỏi danh sách: metric Prometheus có ký tự ngoài `[a-zA-Z0-9_:]`, measurement InfluxDB có ký tự xuống dòng.

### `GET /columns?schema=default&table=…`

Prometheus, metric `prometheus_http_requests_total`:

```json
{
  "success": true, "message": "OK",
  "data": [
    { "name": "time", "type": "timestamp", "role": "time" },
    { "name": "value", "type": "float", "role": "field" },
    { "name": "code", "type": "string", "role": "tag" },
    { "name": "handler", "type": "string", "role": "tag" },
    { "name": "instance", "type": "string", "role": "tag" },
    { "name": "job", "type": "string", "role": "tag" }
  ]
}
```

InfluxDB, measurement `latency` (giống nhau trên cả ba phiên bản):

```json
{
  "success": true, "message": "OK",
  "data": [
    { "name": "time", "type": "timestamp", "role": "time" },
    { "name": "p95", "type": "float", "role": "field" },
    { "name": "requests", "type": "integer", "role": "field" },
    { "name": "value", "type": "float", "role": "field" },
    { "name": "host", "type": "string", "role": "tag" },
    { "name": "region", "type": "string", "role": "tag" }
  ]
}
```

Thứ tự ở đây là `time`, các field, các tag (mỗi nhóm theo bảng chữ cái). Thứ tự cột của **kết quả** thì khác: `time`, các tag, các field, theo đúng thứ tự trong form.

### Dựng form từ `/columns`

| Phần của form | Lấy từ | `prometheus` | `influxdb` |
|---|---|---|---|
| Ô chọn field | Cột có `role: "field"` | Ẩn. Gửi `fields: []` | Chọn 1–20 |
| Ô "tách theo" | Cột có `role: "tag"` | Chọn 0–10 | Chọn 0–10 |
| Aggregate cho field không phải số | `type` khác `float`, `integer`, `unsigned` | Không xảy ra | Chỉ cho `count` (hoặc đọc thô) |

Tên field và tag của InfluxDB có thể chứa khoảng trắng, dấu phẩy, dấu nháy (đã thử `val ue`, `ta,g`, measurement `odd name "q"`). Gửi nguyên văn, không escape.

Metric hoặc measurement không tồn tại: 422 `SOURCE_INVALID`, reason `source_not_found`.

## 5. `TimeSeriesSource`

Dùng trong trường `source` sẵn có của `/preview`, `/datasets/from-connection` và `/datasets/{id}/versions/from-connection`.

```ts
type Bucket = "1m" | "5m" | "15m" | "1h" | "6h" | "1d" | "1w";
type Aggregate = "mean" | "sum" | "min" | "max" | "count" | "increase";

interface TimeSeriesSource {
  type: "timeseries";
  name: string;              // metric hoặc measurement
  fields: string[];          // InfluxDB: 1..20. Prometheus: phải rỗng
  tags: string[];            // 0..10
  start: string;             // ISO 8601 có múi giờ
  end: string;               // start < end; end không thuộc khoảng
  bucket: Bucket | null;
  aggregate: Aggregate | null;
}
```

| Trường | Quy tắc |
|---|---|
| `name` | 1–255 ký tự |
| `fields`, `tags` | Không tên nào trùng nhau; không tên nào là `time`. Với Prometheus, tag không được là `value` |
| `start`, `end` | Phải có múi giờ (`Z` hoặc `+07:00`). Gửi `new Date(...).toISOString()` |
| `bucket` + `aggregate` | Có cả hai hoặc không có cả hai |
| Không gửi trường lạ | Trường ngoài danh sách bị từ chối |

Khác biệt giữa hai loại:

| | `prometheus` | `influxdb` |
|---|---|---|
| `fields` | Phải là `[]`. Cột giá trị luôn tên `value` | Ít nhất một |
| `bucket: null` (dữ liệu thô) | Không được | Được: trả các điểm như đã ghi, không gộp |
| `aggregate: "increase"` | Được | Không được |
| Kiểu cột giá trị | Luôn `float` | `mean` → `float`; `count` → `integer`; còn lại theo kiểu của field |

### Ý nghĩa của kết quả

- Mỗi dòng là một bucket của một tổ hợp giá trị tag. Cột `time` là **đầu bucket**, UTC, ISO 8601 kết thúc bằng `Z`.
- Bucket tính từ nửa đêm UTC; bucket `1w` bắt đầu thứ Hai. Đã kiểm trên cả hai loại: `2026-08-31`, `2026-09-07`, … đều là thứ Hai.
- Khung thời gian được nới ra trọn bucket: `start` 07:03 với bucket `5m` đọc từ 07:00.
- Bucket không có điểm nào thì **không có dòng**. Đừng giả định các dòng cách đều nhau.
- Không chọn tag nào: mọi series được gộp thành một. Chọn tag: mỗi tổ hợp giá trị một series.
- Dòng xếp theo `time`, rồi theo giá trị tag.
- Giá trị là chuỗi; ô `null` là không có giá trị. `NaN` và vô cực của nguồn thành `null` (đã gặp trên server demo, ví dụ bên dưới).
- Tag mà series không có thì ô đó là `null`. Tên tag không tồn tại **không báo lỗi**: cột đó toàn `null`. Lấy tên từ `/columns` thì không gặp.

### `POST /preview`

Prometheus:

```http
POST /api/v1/projects/41503ed6-…/connections/cfb1d409-…/preview
{ "source": { "type": "timeseries", "name": "up", "fields": [], "tags": ["job"],
              "start": "2026-10-08T07:00:00Z", "end": "2026-10-08T13:00:00Z",
              "bucket": "5m", "aggregate": "mean" } }
```

```json
{
  "success": true, "message": "OK",
  "data": {
    "columns": [
      { "name": "time", "type": "timestamp", "role": "time" },
      { "name": "job", "type": "string", "role": "tag" },
      { "name": "value", "type": "float", "role": "field" }
    ],
    "rows": [
      ["2026-10-08T07:00:00Z", "alertmanager", "1"],
      ["2026-10-08T07:00:00Z", "blackbox", "1"],
      ["2026-10-08T07:00:00Z", "caddy", "1"],
      ["2026-10-08T07:00:00Z", "cadvisor", "1"],
      "…"
    ],
    "truncated": true
  }
}
```

Preview vẫn là 100 dòng đầu. Với nhiều series, 100 dòng chỉ là vài bucket đầu tiên (ở trên: 8 job, nên khoảng 12 bucket); `truncated: true` là chuyện thường.

InfluxDB, hai field và một tag:

```http
{ "source": { "type": "timeseries", "name": "latency", "fields": ["value", "p95"], "tags": ["host"],
              "start": "2026-10-08T07:00:00Z", "end": "2026-10-08T13:00:00Z",
              "bucket": "5m", "aggregate": "mean" } }
```

Cột trả về: `time`, `host`, `value`, `p95`.

InfluxDB, dữ liệu thô (`bucket: null`, `aggregate: null`):

```json
"columns": [
  { "name": "time", "type": "timestamp", "role": "time" },
  { "name": "host", "type": "string", "role": "tag" },
  { "name": "region", "type": "string", "role": "tag" },
  { "name": "value", "type": "float", "role": "field" },
  { "name": "requests", "type": "integer", "role": "field" }
],
"rows": [
  ["2026-10-08T07:00:00Z", "web-1", "eu", "33.502", "158"],
  ["2026-10-08T07:00:00Z", "web-2", "eu", "50.571", "52"],
  ["2026-10-08T07:00:00Z", "web-3", "us", "64.078", "185"],
  "…"
],
"truncated": true
```

Giá trị `NaN` của nguồn (Prometheus, `prometheus_sd_consul_rpc_duration_seconds` tách theo `quantile` và `call`, `mean` theo giờ):

```json
"rows": [
  ["2026-10-08T11:00:00Z", "0.5", "service", null],
  ["2026-10-08T11:00:00Z", "0.5", "services", null],
  "…"
]
```

Import bảng này vẫn thành công; trong CSV các ô đó rỗng.

### Khi nào dùng `increase`

Counter của Prometheus (tên thường kết thúc bằng `_total`) chỉ tăng. `mean` hay `sum` trên counter cho ra số tích luỹ, hiếm khi là thứ người dùng muốn. `increase` trả lượng tăng trong từng bucket.

```http
{ "source": { "type": "timeseries", "name": "prometheus_http_requests_total", "fields": [], "tags": ["code"],
              "start": "2026-10-08T07:00:00Z", "end": "2026-10-08T13:00:00Z",
              "bucket": "1h", "aggregate": "increase" } }
```

```json
"rows": [
  ["2026-10-08T07:00:00Z", "200", "7726.192468619246"],
  ["2026-10-08T07:00:00Z", "204", "0"],
  ["2026-10-08T07:00:00Z", "301", "0"],
  ["2026-10-08T07:00:00Z", "302", "4.01673640167364"],
  "…"
]
```

- **Kết quả là số lẻ dù counter đếm số nguyên.** Prometheus ước lượng lượng tăng từ các mẫu trong bucket rồi ngoại suy ra hai đầu bucket. Đừng làm tròn thay người dùng; có thể ghi chú "ước lượng" cạnh lựa chọn.
- **Bucket phải dài ít nhất hai lần chu kỳ thu thập của server**, không thì không có dòng nào. Xem thêm ở mục 6.
- Gợi ý trên form: khi tên metric kết thúc bằng `_total`, chọn sẵn `increase`. Backend không trả kiểu metric.

## 6. Xem live

`POST /api/v1/projects/{project_id}/connections/{connection_id}/live`, cần `X-CSRF-Token`. Chỉ cho `prometheus` và `influxdb`. Không có gì được lưu.

```ts
interface LiveRequest {
  name: string;
  fields: string[];              // như TimeSeriesSource: rỗng với Prometheus
  tags: string[];
  aggregate: Aggregate;          // bắt buộc
  last: "15m" | "1h" | "6h" | "24h";
}

interface LiveData {
  columns: ColumnItem[];
  rows: (string | null)[][];
  start: string;                 // đầu bucket đầu tiên, UTC
  end: string;                   // cuối bucket cuối cùng đã kết thúc
  bucket: string;
  truncated: boolean;
}
```

FE chỉ chọn `last`; bucket do backend quyết định:

| `last` | `bucket` | Điểm mỗi series | Chu kỳ polling đề xuất |
|---|---|--:|---|
| `15m` | `15s` | 60 | 15 giây |
| `1h` | `1m` | 60 | 60 giây |
| `6h` | `5m` | 72 | 5 phút |
| `24h` | `15m` | 96 | 15 phút |

Bucket `15s` chỉ có ở live; `TimeSeriesSource` không nhận nó.

```http
POST /api/v1/projects/41503ed6-…/connections/cfb1d409-…/live
{ "name": "up", "fields": [], "tags": ["job"], "aggregate": "count", "last": "1h" }
```

```json
{
  "success": true, "message": "OK",
  "data": {
    "columns": [
      { "name": "time", "type": "timestamp", "role": "time" },
      { "name": "job", "type": "string", "role": "tag" },
      { "name": "value", "type": "float", "role": "field" }
    ],
    "rows": [
      ["2026-10-08T12:01:00Z", "alertmanager", "4"],
      ["2026-10-08T12:01:00Z", "blackbox", "4"],
      ["2026-10-08T12:01:00Z", "caddy", "4"],
      "…"
    ],
    "start": "2026-10-08T12:01:00Z",
    "end": "2026-10-08T13:01:00Z",
    "bucket": "1m",
    "truncated": false
  }
}
```

Lần gọi này trả 480 dòng: 8 job × 60 bucket.

### Cách đọc

- Mỗi lần gọi trả **toàn bộ cửa sổ**, không phải phần mới. Thay cả dữ liệu của biểu đồ bằng response mới; không cần ghép.
- Bucket đang chạy dở không có trong kết quả. `end` chỉ tiến khi một bucket kết thúc, nên gọi nhanh hơn một bucket chỉ nhận lại đúng dữ liệu cũ. Đó là lý do của cột "chu kỳ polling đề xuất".
- Trục thời gian của biểu đồ lấy từ `start` và `end`, không lấy từ dòng đầu và dòng cuối: bucket rỗng không có dòng.
- Điểm cuối cùng có thể còn đổi ở lần gọi sau nếu server nguồn chưa nhận đủ mẫu. Trên server demo không thấy điều này (gọi lại sau 35 giây, bốn bucket cuối giữ nguyên), nhưng server chậm hơn thì có thể.
- `truncated: true`: có hơn 2000 dòng, phần **mới nhất** bị thiếu. Báo người dùng bỏ bớt tag. 2000 dòng là khoảng 20 series.

### Cửa sổ `15m` thường thưa hoặc rỗng

Bucket 15 giây ngắn hơn hoặc bằng chu kỳ thu thập của phần lớn server Prometheus (mặc định 15 giây đến 1 phút). Đo trên server demo, chu kỳ 15 giây:

| Aggregate, `last: "15m"` | Kết quả thật |
|---|---|
| `count`, `mean`, `sum`, `min`, `max` | Đủ 60 bucket, mỗi bucket đúng một mẫu mỗi series |
| `increase` | **Không có dòng nào** (`rows: []`, HTTP 200): `increase` cần hai mẫu trong một bucket |

Với server thu thập mỗi 30 hay 60 giây, cả `mean` cũng chỉ có dòng ở một phần các bucket. Nên:

- Mặc định `last: "1h"`.
- Khi `rows` rỗng mà HTTP 200, hiện "Không có điểm nào trong khoảng này. Thử khoảng dài hơn" thay vì biểu đồ trống.
- Với `increase`, bỏ hoặc làm mờ lựa chọn `15m`.

### Khi nào phải dừng polling

| Tình huống | Làm gì |
|---|---|
| Tab ẩn (`document.visibilityState === "hidden"`) | Dừng. Gọi lại ngay khi tab hiện |
| Người dùng rời màn live, hoặc bấm "Dừng" | Dừng |
| Đang chạy import hoặc preview trên cùng kết nối | Dừng tới khi xong |
| Lần gọi trước chưa trả lời | Không gửi lần mới. Đếm chu kỳ từ lúc nhận response |
| 429 `CONNECTION_BUSY` | Bỏ qua lượt này, thử lại ở chu kỳ kế |
| 429 `RATE_LIMITED` | Chờ theo header `Retry-After` |
| 422 `CONNECTION_FAILED` (bất kỳ `reason`) | Dừng, hiện lỗi và nút "Thử lại" |
| 401, 403, 404, 409 | Dừng hẳn |

Lý do: mỗi lần gọi live tính vào cùng ngân sách 120 lần đọc mỗi phút mỗi người dùng với duyệt, preview và import, và giữ một slot trong lúc chạy (mỗi người dùng 2 slot). Một tab ở `15m` dùng 4 lần mỗi phút. Nhiều tab cùng mở cộng dồn.

Xem live được ghi audit một lần mỗi 10 phút cho cùng người dùng, kết nối và metric; FE không phải làm gì.

## 7. Import và thông tin nguồn

Hai endpoint import không đổi; chỉ `source` là `TimeSeriesSource`.

```http
POST /api/v1/projects/41503ed6-…/datasets/from-connection
{ "name": "Probe series", "connection_id": "cfb1d409-13e5-444d-8115-4a5d7854afef",
  "source": { "type": "timeseries", "name": "up", "fields": [], "tags": ["job"],
              "start": "2026-10-08T07:00:00Z", "end": "2026-10-08T13:00:00Z",
              "bucket": "5m", "aggregate": "mean" } }
```

```json
{
  "success": true, "message": "Dataset imported",
  "data": {
    "id": "71d597cc-3039-460b-9504-07d2e8d9ce33",
    "project_id": "41503ed6-43f1-45e8-b662-0e1644764720",
    "name": "Probe series",
    "description": null,
    "created_by_user_id": "50614215-5647-449c-9bcb-e8d09c377f94",
    "created_at": "2026-10-08T13:02:38.944452Z",
    "updated_at": "2026-10-08T13:02:38.944456Z",
    "latest_version": {
      "id": "8a83b0b3-31c0-4e27-9319-62502a6992a1",
      "dataset_id": "71d597cc-3039-460b-9504-07d2e8d9ce33",
      "version_number": 1,
      "original_filename": "up.csv",
      "size_bytes": 18736,
      "sha256": "952bbf2778543c1efcf5f52c5c9d35eb31bb37254fb35e267fe4b111144580ff",
      "row_count": 576,
      "column_names": ["time", "job", "value"],
      "source_type": "connection",
      "source": {
        "connection_id": "cfb1d409-13e5-444d-8115-4a5d7854afef",
        "connection_name": "Prometheus demo",
        "connection_kind": "prometheus",
        "source": { "type": "timeseries", "name": "up", "fields": [], "tags": ["job"],
                    "start": "2026-10-08T07:00:00Z", "end": "2026-10-08T13:00:00Z",
                    "bucket": "5m", "aggregate": "mean" },
        "fetched_at": "2026-10-08T13:02:37.732077Z"
      },
      "…": "…"
    }
  }
}
```

File CSV lưu lại (InfluxDB, `latency` theo `host`, bucket `15m`):

```text
time,host,value
2026-10-08T12:00:00Z,web-1,36.89725555555554
2026-10-08T12:00:00Z,web-2,51.82456666666667
2026-10-08T12:00:00Z,web-3,66.87845555555555
2026-10-08T12:15:00Z,web-1,46.24503333333333
…
```

### Màn "thông tin nguồn"

Mọi thứ cần hiển thị nằm trong `latest_version.source`; không có cột metadata thời gian riêng.

| Hiển thị | Lấy từ |
|---|---|
| Tên và loại kết nối | `source.connection_name`, `source.connection_kind` |
| Metric hoặc measurement | `source.source.name` |
| Field | `source.source.fields` (rỗng với Prometheus: hiển thị `value`) |
| Tách theo | `source.source.tags` |
| Khung thời gian | `source.source.start`, `source.source.end` |
| Độ gộp | `source.source.bucket`, `source.source.aggregate` (`null` cả hai: dữ liệu thô) |
| Thời điểm lấy | `source.fetched_at` |

Phân biệt bằng `source.source.type === "timeseries"`; version import từ loại cũ có `type` là `table` hoặc `query`.

`start` và `end` được lưu lại ở dạng UTC kết thúc bằng `Z`, kể cả khi FE gửi `+07:00`.

### "Lấy dữ liệu mới"

`POST /datasets/{id}/versions/from-connection` với `connection_id` và `source` lấy từ `latest_version.source`. Gửi nguyên `source` thì nhận lại **cùng khung thời gian**, tức gần như cùng dữ liệu. Chưa có khung thời gian tương đối khi import: muốn dữ liệu mới hơn, FE mở lại form với các giá trị cũ điền sẵn và để người dùng dời `start`, `end`.

Response thật của version thứ hai:

```json
{
  "success": true, "message": "Dataset version imported",
  "data": { "version_number": 2, "original_filename": "latency.csv", "row_count": 12,
            "column_names": ["time", "host", "value"], "source_type": "connection", "…": "…" }
}
```

## 8. Mã lỗi

Mã chung ở mục 7 của handoff số 3 vẫn đúng. Bảng dưới là những gì hai loại mới thêm hoặc dùng khác đi. `message` là câu cố định bằng tiếng Anh, an toàn để hiển thị; lời của server nguồn không bao giờ được chuyển tiếp.

### Khi tạo hoặc thử kết nối: 422 `CONNECTION_FAILED`

| `reason` | Khi nào | `message` thật |
|---|---|---|
| `host_not_allowed` | URL trỏ vào `127.0.0.1`, `localhost`, `169.254.169.254`, IP riêng, hoặc tên miền phân giải ra các địa chỉ đó | `The host is not allowed` |
| `unreachable` | Server trả chuyển hướng | `The server answered with a redirect, which is not followed. Use its final URL` |
| `unreachable` | Sai tiền tố đường dẫn, hoặc server không phải loại đã chọn (404) | `The server has nothing at this address. Check the URL` |
| `unreachable` | Server trả lời nhưng không đúng dạng (ví dụ chọn InfluxDB cho một URL Prometheus) | `The server did not answer the way this kind of server does. Check the URL` |
| `unreachable` | Cổng đóng, không tới được, hoặc server trả 5xx | `The server could not be reached or refused the connection` |
| `timeout` | Không trả lời trong 10 giây | `The server did not answer in time` |
| `tls_verify_failed` | Chứng chỉ hết hạn, tự ký hoặc sai tên | `The server certificate could not be verified` |
| `auth_failed` | Server trả 401: thiếu hoặc sai thông tin xác thực | `The server rejected the credentials` |
| `permission_denied` | InfluxDB không liệt kê `database` đã nhập | `The server has no database by that name, or these credentials cannot read it` |
| `permission_denied` | Server trả 403 | `The server does not let these credentials read this` |
| `rate_limited` | Server nguồn trả 429 | `The server is limiting requests. Try again shortly` |

Không có lựa chọn bỏ qua kiểm chứng chỉ cho hai loại này: server HTTPS phải có chứng chỉ do tổ chức công khai cấp.

### Khi preview, live hoặc import: 422

| `code` | `reason` | Khi nào | Gợi ý cho người dùng |
|---|---|---|---|
| `SOURCE_INVALID` | `unsupported_source` | Gửi `table` hoặc `query` cho loại time series; gửi `timeseries` cho loại cũ; gọi `/live` trên loại cũ | Lỗi của FE, không phải của người dùng |
| `SOURCE_INVALID` | `unsupported_source` | Prometheus với `bucket: null`. `message`: `Prometheus needs a bucket: it only answers with points at regular steps` | Bắt buộc chọn bucket với Prometheus |
| `SOURCE_INVALID` | `unsupported_source` | InfluxDB với `aggregate: "increase"`. `message`: `` `increase` is for the counters of Prometheus. Choose another aggregate `` | Ẩn `increase` với InfluxDB |
| `SOURCE_INVALID` | `too_many_points` | Prometheus: khung thời gian chứa hơn 11 000 bucket | Chọn bucket lớn hơn hoặc khoảng ngắn hơn |
| `SOURCE_INVALID` | `source_not_found` | InfluxDB: measurement, field không tồn tại, hoặc tên trong `tags` thật ra là field | Tải lại `/columns` |
| `SOURCE_INVALID` | `query_failed` | InfluxDB: `mean`, `sum`, `min`, `max` trên field không phải số. `message`: `A field that does not hold numbers can only be counted` | Chỉ cho `count` với field đó |
| `SOURCE_INVALID` | `source_too_large` | Phản hồi của nguồn lớn hơn 16 MiB, hoặc server InfluxDB cắt câu trả lời | Thu hẹp khoảng, tăng bucket, bớt tag |
| `VALIDATION_ERROR` | (không có) | Prometheus với `fields` khác rỗng; InfluxDB với `fields` rỗng; `bucket` ngoài danh sách; có `bucket` mà thiếu `aggregate`; `start` không có múi giờ; `last` ngoài danh sách | Lỗi của form |
| `INVALID_DATASET` | (không có) | **Import** khi nguồn không có điểm nào trong khung thời gian. `message`: `The source has no rows, and a dataset needs at least one` | Xem dưới |

`too_many_points` tính trước khi gọi server: `(end − start) / bucket > 11 000`. Ví dụ bucket `1m` chỉ đi được khoảng 7,6 ngày. FE có thể tự tính để chặn ngay trên form. InfluxDB không có trần này, chỉ có trần 16 MiB.

### Nguồn rỗng

Không phải lỗi ở preview và live: HTTP 200 với `rows: []` và `columns` đầy đủ.

```json
{ "success": true, "message": "OK",
  "data": { "columns": [ { "name": "time", "type": "timestamp", "role": "time" },
                         { "name": "value", "type": "float", "role": "field" } ],
            "rows": [], "truncated": false } }
```

Gặp khi: khung thời gian nằm ngoài thời gian server còn giữ dữ liệu; `increase` với bucket quá ngắn; và với **Prometheus, cả khi tên metric không tồn tại** (preview không phân biệt được metric lạ với metric không có điểm; `/columns` thì có, trả `source_not_found`).

Luôn cho người dùng xem trước rồi mới import: import nguồn rỗng trả 422 `INVALID_DATASET`. Khi preview rỗng, tắt nút Import và hiện "Không có điểm nào trong khoảng này".

## 9. Giới hạn đã biết

| Giới hạn | Chi tiết |
|---|---|
| Server trong mạng nội bộ | Không kết nối được, kể cả ở production. Cần địa chỉ public |
| Prometheus giữ dữ liệu ngắn hạn | Mặc định 15 ngày. Server demo giữ khoảng 32 ngày (điểm cũ nhất thấy được là 2026-09-06 khi đọc ngày 2026-10-08). Khung thời gian cũ hơn trả bảng rỗng. Gợi ý trên form: "Server có thể không còn giữ dữ liệu cũ" |
| Phiên bản InfluxDB | 1.8, 2.x và 3 Core, đọc bằng InfluxQL. Không có Flux. Không chọn retention policy: luôn dùng mặc định của database |
| Server tương thích Prometheus | VictoriaMetrics, Thanos, Mimir, Grafana Cloud dùng cùng API nên dự kiến chạy được qua tiền tố đường dẫn trong URL; chưa kiểm |
| Danh sách metric | 500 tên mỗi lần, có `search`. Danh sách tên lớn hơn 8 MiB trả `source_too_large` |
| Một lần đọc | Phản hồi của nguồn tối đa 16 MiB. Prometheus thêm trần 11 000 bucket |
| Kích thước dataset | 50 MB dạng CSV, như các loại cũ |
| Live | 2000 dòng mỗi lần; bốn cửa sổ cố định; không có SSE hay WebSocket |
| Số thực | InfluxDB 3 Core cho kết quả `mean` và `sum` lệch ở chữ số thứ 15–17 so với 1.8 và 2.7 (`35125.222` so với `35125.222000000016`). Đừng so sánh bằng chuỗi giữa hai lần import từ hai server |
| Thời gian | Preview và live tới server demo (châu Âu) từ máy dev tại Việt Nam: khoảng 0,9 giây mỗi lần; liệt kê metric 1,5 giây; import 576 dòng 0,9 giây. Luôn có trạng thái đang tải |

Chưa hỗ trợ: truy vấn tự viết (PromQL, InfluxQL, Flux); hàm `rate`; khung thời gian tương đối khi import ("7 ngày gần nhất"); làm mới theo lịch; streaming; khai báo cột thời gian cho CSV upload; gửi metadata thời gian cho Popper.

## 10. Checklist

- [ ] Thêm `prometheus` và `influxdb` vào `ConnectionKind` và nhóm "Time series" ở màn chọn loại.
- [ ] Thêm `role` vào kiểu `ColumnItem` (nullable; năm loại cũ trả `null`).
- [ ] Form kết nối: một ô URL; InfluxDB thêm `database`; token không bắt buộc; Prometheus có thêm `username`.
- [ ] Cảnh báo khi URL là `http://` và có token.
- [ ] Ghi trên form: cần địa chỉ public; không gõ `/api/v1` hay `/query`.
- [ ] Bỏ bước chọn schema; gọi `/tables?schema=default` với ô tìm kiếm.
- [ ] Dựng ô field và tag từ `role` của `/columns`; ẩn ô field với Prometheus.
- [ ] Ẩn ô `SELECT` và nguồn kiểu bảng với hai loại này.
- [ ] `bucket` bắt buộc với Prometheus; cho phép "dữ liệu thô" với InfluxDB.
- [ ] `increase` chỉ hiện với Prometheus; chọn sẵn khi tên kết thúc bằng `_total`.
- [ ] Gửi `start`, `end` có múi giờ.
- [ ] Preview rỗng: tắt nút Import, hiện thông báo.
- [ ] Màn live: bốn lựa chọn `last`, mặc định `1h`; polling theo bảng ở mục 6; thay toàn bộ dữ liệu mỗi lần; trục thời gian theo `start`, `end`.
- [ ] Dừng polling theo bảng "khi nào phải dừng".
- [ ] Màn thông tin nguồn đọc `latest_version.source.source`.
- [ ] "Lấy dữ liệu mới" mở lại form với giá trị cũ để người dùng dời khung thời gian.
- [ ] Ẩn mọi nút ghi, duyệt, live, import với Reviewer và project đã archive.

## 11. Đã kiểm và chưa kiểm với nguồn thật

Đã chạy ngày 2026-10-08 bằng `tests/test_live_connectors.py` (kết nối thật, bộ chặn địa chỉ nội bộ bật, DNS thật, trừ khi ghi khác):

| Hạng mục | Kết quả |
|---|---|
| Prometheus demo: tạo → duyệt → preview → live → import → version 2 | Đạt |
| Prometheus: `increase`, bucket `1d` và `1w`, giá trị `NaN`, hơn 11 000 bucket | Đạt |
| InfluxDB 1.8.10, 2.7.12, 3 Core 3.12.0: cùng luồng | Đạt trên cả ba; bảng kết quả giống nhau trừ chữ số cuối của số thực ở 3 Core |
| InfluxDB: sai token (2.7, 3), database không tồn tại, tên có khoảng trắng, dấu phẩy và dấu nháy, field kiểu chuỗi, dữ liệu thô, bucket `1w` | Đạt trên cả ba |
| Chặn địa chỉ nội bộ: `127.0.0.1`, `localhost`, `169.254.169.254`, `localtest.me` (tên public trỏ về `127.0.0.1`), cho cả hai loại | Đều bị từ chối với `host_not_allowed` |
| Chuyển hướng: `http://prometheus.demo.prometheus.io` trả 308 sang HTTPS | Không theo; `unreachable` |
| Chứng chỉ hết hạn (`expired.badssl.com`) | `tls_verify_failed` |

Chưa kiểm với nguồn thật; hành vi dưới đây chỉ có test với server giả:

- **Xác thực của Prometheus** (Bearer và Basic). Server demo không cần xác thực; nhóm chưa có tài khoản Grafana Cloud.
- **Tiền tố đường dẫn** trong URL, và các server tương thích (VictoriaMetrics, Thanos, Mimir, Grafana Cloud).
- **InfluxDB qua HTTPS và qua DNS thật.** Ba container chạy ở `http://127.0.0.1`, nên lần chạy đó phải tắt bộ chặn địa chỉ nội bộ. InfluxDB Cloud chưa thử.
- **InfluxDB 1.x có bật xác thực** (Basic auth với `username` và `password`).
- **Server nguồn trả 429.**
- **Server thu thập chậm hơn 15 giây.** Nhận xét về cửa sổ `15m` thưa điểm ở mục 6 suy ra từ cách tính, chỉ riêng trường hợp `increase` rỗng là đã thấy thật.
