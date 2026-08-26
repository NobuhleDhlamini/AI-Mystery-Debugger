// ==========================================
// ELEMENTS
// ==========================================

const expectedInput =
    document.getElementById("expected");

const actualInput =
    document.getElementById("actual");

const codeInput =
    document.getElementById("code");

const debugButton =
    document.getElementById("debugButton");

const clearButton =
    document.getElementById("clearButton");

const exampleButton =
    document.getElementById("exampleButton");

const emptyExampleButton =
    document.getElementById("emptyExampleButton");

const emptyState =
    document.getElementById("emptyState");

const resultContent =
    document.getElementById("resultContent");

const status =
    document.getElementById(
        "investigationStatus"
    );

const investigationSubtitle =
    document.getElementById(
        "investigationSubtitle"
    );

const causeElement =
    document.getElementById("cause");

const evidenceElement =
    document.getElementById("evidence");

const solutionElement =
    document.getElementById("solution");

const confidenceValue =
    document.getElementById(
        "confidenceValue"
    );

const confidenceFill =
    document.getElementById(
        "confidenceFill"
    );

const detectedLanguage =
    document.getElementById(
        "detectedLanguage"
    );

const languageBadge =
    document.getElementById(
        "languageBadge"
    );

const debugTip =
    document.getElementById("debugTip");

const copyButton =
    document.getElementById("copyButton");


// ==========================================
// CLOUDFLARE WORKER
// ==========================================

const AI_API_URL =
    "https://ai-mystery-debugger.nobuhledhlamini48.workers.dev/api/debug";


// ==========================================
// EXAMPLE PROBLEM
// ==========================================

const exampleProblem = {

    expected:
        "Clicking the login button should display a welcome message.",

    actual:
        "Clicking the login button causes a ReferenceError: username is not defined.",

    code:
`function login() {
    const message = "Welcome " + username;

    document.getElementById("result").textContent =
        message;
}

document
    .getElementById("loginButton")
    .addEventListener("click", login);`
};


// ==========================================
// EVENTS
// ==========================================

if (debugButton) {

    debugButton.addEventListener(
        "click",
        investigate
    );
}


if (clearButton) {

    clearButton.addEventListener(
        "click",
        clearDebugger
    );
}


if (exampleButton) {

    exampleButton.addEventListener(
        "click",
        loadExample
    );
}


if (emptyExampleButton) {

    emptyExampleButton.addEventListener(
        "click",
        loadExample
    );
}


if (copyButton) {

    copyButton.addEventListener(
        "click",
        copyFix
    );
}


if (codeInput) {

    codeInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                (event.ctrlKey || event.metaKey)
            ) {

                investigate();
            }
        }
    );
}


// ==========================================
// INVESTIGATE
// ==========================================

async function investigate() {

    const expected =
        expectedInput.value.trim();

    const actual =
        actualInput.value.trim();

    const code =
        codeInput.value.trim();


    // ========================================
    // VALIDATION
    // ========================================

    if (
        !expected ||
        !actual ||
        !code
    ) {

        alert(
            "Please provide the expected behaviour, actual behaviour/error, and code."
        );

        return;
    }


    // ========================================
    // SHOW INVESTIGATION UI
    // ========================================

    status.textContent =
        "AI investigating...";

    status.classList.add(
        "investigating"
    );

    investigationSubtitle.textContent =
        "Qwen is analyzing your code...";


    emptyState.classList.add(
        "hidden"
    );

    resultContent.classList.remove(
        "hidden"
    );


    causeElement.textContent =
        "AI is investigating...";

    evidenceElement.textContent =
        "Analyzing your code and reported behaviour.";

    solutionElement.textContent =
        "Generating a fix...";


    confidenceValue.textContent =
        "—";

    confidenceFill.style.width =
        "0%";


    detectedLanguage.textContent =
        "Analyzing...";

    languageBadge.textContent =
        "AI";


    debugTip.textContent =
        "The AI is examining the code for the root cause.";


    debugButton.disabled =
        true;

    debugButton.style.opacity =
        "0.6";


    // ========================================
    // SEND REQUEST TO CLOUDFLARE
    // ========================================

    try {

        const response =
            await fetch(
                AI_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        expected:
                            expected,

                        actual:
                            actual,

                        code:
                            code
                    })
                }
            );


        // ====================================
        // READ RESPONSE
        // ====================================

        const responseText =
            await response.text();


        console.log(
            "RAW CLOUDFLARE RESPONSE:",
            responseText
        );


        let result;


        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            throw new Error(
                "Cloudflare returned an invalid response: " +
                responseText.substring(
                    0,
                    300
                )
            );
        }


        console.log(
            "PARSED CLOUDFLARE RESPONSE:",
            result
        );


        // ====================================
        // CHECK HTTP ERROR
        // ====================================

        if (!response.ok) {

            throw new Error(
                result.error ||
                "The online AI server returned an error."
            );
        }


        // ====================================
        // DISPLAY RESULT
        // ====================================

        displayResult(result);


    } catch (error) {

        console.error(
            "AI investigation error:",
            error
        );


        causeElement.textContent =
            "Unable to contact the AI.";


        evidenceElement.textContent =
            error.message;


        solutionElement.textContent =
`The online AI service could not provide a
debugging result.

Please try the investigation again.`;


        confidenceValue.textContent =
            "0%";


        confidenceFill.style.width =
            "0%";


        detectedLanguage.textContent =
            "Unknown";


        languageBadge.textContent =
            "ERROR";


        debugTip.textContent =
            "The debugger is using the Cloudflare Workers AI service.";

    } finally {

        // ====================================
        // RESTORE UI
        // ====================================

        debugButton.disabled =
            false;

        debugButton.style.opacity =
            "1";


        status.textContent =
            "Investigation complete";


        status.classList.remove(
            "investigating"
        );


        investigationSubtitle.textContent =
            "Evidence analyzed by AI.";
    }
}


