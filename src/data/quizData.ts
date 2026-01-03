/**
 * Quiz Data - Dữ liệu mẫu cho ứng dụng luyện đề thi
 * 
 * Cấu trúc dữ liệu:
 * - Subject: Môn học (id, name, slug, description, icon)
 * - Exam: Đề thi (id, subjectId, name, description, year, questionCount)
 * - Question: Câu hỏi (id, examId, content, options, correctOption)
 */

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  examCount: number;
}

export interface Exam {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  year: number;
  questionCount: number;
  duration: number; // minutes
}

export interface Question {
  id: string;
  examId: string;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
}

// =====================
// DANH SÁCH MÔN HỌC
// =====================
export const subjects: Subject[] = [
  {
    id: 'toan',
    name: 'Toán học',
    slug: 'toan',
    description: 'Các đề thi trắc nghiệm Toán từ cơ bản đến nâng cao',
    icon: '📐',
    examCount: 2,
  },
  {
    id: 'ly',
    name: 'Vật lý',
    slug: 'ly',
    description: 'Các đề thi trắc nghiệm Vật lý bao gồm lý thuyết và bài tập',
    icon: '⚡',
    examCount: 2,
  },
];

// =====================
// DANH SÁCH ĐỀ THI
// =====================
export const exams: Exam[] = [
  // Đề Toán
  {
    id: 'toan-2023',
    subjectId: 'toan',
    name: 'Đề thi Toán 2023',
    description: 'Đề thi THPT Quốc gia môn Toán năm 2023',
    year: 2023,
    questionCount: 8,
    duration: 90,
  },
  {
    id: 'toan-2022',
    subjectId: 'toan',
    name: 'Đề thi Toán 2022',
    description: 'Đề thi THPT Quốc gia môn Toán năm 2022',
    year: 2022,
    questionCount: 7,
    duration: 90,
  },
  // Đề Lý
  {
    id: 'ly-2023',
    subjectId: 'ly',
    name: 'Đề thi Vật lý 2023',
    description: 'Đề thi THPT Quốc gia môn Vật lý năm 2023',
    year: 2023,
    questionCount: 8,
    duration: 50,
  },
  {
    id: 'ly-2022',
    subjectId: 'ly',
    name: 'Đề thi Vật lý 2022',
    description: 'Đề thi THPT Quốc gia môn Vật lý năm 2022',
    year: 2022,
    questionCount: 7,
    duration: 50,
  },
];

