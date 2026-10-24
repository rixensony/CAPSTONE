import { Link, Navigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta.jsx';
import useAuth from '../hooks/useAuth.js';

const steps = [
  {
    title: 'Create your profile',
    text: 'Sign up in a minute and list your skills, interests and department so others can find you.',
  },
  {
    title: 'Post or find an idea',
    text: 'Share a project idea with the skills you need, or search existing ideas by skill.',
  },
  {
    title: 'Accept requests and build the team',
    text: 'Review join requests, accept the right teammates and build your project together.',
  },
];

const features = [
  {
    icon: '👤',
    title: 'Profiles with skills',
    text: 'Showcase your skills, interests and projects so teammates can find you by what you can do.',
  },
  {
    icon: '💡',
    title: 'Idea sharing',
    text: 'Post project ideas with a description, required skills and how many teammates you need.',
  },
  {
    icon: '🔎',
    title: 'Skill search',
    text: 'Filter projects and students by technology or skill — React, Python, UI/UX and more.',
  },
  {
    icon: '🤝',
    title: 'Team management',
    text: 'Send join requests, track their status and manage teams with a clear seat overview.',
  },
  {
    icon: '🛡️',
    title: 'Admin moderation',
    text: 'Admins keep the platform healthy: manage users and roles, remove posts, view stats.',
  },
];

export default function LandingPage() {
  const { user, initializing } = useAuth();

  if (initializing) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <>
      <PageMeta title="Find teammates by skill" />

      <section className="hero">
        <div className="container hero-inner">
          <span className="eyebrow">Student skill-share · built for campus teams</span>
          <h1>
            Find teammates for your next project —{' '}
            <span className="grad-text">by skill, not by chance.</span>
          </h1>
          <p className="lede">
            SkillBridge connects students who have ideas with students who have skills. Post your
            project, list what you need, and let the right people find you.
          </p>
          <div className="cta-row">
            <Link to="/register" className="btn btn-primary btn-lg">
              Create free account
            </Link>
            <Link to="/projects" className="btn btn-outline btn-lg">
              Explore projects
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <div className="card step-card" key={step.title}>
                <span className="step-num" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-head">
            <h2>What SkillBridge gives you</h2>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <div className="card feature-card" key={feature.title}>
                <span className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
