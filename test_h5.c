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

static int read_class_attribute(hid_t object_id, char *out, size_t out_size) {
    if (!out || out_size == 0) return -1;
    out[0] = '\0';

    hid_t attr_id = H5Aopen(object_id, "CLASS", H5P_DEFAULT);
    if (attr_id < 0) {
        return -1;
    }

    hid_t type_id = H5Aget_type(attr_id);
    if (type_id < 0) {
        H5Aclose(attr_id);
        return -1;
    }

    int ok = -1;
    if (H5Tget_class(type_id) == H5T_STRING) {
        if (H5Tis_variable_str(type_id) > 0) {
            char *vlen_text = NULL;
            if (H5Aread(attr_id, type_id, &vlen_text) >= 0 && vlen_text) {
                snprintf(out, out_size, "%s", vlen_text);
                H5free_memory(vlen_text);
                ok = 0;
            }
        } else {
            size_t size = H5Tget_size(type_id);
            char *fixed_text = (char *)calloc(size + 1, 1);
            if (fixed_text) {
                if (H5Aread(attr_id, type_id, fixed_text) >= 0) {
                    fixed_text[size] = '\0';
                    snprintf(out, out_size, "%s", fixed_text);
                    ok = 0;
                }
                free(fixed_text);
            }
        }
    }

    H5Tclose(type_id);
    H5Aclose(attr_id);
    return ok;
}

static int append_shape_json(TraversalData *data, hid_t space_id, hsize_t *dims_out, int *rank_out) {
    int rank = H5Sget_simple_extent_ndims(space_id);
    if (rank < 0 || rank > 8) {
        return append_text(data, "[]");
    }

    hsize_t dims[8] = {0};
    if (rank > 0 && H5Sget_simple_extent_dims(space_id, dims, NULL) < 0) {
        return append_text(data, "[]");
    }

    if (dims_out && rank_out) {
        for (int i = 0; i < rank; i++) dims_out[i] = dims[i];
        *rank_out = rank;
    }

    if (append_text(data, "[") != 0) return -1;
    for (int i = 0; i < rank; i++) {
        if (i > 0 && append_text(data, ",") != 0) return -1;
        char buf[64];
        snprintf(buf, sizeof(buf), "%llu", (unsigned long long)dims[i]);
        if (append_text(data, buf) != 0) return -1;
    }
    return append_text(data, "]");
}

static const char *type_class_label(H5T_class_t type_class) {
    if (type_class == H5T_INTEGER) return "Integer";
    if (type_class == H5T_FLOAT) return "Float";
    if (type_class == H5T_STRING) return "String";
    if (type_class == H5T_COMPOUND) return "Compound";
    return "Unsupported";
}

static int append_member_dtype_json(TraversalData *data, hid_t member_type_id) {
    H5T_class_t member_class = H5Tget_class(member_type_id);
    size_t size = H5Tget_size(member_type_id);

    if (member_class == H5T_INTEGER) {
        H5T_sign_t sign = H5Tget_sign(member_type_id);
        const char *prefix = (sign == H5T_SGN_NONE) ? "UInt" : "Int";
        char buf[32];
        snprintf(buf, sizeof(buf), "%s%u", prefix, (unsigned int)(size * 8));
        return append_text(data, buf);
    }

    if (member_class == H5T_FLOAT) {
        char buf[32];
        snprintf(buf, sizeof(buf), "Float%u", (unsigned int)(size * 8));
        return append_text(data, buf);
    }

    if (member_class == H5T_STRING) {
        return append_text(data, "String");
    }

    return append_text(data, "Unsupported");
}

