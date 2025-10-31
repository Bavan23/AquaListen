import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, MapPin, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardStats as ApiDashboardStats } from "@/lib/api";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

function StatCard({ title, value, change, changeLabel, icon: Icon, className = "" }: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  
  return (
    <Card className={`hover-elevate ${className}`} data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="text-stat-value">{value}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-2 mt-2">
            {isPositive && <TrendingUp className="w-3 h-3 text-green-600" />}
            {isNegative && <TrendingDown className="w-3 h-3 text-red-600" />}
            <span 
              className={`text-xs ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}
              data-testid="text-change"
            >
              {isPositive ? '+' : ''}{change}% {changeLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  className?: string;
  stats?: ApiDashboardStats;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function DashboardStats({ 
  className = "", 
  stats: liveStats, 
  isLoading = false, 
  onRefresh 
}: DashboardStatsProps) {
  // Use live data or fallback to mock data
  const displayStats = liveStats || {
    totalSites: 24,
    healthySites: 18,
    totalPredictions: 1247,
    activeAlerts: 3,
    globalAverage: 84.7
  };

  // Mock change data (in real app, this would come from historical comparison)
  const changeData = {
    sitesChange: 8.3,
    healthyChange: 5.2,
    predictionsChange: 12.1,
    alertsChange: -25.0
  };

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className}`} data-testid="dashboard-stats">
      <StatCard
        title="Total Sites"
        value={isLoading ? "..." : displayStats.totalSites}
        change={changeData.sitesChange}
        changeLabel="from last month"
        icon={MapPin}
      />
      
      <StatCard
        title="Healthy Sites"
        value={isLoading ? "..." : displayStats.healthySites}
        change={changeData.healthyChange}
        changeLabel="from last month"
        icon={Activity}
        className="border-green-200"
      />
      
      <StatCard
        title="Total Predictions"
        value={isLoading ? "..." : displayStats.totalPredictions}
        change={changeData.predictionsChange}
        changeLabel="from last month"
        icon={TrendingUp}
      />
      
      <StatCard
        title="Active Alerts"
        value={isLoading ? "..." : displayStats.activeAlerts}
        change={changeData.alertsChange}
        changeLabel="from last month"
        icon={AlertTriangle}
        className="border-red-200"
      />
    </div>
  );
}