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


/* ==========================================
   EXAMPLE
========================================== */

const exampleProblem = {

    expected:
        "Clicking the button should display a welcome message.",

    actual:
        "Clicking the button produces a ReferenceError.",

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


/* ==========================================
   EVENTS
========================================== */

debugButton.addEventListener(
    "click",
    investigate
);

clearButton.addEventListener(
    "click",
    clearDebugger
);

exampleButton.addEventListener(
    "click",
    loadExample
);

emptyExampleButton.addEventListener(
    "click",
    loadExample
);

copyButton.addEventListener(
    "click",
    copyFix
);

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


/* ==========================================
   INVESTIGATE
========================================== */

async function investigate() {

    const expected =
        expectedInput.value.trim();

    const actual =
        actualInput.value.trim();

    const code =
        codeInput.value.trim();


    if (!expected || !actual || !code) {

        alert(
            "Please provide the expected behaviour, actual behaviour/error, and code."
        );

        return;
    }


    /* Investigation UI */

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

    debugTip.textContent =
        "The AI is examining the code for the root cause.";


    debugButton.disabled = true;

    debugButton.style.opacity =
        "0.6";


    try {

        const response =
            await fetch(
                "/api/debug",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        expected,

                        actual,

                        code
                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "The AI server returned an error."
            );
        }


        displayResult(result);


    } catch (error) {

        console.error(error);

        causeElement.textContent =
            "Unable to contact the AI.";

        evidenceElement.textContent =
            error.message;

        solutionElement.textContent =
`Make sure Ollama is running and that the
Qwen2.5-Coder model is installed.

Then try again.`;

        confidenceValue.textContent =
            "0%";

        confidenceFill.style.width =
            "0%";

        debugTip.textContent =
            "Check the terminal where your AI server is running.";

    } finally {

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


/* ==========================================
   DISPLAY RESULT
========================================== */

function displayResult(result) {

    causeElement.textContent =
        result.cause ||
        "No cause provided.";

    evidenceElement.textContent =
        result.evidence ||
        "No evidence provided.";

    solutionElement.textContent =
        result.solution ||
        "No solution provided.";

    detectedLanguage.textContent =
        result.language ||
        "Unknown";

    languageBadge.textContent =
        (
            result.language ||
            "AUTO"
        ).toUpperCase();


    const confidence =
        Number(
            result.confidence
        ) || 0;


    confidenceValue.textContent =
        `${confidence}%`;


    setTimeout(() => {

        confidenceFill.style.width =
            `${confidence}%`;

    }, 50);


    debugTip.textContent =
        result.tip ||
        "Review the suggested fix carefully.";
}


/* ==========================================
   CLEAR
========================================== */

function clearDebugger() {

    expectedInput.value = "";

    actualInput.value = "";

    codeInput.value = "";


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


    languageBadge.textContent =
        "AUTO";


    confidenceFill.style.width =
        "0%";


    expectedInput.focus();
}


/* ==========================================
   LOAD EXAMPLE
========================================== */

function loadExample() {

    expectedInput.value =
        exampleProblem.expected;

    actualInput.value =
        exampleProblem.actual;

    codeInput.value =
        exampleProblem.code;


    expectedInput.focus();


    setTimeout(
        investigate,
        150
    );
}


/* ==========================================
   COPY FIX
========================================== */

async function copyFix() {

    const text =
        solutionElement.textContent.trim();


    if (!text) {
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
