import type { Handler, HandlerEvent } from "@netlify/functions";
import { Octokit } from "octokit";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // format: "owner/repo"

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.error("Missing GITHUB_TOKEN or GITHUB_REPO");
    return { statusCode: 500, body: "Server Misconfiguration" };
  }

  const [owner, repo] = GITHUB_REPO.split("/");
  if (!owner || !repo) {
    return { statusCode: 500, body: "Invalid GITHUB_REPO format" };
  }

  try {
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const PATH = "data/models.json";

    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path: PATH,
        // Add cache busting to ensure fresh data
        headers: {
          "If-None-Match": "",
        },
      },
    );

    let models = [];
    if (!Array.isArray(data) && data.type === "file" && data.content) {
      const decodedContent = Buffer.from(data.content, "base64").toString(
        "utf-8",
      );
      try {
        models = JSON.parse(decodedContent);
      } catch (e) {
        console.error("Failed to parse models.json", e);
        // return empty array if corrupt
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=0, must-revalidate", // Prevent caching
      },
      body: JSON.stringify(models),
    };
  } catch (error: any) {
    if (error.status === 404) {
      // If file doesn't exist, return empty list
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      };
    }
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
