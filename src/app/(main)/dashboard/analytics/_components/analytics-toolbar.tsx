import { Ellipsis, FileDown, FileUp, RefreshCw, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AnalyticsToolbarOption = {
  label: string;
  value: string;
};

const defaultOptions: AnalyticsToolbarOption[] = [
  { label: "Last 7 days", value: "last-7-days" },
  { label: "Last 4 weeks", value: "last-4-weeks" },
  { label: "Last 3 months", value: "last-3-months" },
  { label: "Year to date", value: "year-to-date" },
];

export function AnalyticsToolbar({
  actionLabel = "Analytics actions",
  defaultValue = "last-4-weeks",
  options = defaultOptions,
  value,
  onValueChange,
  onRefresh,
  refreshDisabled = false,
}: {
  readonly actionLabel?: string;
  readonly defaultValue?: string;
  readonly options?: readonly AnalyticsToolbarOption[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly onRefresh?: () => void;
  readonly refreshDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-34" aria-label="Time range">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" aria-label="More analytics actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{actionLabel}</DropdownMenuLabel>
            {!onRefresh && (
              <>
                <DropdownMenuItem>
                  <FileDown />
                  Export report
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileUp />
                  Import data
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 />
                  Share dashboard
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
          {!onRefresh && <DropdownMenuSeparator />}
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onRefresh} disabled={refreshDisabled}>
              <RefreshCw />
              Refresh metrics
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
