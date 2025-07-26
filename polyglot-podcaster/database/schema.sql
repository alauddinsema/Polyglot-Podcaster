-- Polyglot Podcaster Database Schema
-- This schema supports the complete AI-powered content repurposing workflow

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'hobby' CHECK (subscription_tier IN ('hobby', 'creator', 'pro')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
    subscription_id TEXT, -- Lemon Squeezy subscription ID
    monthly_uploads_used INTEGER DEFAULT 0,
    monthly_uploads_limit INTEGER DEFAULT 1, -- hobby: 1, creator: 10, pro: unlimited (-1)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Podcasts/Episodes table
CREATE TABLE public.podcasts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    description TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_url TEXT NOT NULL, -- Supabase Storage URL
    mime_type TEXT,
    duration_seconds INTEGER,
    target_language TEXT DEFAULT 'es', -- Target language for translation
    processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'transcribing', 'translating', 'generating', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE public.transcripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    confidence_score DECIMAL(3,2), -- AI confidence score
    word_count INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Translations table
CREATE TABLE public.translations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
    transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    target_language TEXT NOT NULL,
    source_language TEXT DEFAULT 'en',
    word_count INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Summaries table
CREATE TABLE public.summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    summary_type TEXT DEFAULT 'brief' CHECK (summary_type IN ('brief', 'detailed', 'key_points')),
    language TEXT DEFAULT 'en',
    word_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Show notes table
CREATE TABLE public.show_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'html', 'plain')),
    language TEXT DEFAULT 'en',
    sections JSONB, -- Structured sections like intro, main_points, conclusion
    timestamps JSONB, -- Key timestamps and topics
    word_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media posts table
CREATE TABLE public.social_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'facebook', 'instagram')),
    content TEXT NOT NULL,
    hashtags TEXT[],
    character_count INTEGER,
    language TEXT DEFAULT 'en',
    post_type TEXT DEFAULT 'single' CHECK (post_type IN ('single', 'thread', 'carousel')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blog articles table
CREATE TABLE public.blog_articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    podcast_id UUID REFERENCES public.podcasts(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    slug TEXT,
    format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'html')),
    language TEXT DEFAULT 'en',
    seo_title TEXT,
    seo_description TEXT,
    tags TEXT[],
    word_count INTEGER,
    reading_time_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE public.usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'transcribe', 'translate', 'generate_content')),
    resource_type TEXT CHECK (resource_type IN ('podcast', 'transcript', 'translation', 'summary', 'show_notes', 'social_post', 'blog_article')),
    resource_id UUID,
    api_provider TEXT CHECK (api_provider IN ('huggingface', 'gemini')),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    cost_cents INTEGER, -- Track costs in cents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table (synced with Lemon Squeezy)
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lemon_squeezy_id TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    status TEXT NOT NULL,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    billing_anchor TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for podcasts
CREATE POLICY "Users can view own podcasts" ON public.podcasts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own podcasts" ON public.podcasts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own podcasts" ON public.podcasts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own podcasts" ON public.podcasts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for content tables (transcripts, translations, etc.)
-- These policies check ownership through the podcast relationship

CREATE POLICY "Users can view own transcripts" ON public.transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.podcasts
            WHERE podcasts.id = transcripts.podcast_id
            AND podcasts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own translations" ON public.translations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.podcasts
            WHERE podcasts.id = translations.podcast_id
            AND podcasts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own summaries" ON public.summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.podcasts
            WHERE podcasts.id = summaries.podcast_id
            AND podcasts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own show notes" ON public.show_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.podcasts
            WHERE podcasts.id = show_notes.podcast_id
            AND podcasts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own social posts" ON public.social_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.podcasts
            WHERE podcasts.id = social_posts.podcast_id
            AND podcasts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own blog articles" ON public.blog_articles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.podcasts
            WHERE podcasts.id = blog_articles.podcast_id
            AND podcasts.user_id = auth.uid()
        )
    );

-- RLS Policies for usage logs and subscriptions
CREATE POLICY "Users can view own usage logs" ON public.usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Functions and Triggers

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.podcasts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for performance
CREATE INDEX idx_podcasts_user_id ON public.podcasts(user_id);
CREATE INDEX idx_podcasts_status ON public.podcasts(processing_status);
CREATE INDEX idx_transcripts_podcast_id ON public.transcripts(podcast_id);
CREATE INDEX idx_translations_podcast_id ON public.translations(podcast_id);
CREATE INDEX idx_summaries_podcast_id ON public.summaries(podcast_id);
CREATE INDEX idx_show_notes_podcast_id ON public.show_notes(podcast_id);
CREATE INDEX idx_social_posts_podcast_id ON public.social_posts(podcast_id);
CREATE INDEX idx_blog_articles_podcast_id ON public.blog_articles(podcast_id);
CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_lemon_squeezy_id ON public.subscriptions(lemon_squeezy_id);