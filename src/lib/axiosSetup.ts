import axios from "axios";

// Configure axios baseURL globally for client-side usage.
// Prefer NEXT_PUBLIC_API_URL, then NEXT_PUBLIC_CORE_API_URL. If neither is set, keep same-origin.
const rawBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL || "";
const baseURL = rawBase ? rawBase.replace(/\/$/, "") : "";

if (baseURL) {
  axios.defaults.baseURL = baseURL;
}

// You may enable credentials if Core API uses cookies across origins
// axios.defaults.withCredentials = true;
