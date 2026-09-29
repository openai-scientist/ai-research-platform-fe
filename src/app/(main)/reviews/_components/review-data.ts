export type ReviewPriority = "High" | "Medium" | "Low";

export type ReviewItem = {
  id: string;
  title: string;
  projectName: string;
  submittedBy: string;
  submittedAt: string;
  dueIn: string;
  priority: ReviewPriority;
};

export const reviewQueue: ReviewItem[] = [
  {
    id: "FND-881",
    title: "Folding confidence drops for sequences above 600 residues",
    projectName: "Protein Folding Study",
    submittedBy: "Researcher",
    submittedAt: "1 hr ago",
    dueIn: "Today",
    priority: "High",
  },
  {
    id: "FND-874",
    title: "Hepatic adverse events cluster in cohort B after week 6",
    projectName: "Clinical Trial Signals",
    submittedBy: "Maya Chen",
    submittedAt: "3 hr ago",
    dueIn: "Today",
    priority: "High",
  },
  {
    id: "FND-869",
    title: "Coastal flood exposure underestimated in 2050 SSP2 scenario",
    projectName: "Climate Risk Model",
    submittedBy: "Noah Williams",
    submittedAt: "Yesterday",
    dueIn: "2 days",
    priority: "Medium",
  },
  {
    id: "FND-852",
    title: "Hybrid retriever improves citation recall by 11%",
    projectName: "Retrieval Quality",
    submittedBy: "Researcher",
    submittedAt: "2 days ago",
    dueIn: "4 days",
    priority: "Low",
  },
];

export const reviewStats = {
  pending: reviewQueue.length,
  dueToday: reviewQueue.filter((item) => item.dueIn === "Today").length,
  completedThisWeek: 9,
};
