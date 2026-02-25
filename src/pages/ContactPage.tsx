import { useState, useRef } from 'react';
import { Mail, MessageSquare, Send, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumb } from '@/components/layout/Header';
import { toast } from 'sonner';
import { useSEO, buildBreadcrumbSchema, SITE_URL } from '@/hooks/useSEO';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(100, 'Họ tên tối đa 100 ký tự'),
  email: z.string().trim().email('Email không hợp lệ').max(255, 'Email tối đa 255 ký tự'),
  subject: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(200, 'Tiêu đề tối đa 200 ký tự'),
  message: z.string().trim().min(10, 'Nội dung tối thiểu 10 ký tự').max(2000, 'Nội dung tối đa 2000 ký tự'),
});

const RATE_LIMIT_MS = 60_000; // 1 minute between submissions

const ContactPage = () => {
  useSEO({
    title: 'Liên hệ | Luyện Đề Thi',
    description: 'Liên hệ với đội ngũ Luyện Đề Thi. Gửi câu hỏi, góp ý hoặc yêu cầu hỗ trợ về luyện thi trắc nghiệm tại Nhật.',
    jsonLd: buildBreadcrumbSchema([
      { name: 'Trang chủ', url: SITE_URL },
      { name: 'Liên hệ' },
    ]),
  });

  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitRef = useRef(0);
  const formStartRef = useRef(Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Honeypot check - bots fill hidden fields
    if (honeypot) return;

    // Time-based check - bots submit too fast (< 3s)
    if (Date.now() - formStartRef.current < 3000) {
      toast.error('Vui lòng điền form chậm hơn.');
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastSubmitRef.current < RATE_LIMIT_MS) {
      const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastSubmitRef.current)) / 1000);
      toast.error(`Vui lòng đợi ${remaining} giây trước khi gửi lại.`);
      return;
    }

    // Zod validation
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    lastSubmitRef.current = Date.now();

    const { error } = await supabase.from('contact_messages').insert({
      name: result.data.name,
      email: result.data.email,
      subject: result.data.subject,
      message: result.data.message,
    });

    if (error) {
      toast.error('Gửi tin nhắn thất bại. Vui lòng thử lại sau.');
    } else {
      toast.success('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.');
      setFormData({ name: '', email: '', subject: '', message: '' });
      formStartRef.current = Date.now();
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <Breadcrumb items={[{ label: 'Liên hệ' }]} />
        </div>

        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Liên hệ với chúng tôi
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Bạn có câu hỏi, góp ý hoặc đề xuất? Hãy liên hệ với chúng tôi. 
            Chúng tôi luôn sẵn lòng lắng nghe và hỗ trợ bạn.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact Info */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-foreground mb-6">Thông tin liên hệ</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Email</h3>
                  <p className="text-sm text-muted-foreground">hoangminh@thairise.co.jp</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Hỗ trợ</h3>
                  <p className="text-sm text-muted-foreground">Phản hồi trong vòng 24-48 giờ</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Địa điểm</h3>
                  <p className="text-sm text-muted-foreground">Nhật Bản</p>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-xl bg-muted/30 border border-border p-4">
              <h3 className="font-medium text-foreground mb-2">Câu hỏi thường gặp</h3>
              <p className="text-sm text-muted-foreground">
                Trước khi liên hệ, bạn có thể xem phần Blog để tìm các bài viết hướng dẫn 
                và mẹo luyện thi hữu ích.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-xl font-semibold text-foreground mb-6">Gửi tin nhắn</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Honeypot - hidden from real users, bots will fill it */}
                <div className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={e => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Họ và tên <span className="text-destructive">*</span>
                    </label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Nguyễn Văn A" maxLength={100} required />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email <span className="text-destructive">*</span>
                    </label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" maxLength={255} required />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                    Tiêu đề <span className="text-destructive">*</span>
                  </label>
                  <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="Chủ đề bạn muốn trao đổi" maxLength={200} required />
                  {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject}</p>}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Nội dung <span className="text-destructive">*</span>
                    <span className="text-muted-foreground font-normal ml-2">({formData.message.length}/2000)</span>
                  </label>
                  <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="Nhập nội dung tin nhắn của bạn..." rows={6} maxLength={2000} required />
                  {errors.message && <p className="text-sm text-destructive mt-1">{errors.message}</p>}
                </div>

                <Button type="submit" size="lg" className="gap-2" disabled={isSubmitting}>
                  {isSubmitting ? <>Đang gửi...</> : <>
                      <Send className="h-5 w-5" />
                      Gửi tin nhắn
                    </>}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default ContactPage;
