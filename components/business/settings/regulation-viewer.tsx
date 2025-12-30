"use client";

import { RegulationItem } from "@/lib/actions/regulation";
import { cn } from "@/lib/utils";
import React from "react";

interface RegulationViewerProps {
  content: RegulationItem[] | unknown; // Handle Json type from Prisma
  className?: string;
}

export function RegulationViewer({
  content,
  className,
}: RegulationViewerProps) {
  // Safe cast since we know the structure from Zod validation on write
  const items = (Array.isArray(content) ? content : []) as RegulationItem[];

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm italic">暂无内容</p>;
  }

  const renderItem = (item: RegulationItem, level: number = 0) => {
    // Different list styles for different levels
    const listStyle =
      level === 0
        ? "list-decimal"
        : level === 1
        ? "list-[lower-alpha]"
        : "list-[lower-roman]";

    return (
      <li className="pl-1 my-1">
        <span className="leading-relaxed text-foreground">{item.text}</span>
        {item.children && item.children.length > 0 && (
          <ol className={cn("pl-6 mt-1 space-y-1", listStyle)}>
            {item.children.map((child) => (
              <React.Fragment key={child.id}>
                {renderItem(child, level + 1)}
              </React.Fragment>
            ))}
          </ol>
        )}
      </li>
    );
  };

  return (
    <ol
      className={cn(
        "pl-5 space-y-2 list-decimal marker:font-medium",
        className
      )}
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>{renderItem(item, 0)}</React.Fragment>
      ))}
    </ol>
  );
}
