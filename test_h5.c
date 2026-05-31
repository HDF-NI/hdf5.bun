#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <hdf5.h>

int check_hdf5_version(unsigned *major, unsigned *minor, unsigned *rel) {
    // Call the real native HDF5 system library function
    herr_t status = H5get_libversion(major, minor, rel);
    
    printf("[C Layer] Initializing native system links via Bun FFI...\n");
    printf("[C Layer] Found System HDF5 Version: %u.%u.%u\n", *major, *minor, *rel);
    
    return (status >= 0) ? 0 : -1;
}

int inspect_and_open_file(const char *filepath) {
    // 1. Safety Check: Verify the file actually uses the HDF5 structural format
    htri_t is_h5 = H5Fis_hdf5(filepath);
    if (is_h5 <= 0) {
        return -1; // Not a valid HDF5 file or doesn't exist
    }

    // 2. Open the file in Read-Only mode (H5F_ACC_RDONLY)
    hid_t file_id = H5Fopen(filepath, H5F_ACC_RDONLY, H5P_DEFAULT);
    if (file_id < 0) {
        return -2; // Format is fine, but file read permission/open failed
    }

    // 3. Clean up immediately by closing the handle so we don't leak memory
    H5Fclose(file_id);

    return 0; // Success! File is structurally sound and accessible
}

typedef struct {
    char *buffer;
    int max_size;
    int current_len;
    int count;
} TraversalData;

// 🌳 Recursive Callback Function invoked by H5Lvisit for EVERY element found
static herr_t visit_node_callback(hid_t g_id, const char *name, const H5L_info_t *l_info, void *op_data) {
    TraversalData *data = (TraversalData *)op_data;

    // Get object metadata info to figure out the type
    H5O_info_t object_info;
    #if H5_VERS_MINOR >= 12
        H5Oget_info_by_name(g_id, name, &object_info, H5O_INFO_BASIC, H5P_DEFAULT);
    #else
        H5Oget_info_by_name(g_id, name, &object_info, H5P_DEFAULT);
    #endif

    const char *type_str = "Unknown";
    if (object_info.type == H5O_TYPE_GROUP) type_str = "Group";
    else if (object_info.type == H5O_TYPE_DATASET) type_str = "Dataset";

    // Format item into: "path/to/object|type;"
    char temp_item[512];
    snprintf(temp_item, sizeof(temp_item), "%s|%s;", name, type_str);
    int item_len = strlen(temp_item);

    // Prevent memory buffer overflow safely
    if (data->current_len + item_len < data->max_size - 1) {
        strcat(data->buffer, temp_item);
        data->current_len += item_len;
        data->count++;
    } else {
        return 1; // Stop traversal if buffer fills up completely
    }

    return 0; // Keep descending down the tree
}

int get_deep_structure(const char *filepath, char *output_buffer, int max_buffer_size) {
    htri_t is_h5 = H5Fis_hdf5(filepath);
    if (is_h5 <= 0) return -1;

    hid_t file_id = H5Fopen(filepath, H5F_ACC_RDONLY, H5P_DEFAULT);
    if (file_id < 0) return -2;

    output_buffer[0] = '\0';

    TraversalData data;
    data.buffer = output_buffer;
    data.max_size = max_buffer_size;
    data.current_len = 0;
    data.count = 0;

    // 🏎️ H5Lvisit recursively crawls the entire file internal structure!
    H5Lvisit(file_id, H5_INDEX_NAME, H5_ITER_INC, visit_node_callback, &data);

    H5Fclose(file_id);
    return data.count; // Returns the total number of nested elements mapped
}