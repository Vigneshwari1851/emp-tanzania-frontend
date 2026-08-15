import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import {
  Loader2,
  Globe,
  Building2,
  CalendarDays,
  User,
  Newspaper,
  Tag,
  ArrowRight,
  Sparkles,
  Search,
  ThumbsUp,
  Flame,
  Bookmark,
  Clock,
  Settings,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { useAuth } from '@/shared/context/AuthContext';
import { usePermissions } from '@/features/rbac/hooks/usePermissions';
import { Permission } from '@/shared/types/rbac';
import { getNews, type NewsItem } from '../services/news';

export default function NewsHub() {
  const { user } = useAuth();
  const navigate = useOrgNavigate();
  const { can } = usePermissions();
  const canManageNews = can(Permission.MANAGE_NEWS);

  const userDeptId = user?.departmentId
    ? Number(user.departmentId)
    : undefined;

  const { data: allNews, isLoading } = useQuery({
    queryKey: ['news', 'published'],
    queryFn: () => getNews({ status: 'published' }),
  });

  // Search & Filter Tab States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'department' | 'recent'>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  // Local storage engagement stats for richer micro-interactions
  const [likes, setLikes] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('news_likes_count');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [claps, setClaps] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('news_claps_count');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [hasLiked, setHasLiked] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('news_has_liked');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [hasClapped, setHasClapped] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('news_has_clapped');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [isBookmarked, setIsBookmarked] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('news_bookmarked');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHasLiked(prev => {
      const updatedStatus = { ...prev, [id]: !prev[id] };
      localStorage.setItem('news_has_liked', JSON.stringify(updatedStatus));

      setLikes(likesPrev => {
        const currentCount = likesPrev[id] || Math.floor(Math.random() * 12) + 4;
        const updatedCount = { ...likesPrev, [id]: updatedStatus[id] ? currentCount + 1 : Math.max(0, currentCount - 1) };
        localStorage.setItem('news_likes_count', JSON.stringify(updatedCount));
        return updatedCount;
      });

      return updatedStatus;
    });
  };

  const toggleClap = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHasClapped(prev => {
      const updatedStatus = { ...prev, [id]: !prev[id] };
      localStorage.setItem('news_has_clapped', JSON.stringify(updatedStatus));

      setClaps(clapsPrev => {
        const currentCount = clapsPrev[id] || Math.floor(Math.random() * 30) + 8;
        const updatedCount = { ...clapsPrev, [id]: updatedStatus[id] ? currentCount + 1 : Math.max(0, currentCount - 1) };
        localStorage.setItem('news_claps_count', JSON.stringify(updatedCount));
        return updatedCount;
      });

      return updatedStatus;
    });
  };

  const toggleBookmark = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(prev => {
      const updatedStatus = { ...prev, [id]: !prev[id] };
      localStorage.setItem('news_bookmarked', JSON.stringify(updatedStatus));
      return updatedStatus;
    });
  };

  // Helper: Get reading time in minutes
  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  // Helper: Check if article is published in the last 48 hours
  const isNewPost = (dateStr: string) => {
    const postDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - postDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  };

  // Filtered & Searched News
  const visibleNews = useMemo(() => {
    let items = (allNews ?? []).filter((item) => {
      if (canManageNews) return true;
      if (item.access_type === 'public') return true;
      if (item.access_type === 'department' && userDeptId && item.department_ids) {
        return item.department_ids.includes(userDeptId);
      }
      return false;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query)
      );
    }

    if (activeTab === 'public') {
      items = items.filter((item) => item.access_type === 'public');
    } else if (activeTab === 'department') {
      items = items.filter((item) => item.access_type === 'department');
    } else if (activeTab === 'recent') {
      items = items.filter((item) => {
        const postDate = new Date(item.created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - postDate.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      });
    }

    return items;
  }, [allNews, userDeptId, searchQuery, activeTab]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-background/50 backdrop-blur-sm rounded-2xl border border-border">
        <Loader2 className="w-12 h-12 animate-spin text-primarymb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading latest announcements...</p>
      </div>
    );
  }

  // Split featured story (first visible) and the rest
  const featuredNews = visibleNews[0];
  const gridNews = visibleNews.slice(1);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-primary-600 to-purple-700 p-8 text-white shadow-xl shadow-primary-500/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Newspaper className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Company News Hub</h1>
              <p className="text-blue-100/90 mt-1 max-w-xl text-sm md:text-base">
                Your destination for official communications, team updates, and highlights from across the organization.
              </p>
            </div>
          </div>

          {canManageNews && (
            <Button
              onClick={() => navigate('/news/manage')}
              className="bg-black  text-white font-semibold self-start md:self-center transition-all duration-300 shadow-md border-0 flex items-center gap-2 group px-5 py-2.5 rounded-xl"
            >
              <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              Manage Feed
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card/60 backdrop-blur-sm border border-border/80 p-4 rounded-xl shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: 'all', label: 'All Stories' },
            { id: 'public', label: 'Company Wide' },
            { id: 'department', label: 'My Department' },
            { id: 'recent', label: 'Recent (7d)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === tab.id
                ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search news & updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {visibleNews.length === 0 ? (
        <Card className="border-dashed bg-card/40 backdrop-blur-sm py-20 text-center rounded-2xl">
          <CardContent className="max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-950/20 dark:to-purple-950/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <BookOpen className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No news items found</h3>
            <p className="text-muted-foreground text-sm">
              We couldn't find any announcements matching your criteria. Check back later or try resetting your filters!
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-6 rounded-xl border-primary-200 text-primary-600 hover:bg-primary-50"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Featured News (First item) */}
          {featuredNews && (
            <Card
              onClick={() => setSelectedNews(featuredNews)}
              className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-border/80 bg-card/90 backdrop-blur-sm cursor-pointer rounded-2xl hover:border-primary-500/40"
            >
              <div className="md:flex">
                {featuredNews.image && (
                  <div className="md:w-[48%] relative h-72 md:h-auto overflow-hidden">
                    <img
                      src={featuredNews.image}
                      alt={featuredNews.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute top-4 left-4 flex gap-2">
                      {featuredNews.access_type === 'public' ? (
                        <Badge className="bg-primary/90 backdrop-blur-md text-white border-0 flex items-center gap-1.5 shadow-lg py-1.5 px-3 rounded-lg text-xs font-semibold">
                          <Globe className="w-3.5 h-3.5" />
                          Company Wide
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-600/90 backdrop-blur-md text-white border-0 flex items-center gap-1.5 shadow-lg py-1.5 px-3 rounded-lg text-xs font-semibold">
                          <Building2 className="w-3.5 h-3.5" />
                          Department
                        </Badge>
                      )}

                      {isNewPost(featuredNews.created_at) && (
                        <Badge className="bg-amber-500 animate-pulse text-white border-0 flex items-center gap-1 shadow-lg py-1.5 px-3 rounded-lg text-xs font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          NEW
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex-1 p-8 flex flex-col justify-between">
                  <div>
                    {/* Metadata Header */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Featured Announcement</span>
                      </div>
                      <span className="text-zinc-300 dark:text-zinc-700">|</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {getReadingTime(featuredNews.content)} min read
                      </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-tight">
                      {featuredNews.title}
                    </h2>

                    {/* Department Tag list */}
                    {featuredNews.access_type === 'department' && featuredNews.departments && (
                      <div className="flex items-center gap-2 mb-4">
                        <Tag className="w-3.5 h-3.5 text-primary-500" />
                        <div className="flex flex-wrap gap-1.5">
                          {featuredNews.departments.map((d) => (
                            <span
                              key={d.id}
                              className="px-2.5 py-0.5 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 text-[11px] font-semibold rounded-full border border-primary-100 dark:border-primary-900/30"
                            >
                              {d.department_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6 line-clamp-4">
                      {featuredNews.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/80 pt-6 mt-4">
                    {/* Author information */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {featuredNews.author?.full_name?.[0]?.toUpperCase() || featuredNews.author?.username?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">
                          {featuredNews.author?.full_name || featuredNews.author?.username || 'HR Dept'}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(featuredNews.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Reactions & Interaction bar */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => toggleLike(featuredNews.id, e)}
                        className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold transition-all ${hasLiked[featuredNews.id]
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-primarydark:text-blue-400 border border-blue-100 dark:border-blue-900/30 scale-105'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${hasLiked[featuredNews.id] ? 'fill-current' : ''}`} />
                        <span>{likes[featuredNews.id] || Math.floor(Math.random() * 12) + 4}</span>
                      </button>

                      <button
                        onClick={(e) => toggleClap(featuredNews.id, e)}
                        className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold transition-all ${hasClapped[featuredNews.id]
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 scale-105'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <Flame className={`w-4 h-4 ${hasClapped[featuredNews.id] ? 'fill-current text-amber-500' : ''}`} />
                        <span>{claps[featuredNews.id] || Math.floor(Math.random() * 30) + 8}</span>
                      </button>

                      <button
                        onClick={(e) => toggleBookmark(featuredNews.id, e)}
                        className={`p-2 rounded-lg transition-all ${isBookmarked[featuredNews.id]
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 scale-105'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isBookmarked[featuredNews.id] ? 'fill-current' : ''}`} />
                      </button>

                      <div className="h-6 w-px bg-border/80 mx-1 hidden sm:block" />

                      <div className="items-center text-primary-600 dark:text-primary-400 font-semibold text-sm gap-1 hover:translate-x-1 transition-transform hidden sm:flex">
                        <span>Read Full Story</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Grid News Section */}
          {gridNews.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5 pb-2 border-b border-border/60">
                <span className="w-2.5 h-2.5 bg-primary-600 rounded-full animate-ping"></span>
                More Organisation Stories
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridNews.map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => setSelectedNews(item)}
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/80 bg-card/90 backdrop-blur-sm cursor-pointer rounded-2xl flex flex-col justify-between hover:-translate-y-1 hover:border-primary-500/30"
                  >
                    <div>
                      {item.image && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                          <div className="absolute top-3 left-3 flex gap-1.5">
                            {item.access_type === 'public' ? (
                              <Badge className="bg-primary/90 backdrop-blur-md text-white border-0 flex items-center gap-1 shadow-md text-[10px] py-1 px-2.5 rounded-lg">
                                <Globe className="w-3 h-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-600/90 backdrop-blur-md text-white border-0 flex items-center gap-1 shadow-md text-[10px] py-1 px-2.5 rounded-lg">
                                <Building2 className="w-3 h-3" />
                                Dept
                              </Badge>
                            )}

                            {isNewPost(item.created_at) && (
                              <Badge className="bg-amber-500 text-white border-0 flex items-center gap-1 shadow-md text-[10px] py-1 px-2 rounded-lg font-bold">
                                NEW
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="p-6">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {getReadingTime(item.content)} min read
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 leading-snug mb-3">
                          {item.title}
                        </h3>

                        {item.access_type === 'department' && item.departments && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <Tag className="w-3 h-3 text-primary-500" />
                            <div className="flex flex-wrap gap-1">
                              {item.departments.map((d) => (
                                <span
                                  key={d.id}
                                  className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 text-[10px] font-semibold rounded-full border border-primary-100 dark:border-primary-900/30"
                                >
                                  {d.department_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 pt-0 mt-auto border-t border-border/50">
                      <div className="flex items-center justify-between pt-4 mt-1">
                        {/* Author info */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                            {item.author?.full_name?.[0]?.toUpperCase() || item.author?.username?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground truncate max-w-[90px]">
                              {item.author?.full_name || item.author?.username || 'HR Team'}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Reactions bar */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => toggleLike(item.id, e)}
                            className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-all ${hasLiked[item.id]
                              ? 'bg-blue-50 dark:bg-blue-950/30 text-primarydark:text-blue-400 scale-105'
                              : 'hover:bg-muted text-muted-foreground'
                              }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked[item.id] ? 'fill-current' : ''}`} />
                            <span>{likes[item.id] || Math.floor(Math.random() * 8) + 2}</span>
                          </button>

                          <button
                            onClick={(e) => toggleClap(item.id, e)}
                            className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-all ${hasClapped[item.id]
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 scale-105'
                              : 'hover:bg-muted text-muted-foreground'
                              }`}
                          >
                            <Flame className={`w-3.5 h-3.5 ${hasClapped[item.id] ? 'fill-current text-amber-500' : ''}`} />
                            <span>{claps[item.id] || Math.floor(Math.random() * 15) + 3}</span>
                          </button>

                          <button
                            onClick={(e) => toggleBookmark(item.id, e)}
                            className={`p-1.5 rounded-lg transition-all ${isBookmarked[item.id]
                              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 scale-105'
                              : 'hover:bg-muted text-muted-foreground'
                              }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked[item.id] ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Article Detail Dialog */}
      <Dialog
        isOpen={!!selectedNews}
        onClose={() => setSelectedNews(null)}
        title="Company Announcement"
        maxWidth="max-w-3xl"
      >
        {selectedNews && (
          <div className="space-y-6">
            {/* Cover image */}
            {selectedNews.image && (
              <div className="relative rounded-xl overflow-hidden h-72 shadow-md border border-border/80">
                <img
                  src={selectedNews.image}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <div className="flex gap-2 mb-3">
                    {selectedNews.access_type === 'public' ? (
                      <Badge className="bg-primary/90 text-white border-0 py-1 px-3 text-xs font-semibold rounded-lg">
                        Company Wide
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-600/90 text-white border-0 py-1 px-3 text-xs font-semibold rounded-lg">
                        Department Specific
                      </Badge>
                    )}
                    {isNewPost(selectedNews.created_at) && (
                      <Badge className="bg-amber-500 text-white border-0 py-1 px-3 text-xs font-semibold rounded-lg">
                        New
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content header */}
            <div className="space-y-4">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                {selectedNews.title}
              </h1>

              {/* Author & date card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {selectedNews.author?.full_name?.[0]?.toUpperCase() || selectedNews.author?.username?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {selectedNews.author?.full_name || selectedNews.author?.username || 'HR Officer'}
                    </h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>Published on:</span>
                      <strong>
                        {new Date(selectedNews.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground bg-background px-3 py-1.5 rounded-lg border border-border/80">
                  <Clock className="w-4 h-4 text-primary-500" />
                  <span>{getReadingTime(selectedNews.content)} min read</span>
                </div>
              </div>
            </div>

            {/* Department scope */}
            {selectedNews.access_type === 'department' && selectedNews.departments && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary-500" />
                <span className="text-xs text-muted-foreground font-medium">Visible to:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNews.departments.map((d) => (
                    <Badge
                      key={d.id}
                      className="bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 border border-primary-100 dark:border-primary-900/30 font-semibold"
                    >
                      {d.department_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Body content */}
            <div className="prose dark:prose-invert max-w-none text-foreground/90 border-t border-border/60 pt-6">
              {selectedNews.content.split('\n').map((para, idx) => (
                para.trim() && (
                  <p key={idx} className="leading-relaxed text-zinc-700 dark:text-zinc-300 mb-4 text-sm md:text-base">
                    {para}
                  </p>
                )
              ))}
            </div>

            {/* Footer with modal actions */}
            <div className="border-t border-border/60 pt-5 flex items-center justify-between mt-8">
              {/* Left engagement status */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleLike(selectedNews.id, e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${hasLiked[selectedNews.id]
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-primarydark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                    : 'hover:bg-muted text-muted-foreground'
                    }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${hasLiked[selectedNews.id] ? 'fill-current' : ''}`} />
                  <span>{likes[selectedNews.id] || Math.floor(Math.random() * 12) + 4} Likes</span>
                </button>

                <button
                  onClick={(e) => toggleClap(selectedNews.id, e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${hasClapped[selectedNews.id]
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                    : 'hover:bg-muted text-muted-foreground'
                    }`}
                >
                  <Flame className={`w-4 h-4 ${hasClapped[selectedNews.id] ? 'fill-current text-amber-500' : ''}`} />
                  <span>{claps[selectedNews.id] || Math.floor(Math.random() * 30) + 8} Claps</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => toggleBookmark(selectedNews.id, e)}
                  className={`p-2 rounded-lg transition-all ${isBookmarked[selectedNews.id]
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50'
                    : 'hover:bg-muted text-muted-foreground'
                    }`}
                  title="Bookmark Article"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked[selectedNews.id] ? 'fill-current' : ''}`} />
                </button>
                <Button variant="outline" size="sm" onClick={() => setSelectedNews(null)}>
                  Close Article
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}