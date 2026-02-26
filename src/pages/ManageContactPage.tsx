import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Breadcrumb } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Eye, Search, Mail, Calendar, Loader2 } from 'lucide-react';
import { DeleteDialog } from '@/components/admin/DeleteDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSEO } from '@/hooks/useSEO';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

const ManageContactPage = () => {
  useSEO({ title: 'Quản lý tin nhắn liên hệ | Admin', description: 'Quản lý tin nhắn liên hệ', noindex: true });

  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Không thể tải tin nhắn.');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchMessages();
  }, [isAdmin]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('contact_messages').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Xóa tin nhắn thất bại.');
    } else {
      toast.success('Đã xóa tin nhắn.');
      setMessages(prev => prev.filter(m => m.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const filtered = messages.filter(m =>
    [m.name, m.email, m.subject, m.message]
      .some(f => f.toLowerCase().includes(search.toLowerCase()))
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Truy cập bị từ chối</h1>
        <p className="text-muted-foreground">Bạn cần đăng nhập với tài khoản admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Breadcrumb items={[{ label: 'Quản lý tin nhắn liên hệ' }]} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Tin nhắn liên hệ ({filtered.length})
          </h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {search ? 'Không tìm thấy tin nhắn phù hợp.' : 'Chưa có tin nhắn liên hệ nào.'}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người gửi</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead className="hidden sm:table-cell">Ngày gửi</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(msg => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium">{msg.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {msg.email}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{msg.subject}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(msg.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedMessage(msg)} title="Xem chi tiết">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(msg)} title="Xóa">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={open => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết tin nhắn</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Người gửi</p>
                <p className="text-foreground">{selectedMessage.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-foreground">{selectedMessage.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tiêu đề</p>
                <p className="text-foreground">{selectedMessage.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ngày gửi</p>
                <p className="text-foreground">{formatDate(selectedMessage.created_at)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nội dung</p>
                <p className="text-foreground whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                  {selectedMessage.message}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Xóa tin nhắn"
        description={`Bạn có chắc muốn xóa tin nhắn từ "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
};

export default ManageContactPage;
