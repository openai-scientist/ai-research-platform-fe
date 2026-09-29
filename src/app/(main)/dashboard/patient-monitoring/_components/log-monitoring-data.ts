import type { PatientRecord } from "./data";

export type LogServiceStatus = "healthy" | "warning" | "critical";
export type LogLevel = "DEBUG" | "ERROR" | "INFO" | "WARN";

export interface LogEvent {
  label: string;
  time: string;
}

export interface LogStreamEvent {
  duration: string;
  id: string;
  level: LogLevel;
  message: string;
  requestId: string;
  serviceId: string;
  status: string;
  time: string;
}

export interface LogService {
  category: string;
  code: string;
  cpu: number;
  environment: string;
  errorRate: number;
  id: string;
  latency: number;
  memory: number;
  name: string;
  queueDepth: number;
  recentEvents: LogEvent[];
  requestRate: number;
  status: LogServiceStatus;
  alert?: string;
  alertDuration?: string;
}

export const logServices: LogService[] = [
  {
    category: "Agent runs",
    code: "AGT-01",
    cpu: 42,
    environment: "Production",
    errorRate: 0.18,
    id: "agent-runtime",
    latency: 142,
    memory: 61,
    name: "Runtime",
    queueDepth: 6,
    recentEvents: [
      { label: "Run EXP-2048 completed", time: "14:26" },
      { label: "Finding draft persisted", time: "14:21" },
      { label: "Agent health check passed", time: "14:18" },
    ],
    requestRate: 128,
    status: "healthy",
  },
  {
    alert: "RUN QUEUE HIGH 42  > 30 pending runs",
    alertDuration: "03:12",
    category: "Experiment execution",
    code: "EXP-02",
    cpu: 76,
    environment: "Production",
    errorRate: 1.2,
    id: "experiment-executor",
    latency: 842,
    memory: 68,
    name: "Runner",
    queueDepth: 42,
    recentEvents: [
      { label: "Experiment EXP-2048 completed", time: "14:25" },
      { label: "Worker pool scaled to 4", time: "14:23" },
      { label: "Run queue threshold exceeded", time: "14:22" },
    ],
    requestRate: 34,
    status: "warning",
  },
  {
    alert: "PROVIDER FALLBACK ACTIVE",
    alertDuration: "01:34",
    category: "Decision audit",
    code: "DEC-03",
    cpu: 58,
    environment: "Production",
    errorRate: 0.34,
    id: "decision-gate",
    latency: 216,
    memory: 49,
    name: "Gate",
    queueDepth: 12,
    recentEvents: [
      { label: "Evidence sufficiency gate evaluated", time: "14:24" },
      { label: "Provider fallback evaluation completed", time: "14:19" },
      { label: "Decision audit appended", time: "14:15" },
    ],
    requestRate: 52,
    status: "warning",
  },
  {
    category: "Dataset versions",
    code: "DATA-04",
    cpu: 27,
    environment: "Production",
    errorRate: 0.08,
    id: "dataset-profiler",
    latency: 96,
    memory: 44,
    name: "Dataset",
    queueDepth: 4,
    recentEvents: [
      { label: "Dataset version DS-014 validated", time: "14:26" },
      { label: "Provenance metadata attached", time: "14:20" },
      { label: "Schema and quality checks passed", time: "14:12" },
    ],
    requestRate: 18,
    status: "healthy",
  },
  {
    alert: "PROVIDER RETRY RATE HIGH",
    alertDuration: "02:08",
    category: "Models and providers",
    code: "PROV-05",
    cpu: 51,
    environment: "Production",
    errorRate: 1.8,
    id: "provider-router",
    latency: 318,
    memory: 63,
    name: "Router",
    queueDepth: 8,
    recentEvents: [
      { label: "Model provider fallback selected", time: "14:20" },
      { label: "Retry #1 recorded for tool action", time: "14:17" },
      { label: "Token budget check passed", time: "14:08" },
    ],
    requestRate: 21,
    status: "warning",
  },
  {
    alert: "TRACE ERRORS HIGH 2.4  > 1.0%",
    alertDuration: "01:48",
    category: "Execution trace",
    code: "TRACE-06",
    cpu: 69,
    environment: "Staging",
    errorRate: 2.4,
    id: "trace-collector",
    latency: 1200,
    memory: 72,
    name: "Trace",
    queueDepth: 19,
    recentEvents: [
      { label: "Tool retry limit reached for EXP-2048", time: "14:25" },
      { label: "Execution step 7 appended", time: "14:23" },
      { label: "Sandbox timeout recorded", time: "14:22" },
    ],
    requestRate: 9,
    status: "warning",
  },
  {
    category: "Audit and compliance",
    code: "AUD-07",
    cpu: 38,
    environment: "Production",
    errorRate: 0.06,
    id: "audit-log",
    latency: 88,
    memory: 52,
    name: "Audit",
    queueDepth: 3,
    recentEvents: [
      { label: "Privileged action signed", time: "14:26" },
      { label: "Audit record appended", time: "14:24" },
      { label: "Retention policy applied", time: "14:00" },
    ],
    requestRate: 184,
    status: "healthy",
  },
  {
    category: "Usage and cost",
    code: "COST-08",
    cpu: 33,
    environment: "Production",
    errorRate: 0.08,
    id: "cost-meter",
    latency: 174,
    memory: 47,
    name: "Cost",
    queueDepth: 6,
    recentEvents: [
      { label: "Run token usage recorded", time: "14:26" },
      { label: "Project cost estimate refreshed", time: "14:16" },
      { label: "Budget threshold check passed", time: "14:02" },
    ],
    requestRate: 16,
    status: "healthy",
  },
];

