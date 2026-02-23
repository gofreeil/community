<script lang="ts">
    let wishText = '';
    let showSuccess = false;

    function handleSubmit() {
        if (!wishText.trim()) {
            alert('נא לכתוב את המשאלה שלך');
            return;
        }
        
        showSuccess = true;
        setTimeout(() => {
            showSuccess = false;
            wishText = '';
        }, 3000);
    }
</script>

<div class="min-h-screen py-12 px-4">
    <div class="max-w-4xl mx-auto">
        <!-- כותרת -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                🙏 כותל המשאלות
            </h1>
            <p class="text-gray-300 text-lg">
                מקום לחלוק את המשאלות והחלומות שלך עם הקהילה
            </p>
        </div>

        <!-- מידע על כותל המשאלות -->
        <div class="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6 mb-8 backdrop-blur-sm">
            <h2 class="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>✨</span>
                מה זה כותל המשאלות?
            </h2>
            <p class="text-gray-300 mb-4">
                כותל המשאלות הוא מקום מיוחד בו חברי הקהילה יכולים לחלוק את המשאלות, החלומות והתקוות שלהם. 
                כל משאלה נכתבת באהבה ובתקווה שתתגשם.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div class="bg-blue-600/20 p-4 rounded-lg border border-blue-500/30">
                    <div class="text-3xl mb-2">💫</div>
                    <h3 class="font-bold text-white mb-1">משאלות אישיות</h3>
                    <p class="text-sm text-gray-400">חלוק את החלומות שלך</p>
                </div>
                <div class="bg-purple-600/20 p-4 rounded-lg border border-purple-500/30">
                    <div class="text-3xl mb-2">🤲</div>
                    <h3 class="font-bold text-white mb-1">תמיכה קהילתית</h3>
                    <p class="text-sm text-gray-400">הקהילה תומכת במשאלות</p>
                </div>
                <div class="bg-pink-600/20 p-4 rounded-lg border border-pink-500/30">
                    <div class="text-3xl mb-2">🌟</div>
                    <h3 class="font-bold text-white mb-1">כוח החלום</h3>
                    <p class="text-sm text-gray-400">כל משאלה יכולה להתגשם</p>
                </div>
            </div>
        </div>

        <!-- טופס הוספת משאלה -->
        <div class="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-sm">
            <h2 class="text-2xl font-bold text-white mb-6">הוסף משאלה</h2>
            
            <div class="space-y-6">
                <!-- תיבת המשאלה -->
                <div>
                    <label class="block text-white font-bold mb-2">המשאלה שלך</label>
                    <textarea 
                        bind:value={wishText}
                        placeholder="כתוב כאן את המשאלה שלך..."
                        rows="6"
                        class="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                    ></textarea>
                    <p class="text-sm text-gray-400 mt-2">
                        💡 טיפ: כתוב משאלה חיובית ומלאת תקווה
                    </p>
                </div>

                <!-- כפתור שליחה -->
                <button 
                    on:click={handleSubmit}
                    class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-lg transition-all hover:scale-105 shadow-lg"
                >
                    🙏 הוסף משאלה לכותל
                </button>
            </div>
        </div>

        <!-- הודעת הצלחה -->
        {#if showSuccess}
            <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-slideDown">
                <div class="bg-green-600 text-white px-8 py-6 rounded-xl shadow-2xl border-2 border-green-400">
                    <div class="flex items-center gap-4">
                        <span class="text-4xl">✨</span>
                        <div>
                            <p class="font-bold text-xl">המשאלה נוספה בהצלחה!</p>
                            <p class="text-sm text-green-100">המשאלה שלך נוספה לכותל</p>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- חזרה לדף הבית -->
        <div class="text-center mt-8">
            <a 
                href="/"
                class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
            >
                ← חזרה לדף הבית
            </a>
        </div>
    </div>
</div>

<style>
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -60%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
    }

    .animate-slideDown {
        animation: slideDown 0.3s ease-out;
    }
</style>
