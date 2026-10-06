import { useAuth0 } from "@auth0/auth0-react";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowUpRight,
  AtSign,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  Feather,
  Heart,
  Home as HomeIcon,
  ImagePlus,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  PawPrint,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type Section = "Home" | "Explore" | "Profile";

type CreatorProfile = {
  userId: number;
  handle: string;
  displayName: string;
  fursonaName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarKey?: string | null;
  isCreator: boolean;
};

type FurrioPost = {
  id: number;
  imageUrl: string;
  imageKey: string;
  caption: string | null;
  createdAt: Date | string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  author: CreatorProfile;
};

type CreatorCard = CreatorProfile & {
  followerCount: number;
  postCount: number;
  followedByViewer: boolean;
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase() || "F";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatTime(value: Date | string) {
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Avatar({ src, label, size = "md" }: { src?: string | null; label: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <div className={`furrio-avatar furrio-avatar--${size}`} aria-label={`${label}'s avatar`}>
      {src ? <img src={src} alt="" /> : <span>{initials(label)}</span>}
    </div>
  );
}

function LoadingTile({ rows = 3 }: { rows?: number }) {
  return (
    <div className="loading-tile" aria-label="Loading content">
      {Array.from({ length: rows }, (_, index) => <span key={index} />)}
    </div>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state__mark"><Sparkles size={22} /></span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

function FollowButton({ creator, isAuthenticated, onLogin }: { creator: CreatorCard | CreatorProfile; isAuthenticated: boolean; onLogin: () => void }) {
  const utils = trpc.useUtils();
  const follow = trpc.social.toggleFollow.useMutation({
    onSuccess: () => {
      utils.social.home.invalidate();
      utils.social.explore.invalidate();
      utils.social.profile.invalidate();
      toast.success("Your circle has been updated.");
    },
    onError: error => toast.error(error.message),
  });
  const followed = "followedByViewer" in creator && creator.followedByViewer;
  return (
    <button
      className={`follow-button ${followed ? "follow-button--active" : ""}`}
      disabled={follow.isPending}
      onClick={() => (isAuthenticated ? follow.mutate({ userId: creator.userId }) : onLogin())}
    >
      {followed ? <><Check size={14} /> Following</> : <><Plus size={14} /> Follow</>}
    </button>
  );
}

function PostCard({ post, isAuthenticated, onLogin, onTag, onProfile }: { post: FurrioPost; isAuthenticated: boolean; onLogin: () => void; onTag: (tag: string) => void; onProfile: (handle: string) => void }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const utils = trpc.useUtils();
  const commentsQuery = trpc.social.comments.useQuery({ postId: post.id }, { enabled: commentsOpen });
  const like = trpc.social.toggleLike.useMutation({
    onSuccess: () => {
      utils.social.home.invalidate();
      utils.social.explore.invalidate();
      utils.social.mine.invalidate();
      utils.social.profile.invalidate();
      utils.social.hashtag.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const addComment = trpc.social.addComment.useMutation({
    onSuccess: () => {
      setComment("");
      utils.social.comments.invalidate({ postId: post.id });
      utils.social.home.invalidate();
      utils.social.explore.invalidate();
      utils.social.mine.invalidate();
      utils.social.profile.invalidate();
      utils.social.hashtag.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return onLogin();
    if (comment.trim()) addComment.mutate({ postId: post.id, body: comment.trim() });
  };

  return (
    <article className="post-card">
      <div className="post-card__header">
        <button className="identity-button" onClick={() => onProfile(post.author.handle)}>
          <Avatar src={post.author.avatarUrl} label={post.author.displayName} size="md" />
          <span>
            <strong>{post.author.displayName}</strong>
            <small>@{post.author.handle} <i>·</i> {formatTime(post.createdAt)}</small>
          </span>
        </button>
        <button className="icon-button" aria-label="More post options"><MoreHorizontal size={19} /></button>
      </div>
      <div className="post-card__media">
        <img src={post.imageUrl} alt={post.caption || `Artwork by ${post.author.displayName}`} />
      </div>
      <div className="post-card__actions">
        <button className={post.likedByViewer ? "reaction-button reaction-button--liked" : "reaction-button"} onClick={() => (isAuthenticated ? like.mutate({ postId: post.id }) : onLogin())} disabled={like.isPending} aria-label="Like post">
          <Heart size={20} fill={post.likedByViewer ? "currentColor" : "none"} />
          <span>{formatCount(post.likeCount)}</span>
        </button>
        <button className="reaction-button" onClick={() => setCommentsOpen(true)} aria-label="Open comments"><MessageCircle size={20} /><span>{formatCount(post.commentCount)}</span></button>
        <button className="reaction-button reaction-button--share" onClick={() => toast.message("Sharing controls are being prepared for Furrio.")} aria-label="Share post"><Send size={19} /></button>
        <button className="reaction-button reaction-button--share" onClick={() => toast.message("Saved collections are coming soon.")} aria-label="Save post"><Bookmark size={19} /></button>
      </div>
      {(post.caption || post.tags.length > 0) && <div className="post-card__copy">
        {post.caption && <p><button onClick={() => onProfile(post.author.handle)}>{post.author.displayName}</button>{" "}{post.caption}</p>}
        {post.tags.length > 0 && <div className="tag-row">{post.tags.map(tag => <button key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</div>}
      </div>}

      {commentsOpen && <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Post comments">
        <div className="comment-drawer">
          <div className="drawer-heading"><div><span className="eyebrow">Conversation</span><h2>Comments</h2></div><button className="icon-button" onClick={() => setCommentsOpen(false)} aria-label="Close comments"><X size={20} /></button></div>
          <div className="comment-drawer__body">
            {commentsQuery.isLoading && <LoadingTile rows={4} />}
            {commentsQuery.data?.length === 0 && <EmptyState title="Start a kind conversation" body="Thoughtful comments make the community feel like home." />}
            {commentsQuery.data?.map(({ comment: item, profile }) => <div className="comment" key={item.id}>
              <Avatar src={profile.avatarUrl} label={profile.displayName} size="sm" />
              <div><strong>{profile.displayName}</strong><span>@{profile.handle} · {formatTime(item.createdAt)}</span><p>{item.body}</p></div>
            </div>)}
          </div>
          <form className="comment-form" onSubmit={submitComment}>
            <input value={comment} onChange={event => setComment(event.target.value)} placeholder={isAuthenticated ? "Add something thoughtful…" : "Sign in to leave a comment"} disabled={addComment.isPending} maxLength={1000} />
            <button type="submit" className="send-button" aria-label="Submit comment" disabled={addComment.isPending}><ArrowUpRight size={19} /></button>
          </form>
        </div>
      </div>}
    </article>
  );
}

function Composer({ isAuthenticated, onLogin }: { isAuthenticated: boolean; onLogin: () => void }) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const upload = trpc.media.uploadImage.useMutation({ onError: error => toast.error(error.message) });
  const create = trpc.social.createPost.useMutation({
    onSuccess: () => {
      setOpen(false);
      setCaption("");
      setPreview(null);
      setFileData(null);
      utils.social.home.invalidate();
      utils.social.explore.invalidate();
      utils.social.mine.invalidate();
      toast.success("Your creation is now part of Furrio.");
    },
    onError: error => toast.error(error.message),
  });
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("Choose an image smaller than 4 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      setFileData(data);
      setPreview(data);
    };
    reader.readAsDataURL(file);
  };
  const publish = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return onLogin();
    if (!fileData) return toast.error("Add an image to continue.");
    try {
      const uploaded = await upload.mutateAsync({ dataUrl: fileData, purpose: "post" });
      await create.mutateAsync({ imageUrl: uploaded.url, imageKey: uploaded.key, caption });
    } catch {
      // The mutation shows a user-facing error toast.
    }
  };
  return <>
    <button className="compose-cta" onClick={() => (isAuthenticated ? setOpen(true) : onLogin())}><span><ImagePlus size={19} /></span><span><strong>Share a creation</strong><small>Bring your next piece into the pack</small></span><ChevronRight size={18} /></button>
    {open && <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Create a post">
      <form className="compose-modal" onSubmit={publish}>
        <div className="drawer-heading"><div><span className="eyebrow">New creation</span><h2>Share something vivid</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close post composer"><X size={20} /></button></div>
        <label className={`upload-well ${preview ? "upload-well--filled" : ""}`}>
          {preview ? <img src={preview} alt="Selected post preview" /> : <><ImagePlus size={30} /><strong>Choose a visual to share</strong><span>PNG, JPEG, or WebP · up to 4 MB</span></>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
        </label>
        <label className="field-label">Caption<textarea value={caption} onChange={event => setCaption(event.target.value)} maxLength={2000} placeholder="What would you like the community to know? Add tags like #art or #fursona." /></label>
        <div className="compose-modal__footer"><span>Public to the Furrio community</span><button className="primary-button" type="submit" disabled={upload.isPending || create.isPending}>{upload.isPending || create.isPending ? "Publishing…" : "Publish creation"}<ArrowUpRight size={17} /></button></div>
      </form>
    </div>}
  </>;
}

function EditProfile({ profile, onClose }: { profile: CreatorProfile; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [fursonaName, setFursonaName] = useState(profile.fursonaName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [creator, setCreator] = useState(profile.isCreator);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl || null);
  const utils = trpc.useUtils();
  const upload = trpc.media.uploadImage.useMutation({ onError: error => toast.error(error.message) });
  const save = trpc.social.updateProfile.useMutation({
    onSuccess: () => {
      utils.social.mine.invalidate();
      utils.social.home.invalidate();
      utils.social.explore.invalidate();
      onClose();
      toast.success("Your public identity has been refreshed.");
    },
    onError: error => toast.error(error.message),
  });
  const onAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("Choose an image smaller than 4 MB.");
    const reader = new FileReader();
    reader.onload = () => { const data = String(reader.result || ""); setAvatarData(data); setAvatarPreview(data); };
    reader.readAsDataURL(file);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const uploaded = avatarData ? await upload.mutateAsync({ dataUrl: avatarData, purpose: "avatar" }) : undefined;
      await save.mutateAsync({
        displayName,
        handle,
        fursonaName: fursonaName.trim() || null,
        bio: bio.trim() || null,
        isCreator: creator,
        avatarUrl: uploaded?.url ?? profile.avatarUrl ?? null,
        avatarKey: uploaded?.key ?? profile.avatarKey ?? null,
      });
    } catch {
      // The mutation shows a user-facing error toast.
    }
  };
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Edit profile"><form className="profile-editor" onSubmit={submit}>
    <div className="drawer-heading"><div><span className="eyebrow">Your public identity</span><h2>Shape your profile</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close profile editor"><X size={20} /></button></div>
    <div className="editor-avatar"><Avatar src={avatarPreview} label={displayName || "Furrio member"} size="xl" /><label className="secondary-button">Change photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatar} /></label></div>
    <div className="two-fields"><label className="field-label">Display name<input value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={1} maxLength={80} required /></label><label className="field-label">Handle<div className="input-with-icon"><AtSign size={16} /><input value={handle} onChange={event => setHandle(event.target.value.toLowerCase())} pattern="[a-z0-9_]{3,32}" minLength={3} maxLength={32} required /></div></label></div>
    <label className="field-label">Fursona name<input value={fursonaName} onChange={event => setFursonaName(event.target.value)} maxLength={80} placeholder="How does your fursona answer the call?" /></label>
    <label className="field-label">Bio<textarea value={bio} onChange={event => setBio(event.target.value)} maxLength={500} placeholder="A few words about your world…" /></label>
    <label className="creator-toggle"><input type="checkbox" checked={creator} onChange={event => setCreator(event.target.checked)} /><span><strong>Creator profile</strong><small>Present your work and build your audience on Furrio.</small></span></label>
    <div className="editor-footer"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={save.isPending || upload.isPending}>{save.isPending || upload.isPending ? "Saving…" : "Save profile"}<Check size={17} /></button></div>
  </form></div>;
}

function Sidebar({ active, onSelect, isAuthenticated, onLogin }: { active: Section; onSelect: (section: Section) => void; isAuthenticated: boolean; onLogin: () => void }) {
  const items: { name: Section; icon: typeof HomeIcon }[] = [{ name: "Home", icon: HomeIcon }, { name: "Explore", icon: Compass }, { name: "Profile", icon: UserRound }];
  return <aside className="sidebar"><button className="wordmark" onClick={() => onSelect("Home")}><span><PawPrint size={22} /></span>Furrio</button><nav className="side-nav" aria-label="Primary navigation">{items.map(item => { const Icon = item.icon; return <button key={item.name} className={active === item.name ? "side-nav__item side-nav__item--active" : "side-nav__item"} onClick={() => isAuthenticated || item.name !== "Profile" ? onSelect(item.name) : onLogin()}><Icon size={19} />{item.name}</button>; })}</nav><div className="sidebar__bottom"><div className="sidebar-note"><Sparkles size={17} /><span><strong>Kindness is the culture.</strong><small>Share with care, celebrate freely.</small></span></div><button className="side-nav__item" onClick={() => toast.message("Community guidelines will be available before launch.")}><Settings2 size={18} />Community guide</button></div></aside>;
}

function RightRail({ creators, tags, isAuthenticated, onLogin, onProfile, onTag }: { creators: CreatorCard[]; tags: { name: string; postCount: number }[]; isAuthenticated: boolean; onLogin: () => void; onProfile: (handle: string) => void; onTag: (tag: string) => void }) {
  return <aside className="right-rail"><section className="rail-card"><div className="rail-heading"><div><span className="eyebrow">Discover</span><h3>Creativity, in motion</h3></div><Compass size={18} /></div><p>Find visual stories, maker-led worlds, and kindred spirits from across the community.</p><button className="rail-link" onClick={() => toast.message("Use Explore to see the community unfold.")}>Browse the community <ArrowUpRight size={15} /></button></section>
    <section className="rail-section"><div className="section-header"><h3>Creators to know</h3><button onClick={() => toast.message("Explore will surface more creators as the community grows.")}>See all</button></div>{creators.length ? creators.slice(0, 4).map(creator => <div className="creator-row" key={creator.userId}><button className="identity-button" onClick={() => onProfile(creator.handle)}><Avatar src={creator.avatarUrl} label={creator.displayName} size="sm" /><span><strong>{creator.displayName}</strong><small>@{creator.handle}</small></span></button><FollowButton creator={creator} isAuthenticated={isAuthenticated} onLogin={onLogin} /></div>) : <p className="rail-empty">Creator recommendations will appear as members share their work.</p>}</section>
    <section className="rail-section"><div className="section-header"><h3>On the trail</h3></div>{tags.length ? <div className="trail-tags">{tags.slice(0, 6).map(tag => <button key={tag.name} onClick={() => onTag(tag.name)}><span>#{tag.name}</span><small>{formatCount(Number(tag.postCount))} posts</small></button>)}</div> : <p className="rail-empty">Trending tags will gather here once the first posts arrive.</p>}</section>
  </aside>;
}

function HomeView({ isAuthenticated, onLogin, onTag, onProfile }: { isAuthenticated: boolean; onLogin: () => void; onTag: (tag: string) => void; onProfile: (handle: string) => void }) {
  const home = trpc.social.home.useQuery();
  const posts = (home.data?.posts || []) as FurrioPost[];
  return <><header className="page-heading"><div><span className="eyebrow">Your circle</span><h1>Home</h1><p>Fresh visual stories from the community.</p></div><button className="heading-icon" onClick={() => toast.message("Your feed refreshes whenever new creations arrive.")} aria-label="Feed information"><Sparkles size={18} /></button></header><Composer isAuthenticated={isAuthenticated} onLogin={onLogin} /><div className="feed-stack">{home.isLoading && <><LoadingTile rows={5} /><LoadingTile rows={4} /></>}{!home.isLoading && posts.length === 0 && <EmptyState title="The feed is waiting for its first spark" body="Share an image, add a few words, and help set the tone for the Furrio community." action={<button className="primary-button" onClick={onLogin}>Enter Furrio <ArrowUpRight size={17} /></button>} />}{posts.map(post => <PostCard key={post.id} post={post} isAuthenticated={isAuthenticated} onLogin={onLogin} onTag={onTag} onProfile={onProfile} />)}</div></>;
}

function ExploreView({ isAuthenticated, onLogin, onTag, onProfile, selectedTag, onClearTag }: { isAuthenticated: boolean; onLogin: () => void; onTag: (tag: string) => void; onProfile: (handle: string) => void; selectedTag: string | null; onClearTag: () => void }) {
  const explore = trpc.social.explore.useQuery(undefined, { enabled: !selectedTag });
  const tagQuery = trpc.social.hashtag.useQuery({ name: selectedTag || "furrio" }, { enabled: Boolean(selectedTag) });
  const posts = (selectedTag ? tagQuery.data?.posts : explore.data?.posts || []) as FurrioPost[];
  const creators = (explore.data?.creators || []) as CreatorCard[];
  const tags = explore.data?.tags || [];
  const loading = selectedTag ? tagQuery.isLoading : explore.isLoading;
  return <><header className="page-heading page-heading--explore"><div><span className="eyebrow">Beyond your circle</span><h1>{selectedTag ? `#${selectedTag}` : "Explore"}</h1><p>{selectedTag ? "A visual trail shaped by this shared tag." : "Follow the ideas, people, and visual worlds gaining momentum."}</p></div>{selectedTag ? <button className="secondary-button" onClick={onClearTag}><ArrowLeft size={16} />All discovery</button> : <button className="heading-icon" onClick={() => toast.message("Discovery grows naturally from public community activity.")} aria-label="Explore information"><Search size={18} /></button>}</header>
    {!selectedTag && <section className="tag-spotlight"><div><span className="eyebrow">Popular pathways</span><h2>Find a shared thread</h2></div><div className="tag-spotlight__list">{tags.length ? tags.slice(0, 6).map(tag => <button key={tag.name} onClick={() => onTag(tag.name)}><span>#{tag.name}</span><small>{formatCount(Number(tag.postCount))} creations</small></button>) : <span className="empty-inline">The community’s most-used tags will gather here.</span>}</div></section>}
    {!selectedTag && <section className="creator-discovery"><div className="section-header"><div><span className="eyebrow">Makers & muses</span><h2>Meet the community</h2></div></div>{creators.length ? <div className="creator-grid">{creators.map(creator => <article className="creator-card" key={creator.userId}><button className="creator-card__identity" onClick={() => onProfile(creator.handle)}><Avatar src={creator.avatarUrl} label={creator.displayName} size="lg" /><div><h3>{creator.displayName}</h3><p>@{creator.handle}</p></div></button><p className="creator-card__bio">{creator.bio || "A new voice in the Furrio community."}</p><div className="creator-card__meta"><span>{formatCount(creator.postCount)} posts</span><span>{formatCount(creator.followerCount)} followers</span></div><FollowButton creator={creator} isAuthenticated={isAuthenticated} onLogin={onLogin} /></article>)}</div> : <EmptyState title="A fresh canvas for discovery" body="Creator profiles will appear here as members begin sharing their worlds." />}</section>}
    <section className="explore-feed"><div className="section-header"><div><span className="eyebrow">{selectedTag ? "Tag feed" : "Popular now"}</span><h2>{selectedTag ? `Posts tagged #${selectedTag}` : "Community highlights"}</h2></div></div><div className="feed-stack">{loading && <LoadingTile rows={5} />}{!loading && posts.length === 0 && <EmptyState title="No creations on this trail yet" body={selectedTag ? "Be the first to share something using this tag." : "Popular community creations will appear here as members begin posting."} />}{posts.map(post => <PostCard key={post.id} post={post} isAuthenticated={isAuthenticated} onLogin={onLogin} onTag={onTag} onProfile={onProfile} />)}</div></section></>;
}

function ProfileView({ isAuthenticated, onLogin, handle, onBack, onTag, onProfile }: { isAuthenticated: boolean; onLogin: () => void; handle: string | null; onBack: () => void; onTag: (tag: string) => void; onProfile: (handle: string) => void }) {
  const [editing, setEditing] = useState(false);
  const mine = trpc.social.mine.useQuery(undefined, { enabled: isAuthenticated && !handle });
  const publicProfile = trpc.social.profile.useQuery({ handle: handle || "furrio" }, { enabled: Boolean(handle) });
  if (!isAuthenticated && !handle) return <div className="auth-empty"><span className="empty-state__mark"><PawPrint size={22} /></span><span className="eyebrow">Your corner of Furrio</span><h1>Make a profile that feels like you.</h1><p>Share your fursona, your creations, and the people whose worlds you want to follow.</p><button className="primary-button" onClick={onLogin}>Create your profile <ArrowUpRight size={17} /></button></div>;
  const profileData = handle ? publicProfile.data : mine.data;
  const profile = profileData?.profile as CreatorProfile | undefined;
  const posts = (profileData?.posts || []) as FurrioPost[];
  const owner = !handle || (isAuthenticated && profile?.handle === (mine.data?.profile as CreatorProfile | undefined)?.handle);
  const followerCount = Number(profileData?.followerCount || 0);
  const followingCount = Number(profileData?.followingCount || 0);
  const publicCreator: CreatorCard | undefined = profile ? { ...profile, followerCount, followingCount, postCount: posts.length, followedByViewer: Boolean((profileData as { followedByViewer?: boolean } | undefined)?.followedByViewer) } as CreatorCard : undefined;
  if ((handle ? publicProfile.isLoading : mine.isLoading) || !profile) return <><header className="page-heading"><div><span className="eyebrow">Public identity</span><h1>Profile</h1></div></header><LoadingTile rows={6} /></>;
  return <><header className="page-heading">{handle ? <button className="back-link" onClick={onBack}><ArrowLeft size={17} />Back to you</button> : <div><span className="eyebrow">Public identity</span><h1>Profile</h1><p>Everything you choose to bring into the open.</p></div>}</header><section className="profile-hero"><div className="profile-hero__ambient" /><div className="profile-hero__top"><Avatar src={profile.avatarUrl} label={profile.displayName} size="xl" /><div className="profile-hero__actions">{owner ? <button className="secondary-button" onClick={() => setEditing(true)}><Settings2 size={16} />Edit profile</button> : publicCreator && <FollowButton creator={publicCreator} isAuthenticated={isAuthenticated} onLogin={onLogin} />}</div></div><div className="profile-hero__identity"><span className="eyebrow">{profile.isCreator ? "Creator profile" : "Furrio member"}</span><h2>{profile.displayName}</h2><p className="profile-handle">@{profile.handle}{profile.fursonaName && <><i>·</i>{profile.fursonaName}</>}</p><p className="profile-bio">{profile.bio || "This member is shaping their corner of Furrio."}</p></div><div className="profile-stats"><span><strong>{formatCount(posts.length)}</strong> creations</span><span><strong>{formatCount(followerCount)}</strong> followers</span><span><strong>{formatCount(followingCount)}</strong> following</span></div></section><section className="profile-posts"><div className="section-header"><div><span className="eyebrow">Visual archive</span><h2>{owner ? "Your creations" : `${profile.displayName}'s creations`}</h2></div>{owner && <span className="post-count">{posts.length} published</span>}</div>{posts.length ? <div className="post-grid">{posts.map(post => <article className="post-grid__item" key={post.id}><img src={post.imageUrl} alt={post.caption || `Artwork by ${profile.displayName}`} /><div><Heart size={15} fill="currentColor" />{formatCount(post.likeCount)}<MessageCircle size={15} />{formatCount(post.commentCount)}</div></article>)}</div> : <EmptyState title={owner ? "Your archive is ready" : "No public creations yet"} body={owner ? "Your posted images will form a rich visual archive here." : "When this member shares a creation, it will appear in their public archive."} />}</section>{editing && <EditProfile profile={profile} onClose={() => setEditing(false)} />}</>;
}

export default function FurrioApp() {
  const { user, isLoading: authLoading, isAuthenticated, logout, loginWithRedirect } = useAuth0();
  const [active, setActive] = useState<Section>("Home");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const home = trpc.social.home.useQuery();
  const explore = trpc.social.explore.useQuery();
  const creators = ((active === "Home" ? home.data?.creators : explore.data?.creators) || []) as CreatorCard[];
  const tags = explore.data?.tags || [];
  const chooseSection = (section: Section) => { setActive(section); if (section !== "Explore") setSelectedTag(null); if (section !== "Profile") setSelectedProfile(null); };
  const viewTag = (tag: string) => { setSelectedTag(tag); setSelectedProfile(null); setActive("Explore"); };
  const viewProfile = (handle: string) => { setSelectedProfile(handle); setSelectedTag(null); setActive("Profile"); };
  if (authLoading) return <div className="app-loading"><PawPrint size={26} /><span>Entering Furrio</span></div>;
  const startLogin = () => loginWithRedirect({ authorizationParams: { screen_hint: "login" } });
  const startJoin = () => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });
  const displayName = user?.name || user?.email || "Furrio member";
  return <div className="furrio-app"><Sidebar active={active} onSelect={chooseSection} isAuthenticated={isAuthenticated} onLogin={startLogin} /><main className="main-column"><header className="mobile-header"><button className="wordmark" onClick={() => chooseSection("Home")}><span><PawPrint size={20} /></span>Furrio</button><button className="icon-button" onClick={() => isAuthenticated ? chooseSection("Profile") : startLogin()} aria-label="Open profile"><Avatar label={displayName} size="sm" /></button></header>{active === "Home" && <HomeView isAuthenticated={isAuthenticated} onLogin={startLogin} onTag={viewTag} onProfile={viewProfile} />}{active === "Explore" && <ExploreView isAuthenticated={isAuthenticated} onLogin={startLogin} onTag={viewTag} onProfile={viewProfile} selectedTag={selectedTag} onClearTag={() => setSelectedTag(null)} />}{active === "Profile" && <ProfileView isAuthenticated={isAuthenticated} onLogin={startLogin} handle={selectedProfile} onBack={() => setSelectedProfile(null)} onTag={viewTag} onProfile={viewProfile} />}</main><RightRail creators={creators} tags={tags} isAuthenticated={isAuthenticated} onLogin={startLogin} onProfile={viewProfile} onTag={viewTag} /><div className="account-dock">{isAuthenticated ? <><Avatar label={displayName} size="sm" /><div><strong>{displayName}</strong><small>Signed in</small></div><button className="icon-button" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} aria-label="Sign out"><LogOut size={17} /></button></> : <button className="primary-button" onClick={startJoin}>Join Furrio <ArrowUpRight size={16} /></button>}</div><nav className="mobile-nav" aria-label="Mobile navigation">{([{ name: "Home", icon: HomeIcon }, { name: "Explore", icon: Compass }, { name: "Profile", icon: UserRound }] as const).map(item => { const Icon = item.icon; return <button key={item.name} className={active === item.name ? "mobile-nav__item mobile-nav__item--active" : "mobile-nav__item"} onClick={() => isAuthenticated || item.name !== "Profile" ? chooseSection(item.name) : startLogin()}><Icon size={19} /><span>{item.name}</span></button>; })}</nav></div>;
}
