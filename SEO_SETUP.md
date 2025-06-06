# SEO Setup Guide for Splitwise for YNAB

## ✅ What's Already Implemented

I've added comprehensive SEO improvements to your site:

### 1. **Meta Tags & Open Graph**

- Complete meta tags in `app/layout.tsx`
- Open Graph data for social media sharing
- Twitter Card optimization
- Structured data (JSON-LD) for search engines

### 2. **Dynamic Images**

- `app/icon.tsx` - Generates favicons dynamically
- `app/apple-icon.tsx` - Apple touch icons
- `app/opengraph-image.tsx` - Social media preview images

### 3. **Site Structure**

- `app/sitemap.ts` - XML sitemap for search engines
- `app/robots.ts` - Crawler instructions
- `app/manifest.ts` - PWA manifest for mobile
- `app/not-found.tsx` - SEO-optimized 404 page

### 4. **Page-Specific SEO**

- Homepage: Comprehensive metadata with target keywords
- Dashboard: Private page (noindex)
- Privacy Policy: Legal page optimization
- Terms of Service: Legal page optimization

## 🔧 Required Setup Steps

### 1. **Set Your Domain**

Add this to your environment variables (`.env.local`):

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. **Google Search Console**

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property (domain or URL prefix)
3. Verify ownership using the HTML tag method
4. Add the verification code to your environment:

```bash
GOOGLE_SITE_VERIFICATION=your_verification_code_here
```

### 3. **Replace Placeholder Favicon**

The current `app/favicon.ico` is a placeholder. Replace it with your actual favicon:

- Generate favicons at [favicon.io](https://favicon.io/)
- Replace `app/favicon.ico` with your generated file

### 4. **Social Media Setup**

- Create a Twitter account for your app (optional)
- Update the Twitter handle in `app/layout.tsx` if you have one
- Test your Open Graph images using [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)

## 🎯 Target Keywords

Your site is optimized for these search terms:

- "YNAB Splitwise integration"
- "automate shared expenses YNAB"
- "YNAB expense sharing"
- "Splitwise YNAB sync"
- "couples budgeting YNAB"
- "roommate expenses YNAB"
- "YNAB automation tools"

## 📊 SEO Monitoring

### Google Analytics (Recommended)

Add Google Analytics to track your SEO performance:

1. Create a Google Analytics 4 property
2. Install the tracking code in your app
3. Set up conversion goals for sign-ups

### Search Console Monitoring

Monitor these metrics in Google Search Console:

- **Impressions**: How often your site appears in search
- **Clicks**: How often people click through
- **Average Position**: Your ranking for target keywords
- **Coverage**: Any indexing issues

## 🚀 Content Strategy for Better SEO

### Blog Content Ideas (Future)

Consider adding a blog with these topics:

- "How to Set Up YNAB for Couples"
- "5 YNAB Automation Tips for Shared Expenses"
- "YNAB vs. Mint for Couples: Which is Better?"
- "Complete Guide to Expense Sharing with YNAB"

### Landing Page Optimization

Your current homepage is well-optimized, but consider:

- Adding customer testimonials
- Including more specific use cases
- Adding FAQ section for long-tail keywords

## 🔍 Technical SEO Checklist

✅ **Already Done:**

- Meta tags and descriptions
- Open Graph and Twitter Cards
- Structured data (JSON-LD)
- XML sitemap
- Robots.txt
- Mobile-friendly design
- Fast loading (Vercel + Next.js)
- HTTPS enabled
- Proper heading structure (H1, H2, H3)
- Alt text for images
- Internal linking structure

### **Next Steps:**

- [ ] Set up Google Search Console
- [ ] Add Google Analytics
- [ ] Submit sitemap to Google
- [ ] Monitor Core Web Vitals
- [ ] Set up Google Business Profile (if applicable)

## 📱 Local SEO (If Applicable)

If you're targeting local users:

1. Create a Google Business Profile
2. Add local schema markup
3. Include location-based keywords
4. Get listed in local directories

## 🎉 Expected Results

With these SEO improvements, you should see:

- **Better search rankings** for YNAB and Splitwise related terms
- **Improved click-through rates** from social media shares
- **Enhanced user experience** with proper meta descriptions
- **Faster indexing** by search engines

## 📞 Need Help?

If you need assistance with any of these steps:

1. Check the Next.js SEO documentation
2. Use Google's SEO Starter Guide
3. Consider hiring an SEO consultant for advanced optimization

---

**Note**: SEO results typically take 3-6 months to show significant improvement. Be patient and consistent with your optimization efforts!
