import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRobotsMeta } from '@/hooks/useRobotsMeta';
import { useAllPosts, useCreatePost, useUpdatePost, useDeletePost, BlogPost } from '@/hooks/useBlogPosts';
import { Breadcrumb } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { RichTextEditable } from '@/components/admin/RichTextEditable';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Tag, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const ManageBlogPage = () => {
  useRobotsMeta('noindex, nofollow');
  const { user, isAdmin } = useAuth();
  const { data: posts, isLoading } = useAllPosts();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>();
  const [tagsInput, setTagsInput] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  if (!isAdmin) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  const resetForm = () => {
    setTitle(''); setSlug(''); setExcerpt(''); setContent('');
    setThumbnailUrl(undefined); setTagsInput(''); setMetaTitle('');
    setMetaDescription(''); setStatus('draft'); setEditingPost(null);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt || '');
    setContent(post.content);
    setThumbnailUrl(post.thumbnail_url || undefined);
    setTagsInput((post.tags || []).join(', '));
    setMetaTitle(post.meta_title || '');
    setMetaDescription(post.meta_description || '');
    setStatus(post.status);
    setIsDialogOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost) {
      setSlug(slugify(val));
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      toast.error('Tiêu đề và slug không được để trống');
      return;
    }
    if (!user) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const postData = {
      author_id: user.id,
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content,
      thumbnail_url: thumbnailUrl || null,
      tags,
      status,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      published_at: status === 'published' ? (editingPost?.published_at || new Date().toISOString()) : null,
    };

    if (editingPost) {
      await updatePost.mutateAsync({ id: editingPost.id, ...postData });
    } else {
      await createPost.mutateAsync(postData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await updatePost.mutateAsync({
      id: post.id,
      status: newStatus,
      published_at: newStatus === 'published' ? (post.published_at || new Date().toISOString()) : null,
    });
  };

  const filteredPosts = (posts || []).filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-6">
          <Breadcrumb items={[{ label: 'Quản lý Blog' }]} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Quản lý Blog</h1>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Viết bài mới
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm bài viết..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Posts list */}
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Đang tải...</p>
        ) : filteredPosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Chưa có bài viết nào.</p>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map(post => (
              <Card key={post.id}>
                <CardContent className="flex items-start gap-4 p-4">
                  {post.thumbnail_url && (
                    <img src={post.thumbnail_url} alt="" className="w-24 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                        {post.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                      </Badge>
                    </div>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      {post.tags?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {post.tags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(post)} title={post.status === 'published' ? 'Chuyển về nháp' : 'Xuất bản'}>
                      {post.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa bài viết?</AlertDialogTitle>
                          <AlertDialogDescription>Bài viết "{post.title}" sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePost.mutate(post.id)} className="bg-destructive text-destructive-foreground">Xóa</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label>Tiêu đề bài viết *</Label>
                <Input value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Nhập tiêu đề..." />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="url-bai-viet" />
                <p className="text-xs text-muted-foreground">URL: /blog/{slug}</p>
              </div>

              {/* Thumbnail */}
              <div className="space-y-2">
                <Label>Ảnh bìa</Label>
                <MediaUpload type="image" value={thumbnailUrl} onChange={url => setThumbnailUrl(url)} />
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label>Mô tả ngắn</Label>
                <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Tóm tắt nội dung bài viết..." rows={3} />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>Nội dung bài viết *</Label>
                <div className="min-h-[300px] border rounded-md">
                  <RichTextEditable value={content} onChange={setContent} />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Thẻ tag (cách nhau bởi dấu phẩy)</Label>
                <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="JLPT, N3, Mẹo thi..." />
              </div>

              {/* SEO Section */}
              <div className="rounded-lg border border-border p-4 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4" /> Tối ưu SEO
                </h3>
                <div className="space-y-2">
                  <Label>Meta Title (tối đa 60 ký tự)</Label>
                  <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder={title || 'Tiêu đề hiển thị trên Google'} maxLength={60} />
                  <p className="text-xs text-muted-foreground">{metaTitle.length}/60</p>
                </div>
                <div className="space-y-2">
                  <Label>Meta Description (tối đa 160 ký tự)</Label>
                  <Textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder={excerpt || 'Mô tả hiển thị trên Google'} maxLength={160} rows={2} />
                  <p className="text-xs text-muted-foreground">{metaDescription.length}/160</p>
                </div>

                {/* SEO Preview */}
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Xem trước trên Google:</p>
                  <p className="text-blue-600 text-sm font-medium truncate">{metaTitle || title || 'Tiêu đề bài viết'}</p>
                  <p className="text-green-700 text-xs">luyenthijp.lovable.app/blog/{slug || 'url-bai-viet'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{metaDescription || excerpt || 'Mô tả bài viết...'}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <Label>Trạng thái:</Label>
                <Button
                  type="button"
                  variant={status === 'draft' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setStatus('draft')}
                >
                  Bản nháp
                </Button>
                <Button
                  type="button"
                  variant={status === 'published' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus('published')}
                >
                  Xuất bản
                </Button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Hủy
                </Button>
                <Button onClick={handleSave} disabled={createPost.isPending || updatePost.isPending}>
                  {editingPost ? 'Cập nhật' : 'Tạo bài viết'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManageBlogPage;
