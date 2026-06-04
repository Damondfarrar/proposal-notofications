const axios = require("axios");

class ApiClient {
  constructor({ baseUrl, authToken, requestTimeoutMs = 20000 }) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: requestTimeoutMs,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json"
      }
    });
  }

  async listWonProposals({ page = 1, limit = 50 }) {
    const response = await this.http.get("/api/proposals", {
      params: {
        page,
        limit,
        status: "won"
      }
    });

    const payload = response.data || {};
    const items = Array.isArray(payload.data) ? payload.data : [];
    const pagination = payload.pagination || {};
    return { items, pagination };
  }

  async getProposal(proposalId) {
    const response = await this.http.get(`/api/proposals/${proposalId}`);
    return response.data;
  }

  async patchProposalTags(proposalId, tags) {
    const response = await this.http.patch(`/api/proposals/${proposalId}`, { tags });
    return response.data;
  }
}

module.exports = { ApiClient };
