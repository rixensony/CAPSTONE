/**
 * Demo data seeder.
 *
 *   npm run seed            → adds demo data (skips if users already exist)
 *   npm run seed -- --force → wipes all collections first
 *
 * Password policy (guide §10: no test passwords in the repository):
 * - When SEED_PASSWORD is set in .env, every demo user gets that password.
 * - Otherwise the script GENERATES one random password for all demo users
 *   and prints the credentials table to the terminal — never stored in code.
 */
import crypto from 'node:crypto';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import JoinRequest from '../models/JoinRequest.js';
import { connectDB, disconnectDB } from '../config/db.js';

const force = process.argv.includes('--force');

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const STUDENTS = [
  {
    name: 'Aditi Rao',
    email: 'aditi@skillbridge.dev',
    department: 'Computer Science',
    skills: ['React', 'Node.js', 'MongoDB', 'Express'],
    interests: ['Web Development', 'Hackathons'],
    bio: 'Third-year CSE student. I build full-stack apps with the MERN stack and love clean UX.',
  },
  {
    name: 'Bharat Menon',
    email: 'bharat@skillbridge.dev',
    department: 'Information Technology',
    skills: ['Python', 'Data Science', 'Machine Learning'],
    interests: ['AI', 'Kaggle'],
    bio: 'Data Science minor; comfortable with pandas, scikit-learn and a Jupyter notebook.',
  },
  {
    name: 'Charu Nair',
    email: 'charu@skillbridge.dev',
    department: 'Design & Media',
    skills: ['UI/UX Design', 'Figma', 'HTML/CSS'],
    interests: ['Accessibility', 'Illustration'],
    bio: 'I design interfaces that pass contrast checks and delight users.',
  },
  {
    name: 'Devan Pillai',
    email: 'devan@skillbridge.dev',
    department: 'Electronics & Communication',
    skills: ['Flutter', 'Android', 'Firebase'],
    interests: ['Mobile apps', 'IoT'],
    bio: 'IoT enthusiast shipping cross-platform mobile prototypes.',
  },
  {
    name: 'Eshita Roy',
    email: 'eshita@skillbridge.dev',
    department: 'Computer Science',
    skills: ['Python', 'Data Science', 'Git'],
    interests: ['Visualization', 'Open source'],
    bio: 'I turn messy datasets into dashboards people actually read.',
  },
  {
    name: 'Farhan Zakir',
    email: 'farhan@skillbridge.dev',
    department: 'Mechanical Engineering',
    skills: ['Java', 'C++', 'Git'],
    interests: ['Robotics', 'Coding contests'],
    bio: 'Mechanical background, discovered backend development in year two — now I never look back.',
  },
];

const ADMIN = {
  name: 'SkillBridge Admin',
  email: 'admin@skillbridge.dev',
  department: 'Administration',
  skills: [],
  interests: ['Moderation'],
  bio: 'Keeps the platform tidy.',
};

const PROJECTS = [
  {
    key: 'aditi',
    title: 'Campus Events Hub — one place for every club event',
    description:
      'Students miss events because announcements scatter across WhatsApp groups. Build a React + Node app where clubs post events, students RSVP, and a calendar view aggregates everything.',
    requiredSkills: ['React', 'Node.js', 'MongoDB'],
    teamSize: 2,
    createdAt: daysAgo(9),
  },
  {
    key: 'bharat',
    title: 'Hostel Mess Feedback Analyzer with ML sentiment',
    description:
      'A Python web app where students rate the daily mess menu and a lightweight sentiment model summarises weekly trends for the committee. Mobile-friendly charts required.',
    requiredSkills: ['Python', 'Data Science'],
    teamSize: 3,
    createdAt: daysAgo(6),
  },
  {
    key: 'charu',
    title: 'Budget Trip Planner for student groups',
    description:
      'Plan hostel trips with shared budgets: React frontend, Node expense-splitting API, and a receipt photo upload. First version focuses on one city.',
    requiredSkills: ['Node.js', 'Express'],
    teamSize: 2,
    createdAt: daysAgo(12),
  },
  {
    key: 'devan',
    title: 'AR flashcards revision tool for exam week',
    description:
      'A Flutter app that renders Chemistry and Physics flashcards in AR using the device camera, with spaced repetition reminders during revision days.',
    requiredSkills: ['Flutter', 'Android'],
    teamSize: 2,
    createdAt: daysAgo(25),
  },
  {
    key: 'eshita',
    title: 'Placement Prep Tracker with weekly scoring',
    description:
      'Daily tracker with DSA problem streaks, mock interview notes and a Python scoring service that compares placement-readiness progress week over week.',
    requiredSkills: ['Python', 'Data Science'],
    teamSize: 1,
    createdAt: daysAgo(3),
  },
];

function generatePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (const byte of crypto.randomBytes(12)) password += alphabet[byte % alphabet.length];
  return password;
}

async function main() {
  await connectDB();

  if (force) {
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Team.deleteMany({}),
      JoinRequest.deleteMany({}),
    ]);
  } else if ((await User.countDocuments({})) > 0) {
    console.log('Database already contains users — pass --force to wipe and reseed.');
    return;
  }

  const password = process.env.SEED_PASSWORD || generatePassword();

  const users = await User.create({
    ...ADMIN,
    password,
    role: 'admin',
  });
  const studentDocs = await User.create(
    STUDENTS.map((student) => ({ ...student, password }))
  );
  const byEmailKey = Object.fromEntries(studentDocs.map((u) => [u.email.split('@')[0], u]));

  // Projects with their owners attached.
  const projectDocs = await Project.create(
    PROJECTS.map((p) => {
      const { key, ...fields } = p;
      return { ...fields, owner: byEmailKey[key]._id };
    })
  );

  const byTitle = (needle) => projectDocs.find((p) => p.title.includes(needle));
  const eventsHub = byTitle('Campus Events Hub');
  const mess = byTitle('Hostel Mess');
  const tripPlanner = byTitle('Trip Planner');
  const arFlashcards = byTitle('AR flashcards');

  // One team per project (created together with every idea, guide §6.4).
  await Promise.all(projectDocs.map((p) => Team.create({ project: p._id, owner: p.owner, members: [] })));

  const aditi = byEmailKey['aditi'];
  const bharat = byEmailKey['bharat'];
  const charu = byEmailKey['charu'];
  const devan = byEmailKey['devan'];
  const eshita = byEmailKey['eshita'];
  const farhan = byEmailKey['farhan'];

  // A realistic request history: accepted, pending and one rejected.
  await JoinRequest.create([
    { project: tripPlanner._id, requester: aditi._id, status: 'accepted', message: 'Happy to own the React side!', createdAt: daysAgo(11) },
    { project: mess._id, requester: eshita._id, status: 'accepted', message: 'Sentiment model is my comfort zone.' },
    { project: arFlashcards._id, requester: farhan._id, status: 'accepted', message: 'I will handle the physics maths.', createdAt: daysAgo(20) },
    { project: arFlashcards._id, requester: devan._id, status: 'accepted', message: 'Flutter is my daily driver.', createdAt: daysAgo(19) },
    { project: eventsHub._id, requester: charu._id, status: 'pending', message: 'I can design the event cards and calendar view.' },
    { project: eventsHub._id, requester: bharat._id, status: 'rejected', message: 'Can I help with the dashboard?' },
  ]);

  await Team.findOneAndUpdate(
    { project: tripPlanner._id },
    { $push: { members: { user: aditi._id, joinedAt: daysAgo(11) } } }
  );
  await Team.findOneAndUpdate(
    { project: mess._id },
    { $push: { members: { user: eshita._id, joinedAt: daysAgo(5) } } }
  );
  await Team.findOneAndUpdate(
    { project: arFlashcards._id },
    { $push: { members: [{ user: farhan._id, joinedAt: daysAgo(20) }, { user: devan._id, joinedAt: daysAgo(19) }] } }
  );
  await Project.findByIdAndUpdate(tripPlanner._id, { status: 'in-progress' });
  await Project.findByIdAndUpdate(arFlashcards._id, { status: 'completed' });

  const table = [ADMIN, ...STUDENTS].map((u) => ({
    name: u.name,
    email: u.email,
    password,
  }));

  console.log('\nSeed complete. Demo accounts (password is fresh — never published in the repo):');
  console.table(table);
  if (process.env.SEED_PASSWORD) {
    console.log('(Password came from SEED_PASSWORD in server/.env)');
  } else {
    console.log('(Generated randomly for this run. Use `npm run seed -- --force` to recreate.)');
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
