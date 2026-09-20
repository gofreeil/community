<script lang="ts">
    // ה-head של דף הפריט ברכיב נפרד, בכוונה בלי בלוק style:
    // רכיב עם style מקבל class="svelte-hash" גם על תגי meta/link שב-head,
    // ווואטסאפ (בניגוד לטלגרם/פייסבוק) התעלם מתגי OG כאלה ונפל לקדימון גנרי
    // (title + favicon). כאן התגים יוצאים נקיים. גם בלי בלוקי תנאי: הם
    // מייצרים סמני hydration (הערות HTML) סביב התגים.
    interface ImageMeta { type?: string; width?: number; height?: number }
    interface Props {
        title: string;
        description: string;
        canonical: string;
        ogType: string;
        ogTitle: string;
        ogDescription: string;
        ogImage: string;
        imageMeta?: ImageMeta | null;
    }
    let { title, description, canonical, ogType, ogTitle, ogDescription, ogImage, imageMeta = null }: Props = $props();

    // og:image:type/width/height רק כשידועים - כמחרוזת, כדי לא להכניס {#if} ל-head.
    // הערכים מסוננים (mime תקין / מספרים) ולכן בטוחים ל-{@html}.
    const imageDimsHtml = $derived.by(() => {
        if (!imageMeta) return '';
        const parts: string[] = [];
        if (typeof imageMeta.type === 'string' && /^image\/[a-z0-9.+-]+$/i.test(imageMeta.type)) {
            parts.push(`<meta property="og:image:type" content="${imageMeta.type}" />`);
        }
        const w = imageMeta.width, h = imageMeta.height;
        if (typeof w === 'number' && typeof h === 'number' && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
            parts.push(`<meta property="og:image:width" content="${Math.round(w)}" />`);
            parts.push(`<meta property="og:image:height" content="${Math.round(h)}" />`);
        }
        return parts.join('\n');
    });
</script>

<svelte:head>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content={ogType} />
    <meta property="og:site_name" content="קהילה בשכונה" />
    <meta property="og:title" content={ogTitle} />
    <meta property="og:description" content={ogDescription} />
    <meta property="og:url" content={canonical} />
    <meta property="og:locale" content="he_IL" />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:secure_url" content={ogImage} />
    {@html imageDimsHtml}
    <meta property="og:image:alt" content={ogTitle} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={ogTitle} />
    <meta name="twitter:description" content={ogDescription} />
    <meta name="twitter:image" content={ogImage} />
</svelte:head>
