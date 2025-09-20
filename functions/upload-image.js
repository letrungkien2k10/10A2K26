export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { title, date, filename, contentBase64 } = JSON.parse(event.body);

    // Debug để kiểm tra dữ liệu đầu vào
    console.log('Received title:', title);

    // Encode và decode để đảm bảo UTF-8
    const encodedTitle = Buffer.from(title, 'utf8').toString('base64');
    const decodedTitle = Buffer.from(encodedTitle, 'base64').toString('utf8');
    console.log('Decoded title:', decodedTitle);

    const user = process.env.GITHUB_USER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;

    const timestamp = Date.now();
    const path = `img/memories/${timestamp}_${filename}`;

    // Upload image
    const imageUrl = `https://api.github.com/repos/${user}/${repo}/contents/${path}`;
    const imageRes = await fetch(imageUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload ảnh: ${decodedTitle}`,
        content: contentBase64,
        branch,
      }),
    });

    const imageData = await imageRes.json();
    if (!imageRes.ok) {
      throw new Error(imageData.message || "Upload image failed");
    }

    const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;

    // Get current memories.json
    const jsonPath = "data/memories.json";
    const jsonUrl = `https://api.github.com/repos/${user}/${repo}/contents/${jsonPath}?ref=${branch}`;
    const jsonRes = await fetch(jsonUrl, {
      headers: { Authorization: `token ${token}` }
    });

    let memories = [];
    let jsonSha = null;
    if (jsonRes.ok) {
      const jsonData = await jsonRes.json();
      memories = JSON.parse(atob(jsonData.content));
      jsonSha = jsonData.sha;
    } // If not exist, memories = [], no sha (GitHub will create)

    // Add new entry (unshift for newest first)
    memories.unshift({ title: decodedTitle, date, url: rawUrl, path });

    // Put updated json
    const putJsonRes = await fetch(jsonUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        message: `Add memory: ${decodedTitle}`,
        content: btoa(JSON.stringify(memories, null, 2)),
        sha: jsonSha,
        branch,
      }),
    });

    const putJsonData = await putJsonRes.json();
    if (!putJsonRes.ok) {
      throw new Error(putJsonData.message || "Update memories.json failed");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ url: rawUrl, title: decodedTitle, date, path }),
    };
  } catch (err) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unexpected server error" })
    };
  }
}