import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  formattedDate: string;
  cover?: string;
  coverAlt?: string;
  tags: string[];
};

type BlogExplorerMessages = {
  searchPlaceholder: string;
  filterAll: string;
  moreFilters: string;
  sortLabel: string;
  sortNewest: string;
  sortOldest: string;
  resultsLabel: string;
  emptyTitle: string;
  emptyBody: string;
  clearFilters: string;
  previous: string;
  next: string;
  pageLabel: string;
  readCta: string;
};

interface Props {
  lang: "en" | "es";
  posts: BlogPost[];
  messages: BlogExplorerMessages;
}

const postsPerPage = 6;
const visibleTagLimit = 8;
const extraTagLimit = 24;

export default function BlogExplorer({ lang, posts, messages }: Props) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [showAllTags, setShowAllTags] = useState(false);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [postsVisible, setPostsVisible] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const postsListRef = useRef<HTMLDivElement | null>(null);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => {
      post.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [posts]);

  const visibleTags = tags.slice(0, visibleTagLimit);
  const hiddenTags = tags.slice(visibleTagLimit, visibleTagLimit + extraTagLimit);
  const hiddenTagCount = Math.max(0, tags.length - visibleTagLimit);
  const activeTagIsHidden = activeTag !== "all" && !visibleTags.includes(activeTag);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts
      .filter((post) => {
        const matchesTag = activeTag === "all" || post.tags.includes(activeTag);
        const searchable = [post.title, post.description, ...post.tags].join(" ").toLowerCase();
        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

        return matchesTag && matchesQuery;
      })
      .sort((a, b) => {
        const first = new Date(a.date).getTime();
        const second = new Date(b.date).getTime();
        return sort === "newest" ? second - first : first - second;
      });
  }, [activeTag, posts, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));
  const safePage = Math.min(page, totalPages);
  const visiblePosts = filteredPosts.slice((safePage - 1) * postsPerPage, safePage * postsPerPage);
  const firstVisible = filteredPosts.length === 0 ? 0 : (safePage - 1) * postsPerPage + 1;
  const lastVisible = Math.min(safePage * postsPerPage, filteredPosts.length);

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setControlsVisible(true);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        frame = requestAnimationFrame(() => setControlsVisible(true));
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.15,
      },
    );

    observer.observe(controls);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const list = postsListRef.current;

    if (!list) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setPostsVisible(true);
      return;
    }

    setPostsVisible(false);
    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        frame = requestAnimationFrame(() => setPostsVisible(true));
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.08,
      },
    );

    observer.observe(list);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeTag, query, safePage, sort]);

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setActiveTag("all");
    setShowAllTags(false);
    setSort("newest");
    setPage(1);
  }

  return (
    <div>
      <div
        ref={controlsRef}
        className={[
          "blog-controls-enter border-y border-zinc-200 py-6 dark:border-zinc-800",
          controlsVisible ? "is-visible" : "",
        ].join(" ")}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="group relative block">
            <span className="sr-only">{messages.searchPlaceholder}</span>
            <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-950 dark:text-zinc-500 dark:group-focus-within:text-white">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.4a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder={messages.searchPlaceholder}
              className="h-12 w-full border-0 border-b border-zinc-200 bg-transparent pl-8 pr-3 text-base font-semibold text-zinc-950 outline-none transition-colors placeholder:font-medium placeholder:text-zinc-400 focus:border-zinc-950 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white"
              type="search"
            />
          </label>

          <div className="flex rounded-full border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/70" aria-label={messages.sortLabel}>
            <button
              type="button"
              onClick={() => {
                setSort("newest");
                resetPage();
              }}
              className={sortButtonClass(sort === "newest")}
            >
              {messages.sortNewest}
            </button>
            <button
              type="button"
              onClick={() => {
                setSort("oldest");
                resetPage();
              }}
              className={sortButtonClass(sort === "oldest")}
            >
              {messages.sortOldest}
            </button>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="relative mt-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTag("all");
                  resetPage();
                }}
                className={tagButtonClass(activeTag === "all")}
              >
                {messages.filterAll}
              </button>
              {visibleTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setActiveTag(tag);
                    resetPage();
                  }}
                  className={tagButtonClass(activeTag === tag)}
                >
                  {tag}
                </button>
              ))}
              {activeTagIsHidden && (
                <button type="button" className={tagButtonClass(true)} onClick={() => setShowAllTags(true)}>
                  {activeTag}
                </button>
              )}
              {hiddenTagCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllTags((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:border-zinc-950 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-white dark:hover:text-white"
                  aria-expanded={showAllTags}
                >
                  {messages.moreFilters}
                  <span className="text-zinc-400">+{hiddenTagCount}</span>
                </button>
              )}
            </div>

            {showAllTags && hiddenTags.length > 0 && (
              <div className="mt-4 max-h-44 overflow-y-auto border-l border-zinc-200 pl-4 dark:border-zinc-800">
                <div className="flex flex-wrap gap-2">
                  {hiddenTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setActiveTag(tag);
                        setShowAllTags(false);
                        resetPage();
                      }}
                      className={tagButtonClass(activeTag === tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {messages.resultsLabel
            .replace("{start}", String(firstVisible))
            .replace("{end}", String(lastVisible))
            .replace("{total}", String(filteredPosts.length))}
        </p>
      </div>

      {visiblePosts.length > 0 ? (
        <div ref={postsListRef} className="divide-y divide-zinc-200 border-b border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {visiblePosts.map((post, index) => (
            <article
              key={`${post.slug}-${query}-${activeTag}-${sort}-${safePage}`}
              className={[
                "blog-post-enter group grid gap-5 py-8 sm:grid-cols-[8rem_minmax(0,1fr)]",
                postsVisible ? "is-visible" : "",
              ].join(" ")}
              style={{ "--blog-post-delay": `${Math.min(index * 70, 420)}ms` } as CSSProperties}
            >
              <time dateTime={post.date} className="text-sm font-medium text-zinc-400">
                {post.formattedDate}
              </time>
              <div>
                <a
                  href={`/${lang}/blog/${post.slug}/`}
                  className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start md:grid-cols-[minmax(0,1fr)_16rem]"
                >
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight transition-colors group-hover:text-sky-600 dark:group-hover:text-sky-400 sm:text-3xl">
                      {post.title}
                    </h2>
                    <p className="mt-4 max-w-2xl leading-7 text-zinc-500 dark:text-zinc-400">
                      {post.description}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-950 dark:text-white">
                        {messages.readCta}
                        <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                  {post.cover && (
                    <div className="order-first aspect-[16/10] overflow-hidden bg-zinc-100 dark:bg-zinc-900 sm:order-none">
                      <img
                        src={post.cover}
                        alt={post.coverAlt ?? ""}
                        className="h-full w-full object-cover object-center opacity-95 transition-transform duration-700 group-hover:scale-[1.04] group-hover:opacity-100"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border-b border-zinc-200 py-14 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">{messages.emptyTitle}</h2>
          <p className="mt-3 max-w-lg leading-7 text-zinc-500 dark:text-zinc-400">{messages.emptyBody}</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {messages.clearFilters}
          </button>
        </div>
      )}

      {filteredPosts.length > postsPerPage && (
        <nav className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between" aria-label={messages.pageLabel}>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {messages.pageLabel} {safePage} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="h-11 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-950 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-white"
            >
              {messages.previous}
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={[
                  "grid size-11 place-items-center rounded-full border text-sm font-semibold transition-colors",
                  pageNumber === safePage
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-white",
                ].join(" ")}
                aria-current={pageNumber === safePage ? "page" : undefined}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="h-11 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-950 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-white"
            >
              {messages.next}
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

function tagButtonClass(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
    active
      ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-950 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-white dark:hover:text-white",
  ].join(" ");
}

function sortButtonClass(active: boolean) {
  return [
    "h-9 rounded-full px-4 text-xs font-semibold transition-colors",
    active
      ? "bg-white text-zinc-950 shadow-sm shadow-zinc-950/5 dark:bg-zinc-800 dark:text-white"
      : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white",
  ].join(" ");
}
