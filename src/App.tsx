import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Index from "./pages/Index";
import SubjectsPage from "./pages/SubjectsPage";
import LevelsPage from "./pages/LevelsPage";
import SectionsPage from "./pages/SectionsPage";
import ExamsPage from "./pages/ExamsPage";
import QuizPage from "./pages/QuizPage";
import StartQuizPage from "./pages/StartQuizPage";
import ImportQuestionsPage from "./pages/ImportQuestionsPage";
import ManageQuestionsPage from "./pages/ManageQuestionsPage";
import ManageSubjectsPage from "./pages/ManageSubjectsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import StatisticsPage from "./pages/StatisticsPage";
import AuthPage from "./pages/AuthPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import BlogPage from "./pages/BlogPage";
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
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                {/* Trang chủ */}
                <Route path="/" element={<Index />} />
                
                {/* Auth */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Danh sách môn học */}
                <Route path="/subjects" element={<SubjectsPage />} />
                
                {/* Quản lý môn học (Admin) */}
                <Route path="/manage-subjects" element={<ManageSubjectsPage />} />
                
                {/* Bảng xếp hạng */}
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                
                {/* Thống kê học tập */}
                <Route path="/statistics" element={<StatisticsPage />} />
                
                {/* Danh sách cấp độ theo môn */}
                <Route path="/subjects/:subjectSlug" element={<LevelsPage />} />
                
                {/* Danh sách phần theo cấp độ */}
                <Route path="/subjects/:subjectSlug/:levelSlug" element={<SectionsPage />} />
                
                {/* Danh sách đề thi theo phần */}
                <Route path="/subjects/:subjectSlug/:levelSlug/:sectionSlug" element={<ExamsPage />} />
                
                {/* Trang cấu hình trước khi làm bài */}
                <Route path="/start/:subjectSlug/:levelSlug/:sectionSlug" element={<StartQuizPage />} />
                
                {/* Trang làm bài thi mới (random questions) */}
                <Route path="/quiz/:subjectSlug/:levelSlug/:sectionSlug" element={<QuizPage />} />
                
                {/* Trang làm bài thi cũ (theo đề) */}
                <Route path="/exam/:examId" element={<QuizPage />} />
                
                {/* Import câu hỏi */}
                <Route path="/import" element={<ImportQuestionsPage />} />
                
                {/* Quản lý câu hỏi (Admin) */}
                <Route path="/manage-questions" element={<ManageQuestionsPage />} />
                
                {/* Static pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/blog" element={<BlogPage />} />
                
                {/* Trang 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
