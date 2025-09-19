// functions/upload-image.js
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
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
    if (!res.ok) throw new Error(JSON.stringify(data));

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`,
        title,
        date,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
}
