
function getCountdown(endStr) {
    const end = new Date(endStr).getTime();
    const now = new Date("2026-02-10T17:30:00").getTime(); // Simulating a time just after the ban start in the screenshot (17:29:40)
    
    // Screenshot 1: Ban Start 17:29:40. Screenshot 2: Ban End 18:29:40.
    // So duration is 1 hour.
    
    const diffMs = end - now;
    
    if (diffMs <= 0) return "已过期";
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let text = "";
    if (days > 0) {
        text = `${days}天${hours}小时`;
    } else if (hours > 0) {
        text = `${hours}小时${minutes}分钟`;
    } else {
        text = `${minutes > 0 ? minutes : 1}分钟`;
    }
    
    return `剩余 ${text}`;
}

// Test case from user's screenshot context
// Ban End: 2026/02/10 18:29:40
console.log("Test 1 (End 18:29:40, Now 17:30:00):", getCountdown("2026-02-10T18:29:40"));

// Test case: 1 day 2 hours left
const future = new Date("2026-02-11T19:30:00").toISOString();
console.log("Test 2 (1 day 2 hours):", getCountdown(future));

// Test case: 30 mins left
const near = new Date("2026-02-10T18:00:00").toISOString();
console.log("Test 3 (30 mins):", getCountdown(near));
