<script lang="ts">
    // פס "אנחנו בדרך ל..." במסכי ההרשמה/כניסה/אשף: מי שהגיעה מכפתור "בקשה להיות שדכן"
    // רואה שהמסלול ממשיך, ושבסיום היא חוזרת לבד לשליחת הבקשה - לא הולכת לאיבוד.
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { peekReturn, MATCHMAKER_JOIN_PATH } from '$lib/postAuthReturn';

    let active = $state(false);
    onMount(() => { active = peekReturn() === MATCHMAKER_JOIN_PATH; });
</script>

{#if active}
    <div role="status" class="mb-4 rounded-2xl bg-gradient-to-r from-rose-500/15 to-purple-500/10 border border-rose-400/30 px-4 py-3 text-center">
        <p class="text-rose-100 text-sm font-bold">💘 {$_('extras.mm_join_banner')}</p>
    </div>
{/if}
