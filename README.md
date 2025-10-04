# README.md
# 531  Calculator

A comprehensive training calculator for the 531 x 365 program built with [Eleventy](https://11ty.dev).

## Features

- **12-Cycle Program**: Complete year-long training system
- **5s PRO Main Sets**: No AMRAP grinding, quality reps only
- **Automatic Calculations**: Training Max progression and weight calculations
- **Bodyweight Accessories**: Complete workouts without extra equipment
- **Responsive Design**: Works on all devices
- **Fast & Lightweight**: Built with static site generation

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/531-x-365-calculator.git
cd 531-x-365-calculator

# Install dependencies
npm install

# Start development server
npm run serve

# Build for production
npm run build
```

## Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `_site`
4. Deploy!

### Vercel
1. Connect repository to Vercel
2. Framework: Other
3. Build command: `npm run build`
4. Output directory: `_site`

### GitHub Pages
```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d _site"

# Deploy
npm run build && npm run deploy
```

## Development

The site uses:
- **Eleventy** for static site generation
- **Nunjucks** for templating
- **Vanilla JavaScript** for interactivity
- **CSS Grid & Flexbox** for layout

## Project Structure

- `src/` - Source files
- `src/_layouts/` - Page templates
- `src/_includes/` - Reusable components
- `src/_data/` - Site data
- `src/assets/` - CSS, images, etc.
- `src/js/` - JavaScript files

## License

MIT
