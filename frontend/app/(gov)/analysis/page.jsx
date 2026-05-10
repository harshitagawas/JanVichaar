"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AnalysisReport from "@/components/AnalysisReport";
import { listLegislation } from "@/lib/legislation";
import { prepareAnalysisReport } from "@/lib/analysisReport";
import { captureChartImages, generatePDF } from "@/lib/pdfExport";

function LoadingOverlay({ message }) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="rounded bg-white px-6 py-5 shadow-xl text-center">
        <span className="mx-auto block h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-700 animate-spin" />
        <p className="mt-3 text-sm font-medium text-gray-800">{message}</p>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const [legislations, setLegislations] = useState([]);
  const [selectedLegislation, setSelectedLegislation] = useState("");
  const [reportData, setReportData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPDFReady, setIsPDFReady] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfURL, setPdfURL] = useState("");
  const [chartImages, setChartImages] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const pdfPreviewRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_SENTIMENT_API || "http://localhost:8000";
  }, []);

  const selectedLegislationItem = useMemo(
    () =>
      legislations.find(
        (item) =>
          (item.legislationId || item.id) === selectedLegislation,
      ) || null,
    [legislations, selectedLegislation],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const items = await listLegislation();
        if (!cancelled) setLegislations(items);
      } catch (error) {
        console.error("Failed to load legislations", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const runAnalysis = async () => {
    if (!selectedLegislation) return null;

    setIsAnalyzing(true);
    setStatusMessage("Running sentiment analysis...");

    try {
      const report = await prepareAnalysisReport({
        legislationId: selectedLegislation,
        legislation: selectedLegislationItem,
        apiBase,
        onStatus: setStatusMessage,
      });

      setReportData(report);
      return report;
    } catch (error) {
      console.error("analysis failed", error);
      return null;
    } finally {
      setIsAnalyzing(false);
      setStatusMessage("");
    }
  };

  useEffect(() => {
    setReportData(null);
    setPreviewData(null);
    setIsPDFReady(false);
    setPdfBlob(null);
    setChartImages({});
    setIsExporting(false);

    if (pdfURL) {
      URL.revokeObjectURL(pdfURL);
      setPdfURL("");
    }

    if (selectedLegislation) runAnalysis();
  }, [selectedLegislation]);

  useEffect(() => {
    if (!previewData || !pdfPreviewRef.current) return undefined;

    let cancelled = false;

    const preparePdf = async () => {
      setIsPreparingPdf(true);
      setStatusMessage("Preparing PDF...");
      setIsPDFReady(false);

      try {
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });

        setStatusMessage("Generating visual insights...");
        const images = await captureChartImages({
          pie: pieChartRef,
          bar: barChartRef,
        });

        if (cancelled) return;

        setChartImages(images);
        setIsExporting(true);
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (cancelled) return;

        setStatusMessage("Preparing PDF...");
        const { blob, url } = await generatePDF(previewData, {
          element: pdfPreviewRef.current,
        });

        if (!cancelled) {
          setPdfBlob(blob);
          setPdfURL(url);
          setIsPDFReady(true);
        }
      } catch (error) {
        console.error("Failed to prepare PDF", error);
      } finally {
        if (!cancelled) {
          setIsPreparingPdf(false);
          setStatusMessage("");
          setIsExporting(false);
        }
      }
    };

    preparePdf();

    return () => {
      cancelled = true;
    };
  }, [previewData]);

  const handleExportPdf = async () => {
    if (!selectedLegislation || isAnalyzing || isPreparingPdf) return;

    setIsPDFReady(false);
    setPdfBlob(null);
    setChartImages({});
    setIsExporting(false);

    if (pdfURL) {
      URL.revokeObjectURL(pdfURL);
      setPdfURL("");
    }

    const report = reportData || (await runAnalysis());
    if (report) setPreviewData(report);
  };

  const downloadPdf = () => {
    if (!pdfBlob || !isPDFReady) return;

    const link = document.createElement("a");
    link.href = pdfURL;
    link.download = `analysis_${selectedLegislation}_${Date.now()}.pdf`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      <LoadingOverlay message={statusMessage} />

      <div data-export="exclude">
        <label className="block mb-2 font-medium">Select Legislation</label>
        <div className="flex items-center gap-3">
          <select
            className="border px-3 py-2 rounded"
            value={selectedLegislation}
            onChange={(event) => setSelectedLegislation(event.target.value)}
          >
            <option value="">All</option>
            {legislations.map((item) => (
              <option key={item.id} value={item.legislationId || item.id}>
                {item.title}
              </option>
            ))}
          </select>

          {reportData?.needsUrgentAttention && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Requires Immediate Attention
            </div>
          )}

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!selectedLegislation || isAnalyzing || isPreparingPdf}
            className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {isPreparingPdf
              ? "Preparing PDF..."
              : isAnalyzing
                ? "Running analysis..."
                : "Export PDF"}
          </button>

          {previewData && (
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!isPDFReady}
              className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
            >
              Download PDF
            </button>
          )}
        </div>

        {!selectedLegislation && (
          <p className="text-sm text-gray-500 mt-2">
            Select a legislation to enable export.
          </p>
        )}
      </div>

      {reportData ? (
        <AnalysisReport data={reportData} includeComments />
      ) : (
        <div className="bg-white shadow rounded p-4 text-gray-600">
          {selectedLegislation
            ? "Analysis will appear here after processing."
            : "Select a legislation to view analysis."}
        </div>
      )}

      {previewData && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">PDF Preview</h3>
          <div className="overflow-x-auto bg-gray-50 border p-4 rounded">
            <div ref={pdfPreviewRef} className="bg-white p-6 w-[800px] mx-auto shadow-sm">
              <AnalysisReport
                data={previewData}
                includeComments={false}
                isExporting={isExporting}
                chartImages={chartImages}
                chartRefs={{ pie: pieChartRef, bar: barChartRef }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
