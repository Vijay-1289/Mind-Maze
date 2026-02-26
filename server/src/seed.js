import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsPath = path.join(__dirname, '../../30_questions.json');
const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

export async function seedQuestions() {
    await Question.deleteMany({});
    console.log('✅ Cleared existing questions');

    await Question.insertMany(questions);
    console.log(`✅ Seeded ${questions.length} questions`);
}

// CLI mode: run directly with `node src/seed.js`
const isMainModule = process.argv[1]?.includes('seed.js');
if (isMainModule) {
    (async () => {
        try {
            // Note: Currently uses MongoMemoryServer for standalone tests.
            // If connecting to actual DB, use process.env.MONGODB_URI
            console.log("Connecting to Database...");
            if (process.env.MONGODB_URI) {
                await mongoose.connect(process.env.MONGODB_URI);
            } else {
                const { MongoMemoryServer } = await import('mongodb-memory-server');
                const mongod = await MongoMemoryServer.create();
                await mongoose.connect(mongod.getUri());
            }
            await seedQuestions();
            await mongoose.disconnect();
            console.log('Done!');
        } catch (err) {
            console.error('Seed error:', err);
            process.exit(1);
        }
    })();
}