// ==========================================
// DISPLAY RESULT
// ==========================================

function displayResult(result) {

    console.log(
        "DISPLAY RESULT:",
        result
    );


    // ========================================
    // ERROR RESPONSE
    // ========================================

    if (
        result &&
        result.error
    ) {

        causeElement.textContent =
            "Unable to contact the AI.";

        evidenceElement.textContent =
            result.error;

        solutionElement.textContent =
            "Please try the investigation again.";

        confidenceValue.textContent =
            "0%";

        confidenceFill.style.width =
            "0%";

        detectedLanguage.textContent =
            "Unknown";

        languageBadge.textContent =
            "ERROR";

        debugTip.textContent =
            "The Cloudflare Worker returned an error.";

        return;
    }


    // ========================================
    // START WITH RESULT
    // ========================================

    let aiResult =
        result;


    // ========================================
    // HANDLE NESTED OBJECT
    //
    // {
    //   response: {
    //      language: "...",
    //      cause: "..."
    //   }
    // }
    // ========================================

    if (
        aiResult &&
        aiResult.response &&
        typeof aiResult.response === "object"
    ) {

        aiResult =
            aiResult.response;
    }


    // ========================================
    // HANDLE STRING RESPONSE
    //
    // {
    //   response: "..."
    // }
    // ========================================

    if (
        aiResult &&
        typeof aiResult.response === "string"
    ) {

        const responseText =
            aiResult.response.trim();


        try {

            aiResult =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            // Try to find JSON inside response

            const start =
                responseText.indexOf("{");

            const end =
                responseText.lastIndexOf("}");


            if (
                start !== -1 &&
                end !== -1 &&
                end > start
            ) {

                try {

                    aiResult =
                        JSON.parse(
                            responseText.substring(
                                start,
                                end + 1
                            )
                        );

                } catch (secondError) {

                    showRawAIResponse(
                        responseText
                    );

                    return;
                }

            } else {

                showRawAIResponse(
                    responseText
                );

                return;
            }
        }
    }


    // ========================================
    // HANDLE ANOTHER POSSIBLE NESTED FORMAT
    // ========================================

    if (
        aiResult &&
        aiResult.result &&
        typeof aiResult.result === "object"
    ) {

        aiResult =
            aiResult.result;
    }


    // ========================================
    // CHECK RESULT
    // ========================================

    if (
        !aiResult ||
        typeof aiResult !== "object"
    ) {

        showRawAIResponse(
            String(aiResult)
        );

        return;
    }


    // ========================================
    // LANGUAGE
    // ========================================

    const language =
        aiResult.language ||
        "Unknown";


    detectedLanguage.textContent =
        language;


    languageBadge.textContent =
        String(language)
            .toUpperCase();


    // ========================================
    // CAUSE
    // ========================================

    causeElement.textContent =
        aiResult.cause ||
        "No cause provided.";


    // ========================================
    // EVIDENCE
    // ========================================

    evidenceElement.textContent =
        aiResult.evidence ||
        "No evidence provided.";


    // ========================================
    // SOLUTION
    // ========================================

   // ========================================
// SOLUTION
// ========================================

let solution =
    aiResult.solution ||
    "No solution provided.";

// Restore escaped newlines
solution = solution.replace(/\\n/g, "\n");

// Restore escaped quotes
solution = solution.replace(/\\"/g, '"');

solutionElement.textContent = solution;



    // ========================================
    // CONFIDENCE
    // ========================================

    let confidence =
        Number(
            aiResult.confidence
        );


    if (
        Number.isNaN(confidence)
    ) {

        confidence =
            0;
    }


    confidence =
        Math.max(
            0,
            Math.min(
                100,
                confidence
            )
        );


    confidenceValue.textContent =
        `${confidence}%`;


    setTimeout(() => {

        confidenceFill.style.width =
            `${confidence}%`;

    }, 50);


    // ========================================
    // DEBUG TIP
    // ========================================

    debugTip.textContent =
        aiResult.tip ||
        "Review the suggested fix carefully.";
}


// ==========================================
// FORMAT AI SOLUTION
// ==========================================

function formatSolution(solution) {

    if (!solution) {

        return "No solution provided.";
    }


    let text =
        String(solution).trim();


    // ----------------------------------------
    // Remove opening Markdown code fence
    // ----------------------------------------

    text =
        text.replace(
            /^```[a-zA-Z0-9+#.-]*\s*/i,
            ""
        );


    // ----------------------------------------
    // Remove closing Markdown code fence
    // ----------------------------------------

    text =
        text.replace(
            /\s*```$/i,
            ""
        );


    return text.trim();
}


// ==========================================
// RAW AI RESPONSE
// ==========================================

function showRawAIResponse(
    response
) {

    console.error(
        "RAW AI RESPONSE:",
        response
    );


    causeElement.textContent =
        "The AI returned an unexpected response.";


    evidenceElement.textContent =
        response ||
        "The AI returned no readable response.";


    solutionElement.textContent =
        "Please run the investigation again.";


    confidenceValue.textContent =
        "50%";


    confidenceFill.style.width =
        "50%";


    detectedLanguage.textContent =
        "Unknown";


    languageBadge.textContent =
        "UNKNOWN";


    debugTip.textContent =
        "The AI responded, but its response was not in the expected format.";
}


// ==========================================
// CLEAR
// ==========================================

function clearDebugger() {

    expectedInput.value =
        "";

    actualInput.value =
        "";

    codeInput.value =
        "";


    emptyState.classList.remove(
        "hidden"
    );

    resultContent.classList.add(
        "hidden"
    );


    status.textContent =
        "Waiting...";


    investigationSubtitle.textContent =
        "Waiting for evidence...";


    detectedLanguage.textContent =
        "Unknown";


    languageBadge.textContent =
        "AUTO";


    confidenceValue.textContent =
        "—";


    confidenceFill.style.width =
        "0%";


    debugTip.textContent =
        "Enter a programming problem to begin.";


    expectedInput.focus();
}


// ==========================================
// LOAD EXAMPLE
// ==========================================

function loadExample() {

    expectedInput.value =
        exampleProblem.expected;


    actualInput.value =
        exampleProblem.actual;


    codeInput.value =
        exampleProblem.code;


    expectedInput.focus();
}


// ==========================================
// COPY FIX
// ==========================================

async function copyFix() {

    const text =
        solutionElement.textContent.trim();


    if (
        !text ||
        text === "No solution provided."
    ) {

        return;
    }


    try {

        await navigator.clipboard.writeText(
            text
        );


        copyButton.textContent =
            "Copied!";


        copyButton.classList.add(
            "copied"
        );


        setTimeout(() => {

            copyButton.textContent =
                "Copy Fix";


            copyButton.classList.remove(
                "copied"
            );

        }, 1600);


    } catch (error) {

        // ====================================
        // FALLBACK COPY
        // ====================================

        const temporary =
            document.createElement(
                "textarea"
            );


        temporary.value =
            text;


        document.body.appendChild(
            temporary
        );


        temporary.select();


        document.execCommand(
            "copy"
        );


        temporary.remove();


        copyButton.textContent =
            "Copied!";


        setTimeout(() => {

            copyButton.textContent =
                "Copy Fix";

        }, 1600);
    }
}
