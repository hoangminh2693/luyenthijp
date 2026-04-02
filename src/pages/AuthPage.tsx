import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Calendar, Globe, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

// List of countries
const COUNTRIES = [
  { code: 'JP', name: 'Nhật Bản' },
  { code: 'VN', name: 'Việt Nam' },
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

// List of inappropriate words to filter (add more as needed)
const INAPPROPRIATE_WORDS = [
  'admin', 'moderator', 'root', 'system', 'support',
  'fuck', 'shit', 'damn', 'ass', 'dick', 'pussy', 'bitch',
  'đụ', 'địt', 'lồn', 'buồi', 'cặc', 'đéo', 'vãi', 'đĩ', 'chó',
];

// Validation schemas
const emailSchema = z.string().email('Email không hợp lệ');
const passwordSchema = z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự');
const nicknameSchema = z.string()
  .min(3, 'Nickname phải có ít nhất 3 ký tự')
  .max(20, 'Nickname không được quá 20 ký tự')
  .regex(/^[a-zA-Z0-9_]+$/, 'Nickname chỉ được chứa chữ cái, số và dấu gạch dưới')
  .refine((val) => {
    const lowerVal = val.toLowerCase();
    return !INAPPROPRIATE_WORDS.some(word => lowerVal.includes(word));
  }, 'Nickname chứa từ ngữ không phù hợp');

const AuthPage = () => {
  useRobotsMeta('noindex, nofollow');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    nickname?: string;
    dateOfBirth?: string;
    country?: string;
  }>({});

  const { user, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check nickname availability with debounce
  useEffect(() => {
    if (!nickname || nickname.length < 3) {
      setNicknameAvailable(null);
      return;
    }

    const nicknameResult = nicknameSchema.safeParse(nickname);
    if (!nicknameResult.success) {
      setNicknameAvailable(null);
      return;
    }

    const checkNickname = async () => {
      setIsCheckingNickname(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('nickname', nickname)
          .maybeSingle();

        if (error) {
          console.error('Error checking nickname:', error);
          setNicknameAvailable(null);
        } else {
          setNicknameAvailable(!data);
        }
      } catch (err) {
        console.error('Error checking nickname:', err);
        setNicknameAvailable(null);
      } finally {
        setIsCheckingNickname(false);
      }
    };

    const timer = setTimeout(checkNickname, 500);
    return () => clearTimeout(timer);
  }, [nickname]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (!isLogin) {
      const nicknameResult = nicknameSchema.safeParse(nickname);
      if (!nicknameResult.success) {
        newErrors.nickname = nicknameResult.error.errors[0].message;
      } else if (nicknameAvailable === false) {
        newErrors.nickname = 'Nickname này đã được sử dụng';
      }

      if (!dateOfBirth) {
        newErrors.dateOfBirth = 'Vui lòng chọn ngày sinh';
      } else {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 13) {
          newErrors.dateOfBirth = 'Bạn phải từ 13 tuổi trở lên';
        } else if (age > 120) {
          newErrors.dateOfBirth = 'Ngày sinh không hợp lệ';
        }
      }

      if (!country) {
        newErrors.country = 'Vui lòng chọn quốc gia';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email hoặc mật khẩu không đúng');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Đăng nhập thành công!');
        }
      } else {
        // Custom signup with additional profile data
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: nickname,
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Email này đã được đăng ký');
          } else {
            toast.error(error.message);
          }
        } else if (data.user) {
          // Update public profile with nickname
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              nickname,
              display_name: nickname,
            })
            .eq('user_id', data.user.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
          }

          // Save private data (date_of_birth, country) to profile_private
          const { error: privateError } = await supabase
            .from('profile_private')
            .upsert({
              user_id: data.user.id,
              date_of_birth: dateOfBirth,
              country,
            }, { onConflict: 'user_id' });

          if (privateError) {
            console.error('Error saving private profile:', privateError);
          }

          toast.success('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
          setIsLogin(true);
          // Reset form
          setNickname('');
          setDateOfBirth('');
          setCountry('');
        }
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message);
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi đăng nhập với Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate max date for date of birth (must be at least 13 years old)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Min date (reasonable limit - 120 years ago)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">
              {isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? 'Đăng nhập để lưu tiến trình học tập'
                : 'Tạo tài khoản mới để bắt đầu học'}
            </p>
          </div>

          {/* Google Sign In */}
          <Button
            variant="outline"
            className="mb-6 w-full gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Tiếp tục với Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Hoặc</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Nickname */}
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname (hiển thị trên bảng xếp hạng)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nickname"
                      type="text"
                      placeholder="vd: player_2024"
                      value={nickname}
                      onChange={(e) => {
                        setNickname(e.target.value);
                        setErrors((prev) => ({ ...prev, nickname: undefined }));
                      }}
                      className="pl-10 pr-10"
                      disabled={isLoading}
                      maxLength={20}
                    />
                    {isCheckingNickname && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                    {!isCheckingNickname && nicknameAvailable === true && nickname.length >= 3 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success text-sm">✓</span>
                    )}
                    {!isCheckingNickname && nicknameAvailable === false && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive text-sm">✗</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    3-20 ký tự, chỉ chữ cái, số và dấu gạch dưới
                  </p>
                  {errors.nickname && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.nickname}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => {
                        setDateOfBirth(e.target.value);
                        setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
                      }}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="country">Nơi đang sống</Label>
                  <Select 
                    value={country} 
                    onValueChange={(value) => {
                      setCountry(value);
                      setErrors((prev) => ({ ...prev, country: undefined }));
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Chọn quốc gia..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {errors.country}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              {!isLogin && <Label htmlFor="email">Email</Label>}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              {!isLogin && <Label htmlFor="password">Mật khẩu</Label>}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || (!isLogin && nicknameAvailable === false)}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLogin ? (
                'Đăng nhập'
              ) : (
                'Đăng ký'
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
