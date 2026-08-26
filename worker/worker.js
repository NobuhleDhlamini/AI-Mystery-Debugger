export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // ==========================================
    // CORS
    // ==========================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    // ==========================================
    // HEALTH CHECK
    // ==========================================

    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return new Response(
        JSON.stringify({
          status: "online",
          message: "AI Mystery Debugger Worker is running.",
          endpoint: "/api/debug"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // ==========================================
    // API ROUTE
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
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // ==========================================
    // CHECK AI
    // ==========================================

    if (!env.AI) {
      return new Response(
        JSON.stringify({
          error: "Workers AI binding 'AI' is not configured."
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

    try {

      // ========================================
      // REQUEST DATA
      // ========================================

      const data = await request.json();

      const expected =
        String(data.expected || "");

      const actual =
        String(data.actual || "");

      const code =
        String(data.code || "");

      if (!expected || !actual || !code) {
        return new Response(
          JSON.stringify({
            error:
              "Expected behaviour, actual behaviour, and code are required."
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }

      // ========================================
      // AI PROMPT
      // ========================================

      const prompt = `
You are an expert software debugging assistant.

Your job is to investigate the user's programming problem and provide a COMPLETE, CORRECTED version of their code.

EXPECTED BEHAVIOUR:
${expected}

ACTUAL BEHAVIOUR:
${actual}

SOURCE CODE:
${code}

Follow these rules carefully:

1. Identify the programming language.

2. Identify the most likely root cause of the problem.

3. Give specific evidence from the user's source code.

4. Determine exactly what needs to change to make the code produce the EXPECTED BEHAVIOUR.

5. The "solution" field MUST contain the COMPLETE corrected version of the user's original code.

6. Preserve the original structure of the user's code.

7. Preserve all working code, including:
   - imports
   - classes
   - functions
   - variables
   - event listeners
   - HTML
   - CSS
   - SQL statements
   - other relevant code

8. Only change the parts that are necessary to fix the problem.

9. NEVER return only the changed line.

10. NEVER return only a small snippet.

11. NEVER remove working parts of the user's code.

12. If the user provides a complete program, return the complete corrected program.

13. The corrected code must be directly copy-pasteable.

14. The solution MUST match the EXPECTED BEHAVIOUR.

15. Carefully compare EXPECTED BEHAVIOUR and ACTUAL BEHAVIOUR before deciding what the fix should be.

16. Do not change the intended operation unless the expected behaviour clearly requires it.

17. Do not invent missing requirements.

18. Give a confidence score from 0 to 100.

19. Give one useful debugging tip.

20. Prefer the SIMPLEST and MOST DIRECT fix.

21. Make the MINIMUM necessary change to the user's code.

22. Do NOT introduce unnecessary conversions, casts, helper functions, temporary variables, or refactoring.

23. Do NOT change a variable's type merely to work around a bug.

24. If the user's variable has the wrong type because of the bug, correct the variable type when appropriate.

25. If the intended operation is numeric arithmetic, perform numeric arithmetic directly rather than converting the result to a string.

26. Preserve the user's intended data types whenever possible.

27. The corrected code should be idiomatic for the detected programming language.

IMPORTANT:

The EXPECTED BEHAVIOUR is the authority for determining whether the proposed fix is correct.

Before returning the answer, mentally verify that the COMPLETE corrected code would produce the expected result.

For example, if the user's Java code is:

public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 5;

        String result = "" + a + b;

        System.out.println(result);
    }
}

and the expected result is 15, the preferred correction is:

public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 5;

        int result = a + b;

        System.out.println(result);
    }
}

Do NOT use:

String result = Integer.toString(a + b);

because that unnecessarily preserves the incorrect String type.

Return ONLY valid JSON.

Do not use Markdown.

Do not use code fences.

Use exactly this structure:

{
  "language": "Java",
  "cause": "The root cause.",
  "evidence": "Specific evidence from the user's code.",
  "solution": "The COMPLETE corrected version of the user's code.",
  "confidence": 95,
  "tip": "Useful debugging advice."
}
`;

      // ========================================
      // CALL CLOUDFLARE WORKERS AI
      // ========================================

      const aiResult = await env.AI.run(
        "@cf/qwen/qwen2.5-coder-32b-instruct",
        {
          messages: [
            {
              role: "system",
              content:
                "You are an expert software debugger. Return only valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.05
        }
      );

      // ========================================
      // LOG FULL AI RESULT
      // ========================================

      console.log(
        "FULL AI RESULT:",
        JSON.stringify(aiResult)
      );

      let result;

      // ========================================
      // EXTRACT AI RESPONSE
      // ========================================

      if (
        aiResult &&
        aiResult.response &&
        typeof aiResult.response === "object"
      ) {

        result = aiResult.response;

      } else {

        throw new Error(
          "Workers AI returned an unexpected response format."
        );
      }

      // ========================================
      // NORMALIZE RESULT
      // ========================================

      result = {
        language:
          result.language ||
          "Unknown",

        cause:
          result.cause ||
          "No cause provided.",

        evidence:
          result.evidence ||
          "No evidence provided.",

        solution:
          result.solution ||
          "No solution provided.",

        confidence:
          Number(result.confidence) || 0,

        tip:
          result.tip ||
          "Review the suggested fix carefully."
      };

      // ========================================
      // LOG FINAL RESULT
      // ========================================

      console.log(
        "FINAL RESULT:",
        JSON.stringify(result)
      );

      // ========================================
      // SEND CLEAN JSON TO FRONTEND
      // ========================================

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {

      // ========================================
      // ERROR
      // ========================================

      console.error(
        "WORKER ERROR:",
        error
      );

      return new Response(
        JSON.stringify({
          error:
            error.message ||
            "Unknown Workers AI error."
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
