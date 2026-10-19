"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { previewMoney, SAMPLE_USAGE } from "./workspace-preview-data";

export function WorkspaceSpendingPreview() {
  const spent = SAMPLE_USAGE.reduce((sum, model) => sum + model.cost, 0);
  const runs = SAMPLE_USAGE.reduce((sum, model) => sum + model.runs, 0);
  const budget = 500;

  return (
    <section aria-label="Sample spending overview" className="flex min-w-0 flex-col gap-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-lg">Usage overview</h2>
          <p className="text-muted-foreground text-sm">October 1–31, 2026 · Sample usage in USD</p>
        </div>
        <Badge variant="outline">Preview · Sample data</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Spent this month", value: previewMoney(spent), hint: `Across ${runs} research runs` },
          { label: "Budget remaining", value: previewMoney(budget - spent), hint: "Of a $500.00 sample budget" },
          { label: "Average per run", value: previewMoney(spent / runs), hint: "Across 3 AI models" },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle>
                <span className="text-2xl tabular-nums">{metric.value}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Monthly budget</CardTitle>
            <Badge variant="secondary">Within budget</Badge>
          </div>
          <CardDescription>
            {previewMoney(spent)} of {previewMoney(budget)} used
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Progress value={(spent / budget) * 100} aria-label="Sample monthly budget used" />
          <div className="flex flex-wrap justify-between gap-2 text-muted-foreground text-xs">
            <span>{((spent / budget) * 100).toFixed(1)}% used</span>
            <span>Warning at 80% · Resets November 1</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Usage by model</CardTitle>
          <CardDescription>Example breakdown of research run costs this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Runs</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_USAGE.map((model) => (
                <TableRow key={model.model}>
                  <TableCell className="font-medium">{model.model}</TableCell>
                  <TableCell className="text-right tabular-nums">{model.runs}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{model.tokens}</TableCell>
                  <TableCell className="text-right tabular-nums">{previewMoney(model.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        The usage figures above are examples. The spending settings below use your project's existing API.
      </p>
    </section>
  );
}
