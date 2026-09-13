/**
 * RepairGrid Frontend Configuration
 * Points to deployed AWS API Gateway in production, or localhost in development.
 */

export const AWS_API_GATEWAY_URL = "https://135szwxyp5.execute-api.us-east-1.amazonaws.com";
export const AWS_WS_GATEWAY_URL = "wss://iljjajezs4.execute-api.us-east-1.amazonaws.com/demo";

export function getApiBaseUrl(): string {
  // If running in browser:
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
    
    // In production (not on localhost), ALWAYS use the deployed AWS API Gateway URL
    // unless explicitly overridden by an environment variable that is NOT localhost.
    if (!isLocalhost) {
      const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
      if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        return envUrl;
      }
      return AWS_API_GATEWAY_URL;
    }
  }

  // If environment variable is set and valid
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }

  // If building or running in production mode
  if (process.env.NODE_ENV === "production") {
    return AWS_API_GATEWAY_URL;
  }

  return envUrl || "http://localhost:8000";
}

export const API_BASE_URL = getApiBaseUrl();

export const WS_BASE_URL = 
  process.env.NEXT_PUBLIC_WS_URL || AWS_WS_GATEWAY_URL;

