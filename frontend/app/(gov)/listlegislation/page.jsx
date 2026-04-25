"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listLegislation } from "@/lib/legislation";
export default function LegislationList() {
  const [expandedId, setExpandedId] = useState(null);
  const [legislations, setLegislations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const items = await listLegislation();
        if (!cancelled) setLegislations(items);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load legislations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLaw = legislations.find((law) => law.id === expandedId) || null;

  return (
    <div className="min-h-screen  px-6 py-10">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Legislations</h2>
          <Link href="/addlegislation">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition">
              + Add New Legislation
            </button>
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {error && (
            <div className="mb-3 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading...</div>
          ) : legislations.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No legislations found.
            </div>
          ) : (
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Deadline</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {legislations.map((law) => (
                  <tr
                    key={law.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-2">{law.title}</td>
                    <td className="px-4 py-2">{law.endDate}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          law.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {law.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center space-x-2">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === law.id ? null : law.id)
                        }
                        className="px-3 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        {expandedId === law.id ? "Hide" : "View More"}
                      </button>
                      {/* <button className="px-3 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200">
                        Analyze
                      </button> */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Overlay for Expanded Details */}
        {selectedLaw && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setExpandedId(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-6 relative">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {selectedLaw.title}
                </h3>
                <p className="text-gray-600 mb-4">{selectedLaw.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p>
                    <span className="font-medium">Legislation ID:</span>{" "}
                    {selectedLaw.id}
                  </p>
                  <p>
                    <span className="font-medium">Start Date:</span>{" "}
                    {selectedLaw.startDate}
                  </p>
                  <p>
                    <span className="font-medium">End Date:</span>{" "}
                    {selectedLaw.endDate}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {selectedLaw.status}
                  </p>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setExpandedId(null)}
                    className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
