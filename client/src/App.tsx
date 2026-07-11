import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/kanban" component={Kanban} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/ai-settings" component={AISettings} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/automations" component={Automations} />
      <Route path="/team-management" component={TeamManagement} />
      <Route path="/whatsapp-sessions" component={WhatsAppSessions} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
