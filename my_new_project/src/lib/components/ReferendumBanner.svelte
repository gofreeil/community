<script lang="ts">
    // אנימציה של גלים
    let mounted = false;
    import { onMount } from 'svelte';
    
    onMount(() => {
        mounted = true;
    });
</script>

<div class="referendum-banner relative overflow-hidden rounded-2xl shadow-2xl my-8 group">
    <!-- רקע גרדיאנט מונפש -->
    <div class="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 animate-gradient"></div>
    
    <!-- גלים מונפשים -->
    <div class="absolute inset-0 opacity-30">
        <div class="wave wave1"></div>
        <div class="wave wave2"></div>
        <div class="wave wave3"></div>
    </div>
    
    <!-- תוכן -->
    <div class="relative z-10 p-6 md:p-8">
        <!-- כותרת מרכזית עם קלפי -->
        <div class="text-center mb-4">
            <div class="flex items-center justify-center gap-3 mb-2">
                <span class="text-5xl md:text-6xl">🗳️</span>
                <div>
                    <h2 class="text-3xl md:text-4xl font-black leading-tight">
                        <span class="inline-block transform hover:scale-110 transition-transform">משאל</span>
                        <span class="inline-block transform hover:scale-110 transition-transform text-yellow-300"> עם</span>
                    </h2>
                </div>
            </div>
            <p class="text-base md:text-lg font-bold text-blue-100 mb-3">
                הקול שלך משנה את המציאות
            </p>
            
            <div class="flex flex-wrap gap-2 justify-center mb-4">
                <div class="badge-small">
                    <span class="text-lg">✓</span>
                    <span>דמוקרטיה ישירה</span>
                </div>
                <div class="badge-small">
                    <span class="text-lg">🎯</span>
                    <span>השפעה אמיתית</span>
                </div>
                <div class="badge-small">
                    <span class="text-lg">⚡</span>
                    <span>תוצאות מיידיות</span>
                </div>
            </div>

            <!-- כפתור פעולה -->
            <button class="cta-button-small transition-all duration-300 hover:scale-105">
                <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl px-6 py-4 shadow-lg">
                    <div class="text-center">
                        <div class="text-2xl font-black text-purple-900 mb-1">
                            השתתף עכשיו
                        </div>
                        <div class="text-xs font-bold text-purple-800">
                            קולך נשמע! 📢
                        </div>
                    </div>
                </div>
            </button>
        </div>
        
        <!-- סטטיסטיקות מונפשות -->
        <div class="mt-4 grid grid-cols-3 gap-3 text-center">
            <div class="stat-box">
                <div class="text-2xl font-black text-yellow-300">12,847</div>
                <div class="text-xs text-blue-200">משתתפים</div>
            </div>
            <div class="stat-box">
                <div class="text-2xl font-black text-yellow-300">156</div>
                <div class="text-xs text-blue-200">משאלים פעילים</div>
            </div>
            <div class="stat-box">
                <div class="text-2xl font-black text-yellow-300">89%</div>
                <div class="text-xs text-blue-200">שביעות רצון</div>
            </div>
        </div>

        <!-- דוגמה למשאל - מיחזור אשפה -->
        <div class="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <div class="flex items-start gap-2 mb-3">
                <span class="text-2xl">♻️</span>
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-white mb-1">משאל לדוגמה</h3>
                    <p class="text-white/90 text-sm leading-relaxed">
                        האם אתם מעוניינים לעבור למערכת מיחזור אשפה קהילתית חדשה שתוזיל את העלויות ב-30% ותשפר את השירות?
                    </p>
                </div>
            </div>
            
            <div class="space-y-2">
                <button class="poll-option poll-yes">
                    <span class="text-lg">✅</span>
                    <span class="font-bold text-sm">כן, אני בעד!</span>
                    <span class="text-xs opacity-80">(67%)</span>
                </button>
                <button class="poll-option poll-no">
                    <span class="text-lg">❌</span>
                    <span class="font-bold text-sm">לא, אני מעדיף להשאר במצב הנוכחי</span>
                    <span class="text-xs opacity-80">(23%)</span>
                </button>
                <button class="poll-option poll-maybe">
                    <span class="text-lg">🤔</span>
                    <span class="font-bold text-sm">צריך לבדוק עוד פרטים</span>
                    <span class="text-xs opacity-80">(10%)</span>
                </button>
            </div>
            
            <div class="mt-3 text-center text-xs text-blue-200">
                <span class="font-bold">1,247</span> תושבים הצביעו עד כה
            </div>
        </div>
    </div>
    
    <!-- אפקט זוהר בפינות -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 animate-pulse"></div>
    <div class="absolute bottom-0 left-0 w-40 h-40 bg-yellow-300 rounded-full blur-3xl opacity-20 animate-pulse delay-1000"></div>
</div>

<style>
    .referendum-banner {
        min-height: 300px;
        transition: transform 0.3s ease;
    }
    
    .referendum-banner:hover {
        transform: translateY(-4px);
    }
    
    @keyframes gradient {
        0%, 100% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
    }
    
    .animate-gradient {
        background-size: 200% 200%;
        animation: gradient 8s ease infinite;
    }
    
    .wave {
        position: absolute;
        width: 200%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        animation: wave 8s linear infinite;
    }
    
    .wave1 {
        animation-delay: 0s;
    }
    
    .wave2 {
        animation-delay: 2s;
    }
    
    .wave3 {
        animation-delay: 4s;
    }
    
    @keyframes wave {
        0% {
            transform: translateX(-100%) skewX(-15deg);
        }
        100% {
            transform: translateX(100%) skewX(-15deg);
        }
    }
    
    .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
    }
    
    .badge:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
    }
    
    .cta-button {
        position: relative;
        cursor: pointer;
        border: none;
        background: transparent;
    }
    
    .cta-button:hover {
        transform: scale(1.05);
    }
    
    .stat-box {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
    }
    
    .stat-box:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
    }
    
    @keyframes bounce-slow {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-10px);
        }
    }
    
    .animate-bounce-slow {
        animation: bounce-slow 3s ease-in-out infinite;
    }
    
    .delay-1000 {
        animation-delay: 1s;
    }

    .poll-option {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: right;
    }

    .poll-option:hover {
        transform: translateX(-4px);
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
    }

    .poll-yes:hover {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgb(34, 197, 94);
    }

    .poll-no:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgb(239, 68, 68);
    }

    .poll-maybe:hover {
        background: rgba(251, 191, 36, 0.2);
        border-color: rgb(251, 191, 36);
    }
    
    @media (max-width: 768px) {
        .referendum-banner {
            min-height: 400px;
        }
    }
</style>
