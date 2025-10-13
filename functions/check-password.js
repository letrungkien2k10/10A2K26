export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { password } = JSON.parse(event.body);
    const CLASS_PASSWORD = process.env.CLASS_PASSWORD;

    if (!password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Vui lòng nhập mật khẩu!" })
      };
    }

    if (password === CLASS_PASSWORD) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Sai mật khẩu lớp!" })
      };
    }
  } catch (err) {
    console.error('Check password error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Lỗi server!" })
    };
  }
}