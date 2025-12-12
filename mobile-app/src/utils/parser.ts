
export const detectContentType = (content: string): string => {
    if (!content) return 'unknown';

    // Encrypted content detection (simplified from original)
    if (content.includes('ENCRYPTED QR CODE') ||
        content.includes('password-protected data') ||
        content.includes('Technical Data:') ||
        /U2FsdGVkX1/.test(content)) {
        return 'encrypted';
    }

    const patterns: Record<string, RegExp> = {
        url: /^https?:\/\//i,
        email: /^mailto:|^[^@]+@[^.]+\.[a-z]{2,}$/i,
        phone: /^tel:|^\\+?[\d\s-]{6,}$/,
        wifi: /^WIFI:(?:T:|S:|P:|H:)/i,
        geo: /^geo:([-?\d.]+),([-?\d.]+)/i,
        sms: /^sms:/i,
        xml: /^<\?xml|^<[^>]+>/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(content)) return type;
    }

    return 'text';
};

export const parseWifiQR = (content: string) => {
    const match = content.match(/WIFI:(?:T:([^;]*);)?(?:S:([^;]*);)?(?:P:([^;]*);)?(?:H:([^;]*);)?/i);
    return {
        type: match?.[1] || 'WPA',
        ssid: match?.[2] || '',
        password: match?.[3] || '',
        hidden: match?.[4] === 'true'
    };
};

export const parseGeoQR = (content: string) => {
    const match = content.match(/geo:([-?\d.]+),([-?\d.]+)/);
    if (match) {
        return {
            lat: match[1],
            lng: match[2]
        };
    }
    return null;
};
