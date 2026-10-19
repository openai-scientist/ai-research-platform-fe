// Fixtures for the Workspace settings preview. These are not API responses.
export const SAMPLE_USAGE = [
  { model: "GPT-4.1", runs: 18, tokens: "8.4M", cost: 156.4 },
  { model: "GPT-4.1 mini", runs: 32, tokens: "21.6M", cost: 62.1 },
  { model: "o4-mini", runs: 7, tokens: "3.2M", cost: 28.3 },
];

export const SAMPLE_NOTIFICATION_EVENTS = [
  { id: "review", label: "Review requests", description: "A research run needs a decision.", email: true },
  { id: "finished", label: "Run results", description: "A run completes, fails or reaches its budget.", email: false },
  {
    id: "comments",
    label: "Comments & mentions",
    description: "Someone starts a discussion or mentions you.",
    email: true,
  },
  { id: "members", label: "Member updates", description: "Someone joins or their project role changes.", email: false },
  {
    id: "budget",
    label: "Spending alerts",
    description: "Project spending reaches the warning threshold.",
    email: true,
  },
  {
    id: "integrations",
    label: "Integration issues",
    description: "A connected channel cannot receive updates.",
    email: true,
  },
];

export const SAMPLE_ACTIVITY = [
  {
    id: "1",
    day: "Today",
    time: "14:32",
    actor: "Alex Morgan",
    initials: "AM",
    action: "completed a research run",
    subject: "Customer churn prediction",
    category: "Research",
  },
  {
    id: "2",
    day: "Today",
    time: "13:48",
    actor: "Jordan Lee",
    initials: "JL",
    action: "requested a review",
    subject: "Baseline model evaluation",
    category: "Research",
  },
  {
    id: "3",
    day: "Today",
    time: "11:20",
    actor: "Alex Morgan",
    initials: "AM",
    action: "uploaded a dataset",
    subject: "customer-survey.csv · 2.4 MB",
    category: "Data",
  },
  {
    id: "4",
    day: "Today",
    time: "10:05",
    actor: "Sam Chen",
    initials: "SC",
    action: "joined the project",
    subject: "Researcher",
    category: "Members",
  },
  {
    id: "5",
    day: "Yesterday",
    time: "16:42",
    actor: "Alex Morgan",
    initials: "AM",
    action: "connected a channel",
    subject: "Slack · Research updates",
    category: "Settings",
  },
  {
    id: "6",
    day: "Yesterday",
    time: "15:10",
    actor: "Jordan Lee",
    initials: "JL",
    action: "added a comment",
    subject: "Feature selection experiment",
    category: "Research",
  },
  {
    id: "7",
    day: "Yesterday",
    time: "09:30",
    actor: "Alex Morgan",
    initials: "AM",
    action: "updated the monthly budget",
    subject: "$400 → $500",
    category: "Settings",
  },
];

export const previewMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
