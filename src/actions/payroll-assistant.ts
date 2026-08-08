"use server";

import { requirePayrollAccess } from "@/lib/payroll/auth";
import { answerPayrollQuestion } from "@/lib/payroll/ai-tools";

/**
 * Payroll AI assistant — read-only explanations via controlled tools.
 * Does not approve, send, or mutate financial data.
 */
export async function askPayrollAssistant(question: string): Promise<{ answer: string }> {
  await requirePayrollAccess();
  const trimmed = (question || "").trim();
  if (!trimmed) return { answer: "Ask a payroll question." };

  // Optional OpenAI enrichment when key is present — still grounded by tool answer first
  const grounded = await answerPayrollQuestion(trimmed);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { answer: grounded };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PAYROLL_MODEL || "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a payroll explanation assistant for MindVista HRMS. You MUST only rephrase the provided TOOL_DATA. Never invent amounts. Never approve payroll or send emails. If data is missing, say so.",
          },
          {
            role: "user",
            content: `Question: ${trimmed}\n\nTOOL_DATA:\n${grounded}`,
          },
        ],
      }),
    });
    if (!res.ok) return { answer: grounded };
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    return { answer: text || grounded };
  } catch {
    return { answer: grounded };
  }
}
