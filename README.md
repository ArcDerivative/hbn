# BlurQuiz 🔍

A multiple-choice quiz game where you reveal mystery images by answering correctly.

## Files
- `index.html` — markup
- `style.css` — styles
- `quiz.js` — game logic & questions
- `netlify.toml` — Netlify headers config

## Deploy to Netlify (via GitHub)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial BlurQuiz"
   git remote add origin https://github.com/YOUR_USERNAME/blur-quiz.git
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click **Add new site → Import an existing project**
   - Choose **GitHub** and select your repo
   - Build settings: leave blank (plain HTML site)
   - Click **Deploy**

That's it — Netlify will give you a live URL in ~30 seconds.

## Customising Questions

Edit the `ALL_QUESTIONS` array in `quiz.js`. Each question looks like:

```js
{
  category: "Landmarks",
  image: "https://images.unsplash.com/photo-XXXX?w=800&q=80",
  question: "Which city is this?",
  choices: ["Paris", "Rome", "Berlin", "Tokyo"],
  answer: "Paris",
}
```

- Use any free Unsplash URL for images
- Add as many questions as you like — the quiz picks 5 at random each round
- Change `QUESTIONS_PER_ROUND` at the top of `quiz.js` to adjust round length
