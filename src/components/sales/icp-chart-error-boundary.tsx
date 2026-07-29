"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

/** Prevents a single chart crash from blanking the whole ICP page. */
export class IcpChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-muted-foreground">
            Charts failed to render for this view. Filters and the log table below still work — try clearing filters or refreshing.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
