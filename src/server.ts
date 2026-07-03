import "dotenv/config";

import express from "express";
import cors from "cors";

import {
    runFast
} from "./fastRunExecutor.js";

import {
    submitFast
} from "./fastSubmitExecutor.js";

import {
    executeCode
} from "./executor.js";

import type {
    RunCodeRequest
} from "./core/types.js";


const app =
    express();

app.use(
    cors()
);

app.use(
    express.json({
        limit: "200kb"
    })
);

app.post("/submit", async (req, res) => {
    try {
        const secret = req.header("X-Runner-Secret");

        if (secret !== process.env.RUNNER_SECRET) {
            return res.status(401).json({
                totalTests: 0,
                passedTests: 0,
                allPassed: false,
                results: []
            });
        }

        const result = await submitFast(
            req.body.language,
            req.body.code,
            req.body.executionConfig,
            req.body.testCases
        );

        return res.json(result);

    } catch (error: any) {
        console.error("SUBMIT FAILED REAL ERROR =", error);
        console.error("MESSAGE =", error?.message);
        console.error("STACK =", error?.stack);

    return res.status(500).json({
        totalTests: req.body.testCases?.length || 0,
        passedTests: 0,
        allPassed: false,
        results: [
            {
                testCaseNumber: 1,
                input: req.body.testCases?.[0]?.input || "",
                expectedOutput: req.body.testCases?.[0]?.expectedOutput || "",
                actualOutput: "",
                passed: false,
                error: error?.message || "Runner internal error",
                status: "EXECUTION_FAILED",
                executionTimeMs: 0
            }
        ]
    });

    }
});

app.post(
    "/run",
    async (req, res) => {

        try {
            const secret =
                req.header("X-Runner-Secret");

            if (secret !== process.env.RUNNER_SECRET) {
                return res.status(401).json({
                    success: false,
                    input: "",
                    output: "",
                    error: "Unauthorized",
                    status: "UNAUTHORIZED"
                });
            }

            const result =
                await runFast(
                    req.body.language,
                    req.body.code,
                    req.body.executionConfig,
                    req.body.input || ""
                );

            return res.json(result);

        } catch (error: any) {

            console.error("RUN FAILED =", error);

            return res.status(500).json({
                success: false,
                input: req.body.input || "",
                output: "",
                error: error.message || "Run failed",
                status: "EXECUTION_FAILED"
            });
        }
    }
);

app.listen(
    Number(process.env.PORT || 9090),
    () => {
        console.log(
            `Code runner running on port ${process.env.PORT || 9090}`
        );
    }
);