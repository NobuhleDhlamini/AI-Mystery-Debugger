export default {
  async fetch(request, env) {

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    const url = new URL(request.url);

    // Only /api/debug
    if (
      request.method !== "POST" ||
      url.pathname !== "/api/debug"
    ) {
      return new Response("Not Found", {
        status: 404
      });
    }

    try {

      const data = await request.json();

      const expected = data.expected || "";
      const actual = data.actual || "";
      const code = data.code || "";

      const prompt = `
You are an expert programming debugger.

Analyze the user's code carefully.

Identify the actual programming bug.

Expected behaviour:
${expected}

Actual behaviour:
${actual}

Code:
\`\`\`
${code}
\`\`\`

Return ONLY valid JSON.

Use exactly this structure:

{
  "language": "programming language",
  "cause": "short explanation of the main problem",
  "evidence": "why this is the problem",
  "solution": "complete corrected code",
  "confidence": 0,
  "tip": "useful debugging advice"
}

The confidence must be a number between 0 and 100.
`;

      const aiResponse = await env.AI.run(
        "@cf/qwen/qwen2.5-coder-32b-instruct",
        {
          messages: [
            {
              role: "system",
              content:
                "You are an expert programming debugger. Return only valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.2
        }
      );

      // Workers AI returns the generated text in "response"
      const aiText = aiResponse.response;

      let result;

      try {

        result = JSON.parse(aiText);

      } catch (parseError) {

        result = {
          language: "Unknown",

          cause:
            "The AI returned an invalid JSON response.",

          evidence:
            aiText || "No AI response was received.",

          solution:
            "Please run the investigation again.",

          confidence: 50,

          tip:
            "The AI responded, but its response could not be converted into the required format."
        };
      }

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );

    } catch (error) {

      console.error(error);

      return new Response(
        JSON.stringify({
          error: error.message
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  }
};
