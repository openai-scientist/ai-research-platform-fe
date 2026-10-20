"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { Pause, Play } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { MonitoringMode, PatientRecord } from "./data";
import { type LogStreamEvent, logStreamEvents } from "./log-monitoring-data";
import { PatientCard } from "./patient-card";
import { PatientDetail } from "./patient-detail";
import { PatientTrends } from "./patient-trends";

interface PatientMonitoringProps {
  mode?: MonitoringMode;
  patients: PatientRecord[];
}

export function PatientMonitoring({ mode = "patient", patients }: PatientMonitoringProps) {
  const isLogs = mode === "logs";
  const [selectedPatientId, setSelectedPatientId] = useState(isLogs ? "experiment-executor" : "cardiac-04");
  const [acknowledgedPatientIds, setAcknowledgedPatientIds] = useState<string[]>([]);
  const [streamEvents, setStreamEvents] = useState<LogStreamEvent[]>(logStreamEvents);
  const [streamPaused, setStreamPaused] = useState(false);
  const streamCursor = useRef(0);
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];
  const acknowledged = acknowledgedPatientIds.includes(selectedPatient.id);
  const hasActiveAlarm = selectedPatient.status === "alarm" && !acknowledged;
  const selectedLogEvents = streamEvents.filter((event) => event.serviceId === selectedPatient.id).slice(0, 6);
  const selectedEvents = isLogs
    ? selectedLogEvents.map((event) => ({ label: event.message, time: event.time }))
    : selectedPatient.recentEvents;

  useEffect(() => {
    if (!isLogs || streamPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      const template = logStreamEvents[streamCursor.current % logStreamEvents.length];
      streamCursor.current += 1;
      const now = new Date();
      setStreamEvents((current) =>
        [{ ...template, id: `live-${now.getTime()}`, time: now.toTimeString().slice(0, 8) }, ...current].slice(0, 30),
      );
    }, 3500);

    return () => window.clearInterval(interval);
  }, [isLogs, streamPaused]);

  function acknowledgePatient(patientId: string) {
    setAcknowledgedPatientIds((current) => (current.includes(patientId) ? current : [...current, patientId]));
  }

  return (
    <div className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="grid grid-cols-2 content-start *:border-border *:border-r *:border-b *:even:border-r-0">
        {patients.map((patient) => (
          <PatientCard
            acknowledged={acknowledgedPatientIds.includes(patient.id)}
            active={patient.id === selectedPatient.id}
            key={patient.id}
            mode={mode}
            onSelect={setSelectedPatientId}
            patient={patient}
          />
        ))}
      </div>

      <div className="flex min-h-0 min-w-0 flex-col border-border lg:border-l">
        <div className="flex min-h-11 items-center gap-4 bg-muted/50 px-3">
          <div className="flex items-center gap-3 font-medium">
            <Badge className="rounded-none" variant="outline">
              {selectedPatient.bed}
            </Badge>
            <span className="text-lg">{selectedPatient.name}</span>
          </div>
          <div className="text-muted-foreground text-sm">
            {isLogs
              ? `${selectedPatient.logMetrics?.environment ?? "Production"} · ${selectedPatient.diagnosis}`
              : `${selectedPatient.age} ${selectedPatient.sex} · ${selectedPatient.diagnosis}`}
          </div>
        </div>
        <Separator />

        {selectedPatient.alarm && (
          <Alert
            className={cn(
              "min-h-9 rounded-none border-x-0 border-t-0 pr-32",
              hasActiveAlarm
                ? "border-amber-500 bg-amber-400 text-amber-950"
                : "border-border bg-muted text-foreground",
            )}
            variant="default"
          >
            <AlertTitle>{selectedPatient.alarm}</AlertTitle>
            {selectedPatient.alarmDuration && (
              <AlertDescription className={cn(hasActiveAlarm && "text-amber-950")}>
                Active for {selectedPatient.alarmDuration}
              </AlertDescription>
            )}
            <AlertAction className="top-1/2 -translate-y-1/2">
              <Button
                className="rounded-none"
                disabled={acknowledged}
                onClick={() => acknowledgePatient(selectedPatient.id)}
                size="sm"
                variant="secondary"
              >
                {acknowledged ? "Acknowledged" : "Acknowledge"}
              </Button>
            </AlertAction>
          </Alert>
        )}

        <PatientDetail hasActiveAlarm={hasActiveAlarm} mode={mode} patient={selectedPatient} />

        <Tabs className="min-h-0 min-w-0 flex-1 gap-0" defaultValue={isLogs ? "real-time" : "trends"}>
          <TabsList
            className="w-full justify-start gap-0 border-b p-0 *:h-full *:max-w-32 *:rounded-none *:border-0 *:border-border *:border-r *:after:-bottom-px!"
            variant="line"
          >
            <TabsTrigger value="real-time">{isLogs ? "Live stream" : "Real time"}</TabsTrigger>
            <TabsTrigger value="events">Event review</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="disclosure">{isLogs ? "Payload" : "Full disclosure"}</TabsTrigger>
          </TabsList>

          {isLogs ? (
            <TabsContent className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden" value="real-time">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {streamPaused ? "Stream paused" : "Live log stream is active"}
                </div>
                <Button onClick={() => setStreamPaused((paused) => !paused)} size="sm" variant="outline">
                  {streamPaused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
                  {streamPaused ? "Resume" : "Pause"}
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid grid-cols-[4rem_5rem_1fr] bg-muted/40 px-4 py-2 font-medium text-muted-foreground text-xs">
                  <span>Time</span>
                  <span>Level</span>
                  <span>Event</span>
                </div>
                <Separator />
                {selectedLogEvents.map((event, index) => (
                  <Fragment key={event.id}>
                    <div className="grid min-h-11 grid-cols-[4rem_5rem_1fr] items-center gap-2 px-4 py-2 text-sm">
                      <span className="font-mono text-muted-foreground text-xs tabular-nums">{event.time}</span>
                      <span
                        className={cn(
                          "font-mono text-xs",
                          event.level === "ERROR" && "text-destructive",
                          event.level === "WARN" && "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {event.level}
                      </span>
                      <span className="truncate">{event.message}</span>
                    </div>
                    {index < selectedLogEvents.length - 1 && <Separator />}
                  </Fragment>
                ))}
              </div>
            </TabsContent>
          ) : (
            <TabsContent
              className="m-0 flex flex-col items-center justify-center gap-1 px-4 text-center"
              value="real-time"
            >
              <p className="font-medium text-sm">Live monitoring is active</p>
              <p className="text-muted-foreground text-xs">Waveforms and vital signs update continuously above.</p>
            </TabsContent>
          )}
          <TabsContent className={cn("m-0", isLogs && "flex min-h-0 flex-1 flex-col overflow-hidden")} value="events">
            <div className={cn(isLogs && "min-h-0 flex-1 overflow-y-auto", !isLogs && "min-h-44")}>
              <div className="grid grid-cols-[4rem_1fr] bg-muted/40 px-4 py-2 font-medium text-muted-foreground text-xs">
                <span>Time</span>
                <span>Event</span>
              </div>
              <Separator />
              {selectedEvents.map((event, index) => (
                <Fragment key={`${event.time}-${event.label}`}>
                  <div className="grid min-h-11 grid-cols-[4rem_1fr] items-center px-4 py-2 text-sm">
                    <span className="text-muted-foreground tabular-nums">{event.time}</span>
                    <span>{event.label}</span>
                  </div>
                  {index < selectedEvents.length - 1 && <Separator />}
                </Fragment>
              ))}
            </div>
          </TabsContent>
          <TabsContent className="m-0" value="trends">
            <PatientTrends mode={mode} patient={selectedPatient} />
          </TabsContent>
          <TabsContent
            className="m-0 flex flex-col items-center justify-center gap-1 px-4 text-center"
            value="disclosure"
          >
            <p className="font-medium text-sm">
              {isLogs ? "Structured event payload is available" : "Full disclosure recording is active"}
            </p>
            <p className="text-muted-foreground text-xs">
              {isLogs
                ? "Request IDs, actors, providers, and audit metadata are retained for review."
                : "Continuous waveform history is available for the last 24 hours."}
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
