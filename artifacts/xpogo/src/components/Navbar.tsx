import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, ChevronRight, Film, Tv, Users, Trophy, Clapperboard } from "lucide-react";

type MenuGroup = {
  title: string;
  items: { label: string; href: string }[];
};

const MENU: MenuGroup[] = [
  {
    title: "Movies",
    items: [
      { label: "Popular", href: "/movies" },
      { label: "Top Rated", href: "/movies/top-rated" },
      { label: "Upcoming", href: "/movies/upcoming" },
      { label: "Now Playing", href: "/movies/now-playing" },
    ],
  },
  {
    title: "TV Shows",
    items: [
      { label: "Popular", href: "/tv" },
      { label: "Top Rated", href: "/tv/top-rated" },
      { label: "On TV", href: "/tv/on-tv" },
      { label: "Airing Today", href: "/tv/airing-today" },
    ],
  },
  {
    title: "People",
    items: [{ label: "Popular", href: "/people" }],
  },
  {
    title: "Awards",
    items: [
      { label: "Leaderboard", href: "/awards" },
      { label: "Discussions", href: "/awards/discussions" },
      { label: "Contribution Bible", href: "/awards/contribution-bible" },
    ],
  },
];

const ICONS: Record<string, typeof Film> = {
  Movies: Film,
  "TV Shows": Tv,
  People: Users,
  Awards: Trophy,
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMenuOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0f2438]/95 backdrop-blur-md shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
      style={{ marginTop: "var(--banner-top-height, 0px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button type="button" onClick={() => setMenuOpen(true)} className="text-white p-1" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>

          <Link href="/" className="flex items-center justify-center gap-2">
            <Tv className="w-7 h-7 text-[#01b4e4]" />
            <span className="text-2xl font-black text-[#01b4e4] tracking-tight">XpoGo</span>
          </Link>

          <div className="flex items-center gap-4">
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#01b4e4]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white text-black placeholder-gray-500 text-sm rounded-full pl-9 pr-4 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-[#01b4e4] focus:w-64 transition-all"
                />
              </div>
            </form>
            <button type="button" onClick={() => setMenuOpen(true)} className="sm:hidden text-white p-1" aria-label="Search">
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[380px] bg-[#0f2438] text-white overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 sticky top-0 bg-[#0f2438] z-10">
              <div className="flex items-center gap-2">
                <Clapperboard className="w-5 h-5 text-[#01b4e4]" />
                <span className="font-black text-lg">Menu</span>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="p-1" aria-label="Close menu">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#01b4e4]" />
                <input
                  type="text"
                  placeholder="Search for movies, TV shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-black placeholder-gray-500 text-sm rounded-md pl-9 pr-4 py-2 focus:outline-none"
                />
              </div>
            </form>

            <div className="px-4 py-4 space-y-6">
              {MENU.map((group) => {
                const Icon = ICONS[group.title] ?? Film;
                return (
                  <section key={group.title}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-5 h-5 text-[#01b4e4]" />
                      <h3 className="text-xl font-extrabold">{group.title}</h3>
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors"
                        >
                          <span>{item.label}</span>
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </nav>
  );
}
