<template>
  <div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 1000px; margin: 0 auto; color: #1f2937;">
    <h1>📊 Deep HDF5 Hierarchy Explorer</h1>
    <p style="color: #6b7280;">Recursive deep schema traversal using native H5Lvisit via Bun JIT FFI layer.</p>

    <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; margin-top: 2rem;">
      
      <!-- Files Selector Panel -->
      <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafafa; height: fit-content;">
        <h3 style="margin-top: 0;">📁 File Inventory</h3>
        <ul style="list-style: none; padding-left: 0;">
          <li v-for="file in filesList" :key="file.name" 
              @click="loadDeepStructure(file)"
              style="padding: 0.6rem; margin-bottom: 0.4rem; border-radius: 6px; cursor: pointer; border: 1px solid transparent; background: white;"
              :style="selectedFile?.name === file.name ? { borderColor: '#3b82f6', background: '#eff6ff' } : {}">
            <div style="font-weight: 600; font-size: 0.9rem;">📦 {{ file.name }}</div>
          </li>
        </ul>
      </div>

      <!-- Recursive Tree Display Panel -->
      <div ref="treePanelRef" style="position: relative; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
        <h3 style="margin-top: 0;">🌳 Recursive File Node Hierarchy</h3>
        
        <div v-if="loading" style="color: #2563eb;">
          Running deep structural JIT boundary visitor recursion loop...
        </div>

        <div v-else-if="rootNode">
          <h4 style="font-family: monospace; color: #1e40af; margin-bottom: 0.25rem;">File: {{ currentFileName }}</h4>
          <p style="font-size: 0.8rem; color: #6b7280; margin: 0 0 1.5rem 0;">Total nested elements: {{ totalItems }}</p>
          
          <!-- Inject custom functional block wrapper serving as our main entry node -->
          <div style="font-family: monospace;">
            <TreeNodeItem :node="rootNode" :onNodeHover="handleNodeHover" :onNodeLeave="schedulePopoverHide" />
          </div>

          <div
            v-if="popoverVisible && hoveredNode"
            id="node-attr-popover"
            role="tooltip"
            :style="popoverStyle"
            @mouseenter="handlePopoverEnter"
            @mouseleave="handlePopoverLeave"
          >
            <div style="font-size: 11px; color: #0f172a; font-weight: 700; margin-bottom: 4px;">
              {{ hoveredNode.name || '/' }}
            </div>
            <div style="font-size: 10px; color: #334155; margin-bottom: 6px;">
              {{ hoveredNode.type }}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 8px; word-break: break-all;">
              {{ hoveredNode.fullPath }}
            </div>
            <div style="font-size: 10px; color: #1e293b; margin-bottom: 6px;">
              Attributes: {{ hoveredNode.attributes?.length || 0 }}
            </div>

            <div
              v-if="hoveredNode.attributes && hoveredNode.attributes.length > 0"
              style="display: grid; gap: 6px; max-height: 180px; overflow-y: auto; padding-right: 4px;"
            >
              <div
                v-for="(attr, idx) in hoveredNode.attributes"
                :key="`${hoveredNode.fullPath}-attr-${idx}`"
                style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; background: #f8fafc;"
              >
                <div style="font-size: 10px; color: #0f172a; font-weight: 600;">{{ attr.name }}</div>
                <div style="font-size: 9px; color: #475569; margin: 2px 0 4px 0;">{{ attr.valueType }}</div>
                <div style="font-size: 10px; color: #1e293b; word-break: break-word;">{{ formatAttrValue(attr.value) }}</div>
              </div>
            </div>

            <div v-else style="font-size: 10px; color: #64748b;">
              No attributes on this node.
            </div>
          </div>
        </div>

        <div v-else style="color: #9ca3af; text-align: center; padding: 3rem; border: 2px dashed #f3f4f6;">
          Select a multi-layered HDF5 target data block to view recursive trees.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, defineComponent, h } from "vue";

const filesList = ref([]);
const selectedFile = ref(null);
const rootNode = ref(null);
const totalItems = ref(0);
const currentFileName = ref("");
const loading = ref(false);
const treePanelRef = ref(null);
const hoveredNode = ref(null);
const popoverVisible = ref(false);
const popoverStyle = ref({});
const isPopoverHovered = ref(false);

let showTimer = null;
let hideTimer = null;

const clearHoverTimers = () => {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

const formatAttrValue = (value) => {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    const maxPreview = 8;
    const preview = value.slice(0, maxPreview).join(", ");
    return value.length > maxPreview ? `[${preview}, ...]` : `[${preview}]`;
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  }
  return String(value);
};

const computePopoverPosition = (event) => {
  const panelRect = treePanelRef.value?.getBoundingClientRect();
  if (!panelRect) return;

  const rowRect = event.currentTarget?.getBoundingClientRect?.();
  if (!rowRect) return;

  const tooltipWidth = 320;
  const offset = 10;

  let left = rowRect.right + offset;
  let top = rowRect.top;

  if (left + tooltipWidth > window.innerWidth - 12) {
    left = rowRect.left - tooltipWidth - offset;
  }
  if (left < 12) {
    left = 12;
  }
  if (top + 220 > window.innerHeight - 12) {
    top = Math.max(12, window.innerHeight - 232);
  }

  popoverStyle.value = {
    position: "fixed",
    left: `${left}px`,
    top: `${top}px`,
    width: "320px",
    zIndex: "40",
    border: "1px solid #dbeafe",
    borderRadius: "10px",
    background: "white",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
    padding: "10px",
    pointerEvents: "auto"
  };
};

