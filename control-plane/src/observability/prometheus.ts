import axios from "axios";
import { config } from "../config/index.js";

export async function queryPrometheus(query: string): Promise<any> {
  const res = await axios.get(`${config.prometheus.url}/api/v1/query`, {
    params: { query },
  });

  return res.data.data.result;
}
