import { useState, useEffect } from 'react';
import { adminGetQuestions, adminSaveQuestion, adminDeleteQuestion } from '../api';

export default function AdminQuestions({ token }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        difficulty: 1,
        category: 'brain-teaser'
    });

    const categories = ['brain-teaser', 'logical-illusion', 'psychological-trap', 'wordplay', 'lateral-thinking'];

    const loadQuestions = async () => {
        setLoading(true);
        try {
            const data = await adminGetQuestions(token);
            setQuestions(data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadQuestions();
    }, [token]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await adminSaveQuestion(token, formData, editing?._id);
            setEditing(null);
            loadQuestions();
        } catch (err) {
            console.error(err);
            alert('Failed to save question');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await adminDeleteQuestion(token, id);
            loadQuestions();
        } catch (err) {
            console.error(err);
        }
    };

    const editQuestion = (q) => {
        setFormData({ ...q });
        setEditing(q);
    };

    const openNewQuestion = () => {
        setFormData({
            text: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            difficulty: 1,
            category: 'brain-teaser'
        });
        setEditing({ isNew: true });
    };

    if (loading && questions.length === 0) return <div>Loading questions...</div>;

    if (editing) {
        return (
            <div className="admin-form-container" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <h2 style={{ marginBottom: '15px' }}>{editing.isNew ? 'Create New Question' : 'Edit Question'}</h2>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    <label>Question Text (What is shown on sign):
                        <input required value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })}
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                    </label>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <label>Difficulty (1-5):
                            <input type="number" min={1} max={5} required value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                                style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                        </label>
                        <label>Category:
                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '5px', background: '#333', color: '#fff', border: '1px solid #555' }}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </label>
                    </div>

                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '10px' }}>Options (4 max)</h3>
                        {formData.options.map((opt, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                <input type="radio" name="correctIndex"
                                    checked={formData.correctIndex === i}
                                    onChange={() => setFormData({ ...formData, correctIndex: i })}
                                    style={{ transform: 'scale(1.5)', margin: '0 10px' }}
                                />
                                <input required placeholder={`Option ${i + 1}`} value={opt}
                                    onChange={e => {
                                        const newOpts = [...formData.options];
                                        newOpts[i] = e.target.value;
                                        setFormData({ ...formData, options: newOpts });
                                    }} style={{ flex: 1, padding: '8px' }} />
                            </div>
                        ))}
                        <small style={{ color: 'var(--text-secondary)' }}>* Select the radio button next to the correct answer.</small>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="submit" className="btn-success" style={{ padding: '10px 20px', fontWeight: 'bold' }}>Save Question</button>
                        <button type="button" className="btn-warning" onClick={() => setEditing(null)} style={{ padding: '10px 20px' }}>Cancel</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Questions DB: {questions.length} Total</h3>
                <button className="btn-success btn-sm" onClick={openNewQuestion}>+ Add New Question</button>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th style={{ width: '40%' }}>Question</th>
                        <th>Category</th>
                        <th>Diff.</th>
                        <th>Options</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {questions.map((q) => (
                        <tr key={q._id}>
                            <td style={{ textAlign: 'left' }}><strong>{q.text}</strong></td>
                            <td><span className="badge">{q.category}</span></td>
                            <td>{'★'.repeat(q.difficulty)}</td>
                            <td>{q.options?.length || 0}</td>
                            <td style={{ display: 'flex', gap: '5px' }}>
                                <button className="btn-warning btn-sm" onClick={() => editQuestion(q)}>Edit</button>
                                <button className="btn-danger btn-sm" onClick={() => handleDelete(q._id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
