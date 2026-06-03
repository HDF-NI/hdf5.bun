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
          <p v-if="selectionStatus" style="font-size: 0.78rem; color: #0f766e; margin: 0 0 1rem 0;">{{ selectionStatus }}</p>

          <details v-if="lastSelectionRequest" style="margin: 0 0 1rem 0; border: 1px solid #dbeafe; border-radius: 8px; background: #f8fbff;">
            <summary style="padding: 0.55rem 0.7rem; cursor: pointer; color: #1e3a8a; font-size: 0.8rem; font-weight: 600;">
              Debug: /api/select payload and response
            </summary>
            <div style="padding: 0.7rem; border-top: 1px solid #dbeafe; display: grid; gap: 0.6rem;">
              <div>
                <div style="font-size: 0.72rem; color: #1e40af; margin-bottom: 0.3rem; font-weight: 700;">Request</div>
                <pre style="margin: 0; padding: 0.6rem; background: #eef2ff; color: #1f2937; border-radius: 6px; font-size: 0.72rem; overflow-x: auto;">{{ JSON.stringify(lastSelectionRequest, null, 2) }}</pre>
              </div>
              <div>
                <div style="font-size: 0.72rem; color: #1e40af; margin-bottom: 0.3rem; font-weight: 700;">Response (HTTP {{ selectionHttpStatus ?? "n/a" }})</div>
                <pre style="margin: 0; padding: 0.6rem; background: #f1f5f9; color: #1f2937; border-radius: 6px; font-size: 0.72rem; overflow-x: auto;">{{ JSON.stringify(lastSelectionResponse, null, 2) }}</pre>
              </div>
            </div>
          </details>

          <details v-if="lastSelectionRequest" style="margin: 0 0 1rem 0; border: 1px solid #ddd6fe; border-radius: 8px; background: #f8f7ff;">
            <summary style="padding: 0.55rem 0.7rem; cursor: pointer; color: #4c1d95; font-size: 0.8rem; font-weight: 600;">
              Try WebSocket Stream
            </summary>
            <div style="padding: 0.7rem; border-top: 1px solid #ddd6fe; display: grid; gap: 0.6rem;">
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                <button
                  @click="startWebSocketStream"
                  style="border: 1px solid #8b5cf6; background: #7c3aed; color: white; border-radius: 6px; padding: 0.45rem 0.7rem; cursor: pointer; font-size: 0.78rem;"
                >
                  Start Stream Test
                </button>
                <button
                  @click="closeActiveStream"
                  style="border: 1px solid #a1a1aa; background: white; color: #3f3f46; border-radius: 6px; padding: 0.45rem 0.7rem; cursor: pointer; font-size: 0.78rem;"
                >
                  Stop
                </button>
                <span style="font-size: 0.75rem; color: #4b5563;">Status: {{ wsStreamStatus }}</span>
              </div>

              <div style="font-size: 0.74rem; color: #374151;">
                Binary chunks: {{ wsBinaryChunkCount }} | Binary bytes: {{ wsBinaryByteCount }}
              </div>

              <div v-if="wsStreamMeta">
                <div style="font-size: 0.72rem; color: #4c1d95; margin-bottom: 0.3rem; font-weight: 700;">STREAM_META</div>
                <pre style="margin: 0; padding: 0.6rem; background: #ede9fe; color: #1f2937; border-radius: 6px; font-size: 0.72rem; overflow-x: auto;">{{ JSON.stringify(wsStreamMeta, null, 2) }}</pre>
              </div>

              <div v-if="wsStreamComplete">
                <div style="font-size: 0.72rem; color: #4c1d95; margin-bottom: 0.3rem; font-weight: 700;">STREAM_COMPLETE</div>
                <pre style="margin: 0; padding: 0.6rem; background: #e9fce8; color: #1f2937; border-radius: 6px; font-size: 0.72rem; overflow-x: auto;">{{ JSON.stringify(wsStreamComplete, null, 2) }}</pre>
              </div>

              <div v-if="wsDecodedPayload">
                <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem;">
                  <div style="font-size: 0.72rem; color: #4c1d95; font-weight: 700;">Decoded Payload Preview</div>
                  <button
                    @click="downloadDecodedPayload"
                    style="border: 1px solid #7c3aed; background: white; color: #4c1d95; border-radius: 6px; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.72rem;"
                  >
                    Download payload.json
                  </button>
                </div>
                <div v-if="decodedSummaryItems.length > 0" style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0 0 0.45rem 0;">
                  <span
                    v-for="item in decodedSummaryItems"
                    :key="item.label"
                    :style="getSummaryChipStyle(item)"
                  >
                    {{ item.label }}: {{ item.value }}
                  </span>
                </div>

                <div v-if="decodedWidgetType !== 'none'" style="margin: 0 0 0.55rem 0; border: 1px solid #e9d5ff; border-radius: 8px; background: #faf5ff; padding: 0.6rem;">
                  <div style="font-size: 0.7rem; color: #6b21a8; font-weight: 700; margin-bottom: 0.4rem;">
                    Class-Specific Preview
                  </div>

                  <div v-if="decodedWidgetType === 'image'">
                    <div v-if="decodedImagePreview" style="display: grid; gap: 0.4rem;">
                      <img
                        :src="decodedImagePreview"
                        alt="Decoded image preview"
                        style="max-width: 100%; width: 240px; border: 1px solid #d8b4fe; border-radius: 6px; background: white; image-rendering: pixelated;"
                      />
                      <div style="font-size: 0.68rem; color: #6b21a8;">
                        Rendered from sampled numeric payload values.
                      </div>
                    </div>
                    <div v-else style="font-size: 0.68rem; color: #6b7280;">
                      Image preview unavailable for this payload shape/value layout.
                    </div>
                  </div>

                  <div v-else-if="decodedWidgetType === 'table'">
                    <div style="display: inline-flex; border: 1px solid #ddd6fe; border-radius: 8px; overflow: hidden; margin: 0 0 0.45rem 0;">
                      <button
                        @click="tablePreviewMode = 'rows'"
                        :style="{
                          border: 'none',
                          background: tablePreviewMode === 'rows' ? '#7c3aed' : 'white',
                          color: tablePreviewMode === 'rows' ? 'white' : '#4c1d95',
                          cursor: 'pointer',
                          fontSize: '0.68rem',
                          padding: '0.22rem 0.55rem'
                        }"
                      >
                        Rows View
                      </button>
                      <button
                        @click="tablePreviewMode = 'raw'"
                        :style="{
                          border: 'none',
                          borderLeft: '1px solid #ddd6fe',
                          background: tablePreviewMode === 'raw' ? '#7c3aed' : 'white',
                          color: tablePreviewMode === 'raw' ? 'white' : '#4c1d95',
                          cursor: 'pointer',
                          fontSize: '0.68rem',
                          padding: '0.22rem 0.55rem'
                        }"
                      >
                        Raw JSON
                      </button>
                    </div>

                    <div v-if="decodedTableColumns.length > 0" style="display: grid; gap: 0.3rem; margin-bottom: 0.45rem;">
                      <div style="font-size: 0.66rem; color: #6b21a8; font-weight: 700;">Columns</div>
                      <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                        <span
                          v-for="column in decodedTableColumns"
                          :key="column.name"
                          style="font-size: 0.66rem; color: #4c1d95; background: #f3e8ff; border: 1px solid #e9d5ff; border-radius: 999px; padding: 0.16rem 0.45rem;"
                        >
                          {{ column.name }}: {{ column.dtype }}
                        </span>
                      </div>
                    </div>
                    <div v-if="tablePreviewMode === 'rows' && decodedCompoundTablePreview.rows.length > 0" style="overflow-x: auto; margin-bottom: 0.45rem;">
                      <table style="border-collapse: collapse; width: 100%; font-size: 0.68rem; color: #1f2937;">
                        <thead>
                          <tr>
                            <th
                              v-for="header in decodedCompoundTablePreview.headers"
                              :key="`compound-header-${header}`"
                              style="border: 1px solid #e9d5ff; padding: 0.2rem 0.35rem; text-align: left; background: #f3e8ff; color: #4c1d95;"
                            >
                              {{ header }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in decodedCompoundTablePreview.rows" :key="`compound-row-${row.rowIndex}`">
                            <td
                              v-for="header in decodedCompoundTablePreview.headers"
                              :key="`compound-row-${row.rowIndex}-${header}`"
                              style="border: 1px solid #e9d5ff; padding: 0.18rem 0.3rem; background: white;"
                            >
                              {{ row.valuesByHeader[header] }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div style="font-size: 0.66rem; color: #6b7280; margin-top: 0.35rem;">
                        Showing {{ decodedCompoundTablePreview.shownRows }} rows from {{ decodedCompoundTablePreview.totalRows }} sampled rows.
                      </div>
                    </div>

                    <div v-if="tablePreviewMode === 'raw'" style="margin-bottom: 0.45rem;">
                      <pre style="margin: 0; padding: 0.55rem; background: #f5f3ff; color: #1f2937; border-radius: 6px; font-size: 0.7rem; overflow-x: auto;">{{ JSON.stringify(decodedCompoundRawPreview, null, 2) }}</pre>
                    </div>

                    <div v-if="tablePreviewMode === 'rows' && decodedTablePreview.rows.length > 0" style="overflow-x: auto;">
                      <table style="border-collapse: collapse; width: 100%; font-size: 0.68rem; color: #1f2937;">
                        <tbody>
                          <tr v-for="row in decodedTablePreview.rows" :key="`row-${row.rowIndex}`">
                            <td
                              v-for="(cell, idx) in row.cells"
                              :key="`row-${row.rowIndex}-cell-${idx}`"
                              style="border: 1px solid #e9d5ff; padding: 0.18rem 0.3rem; text-align: right; background: white;"
                            >
                              {{ cell }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div style="font-size: 0.66rem; color: #6b7280; margin-top: 0.35rem;">
                        Showing {{ decodedTablePreview.shownRows }}x{{ decodedTablePreview.shownCols }} from shape {{ decodedTablePreview.totalRows }}x{{ decodedTablePreview.totalCols }}.
                      </div>
                    </div>
                    <div v-else-if="tablePreviewMode === 'rows' && decodedCompoundTablePreview.rows.length === 0 && decodedTablePreview.rows.length === 0" style="font-size: 0.68rem; color: #6b7280;">
                      <span v-if="decodedTableColumns.length > 0 && decodedCompoundTablePreview.rows.length === 0">Table schema metadata detected (compound dtype columns), but sampled row preview is unavailable.</span>
                      <span v-else>Table preview unavailable for this payload shape/value layout.</span>
                    </div>
                  </div>

                  <div v-else-if="decodedWidgetType === 'dataset'" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.4rem;">
                    <div style="border: 1px solid #e9d5ff; border-radius: 6px; background: white; padding: 0.4rem;">
                      <div style="font-size: 0.62rem; color: #6b7280;">Min</div>
                      <div style="font-size: 0.75rem; color: #111827; font-weight: 700;">{{ decodedDatasetStats.min }}</div>
                    </div>
                    <div style="border: 1px solid #e9d5ff; border-radius: 6px; background: white; padding: 0.4rem;">
                      <div style="font-size: 0.62rem; color: #6b7280;">Max</div>
                      <div style="font-size: 0.75rem; color: #111827; font-weight: 700;">{{ decodedDatasetStats.max }}</div>
                    </div>
                    <div style="border: 1px solid #e9d5ff; border-radius: 6px; background: white; padding: 0.4rem;">
                      <div style="font-size: 0.62rem; color: #6b7280;">Mean</div>
                      <div style="font-size: 0.75rem; color: #111827; font-weight: 700;">{{ decodedDatasetStats.mean }}</div>
                    </div>
                    <div style="border: 1px solid #e9d5ff; border-radius: 6px; background: white; padding: 0.4rem;">
                      <div style="font-size: 0.62rem; color: #6b7280;">Sampled</div>
                      <div style="font-size: 0.75rem; color: #111827; font-weight: 700;">{{ decodedDatasetStats.sampledCount }}</div>
                    </div>
                  </div>
                </div>
                <pre style="margin: 0; padding: 0.6rem; background: #f5f3ff; color: #1f2937; border-radius: 6px; font-size: 0.72rem; overflow-x: auto;">{{ JSON.stringify(wsDecodedPayload, null, 2) }}</pre>
              </div>

              <div v-if="wsStreamError">
                <div style="font-size: 0.72rem; color: #991b1b; margin-bottom: 0.3rem; font-weight: 700;">Error</div>
                <pre style="margin: 0; padding: 0.6rem; background: #fef2f2; color: #7f1d1d; border-radius: 6px; font-size: 0.72rem; overflow-x: auto;">{{ wsStreamError }}</pre>
              </div>

              <div v-if="wsStreamLog.length > 0">
                <div style="font-size: 0.72rem; color: #4c1d95; margin-bottom: 0.3rem; font-weight: 700;">Event Log</div>
                <pre style="margin: 0; padding: 0.6rem; background: #faf5ff; color: #1f2937; border-radius: 6px; font-size: 0.72rem; overflow-x: auto;">{{ wsStreamLog.join('\n') }}</pre>
              </div>
            </div>
          </details>
          
          <!-- Inject custom functional block wrapper serving as our main entry node -->
          <div style="font-family: monospace;">
            <TreeNodeItem
              :node="rootNode"
              :onNodeHover="handleNodeHover"
              :onNodeLeave="schedulePopoverHide"
              :onLeafSelect="selectLeafNode"
            />
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
import { computed, ref, onMounted, onBeforeUnmount, defineComponent, h } from "vue";

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
const selectionStatus = ref("");
const lastSelectionRequest = ref(null);
const lastSelectionResponse = ref(null);
const selectionHttpStatus = ref(null);
const wsStreamStatus = ref("idle");
const wsStreamMeta = ref(null);
const wsStreamComplete = ref(null);
const wsStreamError = ref("");
const wsBinaryChunkCount = ref(0);
const wsBinaryByteCount = ref(0);
const wsStreamLog = ref([]);
const activeWebSocket = ref(null);
const wsBinaryChunks = ref([]);
const wsDecodedPayload = ref(null);
const tablePreviewMode = ref("rows");

const decodedSummaryItems = computed(() => {
  const payload = wsDecodedPayload.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const shapeValue = Array.isArray(payload.shape)
    ? `[${payload.shape.join(" x ")}]`
    : (payload.shape ?? "n/a");

  return [
    { label: "Class", value: payload.className ?? payload.class ?? "n/a" },
    { label: "DType", value: payload.dtype ?? payload.valueType ?? "n/a" },
    { label: "Shape", value: String(shapeValue) },
    { label: "Count", value: String(payload.elementCount ?? payload.count ?? "n/a") },
    { label: "Truncated", value: String(Boolean(payload.truncated ?? false)) }
  ];
});

const decodedPayloadClass = computed(() => {
  const payload = wsDecodedPayload.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }
  return String(payload.class ?? payload.className ?? "").toLowerCase();
});

const decodedShape = computed(() => {
  const payload = wsDecodedPayload.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.shape)) {
    return [];
  }
  return payload.shape
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
});

