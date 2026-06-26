import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  declare props: { children: React.ReactNode };

  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unknown render error',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App render crash', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-sc-bg flex items-center justify-center p-6">
          <div className="modal-panel max-w-2xl w-full rounded-[2rem] p-8 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={24} />
              <h1 className="text-2xl font-semibold font-serif">The app hit a render error</h1>
            </div>
            <p className="mt-4 text-sm text-sc-text-muted leading-relaxed">
              ScriptCraft crashed while rendering the interface. The error message is shown below so we can fix it quickly.
            </p>
            <pre className="mt-6 rounded-[1.25rem] border border-sc-border-subtle bg-sc-accent-soft/20 p-4 text-sm text-sc-text whitespace-pre-wrap break-words">
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
