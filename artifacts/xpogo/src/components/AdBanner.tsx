import { useEffect, useRef } from "react";

interface Ad {
  id: string;
  type: "banner-top" | "banner-bottom" | "popunder";
  label: string;
  code: string;
  active: boolean;
}

interface AdBannerProps {
  ads: Ad[];
}

function BannerSlot({ ad }: { ad: Ad }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const range = document.createRange();
    range.selectNode(ref.current);
    const fragment = range.createContextualFragment(ad.code);
    ref.current.appendChild(fragment);
  }, [ad.code]);

  return <div ref={ref} className="w-full overflow-hidden" />;
}

function PopunderSlot({ ad }: { ad: Ad }) {
  useEffect(() => {
    const key = `popunder_fired_${ad.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    try {
      const el = document.createElement("div");
      el.style.display = "none";
      el.innerHTML = ad.code;
      const scripts = el.querySelectorAll("script");
      scripts.forEach((s) => {
        const ns = document.createElement("script");
        if (s.src) {
          ns.src = s.src;
        } else {
          ns.textContent = s.textContent;
        }
        ns.async = true;
        document.body.appendChild(ns);
      });
    } catch {
    }
  }, [ad.id, ad.code]);
  return null;
}

export default function AdBanner({ ads }: AdBannerProps) {
  const active = ads.filter((a) => a.active);

  const bannerTop = active.filter((a) => a.type === "banner-top");
  const bannerBottom = active.filter((a) => a.type === "banner-bottom");
  const popunders = active.filter((a) => a.type === "popunder");

  return (
    <>
      {bannerTop.length > 0 && (
        <div
          id="ad-banner-top"
          className="fixed top-0 left-0 right-0 z-[9999] bg-black"
        >
          {bannerTop.map((ad) => (
            <BannerSlot key={ad.id} ad={ad} />
          ))}
        </div>
      )}
      {bannerBottom.length > 0 && (
        <div
          id="ad-banner-bottom"
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-black"
        >
          {bannerBottom.map((ad) => (
            <BannerSlot key={ad.id} ad={ad} />
          ))}
        </div>
      )}
      {popunders.map((ad) => (
        <PopunderSlot key={ad.id} ad={ad} />
      ))}
    </>
  );
}
