# Handoff FE → BE: Admin Overview và Log Monitoring

Ngày cập nhật: 09/10/2026.

Tài liệu bàn giao nhu cầu dữ liệu của `/admin` (Overview) và `/admin/log-monitoring` cho backend. Mục tiêu là thay dữ liệu demo bằng dữ liệu thật, giữ giao diện hiện tại và dùng lại cơ chế auth/API của platform.

**Trạng thái: đề xuất contract từ FE, chưa xác nhận BE đã triển khai.** Endpoint, field và quy tắc tính mới dưới đây cần được BE đối chiếu với nguồn dữ liệu thực tế, chốt trong OpenAPI rồi FE mới tích hợp. Tài liệu được viết từ source FE; chưa kiểm tra runtime/backend.

## 1. Phạm vi và hiện trạng

| Màn hình | FE hiện có | Phần cần BE |
| --- | --- | --- |
| `/admin` → Overview | KPI, execution reliability, active runs, recent experiment runs, platform activity | Aggregate toàn platform, chuỗi thời gian, snapshot run đang chạy, breakdown service/model/project |
| `/admin` → Operations | Request/error/latency/queue/uptime, reliability, throughput, service load, operational events | Telemetry thật, SLO, sự kiện vận hành |
| `/admin` → Projects | KPI, execution health, live runs, workload, portfolio health | Aggregate project/run/finding/usage/budget |
| `/admin` → Governance | Decision KPI, quality, routing, recent activity, decision gates, governance controls | Decision/review/audit/provenance aggregate và cấu hình gate đang áp dụng |
| `/admin/log-monitoring` | Service tiles, service detail, alerts, Live stream, Event review, Trends, Payload | Service registry, metric snapshots/history, structured logs, realtime và alert acknowledgement |

Các giới hạn cần hiểu trước khi triển khai:

- Overview đang dùng constant/demo arrays. Select thời gian và menu `Refresh metrics`, `Export report`, `Import data`, `Share dashboard` chưa có handler gọi API.
- Log Monitoring dùng chung `PatientMonitoringScreen` với `mode="logs"`. Có 8 service mẫu, không phải danh sách service đã xác minh ở hạ tầng.
- Log stream lặp lại sự kiện mẫu mỗi 3,5 giây, giữ tối đa 30 sự kiện trong state và hiển thị tối đa 6 sự kiện của service được chọn. Đây không phải kết nối realtime thật.
- Trends đang sinh đường cong từ công thức toán học; không phải lịch sử telemetry. Một số waveform cũng dùng cơ chế mô phỏng của màn patient monitoring.
- `Acknowledge` chỉ lưu ID service trong state local; reload là mất. Pause/Resume bên trong Live stream chỉ dừng/chạy timer demo.
- Footer `Overview`, `Run history`, `Decision audit`, `Trace review`, `Trends`, `Export`, `Pause` chưa có handler. Tab Payload hiện chỉ có mô tả, chưa đọc JSON sự kiện.
- Nhãn `Log stream connected`, `Audit pipeline secured`, `Telemetry pipeline connected` hiện hiển thị tĩnh; chưa chứng minh kết nối hay an toàn của pipeline.
- `/admin/logs` là **Audit Log** riêng, đã có client gọi `GET /audit`. Không thay contract này bằng technical logs và không dùng số dòng của một trang audit để suy ra audit coverage.

### Source để BE/FE đối chiếu

Đường dẫn dưới đây tính từ root repository FE:

| Source | Vai trò |
| --- | --- |
| `src/app/(main)/admin/_components/overview.tsx` | Overview, Operations, Projects và dữ liệu demo |
| `src/app/(main)/admin/_components/governance-page.tsx` | Tab Governance và gate demo |
| `src/app/(main)/admin/log-monitoring/page.tsx` | Route Log Monitoring |
| `src/app/(main)/dashboard/patient-monitoring/_components/log-monitoring-data.ts` | Service/log mẫu và adapter sang `PatientRecord` |
| `src/app/(main)/dashboard/patient-monitoring/_components/patient-monitoring.tsx` | Chọn service, stream, acknowledge, các tab |
| `src/app/(main)/dashboard/patient-monitoring/_components/patient-trends.tsx` | Trend demo |
| `src/app/(main)/dashboard/analytics/_components/analytics-toolbar.tsx` | Range options và menu action |
| `src/lib/api/services/fetch-admin.ts`, `src/hooks/use-admin-query.ts` | Admin client/hooks hiện có |
| `src/types/api.ts`, `src/types/enums.ts` | Envelope, pagination và enum FE |

