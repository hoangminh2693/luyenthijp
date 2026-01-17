import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/layout/Header';

/**
 * BlogPage - Trang blog chia sẻ kinh nghiệm
 * Chuẩn SEO, nội dung chất lượng cho AdSense
 */
const BlogPage = () => {
  // Sample blog posts - có thể chuyển sang database sau
  const blogPosts = [
    {
      id: 1,
      slug: 'huong-dan-on-thi-jlpt-n3',
      title: 'Hướng dẫn ôn thi JLPT N3 hiệu quả trong 3 tháng',
      excerpt: 'Chia sẻ kinh nghiệm và phương pháp ôn thi JLPT N3 từ người đã đậu với điểm cao. Bao gồm lịch học, tài liệu và mẹo làm bài.',
      author: 'Minhbaohiemjp',
      date: '15/01/2025',
      readTime: '8 phút đọc',
      category: 'JLPT',
      image: null,
    },
    {
      id: 2,
      slug: 'sai-lam-thuong-gap-khi-thi-jlpt',
      title: '5 sai lầm thường gặp khi thi JLPT và cách khắc phục',
      excerpt: 'Tổng hợp những sai lầm phổ biến mà thí sinh Việt Nam hay mắc phải khi thi JLPT, cùng với giải pháp để tránh mắc lỗi.',
      author: 'Minhbaohiemjp',
      date: '10/01/2025',
      readTime: '6 phút đọc',
      category: 'Mẹo thi',
      image: null,
    },
    {
      id: 3,
      slug: 'takken-chung-chi-bat-dong-san',
      title: '宅建 là gì? Tại sao người Việt nên thi chứng chỉ này?',
      excerpt: 'Giới thiệu về kỳ thi 宅建 (Takken) - chứng chỉ bất động sản tại Nhật, cơ hội việc làm và mức lương hấp dẫn dành cho người Việt.',
      author: 'Minhbaohiemjp',
      date: '05/01/2025',
      readTime: '10 phút đọc',
      category: '宅建',
      image: null,
    },
    {
      id: 4,
      slug: 'kinh-nghiem-song-tai-nhat',
      title: 'Kinh nghiệm sống và làm việc tại Nhật cho người mới',
      excerpt: 'Chia sẻ những kinh nghiệm thực tế về cuộc sống, công việc và hòa nhập văn hóa tại Nhật Bản cho người Việt mới sang.',
      author: 'Minhbaohiemjp',
      date: '01/01/2025',
      readTime: '12 phút đọc',
      category: 'Cuộc sống',
      image: null,
    },
  ];

  const categories = ['Tất cả', 'JLPT', 'BJT', '宅建', 'Mẹo thi', 'Cuộc sống'];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb items={[{ label: 'Blog' }]} />
        </div>

        {/* Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Blog Chia Sẻ Kinh Nghiệm
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Những bài viết hữu ích về kinh nghiệm ôn thi, phương pháp học tập hiệu quả 
            và cuộc sống tại Nhật Bản dành cho cộng đồng người Việt.
          </p>
        </div>

        {/* Categories */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <Button
              key={category}
              variant={category === 'Tất cả' ? 'default' : 'outline'}
              size="sm"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md"
            >
              {/* Placeholder image */}
              <div className="aspect-video bg-muted flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
              </div>

              <div className="p-6">
                {/* Category badge */}
                <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded mb-3">
                  {post.category}
                </span>

                {/* Title */}
                <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {post.excerpt}
                </p>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </div>

                {/* Read more link */}
                <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Đọc tiếp
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Coming soon note */}
        <div className="mt-12 text-center">
          <div className="rounded-xl bg-muted/30 border border-border p-8 max-w-xl mx-auto">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Sắp có thêm bài viết mới!
            </h3>
            <p className="text-muted-foreground">
              Chúng tôi đang chuẩn bị thêm nhiều bài viết hữu ích về kinh nghiệm ôn thi 
              và cuộc sống tại Nhật. Hãy quay lại thường xuyên nhé!
            </p>
          </div>
        </div>

        {/* Ad placeholder */}
        {/* This space is reserved for future ad placement */}
        <div className="mt-12">
          {/* Ad slot placeholder - do not remove */}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
