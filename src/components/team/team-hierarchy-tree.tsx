"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { OrgNodeCard } from "@/components/team/org-node-card";
import { OrgNodeDetailSheet } from "@/components/team/org-node-detail-sheet";
import type { HierarchyNode } from "@/lib/hierarchy";

function countDescendants(node: HierarchyNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function OrgNodeBranch({
  node,
  depth,
  currentEmployeeId,
  expandedMap,
  onToggle,
  onSelect,
}: {
  node: HierarchyNode;
  depth: number;
  currentEmployeeId: string;
  expandedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (node: HierarchyNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedMap[node.id] ?? true;
  const visibleChildren = hasChildren && expanded ? node.children : [];

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(depth * 0.06, 0.3), ease: "easeOut" }}
      >
        <OrgNodeCard
          node={node}
          depth={depth}
          isCurrentUser={node.id === currentEmployeeId}
          hasChildren={hasChildren}
          expanded={expanded}
          descendantCount={countDescendants(node)}
          onToggleExpand={() => onToggle(node.id)}
          onSelect={() => onSelect(node)}
        />
      </motion.div>

      {visibleChildren.length > 0 && (
        <div className="flex flex-col items-center">
          {/* Stem from parent down to the connector bus */}
          <div className="h-5 sm:h-8 w-[2.5px] rounded-t-full bg-primary/45" />

          <div className="flex items-start gap-x-3 sm:gap-x-6 md:gap-x-10">
            {visibleChildren.map((child, i) => {
              const isOnly = visibleChildren.length === 1;
              const isFirst = i === 0;
              const isLast = i === visibleChildren.length - 1;

              return (
                <div key={child.id} className="flex flex-col items-center">
                  {!isOnly && (
                    <div className="relative h-5 sm:h-8 w-full">
                      {!isFirst && (
                        <div className="absolute -left-2 top-0 h-[2.5px] w-[calc(50%+0.5rem)] bg-primary/45 sm:-left-3 sm:w-[calc(50%+0.75rem)] md:-left-5 md:w-[calc(50%+1.25rem)]" />
                      )}
                      {!isLast && (
                        <div className="absolute -right-2 top-0 h-[2.5px] w-[calc(50%+0.5rem)] bg-primary/45 sm:-right-3 sm:w-[calc(50%+0.75rem)] md:-right-5 md:w-[calc(50%+1.25rem)]" />
                      )}
                      <div className="absolute left-1/2 top-0 h-full w-[2.5px] -translate-x-1/2 rounded-b-full bg-primary/45" />
                    </div>
                  )}
                  {isOnly && <div className="h-5 sm:h-8 w-[2.5px] rounded-b-full bg-primary/45" />}

                  <OrgNodeBranch
                    node={child}
                    depth={depth + 1}
                    currentEmployeeId={currentEmployeeId}
                    expandedMap={expandedMap}
                    onToggle={onToggle}
                    onSelect={onSelect}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamHierarchyTree({
  root,
  currentEmployeeId,
}: {
  root: HierarchyNode | null;
  currentEmployeeId: string;
}) {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; scrollLeft: number }>({
    dragging: false,
    startX: 0,
    scrollLeft: 0,
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  const handleSelect = useCallback((node: HierarchyNode) => {
    setSelectedNode(node);
    setSheetOpen(true);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!scrollRef.current || e.button !== 0) return;
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging || !scrollRef.current) return;
    const dx = e.clientX - dragState.current.startX;
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
  };

  const endDrag = () => {
    dragState.current.dragging = false;
  };

  if (!root) {
    return (
      <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
        <Users className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">No team members in this hierarchy yet</p>
      </div>
    );
  }

  return (
    <>
      {/* Scroll hint label */}
      <div className="mb-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground/60 select-none">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        Drag or scroll to pan
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {/* Left fade edge */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-card/40 to-transparent" />
        {/* Right fade edge */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-card/40 to-transparent" />

        <div
          ref={scrollRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="cursor-grab overflow-x-auto overflow-y-auto py-8 sm:py-10 active:cursor-grabbing scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* min-w-max ensures the tree expands to its natural width, enabling scroll */}
          <div className="inline-flex min-w-max justify-center px-12 sm:px-16 pb-4">
            <OrgNodeBranch
              node={root}
              depth={0}
              currentEmployeeId={currentEmployeeId}
              expandedMap={expandedMap}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </div>

      <OrgNodeDetailSheet node={selectedNode} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
