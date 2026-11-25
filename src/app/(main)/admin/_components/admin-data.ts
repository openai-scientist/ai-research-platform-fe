export const overviewUsage = [
  { label: "Mon", value: 46_000 },
  { label: "Tue", value: 58_000 },
  { label: "Wed", value: 72_000 },
  { label: "Thu", value: 64_000 },
  { label: "Fri", value: 88_000 },
  { label: "Sat", value: 39_000 },
  { label: "Sun", value: 52_000 },
] as const;

export const platformServices = [
  { name: "Backend API", detail: "99.98% uptime · 142ms latency", status: "Healthy" as const },
  { name: "Database", detail: "Primary cluster · 18 connections", status: "Healthy" as const },
  { name: "Storage", detail: "62% used · 4.8 TB available", status: "Healthy" as const },
  { name: "LLM Provider", detail: "OpenAI · 1.8% error rate", status: "Degraded" as const },
  { name: "Decision Provider", detail: "TypeSafe / Jev · primary", status: "Healthy" as const },
  { name: "Secure Sandbox", detail: "3 active · 1 queued", status: "Healthy" as const },
  { name: "Queue / Worker", detail: "12 jobs waiting · 4 workers", status: "Healthy" as const },
] as const;

export const recentActivity = [
  { actor: "Maya Chen", event: "created project", target: "Protein Folding Study", time: "4 min ago" },
  { actor: "Noah Williams", event: "uploaded dataset", target: "clinical-trial-v4.csv", time: "18 min ago" },
  { actor: "Research Agent", event: "completed experiment", target: "EXP-2048", time: "32 min ago" },
  { actor: "Finding Agent", event: "generated finding", target: "FND-881", time: "46 min ago" },
  { actor: "Ava Patel", event: "updated role", target: "RESEARCHER → REVIEWER", time: "1 hr ago" },
] as const;

export const recentAlerts = [
  { title: "Provider latency exceeded threshold", detail: "OpenAI · p95 reached 2.4s", severity: "Warning" as const },
  {
    title: "Decision provider fallback triggered",
    detail: "3 fallback decisions in the last hour",
    severity: "Info" as const,
  },
  {
    title: "Token usage threshold reached",
    detail: "Project Helix is at 82% of its monthly budget",
    severity: "Warning" as const,
  },
] as const;

export const users = [
  {
    name: "System Administrator",
    email: "admin@gmail.com",
    role: "SYSTEM_ADMIN",
    projects: 12,
    tokens: "6.8M",
    cost: "$294.20",
    lastActive: "just now",
    status: "Active" as const,
  },
  {
    name: "Project Manager",
    email: "manager@gmail.com",
    role: "PROJECT_MANAGER",
    projects: 8,
    tokens: "4.2M",
    cost: "$184.20",
    lastActive: "2 min ago",
    status: "Active" as const,
  },
  {
    name: "Researcher",
    email: "researcher@gmail.com",
    role: "RESEARCHER",
    projects: 5,
    tokens: "2.8M",
    cost: "$126.40",
    lastActive: "18 min ago",
    status: "Active" as const,
  },
  {
    name: "Reviewer",
    email: "reviewer@gmail.com",
    role: "REVIEWER",
    projects: 12,
    tokens: "680K",
    cost: "$31.70",
    lastActive: "1 hr ago",
    status: "Active" as const,
  },
] as const;

export const systemServices = [
  { name: "Backend API", metric: "142ms", detail: "p95 latency", status: "Healthy" as const },
  { name: "Database", metric: "18", detail: "active connections", status: "Healthy" as const },
  { name: "Storage", metric: "62%", detail: "capacity used", status: "Healthy" as const },
  { name: "LLM Provider", metric: "1.8%", detail: "error rate", status: "Degraded" as const },
  { name: "Decision Provider", metric: "98.9%", detail: "availability", status: "Healthy" as const },
  { name: "Secure Sandbox", metric: "3", detail: "active sandboxes", status: "Healthy" as const },
  { name: "Queue / Worker", metric: "12", detail: "queued jobs", status: "Healthy" as const },
] as const;

export const logs = [
  {
    timestamp: "2026-09-21 14:22:18",
    level: "INFO",
    user: "Maya Chen",
    project: "Protein Folding Study",
    component: "Experiment Runner",
    event: "Experiment completed",
    status: "Completed",
    duration: "8m 42s",
  },
  {
    timestamp: "2026-09-21 14:19:44",
    level: "WARNING",
    user: "System",
    project: "Clinical Trial Signals",
    component: "OpenAI Provider",
    event: "Provider latency threshold exceeded",
    status: "Investigating",
    duration: "2.4s",
  },
  {
    timestamp: "2026-09-21 14:12:09",
    level: "INFO",
    user: "Noah Williams",
    project: "Climate Risk Model",
    component: "Dataset Service",
    event: "Dataset uploaded",
    status: "Completed",
    duration: "24s",
  },
  {
    timestamp: "2026-09-21 13:58:31",
    level: "ERROR",
    user: "Research Agent",
    project: "Materials Discovery",
    component: "Secure Sandbox",
    event: "Execution timed out",
    status: "Failed",
    duration: "15m 00s",
  },
  {
    timestamp: "2026-09-21 13:42:55",
    level: "INFO",
    user: "Ava Patel",
    project: "Clinical Trial Signals",
    component: "Decision Provider",
    event: "Evidence sufficiency reviewed",
    status: "Completed",
    duration: "1.2s",
  },
] as const;
