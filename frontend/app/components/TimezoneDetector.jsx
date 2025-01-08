// src/components/TimezoneDetector.jsx

import React, { useEffect } from 'react';
import Cookies from 'js-cookie';

const TimezoneDetector = () => {
    useEffect(() => {
        const detectAndSetTimezone = () => {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const storedTimezone = Cookies.get('user_timezone');

            if (timezone !== storedTimezone) {
                // Update the cookie (expires in 30 days)
                Cookies.set('user_timezone', timezone, { expires: 30, secure: false, sameSite: 'Lax' }); //change secure for True in Production

                console.log(`Timezone updated: ${timezone}`);
            }
        };

        // Initial detection
        detectAndSetTimezone();

        // Set up an interval to detect timezone changes every 5 minutes
        const intervalId = setInterval(detectAndSetTimezone, 5 * 60 * 1000);

        // Cleanup on component unmount
        return () => clearInterval(intervalId);
    }, []);

    return null; // This component doesn't render anything
};

export default TimezoneDetector;