const handleNodeHover = (node, event) => {
  clearHoverTimers();
  hoveredNode.value = node;
  computePopoverPosition(event);

  showTimer = setTimeout(() => {
    popoverVisible.value = true;
    showTimer = null;
  }, 140);
};

const schedulePopoverHide = () => {
  clearHoverTimers();
  hideTimer = setTimeout(() => {
    if (isPopoverHovered.value) {
      hideTimer = null;
      return;
    }
    popoverVisible.value = false;
    hoveredNode.value = null;
    hideTimer = null;
  }, 260);
};

const handlePopoverEnter = () => {
  isPopoverHovered.value = true;
  clearHoverTimers();
};

const handlePopoverLeave = () => {
  isPopoverHovered.value = false;
  schedulePopoverHide();
};

const closePopover = () => {
  clearHoverTimers();
  isPopoverHovered.value = false;
  popoverVisible.value = false;
  hoveredNode.value = null;
};

const handleKeydown = (event) => {
  if (event.key === "Escape") {
    closePopover();
  }
};

// 🛠️ INLINE RECURSIVE SUB-COMPONENT SCHEMA
// This component renders itself dynamically if a Group has sub-children nodes
const TreeNodeItem = defineComponent({
  name: "TreeNodeItem",
  props: {
    node: Object,
    onNodeHover: Function,
    onNodeLeave: Function
  },
  setup(props) {
    const isExpanded = ref(true);
    const isFocused = ref(false);
    const toggle = () => { isExpanded.value = !isExpanded.value; };

    return () => {
      const { name, type, children } = props.node;
      const isGroup = type === "Group";
      const icon = isGroup ? "📁" : "📊";
      
      return h("div", { style: { marginLeft: "14px", marginTop: "4px" } }, [
        // Node Heading Line
        h("div", { 
          style: {
            cursor: isGroup ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            padding: "2px 4px",
            borderRadius: "4px",
            outline: "none",
            background: isFocused.value ? "#eff6ff" : "transparent",
            boxShadow: isFocused.value ? "0 0 0 2px #93c5fd" : "none"
          },
          tabIndex: 0,
          role: isGroup ? "button" : "treeitem",
          "aria-label": `${name} ${type}`,
          "aria-describedby": popoverVisible.value && hoveredNode.value?.fullPath === props.node?.fullPath ? "node-attr-popover" : undefined,
          onClick: isGroup ? toggle : null,
          onMouseenter: (event) => props.onNodeHover?.(props.node, event),
          onMousemove: (event) => props.onNodeHover?.(props.node, event),
          onMouseleave: () => props.onNodeLeave?.(),
          onFocus: (event) => {
            isFocused.value = true;
            props.onNodeHover?.(props.node, event);
          },
          onBlur: () => {
            isFocused.value = false;
            props.onNodeLeave?.();
          },
          onKeydown: (event) => {
            if (isGroup && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              toggle();
            }
          }
        }, [
          h("span", { style: { marginRight: "6px" } }, isGroup ? (isExpanded.value ? "▼ " + icon : "▶ " + icon) : icon),
          h("span", { style: { fontWeight: isGroup ? "6xl" : "normal", color: isGroup ? "#1e293b" : "#4b5563" } }, name),
          h("span", { style: { fontSize: "10px", marginLeft: "8px", color: "#9ca3af", background: "#f3f4f6", padding: "1px 4px", borderRadius: "3px" } }, type)
        ]),
        // Recursive Child Render Step
        isGroup && isExpanded.value && children && children.length > 0
          ? h("div", { style: { borderLeft: "1px dashed #cbd5e1", marginLeft: "6px" } }, 
              children.map(child => h(TreeNodeItem, {
                node: child,
                key: child.fullPath,
                onNodeHover: props.onNodeHover,
                onNodeLeave: props.onNodeLeave
              }))
            )
          : null
      ]);
    };
  }
});

const fetchFiles = async () => {
  try {
    const res = await fetch("/api/files");
    const data = await res.json();
    if (data.success) filesList.value = data.files;
  } catch (err) { console.error(err); }
};

const loadDeepStructure = async (file) => {
  selectedFile.value = file;
  loading.value = true;
  rootNode.value = null;

  try {
    const res = await fetch(`/api/structure-deep?path=${encodeURIComponent(file.absolutePath)}`);
    const data = await res.json();
    if (data.success) {
      rootNode.value = data.rootNode;
      totalItems.value = data.itemCount;
      currentFileName.value = data.fileName;
    } else {
      alert(data.message);
    }
  } catch (err) { console.error(err); }
  finally { loading.value = false; }
};

onMounted(() => { fetchFiles(); });
onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  clearHoverTimers();
  window.removeEventListener("keydown", handleKeydown);
});
</script>