Quy ước nền tảng tham khảo: [frontend-api-handoff.md](frontend-api-handoff.md), [admin-api-integration.md](../admin-api-integration.md), [frontend-api-client.md](../frontend-api-client.md).

## 2. Quy ước chung

- Prefix: `/api/v1`. Tất cả API mới chỉ dành cho user có `platform_role="platform_admin"`; project role không cấp quyền quản trị toàn platform. BE kiểm tra quyền cho từng request và stream.
- Dùng cookie session hiện có; FE gửi `withCredentials: true`/`credentials: "include"`. GET không cần CSRF; mutation cần `X-CSRF-Token`. Origin FE phải thuộc CORS allowlist.
- Dùng snake_case cho JSON. Timestamp là ISO-8601 UTC, có `Z`; FE hiển thị theo timezone người dùng.
- Trả số thô, không trả chuỗi trình bày như `28.4M`, `842ms`, `2 min ago`. Chi phí USD giữ dạng chuỗi thập phân theo contract usage hiện có.
- Thiếu nguồn đo: trả `null` và đánh dấu unavailable; không trả `0`, không tạo số liệu thay thế. `0` chỉ dùng khi đã đo/xác định thực sự bằng không.
- Phần aggregate trả `meta.pagination: null`; danh sách trả `{ total, limit, offset }`. `total` phải tính sau filter, trước pagination.
- `meta.request_id` là ID request API, độc lập với `request_id` của log được ghi trong quá khứ.
- Lỗi dùng envelope hiện có `{ success: false, message, error: { code, details }, meta: { request_id } }`. Message/fallback và mọi copy trong app dùng tiếng Anh.
- FE hiển thị lỗi API/validation qua Sonner toast, rẽ nhánh theo `error.code` và tôn trọng `Retry-After`. Alert vận hành là dữ liệu domain, không phải nơi render lỗi gọi API.

### Thời gian và cửa sổ tính

Contract đề xuất dùng `from`, `to`, `timezone`:

| Query | Quy tắc đề xuất |
| --- | --- |
| `from`, `to` | ISO-8601 có timezone; gửi cả cặp; `from < to`; khoảng **[from, to)** |
| `timezone` | IANA timezone để chia bucket ngày/tháng; mặc định `UTC` |
| `section` | Với Overview: `overview`, `operations`, `projects`, `governance`; mặc định `overview` |

BE trả lại `window` đã áp dụng và `generated_at`. Khi bỏ cả `from/to`, Overview/Projects mặc định 28 ngày, Operations/Governance mặc định 24 giờ, kết thúc tại `generated_at`. Cửa sổ history Log Monitoring mặc định 90 phút. Đây là mặc định đề xuất, BE cần chốt giới hạn truy vấn tối đa và ghi vào OpenAPI.

FE chuyển `Last 7 days`, `Last 4 weeks`, `Last 3 months`, `Year to date` thành cặp thời gian theo timezone trình duyệt. Snapshot như queue hiện tại/active runs không biến thành historical count khi đổi range; response phải ghi rõ `scope="snapshot"` hoặc `scope="window"`. Những nhãn `last 24 hours`/`last 4 weeks` đang hard-code cần đổi theo cửa sổ API sau khi tích hợp.

## 3. API Overview đề xuất

```http
GET /api/v1/admin/overview?section=overview&from=2026-09-11T00:00:00Z&to=2026-10-09T00:00:00Z&timezone=Asia%2FHo_Chi_Minh
```

Một request trả đầy đủ dữ liệu cho tab đang mở. Không buộc FE tải toàn bộ user/project/run để tự tính thống kê và không tạo một request riêng cho từng KPI.

### Shape của `data`

Các kiểu dưới đây mô tả contract **đề xuất**, không phải type đã có trong source:

