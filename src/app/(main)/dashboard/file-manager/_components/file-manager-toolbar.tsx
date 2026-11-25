import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export type FileManagerTypeOption = {
  label: string;
  value: string;
};

export type FileManagerShowLabels = {
  all: string;
  shared: string;
  starred: string;
};

type ControlOption = { label: string; value: string };

/** Makes the toolbar live; without it the toolbar is the template's static preview. */
export type FileManagerToolbarControls = {
  search: { value: string; onChange: (value: string) => void };
  show: { value: string; onChange: (value: string) => void; options: readonly ControlOption[] };
  type: { value: string; onChange: (value: string) => void };
  sort: { value: string; onChange: (value: string) => void; options: readonly ControlOption[] };
};

const defaultTypeOptions: FileManagerTypeOption[] = [
  { label: "All types", value: "all" },
  { label: "Archive", value: "archive" },
  { label: "Design", value: "design" },
  { label: "Document", value: "document" },
  { label: "PDF", value: "pdf" },
  { label: "Spreadsheet", value: "spreadsheet" },
];

export function FileManagerToolbar({
  controls,
  filterLabels = { all: "All files", shared: "Shared", starred: "Starred" },
  itemLabel = "files",
  placeholder = "Search files and folders...",
  typeLabel = "File type",
  typeOptions = defaultTypeOptions,
}: {
  readonly controls?: FileManagerToolbarControls;
  readonly filterLabels?: FileManagerShowLabels;
  readonly itemLabel?: string;
  readonly placeholder?: string;
  readonly typeLabel?: string;
  readonly typeOptions?: readonly FileManagerTypeOption[];
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <InputGroup className="md:max-w-lg">
        <InputGroupInput
          placeholder={placeholder}
          aria-label={placeholder}
          value={controls?.search.value}
          onChange={controls ? (event) => controls.search.onChange(event.target.value) : undefined}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
      <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal data-icon="inline-start" />
              Filter & sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={controls?.show.value ?? "all"} onValueChange={controls?.show.onChange}>
                {(
                  controls?.show.options ?? [
                    { label: filterLabels.all || `All ${itemLabel}`, value: "all" },
                    { label: filterLabels.starred, value: "starred" },
                    { label: filterLabels.shared, value: "shared" },
                  ]
                ).map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <SlidersHorizontal />
                  {typeLabel}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={8}>
                  <DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                      value={controls?.type.value ?? "all"}
                      onValueChange={controls?.type.onChange}
                    >
                      {typeOptions.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowUpDown />
                  Sort by
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={8}>
                  <DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                      value={controls?.sort.value ?? "modified"}
                      onValueChange={controls?.sort.onChange}
                    >
                      {(
                        controls?.sort.options ?? [
                          { label: "Last modified", value: "modified" },
                          { label: "Name", value: "name" },
                          { label: "File size", value: "size" },
                        ]
                      ).map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
