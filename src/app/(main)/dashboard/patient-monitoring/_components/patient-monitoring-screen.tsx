import { format } from "date-fns";
import { Activity, Download, Network, Pause, Printer, ShieldCheck, Volume2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { patients } from "./data";
import { logMonitoringRecords } from "./log-monitoring-data";
import { PatientMonitoring } from "./patient-monitoring";

interface PatientMonitoringScreenProps {
  mode?: "logs" | "patient";
  title?: string;
}

export function PatientMonitoringScreen({ mode = "patient", title }: PatientMonitoringScreenProps) {
  const now = new Date();
  const isLogs = mode === "logs";

  return (
    <div
      className="flex min-h-[calc(100svh-var(--dashboard-header-height))] min-w-0 flex-col"
      data-content-padding="false"
    >
      <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-2 py-2 text-sm lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:py-0">
        <div className="truncate lg:overflow-visible">
          {title ?? (isLogs ? "RESEARCHLAB AI LOG MONITORING" : "CENTRAL PATIENT MONITORING")}
        </div>
        <div className="whitespace-nowrap">
          {isLogs ? `${logMonitoringRecords.length} Services` : `${patients.length} Patients`}
        </div>
        <div className="col-span-2 flex items-center justify-between gap-5 text-muted-foreground lg:col-span-1 lg:justify-end">
          <span className="whitespace-nowrap tabular-nums">
            {format(now, "dd MMM yyyy")}&nbsp;&nbsp;{format(now, "HH:mm:ss")}
          </span>
          {isLogs ? (
            <>
              <Tooltip>
                <TooltipTrigger aria-label="Log stream connected" className="inline-flex" type="button">
                  <Activity aria-hidden="true" className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Log stream connected</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger aria-label="Audit pipeline secured" className="inline-flex" type="button">
                  <ShieldCheck aria-hidden="true" className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Audit pipeline secured</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger aria-label="Alarm audio enabled" className="inline-flex" type="button">
                  <Volume2 aria-hidden="true" className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Alarm audio enabled</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger aria-label="Monitoring network connected" className="inline-flex" type="button">
                  <Network aria-hidden="true" className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Monitoring network connected</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
      <Separator />

      {isLogs ? (
        <PatientMonitoring mode="logs" patients={logMonitoringRecords} />
      ) : (
        <PatientMonitoring patients={patients} />
      )}

      <Separator />
      <footer className="flex flex-wrap gap-2 p-2 *:data-[slot=button]:h-11 *:data-[slot=button]:min-w-32 *:data-[slot=button]:flex-1 *:data-[slot=button]:rounded-none">
        {isLogs ? (
          <>
            <Button variant="outline">Overview</Button>
            <Button variant="outline">Run history</Button>
            <Button variant="outline">Decision audit</Button>
            <Button variant="outline">Trace review</Button>
            <Button variant="outline">Trends</Button>
            <Button variant="outline">
              <Download data-icon="inline-start" />
              Export
            </Button>
            <Button variant="outline">
              <Pause data-icon="inline-start" />
              Pause
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline">Main screen</Button>
            <Button variant="outline">Patient setup</Button>
            <Button variant="outline">Alarm review</Button>
            <Button variant="outline">Wave review</Button>
            <Button variant="outline">Trends</Button>
            <Button variant="outline">
              <Printer data-icon="inline-start" />
              Print
            </Button>
            <Button variant="outline">
              <Volume2 data-icon="inline-start" />
              Silence
            </Button>
          </>
        )}
        <Badge className="h-11 min-w-44 flex-1 rounded-none text-muted-foreground" variant="outline">
          {isLogs ? "Telemetry pipeline connected" : "Device C04 connected"}
        </Badge>
      </footer>
    </div>
  );
}
