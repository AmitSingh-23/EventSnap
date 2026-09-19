import React, { useState, useEffect } from "react";
import api from "../api";

export default function Dashboard() {
  const [eventName, setEventName] = useState("");
  const [currentEvent, setCurrentEvent] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [clustering, setClustering] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [status, setStatus] = useState(null);
  const [notice, setNotice] = useState("");

  // Lightbox state
  const [lightboxCluster, setLightboxCluster] = useState(null);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);

  useEffect(() => {
    if (!currentEvent) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/events/${currentEvent._id}/status`);
        setStatus(res.data);
      } catch (err) {
        console.error(err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [currentEvent]);

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/events", { name: eventName.trim() });
      setCurrentEvent(res.data);
      setEventName("");
      setNotice("Event created. Add the photos you want to sort.");
    } catch {
      alert("Error creating event");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!photos || photos.length === 0) return;
    if (!currentEvent) return alert("Create an event first");

    const formData = new FormData();
    for (let i = 0; i < photos.length; i++) {
      formData.append("photos", photos[i]);
    }

    setUploading(true);
    try {
      await api.post(`/events/${currentEvent._id}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNotice("Photos uploaded and queued for processing.");
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.details?.message ||
        err.message ||
        "Upload failed";
      alert(`Upload failed: ${errMsg}`);
    } finally {
      setUploading(false);
      setPhotos(null);
    }
  };

  const triggerClustering = async () => {
    if (!currentEvent) return;
    setClustering(true);
    try {
      const res = await api.post(`/events/${currentEvent._id}/cluster`);
      setNotice(`Created ${res.data.clusterCount} person folders.`);
      fetchClusters();
    } catch (err) {
      alert(err.response?.data?.error || "Clustering failed");
    } finally {
      setClustering(false);
    }
  };

  const fetchClusters = async () => {
    if (!currentEvent) return;
    try {
      const res = await api.get(`/events/${currentEvent._id}/folders`);
      setClusters(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateClusterLabel = async (clusterId, newLabel) => {
    try {
      await api.patch(`/clusters/${clusterId}`, { label: newLabel.trim() });
      setClusters(
        clusters.map((c) =>
          c.clusterId === clusterId ? { ...c, label: newLabel } : c,
        ),
      );
    } catch {
      alert("Failed to update label");
    }
  };

  const openLightbox = async (cluster) => {
    setLightboxCluster(cluster);
    try {
      const res = await api.get(`/clusters/${cluster.clusterId}/photos`);
      setLightboxPhotos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-700 to-violet-700 px-6 py-8 text-white shadow-sm sm:px-8">
        <p className="text-sm font-medium text-indigo-100">
          Event photo delivery
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Sort photos into shareable galleries.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
          Create an event, upload the photos, then review the person folders
          before sharing them.
        </p>
      </section>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-sm font-medium text-indigo-600">Step 1</p>
          <h2 className="text-xl font-semibold">Create an event</h2>
        </div>
        {!currentEvent ? (
          <form
            onSubmit={createEvent}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              className="min-w-0 flex-grow rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. Ananya & Rahul's wedding"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700"
            >
              Create event
            </button>
          </form>
        ) : (
          <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
            <span>
              <strong>Active event:</strong> {currentEvent.name}
            </span>
            {/* Hidden per new flow: <a href={`/register/${currentEvent._id}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">Public Registration Link</a> */}
          </div>
        )}
      </section>

      {currentEvent && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-medium text-indigo-600">Step 2</p>
            <h2 className="text-xl font-semibold">Upload photos</h2>
          </div>
          <form onSubmit={handleUpload} className="space-y-4">
            <input
              type="file"
              multiple
              onChange={(e) => setPhotos(e.target.files)}
              accept="image/*"
              className="block w-full rounded-lg border border-dashed border-slate-300 p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-medium file:text-indigo-700 hover:border-indigo-300"
            />
            <button
              type="submit"
              disabled={uploading || !photos}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Photos"}
            </button>
          </form>
        </section>
      )}

      {currentEvent && status && status.total > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Processing Status</h2>
          <div className="flex justify-between text-sm mb-1">
            <span>
              {status.processed + status.failed} of {status.total} photos
              processed
            </span>
            <span>
              {Math.round(
                ((status.processed + status.failed) / status.total) * 100,
              )}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${((status.processed + status.failed) / status.total) * 100}%`,
              }}
            ></div>
          </div>
          <div className="text-sm text-gray-500 mt-2 flex gap-4">
            <span className="text-green-600">
              ✓ Processed: {status.processed}
            </span>
            <span className="text-yellow-600">Pending: {status.pending}</span>
            <span className="text-red-600">
              Failed (No Face): {status.failed}
            </span>
          </div>
        </section>
      )}

      {currentEvent && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-medium text-indigo-600">Step 3</p>
              <h2 className="text-xl font-semibold">Person folders</h2>
            </div>
            <button
              onClick={triggerClustering}
              disabled={clustering}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {clustering ? "Generating Folders..." : "Run Clustering"}
            </button>
          </div>

          <button
            onClick={fetchClusters}
            className="text-sm text-gray-500 underline mb-4"
          >
            Refresh Folders
          </button>

          {clusters.length === 0 ? (
            <p className="text-gray-500">
              No folders yet. Run clustering after processing finishes.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clusters.map((cluster) => (
                <div
                  key={cluster.clusterId}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => openLightbox(cluster)}
                  >
                    <img
                      src={
                        cluster.coverImageUrl ||
                        "https://placehold.co/100x100/e2e8f0/475569?text=Photo"
                      }
                      alt="Cover"
                      className="w-16 h-16 rounded-full object-cover shadow border"
                    />
                    <div>
                      <input
                        type="text"
                        value={cluster.label}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          setClusters(
                            clusters.map((c) =>
                              c.clusterId === cluster.clusterId
                                ? { ...c, label: e.target.value }
                                : c,
                            ),
                          );
                        }}
                        onBlur={(e) =>
                          updateClusterLabel(cluster.clusterId, e.target.value)
                        }
                        className="w-full border-b border-transparent bg-transparent text-lg font-semibold outline-none hover:border-slate-300 focus:border-indigo-500"
                      />
                      <p className="text-sm text-gray-500">
                        {cluster.photoCount} photos
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto border-t bg-white p-3 grid grid-cols-2 gap-2 text-center">
                    <a
                      href={`/gallery/cluster/${cluster.clusterId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-blue-100 text-blue-700 font-medium px-2 py-2 rounded hover:bg-blue-200 transition text-sm"
                    >
                      Open Folder
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/gallery/cluster/${cluster.clusterId}`;
                        if (navigator.share) {
                          navigator
                            .share({ title: "Your Photos", url })
                            .catch(() => {});
                        } else {
                          navigator.clipboard.writeText(url);
                          alert("Link copied!");
                        }
                      }}
                      className="inline-block bg-green-100 text-green-700 font-medium px-2 py-2 rounded hover:bg-green-200 transition text-sm"
                    >
                      Copy Share Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Lightbox Modal */}
      {lightboxCluster && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col p-6">
          <div className="mb-6 flex items-center justify-between text-white">
            <h3 className="text-2xl font-bold">
              {lightboxCluster.label} - {lightboxCluster.photoCount} Photos
            </h3>
            <button
              aria-label="Close preview"
              onClick={() => setLightboxCluster(null)}
              className="text-3xl font-bold text-white hover:text-gray-300"
            >
              &times;
            </button>
          </div>
          <div className="flex-grow overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {lightboxPhotos.length === 0 ? (
                <p className="text-white">Loading photos...</p>
              ) : null}
              {lightboxPhotos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  className="w-full aspect-square object-cover rounded"
                  alt="Gallery photo"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
