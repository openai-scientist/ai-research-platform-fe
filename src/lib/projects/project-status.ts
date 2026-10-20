import { ProjectStatus } from "@/types/enums";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.Draft]: "Draft",
  [ProjectStatus.DataReady]: "Data Ready",
  [ProjectStatus.Researching]: "Researching",
  [ProjectStatus.NeedsReview]: "Needs Review",
  [ProjectStatus.Completed]: "Completed",
  [ProjectStatus.Archived]: "Archived",
};