```ts
type OverviewSection = "overview" | "operations" | "projects" | "governance";
type ServiceHealth = "healthy" | "warning" | "critical" | "unknown";

interface Metric {
  value: number | null;
  unit: "count" | "percent" | "tokens" | "req/s" | "ms";
  scope: "snapshot" | "window";
  previous_value: number | null;
  change: number | null;
  change_unit: "percent" | "percentage_points" | null;
  desirable_direction: "up" | "down" | null;
  available: boolean;
}

interface ChartSeries {
  key: string;
  unit: string;
  interval_seconds: number;
  points: { timestamp: string; value: number | null; target: number | null }[];
  available: boolean;
}

interface Breakdown {
  key: string;
  unit: string;
  items: { id: string; label: string; value: number }[];
  total: number | null;
  available: boolean;
}

interface AdminOverviewData {
  section: OverviewSection;
  generated_at: string;
  window: { from: string; to: string; timezone: string };
  comparison_window: { from: string; to: string };
  metrics: Record<string, Metric>;
  money_metrics: Record<string, {
    value_usd: string | null;
    previous_value_usd: string | null;
    change_percent: number | null;
    available: boolean;
  }>;
  series: ChartSeries[];
  breakdowns: Breakdown[];
  // Row shape phụ thuộc section; bảng dưới định nghĩa từng nhóm.
  recent_runs?: ExperimentSummary[];
  recent_events?: OperationalEvent[];
  governance_events?: GovernanceEvent[];
  decision_gates?: DecisionGate[];
  unavailable_fields: { key: string; reason_code: string }[];
}
```

Các section trả đúng nhóm field tương ứng, không cần gửi nhóm thuộc tab khác. Mảng rỗng thể hiện nguồn có dữ liệu nhưng không có kết quả; `available=false` thể hiện chưa hỗ trợ/không đọc được nguồn. `unavailable_fields` là metadata để FE phân biệt hai trường hợp này, không hiển thị thành error panel.

### Mapping các tab

| Tab | Metric keys cần cung cấp | Series keys | Breakdown keys / dữ liệu bổ sung |
| --- | --- | --- | --- |
| Overview | `active_projects`, `experiment_runs`, `successful_runs_rate`, `token_usage`, `review_queue`, `active_runs` | `execution_reliability`, `active_runs` | `active_runs_by_service`, `activity_by_service`, `token_usage_by_model`, `runs_by_project`; `recent_runs` |
| Operations | `request_rate`, `error_rate`, `p95_latency`, `queue_depth`, `service_uptime` | `service_reliability`, `request_rate`, `queue_depth` | `request_rate_by_service`, `queue_depth_by_type`, `requests_by_service`, `requests_by_region`, `pending_jobs_by_queue`; `recent_events` |
| Projects | `active_projects`, `experiment_runs`, `validated_findings`, `token_usage`, `active_runs`, `total_projects`, `projects_in_review`, `archived_projects`, `active_project_capacity`, `review_completion`, `monthly_budget_used` | `project_execution_health`, `active_runs` | `active_runs_by_service`, `runs_by_project`, `runs_by_owner`, `projects_by_status`; `money_metrics.estimated_spend` |
| Governance | `decisions_evaluated`, `evidence_gate_pass_rate`, `audit_coverage`, `human_review_queue`, `decision_overrides`, `audit_trail_completeness`, `provenance_linked_findings`, `review_sla_within_target` | `decision_gate_quality` | `decisions_by_outcome`, `decisions_by_type`, `decisions_by_routing`; `governance_events`, `decision_gates` |

Metric/series cùng tên không nhất thiết cùng scope: `metrics.active_runs` là snapshot tại `generated_at`, còn `series.active_runs` là lịch sử snapshot được quan sát. Breakdown phải có `unit` riêng: tab Models dùng tokens, tab Projects dùng run count; không gộp các đơn vị thành một loại “Activity”.

### Định nghĩa chỉ số cần thống nhất

