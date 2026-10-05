import { collectPages } from "../infinite-pagination";
import { fetchArtifacts, type RunArtifactItem } from "./fetch-artifacts";
import { type CommentItem, fetchComments } from "./fetch-comments";
import { fetchRuns } from "./fetch-runs";

export async function fetchReviewWorkspace(projectId: string, withComments: boolean, signal: AbortSignal) {
  const runs = await collectPages((params) => fetchRuns.getList(projectId, params, signal));
  const artifacts: RunArtifactItem[] = [];
  const comments: CommentItem[] = [];
  // Bound fan-out instead of issuing requests for every run at once.
  for (let offset = 0; offset < runs.length; offset += 4) {
    const batch = await Promise.all(
      runs.slice(offset, offset + 4).map(async (run) => {
        const [files, discussion] = await Promise.all([
          fetchArtifacts.getList(projectId, run.id, signal),
          withComments ? collectPages((params) => fetchComments.getList(projectId, run.id, params, signal)) : [],
        ]);
        return { files: files.data, discussion };
      }),
    );
    for (const result of batch) {
      artifacts.push(...result.files);
      comments.push(...result.discussion);
    }
  }
  artifacts.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  comments.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return { runs, artifacts, comments };
}
