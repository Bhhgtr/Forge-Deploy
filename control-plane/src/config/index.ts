import dotenv from "dotenv";
import { loadConfig } from "./env.js";
dotenv.config();

export const config = loadConfig(process.env);
