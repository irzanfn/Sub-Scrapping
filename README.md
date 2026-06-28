# SubScrapping (formerly Zombie Subs Tracker)

SubScrapping is a modern web application designed to help you track recurring subscriptions (Netflix, Spotify, SaaS tools, etc.) and automatically add new ones by forwarding your email receipts to a dedicated webhook.

## 🚀 Features

- **Dashboard UI**: Keep track of all active subscriptions, billing cycles, start dates, and lifetime spend.
- **Email Auto-Forwarding Webhook**: Forward your email receipts to an endpoint that uses the Gemini AI API to intelligently extract the merchant, amount, currency, and billing cycle.
- **Smart Deduplication**: Automatically updates existing subscriptions instead of creating duplicates when you receive a receipt for a new billing cycle.
- **Authentication**: Supports manual Email/Password login and OAuth (Google & GitHub).

## 🛠️ Tech Stack

- **Frontend**: Next.js (TypeScript), TailwindCSS, daisyUI
- **Backend**: Go (net/http)
- **Database**: MongoDB
- **AI Integration**: Google Gemini 2.5 Flash
- **Orchestration**: Docker & Docker Compose

## 💻 Local Development

The easiest way to run the entire stack locally is using Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A MongoDB instance (e.g., MongoDB Atlas)
- A Gemini API Key (from Google AI Studio)
- Google & GitHub OAuth credentials (for authentication)

### 1. Environment Setup

Create a `.env` file in the root directory (based on the provided `.env.example` or your own credentials):

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster...
PORT=8080
WEBHOOK_SECRET=your-secret-webhook-token
JWT_SECRET=your-jwt-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 2. Run the Application

Build and start the containers using Docker Compose:

```bash
docker-compose up --build
```

- **Frontend**: Accessible at `http://localhost:3000`
- **Backend API**: Accessible at `http://localhost:8080`

### 3. Testing the Webhook Locally

The webhook endpoint is located at `POST /api/v1/webhook/receipt`. It expects a JSON payload matching the `ResendInboundPayload` format and requires an `Authorization: Bearer <WEBHOOK_SECRET>` header.

You can test this locally by running a quick curl or PowerShell script sending a simulated receipt payload to `http://localhost:8080/api/v1/webhook/receipt`.

## 📁 Project Structure

- `/frontend` - Next.js React application.
- `/backend` - Go server handling API routes, database operations, and LLM parsing.
- `/docker-compose.yml` - Orchestration file to run both services together.

## 🌐 Deployment

- **Frontend**: Recommended deployment via [Vercel](https://vercel.com).
- **Backend**: Can be deployed as a Docker container to services like Google Cloud Run, Render.com, or Fly.io. Ensure all environment variables are properly set in your deployment environment.
