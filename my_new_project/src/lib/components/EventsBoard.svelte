<script lang="ts">
    // ============================================================
    // EventsBoard - "לוח האירועים" כפי שנראה לתושבים בדף הבית.
    // מקבל את רשימת האירועים הגולמית (DbEvent[]) ומרנדר בדיוק את אותו
    // כרטיס כמו בדף הבית, כולל סנכרון ליומן (Google / ICS).
    // ============================================================
    import { t } from 'svelte-i18n';

    // צורת אירוע גולמי כפי שמגיע מ-getEvents (בלי לייבא טיפוס שרת לצד-לקוח)
    type RawEvent = { title: string; location: string; date: string; time?: string; color?: string; icon?: string };
    let { rawEvents = [] }: { rawEvents?: RawEvent[] } = $props();

    // --- Calendar sync (ICS + Google Calendar) --- (זהה לדף הבית)
    interface CalEvent {
        title: string;
        location: string;
        date: string;      // e.g. '2026-03-15'
        startTime: string;  // e.g. '20:00'
        endTime: string;    // e.g. '21:30'
        description?: string;
    }
    type EventCard = CalEvent & { bgColor: string; textColor: string; subColor: string };

    // מיפוי צבע → קלאסים (Tailwind safelist-friendly)
    const COLOR_MAP: Record<string, { bg: string; text: string; sub: string }> = {
        green:  { bg: 'bg-green-600/20',  text: 'text-green-400',  sub: 'text-green-300/70'  },
        blue:   { bg: 'bg-blue-600/20',   text: 'text-blue-400',   sub: 'text-blue-300/70'   },
        purple: { bg: 'bg-purple-600/20', text: 'text-purple-400', sub: 'text-purple-300/70' },
        orange: { bg: 'bg-orange-600/20', text: 'text-orange-400', sub: 'text-orange-300/70' },
        pink:   { bg: 'bg-pink-600/20',   text: 'text-pink-400',   sub: 'text-pink-300/70'   },
        red:    { bg: 'bg-red-600/20',    text: 'text-red-400',    sub: 'text-red-300/70'    },
        yellow: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', sub: 'text-yellow-300/70' },
        teal:   { bg: 'bg-teal-600/20',   text: 'text-teal-400',   sub: 'text-teal-300/70'   },
    };

    function addOneHour(time: string): string {
        const m = /^(\d{1,2}):(\d{2})/.exec(time);
        if (!m) return time;
        let h = parseInt(m[1], 10) + 1;
        if (h >= 24) h = 23;
        return `${String(h).padStart(2, '0')}:${m[2]}`;
    }

    const todayIso = new Date().toISOString().split('T')[0];
    function isoPlusDays(days: number): string {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    // אירועי דוגמה (mock) - מוצגים כל עוד אין אירוע אמיתי בשכונה (זהה לדף הבית)
    const mockEvents: EventCard[] = $derived([
        { title: `🎤 ${$t('home.mock_event1_title')}`, location: $t('home.mock_event1_location'), date: isoPlusDays(2),  startTime: '20:00', endTime: '21:00', bgColor: COLOR_MAP.green.bg,  textColor: COLOR_MAP.green.text,  subColor: COLOR_MAP.green.sub  },
        { title: `🏃 ${$t('home.mock_event2_title')}`, location: $t('home.mock_event2_location'), date: isoPlusDays(5),  startTime: '07:30', endTime: '08:30', bgColor: COLOR_MAP.blue.bg,   textColor: COLOR_MAP.blue.text,   subColor: COLOR_MAP.blue.sub   },
        { title: `🎉 ${$t('home.mock_event3_title')}`, location: $t('home.mock_event3_location'), date: isoPlusDays(8),  startTime: '19:30', endTime: '20:30', bgColor: COLOR_MAP.purple.bg, textColor: COLOR_MAP.purple.text, subColor: COLOR_MAP.purple.sub },
        { title: `🌱 ${$t('home.mock_event4_title')}`, location: $t('home.mock_event4_location'), date: isoPlusDays(14), startTime: '09:00', endTime: '10:00', bgColor: COLOR_MAP.orange.bg, textColor: COLOR_MAP.orange.text, subColor: COLOR_MAP.orange.sub },
    ]);

    const realEvents: EventCard[] = $derived(
        (rawEvents ?? [])
            .filter(ev => ev.date >= todayIso)
            .slice(0, 4)
            .map(ev => {
                const c = COLOR_MAP[ev.color ?? ''] ?? COLOR_MAP.blue;
                const startTime = ev.time || '00:00';
                const titleWithIcon = ev.title.match(/^\p{Emoji}/u) ? ev.title : `${ev.icon || '📅'} ${ev.title}`;
                return {
                    title:     titleWithIcon,
                    location:  ev.location,
                    date:      ev.date,
                    startTime,
                    endTime:   addOneHour(startTime),
                    bgColor:   c.bg,
                    textColor: c.text,
                    subColor:  c.sub,
                };
            })
    );

    const events: EventCard[] = $derived(realEvents.length > 0 ? realEvents : mockEvents);

    let calMenuOpen = $state<number | null>(null);

    function toICSDate(date: string, time: string): string {
        return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
    }
    function downloadICS(ev: CalEvent) {
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//קהילה בשכונה//Events//HE',
            'BEGIN:VEVENT',
            `DTSTART:${toICSDate(ev.date, ev.startTime)}`,
            `DTEND:${toICSDate(ev.date, ev.endTime)}`,
            `SUMMARY:${ev.title}`,
            `LOCATION:${ev.location}`,
            `DESCRIPTION:${$t('home.calendar_event_desc')}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ev.title.replace(/[^\w֐-׿ ]/g, '')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        calMenuOpen = null;
    }
    function openGoogleCalendar(ev: CalEvent) {
        const start = toICSDate(ev.date, ev.startTime);
        const end = toICSDate(ev.date, ev.endTime);
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${start}/${end}&location=${encodeURIComponent(ev.location)}&details=${encodeURIComponent($t('home.calendar_event_desc'))}`;
        window.open(url, '_blank');
        calMenuOpen = null;
    }
    function handleCalClick(index: number, e: MouseEvent) {
        e.stopPropagation();
        calMenuOpen = calMenuOpen === index ? null : index;
    }
</script>

<!-- סגירת תפריט היומן בלחיצה מחוץ לכפתור -->
<svelte:window onclick={() => (calMenuOpen = null)} />

<!-- לוח האירועים - זהה לדף הבית -->
<div class="flex-1 min-h-0 rounded-2xl bg-[#0f172a] border border-2 border-green-500/30 shadow-2xl flex flex-col overflow-hidden">
    <div class="bg-gradient-to-r from-green-600 to-teal-600 p-3 flex items-center justify-between flex-shrink-0 relative">
        <a href="/events" class="absolute inset-0 z-0" aria-hidden="true"></a>
        <a href="/events" class="text-sm font-bold text-white flex items-center gap-2 hover:text-yellow-200 transition-colors relative z-10">
            <span class="text-base">🗓️</span>
            {$t('home.events_board')}
        </a>
        <a href="/events#add" class="inline-flex items-center bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors border border-white/20 relative z-10">
            {$t('home.add_btn')}
        </a>
    </div>
    <div class="p-3 flex-1 overflow-hidden flex flex-col justify-evenly relative">
        {#if events.length === 0}
            <div class="flex-1 flex items-center justify-center text-center px-2">
                <p class="text-gray-400 text-xs">{$t('home.no_upcoming_events')}<br/><a href="/events#add" class="text-yellow-400 hover:text-white underline">{$t('home.suggest_event')}</a></p>
            </div>
        {/if}
        {#each events as ev, i}
            {@const day = ev.date.split('-')[2]}
            {@const months = $t('home.months').split(',')}
            {@const month = months[parseInt(ev.date.split('-')[1]) - 1]}
            <div class="relative flex gap-3 items-center bg-white/5 rounded-xl p-3 border border-white/8 cursor-pointer hover:bg-white/10 transition-all group">
                <button
                    onclick={(e) => handleCalClick(i, e)}
                    class="flex flex-col items-center {ev.bgColor} rounded-lg px-2 py-1.5 min-w-[44px] text-center flex-shrink-0 active:opacity-70 transition-opacity"
                    title={$t('home.add_to_calendar')}
                >
                    <span class="{ev.textColor} font-bold text-base leading-none">{day}</span>
                    <span class="{ev.subColor} text-[10px] leading-none mt-0.5">{month}</span>
                    <svg class="w-3.5 h-3.5 mt-1 {ev.textColor} opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </button>
                <div class="min-w-0 flex-1">
                    <p class="text-white text-sm font-bold leading-tight">{ev.title}</p>
                    <p class="text-gray-400 text-xs mt-0.5">{ev.location}, {ev.startTime}</p>
                </div>
                <!-- Calendar dropdown -->
                {#if calMenuOpen === i}
                    <div class="absolute left-0 top-full mt-1 z-50 bg-[#1e293b] border border-white/20 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[180px]">
                        <button onclick={() => openGoogleCalendar(ev)} class="flex items-center gap-2 text-xs text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors text-right w-full">
                            <span class="text-base">📅</span> Google Calendar
                        </button>
                        <button onclick={() => downloadICS(ev)} class="flex items-center gap-2 text-xs text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors text-right w-full">
                            <span class="text-base">📲</span> Apple / Outlook (.ics)
                        </button>
                    </div>
                {/if}
            </div>
        {/each}
        <!-- fade-out overlay -->
        <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-20 rounded-b-xl" style="background: linear-gradient(to bottom, transparent, #0f172a 90%);"></div>
    </div>
    <div class="px-3 pb-2 flex-shrink-0">
        <a href="/events" class="block text-center text-yellow-400 hover:text-white text-xs font-bold transition-colors underline underline-offset-2 py-1">
            {$t('home.all_events')}
        </a>
    </div>
</div>
