// Single source of truth for all cities and neighborhoods.
// Add a new city/neighborhood here and it will automatically
// appear everywhere in the app (advertise page, map, home page).

export interface CityEntry {
    city: string;
    neighborhoods: string[];
}

export const citiesData: CityEntry[] = [
    {
        city: "ירושלים",
        neighborhoods: [
            "קרית משה",
            "רחביה",
            "גבעת שאול",
            "רמות",
            "גילה",
            "קטמון",
            "בקעה",
            "מעלות דפנה",
        ],
    },
    {
        city: "תל אביב",
        neighborhoods: [
            "רמת אביב",
            "פלורנטין",
            "נווה צדק",
            "יפו העתיקה",
            "רמת החייל",
        ],
    },
    {
        city: "חיפה",
        neighborhoods: ["כרמל צרפתי", "נווה שאנן", "רמת אלמוגי", "בת גלים"],
    },
    {
        city: "הרצליה",
        neighborhoods: ["הרצליה פיתוח", "נוה עובד", "נווה ישראל"],
    },
    {
        city: "בני ברק",
        neighborhoods: ["פרדס כץ", "רמת אלחנן", "שיכון ה"],
    },
    {
        city: "באר שבע",
        neighborhoods: ["רמות", "נווה זאב", "נווה נוי", "רמת חן"],
    },
    {
        city: "אילת",
        neighborhoods: ["שכונת התמרים", "שכונת הדקלים", "שכונת השחמון"],
    },
    {
        city: "נתניה",
        neighborhoods: ["קרית השרון", "רמת פולג", "נווה גנים"],
    },
    {
        city: "פתח תקווה",
        neighborhoods: ["קרית אריה", "נווה עוז", "שיכון דן"],
    },
    {
        city: "ראשון לציון",
        neighborhoods: ["נווה דקלים", "רמת אליהו", "שיכון ותיקים"],
    },
    {
        city: "רחובות",
        neighborhoods: ["רמת רחובות", "נווה חוף", "שכונת הדרים"],
    },
];

// Convenience: plain object for components that need Record<string, string[]>
export const citiesAndNeighborhoods: Record<string, string[]> = Object.fromEntries(
    citiesData.map((e) => [e.city, e.neighborhoods]),
);

export const DEFAULT_NEIGHBORHOOD = "קרית משה";
export const LS_KEY = "shchuna_selected_neighborhood"; // localStorage key
