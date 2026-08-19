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

  const grounded = await answerPayrollQuestion(trimmed);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { answer: grounded };
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are a payroll assistant for MindVista HRMS. You have access to real payroll data retrieved from the database. 

RULES:
- Only explain and rephrase the TOOL_DATA provided. Never invent amounts, names, or numbers.
- Never approve payroll, send emails, change salaries, or mutate any data.
- If data is missing or incomplete, say so clearly.
- Be concise and professional. Use bullet points when listing multiple items.
- You can do calculations on the data provided (e.g., totals, percentages, comparisons).
- If the user asks about something outside payroll, politely redirect them to the relevant HR module.
- Format responses nicely with clear structure.`,
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
