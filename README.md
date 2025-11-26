# Ontologizer Web App

Advanced Structured Data Tool - A Next.js application for generating comprehensive JSON-LD structured data with AI-powered content analysis.

## Overview

Ontologizer is a migration from the WordPress plugin to a modern Next.js web application. It helps users generate and manage structured data (JSON-LD) for improved SEO and content organization.

**Production URL:** [ontologizer.searchinfluence.com](https://ontologizer.searchinfluence.com)

## Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Database & Auth:** Supabase (magic link authentication)
- **AI/LLM:** OpenAI GPT-5 (entity extraction & content analysis)
- **AI/LLM:** Google Gemini (query fan-out & content recommendations)
- **Entity Enrichment:** Google Knowledge Graph API
- **Feedback System:** Upstash Feedback
- **Deployment:** Vercel

## Project Structure

```
ontologizer-app/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Form components
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
├── lib/                   # Utility functions and configurations
│   ├── supabase/         # Supabase client configurations
│   ├── utils/            # Helper functions
│   └── hooks/            # Custom React hooks
├── types/                 # TypeScript type definitions
├── public/               # Static assets
└── middleware.ts         # Next.js middleware for auth
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- An Upstash account (for feedback system)

### Installation

1. Clone the repository and navigate to the project:
   ```bash
   cd ontologizer-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Edit `.env.local` with your actual credentials:
   - Supabase URL and keys
   - Upstash Feedback credentials
   - Any other API keys as needed

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Configuration

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Add them to your `.env.local` file
4. Run the database migrations (coming in Phase 2)

### shadcn/ui Components

This project uses shadcn/ui for component library. To add new components:

```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add form
```

## Development Phases

- **Phase 1: Project Setup** ✅ Complete
  - Next.js 14+ with TypeScript
  - Tailwind CSS + shadcn/ui
  - Supabase configuration
  - Basic project structure

- **Phase 2: Database & Authentication** ✅ Complete
  - Supabase database schema
  - Magic link authentication
  - Protected routes
  - Email domain restrictions (webboss.com, searchinfluence.com)

- **Phase 3: Core Features** ✅ Complete
  - URL analysis interface
  - OpenAI GPT-5 entity extraction
  - JSON-LD structured data output
  - Entity enrichment via Google Knowledge Graph

- **Phase 4: Advanced Features** ✅ Complete
  - Google Gemini query fan-out analysis
  - Content outline recommendations
  - Salience scoring for entities
  - Export functionality (JSON/Markdown)
  - Feedback system integration

## Future Development

Potential enhancements for future iterations:

- **Multi-page Analysis** - Batch analyze multiple URLs from a sitemap
- **Schema Templates** - Pre-built templates for common schema types (LocalBusiness, Product, Event, etc.)
- **Historical Tracking** - Track changes to page entities over time
- **Competitor Comparison** - Compare entity coverage against competitor pages
- **WordPress Plugin Integration** - Direct publishing of JSON-LD back to WordPress sites
- **API Access** - REST API for programmatic access to analysis features
- **Team Collaboration** - Shared workspaces and analysis history
- **Custom Entity Types** - User-defined entity categories and extraction rules

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved

---

Built with ❤️ for better structured data
