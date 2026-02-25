import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://luyenthijp.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Fetch subjects
    const { data: subjects } = await supabase
      .from("subjects")
      .select("slug, created_at")
      .order("name");

    // Fetch categories with layers
    const { data: categories } = await supabase
      .from("categories")
      .select("slug, parent_id, subject_id, layer_id, created_at")
      .order("order_index");

    // Fetch subject_layers
    const { data: layers } = await supabase
      .from("subject_layers")
      .select("id, subject_id, order_index")
      .order("order_index");

    // Fetch published blog posts
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    // Build subject slug map
    const subjectSlugMap: Record<string, string> = {};
    for (const s of subjects || []) {
      // We need subject_id -> slug mapping
    }

    // Build layer order map
    const layerOrderMap: Record<string, number> = {};
    const layerSubjectMap: Record<string, string> = {};
    for (const l of layers || []) {
      layerOrderMap[l.id] = l.order_index;
      layerSubjectMap[l.id] = l.subject_id;
    }

    // Subject ID to slug
    const { data: subjectsWithId } = await supabase
      .from("subjects")
      .select("id, slug");
    const subjectIdToSlug: Record<string, string> = {};
    for (const s of subjectsWithId || []) {
      subjectIdToSlug[s.id] = s.slug;
    }

    // Build category tree for URL generation
    const catById: Record<string, any> = {};
    for (const c of categories || []) {
      catById[c.slug + "_" + c.layer_id] = c;
    }

    // Group categories by layer (only root categories for first layer)
    const rootCategoriesBySubject: Record<string, any[]> = {};
    for (const c of categories || []) {
      if (!c.parent_id && layerOrderMap[c.layer_id] === 0) {
        const subjectSlug = subjectIdToSlug[c.subject_id];
        if (subjectSlug) {
          if (!rootCategoriesBySubject[subjectSlug]) rootCategoriesBySubject[subjectSlug] = [];
          rootCategoriesBySubject[subjectSlug].push(c);
        }
      }
    }

    // Child categories (layer 1+)
    const childCategories: Record<string, any[]> = {};
    for (const c of categories || []) {
      if (c.parent_id) {
        if (!childCategories[c.parent_id]) childCategories[c.parent_id] = [];
        childCategories[c.parent_id].push(c);
      }
    }

    // Category ID map
    const catByIdMap: Record<string, any> = {};
    for (const c of categories || []) {
      catByIdMap[c.slug + "_" + c.layer_id] = c;
    }

    // Build all category URLs by traversing tree
    const categoryUrls: { url: string; lastmod: string }[] = [];

    // For each subject, generate URLs
    for (const [subjectSlug, rootCats] of Object.entries(rootCategoriesBySubject)) {
      for (const rootCat of rootCats) {
        // /subjects/jlpt/n5
        categoryUrls.push({
          url: `${SITE_URL}/subjects/${subjectSlug}/${rootCat.slug}`,
          lastmod: rootCat.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        });

        // Find children via parent_id (need category id)
        // We need actual IDs - fetch them
      }
    }

    // Fetch categories with IDs for tree traversal
    const { data: catsWithIds } = await supabase
      .from("categories")
      .select("id, slug, parent_id, subject_id, created_at")
      .order("order_index");

    const catIdMap: Record<string, any> = {};
    for (const c of catsWithIds || []) {
      catIdMap[c.id] = c;
    }

    const childrenOf: Record<string, any[]> = {};
    for (const c of catsWithIds || []) {
      if (c.parent_id) {
        if (!childrenOf[c.parent_id]) childrenOf[c.parent_id] = [];
        childrenOf[c.parent_id].push(c);
      }
    }

    // Clear and rebuild URLs properly
    categoryUrls.length = 0;

    // Root categories (no parent)
    const rootCats = (catsWithIds || []).filter(c => !c.parent_id);
    for (const root of rootCats) {
      const subjectSlug = subjectIdToSlug[root.subject_id];
      if (!subjectSlug) continue;

      categoryUrls.push({
        url: `${SITE_URL}/subjects/${subjectSlug}/${root.slug}`,
        lastmod: root.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      });

      // Children (depth 2)
      for (const child of childrenOf[root.id] || []) {
        categoryUrls.push({
          url: `${SITE_URL}/subjects/${subjectSlug}/${root.slug}/${child.slug}`,
          lastmod: child.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        });

        // Grandchildren (depth 3)
        for (const grandchild of childrenOf[child.id] || []) {
          categoryUrls.push({
            url: `${SITE_URL}/subjects/${subjectSlug}/${root.slug}/${child.slug}/${grandchild.slug}`,
            lastmod: grandchild.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          });
        }
      }
    }

    // Build XML
    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/subjects</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${SITE_URL}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${SITE_URL}/leaderboard</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${SITE_URL}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${SITE_URL}/disclaimer</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>`;

    // Subject pages
    for (const s of subjects || []) {
      xml += `
  <url>
    <loc>${SITE_URL}/subjects/${s.slug}</loc>
    <lastmod>${s.created_at?.split("T")[0] || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Category pages
    for (const cu of categoryUrls) {
      xml += `
  <url>
    <loc>${cu.url}</loc>
    <lastmod>${cu.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Blog posts
    for (const p of posts || []) {
      const lastmod = (p.updated_at || p.published_at || "").split("T")[0];
      xml += `
  <url>
    <loc>${SITE_URL}/blog/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response("Error generating sitemap", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
