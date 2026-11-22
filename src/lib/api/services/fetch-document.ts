import type { ApiResult } from "@/types/api";

import apiService from "../core";
import { runPath } from "../request";

/** Who changed a sentence after it was written, when, and what it said before. */
export interface SentenceEdit {
  by: "user";
  at: string;
  user_id?: string | null;
  from_text: string;
  from_origin: "model" | "code" | "author" | "user";
}
export interface DocSentence {
  text: string;
  role: string;
  origin: "model" | "code" | "author" | "user";
  check: string;
  statements: string[];
  edited?: SentenceEdit;
}
export interface DocParagraph {
  paragraph_id: string;
  sentences: DocSentence[];
}
export interface DocSection {
  section_id: string;
  heading: string;
  paragraphs: DocParagraph[];
}
export interface DocPaper {
  title: string;
  abstract: string;
  keywords: string[];
  sections: DocSection[];
  back_matter?: DocSection[];
}
export type DocChangeKind =
  | "sentence_edited"
  | "sentence_added"
  | "sentence_removed"
  | "paragraph_added"
  | "paragraph_removed"
  | "paragraph_moved"
  | "section_moved"
  | "heading_edited"
  | "front_edited";
export interface DocChange {
  kind: DocChangeKind;
  where: string;
  note?: string;
}
export interface DocVersionItem {
  n: number;
  base_n: number;
  restored_from: number | null;
  changes: DocChange[];
  user_id: string | null;
  created_at: string;
}
export interface DocVersion extends DocVersionItem {
  paper: DocPaper;
}
/** A rule a section breaks, as the writing engine's check finds it. */
export interface DocCheckRow {
  rule: string;
  kind: "H" | "M";
  locator: string;
  note: string;
  book_ref?: string;
}
/** What the paper's order breaks once a section or paragraph was moved, in the section where it breaks. */
export interface DocOrderRow extends DocCheckRow {
  section_id: string;
}
export interface DocCheck {
  sections: { section_id: string; rows: DocCheckRow[] }[];
  order?: DocOrderRow[];
}
/** What to check: the sections a change touched; and, once the order changed, the whole body in its order and every
 * section's id where it stands, those not written yet included. */
export interface DocCheckIn {
  sections: DocSection[];
  paper?: DocSection[];
  order?: string[];
}

const documentPath = (projectId: string, runId: string) => `${runPath(projectId, runId)}/document`;

export const fetchDocument = {
  /** The paper as last saved, or null while it is as the engine wrote it. */
  latest: async (projectId: string, runId: string): Promise<ApiResult<DocVersion | null>> =>
    (await apiService.get<ApiResult<DocVersion | null>>(documentPath(projectId, runId))).data,
  versions: async (projectId: string, runId: string): Promise<ApiResult<DocVersionItem[]>> =>
    (await apiService.get<ApiResult<DocVersionItem[]>>(`${documentPath(projectId, runId)}/versions`)).data,
  save: async (
    projectId: string,
    runId: string,
    body: { base_n: number; paper: DocPaper; changes: DocChange[] },
  ): Promise<ApiResult<DocVersion>> =>
    (await apiService.post<ApiResult<DocVersion>>(`${documentPath(projectId, runId)}/versions`, body)).data,
  restore: async (projectId: string, runId: string, n: number): Promise<ApiResult<DocVersion>> =>
    (await apiService.post<ApiResult<DocVersion>>(`${documentPath(projectId, runId)}/versions/${n}/restore`, {})).data,
  /** Texts as the printed paper sets them, and the line the draft opens with. */
  print: async (
    projectId: string,
    runId: string,
    texts: string[],
  ): Promise<ApiResult<{ texts: string[]; banner: string | null }>> =>
    (
      await apiService.post<ApiResult<{ texts: string[]; banner: string | null }>>(
        `${documentPath(projectId, runId)}/print`,
        { texts },
      )
    ).data,
  check: async (projectId: string, runId: string, body: DocCheckIn): Promise<ApiResult<DocCheck>> =>
    (await apiService.post<ApiResult<DocCheck>>(`${documentPath(projectId, runId)}/check`, body)).data,
};
