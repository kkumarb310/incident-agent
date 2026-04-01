import axios from 'axios';

const BASE = 'https://incident-agent-production.up.railway.app';

export const triageIncident = (title, description) =>
  axios.post(`${BASE}/triage`, { title, description });

export const submitFeedback = (request_id, score, comment) =>
  axios.post(`${BASE}/feedback`, { request_id, score, comment });

export const getMetrics = () =>
  axios.get(`${BASE}/metrics`);