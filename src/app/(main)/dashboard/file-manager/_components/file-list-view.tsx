"use client";

import { useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import { Star } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { type FileManagerFile, fileIcons } from "./data";
import { FileActions } from "./file-actions";

interface FileListViewProps {
  files: FileManagerFile[];
  labels?: {
    modified: string;
    name: string;
    owner: string;
    size: string;
  };
  sharedLabel?: string;
}

export function FileListView({
  files,
  labels = { modified: "Modified", name: "Name", owner: "Owner", size: "Size" },
  sharedLabel = "Shared",
}: FileListViewProps) {
  const [listFiles, setListFiles] = useState(files);

  function toggleStar(fileId: string) {
    setListFiles((current) => current.map((file) => (file.id === fileId ? { ...file, starred: !file.starred } : file)));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-0">{labels.name}</TableHead>
          <TableHead className="hidden md:table-cell">{labels.owner}</TableHead>
          <TableHead className="hidden lg:table-cell">{labels.modified}</TableHead>
          <TableHead className="hidden sm:table-cell">{labels.size}</TableHead>
          <TableHead className="w-20">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listFiles.map((file) => {
          const FileIcon = fileIcons[file.icon ?? file.kind];

          return (
            <TableRow key={file.id}>
              <TableCell className="pl-0">
                <div className="flex min-w-0 items-center gap-3">
                  <FileIcon className="size-5 shrink-0 text-muted-foreground" />
                  {file.href ? (
                    <Button asChild variant="link" size="sm" className="h-auto max-w-72 justify-start px-0">
                      <Link prefetch={false} href={file.href}>
                        <span className="truncate">{file.name}</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="link" size="sm" className="h-auto max-w-72 justify-start px-0">
                      <span className="truncate">{file.name}</span>
                    </Button>
                  )}
                  {(file.shared || file.badgeLabel) && (
                    <Badge variant="outline" className="hidden xl:inline-flex">
                      {file.badgeLabel ?? sharedLabel}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{file.ownerInitials}</AvatarFallback>
                  </Avatar>
                  <span>{file.owner}</span>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">{file.modifiedAt}</TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">{file.size}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={file.starred ? `Unstar ${file.name}` : `Star ${file.name}`}
                    onClick={() => toggleStar(file.id)}
                  >
                    <Star className={cn(file.starred && "fill-current")} />
                  </Button>
                  <FileActions file={file} onToggleStar={() => toggleStar(file.id)} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
