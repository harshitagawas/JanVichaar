import { listComments } from "@/lib/legislation";

export const ratingSentimentMap = {
  1: "Very Negative",
  2: "Negative",
  3: "Neutral",
  4: "Positive",
  5: "Very Positive",
};

export const pieColors = ["#22c55e", "#ef4444", "#9ca3af"];

export function calculateRatingCounts(comments) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  comments.forEach((comment) => {
    if (comment.rating && comment.rating >= 1 && comment.rating <= 5) {
      counts[comment.rating] += 1;
    }
  });

  return counts;
}

export function calculateSentimentCounts(comments) {
  const counts = {
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
  };
  const sentiments = {};

  comments.forEach((comment) => {
    const label = (comment.sentimentLabel || "").toLowerCase();

    if (comment.sentimentLabel) {
      sentiments[comment.id] = {
        label: comment.sentimentLabel,
        score: comment.sentimentScore,
      };
    }

    if (label === "positive") counts.positiveCount += 1;
    else if (label === "negative") counts.negativeCount += 1;
    else counts.neutralCount += 1;
  });

  return { ...counts, sentiments };
}

export function buildOverallSentimentRating({
  positiveCount,
  neutralCount,
  negativeCount,
}) {
  const total = positiveCount + neutralCount + negativeCount;

  if (total === 0) {
    return {
      rating: "0.0",
      summary: "No Feedback Yet",
      explanation:
        "There is not enough sentiment feedback yet to estimate public perception.",
      insight: "Collect more comments to generate a reliable overall rating.",
      posPercentage: 0,
      neuPercentage: 0,
      negPercentage: 0,
    };
  }

  const posPercentage = (positiveCount / total) * 100;
  const neuPercentage = (neutralCount / total) * 100;
  const negPercentage = (negativeCount / total) * 100;
  const weightedScore =
    (positiveCount * 5 + neutralCount * 3 + negativeCount * 1) / total;
  const ratingValue = Number(weightedScore.toFixed(1));

  let summary = "Mixed Opinion";
  if (ratingValue >= 4.2) summary = "Strong Public Support";
  else if (ratingValue >= 3.6) summary = "Mostly Positive";
  else if (ratingValue >= 2.8) summary = "Mixed Opinion";
  else if (ratingValue >= 2.2) summary = "Needs Improvement";
  else summary = "Strong Public Concern";

  let explanation =
    "Public sentiment is balanced between support and concern, showing mixed reactions.";
  if (posPercentage >= 60) {
    explanation =
      "Most users responded positively, showing broad approval of the legislation's direction and impact.";
  } else if (negPercentage >= 45) {
    explanation =
      "A large share of responses are negative, indicating notable dissatisfaction and concern among stakeholders.";
  } else if (neuPercentage >= 50) {
    explanation =
      "Many users are neutral, suggesting people are still evaluating the legislation or need more clarity.";
  }

  let insight =
    "Feedback is divided, so targeted improvements and clearer communication can help build confidence.";
  if (negPercentage >= posPercentage + 15) {
    insight =
      "Negative feedback stands out, so addressing key pain points should be the immediate priority.";
  } else if (posPercentage >= negPercentage + 20) {
    insight =
      "Strong positive momentum suggests high acceptance with relatively low public resistance.";
  } else if (neuPercentage >= 40) {
    insight =
      "A high neutral share suggests an opportunity to improve understanding through clearer messaging.";
  }

  return {
    rating: ratingValue.toFixed(1),
    summary,
    explanation,
    insight,
    posPercentage,
    neuPercentage,
    negPercentage,
  };
}

export function buildAnalysisReport({
  legislation,
  comments,
  regularSummary = "",
  wordcloudSummary = "",
  wordcloudB64 = "",
  allKeywords = [],
  wordcloudWords = [],
}) {
  const { positiveCount, negativeCount, neutralCount, sentiments } =
    calculateSentimentCounts(comments);
  const ratingCounts = calculateRatingCounts(comments);
  const totalSentimentComments = positiveCount + negativeCount;
  const needsUrgentAttention =
    totalSentimentComments > 0 &&
    (negativeCount / totalSentimentComments) * 100 >=
      (positiveCount / totalSentimentComments) * 100 + 20;

  return {
    legislation,
    comments,
    sentiments,
    counts: {
      totalComments: comments.length,
      positiveCount,
      negativeCount,
      neutralCount,
    },
    pieData: [
      { name: "Positive", value: positiveCount },
      { name: "Negative", value: negativeCount },
      { name: "Neutral", value: neutralCount },
    ],
    ratingCounts,
    ratingData: [1, 2, 3, 4, 5].map((rating) => ({
      rating: String(rating),
      count: ratingCounts[rating] || 0,
      sentiment: ratingSentimentMap[rating],
    })),
    regularSummary,
    wordcloudSummary,
    wordcloudB64,
    allKeywords,
    wordcloudWords,
    overallSentimentRating: buildOverallSentimentRating({
      positiveCount,
      neutralCount,
      negativeCount,
    }),
    needsUrgentAttention,
    generatedAt: new Date().toLocaleString(),
  };
}

export async function prepareAnalysisReport({
  legislationId,
  legislation,
  apiBase,
  onStatus,
}) {
  onStatus?.("Running sentiment analysis...");
  const comments = await listComments({ legislationId });

  onStatus?.("Generating visual insights...");
  let regularSummary = "";
  let wordcloudSummary = "";
  let wordcloudB64 = "";
  let allKeywords = [];
  let wordcloudWords = [];

  const keywordResponse = await fetch(`${apiBase}/keyword-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      comments: comments.map((comment) => ({
        text: comment.text,
        rating: comment.rating || 0,
      })),
      top_n: 10,
    }),
  });

  if (keywordResponse.ok) {
    const keywordData = await keywordResponse.json();
    regularSummary = keywordData.regular_summary || "";
    wordcloudSummary = keywordData.wordcloud_summary || "";
    allKeywords = keywordData.all_keywords || [];
  } else {
    const summaryResponse = await fetch(`${apiBase}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: comments.map((comment) => comment.text) }),
    });

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      regularSummary = summaryData.summary || "";
    }
  }

  const wordcloudResponse = await fetch(`${apiBase}/wordcloud`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: comments.map((comment) => comment.text) }),
  });

  if (wordcloudResponse.ok) {
    const wordcloudData = await wordcloudResponse.json();
    wordcloudB64 = wordcloudData.image_base64 || "";
    wordcloudWords = wordcloudData.top_words || [];
  }

  return buildAnalysisReport({
    legislation: legislation || { legislationId, title: legislationId },
    comments,
    regularSummary,
    wordcloudSummary,
    wordcloudB64,
    allKeywords,
    wordcloudWords,
  });
}
