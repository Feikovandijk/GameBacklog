# GameBacklog Manager

This document outlines how to set up and run the GameBacklog Manager application using Docker Compose. This setup assumes you have an existing Appwrite instance running.

## Prerequisites

- Docker and Docker Compose installed on your local machine.
- A running Appwrite instance (cloud or self-hosted).
- A Steam API Key. You can get one [here](https://steamcommunity.com/dev/apikey).

## 1. Environment Setup

Before running the application, you need to set up your environment variables.

1.  **Create a `.env` file** in the root directory of the project.

2.  **Set up your Appwrite instance:**
    - Create a project.
    - Create a database (e.g., `GameDB`).
    - Create an API key with all scopes.
    - Note the `Endpoint`, `Project ID`, `Database ID`, and `API Key Secret`.

3.  **Populate your `.env` file** with the following content, replacing the placeholder values with your actual data from your Appwrite project and Steam.

    ```env
    # Appwrite Project Details
    APPWRITE_ENDPOINT=https://your-appwrite-instance/v1
    APPWRITE_PROJECT_ID= # Your project ID
    APPWRITE_API_KEY= # Your API key secret
    APPWRITE_DATABASE_ID= # Your database ID
    APPWRITE_GAMES_COLLECTION_ID=games
    
    # Steam API Key
    STEAM_API_KEY= # Your Steam API key
    ```

## 2. Running the Application

Now that the `.env` file is complete, you can start the application stack.

1.  **Set up the database schema:**
    Before running the services, you need to set up the required collections and attributes in your Appwrite database. You can do this by running the local setup script *once*. Ensure `ts-node` is installed (`npm install -g ts-node`) or run it via `npx`.

    ```bash
    # From the project root directory
    npx ts-node api/src/scripts/setup-appwrite.ts
    ```
    
    If you need to recalculate statistics later, you can run that script similarly:
    ```bash
    npx ts-node api/src/scripts/recalculate-stats.ts
    ```

2.  **Start all services:**

    ```bash
    docker-compose up -d --build
    ```

    - The `api` service will be available at `http://localhost:6543`.
    - The `dashboard` will be available at `http://localhost:8080`.

3.  **(Optional) Run data scripts:**
    You can run the game synchronization and refresh scripts using Docker Compose.

    ```bash
    # To sync the full list of Steam games
    docker-compose run --rm sync-games

    # To refresh details for a batch of stale games
    docker-compose run --rm refresh-games
    ```

## 3. Development

- The `api` service is configured with `ts-node-dev` and the `src` directory is mounted as a volume. Any changes you make to the source code in `api/src` will automatically restart the API server.
- To view logs for all services, run `docker-compose logs -f`.
- To view logs for a specific service, run `docker-compose logs -f <service_name>` (e.g., `docker-compose logs -f api`).

## 4. Deployment to a VM

You can deploy the API server or any of the scripts as standalone containers on any machine with Docker installed (e.g., a DigitalOcean Droplet).

### Step 1: Build and Push the Docker Image

First, you need to build the production Docker image and push it to a container registry like Docker Hub, GitHub Container Registry, or DigitalOcean Container Registry.

1.  **Build the image:**
    From the root of the project, run the build command. Replace `your-registry/your-repo` with your actual registry and repository name.

    ```bash
    docker build -t your-registry/your-repo:latest -f api/Dockerfile .
    ```

2.  **Push the image:**

    ```bash
    docker push your-registry/your-repo:latest
    ```

### Step 2: Run a Service on a VM

On your DigitalOcean Droplet (or any VM):

1.  **Install Docker:** Ensure Docker is installed on the VM.
2.  **Create a `.env` file:** Create a `.env` file on the VM with the same contents as your local one, pointing to your Appwrite instance and containing your Steam API key.
3.  **Pull the image:**

    ```bash
    docker pull your-registry/your-repo:latest
    ```

4.  **Run the container:**
    Use `docker run` to start your service. You will pass the `.env` file and override the default command to run the specific script you want.

    **To run the `refresh-games` script:**
    This command runs the container in detached mode (`-d`), automatically restarts it if it stops (`--restart=always`), and executes the `refresh-games` script.

    ```bash
    docker run -d --restart=always \
      --name refresh-games-service \
      --env-file ./.env \
      your-registry/your-repo:latest \
      npm run refresh-games
    ```

    **To run the `sync-games` script:**
    This command is similar but runs the `sync-games` script.

    ```bash
    docker run -d --restart=always \
      --name sync-games-service \
      --env-file ./.env \
      your-registry/your-repo:latest \
      npm run sync-games
    ```
    
    **To run the API server:**
    This exposes port 6543 from the container to the host.
    ```bash
    docker run -d --restart=always \
      -p 6543:6543 \
      --name api-service \
      --env-file ./.env \
      your-registry/your-repo:latest
      # No command override needed, as it uses the Dockerfile's default CMD
    ```

## 5. Stopping the Application

To stop all running services managed by `docker-compose`:

```bash
docker-compose down
``` 