| Chỉ số | Quy tắc đề xuất / yêu cầu |
| --- | --- |
| Active projects | Snapshot project chưa archived và chưa completed; BE cần xác nhận có loại `draft`/`data_ready` hay không. Không dùng nhãn demo `Active` làm enum mới |
| Experiment runs | Count run được tạo trong window theo `created_at`, không phải số event/log |
| Successful runs rate | `completed / (completed + failed + budget_exceeded) * 100`, nhóm theo thời điểm kết thúc; queued/running/awaiting_review/paused không nằm trong mẫu số |
| Active runs | Snapshot run có status `running`; queued và awaiting_review có count riêng khi cần, không cộng nhầm vào “runs now” |
| Review queue / human review queue | Snapshot frame review `pending`, đếm review ID duy nhất. Nếu decision escalation là nguồn khác, trả riêng và đặt tên rõ; không cộng hai nguồn có thể trùng |
| Token usage / estimated spend | Aggregate bản ghi usage đã ghi nhận trong window; không dùng ước lượng từ số run. Spend USD là chuỗi thập phân |
| Validated findings | Chưa xác nhận domain/status tương ứng ở BE. Chỉ cung cấp sau khi xác định được source và điều kiện validated; nếu chưa có thì unavailable |
| Projects in review | Snapshot project có status `needs_review`; đây là tập con project chưa kết thúc, không cộng thêm vào total |
| Request rate | Request count / số giây quan sát trong window; live snapshot dùng cửa sổ đo ngắn do BE công bố |
| Error rate | Failed requests / observed requests * 100; BE chốt tập lỗi gồm HTTP 5xx, timeout/provider failure nào và tránh double count |
| P95 latency | Percentile 95 của request durations cùng phạm vi đo; không lấy trung bình P95 của các service |
| Queue depth | Số job pending tại snapshot; không cộng queue depths của nhiều mốc thời gian |
| Uptime / service reliability | Tính từ health probes thực tế trong window; BE công bố cách tổng hợp service và xử lý probe bị thiếu |
| Gate pass rate / quality | BE chốt numerator, denominator và outcome hợp lệ. Quality chưa có định nghĩa domain thì unavailable; không tự suy ra từ confidence |
| Audit coverage / completeness | Số record/action cần audit có audit record hợp lệ chia tổng record/action cần audit; không mặc định 100% |
| Capacity / budget / SLA / provenance controls | Cần capacity limit, budget period, SLA target và liên kết provenance thực tế. Chưa có cấu hình hoặc mẫu số thì unavailable |

`RunStatus` trong FE hiện có cả `paused`; một handoff BE cũ chưa liệt kê trạng thái này. BE cần xác nhận enum đang chạy trước khi chốt aggregate. Projects dùng enum hiện có: `draft`, `data_ready`, `researching`, `needs_review`, `completed`, `archived`.

So sánh dùng window liền trước có cùng độ dài. Count: `(current - previous) / previous * 100`; rate phần trăm: `current - previous` theo percentage points. Previous bằng 0/không có dữ liệu thì `change=null`, không trả infinity. Với metric snapshot, previous chỉ có nếu có historical snapshot tương ứng; nếu chưa lưu thì trả null. “Direction” số học và tốt/xấu tách biệt, ví dụ error tăng là xấu.

Series sắp xếp timestamp tăng dần, không duplicate bucket. Bucket có nguồn đo và không có event thì count bằng 0; không có telemetry thì null. Target/SLO lấy từ cấu hình thật, không hard-code baseline demo 95/98/99. FE không giả lập lịch sử active runs khi BE chưa lưu snapshot.

### Row shapes bổ sung

- `ExperimentSummary`: `experiment_id`, `experiment_name`, `project_id`, `project_name`, `run_count`, `failure_rate_percent`, `average_duration_ms`, `last_run_at`. Bảng hiện tại tên “Recent experiment runs” nhưng row demo là aggregate theo experiment. Đề xuất giữ aggregate này, sort `last_run_at DESC, experiment_id ASC`, tối đa 5 dòng. BE cần xác nhận có thực thể experiment hay chỉ project/run; nếu chỉ có run, FE cần đổi cột/nhãn để phản ánh run thật, không tạo `EXP-*` giả.
- `OperationalEvent`: dùng `LogEvent` ở mục 4, tối đa 5 sự kiện mới nhất trong window.
- `GovernanceEvent`: `id`, `event_type`, `message`, `status`, `created_at`, `project_id`, `run_id`, `decision_id`, `actor_user_id`; các ID liên kết có thể null. Dữ liệu message/status là tiếng Anh, thời gian tương đối do FE format.
- `DecisionGate`: `id`, `name`, `status`, `provider_id`, `provider_name`, `config_version`, `confidence_threshold`, `escalation_rule`, `allowed_outputs`. Không mặc định provider “TypeSafe / Jev” hay threshold 0.80 theo demo; field chưa có trả null hoặc gate unavailable.

