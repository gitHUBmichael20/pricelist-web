"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { BASE_URL } from "@/config/api";

type Product = {
  sheet: string;
  model: string;
  price?: number | null;
  description?: string | null;
  details: Record<string, unknown>;
};

type RowData = (string | number | null | undefined)[];

export default function Organize() {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [jsonData, setJsonData] = useState<Product[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [startRow, setStartRow] = useState<number>(1);
  const [nameColumn, setNameColumn] = useState<string>("");
  const [descColumn, setDescColumn] = useState<string>("");
  const [priceColumn, setPriceColumn] = useState<string>("");
  const [excludedColumns, setExcludedColumns] = useState<string[]>([]);
  const [excludedRows, setExcludedRows] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [availableRows, setAvailableRows] = useState<
    Array<{ value: string; display: string }>
  >([]);
  const [previewData, setPreviewData] = useState<RowData[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [selectedUpdateSheet, setSelectedUpdateSheet] = useState<string>("");
  const [existingSheets, setExistingSheets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchExistingSheets();
  }, []);

  const fetchExistingSheets = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products?per_page=100`);
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        const sheets = [
          ...new Set(data.data.map((p: { sheet: string }) => p.sheet)),
        ];
        setExistingSheets(sheets as string[]);
      }
    } catch (error) {
      console.error("Failed to fetch existing sheets:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (!event.target?.result) return;
      const data = new Uint8Array(event.target.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      setWorkbook(wb);
      setSelectedSheet(wb.SheetNames[0]);
    };
    reader.readAsArrayBuffer(file);
  };

  const updateTablePreview = () => {
    if (!workbook || !selectedSheet) return;

    const sheet = workbook.Sheets[selectedSheet];
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as RowData[];

    if (rawData.length < startRow) {
      alert("Start row exceeds available rows");
      return;
    }

    const dataFromStartRow = rawData.slice(startRow - 1);
    const headers = cleanHeaders(dataFromStartRow[0]);
    const rows = dataFromStartRow.slice(1);

    setAvailableColumns(headers);
    setPreviewData(rows.slice(0, 10));

    // Build row options for exclude dropdown
    const rowOptions = rows.map((row, idx) => {
      const firstCell = cleanCellValue(row[0]);
      return {
        value: firstCell || `Row ${idx + 2}`,
        display: firstCell || `(Empty) Row ${idx + 2}`,
      };
    });
    setAvailableRows(rowOptions);

    // Auto-select columns
    if (!nameColumn && headers.some((h) => h.toLowerCase().includes("model"))) {
      setNameColumn(
        headers.find((h) => h.toLowerCase().includes("model")) || ""
      );
    }
    if (!descColumn && headers.some((h) => h.toLowerCase().includes("desc"))) {
      setDescColumn(
        headers.find((h) => h.toLowerCase().includes("desc")) || ""
      );
    }
    if (
      !priceColumn &&
      headers.some((h) => h.toLowerCase().includes("price"))
    ) {
      setPriceColumn(
        headers.find((h) => h.toLowerCase().includes("price")) || ""
      );
    }
  };

  useEffect(() => {
    if (workbook && selectedSheet) {
      updateTablePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workbook, selectedSheet, startRow]);

  const cleanHeaders = (headers: RowData): string[] => {
    return (headers || [])
      .map((h) => {
        if (!h || h.toString().trim() === "") return "";
        return h.toString().trim().replace(/\n/g, " ").replace(/\s+/g, " ");
      })
      .filter((h) => h !== "");
  };

  const cleanCellValue = (
    value: string | number | null | undefined
  ): string => {
    if (value === null || value === undefined) return "";
    const strValue = value.toString().trim();
    if (strValue === "") return "";
    return strValue.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  };

  const generateJSON = () => {
    if (!workbook || !selectedSheet) {
      alert("Please upload a file and select a sheet");
      return;
    }

    if (!nameColumn || !descColumn || !priceColumn) {
      alert("Please select Name, Description, and Price columns");
      return;
    }

    const sheet = workbook.Sheets[selectedSheet];
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as RowData[];

    const dataFromStartRow = rawData.slice(startRow - 1);
    const headers = cleanHeaders(dataFromStartRow[0]);
    const dataRows = dataFromStartRow.slice(1);

    const jsonData: Product[] = [];
    const lastValidRow: Record<string, string> = {};

    dataRows.forEach((row) => {
      if (!row || row.length === 0) return;

      const hasData = row.some((cell) => cell && cell.toString().trim() !== "");
      if (!hasData) return;

      const firstCellValue = cleanCellValue(row[0]);

      // Skip excluded rows
      if (excludedRows.includes(firstCellValue)) return;

      const nameIdx = headers.indexOf(nameColumn);
      const descIdx = headers.indexOf(descColumn);
      const priceIdx = headers.indexOf(priceColumn);

      const name = cleanCellValue(row[nameIdx]);

      headers.forEach((header, idx) => {
        const cellValue = cleanCellValue(row[idx]);
        if (cellValue) {
          lastValidRow[header] = cellValue;
        }
      });

      if (!name) return;

      const priceValue =
        cleanCellValue(row[priceIdx]) || lastValidRow[priceColumn] || "";
      const parsedPrice = priceValue
        ? parseFloat(priceValue.replace(/[^0-9.-]/g, ""))
        : null;

      const product: Product = {
        sheet: selectedSheet,
        model: name,
        description:
          cleanCellValue(row[descIdx]) || lastValidRow[descColumn] || null,
        price: isNaN(parsedPrice as number) ? null : parsedPrice,
        details: {},
      };

      headers.forEach((header, idx) => {
        if (
          header === nameColumn ||
          header === descColumn ||
          header === priceColumn
        )
          return;
        if (excludedColumns.includes(header)) return;

        const cellValue = cleanCellValue(row[idx]);
        const finalValue = cellValue || lastValidRow[header] || "";

        if (finalValue) {
          product.details[header] = finalValue;
        }
      });

      jsonData.push(product);
    });

    setJsonData(jsonData);
  };

  const deleteSheetData = async (sheetName: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/delete-sheet`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheet: sheetName }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete existing sheet data");
      }

      return true;
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
  };

  const uploadToDatabase = async () => {
    if (!jsonData || jsonData.length === 0) {
      alert("No data to upload. Please generate JSON first.");
      return;
    }

    setIsLoading(true);

    try {
      // If updating, delete old data first
      if (isUpdating && selectedUpdateSheet) {
        const deleted = await deleteSheetData(selectedUpdateSheet);
        if (!deleted) {
          alert("Failed to delete existing data. Upload cancelled.");
          setIsLoading(false);
          return;
        }
      }

      const endpoint = "/api/products/store";
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      const data = await response.json();
      if (data.success) {
        alert(
          `Data ${isUpdating ? "updated" : "uploaded"} successfully! Total: ${
            jsonData.length
          } records`
        );
        setJsonData([]);
        setIsUpdating(false);
        setSelectedUpdateSheet("");
        fetchExistingSheets();
      } else {
        alert(
          `Failed to ${isUpdating ? "update" : "upload"} data: ${
            data.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        `Error: ${
          error instanceof Error
            ? error.message
            : "Connection failed. Check if backend is running at " + BASE_URL
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Excel to Database Organizer
        </h1>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Upload Excel File (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {workbook && (
          <>
            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Sheet
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {workbook.SheetNames.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Start Reading from Row
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startRow}
                    onChange={(e) => setStartRow(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {availableColumns.length > 0 && (
              <div className="mb-6 overflow-x-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Preview (First 10 Rows)
                </h3>
                <div className="max-h-96 overflow-y-auto border rounded-lg border-gray-300">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {availableColumns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-2 text-left text-xs font-bold text-gray-900 uppercase"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          {availableColumns.map((_, colIdx) => (
                            <td
                              key={colIdx}
                              className="px-4 py-2 text-sm text-gray-900"
                            >
                              {cleanCellValue(row[colIdx])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Map Required Columns
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Name/Model Column *
                  </label>
                  <select
                    value={nameColumn}
                    onChange={(e) => setNameColumn(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select Column</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description Column *
                  </label>
                  <select
                    value={descColumn}
                    onChange={(e) => setDescColumn(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select Column</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Price Column *
                  </label>
                  <select
                    value={priceColumn}
                    onChange={(e) => setPriceColumn(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select Column</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Exclude Columns (Optional)
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map((col) => (
                  <label
                    key={col}
                    className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={excludedColumns.includes(col)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExcludedColumns([...excludedColumns, col]);
                        } else {
                          setExcludedColumns(
                            excludedColumns.filter((c) => c !== col)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {col}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Exclude Rows (Optional)
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Select rows to skip based on the leftmost column value
              </p>
              <div className="flex flex-wrap gap-2">
                {availableRows.map((row, idx) => (
                  <label
                    key={idx}
                    className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={excludedRows.includes(row.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExcludedRows([...excludedRows, row.value]);
                        } else {
                          setExcludedRows(
                            excludedRows.filter((r) => r !== row.value)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {row.display}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={generateJSON}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg mb-4 transition-colors"
            >
              Generate JSON Data
            </button>
          </>
        )}

        {jsonData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Generated Data ({jsonData.length} records)
            </h3>
            <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto mb-4 border border-gray-300">
              <pre className="text-xs text-gray-900">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>

            {existingSheets.length > 0 && (
              <div className="mb-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    checked={isUpdating}
                    onChange={(e) => {
                      setIsUpdating(e.target.checked);
                      if (!e.target.checked) setSelectedUpdateSheet("");
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    Update existing sheet (will delete and replace all data)
                  </span>
                </label>
                {isUpdating && (
                  <select
                    value={selectedUpdateSheet}
                    onChange={(e) => setSelectedUpdateSheet(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select sheet to update</option>
                    {existingSheets.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={uploadToDatabase}
                disabled={isLoading || isUpdating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Processing..." : "Upload to Database"}
              </button>

              <button
                onClick={uploadToDatabase}
                disabled={isLoading || !isUpdating || !selectedUpdateSheet}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Processing..." : "Update Sheet in Database"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
