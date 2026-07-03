import { getBackendUrl } from "./backendConfig.js";

const BACKEND_URL = getBackendUrl();

export async function sendMessage(messages, userContext) {
  try {
    const result = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        user_context: userContext,
      }),
    });

    if (!result.ok) {
      const errorText = await result.text();
      throw new Error(`Chat API failed: ${result.status} ${errorText}`);
    }

    const responseData = await result.json();
    return responseData.response; // returns { role: 'assistant', content: '...' }
  } catch (err) {
    console.error("[sendMessage] error:", err);
    throw err;
  }
}
