# Deploying with Komodo

This guide provides step-by-step instructions for deploying and managing the GameBacklog application using Komodo.

## Prerequisites

- A Komodo instance is set up and accessible.
- Your DigitalOcean servers (or other VMs) are connected to Komodo.
- A Docker Hub account (or other container registry) is connected to Komodo.
- Your project is in a GitHub or GitLab repository.

---

## 1. Connect Your Repository to Komodo

The first step is to give Komodo access to your code.

1.  In Komodo, navigate to **Resources -> Repositories** and click **"Add Repository"**.
2.  Connect your GitHub/GitLab account and select the `GameBacklog` repository.
3.  This allows Komodo to trigger builds automatically when you push new code.

---

## 2. Manage Environment Variables

Store all your secrets and configuration variables securely in Komodo.

1.  Navigate to **Variables & Secrets**.
2.  Create the following variables. Mark `APPWRITE_API_KEY` and `STEAM_API_KEY` as **secrets**.
    - `APPWRITE_ENDPOINT`: `https://your-appwrite-instance/v1`
    - `APPWRITE_PROJECT_ID`: Your Appwrite Project ID
    - `APPWRITE_API_KEY`: Your Appwrite API Key Secret
    - `APPWRITE_DATABASE_ID`: Your Appwrite Database ID
    - `APPWRITE_GAMES_COLLECTION_ID`: `games`
    - `STEAM_API_KEY`: Your Steam API Key
3.  You can now reference these variables in your deployment configurations, and Komodo will inject them securely.

---

## 3. Configure Automated Builds

Set up Komodo to automatically build a production Docker image for your API and scripts.

1.  Navigate to **Builds** and click **"Create Build"**.
2.  **Name:** `game-backlog-api`
3.  **Source:**
    - **Repository:** Select the `GameBacklog` repository you just added.
    - **Branch:** `main` (or your primary development branch).
    - **Dockerfile Path:** `api/Dockerfile` (Point to the production Dockerfile).
4.  **Destination:**
    - **Docker Account:** Select your connected Docker Hub account.
    - **Image Name:** `your-dockerhub-username/game-backlog-api`
5.  **Auto Build:** Enable **"Build on git push"**.
6.  Click **"Create"**. Now, every time you push to the `main` branch, Komodo will automatically build and push a new, versioned image (e.g., `your-dockerhub-username/game-backlog-api:1.0.1`) to Docker Hub.

---

## 4. Deploy the Services

You will create separate deployments for the API server and each recurring script.

### A. Deploy the API Server

1.  Navigate to **Deployments** and click **"Create Deployment"**.
2.  **Name:** `api-server`
3.  **Image:**
    - Select **"Attach a Komodo build"**.
    - Choose the `game-backlog-api` build. Komodo will automatically use the latest version.
4.  **Target:** Select the server where you want to run your API.
5.  **Environment:**
    - In the environment tab, add all the Appwrite and Steam variables you created earlier. You can reference them like `{{ vars.STEAM_API_KEY }}`. Komodo will substitute them at deploy time.
6.  **Network:**
    - Select **host** networking or configure port mapping: `6543:6543`.
7.  **Restart Behavior:** Set to `always` or `unless-stopped`.
8.  **Deploy!** Komodo will pull the image and run the container with the default `npm start` command.

### B. Deploy the `refresh-games` Script (Scheduled Task)

Instead of a persistent deployment, you'll use a **Procedure** to run this on a schedule.

1.  Navigate to **Procedures & Actions** and click **"Create Procedure"**.
2.  **Name:** `Run Game Refresh`
3.  **Target:** Select the server where you want the script to run.
4.  **Actions:**
    - Add a new action.
    - **Type:** `Docker Run`
    - **Image:** `your-dockerhub-username/game-backlog-api:latest`
    - **Command:** `npm run refresh-games`
    - **Environment:** Add the required environment variables just as you did for the API server.
    - **Restart Policy:** Set to `no` (since this is a one-off task).
5.  **Scheduling:**
    - In the procedure's settings, configure a **Cron Job** to run it on your desired schedule (e.g., `0 * * * *` to run every hour).
6.  **Save.** Komodo will now execute this script automatically. You can also trigger it manually from the UI.

*Follow the same steps to create a separate procedure for the `sync-games` script if you wish to run it on a schedule.*

### C. Deploy the Dashboard

Repeat the build and deploy process for the dashboard.

1.  **Build:** Create a new build named `game-backlog-dashboard`, pointing to `dashboard/Dockerfile`.
2.  **Deploy:** Create a new deployment named `dashboard-ui`.
    - Attach the `game-backlog-dashboard` build.
    - Target the server.
    - Configure network port mapping: `8080:80`.
    - Set restart policy to `always`.
    - Deploy! 