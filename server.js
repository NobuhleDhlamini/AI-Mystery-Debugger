const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen2.5-coder:7b";

const server = http.createServer(async (req, res) => {

    // Allow browser requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // AI DEBUG ENDPOINT
    if (req.method === "POST" && req.url === "/api/debug") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", async () => {

            try {

                const data = JSON.parse(body);

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

Return your answer as JSON with exactly these fields:

{
    "language": "programming language",
    "cause": "short explanation of the main problem",
    "evidence": "why you believe this is the problem",
    "solution": "complete corrected code",
    "confidence": 0,
    "tip": "useful debugging advice"
}

The confidence must be a number from 0 to 100.

Return ONLY valid JSON.
`;

                const ollamaResponse = await fetch(
                    OLLAMA_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            model: MODEL,

                            messages: [
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ],

                            stream: false,

                            format: "json"
                        })
                    }
                );

                if (!ollamaResponse.ok) {

                    throw new Error(
                        `Ollama returned HTTP ${ollamaResponse.status}`
                    );
                }

                const ollamaData =
                    await ollamaResponse.json();

                const aiText =
                    ollamaData.message.content;

                let result;

                try {

                    result =
                        JSON.parse(aiText);

                } catch (error) {

                    result = {
                        language: "Unknown",

                        cause:
                            "The AI returned an unexpected response.",

                        evidence:
                            aiText,

                        solution:
                            "Please try the investigation again.",

                        confidence: 50,

                        tip:
                            "Try providing the complete error message and the relevant code."
                    };
                }

                res.writeHead(200, {
                    "Content-Type":
                        "application/json"
                });

                res.end(
                    JSON.stringify(result)
                );

            } catch (error) {

                console.error(error);

                res.writeHead(500, {
                    "Content-Type":
                        "application/json"
                });

                res.end(
                    JSON.stringify({
                        error:
                            error.message
                    })
                );
            }
        });

        return;
    }


    // SERVE WEBSITE FILES

    let filePath;

    if (req.url === "/") {

        filePath =
            path.join(
                __dirname,
                "index.html"
            );

    } else {

        filePath =
            path.join(
                __dirname,
                req.url
            );
    }


    const extension =
        path.extname(filePath);

    const contentTypes = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript"
    };

    const contentType =
        contentTypes[extension] ||
        "text/plain";


    fs.readFile(
        filePath,
        (error, content) => {

            if (error) {

                res.writeHead(404);

                res.end("File not found");

                return;
            }

            res.writeHead(200, {
                "Content-Type":
                    contentType
            });

            res.end(content);
        }
    );
});


server.listen(
    PORT,
    () => {

        console.log(
            `AI Mystery Debugger running at http://localhost:${PORT}`
        );

        console.log(
            `Using Ollama model: ${MODEL}`
        );
    }
);
