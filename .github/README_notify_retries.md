Notify retries runner

This repository includes a GitHub Actions workflow `.github/workflows/notify-retries.yml` which runs every 15 minutes and triggers the `notify-retries` endpoint to resume pending on-chain deposit notifications.

Configuration:
- Add a repository secret `NOTIFY_RETRIES_URL` containing the full URL to the endpoint, e.g. `https://your-site.com/api/circle/notify-retries`.
- If your endpoint requires authentication, include the token in the URL or implement a header-based authentication and update the workflow accordingly.

To run manually, go to the Actions tab and trigger the `Run notify-retries` workflow, or use the `workflow_dispatch` event.