export const logStreamEvents: LogStreamEvent[] = [
  {
    duration: "142ms",
    id: "evt-001",
    level: "INFO",
    message: "Agent run EXP-2048 accepted for execution",
    requestId: "req_8f12a",
    serviceId: "agent-runtime",
    status: "Completed",
    time: "14:26:18",
  },
  {
    duration: "842ms",
    id: "evt-002",
    level: "WARN",
    message: "Run queue crossed the configured threshold",
    requestId: "run_2048",
    serviceId: "experiment-executor",
    status: "Investigating",
    time: "14:26:14",
  },
  {
    duration: "88ms",
    id: "evt-003",
    level: "INFO",
    message: "Execution trace batch persisted to archive",
    requestId: "batch_7cd21",
    serviceId: "trace-collector",
    status: "Completed",
    time: "14:26:09",
  },
  {
    duration: "1.2s",
    id: "evt-004",
    level: "ERROR",
    message: "Tool retry limit reached for run EXP-2048",
    requestId: "run_2048",
    serviceId: "trace-collector",
    status: "Failed",
    time: "14:25:57",
  },
  {
    duration: "216ms",
    id: "evt-005",
    level: "INFO",
    message: "Evidence sufficiency gate evaluated with provider fallback",
    requestId: "dec_4a91c",
    serviceId: "decision-gate",
    status: "Completed",
    time: "14:25:41",
  },
  {
    duration: "96ms",
    id: "evt-006",
    level: "DEBUG",
    message: "Privileged decision review recorded for REVIEWER",
    requestId: "audit_3d80b",
    serviceId: "audit-log",
    status: "Completed",
    time: "14:25:23",
  },
  {
    duration: "318ms",
    id: "evt-007",
    level: "INFO",
    message: "Dataset version DS-014 validation completed",
    requestId: "ds_16f2e",
    serviceId: "dataset-profiler",
    status: "Completed",
    time: "14:25:05",
  },
  {
    duration: "910ms",
    id: "evt-008",
    level: "WARN",
    message: "Worker capacity is below the target experiment pool size",
    requestId: "pool_0e781",
    serviceId: "experiment-executor",
    status: "Investigating",
    time: "14:24:52",
  },
  {
    duration: "174ms",
    id: "evt-009",
    level: "INFO",
    message: "Audit event signed and forwarded to retention store",
    requestId: "audit_b37ca",
    serviceId: "audit-log",
    status: "Completed",
    time: "14:24:31",
  },
  {
    duration: "76ms",
    id: "evt-010",
    level: "DEBUG",
    message: "Model provider health probe passed",
    requestId: "probe_228d1",
    serviceId: "provider-router",
    status: "Completed",
    time: "14:24:12",
  },
];

export const logMonitoringRecords: PatientRecord[] = logServices.map((service, index) => ({
  age: 0,
  alarm: service.alert,
  alarmDuration: service.alertDuration,
  arterialMap: Math.min(service.latency, 140),
  arterialPressure: `${Math.min(service.latency, 140)}/${Math.max(service.latency - 24, 40)}`,
  bed: service.code,
  diagnosis: service.category,
  heartRate: 68 + index * 4,
  id: service.id,
  logMetrics: {
    cpu: service.cpu,
    environment: service.environment,
    errorRate: service.errorRate,
    latency: service.latency,
    memory: service.memory,
    queueDepth: service.queueDepth,
    requestRate: service.requestRate,
  },
  map: Math.min(service.latency, 140),
  name: service.name,
  nibp: `${Math.min(service.latency, 140)}/${Math.max(service.latency - 24, 40)}`,
  recentEvents: service.recentEvents,
  respirationRate: Math.max(service.queueDepth, 8),
  sex: "M",
  signalProfile: {
    amplitude: 0.88 + (index % 3) * 0.05,
    phase: index * 0.12,
    rhythm: service.status === "healthy" ? "sinus" : "sinus-tachycardia",
  },
  spo2: Math.max(92, 100 - Math.round(service.errorRate * 2)),
  status: service.status === "healthy" ? "stable" : "alarm",
  temperature: "—",
}));
