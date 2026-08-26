export default {
  async fetch(request, env) {

    // ==========================================
    // CORS
    // ==========================================

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


    // ==========================================
    // CHECK URL
    // ==========================================

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


    // ==========================================
    // MAIN
    // ==========================================

    try {

      const data = await request.json();

      const expected = data.expected || "";
      const actual = data.actual || "";
      const code = data.code || "";


      // ========================================
      // PROMPT
      // ========================================

      const prompt = `
You are an expert programming debugger.

Analyze the programming problem below.

EXPECTED BEHAVIOUR:
${expected}

ACTUAL BEHAVIOUR:
${actual}

USER CODE:
${code}

Return ONLY a JSON object.

The JSON must contain these exact fields:

{
  "language": "programming language",
  "cause": "short explanation of the main bug",
  "evidence": "specific evidence from the code",
  "solution": "complete corrected code",
  "confidence": 95,
  "tip": "useful debugging advice"
}

Rules:

- language must identify the programming language.
- cause must explain the actual bug.
- evidence must refer to the provided code.
- solution must contain the corrected code.
- confidence must be a number from 0 to 100.
- tip must provide useful advice.
- Return ONLY JSON.
- Do not use Markdown.
- Do not use code fences.
`;


      // ========================================
      // CALL QWEN
      // ========================================

      const aiResult = await env.AI.run(
        "@cf/qwen/qwen2.5-coder-32b-instruct",
        {
          messages: [
            {
              role: "system",
              content:
                "You are a programming debugger. Return ONLY valid JSON."
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
      // DEBUG AI RESPONSE
      // ========================================

      console.log(
        "Workers AI result:",
        JSON.stringify(aiResult)
      );


      // ========================================
      // GET RESPONSE TEXT
      // ========================================

      let aiText = "";


      if (
        aiResult &&
        typeof aiResult.response === "string"
      ) {

        aiText =
          aiResult.response;

      } else if (
        typeof aiResult === "string"
      ) {

        aiText =
          aiResult;

      } else {

        throw new Error(
          "Workers AI returned an unexpected response."
        );
      }


      aiText =
        aiText.trim();


      // ========================================
      // REMOVE MARKDOWN FENCES
      // ========================================

      aiText =
        aiText.replace(
          /^```json\s*/i,
          ""
        );

      aiText =
        aiText.replace(
          /^```\s*/i,
          ""
        );

      aiText =
        aiText.replace(
          /\s*```$/i,
          ""
        );

      aiText =
        aiText.trim();


      // ========================================
      // PARSE JSON
      // ========================================

      let result;


      try {

        result =
          JSON.parse(aiText);

      } catch (error) {

        console.log(
          "JSON parsing failed."
        );

        console.log(
          "AI text:",
          aiText
        );


        // Try extracting JSON object

        const start =
          aiText.indexOf("{");

        const end =
          aiText.lastIndexOf("}");


        if (
          start !== -1 &&
          end !== -1 &&
          end > start
        ) {

          const extracted =
            aiText.substring(
              start,
              end + 1
            );


          try {

            result =
              JSON.parse(extracted);

          } catch (secondError) {

            result =
              null;
          }

        } else {

          result =
            null;
        }
      }


      // ========================================
      // FALLBACK
      // ========================================

      if (
        !result ||
        typeof result !== "object"
      ) {

        return new Response(
          JSON.stringify({

            language:
              "Unknown",

            cause:
              "The AI returned an unexpected response.",

            evidence:
              aiText ||
              "The AI returned no text.",

            solution:
              "Please try the investigation again.",

            confidence:
              50,

            tip:
              "The AI responded, but its response could not be converted into the debugger format."

          }),
          {
            status: 200,

            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json"
            }
          }
        );
      }


      // ========================================
      // NORMALIZE RESULT
      // ========================================

      const finalResult = {

        language:
          String(
            result.language ||
            "Unknown"
          ),

        cause:
          String(
            result.cause ||
            "No cause provided."
          ),

        evidence:
          String(
            result.evidence ||
            "No evidence provided."
          ),

        solution:
          String(
            result.solution ||
            "No solution provided."
          ),

        confidence:
          Math.max(
            0,
            Math.min(
              100,
              Number(
                result.confidence
              ) || 0
            )
          ),

        tip:
          String(
            result.tip ||
            "Review the suggested fix carefully."
          )
      };


      // ========================================
      // RETURN RESULT
      // ========================================

      return new Response(
        JSON.stringify(finalResult),
        {
          status: 200,

          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json"
          }
        }
      );


    } catch (error) {

      console.error(
        "Worker error:",
        error
      );


      return new Response(
        JSON.stringify({
          error:
            error.message ||
            "Unknown Worker error."
        }),
        {
          status: 500,

          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json"
          }
        }
      );
    }
  }
};
