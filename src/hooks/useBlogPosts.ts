import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlogPost {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnail_url: string | null;
  tags: string[];
  status: 'draft' | 'published';
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BlogPostInsert = Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;

// Hook lấy danh sách bài viết đã xuất bản (public)
export function usePublishedPosts() {
  return useQuery({
    queryKey: ['blog-posts', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });
}

// Hook lấy bài viết theo slug (public)
export function usePostBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['blog-posts', 'slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!slug,
  });
}

// Hook lấy tất cả bài viết (admin)
export function useAllPosts() {
  return useQuery({
    queryKey: ['blog-posts', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });
}

// Hook tạo bài viết
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: BlogPostInsert) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert(post)
        .select()
        .single();
      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Đã tạo bài viết');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// Hook cập nhật bài viết
export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Đã cập nhật bài viết');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// Hook xóa bài viết
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Đã xóa bài viết');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
