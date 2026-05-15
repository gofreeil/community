<script lang="ts">
    interface ChatMessage {
        id: number;
        name: string;
        text: string;
        time: string;
    }

    // מוקאפ בלבד — הודעות לדוגמה, ללא חיבור לבאקהנד
    const messages: ChatMessage[] = [
        { id: 1, name: 'דנה כהן', text: 'בוקר טוב לכולם! מישהו יודע מתי מגיע הטרמפ המשותף הבוקר?', time: '08:15' },
        { id: 2, name: 'משה לוי', text: 'יוצא בעוד עשר דקות מרחוב הרב הרצוג, יש עוד מקום אחד 🙂', time: '08:22' },
        { id: 3, name: 'רבקה פרידמן', text: 'תודה רבה לשכנים שעזרו אתמול עם ההובלה — קהילה אמיתית ❤️', time: '09:10' },
        { id: 4, name: 'יוסי אברהם', text: 'מישהו ממליץ על גמ"ח כלים לאירוע שבת הקרובה?', time: '09:48' }
    ];

    function initials(n: string) {
        return n.trim()[0] || '🙂';
    }
</script>

<div class="chat-wrapper" dir="rtl">
    <div class="mb-3 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
        <div class="flex items-center gap-2 mb-1">
            <svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.04 2 11c0 2.6 1.23 4.94 3.2 6.56-.1 1.2-.5 2.86-1.7 4.44 1.9-.2 3.7-.9 5.1-1.9 1.05.3 2.18.46 3.4.46 5.52 0 10-4.04 10-9.56S17.52 2 12 2z"/>
            </svg>
            <h4 class="text-white font-bold">צ'אט שכונתי חברתי</h4>
        </div>
        <p class="text-gray-400 text-sm">
            דברו, שאלו ושתפו עם השכנים בזמן אמת — בלי צורך בחשבון חיצוני
        </p>
    </div>

    <div class="messages no-scrollbar">
        {#each messages as msg (msg.id)}
            <div class="msg">
                <div class="avatar">{initials(msg.name)}</div>
                <div class="bubble">
                    <div class="bubble-head">
                        <span class="msg-name">{msg.name}</span>
                        <span class="msg-time">{msg.time}</span>
                    </div>
                    <p class="msg-text">{msg.text}</p>
                </div>
            </div>
        {/each}
    </div>

    <div class="composer">
        <input
            type="text"
            placeholder="כתבו הודעה לשכונה..."
            class="text-input"
            aria-label="הודעה"
            disabled
        />
        <button type="button" class="send-btn" aria-label="שלח הודעה" disabled>
            שלח
        </button>
    </div>
    <p class="soon-note">בקרוב — צ'אט שכונתי חי לכל השכנים</p>
</div>

<style>
    .chat-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
    }
    .no-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .no-scrollbar::-webkit-scrollbar {
        display: none;
        width: 0;
    }
    .messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 0.25rem;
    }
    .msg {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
    }
    .avatar {
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, #6366f1, #ec4899);
        font-size: 0.85rem;
    }
    .bubble {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.9rem;
        padding: 0.45rem 0.7rem;
        max-width: 85%;
    }
    .bubble-head {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 0.15rem;
    }
    .msg-name {
        font-weight: 700;
        font-size: 0.8rem;
        background: linear-gradient(to right, #c4b5fd, #93c5fd);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }
    .msg-time {
        font-size: 0.65rem;
        color: #64748b;
    }
    .msg-text {
        color: #e2e8f0;
        font-size: 0.875rem;
        line-height: 1.35;
        word-break: break-word;
    }
    .composer {
        flex-shrink: 0;
        display: flex;
        gap: 0.4rem;
        padding-top: 0.5rem;
    }
    .text-input {
        flex: 1;
        min-width: 0;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 0.6rem;
        padding: 0.45rem 0.7rem;
        color: #fff;
        font-size: 0.85rem;
        outline: none;
    }
    .send-btn {
        flex-shrink: 0;
        background: linear-gradient(135deg, #6366f1, #ec4899);
        color: #fff;
        font-weight: 700;
        font-size: 0.85rem;
        border-radius: 0.6rem;
        padding: 0.45rem 1rem;
    }
    .composer input:disabled,
    .send-btn:disabled {
        opacity: 0.5;
    }
    .soon-note {
        flex-shrink: 0;
        text-align: center;
        color: #64748b;
        font-size: 0.7rem;
        margin-top: 0.35rem;
    }
</style>
