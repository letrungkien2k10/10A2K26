export async function handler(event) {
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
        console.log('Fetched content:', content);

        // Pagination logic
        const page = parseInt(event.queryStringParameters.page) || 1;
        const limit = parseInt(event.queryStringParameters.limit) || 20;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedContent = content.slice(start, end);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
                data: paginatedContent,
                total: content.length,
                page,
                limit
            })
        };
    } catch (err) {
        console.error('Fetch error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || "Server error" })
        };
    }
}