const decodedNumericValues = computed(() => {
  const payload = wsDecodedPayload.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.values)) {
    return [];
  }
  return payload.values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
});

const decodedWidgetType = computed(() => {
  const cls = decodedPayloadClass.value;
  if (cls === "image") return "image";
  if (cls === "table") return "table";
  if (cls === "dataset") return "dataset";
  return "none";
});

const decodedTableColumns = computed(() => {
  const payload = wsDecodedPayload.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.columns)) {
    return [];
  }

  return payload.columns
    .map((column, index) => ({
      name: String(column?.name ?? `col_${index}`),
      dtype: String(column?.dtype ?? column?.class ?? "Unknown")
    }))
    .slice(0, 24);
});

const decodedCompoundTablePreview = computed(() => {
  const payload = wsDecodedPayload.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.rows)) {
    return {
      headers: [],
      rows: [],
      shownRows: 0,
      totalRows: 0
    };
  }

  const columnHeaders = decodedTableColumns.value.map((column) => column.name);
  const fallbackHeaders = payload.rows.length > 0 && typeof payload.rows[0] === "object" && payload.rows[0] !== null
    ? Object.keys(payload.rows[0])
    : [];
  const headers = (columnHeaders.length > 0 ? columnHeaders : fallbackHeaders).slice(0, 24);

  if (headers.length === 0) {
    return {
      headers: [],
      rows: [],
      shownRows: 0,
      totalRows: payload.rows.length
    };
  }

  const shownRows = Math.min(8, payload.rows.length);
  const rows = payload.rows.slice(0, shownRows).map((row, rowIndex) => {
    const valuesByHeader = {};
    for (const header of headers) {
      const value = row && typeof row === "object" ? row[header] : null;
      valuesByHeader[header] = value === null || value === undefined ? "-" : String(value);
    }
    return {
      rowIndex,
      valuesByHeader
    };
  });

  return {
    headers,
    rows,
    shownRows,
    totalRows: payload.rows.length
  };
});

