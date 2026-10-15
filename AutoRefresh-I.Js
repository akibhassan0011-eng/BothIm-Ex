(function () {
    'use strict';

    const SHEET2_URL = "https://script.google.com/macros/s/AKfycbzQay1RCpQg35dSTa5QjJPCE_dcZ_c_N4jn3Zy47xSIxdHZeZgefOvr_vDydkEzRLuGfg/exec";
    let isChecking = false;

    function checkAndRefresh() {
        if (isChecking) return;
        isChecking = true;

        // ক্যাশ বাইপাস করার জন্য টাইমস্ট্যাম্প যোগ
        const fetchUrl = SHEET2_URL + (SHEET2_URL.includes('?') ? '&' : '?') + 't=' + Date.now();

        GM_xmlhttpRequest({
            method: "GET",
            url: fetchUrl,
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache"
            },
            onload: function (res) {
                isChecking = false;
                try {
                    const data = JSON.parse(res.responseText);
                    const refreshStatus = String(data.refresh || data.REFRESH || '').trim().toUpperCase();

                    const lastStatus = sessionStorage.getItem('script_last_status');
                    sessionStorage.setItem('script_last_status', refreshStatus);

                    // ১. OFF থেকে ON হলে সাথে সাথে আগের সব টাইমার মুছে ফেলা হবে
                    if (lastStatus === 'OFF' && refreshStatus === 'ON') {
                        sessionStorage.removeItem('script_last_refresh_batch');
                        sessionStorage.removeItem('script_refresh_count');
                    }

                    // ২. ৩ মিনিটের (১৮০,০০০ মিলি-সেকেন্ড) বিরতি পরীক্ষা
                    const lastBatchTime = sessionStorage.getItem('script_last_refresh_batch');
                    if (lastBatchTime && (Date.now() - parseInt(lastBatchTime, 10) < 180000)) {
                        return;
                    }

                    if (refreshStatus === 'ON') {
                        let refreshCount = parseInt(sessionStorage.getItem('script_refresh_count') || '0', 10);

                        if (refreshCount < 4) {
                            sessionStorage.setItem('script_refresh_count', refreshCount + 1);

                            if (refreshCount + 1 >= 4) {
                                sessionStorage.setItem('script_last_refresh_batch', Date.now().toString());
                                sessionStorage.removeItem('script_refresh_count');
                            }

                            // ৩. সম্পূর্ণ ক্যাশ ও পেজের নতুন কোড হার্ড-রিফ্রেশ করা
                            window.location.href = window.location.href.split('#')[0];
                            window.location.reload(true);
                        }
                    } else {
                        // OFF থাকলে সমস্ত কাউন্টার রিসেট হবে
                        sessionStorage.removeItem('script_refresh_count');
                        sessionStorage.removeItem('script_last_refresh_batch');
                    }
                } catch (e) {
                    console.warn("Google Sheet API Response Error");
                }
            },
            onerror: function () {
                isChecking = false;
            }
        });
    }

    // প্রতি ২ সেকেন্ড পর পর চেক করবে
    checkAndRefresh();
    setInterval(checkAndRefresh, 2000);

})();
