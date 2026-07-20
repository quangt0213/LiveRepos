import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}
interface State {
  hasError: boolean;
}

/** Per-demo error boundary: one broken demo must never white-screen the site. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label ?? "demo"}] crashed:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="sticker bg-cream p-8 text-center my-4" role="alert">
          <div className="text-4xl mb-2" aria-hidden>
            🔌💥
          </div>
          <h3 className="text-xl mb-1">This demo tripped a breaker.</h3>
          <p className="text-ink/70 mb-4">
            The rest of the site is fine — only this panel failed.
          </p>
          <button
            className="btn-cartoon bg-lang-python/40"
            onClick={() => this.setState({ hasError: false })}
          >
            Try to reload it
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
