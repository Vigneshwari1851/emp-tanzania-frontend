import React, { useState, useEffect, useRef } from "react";
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useLocation } from "react-router-dom";
import {
  getDepartments,
  deleteDepartment,
  type Department,
} from "../services/departments";
import {
  Building,
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
  Maximize2,
  RotateCcw,
  Users,
  Search,
  User,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/shared/components/ui/ConfirmationDialog";

interface DepartmentNode extends Department {
  sub_departments: DepartmentNode[];
}

interface DepartmentHierarchyViewProps {
  isReadOnly: boolean;
  hideSidebar?: boolean;
  demoBlank?: boolean;
}

export const DepartmentHierarchyView: React.FC<DepartmentHierarchyViewProps> = ({
  isReadOnly,
  hideSidebar = false,
  demoBlank = false,
}) => {
  const inlineTransformRef = useRef<any>(null);
  const modalTransformRef = useRef<any>(null);

  const navigate = useOrgNavigate();
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [flatDepartments, setFlatDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState<"chart" | "list">("chart");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DepartmentNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: DepartmentNode;
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

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    data: DepartmentNode | null;
  }>({ isOpen: false, data: null });

  // Tracks list-tree expand/collapse per node id
  const [expandedListNodes, setExpandedListNodes] = useState<Record<number, boolean>>({});

  const loc = useLocation();
  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);

  useEffect(() => {
    const state = loc.state as { createdDeptIds?: number[] } | null;
    if (state?.createdDeptIds?.length) {
      setNewlyCreatedId(state.createdDeptIds[0]);
      window.history.replaceState({}, document.title);
    }
  }, [loc.state]);

  useEffect(() => {
    if (newlyCreatedId === null) return;
    const timer = setTimeout(() => setNewlyCreatedId(null), 3000);
    return () => clearTimeout(timer);
  }, [newlyCreatedId]);

  useEffect(() => {
    if (newlyCreatedId === null) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-node-id="${newlyCreatedId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [newlyCreatedId]);

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

  const buildDepartmentTree = (flatDepts: Department[]): DepartmentNode[] => {
    const map = new Map<number, DepartmentNode>();
    const roots: DepartmentNode[] = [];

    flatDepts.forEach((dept) => {
      map.set(dept.id, { ...dept, sub_departments: [] });
    });

    flatDepts.forEach((dept) => {
      const node = map.get(dept.id)!;
      if (dept.parent_department_id && map.has(dept.parent_department_id)) {
        const parent = map.get(dept.parent_department_id)!;
        parent.sub_departments.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = demoBlank ? [] : await getDepartments();
      setFlatDepartments(data);
      const tree = buildDepartmentTree(data);
      if (data.length > 0) {
        const totalHeadcount = data.reduce((acc, d) => acc + (d.headcount || 0), 0);
        const ceoNode: DepartmentNode = {
          id: -999,
          department_name: "CEO / Managing Director",
          department_code: "CEO / MD",
          description: "Executive Office & Board of Directors",
          parent_department_id: null,
          headcount: totalHeadcount,
          sub_departments: tree,
          teams: [],
        };
        setDepartments([ceoNode]);
      } else {
        setDepartments([]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [demoBlank]);

  const executeDelete = async () => {
    if (!deleteConfirm.data) return;
    try {
      await deleteDepartment(deleteConfirm.data.id);
      toast.success("Department deleted successfully!");
      await loadData();
      if (selectedNode?.id === deleteConfirm.data.id) {
        setSelectedNode(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete department");
    } finally {
      setDeleteConfirm({ isOpen: false, data: null });
    }
  };

  const doesNodeMatchSearch = (node: DepartmentNode, query: string): boolean => {
    if (!query) return false;
    const q = query.toLowerCase();
    if (node.department_name.toLowerCase().includes(q)) return true;
    if (node.department_code.toLowerCase().includes(q)) return true;
    if (node.manager?.name?.toLowerCase().includes(q)) return true;
    if (node.manager?.username?.toLowerCase().includes(q)) return true;
    return false;
  };

  const handleEditClick = () => {
    let targetId: number | null = null;
    if (selectedNode && selectedNode.id !== -999) {
      targetId = selectedNode.id;
    } else {
      const realDepts = flatDepartments.filter(d => d.id !== -999);
      if (realDepts.length > 0) {
        targetId = realDepts[0].id;
      }
    }

    if (!targetId) {
      toast.error("Please select a department from the hierarchy to edit.");
      return;
    }
    navigate(`/org-setup/edit-department/${targetId}`);
  };

  const renderDepartmentNode = (node: DepartmentNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.sub_departments && node.sub_departments.length > 0;
    // Default expanded=true for all nodes; use the map to override
    const isExpanded = expandedListNodes[node.id] !== false;

    return (
      <div key={node.id}>
        <div
          data-node-id={node.id}
          className={`flex items-center gap-2.5 p-2.5 bg-card border hover:border-primary-300 hover:bg-primary/5 rounded-sm transition-all duration-150 relative group cursor-pointer ${
            newlyCreatedId === node.id
              ? "border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/40"
              : selectedNode?.id === node.id
                ? "border-primary-650 bg-primary/10 shadow-sm ring-1 ring-primary/10"
                : "border-border"
          }`}
          onClick={() => setSelectedNode(node)}
           onContextMenu={(e) => {
            if (isReadOnly) return;
            e.preventDefault();
            e.stopPropagation();
            setMenuCoords({ x: e.clientX, y: e.clientY });
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              node,
            });
          }}
        >
          {depth > 0 && (
            <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-[20px] h-[2px] bg-primary-150" />
          )}

          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedListNodes(prev => ({ ...prev, [node.id]: !isExpanded }));
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0 border-none bg-transparent"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-primary-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          <div className="w-7 h-7 bg-primary/10 text-primary rounded flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary-100">
            {node.department_code.slice(0, 3)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground text-[14px] leading-5 truncate">
                {node.department_name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border shrink-0">
                {node.department_code}
              </span>
            </div>
            {node.manager && (
              <p className="text-[12px] leading-4 text-muted-foreground mt-0.5 truncate">
                Manager: {node.manager.name || node.manager.username}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[12px] leading-4 text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full whitespace-nowrap">
              {node.headcount || 0} {node.headcount === 1 ? "person" : "people"}
            </span>
            {!isReadOnly && node.id !== -999 && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => navigate(`/org-setup/edit-department/${node.id}`)}
                  className="p-1.5 hover:bg-primary/10 text-primary-500 hover:text-primary rounded transition-colors border-none bg-transparent"
                  title="Edit Department"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ isOpen: true, data: node })}
                  className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors border-none bg-transparent"
                  title="Delete Department"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-primary-100 pl-5 ml-4 mt-2 space-y-2">
            {node.sub_departments.map((child) => renderDepartmentNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFlowchartNode = (node: DepartmentNode): React.ReactNode => {
    const hasChildren = node.sub_departments && node.sub_departments.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const isMatched = searchQuery ? doesNodeMatchSearch(node, searchQuery) : false;

    // CEO/MD special styles
    const cardClassName = node.id === -999
      ? isSelected
        ? "bg-gradient-to-b from-[#EEF2FF] to-[#E0E7FF] dark:bg-card dark:bg-none border-[#4F46E5] dark:border-primary-600 shadow-[0_12px_40px_rgba(79,70,229,0.25)] ring-4 ring-[#4F46E5]/15 scale-105 z-10"
        : "bg-gradient-to-b from-white to-[#F8FAFC] dark:bg-card dark:bg-none border-[#A5B4FC] dark:border-primary-700 shadow-[0_10px_30px_rgba(79,70,229,0.08)] hover:shadow-[0_14px_35px_rgba(79,70,229,0.15)] hover:border-[#6366F1] dark:hover:border-primary-500 hover:-translate-y-1"
      : newlyCreatedId === node.id
      ? "bg-card border-emerald-400 shadow-[0_12px_40px_rgb(34,197,94,0.2)] ring-4 ring-emerald-500/20 scale-105 z-10"
      : isSelected
      ? "bg-card border-primary-500 shadow-[0_12px_40px_rgb(99,102,241,0.2)] ring-4 ring-primary/10 scale-105 z-10"
      : isMatched
      ? "bg-card border-amber-400 shadow-[0_12px_40px_rgb(251,191,36,0.2)] ring-4 ring-amber-400/20 scale-105 z-10"
      : "bg-card/90 backdrop-blur-sm border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-primary-300 hover:-translate-y-1";

    const badgeClassName = node.id === -999
      ? "text-primary-700 dark:text-primary-300 bg-primary-100/80 dark:bg-primary-900/40 border-primary-200 dark:border-primary-700"
      : isSelected
      ? "text-primary bg-primary/10 border-primary-150"
      : isMatched
      ? "text-amber-700 bg-amber-100 border-amber-200"
      : "text-muted-foreground bg-muted border-border/80";

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Card */}
        <div
          onClick={() => setSelectedNode(node)}
          onContextMenu={(e) => {
            if (isReadOnly) return;
            e.preventDefault();
            e.stopPropagation();
            setMenuCoords({ x: e.clientX, y: e.clientY });
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              node,
            });
          }}
          data-node-id={node.id}
          /* Added hierarchy-node class to exclude from panning/dragging triggers */
          className={`relative p-4 border rounded-lg flex flex-col items-center min-w-[200px] max-w-[260px] text-center transition-all duration-300 cursor-pointer hierarchy-node ${cardClassName}`}
        >
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider shadow-sm flex items-center gap-1 ${badgeClassName}`}>
            {node.id === -999 && "👑"} {node.department_code}
          </span>
          <span className={`font-extrabold text-foreground text-[14px] leading-5 mt-2.5 leading-tight ${node.id === -999 ? "text-primary-950 dark:text-primary-300 text-[15px]" : ""}`}>
            {node.department_name}
          </span>
          {node.manager && (
            <div className="mt-2 text-[11px] font-medium text-muted-foreground truncate max-w-full">
              Manager: <span className="font-semibold text-foreground">{node.manager.name || node.manager.username}</span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground font-bold mt-2.5 tracking-wide uppercase">
            {node.headcount || 0} {node.headcount === 1 ? "Member" : "Members"}
          </span>
        </div>

        {/* Children connector lines */}
        {hasChildren && (
          <div className="flex flex-col items-center w-full">
            <div className="w-[3px] h-8 bg-slate-200/80 dark:bg-border rounded-full" />
            <div className="flex gap-8 relative items-start">
              {node.sub_departments.map((child, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === node.sub_departments.length - 1;
                const isOnly = node.sub_departments.length === 1;

                return (
                  <div key={child.id} className="relative flex flex-col items-center">
                    {!isOnly && (
                      <div
                        className={`absolute top-0 h-[3px] bg-slate-200/80 dark:bg-border z-10 ${
                          isFirst ? "left-1/2 right-0 rounded-l-full" : isLast ? "left-0 right-1/2 rounded-r-full" : "left-0 right-0"
                        }`}
                      />
                    )}
                    <div className="w-[3px] h-8 bg-slate-200/80 dark:bg-border shrink-0 rounded-full" />
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

  const filteredTree = searchQuery
    ? flatDepartments.filter((d) =>
        d.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.department_code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary-500" />
          <span className="text-[14px] leading-5 font-medium text-foreground">
            Organisation Hierarchy View
          </span>
          {flatDepartments.length > 0 && (
            <span className="text-[12px] leading-4 font-semibold bg-primary/10 text-primary border border-primary-100 px-2 py-0.5 rounded-full">
              {flatDepartments.length} Departments
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 xl:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search department or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all bg-card"
            />
          </div>

          <div className="flex items-center p-1 bg-muted/80 rounded-lg border border-border shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => setViewType("chart")}
              className={`px-3 py-1.5 text-[12px] leading-4 font-semibold rounded-lg transition-all ${
                viewType === "chart"
                  ? "bg-card text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-200"
              }`}
            >
              Org Chart
            </button>
            <button
              type="button"
              onClick={() => setViewType("list")}
              className={`px-3 py-1.5 text-[12px] leading-4 font-semibold rounded-lg transition-all ${
                viewType === "list"
                  ? "bg-card text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-200"
              }`}
            >
              List Tree
            </button>
          </div>

          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={handleEditClick}
              className="h-[36px] gap-2 font-bold border-border rounded-lg text-foreground hover:bg-muted hover:text-primary hover:border-primary-300 shadow-sm shrink-0"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
              Edit
            </Button>
          )}
          {!isReadOnly && (
            <Button
              type="button"
              onClick={() => navigate("/org-setup/add-department")}
              className="h-[36px] gap-2 font-bold bg-primary hover:bg-[#4548D4] text-white rounded-lg shadow-sm shrink-0 border-none text-[12px]"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </Button>
          )}
        </div>
      </div>

      {/* Main Canvas area */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full p-4">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            </div>
          ) : flatDepartments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full overflow-hidden">
              {/* Hero banner */}
              <div className="bg-gradient-to-r from-primary-50 via-white to-primary-50 border-b border-border px-8 py-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-primary-100">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-[20px] font-bold text-foreground tracking-tight">Build Your Organisation Hierarchy</h3>
                <p className="text-muted-foreground text-[13px] mt-1.5 leading-relaxed max-w-lg mx-auto">
                  Follow the 4-step blueprint below to configure your organization from scratch — starting with the executive leadership layer.
                </p>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Step-by-step guide */}
                  <div className="lg:col-span-7 space-y-3">

                    {/* STEP 1: Executive Management */}
                    <div className="rounded-xl border-2 border-primary-300 bg-primary-50/60 p-5 relative overflow-hidden">
                      <div className="absolute -top-3 -right-3 text-[60px] opacity-5 select-none">👑</div>
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary-600 text-white font-extrabold text-[13px] flex items-center justify-center shrink-0 shadow-sm">
                          1
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-primary-900 text-[14px]">Define Executive Management Roles</h4>
                            <span className="text-[10px] font-bold bg-primary-600 text-white px-2 py-0.5 rounded-full">Start Here First</span>
                          </div>
                          <p className="text-[12px] text-primary-700 mt-1.5 leading-relaxed">
                            Before creating departments, define your top-level management roles — <strong>CEO, MD, CFO, COO</strong>, etc. — using the <strong>Job Hierarchy</strong> section. These are global designations that sit above all departments.
                          </p>
                          <div className="mt-3 bg-white/70 dark:bg-card/70 border border-primary-200 dark:border-primary-800 rounded-lg p-3 text-[11px] text-primary-800 dark:text-primary-300 leading-relaxed">
                            💡 <strong>Why first?</strong> Designations define the reporting structure. When you later add employees as department heads or managers, you assign them a designation (e.g. CEO) that determines their position in the org chart.
                          </div>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => navigate("/org-setup/job-hierarchy-setup")}
                              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary-600 hover:text-primary-800 underline underline-offset-2 transition-colors border-none bg-transparent cursor-pointer"
                            >
                              <Briefcase className="w-3.5 h-3.5" /> Go to Job Hierarchy →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* STEP 2 */}
                    <div className="flex gap-4 p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-600 font-bold text-[13px] flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-[14px]">Create the Top-Level Department</h4>
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                          Create a root department like <strong>Corporate Office</strong> or <strong>Executive Office</strong>. Leave "Parent Department" as None. This becomes the top node under the CEO/MD in the org chart.
                        </p>
                      </div>
                    </div>

                    {/* STEP 3 */}
                    <div className="flex gap-4 p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-600 font-bold text-[13px] flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-[14px]">Add Operating Departments</h4>
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                          Add functional departments like <strong>Engineering, Sales, Finance, HR</strong>, etc. Link each to its parent department to establish the reporting hierarchy.
                        </p>
                      </div>
                    </div>

                    {/* STEP 4 */}
                    <div className="flex gap-4 p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-600 font-bold text-[13px] flex items-center justify-center shrink-0">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-[14px]">Assign Managers & Teams</h4>
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                          Set a department manager for each unit and define sub-teams. Managers will be auto-connected to the hierarchy once their employee profiles are assigned a designation.
                        </p>
                      </div>
                    </div>

                    {!isReadOnly && (
                      <div className="pt-2 flex items-center gap-3 flex-wrap">
                        <Button
                          onClick={() => navigate("/org-setup/add-department")}
                          className="bg-primary hover:bg-[#4548D4] text-white px-5 h-10 gap-2 font-bold shadow-md rounded-[7px] border-none text-[13px]"
                        >
                          <Plus className="w-4 h-4" /> Add First Department
                        </Button>
                        <button
                          type="button"
                          onClick={() => navigate("/org-setup/job-hierarchy-setup")}
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground border border-border bg-card rounded-[7px] px-5 h-10 transition-all hover:border-primary-300"
                        >
                          <Briefcase className="w-4 h-4" /> Manage Designations
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Visual mock org chart */}
                  <div className="lg:col-span-5 border border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-6 flex flex-col items-center justify-start min-h-[420px] relative overflow-hidden">
                    <span className="absolute top-3 right-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-white dark:bg-card border border-border px-2 py-0.5 rounded shadow-sm">
                      Preview
                    </span>
                    <p className="text-[11px] text-muted-foreground font-semibold mb-5 mt-1">How your hierarchy will look:</p>

                    <div className="flex flex-col items-center w-full space-y-1">
                      {/* Designation badges */}
                      <div className="flex gap-2 mb-3 flex-wrap justify-center">
                        <span className="text-[9px] font-extrabold px-2.5 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full border border-primary-200 dark:border-primary-700 uppercase tracking-wider">👑 CEO</span>
                        <span className="text-[9px] font-extrabold px-2.5 py-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full border border-violet-200 dark:border-violet-700 uppercase tracking-wider">CFO</span>
                        <span className="text-[9px] font-extrabold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700 uppercase tracking-wider">COO</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium mb-3">← Step 1: Define these first</p>

                      {/* CEO Node */}
                      <div className="bg-gradient-to-b from-[#EEF2FF] to-[#E0E7FF] dark:from-primary-900/40 dark:to-primary-950/60 border-[#A5B4FC] dark:border-primary-700 shadow-sm rounded-lg p-3 w-44 text-center border">
                        <span className="text-[9px] font-extrabold px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full border border-primary-200 dark:border-primary-700 uppercase tracking-wider flex items-center justify-center gap-1 w-fit mx-auto">
                          👑 CEO / MD
                        </span>
                        <div className="font-extrabold text-[#1E1B4B] dark:text-primary-300 text-[12px] mt-1.5">Executive Office</div>
                        <div className="text-[9px] text-primary-400 dark:text-primary-400 mt-0.5">Virtual root node</div>
                      </div>

                      {/* Connection Line */}
                      <div className="w-[2px] h-5 bg-primary-200" />

                      {/* Corporate Dept */}
                      <div className="bg-white dark:bg-card border border-primary-200 dark:border-primary-800 shadow-sm rounded-lg p-2.5 w-40 text-center">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded border border-primary-100">CORP</span>
                        <div className="font-bold text-foreground text-[11px] mt-1">Corporate Office</div>
                        <div className="text-[9px] text-muted-foreground">← Step 2</div>
                      </div>

                      <div className="w-[2px] h-5 bg-slate-200" />

                      {/* Operating depts */}
                      <div className="flex gap-3 items-start relative">
                        <div className="absolute top-0 left-[30px] right-[30px] h-[2px] bg-slate-200" />
                        <div className="flex flex-col items-center">
                          <div className="w-[2px] h-3 bg-slate-200" />
                          <div className="bg-white dark:bg-card border border-border shadow-sm rounded-md p-2 w-24 text-center">
                            <span className="text-[8px] font-bold text-muted-foreground">ENG</span>
                            <div className="font-semibold text-foreground text-[10px] mt-0.5">Engineering</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-[2px] h-3 bg-slate-200" />
                          <div className="bg-white dark:bg-card border border-border shadow-sm rounded-md p-2 w-24 text-center">
                            <span className="text-[8px] font-bold text-muted-foreground">SAL</span>
                            <div className="font-semibold text-foreground text-[10px] mt-0.5">Sales</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium mt-1">← Step 3: Add departments</p>
                    </div>
                  </div>
                </div>
              </div>
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
                        <div className="hierarchy-tree-content flex gap-16 justify-center items-start px-8">
                          {departments.map((rootNode) => renderFlowchartNode(rootNode))}
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
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-primary-500" />
                        <h3 className="text-base font-semibold text-foreground">Organisation Hierarchy Chart</h3>
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
                              <div className="hierarchy-tree-content flex gap-16 justify-center items-start px-16">
                                {departments.map((rootNode) => renderFlowchartNode(rootNode))}
                              </div>
                            </TransformComponent>
                          </>
                        )}
                      </TransformWrapper>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {departments.map((rootNode) => renderDepartmentNode(rootNode, 0))}
            </div>
          )}
        </div>

        {/* Sidebar basic detail panel */}
        {selectedNode && !hideSidebar && (
          <div className="w-full lg:w-96 min-h-[600px] bg-card border border-border rounded-lg p-5 flex flex-col space-y-5 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] self-start animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-primaryflex items-center justify-center border border-blue-100/50 shrink-0">
                  {selectedNode.id === -999 ? <Briefcase className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-foreground leading-tight">
                    {selectedNode.id === -999 ? "Executive Office" : "Department Info"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1">
                    {selectedNode.id === -999 ? "Top leadership & board" : "Details & Analytics"}
                  </p>
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
            
            <div className="space-y-3 pb-3 border-b border-border">
              <div className="flex items-center w-full">
                <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-primarytext-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm">
                  {selectedNode.id === -999 ? "👑 " : ""}{selectedNode.department_code}
                </span>
                <div className="flex items-center gap-1.5 ml-auto text-[11px] font-semibold text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active
                </div>
              </div>
              <h4 className="text-[13px] font-bold text-foreground tracking-tight leading-tight mt-3">
                {selectedNode.department_name}
              </h4>
              {selectedNode.description && (
                <p className="text-[12px] leading-4 text-muted-foreground mt-2">
                  {selectedNode.description}
                </p>
              )}
            </div>

            {/* Manager and Budget Bento Grid */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border">
              <div className="bg-muted/50 p-3 rounded-lg flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground" /> Manager
                </span>
                <span className="text-[12px] font-bold text-foreground truncate">
                  {selectedNode.id === -999 ? "Board of Directors" : selectedNode.manager?.name || selectedNode.manager?.username || "None Assigned"}
                </span>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-muted-foreground" /> Annual Budget
                </span>
                <span className="text-[12px] font-bold text-foreground truncate">
                  {selectedNode.id === -999 ? "Enterprise-wide" : selectedNode.annual_budget ? `$${parseFloat(selectedNode.annual_budget.toString()).toLocaleString()}` : "Not Set"}
                </span>
              </div>
            </div>

            {/* Teams or Sub-departments */}
            {selectedNode.id === -999 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Direct Report Departments
                  </h5>
                  <span className="text-[12px] leading-4 font-bold text-foreground">
                    {selectedNode.sub_departments?.length || 0}
                  </span>
                </div>
                {selectedNode.sub_departments && selectedNode.sub_departments.length > 0 ? (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedNode.sub_departments.map((dept) => (
                      <div 
                        key={dept.id}
                        onClick={() => setSelectedNode(dept)}
                        className="p-3 bg-muted/50 border border-border/50 hover:bg-muted/70 hover:border-primary-200 transition-all rounded-lg flex items-center justify-between cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] leading-4 font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {dept.department_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            Code: {dept.department_code}
                          </p>
                        </div>
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {dept.headcount || 0} members
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 border border-dashed border-slate-250 rounded-lg bg-card">
                    <p className="text-[11px] text-muted-foreground italic">No departments linked.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Teams in Department
                  </h5>
                  <span className="text-[12px] leading-4 font-bold text-foreground">
                    {selectedNode.teams?.length || 0}
                  </span>
                </div>
                
                {selectedNode.teams && selectedNode.teams.length > 0 ? (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {selectedNode.teams.map((team) => (
                      <div 
                        key={team.id}
                        className="p-3 bg-muted/50 border border-border/50 rounded-lg flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] leading-4 font-semibold text-foreground truncate">
                            {team.team_name}
                          </p>
                          {team.team_lead && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              Lead: {team.team_lead.full_name || team.team_lead.username}
                            </p>
                          )}
                        </div>
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {team.member_count || team.members?.length || 0} members
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 border border-dashed border-slate-250 rounded-lg bg-card">
                    <p className="text-[11px] text-muted-foreground italic">No teams defined.</p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons inside detail panel for edit/delete */}
            {!isReadOnly && selectedNode.id !== -999 && (
              <div className="flex gap-2 pt-2 border-t border-border mt-auto">
                <Button
                  onClick={() => navigate(`/org-setup/edit-department/${selectedNode.id}`)}
                  variant="outline"
                  className="flex-1 h-9 text-[12px] gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Department
                </Button>
                <Button
                  onClick={() => setDeleteConfirm({ isOpen: true, data: selectedNode })}
                  variant="danger-outline"
                  size="sm"
                  className="h-9 w-9 !p-0 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-650 border border-red-200"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
              {contextMenu.node.department_code}
            </p>
            <p className="text-[12px] font-bold text-foreground truncate mt-0.5">
              {contextMenu.node.department_name}
            </p>
          </div>
          
          <div className="py-1 space-y-0.5">
            <button
              onClick={() => {
                setContextMenu(null);
                navigate("/org-setup/add-department", {
                  state: {
                    defaultParentId: contextMenu.node.id === -999 ? "None" : contextMenu.node.id,
                    from: loc.pathname + loc.search
                  }
                });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-primary/5 hover:text-primary rounded-lg transition-colors text-left"
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              Add Department Below (Child)
            </button>

            {contextMenu.node.id !== -999 && (
              <button
                onClick={() => {
                  setContextMenu(null);
                  navigate("/org-setup/add-department", {
                    state: {
                      defaultParentId: contextMenu.node.parent_department_id || "None",
                      insertAboveDeptId: contextMenu.node.id,
                      from: loc.pathname + loc.search
                    }
                  });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-primary/5 hover:text-primary rounded-lg transition-colors text-left"
              >
                <Plus className="w-4 h-4 text-primary-550" />
                Add Department Above (Parent)
              </button>
            )}

            {!isReadOnly && contextMenu.node.id !== -999 && (
              <>
                <div className="h-px bg-border/60 my-1" />
                <button
                  onClick={() => {
                    setContextMenu(null);
                    navigate(`/org-setup/edit-department/${contextMenu.node.id}`);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-foreground hover:bg-primary/5 hover:text-primary rounded-lg transition-colors text-left"
                >
                  <Pencil className="w-4 h-4 text-amber-500" />
                  Edit Department
                </button>
                <button
                  onClick={() => {
                    setContextMenu(null);
                    setDeleteConfirm({ isOpen: true, data: contextMenu.node });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-red-660 hover:bg-red-700 rounded-lg transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Delete Department
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, data: null })}
        onConfirm={executeDelete}
        title="Delete Department?"
        description={`Are you sure you want to delete "${deleteConfirm.data?.department_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
