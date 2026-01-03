import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Index from "./pages/Index";
import SubjectsPage from "./pages/SubjectsPage";
import LevelsPage from "./pages/LevelsPage";
import SectionsPage from "./pages/SectionsPage";
import ExamsPage from "./pages/ExamsPage";
import QuizPage from "./pages/QuizPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * App Component - Component gốc của ứng dụng
 * Quản lý routing và layout chung
 * 
 * Cấu trúc navigation:
 * - / : Trang chủ
 * - /subjects : Danh sách môn học
 * - /subjects/:subjectSlug : Danh sách cấp độ của môn
 * - /subjects/:subjectSlug/:levelSlug : Danh sách phần của cấp độ
 * - /subjects/:subjectSlug/:levelSlug/:sectionSlug : Danh sách đề thi của phần
 * - /exam/:examId : Trang làm bài thi
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
              
              {/* Danh sách cấp độ theo môn */}
              <Route path="/subjects/:subjectSlug" element={<LevelsPage />} />
              
              {/* Danh sách phần theo cấp độ */}
              <Route path="/subjects/:subjectSlug/:levelSlug" element={<SectionsPage />} />
              
              {/* Danh sách đề thi theo phần */}
              <Route path="/subjects/:subjectSlug/:levelSlug/:sectionSlug" element={<ExamsPage />} />
              
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
