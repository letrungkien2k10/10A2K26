// functions/upload-image.js
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { title, date, filename, contentBase64 } = JSON.parse(event.body);

    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;

    const path = `img/memories/${Date.now()}_${filename}`;
    const url = `https://api.github.com/repos/${user}/${repo}/contents/${path}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload ảnh: ${title}`,
        content: contentBase64,
        branch,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Upload failed", details: data })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`,
        title,
        date,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unexpected server error" })
    };
  }
}
