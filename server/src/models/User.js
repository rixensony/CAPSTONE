import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { normalizeChips, CHIP_LIST_MAX, CHIP_MAX_LENGTH } from '../utils/chips.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared chip validator: each chip 1..16 chars, at most 10 chips. */
function chipValidators(fieldLabel, list) {
  if (list.length > CHIP_LIST_MAX) {
    return `${fieldLabel}: use at most ${CHIP_LIST_MAX}.`;
  }
  if (list.some((chip) => !chip || chip.length > CHIP_MAX_LENGTH)) {
    return `${fieldLabel}: each tag must be 1–${CHIP_MAX_LENGTH} characters.`;
  }
  return true;
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, 'Email format is invalid'],
    },
    // Hashed at save-time; select:false keeps it out of every normal query.
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [64, 'Password must be at most 64 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      minlength: [2, 'Department must be at least 2 characters'],
      maxlength: [60, 'Department must be at most 60 characters'],
    },
    role: {
      type: String,
      enum: { values: ['student', 'admin'], message: 'Role must be student or admin' },
      default: 'student',
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (list) => chipValidators('skills', list) === true,
        message: (props) => chipValidators('skills', props.value),
      },
    },
    interests: {
      type: [String],
      default: [],
      validate: {
        validator: (list) => chipValidators('interests', list) === true,
        message: (props) => chipValidators('interests', props.value),
      },
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Bio must be at most 500 characters'],
    },
  },
  { timestamps: true }
);

// Teammates are searched by skill (guide §6.4: index what you filter on).
userSchema.index({ skills: 1 });
userSchema.index({ name: 1 });

userSchema.pre('validate', function normalizeChipFields(next) {
  this.skills = normalizeChips(this.skills);
  this.interests = normalizeChips(this.interests);
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
