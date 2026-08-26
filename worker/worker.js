export default {
  async fetch(request, env) {

    // ==========================================
    // CORS
    // ==========================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }


    // ==========================================
    // REQUEST URL
    // ==========================================

    const url = new URL(request.url);


    // ==========================================
    // DEBUG ENDPOINT
    // ==========================================

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
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }


    // ==========================================
    // MAIN AI REQUEST
    // ==========================================

    try {

      const data = await request.json();


      const expected =
        data.expected || "";

      const actual =
        data.actual || "";

      const code =
        data.code || "";


      // ========================================
      // AI PROMPT
      // ========================================

      const prompt = `
You are an expert programming debugger.

Analyze the user's programming problem carefully.

Your job is to:

1. Identify the actual bug.
2. Explain why the bug happens.
3. Provide corrected code.
4. Explain the evidence from the user's code.
5. Give useful debugging advice.
6. Do not invent errors that are not present.
7. Identify the programming language correctly.

EXPECTED BEHAVIOUR:
${expected}

ACTUAL BEHAVIOUR / ERROR:
${actual}

USER CODE:
\`\`\`
${code}
\`\`\`

Return ONLY a valid JSON object.

The JSON must have exactly these fields:

{
  "language": "programming language",
  "cause": "short explanation of the main problem",
  "evidence": "specific evidence from the user's code",
  "solution": "complete corrected code",
  "confidence": 0,
  "tip": "useful debugging advice"
}

The confidence must be a number between 0 and 100.

Do NOT use Markdown.
Do NOT use code fences around the JSON.
Return ONLY the JSON object.
`;


      // ========================================
      // CALL CLOUDFLARE WORKERS AI
      // ========================================

      const aiResponse =
        await env.AI.run(
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

            stream: false,

            max_tokens: 2000,

            temperature: 0.1
          }
        );


      // ========================================
      // EXTRACT AI TEXT
      // ========================================

      let aiText = "";


      if (
        typeof aiResponse === "string"
      ) {

        aiText =
          aiResponse;

      } else if (
        aiResponse &&
        typeof aiResponse.response === "string"
      ) {

        aiText =
          aiResponse.response;

      } else {

        /*
         * Some Workers AI responses can contain
         * the generated result in another object.
         */

        if (
          aiResponse &&
          typeof aiResponse === "object"
        ) {

          aiText =
            JSON.stringify(aiResponse);

        } else {

          aiText =
            String(aiResponse);
        }
      }


      // ========================================
      // CLEAN AI RESPONSE
      // ========================================

      aiText =
        aiText.trim();


      /*
       * Remove Markdown code fences if Qwen
       * accidentally returns them.
       */

      if (
        aiText.startsWith("```json")
      ) {

        aiText =
          aiText.substring(7);

      } else if (
        aiText.startsWith("```")
      ) {

        aiText =
          aiText.substring(3);
      }


      if (
        aiText.endsWith("```")
      ) {

        aiText =
          aiText.substring(
            0,
            aiText.length - 3
          );
      }


      aiText =
        aiText.trim();


      // ========================================
      // PARSE JSON
      // ========================================

      let result = null;


      try {

        result =
          JSON.parse(aiText);

      } catch (parseError) {

        /*
         * Sometimes the AI adds text before or
         * after the JSON. Try extracting the
         * JSON object.
         */

        const firstBrace =
          aiText.indexOf("{");

        const lastBrace =
          aiText.lastIndexOf("}");


        if (
          firstBrace !== -1 &&
          lastBrace !== -1 &&
          lastBrace > firstBrace
        ) {

          const possibleJson =
            aiText.substring(
              firstBrace,
              lastBrace + 1
            );


          try {

            result =
              JSON.parse(
                possibleJson
              );

          } catch (secondError) {

            result =
              null;
          }
        }
      }


      // ========================================
      // FALLBACK
      // ========================================

      if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
      ) {

        result = {

          language:
            "Unknown",

          cause:
            "The AI returned an unexpected response format.",

          evidence:
            aiText ||
            "No response was received from the AI.",

          solution:
            "Please run the investigation again.",

          confidence:
            50,

          tip:
            "The AI responded, but its response was not valid JSON."
        };
      }


      // ========================================
      // MAKE SURE ALL FIELDS EXIST
      // ========================================

      result.language =
        result.language ||
        "Unknown";


      result.cause =
        result.cause ||
        "No cause provided.";


      result.evidence =
        result.evidence ||
        "No evidence provided.";


      result.solution =
        result.solution ||
        "No solution provided.";


      result.confidence =
        Number(
          result.confidence
        ) || 0;


      result.tip =
        result.tip ||
        "Review the suggested fix carefully.";


      // Keep confidence between 0 and 100

      result.confidence =
        Math.max(
          0,
          Math.min(
            100,
            result.confidence
          )
        );


      // ========================================
      // SEND RESULT TO WEBSITE
      // ========================================

      return new Response(
        JSON.stringify(result),
        {
          status: 200,

          headers: {
            "Content-Type":
              "application/json",

            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "POST, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type"
          }
        }
      );


    } catch (error) {

      // ========================================
      // ERROR HANDLING
      // ========================================

      console.error(
        "Worker error:",
        error
      );


      return new Response(
        JSON.stringify({
          error:
            error.message ||
            "Unknown server error."
        }),
        {
          status: 500,

          headers: {
            "Content-Type":
              "application/json",

            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "POST, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type"
          }
        }
      );
    }
  }
};
