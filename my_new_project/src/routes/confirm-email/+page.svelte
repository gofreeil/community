<script lang="ts">
    import { page } from '$app/stores';
</script>

<div class="min-h-screen flex items-center justify-center bg-[#070b14] px-4" dir="rtl">
    <div class="max-w-md w-full text-center">
        {#if $page.url.searchParams.get('error')}
            <div class="text-6xl mb-6">❌</div>
            <h1 class="text-2xl font-bold text-white mb-3">האימות נכשל</h1>
            <p class="text-white/60 mb-6">הקישור אינו תקין או פג תוקפו.</p>
            <a href="/register" class="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition">
                הרשמה מחדש
            </a>
        {:else}
            <div class="text-6xl mb-6">✅</div>
            <h1 class="text-2xl font-bold text-white mb-3">האימייל אושר!</h1>
            <p class="text-white/60 mb-6">החשבון שלך פעיל. כעת תוכל להתחבר.</p>
            <a href="/login" class="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition">
                כניסה לחשבון
            </a>
        {/if}
    </div>
</div>