static int append_compound_columns_json(TraversalData *data, hid_t type_id) {
    if (append_text(data, "[") != 0) return -1;

    int member_count = H5Tget_nmembers(type_id);
    if (member_count <= 0) {
        return append_text(data, "]");
    }

    for (int i = 0; i < member_count; i++) {
        char *member_name = H5Tget_member_name(type_id, (unsigned int)i);
        hid_t member_type_id = H5Tget_member_type(type_id, (unsigned int)i);
        H5T_class_t member_class = (member_type_id >= 0) ? H5Tget_class(member_type_id) : H5T_NO_CLASS;

        if (i > 0 && append_text(data, ",") != 0) {
            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
            return -1;
        }

        if (append_text(data, "{\"name\":\"") != 0) {
            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
            return -1;
        }
        if (append_escaped_json(data, member_name ? member_name : "") != 0) {
            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
            return -1;
        }
        if (append_text(data, "\",\"dtype\":\"") != 0) {
            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
            return -1;
        }
        if (member_type_id >= 0) {
            if (append_member_dtype_json(data, member_type_id) != 0) {
                H5Tclose(member_type_id);
                if (member_name) H5free_memory(member_name);
                return -1;
            }
        } else {
            if (append_text(data, "Unsupported") != 0) {
                if (member_name) H5free_memory(member_name);
                return -1;
            }
        }
        if (append_text(data, "\",\"class\":\"") != 0) {
            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
            return -1;
        }
        if (append_text(data, type_class_label(member_class)) != 0) {
            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
            return -1;
        }
        if (append_text(data, "\"}") != 0) {
            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
            return -1;
        }

        if (member_type_id >= 0) H5Tclose(member_type_id);
        if (member_name) H5free_memory(member_name);
    }

    return append_text(data, "]");
}

static int append_compound_member_value_json(TraversalData *data, const unsigned char *record_base, hid_t member_type_id, size_t member_offset) {
    if (!record_base || member_type_id < 0) {
        return append_text(data, "null");
    }

    const unsigned char *member_ptr = record_base + member_offset;
    H5T_class_t member_class = H5Tget_class(member_type_id);
    size_t size = H5Tget_size(member_type_id);

    if (member_class == H5T_INTEGER) {
        H5T_sign_t sign = H5Tget_sign(member_type_id);
        if (sign == H5T_SGN_NONE) {
            unsigned long long value = 0;
            if (size == 1) value = (unsigned long long)(*(const unsigned char *)member_ptr);
            else if (size == 2) {
                unsigned short tmp = 0;
                memcpy(&tmp, member_ptr, sizeof(unsigned short));
                value = (unsigned long long)tmp;
            } else if (size == 4) {
                unsigned int tmp = 0;
                memcpy(&tmp, member_ptr, sizeof(unsigned int));
                value = (unsigned long long)tmp;
            } else {
                unsigned long long tmp = 0;
                size_t copy_size = size < sizeof(unsigned long long) ? size : sizeof(unsigned long long);
                memcpy(&tmp, member_ptr, copy_size);
                value = tmp;
            }

            char num_buf[64];
            snprintf(num_buf, sizeof(num_buf), "%llu", value);
            return append_text(data, num_buf);
        }

        long long value = 0;
        if (size == 1) value = (long long)(*(const signed char *)member_ptr);
        else if (size == 2) {
            short tmp = 0;
            memcpy(&tmp, member_ptr, sizeof(short));
            value = (long long)tmp;
        } else if (size == 4) {
            int tmp = 0;
            memcpy(&tmp, member_ptr, sizeof(int));
            value = (long long)tmp;
        } else {
            long long tmp = 0;
            size_t copy_size = size < sizeof(long long) ? size : sizeof(long long);
            memcpy(&tmp, member_ptr, copy_size);
            value = tmp;
        }

        char num_buf[64];
        snprintf(num_buf, sizeof(num_buf), "%lld", value);
        return append_text(data, num_buf);
    }

    if (member_class == H5T_FLOAT) {
        double value = 0.0;
        if (size == sizeof(float)) {
            float tmp = 0.0f;
            memcpy(&tmp, member_ptr, sizeof(float));
            value = (double)tmp;
        } else {
            memcpy(&value, member_ptr, size < sizeof(double) ? size : sizeof(double));
        }

        char num_buf[128];
        snprintf(num_buf, sizeof(num_buf), "%.17g", value);
        return append_text(data, num_buf);
    }

    if (member_class == H5T_STRING) {
        if (append_text(data, "\"") != 0) return -1;
        if (H5Tis_variable_str(member_type_id) > 0) {
            const char *v = *(char * const *)member_ptr;
            if (v && append_escaped_json(data, v) != 0) return -1;
        } else {
            size_t str_size = H5Tget_size(member_type_id);
            char *buf = (char *)calloc(str_size + 1, 1);
            if (!buf) return -1;
            memcpy(buf, member_ptr, str_size);
            buf[str_size] = '\0';
            int rc = append_escaped_json(data, buf);
            free(buf);
            if (rc != 0) return -1;
        }
        return append_text(data, "\"");
    }

    return append_text(data, "null");
}

