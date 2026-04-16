import { db } from './src/db/index.ts';
import { reports } from './src/db/schema.ts';

async function checkReports() {
    try {
        const allReports = await db.select().from(reports);
        console.log('Total reports:', allReports.length);
        console.log('Reports:', JSON.stringify(allReports, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkReports();
