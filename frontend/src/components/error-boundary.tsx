"use client";

import React from "react";
import { Button } from "@/components/ui/button";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

/**
 * Catches render errors in client subtrees and shows a recoverable fallback.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.message ?? "An unexpected error occurred."}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => this.setState({ hasError: false, message: undefined })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
