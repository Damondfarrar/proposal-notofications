# TODO - Finance Notification Worker

- [x] Create `package.json` with required dependencies and scripts
- [x] Create `src/config.js` for environment validation/config loading
- [x] Create `src/apiClient.js` for proposal API calls
- [x] Create `src/signingRules.js` for won + signing completion checks
- [x] Create `src/serviceExtractor.js` for selected services and amount extraction
- [x] Create `src/stateStore.js` for SQLite idempotency
- [x] Create `src/mailer.js` for Postmark SMTP sending
- [x] Create `src/templates.js` for finance email rendering
- [x] Create `src/worker.js` orchestration (poll, filter, send, mark)
- [x] Create `.env.example` with required environment variables
- [x] Create `README.md` with setup/run/deploy/testing instructions
- [x] Run dependency installation (`npm install`)
- [x] Execute a one-shot run (`node src/worker.js`) to validate startup
- [x] Summarize testing status and remaining coverage

## New refinement requested (grouping + pricing correctness + selected-only strict mode)
- [ ] Update `src/serviceExtractor.js`:
  - [ ] strict selected-only extraction
  - [ ] exclude no-price (`model:none`) rows
  - [ ] correct money normalization and line total math
  - [ ] add grouped categories and grouped subtotals
- [ ] Update `src/templates.js`:
  - [ ] render grouped sections in text output
  - [ ] render grouped sections in HTML output
  - [ ] show per-group subtotal + overall totals
- [ ] Validate preview for proposal `qAPpzijfRucj`
- [ ] Re-test with live send only after preview approval
