<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData, PageData } from './$types';

    let { form, data }: { form: ActionData; data: PageData } = $props();
    let loading = $state(false);
    let showPassword = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-[#070b14] px-4" dir="rtl">
    <div class="max-w-md w-full">
        <div class="bg-[#0f172a] rounded-2xl border border-white/10 p-8">
            <div class="text-center mb-6">
                <div class="text-4xl mb-3">🔒</div>
                <h1 class="text-2xl font-bold text-white">איפוס סיסמה</h1>
                <p class="text-white/50 text-sm mt-1">בחר סיסמה חדשה לחשבון שלך</p>
            </div>

            {#if form?.success}
                <div class="text-center">
                    <div class="text-5xl mb-4">✅</div>
                    <p class="text-green-400 font-semibold mb-2">הסיסמה עודכנה!</p>
                    <p class="text-white/60 text-sm mb-6">כעת תוכל להתחבר עם הסיסמה החדשה.</p>
                    <a href="/login" class="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition">
                        כניסה לחשבון
                    </a>
                </div>
            {:else if !data.code}
                <div class="text-center">
                    <p class="text-red-400">קישור לא תקין. <a href="/forgot-password" class="underline">בקש קישור חדש</a>.</p>
                </div>
            {:else}
                <form method="POST" use:enhance={() => {
                    loading = true;
                    return async ({ update }) => { await update(); loading = false; };
                }}>
                    <input type="hidden" name="code" value={data.code} />

                    {#if form?.error}
                        <p class="text-red-400 text-sm mb-4 text-center">{form.error}</p>
                    {/if}

                    <div class="mb-4">
                        <label class="block text-white/70 text-sm mb-1">סיסמה חדשה</label>
                        <div class="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                minlength="6"
                                placeholder="לפחות 6 תווים"
                                class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
                            />
                            <button type="button" onclick={() => showPassword = !showPassword}
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-sm">
                                {showPassword ? 'הסתר' : 'הצג'}
                            </button>
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-white/70 text-sm mb-1">אישור סיסמה</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="passwordConfirm"
                            required
                            placeholder="חזור על הסיסמה"
                            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? 'מעדכן...' : 'עדכן סיסמה'}
                    </button>
                </form>
            {/if}
        </div>
    </div>
</div>
