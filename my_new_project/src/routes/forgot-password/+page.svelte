<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';

    let { form }: { form: ActionData } = $props();
    let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-[#070b14] px-4" dir="rtl">
    <div class="max-w-md w-full">
        <div class="bg-[#0f172a] rounded-2xl border border-white/10 p-8">
            <div class="text-center mb-6">
                <div class="text-4xl mb-3">🔑</div>
                <h1 class="text-2xl font-bold text-white">שכחתי סיסמה</h1>
                <p class="text-white/50 text-sm mt-1">נשלח אליך קישור לאיפוס הסיסמה</p>
            </div>

            {#if form?.success}
                <div class="text-center">
                    <div class="text-5xl mb-4">📧</div>
                    <p class="text-green-400 font-semibold mb-2">המייל נשלח!</p>
                    <p class="text-white/60 text-sm">אם האימייל רשום במערכת, תקבל קישור לאיפוס סיסמה בדקות הקרובות.</p>
                    <a href="/login" class="mt-6 block text-purple-400 hover:underline text-sm">חזרה לכניסה</a>
                </div>
            {:else}
                <form method="POST" use:enhance={() => {
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
                            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
                    </button>

                    <div class="text-center mt-4">
                        <a href="/login" class="text-white/40 hover:text-white/70 text-sm transition">חזרה לכניסה</a>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</div>
