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

static int append_bytes(TraversalData *data, const char *text, int len) {
    if (data->current_len + len >= data->max_size - 1) {
        return -1;
    }

    memcpy(data->buffer + data->current_len, text, (size_t)len);
    data->current_len += len;
    data->buffer[data->current_len] = '\0';
    return 0;
}

static int append_text(TraversalData *data, const char *text) {
    return append_bytes(data, text, (int)strlen(text));
}

static int append_escaped_json(TraversalData *data, const char *text) {
    if (!text) {
        return append_text(data, "");
    }

    for (const char *p = text; *p != '\0'; ++p) {
        char ch = *p;
        if (ch == '"' || ch == '\\') {
            char escaped[2] = {'\\', ch};
            if (append_bytes(data, escaped, 2) != 0) return -1;
        } else if (ch == '\n') {
            if (append_text(data, "\\n") != 0) return -1;
        } else if (ch == '\r') {
            if (append_text(data, "\\r") != 0) return -1;
        } else if (ch == '\t') {
            if (append_text(data, "\\t") != 0) return -1;
        } else {
            if (append_bytes(data, &ch, 1) != 0) return -1;
        }
    }

    return 0;
}

static int append_attribute_value_json(TraversalData *data, hid_t attr_id, hid_t type_id, hid_t space_id) {
    H5T_class_t type_class = H5Tget_class(type_id);
    hssize_t npoints = H5Sget_simple_extent_npoints(space_id);
    if (npoints < 0) {
        return append_text(data, "null");
    }

    if (type_class == H5T_STRING) {
        if (append_text(data, "\"") != 0) return -1;

        if (H5Tis_variable_str(type_id) > 0) {
            char *vlen_text = NULL;
            if (H5Aread(attr_id, type_id, &vlen_text) >= 0 && vlen_text != NULL) {
                if (append_escaped_json(data, vlen_text) != 0) {
                    H5free_memory(vlen_text);
                    return -1;
                }
                H5free_memory(vlen_text);
            }
        } else {
            size_t size = H5Tget_size(type_id);
            char *fixed_text = (char *)calloc(size + 1, 1);
            if (!fixed_text) {
                return -1;
            }

            if (H5Aread(attr_id, type_id, fixed_text) >= 0) {
                fixed_text[size] = '\0';
                if (append_escaped_json(data, fixed_text) != 0) {
                    free(fixed_text);
                    return -1;
                }
            }
            free(fixed_text);
        }

        return append_text(data, "\"");
    }

    if (type_class == H5T_INTEGER) {
        if (npoints == 1) {
            long long value = 0;
            if (H5Aread(attr_id, H5T_NATIVE_LLONG, &value) < 0) {
                return append_text(data, "null");
            }
            char number_buf[64];
            snprintf(number_buf, sizeof(number_buf), "%lld", value);
            return append_text(data, number_buf);
        }

        long long *values = (long long *)malloc((size_t)npoints * sizeof(long long));
        if (!values) {
            return append_text(data, "null");
        }
        if (H5Aread(attr_id, H5T_NATIVE_LLONG, values) < 0) {
            free(values);
            return append_text(data, "null");
        }

        if (append_text(data, "[") != 0) {
            free(values);
            return -1;
        }
        for (hssize_t i = 0; i < npoints; i++) {
            if (i > 0 && append_text(data, ",") != 0) {
                free(values);
                return -1;
            }
            char number_buf[64];
            snprintf(number_buf, sizeof(number_buf), "%lld", values[i]);
            if (append_text(data, number_buf) != 0) {
                free(values);
                return -1;
            }
        }
        free(values);
        return append_text(data, "]");
    }

    if (type_class == H5T_FLOAT) {
        if (npoints == 1) {
            double value = 0.0;
            if (H5Aread(attr_id, H5T_NATIVE_DOUBLE, &value) < 0) {
                return append_text(data, "null");
            }
            char number_buf[128];
            snprintf(number_buf, sizeof(number_buf), "%.17g", value);
            return append_text(data, number_buf);
        }

        double *values = (double *)malloc((size_t)npoints * sizeof(double));
        if (!values) {
            return append_text(data, "null");
        }
        if (H5Aread(attr_id, H5T_NATIVE_DOUBLE, values) < 0) {
            free(values);
            return append_text(data, "null");
        }

        if (append_text(data, "[") != 0) {
            free(values);
            return -1;
        }
        for (hssize_t i = 0; i < npoints; i++) {
            if (i > 0 && append_text(data, ",") != 0) {
                free(values);
                return -1;
            }
            char number_buf[128];
            snprintf(number_buf, sizeof(number_buf), "%.17g", values[i]);
            if (append_text(data, number_buf) != 0) {
                free(values);
                return -1;
            }
        }
        free(values);
        return append_text(data, "]");
    }

    return append_text(data, "null");
}

