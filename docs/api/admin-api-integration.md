# Tích hợp API admin

Theo [frontend-api-handoff.md](frontend-api-handoff.md), mục 13. Tầng fetch và hooks dùng lại từ [frontend-api-client.md](frontend-api-client.md).

| API | Màn hình / hành động |
|---|---|
| GET /users | `/admin/users`, lọc email và phân trang |
| PATCH /users/{user_id}/status | Suspend / Activate, có xác nhận |
| PUT /users/{user_id}/platform-role | Grant admin / Remove admin, có xác nhận |
| GET /audit | `/admin/logs` (Audit Log), lọc project ID, action, from/to |
| GET /admin/usage/projects | `/admin/usage`, lọc from/to, số run, chi phí, budget và trạng thái theo project |

Các query chỉ bật khi auth store đã xác nhận người dùng là Platform Admin. Layout admin vẫn kiểm tra phiên ở server; backend quyết định quyền cho từng request. Không gán Project Manager/Researcher/Reviewer thành quyền toàn hệ thống.

Mỗi trang lấy 20 dòng và sử dụng total/limit/offset của backend. Bộ lọc chỉ áp dụng sau khi bấm Apply filters. Khoảng ngày dùng DateRangePicker có sẵn của dashboard, từ đầu ngày bắt đầu đến cuối ngày kết thúc theo múi giờ trình duyệt, chuyển sang ISO-8601 có timezone trước khi gửi. Bỏ trống hoặc Reset là toàn thời gian. Tiền giữ nguyên chuỗi thập phân từ backend, không tính tổng một trang thành tổng toàn hệ thống.

Mutation thất bại hiển thị message backend qua Sonner, giữ dialog để người dùng xử lý hoặc thử lại; LAST_PLATFORM_ADMIN và LAST_PROJECT_MANAGER do backend bảo vệ. Khi sửa chính tài khoản hiện tại, frontend tải lại phiên và refresh route để cập nhật quyền truy cập.

Có loading skeleton, empty state, nút Refresh và khoá thao tác khi chưa xác thực/đang tải. Lỗi không hiển thị thành banner hoặc panel. Backend hiện chỉ cung cấp list user và hai mutation, chưa có GET user detail: route `/admin/users/[userId]` chuyển về danh sách thay vì hiển thị profile giả.

Notification tạm hoãn: không mount query hoặc mutation notification, tắt query/polling trong hook, bỏ notification invalidation khỏi mutation các nhóm khác. SignalR provider vẫn đang tắt như trước.

Các màn admin Overview, Projects, Providers, System Health và Settings nằm ngoài 5 API của mục 13; chưa nối thêm API trong lượt này. Những chỉ số token, request, last login, biểu đồ theo ngày và log hạ tầng không có trong response admin nên không được đưa vào ba màn đã tích hợp.

Đã định dạng mã nguồn bằng Biome formatter và rà soát source. Chưa chạy build, lint, check, typecheck, kiểm thử HTTP hoặc xác minh giao diện trình duyệt; AGENTS.md yêu cầu người dùng chỉ định việc validation.

## Cập nhật datepicker

Usage và Audit dùng lại `src/components/date-range-picker.tsx`: khoảng ngày hiển thị All time khi chưa chọn hoặc Reset; chọn cả ngày bắt đầu/kết thúc theo giờ địa phương. Calendar dùng một tháng trên mobile, hai tháng trên desktop, theo theme hiện có. Usage đặt nút Apply/Reset cạnh ô khoảng ngày ở desktop và xuống hàng ở mobile.

Đã chạy probe ở 375px và 1280px: sửa lỗi import cn mà probe phát hiện. Lần chạy lại được chuyển về Login vì browser probe không có phiên admin; chưa xác minh hình ảnh của Usage/Audit sau đăng nhập. Không chạy build/lint/typecheck.

## Audit activity display

Audit dùng danh sách hoạt động nhóm theo ngày địa phương, nhãn action dễ đọc và badge chuyển trạng thái trước/sau. Details giữ nguyên action code, actor/resource/project/request/event ID, timestamp và JSON của backend.

Tên actor/user được đối chiếu từ phiên hiện tại và trang đầu GET /users (tối đa 100 tài khoản); tên project lấy từ trang đầu GET /projects (tối đa 100, gồm archived). Lookup chỉ bật khi trang audit có tham chiếu tương ứng. Tên là tên hiện tại, không phải bản chụp tại thời điểm sự kiện. ID ngoài tập lookup vẫn hiển thị nhãn loại đối tượng cùng ID rút gọn; ID đầy đủ luôn có trong Details. Danh sách audit vẫn dùng bộ lọc và phân trang backend như trước.

Probe Audit ở 375px/1280px tiếp tục chuyển về Login do không có phiên admin. Ảnh probe không phải ảnh UI Audit; chưa xác minh trực quan danh sách và dialog trong phiên đăng nhập. Không chạy build/lint/typecheck.

## Toolbar and readable event details

Bỏ Project ID khỏi toolbar. Activity là Select với nhãn tiếng Anh cho các action backend, bổ sung action chưa biết từ trang kết quả hiện tại. Apply gửi action code, Reset xoá bộ lọc. Giữ DateRangePicker có sẵn. Trên desktop các control nằm cùng hàng, trên mobile xuống hàng.

Mỗi dòng desktop theo thứ tự Performed by → Affected resource → Activity/change → Time/Details. Nội dung hành động có nhiều chiều ngang hơn. Details mặc định hiển thị câu mô tả, tên/email người thực hiện và đối tượng, thời gian địa phương, thay đổi trước/sau. ID, action code và JSON chỉ hiện khi mở Technical details.

Đã xác minh trên phiên admin thật ở 375px, 768px và 1280px, cả light và dark chọn bằng control theme của app. Không có cuộn ngang toàn trang hay lỗi JavaScript; Details mở/đóng bằng Escape và dữ liệu kỹ thuật ẩn mặc định, mở được khi cần. Lọc Account status changed trả HTTP 200 và 2 bản ghi; Reset trả về 5 bản ghi. Ảnh danh sách/dialog ở .artifacts/admin-audit-activity/final-*.png. Không chạy build/lint/typecheck.

Probe sau chỉnh sửa không còn lỗi tương phản badge, badge rớt dòng hay nút Details dưới 32px. Các mục còn lại thuộc shell/components có sẵn: light P1-P4 tương phản chữ shortcut/avatar header/sidebar, P5-P6 hover logo/account; dark P1-P3 hover Refresh/Select/DateRangePicker. Các mục này giữ nguyên theo phạm vi Audit và design system hiện tại, không sửa component UI chung. Báo cáo tại final-probe-light/report.json và final-probe-dark/report.json trong cùng thư mục artifact.
