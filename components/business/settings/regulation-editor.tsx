"use client";

import { RegulationItem } from "@/lib/actions/regulation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  IconPlus,
  IconTrash,
  IconIndentIncrease,
  IconIndentDecrease,
  IconGripVertical,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";

interface RegulationEditorProps {
  value: RegulationItem[];
  onChange: (value: RegulationItem[]) => void;
}

export function RegulationEditor({ value, onChange }: RegulationEditorProps) {
  const [items, setItems] = useState<RegulationItem[]>(value || []);

  useEffect(() => {
    setItems(value || []);
  }, [value]);

  const updateItems = (newItems: RegulationItem[]) => {
    setItems(newItems);
    onChange(newItems);
  };

  const handleTextChange = (id: string, newText: string) => {
    const updateNode = (nodes: RegulationItem[]): RegulationItem[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, text: newText };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    updateItems(updateNode(items));
  };

  const addItem = (parentId: string | null) => {
    const newItem: RegulationItem = {
      id: crypto.randomUUID(),
      text: "",
      children: [],
    };

    if (parentId === null) {
      updateItems([...items, newItem]);
    } else {
      const addNode = (nodes: RegulationItem[]): RegulationItem[] => {
        return nodes.map((node) => {
          if (node.id === parentId) {
            return { ...node, children: [...(node.children || []), newItem] };
          }
          if (node.children) {
            return { ...node, children: addNode(node.children) };
          }
          return node;
        });
      };
      updateItems(addNode(items));
    }
  };

  const deleteItem = (id: string) => {
    const deleteNode = (nodes: RegulationItem[]): RegulationItem[] => {
      return nodes
        .filter((node) => node.id !== id)
        .map((node) => {
          if (node.children) {
            return { ...node, children: deleteNode(node.children) };
          }
          return node;
        });
    };
    updateItems(deleteNode(items));
  };

  // Basic indentation logic? Actually, strict "indent/outdent" usually means moving items in/out of previous sibling.
  // For simplicity, let's just support "Add Sub-item" button on each item, and "Delete".
  // "Indent" button logic: find previous sibling, append as child to it.
  // "Outdent" button logic: find parent, move as next sibling of parent.
  // This is complex to implement correctly without bugs.
  // Let's stick to "Add Child" button for creating nested structure explicitly.

  const renderItem = (
    item: RegulationItem,
    level: number = 0,
    siblings: RegulationItem[],
    index: number
  ) => {
    return (
      <div key={item.id} className="group">
        <div
          className={cn("flex items-center gap-2 py-1", level > 0 && "ml-6")}
        >
          <div className="flex-1 flex items-center gap-2">
            <span className="text-muted-foreground w-6 text-right text-sm font-mono">
              {level === 0 ? index + 1 : ""}
            </span>
            <Input
              value={item.text}
              onChange={(e) => handleTextChange(item.id, e.target.value)}
              placeholder="输入条款内容..."
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              title="添加子条款"
              onClick={() => addItem(item.id)}
            >
              <IconIndentIncrease className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              title="删除"
              onClick={() => deleteItem(item.id)}
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {item.children && item.children.length > 0 && (
          <div className="ml-0">
            {item.children.map((child, idx) =>
              renderItem(child, level + 1, item.children!, idx)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 border rounded-md p-4 bg-card">
      <div className="space-y-1">
        {items.map((item, index) => renderItem(item, 0, items, index))}
      </div>

      <Button
        variant="outline"
        className="w-full mt-2 border-dashed"
        onClick={() => addItem(null)}
      >
        <IconPlus className="mr-2 h-4 w-4" />
        添加一级条款
      </Button>
    </div>
  );
}
