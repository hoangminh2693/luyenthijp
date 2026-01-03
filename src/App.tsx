import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Index from "./pages/Index";
import SubjectsPage from "./pages/SubjectsPage";
import ExamsPage from "./pages/ExamsPage";
import QuizPage from "./pages/QuizPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * App Component - Component gốc của ứng dụng
 * Quản lý routing và layout chung
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              {/* Trang chủ */}
              <Route path="/" element={<Index />} />
              
              {/* Danh sách môn học */}
              <Route path="/subjects" element={<SubjectsPage />} />
              
              {/* Danh sách đề thi theo môn */}
              <Route path="/subjects/:subjectSlug" element={<ExamsPage />} />
              
              {/* Trang làm bài thi */}
              <Route path="/exam/:examId" element={<QuizPage />} />
              
              {/* Trang 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
