import type { Handler, HandlerEvent } from "@netlify/functions";

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
  // Dynamic import for pure ESM package in CJS env
  const { Octokit } = await import("octokit");

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

    // 1. Pagination & Filtering Params
    const query = event.queryStringParameters || {};
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "50");
    const search = query.search?.toLowerCase() || "";
    const system = query.system || "";
    const faction = query.faction || "";
    const status = query.status || ""; // 'painted', 'assembled', 'forSale', etc.

    // 2. Filter Logic
    let filtered = models.filter((m: any) => {
      // Search (Name/Notes/Tags)
      if (search) {
        const inName = m.name?.toLowerCase().includes(search);
        const inNotes = m.notes?.toLowerCase().includes(search);
        const inTags = m.tags?.some((t: string) =>
          t.toLowerCase().includes(search),
        );
        if (!inName && !inNotes && !inTags) return false;
      }

      // Exact Filters
      if (system && m.system !== system) return false;
      if (faction && m.faction !== faction) return false;

      // Status Flags
      if (status) {
        if (status === "painted" && !m.painted) return false;
        if (status === "assembled" && !m.assembled) return false;
        if (status === "primed" && !m.primed) return false;
        if (status === "based" && !m.based) return false;
        if (status === "forSale" && !m.forSale) return false;
      }

      return true;
    });

    // 3. Sort (Default: Newest First)
    filtered.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // 4. Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedData = filtered.slice(start, start + limit);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
      body: JSON.stringify({
        data: paginatedData,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      }),
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
