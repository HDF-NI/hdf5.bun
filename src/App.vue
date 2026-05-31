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
      <div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
        <h3 style="margin-top: 0;">🌳 Recursive File Node Hierarchy</h3>
        
        <div v-if="loading" style="color: #2563eb;">
          Running deep structural JIT boundary visitor recursion loop...
        </div>

        <div v-else-if="rootNode">
          <h4 style="font-family: monospace; color: #1e40af; margin-bottom: 0.25rem;">File: {{ currentFileName }}</h4>
          <p style="font-size: 0.8rem; color: #6b7280; margin: 0 0 1.5rem 0;">Total nested elements: {{ totalItems }}</p>
          
          <!-- Inject custom functional block wrapper serving as our main entry node -->
          <div style="font-family: monospace;">
            <TreeNodeItem :node="rootNode" />
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
import { ref, onMounted, defineComponent, h } from "vue";

const filesList = ref([]);
const selectedFile = ref(null);
const rootNode = ref(null);
const totalItems = ref(0);
const currentFileName = ref("");
const loading = ref(false);

// 🛠️ INLINE RECURSIVE SUB-COMPONENT SCHEMA
// This component renders itself dynamically if a Group has sub-children nodes
const TreeNodeItem = defineComponent({
  name: "TreeNodeItem",
  props: { node: Object },
  setup(props) {
    const isExpanded = ref(true);
    const toggle = () => { isExpanded.value = !isExpanded.value; };

    return () => {
      const { name, type, children } = props.node;
      const isGroup = type === "Group";
      const icon = isGroup ? "📁" : "📊";
      
      return h("div", { style: { marginLeft: "14px", marginTop: "4px" } }, [
        // Node Heading Line
        h("div", { 
          style: { cursor: isGroup ? "pointer" : "default", display: "flex", alignItems: "center", padding: "2px 0" },
          onClick: isGroup ? toggle : null
        }, [
          h("span", { style: { marginRight: "6px" } }, isGroup ? (isExpanded.value ? "▼ " + icon : "▶ " + icon) : icon),
          h("span", { style: { fontWeight: isGroup ? "6xl" : "normal", color: isGroup ? "#1e293b" : "#4b5563" } }, name),
          h("span", { style: { fontSize: "10px", marginLeft: "8px", color: "#9ca3af", background: "#f3f4f6", padding: "1px 4px", borderRadius: "3px" } }, type)
        ]),
        // Recursive Child Render Step
        isGroup && isExpanded.value && children && children.length > 0
          ? h("div", { style: { borderLeft: "1px dashed #cbd5e1", marginLeft: "6px" } }, 
              children.map(child => h(TreeNodeItem, { node: child, key: child.fullPath }))
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
</script>
