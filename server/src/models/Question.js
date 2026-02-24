import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [{
        text: { type: String, required: true },
        obfuscated: { type: String, required: true }
    }],
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    difficulty: { type: Number, required: true, min: 1, max: 5, default: 1 },
    category: {
        type: String,
        enum: ['brain-teaser', 'logical-illusion', 'psychological-trap', 'wordplay', 'lateral-thinking'],
        default: 'brain-teaser'
    },
    active: { type: Boolean, default: true }
}, { timestamps: true });

questionSchema.index({ difficulty: 1, active: 1 });

export default mongoose.model('Question', questionSchema);
