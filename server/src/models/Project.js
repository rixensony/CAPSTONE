import mongoose from 'mongoose';
import { normalizeChips, CHIP_LIST_MAX, CHIP_MAX_LENGTH } from '../utils/chips.js';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title must be at most 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description must be at most 2000 characters'],
    },
    requiredSkills: {
      type: [String],
      required: [true, 'At least one required skill is needed'],
      validate: {
        validator: (list) => list.length >= 1 && list.length <= CHIP_LIST_MAX,
        message: `List 1–${CHIP_LIST_MAX} required skills`,
      },
    },
    // Number of teammates the owner wants BESIDES themselves.
    // Total seats of the team = owner + teamSize.
    teamSize: {
      type: Number,
      required: [true, 'Teammates needed is required'],
      min: [1, 'At least 1 teammate is required'],
      max: [9, 'At most 9 teammates'],
      validate: {
        validator: Number.isInteger,
        message: 'Teammates needed must be a whole number',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in-progress', 'full', 'completed'],
        message: 'Status must be open, in-progress, full or completed',
      },
      default: 'open',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
  },
  { timestamps: true }
);

projectSchema.index({ requiredSkills: 1 });
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ owner: 1 });

projectSchema.pre('validate', function normalizeSkills(next) {
  this.requiredSkills = normalizeChips(this.requiredSkills);
  next();
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
