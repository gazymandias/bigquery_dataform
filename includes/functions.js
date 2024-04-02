module.exports = {
    formatJsonSchema,
    getCurrentDate,
    getCsvSeedQuery
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

function getCurrentDate(hoursOffset = 0) {
  let currentDate = new Date();
  // Check if hoursOffset is negative or positive
  if (hoursOffset < 0) {
    // Subtract the absolute value of the negative hours offset (in milliseconds)
    currentDate.setTime(currentDate.getTime() - Math.abs(hoursOffset) * 60 * 60 * 1000);
  } else {
    // Add the positive hours offset (in milliseconds)
    currentDate.setTime(currentDate.getTime() + hoursOffset * 60 * 60 * 1000);
  }
  let formattedDate = currentDate.toJSON().slice(0, 10);
  return formattedDate;
}


function getCsvSeedQuery(csvData, headerTypes = None) {
    const parseCSV = csv => {
        const rows = [];
        let currentRow = '';
        let insideQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const char = csv[i];

            if (char === '\n' && !insideQuotes) {
                rows.push(currentRow.replace(/\n+/g, ' ').trim());
                currentRow = '';
            } else {
                currentRow += char;
                if (char === '"' || char === "'") {
                    insideQuotes = !insideQuotes;
                }
            }
        }

        if (currentRow.trim().length > 0) {
            rows.push(currentRow.replace(/\n+/g, ' ').trim());
        }
        // const rows = csv.trim().split('\n').map(row => row.trim());
        return rows.map(row => {
            const cells = [];
            let currentCell = '';
            let insideQuotes = false;
            let quoteChar = '';

            for (let i = 0; i < row.length; i++) {
                const char = row[i];

                if (!insideQuotes && char === ',') {
                    cells.push(currentCell);
                    currentCell = '';
                } else {
                    if (!insideQuotes && (char === '"' || char === "'")) {
                        insideQuotes = true;
                        quoteChar = char;
                    } else if (insideQuotes && char === quoteChar) {
                        insideQuotes = false;
                        quoteChar = '';
                    } else if (insideQuotes && char === '\\' && row[i + 1] === quoteChar) {
                        currentCell += quoteChar;
                        i++;
                        continue;
                    } else {
                        currentCell += char === '"' ? "'" : char;
                    }
                }
            }

            cells.push(currentCell.replace(new RegExp(`${quoteChar}`, 'g'), ''));

            return cells.map(cell => cell.trim());
        });
    };

    const getTypeMapping = (header, headerTypes) => {
        const typeMapping = {};
        header.forEach((headerName, index) => {
            if (headerTypes && headerTypes[headerName]) {
                typeMapping[headerName] = headerTypes[headerName].toUpperCase();
            } else {
                const columnValues = rows
                    .slice(1)
                    .map((row) => row[index].trim().toLowerCase());
                const allNumeric = columnValues.every((value) => !isNaN(Number(value)));
                const allBool = columnValues.every((value) =>
                    ["true", "false", "", "null"].includes(value),
                );
                const allDate = columnValues.every(
                    (value) => !value || /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value),
                );

                if (allNumeric) {
                    typeMapping[headerName] = "NUMERIC";
                } else if (allBool) {
                    typeMapping[headerName] = "BOOL";
                } else if (allDate) {
                    typeMapping[headerName] = "DATE";
                } else {
                    typeMapping[headerName] = "STRING";
                }
            }
        });
        return typeMapping;
    };

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split(/[\/\-\.]/);
        return `${year}-${month}-${day}`;
    };

    const isColumnNumericOrBool = columnIndex => rows.slice(1).every(row => {
        const value = row[columnIndex].trim().toLowerCase();
        return !isNaN(Number(value)) || ['true', 'false', '', 'null'].includes(value);
    });

    const generateRowValues = (row, header, isFirstRow, typeMapping) => {
        return row.map((cell, colIndex) => {
            const cellType = typeMapping[header[colIndex]];
            const safeCast = value => `SAFE_CAST(${value} AS ${cellType})`;

            if (isFirstRow) {
                if (cell === '') return `${safeCast("NULL")} AS ${header[colIndex]}`;
                if (cellType === 'DATE') return `${safeCast(`DATE("${formatDate(cell)}")`)} AS ${header[colIndex]}`;
                return `${isColumnNumericOrBool(colIndex) ? safeCast(cell) : safeCast(`"${cell}"`)} AS ${header[colIndex]}`;
            } else {
                if (cell === '') return safeCast("NULL");
                if (cellType === 'DATE') return safeCast(`DATE("${formatDate(cell)}")`);
                return isColumnNumericOrBool(colIndex) ? safeCast(cell) : safeCast(`"${cell}"`);
            }
        });
    };

    const getCleanHeaders = (headerRow) => {
        let customFieldIndex = 0;
        return headerRow.map(cell => {
            if (!cell.trim()) {
                return `custom_field_${customFieldIndex++}`;
            } else {
                return cell.toLowerCase().replace(/\s+/g, '_');
            }
        })
    };

    const generateSQLSelect = (header, rows, typeMapping) => {
        const columnDefinitions = header.map(col => col).join(',\n\t');
        const dataRowsSQL = rows.slice(1).map((row, rowIndex) => {
            const isFirstRow = rowIndex === 0;
            return `(${generateRowValues(row, header, isFirstRow, typeMapping).join(', ')})`;
        }).join(',\n\t\t\t');
        return `SELECT\n\t${columnDefinitions}\nFROM\n\tUNNEST(\n\t\t[STRUCT\n\t\t\t${dataRowsSQL}\n\t\t]\n\t)`;
    };

    const rows = parseCSV(csvData);
    const headers = getCleanHeaders(rows[0])
    const typeMapping = getTypeMapping(headers, headerTypes);
    const sqlSelect = generateSQLSelect(headers, rows, typeMapping);
    return sqlSelect;
}
