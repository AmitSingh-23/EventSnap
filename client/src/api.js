import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const baseURL = configuredUrl
  ? `${configuredUrl}/api`
  : "http://localhost:5000/api";

const api = axios.create({ baseURL });

export { baseURL };
export default api;
