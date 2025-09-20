export async function handler() {
  try {
    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;
    const jsonPath = "data/memories.json";

    const url = `https://api.github.com/repos/${user}/${repo}/contents/${jsonPath}?ref=${branch}`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${token}` }
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch memories.json");
    }

    const content = JSON.parse(atob(data.content));

    return {
      statusCode: 200,
      body: JSON.stringify(content)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" })
    };
  }
}