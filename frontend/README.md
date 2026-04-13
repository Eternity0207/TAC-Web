# The Awla Company - React Application

A modern, serverless architecture website built with React, Vite, and Tailwind CSS for The Awla Company - your premium source for 100% natural Amla products.

## 🚀 Features

- **Modern Tech Stack**: React 19 + Vite + Tailwind CSS
- **Serverless Architecture**: Static site ready for deployment to Vercel, Netlify, or any CDN
- **SEO Optimized**: React Helmet Async for dynamic meta tags and SEO
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Fast Performance**: Optimized with Vite for lightning-fast builds
- **Routing**: React Router for seamless navigation
- **Component-Based**: Modular and reusable components

## 📁 Project Structure

```
theawlacompany-react/
├── public/                # Static assets
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── assets/           # Images and media files
│   ├── components/       # Reusable React components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   └── Loader.jsx
│   ├── layouts/          # Layout components
│   │   └── MainLayout.jsx
│   ├── pages/            # Page components
│   │   ├── Home.jsx
│   │   ├── Products.jsx
│   │   ├── Blog.jsx
│   │   ├── Team.jsx
│   │   ├── Careers.jsx
│   │   └── BulkEnquiry.jsx
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## 🎨 Technologies Used

- **React 19.2.4** - UI library
- **Vite 8.0.1** - Build tool and dev server
- **Tailwind CSS 4.2.2** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **React Helmet Async** - SEO and meta tags management
- **Font Awesome** - Icons

## 🌐 Deployment (Serverless)

This application is built as a static site and can be deployed to various serverless platforms:

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

### GitHub Pages
Build the project and deploy the `dist` folder to GitHub Pages.

## 🎯 Pages

- **Home** (`/`) - Hero section, products showcase, benefits
- **Products** (`/products`) - All products listing
- **Blog** (`/blog`) - Health tips and Amla benefits
- **Team** (`/team`) - Meet our team
- **Careers** (`/careers`) - Job opportunities
- **Bulk Enquiry** (`/bulk-enquiry`) - B2B wholesale form

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to customize the color palette:
- Primary: `#1a472a` (Green)
- Accent: `#f59e0b` (Amber)

### Fonts
The project uses:
- **Inter** - Body text
- **Poppins** - Secondary text
- **Playfair Display** - Headings and brand

## 📄 License

Copyright © 2026 The Awla Company. All rights reserved.

## 📧 Contact

- **Email**: support@theawlacompany.com
- **Phone**: +91 96539 04820
- **Location**: Jaipur, Rajasthan, India
