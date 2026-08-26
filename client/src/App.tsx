import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import FurrioAuthGateway from "./components/FurrioAuthGateway";
import { ThemeProvider } from "./contexts/ThemeContext";
import FurrioApp from "./pages/FurrioApp";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <FurrioApp />
          <FurrioAuthGateway />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
