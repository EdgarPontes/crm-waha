import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Kanban from "./pages/Kanban";
import Conversations from "./pages/Conversations";
import AISettings from "./pages/AISettings";
import KnowledgeBase from "./pages/KnowledgeBase";
import Automations from "./pages/Automations";
import TeamManagement from "./pages/TeamManagement";
import WhatsAppSessions from "./pages/WhatsAppSessions";
import Contacts from "./pages/Contacts";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./_core/hooks/useAuth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route
        path="/login"
        component={() => (
          <PublicRoute>
            <Login />
          </PublicRoute>
        )}
      />
      <Route
        path="/register"
        component={() => (
          <PublicRoute>
            <Register />
          </PublicRoute>
        )}
      />

      <Route
        path="/"
        component={() => (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/dashboard"
        component={() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/kanban"
        component={() => (
          <ProtectedRoute>
            <Kanban />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/conversations"
        component={() => (
          <ProtectedRoute>
            <Conversations />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/ai-settings"
        component={() => (
          <ProtectedRoute>
            <AISettings />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/knowledge-base"
        component={() => (
          <ProtectedRoute>
            <KnowledgeBase />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/automations"
        component={() => (
          <ProtectedRoute>
            <Automations />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/team-management"
        component={() => (
          <ProtectedRoute>
            <TeamManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/whatsapp-sessions"
        component={() => (
          <ProtectedRoute>
            <WhatsAppSessions />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/contacts"
        component={() => (
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        )}
      />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <Toaster />
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;