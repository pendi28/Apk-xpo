import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { fb } from "@/lib/firebase";
import { tmdb } from "@/lib/tmdb";
import type { Ad, TmdbListResult } from "@/lib/types";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import MoviePage from "@/pages/movie";
import TvPage from "@/pages/tv";
import SearchPage from "@/pages/search";
import AdminPage from "@/pages/admin";
import Navbar from "@/components/Navbar";
import AdBanner from "@/components/AdBanner";
import ContentRow from "@/components/ContentRow";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

function PageShell({ title, queryKey, queryFn, mediaType }: { title: string; queryKey: string[]; queryFn: () => Promise<TmdbListResult>; mediaType?: "movie" | "tv" }) {
  const { data } = useQuery<TmdbListResult>({ queryKey, queryFn });
  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-3xl font-black mb-8">{title}</h1>
        {data?.results && <ContentRow title={title} items={data.results} mediaType={mediaType} />}
      </div>
    </div>
  );
}

function PeoplePage() {
  const { data } = useQuery<TmdbListResult>({ queryKey: ["people-popular", 1], queryFn: () => tmdb.peoplePopular(1) });
  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-3xl font-black mb-8">Popular People</h1>
        {data?.results ? <ContentRow title="Popular People" items={data.results} /> : null}
      </div>
    </div>
  );
}

function AwardsPage() {
  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto text-white">
        <h1 className="text-3xl font-black mb-4">Awards</h1>
        <div className="space-y-3 text-gray-300">
          <p>Contribution Bible</p>
          <p>Discussions</p>
          <p>Leaderboard</p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { data: ads = [] } = useQuery({ queryKey: ["ads"], queryFn: fb.getAds });
  const activeAds = (ads as Ad[]).filter((a) => a.active);
  const hasTop = activeAds.some((a) => a.type === "banner-top");
  const hasBottom = activeAds.some((a) => a.type === "banner-bottom");

  return (
    <div className="dark">
      <AdBanner ads={activeAds} />
      <div style={{ paddingTop: hasTop ? 60 : 0, paddingBottom: hasBottom ? 60 : 0 }}>
        <Navbar />
        <main>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/movie/:id" component={MoviePage} />
            <Route path="/tv/:id" component={TvPage} />
            <Route path="/movies" component={() => <PageShell title="Popular Movies" queryKey={["popular-movies", 1]} queryFn={() => tmdb.popularMovies(1)} mediaType="movie" />} />
            <Route path="/movies/top-rated" component={() => <PageShell title="Top Rated Movies" queryKey={["top-movies", 1]} queryFn={() => tmdb.topMovies(1)} mediaType="movie" />} />
            <Route path="/movies/upcoming" component={() => <PageShell title="Upcoming Movies" queryKey={["upcoming-movies", 1]} queryFn={() => tmdb.upcoming(1)} mediaType="movie" />} />
            <Route path="/movies/now-playing" component={() => <PageShell title="Now Playing" queryKey={["now-playing-movies", 1]} queryFn={() => tmdb.nowPlaying(1)} mediaType="movie" />} />
            <Route path="/tv" component={() => <PageShell title="Popular TV Shows" queryKey={["popular-tv", 1]} queryFn={() => tmdb.popularTv(1)} mediaType="tv" />} />
            <Route path="/tv/top-rated" component={() => <PageShell title="Top Rated TV Shows" queryKey={["top-tv", 1]} queryFn={() => tmdb.topTv(1)} mediaType="tv" />} />
            <Route path="/tv/on-tv" component={() => <PageShell title="On TV" queryKey={["on-tv", 1]} queryFn={() => tmdb.onTv(1)} mediaType="tv" />} />
            <Route path="/tv/airing-today" component={() => <PageShell title="Airing Today" queryKey={["airing-today", 1]} queryFn={() => tmdb.airingToday(1)} mediaType="tv" />} />
            <Route path="/people" component={PeoplePage} />
            <Route path="/awards" component={AwardsPage} />
            <Route path="/awards/:section" component={AwardsPage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/admin" component={AdminPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppContent />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
