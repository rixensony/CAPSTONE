import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester is required'],
    },
    message: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Message must be at most 300 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'rejected'],
        message: 'Status must be pending, accepted or rejected',
      },
      default: 'pending',
    },
  },
  { timestamps: true }
);

// One PENDING request per (student, project). The partial filter allows a
// student to re-apply after being rejected while blocking duplicate pending rows.
requestSchema.index(
  { project: 1, requester: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
requestSchema.index({ project: 1, status: 1 });
requestSchema.index({ requester: 1, status: 1 });

const JoinRequest = mongoose.model('JoinRequest', requestSchema);
export default JoinRequest;
