import React from "react";

type ScreenErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKey?: string;
};

type ScreenErrorBoundaryState = {
  failed: boolean;
};

export class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = {
    failed: false
  };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps: ScreenErrorBoundaryProps) {
    if (
      this.state.failed &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error: unknown) {
    console.error("Screen render failed", error);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
