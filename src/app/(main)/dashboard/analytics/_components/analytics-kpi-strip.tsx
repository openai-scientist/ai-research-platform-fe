import { ArrowDownRight, ArrowUpRight, Ellipsis } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AnalyticsKpiItem = {
  change: string;
  direction: "down" | "up";
  from: string;
  label: string;
  period: string;
  value: string;
  positive?: boolean;
};

const defaultItems: AnalyticsKpiItem[] = [
  {
    change: "2.8%",
    direction: "up",
    from: "207.3k",
    label: "Unique Visitors",
    period: "last 4 weeks",
    value: "213.1k",
  },
  { change: "2.1%", direction: "up", from: "243.5k", label: "Sessions", period: "last 4 weeks", value: "248.6k" },
  { change: "3.3%", direction: "down", from: "566.8k", label: "Pageviews", period: "last 4 weeks", value: "547.9k" },
  { change: "4.2%", direction: "up", from: "58.9%", label: "Engagement Rate", period: "last 4 weeks", value: "61.4%" },
  { change: "5.6%", direction: "down", from: "8.9%", label: "Conversion Rate", period: "last 4 weeks", value: "8.4%" },
];

export function AnalyticsKpiStrip({ items = defaultItems }: { readonly items?: readonly AnalyticsKpiItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        {items.map((item) => {
          const TrendIcon = item.direction === "up" ? ArrowUpRight : ArrowDownRight;
          const trendClassName =
            (item.positive ?? item.direction === "up")
              ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300"
              : "bg-destructive/10 text-destructive";

          return (
            <Card key={item.label}>
              <CardHeader>
                <CardTitle className="font-normal text-sm">{item.label}</CardTitle>
                <CardAction>
                  <Ellipsis className="size-4" />
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-2xl leading-none tracking-tight">{item.value}</div>
                  {item.change && (
                    <Badge className={trendClassName}>
                      <TrendIcon />
                      {item.change}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  {item.from && (
                    <>
                      <span>
                        from <span className="text-foreground">{item.from}</span>
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span>{item.period}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
