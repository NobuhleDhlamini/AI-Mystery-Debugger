export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    if (
      request.method !== "POST" ||
      url.pathname !== "/api/debug"
    ) {
      return new Response(
        JSON.stringify({
          error: "Not Found"
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    try {

      const data = await request.json();

      const expected = data.expected || "";
      const actual = data.actual || "";
      const code = data.code || "";

      const prompt = `
You are an expert programming debugger.

Analyze this programming problem.

EXPECTED:
${expected}

ACTUAL:
${actual}

CODE:
${code}

Explain the actual bug clearly.
`;

      const aiResult = await env.AI.run(
        "@cf/qwen/qwen2.5-coder-32b-instruct",
        {
          messages: [
            {
              role: "system",
              content:
                "You are an expert programming debugger."
            },
            {
              role: "user",
              content: prompt
            }
          ],

          stream: false,

          max_tokens: 1000,

          temperature: 0.1
        }
      );

      // TEMPORARY DIAGNOSTIC RESPONSE
      return new Response(
        JSON.stringify({
          success: true,
          type: typeof aiResult,
          aiResult: aiResult
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          stack: error.stack
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
