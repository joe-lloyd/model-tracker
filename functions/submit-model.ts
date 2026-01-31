import type { Handler, HandlerEvent } from "@netlify/functions";
import { Octokit } from "octokit";
import { ModelInputSchema, type Model } from "../packages/shared/src/index";
import { randomUUID } from "crypto";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // format: "owner/repo"

const MAX_RETRIES = 3;

export const handler: Handler = async (event: HandlerEvent) => {
  const VAULT_KEY = process.env.VAULT_KEY;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Security Check
  const clientKey = event.headers["x-vault-key"];
  if (VAULT_KEY && clientKey !== VAULT_KEY) {
    console.warn("Unauthorized attempt with key:", clientKey);
    return { statusCode: 401, body: "Unauthorized: Invalid Vault Key" };
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
    // 1. Parse and Validate Input
    const body = JSON.parse(event.body || "{}");
    const parseResult = ModelInputSchema.safeParse(body);

    if (!parseResult.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: parseResult.error.format() }),
      };
    }

    const newModelInput = parseResult.data;
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const PATH = "data/models.json";

    // 2. Retry Logic for 409 Conflict
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Fetch existing file
        let sha: string | undefined;
        let existingData: Model[] = [];

        try {
          const { data } = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/{path}",
            { owner, repo, path: PATH },
          );

          if (!Array.isArray(data) && data.type === "file" && data.content) {
            sha = data.sha;
            const decodedContent = Buffer.from(data.content, "base64").toString(
              "utf-8",
            );
            existingData = JSON.parse(decodedContent);
          }
        } catch (error: any) {
          if (error.status !== 404) throw error;
          // If 404, we just create new file, sha remains undefined
        }

        // Create new Model object
        const newModel: Model = {
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          ...newModelInput,
        };

        const updatedData = [...existingData, newModel];

        // Commit back to GitHub
        const newContentBase64 = Buffer.from(
          JSON.stringify(updatedData, null, 2),
        ).toString("base64");

        await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
          owner,
          repo,
          path: PATH,
          message: `Add model: ${newModel.name}`,
          content: newContentBase64,
          sha, // Optimistic locking
        });

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, model: newModel }),
        };
      } catch (error: any) {
        // If 409 Conflict, retry loop will continue
        if (error.status === 409) {
          console.warn(
            `Conflict detected (attempt ${attempt + 1}). Retrying...`,
          );
          continue;
        }
        throw error; // Other errors abort immediately
      }
    }

    return {
      statusCode: 409,
      body: JSON.stringify({
        error: "High concurrency - failed to update after retries",
      }),
    };
  } catch (error: any) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
