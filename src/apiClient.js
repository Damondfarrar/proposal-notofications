const axios = require("axios");

class ApiClient {
  constructor({
    baseUrl,
    authToken,
    authHeader = "Authorization",
    authScheme = "Bearer",
    authRawToken = false,
    requestTimeoutMs = 20000
  }) {
    const tokenValue = authRawToken
      ? authToken
      : `${authScheme ? `${authScheme} ` : ""}${authToken}`.trim();

    this.http = axios.create({
      baseURL: baseUrl,
      timeout: requestTimeoutMs,
      headers: {
        [authHeader]: tokenValue,
        "Content-Type": "application/json"
      }
    });

    this.authMeta = {
      authHeader,
      authScheme,
      authRawToken
    };
  }

  normalizeJsonPayload(payload) {
    if (payload && typeof payload === "object") return payload;

    if (typeof payload === "string") {
      try {
        return JSON.parse(payload);
      } catch {
        return {};
      }
    }

    return {};
  }

  async listWonProposals({ page = 1, limit = 50 }) {
    const response = await this.http.get("/proposals", {
      params: {
        page,
        limit
      }
    });

    const payload = this.normalizeJsonPayload(response.data);
    const items = Array.isArray(payload.data) ? payload.data : [];
    const wonItems = items.filter(
      (item) => String(item?.status || "").toUpperCase() === "WON"
    );
    const pagination = payload.pagination || {};
    return { items: wonItems, pagination };
  }

  async getProposal(proposalId) {
    const response = await this.http.get(`/proposals/${proposalId}`);
    return this.normalizeJsonPayload(response.data);
  }

  async patchProposalTags(proposalId, tags) {
    const response = await this.http.patch(`/proposals/${proposalId}`, { tags });
    return this.normalizeJsonPayload(response.data);
  }
}

module.exports = { ApiClient };
