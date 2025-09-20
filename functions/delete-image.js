// functions/delete-image.js
export async function handler(event) {
  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { path } = JSON.parse(event.body);

    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;

    // Lấy thông tin file để có sha
    const url = `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${branch}`;
    const fileResp = await fetch(url, {
      headers: { Authorization: `token ${token}` }
    });
    const fileData = await fileResp.json();
    if (!fileResp.ok) {
      return {
        statusCode: fileResp.status,
        body: JSON.stringify({ error: fileData.message })
      };
    }

    // Gọi API xóa file
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Xóa ảnh ${path}`,
        sha: fileData.sha,
        branch
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Xóa ảnh thất bại" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, path })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
