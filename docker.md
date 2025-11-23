# GameBacklog Docker Guide

This guide provides an overview of the Docker setup for the GameBacklog project. It covers the architecture, build process, and commands for running the application in both development and production environments.

## Prerequisites

-   [Docker](https://docs.docker.com/get-docker/) installed on your machine.
-   [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop).

## Architecture

The project is composed of the following services defined in `docker-compose.yml`:

1.  **`api`**: The backend Node.js/Express application.
    -   **Port**: `6543`
    -   **Build Context**: `./api`
    -   **Command**: `npm start` (default)
2.  **`worker`**: A background worker service based on the same image as the API.
    -   **Purpose**: Runs background jobs like syncing player counts (`sync:players`).
    -   **Command**: `node dist/scripts/worker.js`
3.  **`user-dashboard`**: The main user-facing frontend (Nginx serving static files).
    -   **Port**: `80`
    -   **Build Context**: `./user-dashboard`
4.  **`dashboard`**: The developer dashboard (Nginx serving static files).
    -   **Port**: `81` (Mapped from container port 80)
    -   **Build Context**: `./devdashboard`

## Build Process

The API uses a **multi-stage build** in its `Dockerfile` to ensure a small and secure final image:

1.  **Stage 1: Builder**
    -   Installs all dependencies (including `devDependencies`).
    -   Compiles the TypeScript code (`npm run build`).
    -   Prunes `devDependencies` to prepare for production.
2.  **Stage 2: Production**
    -   Copies only the necessary artifacts (`dist` folder, `node_modules`, `package.json`) from the Builder stage.
    -   Result: A lean Alpine Linux-based image ready for production.

## Quick Start

To start the entire application stack:

```bash
docker-compose up --build
```

This command will:
1.  Build the images for all services.
2.  Start the containers.
3.  Stream the logs to your terminal.

Access the services at:
-   **User Dashboard**: [http://localhost](http://localhost)
-   **Dev Dashboard**: [http://localhost:81](http://localhost:81)
-   **API**: [http://localhost:6543](http://localhost:6543)

## Common Commands

### Building and Running

-   **Start in background (detached mode)**:
    ```bash
    docker-compose up -d
    ```
-   **Rebuild images (force)**:
    ```bash
    docker-compose up --build
    ```
    *Use this if you added dependencies or changed the Dockerfile.*

### Stopping and Cleaning

-   **Stop all containers**:
    ```bash
    docker-compose down
    ```
-   **Stop and remove volumes (WARNING: Deletes database data if not external)**:
    ```bash
    docker-compose down -v
    ```

### Logs and Debugging

-   **View logs for all services**:
    ```bash
    docker-compose logs -f
    ```
-   **View logs for a specific service (e.g., api)**:
    ```bash
    docker-compose logs -f api
    ```
-   **Open a shell inside a running container**:
    ```bash
    docker-compose exec api sh
    ```

## Development vs. Production

### Development
The `docker-compose.yml` is configured for development convenience:
-   **Volumes**: The source code (`./api`) is mounted into the container (`/app`).
    -   *Benefit*: Changes you make to the code on your host machine are immediately reflected in the container (if using `nodemon` or similar).
-   **Environment**: Uses `.env` file for configuration.

### Production
For a production deployment (e.g., on a VPS or PaaS):
1.  **Remove Volumes**: Do not mount the source code. Rely on the built image.
2.  **Environment Variables**: Set environment variables directly in the deployment platform, not via a `.env` file committed to the repo.
3.  **Restart Policy**: `restart: always` is recommended.

## Troubleshooting

**Issue: "npm error Missing script: sync:players"**
-   **Cause**: You might be trying to run a script that isn't defined in `package.json` or isn't available in the context you are running it.
-   **Solution**: Check `package.json` scripts. If running via `docker-compose run`, ensure the command exists.
    ```bash
    # Example of running a specific script in the API container
    docker-compose run --rm api npm run sync:enrich
    ```

**Issue: Database connection failed**
-   **Cause**: The API container cannot reach the database.
-   **Solution**: Ensure your `.env` file has the correct `DATABASE_URL`. If the database is in another container, use the service name as the hostname. If it's on the host machine, use `host.docker.internal` (Mac/Windows) or the host's IP.