Top breakdown mặc định tối đa 5 mục, sort value giảm dần rồi ID; `total` là tổng đầy đủ và có thể lớn hơn tổng top items. Không cần API phân trang riêng cho preview; màn danh sách đầy đủ tiếp tục dùng API domain.

## 4. API Log Monitoring đề xuất

### 4.1 Danh sách service và snapshot metrics

```http
GET /api/v1/admin/log-monitoring/services
```

Query: `environment` optional; `limit` mặc định 20, từ 1–100; `offset` mặc định 0. Trả `data: MonitoringService[]` và `meta.pagination`. Sort ổn định theo `code ASC, id ASC`; FE tải tiếp các trang nếu cần đủ service tiles. Count header dùng `total`, không dùng số dòng một trang.

```ts
interface MonitoringService {
  id: string;
  code: string;
  name: string;
  category: string;
  environment: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  observed_at: string | null;
  stale_after_seconds: number;
  metrics_window_seconds: number;
  latency_statistic: "p95";
  metrics: {
    request_rate_per_second: number | null;
    error_rate_percent: number | null;
    latency_ms: number | null;
    cpu_percent: number | null;
    memory_percent: number | null;
    queue_depth: number | null;
  };
  alerts: MonitoringAlert[];
  recent_events: LogEvent[];
}

interface MonitoringAlert {
  id: string;
  service_id: string;
  severity: "warning" | "critical";
  code: string;
  message: string;
  started_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
}

interface LogEvent {
  id: string;
  service_id: string;
  environment: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  message: string;
  created_at: string;
  duration_ms: number | null;
  status: string | null;
  request_id: string | null;
  trace_id: string | null;
  project_id: string | null;
  run_id: string | null;
  actor_user_id: string | null;
  provider_id: string | null;
}
```

Service ID phải ổn định và duy nhất cả khi có cùng service ở Production/Staging. Không buộc BE dựng đúng 8 service demo: `agent-runtime`, `experiment-executor`, `decision-gate`, `dataset-profiler`, `provider-router`, `trace-collector`, `audit-log`, `cost-meter`.

Health do BE đánh giá từ rule/config; `critical` không bị gộp thành `warning`. `unknown` dùng khi chưa có probe/metric đủ tin cậy. FE đánh dấu stale sau `stale_after_seconds`, không giữ trạng thái healthy vô thời hạn khi stream mất kết nối.

CPU/memory percent cần công bố mẫu số: CPU theo quota/capacity nào, memory theo limit nào. Không có quota/limit hoặc service bên ngoài không đo được thì trả null. Không tạo CPU/memory cho provider bên ngoài từ latency. FE giữ adapter hiển thị local; BE **không** trả field patient như heart rate, SpO₂, arterial pressure hoặc signal profile.

Đơn vị chuẩn là request/s, ms, percent, jobs. Source demo có nhãn `Runs`/`runs/min` dùng chung `requestRate`; FE cần sửa label/adapter khi nối API, không đổi đơn vị ở BE để khớp nhãn demo. Rate chạy experiment và request rate phải là hai metric riêng nếu cần cả hai.

### 4.2 Event review / log history

```http
GET /api/v1/admin/log-monitoring/events?service_id=<id>&limit=20&offset=0
```

| Query | Quy tắc đề xuất |
| --- | --- |
| `service_id` | Optional cho toàn platform, bắt buộc khi xem service được chọn |
| `environment` | Optional; phải nhất quán với service filter |
| `level` | Một trong DEBUG/INFO/WARN/ERROR; bỏ query là tất cả |
| `q` | Optional, trim, tối đa 200 ký tự; tìm message và correlation IDs; không tìm trong secret/raw payload |
| `request_id`, `trace_id`, `project_id`, `run_id` | Optional; khớp chính xác |
| `from`, `to` | Theo quy ước window; mặc định 90 phút |
| `limit`, `offset` | Mặc định 20/0; limit 1–100, offset không âm |