// =====================
// NGÂN HÀNG CÂU HỎI
// =====================
export const questions: Question[] = [
  // ---- CÂU HỎI TOÁN 2023 ----
  {
    id: 'toan-2023-1',
    examId: 'toan-2023',
    content: 'Giá trị của biểu thức log₂(8) bằng:',
    options: {
      A: '2',
      B: '3',
      C: '4',
      D: '8',
    },
    correctOption: 'B',
  },
  {
    id: 'toan-2023-2',
    examId: 'toan-2023',
    content: 'Đạo hàm của hàm số y = x³ + 2x² - 5x + 1 là:',
    options: {
      A: '3x² + 4x - 5',
      B: '3x² + 2x - 5',
      C: 'x² + 4x - 5',
      D: '3x² + 4x + 5',
    },
    correctOption: 'A',
  },
  {
    id: 'toan-2023-3',
    examId: 'toan-2023',
    content: 'Phương trình 2^x = 16 có nghiệm x bằng:',
    options: {
      A: '2',
      B: '3',
      C: '4',
      D: '8',
    },
    correctOption: 'C',
  },
  {
    id: 'toan-2023-4',
    examId: 'toan-2023',
    content: 'Tích phân ∫₀¹ 2x dx bằng:',
    options: {
      A: '0',
      B: '1',
      C: '2',
      D: '4',
    },
    correctOption: 'B',
  },
  {
    id: 'toan-2023-5',
    examId: 'toan-2023',
    content: 'Cho hàm số y = x² - 4x + 3. Giá trị nhỏ nhất của hàm số là:',
    options: {
      A: '-1',
      B: '0',
      C: '1',
      D: '3',
    },
    correctOption: 'A',
  },
  {
    id: 'toan-2023-6',
    examId: 'toan-2023',
    content: 'Số phức z = 3 + 4i có môđun bằng:',
    options: {
      A: '3',
      B: '4',
      C: '5',
      D: '7',
    },
    correctOption: 'C',
  },
  {
    id: 'toan-2023-7',
    examId: 'toan-2023',
    content: 'Trong không gian Oxyz, khoảng cách từ điểm M(1, 2, 2) đến gốc tọa độ O là:',
    options: {
      A: '1',
      B: '2',
      C: '3',
      D: '5',
    },
    correctOption: 'C',
  },
  {
    id: 'toan-2023-8',
    examId: 'toan-2023',
    content: 'Cho cấp số cộng với u₁ = 3 và công sai d = 2. Giá trị của u₅ là:',
    options: {
      A: '9',
      B: '10',
      C: '11',
      D: '12',
    },
    correctOption: 'C',
  },

  // ---- CÂU HỎI TOÁN 2022 ----
  {
    id: 'toan-2022-1',
    examId: 'toan-2022',
    content: 'Giá trị của sin(π/6) bằng:',
    options: {
      A: '0',
      B: '1/2',
      C: '√2/2',
      D: '√3/2',
    },
    correctOption: 'B',
  },
  {
    id: 'toan-2022-2',
    examId: 'toan-2022',
    content: 'Phương trình x² - 5x + 6 = 0 có hai nghiệm là:',
    options: {
      A: 'x = 1 và x = 6',
      B: 'x = 2 và x = 3',
      C: 'x = -2 và x = -3',
      D: 'x = 1 và x = 5',
    },
    correctOption: 'B',
  },
  {
    id: 'toan-2022-3',
    examId: 'toan-2022',
    content: 'Cho hàm số y = ln(x). Đạo hàm của hàm số là:',
    options: {
      A: 'x',
      B: '1/x',
      C: 'ln(x)',
      D: 'e^x',
    },
    correctOption: 'B',
  },
  {
    id: 'toan-2022-4',
    examId: 'toan-2022',
    content: 'Trong mặt phẳng Oxy, đường thẳng y = 2x + 1 có hệ số góc là:',
    options: {
      A: '1',
      B: '2',
      C: '-1',
      D: '1/2',
    },
    correctOption: 'B',
  },
  {
    id: 'toan-2022-5',
    examId: 'toan-2022',
    content: 'Thể tích hình cầu có bán kính R = 3 là:',
    options: {
      A: '36π',
      B: '27π',
      C: '108π',
      D: '12π',
    },
    correctOption: 'A',
  },
  {
    id: 'toan-2022-6',
    examId: 'toan-2022',
    content: 'Cho ma trận A = [[1, 2], [3, 4]]. Giá trị định thức det(A) là:',
    options: {
      A: '-2',
      B: '2',
      C: '-5',
      D: '5',
    },
    correctOption: 'A',
  },
  {
    id: 'toan-2022-7',
    examId: 'toan-2022',
    content: 'Giới hạn lim(x→0) sin(x)/x bằng:',
    options: {
      A: '0',
      B: '1',
      C: '∞',
      D: 'Không tồn tại',
    },
    correctOption: 'B',
  },

  // ---- CÂU HỎI VẬT LÝ 2023 ----
  {
    id: 'ly-2023-1',
    examId: 'ly-2023',
    content: 'Đơn vị đo cường độ dòng điện trong hệ SI là:',
    options: {
      A: 'Volt (V)',
      B: 'Ohm (Ω)',
      C: 'Ampe (A)',
      D: 'Watt (W)',
    },
    correctOption: 'C',
  },
  {
    id: 'ly-2023-2',
    examId: 'ly-2023',
    content: 'Công thức tính động năng của một vật là:',
    options: {
      A: 'Wđ = mgh',
      B: 'Wđ = ½mv²',
      C: 'Wđ = Fs',
      D: 'Wđ = Pt',
    },
    correctOption: 'B',
  },
  {
    id: 'ly-2023-3',
    examId: 'ly-2023',
    content: 'Ánh sáng có bước sóng λ = 600nm thuộc vùng ánh sáng màu:',
    options: {
      A: 'Đỏ',
      B: 'Vàng',
      C: 'Xanh lá',
      D: 'Tím',
    },
    correctOption: 'A',
  },
  {
    id: 'ly-2023-4',
    examId: 'ly-2023',
    content: 'Theo định luật II Newton, gia tốc của một vật tỉ lệ thuận với:',
    options: {
      A: 'Khối lượng của vật',
      B: 'Vận tốc của vật',
      C: 'Lực tác dụng lên vật',
      D: 'Thời gian chuyển động',
    },
    correctOption: 'C',
  },
  {
    id: 'ly-2023-5',
    examId: 'ly-2023',
    content: 'Chu kỳ dao động của con lắc đơn phụ thuộc vào:',
    options: {
      A: 'Khối lượng quả nặng',
      B: 'Biên độ dao động',
      C: 'Chiều dài dây treo',
      D: 'Năng lượng dao động',
    },
    correctOption: 'C',
  },
  {
    id: 'ly-2023-6',
    examId: 'ly-2023',
    content: 'Hiện tượng cảm ứng điện từ được phát hiện bởi nhà khoa học nào?',
    options: {
      A: 'Newton',
      B: 'Einstein',
      C: 'Faraday',
      D: 'Tesla',
    },
    correctOption: 'C',
  },
  {
    id: 'ly-2023-7',
    examId: 'ly-2023',
    content: 'Trong mạch điện, điện trở mắc nối tiếp có tổng trở bằng:',
    options: {
      A: 'Tổng nghịch đảo các điện trở',
      B: 'Tổng các điện trở',
      C: 'Tích các điện trở',
      D: 'Trung bình cộng các điện trở',
    },
    correctOption: 'B',
  },
  {
    id: 'ly-2023-8',
    examId: 'ly-2023',
    content: 'Vận tốc ánh sáng trong chân không xấp xỉ bằng:',
    options: {
      A: '300.000 m/s',
      B: '3.000.000 m/s',
      C: '300.000.000 m/s',
      D: '3.000.000.000 m/s',
    },
    correctOption: 'C',
  },

  // ---- CÂU HỎI VẬT LÝ 2022 ----
  {
    id: 'ly-2022-1',
    examId: 'ly-2022',
    content: 'Đơn vị đo điện áp trong hệ SI là:',
    options: {
      A: 'Ampe (A)',
      B: 'Volt (V)',
      C: 'Ohm (Ω)',
      D: 'Farad (F)',
    },
    correctOption: 'B',
  },
  {
    id: 'ly-2022-2',
    examId: 'ly-2022',
    content: 'Công thức tính thế năng trọng trường là:',
    options: {
      A: 'Wt = ½mv²',
      B: 'Wt = mgh',
      C: 'Wt = ½kx²',
      D: 'Wt = Fs',
    },
    correctOption: 'B',
  },
  {
    id: 'ly-2022-3',
    examId: 'ly-2022',
    content: 'Định luật bảo toàn động lượng áp dụng cho hệ:',
    options: {
      A: 'Có ngoại lực tác dụng',
      B: 'Kín (cô lập)',
      C: 'Có ma sát',
      D: 'Bất kỳ',
    },
    correctOption: 'B',
  },
  {
    id: 'ly-2022-4',
    examId: 'ly-2022',
    content: 'Tần số của sóng điện từ trong chân không phụ thuộc vào:',
    options: {
      A: 'Bước sóng',
      B: 'Nguồn phát',
      C: 'Môi trường truyền',
      D: 'Vận tốc ánh sáng',
    },
    correctOption: 'B',
  },
  {
    id: 'ly-2022-5',
    examId: 'ly-2022',
    content: 'Hiện tượng phản xạ toàn phần xảy ra khi ánh sáng truyền từ môi trường:',
    options: {
      A: 'Chiết quang hơn sang môi trường kém chiết quang hơn',
      B: 'Kém chiết quang hơn sang môi trường chiết quang hơn',
      C: 'Chân không sang nước',
      D: 'Không khí sang thủy tinh',
    },
    correctOption: 'A',
  },
  {
    id: 'ly-2022-6',
    examId: 'ly-2022',
    content: 'Công suất điện được tính bằng công thức:',
    options: {
      A: 'P = U/I',
      B: 'P = I²R',
      C: 'P = R/I²',
      D: 'P = U/R',
    },
    correctOption: 'B',
  },
  {
    id: 'ly-2022-7',
    examId: 'ly-2022',
    content: 'Trong hiện tượng giao thoa ánh sáng, vân sáng xuất hiện khi hiệu đường đi bằng:',
    options: {
      A: 'Số lẻ lần nửa bước sóng',
      B: 'Số nguyên lần bước sóng',
      C: 'Số lẻ lần bước sóng',
      D: 'Không phụ thuộc hiệu đường đi',
    },
    correctOption: 'B',
  },
];

