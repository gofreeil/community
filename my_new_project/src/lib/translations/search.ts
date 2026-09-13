// מילון תרגומים לחיפוש חכם — הצעת תיקון ("האם התכוונת ל:"), תוצאות אחרי תיקון אוטומטי,
// והזיהוי של הקלדה בפריסת מקלדת שגויה (עברית שהוקלדה באנגלית).
// כל המפתחות תחת namespace "search" — שימוש: $t('search.key') / $_('search.key') / tFn('search.key')
// משמש את JerusalemMap.svelte, את דף /search ואת Header.svelte.

export const he = {
    search: {
        did_you_mean: "האם התכוונת ל:",
        showing_results_for: "מציג תוצאות עבור",
        search_instead_for: "לחפש במקום זאת את",
        no_results_for: "לא נמצאו תוצאות עבור",
        wrong_layout_hint: "נראה שהוקלד בפריסת מקלדת אנגלית",
    },
};

export const en = {
    search: {
        did_you_mean: "Did you mean:",
        showing_results_for: "Showing results for",
        search_instead_for: "Search instead for",
        no_results_for: "No results for",
        wrong_layout_hint: "Looks like it was typed in an English keyboard layout",
    },
};

export const ru = {
    search: {
        did_you_mean: "Возможно, вы имели в виду:",
        showing_results_for: "Показаны результаты по запросу",
        search_instead_for: "Искать вместо этого",
        no_results_for: "Ничего не найдено по запросу",
        wrong_layout_hint: "Похоже, набрано в английской раскладке",
    },
};
