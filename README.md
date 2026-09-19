# EventSnap

EventSnap helps photographers turn a massive event photo dump into private, easily shareable galleries. It detects faces, automatically groups photos by person, and generates direct gallery links that photographers can share with attendees.

## What it includes

- Background processing with BullMQ and Redis
- Face clustering with `face-api.js` and DBSCAN
- Photographer dashboard with auto-generated "Person Folders"
- Direct, shareable attendee gallery links (no registration or selfies required)
- Cloudinary image storage

## Architecture

```mermaid
graph TD
    A[Photographer] -->|Upload Photos| B(Express Server)
    B -->|Save to Cloudinary| C(Cloudinary)
    B -->|Enqueue Job| D(BullMQ + Redis)
    D -->|Process| E[Worker Node]
    E -->|Extract Embeddings| F(face-api.js)
    E -->|Update DB| G[(MongoDB)]
    B -->|Trigger Clustering| H[DBSCAN Clustering]
    H --> G
    
    A -->|Copy Share Link| I[Attendee]
    I -->|Visit Link| B
    B -->|Return Personal Gallery| I
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Redis (local or remote)
- Cloudinary Account

### Environment variables

Copy `.env.example` to `.env` for the API and worker. Copy `client/.env.example` to `client/.env` for the web app.

API / worker:
```
MONGO_URI=mongodb://localhost:27017/ai-event-photos
REDIS_URL=redis://localhost:6379
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
CLIENT_URL=http://localhost:5173
```

Client:

```
VITE_API_URL=http://localhost:5000
```

### Installation
1. Install root dependencies:
   ```bash
   npm install
   ```
2. Install server dependencies and download face-api models:
   ```bash
   cd server
   npm install
   npm run weights
   ```
3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

### Running the App
Run the entire stack (client, server, and worker) simultaneously from the root:
```bash
npm run dev
```

## Deployment

The client and API are deliberately deployed separately: GitHub Pages can host the static client, but the API and face-processing worker require a Node host, MongoDB, Redis, and persistent configuration.

1. Push this repository to GitHub.
2. Create MongoDB, Redis, and Cloudinary services.
3. On Render, create a Blueprint from this repository. It reads `render.yaml` and provisions the API plus a separate worker. Add the required secret environment variables in Render.
4. Deploy `client` to Vercel, Netlify, or GitHub Pages. Set `VITE_API_URL` to the public API URL before the build, and set the API's `CLIENT_URL` to the final client URL. For more than one allowed frontend URL, provide a comma-separated `CLIENT_URL` value.

Before making the repository public, verify that `.env` is not tracked and rotate any credentials that have been exposed.

## Technical notes

### DBSCAN vs K-Means
DBSCAN was chosen over k-means because event photo groupings are highly variable. We don't know the value of `k` (the number of unique attendees) beforehand. DBSCAN natively groups by density and separates outliers, meaning we don't need to specify the number of clusters. 

### Async Job Queue
Processing 100+ high-resolution photos for face detection is CPU-intensive. Doing this synchronously in the Express request handler would cause timeouts and block the event loop for other users. BullMQ + Redis provides robust retries, failure handling, and offloads heavy computation to a separate worker process.

## Privacy & Ethics
**Disclaimer**: This is a portfolio piece. Any production version handling biometric data must adhere strictly to GDPR and local privacy laws.
- **Consent**: Explicit consent checkboxes must be added before capturing or processing group photos.
- **Data Retention**: A production system should auto-delete photos and embeddings after a predefined window (e.g., 7 days post-event).
- **Security**: Embeddings are irreversible, meaning original faces cannot easily be synthesized from the 128-d arrays, but standard DB encryption practices must be maintained.

## What I'd add with more time
- Automated email delivery of share links.
- A custom-trained or heavier face embedding model (like ArcFace or AdaFace) for better accuracy in challenging lighting.
- High-performance vector database (e.g., Qdrant or Milvus) to scale matching when clustering thousands of events.
