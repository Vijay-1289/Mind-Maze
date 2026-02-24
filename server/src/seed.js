import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question.js';

dotenv.config();

const questions = [
    {
        text: "What gets wetter the more it dries?",
        options: [
            { text: "Cloud", obfuscated: "Floating vapor mass" },
            { text: "Towel", obfuscated: "Fabric absorption tool" },
            { text: "Ocean", obfuscated: "Vast saline body" },
            { text: "Rain", obfuscated: "Falling sky droplets" }
        ],
        correctIndex: 1, difficulty: 1, category: "brain-teaser"
    },
    {
        text: "What has keys but can't open locks?",
        options: [
            { text: "Map", obfuscated: "Navigation chart" },
            { text: "Piano", obfuscated: "Musical instrument" },
            { text: "Keyboard", obfuscated: "Input device" },
            { text: "Chest", obfuscated: "Storage container" }
        ],
        correctIndex: 1, difficulty: 1, category: "brain-teaser"
    },
    {
        text: "The more you take, the more you leave behind. What are they?",
        options: [
            { text: "Footsteps", obfuscated: "Ground impressions" },
            { text: "Memories", obfuscated: "Mental recordings" },
            { text: "Regrets", obfuscated: "Past sorrows" },
            { text: "Time", obfuscated: "Eternal flow" }
        ],
        correctIndex: 0, difficulty: 1, category: "brain-teaser"
    },
    {
        text: "What has an eye but cannot see?",
        options: [
            { text: "Camera", obfuscated: "Light capture box" },
            { text: "Needle", obfuscated: "Thread guide tool" },
            { text: "Storm", obfuscated: "Weather vortex" },
            { text: "Potato", obfuscated: "Underground tuber" }
        ],
        correctIndex: 1, difficulty: 1, category: "brain-teaser"
    },
    {
        text: "What runs but never walks?",
        options: [
            { text: "Cheetah", obfuscated: "Spotted predator" },
            { text: "River", obfuscated: "Flowing water path" },
            { text: "Clock", obfuscated: "Time display" },
            { text: "Wind", obfuscated: "Moving air mass" }
        ],
        correctIndex: 1, difficulty: 1, category: "brain-teaser"
    },
    {
        text: "What has a heart that doesn't beat?",
        options: [
            { text: "Robot", obfuscated: "Mechanical being" },
            { text: "Stone", obfuscated: "Mineral solid" },
            { text: "Artichoke", obfuscated: "Layered vegetable" },
            { text: "Statue", obfuscated: "Carved figure" }
        ],
        correctIndex: 2, difficulty: 2, category: "wordplay"
    },
    {
        text: "What can travel around the world while staying in one spot?",
        options: [
            { text: "Stamp", obfuscated: "Postal adhesive" },
            { text: "Moon", obfuscated: "Night sphere" },
            { text: "Sun", obfuscated: "Day star" },
            { text: "Wind", obfuscated: "Air current" }
        ],
        correctIndex: 0, difficulty: 2, category: "lateral-thinking"
    },
    {
        text: "What gets bigger the more you take away?",
        options: [
            { text: "Debt", obfuscated: "Financial burden" },
            { text: "Hole", obfuscated: "Empty cavity" },
            { text: "Shadow", obfuscated: "Dark projection" },
            { text: "Fear", obfuscated: "Deep anxiety" }
        ],
        correctIndex: 1, difficulty: 2, category: "brain-teaser"
    },
    {
        text: "What has a neck but no head?",
        options: [
            { text: "Bottle", obfuscated: "Liquid container" },
            { text: "Shirt", obfuscated: "Upper garment" },
            { text: "Guitar", obfuscated: "String instrument" },
            { text: "Lamp", obfuscated: "Light source" }
        ],
        correctIndex: 0, difficulty: 2, category: "brain-teaser"
    },
    {
        text: "What can you catch but not throw?",
        options: [
            { text: "Cold", obfuscated: "Common ailment" },
            { text: "Shadow", obfuscated: "Light absence" },
            { text: "Wind", obfuscated: "Air movement" },
            { text: "Light", obfuscated: "Photon stream" }
        ],
        correctIndex: 0, difficulty: 2, category: "wordplay"
    },
    {
        text: "What goes up but never comes down?",
        options: [
            { text: "Smoke", obfuscated: "Combustion vapors" },
            { text: "Balloon", obfuscated: "Inflated sphere" },
            { text: "Age", obfuscated: "Life counter" },
            { text: "Helium", obfuscated: "Noble element" }
        ],
        correctIndex: 2, difficulty: 2, category: "logical-illusion"
    },
    {
        text: "What has many teeth but cannot bite?",
        options: [
            { text: "Comb", obfuscated: "Hair organizer" },
            { text: "Shark", obfuscated: "Ocean predator" },
            { text: "Saw", obfuscated: "Cutting tool" },
            { text: "Gear", obfuscated: "Rotating mechanism" }
        ],
        correctIndex: 0, difficulty: 2, category: "brain-teaser"
    },
    {
        text: "What has a ring but no finger?",
        options: [
            { text: "Tree", obfuscated: "Tall plant" },
            { text: "Phone", obfuscated: "Communication device" },
            { text: "Planet", obfuscated: "Orbital body" },
            { text: "Cup", obfuscated: "Drink vessel" }
        ],
        correctIndex: 1, difficulty: 3, category: "wordplay"
    },
    {
        text: "What begins with T, ends with T, and has T in it?",
        options: [
            { text: "Tent", obfuscated: "Camping shelter" },
            { text: "Test", obfuscated: "Evaluation form" },
            { text: "Teapot", obfuscated: "Brew container" },
            { text: "Treat", obfuscated: "Sweet reward" }
        ],
        correctIndex: 2, difficulty: 3, category: "wordplay"
    },
    {
        text: "What is always in front of you but can't be seen?",
        options: [
            { text: "Air", obfuscated: "Invisible atmosphere" },
            { text: "Future", obfuscated: "Unwritten timeline" },
            { text: "Shadow", obfuscated: "Dark follower" },
            { text: "Hope", obfuscated: "Inner optimism" }
        ],
        correctIndex: 1, difficulty: 3, category: "psychological-trap"
    },
    {
        text: "What has one head, one foot, and four legs?",
        options: [
            { text: "Bed", obfuscated: "Sleeping platform" },
            { text: "Chair", obfuscated: "Sitting furniture" },
            { text: "Table", obfuscated: "Flat surface" },
            { text: "Horse", obfuscated: "Hooved animal" }
        ],
        correctIndex: 0, difficulty: 3, category: "brain-teaser"
    },
    {
        text: "What has branches but no fruit, trunk, or leaves?",
        options: [
            { text: "Library", obfuscated: "Knowledge center" },
            { text: "River", obfuscated: "Water channel" },
            { text: "Bank", obfuscated: "Financial institution" },
            { text: "Road", obfuscated: "Paved pathway" }
        ],
        correctIndex: 2, difficulty: 3, category: "lateral-thinking"
    },
    {
        text: "What comes once in a minute, twice in a moment, but never in a thousand years?",
        options: [
            { text: "Time", obfuscated: "Duration concept" },
            { text: "Second", obfuscated: "Brief instant" },
            { text: "Letter M", obfuscated: "Thirteenth symbol" },
            { text: "Blink", obfuscated: "Eye flutter" }
        ],
        correctIndex: 2, difficulty: 3, category: "logical-illusion"
    },
    {
        text: "What can fill a room but takes up no space?",
        options: [
            { text: "Sound", obfuscated: "Vibration waves" },
            { text: "Light", obfuscated: "Electromagnetic glow" },
            { text: "Air", obfuscated: "Gas mixture" },
            { text: "Heat", obfuscated: "Thermal energy" }
        ],
        correctIndex: 1, difficulty: 3, category: "brain-teaser"
    },
    {
        text: "What has hands but cannot clap?",
        options: [
            { text: "Statue", obfuscated: "Stone figure" },
            { text: "Clock", obfuscated: "Time keeper" },
            { text: "Robot", obfuscated: "Machine being" },
            { text: "Mannequin", obfuscated: "Display dummy" }
        ],
        correctIndex: 1, difficulty: 4, category: "brain-teaser"
    },
    {
        text: "What gets sharper the more you use it?",
        options: [
            { text: "Knife", obfuscated: "Cutting blade" },
            { text: "Brain", obfuscated: "Thinking organ" },
            { text: "Pencil", obfuscated: "Writing stick" },
            { text: "Saw", obfuscated: "Toothed cutter" }
        ],
        correctIndex: 1, difficulty: 4, category: "psychological-trap"
    },
    {
        text: "What can break without being touched?",
        options: [
            { text: "Glass", obfuscated: "Transparent solid" },
            { text: "Promise", obfuscated: "Spoken commitment" },
            { text: "Bone", obfuscated: "Skeletal part" },
            { text: "Silence", obfuscated: "Sound absence" }
        ],
        correctIndex: 1, difficulty: 4, category: "psychological-trap"
    },
    {
        text: "What has cities, rivers, and mountains but no houses?",
        options: [
            { text: "Globe", obfuscated: "Spherical model" },
            { text: "Map", obfuscated: "Flat representation" },
            { text: "Atlas", obfuscated: "Bound charts" },
            { text: "Painting", obfuscated: "Canvas art" }
        ],
        correctIndex: 1, difficulty: 4, category: "lateral-thinking"
    },
    {
        text: "What is so fragile that saying its name breaks it?",
        options: [
            { text: "Silence", obfuscated: "Absolute quiet" },
            { text: "Glass", obfuscated: "See-through solid" },
            { text: "Trust", obfuscated: "Faith bond" },
            { text: "Echo", obfuscated: "Sound reflection" }
        ],
        correctIndex: 0, difficulty: 4, category: "psychological-trap"
    },
    {
        text: "What goes through cities and fields but never moves?",
        options: [
            { text: "Road", obfuscated: "Travel surface" },
            { text: "Wind", obfuscated: "Breeze force" },
            { text: "River", obfuscated: "Flowing current" },
            { text: "Train", obfuscated: "Rail vehicle" }
        ],
        correctIndex: 0, difficulty: 4, category: "brain-teaser"
    },
    {
        text: "What has legs but doesn't walk?",
        options: [
            { text: "Chair", obfuscated: "Rest furniture" },
            { text: "Dog", obfuscated: "Loyal companion" },
            { text: "Table", obfuscated: "Elevated surface" },
            { text: "Shadow", obfuscated: "Dark outline" }
        ],
        correctIndex: 0, difficulty: 5, category: "brain-teaser"
    },
    {
        text: "What can't talk but will reply when spoken to?",
        options: [
            { text: "Mirror", obfuscated: "Reflective glass" },
            { text: "Echo", obfuscated: "Repeated sound" },
            { text: "Phone", obfuscated: "Signal device" },
            { text: "Book", obfuscated: "Written pages" }
        ],
        correctIndex: 1, difficulty: 5, category: "brain-teaser"
    },
    {
        text: "What disappears the moment you say its name?",
        options: [
            { text: "Silence", obfuscated: "Void of noise" },
            { text: "Shadow", obfuscated: "Darkness form" },
            { text: "Dream", obfuscated: "Sleep vision" },
            { text: "Secret", obfuscated: "Hidden truth" }
        ],
        correctIndex: 0, difficulty: 5, category: "psychological-trap"
    },
    {
        text: "What has a bottom at the top?",
        options: [
            { text: "Legs", obfuscated: "Walking limbs" },
            { text: "Mountain", obfuscated: "Tall peak" },
            { text: "Letter B", obfuscated: "Second alphabet" },
            { text: "Bottle", obfuscated: "Glass vessel" }
        ],
        correctIndex: 2, difficulty: 5, category: "logical-illusion"
    },
    {
        text: "What gets shorter as it grows older?",
        options: [
            { text: "Candle", obfuscated: "Wax light source" },
            { text: "Pencil", obfuscated: "Graphite writer" },
            { text: "Shadow", obfuscated: "Sun projection" },
            { text: "Life", obfuscated: "Existence span" }
        ],
        correctIndex: 0, difficulty: 5, category: "brain-teaser"
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindtrap');
        console.log('Connected to MongoDB');

        await Question.deleteMany({});
        console.log('Cleared existing questions');

        await Question.insertMany(questions);
        console.log(`Seeded ${questions.length} questions`);

        // Create admin default (for reference)
        console.log(`\nAdmin credentials:`);
        console.log(`  Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
        console.log(`  Password: ${process.env.ADMIN_PASSWORD || 'mindtrap2026'}`);

        await mongoose.disconnect();
        console.log('Done!');
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}

seed();
