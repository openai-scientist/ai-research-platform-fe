# Infinite scroll cho Platform API

Setup theo `useInfinityScroll` và `useInfiniteProjects/useInfiniteUsers` của `E:\TVu\git-repo\research-hub-client`. Theo lựa chọn của người dùng, chỉ bổ sung hooks để UI dùng lại sau.

## Cấu trúc

- `src/hooks/use-infinity-scroll.ts`: `useInfinityScroll`, kiểu options/filter và scroll handler.
- `src/lib/api/infinite-pagination.ts`: chuẩn hoá phân trang, `InfinitePageResult` và `flattenInfinitePages`.
- `src/hooks/use-api.ts`: retry và toast lỗi dùng chung cho query thường/infinite.
- Các file `use-*-query.ts`: hooks infinite theo nghiệp vụ, dùng lại service API hiện có.

Hook chạy trong Client Component bên trong `QueryProvider`. Query bảo vệ cần truyền `enabled` sau khi xác nhận session/quyền truy cập.

## Hooks có sẵn

| Hook | File | Dữ liệu đã nối trang |
|---|---|---|
| `useInfiniteProjects(filters?, options?)` | `use-projects-query.ts` | `projects` |
| `useInfiniteUsers(filters?, options?)` | `use-admin-query.ts` | `users` |
| `useInfiniteAudit(filters?, options?)` | `use-admin-query.ts` | `audit` |
| `useInfiniteProjectUsage(filters?, options?)` | `use-admin-query.ts` | `usage` |
| `useInfiniteMembers(projectId, options?)` | `use-members-query.ts` | `members` |
| `useInfiniteDatasets(projectId, options?)` | `use-datasets-query.ts` | `datasets` |
| `useInfiniteDatasetVersions(projectId, datasetId, options?)` | `use-datasets-query.ts` | `versions` |
| `useInfiniteRuns(projectId, options?)` | `use-runs-query.ts` | `runs` |
| `useInfiniteComments(projectId, runId, filters?, options?)` | `use-comments-query.ts` | `comments` |
| `useInfiniteNotifications(filters?, options?)` | `use-notifications-query.ts` | `notifications` |

Tất cả hooks cũng trả `items`, `totalItems`, `loadMore()`, `onScrollToLoadMore` và các trạng thái React Query: `isPending`, `isFetching`, `isFetchingNextPage`, `isFetchNextPageError`, `hasNextPage`, `error`, `refetch`.

Notification đang tạm hoãn: hook notification luôn `enabled: false`, không polling. Các hook nhận ID tự tắt khi thiếu ID.

## Ví dụ gắn vào UI

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { useInfiniteUsers } from "@/hooks/use-admin-query";

export function UsersList({ enabled, email }: { enabled: boolean; email?: string }) {
  const query = useInfiniteUsers({ email }, { enabled, pageSize: 20 });

  return (
    <div className="flex flex-col gap-3">
      <div
        className="max-h-96 overflow-y-auto"
        onScroll={query.onScrollToLoadMore}
        aria-label="Users"
        tabIndex={0}
      >
        <ul className="flex flex-col gap-2">
          {query.users.map((user) => (
            <li key={user.id}>{user.display_name ?? user.email}</li>
          ))}
        </ul>
      </div>
      {query.isPending && enabled ? <p role="status">Loading users...</p> : null}
      <p aria-live="polite">
        {query.users.length} loaded{query.totalItems !== null ? ` of ${query.totalItems}` : ""}
      </p>
      {query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={!enabled || query.isFetching}
          onClick={() => { void query.loadMore(); }}
        >
          {query.isFetchingNextPage ? "Loading more..." : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
```

Container phải có chiều cao giới hạn và `overflow-y-auto` để phát sự kiện scroll. `onScrollToLoadMore` theo dõi container được gắn, không tự theo dõi cuộn của cửa sổ. Nút **Load more** hỗ trợ bàn phím, danh sách chưa đủ dài để cuộn và retry sau lỗi tải trang tiếp theo. UI thực tế cần thêm empty/loading states theo thiết kế màn hình; lỗi được báo qua Sonner, không render inline.

## Quy tắc phân trang và cache

- Backend nhận `limit/offset`, bắt đầu `offset = 0`; không gửi `pageNumber/pageSize` của repo tham khảo.
- Đặt kích thước trang ở `options.pageSize`, mặc định 20; giá trị được chuẩn hoá thành số nguyên 1–100. Không đặt `limit/offset` trong filters.
- Hook lấy `offset/limit/total` từ `response.meta.pagination` để tính trang tiếp theo. Trang rỗng, thiếu pagination hoặc offset không tiến thì dừng. `totalItems = null` nghĩa là backend không cung cấp tổng số.
- Trang gốc được giữ tại `query.data.pages[index].response`, bao gồm `message`, `meta.request_id` và `meta.pagination`.
- Cache key gồm key nghiệp vụ, `"infinite"`, filters và page size. Đổi filters/page size tạo query riêng bắt đầu từ offset 0. Query thường và infinite không dùng chung data shape; các prefix invalidation nghiệp vụ hiện có vẫn áp dụng.
- `AbortSignal` được truyền tới service/Axios để huỷ request không còn cần thiết.
- Scroll chỉ tải tiếp khi còn trang và không có request đang chạy. Sự kiện cuộn liên tiếp được chặn bằng ref và `cancelRefetch: false`.
- Khi tải trang tiếp theo thất bại, scroll không tự lặp retry; gọi `loadMore()` để thử lại có chủ đích. Dữ liệu các trang đã tải vẫn nằm trong cache. Query không tự retry lỗi HTTP 4xx, bao gồm rate limit.
- Không gắn cả `useUsersQuery` và `useInfiniteUsers` cho cùng danh sách nếu chỉ cần một cách tải.

Mẫu xử lý dựa trên [TanStack Query Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries), với envelope/session của backend hiện tại.

## Kiểm tra

`npm test` bao phủ chuyển trang, dừng tải, chuẩn hoá page size, cache/filter reset, invalidation, chống fetch trùng và retry chủ đích. Các kiểm tra hook dùng React server renderer để chạy hook với query mock; một số case dùng `InfiniteQueryObserver/QueryClient` thật để kiểm tra nối trang và cache. Đây không phải kiểm thử cuộn trên trình duyệt hay proof dữ liệu toàn bộ API live.
