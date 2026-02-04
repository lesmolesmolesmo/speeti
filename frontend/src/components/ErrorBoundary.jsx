import { Component } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console
    console.error("React Error:", error, errorInfo);
    
    // Send to backend for tracking
    try {
      fetch("/api/errors/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message || String(error),
          stack: error?.stack || "",
          componentStack: errorInfo?.componentStack || "",
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {}); // Silent fail
    } catch (e) {
      // Silent fail
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Etwas ist schiefgelaufen</h2>
            <p className="text-gray-600 mb-6">Ein Fehler ist aufgetreten. Wir wurden automatisch benachrichtigt und kümmern uns darum!</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors"
            >
              <RefreshCw size={20} />
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