Trả `data: LogEvent[]`; sort `created_at DESC, id DESC`, total tính theo filter. Timestamp/ID ổn định, không đổi event ID mỗi lần query. Không overload `request_id` bằng run ID hoặc batch ID như một số sample demo; có field liên kết riêng.

Offset pagination dành cho history của một window cố định. FE giữ nguyên `to` khi chuyển trang để giảm xê dịch do log mới; live stream không tự append vào history đang phân trang. BE cần công bố retention; log đã hết retention không thể khôi phục bằng stream.

### 4.3 Payload của event được chọn

```http
GET /api/v1/admin/log-monitoring/events/{event_id}
```

`data` gồm toàn bộ `LogEvent` cộng `payload: Record<string, unknown>` đã redact. `404 NOT_FOUND` nếu ID không tồn tại/đã hết retention. Tab Payload cần FE bổ sung thao tác chọn event và hiển thị JSON thật, không giữ text placeholder.

BE loại cookie, session token, CSRF token, API key, authorization header, connection credentials và dữ liệu nhạy cảm khỏi message/payload trước khi trả. Không trả nguyên dataset, prompt hay nội dung nghiên cứu chỉ vì người gọi là admin. Correlation IDs cần đủ để lần theo run/trace/audit hiện có.

### 4.4 Trends thật theo service

```http
GET /api/v1/admin/log-monitoring/services/{service_id}/metrics?from=<iso>&to=<iso>&interval_seconds=60
```

Trả aggregate envelope, `data` gồm `service_id`, `generated_at`, `window`, `interval_seconds`, `latency_statistic: "p95"` và `points`.

Mỗi point: `timestamp`, `request_rate_per_second`, `error_rate_percent`, `latency_ms`, `cpu_percent`, `memory_percent`, `queue_depth`; metric có thể null. Sort timestamp tăng dần. Interval mặc định 60 giây; BE công bố interval hợp lệ và số point tối đa. Request vượt giới hạn trả 422, không silently truncate window.

FE dùng timestamp/scale thật thay trục giờ hard-code và đường sin. Error rate tính từ tổng error/total của bucket; P95 lấy từ quan sát/histogram hợp lệ, không trung bình P95; queue là gauge cuối bucket, không sum. Không nội suy dữ liệu thiếu để che mất telemetry.

### 4.5 Realtime qua SSE

```http
GET /api/v1/admin/log-monitoring/stream?service_id=<id>&environment=<env>
Accept: text/event-stream
```

**SSE là phương án đề xuất cho dữ liệu một chiều, chưa có trong màn Log Monitoring.** Không coi timer demo hay SignalR provider là implementation của contract này.

| SSE event | Payload / xử lý |
| --- | --- |
| `service-snapshot` | Envelope của trang services đang theo dõi, cùng environment/limit/offset; gửi ngay khi mở/reconnect và khi snapshot thay đổi. FE thay trang snapshot |
| `log-event` | Một `LogEvent` thật, filter theo service/environment; FE deduplicate theo `id`, giới hạn bộ nhớ và cập nhật Live stream |
| `alert-updated` | Một `MonitoringAlert`; FE cập nhật theo alert ID, không đánh dấu tất cả alert của service đã acknowledge |
| `pipeline-status` | `{ telemetry_connected, audit_pipeline_status, observed_at }`; audit status: healthy/degraded/unknown, chỉ gửi khi BE thực sự có nguồn xác minh |
| `session-ended` | `{ code }`; đóng stream, xóa dữ liệu quản trị và chạy luồng auth |
| `access-ended` | `{ code }`; đóng stream, xóa dữ liệu và rời/khóa màn admin |

Stream nhận thêm `limit`, `offset` cho service snapshot với cùng quy tắc GET services. `service_id` chỉ lọc log-event/alert; snapshot vẫn chứa trang service tiles. FE mở một stream cho filter/trang hiện tại, đóng stream cũ khi đổi filter/page, unmount, logout hoặc mất quyền.

Lifecycle đề xuất:

1. GET services và latest events để có initial state; mở SSE với cookie credentials. Không gửi token trên query string.
2. Gửi heartbeat comment khoảng 15 giây. BE kiểm tra session/quyền trong stream; monitoring không được tự kéo dài idle session.
3. Pause chỉ tạm dừng live log ở FE/đóng stream; không pause run, không dừng worker và không thay trạng thái service. Resume lấy latest events/snapshot rồi kết nối lại.
4. Reconnect luôn nhận snapshot mới; baseline này không yêu cầu replay/`Last-Event-ID`. FE fetch latest events khi reconnect, history GET dùng để tra phần bỏ lỡ. Không cam kết stream cung cấp toàn bộ lịch sử.
5. Mất kết nối hiển thị trạng thái connection/stale thật. GET 401/403 hoặc SSE event kết thúc phải dừng retry. Lỗi mạng có backoff, không tạo nhiều kết nối song song.
6. Native EventSource không đọc được JSON lỗi trước khi stream mở. Khi cần phân biệt lỗi auth/rate-limit, FE probe GET services; 429 dùng Retry-After, không reconnect dồn dập.

BE cần chốt cadence metrics, retention, giới hạn connection và cấu hình proxy không buffer SSE. Alert acknowledgement ở tab khác phải được phản ánh qua stream. Stream/polling chỉ phục vụ màn đang mở; không dựng polling global ở shell.

### 4.6 Acknowledge alert

```http
POST /api/v1/admin/log-monitoring/alerts/{alert_id}/acknowledge
X-CSRF-Token: <session csrf token>
Content-Type: application/json

{}
```

Response `200`: envelope với `data: MonitoringAlert` sau acknowledge. BE lấy actor từ session, không nhận `acknowledged_by_user_id` do FE gửi. Thao tác idempotent: acknowledge lại trả trạng thái hiện có, giữ actor/time đầu tiên; đã resolved trả `409 ALERT_RESOLVED`. ID không tồn tại trả 404.

Acknowledge là đã nhận biết cảnh báo, không resolve cảnh báo và không đổi service thành healthy. BE lưu acknowledgement bền vững, ghi audit event theo quy ước audit hiện có sau commit và phát `alert-updated`. Tên action audit mới do BE chốt, không giả định đã có trong enum.

## 5. Những hành động chưa nằm trong contract tối thiểu

| Control hiện có | Hướng xử lý |
| --- | --- |
| Overview → Refresh metrics | Refetch section với range đang áp dụng; không cần mutation mới |
| Overview → Export/Import/Share | Chưa có luồng domain/handler; không suy ra BE phải làm import/share hoặc public link từ nút demo |
| Log Monitoring → Run history | Dùng API run hiện có khi có project/run context; danh sách toàn platform cần contract riêng nếu thực sự yêu cầu |
| Decision audit / Trace review | Điều hướng bằng ID tương ứng và API hiện có; không đồng nhất technical log, audit event và run trace |
| Footer Overview/Trends/Pause | FE cần chốt navigation/tab action; dùng lại state/refetch, không tạo endpoint trùng chức năng |
| Log Monitoring → Export | Giai đoạn sau; nếu triển khai phải export theo filter toàn bộ dataset trong retention, có cap và redact như detail API, không chỉ export trang đang thấy |

Nút chưa hỗ trợ cần disable/ẩn hoặc ghi trạng thái phù hợp khi tích hợp; không báo thành công giả. Không mở rộng sang quản lý Providers, Settings, sửa run hay một hệ thống incident mới trong handoff này.

## 6. Lỗi và dữ liệu chưa hỗ trợ

| HTTP / code | FE xử lý |
| --- | --- |
| 401 / code session hiện có | Dừng query/stream và dùng luồng hết session hiện có |
| 403 `ROLE_REQUIRED` | Ngừng tải dữ liệu admin; không fallback sang dữ liệu project user |
| 403 `PASSWORD_CHANGE_REQUIRED` | Dùng luồng đổi mật khẩu hiện có |
| 403 `CSRF_INVALID` | Mutation acknowledge dùng cơ chế refresh CSRF hiện có |
| 404 `NOT_FOUND` | Service/event/alert không tồn tại hoặc hết retention; toast, refresh danh sách khi cần |
| 409 `ALERT_RESOLVED` | Toast và refetch alert/service |
| 422 `VALIDATION_ERROR` | Sai section/range/timezone/filter/interval/limit; toast message, details theo schema hiện có |
| 429 `RATE_LIMITED` | Tôn trọng Retry-After; không retry query/stream ngay |
| 503 `MONITORING_UNAVAILABLE` | Đề xuất cho nguồn monitoring toàn endpoint không khả dụng; toast, giữ snapshot cũ với timestamp/stale rõ |

