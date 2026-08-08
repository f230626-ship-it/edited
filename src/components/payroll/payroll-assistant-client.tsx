"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { askPayrollAssistant } from "@/actions/payroll-assistant";

export function PayrollAssistantClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payroll AI assistant</CardTitle>
        <p className="text-xs text-muted-foreground">
          Explains stored payroll data only. Cannot approve payroll, change salaries, or send emails.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder='e.g. "Are there any payroll anomalies?" or "Show payroll summary"'
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          disabled={pending || !question.trim()}
          onClick={() =>
            start(async () => {
              const res = await askPayrollAssistant(question);
              setAnswer(res.answer);
            })
          }
        >
          Ask
        </Button>
        {answer && (
          <pre className="whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
            {answer}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
