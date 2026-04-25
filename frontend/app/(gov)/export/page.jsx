"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listComments, listLegislation } from "@/lib/legislation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ExportPage() {
  const [legislations, setLegislations] = useState([]);
  const [selectedLeg, setSelectedLeg] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_SENTIMENT_API || "http://127.0.0.1:8000",
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await listLegislation();
        if (!cancelled) setLegislations(items);
      } catch (e) {
        console.error("Failed to load legislations", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runAnalysis = async () => {
      if (!selectedLeg) {
        setAnalysis(null);
        return;
      }

      setAnalysisLoading(true);
      setAnalysis(null);

      try {
        const comments = await listComments({ legislationId: selectedLeg });
        const bySentiment = { positive: 0, negative: 0, neutral: 0 };

        comments.forEach((c) => {
          const label = (c.sentimentLabel || "").toLowerCase();
          if (label === "positive") bySentiment.positive += 1;
          else if (label === "negative") bySentiment.negative += 1;
          else bySentiment.neutral += 1;
        });

        let regularSummary = "";
        let wordcloudSummary = "";
        let wordcloudB64 = "";

        const ksRes = await fetch(`${apiBase}/keyword-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comments: comments.map((c) => ({ text: c.text, rating: c.rating || 0 })),
            top_n: 10,
          }),
        });

        if (ksRes.ok) {
          const ksData = await ksRes.json();
          regularSummary = ksData.regular_summary || "";
          wordcloudSummary = ksData.wordcloud_summary || "";
        } else {
          const sRes = await fetch(`${apiBase}/summarize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: comments.map((c) => c.text) }),
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            regularSummary = sData.summary || "";
          }
        }

        const wRes = await fetch(`${apiBase}/wordcloud`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: comments.map((c) => c.text) }),
        });

        if (wRes.ok) {
          const wData = await wRes.json();
          wordcloudB64 = wData.image_base64 || "";
        }

        if (!cancelled) {
          setAnalysis({
            comments,
            bySentiment,
            regularSummary,
            wordcloudSummary,
            wordcloudB64,
          });
        }
      } catch (err) {
        console.error("Failed to prepare export analysis", err);
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    };

    runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [apiBase, selectedLeg]);

  const analysisReady = !analysisLoading && !!analysis && !!selectedLeg;
  const pieColors = ["#22c55e", "#ef4444", "#9ca3af"];
  const ratingSentimentMap = {
    1: "Very Negative",
    2: "Negative",
    3: "Neutral",
    4: "Positive",
    5: "Very Positive",
  };

  const downloadPdf = async () => {
    if (!analysisReady) return;
    setDownloading(true);
    try {
      const [{ jsPDF }, html2canvasModule] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = html2canvasModule.default;
      const doc = new jsPDF();
      const leg = legislations.find((l) => (l.legislationId || l.id) === selectedLeg);
      const captureChart = async (ref) => {
        if (!ref?.current) return null;
        const canvas = await html2canvas(ref.current, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
        });
        return canvas.toDataURL("image/png");
      };
      const pieChartImage = await captureChart(pieChartRef);
      const barChartImage = await captureChart(barChartRef);

      let y = 16;
      doc.setFontSize(16);
      doc.text("Legislation Analysis Report", 14, y);
      y += 8;

      doc.setFontSize(11);
      doc.text(`Legislation: ${leg?.title || selectedLeg}`, 14, y);
      y += 7;
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
      y += 10;

      doc.text(`Total Comments: ${analysis.comments.length}`, 14, y);
      y += 6;
      doc.text(`Positive: ${analysis.bySentiment.positive}`, 14, y);
      y += 6;
      doc.text(`Negative: ${analysis.bySentiment.negative}`, 14, y);
      y += 6;
      doc.text(`Neutral: ${analysis.bySentiment.neutral}`, 14, y);
      y += 10;

      const splitSummary = doc.splitTextToSize(
        `Summary: ${analysis.regularSummary || "-"}`,
        180,
      );
      doc.text(splitSummary, 14, y);
      y += splitSummary.length * 6 + 4;

      if (analysis.wordcloudSummary) {
        const splitWcSummary = doc.splitTextToSize(
          `Word Cloud Summary: ${analysis.wordcloudSummary}`,
          180,
        );
        doc.text(splitWcSummary, 14, y);
        y += splitWcSummary.length * 6 + 6;
      }

      if (analysis.wordcloudB64 && y < 210) {
        doc.addImage(
          `data:image/png;base64,${analysis.wordcloudB64}`,
          "PNG",
          14,
          y,
          180,
          70,
        );
      }

      if (pieChartImage || barChartImage) {
        doc.addPage();
        let chartY = 16;
        doc.setFontSize(14);
        doc.text("Charts", 14, chartY);
        chartY += 8;

        if (pieChartImage && barChartImage) {
          doc.addImage(pieChartImage, "PNG", 14, chartY, 86, 70);
          doc.addImage(barChartImage, "PNG", 110, chartY, 86, 70);
        } else if (pieChartImage) {
          doc.addImage(pieChartImage, "PNG", 14, chartY, 180, 90);
        } else if (barChartImage) {
          doc.addImage(barChartImage, "PNG", 14, chartY, 180, 90);
        }
      }

      doc.save(`analysis_${selectedLeg}_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Export Reports</h2>

      <div className="bg-white shadow rounded p-4 space-y-4">
        <div>
          <label className="block mb-2 font-medium">Select Legislation</label>
          <select
            className="border px-3 py-2 rounded w-full max-w-lg"
            value={selectedLeg}
            onChange={(e) => setSelectedLeg(e.target.value)}
          >
            <option value="">-- Select --</option>
            {legislations.map((l) => (
              <option key={l.id} value={l.legislationId || l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={downloadPdf}
          disabled={!analysisReady || downloading}
          className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          {downloading
            ? "Downloading..."
            : analysisLoading
              ? "Preparing analysis..."
              : "Download PDF"}
        </button>
      </div>

      {selectedLeg && (
        <div className="bg-white shadow rounded p-4 space-y-3">
          <h3 className="font-semibold text-lg">Analysis Preview</h3>
          {analysisLoading ? (
            <p className="text-gray-600">Generating analysis. Please wait...</p>
          ) : !analysis ? (
            <p className="text-gray-600">No analysis available.</p>
          ) : (
            <>
              <p>Total Comments: {analysis.comments.length}</p>
              <p>Positive: {analysis.bySentiment.positive}</p>
              <p>Negative: {analysis.bySentiment.negative}</p>
              <p>Neutral: {analysis.bySentiment.neutral}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div ref={pieChartRef} className="bg-white border rounded p-4">
                  <h4 className="font-medium mb-2">Sentiment Distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Positive", value: analysis.bySentiment.positive },
                          { name: "Negative", value: analysis.bySentiment.negative },
                          { name: "Neutral", value: analysis.bySentiment.neutral },
                        ]}
                        dataKey="value"
                        outerRadius={90}
                        label
                      >
                        {[
                          { name: "Positive", value: analysis.bySentiment.positive },
                          { name: "Negative", value: analysis.bySentiment.negative },
                          { name: "Neutral", value: analysis.bySentiment.neutral },
                        ].map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={pieColors[index % pieColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div ref={barChartRef} className="bg-white border rounded p-4">
                  <h4 className="font-medium mb-2">Rating Distribution</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={[1, 2, 3, 4, 5].map((r) => ({
                        rating: String(r),
                        label: ratingSentimentMap[r],
                        count: analysis.comments.filter((c) => c.rating === r).length,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        formatter={(value) => [value, "Count"]}
                        labelFormatter={(value, payload) => {
                          const rating = payload?.[0]?.payload?.rating;
                          return `${rating} Star - ${value}`;
                        }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" name="Responses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <p className="text-gray-700">
                <strong>Summary:</strong> {analysis.regularSummary || "-"}
              </p>
              {analysis.wordcloudSummary && (
                <p className="text-gray-700">
                  <strong>Word Cloud Summary:</strong> {analysis.wordcloudSummary}
                </p>
              )}
              {analysis.wordcloudB64 && (
                <img
                  src={`data:image/png;base64,${analysis.wordcloudB64}`}
                  alt="Word cloud"
                  className="w-full max-w-2xl border rounded"
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
