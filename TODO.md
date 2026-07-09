# TODO - SmartPricing Auth Access Fix

- [x] Update `src/config.js`:
  - [x] Add API auth header configurability (`API_AUTH_HEADER`)
  - [x] Add API auth scheme configurability (`API_AUTH_SCHEME`)
  - [x] Add optional raw token mode (`API_AUTH_RAW_TOKEN`)
- [x] Update `src/apiClient.js`:
  - [x] Build request auth header dynamically from config
  - [x] Preserve existing endpoint behavior
- [x] Update `src/worker.js`:
  - [x] Add safe startup auth mode logging (no secret output)
- [ ] Update docs:
  - [x] `README.md` add auth env variable guidance
  - [ ] `.env.example` add new auth env variables
- [ ] Testing checklist for remote Pi:
  - [ ] Validate header mode with curl
  - [ ] Run dry run `node src/worker.js --once`
  - [ ] Run real send `DRY_RUN=false node src/worker.js --once`
  - [ ] Re-run for idempotency verification
  - [ ] Verify PM2/systemd healthy cycles
