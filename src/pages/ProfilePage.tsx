import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRobotsMeta } from '@/hooks/useRobotsMeta';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Camera, User, Calendar, MapPin, AtSign, Mail } from 'lucide-react';
import { AchievementsSection } from '@/components/profile/AchievementsSection';

const COUNTRIES = [
  'Việt Nam', 'Nhật Bản', 'Hàn Quốc', 'Trung Quốc', 'Thái Lan',
  'Singapore', 'Malaysia', 'Indonesia', 'Philippines', 'Ấn Độ',
  'Mỹ', 'Canada', 'Anh', 'Pháp', 'Đức', 'Úc', 'New Zealand', 'Khác'
];

const INAPPROPRIATE_WORDS = [
  'admin', 'moderator', 'fuck', 'shit', 'damn', 'ass', 'bitch',
  'đụ', 'địt', 'lồn', 'cặc', 'buồi', 'đéo', 'vãi', 'chó', 'ngu'
];

export default function ProfilePage() {
  useRobotsMeta('noindex, nofollow');
  const { user, profile, profilePrivate, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setNickname(profile.nickname || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    if (profilePrivate) {
      setDateOfBirth(profilePrivate.date_of_birth || '');
      setCountry(profilePrivate.country || '');
    }
  }, [profilePrivate]);

  const validateNickname = (value: string): string => {
    if (!value) return '';
    if (value.length < 3) return 'Nickname phải có ít nhất 3 ký tự';
    if (value.length > 20) return 'Nickname không được quá 20 ký tự';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Nickname chỉ được chứa chữ cái, số và dấu gạch dưới';
    }
    const lowerValue = value.toLowerCase();
    if (INAPPROPRIATE_WORDS.some(word => lowerValue.includes(word))) {
      return 'Nickname chứa từ không phù hợp';
    }
    return '';
  };

  const checkNicknameAvailability = async (value: string) => {
    if (!value || value === profile?.nickname) return;
    
    const validationError = validateNickname(value);
    if (validationError) {
      setNicknameError(validationError);
      return;
    }

    setIsCheckingNickname(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', value)
        .neq('user_id', user?.id || '')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setNicknameError('Nickname này đã được sử dụng');
      } else {
        setNicknameError('');
      }
    } catch (error) {
      console.error('Error checking nickname:', error);
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    const error = validateNickname(value);
    setNicknameError(error);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file ảnh',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Lỗi',
        description: 'Ảnh không được lớn hơn 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      // Use user's subfolder for proper RLS policy matching
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast({
        title: 'Thành công',
        description: 'Đã tải ảnh lên',
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải ảnh lên. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (nickname && nicknameError) {
      toast({
        title: 'Lỗi',
        description: nicknameError,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update public profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          nickname: nickname || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update private profile (date_of_birth, country)
      const { error: privateError } = await supabase
        .from('profile_private')
        .upsert({
          user_id: user.id,
          date_of_birth: dateOfBirth || null,
          country: country || null,
        }, { onConflict: 'user_id' });

      if (privateError) throw privateError;

      toast({
        title: 'Thành công',
        description: 'Đã cập nhật hồ sơ',
      });

      // Refresh profile in context
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật hồ sơ',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Hồ sơ cá nhân</CardTitle>
          <CardDescription>Cập nhật thông tin cá nhân của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} alt={displayName || 'Avatar'} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(displayName || nickname)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Nhấn vào biểu tượng camera để thay đổi ảnh đại diện
              </p>
            </div>

            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input value={user.email || ''} disabled className="bg-muted" />
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Tên hiển thị
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị"
              />
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname" className="flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                Nickname (hiển thị trên bảng xếp hạng)
              </Label>
              <div className="relative">
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  onBlur={() => checkNicknameAvailability(nickname)}
                  placeholder="vd: player_123"
                  className={nicknameError ? 'border-destructive' : ''}
                />
                {isCheckingNickname && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {nicknameError && (
                <p className="text-sm text-destructive">{nicknameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                3-20 ký tự, chỉ chữ cái, số và dấu gạch dưới
              </p>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Ngày sinh
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Quốc gia
              </Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn quốc gia" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading || !!nicknameError}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <AchievementsSection 
        userId={user.id} 
        displayName={displayName || nickname || 'Người dùng'}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}