const decodedCompoundRawPreview = computed(() => {
  const payload = wsDecodedPayload.value;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return {
    class: payload.class ?? payload.className ?? "n/a",
    dtype: payload.dtype ?? "n/a",
    columns: Array.isArray(payload.columns) ? payload.columns : [],
    rows: Array.isArray(payload.rows) ? payload.rows : []
  };
});

const formatStatNumber = (value) => {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  return value.toPrecision(4);
};

const decodedDatasetStats = computed(() => {
  const values = decodedNumericValues.value;
  if (values.length === 0) {
    return {
      min: "n/a",
      max: "n/a",
      mean: "n/a",
      sampledCount: "0"
    };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }

  return {
    min: formatStatNumber(min),
    max: formatStatNumber(max),
    mean: formatStatNumber(sum / values.length),
    sampledCount: String(values.length)
  };
});

const decodedTablePreview = computed(() => {
  const shape = decodedShape.value;
  const values = decodedNumericValues.value;
  if (shape.length < 2 || values.length === 0) {
    return {
      rows: [],
      shownRows: 0,
      shownCols: 0,
      totalRows: 0,
      totalCols: 0
    };
  }

  const totalRows = Math.floor(shape[0]);
  const totalCols = Math.floor(shape[1]);
  if (totalRows <= 0 || totalCols <= 0) {
    return {
      rows: [],
      shownRows: 0,
      shownCols: 0,
      totalRows: 0,
      totalCols: 0
    };
  }

  const shownRows = Math.min(8, totalRows);
  const shownCols = Math.min(8, totalCols);
  const rows = [];

  for (let r = 0; r < shownRows; r++) {
    const cells = [];
    for (let c = 0; c < shownCols; c++) {
      const index = r * totalCols + c;
      const raw = values[index];
      cells.push(Number.isFinite(raw) ? formatStatNumber(raw) : "-");
    }
    rows.push({ rowIndex: r, cells });
  }

  return {
    rows,
    shownRows,
    shownCols,
    totalRows,
    totalCols
  };
});

