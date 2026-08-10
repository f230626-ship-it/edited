import Groq from "groq-sdk";

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

function fallbackParse(rawText: string): ParsedStandup {
  const completed: string[] = [];
  const blockers: string[] = [];
  const in_progress: string[] = [];

  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  let currentSection: "completed" | "blockers" | "in_progress" | null = null;

  for (const line of lines) {
    const cleanLine = line.replace(/^[-*•\s]+/, "").trim();
    const lowerLine = line.toLowerCase();

    // Heuristics for single-line structures (e.g., "- Completed: task 1, task 2")
    if (/^[-*•]?\s*(completed|done|finished):/i.test(line)) {
      const content = cleanLine.replace(/^(completed|done|finished):/i, "").trim();
      if (content && content.toLowerCase() !== "none" && content.toLowerCase() !== "none." && content.toLowerCase() !== "none today") {
        completed.push(...content.split(/[,;]/).map(s => s.trim()).filter(Boolean));
      }
      currentSection = "completed";
      continue;
    }

    if (/^[-*•]?\s*(blocker|blocked|issue|blockers):/i.test(line)) {
      const content = cleanLine.replace(/^(blocker|blocked|issue|blockers):/i, "").trim();
      if (content && content.toLowerCase() !== "none" && content.toLowerCase() !== "none." && content.toLowerCase() !== "none today") {
        blockers.push(...content.split(/[,;]/).map(s => s.trim()).filter(Boolean));
      }
      currentSection = "blockers";
      continue;
    }

    if (/^[-*•]?\s*(in_progress|in-progress|working|progress|planned|working on):/i.test(line)) {
      const content = cleanLine.replace(/^(in_progress|in-progress|working|progress|planned|working on):/i, "").trim();
      if (content && content.toLowerCase() !== "none" && content.toLowerCase() !== "none." && content.toLowerCase() !== "none today") {
        in_progress.push(...content.split(/[,;]/).map(s => s.trim()).filter(Boolean));
      }
      currentSection = "in_progress";
      continue;
    }

    // Heuristics for multi-line block sections
    if (lowerLine.startsWith("completed") || lowerLine.startsWith("done") || lowerLine.startsWith("finished")) {
      currentSection = "completed";
      continue;
    } else if (lowerLine.startsWith("blocker") || lowerLine.startsWith("blocked") || lowerLine.startsWith("issue")) {
      currentSection = "blockers";
      continue;
    } else if (lowerLine.startsWith("currently working") || lowerLine.startsWith("in progress") || lowerLine.startsWith("planned") || lowerLine.startsWith("working on")) {
      currentSection = "in_progress";
      continue;
    }

    // Bullet point under a section header
    if (line.startsWith("-") || line.startsWith("*") || line.startsWith("•")) {
      if (cleanLine && cleanLine.toLowerCase() !== "none" && cleanLine.toLowerCase() !== "none." && cleanLine.toLowerCase() !== "none today") {
        if (currentSection === "completed") completed.push(cleanLine);
        else if (currentSection === "blockers") blockers.push(cleanLine);
        else if (currentSection === "in_progress") in_progress.push(cleanLine);
      }
    }
  }

  // Calculate score
  const computedScore = completed.length * 15 + in_progress.length * 10 - blockers.length * 10 + 10;
  const score = Math.min(100, Math.max(0, computedScore === 10 ? 10 : computedScore));

  return {
    completed,
    blockers,
    in_progress,
    summary: rawText.split("\n").find(l => l.trim().length > 10)?.trim() || rawText.slice(0, 100),
    score,
  };
}

export async function parseStandup(rawText: string): Promise<ParsedStandup> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[Standup parser] GROQ_API_KEY not set — using fallback parse");
    return fallbackParse(rawText);
  }

  try {
    const groq = new Groq({ apiKey });
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
    if (!jsonMatch) return fallbackParse(rawText);

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

    const computed =
      completed.length * 15 + in_progress.length * 10 - blockers.length * 10 + 10;

    return {
      completed,
      blockers,
      in_progress,
      summary:
        typeof parsed.summary === "string" && parsed.summary
          ? parsed.summary
          : rawText.slice(0, 100),
      score:
        typeof parsed.score === "number" && parsed.score > 0
          ? Math.min(100, parsed.score)
          : Math.min(100, Math.max(0, computed)),
    };
  } catch (err) {
    console.error("[Standup parser] Groq error:", err);
    return fallbackParse(rawText);
  }
}
