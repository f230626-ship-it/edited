"use client";

import { Card, CardContent } from "@/components/ui/card";

interface NetworkAnalyticsProps {
  invitations: any[];
}

export function NetworkAnalytics({ invitations }: NetworkAnalyticsProps) {
  const incoming = invitations.filter(i => i.direction === 'INCOMING').length;
  const outgoing = invitations.filter(i => i.direction === 'OUTGOING').length;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border">
            <div className="text-3xl font-bold">{invitations.length}</div>
            <div className="text-sm text-muted-foreground">Total Invitations</div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-3xl font-bold text-blue-600">{incoming}</div>
            <div className="text-sm text-muted-foreground">Received</div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-3xl font-bold text-purple-600">{outgoing}</div>
            <div className="text-sm text-muted-foreground">Sent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
