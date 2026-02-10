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
import DynamicCategoryPage from "./pages/DynamicCategoryPage";
import ExamsPage from "./pages/ExamsPage";
import QuizPage from "./pages/QuizPage";
import StartQuizPage from "./pages/StartQuizPage";
import ImportQuestionsPage from "./pages/ImportQuestionsPage";
import ManageQuestionsPage from "./pages/ManageQuestionsPage";
import ManageSubjectsPage from "./pages/ManageSubjectsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import StatisticsPage from "./pages/StatisticsPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import ManageBlogPage from "./pages/ManageBlogPage";
import DisclaimerPage from "./pages/DisclaimerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * App Component - Component gốc của ứng dụng
 * Quản lý routing và layout chung
 * 
 * ROUTING MỚI với Layer động:
 * - /subjects/:subjectSlug/* → DynamicCategoryPage (xử lý tất cả layers)
 * - /start/:subjectSlug/*   → StartQuizPage (cấu hình trước khi làm bài)
 * - /quiz/:subjectSlug/*    → QuizPage (làm bài)
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
                <Route path="/profile" element={<ProfilePage />} />
                
                {/* Danh sách môn học */}
                <Route path="/subjects" element={<SubjectsPage />} />
                
                {/* Quản lý môn học (Admin) */}
                <Route path="/manage-subjects" element={<ManageSubjectsPage />} />
                
                {/* Bảng xếp hạng */}
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                
                {/* Thống kê học tập */}
                <Route path="/statistics" element={<StatisticsPage />} />
                
                {/* Dynamic Category Pages - xử lý tất cả layers của môn học */}
                <Route path="/subjects/:subjectSlug" element={<DynamicCategoryPage />} />
                <Route path="/subjects/:subjectSlug/*" element={<DynamicCategoryPage />} />
                
                {/* Danh sách đề thi (nếu cần - fallback) */}
                <Route path="/exams/:subjectSlug/*" element={<ExamsPage />} />
                
                {/* Trang cấu hình trước khi làm bài - wildcard để hỗ trợ nhiều layer */}
                <Route path="/start/:subjectSlug/*" element={<StartQuizPage />} />
                
                {/* Trang làm bài thi - wildcard để hỗ trợ nhiều layer */}
                <Route path="/quiz/:subjectSlug/*" element={<QuizPage />} />
                
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
                <Route path="/disclaimer" element={<DisclaimerPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/manage-blog" element={<ManageBlogPage />} />
                
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
