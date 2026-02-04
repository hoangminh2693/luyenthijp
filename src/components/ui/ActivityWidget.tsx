import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Users, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ActivityWidget - Widget hiển thị hoạt động học tập thực
 * Nguyên tắc: Trung thực, tạo động lực, không gây hiểu lầm
 */
export function ActivityWidget() {
  // Fetch số lượt luyện trong 24 giờ qua
  const { data: activityData, isLoading } = useQuery({
    queryKey: ["activity-stats"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Đếm số lượt trả lời trong 24 giờ qua
      const { count: recentAttempts } = await supabase
        .from("question_history")
        .select("*", { count: "exact", head: true })
        .gte("answered_at", twentyFourHoursAgo.toISOString());

      // Đếm số người dùng khác nhau đã luyện trong 24 giờ
      const { data: activeUsers } = await supabase
        .from("question_history")
        .select("user_id")
        .gte("answered_at", twentyFourHoursAgo.toISOString());

      const uniqueUsers = new Set(activeUsers?.map((u) => u.user_id) || []).size;

      return {
        recentAttempts: recentAttempts || 0,
        activeUsers: uniqueUsers,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    refetchInterval: 5 * 60 * 1000, // Refresh mỗi 5 phút
  });

  // Slogans tạo động lực - chọn theo thời điểm trong ngày
  const getMotivationalSlogan = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "Buổi sáng là thời điểm vàng để học!";
    } else if (hour >= 12 && hour < 18) {
      return "Kiên trì mỗi ngày, thành công sẽ đến!";
    } else if (hour >= 18 && hour < 22) {
      return "Ôn bài buổi tối, nhớ lâu hơn!";
    } else {
      return "Học đều đặn, tiến bộ từng ngày!";
    }
  };

  // Xác định cách hiển thị dựa trên mức độ hoạt động
  const getActivityDisplay = () => {
    if (!activityData) return null;

    const { recentAttempts, activeUsers } = activityData;

    // Khi có nhiều người học (>= 3 người trong 24h) - hiển thị số người
    if (activeUsers >= 3) {
      return {
        icon: Users,
        value: activeUsers,
        label: "người đã luyện hôm nay",
        color: "text-success",
      };
    }

    // Khi có lượt luyện (>= 10 lượt) - hiển thị số lượt
    if (recentAttempts >= 10) {
      return {
        icon: TrendingUp,
        value: recentAttempts,
        label: "lượt luyện trong 24 giờ",
        color: "text-primary",
      };
    }

    // Khi traffic thấp - vẫn hiển thị nhưng nhẹ nhàng hơn
    if (recentAttempts > 0) {
      return {
        icon: Activity,
        value: recentAttempts,
        label: "lượt luyện gần đây",
        color: "text-muted-foreground",
      };
    }

    // Không có hoạt động - hiển thị thông điệp khích lệ
    return {
      icon: Flame,
      value: null,
      label: "Hãy là người đầu tiên luyện hôm nay!",
      color: "text-warning",
    };
  };

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  const display = getActivityDisplay();
  if (!display) return null;

  const IconComponent = display.icon;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Activity indicator */}
      <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm">
        <IconComponent className={`h-4 w-4 ${display.color}`} />
        <span className="text-foreground">
          {display.value !== null && (
            <span className={`font-semibold ${display.color}`}>
              {display.value.toLocaleString()}{" "}
            </span>
          )}
          <span className="text-muted-foreground">{display.label}</span>
        </span>
      </div>

      {/* Motivational slogan */}
      <p className="text-xs text-muted-foreground italic">
        💡 {getMotivationalSlogan()}
      </p>
    </div>
  );
}
