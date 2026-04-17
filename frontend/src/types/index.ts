export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string | null;
  bio?: string | null;
  status?: 'active' | 'suspended';
}

export interface Video {
  id: number;
  title: string;
  description?: string;
  url: string;
  cover_url?: string;
  category: string;
  views: number;
  likes: number;
  duration: number;
  status?: 'published' | 'draft' | 'blocked';
  user?: Pick<User, 'id' | 'username' | 'avatar'>;
  _count?: { comments: number };
}

export type FeedContentType = 'video' | 'image' | 'article';

export interface FeedItem {
  id: string;
  kind: FeedContentType;
  title: string;
  description: string;
  category: string;
  coverUrl?: string;
  body?: string;
  createdAt: string;
  views?: number;
  likesBase?: number;
  source: 'remote' | 'local';
  routeTo?: string;
}

export interface CommentItem {
  id: number;
  video_id: number;
  user_id: number;
  content: string;
  parent_id?: number | null;
  reply_to_user_id?: number | null;
  created_at: string;
  replies?: CommentItem[];
  replyToUser?: Pick<User, 'id' | 'username' | 'avatar' | 'role' | 'status'> | null;
  user?: Pick<User, 'id' | 'username' | 'avatar' | 'role' | 'status'>;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  creator_id?: number;
}

export interface ContentItem {
  id: number;
  type: 'video' | 'image' | 'article';
  status?: 'pending' | 'published' | 'rejected';
  title: string;
  summary?: string | null;
  body?: string | null;
  cover_url?: string | null;
  media_url?: string | null;
  views: number;
  created_at: string;
  reviewed_at?: string | null;
  category: Pick<CategoryItem, 'id' | 'name' | 'slug'>;
  author?: Pick<User, 'id' | 'username' | 'avatar'>;
  tags?: Array<{ tag: { id: number; name: string; slug: string } }>;
  liked?: boolean;
  favored?: boolean;
  _count?: {
    likes: number;
    favoriteItems: number;
    comments: number;
  };
}
