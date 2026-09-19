import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function Gallery() {
  const { clusterId } = useParams();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await api.get(`/clusters/${clusterId}/gallery`);
        setPhotos(res.data.photos);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load gallery");
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [clusterId]);

  if (loading)
    return (
      <div className="text-center py-20 text-gray-500">
        Loading your photos...
      </div>
    );

  if (error)
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-red-50 text-red-600 rounded text-center">
        {error}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Your event photos
        </h1>
        <p className="mt-2 text-slate-500">
          A collection prepared just for you.
        </p>
      </div>

      {photos.length === 0 ? (
        <p className="text-center text-gray-500">No photos found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((url, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <img
                src={url}
                alt={`Event photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
