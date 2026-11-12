const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DBSCAN_EPSILON,
  euclideanDistance,
  calculateCentroid,
  clusterEmbeddings,
} = require('../clustering');

// Builds a 128-d embedding that sits `offset` away from the origin on one axis,
// with a small per-face jitter, to stand in for one person's faces.
function fakeEmbedding(axis, offset, jitter = 0) {
  const v = new Array(128).fill(0);
  v[axis] = offset;
  v[(axis + 1) % 128] = jitter;
  return v;
}

test('euclideanDistance is zero for identical vectors and symmetric', () => {
  const a = fakeEmbedding(0, 1);
  const b = fakeEmbedding(1, 1);
  assert.equal(euclideanDistance(a, a), 0);
  assert.equal(euclideanDistance(a, b), euclideanDistance(b, a));
  assert.ok(Math.abs(euclideanDistance([0, 0], [3, 4]) - 5) < 1e-12);
});

test('calculateCentroid averages each dimension', () => {
  assert.deepEqual(calculateCentroid([[0, 2], [2, 4]]), [1, 3]);
  assert.deepEqual(calculateCentroid([]), []);
});

test('faces of the same person land in one cluster', () => {
  const faces = [fakeEmbedding(0, 1, 0), fakeEmbedding(0, 1, 0.1), fakeEmbedding(0, 1, 0.2)];
  const clusters = clusterEmbeddings(faces);
  assert.equal(clusters.length, 1);
  assert.deepEqual([...clusters[0]].sort(), [0, 1, 2]);
});

test('different people are separated without knowing how many there are', () => {
  const faces = [
    fakeEmbedding(0, 1, 0),
    fakeEmbedding(0, 1, 0.1),
    fakeEmbedding(5, 1, 0),
    fakeEmbedding(5, 1, 0.1),
    fakeEmbedding(9, 1, 0),
  ];
  const clusters = clusterEmbeddings(faces).map((c) => [...c].sort());
  assert.equal(clusters.length, 3);
  assert.ok(clusters.some((c) => c.join() === '0,1'));
  assert.ok(clusters.some((c) => c.join() === '2,3'));
  assert.ok(clusters.some((c) => c.join() === '4'));
});

test('a face seen once still gets its own cluster', () => {
  const clusters = clusterEmbeddings([fakeEmbedding(3, 1)]);
  assert.deepEqual(clusters, [[0]]);
});

test('every face is assigned to exactly one cluster', () => {
  const faces = [];
  for (let person = 0; person < 6; person++) {
    for (let shot = 0; shot < 4; shot++) faces.push(fakeEmbedding(person * 10, 1, shot * 0.05));
  }
  const assigned = clusterEmbeddings(faces).flat().sort((a, b) => a - b);
  assert.deepEqual(assigned, faces.map((_, i) => i));
});

test('faces just outside the threshold are not merged', () => {
  const a = fakeEmbedding(0, 0);
  const b = fakeEmbedding(0, DBSCAN_EPSILON + 0.05);
  assert.equal(clusterEmbeddings([a, b]).length, 2);
});

test('empty input returns no clusters', () => {
  assert.deepEqual(clusterEmbeddings([]), []);
});
