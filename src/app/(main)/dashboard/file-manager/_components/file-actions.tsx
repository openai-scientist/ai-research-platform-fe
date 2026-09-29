import { Download, MoreVertical, Share2, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { FileManagerFile } from "./data";

interface FileActionsProps {
  file: FileManagerFile;
  onToggleStar: () => void;
}

export function FileActions({ file, onToggleStar }: FileActionsProps) {
  const labels = file.actionLabels ?? {
    archive: "Move to trash",
    export: "Download",
    share: "Copy share link",
    star: "Add to starred",
    unstar: "Remove from starred",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${file.name}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onToggleStar}>
            <Star />
            {file.starred ? labels.unstar : labels.star}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download />
            {labels.export}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share2 />
            {labels.share}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive">
            <Trash2 />
            {labels.archive}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
