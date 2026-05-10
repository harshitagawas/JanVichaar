"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { pieColors, ratingSentimentMap } from "@/lib/analysisReport";

export default function AnalysisReport({
  data,
  includeComments = true,
  isExporting = false,
  chartImages = {},
  chartRefs = {},
}) {
  if (!data) return null;

  const {
    legislation,
    comments,
    counts,
    pieData,
    ratingData,
    regularSummary,
    wordcloudSummary,
    wordcloudB64,
    allKeywords,
    overallSentimentRating,
    needsUrgentAttention,
    sentiments,
    generatedAt,
  } = data;
  const legislationName =
    legislation?.title || legislation?.legislationId || legislation?.id || "-";

  return (
    <div className="analysis-report pdf-safe space-y-6 bg-white">
      <section className="bg-white shadow rounded p-4">
        <h2 className="text-2xl font-bold text-gray-800">{legislationName}</h2>
        <p className="text-sm text-gray-600 mt-1">
          Legislation Analysis Report
          {generatedAt ? ` • Generated: ${generatedAt}` : ""}
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded p-4 text-center">
          <div className="text-gray-500">Total Comments</div>
          <div className="text-xl font-bold">{counts.totalComments}</div>
        </div>
        <div className="bg-green-100 shadow rounded p-4 text-center">
          <div className="text-green-600">Positive</div>
          <div className="text-xl font-bold">{counts.positiveCount}</div>
        </div>
        <div className="bg-red-100 shadow rounded p-4 text-center">
          <div className="text-red-600">Negative</div>
          <div className="text-xl font-bold">{counts.negativeCount}</div>
        </div>
        <div className="bg-gray-100 shadow rounded p-4 text-center">
          <div className="text-gray-600">Neutral</div>
          <div className="text-xl font-bold">{counts.neutralCount}</div>
        </div>
      </section>

      {needsUrgentAttention && (
        <section className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                High Negative Sentiment Detected
              </h3>
              <p className="mt-1 text-sm text-red-700">
                This legislation has received significantly more negative
                feedback than positive. Consider reviewing and addressing
                stakeholder concerns to improve public sentiment.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded p-4">
          <h3 className="font-medium mb-2">Sentiment Distribution</h3>
          <div ref={chartRefs.pie} className="h-[250px] w-full">
            {isExporting && chartImages.pie ? (
              <img
                src={chartImages.pie}
                alt="Sentiment Distribution chart"
                className="h-full w-full object-contain"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    outerRadius={90}
                    label
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
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
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h3 className="font-medium mb-2">Rating Distribution</h3>
          <div ref={chartRefs.bar} className="h-[250px] w-full">
            {isExporting && chartImages.bar ? (
              <img
                src={chartImages.bar}
                alt="Rating Distribution chart"
                className="h-full w-full object-contain"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rating"
                    interval={0}
                    tickFormatter={(value) =>
                      `${value} - ${ratingSentimentMap[value]}`
                    }
                    className="text-xs"
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [value, "Count"]}
                    labelFormatter={(value) =>
                      `${value} Star - ${ratingSentimentMap[value]}`
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    name="Responses"
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {wordcloudB64 && (
          <div className="bg-white shadow rounded p-4">
            <h3 className="font-medium mb-2">Word Cloud</h3>
            <img
              src={`data:image/png;base64,${wordcloudB64}`}
              alt="Word Cloud"
              className="w-full h-[250px] object-contain"
            />
          </div>
        )}

        <div className="bg-white shadow rounded p-4">
          <h3 className="font-medium mb-2">All Feedback Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {regularSummary || "No summary available."}
          </p>
        </div>
      </section>

      {wordcloudSummary && (
        <section className="bg-white shadow rounded p-4">
          <h3 className="font-medium mb-2">Word Cloud Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {wordcloudSummary.split(" ").map((word, index) => {
              const cleanWord = word.replace(/[.,!?;:()]/g, "").toLowerCase();
              const isKeyword = allKeywords.some(
                (keyword) =>
                  keyword.toLowerCase().includes(cleanWord) ||
                  cleanWord.includes(keyword.toLowerCase()),
              );

              return (
                <span
                  key={`${word}-${index}`}
                  className={isKeyword ? "font-bold text-blue-600" : ""}
                >
                  {word}{" "}
                </span>
              );
            })}
          </p>
        </section>
      )}

      <section className="max-w-3xl mx-auto bg-white shadow rounded-lg border border-slate-200 p-6 text-center">
        <h3 className="text-lg font-semibold text-slate-800">
          Overall Legislation Rating (Sentiment-Based)
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Based on sentiment analysis only (Positive/Neutral/Negative), not star
          ratings.
        </p>

        <div className="mt-5 text-4xl font-bold text-amber-500">
          Rating: {overallSentimentRating.rating} / 5
        </div>

        <div className="mt-3 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-4 py-1 text-sm font-medium">
          {overallSentimentRating.summary}
        </div>

        <p className="mt-4 text-slate-700">
          {overallSentimentRating.explanation}
        </p>
        <p className="mt-2 text-slate-600 font-medium">
          Insight: {overallSentimentRating.insight}
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md bg-green-50 px-3 py-2 text-green-700">
            Positive: {overallSentimentRating.posPercentage.toFixed(1)}%
          </div>
          <div className="rounded-md bg-gray-100 px-3 py-2 text-gray-700">
            Neutral: {overallSentimentRating.neuPercentage.toFixed(1)}%
          </div>
          <div className="rounded-md bg-red-50 px-3 py-2 text-red-700">
            Negative: {overallSentimentRating.negPercentage.toFixed(1)}%
          </div>
        </div>
      </section>

      {includeComments && (
        <section data-export="exclude" className="bg-white shadow rounded p-4">
          <h3 className="font-medium mb-4">Comments</h3>
          {comments.length === 0 ? (
            <div>No comments available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border">Legislation ID</th>
                    <th className="px-3 py-2 border">Comment</th>
                    <th className="px-3 py-2 border">Sentiment</th>
                    <th className="px-3 py-2 border">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((comment) => (
                    <tr key={comment.id} className="border-b">
                      <td className="px-3 py-2 border">
                        {comment.legislationId}
                      </td>
                      <td className="px-3 py-2 border">{comment.text}</td>
                      <td className="px-3 py-2 border">
                        {sentiments[comment.id]?.label || "-"}
                      </td>
                      <td className="px-3 py-2 border">
                        {Number(sentiments[comment.id]?.score || 0).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
