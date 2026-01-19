/**
 * server.js
 * Run this using: node server.js
 * Make sure MongoDB is running!
 */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// --- CONFIGURATION ---
// 1. Set the Port (Render sets process.env.PORT, otherwise use 5000)
const PORT = process.env.PORT || 5000;

// 2. Set the Database Connection String (Use Cloud DB if available, else local)
// IMPORTANT: Replace <password> with your actual MongoDB password (no brackets)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://SelveshStudyDock1:0703ss2006@cluster0.nvop5d0.mongodb.net/?appName=Cluster0";

// Increase limit for file uploads (Notes/Assignments/Profile Pics)
app.use(bodyParser.json({ limit: '10mb' }));

// 3. CORS Configuration (Allow frontend to talk to backend)
app.use(cors({
    origin: "*", // Allow all origins (Easiest for testing/deployment)
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// --- MONGODB CONNECTION ---
mongoose.connect(MONGO_URI) 
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ DB Error:", err));

// --- SCHEMAS (Database Structure) ---
const ClassSchema = new mongoose.Schema({
    id: Number, 
    name: String,
    section: String,
    subjects: [String]
});

const UserSchema = new mongoose.Schema({
    id: Number,
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    classIds: [Number],
    profilePic: String
});

const AssignmentSchema = new mongoose.Schema({
    id: Number,
    classId: Number,
    subject: String,
    title: String,
    desc: String,
    due: String,
    submissions: { type: Map, of: Object } 
});

const NoteSchema = new mongoose.Schema({
    id: Number,
    classId: Number,
    subject: String,
    title: String,
    content: String,
    fileName: String,
    fileData: String, 
    date: String
});

const ExamSchema = new mongoose.Schema({
    id: Number,
    classId: Number,
    subject: String,
    title: String,
    questions: Array,
    results: { type: Map, of: Object },
    showImmediate: { type: Boolean, default: true }
});

const AttendanceSchema = new mongoose.Schema({
    date: String,
    time: String,
    classId: Number,
    subject: String,
    records: { type: Map, of: String }
});

// Models
const Classes = mongoose.model('Class', ClassSchema);
const Users = mongoose.model('User', UserSchema);
const Assignments = mongoose.model('Assignment', AssignmentSchema);
const Notes = mongoose.model('Note', NoteSchema);
const Exams = mongoose.model('Exam', ExamSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

// --- API ROUTES ---

// --- INITIAL LOAD & SYNC ---
app.get('/api/sync-data', async (req, res) => {
    try {
        const data = {
            classes: await Classes.find(),
            users: await Users.find(),
            assignments: await Assignments.find(),
            notes: await Notes.find(),
            exams: await Exams.find(),
            attendance: await Attendance.find()
        };
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    const user = await Users.findOne({ email, password, role });
    if (user) res.json(user);
    else res.status(401).json({ error: "Invalid Credentials" });
});

app.post('/api/register', async (req, res) => {
    try {
        const newUser = new Users(req.body);
        await newUser.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Email exists" }); }
});

app.post('/api/update-profile', async (req, res) => {
    const { userId, profilePic } = req.body;
    try {
        await Users.findOneAndUpdate({ id: userId }, { $set: { profilePic: profilePic } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- UPDATE USER CLASSES ---
app.post('/api/update-user-classes', async (req, res) => {
    const { userId, classIds } = req.body;
    try {
        await Users.findOneAndUpdate({ id: userId }, { $set: { classIds: classIds } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- NEW: DELETE USER ---
app.post('/api/delete-user', async (req, res) => {
    const { userId } = req.body;
    try {
        await Users.deleteOne({ id: userId });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CREATE ROUTES ---
app.post('/api/classes', async (req, res) => {
    await new Classes(req.body).save();
    res.json({ success: true });
});

app.post('/api/users', async (req, res) => {
    await new Users(req.body).save();
    res.json({ success: true });
});

app.post('/api/subjects', async (req, res) => {
    const { classId, subject } = req.body;
    await Classes.findOneAndUpdate({ id: classId }, { $push: { subjects: subject } });
    res.json({ success: true });
});

app.post('/api/assignments', async (req, res) => {
    await new Assignments(req.body).save();
    res.json({ success: true });
});

app.post('/api/attendance', async (req, res) => {
    await new Attendance(req.body).save();
    res.json({ success: true });
});

app.post('/api/notes', async (req, res) => {
    await new Notes(req.body).save();
    res.json({ success: true });
});

app.post('/api/exams', async (req, res) => {
    await new Exams(req.body).save();
    res.json({ success: true });
});

// --- UPDATES (Submissions & Grades & Results) ---
app.post('/api/submit-assignment', async (req, res) => {
    const { assignId, studentId, submission } = req.body;
    const updateKey = `submissions.${studentId}`;
    await Assignments.findOneAndUpdate({ id: assignId }, { $set: { [updateKey]: submission } });
    res.json({ success: true });
});

app.post('/api/grade-assignment', async (req, res) => {
    const { assignId, studentId, grade } = req.body;
    const updateKey = `submissions.${studentId}.grade`;
    await Assignments.findOneAndUpdate({ id: assignId }, { $set: { [updateKey]: grade } });
    res.json({ success: true });
});

app.post('/api/submit-exam', async (req, res) => {
    const { examId, studentId, result } = req.body;
    const updateKey = `results.${studentId}`;
    await Exams.findOneAndUpdate({ id: examId }, { $set: { [updateKey]: result } });
    res.json({ success: true });
});

app.post('/api/toggle-exam-results', async (req, res) => {
    const { examId, show } = req.body;
    await Exams.findOneAndUpdate({ id: examId }, { showImmediate: show });
    res.json({ success: true });
});

// --- LISTEN ON DYNAMIC PORT ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));