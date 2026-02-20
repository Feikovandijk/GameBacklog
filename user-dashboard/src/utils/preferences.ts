export const getAnalysisTemplate = (): string[] => {
    const defaultTemplate = [
        'What worked well (To Steal)',
        "What didn't work (To Avoid)",
        'Takeaways for our game',
    ];
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const parsed = JSON.parse(userStr);
            if (
                parsed?.analysis_template &&
                Array.isArray(parsed.analysis_template) &&
                parsed.analysis_template.length > 0
            ) {
                return parsed.analysis_template;
            }
        }
    } catch {
        // Ignore parse errors
    }
    return defaultTemplate;
};