const decodedImagePreview = computed(() => {
  const shape = decodedShape.value;
  const values = decodedNumericValues.value;
  if (shape.length < 2 || values.length === 0) {
    return null;
  }

  const height = Math.floor(shape[0]);
  const width = Math.floor(shape[1]);
  const channels = shape.length >= 3 ? Math.floor(shape[2]) : 1;

  if (width <= 0 || height <= 0 || width * height > 4096) {
    return null;
  }

  const pixelCount = width * height;
  const expectedValues = pixelCount * (channels >= 3 ? channels : 1);
  if (values.length < pixelCount || values.length < Math.min(expectedValues, pixelCount * 3)) {
    return null;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const normalize = (value) => {
    if (!Number.isFinite(value)) return 0;
    if (max <= 1 && min >= 0) {
      return Math.max(0, Math.min(255, Math.round(value * 255)));
    }
    return Math.max(0, Math.min(255, Math.round(value)));
  };

  const rgba = new Uint8ClampedArray(pixelCount * 4);
  for (let i = 0; i < pixelCount; i++) {
    if (channels >= 3) {
      const base = i * channels;
      rgba[i * 4] = normalize(values[base]);
      rgba[i * 4 + 1] = normalize(values[base + 1]);
      rgba[i * 4 + 2] = normalize(values[base + 2]);
      rgba[i * 4 + 3] = 255;
    } else {
      const gray = normalize(values[i]);
      rgba[i * 4] = gray;
      rgba[i * 4 + 1] = gray;
      rgba[i * 4 + 2] = gray;
      rgba[i * 4 + 3] = 255;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const imageData = new ImageData(rgba, width, height);
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
});

const getSummaryChipStyle = (item) => {
  const base = {
    fontSize: "0.68rem",
    borderRadius: "999px",
    padding: "0.18rem 0.5rem",
    border: "1px solid #ddd6fe",
    background: "#ede9fe",
    color: "#312e81"
  };

  if (item?.label === "Truncated") {
    if (item.value === "true") {
      return {
        ...base,
        border: "1px solid #fdba74",
        background: "#fff7ed",
        color: "#9a3412"
      };
    }

    return {
      ...base,
      border: "1px solid #86efac",
      background: "#f0fdf4",
      color: "#166534"
    };
  }

  return base;
};

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

const normalizeNodePath = (input) => {
  if (!input || typeof input !== "string") return "/";
  const trimmed = input.trim();
  if (!trimmed || trimmed === "/") return "/";
  const noTrailing = trimmed.replace(/\/+$/, "");
  return noTrailing.startsWith("/") ? noTrailing : `/${noTrailing}`;
};

const selectLeafNode = async (node, classChain) => {
  if (!selectedFile.value?.absolutePath) {
    selectionStatus.value = "No HDF5 file selected.";
    return;
  }

  const requestPayload = {
    filePath: selectedFile.value.absolutePath,
    path: normalizeNodePath(node.fullPath),
    classChain
  };

  lastSelectionRequest.value = requestPayload;
  lastSelectionResponse.value = null;
  selectionHttpStatus.value = null;
  closeActiveStream();
  resetWebSocketStreamState();

  try {
    const response = await fetch("/api/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });

    const payload = await response.json();
    selectionHttpStatus.value = response.status;
    lastSelectionResponse.value = payload;
    selectionStatus.value = payload.message ?? "Unknown selection result.";
  } catch (error) {
    console.error(error);
    lastSelectionResponse.value = {
      success: false,
      status: "CLIENT_ERROR",
      message: error?.message ?? "Network/client failure while calling /api/select."
    };
    selectionStatus.value = "Failed to validate selected node against backend.";
  }
};

const pushWebSocketLog = (line) => {
  wsStreamLog.value = [...wsStreamLog.value, `${new Date().toLocaleTimeString()} ${line}`].slice(-80);
};

const resetWebSocketStreamState = () => {
  wsStreamStatus.value = "idle";
  wsStreamMeta.value = null;
  wsStreamComplete.value = null;
  wsStreamError.value = "";
  wsBinaryChunkCount.value = 0;
  wsBinaryByteCount.value = 0;
  wsStreamLog.value = [];
  wsBinaryChunks.value = [];
  wsDecodedPayload.value = null;
  tablePreviewMode.value = "rows";
};

const decodeCollectedPayload = () => {
  if (wsBinaryChunks.value.length === 0) {
    wsDecodedPayload.value = null;
    return;
  }

  const totalBytes = wsBinaryChunks.value.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of wsBinaryChunks.value) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder().decode(merged);
    wsDecodedPayload.value = JSON.parse(text);
    pushWebSocketLog("Decoded payload JSON successfully.");
  } catch (error) {
    wsDecodedPayload.value = {
      error: "Failed to decode stream payload as JSON.",
      detail: error?.message ?? String(error),
      totalBytes
    };
    pushWebSocketLog("Failed to decode payload JSON.");
  }
};

const downloadDecodedPayload = () => {
  if (!wsDecodedPayload.value) return;
  const blob = new Blob([JSON.stringify(wsDecodedPayload.value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "payload.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const closeActiveStream = () => {
  if (activeWebSocket.value) {
    try {
      activeWebSocket.value.close(1000, "Client stop");
    } catch {
      // No-op.
    }
    activeWebSocket.value = null;
  }
};

const buildWebSocketUrl = (wsPath) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${wsPath}`;
};

const startWebSocketStream = async () => {
  if (!lastSelectionRequest.value) {
    wsStreamError.value = "Select a leaf node first.";
    return;
  }

  closeActiveStream();
  resetWebSocketStreamState();
  wsStreamStatus.value = "requesting-token";
  pushWebSocketLog("Requesting stream token via /api/select...");

  try {
    const response = await fetch("/api/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastSelectionRequest.value)
    });

    const payload = await response.json();
    selectionHttpStatus.value = response.status;
    lastSelectionResponse.value = payload;

    if (!response.ok || !payload?.payload?.websocket?.path) {
      wsStreamStatus.value = "token-error";
      wsStreamError.value = payload?.message ?? "Failed to receive websocket stream token.";
      pushWebSocketLog(`Token request failed (${response.status}).`);
      return;
    }

    const streamPath = payload.payload.websocket.path;
    const wsUrl = payload.payload.websocket.url || buildWebSocketUrl(streamPath);
    pushWebSocketLog(`Connecting to ${wsUrl}`);
    wsStreamStatus.value = "connecting";

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    activeWebSocket.value = ws;

    ws.onopen = () => {
      wsStreamStatus.value = "streaming";
      pushWebSocketLog("WebSocket connected.");
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "STREAM_META") {
            wsStreamMeta.value = parsed;
            pushWebSocketLog("Received STREAM_META.");
          } else if (parsed.type === "STREAM_COMPLETE") {
            wsStreamComplete.value = parsed;
            wsStreamStatus.value = "complete";
            pushWebSocketLog("Received STREAM_COMPLETE.");
            decodeCollectedPayload();
          } else if (parsed.type === "ERROR") {
            wsStreamError.value = parsed.message ?? "WebSocket stream error.";
            wsStreamStatus.value = "error";
            pushWebSocketLog(`Received ERROR: ${wsStreamError.value}`);
          } else {
            pushWebSocketLog(`Received message type ${parsed.type ?? "unknown"}.`);
          }
        } catch {
          pushWebSocketLog("Received non-JSON text frame.");
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        wsBinaryChunkCount.value += 1;
        wsBinaryByteCount.value += event.data.byteLength;
        wsBinaryChunks.value.push(new Uint8Array(event.data));
        pushWebSocketLog(`Received binary chunk #${wsBinaryChunkCount.value} (${event.data.byteLength} bytes).`);
      }
    };

    ws.onerror = () => {
      wsStreamStatus.value = "error";
      wsStreamError.value = "WebSocket transport error.";
      pushWebSocketLog("WebSocket error event.");
    };

    ws.onclose = (event) => {
      activeWebSocket.value = null;
      if (wsStreamStatus.value !== "complete" && wsStreamStatus.value !== "error") {
        wsStreamStatus.value = "closed";
      }
      pushWebSocketLog(`WebSocket closed (code ${event.code}).`);
    };
  } catch (error) {
    wsStreamStatus.value = "error";
    wsStreamError.value = error?.message ?? "Failed to start websocket stream.";
    pushWebSocketLog(`Exception: ${wsStreamError.value}`);
  }
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
    onNodeLeave: Function,
    onLeafSelect: Function,
    ancestryTypes: {
      type: Array,
      default: () => []
    }
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
          onClick: () => {
            if (isGroup) {
              toggle();
              return;
            }
            props.onLeafSelect?.(props.node, [...props.ancestryTypes, props.node?.type]);
          },
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
                onNodeLeave: props.onNodeLeave,
                onLeafSelect: props.onLeafSelect,
                ancestryTypes: [...props.ancestryTypes, props.node?.type]
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
  selectionStatus.value = "";
  lastSelectionRequest.value = null;
  lastSelectionResponse.value = null;
  selectionHttpStatus.value = null;
  closeActiveStream();
  resetWebSocketStreamState();

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
  closeActiveStream();
  clearHoverTimers();
  window.removeEventListener("keydown", handleKeydown);
});
</script>
