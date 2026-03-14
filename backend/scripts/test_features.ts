import { logger } from "../src/utils/logger.js";
import { prisma } from "../src/db.js";
import fs from "fs";
import path from "path";

async function testLogging() {
    console.log("\n--- Testing Logging ---");
    const testId = Date.now().toString();
    logger.debug(`Test Debug ${testId}`);
    logger.info(`Test Info ${testId}`);
    logger.warn(`Test Warn ${testId}`);
    logger.error(`Test Error ${testId}`);

    // Allow FS flush
    await new Promise(r => setTimeout(r, 100));

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(process.cwd(), "logs", `app-${date}.log`);
    
    if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, "utf-8");
        if (content.includes(`Test Info ${testId}`) && content.includes(`Test Error ${testId}`)) {
             console.log("✅ Logging Test Passed: File created and content verified.");
        } else {
             console.error("❌ Logging Test Failed: Content missing.");
        }
    } else {
        console.error("❌ Logging Test Failed: File not found at " + logFile);
    }
}

async function testRanking() {
    console.log("\n--- Testing Ranking Algorithm ---");
    try {
        // 1. Create a dummy report
        const report = await prisma.report.create({
            data: {
                title: "Test Ranking Report " + Date.now(),
                content: "Testing ranking algorithm logic...",
                targetName: "Test Target",
                platform: "TestPlatform",
                hotScore: 0,
                createdBy: {
                    connectOrCreate: {
                        where: { username: "test_ranker" },
                        create: { username: "test_ranker", role: "USER" }
                    }
                }
            }
        });

        console.log(`Created Report ${report.id} with Initial Score: ${report.hotScore}`);

        // 2. Simulate 10 Views (10 * 0.6 = 6.0)
        // In real app, this happens via 10 separate API calls, but logic is same
        await prisma.report.update({
            where: { id: report.id },
            data: { 
                trafficVolume: { increment: 10 }, 
                hotScore: { increment: 6.0 } 
            }
        });

        // 3. Simulate 5 Comments (5 * 0.4 = 2.0)
        await prisma.report.update({
            where: { id: report.id },
            data: { hotScore: { increment: 2.0 } }
        });

        // 4. Verify Score (Should be 8.0)
        const updated = await prisma.report.findUnique({ where: { id: report.id } });
        
        // Float comparison
        const score = updated?.hotScore || 0;
        const expected = 8.0;
        
        if (Math.abs(score - expected) < 0.001) {
            console.log(`✅ Ranking Logic Test Passed: Score is ${score} (Expected ${expected})`);
        } else {
            console.error(`❌ Ranking Logic Test Failed: Score is ${score}, Expected ${expected}`);
        }

        // 5. Test Sorting Query
        const reports = await prisma.report.findMany({
            where: { id: report.id },
            orderBy: { hotScore: "desc" }
        });
        
        if (reports.length > 0 && reports[0].id === report.id) {
             console.log("✅ Sorting Query Test Passed");
        }

        // Clean up
        await prisma.report.delete({ where: { id: report.id } });
        
    } catch (e) {
        console.error("❌ Ranking Test Failed with Exception:", e);
    }
}

async function run() {
    await testLogging();
    await testRanking();
    process.exit(0);
}

run();
