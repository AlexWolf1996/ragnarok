'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // In production, you would send this to an error tracking service like Sentry
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f87171]/10 mb-6">
              <AlertTriangle size={32} className="text-[#f87171]" />
            </div>

            <h2 className="font-mono text-xl tracking-[0.1em] text-[#e8e8e8] mb-4">
              SOMETHING WENT WRONG
            </h2>

            <p className="text-sm text-[#666670] mb-6">
              An unexpected error occurred. Please try again or refresh the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-[#111118] border border-[#f87171]/30 rounded-lg text-left overflow-auto">
                <p className="font-mono text-xs text-[#f87171] break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 border border-[#333340] text-[#e8e8e8] font-mono text-sm tracking-[0.15em] transition-all hover:border-[#e8e8e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843]"
            >
              <RefreshCw size={14} />
              TRY AGAIN
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
