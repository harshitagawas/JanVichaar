"use client";
import React, { useEffect, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { listLegislation, addComment } from "@/lib/legislation";

export default function SubmitFeedback() {
  const [legislation, setLegislation] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [legislations, setLegislations] = useState([]);
  const [loadingLeg, setLoadingLeg] = useState(true);
  const [saving, setSaving] = useState(false);
  const apiBase =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_SENTIMENT_API || "http://localhost:8000"
      : "";

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const items = await listLegislation();
        const activeItems = items.filter(
          (item) => (item.status || "active").toLowerCase() === "active",
        );
        if (isMounted) setLegislations(activeItems);
      } catch (e) {
        console.error("Failed to load legislation", e);
      } finally {
        if (isMounted) setLoadingLeg(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(legislation && comment && rating > 0)) {
      alert("Please provide all fields including a rating.");
      return;
    }
    try {
      setSaving(true);
      // First, get sentiment from backend
      let sentimentLabel = null;
      let sentimentScore = null;
      try {
        const res = await fetch(`${apiBase}/sentiment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: [comment] }),
        });
        if (res.ok) {
          const data = await res.json();
          const r = Array.isArray(data?.results) ? data.results[0] : data;
          sentimentLabel = r?.label || null;
          sentimentScore = typeof r?.score === "number" ? r.score : null;
        }
      } catch (err) {
        console.warn("Sentiment API failed, saving without sentiment", err);
      }

      await addComment({
        legislationId: legislation,
        text: comment,
        rating,
        sentimentLabel,
        sentimentScore,
      });
      setSubmitted(true);
      setComment("");
      setRating(0);
      setLegislation("");
    } catch (err) {
      console.error("Failed to submit comment", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Form Section */}
      <section className="flex flex-grow items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6">
        <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 text-center">
                Submit Your Feedback
              </h2>

              {/* Dropdown */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Select Legislation
                </label>
                <select
                  value={legislation}
                  onChange={(e) => setLegislation(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  disabled={!loadingLeg && legislations.length === 0}
                  required
                >
                  <option value="" disabled>
                    {loadingLeg
                      ? "Loading..."
                      : legislations.length
                        ? "Select legislation"
                        : "No active legislation available"}
                  </option>
                  {legislations.map((item) => (
                    <option key={item.id} value={item.legislationId || item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Enter your comments
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="4"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Write your comments here..."
                  required
                ></textarea>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-gray-700 mb-2">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) =>
                    star <= rating ? (
                      <FaStar
                        key={star}
                        size={28}
                        onClick={() => setRating(star)}
                        className="cursor-pointer text-indigo-600 transition"
                      />
                    ) : (
                      <FaRegStar
                        key={star}
                        size={28}
                        onClick={() => setRating(star)}
                        className="cursor-pointer text-gray-400 hover:text-indigo-500 transition"
                      />
                    ),
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <p>
                    1 star → Very Negative, 2 stars → Negative, 3 stars →
                    Neutral / Mixed,
                  </p>
                  <p>4 stars → Positive, 5 stars → Very Positive</p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {saving ? "Submitting..." : "Submit"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-600">
                ✅ Thank you for your feedback!
              </h2>
              <p className="mt-4 text-gray-600">
                Your comments have been submitted successfully.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
