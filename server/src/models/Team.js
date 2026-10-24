import mongoose from 'mongoose';

/**
 * Every project owns exactly one team (created together with the project).
 * `members` holds the students who joined via an ACCEPTED join request —
 * the owner is represented by `owner`/project.owner, so the total seats of a
 * team = owner (1) + teamSize teammates.
 */
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member user is required'],
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      unique: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });

teamSchema.methods.hasMember = function hasMember(userId) {
  const target = String(userId);
  // members.user may be a bare ObjectId or a populated document — handle both.
  return this.members.some((m) => String(m.user?._id ?? m.user) === target);
};

const Team = mongoose.model('Team', teamSchema);
export default Team;
