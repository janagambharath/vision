"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type CsvRow = Record<string, string>;
type ValidationResult = {
  rowIndex: number;
  row: CsvRow;
  errors: string[];
  slug: string;
};

export default function ProductImportPage() {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importResult, setImportResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setError("");
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);

    // Validate via API
    setLoading(true);
    try {
      const res = await fetch("/api/admin/product-import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Validation failed");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setValidationResults(data.results);
      setStep("preview");
    } catch {
      setError("Failed to validate CSV");
    }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    const validCount = validationResults.filter((r) => r.errors.length === 0).length;
    if (validCount === 0) return;

    setStep("importing");
    try {
      const res = await fetch("/api/admin/product-import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import failed");
        setStep("preview");
        return;
      }
      const data = await res.json();
      setImportResult(data);
      setStep("done");
    } catch {
      setError("Import failed");
      setStep("preview");
    }
  };

  const downloadTemplate = () => {
    fetch("/api/admin/product-import/template")
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vision-vistara-product-import-template.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const validCount = validationResults.filter((r) => r.errors.length === 0).length;
  const errorCount = validationResults.filter((r) => r.errors.length > 0).length;

  return (
    <main className="vv-section">
      <div className="vv-container max-w-5xl">
        <div className="mb-6">
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:text-teal-900 transition mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900">Import Products from CSV</h1>
          <p className="mt-1 text-slate-600">Upload a CSV file to bulk-create products. All imported products are created as <strong>drafts</strong> — add images and publish from the product editor.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div className="grid gap-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center transition hover:border-teal-400 hover:bg-teal-50/30"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
                  <span className="font-bold text-teal-700">Validating CSV...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileSpreadsheet className="h-12 w-12 text-slate-400" />
                  <span className="text-lg font-bold text-slate-700">Drag & drop your CSV file here</span>
                  <span className="text-sm text-slate-500">or click to browse • .csv files only</span>
                </div>
              )}
            </div>

            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700 transition"
            >
              <Download className="h-4 w-4" /> Download CSV Template
            </button>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-extrabold text-slate-800 mb-2">CSV Format Guide</h3>
              <p className="text-sm text-slate-600 mb-3">Your CSV must include these <strong>required</strong> columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {["name", "brand", "sku", "pricePaise", "costPricePaise", "stock", "description"].map((col) => (
                  <span key={col} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 border border-teal-200">{col}</span>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-3">Prices are in <strong>paise</strong> (₹1,499 = 149900). Arrays use <code>|</code> as separator (e.g., <code>Oval|Round|Heart</code>).</p>
            </div>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === "preview" && (
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500">Total Rows</span>
                <strong className="mt-1 block text-2xl text-slate-900">{validationResults.length}</strong>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <span className="text-xs font-extrabold uppercase text-green-700">Valid</span>
                <strong className="mt-1 block text-2xl text-green-800">{validCount}</strong>
              </div>
              <div className={`rounded-xl border p-4 ${errorCount > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                <span className={`text-xs font-extrabold uppercase ${errorCount > 0 ? "text-red-600" : "text-slate-500"}`}>Errors</span>
                <strong className={`mt-1 block text-2xl ${errorCount > 0 ? "text-red-800" : "text-slate-900"}`}>{errorCount}</strong>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">#</th>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">Brand</th>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">Name</th>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">SKU</th>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">Slug</th>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">Price</th>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">Stock</th>
                      <th className="px-3 py-2 text-left font-extrabold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.map((result) => (
                      <tr key={result.rowIndex} className={result.errors.length > 0 ? "bg-red-50" : "hover:bg-slate-50"}>
                        <td className="px-3 py-2 text-slate-500">{result.rowIndex + 2}</td>
                        <td className="px-3 py-2 font-bold">{result.row.brand}</td>
                        <td className="px-3 py-2">{result.row.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{result.row.sku}</td>
                        <td className="px-3 py-2 font-mono text-xs text-teal-700">{result.slug}</td>
                        <td className="px-3 py-2">₹{((Number(result.row.pricePaise) || 0) / 100).toFixed(0)}</td>
                        <td className="px-3 py-2">{result.row.stock}</td>
                        <td className="px-3 py-2">
                          {result.errors.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {result.errors.map((err, i) => (
                                <span key={i} className="text-xs text-red-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" /> {err}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setStep("upload"); setValidationResults([]); setCsvText(""); setFileName(""); setError(""); }}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-slate-400 transition"
              >
                Upload Different File
              </button>
              {validCount > 0 && (
                <button
                  onClick={handleImport}
                  className="vv-button-retail"
                >
                  <Upload className="h-4 w-4" />
                  Import {validCount} Valid Product{validCount !== 1 ? "s" : ""} as Drafts
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Importing */}
        {step === "importing" && (
          <div className="vv-card p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-teal-600 animate-spin mb-4" />
            <h2 className="text-xl font-extrabold text-slate-900">Importing Products...</h2>
            <p className="mt-2 text-slate-600">Creating {validCount} products in the database. This may take a moment.</p>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === "done" && importResult && (
          <div className="grid gap-5">
            <div className="vv-card p-8 text-center">
              <CheckCircle2 className="h-14 w-14 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-extrabold text-slate-900">Import Complete</h2>
              <p className="mt-2 text-lg text-slate-600">
                <strong className="text-green-700">{importResult.created}</strong> products created as drafts
                {importResult.errors.length > 0 && (
                  <span className="text-red-600"> · {importResult.errors.length} errors</span>
                )}
              </p>
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h3 className="font-extrabold text-red-800 mb-2">Import Errors</h3>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-700">Row {err.row}: {err.message}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/admin/products" className="vv-button-retail">
                View All Products
              </Link>
              <button
                onClick={() => { setStep("upload"); setValidationResults([]); setCsvText(""); setFileName(""); setError(""); setImportResult(null); }}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-slate-400 transition"
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