// =====================
// HÀM TIỆN ÍCH
// =====================

/**
 * Lấy danh sách đề thi theo môn học
 */
export function getExamsBySubject(subjectId: string): Exam[] {
  return exams.filter((exam) => exam.subjectId === subjectId);
}

/**
 * Lấy danh sách câu hỏi theo đề thi
 */
export function getQuestionsByExam(examId: string): Question[] {
  return questions.filter((q) => q.examId === examId);
}

/**
 * Lấy thông tin môn học theo slug
 */
export function getSubjectBySlug(slug: string): Subject | undefined {
  return subjects.find((s) => s.slug === slug);
}

/**
 * Lấy thông tin đề thi theo id
 */
export function getExamById(examId: string): Exam | undefined {
  return exams.find((e) => e.id === examId);
}

/**
 * Tính điểm bài thi
 */
export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
  percentage: number;
  details: {
    questionId: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

export function calculateResult(
  examId: string,
  userAnswers: Record<string, string>
): QuizResult {
  const examQuestions = getQuestionsByExam(examId);
  const details = examQuestions.map((q) => ({
    questionId: q.id,
    userAnswer: userAnswers[q.id] || null,
    correctAnswer: q.correctOption,
    isCorrect: userAnswers[q.id] === q.correctOption,
  }));

  const correctAnswers = details.filter((d) => d.isCorrect).length;
  const totalQuestions = examQuestions.length;

  return {
    totalQuestions,
    correctAnswers,
    wrongAnswers: totalQuestions - correctAnswers,
    score: correctAnswers,
    percentage: Math.round((correctAnswers / totalQuestions) * 100),
    details,
  };
}
