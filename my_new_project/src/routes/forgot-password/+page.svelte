<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData, PageData } from './$types';

    let { form, data }: { form: ActionData; data: PageData } = $props();
    let loading = $state(false);

    let isLocked = $derived((data as any)?.locked || (form as any)?.locked);
    let lockedEmail = $derived((data as any)?.email || (form as any)?.email || '');
</script>

<div class="min-h-screen flex items-center justify-center bg-[#070b14] px-4" dir="rtl">
    <div class="max-w-md w-full">
        <div class="bg-[#0f172a] rounded-2xl border border-white/10 p-8">
            <div class="text-center mb-6">
                <div class="text-4xl mb-3">{isLocked ? '🔒' : '🔑'}</div>
                <h1 class="text-2xl font-bold text-white">{isLocked ? 'חשבון ננעל' : 'שכחתי סיסמה'}</h1>
                <p class="text-white/50 text-sm mt-1">
                    {#if isLocked}
                        יש לפנות לרכז השכונה לפתיחת החשבון
                    {:else if (form as any)?.hasQuestion}
                        ענה על שאלת הביטחון כדי לאפס את הסיסמה
                    {:else}
                        נשלח אליך קישור לאיפוס הסיסמה
                    {/if}
                </p>
            </div>

            {#if isLocked}
                <!-- חשבון ננעל -->
                <div class="text-center">
                    <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
                        <p class="text-red-400 font-semibold mb-2">החשבון ננעל לאחר 3 ניסיונות כושלים</p>
                        <p class="text-white/60 text-sm">רכז השכונה קיבל הודעה ויצור קשר איתך בהקדם.</p>
                    </div>
                    <p class="text-white/40 text-xs">אימייל: {lockedEmail}</p>
                    <a href="/" class="mt-6 block text-purple-400 hover:underline text-sm">חזרה לדף הבית</a>
                </div>

            {:else if form?.success}
                <div class="text-center">
                    <div class="text-5xl mb-4">📧</div>
                    <p class="text-green-400 font-semibold mb-2">המייל נשלח!</p>
                    <p class="text-white/60 text-sm">אם האימייל רשום במערכת, תקבל קישור לאיפוס סיסמה בדקות הקרובות.</p>
                    <a href="/login" class="mt-6 block text-purple-400 hover:underline text-sm">חזרה לכניסה</a>
                </div>

            {:else if form?.hasQuestion}
                <!-- שלב 2: שאלת ביטחון -->
                <form method="POST" action="?/verifyAnswer" use:enhance={() => {
                    loading = true;
                    return async ({ update }) => { await update(); loading = false; };
                }}>
                    <input type="hidden" name="email" value={form.email} />

                    {#if (form as any)?.error}
                        <p class="text-red-400 text-sm mb-4 text-center">{(form as any).error}</p>
                    {/if}

                    <div class="mb-2">
                        <p class="text-white/50 text-xs mb-1">שאלת הביטחון שלך:</p>
                        <p class="text-white font-semibold mb-4 bg-white/5 rounded-xl px-4 py-3">{(form as any).question}</p>
                    </div>

                    <div class="mb-6">
                        <label class="block text-white/70 text-sm mb-1">תשובה</label>
                        <input
                            type="text"
                            name="answer"
                            required
                            autofocus
                            placeholder="הכנס את תשובתך"
                            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? 'בודק...' : 'אמת ושלח קישור'}
                    </button>

                    <div class="text-center mt-4">
                        <a href="/forgot-password" class="text-white/40 hover:text-white/70 text-sm transition">הזן אימייל אחר</a>
                    </div>
                </form>

            {:else}
                <!-- שלב 1: הזנת אימייל -->
                <form method="POST" action="?/checkEmail" use:enhance={() => {
                    loading = true;
                    return async ({ update }) => { await update(); loading = false; };
                }}>
                    {#if form?.error}
                        <p class="text-red-400 text-sm mb-4 text-center">{form.error}</p>
                    {/if}

                    <div class="mb-4">
                        <label class="block text-white/70 text-sm mb-1">כתובת אימייל</label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="your@email.com"
                            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? 'בודק...' : 'המשך'}
                    </button>

                    <div class="text-center mt-4">
                        <a href="/login" class="text-white/40 hover:text-white/70 text-sm transition">חזרה לכניסה</a>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</div>