static int append_attribute_type(TraversalData *data, hid_t type_id) {
    H5T_class_t type_class = H5Tget_class(type_id);
    const char *type_label = "Unsupported";
    if (type_class == H5T_INTEGER) type_label = "Integer";
    else if (type_class == H5T_FLOAT) type_label = "Float";
    else if (type_class == H5T_STRING) type_label = "String";

    if (append_text(data, "\"") != 0) return -1;
    if (append_text(data, type_label) != 0) return -1;
    return append_text(data, "\"");
}

static int append_attributes_json(TraversalData *data, hid_t object_id) {
    int num_attrs = H5Aget_num_attrs(object_id);
    if (num_attrs < 0) {
        return append_text(data, "[]");
    }

    if (append_text(data, "[") != 0) return -1;

    for (int i = 0; i < num_attrs; i++) {
        hid_t attr_id = H5Aopen_idx(object_id, (unsigned int)i);
        if (attr_id < 0) {
            continue;
        }

        ssize_t name_len = H5Aget_name(attr_id, 0, NULL);
        if (name_len < 0) {
            H5Aclose(attr_id);
            continue;
        }

        char *attr_name = (char *)calloc((size_t)name_len + 1, 1);
        if (!attr_name) {
            H5Aclose(attr_id);
            continue;
        }
        H5Aget_name(attr_id, (size_t)name_len + 1, attr_name);

        hid_t type_id = H5Aget_type(attr_id);
        hid_t space_id = H5Aget_space(attr_id);

        if (i > 0 && append_text(data, ",") != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }

        if (append_text(data, "{\"name\":\"") != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }
        if (append_escaped_json(data, attr_name) != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }
        if (append_text(data, "\",\"valueType\":") != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }
        if (append_attribute_type(data, type_id) != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }
        if (append_text(data, ",\"value\":") != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }
        if (append_attribute_value_json(data, attr_id, type_id, space_id) != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }
        if (append_text(data, "}") != 0) {
            free(attr_name);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Aclose(attr_id);
            return -1;
        }

        free(attr_name);
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Aclose(attr_id);
    }

    return append_text(data, "]");
}

static int append_node_json(TraversalData *data, const char *full_path, const char *type_str, hid_t object_id) {
    if (append_text(data, "{\"fullPath\":\"") != 0) return -1;
    if (append_escaped_json(data, full_path) != 0) return -1;
    if (append_text(data, "\",\"type\":\"") != 0) return -1;
    if (append_escaped_json(data, type_str) != 0) return -1;
    if (append_text(data, "\",\"attributes\":") != 0) return -1;
    if (append_attributes_json(data, object_id) != 0) return -1;
    if (append_text(data, "}\n") != 0) return -1;

    data->count++;
    return 0;
}

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

    hid_t object_id = H5Oopen(g_id, name, H5P_DEFAULT);
    if (object_id < 0) {
        return 1;
    }

    if (append_node_json(data, name, type_str, object_id) != 0) {
        H5Oclose(object_id);
        return 1;
    }

    H5Oclose(object_id);

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

    hid_t root_group_id = H5Gopen2(file_id, "/", H5P_DEFAULT);
    if (root_group_id >= 0) {
        if (append_node_json(&data, "/", "Group", root_group_id) != 0) {
            H5Gclose(root_group_id);
            H5Fclose(file_id);
            return -3;
        }
        H5Gclose(root_group_id);
    }

    // 🏎️ H5Lvisit recursively crawls the entire file internal structure!
    herr_t visit_status = H5Lvisit(file_id, H5_INDEX_NAME, H5_ITER_INC, visit_node_callback, &data);

    H5Fclose(file_id);
    if (visit_status < 0) {
        return -3;
    }

    return data.count; // Returns the total number of nested elements mapped
}