static int append_compound_rows_json(TraversalData *data, hid_t dataset_id, hid_t dataset_type_id, hid_t dataset_space_id, hsize_t read_points) {
    if (append_text(data, "[") != 0) return -1;
    if (read_points == 0) {
        return append_text(data, "]");
    }

    size_t record_size = H5Tget_size(dataset_type_id);
    if (record_size == 0) {
        return append_text(data, "]");
    }

    size_t total_size = (size_t)read_points * record_size;
    unsigned char *records = (unsigned char *)calloc(total_size, 1);
    if (!records) return -1;

    if (H5Dread(dataset_id, dataset_type_id, H5S_ALL, H5S_ALL, H5P_DEFAULT, records) < 0) {
        free(records);
        return -1;
    }

    int member_count = H5Tget_nmembers(dataset_type_id);
    if (member_count < 0) member_count = 0;

    for (hsize_t i = 0; i < read_points; i++) {
        if (i > 0 && append_text(data, ",") != 0) {
            H5Dvlen_reclaim(dataset_type_id, dataset_space_id, H5P_DEFAULT, records);
            free(records);
            return -1;
        }

        if (append_text(data, "{") != 0) {
            H5Dvlen_reclaim(dataset_type_id, dataset_space_id, H5P_DEFAULT, records);
            free(records);
            return -1;
        }

        const unsigned char *row_ptr = records + (size_t)i * record_size;
        for (int m = 0; m < member_count; m++) {
            char *member_name = H5Tget_member_name(dataset_type_id, (unsigned int)m);
            hid_t member_type_id = H5Tget_member_type(dataset_type_id, (unsigned int)m);
            size_t member_offset = H5Tget_member_offset(dataset_type_id, (unsigned int)m);

            if (m > 0 && append_text(data, ",") != 0) {
                if (member_type_id >= 0) H5Tclose(member_type_id);
                if (member_name) H5free_memory(member_name);
                H5Dvlen_reclaim(dataset_type_id, dataset_space_id, H5P_DEFAULT, records);
                free(records);
                return -1;
            }

            if (append_text(data, "\"") != 0 || append_escaped_json(data, member_name ? member_name : "") != 0 || append_text(data, "\":") != 0) {
                if (member_type_id >= 0) H5Tclose(member_type_id);
                if (member_name) H5free_memory(member_name);
                H5Dvlen_reclaim(dataset_type_id, dataset_space_id, H5P_DEFAULT, records);
                free(records);
                return -1;
            }

            if (append_compound_member_value_json(data, row_ptr, member_type_id, member_offset) != 0) {
                if (member_type_id >= 0) H5Tclose(member_type_id);
                if (member_name) H5free_memory(member_name);
                H5Dvlen_reclaim(dataset_type_id, dataset_space_id, H5P_DEFAULT, records);
                free(records);
                return -1;
            }

            if (member_type_id >= 0) H5Tclose(member_type_id);
            if (member_name) H5free_memory(member_name);
        }

        if (append_text(data, "}") != 0) {
            H5Dvlen_reclaim(dataset_type_id, dataset_space_id, H5P_DEFAULT, records);
            free(records);
            return -1;
        }
    }

    H5Dvlen_reclaim(dataset_type_id, dataset_space_id, H5P_DEFAULT, records);
    free(records);
    return append_text(data, "]");
}

