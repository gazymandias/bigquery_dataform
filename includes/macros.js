module.exports = {
    formatJsonSchema,
    getCurrentDate
};

function formatSchema(fields, level = 0) {
    const indentation = "  ".repeat(level);
    const fieldPad = "`";

    return fields.map(field => {
        let fieldType = field.type;
        let fieldDefinition;
        // Add a prefix of "64" to the field type for FLOAT and INT
        if (field.type && (field.type.toUpperCase() === "FLOAT" || field.type.toUpperCase() === "INT")) {
            fieldType = field.type + "64";
        }

        if (field.type && (field.type.toUpperCase() === "RECORD")) {
            // If it's a nested record, format it recursively
            const nestedFields = formatSchema(field.fields, level + 1);
            if (field.mode && (field.mode.toUpperCase() === "REPEATED")) {
                // If the field is REPEATED, add ARRAY<> around the STRUCT<>
                fieldDefinition = `${indentation}${fieldPad}${field.name}${fieldPad} ARRAY<STRUCT<\n${nestedFields}\n${indentation}>>`;
            } else {
                fieldDefinition = `${indentation}${fieldPad}${field.name}${fieldPad} STRUCT<\n${nestedFields}\n${indentation}>`;
            }
            return fieldDefinition;
        }

        if (field.mode && (field.mode.toUpperCase() === "REPEATED")) {
            fieldDefinition = `${indentation}${fieldPad}${field.name}${fieldPad} ARRAY<${fieldType}>`;
        } else {
            fieldDefinition = `${indentation}${fieldPad}${field.name}${fieldPad} ${fieldType}`;
        }
        if (field.mode && (field.mode.toUpperCase() === "REQUIRED")) {
            // If the field is required, add "NOT NULL"
            fieldDefinition += " NOT NULL";
        }

        return fieldDefinition;
    }).join(",\n");
}

function formatJsonSchema(schemaString) {
    return formatSchema(schemaString.fields);
}

function getCurrentDate() {
    let currentDate = new Date().toJSON().slice(0, 10);
    return currentDate;
}

