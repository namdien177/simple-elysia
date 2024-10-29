# Simple-Elysia with Bun

1. Install Bun runtime
2. Install dependencies
    ```shell
    bun install
    ```
3. Ensure ENV is available
    ```shell
    cp .env.example .env
    ```
4. Ensure DB is migrated
    ```shell
    # checkout `db.sqlite` file  
    bun db:generate
    ```
5. Run the server
    ```shell
    bun dev
    ```