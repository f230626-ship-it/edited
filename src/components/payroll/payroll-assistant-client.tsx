"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { askPayrollAssistant } from "@/actions/payroll-assistant";

const SUGGESTIONS = [
  "Show payroll summary",
  "Who earned the highest commission?",
  "Show all employee salaries",
  "Any payroll anomalies?",
  "Compare recent periods",
  "Project commissions breakdown",
];

export function PayrollAssistantClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(q?: string) {
    const query = q || question;
    if (!query.trim()) return;
    setQuestion(query);
    start(async () => {
      const res = await askPayrollAssistant(query);
      setAnswer(res.answer);
    });
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll AI Assistant</CardTitle>
          <p className="text-xs text-muted-foreground">
            Ask questions about payroll data. Uses real data from your system.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            ref={inputRef}
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder='e.g. "What is the total payroll for August?" or "Show commissions by project"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              disabled={pending || !question.trim()}
              onClick={() => handleSubmit()}
            >
              {pending ? "Thinking…" : "Ask"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={pending}
            onClick={() => {
              setQuestion(s);
              handleSubmit(s);
            }}
          >
            {s}
          </Button>
        ))}
      </div>

      {pending && !answer && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Fetching payroll data…
          </CardContent>
        </Card>
      )}

      {answer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
