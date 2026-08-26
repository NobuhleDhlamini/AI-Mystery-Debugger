export default {
  async fetch(request, env) {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only accept POST requests to /api/debug
    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/api/debug") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const data = await request.json();

      const expected = data.expected || "";
      const actual = data.actual || "";
      const code = data.code || "";

      const prompt = `
You are an expert programming debugger.

Analyze the user's code carefully.

Your job is to:
1. Identify the actual bug.
2. Explain why it happens.
3. Provide corrected code.
4. Explain what changed.
5. Give useful debugging advice.
6. Do not invent an error that isn't present.
7. Do not assume the programming language incorrectly.

User's expected behaviour:
${expected}

User's actual behaviour/error:
${actual}

User's code:
\`\`\`
${code}
\`\`\`

Return ONLY valid JSON with exactly these fields:

{
  "language": "programming language",
  "cause": "short explanation of the main problem",
  "evidence": "why you believe this is the problem",
  "solution": "complete corrected code",
  "confidence": 0,
  "tip": "useful debugging advice"
}

The confidence must be a number from 0 to 100.
`;

      const response = await env.AI.run(
        "@cf/qwen/qwen2.5-coder-32b-instruct",
        {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }
      );

      return new Response(
        JSON.stringify(response),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
