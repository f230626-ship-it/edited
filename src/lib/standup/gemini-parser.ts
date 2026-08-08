import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export interface ParsedStandup {
  completed: string[];
  blockers: string[];
  in_progress: string[];
  summary: string;
  score: number;
}

const PARSE_PROMPT = `You are a standup note parser. Analyze the standup message and return ONLY a valid JSON object (no markdown, no explanation).

JSON structure:
{"completed":["task"],"blockers":["blocker"],"in_progress":["task"],"summary":"short summary","score":75}

Rules:
- "completed": list of tasks the person finished. If none, use [].
- "blockers": list of things blocking progress. If the person says "None" or has no blockers, use [].
- "in_progress": list of tasks currently being worked on or planned.
- "summary": one sentence summarizing the standup.
- "score": 0-100. Each completed task +15, each in-progress +10, each real blocker -10, well-structured +10. Empty/nonsensical = 0.

Return ONLY the JSON object, nothing else.`;

export async function parseStandup(rawText: string): Promise<ParsedStandup> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: PARSE_PROMPT + "\n\nStandup message:\n" + rawText,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 500,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        completed: [],
        blockers: [],
        in_progress: [],
        summary: rawText.slice(0, 100),
        score: 10,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter((t: string) => t && t.toLowerCase() !== "none")
      : [];
    const blockers = Array.isArray(parsed.blockers)
      ? parsed.blockers.filter((b: string) => b && b.toLowerCase() !== "none")
      : [];
    const in_progress = Array.isArray(parsed.in_progress)
      ? parsed.in_progress.filter((t: string) => t && t.toLowerCase() !== "none")
      : [];

    return {
      completed,
      blockers,
      in_progress,
      summary: typeof parsed.summary === "string" && parsed.summary ? parsed.summary : rawText.slice(0, 100),
      score: typeof parsed.score === "number" && parsed.score > 0 ? Math.min(100, parsed.score) : Math.min(100, completed.length * 15 + in_progress.length * 10 - blockers.length * 10 + 10),
    };
  } catch (err) {
    console.error("[Standup parser] Groq error:", err);
    return {
      completed: [],
      blockers: [],
      in_progress: [],
      summary: rawText.slice(0, 100),
      score: 10,
    };
  }
}