Tên code mới là đề xuất; BE chốt trong OpenAPI. Partial unavailable trả 200 với metric null, availability/reason_code; không khiến toàn tab lỗi nếu chỉ thiếu CPU, SLA hoặc một nguồn usage. Query không có kết quả vẫn 200 với mảng rỗng/total 0.

## 7. Thứ tự triển khai và tiêu chí nghiệm thu

1. BE đối chiếu service registry, nguồn run/project/usage/review/audit/telemetry; chốt định nghĩa và field unavailable. Cập nhật OpenAPI/schema, không dựng dữ liệu demo để lấp phần thiếu.
2. Làm GET Overview theo section; GET services/events/metrics/event detail. FE có thể tích hợp dữ liệu thật và manual refresh trước khi có realtime.
3. Thêm SSE và acknowledge sau khi có alert ID/health rules thật. FE bỏ timer/đường sin và các nhãn connected tĩnh khi chuyển sang nguồn thật.
4. Chốt riêng navigation/export nếu cần; giữ ngoài contract tối thiểu cho đến khi có luồng cụ thể.

Checklist để BE và FE nghiệm thu sau triển khai:

- [ ] Chỉ Platform Admin đọc được Overview, log history, payload và stream; project role gọi trực tiếp bị từ chối.
- [ ] Cùng window/scope cho ra KPI, series và breakdown nhất quán; không cộng số liệu của một trang thành tổng platform.
- [ ] Không có run/request, previous bằng 0, thiếu telemetry hoặc thiếu budget/SLA không gây NaN/infinity hoặc số liệu giả.
- [ ] Snapshot active runs/queue/review không bị hiểu thành count trong range; quality/SLO/coverage có nguồn và công thức rõ.
- [ ] Events có ID/timestamp ổn định, đúng service/environment/filter; payload đã redact và correlation IDs không bị tráo loại.
- [ ] Service critical/unknown/stale được thể hiện đúng; request/s và runs/min không bị dùng thay nhau.
- [ ] Reconnect lấy lại snapshot/latest events; deduplicate log ID; đổi service/unmount/logout cleanup kết nối.
- [ ] Pause/Resume chỉ tác động màn theo dõi; worker/run tiếp tục chạy.
- [ ] Acknowledge bền vững qua reload, đồng bộ giữa tab, không resolve alert; mutation không CSRF bị từ chối.
- [ ] Session hết hạn/mất quyền khi stream đang mở dừng gửi dữ liệu và FE đóng kết nối.
- [ ] Không có inline error panel; toast dùng backend message; 429 không gây vòng retry liên tục.

Checklist trên là tiêu chí cần kiểm thử, **chưa phải kết quả PASS**. Lượt này chỉ tạo tài liệu handoff, không thay đổi UI/client, không chạy test/build/lint hoặc kiểm thử backend.

## 8. BE cần phản hồi để FE bắt đầu nối API

- Endpoint/shape cuối cùng trong OpenAPI; có thể giữ đường dẫn đề xuất hoặc báo mapping thay thế trước khi FE nối.
- Nguồn dữ liệu và công thức cho từng KPI, scope và lịch sử snapshot hiện có; danh sách field unavailable.
- Service registry thực tế, environment IDs, metric units/aggregation, health/alert rules và latency statistic.
- Range/interval/point caps, retention, cadence stream, connection limits và hỗ trợ acknowledgement.
- Cách biểu diễn recent experiments nếu BE chỉ có project/run; định nghĩa decision quality, validated findings, coverage/SLA nếu đã có domain tương ứng.

BE tự chọn storage/collector phù hợp với hệ thống hiện tại; FE không yêu cầu tạo bảng patient, cố định provider demo hoặc dựng thêm service chỉ để khớp giao diện.
