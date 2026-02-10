import { useParams, Link } from 'react-router-dom';
import { usePostBySlug } from '@/hooks/useBlogPosts';
import { Breadcrumb } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowLeft, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeRichText } from '@/lib/richText';

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = usePostBySlug(slug);

  // Update document title for SEO
  if (post) {
    document.title = post.meta_title || post.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.meta_description || post.excerpt || '');
  }

  if (isLoading) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Đang tải bài viết...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Không tìm thấy bài viết</h1>
        <Link to="/blog">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại Blog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.meta_description || post.excerpt,
        image: post.thumbnail_url,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        author: { '@type': 'Organization', name: 'Luyện Đề Thi' },
        publisher: { '@type': 'Organization', name: 'Luyện Đề Thi', url: 'https://luyenthijp.lovable.app' },
      }) }} />

      <div className="container py-8">
        <div className="mb-6">
          <Breadcrumb items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} />
        </div>

        <article className="max-w-3xl mx-auto">
          {/* Header */}
          {post.thumbnail_url && (
            <img
              src={post.thumbnail_url}
              alt={post.title}
              className="w-full aspect-video object-cover rounded-xl mb-8"
            />
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Luyện Đề Thi
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" /> {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none
              prose-headings:text-foreground prose-p:text-foreground/90
              prose-a:text-primary prose-strong:text-foreground
              prose-img:rounded-lg prose-img:mx-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content) }}
          />

          {/* Back to blog */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link to="/blog">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Quay lại danh sách bài viết
              </Button>
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogPostPage;
