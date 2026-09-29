import { cn } from "cn";

import { Badge } from "@/components/ui/badge";

import type { MonitoringMode, PatientRecord } from "./data";
import { usePatientWaveformSeries } from "./use-patient-vital-series";
import { VitalWaveform } from "./vital-waveform";

interface PatientCardProps {
  active: boolean;
  acknowledged: boolean;
  mode?: MonitoringMode;
  onSelect: (id: string) => void;
  patient: PatientRecord;
}

export function PatientCard({ active, acknowledged, mode = "patient", onSelect, patient }: PatientCardProps) {
  const isLogs = mode === "logs";
  const logMetrics = patient.logMetrics;
  const hasActiveAlarm = patient.status === "alarm" && !acknowledged;
  const waveformSeries = usePatientWaveformSeries({ compact: true, kind: "ecg", patient });

  return (
    <button
      aria-label={`Open ${patient.bed}, ${patient.name}`}
      aria-pressed={active}
      className={cn(
        "flex min-h-36 min-w-0 flex-col bg-card p-2 text-left text-card-foreground",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-primary ring-inset",
      )}
      onClick={() => onSelect(patient.id)}
      type="button"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="truncate font-medium text-sm">
          <span className={cn(hasActiveAlarm && "text-amber-500 dark:text-amber-400")}>{patient.bed}</span>{" "}
          {patient.name}
        </div>
        {hasActiveAlarm && (
          <Badge
            className="h-auto shrink-0 rounded-none border-amber-500 text-[10px] text-amber-700 dark:border-amber-400 dark:text-amber-300"
            variant="outline"
          >
            {isLogs ? "Alert" : `HR HIGH ${patient.heartRate}`}
          </Badge>
        )}
      </div>

      <div className="flex w-full flex-1 items-center">
        <VitalWaveform compact kind="ecg" showGrid={false} {...waveformSeries} />
      </div>

      <dl className="mt-auto grid min-w-0 grid-cols-2 divide-x divide-border tabular-nums">
        <div className="min-w-0 pr-2">
          <dt className="text-lime-500 text-xs dark:text-lime-400">{isLogs ? "RUNS" : "HR"}</dt>
          <dd
            className={cn(
              "min-w-0 whitespace-nowrap text-right font-medium text-lime-500 leading-none dark:text-lime-400",
              isLogs ? "text-xl" : "text-3xl",
              hasActiveAlarm && "text-amber-500 dark:text-amber-400",
            )}
          >
            {isLogs ? logMetrics?.requestRate : patient.heartRate}
          </dd>
        </div>
        <div className="min-w-0 pl-2">
          <dt className="text-cyan-500 text-xs dark:text-cyan-400">{isLogs ? "ERR" : "SpO₂"}</dt>
          <dd
            className={cn(
              "min-w-0 whitespace-nowrap text-right font-medium text-cyan-500 leading-none dark:text-cyan-400",
              isLogs ? "text-xl" : "text-3xl",
            )}
          >
            {isLogs ? `${logMetrics?.errorRate}%` : patient.spo2}
          </dd>
        </div>
      </dl>
    </button>
  );
}
