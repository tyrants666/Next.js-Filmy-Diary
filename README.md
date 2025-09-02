![Filmy Diary](./banner.png)

# Filmy Diary.

Keep a fun movie diary and easily share your watch list with friends and family!.

**live demo: [https://filmy-diary.netlify.app/](https://filmy-diary.netlify.app/)**

---

### Made with ❤️ by [Akash Yadav](https://www.instagram.com/akashxolotl)

Like my works and want to support me?

<a href="https://www.buymeacoffee.com/akashyadav777" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 45px !important;width: 162.75px !important;" ></a>

---

## Project Description

Your personal movie diary – a simple way to track what you've seen and share it with the people you love.

```shell
npm install
```

and after that start the dev server.

```shell
npm run dev
```

## Tools Used

1. Favicon: [React Icons](https://react-icons.github.io/react-icons/)
1. Movie API: [TMDB](https://www.themoviedb.org/) (Primary) + [OMDB](https://www.omdbapi.com/) (Poster Fallback)
1. Database: [Supabase](https://supabase.com/)
1. Code Editor: [VS Code](https://code.visualstudio.com/)

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# TMDB API (Primary) - Get from https://www.themoviedb.org/settings/api
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
TMDB_ACCESS_TOKEN=your_tmdb_access_token_here

# OMDB API (Poster Fallback) - Get from https://www.omdbapi.com/apikey.aspx
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## License

[MIT](https://choosealicense.com/licenses/mit/)

Happy Coding! 🚀