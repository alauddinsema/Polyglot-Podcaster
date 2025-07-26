# Polyglot Podcaster

An AI-powered content repurposing platform that transforms podcast audio into multilingual content including transcripts, translations, show notes, social media posts, and blog articles.

## 🚀 Features

- **AI-Powered Transcription**: Convert audio to text using Hugging Face models
- **Multilingual Translation**: Translate content to multiple languages using Google Gemini
- **Content Generation**: Automatically generate show notes, social media posts, and blog articles
- **Subscription Management**: Freemium model with Hobby, Creator, and Pro tiers
- **Real-time Processing**: Live status updates during content generation
- **Secure & Scalable**: Built with Supabase, Next.js, and modern web technologies

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Services**: Google Gemini API, Hugging Face Inference API
- **Payments**: Lemon Squeezy (Merchant of Record)
- **Hosting**: Netlify (Frontend), Supabase (Backend)

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** package manager
3. **Supabase** account and project
4. **Google AI** account with Gemini API access
5. **Hugging Face** account with API token
6. **Lemon Squeezy** account for payments
7. **Netlify** account for deployment

## 🔧 Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd polyglot-podcaster
npm install
```

### 2. Environment Variables

Copy the environment template and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual API keys and configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI API Keys
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
HUGGING_FACE_API_KEY=your_hugging_face_api_key

# Lemon Squeezy Configuration
LEMON_SQUEEZY_API_KEY=your_lemon_squeezy_api_key
LEMON_SQUEEZY_STORE_ID=your_lemon_squeezy_store_id
LEMON_SQUEEZY_WEBHOOK_SECRET=your_lemon_squeezy_webhook_secret

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Database Setup

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project
2. **Run Database Schema**: In your Supabase dashboard, go to SQL Editor and run the contents of `database/schema.sql`
3. **Configure Storage**: Create a storage bucket named `podcast-files` with appropriate policies

### 4. API Keys Setup

#### Google Gemini API
1. Visit [Google AI Studio](https://ai.google.dev)
2. Create an API key
3. Add it to your `.env.local` file

#### Hugging Face API
1. Go to [Hugging Face](https://huggingface.co)
2. Navigate to Settings → Access Tokens
3. Create a new token with read permissions
4. Add it to your `.env.local` file

#### Lemon Squeezy
1. Create account at [Lemon Squeezy](https://lemonsqueezy.com)
2. Set up your store and products
3. Get API key from Settings → API
4. Add credentials to your `.env.local` file

### 5. Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
polyglot-podcaster/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── lib/                    # Utility functions and configurations
│   └── supabase.ts        # Supabase client configuration
├── database/              # Database schema and migrations
│   └── schema.sql         # Complete database schema
├── supabase/              # Supabase Edge Functions
├── public/                # Static assets
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🚀 Deployment

### Netlify Deployment

1. **Connect Repository**: Link your GitHub repository to Netlify
2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. **Environment Variables**: Add all environment variables from `.env.local`
4. **Deploy**: Netlify will automatically deploy on every push to main branch

### Supabase Edge Functions

Deploy Edge Functions using Supabase CLI:

```bash
npx supabase functions deploy process-podcast
```

## 📊 Subscription Tiers

- **Hobby (Free)**: 1 upload/month, 1 language, basic summary
- **Creator ($19/month)**: 10 uploads/month, 5 languages, full content suite
- **Pro ($49/month)**: Unlimited uploads, all languages, priority processing

## 🔒 Security Features

- Row Level Security (RLS) policies
- Secure API key management
- User authentication with Supabase Auth
- File upload validation and limits
- Rate limiting on API endpoints

## 🧪 Testing

Run the test suite:

```bash
npm run test
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support, email support@polyglotpodcaster.com or join our Discord community.

## 🗺️ Roadmap

- [ ] Voice cloning for dubbing
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Custom AI prompt templates
- [ ] Integration with podcast platforms
- [ ] Mobile app development
