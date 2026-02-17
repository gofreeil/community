<script>
    let { title = "קהילת השכונה" } = $props();
</script>

<header class="header">
    <div class="container">
        <div class="logo-area">
            <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 21h18M3 10l9-7 9 7v11H3V10z" />
                    <path d="M9 21V11h6v10" />
                </svg>
            </div>
            <h1 class="title">{title}</h1>
        </div>
        
        <nav class="nav">
            <a href="/" class="nav-link active">בית</a>
            <a href="/about" class="nav-link">אודות</a>
            <a href="/contact" class="nav-link">צור קשר</a>
        </nav>
        
        <div class="actions">
            <button class="btn-primary">הצטרפות</button>
        </div>
    </div>
</header>

<style>
    .header {
        height: var(--header-height);
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        width: 100%;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }

    .logo-area {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .logo-icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, var(--primary), var(--primary-light));
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .logo-icon svg {
        width: 24px;
        height: 24px;
    }

    .title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
        background: linear-gradient(to right, #fff, #94a3b8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.025em;
    }

    .nav {
        display: flex;
        gap: 2rem;
    }

    .nav-link {
        text-decoration: none;
        color: #94a3b8;
        font-weight: 500;
        transition: all 0.2s ease;
        position: relative;
    }

    .nav-link:hover, .nav-link.active {
        color: #fff;
    }

    .nav-link.active::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--primary);
        border-radius: 2px;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
        border: none;
        padding: 0.6rem 1.2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }

    .btn-primary:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
    }

    @media (max-width: 768px) {
        .nav {
            display: none; /* In a real app we'd have a mobile menu */
        }
    }
</style>