int read_leaf_payload_json(const char *filepath, const char *leaf_path, char *output_buffer, int max_buffer_size) {
    if (!filepath || !leaf_path || !output_buffer || max_buffer_size <= 64) {
        return -10;
    }

    output_buffer[0] = '\0';
    htri_t is_h5 = H5Fis_hdf5(filepath);
    if (is_h5 <= 0) return -1;

    hid_t file_id = H5Fopen(filepath, H5F_ACC_RDONLY, H5P_DEFAULT);
    if (file_id < 0) return -2;

    hid_t object_id = H5Oopen(file_id, leaf_path, H5P_DEFAULT);
    if (object_id < 0) {
        H5Fclose(file_id);
        return -3;
    }

    H5O_info_t object_info;
    #if H5_VERS_MINOR >= 12
        H5Oget_info3(object_id, &object_info, H5O_INFO_BASIC);
    #else
        H5Oget_info(object_id, &object_info);
    #endif

    TraversalData out;
    out.buffer = output_buffer;
    out.max_size = max_buffer_size;
    out.current_len = 0;
    out.count = 0;

    if (append_text(&out, "{") != 0) {
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -4;
    }
    if (append_text(&out, "\"path\":\"") != 0 || append_escaped_json(&out, leaf_path) != 0 || append_text(&out, "\",") != 0) {
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -4;
    }

    if (object_info.type != H5O_TYPE_DATASET) {
        if (append_text(&out, "\"class\":\"Group\",\"message\":\"Leaf path is not a dataset.\"}") != 0) {
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -4;
        }
        H5Oclose(object_id);
        H5Fclose(file_id);
        return out.current_len;
    }

    hid_t dataset_id = H5Dopen2(file_id, leaf_path, H5P_DEFAULT);
    if (dataset_id < 0) {
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -5;
    }

    char class_attr[64] = {0};
    const char *semantic_class = "Dataset";
    if (read_class_attribute(dataset_id, class_attr, sizeof(class_attr)) == 0) {
        if (strcmp(class_attr, "IMAGE") == 0) semantic_class = "Image";
        else if (strcmp(class_attr, "TABLE") == 0) semantic_class = "Table";
    }

    hid_t space_id = H5Dget_space(dataset_id);
    hid_t type_id = H5Dget_type(dataset_id);
    if (space_id < 0 || type_id < 0) {
        if (space_id >= 0) H5Sclose(space_id);
        if (type_id >= 0) H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -6;
    }

    if (append_text(&out, "\"class\":\"") != 0 || append_text(&out, semantic_class) != 0 || append_text(&out, "\",") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    if (append_text(&out, "\"shape\":") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    hsize_t dims[8] = {0};
    int rank = 0;
    if (append_shape_json(&out, space_id, dims, &rank) != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    H5T_class_t type_class = H5Tget_class(type_id);
    const char *dtype_label = "Unsupported";
    if (type_class == H5T_INTEGER) dtype_label = "Integer";
    else if (type_class == H5T_FLOAT) dtype_label = "Float";
    else if (type_class == H5T_STRING) dtype_label = "String";
    else if (type_class == H5T_COMPOUND) dtype_label = "Compound";

    if (append_text(&out, ",\"dtype\":\"") != 0 || append_text(&out, dtype_label) != 0 || append_text(&out, "\"") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    if (type_class == H5T_COMPOUND) {
        if (append_text(&out, ",\"columns\":") != 0 || append_compound_columns_json(&out, type_id) != 0) {
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -7;
        }
    }

    hsize_t total_points = H5Sget_simple_extent_npoints(space_id);
    if ((hssize_t)total_points < 0) total_points = 0;
    const hsize_t max_points = 4096;
    const int is_truncated = total_points > max_points;
    // Avoid unsafe partial reads with H5S_ALL: for oversized datasets we only stage metadata.
    hsize_t read_points = is_truncated ? 0 : total_points;

    if (append_text(&out, ",\"elementCount\":") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }
    char count_buf[64];
    snprintf(count_buf, sizeof(count_buf), "%llu", (unsigned long long)total_points);
    if (append_text(&out, count_buf) != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    if (append_text(&out, ",\"truncated\":") != 0 || append_text(&out, is_truncated ? "true" : "false") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    if (append_text(&out, ",\"sampledElementCount\":") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }
    char sampled_count_buf[64];
    snprintf(sampled_count_buf, sizeof(sampled_count_buf), "%llu", (unsigned long long)read_points);
    if (append_text(&out, sampled_count_buf) != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    if (append_text(&out, ",\"values\":") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -7;
    }

    if (read_points == 0) {
        if (append_text(&out, "[]") != 0) {
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -7;
        }
        if (type_class == H5T_COMPOUND) {
            if (append_text(&out, ",\"rows\":[]") != 0) {
                H5Sclose(space_id);
                H5Tclose(type_id);
                H5Dclose(dataset_id);
                H5Oclose(object_id);
                H5Fclose(file_id);
                return -8;
            }
        }
    } else if (type_class == H5T_INTEGER) {
        long long *values = (long long *)malloc((size_t)read_points * sizeof(long long));
        if (!values) {
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        if (H5Dread(dataset_id, H5T_NATIVE_LLONG, H5S_ALL, H5S_ALL, H5P_DEFAULT, values) < 0) {
            free(values);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        if (append_text(&out, "[") != 0) {
            free(values);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        for (hsize_t i = 0; i < read_points; i++) {
            if (i > 0 && append_text(&out, ",") != 0) {
                free(values);
                H5Sclose(space_id);
                H5Tclose(type_id);
                H5Dclose(dataset_id);
                H5Oclose(object_id);
                H5Fclose(file_id);
                return -8;
            }
            char num_buf[64];
            snprintf(num_buf, sizeof(num_buf), "%lld", values[i]);
            if (append_text(&out, num_buf) != 0) {
                free(values);
                H5Sclose(space_id);
                H5Tclose(type_id);
                H5Dclose(dataset_id);
                H5Oclose(object_id);
                H5Fclose(file_id);
                return -8;
            }
        }
        if (append_text(&out, "]") != 0) {
            free(values);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        free(values);
    } else if (type_class == H5T_COMPOUND) {
        if (append_text(&out, "[]") != 0) {
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        if (append_text(&out, ",\"rows\":") != 0 || append_compound_rows_json(&out, dataset_id, type_id, space_id, read_points) != 0) {
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
    } else if (type_class == H5T_FLOAT) {
        double *values = (double *)malloc((size_t)read_points * sizeof(double));
        if (!values) {
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        if (H5Dread(dataset_id, H5T_NATIVE_DOUBLE, H5S_ALL, H5S_ALL, H5P_DEFAULT, values) < 0) {
            free(values);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        if (append_text(&out, "[") != 0) {
            free(values);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        for (hsize_t i = 0; i < read_points; i++) {
            if (i > 0 && append_text(&out, ",") != 0) {
                free(values);
                H5Sclose(space_id);
                H5Tclose(type_id);
                H5Dclose(dataset_id);
                H5Oclose(object_id);
                H5Fclose(file_id);
                return -8;
            }
            char num_buf[128];
            snprintf(num_buf, sizeof(num_buf), "%.17g", values[i]);
            if (append_text(&out, num_buf) != 0) {
                free(values);
                H5Sclose(space_id);
                H5Tclose(type_id);
                H5Dclose(dataset_id);
                H5Oclose(object_id);
                H5Fclose(file_id);
                return -8;
            }
        }
        if (append_text(&out, "]") != 0) {
            free(values);
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
        free(values);
    } else {
        if (append_text(&out, "[]") != 0) {
            H5Sclose(space_id);
            H5Tclose(type_id);
            H5Dclose(dataset_id);
            H5Oclose(object_id);
            H5Fclose(file_id);
            return -8;
        }
    }

    if (append_text(&out, "}") != 0) {
        H5Sclose(space_id);
        H5Tclose(type_id);
        H5Dclose(dataset_id);
        H5Oclose(object_id);
        H5Fclose(file_id);
        return -9;
    }

    H5Sclose(space_id);
    H5Tclose(type_id);
    H5Dclose(dataset_id);
    H5Oclose(object_id);
    H5Fclose(file_id);
    return out.current_len;
}