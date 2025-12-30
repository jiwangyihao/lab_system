"use client";

import * as React from "react";
import { IconTrash, IconEdit, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface BatchActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  children?: React.ReactNode;
}

export function BatchActions({
  selectedCount,
  onClearSelection,
  children,
}: BatchActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 p-2 bg-muted/50 rounded-lg border mb-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 pl-2">
        <span className="text-sm font-medium">已选择 {selectedCount} 项</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClearSelection}
        >
          <IconX className="h-4 w-4" />
        </Button>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
