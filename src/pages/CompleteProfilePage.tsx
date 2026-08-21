import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSEO } from '@/hooks/useSEO';
import { Loader2, AlertCircle, User, Calendar, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const COUNTRIES = [
  { code: 'VN', name: 'Việt Nam' },
  { code: 'JP', name: 'Nhật Bản' },
  { code: 'US', name: 'Hoa Kỳ' },
  { code: 'KR', name: 'Hàn Quốc' },
  { code: 'CN', name: 'Trung Quốc' },
  { code: 'TW', name: 'Đài Loan' },
  { code: 'TH', name: 'Thái Lan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Úc' },
  { code: 'CA', name: 'Canada' },
  { code: 'UK', name: 'Anh' },
  { code: 'DE', name: 'Đức' },
  { code: 'FR', name: 'Pháp' },
  { code: 'OTHER', name: 'Khác' },
];

const INAPPROPRIATE_WORDS = [
  'admin', 'moderator', 'root', 'system', 'support',
  'fuck', 'shit', 'damn', 'ass', 'dick', 'pussy', 'bitch',
  'đụ', 'địt', 'lồn', 'buồi', 'cặc', 'đéo', 'vãi', 'đĩ', 'chó',
];

const nicknameSchema = z.string()
  .min(3, 'Nickname phải có ít nhất 3 ký tự')
  .max(20, 'Nickname không được quá 20 ký tự')
  .regex(/^[a-zA-Z0-9_]+$/, 'Nickname chỉ được chứa chữ cái, số và dấu gạch dưới')
  .refine((val) => {
    const lowerVal = val.toLowerCase();
    return !INAPPROPRIATE_WORDS.some(word => lowerVal.includes(word));
  }, 'Nickname chứa từ ngữ không phù hợp');

export default function CompleteProfilePage() {
  useSEO({ title: 'Hoàn tất hồ sơ | Luyện Đề Thi', description: 'Hoàn tất thông tin hồ sơ để tiếp tục.', noindex: true });
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ nickname?: string; dateOfBirth?: string; country?: string }>({});

  // Redirect if not logged in or already completed
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && profile && profile.nickname) {
      navigate('/');
    }
  }, [profile, authLoading, navigate]);

  // Prefill if profile has display_name as hint
  useEffect(() => {
    if (profile?.display_name && !nickname) {
      // Suggest nickname from display_name (sanitized)
      const suggested = profile.display_name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
      if (suggested.length >= 3) setNickname(suggested);
    }
  }, [profile]);

  // Check nickname availability
  useEffect(() => {
    if (!nickname || nickname.length < 3) {
      setNicknameAvailable(null);
      return;
    }
    const result = nicknameSchema.safeParse(nickname);
    if (!result.success) {
      setNicknameAvailable(null);
      return;
    }
    const check = async () => {
      setIsCheckingNickname(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('nickname', nickname)
          .maybeSingle();
        if (error) setNicknameAvailable(null);
        else setNicknameAvailable(!data);
      } catch {
        setNicknameAvailable(null);
      } finally {
        setIsCheckingNickname(false);
      }
    };
    const t = setTimeout(check, 500);
    return () => clearTimeout(t);
  }, [nickname]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const r = nicknameSchema.safeParse(nickname);
    if (!r.success) newErrors.nickname = r.error.errors[0].message;
    else if (nicknameAvailable === false) newErrors.nickname = 'Nickname này đã được sử dụng';

    if (!dateOfBirth) newErrors.dateOfBirth = 'Vui lòng chọn ngày sinh';
    else {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) newErrors.dateOfBirth = 'Bạn phải từ 13 tuổi trở lên';
      else if (age > 120) newErrors.dateOfBirth = 'Ngày sinh không hợp lệ';
    }
    if (!country) newErrors.country = 'Vui lòng chọn quốc gia';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nickname, display_name: nickname, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      const { error: privateError } = await supabase
        .from('profile_private')
        .upsert({ user_id: user.id, date_of_birth: dateOfBirth, country }, { onConflict: 'user_id' });
      if (privateError) throw privateError;

      toast.success('Đã hoàn tất hồ sơ!');
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  // If profile already has nickname, we redirect above - avoid flash
  if (profile?.nickname) return null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Hoàn tất hồ sơ</h1>
            <p className="text-muted-foreground">Bạn đăng nhập bằng Google lần đầu — vui lòng chọn nickname và thông tin cơ bản để hiển thị trên bảng xếp hạng.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (hiển thị trên bảng xếp hạng)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nickname"
                  type="text"
                  placeholder="vd: player_2024"
                  value={nickname}
                  onChange={(e) => { setNickname(e.target.value); setErrors(p => ({ ...p, nickname: undefined })); }}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                  maxLength={20}
                />
                {isCheckingNickname && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                {!isCheckingNickname && nicknameAvailable === true && nickname.length >= 3 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600">✓</span>}
                {!isCheckingNickname && nicknameAvailable === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-destructive">✗</span>}
              </div>
              <p className="text-xs text-muted-foreground">3-20 ký tự, chỉ chữ cái, số và dấu gạch dưới</p>
              {errors.nickname && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-3 w-3" />{errors.nickname}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Ngày sinh</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => { setDateOfBirth(e.target.value); setErrors(p => ({ ...p, dateOfBirth: undefined })); }}
                  className="pl-10"
                  disabled={isLoading}
                  max={maxDate.toISOString().split('T')[0]}
                />
              </div>
              {errors.dateOfBirth && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-3 w-3" />{errors.dateOfBirth}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Nơi đang sống</Label>
              <Select value={country} onValueChange={(v) => { setCountry(v); setErrors(p => ({ ...p, country: undefined })); }} disabled={isLoading}>
                <SelectTrigger><div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Chọn quốc gia..." /></div></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.country && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-3 w-3" />{errors.country}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || nicknameAvailable === false}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hoàn tất và tiếp tục'}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">Bạn có thể đổi lại sau trong Hồ sơ cá nhân.</p>
        </div>
      </div>
    </div>
  );
}
