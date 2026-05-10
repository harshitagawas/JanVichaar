"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function ExportPage() {
  const [legislations, setLegislations] = useState([]);
  const [selectedLegislation, setSelectedLegislation] = useState("");
  const [reportData, setReportData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPDFReady, setIsPDFReady] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfURL, setPdfURL] = useState("");
  const [chartImages, setChartImages] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const previewRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_SENTIMENT_API || "http://127.0.0.1:8000",
    [],
  );

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

  useEffect(() => {
    if (pdfURL) URL.revokeObjectURL(pdfURL);

    setReportData(null);
    setIsPDFReady(false);
    setPdfBlob(null);
    setPdfURL("");
    setChartImages({});
    setIsExporting(false);

    if (!selectedLegislation) return undefined;

    let cancelled = false;

    const runAnalysis = async () => {
      setIsAnalyzing(true);
      setStatusMessage("Analyzing feedback and preparing report...");

      try {
        const report = await prepareAnalysisReport({
          legislationId: selectedLegislation,
          legislation: selectedLegislationItem,
          apiBase,
          onStatus: (message) => {
            if (!cancelled) setStatusMessage(message);
          },
        });

        if (!cancelled) setReportData(report);
      } catch (error) {
        console.error("Failed to prepare export analysis", error);
      } finally {
        if (!cancelled) {
          setIsAnalyzing(false);
          setStatusMessage("");
        }
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [apiBase, selectedLegislation, selectedLegislationItem]);

  useEffect(() => {
    if (!reportData || !previewRef.current) return undefined;

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
        const { blob, url } = await generatePDF(reportData, {
          element: previewRef.current,
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
  }, [reportData]);

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

      <h2 className="text-2xl font-bold text-gray-800">Export Reports</h2>

      <div
        data-export="exclude"
        className="bg-white shadow rounded p-6 max-w-3xl mx-auto text-center space-y-4"
      >
        <div className="max-w-lg mx-auto text-left">
          <label className="block mb-2 font-medium">Select Legislation</label>
          <select
            className="border px-3 py-2 rounded w-full"
            value={selectedLegislation}
            onChange={(event) => setSelectedLegislation(event.target.value)}
          >
            <option value="">-- Select --</option>
            {legislations.map((item) => (
              <option key={item.id} value={item.legislationId || item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        {selectedLegislation && (isAnalyzing || isPreparingPdf) && (
          <div className="flex items-center justify-center gap-2 text-indigo-700">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-indigo-300 border-t-indigo-700 animate-spin" />
            {isAnalyzing
              ? "Analyzing feedback and preparing report..."
              : "Preparing PDF..."}
          </div>
        )}

        <button
          type="button"
          onClick={downloadPdf}
          disabled={!isPDFReady}
          className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          Download PDF
        </button>
      </div>

      {reportData && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">PDF Preview</h3>
          <div className="overflow-x-auto bg-gray-50 border p-4 rounded">
            <div ref={previewRef} className="bg-white p-6 w-[800px] mx-auto shadow-sm">
              <AnalysisReport
                data={reportData}
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
