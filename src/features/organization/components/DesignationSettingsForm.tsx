import React, { useState, useEffect, useRef, useCallback } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  getDesignationEmployees,
  type DesignationNode,
} from "../services/designations";
import { getDepartments } from "../services/departments";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Network,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Maximize2,
  RotateCcw,
  Users,
  Calendar,
  Building,
  GitCommit,
  Mail,
  Hash,
  Clock,
  Search,
  User,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import Select from "@/shared/components/ui/Select";
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";

export interface PendingDesignation {
  designation_name: string;
  designation_code: string;
  description?: string;
  parent_designation_id?: number | null;
  secondary_parent_designation_id?: number | null;
  secondary_reporting_employee_id?: number | null;
}

interface DesignationSettingsFormProps {
  isReadOnly: boolean;
  departmentId?: number;
  /** Called whenever pending designations change (only used when departmentId is undefined) */
  onPendingChange?: (items: PendingDesignation[]) => void;
  isGlobal?: boolean;
  hideSidebar?: boolean;
}

export const DesignationSettingsForm: React.FC<DesignationSettingsFormProps> = ({
  isReadOnly,
  departmentId,
  onPendingChange,
  isGlobal = false,
  hideSidebar = false,
}) => {
  const navigate = useOrgNavigate();
  /** true when the department hasn't been saved yet */
  const isPendingMode = departmentId === undefined && !isGlobal;
  const [designations, setDesignations] = useState<DesignationNode[]>([]);
  const [flatDesignations, setFlatDesignations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!isPendingMode); // skip loading in pending mode
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);
  const [viewType] = useState<"list" | "chart">(isGlobal ? "chart" : "list");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inlineTransformRef = useRef<any>(null);
  const modalTransformRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<DesignationNode | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCancelDesignationConfirm, setShowCancelDesignationConfirm] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: DesignationNode;
  } | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (contextMenu) {
      setMenuCoords({ x: contextMenu.x, y: contextMenu.y });
    }
  }, [contextMenu]);

  const contextMenuRef = (node: HTMLDivElement | null) => {
    if (node && contextMenu) {
      const rect = node.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      let adjustedX = contextMenu.x;
      let adjustedY = contextMenu.y;
      
      if (contextMenu.x + width > window.innerWidth) {
        adjustedX = window.innerWidth - width - 12;
      }
      if (adjustedX < 12) {
        adjustedX = 12;
      }
      
      if (contextMenu.y + height > window.innerHeight) {
        adjustedY = contextMenu.y - height;
      }
      if (adjustedY < 12) {
        adjustedY = 12;
      }
      
      if (adjustedX !== menuCoords.x || adjustedY !== menuCoords.y) {
        setMenuCoords({ x: adjustedX, y: adjustedY });
      }
    }
  };
  const [insertAboveId, setInsertAboveId] = useState<number | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);
  const [newlyCreatedPendingIdx, setNewlyCreatedPendingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (newlyCreatedId !== null || newlyCreatedPendingIdx !== null) {
      const timer = setTimeout(() => {
        setNewlyCreatedId(null);
        setNewlyCreatedPendingIdx(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedId, newlyCreatedPendingIdx]);

  // After data reloads, find and select the newly created node
  useEffect(() => {
    if (newlyCreatedId === null || designations.length === 0) return;
    const findNode = (nodes: DesignationNode[], targetId: number): DesignationNode | null => {
      for (const n of nodes) {
        if (n.id === targetId) return n;
        if (n.sub_designations?.length) {
          const found = findNode(n.sub_designations, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    const found = findNode(designations, newlyCreatedId);
    if (found) setSelectedNode(found);
  }, [newlyCreatedId, designations]);

  // Auto-scroll to the newly created node
  useEffect(() => {
    if (newlyCreatedId === null) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-node-id="${newlyCreatedId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(timer);
  }, [newlyCreatedId]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  /** Locally buffered designations (used only when isPendingMode === true) */
  const [pendingDesignations, setPendingDesignations] = useState<PendingDesignation[]>([]);

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [secondaryParentId, setSecondaryParentId] = useState<number | null>(null);
  const [secondaryReportingEmployeeId, setSecondaryReportingEmployeeId] = useState<number | null>(null);
  const [secondaryEmployees, setSecondaryEmployees] = useState<{ id: number; first_name: string; last_name: string; employee_id: string }[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  // Fetch employees when secondary parent designation changes
  useEffect(() => {
    if (secondaryParentId && !isPendingMode) {
      getDesignationEmployees(secondaryParentId).then(setSecondaryEmployees).catch(() => setSecondaryEmployees([]));
    } else {
      setSecondaryEmployees([]);
    }
    setSecondaryReportingEmployeeId(null);
  }, [secondaryParentId, isPendingMode]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    data: DesignationNode | null;
  }>({ isOpen: false, data: null });

  const chartRef = useRef<HTMLDivElement>(null);
  const [connectionPaths, setConnectionPaths] = useState<string[]>([]);

  // Measure and draw secondary connection curves
  useEffect(() => {
    let rafId: number;
    let fallbackId: ReturnType<typeof setTimeout>;

    const measure = () => {
      if (!chartRef.current || viewType !== "chart") return;
      const container = chartRef.current;
      const contRect = container.getBoundingClientRect();

      // Get current zoom scale based on bounding rect width relative to layout client width
      const scale = container.offsetWidth ? contRect.width / container.offsetWidth : 1;
      const safeScale = scale > 0 ? scale : 1;

      // Collect all card rects (relative to container), skip any with zero size
      const cardRects: { id: string; top: number; bottom: number; left: number; right: number; cx: number; cy: number }[] = [];
      container.querySelectorAll<HTMLElement>('[data-node-id]').forEach(el => {
        const anchorEl = el.querySelector<HTMLElement>('.designation-card-anchor') || el;
        const r = anchorEl.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        
        const top = (r.top - contRect.top) / safeScale;
        const bottom = (r.bottom - contRect.top) / safeScale;
        const left = (r.left - contRect.left) / safeScale;
        const right = (r.right - contRect.left) / safeScale;
        const cx = (r.left - contRect.left + r.width / 2) / safeScale;
        const cy = (r.top - contRect.top + r.height / 2) / safeScale;

        cardRects.push({
          id: el.getAttribute('data-node-id')!,
          top: Number.isNaN(top) ? 0 : top,
          bottom: Number.isNaN(bottom) ? 0 : bottom,
          left: Number.isNaN(left) ? 0 : left,
          right: Number.isNaN(right) ? 0 : right,
          cx: Number.isNaN(cx) ? 0 : cx,
          cy: Number.isNaN(cy) ? 0 : cy,
        });
      });

      if (cardRects.length === 0) {
        console.warn('[secondary-connector] no cards with non-zero size found');
        return;
      }

      console.log('[secondary-connector] cardRects:', cardRects.map(r => ({ id: r.id, cx: r.cx, cy: r.cy })));

      // Find vertical gutters (gaps between rows of cards)
      const sortedByTop = [...cardRects].sort((a, b) => a.top - b.top);
      const gutters: { y: number; gap: number }[] = [];
      for (let i = 0; i < sortedByTop.length - 1; i++) {
        const gap = sortedByTop[i + 1].top - sortedByTop[i].bottom;
        if (gap > 20) {
          gutters.push({
            y: (sortedByTop[i].bottom + sortedByTop[i + 1].top) / 2,
            gap,
          });
        }
      }

      // Helper: pick the best gutter between source Y and target Y
      const pickGutter = (sy: number, ty: number) => {
        const mid = (sy + ty) / 2;
        const between = gutters.filter(g => g.y > Math.min(sy, ty) && g.y < Math.max(sy, ty));
        if (between.length > 0) {
          between.sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid));
          return between[0].y;
        }
        if (gutters.length > 0) {
          gutters.sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid));
          return gutters[0].y;
        }
        const allTops = cardRects.map(r => r.top);
        if (allTops.length === 0) return -60;
        return Math.min(...allTops) - 60;
      };

      const paths: string[] = [];
      const walk = (nodes: DesignationNode[]) => {
        for (const n of nodes) {
          if (n.secondary_parent_designation_id) {
            const srcR = cardRects.find(r => r.id === String(n.id));
            const tgtR = cardRects.find(r => r.id === String(n.secondary_parent_designation_id));
            if (srcR && tgtR) {
              const gutterY = pickGutter(srcR.cy, tgtR.cy);

              const srcEdgeY = srcR.cy < gutterY ? srcR.bottom : srcR.top;
              const tgtEdgeY = tgtR.cy < gutterY ? tgtR.bottom : tgtR.top;

              const sx = srcR.cx;
              const sy = srcEdgeY;
              const tx = tgtR.cx;
              const ty = tgtEdgeY;

              console.log(`[secondary-connector] ${n.designation_name}(${n.id}) -> id=${n.secondary_parent_designation_id} gutterY=${gutterY} src=(${sx},${sy}) tgt=(${tx},${ty})`);

              paths.push(`M ${sx} ${sy} C ${sx} ${gutterY}, ${tx} ${gutterY}, ${tx} ${ty}`);
            } else if (!srcR) {
              console.warn(`[secondary-connector] Source card not found for node id=${n.id} "${n.designation_name}"`);
            } else {
              console.warn(`[secondary-connector] Target card not found for secondary_parent_designation_id=${n.secondary_parent_designation_id} (source: ${n.designation_name})`);
            }
          }
          if (n.sub_designations?.length) walk(n.sub_designations);
        }
      };
      walk(designations);
      console.log('[secondary-connector] paths generated:', paths.length);
      setConnectionPaths(paths);
    };

    rafId = requestAnimationFrame(() => measure());
    // Retry after a short delay to catch late-mounting cards
    fallbackId = setTimeout(() => measure(), 300);

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });

    const observer = new MutationObserver(() => requestAnimationFrame(() => setTimeout(measure, 100)));
    if (chartRef.current) {
      observer.observe(chartRef.current, { childList: true, subtree: true, attributes: true });
      const wrapper = chartRef.current.closest('.react-transform-wrapper') || chartRef.current.parentElement;
      if (wrapper) observer.observe(wrapper, { attributes: true, attributeFilter: ['style'] });
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(fallbackId);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [designations, viewType, selectedNode, isModalOpen, searchQuery]);

  useEffect(() => {
    const handlers: { el: HTMLElement; handler: (e: WheelEvent) => void }[] = [];

    const attach = (el: HTMLElement) => {
      if (el.dataset.hasWheelHandler === 'true') return;
      el.dataset.hasWheelHandler = 'true';

      const handler = (e: WheelEvent) => {
        // 1. PINCH-TO-ZOOM (Touchpad pinch triggers e.ctrlKey or e.metaKey)
        if (e.ctrlKey || e.metaKey) {
          // Let react-zoom-pan-pinch handle pinch-to-zoom centering at the cursor position natively
          return;
        }

        // 2. TWO-FINGER TOUCHPAD SCROLLING (Translate canvas coordinates using setTransform to pan the view)
        e.preventDefault();
        e.stopPropagation();
        const ref = el.closest('.fixed') !== null ? modalTransformRef : inlineTransformRef;
        if (ref.current) {
          const state = ref.current.state;
          const newX = state.positionX - e.deltaX;
          const newY = state.positionY - e.deltaY;

          // Constrain scrolling boundaries to the content edges (with a 100px padding buffer)
          const contentEl = el.querySelector<HTMLElement>('.react-transform-component');
          let boundedX = newX;
          let boundedY = newY;
          if (contentEl) {
            const scale = state.scale;
            const contentWidth = contentEl.offsetWidth * scale;
            const contentHeight = contentEl.offsetHeight * scale;
            const containerWidth = el.clientWidth;
            const containerHeight = el.clientHeight;

            const cushion = 100;
            if (contentWidth > containerWidth) {
              const minX = containerWidth - contentWidth - cushion;
              const maxX = cushion;
              boundedX = Math.min(Math.max(newX, minX), maxX);
            } else {
              const center = (containerWidth - contentWidth) / 2;
              boundedX = Math.min(Math.max(newX, center - cushion), center + cushion);
            }

            if (contentHeight > containerHeight) {
              const minY = containerHeight - contentHeight - cushion;
              const maxY = cushion;
              boundedY = Math.min(Math.max(newY, minY), maxY);
            } else {
              const center = (containerHeight - contentHeight) / 2;
              boundedY = Math.min(Math.max(newY, center - cushion), center + cushion);
            }
          }

          ref.current.setTransform(boundedX, boundedY, state.scale, 0);
        }
      };
      el.addEventListener('wheel', handler, { capture: true, passive: false });
      handlers.push({ el, handler });
    };

    const elements = document.querySelectorAll<HTMLElement>('.hierarchy-canvas-container');
    elements.forEach(el => attach(el));

    const observer = new MutationObserver(() => {
      const currentElements = document.querySelectorAll<HTMLElement>('.hierarchy-canvas-container');
      currentElements.forEach(el => {
        if (!handlers.some(h => h.el === el)) {
          attach(el);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      handlers.forEach(({ el, handler }) => {
        el.removeEventListener('wheel', handler, { capture: true });
      });
      observer.disconnect();
    };
  }, [viewType, isModalOpen]);

  const loadData = async () => {
    if (isPendingMode) return; // no API call when department doesn't exist yet
    setIsLoading(true);
    try {
      const data = await getDesignations(departmentId);
      setDesignations(data);
      const flatList: any[] = [];
      const flatten = (nodes: DesignationNode[]) => {
        nodes.forEach((node) => {
          flatList.push({ id: node.id, name: node.designation_name, code: node.designation_code, department_id: node.department_id });
          if (node.sub_designations?.length) flatten(node.sub_designations);
        });
      };
      flatten(data);
      setFlatDesignations(flatList);

      if (isGlobal && !isReadOnly) {
        const depts = await getDepartments();
        setDepartments(depts);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load designations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [departmentId, isGlobal]);

  useEffect(() => {
    if (showForm) {
      const container = document.querySelector('main');
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  }, [showForm]);

  const resetForm = () => {
    setName(""); setCode(""); setDescription(""); setParentId(null); setSecondaryParentId(null); setSecondaryReportingEmployeeId(null);
    setSecondaryEmployees([]);
    setSelectedDeptId(null);
    setEditingId(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!name.trim() || !code.trim()) {
      toast.error("Please fill in Structure Name and Code");
      return;
    }
    if (code.trim().length < 2) {
      toast.error("Designation code must be at least 2 characters");
      return;
    }

    // ── Pending mode: buffer locally ──────────────────────────────
    if (isPendingMode) {
      const newItem: PendingDesignation = {
        designation_name: name.trim(),
        designation_code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        parent_designation_id: parentId || null,
        secondary_parent_designation_id: secondaryParentId || null,
        secondary_reporting_employee_id: secondaryReportingEmployeeId || null,
      };
      let updated = [...pendingDesignations];
      if (editingId !== null) {
        updated = pendingDesignations.map((d, i) => i === editingId ? newItem : d);
      } else {
        updated.push(newItem);
        const newIndex = updated.length - 1;
        setNewlyCreatedPendingIdx(newIndex);
        if (insertAboveId !== null) {
          updated[insertAboveId] = {
            ...updated[insertAboveId],
            parent_designation_id: newIndex
          };
        }
      }
      setPendingDesignations(updated);
      onPendingChange?.(updated);
      toast.success(editingId !== null ? "Structure updated!" : "Structure added!");
      setInsertAboveId(null);
      resetForm();
      return;
    }

    // ── Normal mode: API call ─────────────────────────────────────
    setIsSubmitting(true);
    const payload = {
      designation_name: name.trim(),
      designation_code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      parent_designation_id: parentId || null,
      secondary_parent_designation_id: secondaryParentId || null,
      secondary_reporting_employee_id: secondaryReportingEmployeeId || null,
      department_id: isGlobal ? selectedDeptId : (departmentId ?? null),
    };
    try {
      if (editingId) {
        if (editingId === parentId) { toast.error("A structure cannot report to itself"); return; }
        await updateDesignation(editingId as number, payload);
        toast.success("Structure updated!");
      } else {
        const created = await createDesignation(payload);
        toast.success("Structure created!");
        if (created?.id) {
          setNewlyCreatedId(created.id);
        }
        if (insertAboveId && created?.id) {
          await updateDesignation(insertAboveId, {
            parent_designation_id: created.id
          });
        }
      }
      setInsertAboveId(null);
      resetForm();
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Name or code already exists.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (node: DesignationNode) => {
    setEditingId(node.id);
    setName(node.designation_name);
    setCode(node.designation_code);
    setDescription(node.description || "");
    setParentId(node.parent_designation_id || null);
    setSecondaryParentId(node.secondary_parent_designation_id || null);
    setSecondaryReportingEmployeeId(node.secondary_reporting_employee_id || null);
    if (node.secondary_parent_designation_id) {
      getDesignationEmployees(node.secondary_parent_designation_id).then(setSecondaryEmployees).catch(() => setSecondaryEmployees([]));
    }
    setSelectedDeptId(node.department_id || node.department?.id || null);
    setShowForm(true);
  };

  const executeDelete = async () => {
    if (!deleteConfirm.data) return;
    try {
      await deleteDesignation(deleteConfirm.data.id);
      toast.success("Structure deleted!");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete structure");
    } finally {
      setDeleteConfirm({ isOpen: false, data: null });
    }
  };

  const renderDesignationNode = (node: DesignationNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.sub_designations && node.sub_designations.length > 0;
    const isExpanded = expandedNodes[node.id] !== false;

    return (
      <div key={node.id}>
        <div
          data-node-id={node.id}
          className={`flex items-center gap-2.5 p-2.5 bg-card border hover:border-primary-300 hover:bg-primary/10/20 rounded-sm transition-all duration-150 relative group cursor-pointer ${newlyCreatedId === node.id
              ? "border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/40"
              : selectedNode?.id === node.id
                ? "border-primary bg-primary/10/55 shadow-sm ring-1 ring-primary/10"
                : "border-border"
            }`}
          onClick={() => {
            setSelectedNode(node);
          }}
          onContextMenu={(e) => {
            if (isReadOnly) return;
            e.preventDefault();
            e.stopPropagation();
            setNewlyCreatedId(null);
            setNewlyCreatedPendingIdx(null);
            setMenuCoords({ x: e.clientX, y: e.clientY });
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              node,
            });
          }}
        >
          {depth > 0 && (
            <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-[20px] h-[2px] bg-primary-100" />
          )}

          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedNodes((prev) => ({ ...prev, [node.id]: !isExpanded }));
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0 border-none bg-transparent"
            >
              {isExpanded
                ? <ChevronDown className="w-3.5 h-3.5 text-primary-500" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          <div className="w-7 h-7 bg-primary/10 text-primary rounded flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary-100">
            {node.designation_code.slice(0, 3)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground text-[14px] leading-5 truncate">
                {node.designation_name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border shrink-0">
                {node.designation_code}
              </span>
            </div>
            {node.description && (
              <p className="text-[12px] leading-4 text-muted-foreground mt-0.5 truncate">{node.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[12px] leading-4 text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full whitespace-nowrap">
              {node.headcount} {node.headcount === 1 ? "person" : "people"}
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(node);
                  }}
                  className="p-1.5 hover:bg-primary/10 text-primary-500 hover:text-primary rounded transition-colors border-none bg-transparent"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ isOpen: true, data: node });
                  }}
                  className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors border-none bg-transparent"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-primary-100 pl-5 ml-4 mt-2 space-y-2">
            {node.sub_designations.map((child) => renderDesignationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const doesNodeMatchSearch = (node: DesignationNode, query: string): boolean => {
    if (!query) return false;
    const q = query.toLowerCase();
    if (node.designation_name.toLowerCase().includes(q)) return true;
    if (node.designation_code.toLowerCase().includes(q)) return true;
    if (node.userDetails) {
      for (const u of node.userDetails) {
        const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
        if (fullName.includes(q)) return true;
      }
    }
    return false;
  };


  const renderFlowchartNode = (node: DesignationNode): React.ReactNode => {
    const hasChildren = node.sub_designations && node.sub_designations.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const isMatched = searchQuery ? doesNodeMatchSearch(node, searchQuery) : false;
    const isRootCEO = node.parent_designation_id === null;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          onClick={() => {
            setSelectedEmployee(null);
            setSelectedNode(node);
          }}
          onContextMenu={(e) => {
            if (isReadOnly) return;
            e.preventDefault();
            e.stopPropagation();
            setNewlyCreatedId(null);
            setNewlyCreatedPendingIdx(null);
            setMenuCoords({ x: e.clientX, y: e.clientY });
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              node,
            });
          }}
          data-node-id={node.id}
          /* Added hierarchy-node class to exclude from panning/dragging triggers, and stabilized dimensions without scale-105/translations */
          className={`relative p-4 border-2 rounded-lg flex flex-col items-center min-w-[200px] max-w-[260px] text-center transition-all duration-300 cursor-pointer hierarchy-node ${newlyCreatedId === node.id
              ? "bg-card border-emerald-400 shadow-[0_12px_40px_rgb(34,197,94,0.2)] ring-4 ring-emerald-500/20 z-10"
              : isSelected
                ? "bg-card border-primary-500 shadow-[0_12px_40px_rgb(99,102,241,0.2)] ring-4 ring-primary/10 z-10"
                : isMatched
                  ? "bg-card border-amber-400 shadow-[0_12px_40px_rgb(251,191,36,0.2)] ring-4 ring-amber-400/20 z-10"
                  : "bg-card/90 backdrop-blur-sm border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-primary-300"
            }`}
        >
          <div className="designation-card-anchor w-full flex flex-col items-center">
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider shadow-sm ${isSelected
                ? "text-primary bg-primary/10 border-primary-150"
                : isMatched
                  ? "text-amber-700 bg-amber-100 border-amber-200"
                  : "text-muted-foreground bg-muted border-border/80"
              }`}>
              {node.designation_code}
            </span>
            <span className="font-extrabold text-foreground text-[14px] leading-5 mt-2.5 leading-tight">
              {node.designation_name}
            </span>


            {/* Secondary Reporting Badge (forward — with arrow) */}
            {node.secondary_parent && (
              <div className="mt-2 w-full text-[10px] font-semibold text-primary-600 bg-primary-50/80 border border-dashed border-primary-300 px-3 py-1.5 rounded-lg shadow-sm text-center leading-normal">
                <span className="text-primary-400 mr-1 inline-block">&#8599;</span>
                Reports to <span className="font-bold">{node.secondary_parent.designation_name}</span>
                {node.secondary_reporting_employee && (
                  <span className="text-primary-500 font-normal">
                    {" "}({node.secondary_reporting_employee.first_name} {node.secondary_reporting_employee.last_name})
                  </span>
                )}
              </div>
            )}


          </div>

          {/* Members List */}
          {node.userDetails && node.userDetails.length > 0 && (() => {
            const sortedUsers = [...node.userDetails].sort((a, b) => {
              if (!searchQuery) return 0;
              const q = searchQuery.toLowerCase();
              const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
              const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
              const aMatch = aName.includes(q) ? 1 : 0;
              const bMatch = bName.includes(q) ? 1 : 0;
              return bMatch - aMatch;
            });

            const hasHiddenMatches = sortedUsers.slice(3).some((u) => {
              if (!searchQuery) return false;
              const q = searchQuery.toLowerCase();
              const uName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
              return uName.includes(q);
            });

            return (
              <div className="mt-4 pt-4 border-t border-border w-full flex flex-col items-center gap-2">
                {sortedUsers.slice(0, 3).map((user, idx) => {
                  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
                  const isUserMatched = searchQuery && fullName.toLowerCase().includes(searchQuery.toLowerCase());
                  return (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmployee(user);
                        setSelectedNode(node);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all cursor-pointer border ${isUserMatched
                          ? 'bg-amber-50 border-amber-300 shadow-[0_2px_10px_rgb(251,191,36,0.15)]'
                          : 'bg-muted/50/50 border-border/50 hover:bg-card hover:border-primary-200 hover:shadow-[0_2px_12px_rgb(99,102,241,0.08)]'
                        }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/50 text-primary font-bold text-[9px] flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-primary-100">
                        {user.profile_picture ? (
                          <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left flex flex-col">
                        <span className={`text-[11px] font-bold truncate leading-tight ${isUserMatched ? 'text-amber-900' : 'text-foreground'}`}>
                          {fullName}
                        </span>
                        {user.department && (
                          <span className={`text-[9px] font-semibold truncate leading-tight mt-0.5 ${isUserMatched ? 'text-amber-700' : 'text-muted-foreground'}`}>
                            {user.department.department_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {node.userDetails.length > 3 && (
                  <div className={`text-[10px] font-extrabold mt-1.5 px-3 py-1 rounded-full shadow-sm transition-colors ${hasHiddenMatches
                      ? 'bg-amber-100 border border-amber-300 text-amber-800 shadow-[0_2px_10px_rgb(251,191,36,0.2)]'
                      : 'bg-primary/10/50 border border-primary-100/50 text-primary hover:bg-primary-100'
                    }`}>
                    +{node.userDetails.length - 3} more
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {hasChildren && (
          <div className="flex flex-col items-center w-full">
            {/* Vertical line going down from parent */}
            <div className="w-[3px] h-8 bg-slate-200/80 rounded-full" />

            {/* Horizontal row of children */}
            <div className="flex gap-8 relative items-start">
              {node.sub_designations.map((child, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === node.sub_designations.length - 1;
                const isOnly = node.sub_designations.length === 1;

                return (
                  <div key={child.id} className="relative flex flex-col items-center">
                    {/* Sibling horizontal line segments */}
                    {!isOnly && (
                      <div
                        className={`absolute top-0 h-[3px] bg-slate-200/80 z-10 ${isFirst ? "left-1/2 right-0 rounded-l-full" : isLast ? "left-0 right-1/2 rounded-r-full" : "left-0 right-0"
                          }`}
                      />
                    )}
                    {/* Vertical line going down to child */}
                    <div className="w-[3px] h-8 bg-slate-200/80 shrink-0 rounded-full" />

                    {renderFlowchartNode(child)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 p-6">

      {/* ── Header ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary-500" />
          <span className="text-[14px] leading-5 font-medium text-foreground">
            {isGlobal ? "Designation Hierarchy View" : "Structures"}
          </span>
          {(isPendingMode ? pendingDesignations.length : designations.length) > 0 && (
            <span className="text-[12px] leading-4 font-semibold bg-primary/10 text-primary border border-primary-100 px-2 py-0.5 rounded-full">
              {isPendingMode ? pendingDesignations.length : designations.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 xl:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search member, role, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all bg-card"
            />
          </div>

          {!isReadOnly && !showForm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[36px] gap-2 font-bold border-border rounded-lg text-foreground hover:bg-muted hover:text-primary hover:border-primary-300 shadow-sm shrink-0"
              onClick={() => {
                setShowForm(true); setEditingId(null);
                setName(""); setCode(""); setDescription(""); setParentId(null); setSelectedDeptId(null);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Structure
            </Button>
          )}

          {/* Edit button to toggle/enter edit mode for the organization structure data */}
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/org-setup/settings?tab=organizational&edit=true")}
              className="h-[36px] gap-2 font-bold border-border rounded-lg text-foreground hover:bg-muted hover:text-primary hover:border-primary-300 shadow-sm shrink-0"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* ── Inline Add / Edit Form ── */}
      {showForm && !isReadOnly && (
        <div className="bg-muted border border-border rounded-sm p-4 space-y-4">
          {/* Form header */}
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-medium text-foreground">
              {editingId ? "Edit Structure" : "New Structure"}
            </h4>
            <button
              type="button"
              onClick={() => setShowCancelDesignationConfirm(true)}
              className="p-1 hover:bg-gray-200 rounded text-muted-foreground hover:text-gray-600 transition-colors border-none bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Code row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[14px] leading-5 font-medium text-foreground">
                  Structure Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary outline-none text-[14px] leading-5 bg-card text-foreground"
                  placeholder="e.g. Software Engineer"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[14px] leading-5 font-medium text-foreground">
                  Structure Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary outline-none text-[14px] leading-5 uppercase bg-card text-foreground"
                  placeholder="e.g. SWE"
                  minLength={2}
                  required
                />
              </div>
            </div>

            {/* Department Dropdown (only visible in global mode) */}
            {isGlobal && (
              <Select
                value={String(selectedDeptId || "")}
                onChange={(val) => setSelectedDeptId(Number(val) || null)}
                label="Department"
                placeholder="None (Global / Root-Level)"
                options={departments.map((dept) => ({
                  value: String(dept.id),
                  label: dept.department_name,
                }))}
              />
            )}

            {/* Primary Report To */}
            <Select
              value={String(parentId || "")}
              onChange={(val) => setParentId(Number(val) || null)}
              label="Primary Report To"
              placeholder="None (Top-Level)"
              options={
                isPendingMode
                  ? pendingDesignations.map((d, i) => ({
                    value: String(i),
                    label: `${d.designation_name} (${d.designation_code})`,
                  }))
                  : flatDesignations
                    .filter((d) => d.id !== editingId)
                    .map((d) => ({
                      value: String(d.id),
                      label: `${d.name} (${d.code})`,
                    }))
              }
            />

            {/* Secondary Report To */}
            <Select
              value={String(secondaryParentId || "")}
              onChange={(val) => setSecondaryParentId(Number(val) || null)}
              label="Secondary Report To"
              placeholder="None"
              options={
                isPendingMode
                  ? pendingDesignations.map((d, i) => ({
                    value: String(i),
                    label: `${d.designation_name} (${d.designation_code})`,
                  }))
                  : flatDesignations
                    .filter((d) => d.id !== editingId && d.id !== parentId)
                    .map((d) => ({
                      value: String(d.id),
                      label: `${d.name} (${d.code})`,
                    }))
              }
            />

            {/* Secondary Reporting Employee (only shown when a secondary parent is selected) */}
            {secondaryParentId && !isPendingMode && (
              <Select
                value={String(secondaryReportingEmployeeId || "")}
                onChange={(val) => setSecondaryReportingEmployeeId(Number(val) || null)}
                label="Secondary Reporting Employee"
                placeholder="Select employee"
                options={secondaryEmployees.map((emp) => ({
                  value: String(emp.id),
                  label: `${emp.first_name} ${emp.last_name} (${emp.employee_id || emp.first_name})`,
                }))}
              />
            )}

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[14px] leading-5 font-medium text-foreground">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-sm focus:ring-2 focus:ring-primary outline-none text-[14px] leading-5 bg-card text-foreground"
                placeholder="Brief role description..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCancelDesignationConfirm(true)}
                className="h-10 px-6 font-bold border-gray-300 dark:border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 gap-2 font-bold bg-primary hover:bg-primary/95 text-white border-none"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingId ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingId ? "Update Structure" : "Save Structure"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tree / Empty State ── */}
      {!showForm && (
        <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
          <div className="flex-1 min-w-0">
            {isPendingMode ? (
              // Pending mode: show locally buffered designations
              pendingDesignations.length === 0 && !showForm ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-sm">
                  <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-1 text-[14px] leading-5">No structures added yet</p>
                  <p className="text-[14px] leading-5 text-muted-foreground">
                    {isReadOnly
                      ? "No structures defined for this department"
                      : "Click \"Add Structure\" above to define role titles"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingDesignations.map((d, i) => (
                    <div
                      key={i}
                      data-node-id={`pending-${i}`}
                      className={`flex items-center gap-2.5 p-2.5 bg-card border hover:border-primary-300 hover:bg-primary/10/20 rounded-sm transition-all duration-150 group ${newlyCreatedPendingIdx === i
                          ? "border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/40"
                          : "border-border"
                        }`}
                    >
                      <div className="w-7 h-7 bg-primary/10 text-primary rounded flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary-100">
                        {d.designation_code.slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-foreground text-[14px] leading-5 truncate">{d.designation_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border shrink-0">
                            {d.designation_code}
                          </span>
                        </div>
                        {d.description && <p className="text-[12px] leading-4 text-muted-foreground mt-0.5 truncate">{d.description}</p>}
                      </div>
                      {!isReadOnly && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(i as any); // use index as editingId in pending mode
                              setName(d.designation_name);
                              setCode(d.designation_code);
                              setDescription(d.description || "");
                              setParentId(null);
                              setShowForm(true);
                            }}
                            className="p-1.5 hover:bg-primary/10 text-primary-500 hover:text-primary rounded transition-colors border-none bg-transparent"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = pendingDesignations.filter((_, idx) => idx !== i);
                              setPendingDesignations(updated);
                              onPendingChange?.(updated);
                              toast.success("Structure removed");
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors border-none bg-transparent"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              </div>
            ) : designations.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-sm">
                <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground mb-1 text-[14px] leading-5">No structures added yet</p>
                <p className="text-[14px] leading-5 text-muted-foreground">
                  {isReadOnly
                    ? "No structures defined for this department"
                    : "Structures define role titles within this department"}
                </p>
              </div>
            ) : viewType === "chart" ? (
              <>
                <div className="relative bg-card rounded-lg border border-border shadow-sm h-[600px] w-full hierarchy-canvas-container">
                  <TransformWrapper
                    initialScale={1}
                    minScale={0.3}
                    maxScale={2.5}
                    ref={inlineTransformRef}
                    /* Enable wheel zoom for native pinch-to-zoom support */
                    wheel={{ disabled: false }}
                    panning={{ disabled: false, velocityDisabled: true, excluded: ["hierarchy-node"] }}
                    doubleClick={{ disabled: true }}
                    zoomAnimation={{ disabled: false, size: 0.05, animationTime: 150, animationType: "easeOut" }}
                  >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                      <>
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-card p-1 rounded-sm shadow-sm border border-border">
                          <button type="button" onClick={() => zoomIn(0.15)} className="p-1.5 hover:bg-muted rounded text-gray-600" title="Zoom In">
                            <ZoomIn className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => zoomOut(0.15)} className="p-1.5 hover:bg-muted rounded text-gray-600" title="Zoom Out">
                            <ZoomOut className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => resetTransform()} className="p-1.5 hover:bg-muted rounded text-gray-600" title="Reset Zoom">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setIsModalOpen(true)} className="p-1.5 hover:bg-muted rounded text-gray-600 border-t border-border" title="Open Fullscreen">
                            <Maximize2 className="w-4 h-4 text-primary" />
                          </button>
                        </div>
                        <TransformComponent
                          wrapperStyle={{ width: "100%", height: "100%" }}
                          contentStyle={{ minWidth: "100%", minHeight: "100%", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "2rem", paddingBottom: "2rem" }}
                        >
                          <div className="hierarchy-tree-content flex gap-16 justify-center items-start px-8 relative" ref={isModalOpen ? null : chartRef}>
                            {designations.map((rootNode) => renderFlowchartNode(rootNode))}
                            <svg className="hierarchy-svg-overlay" style={{ overflow: 'visible' }}>
                              <defs>
                                <marker id="secondaryArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                                  <path d="M2,2 L11,6 L2,10 Q1,6 2,2 Z" fill="#6366f1" opacity="0.9" />
                                </marker>
                              </defs>
                              {connectionPaths.map((d, i) => (
                                <path
                                  key={i}
                                  d={d}
                                  fill="none"
                                  stroke="#6366f1"
                                  strokeWidth="2"
                                  strokeDasharray="6 4"
                                  markerEnd="url(#secondaryArrow)"
                                  style={{ transition: 'd 0.3s ease' }}
                                />
                              ))}
                            </svg>
                          </div>
                        </TransformComponent>
                      </>
                    )}
                  </TransformWrapper>
                </div>

                {/* Fullscreen Org Chart Modal */}
                {isModalOpen && (
                  <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card rounded-lg w-full h-[90vh] flex flex-col shadow-sm border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
                      {/* Modal Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Network className="w-5 h-5 text-primary-500" />
                          <h3 className="text-base font-semibold text-foreground">Job Hierarchy Org Chart</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-muted-foreground hover:text-gray-600 transition-colors border-none bg-transparent"
                          title="Close"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="flex-1 relative bg-muted/20 hierarchy-canvas-container">
                        <TransformWrapper
                          initialScale={1}
                          minScale={0.3}
                          maxScale={2.5}
                          ref={modalTransformRef}
                          /* Enable wheel zoom for native pinch-to-zoom support */
                          wheel={{ disabled: false }}
                          panning={{ disabled: false, velocityDisabled: true, excluded: ["hierarchy-node"] }}
                          doubleClick={{ disabled: true }}
                          zoomAnimation={{ disabled: false, size: 0.05, animationTime: 150, animationType: "easeOut" }}
                        >
                          {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-card p-1.5 rounded-lg shadow-sm border border-border">
                                <button type="button" onClick={() => zoomIn(0.15)} className="p-1.5 hover:bg-muted rounded text-gray-600" title="Zoom In">
                                  <ZoomIn className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => zoomOut(0.15)} className="p-1.5 hover:bg-muted rounded text-gray-600" title="Zoom Out">
                                  <ZoomOut className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => resetTransform()} className="p-1.5 hover:bg-muted rounded text-gray-600" title="Reset Zoom">
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </div>
                              <TransformComponent
                                wrapperStyle={{ width: "100%", height: "100%", backgroundColor: "#f8fafc" }}
                                contentStyle={{
                                  minWidth: "100%",
                                  minHeight: "100%",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "flex-start",
                                  paddingTop: "4rem",
                                  paddingBottom: "4rem",
                                  backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)",
                                  backgroundSize: "28px 28px"
                                }}
                              >
                                <div className="hierarchy-tree-content flex gap-16 justify-center items-start px-16 relative" ref={isModalOpen ? chartRef : null}>
                                  {designations.map((rootNode) => renderFlowchartNode(rootNode))}
                                  <svg className="hierarchy-svg-overlay" style={{ overflow: 'visible' }}>
                                    <defs>
                                      <marker id="secondaryArrowModal" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                                        <path d="M2,2 L11,6 L2,10 Q1,6 2,2 Z" fill="#6366f1" opacity="0.9" />
                                      </marker>
                                    </defs>
                                    {connectionPaths.map((d, i) => (
                                      <path
                                        key={i}
                                        d={d}
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="2"
                                        strokeDasharray="6 4"
                                        markerEnd="url(#secondaryArrowModal)"
                                      />
                                    ))}
                                  </svg>
                                </div>
                              </TransformComponent>
                            </>
                          )}
                        </TransformWrapper>

                        {/* Floating overlay inside fullscreen modal */}
                        {selectedNode && (
                          <div className="absolute bottom-6 right-6 max-w-sm w-80 bg-card/95 backdrop-blur border border-border rounded-lg shadow-sm p-5 z-20 flex flex-col space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <span className="text-[9px] font-bold text-primary-650 bg-primary/10 px-2 py-0.5 rounded border border-primary-150 uppercase tracking-wider">
                                  {selectedNode.designation_code}
                                </span>
                                <h4 className="text-[12px] font-medium text-foreground mt-1 truncate">
                                  {selectedNode.designation_name}
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedNode(null)}
                                className="p-1 hover:bg-gray-150 rounded text-muted-foreground hover:text-gray-600 border-none bg-transparent"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[12px] leading-4 text-muted-foreground line-clamp-2">
                              {selectedNode.description || "No description provided."}
                            </p>
                            <div className="flex flex-col gap-1 text-[10px] border-t border-border pt-2 text-muted-foreground">
                              <div className="flex justify-between items-center">
                                <span>Headcount: <strong>{selectedNode.headcount}</strong></span>
                                <span>Primary: <strong className="truncate max-w-[100px] inline-block align-bottom">{selectedNode.parent ? selectedNode.parent.designation_name : "None"}</strong></span>
                              </div>
                              {selectedNode.secondary_parent && (
                                <div className="flex justify-end">
                                  <span>Secondary: <strong className="truncate max-w-[100px] inline-block align-bottom text-primary-600">
                                    {selectedNode.secondary_parent.designation_name}
                                    {selectedNode.secondary_reporting_employee && (
                                      <span className="text-primary-500 font-normal">
                                        {" "}({selectedNode.secondary_reporting_employee.first_name} {selectedNode.secondary_reporting_employee.last_name})
                                      </span>
                                    )}
                                  </strong></span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {designations.map((rootNode) => renderDesignationNode(rootNode, 0))}
              </div>
            )}
          </div>

          {/* Sidebar basic detail panel */}
          {(selectedNode || selectedEmployee) && !hideSidebar && (() => {
            if (selectedEmployee) {
              return (
                <div className="w-full lg:w-96 min-h-[600px] bg-card border border-border rounded-lg p-5 flex flex-col space-y-6 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] self-start animate-in slide-in-from-right-4 duration-300">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/50 text-primary flex items-center justify-center border border-primary-100/80">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-[14px] leading-5 font-bold text-foreground leading-none">Employee Info</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(null)}
                      className="w-8 h-8 border border-border rounded-full flex items-center justify-center bg-card hover:bg-muted/50 hover:text-foreground text-muted-foreground transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Profile Spotlight */}
                  <div className="relative overflow-hidden bg-gradient-to-b from-primary-50/50 to-white border border-border/60 rounded-lg p-5 flex flex-col items-center text-center shadow-sm">
                    {/* Background decorative blob */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-400/10 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>

                    <div className="relative w-24 h-24 rounded-full bg-card text-muted-foreground mb-4 border-4 border-white shadow-sm flex items-center justify-center overflow-hidden z-10">
                      {selectedEmployee.profile_picture ? (
                        <img src={selectedEmployee.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-black bg-primary bg-clip-text text-transparent uppercase tracking-wider">
                          {selectedEmployee.first_name?.[0] || ""}{selectedEmployee.last_name?.[0] || ""}
                        </span>
                      )}
                    </div>
                    <h4 className="text-[12px] font-medium text-foreground tracking-tight z-10">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </h4>
                    <div className="mt-2.5 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-card/80 backdrop-blur-sm border border-border/80 rounded-full text-[11px] font-bold text-slate-600 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {selectedEmployee.employment_type || "Full-time"}
                      </span>
                    </div>
                  </div>

                  {/* Info Bento Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedEmployee.employee_id && (
                      <div className="col-span-1 bg-muted/50 hover:bg-muted/80 transition-colors border border-border/60 rounded-lg p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <Hash className="w-3 h-3 text-muted-foreground" /> ID Number
                        </div>
                        <span className="text-[14px] leading-5 font-bold text-foreground">{selectedEmployee.employee_id}</span>
                      </div>
                    )}

                    {selectedNode?.parent_designation_id !== null && selectedEmployee.department?.department_name && (
                      <div className="col-span-1 bg-muted/50 hover:bg-muted/80 transition-colors border border-border/60 rounded-lg p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <Building className="w-3 h-3 text-muted-foreground" /> Department
                        </div>
                        <span className="text-[14px] leading-5 font-bold text-foreground truncate" title={selectedEmployee.department.department_name}>
                          {selectedEmployee.department.department_name}
                        </span>
                      </div>
                    )}

                    {selectedNode && (
                      <div className="col-span-2 bg-muted/50 hover:bg-muted/80 transition-colors border border-border/60 rounded-lg p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <Briefcase className="w-3 h-3 text-muted-foreground" /> Designation
                        </div>
                        <span className="text-[14px] leading-5 font-bold text-foreground">{selectedNode.designation_name}</span>
                      </div>
                    )}

                    {(() => {
                      const rawJoinDate = selectedEmployee.joining_date || selectedEmployee.start_date || selectedEmployee.details?.joining_date || selectedEmployee.details?.start_date || selectedEmployee.details?.joiningDate;
                      return rawJoinDate ? (
                        <div className="col-span-1 bg-muted/50 hover:bg-muted/80 transition-colors border border-border/60 rounded-lg p-3.5 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <Calendar className="w-3 h-3 text-muted-foreground" /> Joining Date
                          </div>
                          <span className="text-[14px] leading-5 font-bold text-foreground">
                            {new Date(rawJoinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      ) : null;
                    })()}

                    {(() => {
                      const rawDob = selectedEmployee.date_of_birth || selectedEmployee.dob || selectedEmployee.details?.date_of_birth || selectedEmployee.details?.dob;
                      return rawDob ? (
                        <div className="col-span-1 bg-muted/50 hover:bg-muted/80 transition-colors border border-border/60 rounded-lg p-3.5 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <Calendar className="w-3 h-3 text-muted-foreground" /> Birthday
                          </div>
                          <span className="text-[14px] leading-5 font-bold text-foreground">
                            {new Date(rawDob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      ) : null;
                    })()}

                    {selectedEmployee.user?.email && (
                      <div className="col-span-2 bg-primary/10/50 hover:bg-primary/10/80 transition-colors border border-primary-100/60 rounded-lg p-3.5 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                          <Mail className="w-3 h-3 text-primary-400" /> Email Address
                        </div>
                        <span className="text-[14px] leading-5 font-bold text-primary-900 truncate" title={selectedEmployee.user.email}>
                          {selectedEmployee.user.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (!selectedNode) return null;

            return (
              <div className="w-full lg:w-96 min-h-[600px] bg-card border border-border rounded-lg p-5 flex flex-col space-y-5 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] self-start animate-in slide-in-from-right-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-primaryflex items-center justify-center border border-blue-100/50 shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground leading-tight">Details</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-1">Structure info</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="w-9 h-9 border border-border rounded-lg flex items-center justify-center bg-card hover:bg-muted/50 text-muted-foreground transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Designation Code and Name Row */}
                <div className="space-y-3 pb-3 border-b border-border">
                  <div className="flex items-center w-full">
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-primarytext-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm">
                      <Briefcase className="w-3 h-3" />
                      {selectedNode.designation_code}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto text-[11px] font-semibold text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Active
                    </div>
                  </div>
                  <h4 className="text-[12px] font-medium text-foreground tracking-tight leading-tight mt-3">
                    {selectedNode.designation_name}
                  </h4>
                  {selectedNode.parent_designation_id !== null && (
                    <div className="text-[12px] leading-4 text-muted-foreground font-medium flex items-center gap-1.5 mt-2">
                      <Building className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedNode.department?.department_name || "Global"}
                    </div>
                  )}
                  {selectedNode.description && (
                    <div className="text-[12px] leading-4 text-muted-foreground font-medium mt-2">
                      {selectedNode.description}
                    </div>
                  )}
                </div>

                {/* Assigned Employees */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Employees in this Role
                    </h5>
                    <span className="text-[12px] leading-4 font-bold text-foreground">
                      {selectedNode.userDetails?.length || 0}
                    </span>
                  </div>

                  {selectedNode.userDetails && selectedNode.userDetails.length > 0 ? (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                      {selectedNode.userDetails.map((user) => (
                        <div
                          key={user.user_id}
                          onClick={() => setSelectedEmployee(user)}
                          className="flex flex-col gap-2 p-3 bg-muted/50/80 border border-border/50 hover:bg-muted/50 rounded-lg transition-all duration-300 group cursor-pointer hover:border-primary-200 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 w-full">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-[12px] leading-4 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                              {user.profile_picture ? (
                                <img src={user.profile_picture} alt={`${user.first_name} ${user.last_name}`} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] leading-4 font-bold text-foreground truncate">
                                {user.first_name} {user.last_name}
                              </p>
                              {selectedNode.parent_designation_id !== null && (
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">
                                  {user.department?.department_name || "No Department"}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">
                                {user.employment_type || "Full-time"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-slate-250 rounded-lg bg-card shadow-sm">
                      <p className="text-[11px] text-muted-foreground italic">No employees assigned to this role.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            left: `${menuCoords.x}px`,
            top: `${menuCoords.y}px`,
            zIndex: 99999,
          }}
          className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-1.5 min-w-[240px] animate-in fade-in duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header/Info */}
          <div className="px-3 py-2 border-b border-border/60 text-left">
            <p className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider">
              {contextMenu.node.designation_code}
            </p>
            <p className="text-[12px] font-bold text-foreground truncate mt-0.5">
              {contextMenu.node.designation_name}
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              onClick={() => {
                setContextMenu(null);
                setShowForm(true);
                setEditingId(null);
                setName("");
                setCode("");
                setDescription("");
                setParentId(contextMenu.node.id);
                setInsertAboveId(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-primary/5 hover:text-primary rounded-lg transition-colors text-left"
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              Add Structure Below (Child)
            </button>

            <button
              onClick={() => {
                setContextMenu(null);
                setShowForm(true);
                setEditingId(null);
                setName("");
                setCode("");
                setDescription("");
                setParentId(contextMenu.node.parent_designation_id || null);
                setInsertAboveId(contextMenu.node.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-primary/5 hover:text-primary rounded-lg transition-colors text-left"
            >
              <Plus className="w-4 h-4 text-primary-555" />
              Add Structure Above (Parent)
            </button>

            <div className="h-px bg-border/60 my-1" />
            <button
              onClick={() => {
                setContextMenu(null);
                handleEditClick(contextMenu.node);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-primary/5 hover:text-primary rounded-lg transition-colors text-left"
            >
              <Pencil className="w-4 h-4 text-amber-500" />
              Edit Structure
            </button>
            <button
              onClick={() => {
                setContextMenu(null);
                setDeleteConfirm({ isOpen: true, data: contextMenu.node });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-red-660 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              Delete Structure
            </button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, data: null })}
        onConfirm={executeDelete}
        title="Delete Structure?"
        description={`Remove "${deleteConfirm.data?.designation_name}"? Assigned employees will lose this role.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={showCancelDesignationConfirm}
        title="Discard Designation Changes?"
        message="Are you sure you want to cancel? Any designation details entered in this form will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmColor="red"
        onConfirm={() => {
          setShowCancelDesignationConfirm(false);
          resetForm();
        }}
        onCancel={() => setShowCancelDesignationConfirm(false)}
      />
    </div>
  );
};
