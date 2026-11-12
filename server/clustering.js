const { DBSCAN } = require('density-clustering');

// Distance threshold for 128-dimensional face-api.js embeddings (Euclidean).
// Two faces closer than this are treated as the same person. May need tuning
// for a different embedding model.
const DBSCAN_EPSILON = 0.55;
// A single face is allowed to form its own cluster, so nobody is dropped as noise.
const DBSCAN_MINPTS = 1;

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function calculateCentroid(points) {
  if (points.length === 0) return [];
  const dims = points[0].length;
  const centroid = new Array(dims).fill(0);
  for (const p of points) {
    for (let i = 0; i < dims; i++) centroid[i] += p[i];
  }
  return centroid.map((v) => v / points.length);
}

// Groups face embeddings by person. Returns an array of clusters, each an
// array of indices into `embeddings`.
function clusterEmbeddings(embeddings, epsilon = DBSCAN_EPSILON, minPts = DBSCAN_MINPTS) {
  if (!embeddings || embeddings.length === 0) return [];
  const dbscan = new DBSCAN();
  return dbscan.run(embeddings, epsilon, minPts, euclideanDistance);
}

module.exports = {
  DBSCAN_EPSILON,
  DBSCAN_MINPTS,
  euclideanDistance,
  calculateCentroid,
  clusterEmbeddings,
};
