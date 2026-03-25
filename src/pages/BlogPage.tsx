import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Clock, BookOpen, Tag, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/layout/Header';
import { usePublishedPosts } from '@/hooks/useBlogPosts';
import { useAuth } from '@/contexts/AuthContext';
import { useSEO, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';

const VISIBLE_TAGS = 5;

const BlogPage = () => {
  useSEO({
    title: 'Blog chia sẻ kinh nghiệm ôn thi tại Nhật | Luyện Đề Thi',
    description: 'Những bài viết hữu ích về kinh nghiệm ôn thi JLPT, phương pháp học tập hiệu quả và cuộc sống tại Nhật Bản dành cho cộng đồng người Việt.',
    jsonLd: buildBreadcrumbSchema([
      { name: 'Trang chủ', url: SITE_URL },
      { name: 'Blog' },
    ]),
  });

  const { isAdmin } = useAuth();
  const { data: posts, isLoading } = usePublishedPosts();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 10;

  // Collect all unique tags
  const allTags = Array.from(new Set((posts || []).flatMap(p => p.tags || [])));

  const filteredPosts = useMemo(() => {
    return activeTag
      ? (posts || []).filter(p => p.tags?.includes(activeTag))
      : (posts || []);
  }, [posts, activeTag]);

  // Reset page when filter changes
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage, POSTS_PER_PAGE]);

  const handleTagChange = (tag: string | null) => {
    setActiveTag(tag);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const estimateReadTime = (content: string) => {
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} phút đọc`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <Breadcrumb items={[{ label: 'Blog' }]} />
          {isAdmin && (
            <Link to="/manage-blog">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" /> Quản lý bài viết
              </Button>
            </Link>
          )}
        </div>

        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Blog chia sẻ kinh nghiệm ôn thi tại Nhật
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Những bài viết hữu ích về kinh nghiệm ôn thi, phương pháp học tập hiệu quả
            và cuộc sống tại Nhật Bản dành cho cộng đồng người Việt.
          </p>
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            <Button
              variant={activeTag === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTagChange(null)}
            >
              Tất cả
            </Button>
            {(showAllTags ? allTags : allTags.slice(0, VISIBLE_TAGS)).map(tag => (
              <Button
                key={tag}
                variant={activeTag === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </Button>
            ))}
            {allTags.length > VISIBLE_TAGS && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTags(!showAllTags)}
                className="text-muted-foreground"
              >
                {showAllTags ? 'Thu gọn' : `+${allTags.length - VISIBLE_TAGS} khác`}
              </Button>
            )}
          </div>
        )}

        {/* Blog Posts Grid */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Đang tải bài viết...</p>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Chưa có bài viết nào.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map(post => (
              <article
                key={post.id}
                className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md"
              >
                <Link to={`/blog/${post.slug}`} className="block overflow-hidden">
                  {post.thumbnail_url ? (
                    <img src={post.thumbnail_url} alt={`Ảnh bìa bài viết: ${post.title}`} loading="lazy" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center transition-colors duration-300 group-hover:bg-muted/70">
                      <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </Link>

                <div className="p-6">
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link to={`/blog/${post.slug}`}>
                    <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                  </Link>

                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.published_at).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {estimateReadTime(post.content)}
                    </span>
                  </div>

                  <Link to={`/blog/${post.slug}`} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Đọc tiếp <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
